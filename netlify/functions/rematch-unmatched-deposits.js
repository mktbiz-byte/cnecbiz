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

exports.handler = async (event, context) => {
  console.log('🔄 [REMATCH] 기존 미매칭 거래 재매칭 시작');

  // Supabase 클라이언트 초기화 (함수 내부에서)
  const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 환경변수 오류: VITE_SUPABASE_BIZ_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다');
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: '환경변수 오류'
      })
    };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase 클라이언트 초기화 성공');

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
    // 미매칭 입금 건 조회
    const { data: unmatchedDeposits, error: depositError } = await supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .is('matched_request_id', null)
      .order('trade_date', { ascending: false });

    if (depositError) {
      console.error('❌ 미매칭 입금 조회 오류:', depositError);
      throw depositError;
    }

    if (!unmatchedDeposits || unmatchedDeposits.length === 0) {
      console.log('✅ 미매칭 입금 건 없음');
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

    console.log(`📊 총 ${unmatchedDeposits.length}건의 미매칭 입금 발견`);

    // 대기 중인 충전 요청 조회
    const { data: pendingRequests, error: requestError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_method', 'bank_transfer')
      .order('created_at', { ascending: true });

    if (requestError) {
      console.error('❌ 충전 요청 조회 오류:', requestError);
      throw requestError;
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log('⚠️  대기 중인 충전 요청 없음');
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

    console.log(`📊 총 ${pendingRequests.length}건의 대기 중인 충전 요청`);
    pendingRequests.forEach(req => {
      console.log(`  - ${req.depositor_name}: ${parseInt(req.amount).toLocaleString()}원`);
    });

    let matchedCount = 0;
    const matchResults = [];

    // 각 미매칭 입금 건에 대해 유사도 매칭 시도
    for (const deposit of unmatchedDeposits) {
      console.log(`\n🔍 [${deposit.briefs}] ${deposit.trade_balance}원 매칭 시도`);

      // 금액이 일치하는 요청만 필터링
      const amountMatchedRequests = pendingRequests.filter(
        req => parseInt(req.amount) === parseInt(deposit.trade_balance)
      );

      if (amountMatchedRequests.length === 0) {
        console.log(`  ⚠️  금액 일치하는 요청 없음`);
        continue;
      }

      // 유사도 계산
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const req of amountMatchedRequests) {
        const similarity = calculateSimilarity(deposit.briefs, req.depositor_name);
        console.log(`  - ${req.depositor_name}: ${similarity}% 유사`);
        
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = req;
        }
      }

      // 70% 이상 유사도면 자동 매칭
      if (bestSimilarity >= 70) {
        console.log(`  ✅ 매칭 발견: ${bestMatch.depositor_name} (${bestSimilarity}%)`);

        try {
          // 포인트 충전 처리
          const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('points_balance')
            .eq('id', bestMatch.company_id)
            .single();

          if (companyError) {
            console.error('  ❌ 회사 정보 조회 오류:', companyError);
            continue;
          }

          const newPoints = (company.points_balance || 0) + parseInt(bestMatch.amount);

          // 포인트 업데이트
          await supabaseAdmin
            .from('companies')
            .update({ points_balance: newPoints })
            .eq('id', bestMatch.company_id);

          // 포인트 거래 내역 기록
          await supabaseAdmin
            .from('point_transactions')
            .insert({
              company_id: bestMatch.company_id,
              amount: parseInt(bestMatch.amount),
              type: 'charge',
              description: `계좌이체 입금 확인 (재매칭 - ${bestSimilarity}% 유사)`,
              balance_after: newPoints,
              charge_request_id: bestMatch.id
            });

          // 충전 요청 상태 업데이트
          await supabaseAdmin
            .from('points_charge_requests')
            .update({
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
              confirmed_by: 'system_rematch',
              deposit_date: deposit.trade_date,
              actual_amount: parseInt(deposit.trade_balance)
            })
            .eq('id', bestMatch.id);

          // 입금 거래 매칭 표시
          await supabaseAdmin
            .from('bank_transactions')
            .update({ matched_request_id: bestMatch.id })
            .eq('id', deposit.id);

          console.log(`  🎉 매칭 완료! 충전: ${bestMatch.amount}원, 새 잔액: ${newPoints}원`);

          matchedCount++;
          matchResults.push({
            depositBriefs: deposit.briefs,
            matchedTo: bestMatch.depositor_name,
            similarity: bestSimilarity,
            amount: bestMatch.amount
          });

          // 알림 발송 (비동기)
          try {
            const axios = require('axios');
            
            // 회사 정보 조회
            const { data: companyData } = await supabaseAdmin
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
                }
              );
            }

            // 이메일
            if (companyEmail) {
              const koreanDate = new Date().toLocaleString('ko-KR', { 
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

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
                            <td style="padding: 8px 0; font-size: 18px; color: #4CAF50;"><strong>${parseInt(bestMatch.amount).toLocaleString()}P</strong></td>
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
            }

            // 관리자 알림
            const naverMessage = `✅ 입금 확인 완료 (재매칭)\n\n` +
              `회사명: ${companyName}\n` +
              `충전 금액: ${parseInt(bestMatch.amount).toLocaleString()}원\n` +
              `새 잔액: ${newPoints.toLocaleString()}P\n` +
              `유사도: ${bestSimilarity}%\n` +
              `입금자: ${deposit.briefs} → ${bestMatch.depositor_name}\n\n` +
              `관리자 페이지: https://cnectotal.netlify.app/admin/deposits`;

            await axios.post(
              `${process.env.URL}/.netlify/functions/send-naver-works-message`,
              {
                message: naverMessage,
                isAdminNotification: true
              }
            );
          } catch (notificationError) {
            console.error('  ❌ 알림 발송 오류:', notificationError.message);
          }

        } catch (matchError) {
          console.error('  ❌ 매칭 처리 오류:', matchError);
        }
      } else {
        console.log(`  ⚠️  유사도 부족: ${bestSimilarity}%`);
      }
    }

    console.log(`\n🎉 재매칭 완료: ${matchedCount}건 매칭됨`);

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
    console.error('❌ 예상치 못한 오류:', error);
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
