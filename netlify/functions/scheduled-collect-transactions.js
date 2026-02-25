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
        // TODO: 네이버 웍스 경고 메시지 발송
        return { needsManualReview: true, similarity: bestSimilarity, match: bestMatch };
      } else {
        console.log(`❌ 유사도 너무 낮음: ${bestSimilarity}%`);
        return null;
      }
    }

    const request = requests[0];
    console.log(`✅ 자동 매칭 발견: ${request.id}`);

    // 포인트 충전 처리
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('points_balance')
      .eq('id', request.company_id)
      .single();

    if (companyError) {
      console.error('❌ 회사 정보 조회 오류:', companyError);
      return null;
    }

    const newPoints = (company.points_balance || 0) + parseInt(request.amount);

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

          // 네이버 웍스 알림 발송
          if (campaign) {
            try {
              const axios = require('axios');
              await axios.post(
                `${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`,
                {
                  isAdminNotification: true,
                  channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
                  message: `🎉 **새로운 캠페인 승인 요청**\n\n` +
                        `🏬 **회사:** ${companyInfo?.company_name || '미상'}\n` +
                        `📝 **캠페인:** ${campaign.title}\n` +
                        `🎯 **타입:** ${campaign.campaign_type || '미상'}\n` +
                        `👥 **크리에이터 수:** ${campaign.influencer_count || 0}명\n` +
                        `💰 **입금 금액:** ${parseInt(request.amount).toLocaleString()}원\n\n` +
                        `➡️ 관리자 페이지에서 확인해주세요.`
                }
              );
              console.log('✅ 네이버 웍스 알림 발송 완료');
            } catch (worksError) {
              console.error('❌ 네이버 웍스 알림 발송 실패:', worksError.message);
            }
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

    // 입금 확인 알림 발송 (비동기 - 실패해도 매칭은 완료)
    try {
      const axios = require('axios');
      const koreanDate = new Date().toLocaleString('ko-KR', { 
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 회사 정보 조회
      const { data: companyInfo, error: companyInfoError } = await supabaseAdmin
        .from('companies')
        .select('company_name, notification_email, notification_phone')
        .eq('id', request.company_id)
        .single();

      if (companyInfoError) {
        console.error('❌ 회사 정보 조회 실패:', companyInfoError);
      } else {
        const companyName = companyInfo.company_name || '고객사';
        const companyEmail = companyInfo.notification_email;
        const companyPhone = companyInfo.notification_phone;

        // 1. 고객에게 알림톡 발송
        if (companyPhone) {
          try {
            console.log(`📱 알림톡 발송: ${companyPhone}`);
            await axios.post(
              `${process.env.URL}/.netlify/functions/send-kakao-notification`,
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
              `${process.env.URL}/.netlify/functions/send-email`,
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

        // 3. 관리자에게 네이버 웍스 알림
        try {
          console.log('📢 관리자 네이버 웍스 알림 발송');
          const naverMessage = `✅ 입금 확인 완료\n\n` +
            `회사명: ${companyName}\n` +
            `충전 금액: ${parseInt(request.amount).toLocaleString()}원\n` +
            `새 잔액: ${newPoints.toLocaleString()}P\n` +
            `확인 시간: ${koreanDate}\n\n` +
            `관리자 페이지: https://cnecbiz.com/admin/deposits`;

          await axios.post(
            `${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`,
            {
              message: naverMessage,
              isAdminNotification: true,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
            }
          );
          console.log('✅ 관리자 알림 발송 완료');
        } catch (naverError) {
          console.error('❌ 관리자 알림 발송 실패:', naverError.message);
        }
      }
    } catch (notificationError) {
      console.error('❌ 알림 발송 오류:', notificationError);
      // 알림 실패해도 매칭은 완료
    }

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
    // 최근 30일 거래 내역 수집
    const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

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

    // 5. 미매칭 입금 감지 및 알림
    console.log('🔍 [STEP 5] 미매칭 입금 확인...');
    const unmatchedCount = savedCount - matchedCount;
    
    if (unmatchedCount > 0) {
      try {
        // 미매칭 입금 내역 조회
        const { data: unmatchedTransactions } = await supabaseAdmin
          .from('bank_transactions')
          .select('*')
          .eq('is_matched', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (unmatchedTransactions && unmatchedTransactions.length > 0) {
          console.log(`⚠️  미매칭 입금 ${unmatchedTransactions.length}건 발견`);
          
          // 네이버 웍스 알림 발송
          const axios = require('axios');
          let alertMessage = `⚠️ 미매칭 입금 발견!\n\n`;
          alertMessage += `총 ${unmatchedTransactions.length}건의 입금이 결제 요청과 매칭되지 않았습니다.\n\n`;
          
          unmatchedTransactions.slice(0, 5).forEach((tx, index) => {
            const date = `${tx.trade_date.substring(0,4)}-${tx.trade_date.substring(4,6)}-${tx.trade_date.substring(6,8)}`;
            alertMessage += `${index + 1}. ${tx.briefs} / ${parseInt(tx.trade_balance).toLocaleString()}원 (${date})\n`;
          });
          
          if (unmatchedTransactions.length > 5) {
            alertMessage += `\n... 외 ${unmatchedTransactions.length - 5}건 더 있음\n`;
          }
          
          alertMessage += `\n확인 페이지: https://cnecbiz.com/admin/deposits`;
          
          await axios.post(
            `${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`,
            {
              message: alertMessage,
              isAdminNotification: true,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
            }
          );
          console.log('✅ 미매칭 입금 알림 발송 완료');
        }
      } catch (alertError) {
        console.error('❌ 미매칭 입금 알림 발송 실패:', alertError.message);
      }
    } else {
      console.log('✅ 모든 입금이 정상적으로 매칭되었습니다.');
    }
    
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
