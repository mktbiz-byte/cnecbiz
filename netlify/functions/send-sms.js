const twilio = require('twilio');

/**
 * Twilio SMS 발송 Function
 *
 * 사용법:
 * POST /.netlify/functions/send-sms
 * Body: {
 *   to: "+819012345678" (국제 형식 전화번호)
 *   message: "메시지 내용"
 *   country: "jp" | "us" | "eu" (선택, 기본: 자동 감지)
 * }
 *
 * 지원 국가:
 * - 일본 (+81): Alphanumeric Sender ID (cnec_jp)
 * - 미국 (+1): US 전화번호 (10DLC 등록 필요)
 * - 유럽: Alphanumeric Sender ID
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    console.error('[SMS] Twilio credentials not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'SMS service not configured',
        details: 'Twilio credentials missing'
      })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { to, message } = body;

    if (!to || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: to, message'
        })
      };
    }

    // 전화번호 형식 정리 (국제 형식으로)
    let phoneNumber = to.replace(/[^0-9+]/g, '');

    // 일본 번호 처리 (0으로 시작하면 +81로 변환)
    if (phoneNumber.startsWith('0') && phoneNumber.length === 11) {
      phoneNumber = '+81' + phoneNumber.substring(1);
    }
    // + 없으면 추가
    if (!phoneNumber.startsWith('+')) {
      // 81로 시작하면 일본
      if (phoneNumber.startsWith('81')) {
        phoneNumber = '+' + phoneNumber;
      }
      // 1로 시작하고 11자리면 미국
      else if (phoneNumber.startsWith('1') && phoneNumber.length === 11) {
        phoneNumber = '+' + phoneNumber;
      }
    }

    console.log(`[SMS] Sending to: ${phoneNumber}`);
    console.log(`[SMS] Message: ${message.substring(0, 50)}...`);

    const client = twilio(accountSid, authToken);

    // Messaging Service를 통해 발송 (자동으로 적절한 sender 선택)
    const result = await client.messages.create({
      body: message,
      messagingServiceSid: messagingServiceSid,
      to: phoneNumber
    });

    console.log(`[SMS] Sent successfully. SID: ${result.sid}, Status: ${result.status}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageSid: result.sid,
        status: result.status,
        to: phoneNumber
      })
    };

  } catch (error) {
    console.error('[SMS] Error:', error);

    // Twilio 에러 코드 처리
    const errorCode = error.code;
    let errorMessage = error.message;

    // 일반적인 에러 코드 설명
    const errorCodes = {
      21211: '유효하지 않은 전화번호입니다.',
      21614: '해당 국가로 SMS를 보낼 수 없습니다.',
      21408: '해당 지역으로 SMS 발송 권한이 없습니다.',
      30003: '수신자가 차단되었습니다.',
      30004: '메시지가 차단되었습니다.',
      30005: '알 수 없는 수신자입니다.',
      30006: '휴대전화를 사용할 수 없습니다.',
      30007: '메시지 형식 오류입니다.'
    };

    if (errorCodes[errorCode]) {
      errorMessage = errorCodes[errorCode];
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        code: errorCode
      })
    };
  }
};
