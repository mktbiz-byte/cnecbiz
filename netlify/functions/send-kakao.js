/**
 * Netlify Function: 카카오톡 발송
 * 
 * POST /.netlify/functions/send-kakao
 */

const popbill = require('popbill');

// 팝빌 서비스 초기화
const kakaoService = new popbill.KakaoService(
  process.env.VITE_POPBILL_LINK_ID,
  process.env.VITE_POPBILL_SECRET_KEY
);

// 테스트 모드 설정
kakaoService.setIsTest(process.env.VITE_POPBILL_TEST_MODE === 'true');

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
    const { corpNum, templateCode, senderNum, receiver, message, buttons } = JSON.parse(event.body);

    if (!corpNum || !templateCode || !senderNum || !receiver) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // 카카오톡 알림톡 발송
    const kakaoMessage = {
      snd: senderNum,
      rcv: receiver.phone,
      rcvnm: receiver.name || '',
      msg: message,
      altmsg: message, // 대체 문자 메시지
    };

    // 버튼 추가 (선택)
    if (buttons && buttons.length > 0) {
      kakaoMessage.btns = buttons;
    }

    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS(
        corpNum,
        templateCode,
        senderNum,
        [kakaoMessage],
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
    console.error('카카오톡 발송 실패:', error);
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

