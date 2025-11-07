/**
 * 5분마다 실행되는 계좌 거래 내역 수집 및 자동 매칭
 * Netlify Scheduled Function
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

console.log('Scheduled function: collect-transactions initialized');

/**
 * 수집 작업 상태 확인 (폴링)
 */
async function waitForJobCompletion(jobID, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const jobState = await new Promise((resolve, reject) => {
      easyFinBankService.getJobState(
        POPBILL_CORP_NUM,
        jobID,
        (result) => {
          console.log(`수집 상태 확인 (${i + 1}/${maxAttempts}):`, result.jobState);
          resolve(result);
        },
        (error) => {
          console.error('수집 상태 확인 오류:', error);
          reject(error);
        }
      );
    });

    // jobState: 1-대기, 2-진행중, 3-완료
    if (jobState.jobState === 3) {
      return true; // 완료
    }

    // 2초 대기 후 재시도
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return false; // 타임아웃
}

/**
 * 자동 매칭 로직
 */
async function autoMatchTransaction(transaction) {
  try {
    // 입금 거래만 매칭
    if (transaction.trade_type !== 'I') {
      return null;
    }

    // 충전 요청에서 입금자명과 금액이 일치하는 것 찾기
    const { data: requests, error } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_method', 'bank_transfer')
      .eq('depositor_name', transaction.briefs)
      .eq('amount', parseInt(transaction.trade_balance))
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('충전 요청 조회 오류:', error);
      return null;
    }

    if (!requests || requests.length === 0) {
      return null;
    }

    const request = requests[0];
    console.log(`✅ 자동 매칭 발견: ${request.id} - ${transaction.briefs} - ${transaction.trade_balance}원`);

    // 포인트 충전 처리
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('points')
      .eq('id', request.company_id)
      .single();

    if (companyError) {
      console.error('회사 정보 조회 오류:', companyError);
      return null;
    }

    const newPoints = (company.points || 0) + parseInt(request.amount);

    // 포인트 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ points: newPoints })
      .eq('id', request.company_id);

    if (updateError) {
      console.error('포인트 업데이트 오류:', updateError);
      return null;
    }

    // 포인트 거래 내역 기록
    await supabaseAdmin
      .from('point_transactions')
      .insert({
        company_id: request.company_id,
        amount: parseInt(request.amount),
        type: 'charge',
        description: `계좌이체 입금 확인 (자동 매칭)`,
        balance_after: newPoints,
        charge_request_id: request.id
      });

    // 충전 요청 상태 업데이트
    await supabaseAdmin
      .from('points_charge_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: 'system_auto',
        deposit_date: transaction.trade_date,
        actual_amount: parseInt(transaction.trade_balance)
      })
      .eq('id', request.id);

    return request.id;
  } catch (error) {
    console.error('자동 매칭 오류:', error);
    return null;
  }
}

/**
 * Netlify Scheduled Function Handler
 * 5분마다 실행
 */
exports.handler = async (event, context) => {
  console.log('🔄 계좌 거래 내역 수집 시작...');
  console.log('실행 시간:', new Date().toISOString());

  try {
    // 최근 7일 거래 내역 수집
    const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);

    // 1. 수집 요청 (RequestJob)
    console.log('1단계: 수집 요청...');
    const jobID = await new Promise((resolve, reject) => {
      easyFinBankService.requestJob(
        POPBILL_CORP_NUM,
        BANK_CODE,
        ACCOUNT_NUMBER,
        startDate,
        endDate,
        (result) => {
          console.log('✅ 수집 요청 성공, JobID:', result);
          resolve(result);
        },
        (error) => {
          console.error('❌ 수집 요청 오류:', error);
          reject(error);
        }
      );
    });

    // 2. 수집 완료 대기
    console.log('2단계: 수집 완료 대기...');
    const isCompleted = await waitForJobCompletion(jobID);

    if (!isCompleted) {
      console.error('⚠️ 수집 작업 타임아웃');
      return {
        statusCode: 408,
        body: JSON.stringify({
          success: false,
          error: '수집 작업 타임아웃'
        })
      };
    }

    // 3. 수집된 거래 내역 조회 (Search)
    console.log('3단계: 거래 내역 조회...');
    const result = await new Promise((resolve, reject) => {
      easyFinBankService.search(
        POPBILL_CORP_NUM,
        jobID,
        ['I'], // 입금만 조회
        '',
        1,
        500,
        'D',
        null,
        (result) => {
          console.log('✅ 거래 내역 조회 성공');
          resolve(result);
        },
        (error) => {
          console.error('❌ 거래 내역 조회 오류:', error);
          reject(error);
        }
      );
    });

    const transactions = result.list || [];
    console.log(`📊 ${transactions.length}건의 거래 내역 조회 완료`);

    // 4. Supabase에 저장 및 자동 매칭
    let savedCount = 0;
    let matchedCount = 0;

    for (const tx of transactions) {
      try {
        // 이미 저장된 거래인지 확인
        const { data: existing } = await supabaseAdmin
          .from('bank_transactions')
          .select('id')
          .eq('tid', tx.tid)
          .single();

        if (existing) {
          continue; // 이미 저장됨
        }

        // 자동 매칭 시도
        const matchedRequestId = await autoMatchTransaction({
          trade_type: tx.tradeType || 'I',
          briefs: tx.briefs || '',
          trade_balance: tx.tradeBalance || 0,
          trade_date: tx.trdt || ''
        });

        // Supabase에 저장
        const { error: insertError } = await supabaseAdmin
          .from('bank_transactions')
          .insert({
            tid: tx.tid,
            trade_date: tx.trdt,
            trade_time: tx.trdt,
            trade_type: tx.tradeType,
            trade_balance: parseInt(tx.tradeBalance),
            after_balance: parseInt(tx.balance || 0),
            briefs: tx.briefs,
            remark1: tx.remark1,
            remark2: tx.remark2,
            remark3: tx.remark3,
            charge_request_id: matchedRequestId,
            is_matched: !!matchedRequestId,
            matched_at: matchedRequestId ? new Date().toISOString() : null,
            matched_by: matchedRequestId ? 'auto' : null
          });

        if (insertError) {
          console.error('저장 오류:', insertError);
          continue;
        }

        savedCount++;
        if (matchedRequestId) {
          matchedCount++;
        }
      } catch (error) {
        console.error('거래 처리 오류:', error);
      }
    }

    console.log(`✅ 수집 완료: ${savedCount}건 저장, ${matchedCount}건 자동 매칭`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${savedCount}건 저장, ${matchedCount}건 자동 매칭`,
        savedCount,
        matchedCount,
        totalTransactions: transactions.length
      })
    };
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || error.toString()
      })
    };
  }
};
