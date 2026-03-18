/**
 * 하우파파 입출금 내역 조회 API
 * 팝빌 EasyFinBank API에서 직접 조회 (실시간 데이터)
 * get-howlab-deposits.js와 동일한 패턴
 */

const popbill = require('popbill');

// 팝빌 전역 설정 (하우파파 계정)
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('[get-howpapa-deposits] Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

const easyFinBankService = popbill.EasyFinBankService();

// 하우파파 사업자번호
const HOWPAPA_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';

// 하우파파 기업은행 계좌
const HOWPAPA_BANK_CODE = '0003'; // 기업은행
const HOWPAPA_ACCOUNT_NUMBER = '047-122753-04-011';

/**
 * 수집 작업 상태 확인 (폴링)
 */
async function waitForJobCompletion(jobID, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const jobState = await new Promise((resolve, reject) => {
      easyFinBankService.getJobState(
        HOWPAPA_CORP_NUM,
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

    console.log(`[get-howpapa-deposits] 조회 기간: ${startDate} ~ ${endDate}, 유형: ${filterType}`);
    console.log(`[get-howpapa-deposits] 기업은행 ${HOWPAPA_ACCOUNT_NUMBER} 조회`);
    console.log(`[get-howpapa-deposits] 사업자번호: ${HOWPAPA_CORP_NUM}`);
    console.log(`[get-howpapa-deposits] LinkID: ${process.env.POPBILL_LINK_ID || 'HOWLAB (default)'}`);

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
    let jobID;
    try {
      jobID = await new Promise((resolve, reject) => {
        easyFinBankService.requestJob(
          HOWPAPA_CORP_NUM,
          HOWPAPA_BANK_CODE,
          HOWPAPA_ACCOUNT_NUMBER,
          startDate,
          endDate,
          (result) => resolve(result),
          (error) => reject(error)
        );
      });
    } catch (requestError) {
      console.error(`[get-howpapa-deposits] requestJob 오류:`, requestError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: `팝빌 수집 요청 실패: [${requestError.code}] ${requestError.message}`,
          popbillError: {
            code: requestError.code,
            message: requestError.message,
            corpNum: HOWPAPA_CORP_NUM,
            bankCode: HOWPAPA_BANK_CODE,
            accountNumber: HOWPAPA_ACCOUNT_NUMBER
          }
        })
      };
    }

    console.log(`[get-howpapa-deposits] JobID: ${jobID}`);

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
        HOWPAPA_CORP_NUM,
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
    console.log(`[get-howpapa-deposits] ${transactions.length}건 조회 완료`);

    // 팝빌 응답을 프론트엔드 형식으로 변환
    const allTransactions = [];
    for (const tx of transactions) {
      const trdate = String(tx.trdate || '');
      const trdt = String(tx.trdt || '');
      const accIn = parseInt(String(tx.accIn || '0').replace(/,/g, '')) || 0;
      const accOut = parseInt(String(tx.accOut || '0').replace(/,/g, '')) || 0;
      const balance = parseInt(String(tx.balance || '0').replace(/,/g, '')) || 0;

      allTransactions.push({
        tid: tx.tid || `${trdate}-${trdt}-${accIn || accOut}`,
        tradeDate: trdate.substring(0, 8),
        tradeTime: trdt.length >= 14 ? trdt.substring(8, 14) : (trdt.length >= 6 ? trdt.substring(0, 6) : ''),
        briefs: tx.remark1 || tx.remark2 || '',
        tradeBalance: accIn || accOut,
        tradeType: accIn > 0 ? 'I' : 'O',
        balance: balance,
        accountLabel: '하우파파'
      });
    }

    // 통계 계산
    const depositItems = allTransactions.filter(d => d.tradeType === 'I');
    const withdrawalItems = allTransactions.filter(d => d.tradeType === 'O');
    const stats = {
      total: allTransactions.length,
      deposits: depositItems.length,
      withdrawals: withdrawalItems.length,
      depositAmount: depositItems.reduce((sum, d) => sum + (d.tradeBalance || 0), 0),
      withdrawalAmount: withdrawalItems.reduce((sum, d) => sum + (d.tradeBalance || 0), 0)
    };

    console.log(`[get-howpapa-deposits] 전체 ${allTransactions.length}건 (입금 ${stats.deposits}, 출금 ${stats.withdrawals})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: allTransactions,
        stats,
        account: { bankCode: HOWPAPA_BANK_CODE, accountNumber: HOWPAPA_ACCOUNT_NUMBER, accountName: '기업은행 하우파파' }
      })
    };
  } catch (error) {
    console.error('[get-howpapa-deposits] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || error.toString(),
        errorCode: error.code || null
      })
    };
  }
};
