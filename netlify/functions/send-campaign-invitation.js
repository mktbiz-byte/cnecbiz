const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { campaignId, creatorId, invitedBy } = JSON.parse(event.body);

    console.log('[INFO] Campaign invitation request:', {
      campaignId,
      creatorId,
      invitedBy
    });

    if (!campaignId || !creatorId || !invitedBy) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 파라미터가 누락되었습니다.'
        })
      };
    }

    // 1. 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, compensation, deadline, company_id')
      .eq('id', campaignId)
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

    // 2. 크리에이터 정보 조회 (featured_creators 또는 user_profiles)
    let creator = null;
    
    // featured_creators에서 먼저 조회
    const { data: featuredCreator } = await supabase
      .from('featured_creators')
      .select('id, name, email, phone, user_id')
      .eq('id', creatorId)
      .single();

    if (featuredCreator) {
      creator = featuredCreator;
    } else {
      // user_profiles에서 조회
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
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '크리에이터를 찾을 수 없습니다.'
        })
      };
    }

    // 3. 기업 정보 조회
    const { data: company, error: companyError } = await supabase
      .from('user_profiles')
      .select('full_name, company_name')
      .eq('id', invitedBy)
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

    // 4. 중복 초대 확인
    const { data: existingInvitation } = await supabase
      .from('campaign_invitations')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('invited_creator_id', creatorId)
      .single();

    if (existingInvitation) {
      console.log('[INFO] Invitation already exists');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '이미 초대를 보냈습니다.',
          invitationId: existingInvitation.id
        })
      };
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '초대 생성에 실패했습니다.'
        })
      };
    }

    console.log('[SUCCESS] Invitation created:', invitation.id);

    // 6. 카카오 알림톡 발송 (크리에이터에게)
    if (creator.phone) {
      try {
        const kakaoResponse = await fetch(`${process.env.URL}/.netlify/functions/send-kakao-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverNum: creator.phone,
            receiverName: creator.name,
            templateCode: '025110000798', // 크리에이터 초대장 템플릿
            variables: {
              '크리에이터명': creator.name,
              '기업명': company.company_name || company.full_name,
              '캠페인명': campaign.title,
              '보상금액': campaign.compensation?.toLocaleString() || '협의',
              '마감일': campaign.deadline || '상시',
              '캠페인ID': campaign.id
            }
          })
        });

        const kakaoResult = await kakaoResponse.json();
        console.log('[INFO] Kakao notification sent:', kakaoResult);
      } catch (kakaoError) {
        console.error('[ERROR] Failed to send Kakao notification:', kakaoError);
        // 알림톡 실패해도 초대는 성공으로 처리
      }
    }

    // 7. 이메일 발송 (선택사항)
    if (creator.email) {
      try {
        const emailResponse = await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
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
                <li><strong>보상:</strong> ${campaign.compensation?.toLocaleString() || '협의'}원</li>
                <li><strong>마감일:</strong> ${campaign.deadline || '상시'}</li>
              </ul>
              <p>
                <a href="https://cnectotal.netlify.app/creator/campaigns/${campaign.id}" 
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invitationId: invitation.id,
        message: '초대를 성공적으로 보냈습니다.'
      })
    };

  } catch (error) {
    console.error('[ERROR] Campaign invitation error:', error);
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
