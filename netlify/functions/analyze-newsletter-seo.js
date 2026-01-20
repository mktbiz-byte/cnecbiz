const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
}

/**
 * 뉴스레터 SEO 분석 함수
 * - 기본 SEO 점수 계산
 * - Gemini API를 통한 상세 분석 및 개선 제안
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
    const { newsletterId, action } = JSON.parse(event.body || '{}')

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
      console.error('[analyze-newsletter-seo] Newsletter fetch error:', fetchError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '뉴스레터를 찾을 수 없습니다.' })
      }
    }

    // 기본 SEO 점수 계산
    const basicSeoScore = calculateBasicSeoScore(newsletter)

    // action이 'basic'이면 기본 점수만 반환
    if (action === 'basic') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          seoScore: basicSeoScore
        })
      }
    }

    // Gemini를 통한 상세 분석 (옵션)
    let aiAnalysis = null
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

    if (geminiApiKey) {
      try {
        aiAnalysis = await analyzeWithGemini(newsletter, basicSeoScore, geminiApiKey)
      } catch (aiError) {
        console.error('[analyze-newsletter-seo] Gemini API error:', aiError.message)
        // AI 분석 실패 시 기본 제안으로 대체
        aiAnalysis = getDefaultSuggestions(basicSeoScore)
      }
    } else {
      // API 키 없으면 기본 제안 사용
      aiAnalysis = getDefaultSuggestions(basicSeoScore)
    }

    // SEO 점수 저장 (선택적)
    if (action === 'save') {
      try {
        await supabase
          .from('newsletters')
          .update({
            seo_score: basicSeoScore.totalScore,
            seo_analysis: aiAnalysis,
            seo_analyzed_at: new Date().toISOString()
          })
          .eq('id', newsletterId)
      } catch (saveError) {
        console.error('[analyze-newsletter-seo] Save error:', saveError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        seoScore: basicSeoScore,
        aiAnalysis
      })
    }
  } catch (error) {
    console.error('[analyze-newsletter-seo] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Internal server error' })
    }
  }
}

/**
 * 기본 SEO 점수 계산
 */
function calculateBasicSeoScore(newsletter) {
  const scores = {
    title: { score: 0, max: 20, feedback: [] },
    description: { score: 0, max: 20, feedback: [] },
    thumbnail: { score: 0, max: 15, feedback: [] },
    tags: { score: 0, max: 15, feedback: [] },
    content: { score: 0, max: 20, feedback: [] },
    metadata: { score: 0, max: 10, feedback: [] }
  }

  // 1. 제목 분석 (20점)
  const title = newsletter.title || ''
  if (title.length === 0) {
    scores.title.feedback.push({ type: 'error', message: '제목이 없습니다.' })
  } else if (title.length < 10) {
    scores.title.score = 5
    scores.title.feedback.push({ type: 'warning', message: '제목이 너무 짧습니다. (10자 이상 권장)' })
  } else if (title.length > 60) {
    scores.title.score = 10
    scores.title.feedback.push({ type: 'warning', message: '제목이 너무 깁니다. (60자 이하 권장 - 검색 결과에서 잘릴 수 있음)' })
  } else if (title.length >= 30 && title.length <= 50) {
    scores.title.score = 20
    scores.title.feedback.push({ type: 'success', message: '이상적인 제목 길이입니다. (30-50자)' })
  } else {
    scores.title.score = 15
    scores.title.feedback.push({ type: 'info', message: '제목 길이가 적절합니다.' })
  }

  // 키워드 포함 여부 체크 (간단한 휴리스틱)
  const keywords = ['인플루언서', '마케팅', '크리에이터', '브랜드', '캠페인', 'SNS', '유튜브', '틱톡', '인스타그램']
  const hasKeyword = keywords.some(kw => title.includes(kw))
  if (hasKeyword) {
    scores.title.feedback.push({ type: 'success', message: '핵심 키워드가 제목에 포함되어 있습니다.' })
  } else {
    scores.title.feedback.push({ type: 'tip', message: '관련 키워드를 제목에 포함하면 검색 노출이 향상됩니다.' })
  }

  // 2. 설명 분석 (20점)
  const description = newsletter.description || ''
  if (description.length === 0) {
    scores.description.feedback.push({ type: 'error', message: '설명이 없습니다. 검색 결과에 표시될 설명을 추가하세요.' })
  } else if (description.length < 50) {
    scores.description.score = 5
    scores.description.feedback.push({ type: 'warning', message: '설명이 너무 짧습니다. (50자 이상 권장)' })
  } else if (description.length > 160) {
    scores.description.score = 10
    scores.description.feedback.push({ type: 'warning', message: '설명이 너무 깁니다. (160자 이하 권장 - 검색 결과에서 잘릴 수 있음)' })
  } else if (description.length >= 80 && description.length <= 150) {
    scores.description.score = 20
    scores.description.feedback.push({ type: 'success', message: '이상적인 설명 길이입니다. (80-150자)' })
  } else {
    scores.description.score = 15
    scores.description.feedback.push({ type: 'info', message: '설명 길이가 적절합니다.' })
  }

  // 3. 썸네일 분석 (15점)
  if (newsletter.thumbnail_url) {
    scores.thumbnail.score = 15
    scores.thumbnail.feedback.push({ type: 'success', message: '썸네일 이미지가 설정되어 있습니다.' })

    // HTTPS 확인
    if (!newsletter.thumbnail_url.startsWith('https://')) {
      scores.thumbnail.score -= 5
      scores.thumbnail.feedback.push({ type: 'warning', message: '썸네일 URL이 HTTPS가 아닙니다.' })
    }
  } else {
    scores.thumbnail.feedback.push({ type: 'error', message: '썸네일 이미지가 없습니다. 소셜 공유 시 미리보기가 표시되지 않습니다.' })
  }

  // 4. 태그 분석 (15점)
  const tags = newsletter.tags || []
  if (tags.length === 0) {
    scores.tags.feedback.push({ type: 'error', message: '태그가 없습니다. 관련 키워드 태그를 추가하세요.' })
  } else if (tags.length < 3) {
    scores.tags.score = 5
    scores.tags.feedback.push({ type: 'warning', message: `태그가 ${tags.length}개 있습니다. (3-5개 권장)` })
  } else if (tags.length > 10) {
    scores.tags.score = 8
    scores.tags.feedback.push({ type: 'warning', message: '태그가 너무 많습니다. (10개 이하 권장)' })
  } else if (tags.length >= 3 && tags.length <= 7) {
    scores.tags.score = 15
    scores.tags.feedback.push({ type: 'success', message: `적절한 태그 개수입니다. (${tags.length}개)` })
  } else {
    scores.tags.score = 12
    scores.tags.feedback.push({ type: 'info', message: `태그 ${tags.length}개가 설정되어 있습니다.` })
  }

  // 5. 콘텐츠 분석 (20점)
  const htmlContent = newsletter.html_content || ''
  if (htmlContent.length === 0) {
    scores.content.feedback.push({ type: 'warning', message: 'HTML 콘텐츠가 저장되지 않았습니다. SEO 크롤링을 위해 콘텐츠를 저장하세요.' })
    scores.content.score = 5 // Stibee URL이 있으면 기본 점수
  } else {
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const wordCount = textContent.length

    if (wordCount < 300) {
      scores.content.score = 8
      scores.content.feedback.push({ type: 'warning', message: `콘텐츠가 짧습니다. (${wordCount}자 - 500자 이상 권장)` })
    } else if (wordCount >= 500 && wordCount <= 3000) {
      scores.content.score = 20
      scores.content.feedback.push({ type: 'success', message: `적절한 콘텐츠 길이입니다. (${wordCount}자)` })
    } else if (wordCount > 3000) {
      scores.content.score = 18
      scores.content.feedback.push({ type: 'info', message: `콘텐츠가 충분히 깁니다. (${wordCount}자)` })
    } else {
      scores.content.score = 15
      scores.content.feedback.push({ type: 'info', message: `콘텐츠 ${wordCount}자` })
    }

    // 이미지 태그 확인
    const imgCount = (htmlContent.match(/<img[^>]*>/gi) || []).length
    if (imgCount === 0) {
      scores.content.feedback.push({ type: 'tip', message: '이미지가 없습니다. 관련 이미지를 추가하면 참여율이 높아집니다.' })
    } else {
      scores.content.feedback.push({ type: 'success', message: `${imgCount}개의 이미지가 포함되어 있습니다.` })
    }

    // 헤딩 태그 확인
    const headingCount = (htmlContent.match(/<h[1-6][^>]*>/gi) || []).length
    if (headingCount === 0) {
      scores.content.feedback.push({ type: 'tip', message: '제목 태그(h1-h6)가 없습니다. 구조화된 제목을 사용하면 SEO에 좋습니다.' })
    } else {
      scores.content.feedback.push({ type: 'success', message: `${headingCount}개의 제목 태그가 사용되었습니다.` })
    }

    // 링크 확인
    const linkCount = (htmlContent.match(/<a[^>]*href/gi) || []).length
    if (linkCount > 0) {
      scores.content.feedback.push({ type: 'info', message: `${linkCount}개의 링크가 포함되어 있습니다.` })
    }
  }

  // 6. 메타데이터 분석 (10점)
  if (newsletter.published_at) {
    scores.metadata.score += 3
    scores.metadata.feedback.push({ type: 'success', message: '발행일이 설정되어 있습니다.' })
  } else {
    scores.metadata.feedback.push({ type: 'warning', message: '발행일이 설정되지 않았습니다.' })
  }

  if (newsletter.category) {
    scores.metadata.score += 3
    scores.metadata.feedback.push({ type: 'success', message: '카테고리가 설정되어 있습니다.' })
  } else {
    scores.metadata.feedback.push({ type: 'warning', message: '카테고리가 설정되지 않았습니다.' })
  }

  if (newsletter.issue_number) {
    scores.metadata.score += 2
    scores.metadata.feedback.push({ type: 'success', message: '호수가 설정되어 있습니다.' })
  }

  if (newsletter.stibee_url) {
    scores.metadata.score += 2
    scores.metadata.feedback.push({ type: 'success', message: 'Stibee URL이 연결되어 있습니다.' })
  }

  // 총점 계산
  const totalScore = Object.values(scores).reduce((sum, item) => sum + item.score, 0)
  const maxScore = Object.values(scores).reduce((sum, item) => sum + item.max, 0)

  // 등급 결정
  let grade, gradeLabel, gradeColor
  const percentage = (totalScore / maxScore) * 100
  if (percentage >= 90) {
    grade = 'A+'
    gradeLabel = '매우 좋음'
    gradeColor = 'green'
  } else if (percentage >= 80) {
    grade = 'A'
    gradeLabel = '좋음'
    gradeColor = 'green'
  } else if (percentage >= 70) {
    grade = 'B'
    gradeLabel = '보통'
    gradeColor = 'blue'
  } else if (percentage >= 60) {
    grade = 'C'
    gradeLabel = '개선 필요'
    gradeColor = 'yellow'
  } else if (percentage >= 50) {
    grade = 'D'
    gradeLabel = '미흡'
    gradeColor = 'orange'
  } else {
    grade = 'F'
    gradeLabel = '매우 미흡'
    gradeColor = 'red'
  }

  return {
    totalScore,
    maxScore,
    percentage: Math.round(percentage),
    grade,
    gradeLabel,
    gradeColor,
    breakdown: scores
  }
}

/**
 * Gemini API를 통한 상세 SEO 분석
 */
async function analyzeWithGemini(newsletter, basicScore, apiKey) {
  const OpenAI = require('openai')

  const gemini = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
  })

  const prompt = `
당신은 SEO 전문가입니다. 다음 뉴스레터의 SEO를 분석하고 구체적인 개선 제안을 해주세요.

## 뉴스레터 정보
- 제목: ${newsletter.title || '없음'}
- 설명: ${newsletter.description || '없음'}
- 카테고리: ${newsletter.category || '없음'}
- 태그: ${(newsletter.tags || []).join(', ') || '없음'}
- 콘텐츠 길이: ${(newsletter.html_content || '').length}자

## 현재 SEO 점수
- 총점: ${basicScore.totalScore}/${basicScore.maxScore} (${basicScore.percentage}%)
- 등급: ${basicScore.grade} (${basicScore.gradeLabel})

다음 JSON 형식으로 응답해주세요:

{
  "summary": "전반적인 SEO 상태 요약 (2-3문장)",
  "titleSuggestions": [
    {
      "original": "현재 제목",
      "suggested": "개선된 제목 제안 1",
      "reason": "개선 이유"
    }
  ],
  "descriptionSuggestions": [
    {
      "suggested": "개선된 설명 제안",
      "reason": "개선 이유"
    }
  ],
  "tagSuggestions": ["추천 태그 1", "추천 태그 2", "추천 태그 3"],
  "contentTips": [
    "콘텐츠 개선 팁 1",
    "콘텐츠 개선 팁 2"
  ],
  "quickWins": [
    "빠르게 적용 가능한 개선사항 1",
    "빠르게 적용 가능한 개선사항 2"
  ],
  "priorityActions": [
    {
      "action": "가장 중요한 조치",
      "impact": "high/medium/low",
      "effort": "easy/medium/hard"
    }
  ]
}

JSON 형식으로만 응답해주세요. 한국어로 작성해주세요.
`

  const response = await gemini.chat.completions.create({
    model: 'gemini-1.5-flash-latest',
    messages: [
      {
        role: 'system',
        content: '당신은 콘텐츠 마케팅과 SEO 전문가입니다. 뉴스레터의 검색 노출을 최적화하는 구체적이고 실행 가능한 조언을 제공합니다.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  })

  const content = response.choices[0].message.content
  const jsonMatch = content.match(/\{[\s\S]*\}/)

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }

  throw new Error('AI 응답을 파싱할 수 없습니다.')
}

/**
 * 기본 개선 제안 (Gemini 사용 불가 시)
 */
function getDefaultSuggestions(basicScore) {
  const suggestions = []

  // 점수가 낮은 항목에 대한 제안
  Object.entries(basicScore.breakdown).forEach(([key, item]) => {
    const percentage = (item.score / item.max) * 100
    if (percentage < 70) {
      switch (key) {
        case 'title':
          suggestions.push('제목을 30-50자 사이로 조정하고, 핵심 키워드를 앞쪽에 배치하세요.')
          break
        case 'description':
          suggestions.push('80-150자 사이의 설명을 작성하고, 내용을 간결하게 요약하세요.')
          break
        case 'thumbnail':
          suggestions.push('소셜 공유를 위한 대표 이미지를 설정하세요. (1200x630px 권장)')
          break
        case 'tags':
          suggestions.push('관련 키워드 태그를 3-5개 추가하세요.')
          break
        case 'content':
          suggestions.push('HTML 콘텐츠를 저장하고, 적절한 제목 태그(h2, h3)를 사용하세요.')
          break
        case 'metadata':
          suggestions.push('발행일과 카테고리를 설정하세요.')
          break
      }
    }
  })

  return {
    summary: `현재 SEO 점수는 ${basicScore.totalScore}점(${basicScore.percentage}%)입니다. 아래 항목들을 개선하면 검색 노출이 향상됩니다.`,
    quickWins: suggestions.slice(0, 3),
    contentTips: [
      '핵심 키워드를 제목과 설명의 앞부분에 배치하세요.',
      '소셜 미디어 공유를 위한 매력적인 썸네일을 설정하세요.',
      '관련 태그를 추가하여 검색 가능성을 높이세요.'
    ]
  }
}
