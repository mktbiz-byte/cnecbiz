/**
 * 팝빌 API 헬퍼 함수
 * 
 * 세금계산서, 현금영수증, 전자명세서 발행 및 관리 함수 제공
 */

import {
  taxinvoiceService,
  cashbillService,
  statementService,
  easybankService,
  kakaoService,
  messageService,
} from './popbillService';

/**
 * 세금계산서 즉시 발행
 * 
 * @param {string} corpNum - 사업자번호
 * @param {object} taxinvoice - 세금계산서 정보
 * @returns {Promise<object>} 발행 결과
 */
export const issueTaxinvoice = async (corpNum, taxinvoice) => {
  return new Promise((resolve, reject) => {
    taxinvoiceService.registIssue(corpNum, taxinvoice, (response, error) => {
      if (error) {
        console.error('[Popbill] 세금계산서 발행 실패:', error);
        reject(error);
      } else {
        console.log('[Popbill] 세금계산서 발행 성공:', response);
        resolve(response);
      }
    });
  });
};

/**
 * 현금영수증 즉시 발행
 * 
 * @param {string} corpNum - 사업자번호
 * @param {object} cashbill - 현금영수증 정보
 * @returns {Promise<object>} 발행 결과
 */
export const issueCashbill = async (corpNum, cashbill) => {
  return new Promise((resolve, reject) => {
    cashbillService.registIssue(corpNum, cashbill, (response, error) => {
      if (error) {
        console.error('[Popbill] 현금영수증 발행 실패:', error);
        reject(error);
      } else {
        console.log('[Popbill] 현금영수증 발행 성공:', response);
        resolve(response);
      }
    });
  });
};

/**
 * 전자명세서 즉시 발행
 * 
 * @param {string} corpNum - 사업자번호
 * @param {number} itemCode - 명세서 코드 (121: 거래명세서, 122: 청구서, 123: 견적서 등)
 * @param {object} statement - 전자명세서 정보
 * @returns {Promise<object>} 발행 결과
 */
export const issueStatement = async (corpNum, itemCode, statement) => {
  return new Promise((resolve, reject) => {
    statementService.registIssue(corpNum, itemCode, statement, (response, error) => {
      if (error) {
        console.error('[Popbill] 전자명세서 발행 실패:', error);
        reject(error);
      } else {
        console.log('[Popbill] 전자명세서 발행 성공:', response);
        resolve(response);
      }
    });
  });
};

/**
 * 계좌 거래내역 조회
 * 
 * @param {string} corpNum - 사업자번호
 * @param {string} bankCode - 은행코드
 * @param {string} accountNum - 계좌번호
 * @param {string} sDate - 시작일 (yyyyMMdd)
 * @param {string} eDate - 종료일 (yyyyMMdd)
 * @returns {Promise<object>} 거래내역
 */
export const searchBankTransactions = async (corpNum, bankCode, accountNum, sDate, eDate) => {
  return new Promise((resolve, reject) => {
    easybankService.search(corpNum, bankCode, accountNum, sDate, eDate, '', '', (result, error) => {
      if (error) {
        console.error('[Popbill] 계좌 거래내역 조회 실패:', error);
        reject(error);
      } else {
        console.log('[Popbill] 계좌 거래내역 조회 성공:', result);
        resolve(result);
      }
    });
  });
};

/**
 * 카카오톡 알림톡 발송
 * 
 * @param {string} corpNum - 사업자번호
 * @param {string} templateCode - 템플릿 코드
 * @param {string} receiver - 수신자 전화번호
 * @param {object} message - 메시지 내용
 * @returns {Promise<object>} 발송 결과
 */
export const sendKakaoAlimtalk = async (corpNum, templateCode, receiver, message) => {
  return new Promise((resolve, reject) => {
    const kakaoMessage = {
      plusFriendID: message.plusFriendID || '',
      templateCode: templateCode,
      receiverNum: receiver,
      receiverName: message.receiverName || '',
      content: message.content,
      altContent: message.altContent || message.content, // 대체 문자
      altSendType: message.altSendType || 'C', // C: 알림톡 실패 시 문자 전송
      sndDT: message.sndDT || '', // 예약일시 (yyyyMMddHHmmss)
      btns: message.btns || [], // 버튼 정보
    };

    kakaoService.sendATS(corpNum, kakaoMessage, (response, error) => {
      if (error) {
        console.error('[Popbill] 카카오톡 알림톡 발송 실패:', error);
        reject(error);
      } else {
        console.log('[Popbill] 카카오톡 알림톡 발송 성공:', response);
        resolve(response);
      }
    });
  });
};

/**
 * 문자(SMS/LMS) 발송
 * 
 * @param {string} corpNum - 사업자번호
 * @param {string} sender - 발신번호
 * @param {string} receiver - 수신번호
 * @param {string} content - 메시지 내용
 * @param {string} type - 'SMS' 또는 'LMS'
 * @returns {Promise<object>} 발송 결과
 */
export const sendMessage = async (corpNum, sender, receiver, content, type = 'SMS') => {
  return new Promise((resolve, reject) => {
    const message = {
      snd: sender,
      rcv: receiver,
      msg: content,
      sjt: type === 'LMS' ? '제목' : '', // LMS는 제목 필요
    };

    const sendMethod = type === 'SMS' ? 'sendSMS' : 'sendLMS';

    messageService[sendMethod](corpNum, sender, receiver, content, '', (response, error) => {
      if (error) {
        console.error(`[Popbill] ${type} 발송 실패:`, error);
        reject(error);
      } else {
        console.log(`[Popbill] ${type} 발송 성공:`, response);
        resolve(response);
      }
    });
  });
};

/**
 * 입금 확인 및 자동 처리
 * 
 * @param {string} corpNum - 사업자번호
 * @param {string} bankCode - 은행코드
 * @param {string} accountNum - 계좌번호
 * @param {number} expectedAmount - 예상 입금 금액
 * @param {string} sDate - 시작일
 * @param {string} eDate - 종료일
 * @returns {Promise<object>} 입금 내역
 */
export const checkDeposit = async (corpNum, bankCode, accountNum, expectedAmount, sDate, eDate) => {
  try {
    const result = await searchBankTransactions(corpNum, bankCode, accountNum, sDate, eDate);
    
    // 입금 내역 필터링
    const deposits = result.list.filter(transaction => {
      return (
        transaction.tradeType === '입금' &&
        parseInt(transaction.tradeBalance) === expectedAmount
      );
    });

    return deposits;
  } catch (error) {
    console.error('[Popbill] 입금 확인 실패:', error);
    throw error;
  }
};

/**
 * 세금계산서 정보 생성 헬퍼
 * 
 * @param {object} data - 세금계산서 데이터
 * @returns {object} 팝빌 세금계산서 객체
 */
export const createTaxinvoiceData = (data) => {
  return {
    // 필수 항목
    writeDate: data.writeDate || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    chargeDirection: data.chargeDirection || '정과금',
    issueType: data.issueType || '정발행',
    purposeType: data.purposeType || '영수',
    taxType: data.taxType || '과세',

    // 공급자 정보
    invoicerCorpNum: data.invoicerCorpNum,
    invoicerCorpName: data.invoicerCorpName,
    invoicerCEOName: data.invoicerCEOName,
    invoicerAddr: data.invoicerAddr,
    invoicerBizClass: data.invoicerBizClass || '',
    invoicerBizType: data.invoicerBizType || '',
    invoicerContactName: data.invoicerContactName || '',
    invoicerEmail: data.invoicerEmail,
    invoicerTEL: data.invoicerTEL || '',
    invoicerHP: data.invoicerHP || '',

    // 공급받는자 정보
    invoiceeCorpNum: data.invoiceeCorpNum,
    invoiceeCorpName: data.invoiceeCorpName,
    invoiceeCEOName: data.invoiceeCEOName,
    invoiceeAddr: data.invoiceeAddr,
    invoiceeBizClass: data.invoiceeBizClass || '',
    invoiceeBizType: data.invoiceeBizType || '',
    invoiceeContactName1: data.invoiceeContactName || '',
    invoiceeEmail1: data.invoiceeEmail,
    invoiceeTEL1: data.invoiceeTEL || '',
    invoiceeHP1: data.invoiceeHP || '',

    // 금액 정보
    supplyCostTotal: data.supplyCostTotal.toString(),
    taxTotal: data.taxTotal.toString(),
    totalAmount: data.totalAmount.toString(),

    // 품목 정보
    detailList: data.detailList.map((item, index) => ({
      serialNum: index + 1,
      itemName: item.itemName,
      purchaseDT: item.purchaseDT || '',
      qty: item.qty ? item.qty.toString() : '1',
      unitCost: item.unitCost ? item.unitCost.toString() : '',
      supplyCost: item.supplyCost.toString(),
      tax: item.tax.toString(),
      remark: item.remark || '',
    })),

    // 추가 정보
    modifyCode: data.modifyCode || '',
    originalTaxinvoiceKey: data.originalTaxinvoiceKey || '',
    remark1: data.remark1 || '',
    remark2: data.remark2 || '',
    remark3: data.remark3 || '',
    ntsconfirmNum: data.ntsconfirmNum || '',
  };
};

/**
 * 현금영수증 정보 생성 헬퍼
 * 
 * @param {object} data - 현금영수증 데이터
 * @returns {object} 팝빌 현금영수증 객체
 */
export const createCashbillData = (data) => {
  return {
    // 필수 항목
    franchiseCorpNum: data.franchiseCorpNum, // 가맹점 사업자번호
    franchiseCorpName: data.franchiseCorpName, // 가맹점 상호
    franchiseCEOName: data.franchiseCEOName, // 가맹점 대표자명
    franchiseAddr: data.franchiseAddr, // 가맹점 주소
    franchiseTEL: data.franchiseTEL || '', // 가맹점 전화번호

    // 문서번호 (고유값)
    mgtKey: data.mgtKey,

    // 거래일자
    tradeDT: data.tradeDT || new Date().toISOString().slice(0, 10).replace(/-/g, ''),

    // 거래유형 (승인거래, 취소거래)
    tradeType: data.tradeType || '승인거래',

    // 과세형태 (과세, 비과세)
    taxationType: data.taxationType || '과세',

    // 거래구분 (소득공제, 지출증빙)
    tradeUsage: data.tradeUsage || '소득공제',

    // 식별번호 (휴대폰번호, 카드번호, 주민등록번호 등)
    identityNum: data.identityNum,

    // 공급가액
    supplyCost: data.supplyCost.toString(),

    // 세액
    tax: data.tax.toString(),

    // 봉사료
    serviceFee: data.serviceFee ? data.serviceFee.toString() : '0',

    // 합계금액
    totalAmount: data.totalAmount.toString(),

    // 고객 정보
    customerName: data.customerName || '',
    itemName: data.itemName || '포인트 충전',
    orderNumber: data.orderNumber || '',
    email: data.email || '',
    hp: data.hp || '',

    // 발행 안내 문자 전송여부
    smssendYN: data.smssendYN !== false,
  };
};

/**
 * 전자명세서 정보 생성 헬퍼
 * 
 * @param {object} data - 전자명세서 데이터
 * @param {number} itemCode - 명세서 코드 (121: 거래명세서, 122: 청구서, 123: 견적서)
 * @returns {object} 팝빌 전자명세서 객체
 */
export const createStatementData = (data, itemCode = 121) => {
  return {
    // 필수 항목
    itemCode: itemCode,
    mgtKey: data.mgtKey, // 문서번호
    writeDate: data.writeDate || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    taxType: data.taxType || '과세',

    // 발신자 정보
    senderCorpNum: data.senderCorpNum,
    senderCorpName: data.senderCorpName,
    senderCEOName: data.senderCEOName,
    senderAddr: data.senderAddr,
    senderBizClass: data.senderBizClass || '',
    senderBizType: data.senderBizType || '',
    senderContactName: data.senderContactName || '',
    senderEmail: data.senderEmail,
    senderTEL: data.senderTEL || '',
    senderHP: data.senderHP || '',

    // 수신자 정보
    receiverCorpNum: data.receiverCorpNum,
    receiverCorpName: data.receiverCorpName,
    receiverCEOName: data.receiverCEOName,
    receiverAddr: data.receiverAddr,
    receiverBizClass: data.receiverBizClass || '',
    receiverBizType: data.receiverBizType || '',
    receiverContactName: data.receiverContactName || '',
    receiverEmail: data.receiverEmail,
    receiverTEL: data.receiverTEL || '',
    receiverHP: data.receiverHP || '',

    // 금액 정보
    supplyCostTotal: data.supplyCostTotal.toString(),
    taxTotal: data.taxTotal.toString(),
    totalAmount: data.totalAmount.toString(),

    // 품목 정보
    detailList: data.detailList.map((item, index) => ({
      serialNum: index + 1,
      itemName: item.itemName,
      purchaseDT: item.purchaseDT || '',
      qty: item.qty ? item.qty.toString() : '1',
      unitCost: item.unitCost ? item.unitCost.toString() : '',
      supplyCost: item.supplyCost.toString(),
      tax: item.tax.toString(),
      remark: item.remark || '',
    })),

    // 추가 정보
    remark1: data.remark1 || '',
    remark2: data.remark2 || '',
    remark3: data.remark3 || '',
  };
};

export default {
  issueTaxinvoice,
  issueCashbill,
  issueStatement,
  searchBankTransactions,
  sendKakaoAlimtalk,
  sendMessage,
  checkDeposit,
  createTaxinvoiceData,
  createCashbillData,
  createStatementData,
};

