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
      return `[CNEC] 회원가입
${variables['회원명']}님 가입을 환영합니다.
앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 기업 프로필을 설정해 주세요.`;

    case '025100000918': // 캠페인 신청 완료, 입금요청서
      return `[CNEC] 캠페인 신청 완료
${variables['회사명']}님, 캠페인 신청이 접수되었습니다.
캠페인: ${variables['캠페인명']}
금액: ${variables['금액']}원
입금 계좌
IBK기업은행 047-122753-04-011
예금주: 주식회사 하우파파
입금 확인 후 캠페인이 시작됩니다.
문의: 1833-6025`;

    case '025100000919': // 포인트 충전완료
      return `[CNEC] 입금 확인 완료
${variables['회사명']}님, 입금이 확인되었습니다.
캠페인: ${variables['캠페인명']}
충전 포인트: ${variables['포인트']}P
캠페인 승인 후 크리에이터 모집이 시작됩니다.
캠페인 확인: https://cnectotal.netlify.app/company/campaigns
문의: 1833-6025`;

    case '025100000942': // 입금
      return `[CNEC] 포인트 신청 완료
${variables['회사명']}님, 포인트 신청이 접수되었습니다.
금액: ${variables['금액']}원
입금 계좌
IBK기업은행 047-122753-04-011
예금주: 주식회사 하우파파
입금 확인 후 포인트가 자동 충전됩니다.
문의: 1833-6025`;

    case '025100000943': // 포인트 구매 완료
      return `[CNEC] 입금 확인 완료
${variables['회사명']}님, 입금이 확인되었습니다.
충전 포인트: ${variables['포인트']}P
문의: 1833-6025`;

    case '025100001005': // 캠페인 승인 및 모집 시작
      return `[CNEC] 신청하신 캠페인 승인 완료
${variables['회사명']}님, 신청하신 캠페인이 승인되어 크리에이터 모집이 시작되었습니다.
캠페인: ${variables['캠페인명']}
모집 기간: ${variables['시작일']} ~ ${variables['마감일']}
모집 인원: ${variables['모집인원']}명
관리자 페이지에서 진행 상황을 확인하실 수 있습니다.
문의: 1833-6025`;

    case '025100001006': // 모집 마감 크리에이터 선정 요청
      return `[CNEC] 신청하신 캠페인 모집 마감
${variables['회사명']}님, 신청하신 캠페인의 크리에이터 모집이 마감되었습니다.
캠페인: ${variables['캠페인명']}
지원 크리에이터: ${variables['지원자수']}명
관리자 페이지에서 지원한 크리에이터 리스트를 확인하시고, 최종 선정을 진행해 주세요.
문의: 1833-6025`;

    case '025100001007': // 크리에이터 가이드 제출 검수 요청
      return `[CNEC] 신청하신 캠페인 가이드 제출
${variables['회사명']}님, 신청하신 캠페인의 크리에이터가 콘텐츠 가이드를 제출했습니다.
캠페인: ${variables['캠페인명']}
크리에이터: ${variables['크리에이터명']}
관리자 페이지에서 가이드 내용을 검토하시고, 
승인 또는 수정 요청을 진행해 주세요.
가이드 검토가 완료 되시면 
크리에이터에게 전달하여 촬영에 들어 가겠습니다.
문의: 1833-6025`;

    case '025100001008': // 영상 촬영 완료 검수 요청
      return `[CNEC] 신청하신 캠페인 영상 제출
${variables['회사명']}님, 신청하신 캠페인의 크리에이터가 촬영 영상을 제출했습니다.
캠페인: ${variables['캠페인명']}
크리에이터: ${variables['크리에이터명']}
관리자 페이지에서 영상을 검토하시고, 수정 사항이 있으면 피드백을 남겨주세요.
검수 완료 후 sns 업로드 될 예정입니다.
문의: 1833-6025`;

    case '025100001009': // 최종 영상 완료 보고서 확인 요청
      return `[CNEC] 신청하신 캠페인 최종 완료
${variables['회사명']}님, 신청하신 캠페인의 크리에이터가 최종 영상 수정을 완료하고 SNS에 업로드했습니다.
캠페인: ${variables['캠페인명']}
관리자 페이지에서 최종 보고서와 성과 지표를 확인해 주세요.
캠페인이 성공적으로 완료되었습니다. 
감사합니다.
문의: 1833-6025`;

    case '025100001010': // 캠페인 검수 신청
      return `[CNEC] 캠페인 검수 신청
${variables['회사명']}님, 신청하신 캠페인이 관리자에게 검수 요청 되었습니다.
캠페인: ${variables['캠페인명']}
모집 기간: ${variables['시작일']} ~ ${variables['마감일']}
모집 인원: ${variables['모집인원']}명
관리자 페이지에서 진행 상황을 확인하실 수 있습니다.
문의: 1833-6025`;

    // ===== 크리에이터용 템플릿 =====
    
    case '025100001011': // 캠페인 선정 완료
      return `[CNEC] 지원하신 캠페인 선정 완료
${variables['크리에이터명']}님, 축하합니다! 지원하신 캠페인에 선정되셨습니다.
캠페인: ${variables['캠페인명']}
크리에이터 대시보드에서 캠페인 준비사항을 체크해 주세요.
촬영 가이드는 2~3일 이내 전달될 예정입니다.
사전 촬영 시 가이드 미준수로 재촬영될 수 있으니 가이드가 도착하면 촬영 시작해 주세요.
문의: 1833-6025`;

    case '025100001012': // 촬영 가이드 전달 알림
      return `[CNEC] 선정되신 캠페인 가이드 전달
${variables['크리에이터명']}님, 선정되신 캠페인의 촬영 가이드가 전달되었습니다.
캠페인: ${variables['캠페인명']}
영상 제출 기한: ${variables['제출기한']}
크리에이터 대시보드에서 가이드를 확인하시고, 가이드에 따라 촬영을 진행해 주세요.
기한 내 미제출 시 패널티가 부과될 수 있습니다.
문의: 1833-6025`;

    case '025100001013': // 영상 제출 기한 3일 전 안내
      return `[CNEC] 참여하신 캠페인 영상 제출 기한 안내
${variables['크리에이터명']}님, 참여하신 캠페인의 영상 제출 기한이 3일 남았습니다.
캠페인: ${variables['캠페인명']}
영상 제출 기한: ${variables['제출기한']}
크리에이터 대시보드에서 촬영한 영상을 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`;

    case '025100001014': // 영상 제출 기한 2일 전 안내
      return `[CNEC] 참여하신 캠페인 영상 제출 기한 임박
${variables['크리에이터명']}님, 참여하신 캠페인의 영상 제출 기한이 2일 남았습니다.
캠페인: ${variables['캠페인명']}
영상 제출 기한: ${variables['제출기한']}
아직 영상이 제출되지 않았습니다. 크리에이터 대시보드에서 빠르게 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`;

    case '025100001015': // 영상 제출 기한 당일 안내
      return `[CNEC] 참여하신 캠페인 영상 제출 마감일
${variables['크리에이터명']}님, 참여하신 캠페인의 영상 제출 기한이 오늘입니다.
캠페인: ${variables['캠페인명']}
영상 제출 기한: ${variables['제출기한']} (오늘)
아직 영상이 제출되지 않았습니다. 오늘 자정까지 크리에이터 대시보드에서 제출해 주세요.
미제출 시 패널티가 부과됩니다.
문의: 1833-6025`;

    case '025100001016': // 영상 수정 요청
      return `[CNEC] 제출하신 영상 수정 요청
${variables['크리에이터명']}님, 제출하신 영상에 수정 요청이 있습니다.
캠페인: ${variables['캠페인명']}
수정 요청일: ${variables['요청일']}
크리에이터 대시보드에서 수정 사항을 확인하시고, 영상을 수정하여 재제출해 주세요.
재제출 기한: ${variables['재제출기한']}
문의: 1833-6025`;

    case '025100001017': // 영상 검수 완료
      return `[CNEC] 제출하신 영상 검수 완료
${variables['크리에이터명']}님, 제출하신 영상 검수가 완료되었습니다.
캠페인: ${variables['캠페인명']}
승인일: ${variables['승인일']}
크리에이터 대시보드에서 최종 가이드를 확인하시고, SNS에 업로드해 주세요.
업로드 기한: ${variables['업로드기한']}
문의: 1833-6025`;

    case '025100001018': // SNS 업로드 기한 3일 전 안내
      return `[CNEC] 참여하신 캠페인 SNS 업로드 기한 안내
${variables['크리에이터명']}님, 참여하신 캠페인의 SNS 업로드 기한이 3일 남았습니다.
캠페인: ${variables['캠페인명']}
SNS 업로드 기한: ${variables['업로드기한']}
크리에이터 대시보드에서 업로드 링크를 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`;

    case '025100001019': // SNS 업로드 기한 2일 전 안내
      return `[CNEC] 참여하신 캠페인 SNS 업로드 기한 임박
${variables['크리에이터명']}님, 참여하신 캠페인의 SNS 업로드 기한이 2일 남았습니다.
캠페인: ${variables['캠페인명']}
SNS 업로드 기한: ${variables['업로드기한']}
아직 업로드가 확인되지 않았습니다. 크리에이터 대시보드에서 빠르게 업로드 링크를 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`;

    case '025100001020': // SNS 업로드 기한 당일 안내
      return `[CNEC] 참여하신 캠페인 SNS 업로드 마감일
${variables['크리에이터명']}님, 참여하신 캠페인의 SNS 업로드 기한이 오늘입니다.
캠페인: ${variables['캠페인명']}
SNS 업로드 기한: ${variables['업로드기한']} (오늘)
아직 업로드가 확인되지 않았습니다. 오늘 자정까지 크리에이터 대시보드에서 업로드 링크를 제출해 주세요.
미제출 시 패널티가 부과됩니다.
문의: 1833-6025`;

    case '025100001021': // 캠페인 최종 완료
      return `[CNEC] 참여하신 캠페인 최종 완료
${variables['크리에이터명']}님, 참여하신 캠페인이 최종 완료되었습니다.
캠페인: ${variables['캠페인명']}
완료일: ${variables['완료일']}
크리에이터 대시보드에서 최종 보고서를 확인하실 수 있습니다.
감사합니다.
문의: 1833-6025`;

    case '025100001022': // 크리에이터 회원가입
      return `[CNEC] 크리에이터 회원가입
${variables['이름']}님 크리에이터 가입을 환영합니다!

앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 크리에이터 프로필을 설정해 주세요.`;

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
