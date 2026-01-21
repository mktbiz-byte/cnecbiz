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

    // 현재 상태 체크 (100점 기준으로 엄격하게)
    const currentDesc = newsletter.description || ''
    const currentTitle = newsletter.title || ''
    // tags는 PostgreSQL 배열 타입 (text[])
    const currentTags = Array.isArray(newsletter.tags) ? newsletter.tags : []

    // 100점 기준: 설명 80-150자, 태그 5개+, 제목 30-50자
    const needsDescription = currentDesc.length < 80 || currentDesc.length > 150
    const needsTags = currentTags.length < 5
    const needsTitle = currentTitle.length < 30 || currentTitle.length > 50

    console.log('[auto-fix-seo] Title length:', currentTitle.length, 'needs fix:', needsTitle)
    console.log('[auto-fix-seo] Desc length:', currentDesc.length, 'needs fix:', needsDescription)
    console.log('[auto-fix-seo] Tags count:', currentTags.length, 'needs fix:', needsTags)

    // 1. 제목 최적화 (30-50자로 강제 조정)
    if (needsTitle) {
      if (aiSuggestions.title && aiSuggestions.title.length >= 30 && aiSuggestions.title.length <= 50) {
        updates.title = aiSuggestions.title
        changes.push(`제목 SEO 최적화 (${aiSuggestions.title.length}자)`)
      } else if (currentTitle.length > 50) {
        // 너무 길면 자르기
        updates.title = currentTitle.slice(0, 47) + '...'
        changes.push(`제목 길이 조정 (50자 이하)`)
      } else if (currentTitle.length < 30 && aiSuggestions.title) {
        // 너무 짧으면 AI 제안 사용 (길이 상관없이)
        updates.title = aiSuggestions.title.slice(0, 50)
        changes.push(`제목 확장 (${aiSuggestions.title.length}자)`)
      }
    }

    // 2. 설명 최적화 (80-150자로 강제 조정)
    if (needsDescription) {
      if (aiSuggestions.description && aiSuggestions.description.length >= 80 && aiSuggestions.description.length <= 150) {
        updates.description = aiSuggestions.description
        changes.push(`메타 설명 최적화 (${aiSuggestions.description.length}자)`)
      } else if (aiSuggestions.description) {
        // AI 설명을 80-150자로 조정
        let desc = aiSuggestions.description
        if (desc.length > 150) {
          desc = desc.slice(0, 147) + '...'
        } else if (desc.length < 80) {
          desc = `${desc} 크넥 뉴스레터에서 마케팅 인사이트와 최신 트렌드를 확인하세요.`.slice(0, 150)
        }
        updates.description = desc
        changes.push(`메타 설명 생성 (${desc.length}자)`)
      } else {
        // AI 실패 시 제목 기반으로 80자 이상 설명 생성
        const fallbackDesc = `${newsletter.title}에 대한 상세한 인사이트와 전략을 확인하세요. 크넥 뉴스레터에서 최신 마케팅 트렌드와 성공 사례를 만나보세요.`
        updates.description = fallbackDesc.slice(0, 150)
        changes.push(`메타 설명 자동 생성 (${updates.description.length}자)`)
      }
    }

    // 3. 태그 추가 (5개 미만이면 무조건 5개 이상으로)
    if (needsTags) {
      let newTags = []
      if (aiSuggestions.tags && aiSuggestions.tags.length > 0) {
        newTags = aiSuggestions.tags.slice(0, 7)
      } else {
        // AI 실패 시 기본 태그 생성
        newTags = ['마케팅', '인플루언서', '크리에이터', '브랜드', '트렌드', '디지털마케팅', '콘텐츠']
      }

      const allTags = [...new Set([...currentTags, ...newTags])].slice(0, 7)
      // 최소 5개 보장
      while (allTags.length < 5) {
        const defaultTags = ['SNS', '성장전략', '브랜딩', '광고', '소셜미디어']
        for (const t of defaultTags) {
          if (!allTags.includes(t) && allTags.length < 5) {
            allTags.push(t)
          }
        }
      }
      // tags는 PostgreSQL 배열 타입 - 배열로 저장
      updates.tags = allTags
      changes.push(`태그 ${allTags.length}개로 보강`)
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

  // 3. 소제목(h2, h3) 구조 확인 및 추가 (100점을 위해 필수)
  const hasH2 = /<h2[^>]*>/i.test(optimized)
  const hasH3 = /<h3[^>]*>/i.test(optimized)

  if (!hasH2 && !hasH3) {
    // 기본 소제목 생성 (AI 제안 없으면 기본값)
    const headingText = (suggestions.headings && suggestions.headings[0]) || `${title} 핵심 포인트`
    const headingHtml = `<h2 style="margin-top:24px;margin-bottom:12px;font-size:20px;font-weight:bold;color:#333;">${headingText}</h2>`

    let headingInserted = false

    // P 태그 기반
    const paragraphs = optimized.split(/<\/p>/i)
    if (!headingInserted && paragraphs.length > 2) {
      const insertIdx = Math.floor(paragraphs.length / 3)
      paragraphs.splice(insertIdx, 0, `</p>${headingHtml}<p>`)
      optimized = paragraphs.join('</p>')
      headingInserted = true
    }

    // BR 태그 기반 (Stibee)
    if (!headingInserted) {
      const brSections = optimized.split(/<br\s*\/?>\s*<br\s*\/?>/i)
      if (brSections.length > 2) {
        const insertIdx = Math.floor(brSections.length / 3)
        brSections.splice(insertIdx, 0, `\n${headingHtml}\n`)
        optimized = brSections.join('<br><br>')
        headingInserted = true
      }
    }

    // DIV 태그 기반
    if (!headingInserted) {
      const divs = optimized.split(/<\/div>/i)
      if (divs.length > 2) {
        const insertIdx = Math.floor(divs.length / 3)
        divs.splice(insertIdx, 0, `</div>${headingHtml}<div>`)
        optimized = divs.join('</div>')
        headingInserted = true
      }
    }

    // 최후 수단: 콘텐츠 시작 부분
    if (!headingInserted) {
      if (/<body[^>]*>/i.test(optimized)) {
        optimized = optimized.replace(/(<body[^>]*>)/i, `$1\n${headingHtml}`)
      } else {
        optimized = headingHtml + optimized
      }
      headingInserted = true
    }

    if (headingInserted) {
      contentChanges.push('SEO 소제목(H2) 추가')
    }
  }

  // 4. AI 이미지 콘텐츠 중간 삽입 (2-3개 이미지 추가)
  const existingImages = (optimized.match(/<img/gi) || []).length
  const targetImageCount = 3 // 목표 이미지 수
  const imagesToAdd = Math.max(0, targetImageCount - existingImages)

  if (imagesToAdd > 0) {
    try {
      console.log(`[auto-fix-seo] Adding ${imagesToAdd} images (existing: ${existingImages})`)

      // AI 키워드 추출
      const keywords = await extractKeywords(suggestions.imagePrompt || title, apiKey)
      console.log('[auto-fix-seo] Keywords:', keywords)

      // 여러 이미지 URL 가져오기 (중복 방지)
      const imageUrls = getMultipleImages(keywords, imagesToAdd)
      console.log('[auto-fix-seo] Image URLs:', imageUrls)

      // 이미지별 alt/title 생성
      const altTexts = [
        suggestions.imageAlt || `${title} - 핵심 인사이트`,
        `${title} - 실전 전략 가이드`,
        `${title} - 성공 사례 분석`
      ]
      const titleTexts = [
        suggestions.imageTitle || `${title} 관련 시각 자료`,
        `${title} 전략 인포그래픽`,
        `${title} 데이터 분석`
      ]

      let insertedCount = 0

      // HTML 구조 감지 (Stibee vs Custom)
      const isTableBased = /<table/i.test(optimized)
      const hasParagraphs = (optimized.match(/<\/p>/gi) || []).length > 2
      const hasBrBreaks = (optimized.match(/<br\s*\/?>\s*<br\s*\/?>/gi) || []).length > 2
      const hasDivs = (optimized.match(/<\/div>/gi) || []).length > 3
      const hasTds = (optimized.match(/<\/td>/gi) || []).length > 2

      console.log(`[auto-fix-seo] HTML structure: table=${isTableBased}, p=${hasParagraphs}, br=${hasBrBreaks}, div=${hasDivs}, td=${hasTds}`)

      // 범용 이미지 삽입 함수
      const insertImageAtPosition = (html, position) => {
        // 위치: 'top', 'middle', 'bottom'
        const ratio = position === 'top' ? 0.15 : position === 'middle' ? 0.45 : 0.75

        // 1. P 태그 기반 삽입 (커스텀 에디터)
        if (hasParagraphs) {
          const parts = optimized.split(/<\/p>/i)
          const idx = Math.max(1, Math.floor(parts.length * ratio))
          parts.splice(idx, 0, `</p>\n${html}\n<p>`)
          optimized = parts.join('</p>')
          return true
        }

        // 2. BR 태그 기반 삽입 (Stibee 텍스트)
        if (hasBrBreaks) {
          const parts = optimized.split(/<br\s*\/?>\s*<br\s*\/?>/i)
          const idx = Math.max(1, Math.floor(parts.length * ratio))
          parts.splice(idx, 0, `\n${html}\n`)
          optimized = parts.join('<br><br>')
          return true
        }

        // 3. TD 태그 기반 삽입 (Stibee 테이블)
        if (hasTds) {
          const parts = optimized.split(/<\/td>/i)
          const idx = Math.max(1, Math.floor(parts.length * ratio))
          parts.splice(idx, 0, `</td><td style="padding:16px;">${html}</td><td`)
          optimized = parts.join('</td>')
          return true
        }

        // 4. DIV 태그 기반 삽입
        if (hasDivs) {
          const parts = optimized.split(/<\/div>/i)
          const idx = Math.max(1, Math.floor(parts.length * ratio))
          parts.splice(idx, 0, `</div>\n${html}\n<div>`)
          optimized = parts.join('</div>')
          return true
        }

        // 5. 최후 수단: 문자열 길이 기준
        const charIdx = Math.floor(optimized.length * ratio)
        // 가장 가까운 > 태그 찾기
        let insertIdx = optimized.indexOf('>', charIdx)
        if (insertIdx === -1) insertIdx = charIdx
        optimized = optimized.slice(0, insertIdx + 1) + `\n${html}\n` + optimized.slice(insertIdx + 1)
        return true
      }

      // 이미지 삽입 위치들
      const positions = ['top', 'middle', 'bottom']

      // 각 이미지 삽입 (항상 성공하도록)
      for (let i = 0; i < imagesToAdd && i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i]
        const altText = altTexts[i] || `${title} 이미지 ${i + 1}`
        const titleText = titleTexts[i] || `${title} 관련 자료 ${i + 1}`
        const position = positions[i] || 'middle'

        const imageHtml = `<figure style="text-align:center;margin:24px 0;"><img src="${imageUrl}" alt="${altText}" title="${titleText}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);" loading="lazy" /><figcaption style="font-size:12px;color:#666;margin-top:8px;">${titleText}</figcaption></figure>`

        if (insertImageAtPosition(imageHtml, position)) {
          insertedCount++
          console.log(`[auto-fix-seo] Image ${i + 1} inserted at ${position}`)
        }
      }

      if (insertedCount > 0) {
        contentChanges.push(`AI 이미지 ${insertedCount}개 삽입`)
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
 * AI 키워드 추출 (캐시 가능)
 */
async function extractKeywords(prompt, apiKey) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract 3-5 simple English keywords for finding stock photos related to this topic:
"${prompt}"

Requirements:
- Only common, general words that would match stock photos
- Business/marketing/technology related
- Separate with commas
- Example output: marketing, business, digital, team, strategy

Return ONLY the keywords, nothing else:`
            }]
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 50 }
        }),
        signal: controller.signal
      }
    )

    clearTimeout(timeout)

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const keywords = text.trim().toLowerCase()
      .replace(/[^a-z,\s]/g, '')
      .split(/[,\s]+/)
      .filter(k => k.length > 2)
      .slice(0, 5)

    return keywords.length > 0 ? keywords : ['marketing', 'business', 'digital']
  } catch (error) {
    console.error('[auto-fix-seo] Keyword extraction error:', error.message)
    return ['marketing', 'business', 'digital']
  }
}

/**
 * 여러 이미지 URL 가져오기 (중복 방지)
 */
function getMultipleImages(keywords, count) {
  const usedImages = new Set()
  const images = []

  // 키워드별로 이미지 가져오기
  for (const keyword of keywords) {
    if (images.length >= count) break
    const img = getImageByKeyword(keyword)
    if (img && !usedImages.has(img)) {
      usedImages.add(img)
      images.push(img)
    }
  }

  // 부족하면 랜덤 이미지 추가
  while (images.length < count) {
    const img = getRandomBusinessImage()
    if (!usedImages.has(img)) {
      usedImages.add(img)
      images.push(img)
    }
  }

  return images
}

/**
 * 단일 키워드로 이미지 가져오기
 */
function getImageByKeyword(keyword) {
  const keywordImages = getKeywordImageMap()
  return keywordImages[keyword] || null
}

/**
 * 키워드-이미지 맵 반환
 */
function getKeywordImageMap() {
  return {
    // 마케팅 관련
    marketing: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&h=630&fit=crop',
    digital: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop',
    social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=630&fit=crop',
    media: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&h=630&fit=crop',
    advertising: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=630&fit=crop',
    campaign: 'https://images.unsplash.com/photo-1557838923-2985c318be48?w=1200&h=630&fit=crop',

    // 비즈니스 관련
    business: 'https://images.unsplash.com/photo-1664575602554-2087b04935a5?w=1200&h=630&fit=crop',
    strategy: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&fit=crop',
    team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=630&fit=crop',
    meeting: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=630&fit=crop',
    office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=630&fit=crop',
    collaboration: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&h=630&fit=crop',
    planning: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop',

    // 기술 관련
    technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop',
    tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop',
    data: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    analytics: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
    automation: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop',

    // 크리에이터/인플루언서
    creator: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&h=630&fit=crop',
    influencer: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&h=630&fit=crop',
    content: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop',
    video: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&h=630&fit=crop',
    youtube: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=1200&h=630&fit=crop',
    instagram: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=630&fit=crop',

    // 쇼핑/이커머스
    shopping: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=630&fit=crop',
    ecommerce: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=630&fit=crop',
    retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=630&fit=crop',
    product: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=630&fit=crop',

    // 성장/트렌드
    growth: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop',
    trend: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop',
    success: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=1200&h=630&fit=crop',
    performance: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop',

    // 브랜드
    brand: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1200&h=630&fit=crop',
    branding: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1200&h=630&fit=crop',
    identity: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1200&h=630&fit=crop',

    // 커뮤니케이션
    communication: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop',
    network: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop',
    connection: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&h=630&fit=crop',
  }
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

    // 첫 번째 매칭 키워드로 이미지 반환
    for (const keyword of keywords) {
      const img = getImageByKeyword(keyword)
      if (img) {
        console.log('[auto-fix-seo] Using category image for keyword:', keyword)
        return img
      }
    }

    // 폴백: 기본 비즈니스 이미지
    return getRandomBusinessImage()
  } catch (error) {
    console.error('[auto-fix-seo] Image generation error:', error.message)
    return getRandomBusinessImage()
  }
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
