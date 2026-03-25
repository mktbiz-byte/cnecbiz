/**
 * 계좌 거래 내역 조회 API
 * Supabase bank_transactions 테이블에서 직접 조회
 * 세금계산서 발행 상태 포함
 */

const { getBizClient } = require('./lib/supabase');
const { handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const supabaseAdmin = getBizClient();

    const params = event.queryStringParameters || {};
    const startDate = params.startDate || null;
    const endDate = params.endDate || null;
    const accountLabel = params.accountLabel || null;

    // bank_transactions 조회 (날짜 파라미터 없으면 전체 조회)
    let query = supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .order('trade_date', { ascending: false })
      .order('trade_time', { ascending: false });

    if (startDate) query = query.gte('trade_date', startDate);
    if (endDate) query = query.lte('trade_date', endDate);
    if (accountLabel === 'howlab') query = query.eq('account_label', '하우랩');
    else if (accountLabel === 'howpapa') query = query.eq('account_label', '하우파파');

    console.log(`[get-bank-transactions] 조회: ${accountLabel || '전체'} / ${startDate || '전체'} ~ ${endDate || '전체'}`);

    const { data: transactions, error } = await query;

    if (error) throw error;

    // 매칭된 charge_request_id 목록 추출
    const chargeRequestIds = [...new Set(
      transactions.filter(tx => tx.charge_request_id).map(tx => tx.charge_request_id)
    )];

    // 한 번에 충전 요청 + 세금계산서 정보 조회
    let chargeRequestMap = {};
    if (chargeRequestIds.length > 0) {
      const { data: requests } = await supabaseAdmin
        .from('points_charge_requests')
        .select('id, amount, status, company_id, depositor_name, needs_tax_invoice, tax_invoice_issued, tax_invoice_info')
        .in('id', chargeRequestIds);

      if (requests) {
        // company_id 목록으로 회사명 일괄 조회
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
    const formattedTransactions = transactions.map(tx => {
      const matchedRequest = tx.charge_request_id ? (chargeRequestMap[tx.charge_request_id] || null) : null;

      // 세금계산서 상태 결정
      let taxInvoiceStatus = tx.tax_invoice_status || 'none';
      let taxInvoiceNtsConfirmNum = tx.tax_invoice_nts_confirm_num || null;

      // 매칭된 충전 요청이 있으면 그쪽의 세금계산서 상태를 우선 사용
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
        tradeBalance: tx.trade_balance.toString(),
        balance: tx.after_balance?.toString() || '0',
        briefs: tx.briefs,
        remark1: tx.remark1,
        remark2: tx.remark2,
        remark3: tx.remark3,
        isMatched: tx.is_matched,
        matchedRequest,
        accountLabel: tx.account_label || null,
        taxInvoiceStatus,
        taxInvoiceNtsConfirmNum,
        chargeRequestId: tx.charge_request_id || null
      };
    });

    // 통계 계산 (세금계산서 통계 포함)
    const stats = {
      total: formattedTransactions.length,
      matched: formattedTransactions.filter(tx => tx.isMatched).length,
      unmatched: formattedTransactions.filter(tx => !tx.isMatched).length,
      totalAmount: formattedTransactions.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0),
      taxInvoiceIssued: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'issued').length,
      taxInvoicePending: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'pending').length,
      taxInvoiceNone: formattedTransactions.filter(tx => tx.taxInvoiceStatus === 'none' || tx.taxInvoiceStatus === 'not_needed').length
    };

    return successResponse({
      success: true,
      transactions: formattedTransactions,
      stats,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('[get-bank-transactions] Error:', error);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-bank-transactions',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, error.message);
  }
};
