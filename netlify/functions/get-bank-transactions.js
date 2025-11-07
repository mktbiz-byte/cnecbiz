/**
 * 팝빌 계좌 거래 내역 조회 API
 * Supabase에 저장된 거래 내역을 조회
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // Supabase에서 거래 내역 조회 (관계 제거)
    const { data: transactions, error } = await supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .gte('trade_date', startDate)
      .lte('trade_date', endDate)
      .order('trade_date', { ascending: false })
      .order('trade_time', { ascending: false });

    if (error) {
      console.error('거래 내역 조회 오류:', error);
      throw error;
    }

    console.log(`✅ ${transactions.length}건의 거래 내역 조회 완료`);

    // 매칭된 충전 요청 정보 가져오기
    const transactionsWithRequests = await Promise.all(
      transactions.map(async (tx) => {
        if (tx.charge_request_id) {
          const { data: request } = await supabaseAdmin
            .from('points_charge_requests')
            .select('id, amount, status, company_id')
            .eq('id', tx.charge_request_id)
            .single();

          if (request) {
            const { data: company } = await supabaseAdmin
              .from('companies')
              .select('company_name')
              .eq('id', request.company_id)
              .single();

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
        }
        return { ...tx, matchedRequest: null };
      })
    );

    // 데이터 포맷 변환
    const formattedTransactions = transactionsWithRequests.map(tx => ({
      tid: tx.tid,
      trdt: tx.trade_date,
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

    // 통계 계산
    const stats = {
      total: formattedTransactions.length,
      matched: formattedTransactions.filter(tx => tx.isMatched).length,
      unmatched: formattedTransactions.filter(tx => !tx.isMatched).length,
      totalAmount: formattedTransactions.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0)
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactions: formattedTransactions,
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
        error: error.message || error.toString(),
        details: error.toString()
      })
    };
  }
};
