const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.VITE_SUPABASE_BIZ_SERVICE_KEY
)

exports.handler = async (event) => {
  // CORS 헤더
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
    const STIBEE_API_KEY = process.env.STIBEE_API_KEY

    if (!STIBEE_API_KEY) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'STIBEE_API_KEY가 설정되지 않았습니다. Netlify 환경변수에 추가해주세요.'
        })
      }
    }

    // 스티비 API v2로 이메일 목록 가져오기
    const response = await fetch('https://api.stibee.com/v2/emails?status=COMPLETE&limit=100', {
      method: 'GET',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Stibee API error:', response.status, errorText)
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `스티비 API 오류: ${response.status} - ${errorText}`
        })
      }
    }

    const data = await response.json()
    console.log('Stibee API response:', JSON.stringify(data).slice(0, 500))

    // 이메일 목록 파싱
    const emails = data.value || data.emails || data.data || []

    if (!Array.isArray(emails)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '이메일 목록이 비어있습니다.',
          fetched: 0,
          saved: 0,
          emails: []
        })
      }
    }

    // 가져온 이메일을 newsletters 테이블에 저장
    let savedCount = 0
    const savedEmails = []

    for (const email of emails) {
      // 스티비 이메일 ID로 기존 데이터 확인
      const stibeeId = email.id?.toString() || email.emailId?.toString()

      if (!stibeeId) continue

      // 이미 저장된 뉴스레터인지 확인
      const { data: existing } = await supabaseBiz
        .from('newsletters')
        .select('id')
        .eq('stibee_id', stibeeId)
        .maybeSingle()

      if (existing) {
        // 이미 존재하면 업데이트
        const { error: updateError } = await supabaseBiz
          .from('newsletters')
          .update({
            title: email.subject || email.title || '제목 없음',
            description: email.previewText || email.description || null,
            stibee_url: email.shareUrl || email.webUrl || `https://stibee.com/api/v1.0/emails/share/${stibeeId}`,
            published_at: email.sendAt || email.sentAt || email.createdAt || null,
            thumbnail_url: email.thumbnailUrl || email.thumbnail || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (!updateError) {
          savedEmails.push({ id: stibeeId, title: email.subject || email.title, action: 'updated' })
        }
      } else {
        // 새로 삽입
        const { error: insertError } = await supabaseBiz
          .from('newsletters')
          .insert({
            stibee_id: stibeeId,
            title: email.subject || email.title || '제목 없음',
            description: email.previewText || email.description || null,
            stibee_url: email.shareUrl || email.webUrl || `https://stibee.com/api/v1.0/emails/share/${stibeeId}`,
            published_at: email.sendAt || email.sentAt || email.createdAt || null,
            thumbnail_url: email.thumbnailUrl || email.thumbnail || null,
            category: 'other',
            is_active: false, // 기본값은 비활성화
            is_featured: false
          })

        if (!insertError) {
          savedCount++
          savedEmails.push({ id: stibeeId, title: email.subject || email.title, action: 'created' })
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `스티비에서 ${emails.length}개 이메일을 가져와서 ${savedCount}개 새로 저장했습니다.`,
        fetched: emails.length,
        saved: savedCount,
        emails: savedEmails
      })
    }

  } catch (error) {
    console.error('Error fetching Stibee newsletters:', error)
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
