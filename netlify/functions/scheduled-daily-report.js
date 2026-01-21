const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 일일 현황 리포트 - 매일 10시 (KST)
 * 네이버웍스: 3줄 요약
 * 이메일: 상세 HTML 리포트 (mkt@howlab.co.kr)
 */

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

// 클라이언트는 handler 내부에서 초기화

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
      res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(data).access_token) : reject(new Error(`Token error`)));
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
      res.on('end', () => (res.statusCode === 201 || res.statusCode === 200) ? resolve({ success: true }) : reject(new Error(`Message error`)));
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

function getYesterdayRange() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear(), m = String(yesterday.getMonth() + 1).padStart(2, '0'), d = String(yesterday.getDate()).padStart(2, '0');
  return { start: `${y}-${m}-${d}T00:00:00`, end: `${y}-${m}-${d}T23:59:59`, dateStr: `${m}/${d}` };
}

exports.handler = async (event) => {
  const isManualTest = event.httpMethod === 'GET' || event.httpMethod === 'POST';
  console.log(`[일일리포트] 시작 - ${isManualTest ? '수동' : '자동'}`);

  try {
    // 클라이언트 초기화 (handler 내부에서)
    const clients = {};
    if (process.env.VITE_SUPABASE_KOREA_URL && (process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY)) {
      clients.korea = createClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY);
    }
    if (process.env.VITE_SUPABASE_JAPAN_URL && process.env.VITE_SUPABASE_JAPAN_ANON_KEY) {
      clients.japan = createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.VITE_SUPABASE_JAPAN_ANON_KEY);
    }
    if (process.env.VITE_SUPABASE_US_URL && process.env.VITE_SUPABASE_US_ANON_KEY) {
      clients.us = createClient(process.env.VITE_SUPABASE_US_URL, process.env.VITE_SUPABASE_US_ANON_KEY);
    }
    if (process.env.VITE_SUPABASE_BIZ_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clients.biz = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    console.log('[일일리포트] 클라이언트:', Object.keys(clients));

    const { start, end, dateStr } = getYesterdayRange();
    const today = new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });

    const stats = {
      campaigns: { active: 0, recruiting: 0, total: 0, deadlineSoon: [] },
      videos: { uploads: 0, snsUploads: 0, pendingReview: 0 },
      companies: { new: 0, total: 0 },
      creators: { new: 0, total: 0 },
      byRegion: {}
    };

    // 각 지역 데이터 수집
    for (const [region, client] of Object.entries(clients)) {
      if (!client || region === 'biz') continue;
      try {
        const { data: campaigns } = await client.from('campaigns').select('id, title, status, end_date, application_deadline');
        const { data: newCompanies } = await client.from('companies').select('id').gte('created_at', start).lte('created_at', end);
        const { data: allCompanies } = await client.from('companies').select('id');
        const { data: videoUploads } = await client.from('applications').select('id').not('video_file_url', 'is', null).gte('updated_at', start).lte('updated_at', end);
        const { data: snsUploads } = await client.from('applications').select('id').not('sns_upload_url', 'is', null).gte('updated_at', start).lte('updated_at', end);
        const { data: pending } = await client.from('applications').select('id').eq('status', 'submitted');

        if (campaigns) {
          stats.campaigns.total += campaigns.length;
          campaigns.forEach(c => {
            if (['active', 'in_progress'].includes(c.status)) stats.campaigns.active++;
            if (['recruiting', 'open'].includes(c.status)) stats.campaigns.recruiting++;
            // 3일 이내 마감
            const deadline = c.application_deadline || c.end_date;
            if (deadline) {
              const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
              if (days >= 0 && days <= 3) stats.campaigns.deadlineSoon.push({ region, title: c.title, days });
            }
          });
        }

        stats.companies.new += newCompanies?.length || 0;
        stats.companies.total += allCompanies?.length || 0;
        stats.videos.uploads += videoUploads?.length || 0;
        stats.videos.snsUploads += snsUploads?.length || 0;
        stats.videos.pendingReview += pending?.length || 0;

        stats.byRegion[region] = {
          campaigns: campaigns?.length || 0,
          newCompanies: newCompanies?.length || 0,
          videoUploads: videoUploads?.length || 0
        };

        // 크리에이터
        try {
          const { data: newProfiles } = await client.from('user_profiles').select('id').gte('created_at', start).lte('created_at', end);
          const { data: allProfiles } = await client.from('user_profiles').select('id');
          stats.creators.new += newProfiles?.length || 0;
          stats.creators.total += allProfiles?.length || 0;
        } catch (e) {}
      } catch (e) {
        console.error(`${region} 수집 실패:`, e.message);
      }
    }

    // 네이버웍스 메시지 (3줄)
    const deadlineAlert = stats.campaigns.deadlineSoon.length > 0 ? `⚠️ 마감임박 ${stats.campaigns.deadlineSoon.length}개` : '✅ 이상없음';
    const nwMessage = `📊 일일현황 ${today}
캠페인 ${stats.campaigns.active}개 | 검수대기 ${stats.videos.pendingReview}건
${deadlineAlert}`;

    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

    if (clientId && clientSecret && botId && channelId) {
      const accessToken = await getAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
      await sendNaverWorksMessage(accessToken, botId, channelId, nwMessage);
      console.log('[일일리포트] 네이버웍스 발송 완료');
    }

    // 이메일 상세 리포트
    const deadlineRows = stats.campaigns.deadlineSoon.map((c, i) => {
      const flag = c.region === 'korea' ? '🇰🇷' : c.region === 'japan' ? '🇯🇵' : '🇺🇸';
      const daysText = c.days === 0 ? '오늘' : `D-${c.days}`;
      return `<tr><td style="padding:6px;border:1px solid #ddd">${i + 1}</td><td style="padding:6px;border:1px solid #ddd">${flag} ${c.title?.slice(0, 30) || ''}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;color:#dc2626;font-weight:bold">${daysText}</td></tr>`;
    }).join('');

    const regionRows = Object.entries(stats.byRegion).map(([r, d]) => {
      const flag = r === 'korea' ? '🇰🇷 한국' : r === 'japan' ? '🇯🇵 일본' : '🇺🇸 미국';
      return `<tr><td style="padding:6px;border:1px solid #ddd">${flag}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${d.campaigns}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${d.newCompanies}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${d.videoUploads}</td></tr>`;
    }).join('');

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px">
  <h2 style="border-bottom:2px solid #333;padding-bottom:10px">📊 일일 현황 리포트 (${dateStr} 기준)</h2>
  ${isManualTest ? '<p style="color:#f59e0b">⚠️ 수동 테스트</p>' : ''}

  <div style="display:flex;gap:15px;margin:20px 0;flex-wrap:wrap">
    <div style="flex:1;min-width:120px;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">진행중 캠페인</div>
      <div style="font-size:24px;font-weight:bold">${stats.campaigns.active}</div>
    </div>
    <div style="flex:1;min-width:120px;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">검수 대기</div>
      <div style="font-size:24px;font-weight:bold;color:#2563eb">${stats.videos.pendingReview}</div>
    </div>
    <div style="flex:1;min-width:120px;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">영상 업로드</div>
      <div style="font-size:24px;font-weight:bold">${stats.videos.uploads}</div>
    </div>
    <div style="flex:1;min-width:120px;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#666">신규 기업</div>
      <div style="font-size:24px;font-weight:bold">${stats.companies.new}</div>
    </div>
  </div>

  ${stats.campaigns.deadlineSoon.length > 0 ? `
  <h3 style="color:#dc2626">⚠️ 마감 임박 캠페인 (${stats.campaigns.deadlineSoon.length}개)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#fef2f2"><th style="padding:8px;border:1px solid #ddd">No</th><th style="padding:8px;border:1px solid #ddd">캠페인</th><th style="padding:8px;border:1px solid #ddd">마감</th></tr></thead>
    <tbody>${deadlineRows}</tbody>
  </table>` : '<p style="color:#16a34a">✅ 마감 임박 캠페인 없음</p>'}

  <h3 style="margin-top:30px">🌏 지역별 현황</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#f1f5f9"><th style="padding:8px;border:1px solid #ddd">지역</th><th style="padding:8px;border:1px solid #ddd">캠페인</th><th style="padding:8px;border:1px solid #ddd">신규기업</th><th style="padding:8px;border:1px solid #ddd">영상업로드</th></tr></thead>
    <tbody>${regionRows}</tbody>
  </table>

  <h3 style="margin-top:30px">📈 전체 현황</h3>
  <ul style="line-height:1.8">
    <li>전체 캠페인: ${stats.campaigns.total}개 (진행중 ${stats.campaigns.active} / 모집중 ${stats.campaigns.recruiting})</li>
    <li>전체 기업: ${stats.companies.total}개 (신규 +${stats.companies.new})</li>
    <li>전체 크리에이터: ${stats.creators.total}명 (신규 +${stats.creators.new})</li>
    <li>영상: 업로드 ${stats.videos.uploads}건 / SNS ${stats.videos.snsUploads}건 / 검수대기 ${stats.videos.pendingReview}건</li>
  </ul>

  <p style="color:#999;font-size:11px;margin-top:40px;text-align:center">
    ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | CNEC 자동 리포트
  </p>
</body></html>`;

    await sendEmail('mkt@howlab.co.kr', `[CNEC] 일일 현황 리포트 (${dateStr})`, emailHtml);
    console.log('[일일리포트] 이메일 발송 완료');

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, stats })
    };

  } catch (error) {
    console.error('[일일리포트] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

exports.config = { schedule: '0 1 * * *' };
