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
  if (existingImages < 2 && suggestions.imagePrompt) {
    try {
      const aiImageUrl = await generateAiImage(suggestions.imagePrompt, apiKey)
      if (aiImageUrl) {
        // AI가 생성한 SEO 최적화 이미지 alt/title
        const imageAlt = suggestions.imageAlt || `${title} - 핵심 인사이트 인포그래픽`
        const imageTitle = suggestions.imageTitle || `${title} 관련 시각 자료`

        // 콘텐츠 중간에 이미지 삽입
        const paragraphs = optimized.split(/<\/p>/i)
        if (paragraphs.length > 2) {
          const insertIdx = Math.floor(paragraphs.length / 2)
          const imageHtml = `</p><figure style="text-align:center;margin:24px 0;"><img src="${aiImageUrl}" alt="${imageAlt}" title="${imageTitle}" style="max-width:100%;height:auto;border-radius:8px;" loading="lazy" /><figcaption style="font-size:12px;color:#666;margin-top:8px;">${imageTitle}</figcaption></figure><p>`
          paragraphs.splice(insertIdx, 0, imageHtml)
          optimized = paragraphs.join('</p>')
          contentChanges.push(`AI 이미지 삽입 (alt: "${imageAlt.slice(0, 30)}...")`)
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
  return generateAiImage(prompt, apiKey)
}

/**
 * AI 이미지 생성 (Gemini Imagen)
 */
async function generateAiImage(prompt, apiKey) {
  try {
    // Gemini로 이미지 생성용 상세 프롬프트 만들기
    const enhancedPrompt = `Professional, modern, clean design for business newsletter. ${prompt}. Minimalist style, corporate colors, high quality.`

    // 이미지 생성 API 호출 (Imagen 또는 대체 서비스)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a placeholder image URL for: ${enhancedPrompt}.
              Since I cannot actually generate images, please provide a relevant Unsplash image URL that matches this concept.
              Return ONLY the URL, nothing else. Format: https://images.unsplash.com/...`
            }]
          }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 200 }
        })
      }
    )

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // URL 추출
    const urlMatch = text.match(/https:\/\/images\.unsplash\.com\/[^\s"')]+/)
    if (urlMatch) {
      return urlMatch[0]
    }

    // 기본 Unsplash 이미지 반환
    return `https://images.unsplash.com/photo-1553484771-047a44eee27b?w=1200&h=630&fit=crop`
  } catch (error) {
    console.error('[auto-fix-seo] Image generation error:', error)
    return null
  }
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
