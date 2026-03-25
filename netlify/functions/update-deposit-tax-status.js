/**
 * 입금 내역의 세금계산서 발행 상태 업데이트 API
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { transactionId, taxInvoiceStatus, ntsConfirmNum, chargeRequestId } = JSON.parse(event.body || '{}');

    if (!transactionId && !chargeRequestId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'transactionId 또는 chargeRequestId가 필요합니다.' }) };
    }

    // charge_request가 있는 경우 (매칭된 입금)
    if (chargeRequestId) {
      const updates = {};
      if (taxInvoiceStatus === 'issued') {
        updates.tax_invoice_issued = true;
        if (ntsConfirmNum) {
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

    // bank_transactions 직접 업데이트
    if (transactionId) {
      const txUpdates = { tax_invoice_status: taxInvoiceStatus || 'none' };
      if (ntsConfirmNum) txUpdates.tax_invoice_nts_confirm_num = ntsConfirmNum;

      const { error } = await supabase
        .from('bank_transactions')
        .update(txUpdates)
        .eq('id', transactionId);
      if (error) throw error;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '세금계산서 상태가 업데이트되었습니다.' }) };
  } catch (error) {
    console.error('[update-deposit-tax-status] Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
