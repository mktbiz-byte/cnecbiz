import { supabaseBiz } from './supabaseClients'

/**
 * AI 기반 크리에이터-캠페인 매칭 서비스
 */

/**
 * Gemini API를 사용하여 크리에이터와 캠페인 간의 매칭 점수 및 이유 생성
 */
export async function generateAIMatchingReasons(campaign, creator) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다')

    const prompt = `당신은 마케팅 캠페인과 크리에이터 매칭 전문가입니다. 다음 캠페인과 크리에이터의 적합도를 분석하고 추천 이유를 생성해주세요.

**캠페인 정보:**
- 제목: ${campaign.title}
- 브랜드: ${campaign.brand || '미정'}
- 카테고리: ${campaign.product_category}
- 설명: ${campaign.description}
- 타겟 오디언스: ${campaign.target_audience || '미정'}
- 예산: ${campaign.budget}원

**크리에이터 정보:**
- 이름: ${creator.creator_name}
- 소개: ${creator.final_bio || creator.ai_generated_bio}
- 강점: ${(creator.final_strengths || creator.ai_generated_strengths || []).join(', ')}
- 카테고리: ${(creator.final_categories || creator.ai_generated_categories || []).join(', ')}
- 타겟 오디언스: ${creator.final_target_audience || creator.ai_generated_target_audience || '미정'}
- 콘텐츠 스타일: ${creator.final_content_style || creator.ai_generated_content_style || '미정'}
- 팔로워: ${creator.total_followers?.toLocaleString() || 0}명
- 평균 참여율: ${creator.avg_engagement_rate || 0}%
- 평균 조회수: ${creator.avg_views?.toLocaleString() || 0}

다음 JSON 형식으로 응답해주세요:
{
  "overall_score": 매칭 점수 (0-100),
  "category_match_score": 카테고리 일치도 (0-100),
  "audience_match_score": 타겟 오디언스 일치도 (0-100),
  "engagement_score": 참여율 점수 (0-100),
  "follower_score": 팔로워 수 점수 (0-100),
  "content_style_score": 콘텐츠 스타일 일치도 (0-100),
  "match_reasons": [
    {
      "category": "카테고리 구분 (category_match, audience_match, engagement, followers, content_style, brand_fit 중 하나)",
      "title": "이유 제목 (간단명료하게)",
      "reason": "상세 설명 (1-2문장, 구체적이고 설득력 있게)",
      "weight": 가중치 (0.0-1.0),
      "score": 해당 항목 점수 (0-100)
    }
  ],
  "recommendation_summary": "전체 추천 요약 (2-3문장, 왜 이 크리에이터를 추천하는지 명확하게)"
}

참고:
- match_reasons는 최소 3개, 최대 5개로 작성하세요
- 점수는 객관적이고 합리적으로 계산하세요
- 추천 이유는 기업 담당자가 이해하기 쉽고 설득력 있게 작성하세요
- 카테고리가 정확히 일치하면 높은 점수, 관련성이 있으면 중간 점수를 주세요`

    // 크리에이터 매칭: 단순 분석 → gemini-2.5-flash-lite (4K RPM, 무제한 RPD)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status}`)
    }

    const data = await response.json()
    const resultText = data.candidates[0]?.content?.parts[0]?.text

    if (!resultText) {
      throw new Error('AI 응답이 비어있습니다')
    }

    const matchingResult = JSON.parse(resultText)
    return matchingResult
  } catch (error) {
    console.error('AI matching generation error:', error)
    // Fallback to basic scoring if AI fails
    return generateBasicMatching(campaign, creator)
  }
}

/**
 * AI 실패 시 기본 매칭 로직
 */
function generateBasicMatching(campaign, creator) {
  const creatorCategories = creator.final_categories || creator.ai_generated_categories || []
  
  // Category match
  const categoryMatch = creatorCategories.includes(campaign.product_category) ? 100 : 50
  
  // Engagement score
  const engagementScore = Math.min((creator.avg_engagement_rate || 0) * 10, 100)
  
  // Follower score (log scale)
  const followerScore = Math.min(Math.log10(Math.max(creator.total_followers || 1, 1)) * 20, 100)
  
  // Overall score
  const overallScore = (
    categoryMatch * 0.3 +
    75 * 0.2 + // audience match (default)
    engagementScore * 0.25 +
    followerScore * 0.15 +
    75 * 0.1 // content style (default)
  )

  return {
    overall_score: Math.round(overallScore),
    category_match_score: categoryMatch,
    audience_match_score: 75,
    engagement_score: Math.round(engagementScore),
    follower_score: Math.round(followerScore),
    content_style_score: 75,
    match_reasons: [
      {
        category: 'category_match',
        title: '카테고리 적합성',
        reason: categoryMatch === 100 
          ? '캠페인 카테고리와 정확히 일치하는 콘텐츠를 제작합니다'
          : '관련 카테고리에서 활동 중입니다',
        weight: 0.3,
        score: categoryMatch
      },
      {
        category: 'engagement',
        title: '참여율',
        reason: `평균 참여율 ${creator.avg_engagement_rate || 0}%로 팔로워와의 상호작용이 활발합니다`,
        weight: 0.25,
        score: Math.round(engagementScore)
      },
      {
        category: 'followers',
        title: '팔로워 규모',
        reason: `${(creator.total_followers || 0).toLocaleString()}명의 팔로워를 보유하고 있습니다`,
        weight: 0.15,
        score: Math.round(followerScore)
      }
    ],
    recommendation_summary: `${creator.creator_name}님은 ${campaign.product_category} 카테고리에서 활동하며, 평균 참여율 ${creator.avg_engagement_rate || 0}%로 팔로워와의 소통이 활발합니다. 캠페인 목표 달성에 기여할 수 있는 크리에이터입니다.`
  }
}

/**
 * 캠페인에 대한 모든 승인된 크리에이터의 매칭 점수 계산 및 저장
 */
export async function generateCampaignRecommendations(campaignId) {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseBiz
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError) throw campaignError
    if (!campaign) throw new Error('캠페인을 찾을 수 없습니다')

    // Get all approved creators
    const { data: creators, error: creatorsError } = await supabaseBiz
      .from('featured_creator_applications')
      .select('*')
      .eq('status', 'approved')

    if (creatorsError) throw creatorsError
    if (!creators || creators.length === 0) {
      throw new Error('승인된 크리에이터가 없습니다')
    }

    // Delete existing matches for this campaign
    await supabaseBiz
      .from('campaign_creator_matches')
      .delete()
      .eq('campaign_id', campaignId)

    // Generate matching for each creator
    const matchingResults = []
    
    for (const creator of creators) {
      try {
        const aiMatching = await generateAIMatchingReasons(campaign, creator)
        
        matchingResults.push({
          campaign_id: campaignId,
          creator_application_id: creator.id,
          match_score: aiMatching.overall_score,
          match_reasons: aiMatching.match_reasons,
          category_match_score: aiMatching.category_match_score,
          audience_match_score: aiMatching.audience_match_score,
          engagement_score: aiMatching.engagement_score,
          follower_score: aiMatching.follower_score,
          content_style_score: aiMatching.content_style_score,
          recommendation_summary: aiMatching.recommendation_summary
        })
      } catch (error) {
        console.error(`Error matching creator ${creator.id}:`, error)
      }
    }

    // Sort by match score
    matchingResults.sort((a, b) => b.match_score - a.match_score)

    // Mark top 10 as recommended and assign ranks
    matchingResults.forEach((result, index) => {
      result.is_recommended = index < 10
      result.recommendation_rank = index + 1
    })

    // Insert all matches
    const { error: insertError } = await supabaseBiz
      .from('campaign_creator_matches')
      .insert(matchingResults)

    if (insertError) throw insertError

    return {
      success: true,
      total_creators: creators.length,
      top_recommendations: matchingResults.slice(0, 10)
    }
  } catch (error) {
    console.error('Error generating campaign recommendations:', error)
    throw error
  }
}

/**
 * 캠페인의 추천 크리에이터 목록 가져오기
 */
export async function getCampaignRecommendations(campaignId, limit = 10) {
  try {
    const { data, error } = await supabaseBiz
      .from('campaign_creator_matches')
      .select(`
        *,
        creator:featured_creator_applications(*)
      `)
      .eq('campaign_id', campaignId)
      .eq('is_recommended', true)
      .order('recommendation_rank', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    throw error
  }
}

/**
 * 모든 매칭 결과 가져오기 (관리자용)
 */
export async function getAllCampaignMatches(campaignId) {
  try {
    const { data, error } = await supabaseBiz
      .from('campaign_creator_matches')
      .select(`
        *,
        creator:featured_creator_applications(*)
      `)
      .eq('campaign_id', campaignId)
      .order('match_score', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching all matches:', error)
    throw error
  }
}

/**
 * 특정 크리에이터의 매칭 상세 정보 가져오기
 */
export async function getCreatorMatchDetail(campaignId, creatorId) {
  try {
    const { data, error } = await supabaseBiz
      .from('campaign_creator_matches')
      .select(`
        *,
        creator:featured_creator_applications(*),
        campaign:campaigns(*)
      `)
      .eq('campaign_id', campaignId)
      .eq('creator_application_id', creatorId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching match detail:', error)
    throw error
  }
}

