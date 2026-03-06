const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

/**
 * 매일 평일 오전 10시 (KST) 전날 출금 신청건을 네이버웍스 결재 문서로 자동 상신
 * - 주말(토/일)이면 skip
 * - approval_status='NONE' AND status='pending' AND region='korea' 건만 대상
 * - 수동 테스트: GET/POST /.netlify/functions/scheduled-daily-withdrawal-approval
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 네이버웍스 Private Key (기존 함수와 동일)
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

// 네이버웍스 결재 문서 생성
function createApprovalDocument(accessToken, templateId, withdrawal) {
  return new Promise((resolve, reject) => {
    const taxAmount = Math.round((withdrawal.requested_amount || 0) * 0.033);
    const finalAmount = (withdrawal.requested_amount || 0) - taxAmount;

    const documentData = {
      templateId: templateId,
      title: `[출금] ${withdrawal.creator_name || withdrawal.account_holder || 'Unknown'} - ${(withdrawal.requested_amount || 0).toLocaleString()}원`,
      content: {
        body: {
          items: [
            { name: '신청자', value: withdrawal.creator_name || withdrawal.account_holder || 'Unknown' },
            { name: '신청자ID', value: withdrawal.creator_id || '' },
            { name: '신청금액', value: String(withdrawal.requested_amount || 0) },
            { name: '수수료(3.3%)', value: String(taxAmount) },
            { name: '실수령액', value: String(finalAmount) },
            { name: '은행명', value: withdrawal.bank_name || '-' },
            { name: '계좌번호', value: withdrawal.account_number || '-' }, // TEXT - 앞자리 0 보존
            { name: '예금주', value: withdrawal.account_holder || '-' },
            { name: '신청일', value: new Date(withdrawal.created_at).toLocaleDateString('ko-KR') },
            { name: '비고', value: `출금ID: ${withdrawal.id}` }
          ]
        }
      }
    };

    const postData = JSON.stringify(documentData);

    const req = https.request({
      hostname: 'www.worksapis.com',
      path: '/v1.0/approval/requests',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            resolve({ requestId: data }); // 응답이 ID만 올 수도 있음
          }
        } else {
          reject(new Error(`Approval API error: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 네이버웍스 채널 메시지 전송
function sendChannelMessage(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ content: { type: 'text', text: message } });
    const req = https.request({
      hostname: 'www.worksapis.com', path: `/v1.0/bots/${botId}/channels/${channelId}/messages`, method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => (res.statusCode === 201 || res.statusCode === 200) ? resolve({ success: true }) : reject(new Error(`Message error: ${res.statusCode}`)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// KST 날짜 계산
function getKSTDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst;
}

function getYesterdayRange() {
  const kst = getKSTDate();
  // 어제 00:00 ~ 23:59:59 (KST → UTC 변환)
  const yesterday = new Date(kst);
  yesterday.setUTCDate(kst.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const yesterdayStart = new Date(yesterday.getTime() - 9 * 60 * 60 * 1000); // KST 00:00 → UTC
  const yesterdayEnd = new Date(yesterdayStart.getTime() + 24 * 60 * 60 * 1000 - 1); // KST 23:59:59 → UTC
  return { start: yesterdayStart, end: yesterdayEnd };
}

exports.handler = async (event) => {
  const httpMethod = event.httpMethod || 'SCHEDULED';
  const isManualTest = httpMethod === 'GET' || httpMethod === 'POST';
  console.log(`[daily-withdrawal-approval] 시작 - ${isManualTest ? '수동' : '자동'}`);

  try {
    // 주말 체크 (수동 테스트 시에는 skip)
    if (!isManualTest) {
      const kst = getKSTDate();
      const dayOfWeek = kst.getUTCDay(); // 0=일, 6=토
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log('[daily-withdrawal-approval] 주말 - skip');
        return { statusCode: 200, body: JSON.stringify({ message: '주말 - skip' }) };
      }
    }

    // 전날 pending + approval_status=NONE 건 조회
    const { start, end } = getYesterdayRange();

    // 수동 테스트 시에는 전체 NONE건 조회 (날짜 제한 없음)
    let query = supabase
      .from('creator_withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('approval_status', 'NONE')
      .eq('region', 'korea');

    if (!isManualTest) {
      query = query
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
    }

    const { data: withdrawals, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    if (!withdrawals || withdrawals.length === 0) {
      console.log('[daily-withdrawal-approval] 처리할 출금 신청 없음');
      return { statusCode: 200, body: JSON.stringify({ message: '처리할 출금 신청 없음', count: 0 }) };
    }

    console.log(`[daily-withdrawal-approval] ${withdrawals.length}건 처리 시작`);

    // 네이버웍스 인증
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_WITHDRAWAL_CHANNEL_ID || process.env.NAVER_WORKS_CHANNEL_ID;
    const templateId = process.env.NAVER_WORKS_APPROVAL_TEMPLATE_ID;
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

    if (!clientId || !clientSecret) {
      throw new Error('네이버웍스 인증 정보가 설정되지 않았습니다.');
    }

    // 결재 API용 토큰 (scope: approval)
    let approvalToken = null;
    if (templateId) {
      try {
        approvalToken = await getAccessToken(clientId, clientSecret, serviceAccount, 'approval');
      } catch (e) {
        console.error('[daily-withdrawal-approval] Approval token error:', e.message);
      }
    }

    // 메시지 API용 토큰 (scope: bot)
    const botToken = await getAccessToken(clientId, clientSecret, serviceAccount, 'bot');

    let successCount = 0;
    let failCount = 0;
    let totalAmount = 0;
    const results = [];

    for (const withdrawal of withdrawals) {
      try {
        let approvalDocId = null;

        // 결재 문서 생성 (templateId가 있을 때만)
        if (approvalToken && templateId) {
          try {
            const result = await createApprovalDocument(approvalToken, templateId, withdrawal);
            approvalDocId = result.requestId || result.id || result.docId || null;
          } catch (approvalErr) {
            console.error(`[daily-withdrawal-approval] 결재문서 생성 실패 (${withdrawal.id}):`, approvalErr.message);
            // 결재 문서 생성 실패해도 상태는 업데이트
          }
        }

        // DB 업데이트
        const updateData = {
          approval_status: 'PENDING',
          approval_requested_at: new Date().toISOString()
        };
        if (approvalDocId) {
          updateData.approval_doc_id = approvalDocId;
        }

        await supabase
          .from('creator_withdrawal_requests')
          .update(updateData)
          .eq('id', withdrawal.id);

        // 감사 로그
        await supabase.from('withdrawal_audit_logs').insert({
          withdrawal_id: withdrawal.id,
          action: 'SUBMITTED',
          actor: 'system',
          details: {
            approval_doc_id: approvalDocId,
            requested_amount: withdrawal.requested_amount,
            creator_name: withdrawal.creator_name || withdrawal.account_holder
          }
        });

        successCount++;
        totalAmount += (withdrawal.requested_amount || 0);
        results.push({
          id: withdrawal.id,
          name: withdrawal.creator_name || withdrawal.account_holder,
          amount: withdrawal.requested_amount,
          approval_doc_id: approvalDocId
        });

      } catch (itemErr) {
        console.error(`[daily-withdrawal-approval] 처리 실패 (${withdrawal.id}):`, itemErr.message);
        failCount++;
      }
    }

    // 결과 요약 네이버웍스 메시지
    if (successCount > 0 && botId && channelId) {
      const koreanDate = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
      const detailLines = results.map((r, i) =>
        `${i + 1}. ${r.name} - ${(r.amount || 0).toLocaleString()}원`
      ).join('\n');

      const summaryMessage = `📋 [결재상신완료] ${koreanDate}\n\n${successCount}건 / 총 ${totalAmount.toLocaleString()}원 상신됨${failCount > 0 ? `\n(실패: ${failCount}건)` : ''}\n\n${detailLines}`;

      try {
        await sendChannelMessage(botToken, botId, channelId, summaryMessage);
      } catch (e) {
        console.error('[daily-withdrawal-approval] 요약 메시지 전송 실패:', e.message);
      }
    }

    console.log(`[daily-withdrawal-approval] 완료 - 성공: ${successCount}, 실패: ${failCount}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: successCount,
        failed: failCount,
        totalAmount,
        results
      })
    };

  } catch (error) {
    console.error('[daily-withdrawal-approval] Error:', error);

    try {
      const baseUrl = process.env.URL || 'https://cnecbiz.com';
      await fetch(`${baseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'scheduled-daily-withdrawal-approval',
          errorMessage: error.message
        })
      });
    } catch (e) { console.error('Error alert failed:', e.message); }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// 스케줄: 매주 월~금 UTC 01:00 = KST 10:00
exports.config = { schedule: '0 1 * * 1-5' };
