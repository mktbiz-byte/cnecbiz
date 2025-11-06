const popbill = require('popbill');

// 팝빌 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

// 팝빌 카카오톡 서비스 객체 생성
const kakaoService = popbill.KakaoService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '';

console.log('Popbill Kakao service initialized successfully');
console.log('POPBILL_CORP_NUM:', POPBILL_CORP_NUM);
console.log('POPBILL_SENDER_NUM:', POPBILL_SENDER_NUM);
console.log('POPBILL_TEST_MODE:', process.env.POPBILL_TEST_MODE);

exports.handler = async (event, context) => {
  console.log('=== Kakao Notification Function Started ===');
  
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

    console.log('Sending Kakao notification...');
    console.log('Message:', message);

    // 알림톡 발송
    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS(
        POPBILL_CORP_NUM,
        POPBILL_SENDER_NUM,
        '', // 광고 전송 여부 (빈 문자열 = 일반)
        '', // 예약 전송 시간 (빈 문자열 = 즉시)
        [message],
        (response) => {
          console.log('Kakao notification success:', response);
          resolve(response);
        },
        (error) => {
          console.error('Kakao notification error:', error);
          reject(error);
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
