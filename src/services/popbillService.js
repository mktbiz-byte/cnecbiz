// 팝빌 카카오톡 알림톡 서비스
// Note: popbill은 CommonJS 모듈이므로 dynamic import 사용

let kakaoService = null;
let isInitialized = false;

// 팝빌 SDK 초기화
async function initializePopbill() {
  if (isInitialized) return kakaoService;

  try {
    // Dynamic import for CommonJS module
    const popbill = await import('popbill');
    
    // 팝빌 설정
    popbill.default.config({
      // 링크아이디 (환경변수에서 가져오기)
      LinkID: import.meta.env.VITE_POPBILL_LINK_ID || '',
      
      // 비밀키 (환경변수에서 가져오기)
      SecretKey: import.meta.env.VITE_POPBILL_SECRET_KEY || '',
      
      // 연동환경 설정 (true: 테스트, false: 운영)
      IsTest: import.meta.env.VITE_POPBILL_IS_TEST === 'true',
      
      // 통신 IP 고정
      IPRestrictOnOff: true,
      
      // 팝빌 API 서비스 고정 IP 사용여부
      UseStaticIP: false,
      
      // 로컬시스템 시간 사용여부
      UseLocalTimeYN: true,
      
      defaultErrorHandler: function (error) {
        console.error('Popbill Error:', error.code, error.message);
      }
    });
    
    // 카카오톡 서비스 객체 생성
    kakaoService = popbill.default.KakaoService();
    isInitialized = true;
    
    console.log('Popbill Kakao Service initialized');
    return kakaoService;
  } catch (error) {
    console.error('Failed to initialize Popbill:', error);
    throw error;
  }
}

/**
 * 알림톡 전송 함수
 * @param {Object} params - 알림톡 전송 파라미터
 * @param {string} params.templateCode - 알림톡 템플릿 코드
 * @param {string} params.receiverNum - 수신번호
 * @param {string} params.receiverName - 수신자 이름
 * @param {Object} params.templateParams - 템플릿 변수 (key-value)
 * @param {string} params.senderNum - 발신번호 (선택, 기본값: 환경변수)
 * @param {string} params.altContent - 대체문자 내용 (선택)
 * @param {string} params.requestNum - 요청번호 (선택)
 * @returns {Promise<string>} 접수번호
 */
export async function sendAlimtalk({
  templateCode,
  receiverNum,
  receiverName,
  templateParams = {},
  senderNum = null,
  altContent = '',
  requestNum = ''
}) {
  try {
    // 팝빌 초기화
    const service = await initializePopbill();
    
    // 사업자번호 (환경변수에서 가져오기)
    const corpNum = import.meta.env.VITE_POPBILL_CORP_NUM || '';
    
    // 발신번호 (파라미터 또는 환경변수)
    const snd = senderNum || import.meta.env.VITE_POPBILL_SENDER_NUM || '';
    
    // 템플릿 내용 생성 (템플릿 변수 치환)
    let content = await getTemplateContent(templateCode, templateParams);
    
    // 대체문자 유형 (C: 알림톡 내용, A: 대체문자 내용)
    const altSendType = altContent ? 'A' : 'C';
    
    // 예약일시 (즉시 전송)
    const sndDT = '';
    
    // 버튼 정보 (템플릿 기본값 사용)
    const btns = null;
    
    // 팝빌 회원 아이디 (선택)
    const userId = '';
    
    return new Promise((resolve, reject) => {
      service.sendATS_one(
        corpNum,
        templateCode,
        snd,
        content,
        altContent,
        altSendType,
        sndDT,
        receiverNum,
        receiverName,
        userId,
        requestNum,
        btns,
        (receiptNum) => {
          console.log('Alimtalk sent successfully:', receiptNum);
          resolve(receiptNum);
        },
        (error) => {
          console.error('Failed to send alimtalk:', error);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error in sendAlimtalk:', error);
    throw error;
  }
}

/**
 * 템플릿 내용 생성 (템플릿 변수 치환)
 * @param {string} templateCode - 템플릿 코드
 * @param {Object} params - 템플릿 변수
 * @returns {Promise<string>} 치환된 템플릿 내용
 */
async function getTemplateContent(templateCode, params) {
  // 템플릿별 내용 정의
  const templates = {
    // 기업용 템플릿
    '25100000912': `안녕하세요 #{회원명}님!
크넥(CNEC)에 가입해 주셔서 감사합니다.

크넥은 기업과 크리에이터를 연결하는 플랫폼입니다.
지금 바로 캠페인을 시작해보세요!`,

    '25100000918': `안녕하세요 #{회사명}님,

#{캠페인명} 캠페인 신청이 완료되었습니다.
아래 계좌로 입금해주시면 검수가 시작됩니다.

입금 금액: #{금액}원
입금 계좌: [계좌 정보]

입금 확인 후 캠페인 검수를 진행하겠습니다.`,

    '25100000943': `안녕하세요 #{회사명}님,

포인트 충전이 완료되었습니다.
충전 포인트: #{포인트}P

지금 바로 캠페인을 시작해보세요!`,

    '25100001005': `안녕하세요 #{회사명}님,

#{캠페인명} 캠페인이 승인되었습니다!
크리에이터 모집이 시작되었습니다.

모집 기간: #{시작일} ~ #{마감일}
모집 인원: #{모집인원}명

많은 크리에이터들의 지원을 기다립니다!`,

    '25100001006': `안녕하세요 #{회사명}님,

#{캠페인명} 캠페인 모집이 마감되었습니다.
총 #{지원자수}명의 크리에이터가 지원했습니다.

크리에이터 선정을 진행해주세요.`,

    '25100001007': `안녕하세요 #{회사명}님,

#{크리에이터명} 크리에이터가 #{캠페인명} 캠페인 가이드를 제출했습니다.

검수를 진행해주세요.`,

    '25100001008': `안녕하세요 #{회사명}님,

#{크리에이터명} 크리에이터가 #{캠페인명} 캠페인 영상을 제출했습니다.

검수를 진행해주세요.`,

    '25100001009': `안녕하세요 #{회사명}님,

#{캠페인명} 캠페인이 최종 완료되었습니다!

보고서를 확인해주세요.`,

    '25100001010': `안녕하세요 #{회사명}님,

#{캠페인명} 캠페인 검수 신청이 접수되었습니다.

모집 기간: #{시작일} ~ #{마감일}
모집 인원: #{모집인원}명

검수 완료 후 알려드리겠습니다.`,

    // 크리에이터용 템플릿
    '25100001022': `안녕하세요 #{이름}님!
크넥(CNEC) 크리에이터로 가입해 주셔서 감사합니다.

다양한 캠페인에 참여하여 수익을 창출해보세요!`,

    '25100001011': `축하합니다 #{크리에이터명}님!

#{캠페인명} 캠페인에 선정되셨습니다!
촬영 가이드를 확인하고 준비해주세요.`,

    '25100001012': `안녕하세요 #{크리에이터명}님,

#{캠페인명} 캠페인 촬영 가이드가 전달되었습니다.

제출 기한: #{제출기한}

기한 내에 가이드를 제출해주세요.`,

    '25100001013': `안녕하세요 #{크리에이터명}님,

#{캠페인명} 캠페인 영상 제출 기한이 3일 남았습니다.

제출 기한: #{제출기한}

기한 내에 영상을 제출해주세요.`,

    '25100001014': `안녕하세요 #{크리에이터명}님,

#{캠페인명} 캠페인 영상 제출 기한이 2일 남았습니다.

제출 기한: #{제출기한}

기한 내에 영상을 제출해주세요.`,

    '25100001015': `[긴급] #{크리에이터명}님,

#{캠페인명} 캠페인 영상 제출 기한이 오늘입니다!

제출 기한: #{제출기한}

지금 바로 영상을 제출해주세요.`,

    '25100001016': `안녕하세요 #{크리에이터명}님,

#{캠페인명} 캠페인 영상 수정이 요청되었습니다.

요청일: #{요청일}
재제출 기한: #{재제출기한}

수정 사항을 확인하고 재제출해주세요.`,

    '25100001017': `축하합니다 #{크리에이터명}님!

#{캠페인명} 캠페인 영상이 승인되었습니다!

업로드 기한: #{업로드기한}

SNS에 업로드하고 링크를 등록해주세요.`,

    '25100001018': `안녕하세요 #{크리에이터명}님,

#{캠페인명} 캠페인이 완료되어 포인트가 지급되었습니다!

완료일: #{완료일}

수고하셨습니다!`,

    '25100001019': `안녕하세요 #{크리에이터명}님,

출금 신청이 접수되었습니다.

출금 금액: #{출금금액}원
신청일: #{신청일}

영업일 기준 3~5일 내에 처리됩니다.`,

    '25100001020': `안녕하세요 #{크리에이터명}님,

출금이 완료되었습니다!

입금일: #{입금일}

계좌를 확인해주세요.`,

    '25100001021': `[경고] #{크리에이터명}님,

#{캠페인명} 캠페인 제출 기한이 지연되었습니다.

제출 기한: #{제출기한}

패널티가 부과될 수 있으니 빠른 제출 부탁드립니다.`
  };

  // 템플릿 내용 가져오기
  let content = templates[templateCode] || '';
  
  // 템플릿 변수 치환
  Object.keys(params).forEach(key => {
    const regex = new RegExp(`#{${key}}`, 'g');
    content = content.replace(regex, params[key]);
  });
  
  return content;
}

/**
 * 대량 알림톡 전송 함수
 * @param {Object} params - 알림톡 전송 파라미터
 * @param {string} params.templateCode - 알림톡 템플릿 코드
 * @param {Array} params.receivers - 수신자 목록 [{num, name, templateParams}]
 * @param {string} params.senderNum - 발신번호 (선택)
 * @param {string} params.altContent - 대체문자 내용 (선택)
 * @returns {Promise<string>} 접수번호
 */
export async function sendBulkAlimtalk({
  templateCode,
  receivers,
  senderNum = null,
  altContent = ''
}) {
  try {
    // 팝빌 초기화
    const service = await initializePopbill();
    
    // 사업자번호
    const corpNum = import.meta.env.VITE_POPBILL_CORP_NUM || '';
    
    // 발신번호
    const snd = senderNum || import.meta.env.VITE_POPBILL_SENDER_NUM || '';
    
    // 대체문자 유형
    const altSendType = altContent ? 'A' : 'C';
    
    // 예약일시
    const sndDT = '';
    
    // 수신자 목록 구성
    const messages = await Promise.all(
      receivers.map(async (receiver) => {
        const content = await getTemplateContent(templateCode, receiver.templateParams || {});
        return {
          rcv: receiver.num,
          rcvnm: receiver.name,
          msg: content,
          altmsg: altContent
        };
      })
    );
    
    // 팝빌 회원 아이디
    const userId = '';
    
    // 요청번호
    const requestNum = '';
    
    return new Promise((resolve, reject) => {
      service.sendATS(
        corpNum,
        templateCode,
        snd,
        messages,
        altSendType,
        sndDT,
        userId,
        requestNum,
        (receiptNum) => {
          console.log('Bulk alimtalk sent successfully:', receiptNum);
          resolve(receiptNum);
        },
        (error) => {
          console.error('Failed to send bulk alimtalk:', error);
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error in sendBulkAlimtalk:', error);
    throw error;
  }
}

export default {
  sendAlimtalk,
  sendBulkAlimtalk
};
