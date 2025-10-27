/**
 * 팝빌 API 서비스
 * 
 * 세금계산서, 현금영수증, 전자명세서, 계좌조회, 카카오톡, 문자 발송 기능 제공
 */

import popbill from 'popbill';

// 환경 변수에서 팝빌 인증 정보 가져오기
const POPBILL_LINK_ID = import.meta.env.VITE_POPBILL_LINK_ID || '';
const POPBILL_SECRET_KEY = import.meta.env.VITE_POPBILL_SECRET_KEY || '';
const POPBILL_TEST_MODE = import.meta.env.VITE_POPBILL_TEST_MODE === 'true';

/**
 * 세금계산서 서비스
 */
export const taxinvoiceService = new popbill.TaxinvoiceService(
  POPBILL_LINK_ID,
  POPBILL_SECRET_KEY
);

// 테스트 모드 설정
taxinvoiceService.setIsTest(POPBILL_TEST_MODE);

/**
 * 현금영수증 서비스
 */
export const cashbillService = new popbill.CashbillService(
  POPBILL_LINK_ID,
  POPBILL_SECRET_KEY
);

cashbillService.setIsTest(POPBILL_TEST_MODE);

/**
 * 전자명세서 서비스
 */
export const statementService = new popbill.StatementService(
  POPBILL_LINK_ID,
  POPBILL_SECRET_KEY
);

statementService.setIsTest(POPBILL_TEST_MODE);

/**
 * 계좌조회 서비스
 */
export const easybankService = new popbill.EasyFinBankService(
  POPBILL_LINK_ID,
  POPBILL_SECRET_KEY
);

easybankService.setIsTest(POPBILL_TEST_MODE);

/**
 * 카카오톡 서비스
 */
export const kakaoService = new popbill.KakaoService(
  POPBILL_LINK_ID,
  POPBILL_SECRET_KEY
);

kakaoService.setIsTest(POPBILL_TEST_MODE);

/**
 * 문자 서비스
 */
export const messageService = new popbill.MessageService(
  POPBILL_LINK_ID,
  POPBILL_SECRET_KEY
);

messageService.setIsTest(POPBILL_TEST_MODE);

/**
 * 팩스 서비스 (선택)
 */
export const faxService = new popbill.FaxService(
  POPBILL_LINK_ID,
  POPBILL_SECRET_KEY
);

faxService.setIsTest(POPBILL_TEST_MODE);

/**
 * 팝빌 포인트 조회
 */
export const getPopbillBalance = (corpNum) => {
  return new Promise((resolve, reject) => {
    taxinvoiceService.getBalance(corpNum, (balance, error) => {
      if (error) {
        reject(error);
      } else {
        resolve(balance);
      }
    });
  });
};

/**
 * 팝빌 파트너 포인트 조회
 */
export const getPartnerBalance = (corpNum) => {
  return new Promise((resolve, reject) => {
    taxinvoiceService.getPartnerBalance(corpNum, (balance, error) => {
      if (error) {
        reject(error);
      } else {
        resolve(balance);
      }
    });
  });
};

/**
 * 팝빌 URL 생성 (팝업, 인쇄 등)
 */
export const getPopbillURL = (service, corpNum, userID, urlType) => {
  return new Promise((resolve, reject) => {
    service.getURL(corpNum, userID, urlType, (url, error) => {
      if (error) {
        reject(error);
      } else {
        resolve(url);
      }
    });
  });
};

export default {
  taxinvoiceService,
  cashbillService,
  statementService,
  easybankService,
  kakaoService,
  messageService,
  faxService,
  getPopbillBalance,
  getPartnerBalance,
  getPopbillURL,
};

