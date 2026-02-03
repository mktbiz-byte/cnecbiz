const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * 일일 리포트 - 매일 10시 (KST)
 *
 * 네이버웍스: 간소화 요약
 * 이메일: 상세 리포트
 *
 * 내용:
 * - 신규 크리에이터 가입량 (한국/일본/미국)
 * - 모집 마감일 당일 캠페인
 * - 영상 마감 미제출 (기획형/올영/4주 구분)
 * - 신규 문의 수
 * - 신규 캠페인 수 (한국/일본/미국)
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

// 캠페인 타입 판단
function getCampaignType(campaign) {
  const type = (campaign.campaign_type || '').toLowerCase();
  const title = (campaign.title || '').toLowerCase();

  if (type.includes('4week') || type.includes('challenge') || title.includes('4주') || title.includes('챌린지')) {
    return '4week';
  }
  if (type.includes('olive') || type.includes('올리브') || title.includes('올영') || title.includes('올리브')) {
    return 'oliveyoung';
  }
  return 'standard'; // 기획형
}

// 영상 제출 완료 여부 확인 (수정 요청 상태는 제외)
function isVideoSubmitted(status) {
  // 영상을 제출한 상태들 (수정 요청 포함하면 안됨!)
  return ['video_submitted', 'video_approved', 'completed', 'sns_uploaded', 'final_confirmed'].includes(status);
}

// 중복 실행 방지를 위한 설정
const EXECUTION_KEY = 'report-daily';
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5분 내 중복 실행 방지

exports.handler = async (event) => {
  const executionTime = new Date();
  const isManualTest = event.httpMethod === 'GET' || event.httpMethod === 'POST';
  console.log(`[report-daily] 시작 - ${isManualTest ? '수동' : '자동'}`);

  if (!supabaseBiz) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Supabase BIZ 초기화 실패' })
    };
  }

  // 중복 실행 방지 체크 (수동 테스트는 제외)
  if (!isManualTest) {
    try {
      const { data: lastExec } = await supabaseBiz
        .from('scheduler_executions')
        .select('executed_at')
        .eq('function_name', EXECUTION_KEY)
        .order('executed_at', { ascending: false })
        .limit(1)
        .single();

      if (lastExec) {
        const lastExecTime = new Date(lastExec.executed_at);
        const timeDiff = executionTime.getTime() - lastExecTime.getTime();
        if (timeDiff < DUPLICATE_WINDOW_MS) {
          console.log(`[report-daily] 중복 실행 감지: ${Math.round(timeDiff / 1000)}초 전에 실행됨. 스킵합니다.`);
          return {
            statusCode: 200,
            body: JSON.stringify({ success: true, skipped: true, reason: 'Duplicate execution prevented' })
          };
        }
      }

      // 현재 실행 기록
      await supabaseBiz
        .from('scheduler_executions')
        .upsert({
          function_name: EXECUTION_KEY,
          executed_at: executionTime.toISOString()
        }, { onConflict: 'function_name' });
    } catch (e) {
      console.log('[report-daily] 중복 실행 체크 테이블 없음, 계속 진행:', e.message);
    }
  }

  try {
    const { start, end } = getYesterdayRange();
    const dateStr = `${start.getMonth() + 1}/${start.getDate()}`;
    const todayStr = getTodayDateStr();

    const regionClients = [
      { key: 'korea', client: supabaseKorea, label: '🇰🇷 한국' },
      { key: 'japan', client: supabaseJapan, label: '🇯🇵 일본' },
      { key: 'us', client: supabaseUS, label: '🇺🇸 미국' }
    ];

    // ===== 1. 신규 크리에이터 가입량 (리전별) =====
    console.log('[report-daily] 크리에이터 조회...');
    const creatorResult = { total: 0, byRegion: { korea: 0, japan: 0, us: 0 } };

    for (const r of regionClients) {
      if (!r.client) continue;
      try {
        const { data, error } = await r.client.from('user_profiles').select('id').gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
        if (error) throw error;
        const count = data?.length || 0;
        creatorResult.byRegion[r.key] = count;
        creatorResult.total += count;
      } catch (e) { console.error(`[${r.key} 크리에이터 조회 오류]`, e.message); }
    }

    // ===== 2. 모집 마감일 당일 캠페인 (리전별) =====
    console.log('[report-daily] 모집 마감일 당일 조회...');
    const recruitDeadlineResult = { total: 0, byRegion: { korea: [], japan: [], us: [] } };

    for (const r of regionClients) {
      if (!r.client) continue;
      try {
        // 각 리전 DB에서 모집 마감일(application_deadline)이 오늘인 활성 캠페인 조회
        const { data: campaigns, error } = await r.client
          .from('campaigns')
          .select('id, title, application_deadline')
          .eq('application_deadline', todayStr)
          .in('status', ['active', 'recruiting', 'in_progress', 'approved']);

        if (!error && campaigns) {
          for (const campaign of campaigns) {
            const { data: apps } = await r.client
              .from('applications')
              .select('id')
              .eq('campaign_id', campaign.id);

            const count = apps?.length || 0;
            if (count > 0) {
              recruitDeadlineResult.total += count;
              recruitDeadlineResult.byRegion[r.key].push({ title: campaign.title, count });
            }
          }
        }
      } catch (e) { console.error(`[${r.key} 모집 마감 조회 오류]`, e.message); }
    }

    // ===== 3. 영상 마감 미제출 (리전별, 캠페인 타입별) =====
    console.log('[report-daily] 영상 마감 미제출 조회...');
    const videoOverdueResult = {
      total: 0,
      byRegion: { korea: [], japan: [], us: [] }
    };

    for (const r of regionClients) {
      if (!r.client) continue;
      try {
        // 활성 캠페인 조회 (모든 마감일 필드 포함)
        const { data: campaigns, error } = await r.client
          .from('campaigns')
          .select('id, title, campaign_type, content_submission_deadline, step1_deadline, step2_deadline, week1_deadline, week2_deadline, week3_deadline, week4_deadline')
          .in('status', ['active', 'in_progress', 'recruiting', 'approved']);

        if (error || !campaigns) continue;

        for (const campaign of campaigns) {
          const type = getCampaignType(campaign);
          const overdueDeadlines = [];

          // 캠페인 타입별 마감일 체크
          if (type === '4week') {
            // 4주 챌린지: week1~4_deadline 각각 체크
            if (campaign.week1_deadline && campaign.week1_deadline < todayStr) overdueDeadlines.push({ field: 'week1', deadline: campaign.week1_deadline });
            if (campaign.week2_deadline && campaign.week2_deadline < todayStr) overdueDeadlines.push({ field: 'week2', deadline: campaign.week2_deadline });
            if (campaign.week3_deadline && campaign.week3_deadline < todayStr) overdueDeadlines.push({ field: 'week3', deadline: campaign.week3_deadline });
            if (campaign.week4_deadline && campaign.week4_deadline < todayStr) overdueDeadlines.push({ field: 'week4', deadline: campaign.week4_deadline });
          } else if (type === 'oliveyoung') {
            // 올리브영: step1, step2 마감일 체크
            if (campaign.step1_deadline && campaign.step1_deadline < todayStr) overdueDeadlines.push({ field: 'step1', deadline: campaign.step1_deadline });
            if (campaign.step2_deadline && campaign.step2_deadline < todayStr) overdueDeadlines.push({ field: 'step2', deadline: campaign.step2_deadline });
          } else {
            // 기획형: content_submission_deadline 체크
            if (campaign.content_submission_deadline && campaign.content_submission_deadline < todayStr) {
              overdueDeadlines.push({ field: 'content', deadline: campaign.content_submission_deadline });
            }
          }

          if (overdueDeadlines.length === 0) continue;

          // 영상 미제출자 조회 (선발된 크리에이터 중 영상 제출 안한 사람)
          // 수정 요청(revision_requested) 상태는 이미 제출한 것이므로 제외!
          const { data: overdueApps } = await r.client
            .from('applications')
            .select('id, status, user_id')
            .eq('campaign_id', campaign.id)
            .in('status', ['selected', 'virtual_selected', 'approved', 'filming', 'guide_confirmation', 'guide_approved']);

          if (overdueApps && overdueApps.length > 0) {
            // 4주/올영의 경우 여러 마감일이 있으므로 마감일별로 카운트
            for (const dl of overdueDeadlines) {
              // 해당 마감일에 대한 영상 제출 여부 확인 필요
              // video_submissions 테이블에서 확인
              let notSubmittedCount = 0;

              if (type === '4week') {
                // 4주 챌린지: video_submissions에서 week 필드로 확인
                for (const app of overdueApps) {
                  const weekNum = parseInt(dl.field.replace('week', ''));
                  const { data: submissions } = await r.client
                    .from('video_submissions')
                    .select('id')
                    .eq('application_id', app.id)
                    .eq('week', weekNum)
                    .not('status', 'eq', 'revision_requested'); // 수정 요청 제외

                  if (!submissions || submissions.length === 0) {
                    notSubmittedCount++;
                  }
                }
              } else if (type === 'oliveyoung') {
                // 올영: video_submissions에서 step 필드로 확인
                for (const app of overdueApps) {
                  const stepNum = parseInt(dl.field.replace('step', ''));
                  const { data: submissions } = await r.client
                    .from('video_submissions')
                    .select('id')
                    .eq('application_id', app.id)
                    .eq('step', stepNum)
                    .not('status', 'eq', 'revision_requested');

                  if (!submissions || submissions.length === 0) {
                    notSubmittedCount++;
                  }
                }
              } else {
                // 기획형: 선발된 상태인데 영상 제출 상태가 아닌 경우
                notSubmittedCount = overdueApps.length;
              }

              if (notSubmittedCount > 0) {
                videoOverdueResult.total += notSubmittedCount;
                videoOverdueResult.byRegion[r.key].push({
                  title: campaign.title,
                  type: type === '4week' ? '4주챌린지' : type === 'oliveyoung' ? '올리브영' : '기획형',
                  deadline: dl.deadline,
                  deadlineType: dl.field,
                  count: notSubmittedCount
                });
              }
            }
          }
        }
      } catch (e) { console.error(`[${r.key} 영상 마감 미제출 조회 오류]`, e.message); }
    }

    // ===== 4. 신규 문의 수 =====
    console.log('[report-daily] 신규 문의 조회...');
    let newInquiryCount = 0;

    try {
      // contact_inquiries 테이블에서 조회
      const { data: inquiries, error } = await supabaseBiz
        .from('contact_inquiries')
        .select('id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (!error && inquiries) {
        newInquiryCount = inquiries.length;
      }
    } catch (e) { console.error('[신규 문의 조회 오류]', e.message); }

    // inquiries 테이블도 체크 (다른 문의 테이블이 있을 수 있음)
    try {
      const { data: inquiries2 } = await supabaseBiz
        .from('inquiries')
        .select('id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (inquiries2) {
        newInquiryCount += inquiries2.length;
      }
    } catch (e) { /* 테이블이 없을 수 있음 */ }

    // ===== 5. 신규 캠페인 수 및 매출 (리전별) =====
    console.log('[report-daily] 신규 캠페인 조회...');
    const campaignResult = {
      total: 0,
      byRegion: { korea: 0, japan: 0, us: 0 },
      revenue: { total: 0, byRegion: { korea: 0, japan: 0, us: 0 } },
      details: []
    };

    for (const r of regionClients) {
      if (!r.client) continue;
      try {
        const { data: campaigns, error } = await r.client
          .from('campaigns')
          .select('id, title, brand, total_budget, reward_points, selected_participants_count, campaign_type')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (!error && campaigns) {
          campaignResult.total += campaigns.length;
          campaignResult.byRegion[r.key] = campaigns.length;

          // 각 캠페인의 매출 계산
          for (const c of campaigns) {
            // 예상 매출 = total_budget 또는 (reward_points * selected_participants_count)
            let revenue = c.total_budget || 0;
            if (!revenue && c.reward_points && c.selected_participants_count) {
              revenue = c.reward_points * c.selected_participants_count;
            }
            campaignResult.revenue.total += revenue;
            campaignResult.revenue.byRegion[r.key] += revenue;

            if (revenue > 0) {
              campaignResult.details.push({
                region: r.key,
                title: c.title || c.brand || '캠페인',
                revenue: revenue
              });
            }
          }
        }
      } catch (e) { console.error(`[${r.key} 신규 캠페인 조회 오류]`, e.message); }
    }

    // ===== 6. 네이버웍스 메시지 =====
    const formatRevenue = (amount) => {
      if (amount >= 10000) return `${Math.round(amount / 10000)}만원`;
      if (amount >= 1000) return `${Math.round(amount / 1000)}천원`;
      return `${amount}원`;
    };

    const nwMessage = `📊 일일 리포트 (${dateStr})

👥 신규 크리에이터: ${creatorResult.total}명
   🇰🇷${creatorResult.byRegion.korea} / 🇯🇵${creatorResult.byRegion.japan} / 🇺🇸${creatorResult.byRegion.us}

📅 모집 마감 당일: ${recruitDeadlineResult.total}명
${videoOverdueResult.total > 0 ? `🚨 영상 마감 미제출: ${videoOverdueResult.total}명` : '✅ 영상 마감 미제출: 0명'}

📩 신규 문의: ${newInquiryCount}건

📢 신규 캠페인: ${campaignResult.total}개
   🇰🇷${campaignResult.byRegion.korea} / 🇯🇵${campaignResult.byRegion.japan} / 🇺🇸${campaignResult.byRegion.us}
${campaignResult.revenue.total > 0 ? `💰 예상 매출: ${formatRevenue(campaignResult.revenue.total)}
   🇰🇷${formatRevenue(campaignResult.revenue.byRegion.korea)} / 🇯🇵${formatRevenue(campaignResult.revenue.byRegion.japan)} / 🇺🇸${formatRevenue(campaignResult.revenue.byRegion.us)}` : ''}`;

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

    // ===== 7. 이메일 상세 리포트 =====
    let emailSent = false;
    try {
      if (process.env.GMAIL_APP_PASSWORD) {
        // 모집 마감 당일 테이블
        let recruitRows = '';
        for (const r of regionClients) {
          const items = recruitDeadlineResult.byRegion[r.key];
          if (items.length > 0) {
            recruitRows += items.map((c, i) =>
              `<tr><td style="padding:6px;border:1px solid #ddd">${r.label}</td><td style="padding:6px;border:1px solid #ddd">${c.title}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${c.count}명</td></tr>`
            ).join('');
          }
        }
        if (!recruitRows) {
          recruitRows = '<tr><td colspan="3" style="padding:6px;border:1px solid #ddd;text-align:center">없음</td></tr>';
        }

        // 영상 마감 미제출 테이블 (리전별, 캠페인 타입별)
        let overdueRows = '';
        for (const r of regionClients) {
          const items = videoOverdueResult.byRegion[r.key];
          if (items.length > 0) {
            overdueRows += items.map(c =>
              `<tr style="background:#fee2e2"><td style="padding:6px;border:1px solid #ddd">${r.label}</td><td style="padding:6px;border:1px solid #ddd">${c.title}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${c.type}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${c.deadlineType}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${c.deadline}</td><td style="padding:6px;border:1px solid #ddd;text-align:center;color:#dc2626;font-weight:bold">${c.count}명</td></tr>`
            ).join('');
          }
        }
        if (!overdueRows) {
          overdueRows = '<tr><td colspan="6" style="padding:6px;border:1px solid #ddd;text-align:center;color:#16a34a">없음 ✅</td></tr>';
        }

        const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px">
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
      <div style="font-size:11px;color:#92400e">📅 모집 마감 당일</div>
      <div style="font-size:24px;font-weight:bold;color:#92400e">${recruitDeadlineResult.total}명</div>
    </div>
    <div style="flex:1;background:${videoOverdueResult.total > 0 ? '#fee2e2' : '#dcfce7'};padding:15px;border-radius:8px;text-align:center;min-width:120px">
      <div style="font-size:11px;color:${videoOverdueResult.total > 0 ? '#dc2626' : '#16a34a'}">🚨 영상 마감 미제출</div>
      <div style="font-size:24px;font-weight:bold;color:${videoOverdueResult.total > 0 ? '#dc2626' : '#16a34a'}">${videoOverdueResult.total}명</div>
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
    ${campaignResult.revenue.total > 0 ? `
    <div style="flex:1;background:#fef9c3;padding:15px;border-radius:8px;text-align:center;min-width:120px">
      <div style="font-size:11px;color:#ca8a04">💰 예상 매출</div>
      <div style="font-size:24px;font-weight:bold;color:#ca8a04">${formatRevenue(campaignResult.revenue.total)}</div>
      <div style="font-size:10px;color:#666">🇰🇷${formatRevenue(campaignResult.revenue.byRegion.korea)} 🇯🇵${formatRevenue(campaignResult.revenue.byRegion.japan)} 🇺🇸${formatRevenue(campaignResult.revenue.byRegion.us)}</div>
    </div>
    ` : ''}
  </div>

  <!-- 모집 마감 당일 상세 -->
  <h3>📅 모집 마감 당일 캠페인 (${recruitDeadlineResult.total}명)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:8px;border:1px solid #ddd;width:80px">지역</th>
        <th style="padding:8px;border:1px solid #ddd">캠페인</th>
        <th style="padding:8px;border:1px solid #ddd;width:80px">인원</th>
      </tr>
    </thead>
    <tbody>${recruitRows}</tbody>
  </table>

  <!-- 영상 마감 미제출 상세 (리전별, 타입별) -->
  <h3 style="color:${videoOverdueResult.total > 0 ? '#dc2626' : '#16a34a'}">🚨 영상 마감 미제출 (${videoOverdueResult.total}명)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead>
      <tr style="background:#fef2f2">
        <th style="padding:8px;border:1px solid #ddd;width:80px">지역</th>
        <th style="padding:8px;border:1px solid #ddd">캠페인</th>
        <th style="padding:8px;border:1px solid #ddd;width:80px">타입</th>
        <th style="padding:8px;border:1px solid #ddd;width:80px">마감</th>
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
        recruitDeadline: recruitDeadlineResult.total,
        videoOverdue: videoOverdueResult.total,
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

// 스케줄은 netlify.toml에서 관리
