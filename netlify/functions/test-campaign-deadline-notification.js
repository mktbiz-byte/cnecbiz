/**
 * 캠페인 모집 마감일 알림 수동 테스트 함수
 * URL: /.netlify/functions/test-campaign-deadline-notification
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
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

    // 오늘 날짜 (한국 시간 기준)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('현재 시간 (UTC):', now.toISOString());
    console.log('현재 시간 (KST):', koreaTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    console.log('오늘 날짜:', today);

    // 오늘이 모집 마감일인 캠페인 조회
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        brand,
        product_name,
        company_id,
        company_email,
        application_deadline,
        status
      `)
      .eq('application_deadline', today)
      .in('status', ['active', 'recruiting', 'approved']);

    if (campaignError) {
      throw campaignError;
    }

    console.log(`오늘 마감되는 캠페인 수: ${campaigns?.length || 0}`);

    const results = [];

    for (const campaign of campaigns || []) {
      // 해당 캠페인의 지원자 수 조회
      const { count: applicantCount, error: countError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id);

      if (countError) {
        console.error(`지원자 수 조회 실패 (캠페인 ${campaign.id}):`, countError);
        results.push({
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          error: countError.message
        });
        continue;
      }

      // 기업 정보 조회 (전화번호, 회사명, 이메일)
      let companyPhone = null;
      let companyEmail = campaign.company_email || null;
      let companyName = campaign.brand || '기업';

      if (campaign.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('company_name, phone, representative_phone, email')
          .eq('user_id', campaign.company_id)
          .single();

        if (!companyError && company) {
          companyPhone = company.phone || company.representative_phone;
          companyName = company.company_name || campaign.brand || '기업';
          companyEmail = companyEmail || company.email;
        }
      }

      // 회사 전화번호/이메일이 없으면 user_profiles에서 조회
      if ((!companyPhone || !companyEmail) && campaign.company_id) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('phone, email')
          .eq('id', campaign.company_id)
          .single();

        if (!profileError && profile) {
          companyPhone = companyPhone || profile.phone;
          companyEmail = companyEmail || profile.email;
        }
      }

      results.push({
        campaign_id: campaign.id,
        campaign_title: campaign.title,
        brand: campaign.brand,
        status: campaign.status,
        application_deadline: campaign.application_deadline,
        applicant_count: applicantCount || 0,
        company_name: companyName,
        company_phone: companyPhone,
        company_email: companyEmail,
        will_send_kakao: !!companyPhone,
        will_send_email: !!companyEmail
      });
    }

    // 환경 변수 확인
    const envCheck = {
      POPBILL_LINK_ID: !!process.env.POPBILL_LINK_ID,
      POPBILL_SECRET_KEY: !!process.env.POPBILL_SECRET_KEY,
      POPBILL_CORP_NUM: !!process.env.POPBILL_CORP_NUM,
      POPBILL_SENDER_NUM: !!process.env.POPBILL_SENDER_NUM,
      GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
      NAVER_WORKS_CLIENT_ID: !!process.env.NAVER_WORKS_CLIENT_ID,
      NAVER_WORKS_CLIENT_SECRET: !!process.env.NAVER_WORKS_CLIENT_SECRET,
      NAVER_WORKS_BOT_ID: !!process.env.NAVER_WORKS_BOT_ID,
      NAVER_WORKS_CHANNEL_ID: !!process.env.NAVER_WORKS_CHANNEL_ID
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: {
          utc: now.toISOString(),
          kst: koreaTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
        },
        today: today,
        totalCampaigns: campaigns?.length || 0,
        campaigns: results,
        envCheck
      }, null, 2)
    };

  } catch (error) {
    console.error('테스트 함수 오류:', error);
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
