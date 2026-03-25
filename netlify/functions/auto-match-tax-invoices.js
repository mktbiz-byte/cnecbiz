/**
 * 입금 내역과 세금계산서 자동 매칭 API
 * bank_transactions의 미발행 입금 건과 발행된 세금계산서를 금액+회사명으로 자동 매칭
 */

const { getBizClient } = require('./lib/supabase');
const { handleOptions, successResponse, errorResponse } = require('./lib/supabase');

/**
 * 회사명 정규화 (매칭 정확도 향상)
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/\s+/g, '')
    .replace(/주식회사/g, '')
    .replace(/\(주\)/g, '')
    .replace(/주\)/g, '')
    .replace(/㈜/g, '')
    .replace(/\(유\)/g, '')
    .replace(/유한회사/g, '')
    .replace(/유\)/g, '')
    .toLowerCase();
}

/**
 * 문자열 유사도 계산 (Levenshtein Distance 기반)
 */
function calculateSimilarity(str1, str2) {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;

  // 한쪽이 다른 쪽에 포함되면 높은 점수
  if (s1.includes(s2) || s2.includes(s1)) return 90;

  const matrix = [];
  for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;

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
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const supabase = getBizClient();
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {};
    const dryRun = body.dryRun || false; // true면 미리보기만, false면 실제 업데이트

    console.log(`[auto-match-tax-invoices] 시작 (dryRun: ${dryRun})`);

    // 1. 미발행 입금 내역 조회
    const { data: unmatchedDeposits, error: depError } = await supabase
      .from('bank_transactions')
      .select('id, tid, briefs, trade_balance, trade_date, tax_invoice_status, charge_request_id')
      .in('tax_invoice_status', ['none'])
      .eq('trade_type', 'I')
      .order('trade_date', { ascending: false });

    if (depError) throw depError;

    if (!unmatchedDeposits || unmatchedDeposits.length === 0) {
      return successResponse({
        success: true,
        message: '매칭할 미발행 입금 건이 없습니다.',
        matched: 0,
        results: []
      });
    }

    console.log(`[auto-match-tax-invoices] 미발행 입금 ${unmatchedDeposits.length}건`);

    // 2. 발행 완료된 세금계산서 조회 (2개 소스)

    // 2a. points_charge_requests에서 발행 완료된 세금계산서
    const { data: autoInvoices } = await supabase
      .from('points_charge_requests')
      .select('id, amount, company_id, tax_invoice_info, tax_invoice_issued, depositor_name')
      .eq('tax_invoice_issued', true)
      .eq('needs_tax_invoice', true);

    // company_id → 회사명 매핑
    const companyIds = [...new Set((autoInvoices || []).map(inv => inv.company_id).filter(Boolean))];
    let companyMap = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('user_id, company_name')
        .in('user_id', companyIds);
      if (companies) {
        companies.forEach(c => { companyMap[c.user_id] = c.company_name; });
      }
    }

    // 발행된 세금계산서 목록 통합 (회사명 + 금액 + 승인번호)
    const issuedInvoices = [];

    (autoInvoices || []).forEach(inv => {
      const companyName = inv.tax_invoice_info?.company_name
        || companyMap[inv.company_id]
        || inv.depositor_name
        || '';
      issuedInvoices.push({
        source: 'charge_request',
        sourceId: inv.id,
        companyName,
        amount: inv.amount,
        ntsConfirmNum: inv.tax_invoice_info?.nts_confirm_num || null,
        issuedAt: inv.tax_invoice_info?.issued_at || null
      });
    });

    // 2b. manual_tax_invoices에서 발행 완료된 세금계산서
    const { data: manualInvoices } = await supabase
      .from('manual_tax_invoices')
      .select('id, company_name, total_amount, nts_confirm_num, issued_at, status')
      .eq('status', 'issued');

    (manualInvoices || []).forEach(inv => {
      issuedInvoices.push({
        source: 'manual',
        sourceId: inv.id,
        companyName: inv.company_name || '',
        amount: inv.total_amount,
        ntsConfirmNum: inv.nts_confirm_num || null,
        issuedAt: inv.issued_at || null
      });
    });

    console.log(`[auto-match-tax-invoices] 발행 세금계산서 ${issuedInvoices.length}건 (자동: ${autoInvoices?.length || 0}, 수동: ${manualInvoices?.length || 0})`);

    // 이미 매칭된 세금계산서 ntsConfirmNum 추적 (중복 매칭 방지)
    const { data: alreadyMatched } = await supabase
      .from('bank_transactions')
      .select('tax_invoice_nts_confirm_num')
      .eq('tax_invoice_status', 'issued')
      .not('tax_invoice_nts_confirm_num', 'is', null);

    const usedNtsNums = new Set((alreadyMatched || []).map(t => t.tax_invoice_nts_confirm_num));

    // 이미 charge_request로 연결된 입금의 charge_request_id도 추적
    const usedChargeRequestIds = new Set();
    unmatchedDeposits.forEach(dep => {
      if (dep.charge_request_id) usedChargeRequestIds.add(dep.charge_request_id);
    });

    // 3. 자동 매칭 로직
    const results = [];
    const matchedInvoiceIds = new Set(); // 하나의 세금계산서가 여러 입금에 매칭되지 않도록

    for (const deposit of unmatchedDeposits) {
      const depositAmount = parseInt(deposit.trade_balance);
      const depositName = deposit.briefs || '';

      // 이 입금이 이미 charge_request에 매칭되어 있으면, 해당 charge_request의 세금계산서 확인
      if (deposit.charge_request_id) {
        const linkedInvoice = issuedInvoices.find(
          inv => inv.source === 'charge_request' && inv.sourceId === deposit.charge_request_id
        );
        if (linkedInvoice && !matchedInvoiceIds.has(`${linkedInvoice.source}_${linkedInvoice.sourceId}`)) {
          results.push({
            depositId: deposit.id,
            depositTid: deposit.tid,
            depositName,
            depositAmount,
            depositDate: deposit.trade_date,
            matchedInvoice: linkedInvoice,
            matchType: 'charge_request_link',
            similarity: 100,
            confidence: 'high'
          });
          matchedInvoiceIds.add(`${linkedInvoice.source}_${linkedInvoice.sourceId}`);
          continue;
        }
      }

      // 금액 일치 + 이름 유사도로 매칭
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const invoice of issuedInvoices) {
        const invoiceKey = `${invoice.source}_${invoice.sourceId}`;
        if (matchedInvoiceIds.has(invoiceKey)) continue;
        if (invoice.ntsConfirmNum && usedNtsNums.has(invoice.ntsConfirmNum)) continue;

        // 금액이 일치해야 함
        if (Math.abs(invoice.amount - depositAmount) > 1) continue;

        // 이름 유사도 계산
        const similarity = calculateSimilarity(depositName, invoice.companyName);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = invoice;
        }
      }

      // 유사도 60% 이상이면 매칭
      if (bestMatch && bestSimilarity >= 60) {
        const confidence = bestSimilarity >= 90 ? 'high' : bestSimilarity >= 75 ? 'medium' : 'low';
        results.push({
          depositId: deposit.id,
          depositTid: deposit.tid,
          depositName,
          depositAmount,
          depositDate: deposit.trade_date,
          matchedInvoice: bestMatch,
          matchType: 'amount_name',
          similarity: bestSimilarity,
          confidence
        });
        matchedInvoiceIds.add(`${bestMatch.source}_${bestMatch.sourceId}`);
        if (bestMatch.ntsConfirmNum) {
          usedNtsNums.add(bestMatch.ntsConfirmNum);
        }
      }
    }

    console.log(`[auto-match-tax-invoices] 매칭 결과: ${results.length}건`);

    // 4. 실제 업데이트 (dryRun이 아닐 때만)
    let updatedCount = 0;
    if (!dryRun && results.length > 0) {
      for (const match of results) {
        try {
          const updates = {
            tax_invoice_status: 'issued'
          };
          if (match.matchedInvoice.ntsConfirmNum) {
            updates.tax_invoice_nts_confirm_num = match.matchedInvoice.ntsConfirmNum;
          }

          const { error: updateError } = await supabase
            .from('bank_transactions')
            .update(updates)
            .eq('id', match.depositId);

          if (updateError) {
            console.error(`[auto-match-tax-invoices] 업데이트 실패 (${match.depositId}):`, updateError);
          } else {
            updatedCount++;
          }
        } catch (err) {
          console.error(`[auto-match-tax-invoices] 매칭 적용 오류:`, err.message);
        }
      }
    }

    return successResponse({
      success: true,
      message: dryRun
        ? `${results.length}건 매칭 가능 (미리보기)`
        : `${updatedCount}건 자동 매칭 완료`,
      matched: dryRun ? results.length : updatedCount,
      total: unmatchedDeposits.length,
      invoiceCount: issuedInvoices.length,
      dryRun,
      results: results.map(r => ({
        depositId: r.depositId,
        depositName: r.depositName,
        depositAmount: r.depositAmount,
        depositDate: r.depositDate,
        invoiceCompany: r.matchedInvoice.companyName,
        invoiceAmount: r.matchedInvoice.amount,
        invoiceNtsNum: r.matchedInvoice.ntsConfirmNum,
        invoiceIssuedAt: r.matchedInvoice.issuedAt,
        matchType: r.matchType,
        similarity: r.similarity,
        confidence: r.confidence
      }))
    });
  } catch (error) {
    console.error('[auto-match-tax-invoices] Error:', error);

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

    return errorResponse(500, error.message);
  }
};
