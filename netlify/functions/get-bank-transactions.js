/**
 * 계좌 거래 내역 조회 API
 * Supabase bank_transactions 테이블에서 직접 조회
 * 세금계산서 발행 상태 포함
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const startDate = params.startDate || null;
    const endDate = params.endDate || null;
    const accountLabel = params.accountLabel || null;

    // bank_transactions 조회
    let query = supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .order('trade_date', { ascending: false })
      .order('trade_time', { ascending: false })
      .limit(2000);

    if (startDate) query = query.gte('trade_date', startDate);
    if (endDate) query = query.lte('trade_date', endDate);
    if (accountLabel === 'howlab') query = query.eq('account_label', '하우랩');
    else if (accountLabel === 'howpapa') query = query.eq('account_label', '하우파파');

    const { data: transactions, error } = await query;

    if (error) throw error;

    // 매칭된 charge_request_id 목록 추출
    const chargeRequestIds = [...new Set(
      (transactions || []).filter(tx => tx.charge_request_id).map(tx => tx.charge_request_id)
    )];

    // 한 번에 충전 요청 + 세금계산서 정보 조회
    let chargeRequestMap = {};
    if (chargeRequestIds.length > 0) {
      const { data: requests } = await supabaseAdmin
        .from('points_charge_requests')
        .select('id, amount, status, company_id, depositor_name, needs_tax_invoice, tax_invoice_issued, tax_invoice_info')
        .in('id', chargeRequestIds);

      if (requests) {
        const companyIds = [...new Set(requests.map(r => r.company_id).filter(Boolean))];
        let companyMap = {};
        if (companyIds.length > 0) {
          const { data: companies } = await supabaseAdmin
            .from('companies')
            .select('user_id, company_name')
            .in('user_id', companyIds);
          if (companies) {
            companies.forEach(c => { companyMap[c.user_id] = c.company_name; });
          }
        }

        requests.forEach(req => {
          chargeRequestMap[req.id] = {
            id: req.id,
            amount: req.amount,
            status: req.status,
            company_name: companyMap[req.company_id] || req.depositor_name || '알 수 없음',
            needs_tax_invoice: req.needs_tax_invoice,
            tax_invoice_issued: req.tax_invoice_issued || false,
            nts_confirm_num: req.tax_invoice_info?.nts_confirm_num || null
          };
        });
      }
    }

    // 데이터 포맷 변환 (세금계산서 상태 포함)
    const formattedTransactions = (transactions || []).map(tx => {
      const matchedRequest = tx.charge_request_id ? (chargeRequestMap[tx.charge_request_id] || null) : null;

      let taxInvoiceStatus = tx.tax_invoice_status || 'none';
      let taxInvoiceNtsConfirmNum = tx.tax_invoice_nts_confirm_num || null;

      if (matchedRequest) {
        if (matchedRequest.tax_invoice_issued) {
          taxInvoiceStatus = 'issued';
          taxInvoiceNtsConfirmNum = matchedRequest.nts_confirm_num || taxInvoiceNtsConfirmNum;
        } else if (matchedRequest.needs_tax_invoice) {
          taxInvoiceStatus = 'pending';
        }
      }

      return {
        id: tx.id,
        tid: tx.tid,
        tradeDate: tx.trade_date + (tx.trade_time || ''),
        tradeType: tx.trade_type,
        tradeBalance: String(tx.trade_balance),
        balance: tx.after_balance?.toString() || '0',
        briefs: tx.briefs,
        isMatched: tx.is_matched,
        matchedRequest,
        accountLabel: tx.account_label || null,
        taxInvoiceStatus,
        taxInvoiceNtsConfirmNum,
        chargeRequestId: tx.charge_request_id || null
      };
    });

    const stats = {
      total: formattedTransactions.length,
      matched: formattedTransactions.filter(tx => tx.isMatched).length,
      unmatched: formattedTransactions.filter(tx => !tx.isMatched).length,
      totalAmount: formattedTransactions.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0),
      taxInvoiceIssued: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'issued').length,
      taxInvoicePending: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'pending').length,
      taxInvoiceNone: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'none' || !tx.taxInvoiceStatus).length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, transactions: formattedTransactions, stats })
    };
  } catch (error) {
    console.error('[get-bank-transactions] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
