/**
 * AI Creator Recommendation Service
 * Gemini API를 사용한 크리에이터 추천 시스템
 */

import { supabaseBiz, supabaseKorea } from '../lib/supabaseClients'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

/**
 * 캠페인에 맞는 크리에이터 추천
 * @param {Object} campaign - 캠페인 정보
 * @param {Array} availableCreators - 추천 가능한 크리에이터 목록
 * @returns {Promise<Array>} 추천된 크리에이터 목록 (상위 10명)
 */
export async function getAIRecommendations(campaign, availableCreators) {
  try {
    // 1. 기존 추천 결과가 있는지 확인 (캐싱)
    const { data: existingRecommendations } = await supabaseBiz
      .from('campaign_recommendations')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('recommendation_score', { ascending: false })
      .limit(10)

    if (existingRecommendations && existingRecommendations.length > 0) {
      console.log('Using cached recommendations')
      return existingRecommendations.map(rec => ({
        ...rec.creator_data,
        recommendation_score: rec.recommendation_score,
        recommendation_reason: rec.recommendation_reason
      }))
    }

    // 2. 새로운 추천 생성
    console.log('Generating new AI recommendations...')
    
    // Gemini API 호출
    const recommendations = await generateRecommendationsWithGemini(campaign, availableCreators)
    
    // 3. 추천 결과 저장
    if (recommendations.length > 0) {
      const recommendationsToSave = recommendations.map(rec => ({
        campaign_id: campaign.id,
        creator_id: rec.id || rec.user_id,
        creator_data: rec,
        recommendation_score: rec.recommendation_score,
        recommendation_reason: rec.recommendation_reason,
        created_at: new Date().toISOString()
      }))

      await supabaseBiz
        .from('campaign_recommendations')
        .insert(recommendationsToSave)
    }

    return recommendations
  } catch (error) {
    console.error('Error getting AI recommendations:', error)
    // 에러 시 기본 추천 로직 사용
    return getBasicRecommendations(campaign, availableCreators)
  }
}

/**
 * Gemini API를 사용한 추천 생성
 */
async function generateRecommendationsWithGemini(campaign, creators) {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not found, using basic recommendations')
    return getBasicRecommendations(campaign, creators)
  }

  try {
    // 캠페인 정보 요약
    const campaignSummary = {
      title: campaign.title,
      category: campaign.category,
      target_age: campaign.target_age,
      target_gender: campaign.target_gender,
      budget: campaign.budget,
      required_creators: campaign.required_creators,
      description: campaign.description,
      platform_preference: campaign.platform_preference
    }

    // 크리에이터 정보 요약 (상위 50명만)
    const creatorsSummary = creators.slice(0, 50).map(c => ({
      id: c.id || c.user_id,
      name: c.name || c.applicant_name,
      age: c.age,
      gender: c.gender,
      instagram_followers: c.instagram_followers || 0,
      youtube_subscribers: c.youtube_subscribers || 0,
      tiktok_followers: c.tiktok_followers || 0,
      main_channel: c.main_channel,
      skin_type: c.skin_type,
      past_campaigns: c.past_campaigns || 0,
      average_rating: c.average_rating || 0
    }))

    // Gemini API 호출
    const prompt = `당신은 인플루언서 마케팅 전문가입니다. 다음 캠페인에 가장 적합한 크리에이터 10명을 추천해주세요.

**캠페인 정보:**
${JSON.stringify(campaignSummary, null, 2)}

**크리에이터 목록:**
${JSON.stringify(creatorsSummary, null, 2)}

**추천 기준:**
1. 채널 적합성: 캠페인에 맞는 SNS 채널 보유
2. 팔로워 매칭: 예산과 팔로워 수 균형
3. 타겟 일치도: 크리에이터의 주 시청자층과 캠페인 타겟 비교
4. 콘텐츠 스타일: 캠페인 분위기와 크리에이터 스타일 매칭
5. 성과 이력: 과거 캠페인 참여 및 평점

**응답 형식 (JSON):**
[
  {
    "id": "크리에이터 ID",
    "recommendation_score": 95,
    "recommendation_reason": "추천 이유 (한글, 50자 이내)"
  }
]

상위 10명만 추천하고, 점수가 높은 순으로 정렬해주세요.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
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
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      throw new Error('No response from Gemini API')
    }

    // JSON 추출
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response')
    }

    const aiRecommendations = JSON.parse(jsonMatch[0])

    // 크리에이터 정보와 매칭
    const recommendations = aiRecommendations
      .map(rec => {
        const creator = creators.find(c => 
          (c.id && c.id === rec.id) || 
          (c.user_id && c.user_id === rec.id)
        )
        if (!creator) return null
        
        return {
          ...creator,
          recommendation_score: rec.recommendation_score,
          recommendation_reason: rec.recommendation_reason
        }
      })
      .filter(Boolean)
      .slice(0, 10)

    console.log('AI recommendations generated:', recommendations.length)
    return recommendations

  } catch (error) {
    console.error('Gemini API error:', error)
    return getBasicRecommendations(campaign, creators)
  }
}

/**
 * 기본 추천 로직 (AI 사용 불가 시)
 */
function getBasicRecommendations(campaign, creators) {
  console.log('Using basic recommendation algorithm')
  
  // 점수 계산
  const scoredCreators = creators.map(creator => {
    let score = 0
    
    // 1. 팔로워 수 점수 (40점)
    const totalFollowers = 
      (creator.instagram_followers || 0) +
      (creator.youtube_subscribers || 0) +
      (creator.tiktok_followers || 0)
    
    if (totalFollowers > 100000) score += 40
    else if (totalFollowers > 50000) score += 35
    else if (totalFollowers > 10000) score += 30
    else if (totalFollowers > 5000) score += 25
    else score += 20

    // 2. 채널 다양성 (20점)
    const channelCount = 
      (creator.instagram_followers > 0 ? 1 : 0) +
      (creator.youtube_subscribers > 0 ? 1 : 0) +
      (creator.tiktok_followers > 0 ? 1 : 0)
    score += channelCount * 7

    // 3. 과거 성과 (20점)
    if (creator.average_rating) {
      score += (creator.average_rating / 5) * 20
    } else {
      score += 10 // 신규 크리에이터 기본 점수
    }

    // 4. 캠페인 참여 이력 (10점)
    if (creator.past_campaigns) {
      score += Math.min(creator.past_campaigns * 2, 10)
    }

    // 5. 타겟 연령 일치 (10점)
    if (campaign.target_age && creator.age) {
      const targetAgeRange = campaign.target_age.split('-').map(Number)
      if (creator.age >= targetAgeRange[0] && creator.age <= targetAgeRange[1]) {
        score += 10
      }
    }

    return {
      ...creator,
      recommendation_score: Math.round(score),
      recommendation_reason: generateBasicReason(creator, score)
    }
  })

  // 점수 순으로 정렬하여 상위 10명 반환
  return scoredCreators
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, 10)
}

/**
 * 기본 추천 이유 생성
 */
function generateBasicReason(creator, score) {
  const reasons = []
  
  const totalFollowers = 
    (creator.instagram_followers || 0) +
    (creator.youtube_subscribers || 0) +
    (creator.tiktok_followers || 0)
  
  if (totalFollowers > 100000) {
    reasons.push('높은 팔로워 수')
  } else if (totalFollowers > 50000) {
    reasons.push('우수한 영향력')
  }
  
  const channelCount = 
    (creator.instagram_followers > 0 ? 1 : 0) +
    (creator.youtube_subscribers > 0 ? 1 : 0) +
    (creator.tiktok_followers > 0 ? 1 : 0)
  
  if (channelCount >= 2) {
    reasons.push('다채널 활동')
  }
  
  if (creator.average_rating >= 4.5) {
    reasons.push('검증된 실적')
  } else if (!creator.past_campaigns) {
    reasons.push('잠재력 있는 신인')
  }
  
  return reasons.join(', ') || '캠페인 적합도 우수'
}

/**
 * 캠페인 생성 시 자동으로 AI 추천 생성
 * @param {string} campaignId - 캠페인 ID
 * @param {Object} campaignData - 캠페인 데이터
 * @param {string} dbType - 'korea' 또는 'japan'
 */
export async function generateAIRecommendations(campaignId, campaignData, dbType = 'korea') {
  try {
    console.log(`[AI Recommendation] Generating recommendations for campaign ${campaignId}...`)
    
    // 사용할 Supabase 클라이언트 선택
    const supabase = dbType === 'korea' ? supabaseKorea : supabaseBiz
    
    // 1. 모든 크리에이터 프로필 가져오기 (추천 후보)
    const { data: allCreators, error: creatorsError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100) // 최대 100명의 크리에이터 중에서 추천
    
    if (creatorsError) {
      console.error('[AI Recommendation] Error fetching creators:', creatorsError)
      throw creatorsError
    }
    
    if (!allCreators || allCreators.length === 0) {
      console.warn('[AI Recommendation] No creators found in database')
      return
    }
    
    console.log(`[AI Recommendation] Found ${allCreators.length} creators for recommendation`)
    
    // 2. Gemini API로 추천 생성
    const recommendations = await generateRecommendationsWithGemini(
      { ...campaignData, id: campaignId },
      allCreators
    )
    
    if (!recommendations || recommendations.length === 0) {
      console.warn('[AI Recommendation] No recommendations generated')
      return
    }
    
    console.log(`[AI Recommendation] Generated ${recommendations.length} recommendations`)
    
    // 3. campaign_recommendations 테이블에 저장
    const recommendationsToSave = recommendations.map(rec => ({
      campaign_id: campaignId,
      user_id: rec.id || rec.user_id,
      recommendation_score: rec.recommendation_score || 0,
      recommendation_reason: rec.recommendation_reason || '캠페인 적합도 우수',
      created_at: new Date().toISOString()
    }))
    
    const { error: insertError } = await supabase
      .from('campaign_recommendations')
      .insert(recommendationsToSave)
    
    if (insertError) {
      console.error('[AI Recommendation] Error saving recommendations:', insertError)
      throw insertError
    }
    
    console.log(`[AI Recommendation] Successfully saved ${recommendationsToSave.length} recommendations`)
    return recommendations
    
  } catch (error) {
    console.error('[AI Recommendation] Error in generateAIRecommendations:', error)
    throw error
  }
}

/**
 * 추천 결과 새로고침 (수동)
 */
export async function refreshRecommendations(campaignId) {
  try {
    // 기존 추천 삭제
    await supabaseBiz
      .from('campaign_recommendations')
      .delete()
      .eq('campaign_id', campaignId)
    
    return { success: true, message: '추천이 초기화되었습니다. 새로고침하세요.' }
  } catch (error) {
    console.error('Error refreshing recommendations:', error)
    return { success: false, error: error.message }
  }
}
