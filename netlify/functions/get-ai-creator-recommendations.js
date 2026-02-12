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
 * 캠페인에서 가이드 정보 추출
 */
function extractGuideInfo(campaign) {
  const guide = {}

  // 제품 정보
  if (campaign.product_name) guide.product_name = campaign.product_name
  if (campaign.product_description) guide.product_description = campaign.product_description?.substring(0, 300)
  if (campaign.product_features) guide.product_features = campaign.product_features
  if (campaign.product_key_points) guide.product_key_points = campaign.product_key_points?.substring(0, 200)

  // 영상 스타일 요구사항
  if (campaign.video_duration) guide.video_duration = campaign.video_duration
  if (campaign.video_tempo) guide.video_tempo = campaign.video_tempo
  if (campaign.video_tone) guide.video_tone = campaign.video_tone

  // 필수 촬영 요소
  if (campaign.required_dialogues?.length) guide.required_dialogues = campaign.required_dialogues
  if (campaign.required_scenes?.length) guide.required_scenes = campaign.required_scenes
  if (campaign.required_hashtags?.length) guide.required_hashtags = campaign.required_hashtags

  // 촬영 장면 요구사항
  const shootingScenes = []
  if (campaign.shooting_scenes_ba_photo) shootingScenes.push('Before/After 사진')
  if (campaign.shooting_scenes_no_makeup) shootingScenes.push('노메이크업')
  if (campaign.shooting_scenes_closeup) shootingScenes.push('얼굴 클로즈업')
  if (campaign.shooting_scenes_product_closeup) shootingScenes.push('제품 클로즈업')
  if (campaign.shooting_scenes_product_texture) shootingScenes.push('제품 텍스처')
  if (campaign.shooting_scenes_outdoor) shootingScenes.push('실외 촬영')
  if (campaign.shooting_scenes_couple) shootingScenes.push('커플 촬영')
  if (campaign.shooting_scenes_child) shootingScenes.push('아이 촬영')
  if (campaign.shooting_scenes_troubled_skin) shootingScenes.push('트러블 피부')
  if (campaign.shooting_scenes_wrinkles) shootingScenes.push('주름 표현')
  if (shootingScenes.length) guide.shooting_scenes = shootingScenes

  // 추가 요청사항
  if (campaign.additional_shooting_requests) guide.additional_shooting_requests = campaign.additional_shooting_requests?.substring(0, 200)
  if (campaign.additional_details) guide.additional_details = campaign.additional_details?.substring(0, 200)

  // AI 가이드 데이터 (4주 챌린지)
  if (campaign.challenge_weekly_guides_ai) {
    try {
      const parsed = typeof campaign.challenge_weekly_guides_ai === 'string'
        ? JSON.parse(campaign.challenge_weekly_guides_ai) : campaign.challenge_weekly_guides_ai
      if (parsed?.week1?.mission) guide.week1_mission = parsed.week1.mission?.substring(0, 100)
    } catch (e) {}
  }

  return guide
}

/**
 * 크리에이터 프로필 요약 (매칭용)
 */
function summarizeCreatorProfile(c) {
  return {
    id: c.id,
    name: c.name || c.channel_name,
    grade_level: c.cnec_grade_level,
    total_score: c.cnec_total_score || 0,
    campaign_count: c.campaign_count || 0,
    // 플랫폼 & 팔로워
    main_platform: c.main_platform || c.primary_interest,
    instagram_followers: c.instagram_followers || 0,
    youtube_subscribers: c.youtube_subscribers || 0,
    tiktok_followers: c.tiktok_followers || 0,
    // 인구통계
    age: c.age,
    gender: c.gender,
    // 뷰티 프로필
    skin_type: c.skin_type,
    skin_concerns: c.skin_concerns,
    personal_color: c.personal_color,
    skin_shade: c.skin_shade,
    hair_type: c.hair_type,
    // 콘텐츠 제작 역량
    editing_level: c.editing_level,
    shooting_level: c.shooting_level,
    video_styles: c.video_styles,
    video_length_style: c.video_length_style,
    shortform_tempo_style: c.shortform_tempo_style,
    // 전문분야 & 활동
    primary_interest: c.primary_interest,
    specialties: c.specialties,
    activity_keywords: c.activity_keywords,
    content_style: c.content_style,
    // 특수 조건
    child_appearance: c.child_appearance,
    family_appearance: c.family_appearance,
    offline_visit: c.offline_visit,
    // 성과 지표
    avg_engagement_rate: c.avg_engagement_rate,
    avg_views: c.avg_views,
    account_status: c.account_status,
    // AI 분석
    ai_generated_strengths: c.ai_generated_strengths,
    ai_generated_categories: c.ai_generated_categories,
    ai_generated_content_style: c.ai_generated_content_style
  }
}

/**
 * Gemini API를 사용한 AI 추천 (캠페인 가이드 + 크리에이터 프로필 심층 매칭)
 */
async function getGeminiRecommendations(campaign, creators) {
  // 캠페인 기본 정보
  const campaignInfo = {
    title: campaign.title,
    brand: campaign.brand || campaign.brand_name,
    product_name: campaign.product_name,
    category: campaign.category,
    campaign_type: campaign.campaign_type,
    content_type: campaign.content_type,
    target_age: campaign.target_age,
    target_gender: campaign.target_gender,
    description: campaign.description?.substring(0, 500),
    platform_preference: campaign.platform_preference,
    budget: campaign.budget
  }

  // 캠페인 가이드 정보
  const guideInfo = extractGuideInfo(campaign)

  // 크리에이터 프로필 (상위 50명)
  const creatorProfiles = creators.slice(0, 50).map(summarizeCreatorProfile)

  const prompt = `당신은 뷰티/라이프스타일 인플루언서 마케팅 전문가입니다.
기업이 등록한 캠페인 정보와 가이드(촬영 요구사항)를 분석하고, 크리에이터 프로필을 대조하여
이 캠페인에서 **가장 좋은 영상을 만들 수 있는** 크리에이터 10명을 추천해주세요.

========== 캠페인 정보 ==========
${JSON.stringify(campaignInfo, null, 2)}

========== 캠페인 가이드 (촬영 요구사항) ==========
${JSON.stringify(guideInfo, null, 2)}

========== 크리에이터 프로필 목록 ==========
${JSON.stringify(creatorProfiles, null, 2)}

========== 매칭 기준 (중요도 순) ==========

1. **영상 퀄리티 역량** (25점)
   - editing_level, shooting_level이 높을수록 좋음 (expert > intermediate > beginner)
   - 캠페인의 video_tempo와 크리에이터의 shortform_tempo_style 일치
   - 캠페인의 video_duration과 크리에이터의 video_length_style 매칭
   - video_styles가 캠페인 톤(video_tone)과 어울리는지

2. **캠페인 경험 & 신뢰도** (20점)
   - campaign_count가 높을수록 안정적인 납품 가능 (5건 이상 우수)
   - 등급이 높을수록 좋음 (grade_level 3 블룸 > 2 글로우)
   - account_status가 verified이면 보너스

3. **프로필-제품 적합도** (20점)
   - 뷰티 캠페인: skin_type, skin_concerns, personal_color가 제품/타겟과 매칭
   - 헤어 캠페인: hair_type이 매칭
   - 카테고리(category)와 primary_interest/specialties/activity_keywords 일치
   - ai_generated_categories가 캠페인 카테고리와 겹치면 보너스

4. **촬영 조건 충족** (15점)
   - shooting_scenes에 '아이 촬영'이면 child_appearance='possible' 필수
   - shooting_scenes에 '커플 촬영'이면 family_appearance='possible' 우대
   - shooting_scenes에 '실외 촬영'이면 offline_visit='possible' 우대
   - shooting_scenes에 '노메이크업', '트러블 피부' 등 특수 요건 체크

5. **플랫폼 & 영향력** (10점)
   - 캠페인 platform_preference와 크리에이터 main_platform 매칭
   - 해당 플랫폼의 팔로워 수
   - avg_engagement_rate, avg_views 고려

6. **타겟 오디언스 일치** (10점)
   - 크리에이터의 age, gender가 캠페인 target_age, target_gender와 매칭
   - ai_generated_target_audience 참고

========== 응답 형식 (JSON만 반환) ==========
[
  {
    "id": "크리에이터 UUID",
    "score": 95,
    "reason": "추천 이유 (한글, 40자 이내, 구체적으로)"
  }
]

주의: 반드시 상위 10명만 점수 높은 순으로 정렬. JSON만 반환. 다른 텍스트 절대 금지.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
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
 * 기본 추천 알고리즘 (AI 사용 불가 시) - 캠페인 가이드 기반 심층 매칭
 */
function getBasicRecommendations(campaign, creators) {
  const guideInfo = extractGuideInfo(campaign)
  const campaignCategories = Array.isArray(campaign.category) ? campaign.category : [campaign.category].filter(Boolean)

  const scored = creators.map(creator => {
    let score = 0
    const reasons = []

    // 1. 영상 퀄리티 역량 (25점)
    const editLevel = creator.editing_level
    const shootLevel = creator.shooting_level
    if (editLevel === 'expert') score += 10
    else if (editLevel === 'intermediate') score += 6
    else score += 2
    if (shootLevel === 'expert') score += 10
    else if (shootLevel === 'intermediate') score += 6
    else score += 2

    // 영상 템포 매칭
    if (campaign.video_tempo && creator.shortform_tempo_style === campaign.video_tempo) score += 3
    // 영상 길이 매칭
    if (campaign.video_duration) {
      const isShort = campaign.video_duration === '30s' || campaign.video_duration === '60s'
      if (isShort && (creator.video_length_style === 'shortform' || creator.video_length_style === 'both')) score += 2
      if (!isShort && (creator.video_length_style === 'longform' || creator.video_length_style === 'both')) score += 2
    }

    if (editLevel === 'expert' || shootLevel === 'expert') reasons.push('촬영/편집 고급')
    else if (editLevel === 'intermediate' && shootLevel === 'intermediate') reasons.push('촬영/편집 중급')

    // 2. 캠페인 경험 & 신뢰도 (20점)
    const campCount = creator.campaign_count || 0
    if (campCount >= 10) score += 12
    else if (campCount >= 5) score += 10
    else if (campCount >= 3) score += 7
    else if (campCount >= 1) score += 4
    if (creator.cnec_grade_level === 3) score += 5
    else if (creator.cnec_grade_level === 2) score += 3
    if (creator.account_status === 'verified') score += 3

    if (campCount >= 5) reasons.push(`${campCount}건 진행`)

    // 3. 프로필-제품 적합도 (20점)
    const creatorInterests = [
      creator.primary_interest,
      ...(creator.specialties || []),
      ...(creator.activity_keywords || []),
      ...(creator.ai_generated_categories || [])
    ].filter(Boolean).map(s => s.toLowerCase())

    let categoryMatch = 0
    campaignCategories.forEach(cat => {
      if (cat && creatorInterests.some(i => i.includes(cat.toLowerCase()) || cat.toLowerCase().includes(i))) {
        categoryMatch++
      }
    })
    score += Math.min(categoryMatch * 5, 10)

    // 뷰티 제품-피부 매칭
    if (campaignCategories.some(c => c && ['skincare', '스킨케어', '화장품', 'beauty', '뷰티'].some(k => c.toLowerCase().includes(k)))) {
      if (creator.skin_type) score += 3
      if (creator.skin_concerns?.length) score += 3
      if (creator.personal_color) score += 2
      if (creator.skin_type || creator.skin_concerns?.length) reasons.push('뷰티 프로필 보유')
    }

    // 헤어 매칭
    if (campaignCategories.some(c => c && ['hair', '헤어'].some(k => c.toLowerCase().includes(k)))) {
      if (creator.hair_type) score += 5
    }

    if (categoryMatch > 0) reasons.push('카테고리 일치')

    // 4. 촬영 조건 충족 (15점)
    const scenes = guideInfo.shooting_scenes || []
    let sceneScore = 0
    if (scenes.includes('아이 촬영') && creator.child_appearance === 'possible') sceneScore += 5
    if (scenes.includes('커플 촬영') && creator.family_appearance === 'possible') sceneScore += 3
    if (scenes.includes('실외 촬영') && creator.offline_visit === 'possible') sceneScore += 3
    // 노메이크업/트러블 피부 → 리얼 리뷰 가능한 크리에이터
    if (scenes.includes('노메이크업') || scenes.includes('트러블 피부')) {
      if (creator.skin_concerns?.length >= 2) sceneScore += 4
    }
    score += Math.min(sceneScore, 15)

    // 5. 플랫폼 & 영향력 (10점)
    const platform = campaign.platform_preference?.toLowerCase()
    const creatorPlatform = creator.main_platform?.toLowerCase()
    if (platform && creatorPlatform && (platform.includes(creatorPlatform) || creatorPlatform.includes(platform))) {
      score += 4
    }

    const followers = (creator.instagram_followers || 0) + (creator.youtube_subscribers || 0) + (creator.tiktok_followers || 0)
    const followerCount = creator.followers_count || followers
    if (followerCount >= 50000) score += 4
    else if (followerCount >= 10000) score += 3
    else if (followerCount >= 5000) score += 2
    else score += 1

    if (creator.avg_engagement_rate > 5) score += 2
    else if (creator.avg_engagement_rate > 2) score += 1

    if (followerCount >= 10000) reasons.push(`팔로워 ${Math.round(followerCount / 10000 * 10) / 10}만`)

    // 6. 타겟 일치 (10점)
    if (campaign.target_gender && creator.gender) {
      const tg = campaign.target_gender.toLowerCase()
      const cg = creator.gender.toLowerCase()
      if (tg === 'all' || tg === cg || tg.includes(cg)) score += 5
    }
    if (campaign.target_age && creator.age) {
      const ageRange = campaign.target_age.match(/(\d+)/g)?.map(Number)
      if (ageRange?.length >= 2 && creator.age >= ageRange[0] && creator.age <= ageRange[1]) score += 5
      else if (ageRange?.length === 1 && Math.abs(creator.age - ageRange[0]) <= 10) score += 3
    }

    // 등급 이름 추가
    if (creator.cnec_grade_level === 3) reasons.push('블룸')
    else if (creator.cnec_grade_level === 2) reasons.push('글로우')

    return {
      ...creator,
      recommendation_score: Math.min(score, 100),
      recommendation_reason: reasons.slice(0, 3).join(' · ') || '캠페인 적합도 우수'
    }
  })

  return scored
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, 10)
}
