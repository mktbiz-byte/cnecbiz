const { createClient } = require('@supabase/supabase-js');

// BIZ Supabase 클라이언트
const supabaseBizUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseBizKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
try {
  if (supabaseBizUrl && supabaseBizKey) {
    supabase = createClient(supabaseBizUrl, supabaseBizKey);
  }
} catch (e) {
  console.error('[INIT ERROR] Failed to create BIZ supabase client:', e.message);
}

// Korea Supabase 클라이언트
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
const supabaseKoreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;
let supabaseKorea = null;
try {
  if (supabaseKoreaUrl && supabaseKoreaKey) {
    supabaseKorea = createClient(supabaseKoreaUrl, supabaseKoreaKey);
  }
} catch (e) {
  console.error('[INIT ERROR] Failed to create Korea supabase client:', e.message);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * 크리에이터에게 캠페인 초대 알림톡 발송
 * POST /send-campaign-invitation
 * Body: {
 *   campaignId: string,
 *   creatorId: string,
 *   invitedBy: string (기업 user_id)
 * }
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    const { campaignId, creatorId, invitedBy } = JSON.parse(event.body);

    console.log('[INFO] Campaign invitation request:', { campaignId, creatorId, invitedBy });

    if (!campaignId || !creatorId || !invitedBy) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: '필수 파라미터가 누락되었습니다.' })
      };
    }

    if (!supabase) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: '데이터베이스 연결 오류가 발생했습니다.' })
      };
    }

    // 1. 캠페인 정보 조회 (Korea DB 우선, BIZ DB 폴백)
    let campaign = null;

    if (supabaseKorea) {
      const { data: koreaCampaign, error: koreaError } = await supabaseKorea
        .from('campaigns')
        .select('id, title, reward_points, application_deadline, recruitment_deadline, company_id, company_email, campaign_type')
        .eq('id', campaignId)
        .single();

      if (koreaCampaign && !koreaError) {
        campaign = {
          ...koreaCampaign,
          deadline: koreaCampaign.application_deadline || koreaCampaign.recruitment_deadline
        };
      }
    }

    if (!campaign) {
      const { data: bizCampaign, error: bizError } = await supabase
        .from('campaigns')
        .select('id, title, reward_points, application_deadline, company_id, company_email, campaign_type')
        .eq('id', campaignId)
        .single();

      if (bizCampaign && !bizError) {
        campaign = {
          ...bizCampaign,
          deadline: bizCampaign.application_deadline
        };
      }
    }

    if (!campaign) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' })
      };
    }

    // 2. 크리에이터 정보 조회
    let creator = null;

    const { data: featuredCreator } = await supabase
      .from('featured_creators')
      .select('id, name, email, phone, user_id')
      .eq('id', creatorId)
      .single();

    if (featuredCreator) {
      creator = featuredCreator;
    } else {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, phone')
        .eq('id', creatorId)
        .single();

      if (userProfile) {
        creator = {
          id: userProfile.id,
          name: userProfile.full_name,
          email: userProfile.email,
          phone: userProfile.phone,
          user_id: userProfile.id
        };
      }
    }

    if (!creator) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: '크리에이터를 찾을 수 없습니다.' })
      };
    }

    // 3. 기업 정보 조회
    let company = null;

    const { data: companyRecord } = await supabase
      .from('companies')
      .select('company_name')
      .eq('user_id', invitedBy)
      .maybeSingle();

    if (companyRecord) {
      company = { company_name: companyRecord.company_name };
    } else {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, company_name')
        .eq('id', invitedBy)
        .maybeSingle();

      if (profileData) {
        company = { company_name: profileData.company_name || profileData.full_name };
      }
    }

    if (!company) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: '기업 정보를 찾을 수 없습니다.' })
      };
    }

    // 4. 중복 초대 확인
    const { data: existingInvitation } = await supabase
      .from('campaign_invitations')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('invited_creator_id', creatorId)
      .single();

    if (existingInvitation) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, message: '이미 초대를 보냈습니다.', invitationId: existingInvitation.id })
      };
    }

    // 5. 초대 기록 저장
    const { data: invitation, error: invitationError } = await supabase
      .from('campaign_invitations')
      .insert({
        campaign_id: campaignId,
        invited_creator_id: creatorId,
        invited_by: invitedBy,
        status: 'pending'
      })
      .select()
      .single();

    if (invitationError) {
      console.error('[ERROR] Failed to create invitation:', invitationError);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: '초대 생성에 실패했습니다.' })
      };
    }

    console.log('[SUCCESS] Invitation created:', invitation.id);

    const baseUrl = process.env.URL || 'https://cnecbiz.com';
    const invitationUrl = `${baseUrl}/invitation/${invitation.id}`;
    const formattedReward = campaign.reward_points ? campaign.reward_points.toLocaleString() + '원' : '협의';

    // 6. 카카오 알림톡 발송
    if (creator.phone) {
      try {
        const kakaoResponse = await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverNum: creator.phone,
            receiverName: creator.name,
            templateCode: '025110000798',
            variables: {
              '크리에이터명': creator.name,
              '기업명': company.company_name,
              '캠페인명': campaign.title,
              '보상금액': formattedReward,
              '마감일': campaign.deadline || '상시',
              '캠페인ID': campaign.id
            }
          })
        });
        const kakaoResult = await kakaoResponse.json();
        console.log('[INFO] Kakao notification sent:', kakaoResult.success);
      } catch (kakaoError) {
        console.error('[ERROR] Kakao notification failed:', kakaoError.message);
      }
    }

    // 7. 이메일 발송
    if (creator.email) {
      try {
        await fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: creator.email,
            subject: `[CNEC] ${company.company_name}에서 캠페인 지원 요청을 보냈습니다`,
            html: `
              <h2>캠페인 지원 요청</h2>
              <p>${creator.name}님, ${company.company_name}에서 캠페인 지원 요청을 보냈습니다.</p>
              <ul>
                <li><strong>캠페인:</strong> ${campaign.title}</li>
                <li><strong>보상:</strong> ${formattedReward}</li>
                <li><strong>마감일:</strong> ${campaign.deadline || '상시'}</li>
              </ul>
              <p>
                <a href="${invitationUrl}"
                   style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  지금 바로 지원하기
                </a>
              </p>
              <p>문의: 1833-6025</p>
            `
          })
        });
        console.log('[INFO] Email sent');
      } catch (emailError) {
        console.error('[ERROR] Email failed:', emailError.message);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        invitationId: invitation.id,
        message: '초대를 성공적으로 보냈습니다.'
      })
    };

  } catch (error) {
    console.error('[send-campaign-invitation] Error:', error);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'send-campaign-invitation',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
