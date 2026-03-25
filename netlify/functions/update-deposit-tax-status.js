/**
 * 입금 내역의 세금계산서 발행 상태 업데이트 API
 * - 매칭된 입금: charge_request 의 tax_invoice_issued 업데이트
 * - 미매칭 입금: bank_transactions 의 tax_invoice_status 직접 업데이트
 */

const { getBizClient } = require('./lib/supabase');
const { handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const { transactionId, taxInvoiceStatus, ntsConfirmNum, chargeRequestId } = JSON.parse(event.body);

    if (!transactionId && !chargeRequestId) {
      return errorResponse(400, 'transactionId 또는 chargeRequestId가 필요합니다.');
    }

    const supabase = getBizClient();

    // Case 1: charge_request가 있는 경우 (매칭된 입금)
    if (chargeRequestId) {
      const updates = {};
      if (taxInvoiceStatus === 'issued') {
        updates.tax_invoice_issued = true;
        if (ntsConfirmNum) {
          // tax_invoice_info JSONB 필드에 승인번호 추가
          const { data: existing } = await supabase
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
        const { error } = await supabase
          .from('points_charge_requests')
          .update(updates)
          .eq('id', chargeRequestId);

        if (error) throw error;
      }
    }

    // Case 2: bank_transactions 직접 업데이트 (미매칭 또는 추가 정보)
    if (transactionId) {
      const txUpdates = {
        tax_invoice_status: taxInvoiceStatus || 'none'
      };
      if (ntsConfirmNum) {
        txUpdates.tax_invoice_nts_confirm_num = ntsConfirmNum;
      }

      const { error } = await supabase
        .from('bank_transactions')
        .update(txUpdates)
        .eq('id', transactionId);

      if (error) throw error;
    }

    return successResponse({
      success: true,
      message: '세금계산서 상태가 업데이트되었습니다.'
    });
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
