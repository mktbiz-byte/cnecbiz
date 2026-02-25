const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 매주 월요일 오전 10시 (KST) 출금 신청 주간 보고서
 * - 네이버웍스: 간단 요약만
 * - 이메일: 상세 리포트 (mkt@howlab.co.kr)
 */

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
);

// 네이버웍스 Private Key
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

function generateJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600, scope: 'bot' };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY);
  return `${signatureInput}.${signature.toString('base64url')}`;
}

async function getAccessToken(clientId, clientSecret, serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT(clientId, serviceAccount);
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt, client_id: clientId, client_secret: clientSecret, scope: 'bot'
    }).toString();

    const req = https.request({
      hostname: 'auth.worksmobile.com', path: '/oauth2/v2.0/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(data).access_token) : reject(new Error(`Token error: ${res.statusCode}`)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendNaverWorksMessage(accessToken, botId, channelId, message) {
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

// 이메일 발송
async function sendEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
  });
  await transporter.sendMail({ from: `"CNEC 리포트" <${process.env.GMAIL_EMAIL}>`, to, subject, html });
}

// 지난 주 범위 계산
function getLastWeekRange() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dayOfWeek = kstNow.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(kstNow);
  lastMonday.setUTCDate(kstNow.getUTCDate() - daysFromMonday - 7);
  lastMonday.setUTCHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
  lastSunday.setUTCHours(23, 59, 59, 999);
  return { monday: lastMonday, sunday: lastSunday };
}

function formatNumber(num) { return (num || 0).toLocaleString('ko-KR'); }

exports.handler = async (event) => {
  const httpMethod = event.httpMethod || 'SCHEDULED';
  const isManualTest = httpMethod === 'GET' || httpMethod === 'POST';
  console.log(`[출금보고서] 시작 - ${isManualTest ? '수동' : '자동'}`);

  try {
    const { monday, sunday } = getLastWeekRange();
    const startStr = `${monday.getMonth() + 1}/${monday.getDate()}`;
    const endStr = `${sunday.getMonth() + 1}/${sunday.getDate()}`;

    // BIZ DB 출금 신청 조회
    const { data: bizWithdrawals } = await supabaseBiz
      .from('creator_withdrawal_requests')
      .select('*')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });

    const { data: wrWithdrawals } = await supabaseBiz
      .from('withdrawal_requests')
      .select('*')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });

    // Korea DB 출금 신청 조회
    const { data: koreaWithdrawals } = await supabaseKorea
      .from('withdrawals')
      .select('*')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });

    // 데이터 통합
    const existingIds = new Set();
    const allWithdrawals = [];

    (bizWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({ ...w, name: w.account_holder || 'Unknown', amount: w.requested_amount || w.amount || 0 });
      }
    });

    (wrWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({ ...w, name: w.bank_account_holder || w.account_holder || 'Unknown', amount: w.amount || 0, account_number: w.bank_account_number || w.account_number });
      }
    });

    (koreaWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({ ...w, name: w.bank_account_holder || 'Unknown', amount: w.amount || 0, account_number: w.bank_account_number });
      }
    });

    if (allWithdrawals.length === 0) {
      console.log('[출금보고서] 출금 신청 없음');
      return { statusCode: 200, body: JSON.stringify({ message: '출금 신청 없음' }) };
    }

    // 금액 계산
    const totalAmount = allWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const totalNetAmount = Math.round(totalAmount * 0.967); // 3.3% 공제

    // 1. 네이버웍스 메시지 (간단 요약만)
    const nwMessage = `📋 주간 출금 (${startStr}~${endStr})
${allWithdrawals.length}건 / ${formatNumber(totalAmount)}원
→ 실지급 ${formatNumber(totalNetAmount)}원
📧 상세: mkt@howlab.co.kr`;

    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_WITHDRAWAL_CHANNEL_ID || process.env.NAVER_WORKS_CHANNEL_ID;

    if (clientId && clientSecret && botId && channelId) {
      const accessToken = await getAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
      await sendNaverWorksMessage(accessToken, botId, channelId, nwMessage);
      console.log('[출금보고서] 네이버웍스 발송 완료');
    }

    // 2. 이메일 상세 리포트
    const tableRows = allWithdrawals.map((w, i) => {
      const gross = w.amount || 0;
      const tax = Math.round(gross * 0.033);
      const net = gross - tax;
      const date = new Date(w.created_at).toLocaleDateString('ko-KR');
      return `<tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${date}</td>
        <td style="padding:8px;border:1px solid #ddd">${w.name}</td>
        <td style="padding:8px;border:1px solid #ddd">${w.bank_name || ''}</td>
        <td style="padding:8px;border:1px solid #ddd">${w.account_number || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatNumber(gross)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatNumber(tax)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">${formatNumber(net)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${w.status === 'approved' ? '승인' : '대기'}</td>
      </tr>`;
    }).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Pretendard',sans-serif;max-width:900px;margin:0 auto;padding:20px">
  <h2 style="color:#1a1a1a;border-bottom:2px solid #333;padding-bottom:10px">📋 주간 출금 신청 보고서</h2>
  <p style="color:#666">기간: ${startStr} ~ ${endStr}${isManualTest ? ' (수동 테스트)' : ''}</p>

  <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0">
    <table style="width:100%">
      <tr>
        <td style="text-align:center;padding:10px">
          <div style="font-size:14px;color:#666">총 건수</div>
          <div style="font-size:24px;font-weight:bold;color:#333">${allWithdrawals.length}건</div>
        </td>
        <td style="text-align:center;padding:10px">
          <div style="font-size:14px;color:#666">총 신청금액</div>
          <div style="font-size:24px;font-weight:bold;color:#333">${formatNumber(totalAmount)}원</div>
        </td>
        <td style="text-align:center;padding:10px">
          <div style="font-size:14px;color:#666">실지급액 (3.3% 공제)</div>
          <div style="font-size:24px;font-weight:bold;color:#2563eb">${formatNumber(totalNetAmount)}원</div>
        </td>
      </tr>
    </table>
  </div>

  <h3 style="margin-top:30px">📝 상세 내역</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:10px;border:1px solid #ddd">No</th>
        <th style="padding:10px;border:1px solid #ddd">신청일</th>
        <th style="padding:10px;border:1px solid #ddd">이름</th>
        <th style="padding:10px;border:1px solid #ddd">은행</th>
        <th style="padding:10px;border:1px solid #ddd">계좌번호</th>
        <th style="padding:10px;border:1px solid #ddd">신청금액</th>
        <th style="padding:10px;border:1px solid #ddd">세금(3.3%)</th>
        <th style="padding:10px;border:1px solid #ddd">실지급액</th>
        <th style="padding:10px;border:1px solid #ddd">상태</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr style="background:#f8f9fa;font-weight:bold">
        <td colspan="5" style="padding:10px;border:1px solid #ddd;text-align:right">합계</td>
        <td style="padding:10px;border:1px solid #ddd;text-align:right">${formatNumber(totalAmount)}</td>
        <td style="padding:10px;border:1px solid #ddd;text-align:right">${formatNumber(Math.round(totalAmount * 0.033))}</td>
        <td style="padding:10px;border:1px solid #ddd;text-align:right;color:#2563eb">${formatNumber(totalNetAmount)}</td>
        <td style="padding:10px;border:1px solid #ddd;text-align:center">${allWithdrawals.length}건</td>
      </tr>
    </tfoot>
  </table>

  <p style="color:#999;font-size:12px;margin-top:30px;text-align:center">
    발송시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | CNEC 자동 리포트
  </p>
</body>
</html>`;

    await sendEmail('mkt@howlab.co.kr', `[CNEC] 주간 출금 보고서 (${startStr}~${endStr})`, emailHtml);
    console.log('[출금보고서] 이메일 발송 완료');

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, count: allWithdrawals.length, totalAmount, totalNetAmount })
    };

  } catch (error) {
    console.error('[출금보고서] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// 스케줄 비활성화 - scheduled-weekly-report.js로 통합됨
// exports.config = { schedule: '0 1 * * 1' };
