/**
 * 매일 오전 10시(한국시간) 실행되는 소속 크리에이터 이상 징후 모니터링
 * Netlify Scheduled Function
 * 
 * Cron: 0 1 * * * (UTC 1시 = 한국시간 10시)
 * 
 * 체크 항목:
 * 1. 급상승한 영상 (조회수 급증)
 * 2. 구독자 급증 크리에이터
 * 3. 영상 업로드 주기 4일 이상 없는 크리에이터
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');
const axios = require('axios');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// YouTube API Key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

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

console.log('Scheduled function: creator-monitoring initialized');

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
 * YouTube 채널 정보 가져오기
 */
async function getChannelInfo(channelId) {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      return {
        title: channel.snippet.title,
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        videoCount: parseInt(channel.statistics.videoCount),
        viewCount: parseInt(channel.statistics.viewCount)
      };
    }
    return null;
  } catch (error) {
    console.error(`YouTube API 오류 (${channelId}):`, error.message);
    return null;
  }
}

/**
 * YouTube 최근 영상 목록 가져오기
 */
async function getRecentVideos(channelId, maxResults = 5) {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: channelId,
        order: 'date',
        type: 'video',
        maxResults: maxResults,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items) {
      const videoIds = response.data.items.map(item => item.id.videoId).join(',');
      
      // 영상 통계 가져오기
      const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'statistics,snippet',
          id: videoIds,
          key: YOUTUBE_API_KEY
        }
      });

      return statsResponse.data.items.map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics.viewCount),
        likeCount: parseInt(video.statistics.likeCount || 0),
        commentCount: parseInt(video.statistics.commentCount || 0)
      }));
    }
    return [];
  } catch (error) {
    console.error(`YouTube API 오류 (${channelId}):`, error.message);
    return [];
  }
}

/**
 * 메인 핸들러
 */
exports.handler = async (event, context) => {
  console.log('🔔 [CREATOR-MONITORING] 소속 크리에이터 모니터링 시작');

  try {
    // 한국시간
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const koreanDate = koreaTime.toLocaleString('ko-KR', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log(`📅 확인 시간: ${koreanDate}`);

    // 소속 크리에이터 조회
    const { data: affiliatedCreators, error } = await supabaseAdmin
      .from('affiliated_creators')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 소속 크리에이터 조회 오류:', error);
      throw error;
    }

    if (!affiliatedCreators || affiliatedCreators.length === 0) {
      console.log('✅ 소속 크리에이터 없음');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '소속 크리에이터 없음' })
      };
    }

    console.log(`📊 소속 크리에이터 ${affiliatedCreators.length}명 확인`);

    // 이상 징후 체크
    const alerts = [];

    for (const creator of affiliatedCreators) {
      if (!creator.youtube_channel_id) continue;

      try {
        // 채널 정보 가져오기
        const channelInfo = await getChannelInfo(creator.youtube_channel_id);
        if (!channelInfo) continue;

        // 구독자 급증 체크 (이전 데이터와 비교)
        if (creator.subscriber_count) {
          const subscriberGrowth = channelInfo.subscriberCount - creator.subscriber_count;
          const growthRate = (subscriberGrowth / creator.subscriber_count) * 100;

          if (growthRate > 10) {
            alerts.push({
              type: '구독자 급증',
              creator: creator.name,
              detail: `구독자 ${subscriberGrowth.toLocaleString()}명 증가 (${growthRate.toFixed(1)}%)`
            });
          }
        }

        // 최근 영상 가져오기
        const recentVideos = await getRecentVideos(creator.youtube_channel_id, 5);

        if (recentVideos.length > 0) {
          // 급상승 영상 체크 (최근 영상 중 조회수가 평균의 2배 이상)
          const avgViews = recentVideos.reduce((sum, v) => sum + v.viewCount, 0) / recentVideos.length;
          const viralVideos = recentVideos.filter(v => v.viewCount > avgViews * 2);

          if (viralVideos.length > 0) {
            viralVideos.forEach(video => {
              alerts.push({
                type: '급상승 영상',
                creator: creator.name,
                detail: `"${video.title}" - 조회수 ${video.viewCount.toLocaleString()}회`
              });
            });
          }

          // 영상 업로드 주기 체크 (최근 영상이 4일 이상 전)
          const latestVideo = recentVideos[0];
          const daysSinceUpload = (Date.now() - new Date(latestVideo.publishedAt).getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceUpload > 4) {
            alerts.push({
              type: '업로드 중단',
              creator: creator.name,
              detail: `최근 영상 업로드: ${Math.floor(daysSinceUpload)}일 전`
            });
          }
        } else {
          alerts.push({
            type: '업로드 중단',
            creator: creator.name,
            detail: '최근 영상 없음'
          });
        }

        // DB 업데이트 (구독자 수, 영상 수)
        await supabaseAdmin
          .from('affiliated_creators')
          .update({
            subscriber_count: channelInfo.subscriberCount,
            video_count: channelInfo.videoCount,
            view_count: channelInfo.viewCount,
            last_checked_at: new Date().toISOString()
          })
          .eq('id', creator.id);

      } catch (error) {
        console.error(`❌ ${creator.name} 체크 오류:`, error.message);
      }

      // API 호출 제한 방지 (1초 대기)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 메시지 작성
    let message = `📊 소속 크리에이터 모니터링 리포트 (${koreanDate})\n\n`;
    message += `총 ${affiliatedCreators.length}명의 소속 크리에이터를 확인했습니다.\n\n`;

    if (alerts.length === 0) {
      message += `✅ 특이사항 없음\n`;
    } else {
      message += `⚠️  이상 징후 ${alerts.length}건 발견:\n\n`;
      
      // 타입별로 그룹화
      const groupedAlerts = {
        '구독자 급증': [],
        '급상승 영상': [],
        '업로드 중단': []
      };

      alerts.forEach(alert => {
        groupedAlerts[alert.type].push(alert);
      });

      Object.entries(groupedAlerts).forEach(([type, items]) => {
        if (items.length > 0) {
          message += `【${type}】\n`;
          items.forEach((item, index) => {
            message += `${index + 1}. ${item.creator}: ${item.detail}\n`;
          });
          message += `\n`;
        }
      });
    }

    message += `\n관리자 페이지에서 확인해주세요:\nhttps://cnecbiz.com/admin/creators`;

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

    console.log('🎉 소속 크리에이터 모니터링 완료');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        creatorCount: affiliatedCreators.length,
        alertCount: alerts.length,
        message: '모니터링 완료'
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
