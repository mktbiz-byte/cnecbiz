const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const https = require('https');

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 네이버웍스 알림 전송 (간단 버전)
async function sendNaverWorksNotification(message) {
  const baseUrl = process.env.URL || 'https://cnecbiz.com';
  try {
    await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        message,
        channelId: '75c24874-e370-afd5-9da3-72918ba15a3c' // 결제/캠페인/크리에이터 알림
      })
    });
  } catch (e) {
    console.error('[withdrawal-request] Naver Works notification failed:', e.message);
  }
}

// 감사 로그 기록
async function writeAuditLog(withdrawalId, action, actor, details, ipAddress) {
  try {
    await supabase.from('withdrawal_audit_logs').insert({
      withdrawal_id: withdrawalId,
      action,
      actor,
      details: details || {},
      ip_address: ipAddress || null
    });
  } catch (e) {
    console.error('[withdrawal-request] Audit log failed:', e.message);
  }
}

// 에러 알림
async function sendErrorAlert(functionName, errorMessage, context) {
  const baseUrl = process.env.URL || 'https://cnecbiz.com';
  try {
    await fetch(`${baseUrl}/.netlify/functions/send-error-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ functionName, errorMessage, context })
    });
  } catch (e) {
    console.error('Error alert failed:', e.message);
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const {
      idempotency_key,
      creator_id,
      creator_name,
      requested_points,
      bank_name,
      account_number,
      account_holder,
      resident_registration_number,
      region
    } = JSON.parse(event.body);

    const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || null;

    // === Layer 1: Idempotency Check ===
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from('creator_withdrawal_requests')
        .select('id, status, approval_status')
        .eq('idempotency_key', idempotency_key)
        .single();

      if (existing) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: existing,
            message: '이미 처리된 요청입니다.',
            duplicate: true
          })
        };
      }
    }

    // === Layer 2: Advisory Lock (동시성 제어) ===
    try {
      await supabase.rpc('acquire_withdrawal_lock', { p_creator_id: creator_id });
    } catch (lockErr) {
      console.warn('[withdrawal-request] Advisory lock warning:', lockErr.message);
      // Lock 실패해도 계속 진행 (다른 안전장치가 있음)
    }

    // === Layer 3: Hash Check (동일일 동일금액 중복 방지) ===
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hashInput = `${creator_id}_${requested_points}_${today}`;
    const withdrawal_hash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const { data: hashExists } = await supabase
      .from('creator_withdrawal_requests')
      .select('id')
      .eq('withdrawal_hash', withdrawal_hash)
      .single();

    if (hashExists) {
      await writeAuditLog(hashExists.id, 'DUPLICATE_BLOCKED', creator_id, {
        reason: 'withdrawal_hash_duplicate',
        hash: withdrawal_hash
      }, clientIp);

      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          success: false,
          error: '오늘 이미 동일 금액으로 출금 신청이 접수되었습니다.'
        })
      };
    }

    // === Layer 4: Status Check (진행 중인 건 확인) ===
    const { data: pendingRequests } = await supabase
      .from('creator_withdrawal_requests')
      .select('id, status, requested_points')
      .eq('creator_id', creator_id)
      .in('status', ['pending', 'approved', 'processing']);

    if (pendingRequests && pendingRequests.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 처리 중인 출금 신청이 있습니다. 기존 신청이 완료된 후 다시 시도해주세요.'
        })
      };
    }

    // === Layer 5: Balance Check ===
    const { data: pointsData } = await supabase
      .from('creator_points')
      .select('amount')
      .eq('creator_id', creator_id);

    const totalBalance = (pointsData || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    if (requested_points > totalBalance) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `포인트 잔액이 부족합니다. (잔액: ${totalBalance.toLocaleString()}P)`
        })
      };
    }

    // === 금액 계산 (한국 3.3% 세금) ===
    const requestedAmount = requested_points; // 1:1 (KRW)
    const taxAmount = region === 'korea' ? Math.round(requestedAmount * 0.033) : 0;
    const finalAmount = requestedAmount - taxAmount;

    // === DB INSERT ===
    const insertData = {
      creator_id,
      creator_name: creator_name || 'Unknown',
      region: region || 'korea',
      requested_points: parseInt(requested_points),
      requested_amount: requestedAmount,
      currency: 'KRW',
      tax_amount: taxAmount,
      final_amount: finalAmount,
      status: 'pending',
      approval_status: 'NONE',
      idempotency_key: idempotency_key || null,
      withdrawal_hash,
      bank_name: bank_name || null,
      account_number: account_number || null, // TEXT - 앞자리 0 보존
      account_holder: account_holder || null,
      resident_registration_number: resident_registration_number || null
    };

    const { data: inserted, error: insertError } = await supabase
      .from('creator_withdrawal_requests')
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      // UNIQUE constraint violation = 중복
      if (insertError.code === '23505') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            success: false,
            error: '중복된 출금 신청입니다. 잠시 후 다시 시도해주세요.'
          })
        };
      }
      throw insertError;
    }

    // === 감사 로그 ===
    await writeAuditLog(inserted.id, 'CREATED', creator_id, {
      requested_points,
      requested_amount: requestedAmount,
      final_amount: finalAmount,
      bank_name,
      account_holder
    }, clientIp);

    // === 네이버웍스 메시지 (출금 신청 알림) ===
    const maskedAccount = account_number
      ? (account_number.length > 4
        ? account_number.substring(0, 4) + '****'
        : account_number)
      : '';
    const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    const nwMessage = `💰 [출금신청]\n\n신청자: ${creator_name || 'Unknown'}\n금액: ${requestedAmount.toLocaleString()}원\n세금(3.3%): ${taxAmount.toLocaleString()}원\n실수령액: ${finalAmount.toLocaleString()}원\n은행: ${bank_name || '-'}\n계좌: ${maskedAccount}\n예금주: ${account_holder || '-'}\n\n신청일시: ${koreanTime}`;

    await sendNaverWorksNotification(nwMessage);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          id: inserted.id,
          status: inserted.status,
          approval_status: inserted.approval_status,
          requested_points: inserted.requested_points,
          final_amount: inserted.final_amount
        },
        message: '출금 신청이 완료되었습니다.'
      })
    };

  } catch (error) {
    console.error('[withdrawal-request] Error:', error);
    await sendErrorAlert('withdrawal-request', error.message, {
      body: event.body ? JSON.parse(event.body).creator_id : 'unknown'
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
