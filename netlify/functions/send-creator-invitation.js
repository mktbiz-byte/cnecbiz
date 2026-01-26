const { createClient } = require('@supabase/supabase-js');

// 환경변수 안전하게 로드
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// BIZ Supabase 클라이언트 (안전하게 생성)
let supabase = null;
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
} catch (e) {
  console.error('[INIT ERROR] Failed to create BIZ supabase client:', e.message);
}

// Korea Supabase 클라이언트
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
const supabaseKoreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;
let supabaseKorea = null;
try {
  if (supabaseKoreaUrl && supabaseKoreaServiceKey) {
    supabaseKorea = createClient(supabaseKoreaUrl, supabaseKoreaServiceKey);
  }
} catch (e) {
  console.error('[INIT ERROR] Failed to create Korea supabase client:', e.message);
}

/**
 * 캠페인 타입을 한글 라벨로 변환
 */
const getCampaignTypeLabel = (campaignType) => {
  const labels = {
    'planned': '기획형',
    'regular': '기획형',
    'oliveyoung': '올영세일',
    'oliveyoung_sale': '올영세일',
    '4week_challenge': '4주 챌린지',
    '4week': '4주 챌린지',
    'megawari': '메가와리'
  };
  return labels[campaignType] || campaignType || '기획형';
};

/**
 * 크리에이터 포인트 계산 함수 (프론트엔드 로직과 동일)
 */
const calculateCreatorPoints = (campaign) => {
  if (!campaign) return 0;

  // 수동 설정값이 있으면 우선 사용
  if (campaign.creator_points_override) {
    return campaign.creator_points_override;
  }

  const campaignType = campaign.campaign_type;
  const totalSlots = campaign.total_slots || campaign.max_participants || 1;

  // 4주 챌린지
  if (campaignType === '4week_challenge' || campaignType === '4week') {
    const weeklyTotal = (campaign.week1_reward || 0) + (campaign.week2_reward || 0) +
                       (campaign.week3_reward || 0) + (campaign.week4_reward || 0);
    const totalReward = weeklyTotal > 0 ? weeklyTotal : (campaign.reward_points || 0);
    return Math.round((totalReward * 0.7) / totalSlots);
  }

  // 기획형
  if (campaignType === 'planned' || campaignType === 'regular') {
    const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) +
                     (campaign.step3_reward || 0);
    const totalReward = stepTotal > 0 ? stepTotal : (campaign.reward_points || 0);
    return Math.round((totalReward * 0.6) / totalSlots);
  }

  // 올리브영
  if (campaignType === 'oliveyoung' || campaignType === 'oliveyoung_sale') {
    const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) +
                     (campaign.step3_reward || 0);
    const totalReward = stepTotal > 0 ? stepTotal : (campaign.reward_points || 0);
    return Math.round((totalReward * 0.7) / totalSlots);
  }

  // 기본: reward_amount 또는 reward_points 사용
  return campaign.reward_amount || Math.round(((campaign.reward_points || 0) * 0.6) / totalSlots);
};

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

    // Supabase 클라이언트 확인
    if (!supabase) {
      console.error('[ERROR] BIZ Supabase client not initialized');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: '데이터베이스 연결 오류가 발생했습니다.' })
      };
    }

    // 1. 캠페인 정보 조회 (Korea DB 우선, 없으면 BIZ DB)
    let campaign = null;
    let campaignClient = null;

    // Korea DB에서 먼저 조회 (select * 사용으로 스키마 차이 해결)
    console.log('[DEBUG] Checking Korea DB for campaign...');
    if (supabaseKorea) {
      const { data: koreaCampaign, error: koreaError } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      console.log('[DEBUG] Korea DB result:', { found: !!koreaCampaign, error: koreaError?.message });
      if (koreaCampaign && !koreaError) {
        campaign = {
          ...koreaCampaign,
          // 통일된 필드명으로 매핑
          deadline: koreaCampaign.application_deadline || koreaCampaign.recruitment_deadline || koreaCampaign.deadline
        };
        campaignClient = supabaseKorea;
        console.log('[INFO] Campaign found in Korea DB:', {
          title: campaign.title,
          company_email: campaign.company_email,
          creator_points_override: campaign.creator_points_override,
          reward_points: campaign.reward_points,
          campaign_type: campaign.campaign_type
        });
      }
    } else {
      console.log('[DEBUG] Korea Supabase client not available');
    }

    // Korea에 없으면 BIZ DB에서 조회 (select * 사용)
    if (!campaign) {
      console.log('[DEBUG] Checking BIZ DB for campaign...');
      const { data: bizCampaign, error: bizError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      console.log('[DEBUG] BIZ DB result:', { found: !!bizCampaign, error: bizError?.message });
      if (bizCampaign && !bizError) {
        campaign = {
          ...bizCampaign,
          // 통일된 필드명으로 매핑
          deadline: bizCampaign.deadline || bizCampaign.application_deadline || bizCampaign.recruitment_deadline
        };
        campaignClient = supabase;
        console.log('[INFO] Campaign found in BIZ DB:', {
          title: campaign.title,
          company_email: campaign.company_email,
          creator_points_override: campaign.creator_points_override,
          reward_amount: campaign.reward_amount,
          campaign_type: campaign.campaign_type
        });
      }
    }

    if (!campaign) {
      console.error('[ERROR] Campaign not found in any DB:', campaignId);
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' }) };
    }

    // 2. 캠페인 소유권 확인 (대소문자 무시)
    console.log('[INFO] Checking ownership:', { campaignEmail: campaign.company_email, userEmail: companyEmail });
    if (campaign.company_email?.toLowerCase() !== companyEmail?.toLowerCase()) {
      console.error('[ERROR] Ownership mismatch:', { campaignEmail: campaign.company_email, userEmail: companyEmail });
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: '이 캠페인에 대한 권한이 없습니다.' }) };
    }

    // 3. 크리에이터 정보 조회 (featured_creators 또는 user_profiles에서)
    let creator = null;

    // 먼저 featured_creators에서 조회 (select * 사용)
    console.log('[DEBUG] Checking featured_creators for creator:', creatorId);
    const { data: featuredCreator, error: featuredError } = await supabase
      .from('featured_creators')
      .select('*')
      .eq('id', creatorId)
      .single();

    console.log('[DEBUG] featured_creators result:', { found: !!featuredCreator, error: featuredError?.message });

    if (featuredCreator) {
      creator = {
        ...featuredCreator,
        name: featuredCreator.name || featuredCreator.creator_name,
        followers: featuredCreator.followers || featuredCreator.followers_count
      };
      console.log('[INFO] Creator found in featured_creators:', { name: creator.name });
    } else {
      // featured_creators에 없으면 user_profiles (Korea DB)에서 조회 (MUSE 크리에이터용)
      const koreaClient = supabaseKorea || supabase;
      console.log('[DEBUG] Checking user_profiles for MUSE creator:', creatorId);
      const { data: userProfile, error: profileError } = await koreaClient
        .from('user_profiles')
        .select('*')
        .eq('id', creatorId)
        .single();

      console.log('[DEBUG] user_profiles result:', { found: !!userProfile, error: profileError?.message });

      if (userProfile) {
        creator = {
          ...userProfile,
          name: userProfile.name || userProfile.full_name || userProfile.display_name,
          email: userProfile.email,
          phone: userProfile.phone || userProfile.phone_number,
          instagram_handle: userProfile.instagram_url || userProfile.instagram_handle || userProfile.instagram,
          youtube_handle: userProfile.youtube_url || userProfile.youtube_handle || userProfile.youtube,
          tiktok_handle: userProfile.tiktok_url || userProfile.tiktok_handle || userProfile.tiktok,
          followers: userProfile.followers_count || userProfile.followers || userProfile.total_followers
        };
        console.log('[INFO] Creator found in user_profiles (MUSE):', { name: creator.name, email: creator.email });
      }
    }

    if (!creator) {
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

    // 크리에이터 포인트 (계산 함수 사용)
    const creatorPoints = calculateCreatorPoints(campaign);
    const formattedPoints = creatorPoints ? creatorPoints.toLocaleString() + '원' : '협의';

    // 캠페인 타입 라벨
    const campaignTypeLabel = getCampaignTypeLabel(campaign.campaign_type);
    console.log('[INFO] Creator points:', { campaign_type: campaign.campaign_type, campaignTypeLabel, calculated: creatorPoints });

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
              '패키지타입': campaignTypeLabel,
              '보상금액': formattedPoints,
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
<tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">보상금</td><td style="padding:4px 0;font-size:14px;color:#7c3aed;font-weight:600;text-align:right;">${formattedPoints}</td></tr>
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
