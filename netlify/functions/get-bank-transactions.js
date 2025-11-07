/**
 * 팝빌 계좌 거래 내역 조회 API
 * 관리자가 계좌 거래 내역을 조회하고 수동 매칭할 수 있도록 지원
 */

const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 팝빌 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID,
  SecretKey: process.env.POPBILL_SECRET_KEY,
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

// 팝빌 계좌조회 서비스 객체 생성
const easyFinBankService = popbill.EasyFinBankService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM;

// 계좌 정보
const BANK_CODE = '0003'; // IBK기업은행
const ACCOUNT_NUMBER = '04712275304011'; // 하이픈 제거

console.log('Popbill EasyFinBank service initialized');

/**
 * 거래 내역과 충전 신청서 매칭
 */
async function matchTransactions(transactions) {
  const matched = [];

  for (const tx of transactions) {
    // 충전 신청서에서 입금자명과 금액이 일치하는 것 찾기
    const { data: requests } = await supabaseAdmin
      .from('points_charge_requests')
      .select(`
        id,
        amount,
        depositor_name,
        status,
        created_at,
        companies!inner(company_name)
      `)
      .eq('depositor_name', tx.briefs) // 입금자명
      .eq('amount', parseInt(tx.tradeBalance)) // 금액
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(1);

    const matchedRequest = requests && requests.length > 0 ? requests[0] : null;

    matched.push({
      ...tx,
      matchedRequest: matchedRequest ? {
        id: matchedRequest.id,
        amount: matchedRequest.amount,
        company_name: matchedRequest.companies?.company_name,
        status: matchedRequest.status
      } : null,
      isMatched: !!matchedRequest
    });
  }

  return matched;
}

exports.handler = async (event, context) => {
  console.log('📊 계좌 거래 내역 조회 시작...');

  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // 쿼리 파라미터에서 날짜 범위 가져오기
    const params = event.queryStringParameters || {};
    const endDate = params.endDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);

    // 1. 팝빌 SDK로 거래 내역 조회
    const result = await new Promise((resolve, reject) => {
      easyFinBankService.search(
        POPBILL_CORP_NUM,
        BANK_CODE,
        ACCOUNT_NUMBER,
        startDate,
        endDate,
        ['I'], // 'I' = 입금만 조회
        1, // Page
        500, // PerPage
        'D', // Order: 'D' = 내림차순
        (result) => {
          console.log('✅ 팝빌 계좌조회 성공');
          resolve(result);
        },
        (error) => {
          console.error('❌ 팝빌 계좌조회 오류:', error);
          reject(error);
        }
      );
    });

    const transactions = result.list || [];
    console.log(`✅ ${transactions.length}건의 거래 내역 조회 완료`);

    // 2. 충전 신청서와 매칭
    const matchedTransactions = await matchTransactions(transactions);

    // 3. 통계 계산
    const stats = {
      total: matchedTransactions.length,
      matched: matchedTransactions.filter(tx => tx.isMatched).length,
      unmatched: matchedTransactions.filter(tx => !tx.isMatched).length,
      totalAmount: matchedTransactions.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0)
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactions: matchedTransactions,
        stats,
        period: { startDate, endDate }
      })
    };
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || error.toString()
      })
    };
  }
};
