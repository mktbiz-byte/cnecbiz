const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * 통합 주간 리포트 - 매주 월요일 10시 (KST)
 *
 * 네이버웍스: 10줄 간소화 요약
 * 이메일: 상세 HTML 리포트
 *
 * 내용:
 * - 매출 현황 (법인별)
 * - 크리에이터 주간 가입량 (한국/미국/일본)
 * - 총 완료된 영상
 * - 크리에이터 출금 신청
 * - 소속 크리에이터 영상 현황
 */

// Supabase 클라이언트 (멀티-리전)
const supabaseBiz = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseKorea = process.env.VITE_SUPABASE_KOREA_URL && process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY)
  : null;
const supabaseJapan = process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY)
  : null;
const supabaseUS = process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY)
  : null;

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
  const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPassword) throw new Error('GMAIL_APP_PASSWORD 없음');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailEmail, pass: gmailPassword.replace(/\s/g, '') }
  });
  await transporter.sendMail({ from: `"CNEC 리포트" <${gmailEmail}>`, to, subject, html });
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

// === 1. 매출 데이터 수집 ===
async function getRevenueData(monday) {
  const result = {
    total: 0,
    byCorporation: { haupapa: 0, haulab: 0, dan: 0 },
    currentMonth: ''
  };

  try {
    const yearMonth = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}`;
    result.currentMonth = yearMonth;

    const { data: revenues } = await supabaseBiz
      .from('revenue_records')
      .select('corporation_id, amount')
      .eq('year_month', yearMonth);

    if (revenues && revenues.length > 0) {
      for (const r of revenues) {
        const amount = parseFloat(r.amount) || 0;
        const corpId = (r.corporation_id || '').toLowerCase();

        if (corpId === 'haupapa' || corpId === '하우파파') {
          result.byCorporation.haupapa += amount;
        } else if (corpId === 'haulab' || corpId === '하우랩') {
          result.byCorporation.haulab += amount;
        } else if (corpId === 'dan' || corpId === '단') {
          result.byCorporation.dan += amount;
        }
        result.total += amount;
      }
    }
  } catch (error) {
    console.error('[매출 조회 오류]', error.message);
  }

  return result;
}

// === 2. 신규 크리에이터 가입량 (리전별) ===
async function getNewCreators(monday, sunday) {
  const result = { total: 0, byRegion: { korea: 0, japan: 0, us: 0 } };

  const regions = [
    { key: 'korea', client: supabaseKorea, name: '한국' },
    { key: 'japan', client: supabaseJapan, name: '일본' },
    { key: 'us', client: supabaseUS, name: '미국' }
  ];

  for (const region of regions) {
    if (!region.client) continue;
    try {
      const { data: creators } = await region.client
        .from('user_profiles')
        .select('id')
        .gte('created_at', monday.toISOString())
        .lte('created_at', sunday.toISOString());

      const count = creators?.length || 0;
      result.byRegion[region.key] = count;
      result.total += count;
    } catch (error) {
      console.error(`[${region.name}] 신규 크리에이터 조회 오류:`, error.message);
    }
  }

  return result;
}

// === 3. 완료된 영상 수 ===
async function getCompletedVideos(monday, sunday) {
  const result = { total: 0, list: [] };

  try {
    const { data: videos, error } = await supabaseBiz
      .from('applications')
      .select('id, campaign_id, status, updated_at')
      .in('status', ['completed', 'sns_uploaded'])
      .gte('updated_at', monday.toISOString())
      .lte('updated_at', sunday.toISOString());

    if (!error && videos) {
      result.total = videos.length;

      // 캠페인별 집계
      const campaignIds = [...new Set(videos.map(v => v.campaign_id).filter(Boolean))];
      if (campaignIds.length > 0) {
        const { data: campaigns } = await supabaseBiz
          .from('campaigns')
          .select('id, title')
          .in('id', campaignIds);

        const campaignMap = new Map((campaigns || []).map(c => [c.id, c.title]));

        const countByCampaign = {};
        videos.forEach(v => {
          const title = campaignMap.get(v.campaign_id) || '기타';
          countByCampaign[title] = (countByCampaign[title] || 0) + 1;
        });

        result.list = Object.entries(countByCampaign)
          .map(([title, count]) => ({ title, count }))
          .sort((a, b) => b.count - a.count);
      }
    }
  } catch (e) { console.error('[완료 영상 조회 오류]', e.message); }

  return result;
}

// === 4. 출금 신청 현황 ===
async function getWithdrawalData(monday, sunday) {
  const allWithdrawals = [];
  const existingIds = new Set();

  // BIZ DB - creator_withdrawal_requests
  try {
    const { data: bizWithdrawals } = await supabaseBiz
      .from('creator_withdrawal_requests')
      .select('id, amount, requested_amount, status, created_at')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString());

    (bizWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({ amount: w.requested_amount || w.amount || 0, status: w.status });
      }
    });
  } catch (e) { console.error('BIZ 출금 조회 오류:', e.message); }

  // BIZ DB - withdrawal_requests
  try {
    const { data: wrWithdrawals } = await supabaseBiz
      .from('withdrawal_requests')
      .select('id, amount, status, created_at')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString());

    (wrWithdrawals || []).forEach(w => {
      if (!existingIds.has(w.id)) {
        existingIds.add(w.id);
        allWithdrawals.push({ amount: w.amount || 0, status: w.status });
      }
    });
  } catch (e) { console.error('WR 출금 조회 오류:', e.message); }

  // Korea DB - withdrawals
  if (supabaseKorea) {
    try {
      const { data: koreaWithdrawals } = await supabaseKorea
        .from('withdrawals')
        .select('id, amount, status, created_at')
        .gte('created_at', monday.toISOString())
        .lte('created_at', sunday.toISOString());

      (koreaWithdrawals || []).forEach(w => {
        if (!existingIds.has(w.id)) {
          existingIds.add(w.id);
          allWithdrawals.push({ amount: w.amount || 0, status: w.status });
        }
      });
    } catch (e) { console.error('Korea 출금 조회 오류:', e.message); }
  }

  const totalAmount = allWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
  const pendingCount = allWithdrawals.filter(w => w.status === 'pending').length;
  const completedCount = allWithdrawals.filter(w => ['approved', 'completed'].includes(w.status)).length;

  return {
    count: allWithdrawals.length,
    totalAmount,
    netAmount: Math.round(totalAmount * 0.967),
    pendingCount,
    completedCount
  };
}

// === 5. 소속 크리에이터 현황 ===
async function getAffiliatedCreatorStats() {
  const { data: creators } = await supabaseBiz
    .from('affiliated_creators')
    .select('*')
    .order('created_at', { ascending: false });

  if (!creators || creators.length === 0) return { creators: [], stats: [], alerts: [] };

  const stats = [];
  const alerts = [];

  for (const creator of creators) {
    let channelId = creator.platform_id;
    if (!channelId && creator.platform_url) {
      const channelMatch = creator.platform_url.match(/channel\/([a-zA-Z0-9_-]+)/);
      if (channelMatch) channelId = channelMatch[1];
    }

    if (!channelId || !YOUTUBE_API_KEY) {
      stats.push({
        name: creator.creator_name,
        status: 'no_channel',
        weeklyUploads: 0,
        avgViews: 0,
        subscriberCount: creator.subscriber_count || 0,
        daysSinceUpload: null
      });
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

      stats.push({ name: creator.creator_name, status: 'active', weeklyUploads, avgViews, subscriberCount, daysSinceUpload });

      // 알림
      if (daysSinceUpload >= 4) {
        alerts.push({ type: 'stopped', name: creator.creator_name, detail: `${daysSinceUpload}일간 업로드 없음` });
      }

      // DB 업데이트
      await supabaseBiz.from('affiliated_creators').update({
        subscriber_count: subscriberCount,
        last_checked_at: new Date().toISOString()
      }).eq('id', creator.id);

      await new Promise(resolve => setTimeout(resolve, 500)); // API 제한 방지
    } catch (e) {
      console.error(`크리에이터 ${creator.creator_name} 분석 오류:`, e.message);
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

    // 1. 매출 데이터
    console.log('[주간리포트] 매출 데이터 수집...');
    const revenue = await getRevenueData(monday);

    // 2. 신규 크리에이터
    console.log('[주간리포트] 신규 크리에이터 수집...');
    const creators = await getNewCreators(monday, sunday);

    // 3. 완료된 영상
    console.log('[주간리포트] 완료 영상 수집...');
    const completedVideos = await getCompletedVideos(monday, sunday);

    // 4. 출금 데이터
    console.log('[주간리포트] 출금 데이터 수집...');
    const withdrawals = await getWithdrawalData(monday, sunday);

    // 5. 소속 크리에이터 현황
    console.log('[주간리포트] 소속 크리에이터 수집...');
    const affiliated = await getAffiliatedCreatorStats();
    const activeStats = affiliated.stats.filter(s => s.status === 'active');
    const totalUploads = activeStats.reduce((sum, s) => sum + s.weeklyUploads, 0);
    const stoppedCount = affiliated.alerts.filter(a => a.type === 'stopped').length;
    const avgViews = activeStats.length > 0 ? Math.round(activeStats.reduce((sum, s) => sum + s.avgViews, 0) / activeStats.length) : 0;

    // 6. 네이버웍스 메시지 (10줄 간소화)
    const nwMessage = `📋 주간리포트 (${startStr}~${endStr})

💰 ${revenue.currentMonth} 매출: ${formatNumber(revenue.total)}원

👥 신규 크리에이터: ${creators.total}명
   🇰🇷${creators.byRegion.korea} / 🇯🇵${creators.byRegion.japan} / 🇺🇸${creators.byRegion.us}

🎬 완료된 영상: ${completedVideos.total}건

💵 출금 신청: ${withdrawals.count}건 (${formatNumber(withdrawals.totalAmount)}원)

📺 소속 크리에이터 (${affiliated.creators.length}명)
   주간 업로드: ${totalUploads}건 / 평균 ${formatK(avgViews)}회
   ${stoppedCount > 0 ? `⚠️ 업로드중단: ${stoppedCount}명` : '✅ 전원 활동중'}`;

    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

    if (clientId && clientSecret && botId && channelId) {
      const accessToken = await getAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
      await sendNaverWorksMessage(accessToken, botId, channelId, nwMessage);
      console.log('[주간리포트] 네이버웍스 발송 완료');
    }

    // 7. 이메일 상세 리포트
    const completedVideoRows = completedVideos.list.map((c, i) =>
      `<tr><td style="padding:6px;border:1px solid #ddd">${i + 1}</td><td style="padding:6px;border:1px solid #ddd">${c.title}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${c.count}건</td></tr>`
    ).join('') || '<tr><td colspan="3" style="padding:6px;border:1px solid #ddd;text-align:center">없음</td></tr>';

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

    const alertsHtml = affiliated.alerts.length > 0
      ? affiliated.alerts.map(a => `<li style="color:#dc2626">${a.name}: ${a.detail}</li>`).join('')
      : '<li style="color:#16a34a">특이사항 없음</li>';

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px">
  <h2 style="border-bottom:2px solid #333;padding-bottom:10px">📋 주간 리포트 (${startStr} ~ ${endStr})</h2>
  ${isManualTest ? '<p style="color:#f59e0b">⚠️ 수동 테스트</p>' : ''}

  <!-- 요약 카드 -->
  <div style="display:flex;gap:10px;margin:20px 0;flex-wrap:wrap">
    <div style="flex:1;background:#dcfce7;padding:15px;border-radius:8px;text-align:center;min-width:140px">
      <div style="font-size:11px;color:#166534">💰 ${revenue.currentMonth} 매출</div>
      <div style="font-size:20px;font-weight:bold;color:#166534">${formatNumber(revenue.total)}원</div>
    </div>
    <div style="flex:1;background:#dbeafe;padding:15px;border-radius:8px;text-align:center;min-width:140px">
      <div style="font-size:11px;color:#1e40af">👥 신규 크리에이터</div>
      <div style="font-size:20px;font-weight:bold;color:#1e40af">${creators.total}명</div>
      <div style="font-size:10px;color:#666">🇰🇷${creators.byRegion.korea} 🇯🇵${creators.byRegion.japan} 🇺🇸${creators.byRegion.us}</div>
    </div>
    <div style="flex:1;background:#f3e8ff;padding:15px;border-radius:8px;text-align:center;min-width:140px">
      <div style="font-size:11px;color:#7c3aed">🎬 완료된 영상</div>
      <div style="font-size:20px;font-weight:bold;color:#7c3aed">${completedVideos.total}건</div>
    </div>
    <div style="flex:1;background:#fef3c7;padding:15px;border-radius:8px;text-align:center;min-width:140px">
      <div style="font-size:11px;color:#92400e">💵 출금 신청</div>
      <div style="font-size:20px;font-weight:bold;color:#92400e">${withdrawals.count}건</div>
      <div style="font-size:10px;color:#666">${formatNumber(withdrawals.totalAmount)}원</div>
    </div>
    <div style="flex:1;background:#e0e7ff;padding:15px;border-radius:8px;text-align:center;min-width:140px">
      <div style="font-size:11px;color:#4338ca">📺 소속 크리에이터</div>
      <div style="font-size:20px;font-weight:bold;color:#4338ca">${affiliated.creators.length}명</div>
      <div style="font-size:10px;color:#666">업로드 ${totalUploads}건</div>
    </div>
  </div>

  <!-- 매출 상세 -->
  <h3>💰 ${revenue.currentMonth} 매출 상세</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:8px;border:1px solid #ddd">법인</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:right">금액</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:8px;border:1px solid #ddd">🔵 하우파파</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${formatNumber(revenue.byCorporation.haupapa)}원</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd">🟢 하우랩</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${formatNumber(revenue.byCorporation.haulab)}원</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd">🟡 단</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${formatNumber(revenue.byCorporation.dan)}원</td></tr>
      <tr style="background:#f8fafc;font-weight:bold"><td style="padding:8px;border:1px solid #ddd">합계</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${formatNumber(revenue.total)}원</td></tr>
    </tbody>
  </table>

  <!-- 완료된 영상 상세 -->
  <h3>🎬 완료된 영상 (${completedVideos.total}건)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:8px;border:1px solid #ddd;width:40px">No</th>
        <th style="padding:8px;border:1px solid #ddd">캠페인</th>
        <th style="padding:8px;border:1px solid #ddd;width:80px">완료</th>
      </tr>
    </thead>
    <tbody>${completedVideoRows}</tbody>
  </table>

  <!-- 출금 현황 -->
  <h3>💵 출금 신청 현황</h3>
  <div style="background:#fef3c7;padding:15px;border-radius:8px;margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div><strong>총 ${withdrawals.count}건</strong> / ${formatNumber(withdrawals.totalAmount)}원</div>
      <div>대기 <strong>${withdrawals.pendingCount}</strong>건 | 완료 <strong>${withdrawals.completedCount}</strong>건</div>
      <div>실지급액: <strong>${formatNumber(withdrawals.netAmount)}원</strong> (3.3% 세금 공제)</div>
    </div>
  </div>

  <!-- 소속 크리에이터 현황 -->
  <h3>📺 소속 크리에이터 현황</h3>
  ${activeStats.length > 0 ? `
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
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

  <h3>⚠️ 주의사항</h3>
  <ul>${alertsHtml}</ul>

  <p style="color:#999;font-size:11px;margin-top:40px;text-align:center">
    발송: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | CNEC 자동 리포트
  </p>
</body></html>`;

    // 이메일 발송
    let emailSent = false;
    try {
      if (process.env.GMAIL_APP_PASSWORD) {
        await sendEmail('mkt@howlab.co.kr', `[CNEC] 주간 리포트 (${startStr}~${endStr})`, emailHtml);
        emailSent = true;
        console.log('[주간리포트] 이메일 발송 완료');
      } else {
        console.log('[주간리포트] GMAIL_APP_PASSWORD 없음 - 이메일 발송 생략');
      }
    } catch (emailErr) {
      console.error('[주간리포트] 이메일 발송 실패:', emailErr.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        period: `${startStr}~${endStr}`,
        month: revenue.currentMonth,
        revenue: { total: revenue.total, byCorporation: revenue.byCorporation },
        creators: creators,
        completedVideos: completedVideos.total,
        withdrawals: { count: withdrawals.count, amount: withdrawals.totalAmount },
        affiliatedCreators: affiliated.creators.length,
        uploads: totalUploads,
        emailSent
      })
    };

  } catch (error) {
    console.error('[주간리포트] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// 스케줄은 netlify.toml에서 관리 (중복 실행 방지)
// exports.config = { schedule: '0 1 * * 1' };
