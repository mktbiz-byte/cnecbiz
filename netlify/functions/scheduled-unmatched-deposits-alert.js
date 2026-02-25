/**
 * 매일 오후 4시(한국시간) 실행되는 미매칭 입금 건 알림
 * Netlify Scheduled Function
 * 
 * Cron: 0 7 * * * (UTC 7시 = 한국시간 16시)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 네이버 웍스 Private Key
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

console.log('Scheduled function: unmatched-deposits-alert initialized');

/**
 * JWT 생성
 */
function generateJWT(clientId, serviceAccount) {
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
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY);
  const base64Signature = signature.toString('base64url');
  
  return `${signatureInput}.${base64Signature}`;
}

/**
 * Access Token 발급
 */
async function getAccessToken(clientId, clientSecret, serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT(clientId, serviceAccount);
    
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

/**
 * 네이버 웍스 메시지 전송
 */
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

/**
 * Gmail API로 이메일 전송
 */
async function sendEmail(to, subject, body) {
  try {
    const response = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body })
    });

    if (!response.ok) {
      throw new Error(`이메일 전송 실패: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('이메일 전송 오류:', error);
    throw error;
  }
}

/**
 * 메인 핸들러
 */
exports.handler = async (event, context) => {
  console.log('🔔 [UNMATCHED-ALERT] 미매칭 입금 건 알림 시작');

  try {
    // 오늘 날짜 (한국시간)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const todayStr = koreaTime.toISOString().split('T')[0];

    console.log(`📅 확인 날짜: ${todayStr}`);

    // 미매칭 입금 건 조회 (당일 입금 건만)
    const { data: unmatchedDeposits, error } = await supabaseAdmin
      .from('bank_transactions')
      .select('*')
      .is('matched_request_id', null)
      .eq('trade_date', todayStr)  // 당일 입금 건만 조회
      .order('trade_date', { ascending: false });

    if (error) {
      console.error('❌ 미매칭 입금 조회 오류:', error);
      throw error;
    }

    if (!unmatchedDeposits || unmatchedDeposits.length === 0) {
      console.log('✅ 미매칭 입금 건 없음');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '미매칭 입금 건 없음' })
      };
    }

    console.log(`⚠️  미매칭 입금 건 ${unmatchedDeposits.length}건 발견`);

    // 메시지 작성
    const koreanDate = koreaTime.toLocaleString('ko-KR', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `⚠️ 미매칭 입금 건 알림 (${koreanDate})\n\n`;
    message += `총 ${unmatchedDeposits.length}건의 미매칭 입금이 있습니다.\n\n`;

    unmatchedDeposits.forEach((deposit, index) => {
      const date = new Date(deposit.trade_date).toLocaleDateString('ko-KR');
      message += `${index + 1}. ${date} - ${deposit.briefs} / ${deposit.trade_balance.toLocaleString()}원\n`;
    });

    message += `\n관리자 페이지에서 확인해주세요:\nhttps://cnectotal.netlify.app/admin/deposits`;

    // 네이버 웍스 메시지 전송
    try {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID;
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
      const botId = process.env.NAVER_WORKS_BOT_ID;
      const channelId = process.env.NAVER_WORKS_CHANNEL_ID;
      const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

      const accessToken = await getAccessToken(clientId, clientSecret, serviceAccount);
      await sendNaverWorksMessage(accessToken, botId, channelId, message);
      console.log('✅ 네이버 웍스 메시지 전송 완료');
    } catch (naverError) {
      console.error('❌ 네이버 웍스 전송 실패:', naverError);
    }

    // 이메일 전송
    try {
      const emailBody = message.replace(/\n/g, '<br>');
      await sendEmail(
        'mkt@howlab.co.kr',
        `⚠️ 미매칭 입금 건 ${unmatchedDeposits.length}건 알림`,
        emailBody
      );
      console.log('✅ 이메일 전송 완료');
    } catch (emailError) {
      console.error('❌ 이메일 전송 실패:', emailError);
    }

    console.log('🎉 미매칭 입금 알림 완료');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        unmatchedCount: unmatchedDeposits.length,
        message: '알림 전송 완료'
      })
    };

  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
