const { createClient } = require('@supabase/supabase-js')

const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_BIZ_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// HTML에서 이미지 URL 추출
const extractImagesFromHtml = (html) => {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const images = []
  let match

  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1]
    // 작은 아이콘이나 트래킹 픽셀 제외
    if (src &&
        !src.includes('tracking') &&
        !src.includes('pixel') &&
        !src.includes('spacer') &&
        !src.includes('1x1') &&
        !src.includes('beacon') &&
        src.length > 20) {
      images.push(src)
    }
  }

  return images
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabaseBiz = getSupabase()
    if (!supabaseBiz) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Supabase 연결 실패' })
      }
    }

    const { newsletterId, stibeeUrl, action } = JSON.parse(event.body || '{}')

    // 단일 뉴스레터 썸네일 추출
    if (action === 'single' && stibeeUrl) {
      console.log('Fetching thumbnail from:', stibeeUrl)

      const response = await fetch(stibeeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const html = await response.text()
      const images = extractImagesFromHtml(html)

      // 첫 번째는 로고이므로 두 번째 이미지 사용
      const thumbnailUrl = images.length > 1 ? images[1] : (images[0] || null)

      // DB 업데이트
      if (newsletterId && thumbnailUrl) {
        await supabaseBiz
          .from('newsletters')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('id', newsletterId)
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          thumbnailUrl,
          allImages: images.slice(0, 5) // 선택할 수 있도록 최대 5개 반환
        })
      }
    }

    // HTML 콘텐츠 가져오기 및 저장
    if (action === 'fetchContent' && stibeeUrl && newsletterId) {
      console.log('Fetching HTML content from:', stibeeUrl)

      const response = await fetch(stibeeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const html = await response.text()

      // body 태그 내용만 추출 (스타일 유지)
      let contentHtml = html

      // style 태그들 추출
      const styleMatches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
      const styles = styleMatches.join('\n')

      // body 내용 추출
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) {
        contentHtml = styles + bodyMatch[1]
      }

      // DB에 HTML 콘텐츠 저장
      const { error } = await supabaseBiz
        .from('newsletters')
        .update({
          html_content: contentHtml,
          content_source: 'stibee'
        })
        .eq('id', newsletterId)

      if (error) {
        throw new Error(`DB 저장 실패: ${error.message}`)
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'HTML 콘텐츠가 저장되었습니다.',
          contentLength: contentHtml.length
        })
      }
    }

    // 여러 뉴스레터 일괄 썸네일 추출
    if (action === 'bulk') {
      const { data: newsletters } = await supabaseBiz
        .from('newsletters')
        .select('id, stibee_url, thumbnail_url')
        .is('thumbnail_url', null)
        .limit(10) // 한 번에 10개씩만

      if (!newsletters || newsletters.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: '처리할 뉴스레터가 없습니다.',
            processed: 0
          })
        }
      }

      let processed = 0
      const results = []

      for (const newsletter of newsletters) {
        if (!newsletter.stibee_url) continue

        try {
          const response = await fetch(newsletter.stibee_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })

          if (response.ok) {
            const html = await response.text()
            const images = extractImagesFromHtml(html)
            const thumbnailUrl = images.length > 1 ? images[1] : (images[0] || null)

            if (thumbnailUrl) {
              await supabaseBiz
                .from('newsletters')
                .update({ thumbnail_url: thumbnailUrl })
                .eq('id', newsletter.id)

              processed++
              results.push({ id: newsletter.id, success: true })
            }
          }
        } catch (err) {
          console.error(`Error processing newsletter ${newsletter.id}:`, err.message)
          results.push({ id: newsletter.id, success: false, error: err.message })
        }

        // Rate limiting - 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `${processed}개 뉴스레터 썸네일 추출 완료`,
          processed,
          results
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Error extracting thumbnail:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
