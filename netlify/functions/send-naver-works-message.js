const crypto = require('crypto');
const https = require('https');

/**
 * 네이버웍스 메시지 전송 Netlify Function
 * 추천 크리에이터 문의를 네이버웍스 메시지방으로 전송
 */

// JWT 토큰 생성 함수
function generateJWT() {
  const privateKey = process.env.NAVER_WORKS_PRIVATE_KEY.replace(/\\n/g, '\n');
  const clientId = process.env.NAVER_WORKS_CLIENT_ID;
  const serviceAccount = process.env.NAVER_WORKS_SERVICE_ACCOUNT;

  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: serviceAccount,
    iat: now,
    exp: now + 3600, // 1시간 후 만료
    scope: 'bot'
  };

  // Base64 URL 인코딩
  function base64UrlEncode(str) {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // JWT 생성
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  sign.end();

  const signature = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

// Access Token 발급 함수
async function getAccessToken(jwt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    });

    const options = {
      hostname: 'auth.worksmobile.com',
      path: '/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('Access token not found in response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
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
    const { creators, companyName, brandName } = JSON.parse(event.body);

    if (!creators || creators.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '크리에이터를 선택해주세요.' })
      };
    }

    // 환경 변수 확인
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const channelId = process.env.NAVER_WORKS_CHANNEL_ID;

    if (!botId || !channelId) {
      throw new Error('네이버웍스 설정이 누락되었습니다.');
    }

    // JWT 생성
    const jwt = generateJWT();

    // Access Token 발급
    const accessToken = await getAccessToken(jwt);

    // 메시지 작성
    const creatorNames = creators.map(c => c.name).join(', ');
    const koreanDate = new Date().toLocaleString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `${companyName || '기업명 미입력'} / ${brandName || '브랜드명 미입력'} - ${creatorNames}\n\n${companyName || '기업'}의 ${brandName || '브랜드'}가 추천 크리에이터에서 선택하였습니다.\n\n${koreanDate}`;

    // 메시지 전송
    await sendMessage(accessToken, botId, channelId, message);

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
