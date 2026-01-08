/**
 * 모든 캠페인 디버그 - application_deadline 확인
 * URL: /.netlify/functions/debug-campaigns
 */

const { createClient } = require('@supabase/supabase-js');

const createSupabaseClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }
  return null;
};

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
    const supabase = createSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase 클라이언트 초기화 실패');
    }

    // 오늘 날짜
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = koreaTime.toISOString().split('T')[0];

    // 모든 active/recruiting/approved 캠페인 조회
    const { data: allCampaigns, error } = await supabase
      .from('campaigns')
      .select('id, title, status, application_deadline, content_submission_deadline, created_at')
      .in('status', ['active', 'recruiting', 'approved'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        today: today,
        totalCampaigns: allCampaigns?.length || 0,
        campaigns: allCampaigns || []
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
