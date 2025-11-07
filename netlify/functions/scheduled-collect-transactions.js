/**
 * 5분마다 실행되는 계좌 거래 내역 수집 및 자동 매칭
 * Netlify Scheduled Function
 */

const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_BIZ_URL;
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

// 계좌 정보 (환경 변수에서 가져오기)
const BANK_CODE = process.env.BANK_CODE || '0003'; // IBK기업은행
const ACCOUNT_NUMBER = process.env.ACCOUNT_NUMBER; // 팝빌 계좌 별칭 (예: "크넥전용계좌")

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
        null, // UserID
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
    console.log(`🔍 [AUTO-MATCH] 매칭 시도: ${transaction.briefs} / ${transaction.trade_balance}원`);

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
      console.error('❌ 충전 요청 조회 오류:', error);
      return null;
    }

    if (!requests || requests.length === 0) {
      console.log(`ℹ️  매칭되는 충전 요청 없음`);
      return null;
    }

    const request = requests[0];
    console.log(`✅ 자동 매칭 발견: ${request.id}`);

    // 포인트 충전 처리
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('points')
      .eq('id', request.company_id)
      .single();

    if (companyError) {
      console.error('❌ 회사 정보 조회 오류:', companyError);
      return null;
    }

    const newPoints = (company.points || 0) + parseInt(request.amount);

    // 포인트 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ points: newPoints })
      .eq('id', request.company_id);

    if (updateError) {
      console.error('❌ 포인트 업데이트 오류:', updateError);
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

    console.log(`🎉 자동 매칭 완료! 충전: ${request.amount}원, 새 잔액: ${newPoints}원`);

    return request.id;
  } catch (error) {
    console.error('❌ 자동 매칭 오류:', error);
    return null;
  }
}

/**
 * Netlify Scheduled Function Handler
 * 5분마다 실행
 */
exports.handler = async (event, context) => {
  console.log('📊 ========== 계좌 거래 내역 자동 수집 시작 ==========');
  console.log('🕐 실행 시간:', new Date().toISOString());

  try {
    // 최근 7일 거래 내역 수집
    const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);
    console.log(`🏦 계좌: ${BANK_CODE} / ${ACCOUNT_NUMBER}`);

    // 1. 수집 요청 (RequestJob)
    console.log('🔍 [STEP 1] 수집 요청...');
    const jobID = await new Promise((resolve, reject) => {
      easyFinBankService.requestJob(
        POPBILL_CORP_NUM,
        BANK_CODE,
        ACCOUNT_NUMBER,
        startDate,
        endDate,
        (result) => {
          console.log('✅ [STEP 1] 수집 요청 성공, JobID:', result);
          resolve(result);
        },
        (error) => {
          console.error('❌ [STEP 1] 수집 요청 오류:', error);
          reject(error);
        }
      );
    });

    // 2. 수집 완료 대기
    console.log('🔍 [STEP 2] 수집 완료 대기...');
    const isCompleted = await waitForJobCompletion(jobID);

    if (!isCompleted) {
      console.error('⚠️ [STEP 2] 수집 작업 타임아웃');
      return {
        statusCode: 408,
        body: JSON.stringify({
          success: false,
          error: '수집 작업 타임아웃'
        })
      };
    }

    console.log('✅ [STEP 2] 수집 완료!');

    // 3. 입금 거래 내역만 조회 (Search)
    console.log('🔍 [STEP 3] 입금 거래 내역 조회...');
    const result = await new Promise((resolve, reject) => {
      easyFinBankService.search(
        POPBILL_CORP_NUM,
        jobID,
        ['I'], // ✅ 입금만 조회
        '',    // 검색어 없음
        1,     // 첫 페이지
        1000,  // 최대 1000건
        'D',   // 내림차순
        null,  // UserID
        (result) => {
          console.log('✅ [STEP 3] 입금 거래 내역 조회 성공');
          resolve(result);
        },
        (error) => {
          console.error('❌ [STEP 3] 거래 내역 조회 오류:', error);
          reject(error);
        }
      );
    });

    console.log('🔍 [DEBUG] result 객체:', JSON.stringify(result, null, 2));
    
    const transactions = result.list || [];
    console.log(`✅ [STEP 3] ${transactions.length}건의 입금 거래 조회 완료`);

    if (transactions.length === 0) {
      console.log('ℹ️  조회된 입금 거래가 없습니다.');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '조회된 입금 거래가 없습니다.',
          savedCount: 0,
          matchedCount: 0,
          totalTransactions: 0
        })
      };
    }

    // 4. Supabase에 저장 및 자동 매칭
    console.log('🔍 [STEP 4] Supabase에 저장 및 자동 매칭...');
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
          console.log(`   ⏭️  이미 저장됨: ${tx.tid}`);
          continue;
        }

        // 팝빌 API 응답 데이터 로그
        console.log(`🔍 [DEBUG] 원본 거래 데이터:`, JSON.stringify(tx, null, 2));

        // 데이터 변환 및 검증
        const tradeDate = String(tx.trdate || '').substring(0, 8);
        const tradeTime = String(tx.trdt || '').substring(8, 14);
        const tradeBalance = parseInt(String(tx.accIn || '0').replace(/,/g, ''));
        const briefs = String(tx.remark1 || tx.remark2 || '').substring(0, 500);
        const tid = String(tx.tid || '').substring(0, 32);

        console.log(`🔍 [DEBUG] 변환된 데이터:`, {
          tid,
          tradeDate,
          tradeTime,
          tradeBalance,
          briefs
        });

        // 자동 매칭 시도
        const matchedRequestId = await autoMatchTransaction({
          briefs: briefs,
          trade_balance: tradeBalance,
          trade_date: tradeDate
        });

        // Supabase에 저장할 데이터 준비
        const insertData = {
          tid: tid,
          trade_date: tradeDate,
          trade_time: tradeTime,
          trade_type: 'I',
          trade_balance: tradeBalance,
          briefs: briefs,
          charge_request_id: matchedRequestId,
          is_matched: !!matchedRequestId
        };

        console.log(`🔍 [DEBUG] 삽입할 데이터:`, JSON.stringify(insertData, null, 2));

        // Supabase에 저장
        const { error: insertError } = await supabaseAdmin
          .from('bank_transactions')
          .insert(insertData);

        if (insertError) {
          console.error(`❌ 저장 오류 (${tx.tid}):`, insertError);
          continue;
        }

        savedCount++;
        console.log(`   ✅ 저장: ${tx.tid} - ${tx.remark1 || tx.remark2} / ${parseInt(tx.accIn || 0).toLocaleString()}원`);

        if (matchedRequestId) {
          matchedCount++;
        }
      } catch (error) {
        console.error('❌ 거래 처리 오류:', error);
      }
    }

    console.log('✅ [STEP 4] 저장 및 매칭 완료!');
    console.log(`   📝 새로 저장: ${savedCount}건`);
    console.log(`   🎯 자동 매칭: ${matchedCount}건`);
    console.log('📊 ========== 계좌 거래 내역 자동 수집 완료 ==========');

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
    console.error('❌ ========== 예상치 못한 오류 ==========');
    console.error('오류 이름:', error.name);
    console.error('오류 메시지:', error.message);
    console.error('스택:', error.stack);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || error.toString(),
        stack: error.stack
      })
    };
  }
};
