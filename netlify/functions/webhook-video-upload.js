const { createClient } = require('@supabase/supabase-js');

/**
 * 영상 업로드 시 기업에게 알림 발송 (Supabase Webhook용)
 *
 * Supabase Database Webhook 설정:
 * 1. Korea Supabase → Database → Webhooks → Create Webhook
 * 2. Name: video_upload_notification
 * 3. Table: campaign_participants
 * 4. Events: UPDATE
 * 5. URL: https://cnecbiz.com/.netlify/functions/webhook-video-upload
 * 6. HTTP Headers: x-webhook-secret: [your-secret]
 *
 * Body 형식 (Supabase Webhook):
 * {
 *   type: 'UPDATE',
 *   table: 'campaign_participants',
 *   record: { id, campaign_id, video_files, ... },
 *   old_record: { id, campaign_id, video_files, ... }
 * }
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('=== 영상 업로드 Webhook 시작 ===');
  console.log('Headers:', JSON.stringify(event.headers, null, 2));

  // 환경변수 확인 (디버깅용)
  console.log('환경변수 확인:', {
    VITE_SUPABASE_KOREA_URL: !!process.env.VITE_SUPABASE_KOREA_URL,
    SUPABASE_KOREA_SERVICE_ROLE_KEY: !!process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VITE_SUPABASE_BIZ_URL: !!process.env.VITE_SUPABASE_BIZ_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });

  // Supabase 클라이언트를 핸들러 내부에서 생성 (환경변수 로딩 문제 해결)
  // Fallback 패턴 적용
  const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const koreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL_BIZ;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!koreaUrl || !koreaKey) {
    console.error('Korea Supabase 환경변수 누락:', { koreaUrl: !!koreaUrl, koreaKey: !!koreaKey });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Korea Supabase 환경변수가 설정되지 않았습니다.' })
    };
  }

  const supabaseKorea = createClient(koreaUrl, koreaKey);
  const supabaseBiz = bizUrl && bizKey ? createClient(bizUrl, bizKey) : null;

  try {
    // Webhook Secret 검증 (선택적)
    const webhookSecret = event.headers['x-webhook-secret'];
    if (process.env.WEBHOOK_SECRET && webhookSecret !== process.env.WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const body = JSON.parse(event.body);
    console.log('Webhook body:', JSON.stringify(body, null, 2));

    // Supabase Webhook 형식 확인
    if (body.type !== 'UPDATE' || body.table !== 'campaign_participants') {
      console.log('Not a video upload event, skipping');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Not a video upload event' })
      };
    }

    const record = body.record;
    const oldRecord = body.old_record;

    // video_files가 변경되었는지 확인
    const oldVideoCount = oldRecord?.video_files?.length || 0;
    const newVideoCount = record?.video_files?.length || 0;

    if (newVideoCount <= oldVideoCount) {
      console.log('No new video uploaded, skipping');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'No new video' })
      };
    }

    console.log(`새 영상 업로드 감지: ${oldVideoCount} → ${newVideoCount}`);

    // 새로 추가된 영상 정보
    const newVideo = record.video_files[newVideoCount - 1];
    const version = newVideo?.version || newVideoCount;

    // 알림은 webhook-video-submission.js에서 처리 (중복 방지)
    console.log('영상 업로드 감지 (campaign_participants) → 알림은 webhook-video-submission.js에서 처리');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Notification deferred to webhook-video-submission to prevent duplicates' })
    };

  } catch (error) {
    console.error('Webhook 처리 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
