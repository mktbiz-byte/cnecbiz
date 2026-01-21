const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 통합 일일 리포트 - 매일 10시 (KST)
 * - 캠페인 현황
 * - 신규 회원
 * - 영상 제출 현황
 *
 * 네이버웍스: 5~10줄 요약
 * 이메일: 상세 HTML 리포트 (mkt@howlab.co.kr)
 */

const supabaseBiz = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

async function sendEmail(to, subject, html) {
  const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPassword) throw new Error('GMAIL_APP_PASSWORD 없음');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailEmail, pass: gmailPassword.replace(/\s/g, '') }
  });
  await transporter.sendMail({ from: `"CNEC 리포트" <${gmailEmail}>`, to, subject, html });
}

function formatNumber(num) { return (num || 0).toLocaleString('ko-KR'); }

function getYesterdayRange() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yesterday = new Date(kstNow);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const startOfDay = new Date(yesterday);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(yesterday);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return { start: startOfDay, end: endOfDay };
}

exports.handler = async (event) => {
  const isManualTest = event.httpMethod === 'GET' || event.httpMethod === 'POST';
  console.log(`[DailyStats] 시작 - ${isManualTest ? '수동' : '자동'}`);

  try {
    const { start, end } = getYesterdayRange();
    const dateStr = `${start.getMonth() + 1}/${start.getDate()}`;

    // 1. 캠페인 현황
    console.log('[DailyStats] 캠페인 데이터 수집...');
    const { data: campaigns } = await supabaseBiz.from('campaigns').select('*');
    const activeCampaigns = (campaigns || []).filter(c => c.status === 'active' || c.status === 'recruiting');
    const { data: newCampaigns } = await supabaseBiz
      .from('campaigns')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // 2. 신규 회원
    console.log('[DailyStats] 회원 데이터 수집...');
    const { data: newCompanies } = await supabaseBiz
      .from('companies')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // 3. 영상 제출 현황
    console.log('[DailyStats] 영상 제출 데이터 수집...');
    const { data: videoSubmissions } = await supabaseBiz
      .from('video_submissions')
      .select('*, campaigns(title)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    const pendingVideos = (videoSubmissions || []).filter(v => v.status === 'pending');
    const approvedVideos = (videoSubmissions || []).filter(v => v.status === 'approved');
    const rejectedVideos = (videoSubmissions || []).filter(v => v.status === 'rejected');

    // 4. 네이버웍스 메시지 (5~10줄 요약)
    const nwMessage = `📊 일일리포트 (${dateStr})

📢 캠페인
• 진행중: ${activeCampaigns.length}개
• 신규: ${(newCampaigns || []).length}개

👥 회원
• 신규 기업: ${(newCompanies || []).length}개

🎬 영상제출 (${(videoSubmissions || []).length}건)
• 대기: ${pendingVideos.length}건 | 승인: ${approvedVideos.length}건
${rejectedVideos.length > 0 ? `• ⚠️ 반려: ${rejectedVideos.length}건` : ''}`;

    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

    if (clientId && clientSecret && botId && channelId) {
      const accessToken = await getAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
      await sendNaverWorksMessage(accessToken, botId, channelId, nwMessage);
      console.log('[DailyStats] 네이버웍스 발송 완료');
    }

    // 5. 이메일 상세 리포트
    const videoRows = (videoSubmissions || []).map((v, i) => `<tr>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:6px;border:1px solid #ddd">${v.campaigns?.title || '-'}</td>
      <td style="padding:6px;border:1px solid #ddd">${v.creator_name || '-'}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${v.status === 'approved' ? '✅' : v.status === 'rejected' ? '❌' : '⏳'}</td>
      <td style="padding:6px;border:1px solid #ddd">${new Date(v.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
    </tr>`).join('');

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px">
  <h2 style="border-bottom:2px solid #333;padding-bottom:10px">📊 일일 리포트 (${dateStr})</h2>
  ${isManualTest ? '<p style="color:#f59e0b">⚠️ 수동 테스트</p>' : ''}

  <div style="display:flex;gap:20px;margin:20px 0">
    <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">진행중 캠페인</div>
      <div style="font-size:20px;font-weight:bold">${activeCampaigns.length}개</div>
      <div style="font-size:14px;color:#2563eb">신규 ${(newCampaigns || []).length}개</div>
    </div>
    <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">신규 기업</div>
      <div style="font-size:20px;font-weight:bold">${(newCompanies || []).length}개</div>
    </div>
    <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">영상 제출</div>
      <div style="font-size:20px;font-weight:bold">${(videoSubmissions || []).length}건</div>
      <div style="font-size:14px;color:${pendingVideos.length > 0 ? '#f59e0b' : '#16a34a'}">대기 ${pendingVideos.length}건</div>
    </div>
  </div>

  <h3>🎬 영상 제출 내역</h3>
  ${(videoSubmissions || []).length > 0 ? `
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#f1f5f9">
      <th style="padding:8px;border:1px solid #ddd">No</th>
      <th style="padding:8px;border:1px solid #ddd">캠페인</th>
      <th style="padding:8px;border:1px solid #ddd">크리에이터</th>
      <th style="padding:8px;border:1px solid #ddd">상태</th>
      <th style="padding:8px;border:1px solid #ddd">제출시간</th>
    </tr></thead>
    <tbody>${videoRows}</tbody>
  </table>` : '<p style="color:#666">영상 제출 없음</p>'}

  <p style="color:#999;font-size:11px;margin-top:40px;text-align:center">
    발송: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | CNEC 자동 리포트
  </p>
</body></html>`;

    let emailSent = false;
    try {
      if (process.env.GMAIL_APP_PASSWORD) {
        await sendEmail('mkt@howlab.co.kr', `[CNEC] 일일 리포트 (${dateStr})`, emailHtml);
        emailSent = true;
        console.log('[DailyStats] 이메일 발송 완료');
      } else {
        console.log('[DailyStats] GMAIL_APP_PASSWORD 없음 - 이메일 발송 생략');
      }
    } catch (emailErr) {
      console.error('[DailyStats] 이메일 발송 실패:', emailErr.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: dateStr,
        campaigns: { active: activeCampaigns.length, new: (newCampaigns || []).length },
        newCompanies: (newCompanies || []).length,
        videos: { total: (videoSubmissions || []).length, pending: pendingVideos.length },
        emailSent
      })
    };

  } catch (error) {
    console.error('[DailyStats] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

exports.config = { schedule: '0 1 * * *' };
