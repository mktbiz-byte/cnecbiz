const { createClient } = require('@supabase/supabase-js')

/**
 * Unified Campaign Creator Recommendation Generator
 *
 * Uses campaign's product_categories + creator category grades + CNEC grades
 * to generate AI-powered creator recommendations.
 *
 * Stores results in campaign_creator_matches (BIZ DB).
 * Replaces client-side Gemini calls for security.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const CATEGORY_GRADE_SCORES = {
  'Bronze': 20, 'Silver': 40, 'Gold': 60, 'Platinum': 80, 'Diamond': 100
}

const CNEC_GRADE_BONUS = { 1: 0, 2: 5, 3: 10, 4: 15, 5: 20 }

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

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const { campaignId, region = 'korea', force = false } = JSON.parse(event.body)

    if (!campaignId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '캠페인 ID가 필요합니다.' }) }
    }

    console.log(`[GenRec] Starting for campaign ${campaignId} (region: ${region}, force: ${force})`)

    const bizClient = getClient('biz')
    const regionClient = getClient(region)

    // 1. Check for existing recommendations (unless force refresh)
    if (!force) {
      const { data: existing } = await bizClient
        .from('campaign_creator_matches')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('source_version', 'v2')
        .limit(1)

      if (existing && existing.length > 0) {
        console.log(`[GenRec] Existing v2 recommendations found for ${campaignId}, skipping`)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Already generated', cached: true })
        }
      }
    }

    // 2. Fetch campaign with product_categories
    let campaign = null
    const { data: regionCampaign } = await regionClient
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (regionCampaign) {
      campaign = regionCampaign
    } else {
      const { data: bizCampaign } = await bizClient
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      campaign = bizCampaign
    }

    if (!campaign) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' }) }
    }

    const productCats = campaign.product_categories
    console.log(`[GenRec] Product categories:`, productCats)

    // 3. Fetch featured creators (grade 2+, active) from Korea DB
    const { data: creators, error: creatorsError } = await getClient('korea')
      .from('featured_creators')
      .select('*')
      .gte('cnec_grade_level', 1)
      .eq('is_active', true)
      .limit(200)

    if (creatorsError) throw new Error(`크리에이터 조회 실패: ${creatorsError.message}`)
    if (!creators || creators.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, recommendations: [], message: '추천 가능한 크리에이터가 없습니다.' }) }
    }

    console.log(`[GenRec] Found ${creators.length} active featured creators`)

    // 4. Fetch category grades from BIZ DB (cross-DB merge)
    const creatorIds = creators.map(c => c.id).filter(Boolean)
    let categoryGradesMap = {}

    if (creatorIds.length > 0) {
      const { data: grades } = await bizClient
        .from('creator_category_grades')
        .select('creator_id, category_id, grade_level, score')
        .in('creator_id', creatorIds)

      ;(grades || []).forEach(g => {
        if (!categoryGradesMap[g.creator_id]) categoryGradesMap[g.creator_id] = []
        categoryGradesMap[g.creator_id].push(g)
      })
    }

    // 5. Enrich creators with category grades + calculate pre-scores
    const enrichedCreators = creators.map(c => {
      const catGrades = categoryGradesMap[c.id] || []
      const categoryScore = calculateCategoryScore(productCats, c.categories, catGrades)
      const cnecBonus = CNEC_GRADE_BONUS[c.cnec_grade_level || 1] || 0

      return {
        ...c,
        category_grades: catGrades,
        category_match_score: categoryScore.score,
        matched_categories: categoryScore.matchedCategories,
        is_primary_match: categoryScore.isPrimaryMatch,
        pre_score: categoryScore.score + cnecBonus
      }
    })

    // Sort by pre_score for Gemini (top 50)
    enrichedCreators.sort((a, b) => b.pre_score - a.pre_score)
    const topCandidates = enrichedCreators.slice(0, 50)

    // 6. AI-enhanced scoring
    let matchingResults = []

    if (GEMINI_API_KEY && topCandidates.length > 0) {
      try {
        matchingResults = await generateGeminiMatching(campaign, topCandidates)
      } catch (aiErr) {
        console.error('[GenRec] Gemini failed, using basic scoring:', aiErr.message)
        matchingResults = generateBasicMatching(campaign, topCandidates)
      }
    } else {
      matchingResults = generateBasicMatching(campaign, topCandidates)
    }

    // 7. Sort and assign ranks
    matchingResults.sort((a, b) => b.match_score - a.match_score)
    matchingResults.forEach((result, index) => {
      result.is_recommended = index < 20
      result.recommendation_rank = index + 1
    })

    // 8. Delete old v2 results and insert new
    await bizClient
      .from('campaign_creator_matches')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('source_version', 'v2')

    const toInsert = matchingResults.slice(0, 20).map(r => ({
      campaign_id: campaignId,
      creator_application_id: r.creator_id,
      match_score: r.match_score,
      match_reasons: r.match_reasons,
      category_match_score: r.category_match_score,
      audience_match_score: r.audience_match_score || 50,
      engagement_score: r.engagement_score || 50,
      follower_score: r.follower_score || 50,
      content_style_score: r.content_style_score || 50,
      category_grade_score: r.category_grade_score || 0,
      cnec_grade_score: r.cnec_grade_score || 0,
      matched_categories: r.matched_categories || [],
      recommendation_summary: r.recommendation_summary || '',
      is_recommended: r.is_recommended,
      recommendation_rank: r.recommendation_rank,
      source_version: 'v2'
    }))

    if (toInsert.length > 0) {
      const { error: insertError } = await bizClient
        .from('campaign_creator_matches')
        .insert(toInsert)

      if (insertError) {
        console.error('[GenRec] Insert error:', insertError)
      } else {
        console.log(`[GenRec] Saved ${toInsert.length} recommendations for campaign ${campaignId}`)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total_candidates: creators.length,
        recommendations_count: toInsert.length,
        product_categories: productCats
      })
    }

  } catch (error) {
    console.error('[GenRec] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'generate-campaign-recommendations',
          errorMessage: error.message,
          context: { campaignId: JSON.parse(event.body)?.campaignId }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}

/**
 * Calculate category match score
 */
function calculateCategoryScore(productCats, creatorCats, categoryGrades) {
  if (!productCats || !productCats.primary || !creatorCats || creatorCats.length === 0) {
    return { score: 0, matchedCategories: [], isPrimaryMatch: false }
  }

  const allCampaignCats = [productCats.primary, ...(productCats.secondary || [])].filter(Boolean)
  const overlap = allCampaignCats.filter(c => creatorCats.includes(c))

  if (overlap.length === 0) {
    return { score: 0, matchedCategories: [], isPrimaryMatch: false }
  }

  const bestGrade = Math.max(...overlap.map(catId => {
    const grade = categoryGrades.find(g => g.category_id === catId)
    return grade ? (CATEGORY_GRADE_SCORES[grade.grade_level] || 20) : 20
  }))

  const isPrimaryMatch = overlap.includes(productCats.primary)

  return {
    score: Math.min(bestGrade + (isPrimaryMatch ? 10 : 0), 100),
    matchedCategories: overlap,
    isPrimaryMatch
  }
}

/**
 * Gemini AI matching for top candidates
 */
async function generateGeminiMatching(campaign, candidates) {
  const productCats = campaign.product_categories
  const primaryCat = productCats?.primary || '미분류'

  const creatorSummaries = candidates.slice(0, 30).map(c => ({
    id: c.id,
    name: c.name || c.channel_name,
    categories: c.categories || [],
    cnec_grade: c.cnec_grade_level,
    category_grades: (c.category_grades || []).map(g => `${g.category_id}:${g.grade_level}`).join(', '),
    matched_cats: c.matched_categories?.join(', ') || 'none',
    pre_score: c.pre_score,
    subscribers: c.subscribers || 0,
    platform: c.platform || 'unknown'
  }))

  const prompt = `캠페인과 크리에이터 매칭 전문가입니다.
캠페인 상품 카테고리와 크리에이터의 전문 분야 + 등급을 기반으로 TOP 20을 선정해주세요.

**캠페인:**
- 제목: ${campaign.title || ''}
- 브랜드: ${campaign.brand || ''}
- 상품: ${campaign.product_name || ''}
- 상품 카테고리: ${primaryCat} (관련: ${productCats?.secondary?.join(', ') || '없음'})
- 설명: ${(campaign.product_description || '').substring(0, 300)}

**크리에이터 목록:**
${JSON.stringify(creatorSummaries, null, 1)}

**스코어링 기준:**
1. 카테고리 일치 (35%): 상품 카테고리와 크리에이터 전문 분야 일치
2. 카테고리 등급 (15%): 해당 카테고리의 Bronze~Diamond 등급
3. CNEC 등급 (10%): 전체 크리에이터 등급 (1~5)
4. 참여율/영향력 (20%): 구독자, 조회수 기반
5. 콘텐츠 적합성 (20%): 브랜드/상품과의 톤 매칭

JSON 배열로만 응답:
[{ "id": "UUID", "score": 0-100, "reason": "추천 이유 (한국어, 30자 이내)" }]

TOP 20만 점수 높은 순으로.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    }
  )

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = await response.json()
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!resultText) throw new Error('Empty Gemini response')

  const aiResults = JSON.parse(resultText)

  return aiResults
    .map(rec => {
      const creator = candidates.find(c => c.id === rec.id)
      if (!creator) return null

      const catGradeScore = creator.category_match_score || 0
      const cnecScore = (CNEC_GRADE_BONUS[creator.cnec_grade_level || 1] || 0) * 5

      return {
        creator_id: creator.id,
        match_score: Math.min(rec.score || 50, 100),
        category_match_score: catGradeScore,
        category_grade_score: catGradeScore,
        cnec_grade_score: cnecScore,
        matched_categories: creator.matched_categories || [],
        match_reasons: [
          {
            category: 'category_match',
            title: '카테고리 적합성',
            reason: rec.reason || '캠페인 카테고리와 일치',
            weight: 0.35,
            score: catGradeScore
          }
        ],
        recommendation_summary: rec.reason || '',
        audience_match_score: 50,
        engagement_score: 50,
        follower_score: 50,
        content_style_score: 50
      }
    })
    .filter(Boolean)
}

/**
 * Basic matching fallback (no Gemini)
 */
function generateBasicMatching(campaign, candidates) {
  return candidates.map(creator => {
    const catScore = creator.category_match_score || 0
    const cnecBonus = CNEC_GRADE_BONUS[creator.cnec_grade_level || 1] || 0
    const subscriberScore = Math.min(Math.log10(Math.max(creator.subscribers || 1, 1)) * 15, 50)
    const overallScore = Math.round(catScore * 0.4 + cnecBonus * 3 + subscriberScore * 0.3)

    return {
      creator_id: creator.id,
      match_score: Math.min(overallScore, 100),
      category_match_score: catScore,
      category_grade_score: catScore,
      cnec_grade_score: cnecBonus * 5,
      matched_categories: creator.matched_categories || [],
      match_reasons: [
        {
          category: 'category_match',
          title: '카테고리 적합성',
          reason: creator.is_primary_match ? '주요 카테고리 정확 일치' : '관련 카테고리',
          weight: 0.4,
          score: catScore
        }
      ],
      recommendation_summary: `${creator.name || creator.channel_name}님 - 카테고리 매칭 ${catScore}점`,
      audience_match_score: 50,
      engagement_score: 50,
      follower_score: Math.round(subscriberScore),
      content_style_score: 50
    }
  })
}
