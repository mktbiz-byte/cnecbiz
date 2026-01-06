const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL_BIZ;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_BIZ;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
const supabaseKoreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;
const supabaseKorea = supabaseKoreaUrl && supabaseKoreaServiceKey
  ? createClient(supabaseKoreaUrl, supabaseKoreaServiceKey)
  : null;

// US Supabase
const supabaseUSUrl = process.env.VITE_SUPABASE_US_URL;
const supabaseUSServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY;
const supabaseUS = supabaseUSUrl && supabaseUSServiceKey
  ? createClient(supabaseUSUrl, supabaseUSServiceKey)
  : null;

// Japan Supabase
const supabaseJapanUrl = process.env.VITE_SUPABASE_JAPAN_URL;
const supabaseJapanServiceKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY;
const supabaseJapan = supabaseJapanUrl && supabaseJapanServiceKey
  ? createClient(supabaseJapanUrl, supabaseJapanServiceKey)
  : null;

/**
 * 초대장을 통한 캠페인 신청 처리
 * - 초대장 상태 업데이트 (pending → accepted)
 * - applications 테이블에 지원 기록 추가
 * - 기업에게 알림톡 발송 (025110000797)
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
    const { invitationId, campaignId, creatorId } = JSON.parse(event.body);

    console.log('[INFO] Apply from invitation:', { invitationId, campaignId, creatorId });

    if (!invitationId || !campaignId || !creatorId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '필수 파라미터가 누락되었습니다.' }) };
    }

    // 1. 초대장 확인
    const { data: invitation, error: invitationError } = await supabase
      .from('campaign_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '초대장을 찾을 수 없습니다.' }) };
    }

    if (invitation.status === 'accepted') {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '이미 신청이 완료되었습니다.' }) };
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '초대장이 만료되었습니다.' }) };
    }

    // 2. 크리에이터 정보
    const { data: creator } = await supabase
      .from('featured_creators')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (!creator) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '크리에이터 정보를 찾을 수 없습니다.' }) };
    }

    const creatorName = creator.name || creator.creator_name || '크리에이터';

    // 3. 캠페인 정보 - 지역에 따라 적절한 클라이언트 선택
    // 먼저 US/Japan Supabase에서 캠페인 찾기 시도
    let campaign = null;
    let campaignClient = null;
    let campaignRegion = 'korea';

    // US Supabase에서 캠페인 확인
    if (supabaseUS) {
      const { data: usCampaign } = await supabaseUS.from('campaigns').select('*').eq('id', campaignId).single();
      if (usCampaign) {
        campaign = usCampaign;
        campaignClient = supabaseUS;
        campaignRegion = 'us';
      }
    }

    // Japan Supabase에서 캠페인 확인
    if (!campaign && supabaseJapan) {
      const { data: japanCampaign } = await supabaseJapan.from('campaigns').select('*').eq('id', campaignId).single();
      if (japanCampaign) {
        campaign = japanCampaign;
        campaignClient = supabaseJapan;
        campaignRegion = 'japan';
      }
    }

    // Korea Supabase에서 캠페인 확인
    if (!campaign) {
      const client = supabaseKorea || supabase;
      const { data: koreaCampaign } = await client.from('campaigns').select('*').eq('id', campaignId).single();
      if (koreaCampaign) {
        campaign = koreaCampaign;
        campaignClient = client;
        campaignRegion = 'korea';
      }
    }

    // 3-1. 크리에이터 이메일이 없으면 해당 지역 auth.users에서 가져오기
    let creatorEmail = creator.email;
    if (!creatorEmail && creator.user_id) {
      // 캠페인 지역의 Supabase에서 이메일 가져오기
      const regionalClient = campaignRegion === 'us' ? supabaseUS :
                             campaignRegion === 'japan' ? supabaseJapan : supabase;

      if (regionalClient) {
        try {
          const { data: authUser } = await regionalClient.auth.admin.getUserById(creator.user_id);
          if (authUser?.user?.email) {
            creatorEmail = authUser.user.email;
            console.log(`[INFO] Found email from ${campaignRegion} auth.users: ${creatorEmail}`);
            // featured_creators에도 이메일 업데이트
            await supabase
              .from('featured_creators')
              .update({ email: creatorEmail })
              .eq('id', creatorId);
          }
        } catch (e) {
          console.log(`[INFO] Could not fetch from ${campaignRegion} auth.users:`, e.message);
        }
      }

      // 여전히 이메일이 없으면 cnecbiz auth.users에서 시도
      if (!creatorEmail) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(creator.user_id);
          if (authUser?.user?.email) {
            creatorEmail = authUser.user.email;
            console.log(`[INFO] Found email from cnecbiz auth.users: ${creatorEmail}`);
            await supabase
              .from('featured_creators')
              .update({ email: creatorEmail })
              .eq('id', creatorId);
          }
        } catch (e) {
          console.log('[INFO] Could not fetch from cnecbiz auth.users:', e.message);
        }
      }
    }

    if (!campaign) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' }) };
    }

    // 4. 기업 정보
    const { data: company } = await supabase
      .from('user_profiles')
      .select('id, full_name, company_name, phone, email')
      .eq('id', invitation.invited_by)
      .single();

    const companyName = company?.company_name || company?.full_name || '기업';

    // 5. 주요 채널
    let mainChannel = '인스타그램';
    if (creator.youtube_handle) mainChannel = '유튜브';
    else if (creator.tiktok_handle) mainChannel = '틱톡';

    // 6. 초대장 상태 업데이트
    await supabase
      .from('campaign_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitationId);

    // 7. applications 테이블에 추가 (캠페인이 있는 지역의 Supabase에)
    const { data: application } = await campaignClient
      .from('applications')
      .insert({
        campaign_id: campaignId,
        creator_id: creator.user_id || creator.id,
        name: creatorName,
        email: creatorEmail,
        phone: creator.phone,
        instagram_handle: creator.instagram_handle,
        instagram_followers: creator.followers,
        youtube_handle: creator.youtube_handle,
        tiktok_handle: creator.tiktok_handle,
        profile_image_url: creator.profile_image || creator.thumbnail_url,
        status: 'selected',
        source: 'invitation',
        invitation_id: invitationId
      })
      .select()
      .single();

    // 8. 기업에게 알림톡
    if (company?.phone) {
      try {
        const baseUrl = process.env.URL || 'https://cnecbiz.com';
        await fetch(`${process.env.URL}/.netlify/functions/send-kakao-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverNum: company.phone,
            receiverName: companyName,
            templateCode: '025110000797',
            variables: {
              '기업명': companyName,
              '크리에이터명': creatorName,
              '주요채널': mainChannel,
              '팔로워수': (creator.followers || 0).toLocaleString(),
              '캠페인명': campaign.title,
              '캠페인관리링크': `${baseUrl}/company/campaigns/${campaignId}`
            }
          })
        });
      } catch (e) {
        console.error('[ERROR] Company notification failed:', e);
      }
    }

    // 9. 기업에게 이메일
    if (company?.email) {
      try {
        const baseUrl = process.env.URL || 'https://cnecbiz.com';
        const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:500px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 24px;text-align:center;">
<h1 style="color:#fff;font-size:20px;margin:0;">초대한 크리에이터가 지원했습니다!</h1>
</td></tr>
<tr><td style="padding:32px 24px;">
<p style="font-size:16px;color:#1f2937;margin:0 0 24px;"><strong>${companyName}</strong>님, 안녕하세요!</p>
<p style="font-size:14px;color:#4b5563;margin:0 0 24px;">귀하가 초대한 크리에이터가 캠페인에 지원했습니다.</p>
<table width="100%" style="background:#f9fafb;border-radius:12px;margin-bottom:24px;">
<tr><td style="padding:20px;">
<p style="font-size:12px;color:#6b7280;margin:0 0 8px;">크리에이터 정보</p>
<p style="font-size:18px;font-weight:600;color:#1f2937;margin:0 0 16px;">${creatorName}</p>
<table width="100%">
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">주요 채널</td><td style="text-align:right;font-size:14px;color:#1f2937;">${mainChannel}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">팔로워</td><td style="text-align:right;font-size:14px;color:#1f2937;">${(creator.followers || 0).toLocaleString()}명</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">캠페인</td><td style="text-align:right;font-size:14px;color:#7c3aed;">${campaign.title}</td></tr>
</table>
</td></tr></table>
<table width="100%"><tr><td align="center">
<a href="${baseUrl}/company/campaigns/${campaignId}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:12px;">지원자 확인하기</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 24px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#6b7280;margin:0;">문의: 1833-6025</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

        await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: company.email,
            subject: `[CNEC] 초대한 크리에이터(${creatorName})가 캠페인에 지원했습니다`,
            html: emailHtml
          })
        });
      } catch (e) {
        console.error('[ERROR] Company email failed:', e);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: '캠페인 신청이 완료되었습니다.', applicationId: application?.id })
    };

  } catch (error) {
    console.error('[ERROR] Apply from invitation error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
