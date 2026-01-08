/**
 * 일본 캠페인 전체 조회 (필터 없이)
 * URL: /.netlify/functions/debug-japan-campaigns
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
    const japanUrl = process.env.VITE_SUPABASE_JAPAN_URL;
    const japanKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY;

    if (!japanUrl || !japanKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Japan Supabase 환경 변수 미설정',
          envCheck: {
            VITE_SUPABASE_JAPAN_URL: !!japanUrl,
            SUPABASE_JAPAN_SERVICE_ROLE_KEY: !!process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY,
            VITE_SUPABASE_JAPAN_ANON_KEY: !!process.env.VITE_SUPABASE_JAPAN_ANON_KEY
          }
        }, null, 2)
      };
    }

    const supabase = createClient(japanUrl, japanKey);

    // 오늘 날짜
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = koreaTime.toISOString().split('T')[0];

    // 모든 캠페인 조회 (status 필터 없음, 최근 50개)
    // 일본 DB에는 campaign_type 컬럼이 없음
    const { data: allCampaigns, error: allError } = await supabase
      .from('campaigns')
      .select('id, title, status, application_deadline, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    let allResult = { count: 0, campaigns: [] };
    if (!allError && allCampaigns) {
      allResult = { count: allCampaigns.length, campaigns: allCampaigns };
    } else if (allError) {
      allResult.error = allError.message;
    }

    // 1/8 마감 캠페인 조회 (status 필터 없음)
    const { data: jan8Campaigns, error: jan8Error } = await supabase
      .from('campaigns')
      .select('id, title, status, application_deadline, created_at')
      .eq('application_deadline', '2026-01-08')
      .limit(50);

    let jan8Result = { count: 0, campaigns: [] };
    if (!jan8Error && jan8Campaigns) {
      jan8Result = { count: jan8Campaigns.length, campaigns: jan8Campaigns };
    } else if (jan8Error) {
      jan8Result.error = jan8Error.message;
    }

    // 1/8 마감 + active/recruiting/approved 캠페인 조회
    const { data: jan8ActiveCampaigns, error: jan8ActiveError } = await supabase
      .from('campaigns')
      .select('id, title, status, application_deadline, created_at')
      .eq('application_deadline', '2026-01-08')
      .in('status', ['active', 'recruiting', 'approved'])
      .limit(50);

    let jan8ActiveResult = { count: 0, campaigns: [] };
    if (!jan8ActiveError && jan8ActiveCampaigns) {
      jan8ActiveResult = { count: jan8ActiveCampaigns.length, campaigns: jan8ActiveCampaigns };
    } else if (jan8ActiveError) {
      jan8ActiveResult.error = jan8ActiveError.message;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        today: today,
        envConfigured: true,
        allCampaigns: allResult,
        jan8Campaigns: jan8Result,
        jan8ActiveCampaigns: jan8ActiveResult
      }, null, 2)
    };

  } catch (error) {
    console.error('일본 캠페인 조회 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
