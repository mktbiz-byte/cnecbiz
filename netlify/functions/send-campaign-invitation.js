const { getBizClient, getKoreaClient } = require('./lib/supabase');
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

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
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const { campaignId, creatorId, invitedBy } = JSON.parse(event.body);

    console.log('[INFO] Campaign invitation request:', { campaignId, creatorId, invitedBy });

    if (!campaignId || !creatorId || !invitedBy) {
      return errorResponse(400, '필수 파라미터가 누락되었습니다.');
    }

    const supabase = getBizClient();
    let supabaseKorea = null;
    try { supabaseKorea = getKoreaClient(); } catch (e) { /* Korea client optional */ }

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
      console.error('[ERROR] Campaign not found:', campaignId);
      return errorResponse(404, '캠페인을 찾을 수 없습니다.');
    }

    // 2. 크리에이터 정보 조회 (featured_creators 또는 user_profiles)
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
      console.error('[ERROR] Creator not found:', creatorId);
      return errorResponse(404, '크리에이터를 찾을 수 없습니다.');
    }

    // 3. 기업 정보 조회 (companies 테이블 우선, notification 필드 우선)
    let company = null;

    const { data: companyRecord, error: companyError } = await supabase
      .from('companies')
      .select('company_name, notification_phone, notification_email, phone, email')
      .eq('user_id', invitedBy)
      .maybeSingle();

    if (!companyError && companyRecord) {
      company = {
        company_name: companyRecord.company_name,
        full_name: companyRecord.company_name
      };
    } else {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, company_name')
        .eq('id', invitedBy)
        .maybeSingle();

      if (!profileError && profileData) {
        company = profileData;
      }
    }

    if (!company) {
      console.error('[ERROR] Company not found for invitedBy:', invitedBy);
      return errorResponse(404, '기업 정보를 찾을 수 없습니다.');
    }

    // 4. 중복 초대 확인
    const { data: existingInvitation } = await supabase
      .from('campaign_invitations')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('invited_creator_id', creatorId)
      .single();

    if (existingInvitation) {
      console.log('[INFO] Invitation already exists');
      return successResponse({
        success: true,
        message: '이미 초대를 보냈습니다.',
        invitationId: existingInvitation.id
      });
    }

    // 5. campaign_invitations 테이블에 초대 기록 저장
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
      return errorResponse(500, '초대 생성에 실패했습니다.');
    }

    console.log('[SUCCESS] Invitation created:', invitation.id);

    const baseUrl = process.env.URL || 'https://cnecbiz.com';
    const invitationUrl = `${baseUrl}/invitation/${invitation.id}`;
    const formattedReward = campaign.reward_points ? campaign.reward_points.toLocaleString() + '원' : '협의';

    // 6. 카카오 알림톡 발송 (크리에이터에게)
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
              '기업명': company.company_name || company.full_name,
              '캠페인명': campaign.title,
              '보상금액': formattedReward,
              '마감일': campaign.deadline || '상시',
              '캠페인ID': campaign.id
            }
          })
        });

        const kakaoResult = await kakaoResponse.json();
        console.log('[INFO] Kakao notification sent:', kakaoResult);
      } catch (kakaoError) {
        console.error('[ERROR] Failed to send Kakao notification:', kakaoError);
      }
    }

    // 7. 이메일 발송
    if (creator.email) {
      try {
        const emailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: creator.email,
            subject: `[CNEC] ${company.company_name || company.full_name}에서 캠페인 지원 요청을 보냈습니다`,
            html: `
              <h2>캠페인 지원 요청</h2>
              <p>${creator.name}님, ${company.company_name || company.full_name}에서 캠페인 지원 요청을 보냈습니다.</p>
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

        const emailResult = await emailResponse.json();
        console.log('[INFO] Email sent:', emailResult);
      } catch (emailError) {
        console.error('[ERROR] Failed to send email:', emailError);
      }
    }

    return successResponse({
      success: true,
      invitationId: invitation.id,
      message: '초대를 성공적으로 보냈습니다.'
    });

  } catch (error) {
    console.error('[send-campaign-invitation] Error:', error);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'send-campaign-invitation',
          errorMessage: error.message,
          context: { body: event.body?.substring(0, 500) }
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, error.message);
  }
};
