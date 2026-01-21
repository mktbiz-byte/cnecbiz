const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
}

/**
 * 뉴스레터 SEO 자동 수정 함수 (강화 버전)
 * - AI가 분석 후 모든 SEO 항목을 적극적으로 최적화
 * - A등급 목표로 모든 항목 개선
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const { newsletterId } = JSON.parse(event.body || '{}')

    if (!newsletterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'newsletterId is required' })
      }
    }

    // 뉴스레터 데이터 조회
    const { data: newsletter, error: fetchError } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', newsletterId)
      .single()

    if (fetchError || !newsletter) {
      console.error('[auto-fix-seo] Newsletter fetch error:', fetchError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '뉴스레터를 찾을 수 없습니다.' })
      }
    }

    // 현재 SEO 점수 분석
    const currentScore = calculateSeoScore(newsletter)
    const changes = []
    const updates = {}

    // Gemini API로 개선 제안 생성
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

    if (!geminiApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'AI API 키가 설정되지 않았습니다.' })
      }
    }

    console.log('[auto-fix-seo] Starting SEO optimization for:', newsletter.title)

    // AI를 통한 SEO 최적화 제안 생성 (항상 실행)
    const aiSuggestions = await generateSeoSuggestions(newsletter, geminiApiKey)
    console.log('[auto-fix-seo] AI suggestions:', JSON.stringify(aiSuggestions))

    // 현재 상태 체크
    const currentDesc = newsletter.description || ''
    // tags는 PostgreSQL 배열 타입 (text[])
    const currentTags = Array.isArray(newsletter.tags) ? newsletter.tags : []
    const needsDescription = currentDesc.length < 50
    const needsTags = currentTags.length < 3

    console.log('[auto-fix-seo] Needs description:', needsDescription, 'current length:', currentDesc.length)
    console.log('[auto-fix-seo] Needs tags:', needsTags, 'current count:', currentTags.length)

    // 1. 제목 최적화
    if (aiSuggestions.title && aiSuggestions.title !== newsletter.title) {
      updates.title = aiSuggestions.title
      changes.push(`제목 SEO 최적화 (${aiSuggestions.title.length}자)`)
    }

    // 2. 설명 최적화 (없거나 50자 미만이면 무조건 생성)
    if (needsDescription) {
      if (aiSuggestions.description) {
        updates.description = aiSuggestions.description
        changes.push(`메타 설명 생성 (${aiSuggestions.description.length}자)`)
      } else {
        // AI 실패 시 제목 기반으로 기본 설명 생성
        const fallbackDesc = `${newsletter.title}에 대한 상세한 인사이트와 전략을 확인하세요. 크넥 뉴스레터에서 최신 마케팅 트렌드를 만나보세요.`
        updates.description = fallbackDesc.slice(0, 150)
        changes.push(`메타 설명 자동 생성 (기본)`)
      }
    }

    // 3. 태그 추가 (3개 미만이면 무조건 추가)
    if (needsTags) {
      let newTags = []
      if (aiSuggestions.tags && aiSuggestions.tags.length > 0) {
        newTags = aiSuggestions.tags.slice(0, 5)
      } else {
        // AI 실패 시 기본 태그 생성
        newTags = ['마케팅', '인플루언서', '크리에이터', '브랜드', '트렌드']
      }

      const allTags = [...new Set([...currentTags, ...newTags])].slice(0, 7)
      // tags는 PostgreSQL 배열 타입 - 배열로 저장
      updates.tags = allTags
      changes.push(`태그 추가: ${newTags.join(', ')}`)
    }

    // 4. 카테고리 자동 설정
    if (!newsletter.category || newsletter.category === 'other') {
      const newCategory = aiSuggestions.category || 'insight'
      updates.category = newCategory
      changes.push(`카테고리 설정: ${getCategoryLabel(newCategory)}`)
    }

    // 5. HTML 콘텐츠 SEO 최적화
    if (newsletter.html_content) {
      const { optimizedContent, contentChanges } = await optimizeHtmlContent(
        newsletter.html_content,
        newsletter.title,
        aiSuggestions,
        geminiApiKey
      )

      if (optimizedContent !== newsletter.html_content) {
        updates.html_content = optimizedContent
        updates.content_source = 'custom' // AI 수정됨 표시
        changes.push(...contentChanges)
      }
    }

    // 6. 썸네일 없으면 AI 이미지 생성
    if (!newsletter.thumbnail_url) {
      try {
        const thumbnailUrl = await generateAiThumbnail(newsletter.title, aiSuggestions, geminiApiKey)
        if (thumbnailUrl) {
          updates.thumbnail_url = thumbnailUrl
          changes.push('AI 썸네일 이미지 생성')
        }
      } catch (imgError) {
        console.error('[auto-fix-seo] Thumbnail generation error:', imgError)
        changes.push('⚠️ 썸네일 생성 실패 - 수동 설정 권장')
      }
    }

    // 변경사항이 있으면 업데이트
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('newsletters')
        .update(updates)
        .eq('id', newsletterId)

      if (updateError) {
        console.error('[auto-fix-seo] Update error:', updateError)
        throw updateError
      }

      console.log('[auto-fix-seo] Successfully updated newsletter:', newsletterId)
    }

    // 새 점수 계산
    const updatedNewsletter = { ...newsletter, ...updates }
    const newScore = calculateSeoScore(updatedNewsletter)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        changes: changes.length > 0 ? changes : ['이미 최적화된 상태입니다'],
        previousScore: currentScore.totalScore,
        newScore: newScore.totalScore,
        grade: newScore.grade,
        improvement: newScore.totalScore - currentScore.totalScore
      })
    }
  } catch (error) {
    console.error('[auto-fix-seo] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Internal server error' })
    }
  }
}

/**
 * Gemini AI를 통한 SEO 최적화 제안 생성 (강화 버전)
 */
async function generateSeoSuggestions(newsletter, apiKey) {
  // HTML 콘텐츠에서 텍스트 추출 (처음 2000자)
  const contentPreview = (newsletter.html_content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)

  const prompt = `당신은 뉴스레터 SEO 최적화 전문가입니다. 아래 뉴스레터를 분석하고 A등급 SEO 점수를 받을 수 있도록 최적화해주세요.

[현재 뉴스레터 정보]
- 제목: ${newsletter.title || '없음'}
- 설명: ${newsletter.description || '없음'}
- 태그: ${newsletter.tags || '없음'}
- 카테고리: ${newsletter.category || '없음'}
- 콘텐츠 미리보기: ${contentPreview.slice(0, 500)}

[SEO 최적화 요구사항]
1. 제목: 30-50자, 핵심 키워드를 앞에 배치, 클릭 유도 문구
2. 설명: 80-150자, 핵심 내용 요약 + 행동 유도(CTA)
3. 태그: 검색에 도움되는 관련 키워드 5개
4. 카테고리: marketing, insight, case_study, tips, news, other 중 선택

다음 JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "title": "최적화된 제목",
  "description": "최적화된 설명",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "category": "카테고리",
  "imagePrompt": "이 뉴스레터에 어울리는 이미지 생성을 위한 영문 프롬프트 (간단명료하게)",
  "imageAlt": "SEO 최적화된 이미지 대체 텍스트 (핵심 키워드 포함, 50자 내외)",
  "imageTitle": "이미지 제목 속성 (클릭 시 표시될 설명, 30자 내외)",
  "headings": ["본문에 추가할 소제목1", "본문에 추가할 소제목2"]
}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500
          }
        })
      }
    )

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      console.log('[auto-fix-seo] Parsed suggestions:', parsed)
      return parsed
    }

    return {}
  } catch (error) {
    console.error('[auto-fix-seo] Gemini API error:', error)
    return {}
  }
}

/**
 * HTML 콘텐츠 SEO 최적화 (강화 버전)
 */
async function optimizeHtmlContent(htmlContent, title, suggestions, apiKey) {
  let optimized = htmlContent
  const contentChanges = []

  // 1. 이미지 alt 태그 최적화
  let imgCount = 0
  optimized = optimized.replace(/<img([^>]*)>/gi, (match, attrs) => {
    imgCount++
    // alt 속성이 없거나 비어있으면 추가
    if (!attrs.includes('alt=') || attrs.includes('alt=""')) {
      const altText = `${title} 관련 이미지 ${imgCount}`
      if (attrs.includes('alt=""')) {
        attrs = attrs.replace('alt=""', `alt="${altText}"`)
      } else {
        attrs += ` alt="${altText}"`
      }
      return `<img${attrs}>`
    }
    return match
  })
  if (imgCount > 0) {
    contentChanges.push(`이미지 alt 태그 최적화 (${imgCount}개)`)
  }

  // 2. 외부 링크 보안 속성 추가
  let linkCount = 0
  optimized = optimized.replace(
    /<a([^>]*href="https?:\/\/(?!cnecbiz)[^"]*"[^>]*)>/gi,
    (match, attrs) => {
      linkCount++
      if (!attrs.includes('rel=')) {
        attrs += ' rel="noopener noreferrer"'
      }
      if (!attrs.includes('target=')) {
        attrs += ' target="_blank"'
      }
      return `<a${attrs}>`
    }
  )
  if (linkCount > 0) {
    contentChanges.push(`외부 링크 보안 속성 추가 (${linkCount}개)`)
  }

  // 3. 소제목(h2, h3) 구조 확인 및 추가
  const hasH2 = /<h2[^>]*>/i.test(optimized)
  const hasH3 = /<h3[^>]*>/i.test(optimized)

  if (!hasH2 && !hasH3 && suggestions.headings && suggestions.headings.length > 0) {
    // 콘텐츠 중간에 소제목 삽입 시도
    const paragraphs = optimized.split(/<\/p>/i)
    if (paragraphs.length > 3) {
      const insertIdx = Math.floor(paragraphs.length / 3)
      paragraphs.splice(insertIdx, 0, `</p><h2 style="margin-top:24px;margin-bottom:12px;font-size:20px;font-weight:bold;">${suggestions.headings[0]}</h2><p>`)
      optimized = paragraphs.join('</p>')
      contentChanges.push('SEO 소제목(H2) 추가')
    }
  }

  // 4. AI 이미지 콘텐츠 중간 삽입 (이미지가 2개 미만일 때)
  const existingImages = (optimized.match(/<img/gi) || []).length
  if (existingImages < 2) {
    try {
      console.log('[auto-fix-seo] Attempting to insert AI image...')
      const aiImageUrl = await generateAiImage(suggestions.imagePrompt || title, apiKey, title)
      console.log('[auto-fix-seo] Generated image URL:', aiImageUrl)

      if (aiImageUrl) {
        // AI가 생성한 SEO 최적화 이미지 alt/title
        const imageAlt = suggestions.imageAlt || `${title} - 핵심 인사이트 이미지`
        const imageTitle = suggestions.imageTitle || `${title} 관련 시각 자료`

        // 이미지 HTML 생성
        const imageHtml = `<figure style="text-align:center;margin:24px 0;"><img src="${aiImageUrl}" alt="${imageAlt}" title="${imageTitle}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);" loading="lazy" /><figcaption style="font-size:12px;color:#666;margin-top:8px;">${imageTitle}</figcaption></figure>`

        let imageInserted = false

        // 방법 1: H2 태그 바로 뒤에 삽입 (가장 좋은 위치)
        if (!imageInserted && /<h2[^>]*>.*?<\/h2>/i.test(optimized)) {
          // 첫 번째 H2 태그 뒤에 삽입
          optimized = optimized.replace(
            /(<h2[^>]*>.*?<\/h2>)/i,
            `$1\n${imageHtml}`
          )
          imageInserted = true
          console.log('[auto-fix-seo] Image inserted after H2 heading')
        }

        // 방법 2: H3 태그 바로 뒤에 삽입
        if (!imageInserted && /<h3[^>]*>.*?<\/h3>/i.test(optimized)) {
          optimized = optimized.replace(
            /(<h3[^>]*>.*?<\/h3>)/i,
            `$1\n${imageHtml}`
          )
          imageInserted = true
          console.log('[auto-fix-seo] Image inserted after H3 heading')
        }

        // 방법 3: 첫 번째 <br> 태그 집합 뒤 (Stibee 뉴스레터 형식)
        if (!imageInserted && /<br\s*\/?>\s*<br\s*\/?>/i.test(optimized)) {
          optimized = optimized.replace(
            /(<br\s*\/?>\s*<br\s*\/?>)/i,
            `$1\n${imageHtml}`
          )
          imageInserted = true
          console.log('[auto-fix-seo] Image inserted after br tags')
        }

        // 방법 4: 3번째 </p> 태그 뒤에 삽입
        if (!imageInserted) {
          let pCount = 0
          optimized = optimized.replace(/<\/p>/gi, (match) => {
            pCount++
            if (pCount === 3 && !imageInserted) {
              imageInserted = true
              return `${match}\n${imageHtml}`
            }
            return match
          })
          if (imageInserted) {
            console.log('[auto-fix-seo] Image inserted after 3rd paragraph')
          }
        }

        // 방법 5: 콘텐츠 시작 부분에 삽입 (최후 수단)
        if (!imageInserted) {
          // body나 첫 번째 div 찾기
          if (/<body[^>]*>/i.test(optimized)) {
            optimized = optimized.replace(
              /(<body[^>]*>)/i,
              `$1\n${imageHtml}`
            )
          } else if (/<div[^>]*>/i.test(optimized)) {
            optimized = optimized.replace(
              /(<div[^>]*>)/i,
              `$1\n${imageHtml}`
            )
          } else {
            optimized = imageHtml + optimized
          }
          imageInserted = true
          console.log('[auto-fix-seo] Image inserted at content start')
        }

        if (imageInserted) {
          contentChanges.push(`AI 이미지 삽입 (alt: "${imageAlt.slice(0, 25)}...")`)
        }
      }
    } catch (imgError) {
      console.error('[auto-fix-seo] AI image insertion error:', imgError)
    }
  }

  return { optimizedContent: optimized, contentChanges }
}

/**
 * AI 썸네일 이미지 생성
 */
async function generateAiThumbnail(title, suggestions, apiKey) {
  const prompt = suggestions.imagePrompt || `Professional newsletter thumbnail about: ${title}`
  return generateAiImage(prompt, apiKey, title)
}

/**
 * AI 키워드 추출 및 이미지 검색 (타임아웃 최적화)
 */
async function generateAiImage(prompt, apiKey, title = '') {
  try {
    // 타임아웃을 위한 AbortController (10초)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    // AI로 영문 키워드 추출
    const keywordsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract 2-3 simple English keywords for finding a stock photo related to this topic:
"${prompt || title}"

Requirements:
- Only common, general words that would match stock photos
- Business/marketing/technology related
- Separate with commas
- Example output: marketing, business, digital

Return ONLY the keywords, nothing else:`
            }]
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 50 }
        }),
        signal: controller.signal
      }
    )

    clearTimeout(timeout)

    const keywordsResult = await keywordsResponse.json()
    const keywordsText = keywordsResult.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // 키워드 정리
    let keywords = keywordsText.trim().toLowerCase()
      .replace(/[^a-z,\s]/g, '')
      .split(/[,\s]+/)
      .filter(k => k.length > 2)
      .slice(0, 3)

    if (keywords.length === 0) {
      keywords = ['marketing', 'business']
    }

    console.log('[auto-fix-seo] Generated keywords:', keywords)

    // 검증된 Unsplash 이미지 ID로 직접 URL 생성 (빠름)
    const categoryImages = getImagesByKeyword(keywords)
    if (categoryImages) {
      console.log('[auto-fix-seo] Using category image:', categoryImages)
      return categoryImages
    }

    // 폴백: 기본 비즈니스 이미지
    return getRandomBusinessImage()
  } catch (error) {
    console.error('[auto-fix-seo] Image generation error:', error.message)
    return getRandomBusinessImage()
  }
}

/**
 * 키워드별 검증된 이미지 매칭
 */
function getImagesByKeyword(keywords) {
  const keywordImages = {
    // 마케팅 관련
    marketing: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&h=630&fit=crop',
    digital: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop',
    social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=630&fit=crop',
    media: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&h=630&fit=crop',
    advertising: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=630&fit=crop',

    // 비즈니스 관련
    business: 'https://images.unsplash.com/photo-1664575602554-2087b04935a5?w=1200&h=630&fit=crop',
    strategy: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&fit=crop',
    team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=630&fit=crop',
    meeting: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=630&fit=crop',
    office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=630&fit=crop',

    // 기술 관련
    technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop',
    tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop',
    data: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    analytics: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',

    // 크리에이터/인플루언서
    creator: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&h=630&fit=crop',
    influencer: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&h=630&fit=crop',
    content: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop',
    video: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&h=630&fit=crop',
    youtube: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=1200&h=630&fit=crop',

    // 쇼핑/이커머스
    shopping: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=630&fit=crop',
    ecommerce: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=630&fit=crop',
    retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=630&fit=crop',

    // 성장/트렌드
    growth: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop',
    trend: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop',
    success: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=1200&h=630&fit=crop',

    // 브랜드
    brand: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1200&h=630&fit=crop',
    branding: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1200&h=630&fit=crop',
  }

  // 키워드 매칭
  for (const keyword of keywords) {
    if (keywordImages[keyword]) {
      return keywordImages[keyword]
    }
  }

  return null
}

/**
 * 랜덤 비즈니스 이미지 (검증된 Unsplash 이미지)
 */
function getRandomBusinessImage() {
  const verifiedImages = [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop', // 마케팅 대시보드
    'https://images.unsplash.com/photo-1553484771-047a44eee27b?w=1200&h=630&fit=crop', // 팀 미팅
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=630&fit=crop', // 비즈니스 미팅
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=630&fit=crop', // 사무실
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&h=630&fit=crop', // 협업
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop', // 브레인스토밍
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=630&fit=crop', // 마케팅 전략
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=630&fit=crop', // 프레젠테이션
  ]
  return verifiedImages[Math.floor(Math.random() * verifiedImages.length)]
}

/**
 * SEO 점수 계산
 */
function calculateSeoScore(newsletter) {
  const scores = {
    title: { score: 0, max: 20 },
    description: { score: 0, max: 20 },
    thumbnail: { score: 0, max: 15 },
    tags: { score: 0, max: 15 },
    content: { score: 0, max: 20 },
    metadata: { score: 0, max: 10 }
  }

  // 제목 (20점)
  const title = newsletter.title || ''
  if (title.length >= 30 && title.length <= 50) {
    scores.title.score = 20
  } else if (title.length >= 20 && title.length <= 60) {
    scores.title.score = 15
  } else if (title.length > 0) {
    scores.title.score = 10
  }

  // 설명 (20점)
  const description = newsletter.description || ''
  if (description.length >= 80 && description.length <= 150) {
    scores.description.score = 20
  } else if (description.length >= 50 && description.length <= 160) {
    scores.description.score = 15
  } else if (description.length > 0) {
    scores.description.score = 10
  }

  // 썸네일 (15점)
  if (newsletter.thumbnail_url) {
    scores.thumbnail.score = newsletter.thumbnail_url.startsWith('https://') ? 15 : 10
  }

  // 태그 (15점) - tags는 PostgreSQL 배열 타입
  const tags = Array.isArray(newsletter.tags) ? newsletter.tags : []
  if (tags.length >= 5) {
    scores.tags.score = 15
  } else if (tags.length >= 3) {
    scores.tags.score = 12
  } else if (tags.length >= 1) {
    scores.tags.score = 8
  }

  // 콘텐츠 (20점)
  if (newsletter.html_content) {
    let contentScore = 5
    const content = newsletter.html_content

    // 제목 태그 있음
    if (content.includes('<h2') || content.includes('<h3')) contentScore += 5

    // 이미지 alt 태그 있음
    if (content.includes('alt=') && !content.includes('alt=""')) contentScore += 5

    // 충분한 길이
    if (content.length > 1000) contentScore += 3

    // 외부 링크 보안 속성
    if (content.includes('rel="noopener')) contentScore += 2

    scores.content.score = Math.min(20, contentScore)
  }

  // 메타데이터 (10점)
  if (newsletter.category && newsletter.category !== 'other') scores.metadata.score += 5
  if (newsletter.published_at) scores.metadata.score += 5

  const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0)
  const maxScore = Object.values(scores).reduce((sum, s) => sum + s.max, 0)
  const percentage = Math.round((totalScore / maxScore) * 100)

  let grade = 'F'
  if (percentage >= 90) grade = 'A'
  else if (percentage >= 80) grade = 'B'
  else if (percentage >= 70) grade = 'C'
  else if (percentage >= 60) grade = 'D'

  return {
    totalScore,
    maxScore,
    percentage,
    grade,
    breakdown: scores
  }
}

function getCategoryLabel(category) {
  const labels = {
    marketing: '마케팅 인사이트',
    insight: '산업 트렌드',
    case_study: '성공 사례',
    tips: '실용 팁',
    news: '업계 뉴스',
    other: '기타'
  }
  return labels[category] || category
}
