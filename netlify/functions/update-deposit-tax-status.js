/**
 * 입금 내역의 세금계산서 발행 상태 업데이트 API
 * transactionId(DB id), tid(팝빌 거래ID), chargeRequestId 중 하나로 업데이트
 */

const { getBizClient } = require('./lib/supabase');
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const { transactionId, tid, taxInvoiceStatus, ntsConfirmNum, chargeRequestId } = JSON.parse(event.body || '{}');

    if (!transactionId && !chargeRequestId && !tid) {
      return errorResponse(400, 'transactionId, tid, 또는 chargeRequestId가 필요합니다.');
    }

    const supabaseAdmin = getBizClient();

    // charge_request가 있는 경우 (매칭된 입금)
    if (chargeRequestId) {
      const updates = {};
      if (taxInvoiceStatus === 'issued') {
        updates.tax_invoice_issued = true;
        if (ntsConfirmNum) {
          const { data: existing } = await supabaseAdmin
            .from('points_charge_requests')
            .select('tax_invoice_info')
            .eq('id', chargeRequestId)
            .single();

          const taxInfo = existing?.tax_invoice_info || {};
          taxInfo.nts_confirm_num = ntsConfirmNum;
          taxInfo.issued = true;
          taxInfo.issued_at = new Date().toISOString();
          updates.tax_invoice_info = taxInfo;
        }
      } else if (taxInvoiceStatus === 'not_needed') {
        updates.needs_tax_invoice = false;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabaseAdmin
          .from('points_charge_requests')
          .update(updates)
          .eq('id', chargeRequestId);
        if (error) throw error;
      }
    }

    // bank_transactions 직접 업데이트 (id 또는 tid로)
    if (transactionId || tid) {
      const txUpdates = { tax_invoice_status: taxInvoiceStatus || 'none' };
      if (ntsConfirmNum) txUpdates.tax_invoice_nts_confirm_num = ntsConfirmNum;

      let updateQuery = supabaseAdmin
        .from('bank_transactions')
        .update(txUpdates);

      if (transactionId) {
        updateQuery = updateQuery.eq('id', transactionId);
      } else {
        updateQuery = updateQuery.eq('tid', tid);
      }

      const { error } = await updateQuery;
      if (error) throw error;
    }

    return successResponse({ success: true, message: '세금계산서 상태가 업데이트되었습니다.' });
  } catch (error) {
    console.error('[update-deposit-tax-status] Error:', error);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'update-deposit-tax-status',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, error.message);
  }
};
