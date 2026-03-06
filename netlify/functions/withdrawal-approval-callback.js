const { createClient } = require('@supabase/supabase-js');

/**
 * 네이버웍스 결재 콜백 수신
 * Callback URL: https://cnecbiz.com/.netlify/functions/withdrawal-approval-callback
 *
 * 네이버웍스 Admin → 결재관리 → 개발자 도구에서 Callback URL 등록 필요
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // PUT 또는 POST 허용 (네이버웍스 콜백 형식에 따라)
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('[withdrawal-approval-callback] Received:', JSON.stringify(body));

    // 네이버웍스 결재 콜백 형식 파싱
    // 참고: 실제 네이버웍스 콜백 페이로드 형식에 따라 조정 필요
    const docId = body.requestId || body.docId || body.approval_doc_id;
    const callbackStatus = body.status || body.approvalStatus; // approved / rejected
    const approverName = body.approverName || body.approver?.name || null;
    const rejectionReason = body.comment || body.reason || body.rejectionReason || null;

    if (!docId) {
      console.log('[withdrawal-approval-callback] No docId, returning 200 (health check or invalid)');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'No docId provided' })
      };
    }

    // DB에서 출금 신청 조회
    const { data: withdrawal, error: fetchError } = await supabase
      .from('creator_withdrawal_requests')
      .select('*')
      .eq('approval_doc_id', docId)
      .single();

    if (fetchError || !withdrawal) {
      console.error('[withdrawal-approval-callback] Withdrawal not found for docId:', docId);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '해당 결재문서에 연결된 출금 신청을 찾을 수 없습니다.' })
      };
    }

    // 멱등성 체크: 이미 처리된 건
    if (withdrawal.approval_status === 'APPROVED' || withdrawal.approval_status === 'REJECTED') {
      console.log(`[withdrawal-approval-callback] Already processed: ${withdrawal.id} (${withdrawal.approval_status})`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '이미 처리된 건입니다.', duplicate: true })
      };
    }

    const now = new Date().toISOString();
    const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || null;
    const normalizedStatus = callbackStatus?.toLowerCase();

    if (normalizedStatus === 'approved' || normalizedStatus === 'approve') {
      // === 승인 처리 ===
      const { error: updateError } = await supabase
        .from('creator_withdrawal_requests')
        .update({
          approval_status: 'APPROVED',
          status: 'approved',
          approver_name: approverName,
          approval_completed_at: now,
          approved_at: now,
          approved_by: approverName
        })
        .eq('id', withdrawal.id);

      if (updateError) throw updateError;

      // 감사 로그
      await supabase.from('withdrawal_audit_logs').insert({
        withdrawal_id: withdrawal.id,
        action: 'APPROVED',
        actor: approverName || 'approver',
        details: {
          approval_doc_id: docId,
          creator_name: withdrawal.creator_name || withdrawal.account_holder,
          requested_amount: withdrawal.requested_amount,
          final_amount: withdrawal.final_amount
        },
        ip_address: clientIp
      });

      // 네이버웍스 알림: 송금 대기
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      try {
        await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            message: `✅ [결재승인] ${withdrawal.creator_name || withdrawal.account_holder || 'Unknown'} / ${(withdrawal.final_amount || withdrawal.requested_amount || 0).toLocaleString()}원\n결재자: ${approverName || '-'}\n→ 송금 대기`,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
          })
        });
      } catch (e) { console.error('NW notification failed:', e.message); }

      console.log(`[withdrawal-approval-callback] APPROVED: ${withdrawal.id}`);

    } else if (normalizedStatus === 'rejected' || normalizedStatus === 'reject' || normalizedStatus === 'denied') {
      // === 반려 처리 ===
      const { error: updateError } = await supabase
        .from('creator_withdrawal_requests')
        .update({
          approval_status: 'REJECTED',
          status: 'rejected',
          approver_name: approverName,
          approval_completed_at: now,
          rejection_reason: rejectionReason || '결재 반려'
        })
        .eq('id', withdrawal.id);

      if (updateError) throw updateError;

      // 감사 로그
      await supabase.from('withdrawal_audit_logs').insert({
        withdrawal_id: withdrawal.id,
        action: 'REJECTED',
        actor: approverName || 'approver',
        details: {
          approval_doc_id: docId,
          creator_name: withdrawal.creator_name || withdrawal.account_holder,
          rejection_reason: rejectionReason,
          requested_amount: withdrawal.requested_amount
        },
        ip_address: clientIp
      });

      // 네이버웍스 알림: 반려
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      try {
        await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            message: `❌ [결재반려] ${withdrawal.creator_name || withdrawal.account_holder || 'Unknown'} / ${(withdrawal.requested_amount || 0).toLocaleString()}원\n결재자: ${approverName || '-'}\n사유: ${rejectionReason || '-'}`,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
          })
        });
      } catch (e) { console.error('NW notification failed:', e.message); }

      console.log(`[withdrawal-approval-callback] REJECTED: ${withdrawal.id}`);

    } else {
      console.log(`[withdrawal-approval-callback] Unknown status: ${callbackStatus}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Unknown status: ${callbackStatus}` })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: `처리 완료: ${normalizedStatus}` })
    };

  } catch (error) {
    console.error('[withdrawal-approval-callback] Error:', error);

    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${baseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'withdrawal-approval-callback',
          errorMessage: error.message,
          context: { body: event.body }
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
