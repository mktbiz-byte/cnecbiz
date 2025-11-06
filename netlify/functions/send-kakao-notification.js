const popbill = require('popbill');

// 팝빌 서비스 초기화
// Netlify Functions에서는 VITE_ 접두사 없이 환경변수 사용
const LINK_ID = process.env.POPBILL_LINK_ID || process.env.VITE_POPBILL_LINK_ID;
const SECRET_KEY = process.env.POPBILL_SECRET_KEY || process.env.VITE_POPBILL_SECRET_KEY;
const CORP_NUM = process.env.POPBILL_CORP_NUM || process.env.VITE_POPBILL_CORP_NUM;
const SENDER_NUM = process.env.POPBILL_SENDER_NUM || process.env.VITE_POPBILL_SENDER_NUM;
const IS_TEST = (process.env.POPBILL_TEST_MODE || process.env.VITE_POPBILL_IS_TEST) === 'true';

const kakaoService = new popbill.KakaoService(LINK_ID, SECRET_KEY);

kakaoService.setIsTest(IS_TEST);

exports.handler = async (event) => {
  console.log('=== Kakao Notification Function Started ===');
  console.log('Environment variables check:');
  console.log('LINK_ID:', LINK_ID ? 'SET' : 'NOT SET');
  console.log('SECRET_KEY:', SECRET_KEY ? 'SET' : 'NOT SET');
  console.log('CORP_NUM:', CORP_NUM ? 'SET' : 'NOT SET');
  console.log('SENDER_NUM:', SENDER_NUM ? 'SET' : 'NOT SET');
  console.log('IS_TEST:', IS_TEST);
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
    console.log('Request body:', event.body);
    const { receiverNum, receiverName, templateCode, variables } = JSON.parse(event.body);
    console.log('Parsed params:', { receiverNum, receiverName, templateCode, variables });

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
    console.log('Sending Kakao notification...');
    console.log('Message:', message);
    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS(
        CORP_NUM,
        SENDER_NUM,
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
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
