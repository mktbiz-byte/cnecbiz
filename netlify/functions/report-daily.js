const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 일일 리포트 - 매일 10시 (KST)
 *
 * 네이버웍스: 10줄 간소화 요약
 * 이메일: 상세 리포트
 *
 * 내용:
 * - 크리에이터 가입량 (한국/미국/일본)
 * - 마감일 당일 크리에이터 수
 * - 마감일 안지킨 사람 수
 * - 신규 문의 수
 * - 신규 캠페인 수 (한국/미국/일본)
 */

// Supabase 클라이언트
let supabaseBiz = null;
let supabaseKorea = null;
let supabaseJapan = null;
let supabaseUS = null;

try {
  if (process.env.VITE_SUPABASE_BIZ_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseBiz = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
} catch (e) { console.error('[BIZ 초기화 오류]', e.message); }

try {
  if (process.env.VITE_SUPABASE_KOREA_URL && process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY) {
    supabaseKorea = createClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY);
  }
} catch (e) { console.error('[Korea 초기화 오류]', e.message); }

try {
  if (process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY) {
    supabaseJapan = createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY);
  }
} catch (e) { console.error('[Japan 초기화 오류]', e.message); }

try {
  if (process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY) {
    supabaseUS = createClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY);
  }
} catch (e) { console.error('[US 초기화 오류]', e.message); }

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

function getTodayDateStr() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = String(kstNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRegionKey(country) {
  const c = (country || '').toLowerCase();
  if (c.includes('japan') || c.includes('jp') || c === '일본') return 'japan';
  if (c.includes('us') || c.includes('usa') || c === '미국') return 'us';
  return 'korea';
}

exports.handler = async (event) => {
  const isManualTest = event.httpMethod === 'GET' || event.httpMethod === 'POST';
  console.log(`[report-daily] 시작 - ${isManualTest ? '수동' : '자동'}`);

  if (!supabaseBiz) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Supabase BIZ 초기화 실패',
        envCheck: {
          VITE_SUPABASE_BIZ_URL: !!process.env.VITE_SUPABASE_BIZ_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      })
    };
  }

  try {
    const { start, end } = getYesterdayRange();
    const dateStr = `${start.getMonth() + 1}/${start.getDate()}`;
    const todayStr = getTodayDateStr();

    // 1. 신규 크리에이터 가입량 (리전별)
    console.log('[report-daily] 크리에이터 조회...');
    const creatorResult = { total: 0, byRegion: { korea: 0, japan: 0, us: 0 } };
    const regions = [
      { key: 'korea', client: supabaseKorea },
      { key: 'japan', client: supabaseJapan },
      { key: 'us', client: supabaseUS }
    ];

    for (const r of regions) {
      if (!r.client) continue;
      try {
        const { data, error } = await r.client.from('user_profiles').select('id').gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
        if (error) throw error;
        const count = data?.length || 0;
        creatorResult.byRegion[r.key] = count;
        creatorResult.total += count;
      } catch (e) { console.error(`[${r.key} 크리에이터 조회 오류]`, e.message); }
    }

    // 2. 마감일 당일 크리에이터 수
    console.log('[report-daily] 마감일 당일 조회...');
    let deadlineTodayCount = 0;
    const deadlineTodayCampaigns = [];

    try {
      const { data: todayCampaigns, error } = await supabaseBiz
        .from('campaigns')
        .select('id, title, country, region')
        .eq('content_submission_deadline', todayStr)
        .in('status', ['active', 'in_progress', 'recruiting']);

      if (!error && todayCampaigns) {
        for (const campaign of todayCampaigns) {
          const { data: apps } = await supabaseBiz
            .from('applications')
            .select('id')
            .eq('campaign_id', campaign.id)
            .in('status', ['selected', 'virtual_selected', 'approved', 'filming', 'guide_confirmation', 'guide_approved']);

          if (apps && apps.length > 0) {
            deadlineTodayCount += apps.length;
            deadlineTodayCampaigns.push({ title: campaign.title, count: apps.length });
          }
        }
      }
    } catch (e) { console.error('[마감일 당일 조회 오류]', e.message); }

    // 3. 마감일 안지킨 크리에이터 수 (어제까지 마감인데 제출 안함)
    console.log('[report-daily] 마감일 미제출 조회...');
    let overdueCount = 0;
    const overdueList = [];

    try {
      const { data: overdueCampaigns, error } = await supabaseBiz
        .from('campaigns')
        .select('id, title, content_submission_deadline')
        .lt('content_submission_deadline', todayStr)
        .in('status', ['active', 'in_progress', 'recruiting']);

      if (!error && overdueCampaigns) {
        for (const campaign of overdueCampaigns) {
          const { data: overdueApps } = await supabaseBiz
            .from('applications')
            .select('id')
            .eq('campaign_id', campaign.id)
            .in('status', ['selected', 'virtual_selected', 'approved', 'filming', 'guide_confirmation', 'guide_approved']);

          if (overdueApps && overdueApps.length > 0) {
            overdueCount += overdueApps.length;
            overdueList.push({ title: campaign.title, count: overdueApps.length, deadline: campaign.content_submission_deadline });
          }
        }
      }
    } catch (e) { console.error('[마감일 미제출 조회 오류]', e.message); }

    // 4. 신규 문의 수 (contact_inquiries 테이블)
    console.log('[report-daily] 신규 문의 조회...');
    let newInquiryCount = 0;

    try {
      const { data: inquiries, error } = await supabaseBiz
        .from('contact_inquiries')
        .select('id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (!error && inquiries) {
        newInquiryCount = inquiries.length;
      }
    } catch (e) { console.error('[신규 문의 조회 오류]', e.message); }

    // 5. 신규 캠페인 수 (리전별)
    console.log('[report-daily] 신규 캠페인 조회...');
    const campaignResult = { total: 0, byRegion: { korea: 0, japan: 0, us: 0 } };

    try {
      const { data: campaigns, error } = await supabaseBiz
        .from('campaigns')
        .select('id, country, region')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (!error && campaigns) {
        for (const c of campaigns) {
          const region = getRegionKey(c.country || c.region);
          campaignResult.total++;
          campaignResult.byRegion[region]++;
        }
      }
    } catch (e) { console.error('[신규 캠페인 조회 오류]', e.message); }

    // 6. 네이버웍스 메시지 (10줄 간소화)
    const nwMessage = `📊 일일리포트 (${dateStr})

👥 신규 크리에이터: ${creatorResult.total}명
   🇰🇷${creatorResult.byRegion.korea} / 🇯🇵${creatorResult.byRegion.japan} / 🇺🇸${creatorResult.byRegion.us}

📅 마감일 당일: ${deadlineTodayCount}명
${overdueCount > 0 ? `🚨 마감 미제출: ${overdueCount}명` : '✅ 마감 미제출: 0명'}

📩 신규 문의: ${newInquiryCount}건

📢 신규 캠페인: ${campaignResult.total}개
   🇰🇷${campaignResult.byRegion.korea} / 🇯🇵${campaignResult.byRegion.japan} / 🇺🇸${campaignResult.byRegion.us}`;

    try {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID;
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
      const botId = process.env.NAVER_WORKS_BOT_ID;
      const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

      if (clientId && clientSecret && botId && channelId) {
        const accessToken = await getAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
        await sendNaverWorksMessage(accessToken, botId, channelId, nwMessage);
        console.log('[report-daily] 네이버웍스 발송 완료');
      }
    } catch (e) { console.error('[네이버웍스 발송 오류]', e.message); }

    // 7. 이메일 상세 리포트
    let emailSent = false;
    try {
      if (process.env.GMAIL_APP_PASSWORD) {
        const deadlineTodayRows = deadlineTodayCampaigns.map((c, i) =>
          `<tr><td style="padding:6px;border:1px solid #ddd">${i + 1}</td><td style="padding:6px;border:1px solid #ddd">${c.title}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${c.count}명</td></tr>`
        ).join('') || '<tr><td colspan="3" style="padding:6px;border:1px solid #ddd;text-align:center">없음</td></tr>';

        const overdueRows = overdueList.map((c, i) =>
          `<tr style="background:#fee2e2"><td style="padding:6px;border:1px solid #ddd">${i + 1}</td><td style="padding:6px;border:1px solid #ddd">${c.title}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${c.deadline}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;color:#dc2626;font-weight:bold">${c.count}명</td></tr>`
        ).join('') || '<tr><td colspan="4" style="padding:6px;border:1px solid #ddd;text-align:center;color:#16a34a">없음 ✅</td></tr>';

        const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px">
  <h2 style="border-bottom:2px solid #333;padding-bottom:10px">📊 일일 리포트 (${dateStr})</h2>
  ${isManualTest ? '<p style="color:orange">⚠️ 수동 테스트</p>' : ''}

  <!-- 요약 카드 -->
  <div style="display:flex;gap:10px;margin:20px 0;flex-wrap:wrap">
    <div style="flex:1;background:#dbeafe;padding:15px;border-radius:8px;text-align:center;min-width:120px">
      <div style="font-size:11px;color:#1e40af">👥 신규 크리에이터</div>
      <div style="font-size:24px;font-weight:bold;color:#1e40af">${creatorResult.total}명</div>
      <div style="font-size:10px;color:#666">🇰🇷${creatorResult.byRegion.korea} 🇯🇵${creatorResult.byRegion.japan} 🇺🇸${creatorResult.byRegion.us}</div>
    </div>
    <div style="flex:1;background:#fef3c7;padding:15px;border-radius:8px;text-align:center;min-width:120px">
      <div style="font-size:11px;color:#92400e">📅 마감일 당일</div>
      <div style="font-size:24px;font-weight:bold;color:#92400e">${deadlineTodayCount}명</div>
    </div>
    <div style="flex:1;background:${overdueCount > 0 ? '#fee2e2' : '#dcfce7'};padding:15px;border-radius:8px;text-align:center;min-width:120px">
      <div style="font-size:11px;color:${overdueCount > 0 ? '#dc2626' : '#16a34a'}">🚨 마감 미제출</div>
      <div style="font-size:24px;font-weight:bold;color:${overdueCount > 0 ? '#dc2626' : '#16a34a'}">${overdueCount}명</div>
    </div>
    <div style="flex:1;background:#e0e7ff;padding:15px;border-radius:8px;text-align:center;min-width:120px">
      <div style="font-size:11px;color:#4338ca">📩 신규 문의</div>
      <div style="font-size:24px;font-weight:bold;color:#4338ca">${newInquiryCount}건</div>
    </div>
    <div style="flex:1;background:#f3e8ff;padding:15px;border-radius:8px;text-align:center;min-width:120px">
      <div style="font-size:11px;color:#7c3aed">📢 신규 캠페인</div>
      <div style="font-size:24px;font-weight:bold;color:#7c3aed">${campaignResult.total}개</div>
      <div style="font-size:10px;color:#666">🇰🇷${campaignResult.byRegion.korea} 🇯🇵${campaignResult.byRegion.japan} 🇺🇸${campaignResult.byRegion.us}</div>
    </div>
  </div>

  <!-- 마감일 당일 상세 -->
  <h3>📅 오늘 마감 캠페인 (${deadlineTodayCount}명)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:8px;border:1px solid #ddd;width:40px">No</th>
        <th style="padding:8px;border:1px solid #ddd">캠페인</th>
        <th style="padding:8px;border:1px solid #ddd;width:80px">인원</th>
      </tr>
    </thead>
    <tbody>${deadlineTodayRows}</tbody>
  </table>

  <!-- 마감 미제출 상세 -->
  <h3 style="color:${overdueCount > 0 ? '#dc2626' : '#16a34a'}">🚨 마감 미제출 (${overdueCount}명)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead>
      <tr style="background:#fef2f2">
        <th style="padding:8px;border:1px solid #ddd;width:40px">No</th>
        <th style="padding:8px;border:1px solid #ddd">캠페인</th>
        <th style="padding:8px;border:1px solid #ddd;width:100px">마감일</th>
        <th style="padding:8px;border:1px solid #ddd;width:80px">미제출</th>
      </tr>
    </thead>
    <tbody>${overdueRows}</tbody>
  </table>

  <p style="color:#999;font-size:11px;margin-top:40px;text-align:center">
    발송: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | CNEC 자동 리포트
  </p>
</body></html>`;

        await sendEmail('mkt@howlab.co.kr', `[CNEC] 일일 리포트 (${dateStr})`, emailHtml);
        emailSent = true;
        console.log('[report-daily] 이메일 발송 완료');
      }
    } catch (e) { console.error('[이메일 발송 오류]', e.message); }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: dateStr,
        creators: creatorResult,
        deadlineToday: deadlineTodayCount,
        overdue: overdueCount,
        newInquiries: newInquiryCount,
        newCampaigns: campaignResult,
        emailSent
      })
    };

  } catch (error) {
    console.error('[report-daily] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message, stack: error.stack }) };
  }
};

// 스케줄은 netlify.toml에서 관리 (중복 실행 방지)
// exports.config = { schedule: '0 1 * * *' };
