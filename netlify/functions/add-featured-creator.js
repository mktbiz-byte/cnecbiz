const { createClient } = require('@supabase/supabase-js');

// cnectotal Supabase 클라이언트
const supabaseTotal = createClient(
  process.env.VITE_SUPABASE_TOTAL_URL,
  process.env.SUPABASE_TOTAL_SERVICE_KEY
);

// 자동 점수 계산 함수
function calculateOverallScore(creator) {
  let score = 0;

  // 팔로워 점수 (최대 30점)
  const instagramScore = Math.min(10, (creator.instagram_followers || 0) / 10000);
  const tiktokScore = Math.min(10, (creator.tiktok_followers || 0) / 10000);
  const youtubeScore = Math.min(10, (creator.youtube_subscribers || 0) / 5000);
  score += Math.floor(instagramScore + tiktokScore + youtubeScore);

  // 참여율 점수 (최대 30점)
  score += Math.min(30, Math.floor((creator.engagement_rate || 0) * 100));

  // 플랫폼 다양성 점수 (최대 40점)
  if ((creator.instagram_followers || 0) > 1000) score += 13;
  if ((creator.tiktok_followers || 0) > 1000) score += 13;
  if ((creator.youtube_subscribers || 0) > 500) score += 14;

  return Math.min(100, score);
}

// 추천 배지 계산
function getRecommendationBadge(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'recommended';
  if (score >= 20) return 'normal';
  return 'review_needed';
}

// 플랫폼별 점수 계산
function calculatePlatformScores(creator) {
  return {
    youtube: Math.min(100, Math.floor((creator.youtube_subscribers || 0) / 1000)),
    instagram: Math.min(100, Math.floor((creator.instagram_followers || 0) / 1000)),
    tiktok: Math.min(100, Math.floor((creator.tiktok_followers || 0) / 1000))
  };
}

exports.handler = async (event) => {
  try {
    const { creator, sourceCountry } = JSON.parse(event.body);

    if (!creator || !sourceCountry) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '크리에이터 정보와 국가 코드가 필요합니다.'
        })
      };
    }

    // 자동 점수 계산
    const overallScore = calculateOverallScore(creator);
    const recommendationBadge = getRecommendationBadge(overallScore);
    const platformScores = calculatePlatformScores(creator);

    // cnectotal featured_creators에 등록
    const { data, error } = await supabaseTotal
      .from('featured_creators')
      .insert([
        {
          source_user_id: creator.id,
          source_country: sourceCountry,
          name: creator.name || creator.email,
          email: creator.email,
          phone: creator.phone,
          profile_image_url: creator.profile_image_url,
          bio: creator.bio,
          instagram_handle: creator.instagram_handle,
          instagram_followers: creator.instagram_followers || 0,
          tiktok_handle: creator.tiktok_handle,
          tiktok_followers: creator.tiktok_followers || 0,
          youtube_handle: creator.youtube_handle,
          youtube_subscribers: creator.youtube_subscribers || 0,
          engagement_rate: creator.engagement_rate || 0,
          gender: creator.gender,
          age: creator.age,
          region: creator.region,
          primary_country: sourceCountry,
          active_regions: [sourceCountry],
          overall_score: overallScore,
          recommendation_badge: recommendationBadge,
          platform_scores: platformScores,
          featured_type: 'manual',
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) {
      // 이미 등록된 경우
      if (error.code === '23505') {
        return {
          statusCode: 409,
          body: JSON.stringify({
            success: false,
            error: '이미 추천 크리에이터로 등록된 사용자입니다.'
          })
        };
      }

      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: data,
        message: '추천 크리에이터로 등록되었습니다.'
      })
    };

  } catch (error) {
    console.error('추천 크리에이터 등록 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

