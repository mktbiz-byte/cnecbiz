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

    // UPDATE인 경우: video_file_url이 새로 추가되었는지 확인
    if (body.type === 'UPDATE') {
      if (oldRecord?.video_file_url && record?.video_file_url === oldRecord?.video_file_url) {
        console.log('영상 URL 변경 없음, 스킵');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'No video URL change' })
        };
      }
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

    // 2. 크리에이터 정보 조회
    let creatorName = '크리에이터';
    if (record.user_id) {
      const { data: profile } = await supabaseKorea
        .from('user_profiles')
        .select('full_name, name')
        .eq('id', record.user_id)
        .single();

      if (profile) {
        creatorName = profile.full_name || profile.name || '크리에이터';
      }
    }

    // 3. 기업 전화번호 조회
    let companyPhone = null;
    let companyName = campaign.brand || '기업';

    if (campaign.company_id) {
      const { data: company } = await supabaseKorea
        .from('companies')
        .select('company_name, phone, representative_phone')
        .eq('user_id', campaign.company_id)
        .single();

      if (company) {
        companyPhone = company.phone || company.representative_phone;
        companyName = company.company_name || companyName;
      }
    }

    // BIZ DB fallback
    if (!companyPhone && campaign.company_email && supabaseBiz) {
      const { data: bizCompany } = await supabaseBiz
        .from('companies')
        .select('company_name, phone, representative_phone')
        .eq('email', campaign.company_email)
        .single();

      if (bizCompany) {
        companyPhone = bizCompany.phone || bizCompany.representative_phone;
        companyName = bizCompany.company_name || companyName;
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
      await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `📹 영상 제출 알림 (cnec.co.kr)\n\n캠페인: ${campaign.title}\n크리에이터: ${creatorName}\n버전: V${record.version || 1}\n제출 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
        })
      });
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
