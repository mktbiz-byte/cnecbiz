/**
 * 매일 오전 10시(한국시간) 실행 - 영상 제출 마감일 알림
 * Netlify Scheduled Function
 *
 * Cron: 0 1 * * * (UTC 1시 = 한국시간 10시)
 *
 * 기능:
 * - 영상 제출 마감일이 3일 후, 2일 후, 당일인 크리에이터에게 알림 발송
 * - 아직 영상을 제출하지 않은 크리에이터에게만 발송
 * - 템플릿: 025100001013 (3일 전), 025100001014 (2일 전), 025100001015 (당일)
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

// 네이버 웍스 JWT 생성 함수
function generateNaverWorksJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: clientId,
    sub: serviceAccount,
    iat: now,
    exp: now + 3600,
    scope: 'bot'
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), NAVER_WORKS_PRIVATE_KEY);
  const base64Signature = signature.toString('base64url');

  return `${signatureInput}.${base64Signature}`;
}

// 네이버 웍스 Access Token 발급 함수
async function getNaverWorksAccessToken(clientId, clientSecret, serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwt = generateNaverWorksJWT(clientId, serviceAccount);

    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'bot'
    }).toString();

    const options = {
      hostname: 'auth.worksmobile.com',
      path: '/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve(response.access_token);
        } else {
          reject(new Error(`Failed to get access token: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 네이버 웍스 메시지 전송 함수
async function sendNaverWorksMessage(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      content: {
        type: 'text',
        text: message
      }
    });

    const options = {
      hostname: 'www.worksapis.com',
      path: `/v1.0/bots/${botId}/channels/${channelId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`Failed to send message: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Supabase 클라이언트 초기화 - SERVICE_ROLE_KEY 사용
const createSupabaseClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }
  return null;
};

// 날짜 문자열에서 YYYY-MM-DD 부분만 추출 (timestamp/date 타입 모두 처리)
const getDatePart = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    // "2026-01-29T00:00:00+00:00" -> "2026-01-29"
    // "2026-01-29" -> "2026-01-29"
    return dateValue.substring(0, 10);
  }
  // Date 객체인 경우
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  return null;
};

// 크리에이터 이메일 발송 함수
const sendCreatorEmail = async (to, creatorName, campaignName, deadline, daysRemaining) => {
  const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const senderName = process.env.GMAIL_SENDER_NAME || 'CNEC';

  if (!gmailAppPassword) {
    console.log('GMAIL_APP_PASSWORD 환경변수 미설정 - 이메일 발송 생략');
    return { success: false, reason: 'GMAIL_APP_PASSWORD 미설정' };
  }

  const cleanPassword = gmailAppPassword.trim().replace(/\s/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: cleanPassword
    }
  });

  // 남은 기간에 따른 메시지 설정
  let titleEmoji = '📅';
  let titleText = '영상 제출 기한 안내';
  let urgencyClass = 'info';
  let urgencyText = '';

  if (daysRemaining === 0) {
    titleEmoji = '🚨';
    titleText = '영상 제출 마감일 (오늘)';
    urgencyClass = 'danger';
    urgencyText = '오늘 자정까지 제출해 주세요!';
  } else if (daysRemaining === 2) {
    titleEmoji = '⏰';
    titleText = '영상 제출 기한 2일 전';
    urgencyClass = 'warning';
    urgencyText = '2일 후 마감됩니다.';
  } else if (daysRemaining === 3) {
    titleEmoji = '📅';
    titleText = '영상 제출 기한 3일 전';
    urgencyClass = 'info';
    urgencyText = '3일 후 마감됩니다.';
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .highlight-box.danger { border-left-color: #dc3545; }
    .highlight-box.warning { border-left-color: #ffc107; }
    .highlight-box.info { border-left-color: #17a2b8; }
    .deadline { font-size: 28px; font-weight: bold; color: #667eea; }
    .urgency { font-size: 18px; font-weight: bold; color: #dc3545; margin-top: 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
    .warning-text { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${titleEmoji} ${titleText}</h1>
    </div>
    <div class="content">
      <p><strong>${creatorName}</strong>님, 안녕하세요!</p>
      <p>참여하신 캠페인의 영상 제출 기한이 다가오고 있습니다.</p>

      <div class="highlight-box ${urgencyClass}">
        <p><strong>캠페인:</strong> ${campaignName}</p>
        <p><strong>영상 제출 기한:</strong> <span class="deadline">${deadline}</span></p>
        ${urgencyText ? `<p class="urgency">${urgencyText}</p>` : ''}
      </div>

      <div class="warning-text">
        <p><strong>⚠️ 중요:</strong> 기한 내 미제출 시 패널티가 부과됩니다.</p>
        <p>특별한 사유가 있는 경우 관리자에게 문의해주세요.</p>
      </div>

      <p>크리에이터 대시보드에서 촬영한 영상을 제출해 주세요.</p>

      <a href="https://cnec.co.kr/creator/campaigns" class="button">영상 제출하기 →</a>

      <div class="footer">
        <p>문의: 1833-6025 | mkt_biz@cnec.co.kr</p>
        <p>© CNEC. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: `"${senderName}" <${gmailEmail}>`,
    to: to,
    subject: `[CNEC] ${titleEmoji} ${campaignName} - ${titleText}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`크리에이터 이메일 발송 성공: ${to}`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`크리에이터 이메일 발송 실패: ${to}`, error.message);
    return { success: false, error: error.message };
  }
};

// 기업 이메일 발송 함수 (해당 캠페인의 미제출 크리에이터 리스트)
const sendCompanyEmail = async (to, companyName, campaignName, pendingCreators, deadline, daysRemaining) => {
  const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const senderName = process.env.GMAIL_SENDER_NAME || 'CNEC';

  if (!gmailAppPassword) {
    console.log('GMAIL_APP_PASSWORD 환경변수 미설정 - 이메일 발송 생략');
    return { success: false, reason: 'GMAIL_APP_PASSWORD 미설정' };
  }

  const cleanPassword = gmailAppPassword.trim().replace(/\s/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: cleanPassword
    }
  });

  let titleText = '';
  if (daysRemaining === 0) {
    titleText = '영상 제출 마감일 (오늘)';
  } else if (daysRemaining === 2) {
    titleText = '영상 제출 기한 2일 전';
  } else if (daysRemaining === 3) {
    titleText = '영상 제출 기한 3일 전';
  }

  const creatorListHtml = pendingCreators.map(c =>
    `<li><strong>${c.creatorName}</strong> - ${c.phone || '전화번호 없음'}</li>`
  ).join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .stat { font-size: 36px; font-weight: bold; color: #dc3545; }
    .creator-list { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .creator-list ul { list-style-type: none; padding: 0; }
    .creator-list li { padding: 10px; border-bottom: 1px solid #eee; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 ${titleText} - 미제출 크리에이터 현황</h1>
    </div>
    <div class="content">
      <p><strong>${companyName}</strong>님, 안녕하세요!</p>
      <p>캠페인 영상 제출 현황을 안내드립니다.</p>

      <div class="highlight-box">
        <p><strong>캠페인:</strong> ${campaignName}</p>
        <p><strong>영상 제출 기한:</strong> ${deadline}</p>
        <p><strong>미제출 크리에이터:</strong> <span class="stat">${pendingCreators.length}</span>명</p>
      </div>

      <div class="creator-list">
        <p><strong>📋 미제출 크리에이터 명단:</strong></p>
        <ul>
          ${creatorListHtml}
        </ul>
      </div>

      <p>필요시 크리에이터들에게 직접 연락하여 제출을 독려해 주세요.</p>

      <a href="https://cnec.co.kr/company/campaigns" class="button">캠페인 관리 페이지 →</a>

      <div class="footer">
        <p>문의: 1833-6025 | mkt_biz@cnec.co.kr</p>
        <p>© CNEC. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: `"${senderName}" <${gmailEmail}>`,
    to: to,
    subject: `[CNEC] ${campaignName} - ${titleText} (미제출 ${pendingCreators.length}명)`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`기업 이메일 발송 성공: ${to}`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`기업 이메일 발송 실패: ${to}`, error.message);
    return { success: false, error: error.message };
  }
};

// 카카오톡 알림 발송 함수 (send-kakao-notification 함수를 HTTP로 호출하여 템플릿 일원화)
const sendKakaoNotification = async (receiverNum, receiverName, templateCode, campaignName, deadline) => {
  const baseUrl = process.env.URL || 'https://cnecbiz.com';

  // 템플릿에 따라 변수 구성
  const isSnsTemplate = ['025100001019', '025100001020'].includes(templateCode);
  const variables = {
    '크리에이터명': receiverName,
    '캠페인명': campaignName
  };
  if (isSnsTemplate) {
    variables['업로드기한'] = deadline;
  } else {
    variables['제출기한'] = deadline;
  }

  const res = await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiverNum: receiverNum.replace(/-/g, ''),
      receiverName: receiverName || '',
      templateCode,
      variables
    })
  });

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || `알림톡 발송 실패 (${templateCode})`);
  }

  console.log(`카카오 알림톡 발송 성공: ${receiverNum} (${templateCode})`, result.receiptNum);
  return result;
};

const { checkDuplicate, skipResponse } = require('./lib/scheduler-dedup');

// 메인 핸들러
exports.handler = async (event, context) => {
  const executionTime = new Date();
  console.log('========================================');
  console.log('=== 영상 제출 마감일 알림 스케줄러 시작 ===');
  console.log('========================================');
  console.log('실행 시간 (UTC):', executionTime.toISOString());
  console.log('실행 시간 (KST):', executionTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  // ★ 중복 실행 방지 (인메모리 + DB)
  const { isDuplicate, reason } = await checkDuplicate('scheduled-video-deadline-notification', event);
  if (isDuplicate) return skipResponse(reason);

  // 환경변수 확인 로그
  console.log('\n=== 환경변수 확인 ===');
  console.log('VITE_SUPABASE_BIZ_URL:', process.env.VITE_SUPABASE_BIZ_URL ? '설정됨' : '❌ 미설정');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '❌ 미설정');
  console.log('VITE_SUPABASE_KOREA_URL:', process.env.VITE_SUPABASE_KOREA_URL ? '설정됨' : '❌ 미설정');
  console.log('SUPABASE_KOREA_SERVICE_ROLE_KEY:', process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY ? '설정됨' : '❌ 미설정');
  console.log('VITE_SUPABASE_JAPAN_URL:', process.env.VITE_SUPABASE_JAPAN_URL ? '설정됨' : '❌ 미설정');
  console.log('SUPABASE_JAPAN_SERVICE_ROLE_KEY:', process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY ? '설정됨' : '❌ 미설정');
  console.log('VITE_SUPABASE_US_URL:', process.env.VITE_SUPABASE_US_URL ? '설정됨' : '❌ 미설정');
  console.log('SUPABASE_US_SERVICE_ROLE_KEY:', process.env.SUPABASE_US_SERVICE_ROLE_KEY ? '설정됨' : '❌ 미설정');
  console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '설정됨' : '❌ 미설정');
  console.log('POPBILL_LINK_ID:', process.env.POPBILL_LINK_ID ? '설정됨' : '❌ 미설정');

  try {
    // 오늘 날짜 (한국 시간 기준)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    // 오늘, 2일 후, 3일 후 날짜 계산
    const today = new Date(koreaTime);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const in2Days = new Date(today);
    in2Days.setDate(today.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split('T')[0];

    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    console.log('\n=== 날짜 계산 결과 ===');
    console.log('오늘 (당일 마감):', todayStr);
    console.log('2일 후 마감:', in2DaysStr);
    console.log('3일 후 마감:', in3DaysStr);

    // 캠페인 데이터는 각 리전 DB에 저장됨 - Korea, Japan, US 모두 조회
    const regions = [
      { name: 'korea', url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY, siteUrl: 'https://cnec.co.kr' },
      { name: 'japan', url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY, siteUrl: 'https://cnec.jp' },
      { name: 'us', url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY, siteUrl: 'https://cnec.us' }
    ];

    console.log('📢 영상 제출 마감일 알림 - Korea/Japan/US DB 조회');

    // 3일 후, 2일 후, 당일 마감되는 영상 제출 조회
    // 영상 제출: 025100001013 (3일전), 025100001014 (2일전), 025100001015 (당일)
    // SNS 업로드: 025100001019 (2일전) - 당일 알림톡 템플릿 미등록 (025100001020은 출금완료 템플릿)
    const deadlineDates = [
      { date: in3DaysStr, templateCode: '025100001013', snsTemplateCode: null, label: '3일 전' },
      { date: in2DaysStr, templateCode: '025100001014', snsTemplateCode: '025100001019', label: '2일 전' },
      { date: todayStr, templateCode: '025100001015', snsTemplateCode: null, label: '당일' }
    ];

    const allResults = [];
    const campaignCreatorsMap = {}; // 캠페인별 미제출 크리에이터 그룹화

    for (const { date, templateCode, snsTemplateCode, label } of deadlineDates) {
      try {
        console.log(`\n=== ${label} 알림 처리 (마감일: ${date}) ===`);

        // 1단계: 모든 지역에서 해당 날짜가 content_submission_deadline인 캠페인 찾기
        let allCampaigns = [];
        for (const region of regions) {
          if (!region.url || !region.key) {
            console.log(`${region.name} Supabase 미설정 - 건너뜀`);
            continue;
          }

          const supabase = createClient(region.url, region.key);

        // 모든 활성 캠페인 조회 (캠페인 타입별 마감일 필드 포함)
        // Japan/US는 video_deadline, sns_deadline 필드도 사용
        const { data: regionCampaigns, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, title, company_email, campaign_type, content_submission_deadline, video_deadline, sns_deadline, step1_deadline, step2_deadline, week1_deadline, week2_deadline, week3_deadline, week4_deadline')
          .in('status', ['active', 'recruiting', 'approved']);

        if (campaignError) {
          console.error(`❌ ${region.name} 캠페인 조회 오류 (${date}):`, campaignError);
          continue;
        }

        console.log(`[${region.name}] 활성 캠페인 ${(regionCampaigns || []).length}개 조회됨`);

        // 각 캠페인의 마감일 로그 (디버깅용)
        if (regionCampaigns && regionCampaigns.length > 0) {
          console.log(`[${region.name}] 캠페인 마감일 상세:`);
          regionCampaigns.slice(0, 10).forEach(c => {
            console.log(`  - ${c.title} (${c.campaign_type || 'regular'}): content_deadline=${getDatePart(c.content_submission_deadline)}, video_deadline=${getDatePart(c.video_deadline)}, step1=${getDatePart(c.step1_deadline)}, week1=${getDatePart(c.week1_deadline)}`);
          });
          if (regionCampaigns.length > 10) {
            console.log(`  ... 외 ${regionCampaigns.length - 10}개`);
          }
        }

        // 캠페인 타입별 마감일 필터링 (getDatePart로 timestamp/date 타입 모두 처리)
        // matchedDeadlineType: 'video' (영상 제출) 또는 'sns' (SNS 업로드) 구분
        const matchingCampaigns = [];
        for (const campaign of (regionCampaigns || [])) {
          const type = (campaign.campaign_type || '').toLowerCase();
          let matched = false;
          let deadlineType = 'video'; // 기본: 영상 제출

          if (type.includes('4week') || type.includes('challenge')) {
            // 4주 챌린지: 4개 마감일 체크
            matched = getDatePart(campaign.week1_deadline) === date ||
                     getDatePart(campaign.week2_deadline) === date ||
                     getDatePart(campaign.week3_deadline) === date ||
                     getDatePart(campaign.week4_deadline) === date;
          } else if (type.includes('olive') || type.includes('올리브')) {
            // 올리브영: 2개 마감일 체크
            matched = getDatePart(campaign.step1_deadline) === date ||
                     getDatePart(campaign.step2_deadline) === date;
          } else {
            // 기획형/일반: content_submission_deadline, video_deadline, sns_deadline 각각 체크
            if (getDatePart(campaign.content_submission_deadline) === date ||
                getDatePart(campaign.video_deadline) === date) {
              matched = true;
              deadlineType = 'video';
            }
            // SNS 업로드 마감일 별도 체크 (영상 제출과 다른 템플릿 사용)
            if (getDatePart(campaign.sns_deadline) === date) {
              if (matched) {
                // 영상 제출 + SNS 업로드 마감일이 같은 경우: SNS 업로드용도 추가
                const snsCampaign = { ...campaign, region: region.name, matchedDeadlineType: 'sns' };
                matchingCampaigns.push(snsCampaign);
              } else {
                matched = true;
                deadlineType = 'sns';
              }
            }
          }

          if (matched) {
            campaign.matchedDeadlineType = deadlineType;
            matchingCampaigns.push(campaign);
          }
        }

        if (matchingCampaigns.length > 0) {
          console.log(`${region.name} ${label}: ${matchingCampaigns.length}개 캠페인 발견`);
          matchingCampaigns.forEach(c => { if (!c.region) c.region = region.name; });
          allCampaigns.push(...matchingCampaigns);
        }
      }

      const campaigns = allCampaigns.filter(c => c.region); // region이 있는 것만 (필터링된 것)
      if (!campaigns || campaigns.length === 0) {
        console.log(`${label}: 해당 날짜에 마감되는 캠페인 없음 (모든 지역)`);
        continue;
      }

      console.log(`${label}: 전체 ${campaigns.length}개 캠페인 발견`);

      // 2단계: 각 캠페인의 applications 가져오기 및 알림 발송
      for (const campaign of campaigns) {
        // 해당 캠페인의 지역 Supabase 클라이언트 생성
        const regionConfig = regions.find(r => r.name === campaign.region);
        const supabase = createClient(regionConfig.url, regionConfig.key);

        // 마감일 유형에 따라 대상 application 상태가 다름
        const isSnsDeadline = campaign.matchedDeadlineType === 'sns';
        let targetStatuses;
        if (isSnsDeadline) {
          // SNS 업로드 마감: 영상이 승인되었지만 아직 SNS에 업로드하지 않은 크리에이터
          targetStatuses = ['video_approved', 'approved', 'video_submitted'];
        } else {
          // 영상 제출 마감: 아직 영상을 제출하지 않은 크리에이터
          targetStatuses = ['filming', 'selected', 'guide_approved'];
        }

        const { data: applications, error: appError } = await supabase
          .from('applications')
          .select('id, user_id, campaign_id, status, sns_upload_url')
          .eq('campaign_id', campaign.id)
          .in('status', targetStatuses);

        if (appError) {
          console.error(`Applications 조회 오류 (campaign ${campaign.id}):`, appError);
          continue;
        }

        if (!applications || applications.length === 0) {
          const statusDesc = isSnsDeadline ? 'video_approved/approved/video_submitted' : 'filming/selected/guide_approved';
          console.log(`${label} - ${campaign.title} (${campaign.region}): 알림 대상 없음 (${statusDesc} 상태 신청 없음)`);
          continue;
        }

        console.log(`${label} - ${campaign.title} (${campaign.region}): ${applications.length}건 대상`);
        console.log(`  신청 상태 분포: ${JSON.stringify(applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}))}`);

        // 각 application에 대해 알림 발송
        for (const app of applications) {
          try {
            const campaignName = campaign.title;
            const campaignType = campaign.campaign_type;

            // user_profiles에서 크리에이터 정보 조회
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('name, email, phone, line_user_id')
              .eq('id', app.user_id)
              .maybeSingle();

            // user_id로 못 찾으면 user_id 컬럼으로 재시도
            let creatorProfile = profile;
            if (!creatorProfile) {
              const { data: profile2 } = await supabase
                .from('user_profiles')
                .select('name, email, phone, line_user_id')
                .eq('user_id', app.user_id)
                .maybeSingle();
              creatorProfile = profile2;
            }

            if (!creatorProfile) {
              console.log(`크리에이터 정보 없음 (user_id: ${app.user_id}), 알림 건너뜀`);
              allResults.push({
                userId: app.user_id,
                campaignName,
                deadline: date,
                label,
                status: 'skipped',
                reason: '크리에이터 정보 없음'
              });
              continue;
            }

            const creatorName = creatorProfile.name || '크리에이터';
            const creatorPhone = creatorProfile.phone;
            const creatorEmail = creatorProfile.email;

            if (!creatorPhone && !creatorEmail) {
              console.log(`크리에이터 연락처 없음 (user_id: ${app.user_id}, name: ${creatorName}), 알림 건너뜀`);
              allResults.push({
                userId: app.user_id,
                campaignName,
                deadline: date,
                label,
                status: 'skipped',
                reason: '연락처 없음'
              });
              continue;
            }

          // SNS 업로드 마감일인 경우: SNS 업로드 여부 확인
          if (isSnsDeadline) {
            // sns_upload_url이 이미 있으면 (SNS 업로드 완료) 건너뜀
            if (app.sns_upload_url) {
              console.log(`✓ SNS 업로드 완료: ${creatorName} (url: ${app.sns_upload_url}) - 알림 건너뜀`);
              allResults.push({
                userId: app.user_id,
                campaignName,
                deadline: date,
                label,
                status: 'skipped',
                reason: 'SNS 업로드 완료'
              });
              continue;
            }

            // video_submissions에서도 sns_upload_url 확인
            const { data: videoSubs } = await supabase
              .from('video_submissions')
              .select('id, sns_upload_url')
              .eq('campaign_id', app.campaign_id)
              .eq('user_id', app.user_id)
              .not('sns_upload_url', 'is', null);

            if (videoSubs && videoSubs.length > 0) {
              console.log(`✓ SNS 업로드 완료 (video_submissions): ${creatorName} - 알림 건너뜀`);
              allResults.push({
                userId: app.user_id,
                campaignName,
                deadline: date,
                label,
                status: 'skipped',
                reason: 'SNS 업로드 완료 (video_submissions)'
              });
              continue;
            }

            console.log(`→ SNS 미업로드: ${creatorName} - SNS 업로드 마감일 알림 발송`);
          } else {
            // 영상 제출 마감일인 경우: 영상 제출 여부 확인
            let targetVideoNumber = null;
            let videoFieldName = 'video_number';

            if (campaignType === '4week_challenge') {
              videoFieldName = 'week_number';
              const week1 = getDatePart(campaign.week1_deadline);
              const week2 = getDatePart(campaign.week2_deadline);
              const week3 = getDatePart(campaign.week3_deadline);
              const week4 = getDatePart(campaign.week4_deadline);

              if (week1 === date) targetVideoNumber = 1;
              else if (week2 === date) targetVideoNumber = 2;
              else if (week3 === date) targetVideoNumber = 3;
              else if (week4 === date) targetVideoNumber = 4;
            } else if (campaignType === 'oliveyoung' || campaignType === 'oliveyoung_sale') {
              videoFieldName = 'video_number';
              const step1 = getDatePart(campaign.step1_deadline);
              const step2 = getDatePart(campaign.step2_deadline);

              if (step1 === date) targetVideoNumber = 1;
              else if (step2 === date) targetVideoNumber = 2;
            } else {
              targetVideoNumber = null;
            }

            // video_submissions에서 해당 영상이 제출됐는지 확인
            let submissionQuery = supabase
              .from('video_submissions')
              .select('id, status, week_number, video_number')
              .eq('campaign_id', app.campaign_id)
              .eq('user_id', app.user_id);

            if (targetVideoNumber !== null) {
              submissionQuery = submissionQuery.eq(videoFieldName, targetVideoNumber);
            }

            const { data: submittedVideos, error: videoError } = await submissionQuery;

            if (videoError) {
              console.error(`영상 제출 확인 오류 (user_id: ${app.user_id}):`, videoError);
            }

            const hasSubmitted = submittedVideos && submittedVideos.length > 0;

            if (hasSubmitted) {
              const videoStatus = submittedVideos[0].status;
              const videoLabel = targetVideoNumber ? `${targetVideoNumber}차 영상` : '영상';
              console.log(`✓ ${videoLabel} 제출 완료: ${creatorName} (상태: ${videoStatus}) - 알림 건너뜀`);
              allResults.push({
                userId: app.user_id,
                campaignName,
                deadline: date,
                label,
                status: 'skipped',
                reason: `${videoLabel} 제출 완료 (상태: ${videoStatus})`
              });
              continue;
            }

            const videoLabel = targetVideoNumber ? `${targetVideoNumber}차 영상` : '영상';
            console.log(`→ ${videoLabel} 미제출: ${creatorName} - 알림 발송`);
          }

          // 마감일 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
          const deadlineFormatted = date.replace(/-/g, '.');

          // daysRemaining 계산 (0, 2, 3)
          let daysRemaining = 0;
          if (label === '3일 전') daysRemaining = 3;
          else if (label === '2일 전') daysRemaining = 2;
          else if (label === '당일') daysRemaining = 0;

          // 사용할 템플릿 결정: SNS 업로드 vs 영상 제출
          const actualTemplateCode = isSnsDeadline
            ? (snsTemplateCode || templateCode)  // SNS 업로드용 템플릿 (3일 전은 없으므로 영상 제출 템플릿 사용)
            : templateCode;

          // SNS 업로드 3일 전 템플릿이 없으면 건너뜀
          if (isSnsDeadline && !snsTemplateCode) {
            console.log(`SNS 업로드 3일 전 알림 템플릿 없음 - 건너뜀 (크리에이터: ${creatorName})`);
            continue;
          }

          // 카카오톡 및 이메일 발송 (한국만 — 일본/미국은 LINE/WhatsApp 사용 예정)
          let kakaoSent = false;
          let emailSent = false;
          const isKorea = campaign.region === 'korea';

          // 알림톡 발송 (한국만)
          if (isKorea && creatorPhone) {
            try {
              await sendKakaoNotification(
                creatorPhone,
                creatorName,
                actualTemplateCode,
                campaignName,
                deadlineFormatted
              );
              const typeLabel = isSnsDeadline ? 'SNS 업로드' : '영상 제출';
              console.log(`✓ ${typeLabel} 알림톡 발송 성공: ${creatorName} (${creatorPhone}) - ${campaignName}`);
              kakaoSent = true;
            } catch (kakaoError) {
              console.error(`✗ 알림톡 발송 실패: ${creatorName}`, kakaoError.message);
            }
          } else if (!isKorea) {
            console.log(`ℹ️ ${campaign.region} 리전 - 카카오 알림톡 건너뜀 (${creatorName})`);
          }

          // 이메일/알림 발송 (리전별)
          if (isKorea && creatorEmail) {
            try {
              await sendCreatorEmail(
                creatorEmail,
                creatorName,
                campaignName,
                deadlineFormatted,
                daysRemaining
              );
              console.log(`✓ 이메일 발송 성공: ${creatorName} (${creatorEmail}) - ${campaignName}`);
              emailSent = true;
            } catch (emailError) {
              console.error(`✗ 이메일 발송 실패: ${creatorName}`, emailError.message);
            }
          } else if (campaign.region === 'japan') {
            try {
              const baseUrl = process.env.URL || 'https://cnecbiz.com';
              await fetch(`${baseUrl}/.netlify/functions/send-japan-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'video_deadline_reminder',
                  lineUserId: creatorProfile?.line_user_id,
                  email: creatorEmail,
                  phone: creatorPhone,
                  data: { creatorName, campaignName, deadline: deadlineFormatted }
                })
              });
              console.log(`✓ 일본 알림 발송 성공: ${creatorName} - ${campaignName}`);
              emailSent = true;
            } catch (jpError) {
              console.error(`✗ 일본 알림 발송 실패: ${creatorName}`, jpError.message);
            }
          } else if (campaign.region === 'us') {
            try {
              const baseUrl = process.env.URL || 'https://cnecbiz.com';
              await fetch(`${baseUrl}/.netlify/functions/send-us-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'video_deadline_reminder',
                  email: creatorEmail,
                  data: { creatorName, campaignName, deadline: deadlineFormatted }
                })
              });
              console.log(`✓ 미국 알림 발송 성공: ${creatorName} - ${campaignName}`);
              emailSent = true;
            } catch (usError) {
              console.error(`✗ 미국 알림 발송 실패: ${creatorName}`, usError.message);
            }
          }

          // 한국: 발송 결과 기록, 일본/미국: 네이버웍스 보고서용으로 기록
          if (kakaoSent || emailSent || !isKorea) {
            allResults.push({
              userId: app.user_id,
              creatorName,
              campaignName,
              deadline: date,
              label,
              region: campaign.region,
              status: (kakaoSent || emailSent) ? 'sent' : 'skipped_non_korea',
              phone: creatorPhone,
              email: creatorEmail,
              kakaoSent,
              emailSent
            });

            // 캠페인별 크리에이터 그룹화 (기업 이메일용 — 전 리전)
            {
              const campaignId = campaign.id;
              const companyId = campaign.company_id || null;
              const companyEmail = campaign.company_email || null;
              if (!campaignCreatorsMap[campaignId]) {
                campaignCreatorsMap[campaignId] = {
                  campaignName,
                  companyId,
                  companyEmail,
                  region: campaign.region,
                  deadline: date,
                  daysRemaining,
                  creators: []
                };
              }
              campaignCreatorsMap[campaignId].creators.push({
                creatorName,
                phone: creatorPhone,
                email: creatorEmail
              });
            }
          } else {
            allResults.push({
              userId: app.user_id,
              creatorName,
              campaignName,
              deadline: date,
              label,
              region: campaign.region,
              status: 'failed',
              error: '알림톡/이메일 모두 발송 실패'
            });
          }
          } catch (error) {
            console.error(`Application 처리 오류 (${app.id}):`, error);
            allResults.push({
              applicationId: app.id,
              deadline: date,
              label,
              status: 'failed',
              error: error.message
            });
          }
        } // end of applications loop
      } // end of campaigns loop
      // ★ 개별 마감일(custom_deadlines) 기능은 applications 테이블에 해당 컬럼이 없어 비활성화됨
      // 추후 custom_deadlines 컬럼 추가 시 활성화 가능
      console.log(`\n=== ${label} 개별 마감일 확인 (비활성화됨) ===`);

      } catch (deadlineError) {
        console.error(`[ERROR] ${label} 알림 처리 중 오류:`, deadlineError.message);
        // 오류가 발생해도 다음 마감일 처리 계속
      }
    }

    console.log('\n========================================');
    console.log('=== 크리에이터 알림 완료 ===');
    console.log('========================================');

    const sentCount = allResults.filter(r => r.status === 'sent').length;
    const failedCount = allResults.filter(r => r.status === 'failed').length;
    const skippedCount = allResults.filter(r => r.status === 'skipped').length;

    console.log(`📊 전체 결과 요약:`);
    console.log(`  - 발송 성공: ${sentCount}건`);
    console.log(`  - 발송 실패: ${failedCount}건`);
    console.log(`  - 건너뜀: ${skippedCount}건`);

    if (allResults.length === 0) {
      console.log('⚠️ 처리된 알림이 없습니다. 다음 사항을 확인하세요:');
      console.log('  1. 마감일이 오늘/2일후/3일후인 캠페인이 있는지');
      console.log('  2. 해당 캠페인의 status가 active/recruiting/approved인지');
      console.log('  3. 해당 캠페인에 filming/selected/guide_approved 상태인 신청이 있는지');
    }

    console.log('\n상세 결과:', JSON.stringify(allResults.slice(0, 20), null, 2));
    if (allResults.length > 20) {
      console.log(`  ... 외 ${allResults.length - 20}건`);
    }

    // 기업에게 캠페인별 미제출 크리에이터 리스트 이메일 발송 (전 리전)
    console.log('\n=== 기업 이메일 발송 시작 ===');

    // BIZ DB 클라이언트 (기업 정보는 항상 BIZ DB에서 조회)
    const supabaseBiz = createClient(
      process.env.VITE_SUPABASE_BIZ_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    for (const [campaignId, campaignData] of Object.entries(campaignCreatorsMap)) {
      if (campaignData.creators.length === 0) continue;

      try {
        // BIZ DB companies 테이블에서 기업 정보 조회 (notification_email 우선)
        let companyEmail = null;
        let companyName = '기업';

        // 1. user_id로 BIZ DB companies 테이블 조회
        const { data: companyByUserId } = await supabaseBiz
          .from('companies')
          .select('company_name, notification_email, email')
          .eq('user_id', campaignData.companyId)
          .maybeSingle();

        if (companyByUserId) {
          companyEmail = companyByUserId.notification_email || companyByUserId.email;
          companyName = companyByUserId.company_name || '기업';
        }

        // 2. id로 재시도 (레거시 데이터 호환)
        if (!companyEmail) {
          const { data: companyById } = await supabaseBiz
            .from('companies')
            .select('company_name, notification_email, email')
            .eq('id', campaignData.companyId)
            .maybeSingle();

          if (companyById) {
            companyEmail = companyById.notification_email || companyById.email;
            companyName = companyById.company_name || '기업';
          }
        }

        // 3. company_email로 BIZ DB companies 테이블 조회 (Japan 등 company_id 없는 리전)
        if (!companyEmail && campaignData.companyEmail) {
          const { data: companyByEmail } = await supabaseBiz
            .from('companies')
            .select('company_name, notification_email, email')
            .eq('email', campaignData.companyEmail)
            .maybeSingle();

          if (companyByEmail) {
            companyEmail = companyByEmail.notification_email || companyByEmail.email;
            companyName = companyByEmail.company_name || '기업';
          }
        }

        // 4. 최종 fallback: 캠페인의 company_email 직접 사용
        if (!companyEmail && campaignData.companyEmail) {
          companyEmail = campaignData.companyEmail;
        }

        if (!companyEmail) {
          console.log(`기업 이메일 없음 (campaign_id: ${campaignId}), 기업 이메일 발송 건너뜀`);
          continue;
        }

        // 기업 이메일 발송
        const emailResult = await sendCompanyEmail(
          companyEmail,
          companyName,
          campaignData.campaignName,
          campaignData.creators,
          campaignData.deadline,
          campaignData.daysRemaining
        );

        if (emailResult.success) {
          console.log(`✓ 기업 이메일 발송 성공: ${companyName} (${companyEmail}) - ${campaignData.campaignName} (${campaignData.region})`);
        } else {
          console.log(`✗ 기업 이메일 발송 실패: ${companyName} - ${emailResult.error || emailResult.reason}`);
        }
      } catch (companyEmailError) {
        console.error(`기업 이메일 발송 오류 (campaign_id: ${campaignId}):`, companyEmailError);
      }
    }

    console.log('\n=== 영상 제출 마감일 알림 스케줄러 완료 ===');

    // 네이버 웍스로 보고서 전송
    try {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID;
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
      const botId = process.env.NAVER_WORKS_BOT_ID;
      const channelId = process.env.NAVER_WORKS_CHANNEL_ID;
      const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

      if (clientId && clientSecret && botId && channelId && allResults.length > 0) {
        // 보고서 메시지 작성
        const sent3Days = allResults.filter(r => r.status === 'sent' && r.label === '3일 전');
        const sent2Days = allResults.filter(r => r.status === 'sent' && r.label === '2일 전');
        const sentToday = allResults.filter(r => r.status === 'sent' && r.label === '당일');
        const failed = allResults.filter(r => r.status === 'failed');
        const skipped = allResults.filter(r => r.status === 'skipped');

        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let reportMessage = `🎬 영상 제출 마감일 알림톡 발송 완료 보고\n\n`;
        reportMessage += `일시: ${koreanDate}\n`;
        reportMessage += `총 처리: ${allResults.length}건\n\n`;

        if (sent3Days.length > 0) {
          reportMessage += `📅 3일 전 알림 (${sent3Days.length}건):\n`;
          sent3Days.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    마감일: ${r.deadline}\n`;
          });
          reportMessage += `\n`;
        }

        if (sent2Days.length > 0) {
          reportMessage += `⏰ 2일 전 알림 (${sent2Days.length}건):\n`;
          sent2Days.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    마감일: ${r.deadline}\n`;
          });
          reportMessage += `\n`;
        }

        if (sentToday.length > 0) {
          reportMessage += `🚨 당일 알림 (${sentToday.length}건):\n`;
          sentToday.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    마감일: ${r.deadline} (오늘)\n`;
          });
          reportMessage += `\n`;
        }

        if (skipped.length > 0) {
          reportMessage += `⚠️ 발송 생략 (${skipped.length}건):\n`;
          skipped.forEach(r => {
            reportMessage += `  • ${r.campaignName}\n`;
            reportMessage += `    사유: ${r.reason}\n`;
          });
          reportMessage += `\n`;
        }

        if (failed.length > 0) {
          reportMessage += `❌ 발송 실패 (${failed.length}건):\n`;
          failed.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    오류: ${r.error}\n`;
          });
        }

        // 별도 Netlify 함수로 호출 (타임아웃 독립 실행)
        const nwBaseUrl = process.env.URL || 'https://cnecbiz.com'
        const nwRes = await fetch(`${nwBaseUrl}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: channelId,
            message: reportMessage
          })
        })
        const nwResult = await nwRes.json()
        console.log('네이버 웍스 보고서 전송:', nwResult.success ? '완료' : `실패: ${JSON.stringify(nwResult)}`);
      } else if (!channelId) {
        console.log('네이버 웍스 설정이 없어 보고서 전송 생략');
      } else {
        console.log('처리된 알림이 없어 네이버 웍스 보고서 전송 생략');
      }
    } catch (worksError) {
      console.error('네이버 웍스 보고서 전송 실패:', worksError);
      // 보고서 전송 실패해도 스케줄러는 성공으로 처리
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '영상 제출 마감일 알림 발송 완료',
        summary: {
          total: allResults.length,
          sent: sentCount,
          failed: failedCount,
          skipped: skippedCount
        },
        results: allResults
      })
    };

  } catch (error) {
    console.error('스케줄러 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '스케줄러 실행 실패',
        details: error.message
      })
    };
  }
};

// 스케줄은 netlify.toml에서 관리 (중복 실행 방지)
// exports.config = {
//   schedule: '0 1 * * *'  // UTC 1시 = 한국시간 10시
// };
