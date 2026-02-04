const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // 1. 지원 정보 조회
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        campaign_id,
        user_id,
        status,
        created_at
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('[ERROR] Application not found:', appError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '지원 정보를 찾을 수 없습니다.'
        })
      };
    }

    // 2. 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, company_id')
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

    // 3. 크리에이터 정보 조회
    const { data: creator, error: creatorError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, instagram_followers, youtube_subscribers, tiktok_followers')
      .eq('id', application.user_id)
      .single();

    if (creatorError || !creator) {
      console.error('[ERROR] Creator not found:', creatorError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '크리에이터 정보를 찾을 수 없습니다.'
        })
      };
    }

    // 4. 기업 정보 조회 (user_profiles + companies 테이블)
    const { data: companyProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, company_name, email, phone')
      .eq('id', campaign.company_id)
      .single();

    // companies 테이블에서 phone 조회 (user_id로 매핑)
    const { data: companyRecord } = await supabase
      .from('companies')
      .select('id, company_name, email, phone, notification_phone, user_id')
      .eq('user_id', campaign.company_id)
      .single();

    const company = {
      id: companyProfile?.id || companyRecord?.user_id,
      full_name: companyProfile?.full_name,
      company_name: companyRecord?.company_name || companyProfile?.company_name,
      phone: companyRecord?.phone || companyRecord?.notification_phone || companyProfile?.phone,
      email: companyRecord?.email || companyProfile?.email
    };

    if (!companyProfile && !companyRecord) {
      console.error('[ERROR] Company not found for company_id:', campaign.company_id);
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
