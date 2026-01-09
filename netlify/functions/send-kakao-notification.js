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

// 템플릿별 메시지 생성 함수 (팝빌 형식: #{변수명})
function generateMessage(templateCode, variables) {
  // 엑셀 파일의 템플릿 내용을 그대로 사용
  const templates = {
    '025100000912': `[CNEC] 회원가입
#{회원명}님 가입을 환영합니다.
앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 기업 프로필을 설정해 주세요.`,

    '025100000918': `[CNEC] 캠페인 신청 완료
#{회사명}님, 캠페인 신청이 접수되었습니다.
캠페인: #{캠페인명}
금액: #{금액}원
입금 계좌
IBK기업은행 047-122753-04-011
예금주: 주식회사 하우파파
입금 확인 후 캠페인이 시작됩니다.
문의: 1833-6025`,

    '025100000919': `[CNEC] 입금 확인 완료
#{회사명}님, 입금이 확인되었습니다.
캠페인: #{캠페인명}
충전 포인트: #{포인트}P
캠페인 승인 후 크리에이터 모집이 시작됩니다.
캠페인 확인: https://cnectotal.netlify.app/company/campaigns
문의: 1833-6025`,

    '025100000942': `[CNEC] 포인트 신청 완료
#{회사명}님, 포인트 신청이 접수되었습니다.
금액: #{금액}원
입금 계좌
IBK기업은행 047-122753-04-011
예금주: 주식회사 하우파파
입금 확인 후 포인트가 자동 충전됩니다.
문의: 1833-6025`,

    '025100000943': `[CNEC] 입금 확인 완료
#{회사명}님, 입금이 확인되었습니다.
충전 포인트: #{포인트}P
문의: 1833-6025`,

    '025100001005': `[CNEC]: # "캠페인 초대장이 도착했어요!"

안녕하세요, #{크리에이터명}님!

본 메시지는 #{기업명}에서 신청하신 기업 초대 알림으로, 기업에서 크리에이터님의 캠페인 참여를 요청하신 경우 발송됩니다.

#{기업명}에서 진행하는 캠페인에 귀하는 스타일이 잘 맞습니다.

캠페인 정보
• 캠페인명: #{캠페인명}
• 패키지: #{패키지}
• 보상금: #{보상금}
• 모집 마감: #{마감일}

지원시 확정되는 캠페인 입니다.

기업에서 크리에이터님의 프로필을 확인하고 이 캠페인에 적합하다고 판단하셨습니다.

지금 바로 확인하고 지원하세요!
#{캠페인링크}

※ 이 초대는 #{마감일}까지 유효합니다.`,

    '025100001006': `[CNEC] 신청하신 캠페인 모집 마감
#{회사명}님, 신청하신 캠페인의 크리에이터 모집이 마감되었습니다.
캠페인: #{캠페인명}
지원 크리에이터: #{지원자수}명
관리자 페이지에서 지원한 크리에이터 리스트를 확인하시고, 최종 선정을 진행해 주세요.
문의: 1833-6025`,

    '025100001007': `[CNEC] 신청하신 캠페인 가이드 제출
#{회사명}님, 신청하신 캠페인의 크리에이터가 콘텐츠 가이드를 제출했습니다.
캠페인: #{캠페인명}
크리에이터: #{크리에이터명}
관리자 페이지에서 가이드 내용을 검토하시고, 
승인 또는 수정 요청을 진행해 주세요.
가이드 검토가 완료 되시면 
크리에이터에게 전달하여 촬영에 들어 가겠습니다.
문의: 1833-6025`,

    '025100001008': `[CNEC] 신청하신 캠페인 영상 제출
#{회사명}님, 신청하신 캠페인의 크리에이터가 촬영 영상을 제출했습니다.
캠페인: #{캠페인명}
크리에이터: #{크리에이터명}
관리자 페이지에서 영상을 검토하시고, 수정 사항이 있으면 피드백을 남겨주세요.
검수 완료 후 sns 업로드 될 예정입니다.
문의: 1833-6025`,

    '025100001009': `[CNEC] 신청하신 캠페인 최종 완료
#{회사명}님, 신청하신 캠페인의 크리에이터가 최종 영상 수정을 완료하고 SNS에 업로드했습니다.
캠페인: #{캠페인명}
관리자 페이지에서 최종 보고서와 성과 지표를 확인해 주세요.
캠페인이 성공적으로 완료되었습니다. 
감사합니다.
문의: 1833-6025`,

    '025100001010': `[CNEC] 캠페인 검수 신청
#{회사명}님, 신청하신 캠페인이 관리자에게 검수 요청 되었습니다.
캠페인: #{캠페인명}
모집 기간: #{시작일} ~ #{마감일}
모집 인원: #{모집인원}명
관리자 페이지에서 진행 상황을 확인하실 수 있습니다.
문의: 1833-6025`,

    '025100001011': `[CNEC] 지원하신 캠페인 선정 완료
#{크리에이터명}님, 축하합니다! 지원하신 캠페인에 선정되셨습니다.
캠페인: #{캠페인명}
크리에이터 대시보드에서 캠페인 준비사항을 체크해 주세요.
촬영 가이드는 2~3일 이내 전달될 예정입니다.
사전 촬영 시 가이드 미준수로 재촬영될 수 있으니 가이드가 도착하면 촬영 시작해 주세요.
문의: 1833-6025`,

    '025100001012': `[CNEC] 선정되신 캠페인 가이드 전달
#{크리에이터명}님, 선정되신 캠페인의 촬영 가이드가 전달되었습니다.
캠페인: #{캠페인명}
영상 제출 기한: #{제출기한}
크리에이터 대시보드에서 가이드를 확인하시고, 가이드에 따라 촬영을 진행해 주세요.
기한 내 미제출 시 패널티가 부과될 수 있습니다.
문의: 1833-6025`,

    '025100001013': `[CNEC] 참여하신 캠페인 영상 제출 기한 안내
#{크리에이터명}님, 참여하신 캠페인의 영상 제출 기한이 3일 남았습니다.
캠페인: #{캠페인명}
영상 제출 기한: #{제출기한}
크리에이터 대시보드에서 촬영한 영상을 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`,

    '025100001014': `[CNEC] 참여하신 캠페인 영상 제출 기한 임박
#{크리에이터명}님, 참여하신 캠페인의 영상 제출 기한이 2일 남았습니다.
캠페인: #{캠페인명}
영상 제출 기한: #{제출기한}
아직 영상이 제출되지 않았습니다. 크리에이터 대시보드에서 빠르게 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`,

    '025100001015': `[CNEC] 참여하신 캠페인 영상 제출 마감일
#{크리에이터명}님, 참여하신 캠페인의 영상 제출 기한이 오늘입니다.
캠페인: #{캠페인명}
영상 제출 기한: #{제출기한} (오늘)
아직 영상이 제출되지 않았습니다. 오늘 자정까지 크리에이터 대시보드에서 제출해 주세요.
미제출 시 패널티가 부과됩니다.
문의: 1833-6025`,

    '025100001016': `[CNEC] 제출하신 영상 수정 요청

#{크리에이터명}님, 제출하신 영상에 수정 요청이 있습니다.

캠페인: #{캠페인명}
수정 요청일: #{요청일}

크리에이터 대시보드에서 수정 사항을 확인하시고, 영상을 수정하여 재제출해 주세요.

재제출 기한: #{재제출기한}

문의: 1833-6025`,

    '025100001017': `[CNEC] 제출하신 영상 승인 완료

#{크리에이터명}님, 제출하신 영상이 최종 승인되었습니다.

캠페인: #{캠페인명}

이제 SNS에 영상을 업로드해 주세요. 업로드 완료 후 크리에이터 대시보드에서 업로드 링크를 등록해 주시기 바랍니다.

업로드 기한: #{업로드기한}

문의: 1833-6025`,

    '025100001018': `[CNEC] 참여하신 캠페인 SNS 업로드 기한 안내
#{크리에이터명}님, 참여하신 캠페인의 SNS 업로드 기한이 3일 남았습니다.
캠페인: #{캠페인명}
SNS 업로드 기한: #{업로드기한}
크리에이터 대시보드에서 업로드 링크를 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`,

    '025100001019': `[CNEC] 참여하신 캠페인 SNS 업로드 기한 임박
#{크리에이터명}님, 참여하신 캠페인의 SNS 업로드 기한이 2일 남았습니다.
캠페인: #{캠페인명}
SNS 업로드 기한: #{업로드기한}
아직 업로드가 확인되지 않았습니다. 크리에이터 대시보드에서 빠르게 업로드 링크를 제출해 주세요.
기한 내 미제출 시 패널티가 부과됩니다.
문의: 1833-6025`,

    '025100001020': `[CNEC] 참여하신 캠페인 SNS 업로드 마감일
#{크리에이터명}님, 참여하신 캠페인의 SNS 업로드 기한이 오늘입니다.
캠페인: #{캠페인명}
SNS 업로드 기한: #{업로드기한} (오늘)
아직 업로드가 확인되지 않았습니다. 오늘 자정까지 크리에이터 대시보드에서 업로드 링크를 제출해 주세요.
미제출 시 패널티가 부과됩니다.
문의: 1833-6025`,

    '025100001021': `[CNEC] 참여하신 캠페인 최종 완료
#{크리에이터명}님, 참여하신 캠페인이 최종 완료되었습니다.
캠페인: #{캠페인명}
완료일: #{완료일}
크리에이터 대시보드에서 최종 보고서를 확인하실 수 있습니다.
감사합니다.
문의: 1833-6025`,

    '025100001022': `[CNEC] 크리에이터 회원가입
#{이름}님 크리에이터 가입을 환영합니다!

앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 크리에이터 프로필을 설정해 주세요.`,

    // 크리에이터 프로필 등록 요청 (일괄 발송용)
    '025120000931': `[크넥] 기업의 주목도를 3배 높이는 프로필 설정, 하셨나요?

안녕하세요, #{회원명}님 회원 가입을 축하 드립니다.

기업들이 #{회원명}님의 역량을 한눈에 파악하고 더 많은 기회를 제안할 수 있도록 프로필을 완성해주세요.

특히, 프로필 사진은 기업의 제안율을 높이는 가장 중요한 요소입니다.
지금 바로 사진을 등록하고 기업의 러브콜을 받아보세요!

지금 해야 할 일:
프로필 사진 등록 (필수!)
피부타입 및 sns 정보 입력!

기업은 크리에이터의 프로필을 확인이 가능합니다.

프로필이 없을 경우 지원시 선정률이 낮을 수 있습니다.`,

    '025110000798': `[CNEC] 캠페인 지원 요청
#{크리에이터명}님, #{기업명}에서 캠페인 지원 요청을 보냈습니다.
캠페인: #{캠페인명}
보상: #{보상금액}원
마감일: #{마감일}

지금 바로 지원하고 캠페인에 참여하세요!
지원하기: https://cnectotal.netlify.app/creator/campaigns/#{캠페인ID}
문의: 1833-6025`,

    '025110000797': `[CNEC] 추천 크리에이터 지원 알림
#{기업명}님, 추천 크리에이터가 캠페인에 지원했습니다.
캠페인: #{캠페인명}
크리에이터: #{크리에이터명}
팔로워: #{팔로워수}

관리자 페이지에서 프로필을 확인하고 선정해 주세요.
지원자 확인: https://cnectotal.netlify.app/company/campaigns/#{캠페인ID}
문의: 1833-6025`,

    '025110000796': `[CNEC] 지원하신 캠페인 선정 취소
#{크리에이터명}님, 죄송합니다.
선정이 취소 되었습니다.

캠페인: #{캠페인명} 이

기업측의 #{사유} 로 인해 취소 되었습니다.

문의: 1833-6025`,

    // 크리에이터 캠페인 초대장 (크넥 추천 크리에이터용)
    '025110001005': `[CNEC]: # "캠페인 초대장이 도착했어요!"

안녕하세요, #{크리에이터명}님!

본 메시지는 고객님께서 신청하신 기업 초대 알림으로, 기업에서 크리에이터님의 캠페인 참여를 요청한 경우 발송됩니다.

#{기업명}에서 진행하는 캠페인에 귀하를 초대했습니다.

캠페인 정보
• 캠페인명: #{캠페인명}
• 패키지: #{패키지타입}
• 보상금: #{보상금액}원
• 모집 마감: #{마감일}

지원시 확정되는 캠페인 입니다.

기업에서 크리에이터님의 프로필을 확인하고 이 캠페인에 적합하다고 판단했습니다.

지금 바로 확인하고 지원하세요!
#{캠페인링크}

※ 이 초대는 #{만료일}까지 유효합니다.`,

    // 기업용: 추천 크리에이터 지원 완료 알림
    '025110000797': `[CNEC]: # "초대한 크리에이터가 지원했어요!"

안녕하세요, #{기업명}님!

귀하가 초대한 크리에이터가 캠페인에 지원했습니다.

크리에이터 정보
• 이름: #{크리에이터명}
• 주요 채널: #{주요채널}
• 팔로워: #{팔로워수}명

캠페인: #{캠페인명}

지금 바로 프로필을 확인하고 선정해 주세요!
#{캠페인관리링크}

※ 빠른 선정이 우수한 크리에이터 확보에 유리합니다.`
  };

  let message = templates[templateCode];
  
  if (!message) {
    console.error(`[ERROR] Template not found: ${templateCode}`);
    return null;
  }

  // 변수 치환: #{변수명} -> 실제 값
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `#{${key}}`;
    message = message.replace(new RegExp(placeholder, 'g'), value);
  }

  return message;
}

exports.handler = async (event) => {
  try {
    const { receiverNum, receiverName, templateCode, variables } = JSON.parse(event.body);

    console.log('[INFO] Kakao notification request:', {
      receiverNum,
      receiverName,
      templateCode,
      variables
    });

    if (!receiverNum || !templateCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '수신자 번호와 템플릿 코드는 필수입니다.'
        })
      };
    }

    // 메시지 생성
    const message = generateMessage(templateCode, variables || {});
    
    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: `템플릿 코드 ${templateCode}를 찾을 수 없습니다.`
        })
      };
    }

    console.log('[INFO] Generated message:', message);

    // 팝빌 알림톡 발송
    const receiptNum = Date.now().toString();

    // 템플릿 코드에 따라 plusFriendID 결정
    // 기업용 템플릿: @크넥 (025100000912~025100001010)
    // 크리에이터용 템플릿: @크넥_크리에이터 (025100001011~025100001022, 025110000796~)
    const companyTemplates = [
      '025100000912', '025100000918', '025100000919', '025100000942', '025100000943',
      '025100001005', '025100001006', '025100001007', '025100001008', '025100001009', '025100001010'
    ];
    const plusFriendID = companyTemplates.includes(templateCode) ? '@크넥' : '@크넥_크리에이터';

    const kakaoMessage = {
      plusFriendID: plusFriendID,
      templateCode: templateCode,
      receiverNum: receiverNum,
      receiverName: receiverName || '',
      content: message,
      altContent: message, // 대체 문자 내용
      altSendType: 'C', // 대체문자 전송타입 (C: 알림톡과 동일한 내용, A: 대체문자 내용)
      senderNum: POPBILL_SENDER_NUM,
      requestNum: receiptNum
    };

    console.log('[INFO] Sending Kakao message:', kakaoMessage);
    console.log('[INFO] Using plusFriendID:', plusFriendID);

    // 수신자 정보 배열 (sendATS용)
    const receivers = [{
      rcv: receiverNum,
      rcvnm: receiverName || ''
    }];

    // 팝빌 API 호출 - sendATS로 plusFriendID 명시적 지정
    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS(
        POPBILL_CORP_NUM,
        templateCode,
        POPBILL_SENDER_NUM,
        message,
        message, // altContent
        'C', // altSendType: C=동일내용
        '', // sndDT (예약시간, 빈값=즉시발송)
        receivers,
        POPBILL_USER_ID,
        '', // requestNum
        null, // btns
        plusFriendID, // 채널 ID 명시적 지정
        (receiptNum) => {
          console.log('[SUCCESS] Popbill API result:', receiptNum);
          resolve({ receiptNum });
        },
        (error) => {
          console.error('[ERROR] Popbill API error:', error);
          reject(error);
        }
      );
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        receiptNum: receiptNum,
        result: result
      })
    };

  } catch (error) {
    console.error('[ERROR] Kakao notification error:', error);

    // 상세 오류 정보 반환 (디버깅용)
    const errorDetails = {
      success: false,
      error: error.message || 'Unknown error',
      code: error.code || null,
      debug: {
        templateCode: error.templateCode || templateCode,
        plusFriendID: error.plusFriendID || plusFriendID,
        receiverNum: receiverNum ? receiverNum.slice(0, 3) + '****' + receiverNum.slice(-4) : null,
        timestamp: new Date().toISOString()
      }
    };

    // 팝빌 에러 코드 해석
    if (error.code) {
      const errorCodeMessages = {
        '-99999999': '팝빌 서버 연결 실패',
        '-20010': '수신번호 형식 오류',
        '-20011': '수신번호 미입력',
        '-20001': '템플릿 코드 미등록',
        '-20002': '템플릿 내용 불일치',
        '-20003': '템플릿 변수 불일치',
        '-20004': '발신번호 미등록',
        '-20005': '카카오채널 미연동',
        '-20006': '잔액 부족',
        '-99000020': '템플릿 내용 불일치 (공백/줄바꿈 포함 정확히 일치해야 함)',
        '-11000004': '템플릿 미승인 또는 반려',
        '-99000015': '카카오톡 발송 실패로 대체문자 발송됨'
      };
      errorDetails.errorDescription = errorCodeMessages[error.code] || `알 수 없는 오류 코드: ${error.code}`;
    }

    console.error('[ERROR] Error details:', JSON.stringify(errorDetails, null, 2));

    return {
      statusCode: 500,
      body: JSON.stringify(errorDetails)
    };
  }
};
