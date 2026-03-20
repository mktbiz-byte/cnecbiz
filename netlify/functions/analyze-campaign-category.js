const { createClient } = require('@supabase/supabase-js')

/**
 * AI Campaign Product Category Analysis
 *
 * Analyzes campaign product info (brand, product_name, product_description)
 * and determines which creator categories it belongs to.
 * After analysis, triggers recommendation generation.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const VALID_CATEGORIES = [
  'skincare', 'makeup', 'diet', 'haircare', 'fashion',
  'lifestyle', 'food', 'family', 'pet', 'travel', 'tech', 'game'
]

// Lazy-init Supabase clients
let _clients = {}

function getClient(region) {
  if (_clients[region]) return _clients[region]

  const configs = {
    korea: { url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY },
    japan: { url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY },
    us: { url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY },
    biz: { url: process.env.VITE_SUPABASE_BIZ_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  }

  const cfg = configs[region]
  if (!cfg || !cfg.url || !cfg.key) throw new Error(`DB config missing for region: ${region}`)
  _clients[region] = createClient(cfg.url, cfg.key)
  return _clients[region]
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { campaignId, region = 'korea' } = JSON.parse(event.body)

    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인 ID가 필요합니다.' })
      }
    }

    console.log(`[AnalyzeCategory] Starting for campaign ${campaignId} (region: ${region})`)

    // 1. Fetch campaign from the correct regional DB
    const regionClient = getClient(region)
    let campaign = null

    const { data, error } = await regionClient
      .from('campaigns')
      .select('id, title, brand, product_name, product_description, requirements, product_link, campaign_type')
      .eq('id', campaignId)
      .single()

    if (error || !data) {
      // Fallback to BIZ DB
      const { data: bizData } = await getClient('biz')
        .from('campaigns')
        .select('id, title, brand, product_name, product_description, requirements, product_link, campaign_type')
        .eq('id', campaignId)
        .single()
      campaign = bizData
    } else {
      campaign = data
    }

    if (!campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' })
      }
    }

    // 2. Analyze with Gemini
    let productCategories = null

    if (GEMINI_API_KEY && (campaign.product_name || campaign.brand || campaign.product_description)) {
      productCategories = await analyzeWithGemini(campaign)
    }

    // 3. Fallback: basic keyword matching
    if (!productCategories) {
      productCategories = analyzeWithKeywords(campaign)
    }

    // 4. Save to campaign record
    const updateClient = getClient(region)
    const { error: updateError } = await updateClient
      .from('campaigns')
      .update({ product_categories: productCategories })
      .eq('id', campaignId)

    if (updateError) {
      console.error('[AnalyzeCategory] Update error:', updateError)
    } else {
      console.log(`[AnalyzeCategory] Saved categories for ${campaignId}:`, productCategories)
    }

    // 5. Trigger recommendation generation (fire-and-forget)
    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${baseUrl}/.netlify/functions/generate-campaign-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, region })
      })
      console.log('[AnalyzeCategory] Triggered recommendation generation')
    } catch (triggerErr) {
      console.warn('[AnalyzeCategory] Recommendation trigger failed:', triggerErr.message)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, product_categories: productCategories })
    }

  } catch (error) {
    console.error('[AnalyzeCategory] Error:', error)

    // Error alert
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'analyze-campaign-category',
          errorMessage: error.message,
          context: { campaignId: JSON.parse(event.body)?.campaignId }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}

/**
 * Analyze campaign product with Gemini AI
 */
async function analyzeWithGemini(campaign) {
  const prompt = `당신은 상품 카테고리 분석 전문가입니다.
다음 캠페인 상품 정보를 분석하여, 가장 적합한 크리에이터 카테고리를 판별해주세요.

사용 가능한 카테고리 목록:
- skincare: 스킨케어 (화장수, 세럼, 크림, 선크림, 마스크팩 등)
- makeup: 색조 (립, 아이섀도우, 파운데이션, 블러셔, 컨실러 등)
- diet: 다이어트 (건강식품, 운동기구, 보조제, 체중관리 등)
- haircare: 헤어케어 (샴푸, 트리트먼트, 헤어에센스, 염색 등)
- fashion: 패션 (의류, 가방, 액세서리, 신발 등)
- lifestyle: 라이프스타일 (인테리어, 가전, 생활용품, 향수 등)
- food: 먹방/요리 (식품, 음료, 조리기구, 밀키트 등)
- family: 가족출연 (육아용품, 키즈, 가족 여행 등)
- pet: 반려동물 (펫사료, 펫용품, 펫패션 등)
- travel: 여행 (숙박, 항공, 여행용품, 관광지 등)
- tech: 테크/IT (전자기기, 앱, 소프트웨어 등)
- game: 게임 (모바일게임, PC게임, 게이밍기어 등)

상품 정보:
- 브랜드: ${campaign.brand || '미정'}
- 상품명: ${campaign.product_name || '미정'}
- 상품 설명: ${(campaign.product_description || '').substring(0, 500)}
- 캠페인 제목: ${campaign.title || ''}
- 요구사항: ${(campaign.requirements || '').substring(0, 300)}

JSON으로만 응답:
{
  "primary": "가장 적합한 카테고리 1개 (위 목록 중)",
  "secondary": ["관련 카테고리 0~2개 (선택)"],
  "confidence": 0.0~1.0,
  "reason": "판단 근거 (한 줄)"
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
          responseMimeType: 'application/json'
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!resultText) {
    throw new Error('Empty Gemini response')
  }

  const result = JSON.parse(resultText)

  // Validate categories
  if (!VALID_CATEGORIES.includes(result.primary)) {
    console.warn('[AnalyzeCategory] Invalid primary category:', result.primary)
    return null
  }

  result.secondary = (result.secondary || []).filter(c => VALID_CATEGORIES.includes(c) && c !== result.primary)
  result.analyzed_at = new Date().toISOString()
  result.analysis_source = 'gemini'

  return result
}

/**
 * Fallback: basic keyword matching when Gemini is unavailable
 */
function analyzeWithKeywords(campaign) {
  const text = [
    campaign.brand,
    campaign.product_name,
    campaign.product_description,
    campaign.title,
    campaign.requirements
  ].filter(Boolean).join(' ').toLowerCase()

  const categoryKeywords = {
    skincare: ['스킨케어', '세럼', '크림', '선크림', '마스크팩', '토너', '화장수', '클렌징', '앰플', '보습', '미백', '주름', 'skincare', 'serum', 'cream', 'sunscreen', 'moisturizer'],
    makeup: ['색조', '립스틱', '립', '아이섀도우', '파운데이션', '블러셔', '컨실러', '메이크업', '쿠션', 'makeup', 'lipstick', 'eyeshadow', 'foundation'],
    diet: ['다이어트', '운동', '건강식품', '보조제', '프로틴', '체중', '피트니스', 'diet', 'fitness', 'protein', 'supplement'],
    haircare: ['헤어', '샴푸', '트리트먼트', '염색', '헤어에센스', '두피', '탈모', 'hair', 'shampoo', 'treatment'],
    fashion: ['패션', '의류', '가방', '신발', '액세서리', '코디', '옷', 'fashion', 'clothing', 'bag', 'shoes'],
    lifestyle: ['라이프스타일', '인테리어', '가전', '생활', '향수', '디퓨저', '홈', 'lifestyle', 'home', 'perfume', 'interior'],
    food: ['먹방', '요리', '식품', '음료', '밀키트', '맛집', '레시피', 'food', 'recipe', 'cooking', 'restaurant'],
    family: ['육아', '아이', '키즈', '가족', '유아', '임산부', '태교', 'baby', 'kids', 'family', 'parenting'],
    pet: ['반려', '펫', '강아지', '고양이', '사료', 'pet', 'dog', 'cat'],
    travel: ['여행', '호텔', '숙박', '항공', '관광', '리조트', 'travel', 'hotel', 'resort'],
    tech: ['테크', 'IT', '전자', '앱', '스마트', '가젯', 'tech', 'gadget', 'smart', 'app'],
    game: ['게임', '게이밍', '플레이', 'game', 'gaming', 'esports']
  }

  const scores = {}
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = keywords.filter(kw => text.includes(kw)).length
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).filter(([, s]) => s > 0)

  if (sorted.length === 0) {
    return {
      primary: 'lifestyle',
      secondary: [],
      confidence: 0.3,
      reason: '키워드 매칭 실패, 기본값 사용',
      analyzed_at: new Date().toISOString(),
      analysis_source: 'keyword_fallback'
    }
  }

  const primary = sorted[0][0]
  const secondary = sorted.slice(1, 3).map(([cat]) => cat)

  return {
    primary,
    secondary,
    confidence: Math.min(sorted[0][1] * 0.2, 0.8),
    reason: `키워드 매칭: ${sorted[0][1]}건`,
    analyzed_at: new Date().toISOString(),
    analysis_source: 'keyword_fallback'
  }
}
