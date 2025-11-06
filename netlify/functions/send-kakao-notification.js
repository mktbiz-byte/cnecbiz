const popbill = require('popbill');

// 팝빌 서비스 초기화
const kakaoService = new popbill.KakaoService(
  process.env.VITE_POPBILL_LINK_ID,
  process.env.VITE_POPBILL_SECRET_KEY
);

kakaoService.setIsTest(process.env.VITE_POPBILL_IS_TEST === 'true');

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { receiverNum, receiverName, templateCode, variables } = JSON.parse(event.body);

    // 필수 파라미터 검증
    if (!receiverNum || !receiverName || !templateCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          required: ['receiverNum', 'receiverName', 'templateCode']
        }),
      };
    }

    // 알림톡 메시지 생성
    const message = {
      rcv: receiverNum,
      rcvnm: receiverName,
      msg: '', // 템플릿 사용 시 빈 문자열
      tmplCode: templateCode,
      ...variables, // 템플릿 변수
    };

    // 알림톡 발송
    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS(
        process.env.VITE_POPBILL_CORP_NUM,
        process.env.VITE_POPBILL_SENDER_NUM,
        '', // 광고 전송 여부 (빈 문자열 = 일반)
        '', // 예약 전송 시간 (빈 문자열 = 즉시)
        [message],
        (error, response) => {
          if (error) {
            reject(error);
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
        result,
      }),
    };
  } catch (error) {
    console.error('Kakao notification error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to send Kakao notification',
      }),
    };
  }
};
