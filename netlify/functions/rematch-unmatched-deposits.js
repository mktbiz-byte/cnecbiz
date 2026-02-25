/**
 * 기존 미매칭 입금 건 재매칭 함수
 * 수동 실행용 (관리자가 필요 시 호출)
 */

const { createClient } = require('@supabase/supabase-js');

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
    .replace(/（주）/g, '') // 전각 괄호
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

exports.handler = async (event, context) => {
  console.log('🔄 ========== 재매칭 시작 ==========');

  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Supabase 클라이언트 초기화
    // Netlify Functions에서는 VITE_ 접두사 없이 환경변수 접근
    const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.SUPABASE_BIZ_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('📌 환경변수 확인:');
    console.log(`  - VITE_SUPABASE_BIZ_URL: ${supabaseUrl ? '✅' : '❌'}`);
    console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅' : '❌'}`);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('환경변수가 설정되지 않았습니다');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Supabase 클라이언트 초기화 성공 (Service Role Key 사용)\n');

    // 1. 미매칭 입금 건 조회
    console.log('🔍 1단계: 미매칭 입금 건 조회');
    const { data: deposits, error: depositError } = await supabase
      .from('bank_transactions')
      .select('*')
      .is('matched_request_id', null)
      .order('trade_date', { ascending: false });

    if (depositError) {
      console.error('❌ 입금 조회 오류:', depositError);
      throw depositError;
    }

    console.log(`📊 조회 결과: ${deposits ? deposits.length : 0}건`);
    if (deposits && deposits.length > 0) {
      deposits.slice(0, 3).forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.briefs} - ${parseInt(d.trade_balance).toLocaleString()}원`);
      });
      if (deposits.length > 3) {
        console.log(`  ... 외 ${deposits.length - 3}건`);
      }
    }

    if (!deposits || deposits.length === 0) {
      console.log('✅ 미매칭 입금 건 없음\n');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '미매칭 입금 건 없음',
          matched: 0
        })
      };
    }

    // 2. 대기 중인 충전 요청 조회
    console.log('\n🔍 2단계: 대기 중인 충전 요청 조회');
    const { data: requests, error: requestError } = await supabase
      .from('points_charge_requests')
      .select('id, company_id, depositor_name, amount, status, payment_method, created_at')
      .eq('status', 'pending')
      .eq('payment_method', 'bank_transfer')
      .order('created_at', { ascending: true });

    if (requestError) {
      console.error('❌ 충전 요청 조회 오류:', requestError);
      throw requestError;
    }

    console.log(`📊 조회 결과: ${requests ? requests.length : 0}건`);
    if (requests && requests.length > 0) {
      requests.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.depositor_name} - ${parseInt(r.amount).toLocaleString()}원`);
      });
    }

    if (!requests || requests.length === 0) {
      console.log('✅ 대기 중인 충전 요청 없음\n');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '대기 중인 충전 요청 없음',
          matched: 0
        })
      };
    }

    // 3. 매칭 시도
    console.log('\n🔍 3단계: 매칭 시도');
    let matchedCount = 0;
    const matchResults = [];

    for (const deposit of deposits) {
      console.log(`\n📌 입금: ${deposit.briefs} (${parseInt(deposit.trade_balance).toLocaleString()}원)`);
      
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const request of requests) {
        // 금액 일치 확인
        if (parseInt(deposit.trade_balance) !== parseInt(request.amount)) {
          continue;
        }

        // 유사도 계산
        const similarity = calculateSimilarity(deposit.briefs, request.depositor_name);
        console.log(`  - "${request.depositor_name}" 유사도: ${similarity}%`);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = request;
        }
      }

      // 70% 이상 유사도면 매칭
      if (bestMatch && bestSimilarity >= 70) {
        console.log(`  ✅ 매칭 성공! (유사도: ${bestSimilarity}%)`);
        console.log(`     → 충전 요청 ID: ${bestMatch.id}`);

        try {
          // bank_transactions 업데이트
          const { error: updateDepositError } = await supabase
            .from('bank_transactions')
            .update({ 
              matched_request_id: bestMatch.id,
              is_matched: true 
            })
            .eq('id', deposit.id);

          if (updateDepositError) {
            console.error(`  ❌ bank_transactions 업데이트 실패:`, updateDepositError);
            continue;
          }

          // points_charge_requests 업데이트
          const { error: updateRequestError } = await supabase
            .from('points_charge_requests')
            .update({ status: 'completed' })
            .eq('id', bestMatch.id);

          if (updateRequestError) {
            console.error(`  ❌ points_charge_requests 업데이트 실패:`, updateRequestError);
            console.error(`  에러 상세:`, JSON.stringify(updateRequestError, null, 2));
            console.error(`  충전 요청 ID: ${bestMatch.id}`);
            console.error(`  Service Role Key 사용 여부: ${supabaseServiceKey ? '✅' : '❌'}`);
            continue;
          }

          // 포인트 충전
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('points_balance')
            .eq('user_id', bestMatch.company_id)
            .single();

          if (!companyError && company) {
            const newPoints = (company.points_balance || 0) + parseInt(bestMatch.amount);
            await supabase
              .from('companies')
              .update({ points_balance: newPoints })
              .eq('user_id', bestMatch.company_id);

            console.log(`  💰 포인트 충전: ${parseInt(bestMatch.amount).toLocaleString()}P`);
          }

          // 매출 기록 추가
          const { error: revenueError } = await supabase
            .from('financial_records')
            .insert({
              record_date: deposit.trade_date || new Date().toISOString().slice(0, 10),
              type: 'revenue',
              category: 'point_charge',
              amount: parseInt(bestMatch.amount),
              description: `포인트 충전 - ${bestMatch.depositor_name}`,
              is_receivable: false
            });

          if (revenueError) {
            console.error(`  ⚠️  매출 기록 실패:`, revenueError.message);
          } else {
            console.log(`  📊 매출 기록 완료: ${parseInt(bestMatch.amount).toLocaleString()}원`);
          }

          matchedCount++;
          matchResults.push({
            deposit: deposit.briefs,
            request: bestMatch.depositor_name,
            amount: bestMatch.amount,
            similarity: bestSimilarity
          });

          // 알림 발송 (비동기)
          try {
            const axios = require('axios');
            
            // 회사 정보 조회
            const { data: companyData } = await supabase
              .from('companies')
              .select('company_name, notification_email, notification_phone')
              .eq('user_id', bestMatch.company_id)
              .single();
            
            const companyName = companyData?.company_name || '고객사';
            const companyEmail = companyData?.notification_email;
            const companyPhone = companyData?.notification_phone;

            // 알림톡
            if (companyPhone) {
              await axios.post(
                `${process.env.URL}/.netlify/functions/send-kakao-notification`,
                {
                  receiverNum: companyPhone,
                  receiverName: companyName,
                  templateCode: '025100000943',
                  variables: {
                    '회사명': companyName,
                    '포인트': parseInt(bestMatch.amount).toLocaleString()
                  }
                },
                { timeout: 5000 }
              );
              console.log(`  📱 알림톡 발송 완료`);
            }

            // 이메일
            if (companyEmail) {
              await axios.post(
                `${process.env.URL}/.netlify/functions/send-email`,
                {
                  to: companyEmail,
                  subject: '[CNEC] 입금 확인 완료',
                  html: `
                    <h2>✅ 입금이 확인되었습니다</h2>
                    <p>충전 포인트: ${parseInt(bestMatch.amount).toLocaleString()}P</p>
                    <p>이제 포인트를 사용하실 수 있습니다.</p>
                  `
                },
                { timeout: 5000 }
              );
              console.log(`  📧 이메일 발송 완료`);
            }

            // 네이버 웍스 (관리자)
            await axios.post(
              `${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`,
              {
                message: `✅ 입금 확인 완료\n\n회사명: ${companyName}\n충전 금액: ${parseInt(bestMatch.amount).toLocaleString()}원\n확인 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
                isAdminNotification: true,
                channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
              },
              { timeout: 5000 }
            );
            console.log(`  💬 네이버 웍스 발송 완료`);

          } catch (notificationError) {
            console.error(`  ⚠️  알림 발송 오류:`, notificationError.message);
          }

        } catch (matchError) {
          console.error(`  ❌ 매칭 처리 오류:`, matchError);
        }
      } else {
        console.log(`  ❌ 매칭 실패 (최고 유사도: ${bestSimilarity}%)`);
      }
    }

    console.log(`\n✅ ========== 재매칭 완료: ${matchedCount}건 ==========\n`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${matchedCount}건 재매칭 완료`,
        matched: matchedCount,
        results: matchResults
      })
    };

  } catch (error) {
    console.error('❌ 재매칭 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
