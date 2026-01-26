const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
const supabaseKoreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;
const supabaseKorea = supabaseKoreaUrl && supabaseKoreaServiceKey
  ? createClient(supabaseKoreaUrl, supabaseKoreaServiceKey)
  : null;

/**
 * 크리에이터에게 캠페인 초대장 발송
 * - 카카오톡 알림톡 (템플릿: 025110001005)
 * - 이메일 발송
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const {
      campaignId,
      creatorId,
      invitedBy,
      companyEmail,
      sendKakao = true,
      sendEmail = true
    } = JSON.parse(event.body);

    console.log('[INFO] Creator invitation request:', { campaignId, creatorId, invitedBy });

    if (!campaignId || !creatorId || !invitedBy) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '필수 파라미터가 누락되었습니다.' })
      };
    }

    // 1. 캠페인 정보 조회
    const client = supabaseKorea || supabase;
    const { data: campaign, error: campaignError } = await client
      .from('campaigns')
      .select('id, title, reward_amount, package_type, deadline, company_email, brand_name')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' }) };
    }

    // 2. 캠페인 소유권 확인
    if (campaign.company_email !== companyEmail) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: '이 캠페인에 대한 권한이 없습니다.' }) };
    }

    // 3. 크리에이터 정보 조회
    const { data: creator, error: creatorError } = await supabase
      .from('featured_creators')
      .select('id, name, creator_name, email, phone, instagram_handle, youtube_handle, followers')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '크리에이터를 찾을 수 없습니다.' }) };
    }

    const creatorName = creator.name || creator.creator_name || '크리에이터';

    // 4. 기업 정보 조회
    const { data: company } = await supabase
      .from('user_profiles')
      .select('full_name, company_name')
      .eq('id', invitedBy)
      .single();

    const companyName = company?.company_name || company?.full_name || campaign.brand_name || '기업';

    // 5. 중복 초대 확인
    const { data: existingInvitation } = await supabase
      .from('campaign_invitations')
      .select('id, status')
      .eq('campaign_id', campaignId)
      .eq('invited_creator_id', creatorId)
      .single();

    if (existingInvitation) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '이미 초대장을 보냈습니다.', invitationId: existingInvitation.id })
      };
    }

    // 6. 만료일 계산
    const expirationDate = campaign.deadline
      ? new Date(campaign.deadline)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const formattedDeadline = campaign.deadline
      ? new Date(campaign.deadline).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
      : '상시 모집';

    const formattedExpiration = expirationDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

    // 7. 초대장 저장
    const { data: invitation, error: invitationError } = await supabase
      .from('campaign_invitations')
      .insert({
        campaign_id: campaignId,
        invited_creator_id: creatorId,
        invited_by: invitedBy,
        status: 'pending',
        expires_at: expirationDate.toISOString()
      })
      .select()
      .single();

    if (invitationError) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: '초대장 생성에 실패했습니다.' }) };
    }

    console.log('[SUCCESS] Invitation created:', invitation.id);

    const results = { invitation: true, kakao: false, email: false };
    const baseUrl = process.env.URL || 'https://cnecbiz.com';
    const invitationUrl = `${baseUrl}/invitation/${invitation.id}`;

    // 8. 카카오톡 발송
    if (sendKakao && creator.phone) {
      try {
        const kakaoResponse = await fetch(`${process.env.URL}/.netlify/functions/send-kakao-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverNum: creator.phone,
            receiverName: creatorName,
            templateCode: '025110001005',
            variables: {
              '크리에이터명': creatorName,
              '기업명': companyName,
              '캠페인명': campaign.title,
              '패키지타입': campaign.package_type || '기본',
              '보상금액': campaign.reward_amount ? campaign.reward_amount.toLocaleString() : '협의',
              '마감일': formattedDeadline,
              '캠페인링크': invitationUrl,
              '만료일': formattedExpiration
            }
          })
        });
        const kakaoResult = await kakaoResponse.json();
        results.kakao = kakaoResult.success;
      } catch (kakaoError) {
        console.error('[ERROR] Kakao notification failed:', kakaoError);
      }
    }

    // 9. 이메일 발송
    if (sendEmail && creator.email) {
      try {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:500px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 24px;text-align:center;">
<h1 style="color:#fff;font-size:24px;margin:0;">캠페인 초대장</h1>
<p style="color:rgba(255,255,255,0.9);font-size:14px;margin:8px 0 0;">${companyName}에서 초대장을 보냈습니다</p>
</td></tr>
<tr><td style="padding:32px 24px;">
<p style="font-size:16px;color:#1f2937;margin:0 0 24px;">안녕하세요, <strong>${creatorName}</strong>님!</p>
<p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 24px;">${companyName}에서 귀하의 프로필을 확인하고 캠페인 참여를 요청드립니다. 지원 시 바로 확정되는 캠페인입니다.</p>
<table width="100%" style="background:#f9fafb;border-radius:12px;margin-bottom:24px;">
<tr><td style="padding:20px;">
<p style="font-size:12px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;">캠페인 정보</p>
<p style="font-size:18px;font-weight:600;color:#1f2937;margin:0 0 16px;">${campaign.title}</p>
<table width="100%">
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">보상금</td><td style="padding:4px 0;font-size:14px;color:#7c3aed;font-weight:600;text-align:right;">${campaign.reward_amount ? campaign.reward_amount.toLocaleString() + '원' : '협의'}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">모집 마감</td><td style="padding:4px 0;font-size:14px;color:#1f2937;text-align:right;">${formattedDeadline}</td></tr>
</table>
</td></tr></table>
<table width="100%"><tr><td align="center">
<a href="${invitationUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:12px;">지금 바로 지원하기</a>
</td></tr></table>
<p style="font-size:12px;color:#9ca3af;text-align:center;margin:24px 0 0;">이 초대는 ${formattedExpiration}까지 유효합니다.</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 24px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#6b7280;margin:0;">문의: 1833-6025 | support@cnecbiz.com</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

        await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: creator.email,
            subject: `[CNEC] ${companyName}에서 캠페인 초대장이 도착했습니다`,
            html: emailHtml
          })
        });
        results.email = true;
      } catch (emailError) {
        console.error('[ERROR] Email failed:', emailError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, invitationId: invitation.id, message: '초대장을 성공적으로 발송했습니다.', results })
    };

  } catch (error) {
    console.error('[ERROR] Creator invitation error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
