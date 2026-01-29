/**
 * 영상 제출 마감일 알림 대상 조회 테스트
 * 실제 발송 없이 대상만 확인
 */

const { createClient } = require('@supabase/supabase-js');

// 날짜 문자열에서 YYYY-MM-DD 부분만 추출 (timestamp/date 타입 모두 처리)
const getDatePart = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    return dateValue.substring(0, 10);
  }
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  return null;
};

exports.handler = async (event) => {
  console.log('=== 영상 제출 마감일 알림 대상 조회 테스트 ===');

  try {
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

    const results = {
      dates: { today: todayStr, in2Days: in2DaysStr, in3Days: in3DaysStr },
      envCheck: {
        KOREA_URL: process.env.VITE_SUPABASE_KOREA_URL ? '✅' : '❌',
        KOREA_KEY: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY ? '✅' : '❌'
      },
      campaigns: [],
      pendingNotifications: []
    };

    // Korea DB 연결
    const supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL;
    const supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: 'Korea DB 환경변수 미설정', results })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 모든 활성 캠페인 조회
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, status, campaign_type, content_submission_deadline, step1_deadline, step2_deadline, week1_deadline, week2_deadline, week3_deadline, week4_deadline')
      .in('status', ['active', 'recruiting', 'approved']);

    if (campaignError) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: '캠페인 조회 오류', details: campaignError.message, results })
      };
    }

    results.totalCampaigns = campaigns?.length || 0;

    // 마감일 필터링 (getDatePart로 timestamp/date 타입 모두 처리)
    const deadlineDates = [in3DaysStr, in2DaysStr, todayStr];
    const matchingCampaigns = (campaigns || []).filter(campaign => {
      const type = (campaign.campaign_type || '').toLowerCase();

      if (type.includes('4week') || type.includes('challenge')) {
        return deadlineDates.includes(getDatePart(campaign.week1_deadline)) ||
               deadlineDates.includes(getDatePart(campaign.week2_deadline)) ||
               deadlineDates.includes(getDatePart(campaign.week3_deadline)) ||
               deadlineDates.includes(getDatePart(campaign.week4_deadline));
      } else if (type.includes('olive') || type.includes('올리브')) {
        return deadlineDates.includes(getDatePart(campaign.step1_deadline)) ||
               deadlineDates.includes(getDatePart(campaign.step2_deadline));
      } else {
        return deadlineDates.includes(getDatePart(campaign.content_submission_deadline));
      }
    });

    results.matchingCampaigns = matchingCampaigns.map(c => ({
      id: c.id,
      title: c.title,
      status: c.status,
      type: c.campaign_type,
      deadlines: {
        content: c.content_submission_deadline,
        step1: c.step1_deadline,
        step2: c.step2_deadline,
        week1: c.week1_deadline,
        week2: c.week2_deadline,
        week3: c.week3_deadline,
        week4: c.week4_deadline
      }
    }));

    // 매칭 캠페인의 applications 조회
    for (const campaign of matchingCampaigns) {
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('id, user_id, status')
        .eq('campaign_id', campaign.id)
        .in('status', ['filming', 'selected', 'guide_approved']);

      if (appError) {
        results.pendingNotifications.push({
          campaign: campaign.title,
          error: appError.message
        });
        continue;
      }

      if (applications && applications.length > 0) {
        for (const app of applications) {
          // user_profiles에서 크리에이터 정보 조회
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name, channel_name, phone, email')
            .eq('id', app.user_id)
            .maybeSingle();

          // video_submissions 확인
          const { data: videos } = await supabase
            .from('video_submissions')
            .select('id, status')
            .eq('campaign_id', campaign.id)
            .eq('user_id', app.user_id)
            .in('status', ['approved', 'completed']);

          const submittedCount = videos?.length || 0;
          let requiredCount = 1;
          const type = (campaign.campaign_type || '').toLowerCase();
          if (type.includes('4week') || type.includes('challenge')) requiredCount = 4;
          else if (type.includes('olive')) requiredCount = 2;

          results.pendingNotifications.push({
            campaign: campaign.title,
            campaignType: campaign.campaign_type,
            creatorName: profile?.channel_name || profile?.name || '-',
            phone: profile?.phone || '-',
            email: profile?.email || '-',
            appStatus: app.status,
            videoSubmitted: `${submittedCount}/${requiredCount}`,
            needsNotification: submittedCount < requiredCount
          });
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
};
