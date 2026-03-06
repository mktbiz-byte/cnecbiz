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
    const { withdrawal_id, admin_id, admin_name } = JSON.parse(event.body);

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
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '출금 신청을 찾을 수 없습니다.' })
      };
    }

    // approved 상태만 송금 완료 가능
    if (withdrawal.status !== 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `현재 상태(${withdrawal.status})에서는 송금 완료 처리할 수 없습니다. 승인(approved) 상태에서만 가능합니다.`
        })
      };
    }

    // 포인트 잔액 재확인
    const { data: pointsData } = await supabase
      .from('creator_points')
      .select('amount')
      .eq('creator_id', withdrawal.creator_id);

    const totalBalance = (pointsData || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    // 다른 pending/approved 건 제외한 잔액 확인
    const { data: otherPending } = await supabase
      .from('creator_withdrawal_requests')
      .select('requested_points')
      .eq('creator_id', withdrawal.creator_id)
      .in('status', ['pending', 'approved', 'processing'])
      .neq('id', withdrawal_id);

    const otherPendingTotal = (otherPending || []).reduce((sum, w) => sum + (w.requested_points || 0), 0);
    const availableBalance = totalBalance - otherPendingTotal;

    if (withdrawal.requested_points > availableBalance) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `포인트 잔액이 부족합니다. (사용 가능: ${availableBalance.toLocaleString()}P, 필요: ${withdrawal.requested_points.toLocaleString()}P)`
        })
      };
    }

    const now = new Date().toISOString();

    // 상태 업데이트: completed + paid_at
    const { error: updateError } = await supabase
      .from('creator_withdrawal_requests')
      .update({
        status: 'completed',
        paid_at: now,
        completed_at: now,
        processed_by: admin_id || null,
        processed_at: now
      })
      .eq('id', withdrawal_id);

    if (updateError) throw updateError;

    // 포인트 차감 (음수 금액 INSERT)
    const { error: pointError } = await supabase
      .from('creator_points')
      .insert({
        creator_id: withdrawal.creator_id,
        amount: -withdrawal.requested_points,
        type: 'withdrawal',
        description: `포인트 출금 - ${withdrawal.requested_points.toLocaleString()}P (${withdrawal.bank_name} ${withdrawal.account_holder})`,
        created_at: now
      });

    if (pointError) {
      // 포인트 차감 실패 시 상태 롤백
      await supabase
        .from('creator_withdrawal_requests')
        .update({ status: 'approved', paid_at: null, completed_at: null })
        .eq('id', withdrawal_id);
      throw new Error(`포인트 차감 실패: ${pointError.message}`);
    }

    // 감사 로그
    const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || null;
    await supabase.from('withdrawal_audit_logs').insert({
      withdrawal_id,
      action: 'PAID',
      actor: admin_id || 'admin',
      details: {
        admin_name: admin_name || null,
        requested_points: withdrawal.requested_points,
        final_amount: withdrawal.final_amount,
        bank_name: withdrawal.bank_name,
        account_holder: withdrawal.account_holder
      },
      ip_address: clientIp
    });

    // 네이버웍스 송금 완료 알림
    const baseUrl = process.env.URL || 'https://cnecbiz.com';
    try {
      await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          message: `✅ [송금완료] ${withdrawal.creator_name || withdrawal.account_holder || 'Unknown'} / ${(withdrawal.final_amount || withdrawal.requested_amount || 0).toLocaleString()}원 송금 처리됨`,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
        })
      });
    } catch (e) { console.error('Naver Works notification failed:', e.message); }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '송금 완료 처리되었습니다.',
        data: { withdrawal_id, paid_at: now }
      })
    };

  } catch (error) {
    console.error('[withdrawal-mark-paid] Error:', error);

    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${baseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'withdrawal-mark-paid', errorMessage: error.message })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
