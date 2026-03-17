/**
 * 5분마다 실행되는 계좌 거래 내역 수집 및 자동 매칭
 * Netlify Scheduled Function
 * 하우랩/하우파파 두 계좌 모두 모니터링
 */

const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');
const axios = require('axios');

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

// 계좌 정보 (하우랩 + 하우파파 두 계좌)
const ACCOUNTS = [
  {
    label: '하우랩',
    bankCode: '0004', // 국민은행
    accountNumber: '28800104344172'
  },
  {
    label: '하우파파',
    bankCode: '0003', // IBK기업은행
    accountNumber: '04712275304011'
  }
];

const BASE_URL = process.env.URL || 'https://cnecbiz.com';
const NAVER_WORKS_CHANNEL = '75c24874-e370-afd5-9da3-72918ba15a3c';

console.log('Scheduled function: collect-transactions initialized');
console.log(`모니터링 계좌: ${ACCOUNTS.map(a => a.label).join(', ')}`);

/**
 * 네이버웍스 알림 발송 (공통 헬퍼)
 */
async function sendNaverWorksAlert(message) {
  try {
    await axios.post(
      `${BASE_URL}/.netlify/functions/send-naver-works-message`,
      {
        message,
        isAdminNotification: true,
        channelId: NAVER_WORKS_CHANNEL
      }
    );
    console.log('✅ 네이버 웍스 알림 발송 완료');
  } catch (error) {
    console.error('❌ 네이버 웍스 알림 발송 실패:', error.message);
  }
}

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
 * 회사명 정규화 (띄어쓰기, 주식회사/(주) 제거)
 */
function normalizeCompanyName(name) {
  if (!name) return '';
  return name
    .replace(/\s+/g, '') // 모든 띄어쓰기 제거
    .replace(/주식회사/g, '') // "주식회사" 제거
    .replace(/\(주\)/g, '') // "(주)" 제거
    .replace(/주\)/g, '') // "주)" 제거 (여는 괄호 누락)
    .toLowerCase();
}

/**
 * 문자열 유사도 계산 (Levenshtein Distance)
 */
function calculateSimilarity(str1, str2) {
  const s1 = normalizeCompanyName(str1);
  const s2 = normalizeCompanyName(str2);

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Levenshtein Distance
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.round(similarity);
}

/**
 * 자동 매칭 로직 (유사도 매칭 포함)
 */
async function autoMatchTransaction(transaction) {
  try {
    console.log(`🔍 [AUTO-MATCH] 매칭 시도: ${transaction.briefs} / ${transaction.trade_balance}원`);

    // 1단계: 정확한 일치 (100% 매칭)
    let { data: requests, error } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*, companies(company_name)')
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

    // 2단계: 유사도 매칭 (70% 이상)
    if (!requests || requests.length === 0) {
      console.log(`ℹ️  정확한 매칭 없음 - 유사도 매칭 시도`);

      const { data: allRequests, error: allError } = await supabaseAdmin
        .from('points_charge_requests')
        .select('*, companies(company_name)')
        .eq('status', 'pending')
        .eq('payment_method', 'bank_transfer')
        .eq('amount', parseInt(transaction.trade_balance))
        .order('created_at', { ascending: true });

      if (allError || !allRequests || allRequests.length === 0) {
        console.log(`ℹ️  매칭되는 충전 요청 없음`);
        return null;
      }

      // 유사도 계산
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const req of allRequests) {
        const similarity = calculateSimilarity(transaction.briefs, req.depositor_name);
        console.log(`  - ${req.depositor_name}: ${similarity}% 유사`);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = req;
        }
      }

      if (bestSimilarity >= 70) {
        console.log(`✅ 유사도 매칭 발견: ${bestMatch.depositor_name} (${bestSimilarity}%)`);
        requests = [bestMatch];
      } else if (bestSimilarity >= 50) {
        console.log(`⚠️  중간 유사도: ${bestMatch.depositor_name} (${bestSimilarity}%) - 수동 확인 필요`);
        // 수동 확인 필요 알림
        await sendNaverWorksAlert(
          `⚠️ 유사도 매칭 수동 확인 필요\n\n` +
          `입금자: ${transaction.briefs}\n` +
          `금액: ${parseInt(transaction.trade_balance).toLocaleString()}원\n` +
          `유사 매칭: ${bestMatch.depositor_name} (${bestSimilarity}%)\n\n` +
          `확인 페이지: https://cnecbiz.com/admin/deposits`
        );
        return null;
      } else {
        console.log(`❌ 유사도 너무 낮음: ${bestSimilarity}%`);
        return null;
      }
    }

    const request = requests[0];
    console.log(`✅ 자동 매칭 발견: ${request.id}`);

    // 회사 정보 먼저 조회 (캠페인 알림에도 사용)
    const { data: companyInfo, error: companyInfoError } = await supabaseAdmin
      .from('companies')
      .select('company_name, notification_email, notification_phone, phone, email, points_balance')
      .eq('id', request.company_id)
      .single();

    if (companyInfoError) {
      console.error('❌ 회사 정보 조회 오류:', companyInfoError);
      return null;
    }

    const newPoints = (companyInfo.points_balance || 0) + parseInt(request.amount);

    // 포인트 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ points_balance: newPoints })
      .eq('id', request.company_id);

    if (updateError) {
      console.error('❌ 포인트 업데이트 오류:', updateError);
      return null;
    }

    // 포인트 거래 내역 기록
    await supabaseAdmin
      .from('points_transactions')
      .insert({
        company_id: request.company_id,
        amount: parseInt(request.amount),
        type: 'charge',
        description: `계좌이체 입금 확인 (자동 매칭)`,
        balance_after: newPoints,
        charge_request_id: request.id,
        related_campaign_id: request.related_campaign_id || null
      });

    // 캠페인 자동 승인 요청 처리
    if (request.related_campaign_id) {
      console.log(`📢 캠페인 자동 승인 요청: ${request.related_campaign_id}`);

      try {
        // 캠페인 상태를 'pending'으로 변경
        const { error: campaignError } = await supabaseAdmin
          .from('campaigns')
          .update({
            status: 'pending',
            submitted_at: new Date().toISOString()
          })
          .eq('id', request.related_campaign_id);

        if (campaignError) {
          console.error('❌ 캠페인 상태 업데이트 오류:', campaignError);
        } else {
          console.log('✅ 캠페인 상태를 pending으로 변경 완료');

          // 캠페인 정보 조회
          const { data: campaign } = await supabaseAdmin
            .from('campaigns')
            .select('title, campaign_type, influencer_count, package_type')
            .eq('id', request.related_campaign_id)
            .single();

          // 네이버 웍스 캠페인 승인 요청 알림
          if (campaign) {
            await sendNaverWorksAlert(
              `🎉 **새로운 캠페인 승인 요청**\n\n` +
              `🏬 **회사:** ${companyInfo.company_name || '미상'}\n` +
              `📝 **캠페인:** ${campaign.title}\n` +
              `🎯 **타입:** ${campaign.campaign_type || '미상'}\n` +
              `👥 **크리에이터 수:** ${campaign.influencer_count || 0}명\n` +
              `💰 **입금 금액:** ${parseInt(request.amount).toLocaleString()}원\n\n` +
              `➡️ 관리자 페이지에서 확인해주세요.`
            );
          }
        }
      } catch (campaignApprovalError) {
        console.error('❌ 캠페인 자동 승인 처리 오류:', campaignApprovalError);
      }
    }

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

    // 고객 알림 발송 (비동기 - 실패해도 매칭은 완료)
    try {
      const koreanDate = new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const companyName = companyInfo.company_name || '고객사';
      const companyEmail = companyInfo.notification_email || companyInfo.email;
      const companyPhone = companyInfo.notification_phone || companyInfo.phone;

      // 1. 고객에게 알림톡 발송
      if (companyPhone) {
        try {
          console.log(`📱 알림톡 발송: ${companyPhone}`);
          await axios.post(
            `${BASE_URL}/.netlify/functions/send-kakao-notification`,
            {
              receiverNum: companyPhone,
              receiverName: companyName,
              templateCode: '025100000943',
              variables: {
                '회사명': companyName,
                '포인트': parseInt(request.amount).toLocaleString()
              }
            }
          );
          console.log('✅ 알림톡 발송 완료');
        } catch (kakaoError) {
          console.error('❌ 알림톡 발송 실패:', kakaoError.message);
        }
      }

      // 2. 고객에게 이메일 발송
      if (companyEmail) {
        try {
          console.log(`📧 이메일 발송: ${companyEmail}`);
          await axios.post(
            `${BASE_URL}/.netlify/functions/send-email`,
            {
              to: companyEmail,
              subject: '[CNEC] 포인트 충전 완료',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #4CAF50;">✅ 입금이 확인되었습니다</h2>
                  <p>안녕하세요, <strong>${companyName}</strong>님.</p>
                  <p>입금이 확인되어 포인트가 충전되었습니다.</p>

                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #555;">충전 내역</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>충전 포인트:</strong></td>
                        <td style="padding: 8px 0; font-size: 18px; color: #4CAF50;"><strong>${parseInt(request.amount).toLocaleString()}P</strong></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>현재 잔액:</strong></td>
                        <td style="padding: 8px 0;">${newPoints.toLocaleString()}P</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>확인 시간:</strong></td>
                        <td style="padding: 8px 0;">${koreanDate}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #666;">이제 포인트를 사용하실 수 있습니다.</p>
                  <p style="color: #666;">문의: <strong>1833-6025</strong></p>

                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                  </p>
                </div>
              `
            }
          );
          console.log('✅ 이메일 발송 완료');
        } catch (emailError) {
          console.error('❌ 이메일 발송 실패:', emailError.message);
        }
      }

      // 3. 관리자에게 네이버 웍스 매칭 완료 알림
      await sendNaverWorksAlert(
        `✅ 입금 확인 + 자동 매칭 완료\n\n` +
        `회사명: ${companyName}\n` +
        `충전 금액: ${parseInt(request.amount).toLocaleString()}원\n` +
        `새 잔액: ${newPoints.toLocaleString()}P\n` +
        `확인 시간: ${koreanDate}\n\n` +
        `관리자 페이지: https://cnecbiz.com/admin/deposits`
      );
    } catch (notificationError) {
      console.error('❌ 알림 발송 오류:', notificationError);
    }

    return request.id;
  } catch (error) {
    console.error('❌ 자동 매칭 오류:', error);
    return null;
  }
}

/**
 * 단일 계좌의 거래 내역 수집 및 처리
 */
async function collectTransactionsForAccount(account, startDate, endDate) {
  console.log(`\n🏦 [${account.label}] 계좌 수집 시작: ${account.bankCode} / ${account.accountNumber}`);

  if (!account.accountNumber) {
    console.log(`⏭️  [${account.label}] 계좌번호 미설정 - 건너뜀`);
    return { savedCount: 0, matchedCount: 0, totalTransactions: 0, newDeposits: [] };
  }

  // 1. 수집 요청 (RequestJob)
  const jobID = await new Promise((resolve, reject) => {
    easyFinBankService.requestJob(
      POPBILL_CORP_NUM,
      account.bankCode,
      account.accountNumber,
      startDate,
      endDate,
      (result) => {
        console.log(`✅ [${account.label}] 수집 요청 성공, JobID:`, result);
        resolve(result);
      },
      (error) => {
        console.error(`❌ [${account.label}] 수집 요청 오류:`, error);
        reject(error);
      }
    );
  });

  // 2. 수집 완료 대기
  const isCompleted = await waitForJobCompletion(jobID);

  if (!isCompleted) {
    console.error(`⚠️ [${account.label}] 수집 작업 타임아웃`);
    return { savedCount: 0, matchedCount: 0, totalTransactions: 0, newDeposits: [] };
  }

  // 3. 입금 거래 내역만 조회
  const result = await new Promise((resolve, reject) => {
    easyFinBankService.search(
      POPBILL_CORP_NUM,
      jobID,
      ['I'], // 입금만 조회
      '',
      1,
      1000,
      'D',
      null,
      (result) => {
        console.log(`✅ [${account.label}] 입금 거래 내역 조회 성공`);
        resolve(result);
      },
      (error) => {
        console.error(`❌ [${account.label}] 거래 내역 조회 오류:`, error);
        reject(error);
      }
    );
  });

  const transactions = result.list || [];
  console.log(`✅ [${account.label}] ${transactions.length}건의 입금 거래 조회 완료`);

  if (transactions.length === 0) {
    return { savedCount: 0, matchedCount: 0, totalTransactions: 0, newDeposits: [] };
  }

  // 4. Supabase에 저장 및 자동 매칭
  let savedCount = 0;
  let matchedCount = 0;
  const newDeposits = [];

  for (const tx of transactions) {
    try {
      // 이미 저장된 거래인지 확인
      const { data: existing } = await supabaseAdmin
        .from('bank_transactions')
        .select('id')
        .eq('tid', tx.tid)
        .single();

      if (existing) {
        continue;
      }

      // 데이터 변환 및 검증
      const tradeDate = String(tx.trdate || '').substring(0, 8);
      const tradeTime = String(tx.trdt || '').substring(8, 14);
      const tradeBalance = parseInt(String(tx.accIn || '0').replace(/,/g, ''));
      const briefs = String(tx.remark1 || tx.remark2 || '').substring(0, 500);
      const tid = String(tx.tid || '').substring(0, 32);

      console.log(`🔍 [${account.label}] 새 입금: ${briefs} / ${tradeBalance.toLocaleString()}원`);

      // 자동 매칭 시도
      const matchResult = await autoMatchTransaction({
        briefs: briefs,
        trade_balance: tradeBalance,
        trade_date: tradeDate
      });

      // matchResult가 object(needsManualReview)인 경우 null 처리
      const matchedRequestId = (matchResult && typeof matchResult === 'string') ? matchResult : null;

      // Supabase에 저장
      const { error: insertError } = await supabaseAdmin
        .from('bank_transactions')
        .insert({
          tid: tid,
          trade_date: tradeDate,
          trade_time: tradeTime,
          trade_type: 'I',
          trade_balance: tradeBalance,
          briefs: briefs,
          charge_request_id: matchedRequestId,
          is_matched: !!matchedRequestId,
          account_label: account.label
        });

      if (insertError) {
        console.error(`❌ 저장 오류 (${tid}):`, insertError);
        continue;
      }

      savedCount++;
      newDeposits.push({
        label: account.label,
        briefs,
        tradeBalance,
        tradeDate,
        tradeTime,
        matched: !!matchedRequestId
      });

      if (matchedRequestId) {
        matchedCount++;
      }
    } catch (error) {
      console.error('❌ 거래 처리 오류:', error);
    }
  }

  console.log(`✅ [${account.label}] 새로 저장: ${savedCount}건, 자동 매칭: ${matchedCount}건`);

  return { savedCount, matchedCount, totalTransactions: transactions.length, newDeposits };
}

/**
 * Netlify Scheduled Function Handler
 * 5분마다 실행
 */
exports.handler = async (event, context) => {
  console.log('📊 ========== 계좌 거래 내역 자동 수집 시작 ==========');
  console.log('🕐 실행 시간:', new Date().toISOString());

  try {
    // 최근 25일 거래 내역 수집 (팝빌 API 최대 조회기간 1개월 제한 - 2월(28일) 고려하여 25일로 설정)
    const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);

    let totalSaved = 0;
    let totalMatched = 0;
    let totalTransactions = 0;
    let allNewDeposits = [];

    // 모든 계좌에 대해 수집 실행
    for (const account of ACCOUNTS) {
      try {
        const result = await collectTransactionsForAccount(account, startDate, endDate);
        totalSaved += result.savedCount;
        totalMatched += result.matchedCount;
        totalTransactions += result.totalTransactions;
        allNewDeposits = allNewDeposits.concat(result.newDeposits);
      } catch (accountError) {
        console.error(`❌ [${account.label}] 계좌 수집 오류:`, accountError.message);
      }
    }

    // 새 입금이 있으면 무조건 네이버웍스 알림 발송
    if (allNewDeposits.length > 0) {
      const koreanDate = new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let depositMessage = `💵 새로운 입금 ${allNewDeposits.length}건 감지\n`;
      depositMessage += `⏰ ${koreanDate}\n\n`;

      allNewDeposits.forEach((dep, index) => {
        const dateFormatted = `${dep.tradeDate.substring(0,4)}-${dep.tradeDate.substring(4,6)}-${dep.tradeDate.substring(6,8)}`;
        const timeFormatted = dep.tradeTime ? `${dep.tradeTime.substring(0,2)}:${dep.tradeTime.substring(2,4)}` : '';
        const matchStatus = dep.matched ? '✅ 자동매칭' : '⚠️ 미매칭';
        depositMessage += `${index + 1}. [${dep.label}] ${dep.briefs}\n`;
        depositMessage += `   💰 ${dep.tradeBalance.toLocaleString()}원 (${dateFormatted} ${timeFormatted})\n`;
        depositMessage += `   ${matchStatus}\n\n`;
      });

      depositMessage += `📊 총 ${totalSaved}건 저장 / ${totalMatched}건 자동매칭\n`;
      depositMessage += `확인: https://cnecbiz.com/admin/deposits`;

      await sendNaverWorksAlert(depositMessage);
    }

    // 미매칭 입금 추가 알림 (기존 미매칭 포함)
    const unmatchedNew = allNewDeposits.filter(d => !d.matched);
    if (unmatchedNew.length > 0) {
      try {
        const { data: unmatchedTransactions } = await supabaseAdmin
          .from('bank_transactions')
          .select('*')
          .eq('is_matched', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (unmatchedTransactions && unmatchedTransactions.length > 0) {
          let alertMessage = `⚠️ 미매칭 입금 현황 (총 ${unmatchedTransactions.length}건)\n\n`;

          unmatchedTransactions.slice(0, 5).forEach((tx, index) => {
            const date = `${tx.trade_date.substring(0,4)}-${tx.trade_date.substring(4,6)}-${tx.trade_date.substring(6,8)}`;
            alertMessage += `${index + 1}. ${tx.briefs} / ${parseInt(tx.trade_balance).toLocaleString()}원 (${date})\n`;
          });

          if (unmatchedTransactions.length > 5) {
            alertMessage += `\n... 외 ${unmatchedTransactions.length - 5}건 더 있음\n`;
          }

          alertMessage += `\n수동 확인: https://cnecbiz.com/admin/deposits`;

          await sendNaverWorksAlert(alertMessage);
        }
      } catch (alertError) {
        console.error('❌ 미매칭 입금 알림 발송 실패:', alertError.message);
      }
    }

    console.log('📊 ========== 계좌 거래 내역 자동 수집 완료 ==========');
    console.log(`   📝 총 저장: ${totalSaved}건`);
    console.log(`   🎯 자동 매칭: ${totalMatched}건`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${totalSaved}건 저장, ${totalMatched}건 자동 매칭`,
        savedCount: totalSaved,
        matchedCount: totalMatched,
        totalTransactions,
        accounts: ACCOUNTS.map(a => a.label)
      })
    };
  } catch (error) {
    console.error('❌ ========== 예상치 못한 오류 ==========');
    console.error('오류 이름:', error.name);
    console.error('오류 메시지:', error.message);
    console.error('스택:', error.stack);

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'scheduled-collect-transactions',
          errorMessage: error.message,
          context: { stack: error.stack }
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

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
