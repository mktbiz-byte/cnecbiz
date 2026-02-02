/**
 * video_submissions 테이블 디버그 - 4주 챌린지 캠페인 확인
 * URL: /.netlify/functions/debug-video-submissions?campaign_title=TAE743
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const campaignTitle = params.campaign_title || 'TAE743';

    // 다중 지역 Supabase 클라이언트 설정
    const regions = [
      {
        name: 'korea',
        url: process.env.VITE_SUPABASE_KOREA_URL,
        key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY
      },
      {
        name: 'biz',
        url: process.env.VITE_SUPABASE_BIZ_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_BIZ_ANON_KEY
      }
    ];

    const results = {};

    for (const region of regions) {
      if (!region.url || !region.key) {
        results[region.name] = { error: 'Not configured' };
        continue;
      }

      const supabase = createClient(region.url, region.key);

      // 1. 캠페인 찾기
      const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('id, title, campaign_type, status')
        .ilike('title', `%${campaignTitle}%`)
        .limit(5);

      if (campError) {
        results[region.name] = { error: campError.message };
        continue;
      }

      results[region.name] = {
        campaigns: campaigns || [],
        video_submissions: {}
      };

      // 2. 각 캠페인의 video_submissions 조회
      for (const camp of (campaigns || [])) {
        // video_submissions 조회
        const { data: subs, error: subError } = await supabase
          .from('video_submissions')
          .select('*')
          .eq('campaign_id', camp.id);

        if (subError) {
          results[region.name].video_submissions[camp.id] = { error: subError.message };
          continue;
        }

        // 컬럼 구조 확인
        const columns = subs && subs.length > 0 ? Object.keys(subs[0]) : [];

        results[region.name].video_submissions[camp.id] = {
          campaign_title: camp.title,
          campaign_type: camp.campaign_type,
          total_submissions: subs?.length || 0,
          columns: columns,
          submissions: (subs || []).map(s => ({
            id: s.id,
            user_id: s.user_id?.substring(0, 8) + '...',
            status: s.status,
            week_number: s.week_number,
            video_number: s.video_number,
            step: s.step,
            week: s.week,  // 존재하는지 확인
            final_confirmed_at: s.final_confirmed_at,
            created_at: s.created_at
          }))
        };

        // applications 조회 (비교용)
        const { data: apps } = await supabase
          .from('applications')
          .select('id, user_id, status')
          .eq('campaign_id', camp.id);

        results[region.name].video_submissions[camp.id].applications = (apps || []).map(a => ({
          user_id: a.user_id?.substring(0, 8) + '...',
          status: a.status
        }));
      }
    }

    // 4주 챌린지 캠페인도 확인
    const fourWeekResults = {};
    for (const region of regions) {
      if (!region.url || !region.key) continue;

      const supabase = createClient(region.url, region.key);

      const { data: fourWeek } = await supabase
        .from('campaigns')
        .select('id, title, campaign_type')
        .eq('campaign_type', '4week_challenge')
        .limit(3);

      fourWeekResults[region.name] = fourWeek || [];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        searchTerm: campaignTitle,
        results: results,
        fourWeekCampaigns: fourWeekResults
      }, null, 2)
    };

  } catch (error) {
    console.error('디버그 함수 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
