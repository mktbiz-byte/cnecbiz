const { createClient } = require('@supabase/supabase-js');

// BIZ DB (중앙 - companies, campaign_invitations, featured_creators)
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Korea DB (applications, campaigns, user_profiles)
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
const supabaseKoreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;
const supabaseKorea = supabaseKoreaUrl && supabaseKoreaServiceKey
  ? createClient(supabaseKoreaUrl, supabaseKoreaServiceKey)
  : null;

// Japan DB
const supabaseJapanUrl = process.env.VITE_SUPABASE_JAPAN_URL;
const supabaseJapanServiceKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY;
const supabaseJapan = supabaseJapanUrl && supabaseJapanServiceKey
  ? createClient(supabaseJapanUrl, supabaseJapanServiceKey)
  : null;

// US DB
const supabaseUSUrl = process.env.VITE_SUPABASE_US_URL;
const supabaseUSServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY;
const supabaseUS = supabaseUSUrl && supabaseUSServiceKey
  ? createClient(supabaseUSUrl, supabaseUSServiceKey)
  : null;

/**
 * 크리에이터가 캠페인에 지원했을 때 기업에게 알림 발송
 * POST /notify-creator-application
 * Body: {
 *   applicationId: string
 * }
 * 
 * 또는 Supabase Webhook에서 호출:
 * Body: {
 *   type: 'INSERT',
 *   table: 'applications',
 *   record: { id, campaign_id, user_id, ... }
 * }
 */
exports.handler = async (event) => {
  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    const body = JSON.parse(event.body);
    let applicationId;

    // Supabase Webhook 형식 처리
    if (body.type === 'INSERT' && body.table === 'applications' && body.record) {
      applicationId = body.record.id;
      console.log('[INFO] Webhook triggered for application:', applicationId);
    } else if (body.applicationId) {
      applicationId = body.applicationId;
      console.log('[INFO] Direct call for application:', applicationId);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'applicationId가 필요합니다.'
        })
      };
    }

    // 1. 지원 정보 조회 (리전별 DB에서 검색)
    const regionalClients = [
      { name: 'korea', client: supabaseKorea },
      { name: 'japan', client: supabaseJapan },
      { name: 'us', client: supabaseUS },
      { name: 'biz', client: supabase }
    ].filter(r => r.client);

    let application = null;
    let regionalClient = null;
    let regionName = null;

    for (const region of regionalClients) {
      const { data, error } = await region.client
        .from('applications')
        .select('id, campaign_id, user_id, status, created_at')
        .eq('id', applicationId)
        .single();

      if (data && !error) {
        application = data;
        regionalClient = region.client;
        regionName = region.name;
        console.log(`[INFO] Application found in ${region.name} DB`);
        break;
      }
    }

    if (!application) {
      console.error('[ERROR] Application not found in any region');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '지원 정보를 찾을 수 없습니다.'
        })
      };
    }

    // 2. 캠페인 정보 조회 (같은 리전 DB에서)
    const { data: campaign, error: campaignError } = await regionalClient
      .from('campaigns')
      .select('id, title, company_id, company_email')
      .eq('id', application.campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('[ERROR] Campaign not found:', campaignError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인을 찾을 수 없습니다.'
        })
      };
    }

    // 3. 크리에이터 정보 조회 (같은 리전 DB 우선, BIZ DB 폴백)
    let creator = null;

    const { data: regionalCreator } = await regionalClient
      .from('user_profiles')
      .select('id, full_name, email, phone, instagram_followers, youtube_subscribers, tiktok_followers')
      .eq('id', application.user_id)
      .single();

    if (regionalCreator) {
      creator = regionalCreator;
    } else if (regionName !== 'biz') {
      // 리전 DB에 없으면 BIZ DB에서 조회
      const { data: bizCreator } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, phone, instagram_followers, youtube_subscribers, tiktok_followers')
        .eq('id', application.user_id)
        .single();
      creator = bizCreator;
    }

    if (!creator) {
      console.error('[ERROR] Creator not found in any DB');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '크리에이터 정보를 찾을 수 없습니다.'
        })
      };
    }

    // 4. 기업 정보 조회 (companies 테이블 우선 → user_profiles 폴백)
    // 이관된 캠페인의 경우 company_id가 companies.id 또는 companies.user_id일 수 있음
    let companyRecord = null;
    // companies 테이블에서만 조회 (user_profiles 사용 금지)

    if (campaign.company_id) {
      // 4-1. companies.id로 조회 (이관 후 company_id가 companies.id인 경우)
      const { data: byId } = await supabase
        .from('companies')
        .select('id, company_name, email, phone, notification_phone, notification_email, notification_contact_person, user_id')
        .eq('id', campaign.company_id)
        .maybeSingle();

      if (byId) {
        companyRecord = byId;
        console.log('[INFO] Company found by companies.id in BIZ DB');
      }

      // 4-2. companies.user_id로 조회 (원래 생성된 캠페인의 경우)
      if (!companyRecord) {
        const { data: byUserId } = await supabase
          .from('companies')
          .select('id, company_name, email, phone, notification_phone, notification_email, notification_contact_person, user_id')
          .eq('user_id', campaign.company_id)
          .maybeSingle();

        if (byUserId) {
          companyRecord = byUserId;
          console.log('[INFO] Company found by companies.user_id in BIZ DB');
        }
      }

    }

    // 4-3. company_email로 조회 (company_id로 찾지 못한 경우)
    if (!companyRecord && campaign.company_email) {
      const { data: byEmail } = await supabase
        .from('companies')
        .select('id, company_name, email, phone, notification_phone, notification_email, notification_contact_person, user_id')
        .eq('email', campaign.company_email)
        .maybeSingle();

      if (byEmail) {
        companyRecord = byEmail;
        console.log('[INFO] Company found by company_email in BIZ DB');
      }
    }

    const company = {
      id: companyRecord?.user_id,
      company_name: companyRecord?.company_name,
      phone: companyRecord?.notification_phone || companyRecord?.phone,
      email: companyRecord?.notification_email || companyRecord?.email
    };

    if (!companyRecord) {
      console.error('[ERROR] Company not found for company_id:', campaign.company_id, 'company_email:', campaign.company_email);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '기업 정보를 찾을 수 없습니다.'
        })
      };
    }

    console.log(`[INFO] Company: name=${company.company_name}, phone=${company.phone}, email=${company.email}`);

    // 5. 초대된 크리에이터인지 확인 (featured_creators 또는 campaign_invitations)
    const { data: invitation } = await supabase
      .from('campaign_invitations')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('invited_creator_id', creator.id)
      .single();

    const isFeaturedCreator = !!invitation;

    // 6. 팔로워 수 계산
    const totalFollowers = (creator.instagram_followers || 0) +
                          (creator.youtube_subscribers || 0) +
                          (creator.tiktok_followers || 0);

    // 주요 채널 판별
    let mainChannel = '인스타그램';
    if (creator.youtube_subscribers > (creator.instagram_followers || 0)) mainChannel = '유튜브';
    else if (creator.tiktok_followers > (creator.instagram_followers || 0)) mainChannel = '틱톡';

    // 7. 추천 크리에이터만 알림 발송 (일반 지원자는 알림 안 보냄)
    if (isFeaturedCreator) {
      console.log('[INFO] Featured creator application - sending notification');

      // 초대 상태 업데이트
      if (invitation) {
        await supabase
          .from('campaign_invitations')
          .update({ status: 'applied', applied_at: new Date().toISOString() })
          .eq('id', invitation.id);
      }

      const baseUrl = process.env.URL || 'https://cnecbiz.com';

      // 카카오 알림톡 발송 (기업에게)
      if (company.phone) {
        try {
          const kakaoResponse = await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: company.phone,
              receiverName: company.company_name || company.full_name,
              templateCode: '025110000797',
              variables: {
                '기업명': company.company_name || company.full_name,
                '크리에이터명': creator.full_name,
                '주요채널': mainChannel,
                '팔로워수': totalFollowers.toLocaleString(),
                '캠페인명': campaign.title,
                '캠페인관리링크': `${baseUrl}/company/campaigns/${campaign.id}`
              }
            })
          });

          const kakaoResult = await kakaoResponse.json();
          console.log('[SUCCESS] Kakao notification sent to company:', kakaoResult);
        } catch (kakaoError) {
          console.error('[ERROR] Failed to send Kakao notification:', kakaoError);
        }
      }

      // 이메일 발송 (기업에게)
      if (company.email) {
        try {
          const emailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: company.email,
              subject: `[CNEC] 초대한 크리에이터(${creator.full_name})가 캠페인에 지원했습니다`,
              html: `
                <h2>초대한 크리에이터 지원 알림</h2>
                <p>${company.company_name || company.full_name}님, 초대한 크리에이터가 캠페인에 지원했습니다.</p>
                <ul>
                  <li><strong>캠페인:</strong> ${campaign.title}</li>
                  <li><strong>크리에이터:</strong> ${creator.full_name}</li>
                  <li><strong>주요 채널:</strong> ${mainChannel}</li>
                  <li><strong>총 팔로워:</strong> ${totalFollowers.toLocaleString()}명</li>
                </ul>
                <p>
                  <a href="${baseUrl}/company/campaigns/${campaign.id}"
                     style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    지원자 프로필 확인하기
                  </a>
                </p>
                <p>문의: 1833-6025</p>
              `
            })
          });

          const emailResult = await emailResponse.json();
          console.log('[SUCCESS] Email sent to company:', emailResult);
        } catch (emailError) {
          console.error('[ERROR] Failed to send email:', emailError);
        }
      }
    } else {
      console.log('[INFO] Regular creator application - no notification sent');
    }

    // 네이버 웍스 알림 발송 (추천/일반 모두)
    try {
      const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      const baseUrl = process.env.URL || 'https://cnecbiz.com'
      const featured = isFeaturedCreator ? ' (추천 크리에이터)' : ''
      const nwMessage = `👤 크리에이터 캠페인 지원${featured}\n\n• 크리에이터: ${creator.full_name || '크리에이터'}\n• 캠페인: ${campaign.title}\n• 기업: ${company.company_name || '기업'}\n• 주요 채널: ${mainChannel} (${totalFollowers.toLocaleString()}명)\n• 시간: ${koreanTime}`

      const nwRes = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: nwMessage
        })
      })
      const nwResult = await nwRes.json()
      if (nwResult.success) {
        console.log('[notify-creator-application] 네이버 웍스 알림 발송 완료')
      } else {
        console.error('[notify-creator-application] 네이버 웍스 알림 실패:', nwResult.error || nwResult.details)
        // 실패 시 notification_send_logs에 기록
        await supabase.from('notification_send_logs').insert({
          channel: 'naver_works',
          status: 'failed',
          function_name: 'notify-creator-application',
          recipient: '75c24874-e370-afd5-9da3-72918ba15a3c',
          message_preview: nwMessage.substring(0, 200),
          error_message: nwResult.error || nwResult.details || 'Unknown error',
          metadata: { applicationId, campaignTitle: campaign.title }
        }).catch(() => {})
      }
    } catch (worksError) {
      console.error('[notify-creator-application] 네이버 웍스 알림 오류:', worksError.message)
      // 네트워크 오류 시에도 로그 기록
      await supabase.from('notification_send_logs').insert({
        channel: 'naver_works',
        status: 'failed',
        function_name: 'notify-creator-application',
        recipient: '75c24874-e370-afd5-9da3-72918ba15a3c',
        error_message: worksError.message,
        metadata: { applicationId }
      }).catch(() => {})
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        isFeaturedCreator,
        message: isFeaturedCreator ? '추천 크리에이터 지원 알림을 발송했습니다.' : '일반 지원자는 알림을 발송하지 않습니다.'
      })
    };

  } catch (error) {
    console.error('[ERROR] Notify creator application error:', error);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'notify-creator-application',
          errorMessage: error.message,
          context: { applicationId: JSON.parse(event.body || '{}').applicationId || '알 수 없음' }
        })
      })
    } catch (e) { console.error('[notify-creator-application] Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
