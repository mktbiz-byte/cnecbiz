/**
 * 팝빌에서 가져온 입금 내역을 bank_transactions 테이블에 동기화
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    const body = JSON.parse(event.body || '{}');
    const { transactions, accountLabel } = body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, savedCount: 0, skippedCount: 0 })
      };
    }

    console.log(`[sync-deposits] ${transactions.length}건 동기화 시작 (${accountLabel || '하우파파'})`);

    let savedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      try {
        const tid = tx.tid;
        if (!tid) continue;

        const tidStr = String(tid).substring(0, 32);

        // 이미 저장된 거래인지 확인
        const { data: existing } = await supabaseAdmin
          .from('bank_transactions')
          .select('id')
          .eq('tid', tidStr)
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        const tradeDate = tx.tradeDate?.substring(0, 8) || '';
        const tradeTime = tx.tradeTime || tx.tradeDate?.substring(8, 14) || '';
        const tradeBalance = parseInt(tx.tradeBalance) || 0;
        const afterBalance = parseInt(tx.balance) || 0;
        const briefs = tx.briefs || '';

        const { error: insertError } = await supabaseAdmin
          .from('bank_transactions')
          .insert({
            tid: tidStr,
            trade_date: tradeDate,
            trade_time: tradeTime,
            trade_type: tx.tradeType === 'O' ? 'O' : 'I',
            trade_balance: tradeBalance,
            after_balance: afterBalance,
            briefs: String(briefs).substring(0, 500),
            remark1: tx.remark1 || null,
            remark2: tx.remark2 || null,
            remark3: tx.remark3 || null,
            is_matched: false,
            account_label: accountLabel || '하우파파',
            tax_invoice_status: 'none'
          });

        if (insertError) {
          // 중복 키 에러는 무시
          if (insertError.code === '23505') {
            skippedCount++;
            continue;
          }
          console.error(`[sync-deposits] Insert error (${tidStr}):`, insertError.message);
          continue;
        }
        savedCount++;
      } catch (txError) {
        console.error('[sync-deposits] Item error:', txError.message);
      }
    }

    console.log(`[sync-deposits] 완료: ${savedCount}건 저장, ${skippedCount}건 중복`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        savedCount,
        skippedCount,
        totalReceived: transactions.length
      })
    };
  } catch (error) {
    console.error('[sync-deposits] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
