/**
 * 팝빌에서 가져온 입금 내역을 bank_transactions 테이블에 동기화
 * 프론트엔드에서 팝빌 조회 후 호출하여 새 거래를 DB에 저장
 */

const { getBizClient } = require('./lib/supabase');
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const { transactions, accountLabel } = JSON.parse(event.body);

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return successResponse({ success: true, savedCount: 0, message: '저장할 거래 없음' });
    }

    const supabase = getBizClient();
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
          .eq('tid', tid)
          .single();

        if (existing) {
          skippedCount++;
          continue;
        }

        // 거래일시 파싱
        const tradeDate = tx.tradeDate?.substring(0, 8) || '';
        const tradeTime = tx.tradeTime || tx.tradeDate?.substring(8, 14) || '';
        const tradeBalance = parseInt(tx.tradeBalance) || 0;
        const briefs = tx.briefs || '';

        // DB에 저장
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
            account_label: accountLabel || tx.accountLabel || '하우파파'
          });

        if (insertError) {
          // 중복 tid 에러는 무시 (동시 호출 시 발생 가능)
          if (insertError.code === '23505') {
            skippedCount++;
            continue;
          }
          console.error(`[sync-deposits] 저장 오류 (${tid}):`, insertError);
          continue;
        }

        savedCount++;
      } catch (txError) {
        console.error('[sync-deposits] 개별 거래 처리 오류:', txError.message);
      }
    }

    console.log(`[sync-deposits] 완료: ${savedCount}건 저장, ${skippedCount}건 스킵 (총 ${transactions.length}건)`);

    return successResponse({
      success: true,
      savedCount,
      skippedCount,
      totalReceived: transactions.length
    });
  } catch (error) {
    console.error('[sync-deposits] Error:', error);

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'sync-deposits-to-db',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return errorResponse(500, error.message);
  }
};
