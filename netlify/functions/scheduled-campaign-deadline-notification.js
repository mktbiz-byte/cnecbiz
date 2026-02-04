/**
 * 매일 오전 10시(한국시간) 실행 - 캠페인 모집 마감 알림
 * Netlify Scheduled Function
 *
 * Cron: 0 1 * * * (UTC 1시 = 한국시간 10시)
 *
 * 기능:
 * - 오늘이 모집 마감일(application_deadline)인 캠페인 조회
 * - 해당 캠페인의 기업에게 카카오톡 알림 발송
 * - 해당 캠페인의 기업에게 이메일 발송
 * - 템플릿: 025100001006 (모집 마감 크리에이터 선정 요청)
 */

const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');
const nodemailer = require('nodemailer');
const https = require('https');
const crypto = require('crypto');

// 팝빌 설정
const POPBILL_LINK_ID = process.env.POPBILL_LINK_ID || 'HOWLAB';
const POPBILL_SECRET_KEY = process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=';
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || '';

// 팝빌 전역 설정 (sendATS_one 사용 시 필수)
popbill.config({
  LinkID: POPBILL_LINK_ID,
  SecretKey: POPBILL_SECRET_KEY,
  IsTest: false, // 운영환경
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true
});

// 팝빌 카카오톡 서비스 초기화
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
  const supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }
  return null;
};

// BIZ DB 클라이언트 (기업 정보 조회용)
const getSupabaseBiz = () => {
  const bizUrl = process.env.VITE_SUPABASE_BIZ_URL;
  const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_BIZ_ANON_KEY;
  if (bizUrl && bizKey) {
    return createClient(bizUrl, bizKey);
  }
  return null;
};

// 이메일 발송 함수
const sendEmail = async (to, companyName, campaignTitle, applicantCount) => {
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
    .stat { font-size: 36px; font-weight: bold; color: #667eea; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📢 캠페인 모집 마감 안내</h1>
    </div>
    <div class="content">
      <p><strong>${companyName}</strong>님, 안녕하세요!</p>
      <p>신청하신 캠페인의 크리에이터 모집이 마감되었습니다.</p>

      <div class="highlight-box">
        <p><strong>캠페인:</strong> ${campaignTitle}</p>
        <p><strong>지원 크리에이터:</strong> <span class="stat">${applicantCount}</span>명</p>
      </div>

      <p>관리자 페이지에서 지원한 크리에이터 리스트를 확인하시고, 최종 선정을 진행해 주세요.</p>

      <a href="https://cnec.co.kr/company/campaigns" class="button">크리에이터 선정하기 →</a>

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
    subject: `[CNEC] ${campaignTitle} 캠페인 모집 마감 - 크리에이터 선정을 진행해 주세요`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`이메일 발송 성공: ${to}`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`이메일 발송 실패: ${to}`, error.message);
    return { success: false, error: error.message };
  }
};

// 카카오톡 알림 발송 함수 (sendATS_one 사용 - send-kakao-notification.js와 동일)
const sendKakaoNotification = (receiverNum, receiverName, templateCode, variables) => {
  return new Promise((resolve, reject) => {
    // 템플릿 내용 (팝빌 등록된 템플릿과 정확히 일치해야 함)
    const templateContent = `[CNEC] 신청하신 캠페인 모집 마감
#{회사명}님, 신청하신 캠페인의 크리에이터 모집이 마감되었습니다.
캠페인: #{캠페인명}
지원 크리에이터: #{지원자수}명
관리자 페이지에서 지원한 크리에이터 리스트를 확인하시고, 최종 선정을 진행해 주세요.
문의: 1833-6025`;

    // 변수 치환
    let content = templateContent;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
    }

    // 전화번호 형식 정리 (숫자만 남기기: 하이픈, 공백, 괄호 등 모두 제거)
    const cleanPhoneNum = receiverNum.replace(/[^0-9]/g, '');

    console.log(`[sendKakaoNotification] 원본 번호: "${receiverNum}" → 정리 후: "${cleanPhoneNum}", 템플릿: ${templateCode}`);
    console.log(`[sendKakaoNotification] 메시지 내용:`, content);

    // 전화번호 유효성 검사
    if (!cleanPhoneNum || cleanPhoneNum.length < 10) {
      console.error(`[sendKakaoNotification] 유효하지 않은 전화번호: "${cleanPhoneNum}" (원본: "${receiverNum}")`);
      reject(new Error(`유효하지 않은 전화번호: ${cleanPhoneNum}`));
      return;
    }

    // sendATS_one 사용 (send-kakao-notification.js와 동일한 방식)
    kakaoService.sendATS_one(
      POPBILL_CORP_NUM,
      templateCode,
      POPBILL_SENDER_NUM,
      content,
      content, // altContent (대체 문자)
      'C', // altSendType: C=동일내용
      '', // requestNum
      cleanPhoneNum,
      receiverName || '',
      POPBILL_USER_ID,
      '', // reserveDT (예약시간, 빈값=즉시발송)
      null, // btns
      (receiptNum) => {
        console.log(`[sendKakaoNotification] 알림톡 발송 성공: ${cleanPhoneNum}`, receiptNum);
        resolve({ receiptNum });
      },
      (error) => {
        console.error(`[sendKakaoNotification] 알림톡 발송 실패: ${cleanPhoneNum}`, error);
        reject(error);
      }
    );
  });
};

// 메인 핸들러
exports.handler = async (event, context) => {
  console.log('=== 캠페인 모집 마감 알림 스케줄러 시작 ===');
  console.log('실행 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    // 오늘 날짜 (한국 시간 기준)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('오늘 날짜 (한국시간):', today);

    // 다중 지역 Supabase 클라이언트 생성
    const regions = [
      { name: 'korea', url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY },
      { name: 'japan', url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY },
      { name: 'us', url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY }
    ];

    // 모든 지역에서 캠페인 조회
    let allCampaigns = [];
    for (const region of regions) {
      if (!region.url || !region.key) {
        console.log(`${region.name} Supabase 미설정 - 건너뜀`);
        continue;
      }

      const supabase = createClient(region.url, region.key);
      console.log(`${region.name} 지역에서 캠페인 조회 중...`);

      // 리전별 스키마 차이 처리: 기본 컬럼만 조회
      let selectQuery = 'id, title, status, application_deadline';

      // 추가 컬럼은 리전에 따라 조건부로 포함
      if (region.name === 'korea') {
        selectQuery += ', brand, product_name, company_id, company_email';
      } else if (region.name === 'us') {
        selectQuery += ', brand, product_name, company_id';  // company_email 없음
      } else if (region.name === 'japan') {
        selectQuery += ', brand, product_name, company_email';  // company_id 없음
      }

      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select(selectQuery)
        .eq('application_deadline', today)
        .in('status', ['active', 'approved']);  // 프론트엔드 "진행중" 필터와 동일

      if (campaignError) {
        console.error(`${region.name} 캠페인 조회 오류:`, campaignError);
        continue;
      }

      if (campaigns && campaigns.length > 0) {
        console.log(`${region.name}: ${campaigns.length}개 캠페인 발견`);
        // 지역 정보 추가
        campaigns.forEach(c => c.region = region.name);
        allCampaigns.push(...campaigns);
      } else {
        console.log(`${region.name}: 마감 캠페인 없음`);
      }
    }

    const campaigns = allCampaigns;
    console.log(`전체 오늘 마감되는 캠페인 수: ${campaigns.length}`);

    if (!campaigns || campaigns.length === 0) {
      console.log('오늘 마감되는 캠페인이 없습니다.');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '오늘 마감되는 캠페인이 없습니다.' })
      };
    }

    const results = [];

    for (const campaign of campaigns) {
      try {
        console.log(`\n처리 중인 캠페인: ${campaign.title} (ID: ${campaign.id}, Region: ${campaign.region})`);

        // 해당 캠페인의 지역 Supabase 클라이언트 생성
        const regionConfig = regions.find(r => r.name === campaign.region);
        const supabase = createClient(regionConfig.url, regionConfig.key);

        // 해당 캠페인의 지원자 수 조회
        const { count: applicantCount, error: countError } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);

        if (countError) {
          console.error(`지원자 수 조회 실패 (캠페인 ${campaign.id}):`, countError);
          // 지원자 수를 0으로 처리하고 계속 진행
        }

        console.log(`지원자 수: ${applicantCount || 0}명`);

        // 기업 정보 조회 (전화번호, 회사명, 이메일)
        // ★ BIZ DB에서 우선 조회 (다른 함수들과 동일하게)
        let companyPhone = null;
        let companyEmail = campaign.company_email || null;
        let companyName = campaign.brand || '기업';

        const supabaseBiz = getSupabaseBiz();

        // 1. BIZ DB에서 company_email로 조회 (가장 확실한 방법)
        if (supabaseBiz && companyEmail) {
          const { data: bizCompany, error: bizError } = await supabaseBiz
            .from('companies')
            .select('company_name, phone, contact_phone, manager_phone, representative_phone, email, notification_phone')
            .eq('email', companyEmail.toLowerCase())
            .maybeSingle();

          if (!bizError && bizCompany) {
            companyPhone = bizCompany.contact_phone || bizCompany.manager_phone || bizCompany.phone || bizCompany.notification_phone || bizCompany.representative_phone;
            companyName = bizCompany.company_name || companyName;
            console.log(`[BIZ DB] 이메일로 기업 정보 찾음: ${companyName}, 전화번호: ${companyPhone}`);
          }
        }

        // 2. BIZ DB에서 company_id로 조회 (company_email로 못 찾은 경우)
        if (supabaseBiz && !companyPhone && campaign.company_id) {
          // 2-1. user_id로 조회
          const { data: bizCompanyByUserId, error: bizError1 } = await supabaseBiz
            .from('companies')
            .select('company_name, phone, contact_phone, manager_phone, representative_phone, email, notification_phone')
            .eq('user_id', campaign.company_id)
            .maybeSingle();

          if (!bizError1 && bizCompanyByUserId) {
            companyPhone = bizCompanyByUserId.contact_phone || bizCompanyByUserId.manager_phone || bizCompanyByUserId.phone || bizCompanyByUserId.notification_phone || bizCompanyByUserId.representative_phone;
            companyName = bizCompanyByUserId.company_name || companyName;
            companyEmail = companyEmail || bizCompanyByUserId.email;
            console.log(`[BIZ DB] user_id로 기업 정보 찾음: ${companyName}, 전화번호: ${companyPhone}`);
          }

          // 2-2. id로 조회 (레거시 데이터 호환)
          if (!companyPhone) {
            const { data: bizCompanyById, error: bizError2 } = await supabaseBiz
              .from('companies')
              .select('company_name, phone, contact_phone, manager_phone, representative_phone, email, notification_phone')
              .eq('id', campaign.company_id)
              .maybeSingle();

            if (!bizError2 && bizCompanyById) {
              companyPhone = bizCompanyById.contact_phone || bizCompanyById.manager_phone || bizCompanyById.phone || bizCompanyById.notification_phone || bizCompanyById.representative_phone;
              companyName = bizCompanyById.company_name || companyName;
              companyEmail = companyEmail || bizCompanyById.email;
              console.log(`[BIZ DB] id로 기업 정보 찾음: ${companyName}, 전화번호: ${companyPhone}`);
            }
          }
        }

        // 3. 지역 DB에서 보조 조회 (BIZ DB에서 못 찾은 경우)
        if (!companyPhone && campaign.company_id) {
          // 3-1. user_id로 조회 (company_id는 auth user.id를 저장)
          const { data: companyByUserId, error: companyError1 } = await supabase
            .from('companies')
            .select('company_name, phone, contact_phone, manager_phone, representative_phone, email, notification_phone')
            .eq('user_id', campaign.company_id)
            .maybeSingle();

          if (!companyError1 && companyByUserId) {
            companyPhone = companyByUserId.contact_phone || companyByUserId.manager_phone || companyByUserId.phone || companyByUserId.notification_phone || companyByUserId.representative_phone;
            companyName = companyByUserId.company_name || campaign.brand || '기업';
            companyEmail = companyEmail || companyByUserId.email;
            console.log(`[지역 DB] user_id로 기업 정보 찾음: ${companyName}, 전화번호: ${companyPhone}`);
          }

          // 3-2. user_id로 못 찾으면 id로 재시도 (레거시 데이터 호환)
          if (!companyPhone && !companyEmail) {
            const { data: companyById, error: companyError2 } = await supabase
              .from('companies')
              .select('company_name, phone, contact_phone, manager_phone, representative_phone, email, notification_phone')
              .eq('id', campaign.company_id)
              .maybeSingle();

            if (!companyError2 && companyById) {
              companyPhone = companyById.contact_phone || companyById.manager_phone || companyById.phone || companyById.notification_phone || companyById.representative_phone;
              companyName = companyById.company_name || campaign.brand || '기업';
              companyEmail = companyEmail || companyById.email;
            }
          }

          // 3-3. user_profiles에서도 조회
          if (!companyPhone || !companyEmail) {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('phone, email')
              .eq('id', campaign.company_id)
              .maybeSingle();

            if (!profileError && profile) {
              companyPhone = companyPhone || profile.phone;
              companyEmail = companyEmail || profile.email;
            }
          }
        }

        // 4. company_email로 지역 DB companies 테이블에서 조회 (일본 등 company_id 없는 경우)
        if ((!companyPhone || !companyName || companyName === '기업') && companyEmail) {
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('company_name, phone, contact_phone, manager_phone, representative_phone, email, notification_phone')
            .eq('email', companyEmail)
            .maybeSingle();

          if (!companyError && company) {
            companyPhone = companyPhone || company.contact_phone || company.manager_phone || company.phone || company.notification_phone || company.representative_phone;
            companyName = company.company_name || companyName;
          }
        }

        // 5. BIZ DB user_profiles에서도 조회 (최후 수단)
        if (!companyPhone && supabaseBiz && campaign.company_id) {
          const { data: bizProfile, error: bizProfileError } = await supabaseBiz
            .from('user_profiles')
            .select('phone, email')
            .eq('id', campaign.company_id)
            .maybeSingle();

          if (!bizProfileError && bizProfile) {
            companyPhone = companyPhone || bizProfile.phone;
            companyEmail = companyEmail || bizProfile.email;
            console.log(`[BIZ DB] user_profiles에서 찾음: 전화번호=${bizProfile.phone}, 이메일=${bizProfile.email}`);
          }
        }

        // 전화번호가 있으면 숫자만 남기기 (미리 정리)
        if (companyPhone) {
          const originalPhone = companyPhone;
          companyPhone = companyPhone.replace(/[^0-9]/g, '');
          if (originalPhone !== companyPhone) {
            console.log(`[전화번호 정리] "${originalPhone}" → "${companyPhone}"`);
          }
        }

        console.log(`[최종] 기업 정보 - 이름: ${companyName}, 전화번호: ${companyPhone || 'NONE'}, 이메일: ${companyEmail || 'NONE'}`);

        // 알림 발송 결과 추적
        let kakaoSent = false;
        let emailSent = false;

        // 1. 카카오톡 알림 발송
        if (companyPhone) {
          try {
            const variables = {
              '회사명': companyName,
              '캠페인명': campaign.title,
              '지원자수': (applicantCount || 0).toString()
            };

            await sendKakaoNotification(
              companyPhone,
              companyName,
              '025100001006',
              variables
            );
            kakaoSent = true;
            console.log(`알림톡 발송 완료: ${companyName} (${companyPhone})`);
          } catch (kakaoError) {
            console.error(`알림톡 발송 실패: ${companyName}`, kakaoError.message);
          }
        } else {
          console.log(`전화번호 없음 - 알림톡 발송 생략: ${companyName}`);
        }

        // 2. 이메일 발송
        if (companyEmail) {
          try {
            const emailResult = await sendEmail(
              companyEmail,
              companyName,
              campaign.title,
              applicantCount || 0
            );
            emailSent = emailResult.success;
            console.log(`이메일 발송 ${emailSent ? '완료' : '실패'}: ${companyEmail}`);
          } catch (emailError) {
            console.error(`이메일 발송 실패: ${companyEmail}`, emailError.message);
          }
        } else {
          console.log(`이메일 없음 - 이메일 발송 생략: ${companyName}`);
        }

        // 결과 기록
        if (!kakaoSent && !emailSent) {
          results.push({
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            companyName: companyName,
            status: 'skipped',
            reason: '연락처 없음 (전화번호/이메일 모두 없음)'
          });
        } else {
          results.push({
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            companyName: companyName,
            applicantCount: applicantCount || 0,
            status: 'sent',
            kakaoSent: kakaoSent,
            emailSent: emailSent
          });
        }

      } catch (error) {
        console.error(`캠페인 처리 실패 (${campaign.id}):`, error);
        results.push({
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('\n=== 캠페인 모집 마감 알림 스케줄러 완료 ===');
    console.log('결과:', JSON.stringify(results, null, 2));

    // 네이버 웍스로 보고서 전송
    try {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID;
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
      const botId = process.env.NAVER_WORKS_BOT_ID;
      const channelId = process.env.NAVER_WORKS_CHANNEL_ID;
      const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

      if (clientId && clientSecret && botId && channelId && results.length > 0) {
        // 보고서 메시지 작성
        const sentCampaigns = results.filter(r => r.status === 'sent');
        const failedCampaigns = results.filter(r => r.status === 'failed');
        const skippedCampaigns = results.filter(r => r.status === 'skipped');

        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let reportMessage = `📢 캠페인 모집 마감 알림톡 발송 완료 보고\n\n`;
        reportMessage += `일시: ${koreanDate}\n`;
        reportMessage += `총 처리: ${campaigns.length}개 캠페인\n\n`;

        if (sentCampaigns.length > 0) {
          reportMessage += `✅ 발송 완료 (${sentCampaigns.length}개):\n`;
          sentCampaigns.forEach(c => {
            const kakaoStatus = c.kakaoSent ? '카톡✓' : '카톡✗';
            const emailStatus = c.emailSent ? '메일✓' : '메일✗';
            reportMessage += `  • ${c.companyName} - ${c.campaignTitle}\n`;
            reportMessage += `    지원자: ${c.applicantCount}명 | ${kakaoStatus} ${emailStatus}\n`;
          });
          reportMessage += `\n`;
        }

        if (skippedCampaigns.length > 0) {
          reportMessage += `⚠️ 발송 생략 (${skippedCampaigns.length}개):\n`;
          skippedCampaigns.forEach(c => {
            reportMessage += `  • ${c.companyName} - ${c.campaignTitle}\n`;
            reportMessage += `    사유: ${c.reason}\n`;
          });
          reportMessage += `\n`;
        }

        if (failedCampaigns.length > 0) {
          reportMessage += `❌ 발송 실패 (${failedCampaigns.length}개):\n`;
          failedCampaigns.forEach(c => {
            reportMessage += `  • ${c.campaignTitle}\n`;
            reportMessage += `    오류: ${c.error}\n`;
          });
        }

        // Access Token 발급 및 메시지 전송
        const accessToken = await getNaverWorksAccessToken(clientId, clientSecret, serviceAccount);
        await sendNaverWorksMessage(accessToken, botId, channelId, reportMessage);
        console.log('네이버 웍스 보고서 전송 완료');
      } else if (!clientId || !clientSecret || !botId || !channelId) {
        console.log('네이버 웍스 설정이 없어 보고서 전송 생략');
      } else {
        console.log('처리된 캠페인이 없어 네이버 웍스 보고서 전송 생략');
      }
    } catch (worksError) {
      console.error('네이버 웍스 보고서 전송 실패:', worksError);
      // 보고서 전송 실패해도 스케줄러는 성공으로 처리
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '캠페인 모집 마감 알림 발송 완료',
        processedCount: campaigns.length,
        results: results
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
