const { createClient } = require('@supabase/supabase-js');

/**
 * 영상 업로드 시 네이버웍스 알림 발송 (Supabase Webhook용)
 *
 * Supabase Database Webhook 설정:
 * - Table: campaign_participants
 * - Events: UPDATE
 * - URL: https://cnecbiz.com/.netlify/functions/webhook-video-upload
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

  try {
    // Webhook Secret 검증 (선택적)
    const webhookSecret = event.headers['x-webhook-secret'];
    if (process.env.WEBHOOK_SECRET && webhookSecret !== process.env.WEBHOOK_SECRET) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const body = JSON.parse(event.body);

    // campaign_participants UPDATE 이벤트만 처리
    if (body.type !== 'UPDATE' || body.table !== 'campaign_participants') {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Not a video upload event' }) };
    }

    const record = body.record;
    const oldRecord = body.old_record;

    // video_files가 새로 추가되었는지 확인
    const oldVideoCount = oldRecord?.video_files?.length || 0;
    const newVideoCount = record?.video_files?.length || 0;

    if (newVideoCount <= oldVideoCount) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'No new video' }) };
    }

    console.log(`[webhook-video-upload] 새 영상 감지: ${oldVideoCount} → ${newVideoCount}, campaign_id: ${record.campaign_id}`);

    // 캠페인 제목 + 크리에이터 이름 조회
    const supabaseKorea = createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const supabaseBiz = createClient(
      process.env.VITE_SUPABASE_BIZ_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 캠페인 제목 조회 (Korea DB → BIZ DB fallback)
    let campaignTitle = '(캠페인명 없음)';
    let companyName = '(기업명 없음)';
    let companyId = null;

    const { data: campaign } = await supabaseKorea
      .from('campaigns')
      .select('title, company_name, brand_name, brand, company_id')
      .eq('id', record.campaign_id)
      .maybeSingle();

    if (campaign) {
      campaignTitle = campaign.title || campaign.brand || campaignTitle;
      companyName = campaign.company_name || campaign.brand_name || campaign.brand || companyName;
      companyId = campaign.company_id;
    } else {
      // BIZ DB fallback
      const { data: bizCampaign } = await supabaseBiz
        .from('campaigns')
        .select('title, company_name, brand_name, brand, company_id')
        .eq('id', record.campaign_id)
        .maybeSingle();
      if (bizCampaign) {
        campaignTitle = bizCampaign.title || bizCampaign.brand || campaignTitle;
        companyName = bizCampaign.company_name || bizCampaign.brand_name || bizCampaign.brand || companyName;
        companyId = bizCampaign.company_id;
      }
    }

    // 크리에이터 이름 조회
    let creatorName = record.creator_name || '(크리에이터명 없음)';
    if (creatorName.startsWith('(') && record.user_id) {
      const { data: profile } = await supabaseBiz
        .from('user_profiles')
        .select('name, full_name')
        .eq('id', record.user_id)
        .maybeSingle();
      if (profile) creatorName = profile.name || profile.full_name || creatorName;
    }

    const newVideo = record.video_files[newVideoCount - 1];
    const version = newVideo?.version || newVideoCount;
    const koreanDate = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // 네이버웍스 메시지 발송 (send-naver-works-message 함수 호출)
    const baseUrl = process.env.URL || 'https://cnecbiz.com';
    const naverWorksMessage = `📹 영상 제출 알림\n\n📋 캠페인: ${campaignTitle}\n🏢 기업: ${companyName}\n👤 크리에이터: ${creatorName}\n📌 버전: V${version}\n⏰ 제출 시간: ${koreanDate}`;

    const nwRes = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
        message: naverWorksMessage
      })
    });
    const nwResult = await nwRes.json();
    console.log('[webhook-video-upload] 네이버웍스 발송:', nwResult.success ? '성공' : JSON.stringify(nwResult));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Naver Works notification sent' })
    };

  } catch (error) {
    console.error('[webhook-video-upload] 오류:', error);

    // 에러 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'webhook-video-upload',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
