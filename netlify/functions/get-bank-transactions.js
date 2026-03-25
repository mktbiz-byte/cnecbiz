/**
 * 계좌 거래 내역 조회 API
 * Supabase bank_transactions 테이블에서 직접 조회
 * 5분마다 자동 수집된 데이터를 보여줌
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  console.log('📊 ========== 계좌 거래 내역 조회 시작 ==========');

  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // 쿼리 파라미터에서 날짜 범위 가져오기
    const params = event.queryStringParameters || {};
    const endDate = params.endDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
    const accountLabel = params.accountLabel || null;

    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}, 계좌: ${accountLabel || '전체'}`);

    // Supabase에서 거래 내역 조회
    let query = supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .gte('trade_date', startDate)
      .lte('trade_date', endDate)
      .order('trade_date', { ascending: false })
      .order('trade_time', { ascending: false });

    if (accountLabel === 'howlab') query = query.eq('account_label', '하우랩');
    else if (accountLabel === 'howpapa') query = query.eq('account_label', '하우파파');

    const { data: transactions, error } = await query;

    if (error) {
      console.error('❌ 거래 내역 조회 실패:', error);
      throw error;
    }

    console.log(`✅ ${transactions.length}건의 거래 내역 조회 완료`);

    // 매칭된 충전 요청 정보 가져오기
    const transactionsWithRequests = await Promise.all(
      transactions.map(async (tx) => {
        if (tx.charge_request_id) {
          const { data: request, error: requestError } = await supabaseAdmin
            .from('points_charge_requests')
            .select('id, amount, status, company_id, depositor_name, needs_tax_invoice, tax_invoice_issued, tax_invoice_info')
            .eq('id', tx.charge_request_id)
            .single();

          if (requestError) {
            return { ...tx, matchedRequest: null };
          }

          if (request) {
            const { data: company } = await supabaseAdmin
              .from('companies')
              .select('company_name')
              .eq('user_id', request.company_id)
              .single();

            return {
              ...tx,
              matchedRequest: {
                id: request.id,
                amount: request.amount,
                status: request.status,
                company_name: company?.company_name || request.depositor_name || '알 수 없음',
                needs_tax_invoice: request.needs_tax_invoice,
                tax_invoice_issued: request.tax_invoice_issued || false,
                nts_confirm_num: request.tax_invoice_info?.nts_confirm_num || null
              }
            };
          }
        }

        return { ...tx, matchedRequest: null };
      })
    );

    // 데이터 포맷 변환 (세금계산서 상태 포함)
    const formattedTransactions = transactionsWithRequests.map(tx => {
      let taxInvoiceStatus = tx.tax_invoice_status || 'none';
      let taxInvoiceNtsConfirmNum = tx.tax_invoice_nts_confirm_num || null;

      // charge_request 매칭 정보로 세금계산서 상태 보강
      if (tx.matchedRequest) {
        if (tx.matchedRequest.tax_invoice_issued) {
          taxInvoiceStatus = 'issued';
          taxInvoiceNtsConfirmNum = tx.matchedRequest.nts_confirm_num || taxInvoiceNtsConfirmNum;
        } else if (tx.matchedRequest.needs_tax_invoice) {
          taxInvoiceStatus = 'pending';
        }
      }

      return {
        id: tx.id,
        tid: tx.tid,
        tradeDate: tx.trade_date + (tx.trade_time || ''),
        tradeType: tx.trade_type,
        tradeBalance: tx.trade_balance.toString(),
        balance: tx.after_balance?.toString() || '0',
        briefs: tx.briefs,
        remark1: tx.remark1,
        remark2: tx.remark2,
        remark3: tx.remark3,
        isMatched: tx.is_matched,
        matchedRequest: tx.matchedRequest,
        accountLabel: tx.account_label || null,
        taxInvoiceStatus,
        taxInvoiceNtsConfirmNum,
        chargeRequestId: tx.charge_request_id || null
      };
    });

    // 통계 계산
    const stats = {
      total: formattedTransactions.length,
      matched: formattedTransactions.filter(tx => tx.isMatched).length,
      unmatched: formattedTransactions.filter(tx => !tx.isMatched).length,
      totalAmount: formattedTransactions.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0),
      taxInvoiceIssued: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'issued').length,
      taxInvoicePending: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'pending').length,
      taxInvoiceNone: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'none' || !tx.taxInvoiceStatus).length
    };

    console.log('✅ 통계:', stats);

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
        error: error.message || error.toString()
      })
    };
  }
};
