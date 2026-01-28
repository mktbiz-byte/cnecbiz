const { createClient } = require('@supabase/supabase-js');

/**
 * Twilio WhatsApp 메시지 발송 Function
 *
 * 환경변수 필요:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_NUMBER (예: whatsapp:+14155238886)
 *
 * 사용법:
 * POST /.netlify/functions/send-whatsapp-message
 * Body: {
 *   phoneNumber: "+821012345678" (E.164 포맷)
 *   message: "메시지 내용"
 * }
 */

// Supabase 클라이언트 (BIZ DB)
const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// 전화번호를 E.164 포맷으로 변환
function formatPhoneNumber(phone) {
  if (!phone) return null;

  // 이미 + 로 시작하면 그대로 사용
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // 한국 번호 처리 (010-xxxx-xxxx → +8210xxxxxxxx)
  if (cleaned.startsWith('010') || cleaned.startsWith('011')) {
    return '+82' + cleaned.substring(1);
  }

  // 일본 번호 처리 (090-xxxx-xxxx → +8190xxxxxxxx)
  if (cleaned.startsWith('090') || cleaned.startsWith('080') || cleaned.startsWith('070')) {
    return '+81' + cleaned.substring(1);
  }

  // 미국 번호 처리 (1로 시작하는 10자리)
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return '+1' + cleaned;
  }

  // 기본적으로 한국 번호로 가정
  if (/^\d+$/.test(cleaned)) {
    return '+82' + cleaned;
  }

  return cleaned;
}

// Twilio API로 WhatsApp 메시지 발송
async function sendTwilioWhatsApp(toNumber, message, accountSid, authToken, fromNumber) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  // From 번호에 whatsapp: prefix 추가 (없는 경우)
  const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

  const formData = new URLSearchParams();
  formData.append('From', formattedFrom);
  formData.append('To', `whatsapp:${toNumber}`);
  formData.append('Body', message);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Twilio API error: ${data.message || JSON.stringify(data)}`);
  }

  return data;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Twilio 환경변수 확인
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // WhatsApp 번호: 직접 설정하거나 Twilio Sandbox 번호 사용
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Twilio credentials not configured',
        details: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN 환경변수를 설정해주세요.'
      })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { phoneNumber, message, creatorId, creatorName } = body;

    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '전화번호를 입력해주세요.' })
      };
    }

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '메시지를 입력해주세요.' })
      };
    }

    // 전화번호 포맷 변환
    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '올바른 전화번호 형식이 아닙니다.' })
      };
    }

    console.log(`[WhatsApp] Sending message to ${formattedNumber}`);

    // Twilio로 메시지 발송
    const result = await sendTwilioWhatsApp(
      formattedNumber,
      message.trim(),
      accountSid,
      authToken,
      fromNumber
    );

    console.log(`[WhatsApp] Message sent successfully. SID: ${result.sid}`);

    // DB에 메시지 저장
    const supabase = getSupabase();
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        phone_number: formattedNumber,
        direction: 'outgoing',
        content: message.trim(),
        twilio_sid: result.sid,
        status: result.status,
        creator_id: creatorId || null,
        creator_name: creatorName || null
      });

    if (dbError) {
      console.warn('[WhatsApp] Failed to save message to DB:', dbError.message);
      // DB 저장 실패해도 메시지는 발송됨
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageSid: result.sid,
        status: result.status,
        to: formattedNumber
      })
    };

  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: 'WhatsApp 메시지 발송 중 오류가 발생했습니다.'
      })
    };
  }
};
