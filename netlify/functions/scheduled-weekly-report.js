const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * 통합 주간 리포트 - 매주 월요일 10시 (KST)
 * - 출금 신청 현황
 * - 소속 크리에이터 현황
 *
 * 네이버웍스: 4줄 요약
 * 이메일: 상세 HTML 리포트 (mkt@howlab.co.kr)
 */

const supabaseBiz = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseKorea = createClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

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

// === 유틸리티 함수 ===
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
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  });
  await transporter.sendMail({ from: `"CNEC 리포트" <${process.env.GMAIL_USER}>`, to, subject, html });
}

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
function formatK(num) {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

// === 출금 데이터 수집 ===
async function getWithdrawalData(monday, sunday) {
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

  const { data: koreaWithdrawals } = await supabaseKorea
    .from('withdrawals')
    .select('*')
    .gte('created_at', monday.toISOString())
    .lte('created_at', sunday.toISOString())
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: true });

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

  return allWithdrawals;
}

// === 크리에이터 데이터 수집 ===
async function getCreatorData() {
  const { data: creators } = await supabaseBiz
    .from('affiliated_creators')
    .select('*')
    .order('created_at', { ascending: false });

  if (!creators || creators.length === 0) return { creators: [], stats: [], alerts: [] };

  const stats = [];
  const alerts = [];

  for (const creator of creators) {
    let channelId = creator.youtube_channel_id;
    if (!channelId && creator.channel_url) {
      const match = creator.channel_url.match(/channel\/([a-zA-Z0-9_-]+)/);
      if (match) channelId = match[1];
    }

    if (!channelId) {
      stats.push({ name: creator.name, status: 'no_channel', weeklyUploads: 0, avgViews: 0, subscriberCount: creator.subscriber_count || 0 });
      continue;
    }

    try {
      // 채널 정보
      const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'statistics', id: channelId, key: YOUTUBE_API_KEY }
      });
      const channelInfo = channelRes.data.items?.[0];
      if (!channelInfo) continue;

      const subscriberCount = parseInt(channelInfo.statistics.subscriberCount || 0);

      // 최근 7일 영상
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: { part: 'snippet', channelId, order: 'date', type: 'video', maxResults: 10, publishedAfter: sevenDaysAgo.toISOString(), key: YOUTUBE_API_KEY }
      });
      const weeklyUploads = searchRes.data.items?.length || 0;

      // 평균 조회수
      let avgViews = 0;
      if (weeklyUploads > 0) {
        const videoIds = searchRes.data.items.map(item => item.id.videoId).filter(Boolean).join(',');
        if (videoIds) {
          const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: { part: 'statistics', id: videoIds, key: YOUTUBE_API_KEY }
          });
          const views = statsRes.data.items.map(v => parseInt(v.statistics.viewCount || 0));
          avgViews = Math.round(views.reduce((a, b) => a + b, 0) / views.length);
        }
      }

      // 마지막 업로드
      const lastRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: { part: 'snippet', channelId, order: 'date', type: 'video', maxResults: 1, key: YOUTUBE_API_KEY }
      });
      const lastVideoDate = lastRes.data.items?.[0]?.snippet?.publishedAt;
      const daysSinceUpload = lastVideoDate ? Math.floor((Date.now() - new Date(lastVideoDate).getTime()) / (1000 * 60 * 60 * 24)) : null;

      stats.push({ name: creator.name, status: 'active', weeklyUploads, avgViews, subscriberCount, daysSinceUpload });

      // 알림
      if (daysSinceUpload >= 4) alerts.push({ type: 'stopped', name: creator.name, detail: `${daysSinceUpload}일간 업로드 없음` });

      // DB 업데이트
      await supabaseBiz.from('affiliated_creators').update({ subscriber_count: subscriberCount, last_checked_at: new Date().toISOString() }).eq('id', creator.id);

      await new Promise(resolve => setTimeout(resolve, 500)); // API 제한 방지
    } catch (e) {
      console.error(`크리에이터 ${creator.name} 분석 오류:`, e.message);
    }
  }

  return { creators, stats, alerts };
}

// === 메인 핸들러 ===
exports.handler = async (event) => {
  const isManualTest = event.httpMethod === 'GET' || event.httpMethod === 'POST';
  console.log(`[주간리포트] 시작 - ${isManualTest ? '수동' : '자동'}`);

  try {
    const { monday, sunday } = getLastWeekRange();
    const startStr = `${monday.getMonth() + 1}/${monday.getDate()}`;
    const endStr = `${sunday.getMonth() + 1}/${sunday.getDate()}`;

    // 1. 출금 데이터
    console.log('[주간리포트] 출금 데이터 수집...');
    const withdrawals = await getWithdrawalData(monday, sunday);
    const totalAmount = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const totalNetAmount = Math.round(totalAmount * 0.967);

    // 2. 크리에이터 데이터
    console.log('[주간리포트] 크리에이터 데이터 수집...');
    const { creators, stats, alerts } = await getCreatorData();
    const activeStats = stats.filter(s => s.status === 'active');
    const totalUploads = activeStats.reduce((sum, s) => sum + s.weeklyUploads, 0);
    const stoppedCount = alerts.filter(a => a.type === 'stopped').length;

    // 3. 네이버웍스 메시지 (간단 요약)
    const nwMessage = `📋 주간리포트 (${startStr}~${endStr})
출금 ${withdrawals.length}건 / ${formatNumber(totalAmount)}원
크리에이터 ${creators.length}명 / 업로드 ${totalUploads}건
${stoppedCount > 0 ? `⚠️ 업로드중단 ${stoppedCount}명` : '✅ 이상없음'}`;

    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

    if (clientId && clientSecret && botId && channelId) {
      const accessToken = await getAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
      await sendNaverWorksMessage(accessToken, botId, channelId, nwMessage);
      console.log('[주간리포트] 네이버웍스 발송 완료');
    }

    // 4. 이메일 상세 리포트
    const withdrawalRows = withdrawals.map((w, i) => {
      const gross = w.amount || 0;
      const tax = Math.round(gross * 0.033);
      const net = gross - tax;
      return `<tr>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ddd">${new Date(w.created_at).toLocaleDateString('ko-KR')}</td>
        <td style="padding:6px;border:1px solid #ddd">${w.name}</td>
        <td style="padding:6px;border:1px solid #ddd">${w.bank_name || ''}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${formatNumber(gross)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${formatNumber(net)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${w.status === 'approved' ? '승인' : '대기'}</td>
      </tr>`;
    }).join('');

    const creatorRows = activeStats.sort((a, b) => b.weeklyUploads - a.weeklyUploads).map((s, i) => {
      const status = s.daysSinceUpload >= 4 ? '⚠️' : '✅';
      return `<tr>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ddd">${s.name}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${s.weeklyUploads}개</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${formatK(s.avgViews)}회</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${formatK(s.subscriberCount)}명</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${status} ${s.daysSinceUpload !== null ? s.daysSinceUpload + '일전' : '-'}</td>
      </tr>`;
    }).join('');

    const alertsHtml = alerts.length > 0
      ? alerts.map(a => `<li style="color:#dc2626">${a.name}: ${a.detail}</li>`).join('')
      : '<li style="color:#16a34a">특이사항 없음</li>';

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px">
  <h2 style="border-bottom:2px solid #333;padding-bottom:10px">📋 주간 리포트 (${startStr} ~ ${endStr})</h2>
  ${isManualTest ? '<p style="color:#f59e0b">⚠️ 수동 테스트</p>' : ''}

  <div style="display:flex;gap:20px;margin:20px 0">
    <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">출금 신청</div>
      <div style="font-size:20px;font-weight:bold">${withdrawals.length}건</div>
      <div style="font-size:14px;color:#2563eb">${formatNumber(totalNetAmount)}원</div>
    </div>
    <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">크리에이터</div>
      <div style="font-size:20px;font-weight:bold">${creators.length}명</div>
      <div style="font-size:14px;color:#2563eb">업로드 ${totalUploads}건</div>
    </div>
    <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">주의사항</div>
      <div style="font-size:20px;font-weight:bold;color:${stoppedCount > 0 ? '#dc2626' : '#16a34a'}">${stoppedCount > 0 ? stoppedCount + '건' : '없음'}</div>
    </div>
  </div>

  <h3>💰 출금 신청 내역</h3>
  ${withdrawals.length > 0 ? `
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#f1f5f9">
      <th style="padding:8px;border:1px solid #ddd">No</th>
      <th style="padding:8px;border:1px solid #ddd">신청일</th>
      <th style="padding:8px;border:1px solid #ddd">이름</th>
      <th style="padding:8px;border:1px solid #ddd">은행</th>
      <th style="padding:8px;border:1px solid #ddd">신청금액</th>
      <th style="padding:8px;border:1px solid #ddd">실지급액</th>
      <th style="padding:8px;border:1px solid #ddd">상태</th>
    </tr></thead>
    <tbody>${withdrawalRows}</tbody>
  </table>` : '<p style="color:#666">출금 신청 없음</p>'}

  <h3 style="margin-top:30px">👤 소속 크리에이터 현황</h3>
  ${activeStats.length > 0 ? `
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#f1f5f9">
      <th style="padding:8px;border:1px solid #ddd">No</th>
      <th style="padding:8px;border:1px solid #ddd">이름</th>
      <th style="padding:8px;border:1px solid #ddd">주간 업로드</th>
      <th style="padding:8px;border:1px solid #ddd">평균 조회수</th>
      <th style="padding:8px;border:1px solid #ddd">구독자</th>
      <th style="padding:8px;border:1px solid #ddd">마지막 업로드</th>
    </tr></thead>
    <tbody>${creatorRows}</tbody>
  </table>` : '<p style="color:#666">크리에이터 데이터 없음</p>'}

  <h3 style="margin-top:30px">⚠️ 주의사항</h3>
  <ul>${alertsHtml}</ul>

  <p style="color:#999;font-size:11px;margin-top:40px;text-align:center">
    발송: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | CNEC 자동 리포트
  </p>
</body></html>`;

    // 이메일 발송 (실패해도 전체 성공 처리)
    let emailSent = false;
    try {
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        await sendEmail('mkt@howlab.co.kr', `[CNEC] 주간 리포트 (${startStr}~${endStr})`, emailHtml);
        emailSent = true;
        console.log('[주간리포트] 이메일 발송 완료');
      } else {
        console.log('[주간리포트] Gmail 자격증명 없음 - 이메일 발송 생략');
      }
    } catch (emailErr) {
      console.error('[주간리포트] 이메일 발송 실패:', emailErr.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, withdrawals: withdrawals.length, creators: creators.length, uploads: totalUploads, emailSent })
    };

  } catch (error) {
    console.error('[주간리포트] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

exports.config = { schedule: '0 1 * * 1' };
