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
    // 오늘 날짜
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = koreaTime.toISOString().split('T')[0];

    // 다중 지역 Supabase 클라이언트 설정
    const regions = [
      { name: 'korea', url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY },
      { name: 'japan', url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY },
      { name: 'us', url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY }
    ];

    // 모든 지역에서 캠페인 조회
    let allCampaigns = [];
    const regionCounts = {};

    for (const region of regions) {
      if (!region.url || !region.key) {
        console.log(`${region.name} Supabase 미설정 - 건너뜀`);
        regionCounts[region.name] = { configured: false, count: 0 };
        continue;
      }

      const supabase = createClient(region.url, region.key);

      // 먼저 기본 컬럼만 조회 (content_submission_deadline은 한국에만 있을 수 있음)
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, status, application_deadline, created_at, campaign_type')
        .in('status', ['active', 'recruiting', 'approved'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error(`${region.name} 조회 오류:`, error);
        regionCounts[region.name] = { configured: true, count: 0, error: error.message };
        continue;
      }

      // 한국 DB인 경우에만 content_submission_deadline 추가 조회 시도
      if (region.name === 'korea' && campaigns && campaigns.length > 0) {
        for (const campaign of campaigns) {
          const { data: detailData } = await supabase
            .from('campaigns')
            .select('content_submission_deadline')
            .eq('id', campaign.id)
            .single();
          if (detailData) {
            campaign.content_submission_deadline = detailData.content_submission_deadline;
          }
        }
      }

      regionCounts[region.name] = { configured: true, count: campaigns?.length || 0 };

      if (campaigns && campaigns.length > 0) {
        campaigns.forEach(c => c.region = region.name);
        allCampaigns.push(...campaigns);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        today: today,
        totalCampaigns: allCampaigns.length,
        regionCounts: regionCounts,
        campaigns: allCampaigns
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
