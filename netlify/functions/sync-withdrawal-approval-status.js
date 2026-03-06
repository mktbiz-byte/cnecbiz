const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

/**
 * 네이버웍스 결재 상태 폴링 (Sync)
 * - PENDING 상태인 출금 건의 결재 문서 상태를 조회하여 DB 동기화
 * - 스케줄: 매 30분 (평일 09~19시 KST)
 * - 수동: GET/POST /.netlify/functions/sync-withdrawal-approval-status
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJjOEJZfc9xbDh
MpcJ6WPATGZDNPwKpRDIe4vJvEhkQeZC0UA8M0VmpBtM0nyuRtW6sRy0+Qk5Y3Cr
veKKt2ZRAqV43wdYJpwxptx5GhWGX0FwAeDrItsEVrbAXnBjGEMtWzMks1cA0nxQ
M7wc39d4IznKOJ0HqlkisPdRZnT0I3reaj7MW5B6GM3mscUC6pBLmPHClXdcWhft
HirX8U0Y+l7EHtK8w92jFaR7SMy62LKYjC8Pyo6tnI4Wp4Q3OxCZ9WuGEhIP45EC
wrgP8APCf4VoR1048gLmITUpF/Bm0t/idvl7Ebam4KJJm6E2w4+dEQvLx883lXq1
L0gYXVYDAgMBAAECggEABQAjzTHkcnnnK48vxCUwPmMm3mAAKNtzkSXPkA/F1Ab2
iY3bhCLZg/RqYPuP8Fr9joY6ahsLqYrYDsrFRh/KwBPKuzb9XaiHk4vKSI7nHdBb
NUY2qF7TBEaKfjdZnnvJnuR2XmC8td6DCxJdhnHfTLHDC0tgSgJl98BgQnrCSBRV
84vJqCr7Ouf56Oio1Fo8E7krYmqjsB3BaoKamuGUaAcAwUSEOpGSIsfP2aYOOZmk
aNgWo8Lr19VIr4iWccqjA/CJ83/fk84bE4Bae1lKzjQY4WFKmGSdeOn/3cVr76fY
Gt7qIBgWhe8DnKE6q3umNpAI5gC8j6mPhEbxmMUFsQKBgQDOkoC728Ay1PWoqP64
ldniGatvTvHDTVgU/kRipEXO8xzCGj+C21cKoniF1a0bI4fWTSUTtASURZKvuXAQ
Ij55GueWO5WjHAwskOacTYjUNpa8GlDDcBpSy/mYfNIh+IJE7bTO/rKX+wyJCAKp
klz7FkS4dykWwAww3KHDGkNblQKBgQD5xsH2Ma/tkHrekV5i3A0mLBBJheYgkwgR
YDSbkcp2pw+OIuby0bZlXiRrkDYBoCdLXyl4lmkmXwtcgOmuRpFnixb7YsJ7mTR1
gqNunttaczTRQkkanxZe77qKIYV1dtnumjn6x5hU0+Q6sJ5uPbLUahrQ9ocD+eD0
icJwkf/FNwKBgDHuRYGi900SHqL63j79saGuNLr96QAdFNpWL29sZ5dDOkNMludp
Xxup89ndsS7rIq1RDlI55BV2z6L7/rNXo6QgNbQhiOTZJbQr/iHvt9AbtcmXzse+
tA4pUZZjLWOarto8XsTd2YtU2k3RCtu0Dhd+5XN1EhB2sTuqSMtg8MEVAoGBAJ8Y
itNWMskPDjRWQ9iUcYuu5XDvaPW2sZzfuqKc6mlJYA8ZDCH+kj9fB7O716qRaHYJ
11CH/dIDGCmDs1Tefh+F6M2WymoP2+o9m/wKE445c5sWrZnXW1h9OkRhtbBsU8Q3
WFb0a4MctHLtrPxrME08iHgxjy5pK3CXjtJFLLVhAoGAXjlxrXUIHcbaeFJ78J/G
rv6RBqA2rzQOE0aaf/UcNnIAqJ4TUmgBfZ4TpXNkNHJ7YanXYdcKKVd2jGhoiZdH
h6Nfro2bqUE96CvNn+L5pTCHXUFZML8W02ZpgRLaRvXrt2HeHy3QUCqkHqxpm2rs
skmeYX6UpJwnuTP2xN5NDDI=
-----END PRIVATE KEY-----`;

function generateJWT(clientId, serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600, scope };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY);
  return `${signatureInput}.${signature.toString('base64url')}`;
}

function getAccessToken(clientId, clientSecret, serviceAccount, scope) {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT(clientId, serviceAccount, scope);
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt, client_id: clientId, client_secret: clientSecret, scope
    }).toString();

    const req = https.request({
      hostname: 'auth.worksmobile.com', path: '/oauth2/v2.0/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(data).access_token) : reject(new Error(`Token error: ${res.statusCode} ${data}`)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 네이버웍스 결재 문서 상태 조회
function getApprovalStatus(accessToken, requestId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.worksapis.com',
      path: `/v1.0/approval/requests/${requestId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Parse error: ${data}`));
          }
        } else if (res.statusCode === 404) {
          resolve(null); // 문서 없음
        } else {
          reject(new Error(`Approval status API error: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const httpMethod = event.httpMethod || 'SCHEDULED';
  console.log(`[sync-withdrawal-approval] 시작 - ${httpMethod}`);

  try {
    // PENDING 상태이고 approval_doc_id가 있는 건 조회
    const { data: pendingWithdrawals, error } = await supabase
      .from('creator_withdrawal_requests')
      .select('*')
      .eq('approval_status', 'PENDING')
      .not('approval_doc_id', 'is', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
      console.log('[sync-withdrawal-approval] 동기화할 건 없음');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '동기화할 건 없음', synced: 0 })
      };
    }

    console.log(`[sync-withdrawal-approval] ${pendingWithdrawals.length}건 상태 조회`);

    // 네이버웍스 인증
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

    if (!clientId || !clientSecret) {
      throw new Error('네이버웍스 인증 정보가 설정되지 않았습니다.');
    }

    const accessToken = await getAccessToken(clientId, clientSecret, serviceAccount, 'approval');

    let approvedCount = 0;
    let rejectedCount = 0;
    let unchangedCount = 0;
    const results = [];
    const now = new Date().toISOString();

    for (const withdrawal of pendingWithdrawals) {
      try {
        const docStatus = await getApprovalStatus(accessToken, withdrawal.approval_doc_id);

        if (!docStatus) {
          console.log(`[sync-withdrawal-approval] 문서 없음: ${withdrawal.approval_doc_id}`);
          unchangedCount++;
          continue;
        }

        // 네이버웍스 결재 상태 매핑
        // approved, completed -> 승인 / rejected, returned -> 반려 / pending, progress -> 진행중
        const nwStatus = (docStatus.status || docStatus.approvalStatus || '').toLowerCase();
        const approverName = docStatus.approverName || docStatus.lastApprover?.name || null;
        const rejectionReason = docStatus.comment || docStatus.reason || null;

        if (nwStatus === 'approved' || nwStatus === 'completed' || nwStatus === 'approve') {
          // 승인 처리
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

          await supabase.from('withdrawal_audit_logs').insert({
            withdrawal_id: withdrawal.id,
            action: 'APPROVED',
            actor: approverName || 'nw-sync',
            details: {
              approval_doc_id: withdrawal.approval_doc_id,
              creator_name: withdrawal.creator_name || withdrawal.account_holder,
              requested_amount: withdrawal.requested_amount,
              final_amount: withdrawal.final_amount,
              sync_source: 'polling'
            }
          });

          approvedCount++;
          results.push({ id: withdrawal.id, name: withdrawal.creator_name, status: 'APPROVED' });

        } else if (nwStatus === 'rejected' || nwStatus === 'returned' || nwStatus === 'denied' || nwStatus === 'reject') {
          // 반려 처리
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

          await supabase.from('withdrawal_audit_logs').insert({
            withdrawal_id: withdrawal.id,
            action: 'REJECTED',
            actor: approverName || 'nw-sync',
            details: {
              approval_doc_id: withdrawal.approval_doc_id,
              creator_name: withdrawal.creator_name || withdrawal.account_holder,
              rejection_reason: rejectionReason,
              requested_amount: withdrawal.requested_amount,
              sync_source: 'polling'
            }
          });

          rejectedCount++;
          results.push({ id: withdrawal.id, name: withdrawal.creator_name, status: 'REJECTED' });

        } else {
          // 아직 결재 진행중
          unchangedCount++;
        }

      } catch (itemErr) {
        console.error(`[sync-withdrawal-approval] 건별 오류 (${withdrawal.id}):`, itemErr.message);
        unchangedCount++;
      }
    }

    // 변경 사항이 있으면 네이버웍스 알림
    if (approvedCount > 0 || rejectedCount > 0) {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      try {
        const approvedNames = results.filter(r => r.status === 'APPROVED').map(r => r.name).join(', ');
        const rejectedNames = results.filter(r => r.status === 'REJECTED').map(r => r.name).join(', ');
        let msg = `🔄 [결재상태 동기화]\n`;
        if (approvedCount > 0) msg += `승인: ${approvedCount}건 (${approvedNames})\n`;
        if (rejectedCount > 0) msg += `반려: ${rejectedCount}건 (${rejectedNames})\n`;
        msg += `미변경: ${unchangedCount}건`;

        await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            message: msg,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
          })
        });
      } catch (e) { console.error('NW notification failed:', e.message); }
    }

    console.log(`[sync-withdrawal-approval] 완료 - 승인: ${approvedCount}, 반려: ${rejectedCount}, 미변경: ${unchangedCount}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        approved: approvedCount,
        rejected: rejectedCount,
        unchanged: unchangedCount,
        results
      })
    };

  } catch (error) {
    console.error('[sync-withdrawal-approval] Error:', error);

    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${baseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'sync-withdrawal-approval-status',
          errorMessage: error.message
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

// 스케줄: 매 30분 (평일 업무시간 KST 09~19시 = UTC 00~10시)
exports.config = { schedule: '*/30 0-10 * * 1-5' };
