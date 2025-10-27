/**
 * Netlify Function: 문자 발송 (SMS/LMS/MMS)
 * 
 * POST /.netlify/functions/send-sms
 */

const popbill = require('popbill');

// 팝빌 서비스 초기화
const messageService = new popbill.MessageService(
  process.env.VITE_POPBILL_LINK_ID,
  process.env.VITE_POPBILL_SECRET_KEY
);

// 테스트 모드 설정
messageService.setIsTest(process.env.VITE_POPBILL_TEST_MODE === 'true');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { corpNum, senderNum, receiver, message, messageType = 'SMS' } = JSON.parse(event.body);

    if (!corpNum || !senderNum || !receiver || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // 문자 메시지 데이터
    const smsMessage = {
      snd: senderNum,
      rcv: receiver.phone,
      rcvnm: receiver.name || '',
      msg: message,
    };

    // 메시지 타입에 따라 발송 함수 선택
    let sendFunction;
    switch (messageType.toUpperCase()) {
      case 'LMS':
        sendFunction = 'sendLMS';
        smsMessage.sj = receiver.subject || ''; // 제목 (LMS만)
        break;
      case 'MMS':
        sendFunction = 'sendMMS';
        smsMessage.sj = receiver.subject || ''; // 제목 (MMS만)
        // TODO: 이미지 파일 처리
        break;
      default:
        sendFunction = 'sendSMS';
    }

    const result = await new Promise((resolve, reject) => {
      messageService[sendFunction](
        corpNum,
        senderNum,
        [smsMessage],
        (response) => {
          if (response.code) {
            reject(new Error(response.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
      }),
    };

  } catch (error) {
    console.error('문자 발송 실패:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};

