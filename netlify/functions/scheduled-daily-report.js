const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 통합 일일 리포트 - 매일 10시 (KST)
 * - 캠페인 현황 (국가별: 한국/일본/미국)
 * - 신규 회원
 * - 영상 제출 현황 (applications 테이블 기반)
 * - 마감 예정일 영상 미제출 크리에이터
 *
 * 네이버웍스: 5~10줄 요약
 * 이메일: 상세 HTML 리포트 (mkt@howlab.co.kr)
 */

// Supabase 클라이언트 (멀티-리전)
let supabaseBiz = null;
let supabaseKorea = null;
let supabaseJapan = null;
let supabaseUS = null;

try {
  if (process.env.VITE_SUPABASE_BIZ_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseBiz = createClient(process.env.VITE_SUPABASE_BIZ_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  if (process.env.VITE_SUPABASE_KOREA_URL && process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY) {
    supabaseKorea = createClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY);
  }
  if (process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY) {
    supabaseJapan = createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY);
  }
  if (process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY) {
    supabaseUS = createClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY);
  }
} catch (e) {
  console.error('[일일리포트] Supabase 클라이언트 생성 오류:', e.message);
}

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

function getTodayDateStr() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = String(kstNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 국가별 캠페인 데이터 수집
async function getCampaignsByRegion(start, end) {
  const regions = {
    biz: { client: supabaseBiz, name: 'BIZ(통합)', data: { active: [], new: [] } }
  };

  // 추가 리전 (환경변수가 있는 경우만)
  if (supabaseKorea) regions.korea = { client: supabaseKorea, name: '한국', data: { active: [], new: [] } };
  if (supabaseJapan) regions.japan = { client: supabaseJapan, name: '일본', data: { active: [], new: [] } };
  if (supabaseUS) regions.us = { client: supabaseUS, name: '미국', data: { active: [], new: [] } };

  for (const [key, region] of Object.entries(regions)) {
    if (!region.client) continue;

    try {
      // 진행중 캠페인
      const { data: activeCampaigns } = await region.client
        .from('campaigns')
        .select('id, title, status, company_id, created_at')
        .in('status', ['active', 'recruiting', 'in_progress']);

      region.data.active = activeCampaigns || [];

      // 신규 캠페인 (어제)
      const { data: newCampaigns } = await region.client
        .from('campaigns')
        .select('id, title, status, company_id, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      region.data.new = newCampaigns || [];
    } catch (error) {
      console.error(`[${region.name}] 캠페인 조회 오류:`, error.message);
    }
  }

  return regions;
}

// 국가별 신규 기업 데이터 수집
async function getNewCompaniesByRegion(start, end) {
  const regions = {
    biz: { client: supabaseBiz, name: 'BIZ(통합)', data: [] }
  };

  if (supabaseKorea) regions.korea = { client: supabaseKorea, name: '한국', data: [] };
  if (supabaseJapan) regions.japan = { client: supabaseJapan, name: '일본', data: [] };
  if (supabaseUS) regions.us = { client: supabaseUS, name: '미국', data: [] };

  for (const [key, region] of Object.entries(regions)) {
    if (!region.client) continue;

    try {
      const { data: companies } = await region.client
        .from('companies')
        .select('id, company_name, email, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      region.data = companies || [];
    } catch (error) {
      console.error(`[${region.name}] 기업 조회 오류:`, error.message);
    }
  }

  return regions;
}

// 영상 제출 현황 (applications 테이블에서 video_submitted 상태 조회)
async function getVideoSubmissionsByRegion(start, end) {
  const regions = {
    biz: { client: supabaseBiz, name: 'BIZ(통합)', data: [] }
  };

  if (supabaseKorea) regions.korea = { client: supabaseKorea, name: '한국', data: [] };
  if (supabaseJapan) regions.japan = { client: supabaseJapan, name: '일본', data: [] };
  if (supabaseUS) regions.us = { client: supabaseUS, name: '미국', data: [] };

  const videoStatuses = ['video_submitted', 'revision_requested', 'completed', 'sns_uploaded'];

  for (const [key, region] of Object.entries(regions)) {
    if (!region.client) continue;

    try {
      // 어제 영상 제출된 applications
      const { data: submissions } = await region.client
        .from('applications')
        .select('id, name, email, status, campaign_id, updated_at, created_at')
        .in('status', videoStatuses)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString())
        .order('updated_at', { ascending: false });

      // 캠페인 정보 가져오기
      if (submissions && submissions.length > 0) {
        const campaignIds = [...new Set(submissions.map(s => s.campaign_id).filter(Boolean))];
        const { data: campaigns } = await region.client
          .from('campaigns')
          .select('id, title')
          .in('id', campaignIds);

        const campaignMap = new Map((campaigns || []).map(c => [c.id, c.title]));

        region.data = submissions.map(s => ({
          ...s,
          campaign_title: campaignMap.get(s.campaign_id) || '-',
          region: region.name
        }));
      }
    } catch (error) {
      console.error(`[${region.name}] 영상 제출 조회 오류:`, error.message);
    }
  }

  return regions;
}

// 마감 예정일인데 영상 미제출 크리에이터 조회
async function getOverdueCreators() {
  const todayStr = getTodayDateStr();
  const results = [];

  const regions = {
    biz: { client: supabaseBiz, name: 'BIZ(통합)' }
  };

  if (supabaseKorea) regions.korea = { client: supabaseKorea, name: '한국' };

  // 영상 미제출 상태들 (선정되었지만 아직 영상 제출 안함)
  const notSubmittedStatuses = ['selected', 'virtual_selected', 'approved', 'filming', 'guide_confirmation'];

  for (const [key, region] of Object.entries(regions)) {
    if (!region.client) continue;

    try {
      // 오늘이 마감일인 캠페인 조회
      const { data: campaigns } = await region.client
        .from('campaigns')
        .select('id, title, content_submission_deadline, company_id')
        .eq('content_submission_deadline', todayStr)
        .in('status', ['active', 'in_progress', 'recruiting']);

      if (!campaigns || campaigns.length === 0) continue;

      for (const campaign of campaigns) {
        // 해당 캠페인에서 선정되었지만 영상 미제출인 크리에이터
        const { data: overdueApps } = await region.client
          .from('applications')
          .select('id, name, email, phone, status, campaign_id')
          .eq('campaign_id', campaign.id)
          .in('status', notSubmittedStatuses);

        if (overdueApps && overdueApps.length > 0) {
          results.push({
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            deadline: campaign.content_submission_deadline,
            region: region.name,
            creators: overdueApps.map(a => ({
              name: a.name || '이름없음',
              email: a.email,
              status: a.status
            }))
          });
        }
      }
    } catch (error) {
      console.error(`[${region.name}] 마감 미제출 조회 오류:`, error.message);
    }
  }

  return results;
}

exports.handler = async (event) => {
  const isManualTest = event.httpMethod === 'GET' || event.httpMethod === 'POST';
  console.log(`[일일리포트] 시작 - ${isManualTest ? '수동' : '자동'}`);

  // 환경변수 체크
  if (!supabaseBiz) {
    console.error('[일일리포트] VITE_SUPABASE_BIZ_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수 없음');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '환경변수 설정 오류: VITE_SUPABASE_BIZ_URL 또는 SUPABASE_SERVICE_ROLE_KEY 없음' })
    };
  }

  try {
    const { start, end } = getYesterdayRange();
    const dateStr = `${start.getMonth() + 1}/${start.getDate()}`;

    // 1. 국가별 캠페인 현황
    console.log('[일일리포트] 캠페인 데이터 수집...');
    const campaignsByRegion = await getCampaignsByRegion(start, end);

    // 2. 국가별 신규 기업
    console.log('[일일리포트] 회원 데이터 수집...');
    const companiesByRegion = await getNewCompaniesByRegion(start, end);

    // 3. 영상 제출 현황 (applications 기반)
    console.log('[일일리포트] 영상 제출 데이터 수집...');
    const videosByRegion = await getVideoSubmissionsByRegion(start, end);

    // 4. 마감 예정일 영상 미제출 크리에이터
    console.log('[일일리포트] 마감 미제출 크리에이터 수집...');
    const overdueCreators = await getOverdueCreators();

    // 집계
    const totalActiveCampaigns = Object.values(campaignsByRegion).reduce((sum, r) => sum + r.data.active.length, 0);
    const totalNewCampaigns = Object.values(campaignsByRegion).reduce((sum, r) => sum + r.data.new.length, 0);
    const totalNewCompanies = Object.values(companiesByRegion).reduce((sum, r) => sum + r.data.length, 0);
    const allVideoSubmissions = Object.values(videosByRegion).flatMap(r => r.data);
    const totalOverdue = overdueCreators.reduce((sum, c) => sum + c.creators.length, 0);

    // 5. 네이버웍스 메시지
    let regionSummary = '';
    for (const [key, region] of Object.entries(campaignsByRegion)) {
      if (region.client && (region.data.active.length > 0 || region.data.new.length > 0)) {
        regionSummary += `  ${region.name}: 진행 ${region.data.active.length}개`;
        if (region.data.new.length > 0) regionSummary += ` (신규 ${region.data.new.length})`;
        regionSummary += '\n';
      }
    }

    const nwMessage = `📊 일일리포트 (${dateStr})

📢 캠페인 (총 ${totalActiveCampaigns}개)
${regionSummary || '  데이터 없음\n'}
👥 신규 기업: ${totalNewCompanies}개

🎬 영상제출: ${allVideoSubmissions.length}건
${totalOverdue > 0 ? `⚠️ 마감 미제출: ${totalOverdue}명` : '✅ 마감 미제출 없음'}`;

    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

    if (clientId && clientSecret && botId && channelId) {
      const accessToken = await getAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
      await sendNaverWorksMessage(accessToken, botId, channelId, nwMessage);
      console.log('[일일리포트] 네이버웍스 발송 완료');
    }

    // 6. 이메일 상세 리포트
    // 국가별 캠페인 섹션
    let campaignHtml = '';
    for (const [key, region] of Object.entries(campaignsByRegion)) {
      if (!region.client) continue;
      campaignHtml += `
        <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center;min-width:120px">
          <div style="font-size:12px;color:#666">${region.name}</div>
          <div style="font-size:20px;font-weight:bold">${region.data.active.length}개</div>
          <div style="font-size:14px;color:#2563eb">신규 ${region.data.new.length}개</div>
        </div>`;
    }

    // 영상 제출 테이블
    const videoRows = allVideoSubmissions.map((v, i) => `<tr>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:6px;border:1px solid #ddd">${v.region}</td>
      <td style="padding:6px;border:1px solid #ddd">${v.campaign_title}</td>
      <td style="padding:6px;border:1px solid #ddd">${v.name || '-'}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${
        v.status === 'completed' ? '✅ 완료' :
        v.status === 'video_submitted' ? '📤 제출' :
        v.status === 'revision_requested' ? '🔄 수정요청' :
        v.status === 'sns_uploaded' ? '📱 SNS업로드' : v.status
      }</td>
      <td style="padding:6px;border:1px solid #ddd">${new Date(v.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
    </tr>`).join('');

    // 마감 미제출 섹션
    let overdueHtml = '';
    if (overdueCreators.length > 0) {
      overdueHtml = overdueCreators.map(campaign => `
        <div style="margin-bottom:15px;padding:10px;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626">
          <strong>🚨 ${campaign.campaign_title}</strong> (마감: ${campaign.deadline})
          <div style="font-size:12px;color:#666;margin-top:5px">${campaign.region}</div>
          <ul style="margin:5px 0;padding-left:20px">
            ${campaign.creators.map(c => `<li>${c.name} (${c.status})</li>`).join('')}
          </ul>
        </div>
      `).join('');
    } else {
      overdueHtml = '<p style="color:#16a34a">✅ 오늘 마감인 캠페인 중 미제출 크리에이터가 없습니다.</p>';
    }

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px">
  <h2 style="border-bottom:2px solid #333;padding-bottom:10px">📊 일일 리포트 (${dateStr})</h2>
  ${isManualTest ? '<p style="color:#f59e0b">⚠️ 수동 테스트</p>' : ''}

  <h3>📢 국가별 캠페인 현황</h3>
  <div style="display:flex;gap:15px;margin:20px 0;flex-wrap:wrap">
    ${campaignHtml}
  </div>

  <h3>👥 신규 기업</h3>
  <div style="display:flex;gap:15px;margin:20px 0;flex-wrap:wrap">
    ${Object.entries(companiesByRegion).filter(([k, r]) => r.client).map(([k, r]) => `
      <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:8px;text-align:center;min-width:120px">
        <div style="font-size:12px;color:#666">${r.name}</div>
        <div style="font-size:20px;font-weight:bold">${r.data.length}개</div>
      </div>
    `).join('')}
  </div>

  <h3>🎬 영상 제출 내역 (${allVideoSubmissions.length}건)</h3>
  ${allVideoSubmissions.length > 0 ? `
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#f1f5f9">
      <th style="padding:8px;border:1px solid #ddd">No</th>
      <th style="padding:8px;border:1px solid #ddd">지역</th>
      <th style="padding:8px;border:1px solid #ddd">캠페인</th>
      <th style="padding:8px;border:1px solid #ddd">크리에이터</th>
      <th style="padding:8px;border:1px solid #ddd">상태</th>
      <th style="padding:8px;border:1px solid #ddd">시간</th>
    </tr></thead>
    <tbody>${videoRows}</tbody>
  </table>` : '<p style="color:#666">어제 영상 제출 없음</p>'}

  <h3 style="margin-top:30px">🚨 마감 예정일 영상 미제출 (${totalOverdue}명)</h3>
  ${overdueHtml}

  <p style="color:#999;font-size:11px;margin-top:40px;text-align:center">
    발송: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | CNEC 자동 리포트
  </p>
</body></html>`;

    let emailSent = false;
    try {
      if (process.env.GMAIL_APP_PASSWORD) {
        await sendEmail('mkt@howlab.co.kr', `[CNEC] 일일 리포트 (${dateStr})`, emailHtml);
        emailSent = true;
        console.log('[일일리포트] 이메일 발송 완료');
      } else {
        console.log('[일일리포트] GMAIL_APP_PASSWORD 없음 - 이메일 발송 생략');
      }
    } catch (emailErr) {
      console.error('[일일리포트] 이메일 발송 실패:', emailErr.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: dateStr,
        campaigns: { total: totalActiveCampaigns, new: totalNewCampaigns },
        newCompanies: totalNewCompanies,
        videoSubmissions: allVideoSubmissions.length,
        overdueCreators: totalOverdue,
        emailSent
      })
    };

  } catch (error) {
    console.error('[일일리포트] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

exports.config = { schedule: '0 1 * * *' };
