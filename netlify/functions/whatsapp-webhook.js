const { createClient } = require('@supabase/supabase-js');

/**
 * Twilio WhatsApp 웹훅 Function
 *
 * Twilio Console에서 Webhook URL 설정:
 * https://cnecbiz.com/.netlify/functions/whatsapp-webhook
 *
 * 들어오는 WhatsApp 메시지를 수신하여 DB에 저장합니다.
 */

// Supabase 클라이언트 (BIZ DB)
const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Twilio Webhook 서명 검증 (선택적)
function validateTwilioSignature(event) {
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  if (!twilioAuthToken) return true; // 토큰 없으면 검증 스킵

  // Twilio 서명 검증 로직 (필요시 구현)
  // 현재는 간단히 pass
  return true;
}

// URL 인코딩된 body 파싱
function parseUrlEncodedBody(body) {
  const params = new URLSearchParams(body);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'text/xml',
    'Access-Control-Allow-Origin': '*'
  };

  // Twilio는 POST로 웹훅을 보냄
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      headers,
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    };
  }

  try {
    // Twilio 서명 검증
    if (!validateTwilioSignature(event)) {
      console.error('[WhatsApp Webhook] Invalid Twilio signature');
      return {
        statusCode: 403,
        headers,
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
      };
    }

    // Twilio 웹훅 데이터 파싱 (application/x-www-form-urlencoded)
    const webhookData = parseUrlEncodedBody(event.body);

    console.log('[WhatsApp Webhook] Received:', JSON.stringify(webhookData, null, 2));

    // 필수 필드 확인
    const {
      From,           // whatsapp:+821012345678
      To,             // whatsapp:+14155238886 (Twilio 번호)
      Body,           // 메시지 내용
      MessageSid,     // 메시지 고유 ID
      NumMedia,       // 미디어 개수
      ProfileName,    // 발신자 프로필 이름
    } = webhookData;

    if (!From || !Body) {
      console.log('[WhatsApp Webhook] Missing required fields');
      return {
        statusCode: 200,
        headers,
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
      };
    }

    // 전화번호 추출 (whatsapp:+821012345678 → +821012345678)
    const phoneNumber = From.replace('whatsapp:', '');

    // DB에 메시지 저장
    const supabase = getSupabase();
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: phoneNumber,
        direction: 'incoming',
        content: Body,
        twilio_sid: MessageSid,
        status: 'received',
        sender_name: ProfileName || null,
        media_count: parseInt(NumMedia || '0', 10)
      });

    if (dbError) {
      console.error('[WhatsApp Webhook] DB error:', dbError);
    } else {
      console.log(`[WhatsApp Webhook] Message saved from ${phoneNumber}`);
    }

    // 네이버웍스로 알림 발송 (선택적)
    try {
      await sendNaverWorksNotification(phoneNumber, Body, ProfileName);
    } catch (notifyError) {
      console.warn('[WhatsApp Webhook] Naver Works notification failed:', notifyError.message);
    }

    // TwiML 응답 (자동 응답 없음)
    return {
      statusCode: 200,
      headers,
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    };

  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return {
      statusCode: 200,
      headers,
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    };
  }
};

// 네이버웍스 알림 발송
async function sendNaverWorksNotification(phoneNumber, message, senderName) {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID;
  const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
  const botId = process.env.NAVER_WORKS_BOT_ID;
  const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

  if (!clientId || !clientSecret || !botId || !channelId) {
    return; // 네이버웍스 설정 없으면 스킵
  }

  // 액세스 토큰 발급
  const tokenResponse = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'bot'
    }).toString()
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get Naver Works access token');
  }

  const { access_token } = await tokenResponse.json();

  // 메시지 발송
  const notificationMessage = `📱 WhatsApp 메시지 수신\n\n발신: ${phoneNumber}\n${senderName ? `이름: ${senderName}\n` : ''}\n내용: ${message}`;

  await fetch(`https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: {
        type: 'text',
        text: notificationMessage
      }
    })
  });
}
