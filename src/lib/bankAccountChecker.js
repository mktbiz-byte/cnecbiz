/**
 * 계좌 조회 및 입금 확인 자동화
 * 
 * 팝빌 계좌조회 API를 사용하여 입금 확인 및 자동 처리
 */

import { easybankService } from './popbillService';
import { supabaseBiz } from './supabaseClients';

/**
 * 계좌 거래내역 조회
 * @param {string} corpNum - 사업자번호
 * @param {string} bankCode - 은행코드
 * @param {string} accountNum - 계좌번호
 * @param {string} startDate - 시작일 (yyyyMMdd)
 * @param {string} endDate - 종료일 (yyyyMMdd)
 */
export const getBankTransactions = async (corpNum, bankCode, accountNum, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    easybankService.search(
      corpNum,
      bankCode,
      accountNum,
      startDate,
      endDate,
      (result) => {
        if (result.code) {
          reject(new Error(result.message));
        } else {
          resolve(result);
        }
      }
    );
  });
};

/**
 * 입금 확인 및 자동 처리
 * @param {string} corpNum - 사업자번호
 * @param {string} bankCode - 은행코드
 * @param {string} accountNum - 계좌번호
 */
export const checkAndProcessDeposits = async (corpNum, bankCode, accountNum) => {
  try {
    // 오늘 날짜
    const today = new Date();
    const endDate = formatDate(today);
    
    // 7일 전부터 조회
    const startDate = formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
    
    // 거래내역 조회
    const transactions = await getBankTransactions(corpNum, bankCode, accountNum, startDate, endDate);
    
    // 입금 내역만 필터링 (거래구분: 1 = 입금)
    const deposits = transactions.filter(tx => tx.tradeType === '1');
    
    // 미처리 충전 요청 조회
    const { data: pendingRequests, error } = await supabaseBiz
      .from('points_charge_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_method', 'bank_transfer');
    
    if (error) throw error;
    
    const processedRequests = [];
    
    // 각 충전 요청에 대해 입금 확인
    for (const request of pendingRequests) {
      const matchingDeposit = deposits.find(deposit => {
        // 금액 일치 확인
        const depositAmount = parseInt(deposit.amount);
        const requestAmount = request.amount;
        
        // 금액이 정확히 일치하거나 ±100원 이내
        return Math.abs(depositAmount - requestAmount) <= 100;
      });
      
      if (matchingDeposit) {
        // 입금 확인됨 - 포인트 충전 처리
        await processChargeRequest(request, matchingDeposit);
        processedRequests.push(request);
      }
    }
    
    return {
      totalDeposits: deposits.length,
      processedRequests: processedRequests.length,
      requests: processedRequests,
    };
    
  } catch (error) {
    console.error('입금 확인 실패:', error);
    throw error;
  }
};

/**
 * 충전 요청 처리 (포인트 지급)
 */
const processChargeRequest = async (request, deposit) => {
  try {
    // 1. 포인트 충전
    const { data: company } = await supabaseBiz
      .from('companies')
      .select('points')
      .eq('id', request.company_id)
      .single();
    
    const newPoints = (company.points || 0) + request.points;
    
    await supabaseBiz
      .from('companies')
      .update({ points: newPoints })
      .eq('id', request.company_id);
    
    // 2. 충전 요청 상태 업데이트
    await supabaseBiz
      .from('points_charge_requests')
      .update({
        status: 'completed',
        approved_at: new Date().toISOString(),
        bank_transaction_info: {
          tradeDate: deposit.tradeDate,
          amount: deposit.amount,
          balance: deposit.balance,
          remark: deposit.remark,
        },
      })
      .eq('id', request.id);
    
    // 3. 포인트 거래 내역 기록
    await supabaseBiz
      .from('points_transactions')
      .insert({
        company_id: request.company_id,
        type: 'charge',
        amount: request.points,
        balance_after: newPoints,
        description: `포인트 충전 (무통장 입금)`,
        charge_request_id: request.id,
      })
      .select()
      .single();
    
    console.log(`✅ 포인트 충전 완료: ${request.company_id}, ${request.points}P`);
    
    // TODO: 카카오톡/문자로 충전 완료 알림 발송
    
  } catch (error) {
    console.error('충전 요청 처리 실패:', error);
    throw error;
  }
};

/**
 * 날짜 포맷 (yyyyMMdd)
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * 은행 코드 목록
 */
export const BANK_CODES = {
  '0002': 'KDB산업은행',
  '0003': 'IBK기업은행',
  '0004': 'KB국민은행',
  '0007': '수협은행',
  '0011': 'NH농협은행',
  '0012': '농협회원조합',
  '0020': '우리은행',
  '0023': 'SC제일은행',
  '0027': '한국씨티은행',
  '0031': '대구은행',
  '0032': '부산은행',
  '0034': '광주은행',
  '0035': '제주은행',
  '0037': '전북은행',
  '0039': '경남은행',
  '0045': '새마을금고',
  '0048': '신협',
  '0050': '상호저축은행',
  '0071': '우체국',
  '0081': 'KEB하나은행',
  '0088': '신한은행',
  '0089': '케이뱅크',
  '0090': '카카오뱅크',
  '0092': '토스뱅크',
};

