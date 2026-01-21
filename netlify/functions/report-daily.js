const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 일일 리포트 (새 버전) - 매일 10시 (KST)
 * 멀티-리전 지원: 미국/일본/한국
 */

// Supabase 클라이언트 초기화
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

    // 1. 캠페인 현황
    console.log('[report-daily] 캠페인 조회...');
    const campaignResult = { total: { active: 0, new: 0 }, byRegion: { korea: { active: 0, new: 0 }, japan: { active: 0, new: 0 }, us: { active: 0, new: 0 } } };

    try {
      const { data: campaigns, error } = await supabaseBiz.from('campaigns').select('id, status, country, region, created_at');
      if (error) throw error;

      for (const c of (campaigns || [])) {
        const isActive = ['active', 'recruiting', 'in_progress'].includes(c.status);
        const isNew = new Date(c.created_at) >= start && new Date(c.created_at) <= end;
        const region = getRegionKey(c.country || c.region);

        if (isActive) {
          campaignResult.total.active++;
          campaignResult.byRegion[region].active++;
        }
        if (isNew) {
          campaignResult.total.new++;
          campaignResult.byRegion[region].new++;
        }
      }
    } catch (e) { console.error('[캠페인 조회 오류]', e.message); }

    // 2. 신규 기업
    console.log('[report-daily] 신규 기업 조회...');
    let newCompanies = 0;
    try {
      const { data, error } = await supabaseBiz.from('companies').select('id').gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      if (error) throw error;
      newCompanies = data?.length || 0;
    } catch (e) { console.error('[신규 기업 조회 오류]', e.message); }

    // 3. 신규 크리에이터 (리전별)
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

    // 4. 영상 제출 현황
    console.log('[report-daily] 영상 제출 조회...');
    const videoResult = { total: { count: 0, submitted: 0, completed: 0 }, byRegion: { korea: { count: 0 }, japan: { count: 0 }, us: { count: 0 } } };

    try {
      const { data: submissions, error } = await supabaseBiz
        .from('applications')
        .select('id, status, campaign_id')
        .in('status', ['video_submitted', 'revision_requested', 'completed', 'sns_uploaded'])
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString());

      if (error) throw error;

      if (submissions && submissions.length > 0) {
        const campaignIds = [...new Set(submissions.map(s => s.campaign_id).filter(Boolean))];
        const { data: campaignData } = await supabaseBiz.from('campaigns').select('id, country, region').in('id', campaignIds);
        const campaignMap = new Map((campaignData || []).map(c => [c.id, c]));

        for (const s of submissions) {
          const campaign = campaignMap.get(s.campaign_id) || {};
          const region = getRegionKey(campaign.country || campaign.region);

          videoResult.total.count++;
          videoResult.byRegion[region].count++;
          if (s.status === 'video_submitted') videoResult.total.submitted++;
          if (s.status === 'completed') videoResult.total.completed++;
        }
      }
    } catch (e) { console.error('[영상 제출 조회 오류]', e.message); }

    // 5. 마감 미제출
    console.log('[report-daily] 마감 미제출 조회...');
    const overdueResult = { total: 0, byRegion: { korea: 0, japan: 0, us: 0 } };

    try {
      const { data: deadlineCampaigns, error } = await supabaseBiz
        .from('campaigns')
        .select('id, title, country, region')
        .eq('content_submission_deadline', todayStr)
        .in('status', ['active', 'in_progress', 'recruiting']);

      if (error) throw error;

      for (const campaign of (deadlineCampaigns || [])) {
        const { data: overdueApps } = await supabaseBiz
          .from('applications')
          .select('id')
          .eq('campaign_id', campaign.id)
          .in('status', ['selected', 'virtual_selected', 'approved', 'filming', 'guide_confirmation']);

        if (overdueApps && overdueApps.length > 0) {
          const region = getRegionKey(campaign.country || campaign.region);
          overdueResult.total += overdueApps.length;
          overdueResult.byRegion[region] += overdueApps.length;
        }
      }
    } catch (e) { console.error('[마감 미제출 조회 오류]', e.message); }

    // 6. 네이버웍스 메시지
    const nwMessage = `📊 일일리포트 (${dateStr})

📢 캠페인 (진행중 ${campaignResult.total.active}개 / 신규 ${campaignResult.total.new}개)
• 🇰🇷 한국: ${campaignResult.byRegion.korea.active}개
• 🇯🇵 일본: ${campaignResult.byRegion.japan.active}개
• 🇺🇸 미국: ${campaignResult.byRegion.us.active}개

👥 신규 회원
• 기업: ${newCompanies}개
• 크리에이터: ${creatorResult.total}명 (🇰🇷${creatorResult.byRegion.korea} / 🇯🇵${creatorResult.byRegion.japan} / 🇺🇸${creatorResult.byRegion.us})

🎬 영상제출: ${videoResult.total.count}건 (제출 ${videoResult.total.submitted} / 완료 ${videoResult.total.completed})
${overdueResult.total > 0 ? `⚠️ 마감 미제출: ${overdueResult.total}명` : '✅ 마감 미제출 없음'}`;

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

    // 7. 이메일
    let emailSent = false;
    try {
      if (process.env.GMAIL_APP_PASSWORD) {
        const emailHtml = `
          <h2>📊 일일 리포트 (${dateStr})</h2>
          ${isManualTest ? '<p style="color:orange">⚠️ 수동 테스트</p>' : ''}
          <h3>📢 캠페인 현황</h3>
          <p>진행중: ${campaignResult.total.active}개 / 신규: ${campaignResult.total.new}개</p>
          <ul>
            <li>🇰🇷 한국: ${campaignResult.byRegion.korea.active}개</li>
            <li>🇯🇵 일본: ${campaignResult.byRegion.japan.active}개</li>
            <li>🇺🇸 미국: ${campaignResult.byRegion.us.active}개</li>
          </ul>
          <h3>👥 신규 회원</h3>
          <p>기업: ${newCompanies}개 / 크리에이터: ${creatorResult.total}명</p>
          <h3>🎬 영상 제출</h3>
          <p>총 ${videoResult.total.count}건 (제출 ${videoResult.total.submitted} / 완료 ${videoResult.total.completed})</p>
          <h3>⚠️ 마감 미제출</h3>
          <p>${overdueResult.total > 0 ? `${overdueResult.total}명` : '없음'}</p>
          <hr>
          <p style="color:gray;font-size:12px">발송: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
        `;
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
        campaigns: campaignResult,
        newCompanies,
        creators: creatorResult,
        videoSubmissions: videoResult,
        overdueCreators: overdueResult,
        emailSent
      })
    };

  } catch (error) {
    console.error('[report-daily] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message, stack: error.stack }) };
  }
};

exports.config = { schedule: '0 1 * * *' };
