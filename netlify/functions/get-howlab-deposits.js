/**
 * 하우랩 입출금 내역 조회 API
 * 팝빌 EasyFinBank API에서 직접 조회 (tblbank 대신 실시간 데이터)
 */

const popbill = require('popbill');

// 팝빌 전역 설정 (하우랩 계정)
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('[get-howlab-deposits] Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

const easyFinBankService = popbill.EasyFinBankService();

// 하우랩 사업자번호 (세금계산서와 동일)
const HAULAB_CORP_NUM = process.env.POPBILL_HAULAB_CORP_NUM || '3768100944';

// 하우랩 국민은행 계좌
const HOWLAB_BANK_CODE = '0004'; // 국민은행
const HOWLAB_ACCOUNT_NUMBER = '28800104344172';

/**
 * 수집 작업 상태 확인 (폴링)
 */
async function waitForJobCompletion(jobID, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const jobState = await new Promise((resolve, reject) => {
      easyFinBankService.getJobState(
        HAULAB_CORP_NUM,
        jobID,
        null,
        (result) => resolve(result),
        (error) => reject(error)
      );
    });

    if (jobState.jobState === 3) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const startDate = params.startDate || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
    const endDate = params.endDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filterType = params.filterType || 'input';

    console.log(`[get-howlab-deposits] 조회 기간: ${startDate} ~ ${endDate}, 유형: ${filterType}`);
    console.log(`[get-howlab-deposits] 국민은행 ${HOWLAB_ACCOUNT_NUMBER} 조회`);

    // 필터 타입에 따른 거래유형 설정
    let tradeTypes;
    if (filterType === 'input') {
      tradeTypes = ['I'];
    } else if (filterType === 'output') {
      tradeTypes = ['O'];
    } else {
      tradeTypes = ['I', 'O'];
    }

    // 1. 팝빌 수집 요청 (requestJob)
    const jobID = await new Promise((resolve, reject) => {
      easyFinBankService.requestJob(
        HAULAB_CORP_NUM,
        HOWLAB_BANK_CODE,
        HOWLAB_ACCOUNT_NUMBER,
        startDate,
        endDate,
        (result) => resolve(result),
        (error) => reject(error)
      );
    });

    console.log(`[get-howlab-deposits] JobID: ${jobID}`);

    // 2. 수집 완료 대기
    const isCompleted = await waitForJobCompletion(jobID);
    if (!isCompleted) {
      return {
        statusCode: 408,
        headers,
        body: JSON.stringify({ success: false, error: '팝빌 수집 작업 타임아웃' })
      };
    }

    // 3. 거래 내역 조회
    const result = await new Promise((resolve, reject) => {
      easyFinBankService.search(
        HAULAB_CORP_NUM,
        jobID,
        tradeTypes,
        '',
        1,
        1000,
        'D',
        null,
        (result) => resolve(result),
        (error) => reject(error)
      );
    });

    const transactions = result.list || [];
    console.log(`[get-howlab-deposits] ${transactions.length}건 조회 완료`);

    // 팝빌 응답을 HowlabDepositsTab 형식으로 변환
    const allTransactions = [];
    for (const tx of transactions) {
      const trdate = String(tx.trdate || '');
      const trdt = String(tx.trdt || '');
      const accIn = parseInt(String(tx.accIn || '0').replace(/,/g, '')) || 0;
      const accOut = parseInt(String(tx.accOut || '0').replace(/,/g, '')) || 0;
      const balance = parseInt(String(tx.balance || '0').replace(/,/g, '')) || 0;

      allTransactions.push({
        bkid: tx.tid || `${trdate}-${trdt}-${accIn || accOut}`,
        bkdate: trdate.substring(0, 8),
        bktime: trdt.length >= 14 ? trdt.substring(8, 14) : (trdt.length >= 6 ? trdt.substring(0, 6) : ''),
        bkjukyo: tx.remark1 || tx.remark2 || '',
        bkinput: accIn,
        bkoutput: accOut,
        bkjango: balance,
        bkcontent: tx.remark3 || tx.memo || '',
        bketc: '국민은행 크넥전용',
        accountName: '국민은행 크넥전용',
        bankCode: HOWLAB_BANK_CODE
      });
    }

    // 통계 계산
    const depositItems = allTransactions.filter(d => d.bkinput > 0);
    const withdrawalItems = allTransactions.filter(d => d.bkoutput > 0);
    const stats = {
      total: allTransactions.length,
      deposits: depositItems.length,
      withdrawals: withdrawalItems.length,
      depositAmount: depositItems.reduce((sum, d) => sum + (d.bkinput || 0), 0),
      withdrawalAmount: withdrawalItems.reduce((sum, d) => sum + (d.bkoutput || 0), 0)
    };

    console.log(`[get-howlab-deposits] 전체 ${allTransactions.length}건 (입금 ${stats.deposits}, 출금 ${stats.withdrawals})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: allTransactions,
        stats,
        account: { bankCode: HOWLAB_BANK_CODE, accountNumber: HOWLAB_ACCOUNT_NUMBER, accountName: '국민은행 크넥전용' }
      })
    };
  } catch (error) {
    console.error('[get-howlab-deposits] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || error.toString() })
    };
  }
};
