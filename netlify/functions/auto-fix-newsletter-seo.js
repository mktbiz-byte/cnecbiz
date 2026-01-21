const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
}

/**
 * 뉴스레터 SEO 자동 수정 함수
 * - AI가 분석 후 제목, 설명, 태그 등을 자동으로 최적화
 * - 점수가 낮은 항목만 선별적으로 수정
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

    // AI를 통한 SEO 최적화 제안 생성
    const aiSuggestions = await generateSeoSuggestions(newsletter, geminiApiKey)

    // 1. 제목 최적화 (점수가 20점 미만일 때)
    if (currentScore.breakdown.title.score < 20 && aiSuggestions.title) {
      updates.title = aiSuggestions.title
      changes.push(`제목 최적화: "${newsletter.title?.slice(0, 20)}..." → "${aiSuggestions.title.slice(0, 20)}..."`)
    }

    // 2. 설명 최적화 (점수가 15점 미만일 때)
    if (currentScore.breakdown.description.score < 15 && aiSuggestions.description) {
      updates.description = aiSuggestions.description
      changes.push(`설명 자동 생성 (${aiSuggestions.description.length}자)`)
    }

    // 3. 태그 추가 (태그가 없거나 부족할 때)
    const currentTags = newsletter.tags || ''
    const tagCount = currentTags.split(',').filter(t => t.trim()).length
    if (tagCount < 3 && aiSuggestions.tags && aiSuggestions.tags.length > 0) {
      const newTags = aiSuggestions.tags.slice(0, 5).join(', ')
      updates.tags = newTags
      changes.push(`태그 추가: ${newTags}`)
    }

    // 4. 카테고리 자동 설정 (없을 경우)
    if (!newsletter.category && aiSuggestions.category) {
      updates.category = aiSuggestions.category
      changes.push(`카테고리 자동 설정: ${aiSuggestions.category}`)
    }

    // 5. OG 이미지/썸네일 체크 (없으면 알림만)
    if (!newsletter.thumbnail_url) {
      changes.push('⚠️ 썸네일 이미지 없음 - 수동 설정 권장')
    }

    // 6. HTML 콘텐츠 메타데이터 최적화
    if (newsletter.html_content && currentScore.breakdown.content.score < 15) {
      const optimizedContent = optimizeHtmlContent(newsletter.html_content, aiSuggestions)
      if (optimizedContent !== newsletter.html_content) {
        updates.html_content = optimizedContent
        changes.push('HTML 콘텐츠 구조 개선')
      }
    }

    // 변경사항이 있으면 업데이트
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      updates.seo_optimized_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('newsletters')
        .update(updates)
        .eq('id', newsletterId)

      if (updateError) {
        console.error('[auto-fix-seo] Update error:', updateError)
        throw updateError
      }
    }

    // 새 점수 계산
    const updatedNewsletter = { ...newsletter, ...updates }
    const newScore = calculateSeoScore(updatedNewsletter)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        changes,
        previousScore: currentScore.totalScore,
        newScore: newScore.totalScore,
        grade: newScore.grade
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
 * Gemini AI를 통한 SEO 최적화 제안 생성
 */
async function generateSeoSuggestions(newsletter, apiKey) {
  const prompt = `당신은 뉴스레터 SEO 최적화 전문가입니다. 아래 뉴스레터 정보를 분석하고 SEO 최적화된 제목, 설명, 태그를 제안해주세요.

뉴스레터 정보:
- 현재 제목: ${newsletter.title || '없음'}
- 현재 설명: ${newsletter.description || '없음'}
- 현재 태그: ${newsletter.tags || '없음'}
- 카테고리: ${newsletter.category || '없음'}
- 콘텐츠 길이: ${newsletter.html_content?.length || 0}자

다음 JSON 형식으로 응답해주세요 (다른 텍스트 없이 JSON만):
{
  "title": "SEO 최적화된 제목 (30-50자, 핵심 키워드 포함)",
  "description": "검색 결과에 표시될 메타 설명 (80-150자, 핵심 내용 요약, CTA 포함)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "category": "marketing|insight|case_study|tips|news|other 중 하나"
}

주의사항:
- 제목은 클릭을 유도하면서도 내용을 정확히 반영해야 합니다
- 설명은 검색 결과에서 잘리지 않도록 150자 이내로 작성
- 태그는 검색에 도움이 될 관련 키워드로 5개 제안
- 카테고리는 콘텐츠 성격에 맞게 선택`

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
            maxOutputTokens: 1024
          }
        })
      }
    )

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {}
  } catch (error) {
    console.error('[auto-fix-seo] Gemini API error:', error)
    return {}
  }
}

/**
 * HTML 콘텐츠 구조 최적화
 */
function optimizeHtmlContent(htmlContent, suggestions) {
  let optimized = htmlContent

  // 1. 이미지에 alt 태그가 없으면 추가
  optimized = optimized.replace(/<img([^>]*)(?!\balt=)([^>]*)>/gi, (match, before, after) => {
    if (match.includes('alt=')) return match
    return `<img${before} alt="뉴스레터 이미지"${after}>`
  })

  // 2. 빈 alt 태그 채우기
  optimized = optimized.replace(/alt=""/g, 'alt="뉴스레터 관련 이미지"')

  // 3. 외부 링크에 rel 속성 추가
  optimized = optimized.replace(
    /<a([^>]*href="https?:\/\/(?!cnecbiz)[^"]*"[^>]*)>/gi,
    (match, attrs) => {
      if (match.includes('rel=')) return match
      return `<a${attrs} rel="noopener noreferrer" target="_blank">`
    }
  )

  return optimized
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
  } else if (title.length >= 10 && title.length <= 60) {
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

  // 태그 (15점)
  const tags = (newsletter.tags || '').split(',').filter(t => t.trim())
  if (tags.length >= 3) {
    scores.tags.score = 15
  } else if (tags.length >= 1) {
    scores.tags.score = 10
  }

  // 콘텐츠 (20점)
  if (newsletter.html_content) {
    let contentScore = 10
    if (newsletter.html_content.includes('<h2') || newsletter.html_content.includes('<h3')) contentScore += 5
    if (newsletter.html_content.includes('alt=')) contentScore += 5
    scores.content.score = Math.min(20, contentScore)
  }

  // 메타데이터 (10점)
  if (newsletter.category) scores.metadata.score += 5
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
