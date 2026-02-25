/**
 * video_submissions 테이블 INSERT/UPDATE 시 Supabase Database Webhook 수신
 *
 * ⚠️ 알림 발송은 save-video-upload.js에서 처리합니다.
 * 이 함수는 웹훅 수신만 하고 알림을 보내지 않습니다.
 * (중복 알림 방지 - save-video-upload.js가 insert_video_submission/update_video_submission 시 이미 알림 발송)
 *
 * Supabase Database Webhook 설정:
 * 1. Korea Supabase → Database → Webhooks → Create Webhook
 *    - Name: video_submission_notification
 *    - Table: video_submissions
 *    - Events: INSERT
 *    - URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission
 *
 * 2. Japan Supabase → Database → Webhooks → Create Webhook
 *    - Name: video_submission_notification
 *    - Table: video_submissions
 *    - Events: INSERT
 *    - URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission?region=japan
 *
 * 3. US Supabase → Database → Webhooks → Create Webhook
 *    - Name: video_submission_notification
 *    - Table: video_submissions
 *    - Events: INSERT
 *    - URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission?region=us
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

  const queryParams = event.queryStringParameters || {};
  const region = queryParams.region || 'korea';

  try {
    const body = JSON.parse(event.body);

    // INSERT 또는 UPDATE 이벤트만 로깅
    if (!['INSERT', 'UPDATE'].includes(body.type) || body.table !== 'video_submissions') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Not a video submission event' })
      };
    }

    const record = body.record;

    console.log(`[webhook-video-submission] ${body.type} received (region: ${region}):`, {
      id: record?.id,
      campaign_id: record?.campaign_id,
      user_id: record?.user_id,
      version: record?.version,
      has_video_url: !!record?.video_file_url
    });

    // 알림은 save-video-upload.js에서 처리하므로 여기서는 발송하지 않음
    // (중복 알림 방지)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Webhook received (${region}) - notification handled by save-video-upload.js`
      })
    };

  } catch (error) {
    console.error('[webhook-video-submission] Webhook error:', error);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'webhook-video-submission',
          errorMessage: error.message,
          context: { region }
        })
      })
    } catch (e) { console.error('[webhook-video-submission] Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
