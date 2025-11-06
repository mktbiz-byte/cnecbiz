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

// 템플릿별 메시지 생성 함수
function generateMessage(templateCode, variables) {
  switch (templateCode) {
    case '025100000912': // 회원가입
      return `${variables['회원명']}님 가입을 환영합니다.
앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 기업 프로필을 설정해 주세요.`;

    case '025100000918': // 캠페인 신청 및 입금 안내
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인 신청이 완료되었습니다.
입금 금액: ${variables['금액']}원
입금 계좌: 우리은행 1005-604-123456 (주)크넥코리아
입금 확인 후 캠페인이 승인됩니다.`;

    case '025100000943': // 포인트 충전 완료
      return `${variables['회사명']}님, 포인트 충전이 완료되었습니다.
충전 포인트: ${variables['포인트']}P
${variables['캠페인명'] ? `캠페인: ${variables['캠페인명']}` : ''}`;

    case '025100001005': // 캠페인 승인
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인이 승인되었습니다.
기간: ${variables['시작일']} ~ ${variables['마감일']}
모집 인원: ${variables['모집인원']}명
크리에이터 모집이 시작되었습니다.`;

    default:
      // 기본: 변수를 그대로 나열
      return Object.entries(variables)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
  }
}

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

    // 템플릿 메시지 생성
    const messageText = generateMessage(templateCode, variables || {});

    console.log('Sending Kakao notification...');
    console.log('Template code:', templateCode);
    console.log('Message text:', messageText);

    // 알림톡 발송 (sendATS_one 사용)
    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS_one(
        POPBILL_CORP_NUM,           // 사업자번호
        templateCode,                // 템플릿 코드
        POPBILL_SENDER_NUM,         // 발신번호
        messageText,                 // 메시지 내용
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
