/**
 * video_submissions 조회 API
 * RLS를 우회하여 service role key로 조회
 *
 * POST /.netlify/functions/get-video-submissions
 * Body: { region: 'korea', campaignIds: ['id1', 'id2'] }
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { region, campaignIds, campaignId } = JSON.parse(event.body || '{}');

    // 지역별 Supabase 설정
    const regionConfigs = {
      korea: {
        url: process.env.VITE_SUPABASE_KOREA_URL,
        key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY
      },
      japan: {
        url: process.env.VITE_SUPABASE_JAPAN_URL,
        key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY
      },
      us: {
        url: process.env.VITE_SUPABASE_US_URL,
        key: process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY
      },
      biz: {
        url: process.env.VITE_SUPABASE_BIZ_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_BIZ_ANON_KEY
      }
    };

    const config = regionConfigs[region];
    if (!config || !config.url || !config.key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Invalid region: ${region}` })
      };
    }

    const supabase = createClient(config.url, config.key);

    // Korea DB에는 step 컬럼이 없음 - 존재하는 컬럼만 조회
    let query = supabase
      .from('video_submissions')
      .select('id, campaign_id, user_id, status, final_confirmed_at, week_number, video_number, created_at');

    // campaignId 또는 campaignIds로 필터링
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    } else if (campaignIds && campaignIds.length > 0) {
      query = query.in('campaign_id', campaignIds);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'campaignId or campaignIds required' })
      };
    }

    const { data, error } = await query;

    if (error) {
      console.error('video_submissions 조회 오류:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        region,
        count: data?.length || 0,
        submissions: data || []
      })
    };

  } catch (error) {
    console.error('함수 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
