/**
 * 매일 오전 11시(한국시간) 실행 - 영상 제출 마감일 지연 알림
 * Netlify Scheduled Function
 *
 * Cron: 0 2 * * * (UTC 2시 = 한국시간 11시)
 *
 * 기능:
 * - 영상 제출 마감일이 1일, 3일, 5일 지연된 크리에이터에게 알림 발송
 * - 아직 영상을 제출하지 않은 크리에이터에게만 발송
 * - 템플릿: 025100001021 (지연 알림)
 */

const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 팝빌 설정
const POPBILL_LINK_ID = process.env.POPBILL_LINK_ID || 'HOWLAB';
const POPBILL_SECRET_KEY = process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=';
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || '';

// 팝빌 전역 설정
popbill.config({
  LinkID: POPBILL_LINK_ID,
  SecretKey: POPBILL_SECRET_KEY,
  IsTest: false,
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true
});

const kakaoService = popbill.KakaoService();

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
  const header = { alg: 'RS256', typ: 'JWT' };
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
          resolve(JSON.parse(data).access_token);
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
      content: { type: 'text', text: message }
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

// 날짜 문자열에서 YYYY-MM-DD 부분만 추출
const getDatePart = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    return dateValue.substring(0, 10);
  }
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  return null;
};

// 크리에이터 이메일 발송 함수 (강력한 경고 버전)
const sendOverdueEmail = async (to, creatorName, campaignName, deadline, daysOverdue) => {
  const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const senderName = process.env.GMAIL_SENDER_NAME || 'CNEC';

  if (!gmailAppPassword) {
    return { success: false, reason: 'GMAIL_APP_PASSWORD 미설정' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailEmail, pass: gmailAppPassword.trim().replace(/\s/g, '') }
  });

  // 지연일에 따른 패널티 안내
  let penaltyText = '';
  let urgencyLevel = '';
  if (daysOverdue >= 5) {
    penaltyText = '캠페인 취소 및 제품값 배상';
    urgencyLevel = '긴급';
  } else if (daysOverdue >= 3) {
    penaltyText = '보상금의 30% 차감';
    urgencyLevel = '경고';
  } else {
    penaltyText = '보상금의 10% 차감';
    urgencyLevel = '주의';
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans KR', -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #fff5f5; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #dc3545; }
    .warning-box { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .warning-box h2 { margin: 0 0 10px 0; font-size: 24px; }
    .penalty-box { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107; }
    .penalty-box h3 { color: #dc3545; margin-top: 0; }
    .penalty-list { background: #fff3cd; padding: 15px; border-radius: 5px; }
    .penalty-list li { margin: 10px 0; }
    .current-penalty { font-size: 20px; font-weight: bold; color: #dc3545; background: #ffe6e6; padding: 10px; border-radius: 5px; text-align: center; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 [${urgencyLevel}] 영상 제출 기한 ${daysOverdue}일 지연</h1>
    </div>
    <div class="content">
      <div class="warning-box">
        <h2>⚠️ 패널티 적용 예정 ⚠️</h2>
        <p>영상 제출 마감일이 ${daysOverdue}일 지났습니다!</p>
      </div>

      <p><strong>${creatorName}</strong>님, 안녕하세요.</p>
      <p>참여하신 캠페인의 영상 제출 기한이 <strong style="color: #dc3545;">${daysOverdue}일 지연</strong>되었습니다.</p>

      <div class="penalty-box">
        <h3>📋 캠페인 정보</h3>
        <p><strong>캠페인:</strong> ${campaignName}</p>
        <p><strong>원래 마감일:</strong> ${deadline}</p>
        <p><strong>지연일:</strong> ${daysOverdue}일</p>
      </div>

      <div class="penalty-box">
        <h3>⚠️ 패널티 안내</h3>
        <div class="penalty-list">
          <ul>
            <li><strong>1일 지연</strong> - 보상금의 10% 차감</li>
            <li><strong>3일 지연</strong> - 보상금의 30% 차감</li>
            <li><strong>5일 지연</strong> - 캠페인 취소 및 제품값 배상</li>
          </ul>
        </div>
        <div class="current-penalty">
          현재 적용 패널티: ${penaltyText}
        </div>
      </div>

      <p><strong>빠른 시일 내에 영상을 제출해 주세요.</strong></p>
      <p>사유가 있으실 경우 관리자에게 별도 기간 연장 요청을 해주세요.<br>
      특별한 사유 없이 지연될 경우 패널티가 부과됩니다.</p>

      <center>
        <a href="https://cnec.co.kr/creator/campaigns" class="button">🎬 지금 바로 영상 제출하기</a>
      </center>

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
    subject: `🚨 [${urgencyLevel}] ${campaignName} - 영상 제출 ${daysOverdue}일 지연 (패널티: ${penaltyText})`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`지연 이메일 발송 성공: ${to}`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`지연 이메일 발송 실패: ${to}`, error.message);
    return { success: false, error: error.message };
  }
};

// 카카오톡 알림 발송 함수
const sendKakaoNotification = (receiverNum, receiverName, campaignName, deadline) => {
  return new Promise((resolve, reject) => {
    const templateCode = '025100001021';
    const content = `[CNEC] 참여하신 캠페인 제출 기한 지연
${receiverName}님, 참여하신 캠페인의 영상 제출 기한이 지연되었습니다.

캠페인: ${campaignName}
제출 기한: ${deadline}

패널티예정
1일 지연시 보상금의 10% 차감
3일 지연시 보상금의 30% 차감
5일 지연시 캠페인 취소 및 제품값 배상

빠른 시일 내에 영상을 제출해 주세요.
추가 지연 시 패널티가 증가합니다.

사유가 있으실 경우 관리자에게 별도 기간 연장 요청을 해주세요.
특별한 사유 없이 지연 될 경우 패널티 부과 됩니다.

문의: 1833-6025`;

    kakaoService.sendATS_one(
      POPBILL_CORP_NUM,
      templateCode,
      POPBILL_SENDER_NUM,
      content,
      content,
      'C',
      '',
      receiverNum.replace(/-/g, ''),
      receiverName || '',
      POPBILL_USER_ID,
      '',
      null,
      (receiptNum) => {
        console.log(`지연 알림톡 발송 성공: ${receiverNum}`, receiptNum);
        resolve({ receiptNum });
      },
      (error) => {
        console.error(`지연 알림톡 발송 실패: ${receiverNum}`, error);
        reject(error);
      }
    );
  });
};

const { checkDuplicate, skipResponse } = require('./lib/scheduler-dedup');

// 메인 핸들러
exports.handler = async (event, context) => {
  const executionTime = new Date();
  console.log('==========================================');
  console.log('=== 🚨 영상 제출 지연 알림 스케줄러 시작 🚨 ===');
  console.log('==========================================');
  console.log('실행 시간 (KST):', executionTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  // ★ 중복 실행 방지 (인메모리 + DB)
  const { isDuplicate, reason } = await checkDuplicate('scheduled-video-overdue-notification', event);
  if (isDuplicate) return skipResponse(reason);

  try {
    // 오늘 날짜 (한국 시간 기준)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = new Date(koreaTime);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log('\n=== 지연 캠페인 전체 조회 (멀티 리전) ===');
    console.log('오늘:', todayStr);

    // 멀티 리전 지원: Korea, Japan, US DB 모두 조회
    const regions = [
      { name: 'korea', url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY },
      { name: 'japan', url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY },
      { name: 'us', url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY }
    ];

    let allCampaigns = [];
    const regionClients = {};

    for (const region of regions) {
      if (!region.url || !region.key) {
        console.log(`${region.name} Supabase 미설정 - 건너뜀`);
        continue;
      }

      const client = createClient(region.url, region.key);
      regionClients[region.name] = client;

      const { data: regionCampaigns, error: campaignError } = await client
        .from('campaigns')
        .select('id, title, company_email, campaign_type, content_submission_deadline, video_deadline, sns_deadline, week1_deadline, week2_deadline, week3_deadline, week4_deadline, step1_deadline, step2_deadline')
        .in('status', ['active', 'recruiting', 'approved']);

      if (campaignError) {
        console.error(`${region.name} 캠페인 조회 오류:`, campaignError);
        continue;
      }

      if (regionCampaigns && regionCampaigns.length > 0) {
        regionCampaigns.forEach(c => c.region = region.name);
        allCampaigns.push(...regionCampaigns);
      }
      console.log(`[${region.name}] ${(regionCampaigns || []).length}개 활성 캠페인 조회됨`);
    }

    console.log(`총 ${allCampaigns.length}개 활성 캠페인 조회됨 (전체 리전)`);

    // 지연일 계산 함수
    const calcDaysOverdue = (deadlineStr) => {
      if (!deadlineStr) return null;
      const deadline = new Date(deadlineStr);
      deadline.setHours(0, 0, 0, 0);
      const diff = Math.floor((today - deadline) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : null; // 양수일 때만 지연
    };

    // 마감일이 지난 캠페인과 지연일 정보 수집
    const overdueCampaigns = [];
    for (const campaign of (allCampaigns || [])) {
      const type = (campaign.campaign_type || '').toLowerCase();

      if (type.includes('4week') || type.includes('challenge')) {
        // 4주 챌린지: 각 주차별 확인
        [campaign.week1_deadline, campaign.week2_deadline, campaign.week3_deadline, campaign.week4_deadline].forEach((deadline, idx) => {
          const daysOverdue = calcDaysOverdue(deadline);
          if (daysOverdue) {
            overdueCampaigns.push({
              ...campaign,
              overdueDeadline: deadline,
              daysOverdue,
              weekNumber: idx + 1,
              label: `${daysOverdue}일 지연`
            });
          }
        });
      } else if (type.includes('olive') || type.includes('올리브')) {
        // 올리브영: step1, step2 확인
        [campaign.step1_deadline, campaign.step2_deadline].forEach((deadline, idx) => {
          const daysOverdue = calcDaysOverdue(deadline);
          if (daysOverdue) {
            overdueCampaigns.push({
              ...campaign,
              overdueDeadline: deadline,
              daysOverdue,
              stepNumber: idx + 1,
              label: `${daysOverdue}일 지연`
            });
          }
        });
      } else {
        // 기획형: content_submission_deadline, video_deadline, sns_deadline 모두 확인
        const deadlineFields = [
          { field: 'content_submission_deadline', value: campaign.content_submission_deadline },
          { field: 'video_deadline', value: campaign.video_deadline },
          { field: 'sns_deadline', value: campaign.sns_deadline }
        ];

        for (const { field, value } of deadlineFields) {
          const daysOverdue = calcDaysOverdue(value);
          if (daysOverdue) {
            overdueCampaigns.push({
              ...campaign,
              overdueDeadline: value,
              overdueField: field,
              daysOverdue,
              label: `${daysOverdue}일 지연`
            });
          }
        }
      }
    }

    console.log(`지연 캠페인: ${overdueCampaigns.length}건 발견`);

    const allResults = [];

    for (const campaign of overdueCampaigns) {
      const { daysOverdue, label, overdueDeadline, weekNumber, stepNumber } = campaign;

      // 해당 리전의 Supabase 클라이언트 사용
      const regionClient = regionClients[campaign.region];
      if (!regionClient) {
        console.log(`리전 클라이언트 없음: ${campaign.region} - 건너뜀`);
        continue;
      }

      // 마감일 유형에 따라 대상 application 상태 결정
      const isSnsOverdue = campaign.overdueField === 'sns_deadline';
      const targetStatuses = isSnsOverdue
        ? ['video_approved', 'approved', 'video_submitted']
        : ['filming', 'selected', 'guide_approved'];

      const { data: applications, error: appError } = await regionClient
        .from('applications')
        .select('id, user_id, campaign_id, status, sns_upload_url')
        .eq('campaign_id', campaign.id)
        .in('status', targetStatuses);

      if (appError || !applications || applications.length === 0) {
        continue;
      }

      console.log(`\n=== ${campaign.title} (${label}) - ${applications.length}명 대상 ===`);

      for (const app of applications) {
        try {
          // user_profiles에서 크리에이터 정보 조회
          const { data: profile } = await regionClient
            .from('user_profiles')
            .select('name, email, phone')
            .eq('id', app.user_id)
            .maybeSingle();

          let creatorProfile = profile;
          if (!creatorProfile) {
            const { data: profile2 } = await regionClient
              .from('user_profiles')
              .select('name, email, phone')
              .eq('user_id', app.user_id)
              .maybeSingle();
            creatorProfile = profile2;
          }

          if (!creatorProfile) {
            console.log(`크리에이터 정보 없음 (user_id: ${app.user_id})`);
            continue;
          }

          const creatorName = creatorProfile.name || '크리에이터';
          const creatorPhone = creatorProfile.phone;
          const creatorEmail = creatorProfile.email;

          if (!creatorPhone && !creatorEmail) {
            continue;
          }

          // SNS 업로드 지연인 경우: SNS 업로드 여부 확인
          if (isSnsOverdue) {
            if (app.sns_upload_url) {
              console.log(`✓ SNS 업로드 완료: ${creatorName} - 건너뜀`);
              continue;
            }

            // video_submissions에서도 sns_upload_url 확인
            const { data: videoSubs } = await regionClient
              .from('video_submissions')
              .select('id, sns_upload_url')
              .eq('campaign_id', app.campaign_id)
              .eq('user_id', app.user_id)
              .not('sns_upload_url', 'is', null);

            if (videoSubs && videoSubs.length > 0) {
              console.log(`✓ SNS 업로드 완료 (video_submissions): ${creatorName} - 건너뜀`);
              continue;
            }
          } else {
            // 영상 제출 지연인 경우: 영상 제출 여부 확인
            let submissionQuery = regionClient
              .from('video_submissions')
              .select('id')
              .eq('campaign_id', app.campaign_id)
              .eq('user_id', app.user_id);

            if (weekNumber) {
              submissionQuery = submissionQuery.eq('week_number', weekNumber);
            } else if (stepNumber) {
              submissionQuery = submissionQuery.eq('video_number', stepNumber);
            }

            const { data: submissions } = await submissionQuery;

            if (submissions && submissions.length > 0) {
              console.log(`✓ 영상 제출 완료: ${creatorName} - 건너뜀`);
              continue;
            }
          }

          const deadlineStr = getDatePart(overdueDeadline);
          const deadlineFormatted = deadlineStr ? deadlineStr.replace(/-/g, '.') : '';
          const isKorea = campaign.region === 'korea';

          // 알림톡 발송 (한국만 — 일본/미국은 LINE/WhatsApp 사용 예정)
          let kakaoSent = false;
          if (isKorea && creatorPhone) {
            try {
              await sendKakaoNotification(creatorPhone, creatorName, campaign.title, deadlineFormatted);
              console.log(`🚨 지연 알림톡 발송: ${creatorName} (${creatorPhone}) - ${daysOverdue}일 지연`);
              kakaoSent = true;
            } catch (e) {
              console.error(`알림톡 실패: ${creatorName}`, e.message);
            }
          } else if (!isKorea) {
            console.log(`ℹ️ ${campaign.region} 리전 - 카카오 알림톡 건너뜀 (${creatorName})`);
          }

          // 이메일 발송 (한국만)
          let emailSent = false;
          if (isKorea && creatorEmail) {
            try {
              await sendOverdueEmail(creatorEmail, creatorName, campaign.title, deadlineFormatted, daysOverdue);
              console.log(`🚨 지연 이메일 발송: ${creatorName} (${creatorEmail}) - ${daysOverdue}일 지연`);
              emailSent = true;
            } catch (e) {
              console.error(`이메일 실패: ${creatorName}`, e.message);
            }
          } else if (!isKorea) {
            console.log(`ℹ️ ${campaign.region} 리전 - 이메일 건너뜀 (${creatorName})`);
          }

          // 한국: 알림톡/이메일 발송 결과 기록, 일본/미국: 네이버웍스 보고서용으로 기록
          if (kakaoSent || emailSent || !isKorea) {
            allResults.push({
              creatorName,
              campaignName: campaign.title,
              deadline: deadlineStr,
              daysOverdue,
              label,
              region: campaign.region,
              phone: creatorPhone,
              email: creatorEmail,
              kakaoSent,
              emailSent
            });
          }
        } catch (error) {
          console.error(`처리 오류:`, error);
        }
      }
    }

    console.log('\n==========================================');
    console.log('=== 🚨 지연 알림 완료 🚨 ===');
    console.log('==========================================');
    console.log(`총 발송: ${allResults.length}건`);

    // 네이버 웍스 보고서 전송
    try {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID;
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
      const botId = process.env.NAVER_WORKS_BOT_ID;
      const channelId = process.env.NAVER_WORKS_CHANNEL_ID;
      const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

      if (clientId && clientSecret && botId && channelId && allResults.length > 0) {
        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let reportMessage = `🚨🚨🚨 영상 제출 지연 크리에이터 경고 🚨🚨🚨\n\n`;
        reportMessage += `일시: ${koreanDate}\n`;
        reportMessage += `총 지연 크리에이터: ${allResults.length}명\n\n`;
        reportMessage += `━━━━━━━━━━━━━━━━━━━━\n`;

        // 지연일별 그룹화
        const groupedByDays = {};
        allResults.forEach(r => {
          if (!groupedByDays[r.daysOverdue]) {
            groupedByDays[r.daysOverdue] = [];
          }
          groupedByDays[r.daysOverdue].push(r);
        });

        // 지연일 오름차순 정렬
        const sortedDays = Object.keys(groupedByDays).map(Number).sort((a, b) => a - b);

        for (const days of sortedDays) {
          const results = groupedByDays[days];
          let emoji = '⚠️';
          let penalty = '10% 차감';
          if (days >= 5) {
            emoji = '🔴';
            penalty = '캠페인 취소/제품값 배상';
          } else if (days >= 3) {
            emoji = '🔶';
            penalty = '30% 차감';
          }

          reportMessage += `\n${emoji} ${days}일 지연 (${results.length}명) - ${penalty}\n`;
          results.forEach(r => {
            reportMessage += `  • ${r.creatorName}\n`;
            reportMessage += `    캠페인: ${r.campaignName}\n`;
            reportMessage += `    마감일: ${r.deadline}\n`;
          });
        }

        reportMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        reportMessage += `📌 크리에이터에게 패널티 안내 알림톡 및 이메일 발송 완료`;

        const accessToken = await getNaverWorksAccessToken(clientId, clientSecret, serviceAccount);
        await sendNaverWorksMessage(accessToken, botId, channelId, reportMessage);
        console.log('네이버 웍스 경고 보고서 전송 완료');
      }
    } catch (worksError) {
      console.error('네이버 웍스 전송 실패:', worksError);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '영상 제출 지연 알림 발송 완료',
        total: allResults.length,
        results: allResults
      })
    };

  } catch (error) {
    console.error('스케줄러 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
