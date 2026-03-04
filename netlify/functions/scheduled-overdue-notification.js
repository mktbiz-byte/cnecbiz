/**
 * 매일 오전 10시(한국시간) 실행 - 영상 제출 지연 알림
 * Netlify Scheduled Function
 *
 * 마감일을 넘긴 크리에이터에게 알림톡 + 이메일 발송
 * 템플릿: 025100001021 (캠페인 제출 기한 지연)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 네이버 웍스 Private Key
const NAVER_WORKS_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
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

function generateNaverWorksJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600, scope: 'bot' };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), NAVER_WORKS_PRIVATE_KEY);
  return `${signatureInput}.${signature.toString('base64url')}`;
}

async function getNaverWorksAccessToken(clientId, clientSecret, serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwt = generateNaverWorksJWT(clientId, serviceAccount);
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

// 지연 일수 계산
const calculateOverdueDays = (deadlineStr) => {
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const today = new Date(koreaTime);
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - deadline.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// 카카오톡 알림 발송 (send-kakao-notification 함수를 HTTP로 호출하여 템플릿 일원화)
const sendKakaoNotification = async (receiverNum, receiverName, campaignName, deadline, overdueDays) => {
  const baseUrl = process.env.URL || 'https://cnecbiz.com';
  const templateCode = '025100001021';

  const res = await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiverNum: receiverNum.replace(/-/g, ''),
      receiverName: receiverName || '',
      templateCode,
      variables: {
        '크리에이터명': receiverName,
        '캠페인명': campaignName,
        '제출기한': deadline
      }
    })
  });

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || `지연 알림톡 발송 실패 (${templateCode})`);
  }

  console.log(`지연 알림톡 발송 성공: ${receiverNum}`, result.receiptNum);
  return result;
};

// 지연 경고 이메일 발송
const sendOverdueEmail = async (to, creatorName, campaignName, deadline, overdueDays) => {
  const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPassword) return { success: false, reason: 'GMAIL_APP_PASSWORD 미설정' };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailEmail, pass: gmailPassword.replace(/\s/g, '') }
  });

  // 지연 일수에 따른 패널티 계산
  let penaltyText = '';
  let penaltyPercent = 0;
  if (overdueDays >= 5) {
    penaltyText = '캠페인 취소 및 제품값 배상';
    penaltyPercent = 100;
  } else if (overdueDays >= 3) {
    penaltyText = '보상금의 30% 차감';
    penaltyPercent = 30;
  } else if (overdueDays >= 1) {
    penaltyText = '보상금의 10% 차감';
    penaltyPercent = 10;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning-banner { background: #dc2626; color: white; padding: 25px; border-radius: 10px; margin: 20px 0; text-align: center; }
    .warning-banner h2 { margin: 0 0 10px 0; font-size: 24px; }
    .warning-banner p { margin: 0; font-size: 18px; }
    .mega-warning { background: #fbbf24; color: #000; padding: 30px; border-radius: 10px; margin: 25px 0; border: 5px solid #dc2626; }
    .mega-warning h2 { margin: 0 0 15px 0; font-size: 26px; color: #dc2626; text-align: center; }
    .mega-warning p { margin: 10px 0; font-size: 18px; text-align: center; }
    .mega-warning .kakao-icon { font-size: 40px; margin: 10px 0; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #dc2626; }
    .penalty-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .penalty-table th, .penalty-table td { padding: 12px; border: 1px solid #ddd; text-align: left; }
    .penalty-table th { background: #fee2e2; }
    .penalty-table tr.current { background: #fef08a; font-weight: bold; }
    .deadline { font-size: 32px; font-weight: bold; color: #dc2626; }
    .overdue { font-size: 40px; font-weight: bold; color: #dc2626; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-size: 18px; font-weight: bold; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 영상 제출 기한 지연 경고</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px;"><strong>${creatorName}</strong>님, 안녕하세요.</p>

      <div class="warning-banner">
        <h2>⚠️ 영상 제출이 <span class="overdue">${overdueDays}일</span> 지연되었습니다!</h2>
        <p>현재 적용 예정 패널티: <strong>${penaltyText}</strong></p>
      </div>

      <div class="info-box">
        <p><strong>캠페인:</strong> ${campaignName}</p>
        <p><strong>원래 제출 기한:</strong> <span class="deadline">${deadline}</span></p>
        <p><strong>현재 지연:</strong> <span style="color: #dc2626; font-weight: bold;">${overdueDays}일</span></p>
      </div>

      <h3>📋 패널티 기준</h3>
      <table class="penalty-table">
        <thead>
          <tr>
            <th>지연 기간</th>
            <th>패널티</th>
          </tr>
        </thead>
        <tbody>
          <tr ${overdueDays >= 1 && overdueDays < 3 ? 'class="current"' : ''}>
            <td>1일 지연</td>
            <td>보상금의 10% 차감</td>
          </tr>
          <tr ${overdueDays >= 3 && overdueDays < 5 ? 'class="current"' : ''}>
            <td>3일 지연</td>
            <td>보상금의 30% 차감</td>
          </tr>
          <tr ${overdueDays >= 5 ? 'class="current"' : ''}>
            <td>5일 지연</td>
            <td>🚫 캠페인 취소 및 제품값 배상</td>
          </tr>
        </tbody>
      </table>

      <!-- 강력한 경고 박스 -->
      <div class="mega-warning">
        <h2>⚠️⚠️⚠️ 중요 공지 ⚠️⚠️⚠️</h2>
        <div class="kakao-icon">💬</div>
        <p><strong style="font-size: 22px;">기간 연장이 필요하신 경우</strong></p>
        <p style="font-size: 20px; color: #dc2626;"><strong>반드시 관리자에게 카카오톡으로<br>기간 연장 요청을 보내주세요!</strong></p>
        <p style="margin-top: 15px;">카카오톡 문의: <strong>@크넥</strong> 또는 <strong>1833-6025</strong></p>
        <p style="font-size: 16px; margin-top: 15px; color: #666;">
          ※ 사전 연락 없이 지연될 경우<br>
          <strong style="color: #dc2626;">패널티가 자동 적용됩니다!</strong>
        </p>
      </div>

      <p style="text-align: center;">
        <a href="https://cnec.co.kr/creator/campaigns" class="button">지금 바로 영상 제출하기 →</a>
      </p>

      <div class="footer">
        <p>문의: 1833-6025 | mkt_biz@cnec.co.kr | 카카오톡: @크넥</p>
        <p>© CNEC. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"CNEC 경고" <${gmailEmail}>`,
      to,
      subject: `🚨 [CNEC] 영상 제출 ${overdueDays}일 지연 - ${campaignName} (패널티 적용 예정)`,
      html: htmlContent
    });
    return { success: true };
  } catch (error) {
    console.error('지연 이메일 발송 실패:', error.message);
    return { success: false, error: error.message };
  }
};

const { checkDuplicate, skipResponse } = require('./lib/scheduler-dedup');

// 메인 핸들러
exports.handler = async (event, context) => {
  console.log('=== 영상 제출 지연 알림 스케줄러 시작 ===');
  console.log('실행 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  // ★ 중복 실행 방지 (인메모리 + DB)
  const { isDuplicate, reason } = await checkDuplicate('scheduled-overdue-notification', event);
  if (isDuplicate) return skipResponse(reason);

  try {
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = new Date(koreaTime);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 멀티리전 DB 순회 (Korea, Japan, US)
    const regions = [
      { name: 'korea', url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY },
      { name: 'japan', url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY },
      { name: 'us', url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY }
    ];

    const allResults = [];

    for (const regionInfo of regions) {
      if (!regionInfo.url || !regionInfo.key) {
        console.log(`${regionInfo.name} DB 환경변수 미설정 - 건너뜀`);
        continue;
      }

      console.log(`\n=== ${regionInfo.name} 리전 조회 시작 ===`);
      const supabase = createClient(regionInfo.url, regionInfo.key);

      // 캠페인 정보 조회
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, title, campaign_type, content_submission_deadline, step1_deadline, step2_deadline, week1_deadline, week2_deadline, week3_deadline, week4_deadline')
        .in('status', ['active', 'recruiting', 'approved']);

      if (campaignError) {
        console.error(`${regionInfo.name} 캠페인 조회 오류:`, campaignError);
        continue;
      }

      // 마감일이 지난 캠페인 필터링
      const overdueCampaigns = (campaigns || []).filter(campaign => {
        const type = (campaign.campaign_type || '').toLowerCase();
        let deadlines = [];

        if (type.includes('4week') || type.includes('challenge')) {
          deadlines = [campaign.week1_deadline, campaign.week2_deadline, campaign.week3_deadline, campaign.week4_deadline];
        } else if (type.includes('olive')) {
          deadlines = [campaign.step1_deadline, campaign.step2_deadline];
        } else {
          deadlines = [campaign.content_submission_deadline];
        }

        return deadlines.some(d => d && d < todayStr);
      });

      console.log(`${regionInfo.name} 마감일 지난 캠페인: ${overdueCampaigns.length}개`);

      for (const campaign of overdueCampaigns) {
        const type = (campaign.campaign_type || '').toLowerCase();
        let deadline = campaign.content_submission_deadline;

        if (type.includes('4week') || type.includes('challenge')) {
          const deadlines = [campaign.week1_deadline, campaign.week2_deadline, campaign.week3_deadline, campaign.week4_deadline]
            .filter(d => d && d < todayStr)
            .sort()
            .reverse();
          deadline = deadlines[0] || deadline;
        } else if (type.includes('olive')) {
          const deadlines = [campaign.step1_deadline, campaign.step2_deadline]
            .filter(d => d && d < todayStr)
            .sort()
            .reverse();
          deadline = deadlines[0] || deadline;
        }

        if (!deadline) continue;

        const overdueDays = calculateOverdueDays(deadline);
        if (overdueDays <= 0) continue;

        // 영상 미제출 참가자 조회
        const { data: participants, error: partError } = await supabase
          .from('campaign_participants')
          .select('id, user_id, campaign_id, status')
          .eq('campaign_id', campaign.id)
          .in('status', ['filming', 'selected', 'guide_approved']);

        if (partError || !participants || participants.length === 0) continue;

        for (const participant of participants) {
          const { data: videos } = await supabase
            .from('video_submissions')
            .select('id')
            .eq('campaign_id', campaign.id)
            .eq('user_id', participant.user_id)
            .in('status', ['approved', 'completed', 'pending', 'video_submitted']);

          if (videos && videos.length > 0) continue;

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name, channel_name, phone, email, line_user_id')
            .eq('id', participant.user_id)
            .maybeSingle();

          if (!profile) continue;

          const creatorName = profile.channel_name || profile.name || '크리에이터';
          const creatorPhone = profile.phone;
          const creatorEmail = profile.email;
          const deadlineFormatted = deadline.replace(/-/g, '.');

          let kakaoSent = false;
          let emailSent = false;

          // 리전별 알림 발송
          if (regionInfo.name === 'korea') {
            // 한국: 알림톡 + 이메일
            if (creatorPhone) {
              try {
                await sendKakaoNotification(creatorPhone, creatorName, campaign.title, deadlineFormatted, overdueDays);
                kakaoSent = true;
                console.log(`✓ 지연 알림톡 발송: ${creatorName} (${overdueDays}일 지연)`);
              } catch (e) {
                console.error(`✗ 지연 알림톡 실패: ${creatorName}`, e.message);
              }
            }
            if (creatorEmail) {
              const result = await sendOverdueEmail(creatorEmail, creatorName, campaign.title, deadlineFormatted, overdueDays);
              emailSent = result.success;
              if (emailSent) console.log(`✓ 지연 이메일 발송: ${creatorName}`);
            }
          } else if (regionInfo.name === 'japan') {
            // 일본: send-japan-notification (LINE + 일본어 이메일)
            try {
              const baseUrl = process.env.URL || 'https://cnecbiz.com';
              await fetch(`${baseUrl}/.netlify/functions/send-japan-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'video_deadline_reminder',
                  lineUserId: profile.line_user_id,
                  email: creatorEmail,
                  phone: creatorPhone,
                  data: {
                    creatorName,
                    campaignName: campaign.title,
                    deadline: deadlineFormatted,
                    stepInfo: `${overdueDays}日遅延`
                  }
                })
              });
              emailSent = true;
              console.log(`✓ 일본 지연 알림 발송: ${creatorName} (${overdueDays}일 지연)`);
            } catch (jpErr) {
              console.error(`✗ 일본 지연 알림 실패: ${creatorName}`, jpErr.message);
            }
          } else if (regionInfo.name === 'us') {
            // 미국: send-us-notification (영어 이메일)
            try {
              const baseUrl = process.env.URL || 'https://cnecbiz.com';
              await fetch(`${baseUrl}/.netlify/functions/send-us-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'video_deadline_reminder',
                  email: creatorEmail,
                  data: {
                    creatorName,
                    campaignName: campaign.title,
                    deadline: deadlineFormatted,
                    stepInfo: `${overdueDays} days overdue`
                  }
                })
              });
              emailSent = true;
              console.log(`✓ 미국 지연 알림 발송: ${creatorName} (${overdueDays}일 지연)`);
            } catch (usErr) {
              console.error(`✗ 미국 지연 알림 실패: ${creatorName}`, usErr.message);
            }
          }

          allResults.push({
            creatorName,
            campaignName: campaign.title,
            deadline,
            overdueDays,
            region: regionInfo.name,
            kakaoSent,
            emailSent
          });
        }
      }
    } // end regions loop

    console.log(`=== 지연 알림 완료: ${allResults.length}건 ===`);

    // 네이버 웍스 보고
    if (allResults.length > 0) {
      try {
        const clientId = process.env.NAVER_WORKS_CLIENT_ID;
        const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
        const botId = process.env.NAVER_WORKS_BOT_ID;
        const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

        if (clientId && clientSecret && botId && channelId) {
          const koreanDate = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
          let message = `🚨 영상 제출 지연 알림 발송 완료\n\n`;
          message += `📅 ${koreanDate}\n`;
          message += `총 ${allResults.length}명에게 알림 발송\n\n`;

          allResults.slice(0, 10).forEach((r, i) => {
            message += `${i + 1}. ${r.creatorName} (${r.overdueDays}일 지연)\n`;
            message += `   캠페인: ${r.campaignName}\n`;
          });

          if (allResults.length > 10) {
            message += `\n... 외 ${allResults.length - 10}명`;
          }

          const accessToken = await getNaverWorksAccessToken(clientId, clientSecret, '7c15c.serviceaccount@howlab.co.kr');
          await sendNaverWorksMessage(accessToken, botId, channelId, message);
        }
      } catch (e) {
        console.error('네이버 웍스 발송 실패:', e.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '지연 알림 발송 완료',
        count: allResults.length,
        results: allResults
      })
    };

  } catch (error) {
    console.error('스케줄러 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// 스케줄은 netlify.toml에서 관리
// exports.config = { schedule: '0 1 * * *' };
