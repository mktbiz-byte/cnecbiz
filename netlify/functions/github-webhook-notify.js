/**
 * GitHub Webhook → 네이버 웍스 알림
 *
 * GitHub에서 push 이벤트 발생 시 네이버 웍스 채널에 업데이트 요약을 전송합니다.
 *
 * GitHub Webhook 설정:
 * - Payload URL: https://cnecbiz.com/.netlify/functions/github-webhook-notify
 * - Content type: application/json
 * - Events: push
 */

const https = require('https');
const crypto = require('crypto');

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

// 네이버 웍스 업데이트 알림 전용 채널
const UPDATE_CHANNEL_ID = '54220a7e-0b14-1138-54ec-a55f62dc8b75';

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
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), NAVER_WORKS_PRIVATE_KEY);

  return `${signatureInput}.${signature.toString('base64url')}`;
}

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

    const req = https.request({
      hostname: 'auth.worksmobile.com',
      path: '/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).access_token);
        } else {
          reject(new Error(`Token 발급 실패: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendMessage(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      content: { type: 'text', text: message }
    });

    const req = https.request({
      hostname: 'www.worksapis.com',
      path: `/v1.0/bots/${botId}/channels/${channelId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve({ success: true });
        } else {
          reject(new Error(`메시지 전송 실패: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const githubEvent = event.headers['x-github-event'] || event.headers['X-GitHub-Event'];

    // push 이벤트만 처리
    if (githubEvent !== 'push') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `Ignored event: ${githubEvent}` })
      };
    }

    const payload = JSON.parse(event.body);
    const branch = (payload.ref || '').replace('refs/heads/', '');
    const repo = payload.repository?.name || 'unknown';
    const pusher = payload.pusher?.name || payload.sender?.login || 'unknown';
    const commits = payload.commits || [];

    if (commits.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No commits in push' })
      };
    }

    // 메시지 구성
    const koreanTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `🔄 코드 업데이트 알림\n\n`;
    message += `📦 ${repo} / ${branch}\n`;
    message += `👤 ${pusher}\n`;
    message += `🕐 ${koreanTime}\n\n`;

    message += `📝 변경 내역 (${commits.length}건):\n`;
    commits.slice(0, 10).forEach((commit, idx) => {
      const shortMsg = commit.message.split('\n')[0].substring(0, 80);
      message += `  ${idx + 1}. ${shortMsg}\n`;

      // 변경된 파일 요약
      const added = (commit.added || []).length;
      const modified = (commit.modified || []).length;
      const removed = (commit.removed || []).length;
      if (added || modified || removed) {
        const parts = [];
        if (added) parts.push(`+${added}`);
        if (modified) parts.push(`~${modified}`);
        if (removed) parts.push(`-${removed}`);
        message += `     파일: ${parts.join(' ')}\n`;
      }
    });

    if (commits.length > 10) {
      message += `  ... 외 ${commits.length - 10}건\n`;
    }

    // 주요 변경 파일 목록
    const allFiles = new Set();
    commits.forEach(c => {
      (c.added || []).forEach(f => allFiles.add(f));
      (c.modified || []).forEach(f => allFiles.add(f));
    });

    if (allFiles.size > 0) {
      message += `\n📁 변경된 주요 파일:\n`;
      const fileList = [...allFiles].slice(0, 15);
      fileList.forEach(f => {
        message += `  • ${f}\n`;
      });
      if (allFiles.size > 15) {
        message += `  ... 외 ${allFiles.size - 15}개\n`;
      }
    }

    // 네이버 웍스로 전송
    const clientId = process.env.NAVER_WORKS_CLIENT_ID;
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
    const botId = process.env.NAVER_WORKS_BOT_ID;
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

    if (!clientId || !clientSecret || !botId) {
      console.log('[github-webhook] 네이버 웍스 환경변수 미설정');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, error: '네이버 웍스 환경변수 미설정' })
      };
    }

    const accessToken = await getAccessToken(clientId, clientSecret, serviceAccount);
    await sendMessage(accessToken, botId, UPDATE_CHANNEL_ID, message);

    console.log(`[github-webhook] 알림 전송 완료: ${commits.length}개 커밋, branch=${branch}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: `알림 전송 완료 (${commits.length}개 커밋)` })
    };

  } catch (error) {
    console.error('[github-webhook] Error:', error);
    return {
      statusCode: 200, // GitHub에 200 반환 (재시도 방지)
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
