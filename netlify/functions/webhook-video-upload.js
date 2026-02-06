const { createClient } = require('@supabase/supabase-js');

/**
 * 영상 업로드 시 기업에게 알림 발송 (Supabase Webhook용)
 *
 * Supabase Database Webhook 설정:
 * 1. Korea Supabase → Database → Webhooks → Create Webhook
 * 2. Name: video_upload_notification
 * 3. Table: campaign_participants
 * 4. Events: UPDATE
 * 5. URL: https://cnecbiz.com/.netlify/functions/webhook-video-upload
 * 6. HTTP Headers: x-webhook-secret: [your-secret]
 *
 * Body 형식 (Supabase Webhook):
 * {
 *   type: 'UPDATE',
 *   table: 'campaign_participants',
 *   record: { id, campaign_id, video_files, ... },
 *   old_record: { id, campaign_id, video_files, ... }
 * }
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('=== 영상 업로드 Webhook 시작 ===');
  console.log('Headers:', JSON.stringify(event.headers, null, 2));

  // 환경변수 확인 (디버깅용)
  console.log('환경변수 확인:', {
    VITE_SUPABASE_KOREA_URL: !!process.env.VITE_SUPABASE_KOREA_URL,
    SUPABASE_KOREA_SERVICE_ROLE_KEY: !!process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_BIZ_URL: !!process.env.VITE_SUPABASE_BIZ_URL,
    SUPABASE_SERVICE_ROLE_KEY_BIZ: !!process.env.SUPABASE_SERVICE_ROLE_KEY_BIZ
  });

  // Supabase 클라이언트를 핸들러 내부에서 생성 (환경변수 로딩 문제 해결)
  // Fallback 패턴 적용
  const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL_BIZ;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY_BIZ || process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    // Webhook Secret 검증 (선택적)
    const webhookSecret = event.headers['x-webhook-secret'];
    if (process.env.WEBHOOK_SECRET && webhookSecret !== process.env.WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const body = JSON.parse(event.body);
    console.log('Webhook body:', JSON.stringify(body, null, 2));

    // Supabase Webhook 형식 확인
    if (body.type !== 'UPDATE' || body.table !== 'campaign_participants') {
      console.log('Not a video upload event, skipping');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Not a video upload event' })
      };
    }

    const record = body.record;
    const oldRecord = body.old_record;

    // video_files가 변경되었는지 확인
    const oldVideoCount = oldRecord?.video_files?.length || 0;
    const newVideoCount = record?.video_files?.length || 0;

    if (newVideoCount <= oldVideoCount) {
      console.log('No new video uploaded, skipping');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'No new video' })
      };
    }

    console.log(`새 영상 업로드 감지: ${oldVideoCount} → ${newVideoCount}`);

    // 새로 추가된 영상 정보
    const newVideo = record.video_files[newVideoCount - 1];
    const version = newVideo?.version || newVideoCount;

    // ★ 중복 알림 방지: video_submissions 테이블에 레코드가 있으면
    // webhook-video-submission.js에서 이미 알림을 보내므로 여기서는 스킵
    try {
      const { data: existingSubmission } = await supabaseKorea
        .from('video_submissions')
        .select('id')
        .eq('campaign_id', record.campaign_id)
        .eq('user_id', record.user_id)
        .limit(1)
        .maybeSingle();

      if (existingSubmission) {
        console.log('video_submissions에 레코드 존재 → webhook-video-submission.js에서 알림 처리, 스킵');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Deferred to webhook-video-submission' })
        };
      }
    } catch (dedupeError) {
      console.log('중복 체크 실패, 알림 계속 진행:', dedupeError.message);
    }

    // 1. 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabaseKorea
      .from('campaigns')
      .select('id, title, brand, company_id, company_email')
      .eq('id', record.campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('캠페인 조회 실패:', campaignError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '캠페인을 찾을 수 없습니다.' })
      };
    }

    console.log('캠페인 정보:', campaign);

    // 2. 크리에이터 정보 조회
    const creatorName = record.creator_name || record.applicant_name || '크리에이터';

    // 3. 기업 정보 조회 (기업 데이터는 BIZ DB에만 있음)
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
      console.error('기업 전화번호를 찾을 수 없습니다.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: '기업 전화번호를 찾을 수 없어 알림톡 발송 실패'
        })
      };
    }

    // 4. 카카오 알림톡 발송
    console.log('알림톡 발송 시작:', {
      companyPhone,
      companyName,
      campaignTitle: campaign.title,
      creatorName,
      version
    });

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
    console.log('알림톡 발송 결과:', kakaoResult);

    // 5. 네이버 웍스 알림 발송
    try {
      const naverResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `📹 영상 업로드 알림\n\n캠페인: ${campaign.title}\n크리에이터: ${creatorName}\n버전: V${version}\n업로드 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
        })
      });

      const naverResult = await naverResponse.json();
      console.log('네이버 웍스 발송 결과:', naverResult);
    } catch (naverError) {
      console.error('네이버 웍스 발송 실패:', naverError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '영상 업로드 알림 발송 완료',
        kakaoResult
      })
    };

  } catch (error) {
    console.error('Webhook 처리 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
