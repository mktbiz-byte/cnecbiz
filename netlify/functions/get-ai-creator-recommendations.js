const { createClient } = require('@supabase/supabase-js')

/**
 * AI 크리에이터 추천 Netlify Function
 *
 * 글로우(2)~블룸(3) 등급 크리에이터 중 캠페인에 어울리는 5명을 AI로 추천
 * - 진행 건수가 많은 사람 우선 (마크 표시)
 * - 가계정(warning_3) 제외
 * - 등급이 높은 사람 우선
 * - 한번 생성된 추천은 캠페인별로 고정 (재방문 시 동일 결과)
 */

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

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
    const { campaignId } = JSON.parse(event.body)

    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인 ID가 필요합니다.' })
      }
    }

    // 1. 기존 추천 결과 확인 (캐싱 - 한번 보여주면 고정)
    const { data: existingRecs, error: existingError } = await supabaseBiz
      .from('ai_creator_recommendations')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('rank', { ascending: true })

    if (!existingError && existingRecs && existingRecs.length > 0) {
      console.log(`[AI Rec] Using cached recommendations for campaign ${campaignId}: ${existingRecs.length} creators`)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          recommendations: existingRecs,
          cached: true
        })
      }
    }

    // 2. 캠페인 정보 조회
    let campaign = null

    // Korea DB에서 먼저 조회
    const { data: koreaCampaign } = await supabaseKorea
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (koreaCampaign) {
      campaign = koreaCampaign
    } else {
      // BIZ DB에서 조회
      const { data: bizCampaign } = await supabaseBiz
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      campaign = bizCampaign
    }

    if (!campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' })
      }
    }

    // 3. 글로우(2)~블룸(3) 등급 크리에이터 조회 (가계정 제외)
    const { data: creators, error: creatorsError } = await supabaseKorea
      .from('user_profiles')
      .select('*')
      .gte('cnec_grade_level', 2)
      .lte('cnec_grade_level', 3)
      .order('cnec_grade_level', { ascending: false })
      .order('cnec_total_score', { ascending: false })
      .limit(100)

    if (creatorsError) {
      throw new Error(`크리에이터 조회 실패: ${creatorsError.message}`)
    }

    if (!creators || creators.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, recommendations: [], message: '추천 가능한 크리에이터가 없습니다.' })
      }
    }

    // 가계정(warning_3) 제외
    const validCreators = creators.filter(c => c.account_status !== 'warning_3')
    console.log(`[AI Rec] Found ${validCreators.length} valid creators (grade 2-3, no fake accounts)`)

    // 4. 이미 이 캠페인에 지원한 크리에이터 제외
    const { data: applications } = await supabaseKorea
      .from('applications')
      .select('email')
      .eq('campaign_id', campaignId)

    const appliedEmails = (applications || []).map(a => a.email?.toLowerCase()).filter(Boolean)
    const availableCreators = validCreators.filter(c =>
      !appliedEmails.includes(c.email?.toLowerCase())
    )

    console.log(`[AI Rec] After filtering applied: ${availableCreators.length} creators`)

    if (availableCreators.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, recommendations: [], message: '추천 가능한 크리에이터가 없습니다.' })
      }
    }

    // 5. 각 크리에이터의 캠페인 진행 건수 계산
    const creatorEmails = availableCreators.map(c => c.email).filter(Boolean)

    // applications 테이블에서 각 크리에이터의 진행/완료 건수 조회
    const { data: campaignHistory } = await supabaseKorea
      .from('applications')
      .select('email, status')
      .in('email', creatorEmails)
      .in('status', ['confirmed', 'completed', 'selected', 'approved'])

    // 이메일별 진행 건수 집계
    const campaignCounts = {}
    ;(campaignHistory || []).forEach(app => {
      const email = app.email?.toLowerCase()
      if (email) {
        campaignCounts[email] = (campaignCounts[email] || 0) + 1
      }
    })

    // 크리에이터에 진행 건수 추가
    const creatorsWithHistory = availableCreators.map(c => ({
      ...c,
      campaign_count: campaignCounts[c.email?.toLowerCase()] || 0
    }))

    // 6. AI 추천 또는 기본 알고리즘으로 상위 10명 선별 후 5명 표시
    let top10 = []

    if (GEMINI_API_KEY) {
      try {
        top10 = await getGeminiRecommendations(campaign, creatorsWithHistory)
      } catch (aiError) {
        console.error('[AI Rec] Gemini failed, using basic algorithm:', aiError.message)
        top10 = getBasicRecommendations(campaign, creatorsWithHistory)
      }
    } else {
      console.log('[AI Rec] No Gemini API key, using basic algorithm')
      top10 = getBasicRecommendations(campaign, creatorsWithHistory)
    }

    // 상위 10명에서 5명 선택
    const top5 = top10.slice(0, 5)

    if (top5.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, recommendations: [], message: '추천 가능한 크리에이터가 없습니다.' })
      }
    }

    // 7. DB에 저장 (고정 추천 - 재방문 시 동일 결과)
    const recsToSave = top5.map((creator, index) => ({
      campaign_id: campaignId,
      creator_id: creator.id,
      creator_email: creator.email,
      creator_data: {
        id: creator.id,
        name: creator.name || creator.channel_name || creator.full_name,
        email: creator.email,
        profile_photo_url: creator.profile_photo_url || creator.profile_image,
        main_platform: creator.main_platform || creator.primary_interest,
        followers_count: creator.followers_count || 0,
        instagram_url: creator.instagram_url,
        youtube_url: creator.youtube_url,
        tiktok_url: creator.tiktok_url,
        cnec_grade_level: creator.cnec_grade_level,
        cnec_grade_name: creator.cnec_grade_name,
        cnec_total_score: creator.cnec_total_score,
        campaign_count: creator.campaign_count || 0,
        account_status: creator.account_status
      },
      recommendation_score: creator.recommendation_score || 0,
      recommendation_reason: creator.recommendation_reason || '',
      rank: index + 1,
      is_top_performer: (creator.campaign_count || 0) >= 5,
      created_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabaseBiz
      .from('ai_creator_recommendations')
      .insert(recsToSave)

    if (insertError) {
      console.error('[AI Rec] Error saving recommendations:', insertError)
      // 저장 실패해도 결과는 반환
    }

    console.log(`[AI Rec] Saved ${recsToSave.length} recommendations for campaign ${campaignId}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recommendations: recsToSave,
        cached: false
      })
    }

  } catch (error) {
    console.error('[AI Rec] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}

/**
 * Gemini API를 사용한 AI 추천
 */
async function getGeminiRecommendations(campaign, creators) {
  const campaignSummary = {
    title: campaign.title,
    category: campaign.category,
    campaign_type: campaign.campaign_type,
    target_age: campaign.target_age,
    target_gender: campaign.target_gender,
    description: campaign.description?.substring(0, 500),
    brand_name: campaign.brand_name,
    platform_preference: campaign.platform_preference
  }

  const creatorsSummary = creators.slice(0, 50).map(c => ({
    id: c.id,
    name: c.name || c.channel_name,
    grade_level: c.cnec_grade_level,
    grade_name: c.cnec_grade_name,
    total_score: c.cnec_total_score,
    followers: c.followers_count || 0,
    main_platform: c.main_platform || c.primary_interest,
    campaign_count: c.campaign_count || 0,
    skin_type: c.skin_type,
    age: c.age,
    gender: c.gender
  }))

  const prompt = `당신은 인플루언서 마케팅 전문가입니다. 다음 캠페인에 가장 적합한 크리에이터 10명을 추천해주세요.

**캠페인 정보:**
${JSON.stringify(campaignSummary, null, 2)}

**크리에이터 목록 (글로우~블룸 등급):**
${JSON.stringify(creatorsSummary, null, 2)}

**추천 기준 (중요도 순):**
1. 캠페인 진행 건수가 많은 크리에이터 우선 (campaign_count)
2. 등급이 높은 크리에이터 우선 (grade_level 3 > 2)
3. 캠페인 카테고리/브랜드와 프로필 적합도
4. 플랫폼 매칭 (캠페인 요구 플랫폼과 크리에이터 주력 플랫폼)
5. 팔로워 수와 영향력

**응답 형식 (JSON만 반환):**
[
  {
    "id": "크리에이터 UUID",
    "score": 95,
    "reason": "추천 이유 (한글, 30자 이내)"
  }
]

상위 10명만 JSON으로 반환하세요. 다른 텍스트 없이 JSON만 반환하세요.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Empty Gemini response')
  }

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini JSON')
  }

  const aiResults = JSON.parse(jsonMatch[0])

  // AI 결과와 크리에이터 정보 매칭
  return aiResults
    .map(rec => {
      const creator = creators.find(c => c.id === rec.id)
      if (!creator) return null
      return {
        ...creator,
        recommendation_score: rec.score || 0,
        recommendation_reason: rec.reason || '캠페인 적합도 우수'
      }
    })
    .filter(Boolean)
    .slice(0, 10)
}

/**
 * 기본 추천 알고리즘 (AI 사용 불가 시)
 */
function getBasicRecommendations(campaign, creators) {
  const scored = creators.map(creator => {
    let score = 0

    // 1. 캠페인 진행 건수 (30점) - 가장 중요
    const campCount = creator.campaign_count || 0
    if (campCount >= 10) score += 30
    else if (campCount >= 5) score += 25
    else if (campCount >= 3) score += 20
    else if (campCount >= 1) score += 15
    else score += 5

    // 2. 등급 점수 (25점) - 블룸 > 글로우
    if (creator.cnec_grade_level === 3) score += 25
    else if (creator.cnec_grade_level === 2) score += 15

    // 3. 종합 점수 (20점)
    const totalScore = creator.cnec_total_score || 0
    score += Math.round((totalScore / 100) * 20)

    // 4. 팔로워 수 (15점)
    const followers = creator.followers_count || 0
    if (followers >= 50000) score += 15
    else if (followers >= 10000) score += 12
    else if (followers >= 5000) score += 9
    else if (followers >= 1000) score += 6
    else score += 3

    // 5. 인증 상태 보너스 (10점)
    if (creator.account_status === 'verified') score += 10
    else if (!creator.account_status || creator.account_status === 'unclassified') score += 5

    // 추천 이유 생성
    const reasons = []
    if (campCount >= 5) reasons.push(`캠페인 ${campCount}건 진행`)
    if (creator.cnec_grade_level === 3) reasons.push('블룸 등급')
    else if (creator.cnec_grade_level === 2) reasons.push('글로우 등급')
    if (followers >= 10000) reasons.push(`팔로워 ${(followers / 10000).toFixed(1)}만`)
    if (creator.account_status === 'verified') reasons.push('인증완료')

    return {
      ...creator,
      recommendation_score: Math.min(score, 100),
      recommendation_reason: reasons.slice(0, 3).join(', ') || '캠페인 적합도 우수'
    }
  })

  return scored
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, 10)
}
