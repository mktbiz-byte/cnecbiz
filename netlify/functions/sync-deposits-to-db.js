/**
 * 팝빌에서 가져온 입금 내역을 bank_transactions 테이블에 동기화
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
    const { transactions, accountLabel } = JSON.parse(event.body || '{}');

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, savedCount: 0 }) };
    }

    let savedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      try {
        const tid = tx.tid;
        if (!tid) continue;

        // 이미 저장된 거래인지 확인
        const { data: existing } = await supabase
          .from('bank_transactions')
          .select('id')
          .eq('tid', String(tid).substring(0, 32))
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        const tradeDate = tx.tradeDate?.substring(0, 8) || '';
        const tradeTime = tx.tradeTime || tx.tradeDate?.substring(8, 14) || '';
        const tradeBalance = parseInt(tx.tradeBalance) || 0;
        const briefs = tx.briefs || '';

        const { error: insertError } = await supabase
          .from('bank_transactions')
          .insert({
            tid: String(tid).substring(0, 32),
            trade_date: tradeDate,
            trade_time: tradeTime,
            trade_type: tx.tradeType === 'O' ? 'O' : 'I',
            trade_balance: tradeBalance,
            briefs: String(briefs).substring(0, 500),
            is_matched: false,
            account_label: accountLabel || tx.accountLabel || '하우파파',
            tax_invoice_status: 'none'
          });

        if (insertError) {
          if (insertError.code === '23505') { skippedCount++; continue; }
          console.error(`[sync-deposits] Insert error (${tid}):`, insertError.message);
          continue;
        }
        savedCount++;
      } catch (txError) {
        console.error('[sync-deposits] Item error:', txError.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, savedCount, skippedCount, totalReceived: transactions.length })
    };
  } catch (error) {
    console.error('[sync-deposits] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
