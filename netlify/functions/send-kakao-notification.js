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
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || '';

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

    // 템플릿 변수를 메시지 텍스트로 변환
    let messageText = '';
    if (variables) {
      // 템플릿 변수를 #{변수명} 형식으로 변환
      for (const [key, value] of Object.entries(variables)) {
        messageText += `#{${key}}=${value}\n`;
      }
    }

    console.log('Sending Kakao notification...');
    console.log('Template code:', templateCode);
    console.log('Message text:', messageText);

    // 알림톡 발송 (sendATS_one 사용)
    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS_one(
        POPBILL_CORP_NUM,           // 사업자번호
        templateCode,                // 템플릿 코드
        POPBILL_SENDER_NUM,         // 발신번호
        messageText,                 // 메시지 내용 (템플릿 변수)
        '',                          // 대체문자 내용 (빈 문자열 = 사용 안 함)
        'A',                         // 대체문자 타입 (A=SMS, C=LMS)
        '',                          // 예약전송시간 (빈 문자열 = 즉시전송)
        receiverNum.replace(/-/g, ''), // 수신번호 (하이픈 제거)
        receiverName,                // 수신자명
        POPBILL_USER_ID,            // 팝빌 회원 아이디
        '',                          // 요청번호 (빈 문자열 = 자동생성)
        null,                        // 버튼 정보 (null = 템플릿 기본값)
        (receiptNum) => {
          console.log('Kakao notification success:', receiptNum);
          resolve({ receiptNum });
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
