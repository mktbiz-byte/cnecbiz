/**
 * 영상 제출 마감일 알림 수동 테스트 함수
 * URL: /.netlify/functions/test-video-deadline-notification
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

    // 오늘, 2일 후, 3일 후 날짜 계산
    const today = new Date(koreaTime);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const in2Days = new Date(today);
    in2Days.setDate(today.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split('T')[0];

    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    console.log('현재 시간 (UTC):', now.toISOString());
    console.log('현재 시간 (KST):', koreaTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    console.log('오늘:', todayStr);
    console.log('2일 후:', in2DaysStr);
    console.log('3일 후:', in3DaysStr);

    // 각 날짜별로 데이터 조회
    const results = [];

    for (const { date, label } of [
      { date: todayStr, label: '당일' },
      { date: in2DaysStr, label: '2일 후' },
      { date: in3DaysStr, label: '3일 후' }
    ]) {
      // 1단계: 해당 날짜가 content_submission_deadline인 캠페인 찾기
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, title, company_id, campaign_type, content_submission_deadline')
        .eq('content_submission_deadline', date)
        .in('status', ['active', 'recruiting', 'approved']);

      if (campaignError) {
        console.error(`캠페인 조회 오류 (${date}):`, campaignError);
        results.push({
          date,
          label,
          error: campaignError.message,
          count: 0
        });
        continue;
      }

      if (!campaigns || campaigns.length === 0) {
        console.log(`${label} (${date}): 해당 날짜에 마감되는 캠페인 없음`);
        results.push({
          date,
          label,
          count: 0,
          applications: []
        });
        continue;
      }

      console.log(`${label} (${date}): ${campaigns.length}개 캠페인 발견`);

      // 2단계: 각 캠페인의 applications 가져오기
      const allApplications = [];

      for (const campaign of campaigns) {
        const { data: applications, error: appError } = await supabase
          .from('applications')
          .select('id, user_id, campaign_id, status')
          .eq('campaign_id', campaign.id)
          .neq('status', 'completed')
          .in('status', ['selected', 'approved', 'guide_approved']);

        if (appError) {
          console.error(`Applications 조회 오류 (campaign ${campaign.id}):`, appError);
          continue;
        }

        // 각 application에 campaign 정보 추가
        if (applications && applications.length > 0) {
          applications.forEach(app => {
            app.campaigns = campaign;
          });
          allApplications.push(...applications);
        }
      }

      console.log(`${label} (${date}): ${allApplications.length}건 application 발견`);

      // 각 application의 크리에이터 정보 및 영상 제출 현황 확인
      const applicationsWithCreators = [];
      for (const app of allApplications) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name, channel_name, phone, email')
          .eq('id', app.user_id)
          .maybeSingle();

        let creatorProfile = profile;
        if (!creatorProfile) {
          const { data: profile2 } = await supabase
            .from('user_profiles')
            .select('name, channel_name, phone, email')
            .eq('user_id', app.user_id)
            .maybeSingle();
          creatorProfile = profile2;
        }

        // 캠페인 타입에 따른 필요 영상 개수 확인
        const campaignType = app.campaigns?.campaign_type;
        let requiredVideoCount = 1; // 기본값
        if (campaignType === '4week_challenge') {
          requiredVideoCount = 4;
        } else if (campaignType === 'oliveyoung' || campaignType === 'oliveyoung_sale') {
          requiredVideoCount = 2;
        }

        // video_submissions에서 이미 제출된 영상 개수 확인
        const { data: submittedVideos } = await supabase
          .from('video_submissions')
          .select('id, status, final_confirmed_at')
          .eq('campaign_id', app.campaign_id)
          .eq('user_id', app.user_id)
          .in('status', ['approved', 'completed']);

        const submittedCount = submittedVideos?.length || 0;

        applicationsWithCreators.push({
          application_id: app.id,
          campaign: app.campaigns?.title || '캠페인',
          campaign_type: campaignType,
          creator_name: creatorProfile?.channel_name || creatorProfile?.name || 'Unknown',
          phone: creatorProfile?.phone || null,
          email: creatorProfile?.email || null,
          status: app.status,
          required_videos: requiredVideoCount,
          submitted_videos: submittedCount,
          should_notify: submittedCount < requiredVideoCount
        });
      }

      results.push({
        date,
        label,
        count: allApplications.length,
        applications: applicationsWithCreators
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
        dates: {
          today: todayStr,
          in2Days: in2DaysStr,
          in3Days: in3DaysStr
        },
        results,
        envCheck,
        totalApplications: results.reduce((sum, r) => sum + r.count, 0)
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
