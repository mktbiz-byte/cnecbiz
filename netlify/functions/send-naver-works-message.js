const https = require('https');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function logNotification(channel, status, functionName, recipient, messagePreview, errorMessage, metadata) {
  try {
    await supabaseBiz.from('notification_send_logs').insert({
      channel,
      status,
      function_name: functionName,
      recipient: recipient || null,
      message_preview: messagePreview ? messagePreview.substring(0, 200) : null,
      error_message: errorMessage || null,
      metadata: metadata || {}
    });
  } catch (e) { console.error('[logNotification] failed:', e.message); }
}

/**
 * 네이버웍스 메시지 전송 Netlify Function
 * 추천 크리에이터 문의를 네이버웍스 메시지방으로 전송
 * 
 * 환경 변수:
 * - NAVER_WORKS_CLIENT_ID: Client ID
 * - NAVER_WORKS_CLIENT_SECRET: Client Secret
 * - NAVER_WORKS_BOT_ID: Bot ID
 * - NAVER_WORKS_CHANNEL_ID: 메시지방 채널 ID (크리에이터 추천 알림용)
 * - NAVER_WORKS_CONSULTATION_CHANNEL_ID: 상담신청 전용 채널 ID (선택사항)
 */

// Private Key (환경 변수 크기 제한으로 코드에 포함)
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

// JWT 생성 함수
function generateJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const payload = {
    iss: clientId,
    sub: serviceAccount,
    iat: now,
    exp: now + 3600, // 1시간 후 만료
    scope: 'bot'
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY);
  const base64Signature = signature.toString('base64url');
  
  return `${signatureInput}.${base64Signature}`;
}

// Access Token 발급 함수
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
    req.setTimeout(8000, () => { req.destroy(new Error('Token request timeout (8s)')); });
    req.write(postData);
    req.end();
  });
}

// 메시지 전송 함수
async function sendMessage(accessToken, botId, channelId, message) {
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
    req.setTimeout(8000, () => { req.destroy(new Error('Message send timeout (8s)')); });
    req.write(postData);
    req.end();
  });
}

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 요청 본문 파싱
    const { creators, companyName, brandName, message, isAdminNotification, channelId: requestChannelId } = JSON.parse(event.body);

    // 관리자 알림인 경우 message만 사용
    if (isAdminNotification) {
      if (!message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '메시지가 필요합니다.' })
        };
      }
    } else {
      // 크리에이터 추천 알림인 경우
      if (!creators || creators.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '크리에이터를 선택해주세요.' })
        };
      }
    }

    // 환경 변수 확인
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;

    // 채널 ID 결정: 요청에서 제공된 채널 > 상담신청 채널 > 기본 채널
    const channelId = requestChannelId
      ? requestChannelId
      : (isAdminNotification
        ? (process.env.NAVER_WORKS_CONSULTATION_CHANNEL_ID || process.env.NAVER_WORKS_CHANNEL_ID)
        : process.env.NAVER_WORKS_CHANNEL_ID);
    
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

    if (!clientId || !clientSecret || !botId || !channelId) {
      throw new Error('네이버웍스 설정이 누락되었습니다.');
    }

    // Access Token 발급
    const accessToken = await getAccessToken(clientId, clientSecret, serviceAccount);

    // 메시지 작성
    let finalMessage;
    
    if (isAdminNotification) {
      // 관리자 알림은 전달받은 message 사용
      finalMessage = message;
    } else {
      // 크리에이터 추천 알림
      const creatorNames = creators.map(c => c.nickname || c.creator_name || c.name).join(', ');
      const koreanDate = new Date().toLocaleString('ko-KR', { 
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      finalMessage = `${companyName || '기업명 미입력'} / ${brandName || '브랜드명 미입력'} - ${creatorNames}\n\n${companyName || '기업'}의 ${brandName || '브랜드'}가 추천 크리에이터에서 선택하였습니다.\n\n${koreanDate}`;
    }

    // 메시지 전송
    await sendMessage(accessToken, botId, channelId, finalMessage);

    // 성공 로그
    await logNotification('naver_works', 'success', 'send-naver-works-message', channelId, finalMessage, null, { isAdminNotification });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '문의가 성공적으로 전송되었습니다.'
      })
    };

  } catch (error) {
    console.error('Error:', error);

    // 실패 로그
    try {
      const { channelId: ch, message: msg } = JSON.parse(event.body || '{}');
      await logNotification('naver_works', 'failed', 'send-naver-works-message', ch, msg, error.message);
    } catch (logErr) { /* skip */ }

    // 에러 채널로 알림 (무한루프 방지: 에러 채널 자체 실패 시에는 알림 안 보냄)
    const ERROR_CHANNEL_ID = '54220a7e-0b14-1138-54ec-a55f62dc8b75';
    try {
      const { channelId: requestChannelId, message: origMessage } = JSON.parse(event.body || '{}');
      if (requestChannelId !== ERROR_CHANNEL_ID) {
        const clientId = process.env.NAVER_WORKS_CLIENT_ID;
        const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
        const botId = process.env.NAVER_WORKS_BOT_ID;
        const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

        if (clientId && clientSecret && botId) {
          const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
          const preview = origMessage ? origMessage.substring(0, 100) : '(메시지 없음)';
          const errorAlert = `🚨 네이버웍스 메시지 전송 실패\n\n[시간] ${koreanTime}\n[대상 채널] ${requestChannelId || '기본'}\n[오류] ${error.message}\n[메시지 미리보기] ${preview}`;

          const token = await getAccessToken(clientId, clientSecret, serviceAccount);
          await sendMessage(token, botId, ERROR_CHANNEL_ID, errorAlert);
          console.log('[send-naver-works-message] Error alert sent to error channel');
        }
      }
    } catch (alertErr) {
      console.error('[send-naver-works-message] Failed to send error alert:', alertErr.message);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '메시지 전송에 실패했습니다.',
        details: error.message
      })
    };
  }
};
