/**
 * 입금 내역과 세금계산서 자동 매칭 API
 * bank_transactions의 미발행 입금 건과 발행된 세금계산서를 금액+회사명으로 자동 매칭
 * accountLabel 파라미터로 하우랩/하우파파 구분 지원
 */

const { getBizClient } = require('./lib/supabase');
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

/**
 * 회사명 정규화
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/\s+/g, '')
    .replace(/주식회사/g, '').replace(/\(주\)/g, '').replace(/주\)/g, '')
    .replace(/㈜/g, '').replace(/\(유\)/g, '').replace(/유한회사/g, '')
    .toLowerCase();
}

/**
 * 문자열 유사도 (Levenshtein)
 */
function calculateSimilarity(str1, str2) {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 90;

  const matrix = [];
  for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
    const dryRun = body.dryRun || false;
    const accountLabel = body.accountLabel || null; // 'howlab' | 'howpapa' | null

    const accountLabelKr = accountLabel === 'howlab' ? '하우랩' : accountLabel === 'howpapa' ? '하우파파' : null;

    console.log(`[auto-match] 시작 (dryRun: ${dryRun}, accountLabel: ${accountLabel})`);

    const supabaseAdmin = getBizClient();

    // 1. 미발행 입금 내역 조회 (account_label 필터 적용)
    let depositQuery = supabaseAdmin
      .from('bank_transactions')
      .select('id, tid, briefs, trade_balance, trade_date, tax_invoice_status, charge_request_id, account_label')
      .or('tax_invoice_status.eq.none,tax_invoice_status.is.null')
      .order('trade_date', { ascending: false })
      .limit(500);

    if (accountLabelKr) {
      depositQuery = depositQuery.eq('account_label', accountLabelKr);
    }

    const { data: unmatchedDeposits, error: depError } = await depositQuery;

    if (depError) throw depError;

    if (!unmatchedDeposits || unmatchedDeposits.length === 0) {
      return successResponse({
        success: true,
        message: '매칭할 미발행 입금 건이 없습니다.',
        matched: 0, total: 0, invoiceCount: 0, dryRun, results: []
      });
    }

    console.log(`[auto-match] 미발행 입금 ${unmatchedDeposits.length}건 (${accountLabelKr || '전체'})`);

    // 2. 세금계산서 소스 결정
    const issuedInvoices = [];

    // 하우파파/전체인 경우: points_charge_requests에서 발행 완료된 세금계산서
    if (accountLabel !== 'howlab') {
      try {
        const { data: autoInvoices } = await supabaseAdmin
          .from('points_charge_requests')
          .select('id, amount, company_id, tax_invoice_info, tax_invoice_issued, depositor_name')
          .eq('tax_invoice_issued', true);

        const companyIds = [...new Set((autoInvoices || []).map(inv => inv.company_id).filter(Boolean))];
        let companyMap = {};
        if (companyIds.length > 0) {
          const { data: companies } = await supabaseAdmin
            .from('companies')
            .select('user_id, company_name')
            .in('user_id', companyIds);
          if (companies) companies.forEach(c => { companyMap[c.user_id] = c.company_name; });
        }

        (autoInvoices || []).forEach(inv => {
          issuedInvoices.push({
            source: 'charge_request', sourceId: inv.id,
            companyName: inv.tax_invoice_info?.company_name || companyMap[inv.company_id] || inv.depositor_name || '',
            amount: inv.amount,
            ntsConfirmNum: inv.tax_invoice_info?.nts_confirm_num || null,
            issuedAt: inv.tax_invoice_info?.issued_at || null
          });
        });
      } catch (chargeErr) {
        console.warn('[auto-match] points_charge_requests 조회 실패 (무시):', chargeErr.message);
      }
    }

    // manual_tax_invoices에서 발행 완료된 세금계산서 (전체 조회 후 JS에서 필터)
    try {
      const { data: allManualInvoices, error: manualErr } = await supabaseAdmin
        .from('manual_tax_invoices')
        .select('id, company_name, total_amount, nts_confirm_num, issued_at, status, mgt_key')
        .eq('status', 'issued');

      if (manualErr) {
        console.warn('[auto-match] manual_tax_invoices 조회 에러:', manualErr.message);
      }

      (allManualInvoices || []).forEach(inv => {
        const mgtKey = inv.mgt_key || '';
        const isHowlab = mgtKey.startsWith('L');

        // accountLabel에 따라 필터
        if (accountLabel === 'howlab' && !isHowlab) return;
        if (accountLabel === 'howpapa' && isHowlab) return;

        issuedInvoices.push({
          source: 'manual', sourceId: inv.id,
          companyName: inv.company_name || '',
          amount: inv.total_amount,
          ntsConfirmNum: inv.nts_confirm_num || null,
          issuedAt: inv.issued_at || null
        });
      });
    } catch (manualErr) {
      console.warn('[auto-match] manual_tax_invoices 조회 실패 (무시):', manualErr.message);
    }

    console.log(`[auto-match] 발행된 세금계산서 ${issuedInvoices.length}건`);

    // 이미 매칭된 ntsConfirmNum
    const { data: alreadyMatched } = await supabaseAdmin
      .from('bank_transactions')
      .select('tax_invoice_nts_confirm_num')
      .eq('tax_invoice_status', 'issued')
      .not('tax_invoice_nts_confirm_num', 'is', null);

    const usedNtsNums = new Set((alreadyMatched || []).map(t => t.tax_invoice_nts_confirm_num));

    // 3. 자동 매칭
    const results = [];
    const matchedInvoiceIds = new Set();

    for (const deposit of unmatchedDeposits) {
      const depositAmount = parseInt(deposit.trade_balance);
      const depositName = deposit.briefs || '';

      // charge_request 링크 매칭 (하우파파만 해당)
      if (deposit.charge_request_id) {
        const linkedInvoice = issuedInvoices.find(
          inv => inv.source === 'charge_request' && inv.sourceId === deposit.charge_request_id
        );
        if (linkedInvoice && !matchedInvoiceIds.has(`${linkedInvoice.source}_${linkedInvoice.sourceId}`)) {
          results.push({
            depositId: deposit.id, depositTid: deposit.tid, depositName, depositAmount, depositDate: deposit.trade_date,
            matchedInvoice: linkedInvoice, matchType: 'charge_request_link', similarity: 100, confidence: 'high'
          });
          matchedInvoiceIds.add(`${linkedInvoice.source}_${linkedInvoice.sourceId}`);
          continue;
        }
      }

      // 금액 + 이름 유사도 매칭
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const invoice of issuedInvoices) {
        const invoiceKey = `${invoice.source}_${invoice.sourceId}`;
        if (matchedInvoiceIds.has(invoiceKey)) continue;
        if (invoice.ntsConfirmNum && usedNtsNums.has(invoice.ntsConfirmNum)) continue;
        if (Math.abs(invoice.amount - depositAmount) > 1) continue;

        const similarity = calculateSimilarity(depositName, invoice.companyName);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = invoice;
        }
      }

      if (bestMatch && bestSimilarity >= 60) {
        const confidence = bestSimilarity >= 90 ? 'high' : bestSimilarity >= 75 ? 'medium' : 'low';
        results.push({
          depositId: deposit.id, depositTid: deposit.tid, depositName, depositAmount, depositDate: deposit.trade_date,
          matchedInvoice: bestMatch, matchType: 'amount_name', similarity: bestSimilarity, confidence
        });
        matchedInvoiceIds.add(`${bestMatch.source}_${bestMatch.sourceId}`);
        if (bestMatch.ntsConfirmNum) usedNtsNums.add(bestMatch.ntsConfirmNum);
      }
    }

    console.log(`[auto-match] ${results.length}건 매칭됨`);

    // 4. 실제 업데이트
    let updatedCount = 0;
    if (!dryRun && results.length > 0) {
      for (const match of results) {
        try {
          const updates = { tax_invoice_status: 'issued' };
          if (match.matchedInvoice.ntsConfirmNum) {
            updates.tax_invoice_nts_confirm_num = match.matchedInvoice.ntsConfirmNum;
          }

          // id가 있으면 id로, 없으면 tid로 업데이트
          let updateQuery;
          if (match.depositId) {
            updateQuery = supabaseAdmin
              .from('bank_transactions')
              .update(updates)
              .eq('id', match.depositId);
          } else if (match.depositTid) {
            updateQuery = supabaseAdmin
              .from('bank_transactions')
              .update(updates)
              .eq('tid', match.depositTid);
          } else {
            console.warn('[auto-match] Skip: no id or tid for deposit', match.depositName);
            continue;
          }

          const { error } = await updateQuery;
          if (!error) updatedCount++;
        } catch (err) {
          console.error('[auto-match] Update error:', err.message);
        }
      }
    }

    return successResponse({
      success: true,
      message: dryRun ? `${results.length}건 매칭 가능 (미리보기)` : `${updatedCount}건 자동 매칭 완료`,
      matched: dryRun ? results.length : updatedCount,
      total: unmatchedDeposits.length,
      invoiceCount: issuedInvoices.length,
      dryRun,
      results: results.map(r => ({
        depositId: r.depositId, depositTid: r.depositTid, depositName: r.depositName, depositAmount: r.depositAmount,
        depositDate: r.depositDate, invoiceCompany: r.matchedInvoice.companyName,
        invoiceAmount: r.matchedInvoice.amount, invoiceNtsNum: r.matchedInvoice.ntsConfirmNum,
        invoiceIssuedAt: r.matchedInvoice.issuedAt, matchType: r.matchType,
        similarity: r.similarity, confidence: r.confidence
      }))
    });
  } catch (error) {
    console.error('[auto-match] Error:', error);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'auto-match-tax-invoices',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, error.message || '알 수 없는 오류');
  }
};
