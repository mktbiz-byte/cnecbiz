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
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select(`
          id,
          user_id,
          campaign_id,
          video_submission_deadline,
          video_submitted,
          status,
          campaigns (
            id,
            title,
            campaign_name,
            company_id
          )
        `)
        .eq('video_submission_deadline', date)
        .or('video_submitted.is.null,video_submitted.eq.false')
        .in('status', ['selected', 'approved', 'guide_approved']);

      if (appError) {
        console.error(`Applications 조회 오류 (${date}):`, appError);
        results.push({
          date,
          label,
          error: appError.message,
          count: 0
        });
        continue;
      }

      console.log(`${label} (${date}): ${applications?.length || 0}건 발견`);

      // 각 application의 크리에이터 정보 확인
      const applicationsWithCreators = [];
      for (const app of applications || []) {
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

        applicationsWithCreators.push({
          application_id: app.id,
          campaign: app.campaigns?.title || app.campaigns?.campaign_name,
          creator_name: creatorProfile?.channel_name || creatorProfile?.name || 'Unknown',
          phone: creatorProfile?.phone || null,
          email: creatorProfile?.email || null,
          status: app.status
        });
      }

      results.push({
        date,
        label,
        count: applications?.length || 0,
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
