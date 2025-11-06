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

    case '025100001005': // 캠페인 승인 및 모집 시작
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인이 승인되었습니다!

📅 캠페인 기간: ${variables['시작일']} ~ ${variables['마감일']}
👥 모집 인원: ${variables['모집인원']}명

크리에이터 모집이 시작되었습니다.
대시보드에서 지원 현황을 확인하세요.`;

    case '025100001006': // 모집 마감 크리에이터 선정 요청
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인 모집이 마감되었습니다.

📊 총 지원자 수: ${variables['지원자수']}명

대시보드에서 지원자를 확인하고 크리에이터를 선정해 주세요.`;

    case '025100001007': // 크리에이터 가이드 제출 검수 요청
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인에서 크리에이터가 가이드를 제출했습니다.

📝 제출자: ${variables['크리에이터명']}

대시보드에서 가이드를 검수하고 승인/반려해 주세요.`;

    case '025100001008': // 영상 촬영 완료 검수 요청
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인에서 크리에이터가 영상을 제출했습니다.

🎥 제출자: ${variables['크리에이터명']}

대시보드에서 영상을 검수하고 승인/수정요청해 주세요.`;

    case '025100001009': // 최종 영상 완료 보고서 확인 요청
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인이 완료되었습니다!

📊 최종 보고서가 생성되었습니다.
대시보드에서 캠페인 성과를 확인하세요.

감사합니다.`;

    case '025100001010': // 캠페인 검수 신청
      return `${variables['회사명']}님, ${variables['캠페인명']} 캠페인 검수 신청이 접수되었습니다.

📅 캠페인 기간: ${variables['시작일']} ~ ${variables['마감일']}
👥 모집 인원: ${variables['모집인원']}명

검수 완료 후 승인 여부를 알려드리겠습니다.
(영업일 기준 1-2일 소요)`;

    // ===== 크리에이터용 템플릿 =====
    
    case '025100001022': // 크리에이터 회원가입
      return `${variables['이름']}님 크리에이터 가입을 환영합니다!

앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 크리에이터 프로필을 설정해 주세요.`;

    case '025100001011': // 캠페인 선정 완료
      return `${variables['크리에이터명']}님, 축하합니다!

${variables['캠페인명']} 캠페인에 선정되셨습니다.

대시보드에서 캠페인 상세 정보를 확인하고 준비를 시작해 주세요.`;

    case '025100001012': // 촬영 가이드 전달
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인의 촬영 가이드가 전달되었습니다.

📅 제출 기한: ${variables['제출기한']}

대시보드에서 가이드를 확인하고 제출해 주세요.`;

    case '025100001013': // 영상 제출 기한 3일 전
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인 영상 제출 기한이 3일 남았습니다.

📅 제출 기한: ${variables['제출기한']}

준비 상황을 확인해 주세요.`;

    case '025100001014': // 영상 제출 기한 2일 전
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인 영상 제출 기한이 2일 남았습니다.

📅 제출 기한: ${variables['제출기한']}

서둘러 준비해 주세요.`;

    case '025100001015': // 영상 제출 기한 당일
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인 영상 제출 기한이 오늘입니다!

📅 제출 기한: ${variables['제출기한']}

⚠️ 기한 내 미제출 시 패널티가 부과될 수 있습니다.`;

    case '025100001016': // 영상 수정 요청
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인 영상 수정이 요청되었습니다.

📅 요청일: ${variables['요청일']}
📅 재제출 기한: ${variables['재제출기한']}

대시보드에서 수정 요청 사항을 확인하고 재제출해 주세요.`;

    case '025100001017': // 영상 승인 완료
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인 영상이 승인되었습니다!

📅 SNS 업로드 기한: ${variables['업로드기한']}

승인된 영상을 SNS에 업로드하고 링크를 제출해 주세요.`;

    case '025100001018': // 캠페인 완료 포인트 지급
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인이 완료되었습니다!

📅 완료일: ${variables['완료일']}

포인트가 지급되었습니다.
대시보드에서 확인하세요.`;

    case '025100001019': // 출금 접수 완료
      return `${variables['크리에이터명']}님, 출금 신청이 접수되었습니다.

💰 출금 금액: ${variables['출금금액']}원
📅 신청일: ${variables['신청일']}

영업일 기준 3-5일 내 입금 예정입니다.`;

    case '025100001020': // 출금 완료
      return `${variables['크리에이터명']}님, 출금이 완료되었습니다.

📅 입금일: ${variables['입금일']}

계좌를 확인해 주세요.
감사합니다.`;

    case '025100001021': // 제출 기한 지연 경고
      return `${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인 제출 기한이 지났습니다.

📅 제출 기한: ${variables['제출기한']}

⚠️ 패널티가 부과될 수 있습니다.
빠른 시일 내에 제출해 주세요.`;

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
