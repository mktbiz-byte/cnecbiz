/**
 * 팝빌 계좌 거래 내역 조회 API
 * Supabase에 저장된 거래 내역을 조회
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 [DEBUG] Supabase URL:', supabaseUrl);
console.log('🔧 [DEBUG] Service Key exists:', !!supabaseServiceKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  console.log('📊 ========== 계좌 거래 내역 조회 시작 ==========');
  console.log('🔧 [DEBUG] HTTP Method:', event.httpMethod);
  console.log('🔧 [DEBUG] Query Params:', event.queryStringParameters);

  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
      console.log('✅ OPTIONS 요청 처리');
      return { statusCode: 200, headers, body: '' };
    }

    // 쿼리 파라미터에서 날짜 범위 가져오기
    const params = event.queryStringParameters || {};
    const endDate = params.endDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);

    // Supabase에서 거래 내역 조회
    console.log('🔍 [STEP 1] bank_transactions 테이블 조회 시작...');
    const { data: transactions, error } = await supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .gte('trade_date', startDate)
      .lte('trade_date', endDate)
      .order('trade_date', { ascending: false })
      .order('trade_time', { ascending: false });

    if (error) {
      console.error('❌ [ERROR] 거래 내역 조회 실패:', error);
      console.error('❌ [ERROR] Error code:', error.code);
      console.error('❌ [ERROR] Error message:', error.message);
      console.error('❌ [ERROR] Error details:', error.details);
      throw error;
    }

    console.log(`✅ [STEP 1] ${transactions.length}건의 거래 내역 조회 완료`);
    console.log('🔧 [DEBUG] 첫 번째 거래:', transactions[0]);

    // 매칭된 충전 요청 정보 가져오기
    console.log('🔍 [STEP 2] 매칭된 충전 요청 정보 조회 시작...');
    const transactionsWithRequests = await Promise.all(
      transactions.map(async (tx, index) => {
        console.log(`🔧 [DEBUG] 거래 ${index + 1}/${transactions.length} 처리 중...`);
        
        if (tx.charge_request_id) {
          console.log(`  - charge_request_id: ${tx.charge_request_id}`);
          
          const { data: request, error: requestError } = await supabaseAdmin
            .from('points_charge_requests')
            .select('id, amount, status, company_id')
            .eq('id', tx.charge_request_id)
            .single();

          if (requestError) {
            console.error(`  ❌ 충전 요청 조회 실패:`, requestError);
            return { ...tx, matchedRequest: null };
          }

          if (request) {
            console.log(`  ✅ 충전 요청 발견: ${request.id}`);
            
            const { data: company, error: companyError } = await supabaseAdmin
              .from('companies')
              .select('company_name')
              .eq('id', request.company_id)
              .single();

            if (companyError) {
              console.error(`  ❌ 회사 정보 조회 실패:`, companyError);
            } else {
              console.log(`  ✅ 회사 정보: ${company?.company_name}`);
            }

            return {
              ...tx,
              matchedRequest: {
                id: request.id,
                amount: request.amount,
                status: request.status,
                company_name: company?.company_name
              }
            };
          }
        } else {
          console.log(`  - 매칭 없음`);
        }
        
        return { ...tx, matchedRequest: null };
      })
    );

    console.log('✅ [STEP 2] 매칭 정보 조회 완료');

    // 데이터 포맷 변환
    console.log('🔍 [STEP 3] 데이터 포맷 변환 시작...');
    const formattedTransactions = transactionsWithRequests.map(tx => ({
      tid: tx.tid,
      tradeDate: tx.trade_date + (tx.trade_time || ''), // 프론트엔드에서 tradeDate로 사용
      tradeType: tx.trade_type,
      tradeBalance: tx.trade_balance.toString(),
      balance: tx.after_balance?.toString() || '0',
      briefs: tx.briefs,
      remark1: tx.remark1,
      remark2: tx.remark2,
      remark3: tx.remark3,
      isMatched: tx.is_matched,
      matchedRequest: tx.matchedRequest
    }));

    console.log('✅ [STEP 3] 데이터 포맷 변환 완료');

    // 통계 계산
    console.log('🔍 [STEP 4] 통계 계산 시작...');
    const stats = {
      total: formattedTransactions.length,
      matched: formattedTransactions.filter(tx => tx.isMatched).length,
      unmatched: formattedTransactions.filter(tx => !tx.isMatched).length,
      totalAmount: formattedTransactions.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0)
    };

    console.log('✅ [STEP 4] 통계 계산 완료:', stats);
    console.log('📊 ========== 조회 성공 ==========');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactions: formattedTransactions,
        stats,
        period: { startDate, endDate },
        debug: {
          totalTransactions: transactions.length,
          supabaseUrl: supabaseUrl,
          timestamp: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    console.error('❌ ========== 오류 발생 ==========');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || error.toString(),
        errorName: error.name,
        errorCode: error.code,
        details: error.toString(),
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};
