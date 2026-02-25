const { createClient } = require('@supabase/supabase-js');

/**
 * video_submissions 테이블 INSERT 시 기업에게 알림 발송
 * 멀티-리전 지원 (Korea, Japan, US)
 *
 * Supabase Database Webhook 설정:
 * 1. Korea Supabase → Database → Webhooks → Create Webhook
 *    - Name: video_submission_notification
 *    - Table: video_submissions
 *    - Events: INSERT
 *    - URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission
 *
 * 2. Japan Supabase → Database → Webhooks → Create Webhook
 *    - Name: video_submission_notification
 *    - Table: video_submissions
 *    - Events: INSERT
 *    - URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission?region=japan
 *
 * 3. US Supabase → Database → Webhooks → Create Webhook
 *    - Name: video_submission_notification
 *    - Table: video_submissions
 *    - Events: INSERT
 *    - URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission?region=us
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

  // 리전 판별: query parameter > body 내 region 필드 > 기본값 korea
  const queryParams = event.queryStringParameters || {};
  const region = queryParams.region || 'korea';

  console.log(`=== video_submissions Webhook 시작 (region: ${region}) ===`);

  // 리전별 Supabase 클라이언트 생성
  let regionalUrl, regionalKey;
  switch (region) {
    case 'japan':
      regionalUrl = process.env.VITE_SUPABASE_JAPAN_URL;
      regionalKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY;
      break;
    case 'us':
      regionalUrl = process.env.VITE_SUPABASE_US_URL;
      regionalKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY;
      break;
    case 'korea':
    default:
      regionalUrl = process.env.VITE_SUPABASE_KOREA_URL;
      regionalKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      break;
  }

  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!regionalUrl || !regionalKey) {
    console.error(`${region} Supabase 환경변수 누락:`, { url: !!regionalUrl, key: !!regionalKey });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `${region} Supabase 환경변수가 설정되지 않았습니다.` })
    };
  }

  const supabaseRegional = createClient(regionalUrl, regionalKey);
  const supabaseBiz = bizUrl && bizKey ? createClient(bizUrl, bizKey) : null;

  // Korea DB도 별도로 생성 (크리에이터/기업 정보 조회 fallback용)
  const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseKorea = (region !== 'korea' && koreaUrl && koreaKey) ? createClient(koreaUrl, koreaKey) : null;

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

    const isResubmission = body.type === 'UPDATE';

    // video_file_url이 있어야 함 (INSERT/UPDATE 모두)
    if (!record?.video_file_url) {
      console.log('영상 URL 없음, 스킵');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'No video URL' })
      };
    }

    console.log(isResubmission ? '영상 재제출(UPDATE) 감지:' : '새 영상 제출 감지:', {
      id: record.id,
      campaign_id: record.campaign_id,
      user_id: record.user_id,
      version: record.version,
      region
    });

    // 1. 캠페인 정보 조회 (리전 DB에서)
    let campaign = null;

    const campaignFields = 'id, title, brand, brand_name, company_name, company_id, company_email, target_country';

    const { data: regionalCampaign, error: campaignError } = await supabaseRegional
      .from('campaigns')
      .select(campaignFields)
      .eq('id', record.campaign_id)
      .maybeSingle();

    if (regionalCampaign) {
      campaign = regionalCampaign;
    }

    // 리전 DB에서 못 찾으면 BIZ DB에서 시도
    if (!campaign && supabaseBiz) {
      const { data: bizCampaign } = await supabaseBiz
        .from('campaigns')
        .select(campaignFields)
        .eq('id', record.campaign_id)
        .maybeSingle();
      if (bizCampaign) campaign = bizCampaign;
    }

    // Korea DB fallback (리전이 korea가 아닌 경우)
    if (!campaign && supabaseKorea) {
      const { data: koreaCampaign } = await supabaseKorea
        .from('campaigns')
        .select(campaignFields)
        .eq('id', record.campaign_id)
        .maybeSingle();
      if (koreaCampaign) campaign = koreaCampaign;
    }

    if (!campaign) {
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
      // 1순위: 리전 DB user_profiles
      const { data: profile } = await supabaseRegional
        .from('user_profiles')
        .select('name, full_name')
        .eq('id', record.user_id)
        .maybeSingle();

      if (profile?.name || profile?.full_name) {
        creatorName = profile.name || profile.full_name;
      }

      // 2순위: 리전 DB applications
      if (creatorName === '크리에이터') {
        const { data: appData } = await supabaseRegional
          .from('applications')
          .select('creator_name, applicant_name')
          .eq('campaign_id', record.campaign_id)
          .eq('user_id', record.user_id)
          .maybeSingle();

        if (appData) {
          creatorName = appData.creator_name || appData.applicant_name || '크리에이터';
        }
      }

      // 3순위: BIZ DB applications
      if (creatorName === '크리에이터' && supabaseBiz) {
        const { data: bizAppData } = await supabaseBiz
          .from('applications')
          .select('creator_name, applicant_name')
          .eq('campaign_id', record.campaign_id)
          .eq('user_id', record.user_id)
          .maybeSingle();

        if (bizAppData) {
          creatorName = bizAppData.creator_name || bizAppData.applicant_name || '크리에이터';
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

      // 5순위: Korea DB fallback (리전이 korea가 아닌 경우)
      if (creatorName === '크리에이터' && supabaseKorea) {
        const { data: koreaProfile } = await supabaseKorea
          .from('user_profiles')
          .select('name, full_name')
          .eq('id', record.user_id)
          .maybeSingle();

        if (koreaProfile) {
          creatorName = koreaProfile.name || koreaProfile.full_name || '크리에이터';
        }
      }
    }

    // 3. 기업 전화번호 조회 (기업 데이터는 BIZ DB에 있음)
    let companyPhone = null;
    let companyName = campaign.company_name || campaign.brand_name || campaign.brand || '(기업명 없음)';

    console.log('기업 정보 조회 시작:', {
      company_id: campaign.company_id,
      company_email: campaign.company_email
    });

    // 1순위: BIZ DB companies 테이블에서 company_email로 조회 (notification 필드 우선)
    if (campaign.company_email && supabaseBiz) {
      const { data: bizCompany } = await supabaseBiz
        .from('companies')
        .select('company_name, notification_phone, phone')
        .eq('email', campaign.company_email)
        .maybeSingle();

      if (bizCompany) {
        companyPhone = bizCompany.notification_phone || bizCompany.phone;
        companyName = bizCompany.company_name || companyName;
        console.log('BIZ DB (email)에서 정보 찾음:', { companyPhone, companyName });
      }
    }

    // 2순위: BIZ DB에서 company_id로 조회 (id → user_id 순서)
    if (!companyPhone && campaign.company_id && supabaseBiz) {
      // 2-1. companies.id로 조회 (이관된 캠페인)
      const { data: bizCompanyById } = await supabaseBiz
        .from('companies')
        .select('company_name, notification_phone, phone')
        .eq('id', campaign.company_id)
        .maybeSingle();

      if (bizCompanyById) {
        companyPhone = bizCompanyById.notification_phone || bizCompanyById.phone;
        companyName = bizCompanyById.company_name || companyName;
        console.log('BIZ DB (id)에서 정보 찾음:', { companyPhone, companyName });
      } else {
        // 2-2. companies.user_id로 조회 (원래 생성된 캠페인)
        const { data: bizCompanyByUserId } = await supabaseBiz
          .from('companies')
          .select('company_name, notification_phone, phone')
          .eq('user_id', campaign.company_id)
          .maybeSingle();

        if (bizCompanyByUserId) {
          companyPhone = bizCompanyByUserId.notification_phone || bizCompanyByUserId.phone;
          companyName = bizCompanyByUserId.company_name || companyName;
          console.log('BIZ DB (user_id)에서 정보 찾음:', { companyPhone, companyName });
        }
      }
    }

    // 3순위: Korea DB companies 테이블 fallback
    if (!companyPhone && campaign.company_email) {
      const fallbackClient = supabaseKorea || supabaseRegional;
      const { data: koreaCompany } = await fallbackClient
        .from('companies')
        .select('company_name, phone, contact_phone')
        .eq('email', campaign.company_email)
        .maybeSingle();

      if (koreaCompany) {
        companyPhone = koreaCompany.phone || koreaCompany.contact_phone;
        companyName = koreaCompany.company_name || companyName;
        console.log('Korea/Regional DB에서 정보 찾음:', { companyPhone, companyName });
      }
    }

    // 국가/사이트 라벨
    const countryMap = { kr: '한국 🇰🇷', jp: '일본 🇯🇵', us: '미국 🇺🇸', tw: '대만 🇹🇼' };
    const regionToCountry = { korea: 'kr', japan: 'jp', us: 'us' };
    const countryCode = campaign.target_country || regionToCountry[region] || null;
    const countryLabel = countryMap[countryCode] || region.toUpperCase();
    const siteLabel = { kr: 'cnec.co.kr', jp: 'cnec.jp', us: 'cnec.us' }[countryCode] || region;

    // 기업 전화번호가 없어도 네이버웍스는 발송
    if (!companyPhone) {
      console.log('기업 전화번호 없음 - 알림톡 스킵, 네이버웍스만 발송');
    }

    // 4. 알림톡 발송 (기업 전화번호가 있는 경우만)
    let kakaoResult = null;
    if (companyPhone) {
      console.log('알림톡 발송:', { companyPhone, companyName, campaign: campaign.title, creator: creatorName, region });

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

      kakaoResult = await kakaoResponse.json();
      console.log('알림톡 결과:', kakaoResult);
    }

    // 5. 네이버 웍스 알림 (모든 리전 공통, 영상 제출 알림 전용 채널)
    const VIDEO_ROOM_DEFAULT = '75c24874-e370-afd5-9da3-72918ba15a3c';
    const channelId = process.env.NAVER_WORKS_VIDEO_ROOM_ID || VIDEO_ROOM_DEFAULT;
    if (!channelId) {
      console.error('네이버 웍스 채널 ID 미설정');
    } else {
      try {
        const actionLabel = isResubmission ? '📹 영상 재제출' : '📹 영상 제출';
        const koreanDate = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        let worksMessage = `${actionLabel} 알림 (${siteLabel})\n\n`;
        worksMessage += `📋 캠페인: ${campaign.title || '(캠페인명 없음)'}\n`;
        worksMessage += `🏢 기업: ${companyName}\n`;
        worksMessage += `👤 크리에이터: ${creatorName}\n`;
        worksMessage += `📌 버전: V${record.version || 1}\n`;
        worksMessage += `🌍 국가: ${countryLabel}\n`;
        worksMessage += `⏰ 제출 시간: ${koreanDate}`;
        if (isResubmission) worksMessage += '\n\n※ 수정 후 재업로드';

        const worksResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId,
            message: worksMessage
          })
        });
        const worksResult = await worksResponse.json();
        console.log('네이버 웍스 결과:', worksResult);
      } catch (e) {
        console.error('네이버 웍스 오류:', e);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: `알림 발송 완료 (${region})`, kakaoResult })
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
