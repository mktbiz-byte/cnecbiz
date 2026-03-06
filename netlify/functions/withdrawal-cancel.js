const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const { withdrawal_id, actor } = JSON.parse(event.body);

    if (!withdrawal_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '출금 신청 ID가 필요합니다.' })
      };
    }

    // 현재 상태 확인
    const { data: withdrawal, error: fetchError } = await supabase
      .from('creator_withdrawal_requests')
      .select('id, status, approval_status, creator_id')
      .eq('id', withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '출금 신청을 찾을 수 없습니다.' })
      };
    }

    // pending 상태만 취소 가능 (결재 진행 중이면 취소 불가)
    if (withdrawal.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `현재 상태(${withdrawal.status})에서는 취소할 수 없습니다. 대기중(pending) 상태에서만 취소 가능합니다.`
        })
      };
    }

    if (withdrawal.approval_status === 'PENDING') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '결재가 진행 중인 건은 취소할 수 없습니다.'
        })
      };
    }

    // 상태 업데이트
    const { error: updateError } = await supabase
      .from('creator_withdrawal_requests')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawal_id);

    if (updateError) throw updateError;

    // 감사 로그
    const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || null;
    await supabase.from('withdrawal_audit_logs').insert({
      withdrawal_id,
      action: 'CANCELLED',
      actor: actor || withdrawal.creator_id,
      details: { previous_status: withdrawal.status, previous_approval_status: withdrawal.approval_status },
      ip_address: clientIp
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: '출금 신청이 취소되었습니다.' })
    };

  } catch (error) {
    console.error('[withdrawal-cancel] Error:', error);

    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${baseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'withdrawal-cancel', errorMessage: error.message })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
