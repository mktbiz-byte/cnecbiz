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

    // 4. 기업 정보 조회
    const { data: company, error: companyError } = await supabase
      .from('user_profiles')
      .select('id, full_name, company_name, email, phone')
      .eq('id', campaign.company_id)
      .single();

    if (companyError || !company) {
      console.error('[ERROR] Company not found:', companyError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '기업 정보를 찾을 수 없습니다.'
        })
      };
    }

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

      // 카카오 알림톡 발송 (기업에게)
      if (company.phone) {
        try {
          const kakaoResponse = await fetch(`${process.env.URL}/.netlify/functions/send-kakao-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: company.phone,
              receiverName: company.company_name || company.full_name,
              templateCode: '025110000797', // 추천 크리에이터 지원 알림 템플릿
              variables: {
                '기업명': company.company_name || company.full_name,
                '캠페인명': campaign.title,
                '크리에이터명': creator.full_name,
                '팔로워수': totalFollowers.toLocaleString(),
                '캠페인ID': campaign.id
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
          const emailResponse = await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: company.email,
              subject: `[CNEC] 추천 크리에이터가 캠페인에 지원했습니다 - ${campaign.title}`,
              html: `
                <h2>추천 크리에이터 지원 알림</h2>
                <p>${company.company_name || company.full_name}님, 추천 크리에이터가 캠페인에 지원했습니다.</p>
                <ul>
                  <li><strong>캠페인:</strong> ${campaign.title}</li>
                  <li><strong>크리에이터:</strong> ${creator.full_name}</li>
                  <li><strong>총 팔로워:</strong> ${totalFollowers.toLocaleString()}명</li>
                  <li><strong>Instagram:</strong> ${(creator.instagram_followers || 0).toLocaleString()}명</li>
                  <li><strong>YouTube:</strong> ${(creator.youtube_subscribers || 0).toLocaleString()}명</li>
                  <li><strong>TikTok:</strong> ${(creator.tiktok_followers || 0).toLocaleString()}명</li>
                </ul>
                <p>
                  <a href="https://cnectotal.netlify.app/company/campaigns/${campaign.id}" 
                     style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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
