const { createClient } = require('@supabase/supabase-js');

/**
 * video_submissions 테이블 업데이트 시 기업에게 알림 발송
 * (cnec.co.kr에서 크리에이터가 영상 제출할 때)
 *
 * Supabase Database Webhook 설정:
 * 1. Korea Supabase → Database → Webhooks → Create Webhook
 * 2. Name: video_submission_notification
 * 3. Table: video_submissions
 * 4. Events: INSERT, UPDATE
 * 5. URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('=== video_submissions Webhook 시작 ===');

  // 환경변수 확인 (디버깅용)
  console.log('환경변수 확인:', {
    VITE_SUPABASE_KOREA_URL: !!process.env.VITE_SUPABASE_KOREA_URL,
    SUPABASE_KOREA_SERVICE_ROLE_KEY: !!process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_BIZ_URL: !!process.env.VITE_SUPABASE_BIZ_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });

  // Supabase 클라이언트를 핸들러 내부에서 생성 (환경변수 로딩 문제 해결)
  // Fallback 패턴 적용
  const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL_BIZ;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!koreaUrl || !koreaKey) {
    console.error('Korea Supabase 환경변수 누락:', { koreaUrl: !!koreaUrl, koreaKey: !!koreaKey });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Korea Supabase 환경변수가 설정되지 않았습니다.' })
    };
  }

  const supabaseKorea = createClient(koreaUrl, koreaKey);
  const supabaseBiz = bizUrl && bizKey ? createClient(bizUrl, bizKey) : null;

  try {
    const body = JSON.parse(event.body);
    console.log('Webhook body:', JSON.stringify(body, null, 2));

    // INSERT 또는 UPDATE 이벤트만 처리
    if (!['INSERT', 'UPDATE'].includes(body.type) || body.table !== 'video_submissions') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Not a video submission event' })
      };
    }

    const record = body.record;
    const oldRecord = body.old_record;

    // UPDATE인 경우: 재제출(수정본 업로드)은 send-resubmit-notification.js에서 처리
    // 여기서 알림을 보내면 크리에이터가 수정 완료 알림 전송 시 2~3회 중복 발송됨
    if (body.type === 'UPDATE') {
      console.log('영상 재제출(UPDATE) 감지 → 알림은 send-resubmit-notification.js에서 처리, 스킵');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Resubmission notification deferred to send-resubmit-notification' })
      };
    }

    // INSERT인 경우: video_file_url이 있어야 함
    if (body.type === 'INSERT' && !record?.video_file_url) {
      console.log('영상 URL 없음, 스킵');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'No video URL' })
      };
    }

    console.log('새 영상 제출 감지:', {
      id: record.id,
      campaign_id: record.campaign_id,
      user_id: record.user_id,
      version: record.version
    });

    // 1. 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabaseKorea
      .from('campaigns')
      .select('id, title, brand, company_id, company_email')
      .eq('id', record.campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('캠페인 조회 실패:', campaignError);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: '캠페인 없음' })
      };
    }

    // 2. 크리에이터 정보 조회 (여러 소스에서 순차 조회)
    let creatorName = '크리에이터';
    if (record.user_id) {
      // 1순위: Korea DB user_profiles
      const { data: profile } = await supabaseKorea
        .from('user_profiles')
        .select('name')
        .eq('id', record.user_id)
        .single();

      if (profile?.name) {
        creatorName = profile.name;
      }

      // 2순위: BIZ DB applications 테이블에서 creator_name/applicant_name 조회
      if (creatorName === '크리에이터' && supabaseBiz) {
        const { data: appData } = await supabaseBiz
          .from('applications')
          .select('creator_name, applicant_name')
          .eq('campaign_id', record.campaign_id)
          .eq('user_id', record.user_id)
          .maybeSingle();

        if (appData) {
          creatorName = appData.creator_name || appData.applicant_name || '크리에이터';
        }
      }

      // 3순위: Korea DB applications 테이블
      if (creatorName === '크리에이터') {
        const { data: koreaAppData } = await supabaseKorea
          .from('applications')
          .select('creator_name, applicant_name')
          .eq('campaign_id', record.campaign_id)
          .eq('user_id', record.user_id)
          .maybeSingle();

        if (koreaAppData) {
          creatorName = koreaAppData.creator_name || koreaAppData.applicant_name || '크리에이터';
        }
      }

      // 4순위: BIZ DB user_profiles
      if (creatorName === '크리에이터' && supabaseBiz) {
        const { data: bizProfile } = await supabaseBiz
          .from('user_profiles')
          .select('full_name, name')
          .eq('id', record.user_id)
          .maybeSingle();

        if (bizProfile) {
          creatorName = bizProfile.full_name || bizProfile.name || '크리에이터';
        }
      }
    }

    // 3. 기업 전화번호 조회 (기업 데이터는 BIZ DB에만 있음)
    // ★ 캠페인 이관 후에도 올바른 기업에게 알림이 가도록 company_email 우선 사용
    let companyPhone = null;
    let companyName = campaign.brand || '기업';

    console.log('기업 정보 조회 시작:', {
      company_id: campaign.company_id,
      company_email: campaign.company_email
    });

    // 1순위: BIZ DB companies 테이블에서 company_email로 조회
    if (campaign.company_email && supabaseBiz) {
      const { data: bizCompany, error: bizError } = await supabaseBiz
        .from('companies')
        .select('company_name, phone')
        .eq('email', campaign.company_email)
        .single();

      console.log('BIZ DB companies (email) 조회 결과:', { bizCompany, error: bizError?.message });

      if (bizCompany) {
        companyPhone = bizCompany.phone;
        companyName = bizCompany.company_name || companyName;
        console.log('BIZ DB (email)에서 정보 찾음:', { companyPhone, companyName });
      }
    }

    // 2순위: BIZ DB에서 못 찾으면 company_id(user_id)로 조회 시도
    if (!companyPhone && campaign.company_id && supabaseBiz) {
      const { data: bizCompanyById, error: bizError2 } = await supabaseBiz
        .from('companies')
        .select('company_name, phone')
        .eq('user_id', campaign.company_id)
        .maybeSingle();

      console.log('BIZ DB companies (user_id) 조회 결과:', { bizCompanyById, error: bizError2?.message });

      if (bizCompanyById) {
        companyPhone = bizCompanyById.phone;
        companyName = bizCompanyById.company_name || companyName;
        console.log('BIZ DB (user_id)에서 정보 찾음:', { companyPhone, companyName });
      }
    }

    // 3순위: Korea DB companies 테이블에서 조회 (레거시 지원)
    if (!companyPhone && campaign.company_email) {
      const { data: koreaCompany, error: koreaError } = await supabaseKorea
        .from('companies')
        .select('company_name, phone, contact_phone')
        .eq('email', campaign.company_email)
        .maybeSingle();

      console.log('Korea DB companies 조회 결과:', { koreaCompany, error: koreaError?.message });

      if (koreaCompany) {
        companyPhone = koreaCompany.phone || koreaCompany.contact_phone;
        companyName = koreaCompany.company_name || companyName;
        console.log('Korea DB에서 정보 찾음:', { companyPhone, companyName });
      }
    }

    if (!companyPhone) {
      console.log('기업 전화번호 없음 - 알림톡 스킵');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: '기업 전화번호 없음' })
      };
    }

    // 4. 알림톡 발송
    console.log('알림톡 발송:', { companyPhone, companyName, campaign: campaign.title, creator: creatorName });

    const kakaoResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-kakao-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverNum: companyPhone,
        receiverName: companyName,
        templateCode: '025100001008',
        variables: {
          '회사명': companyName,
          '캠페인명': campaign.title || campaign.brand,
          '크리에이터명': creatorName
        }
      })
    });

    const kakaoResult = await kakaoResponse.json();
    console.log('알림톡 결과:', kakaoResult);

    // 5. 네이버 웍스 알림
    try {
      const worksResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `📹 영상 제출 알림 (cnec.co.kr)\n\n캠페인: ${campaign.title}\n크리에이터: ${creatorName}\n버전: V${record.version || 1}\n제출 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
        })
      });
      const worksResult = await worksResponse.json();
      console.log('네이버 웍스 결과:', worksResult);
    } catch (e) {
      console.error('네이버 웍스 오류:', e);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: '알림 발송 완료', kakaoResult })
    };

  } catch (error) {
    console.error('Webhook 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
