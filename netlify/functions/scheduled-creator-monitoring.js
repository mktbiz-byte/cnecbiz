/**
 * 매주 월요일 오전 10시(한국시간) 실행되는 소속 크리에이터 주간 리포트
 * Netlify Scheduled Function
 *
 * Cron: 0 1 * * 1 (매주 월요일 UTC 1시 = 한국시간 10시)
 *
 * 수동 테스트: GET/POST /.netlify/functions/scheduled-creator-monitoring
 *
 * 체크 항목:
 * 1. 각 크리에이터별 최근 7일 업로드 수
 * 2. 평균 조회수
 * 3. 업로드 중단 크리에이터 (4일 이상)
 * 4. 구독자/조회수 급증
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
        subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
        videoCount: parseInt(channel.statistics.videoCount || 0),
        viewCount: parseInt(channel.statistics.viewCount || 0)
      };
    }
    return null;
  } catch (error) {
    console.error(`YouTube API 오류 (${channelId}):`, error.message);
    return null;
  }
}

/**
 * YouTube 최근 영상 목록 가져오기 (7일 이내)
 */
async function getRecentVideos(channelId, maxResults = 10) {
  try {
    // 7일 전 날짜
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: channelId,
        order: 'date',
        type: 'video',
        maxResults: maxResults,
        publishedAfter: sevenDaysAgo.toISOString(),
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const videoIds = response.data.items.map(item => item.id.videoId).filter(Boolean).join(',');

      if (!videoIds) return [];

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
        viewCount: parseInt(video.statistics.viewCount || 0),
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
 * 가장 최근 영상 날짜 가져오기
 */
async function getLastVideoDate(channelId) {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: channelId,
        order: 'date',
        type: 'video',
        maxResults: 1,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      return new Date(response.data.items[0].snippet.publishedAt);
    }
    return null;
  } catch (error) {
    console.error(`YouTube API 오류 (${channelId}):`, error.message);
    return null;
  }
}

/**
 * 숫자 포맷팅 (1000 -> 1K, 10000 -> 1만)
 */
function formatNumber(num) {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * 메인 핸들러
 */
exports.handler = async (event, context) => {
  // HTTP 요청 정보 로깅 (수동 테스트 확인용)
  const httpMethod = event.httpMethod || 'SCHEDULED';
  const isManualTest = httpMethod === 'GET' || httpMethod === 'POST';

  console.log('🔔 [CREATOR-MONITORING] 소속 크리에이터 주간 리포트 시작');
  console.log(`📌 실행 방식: ${isManualTest ? `수동 테스트 (${httpMethod})` : '스케줄 자동 실행'}`);

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

    console.log(`📊 소속 크리에이터 ${affiliatedCreators.length}명 분석 시작`);

    // 크리에이터별 통계 수집
    const creatorStats = [];
    const alerts = [];

    for (const creator of affiliatedCreators) {
      // YouTube 채널 ID 추출
      let channelId = creator.youtube_channel_id;
      if (!channelId && creator.channel_url) {
        // URL에서 채널 ID 추출 시도
        const match = creator.channel_url.match(/channel\/([a-zA-Z0-9_-]+)/);
        if (match) channelId = match[1];
      }

      if (!channelId) {
        console.log(`⚠️ ${creator.name}: 채널 ID 없음`);
        creatorStats.push({
          name: creator.name,
          status: 'no_channel',
          weeklyUploads: 0,
          avgViews: 0,
          daysSinceUpload: null,
          subscriberCount: creator.subscriber_count || 0
        });
        continue;
      }

      try {
        // 채널 정보 가져오기
        const channelInfo = await getChannelInfo(channelId);
        if (!channelInfo) {
          console.log(`⚠️ ${creator.name}: 채널 정보 조회 실패`);
          continue;
        }

        // 최근 7일 영상 가져오기
        const recentVideos = await getRecentVideos(channelId, 10);

        // 평균 조회수 계산
        const avgViews = recentVideos.length > 0
          ? Math.round(recentVideos.reduce((sum, v) => sum + v.viewCount, 0) / recentVideos.length)
          : 0;

        // 마지막 업로드 날짜 확인
        const lastVideoDate = await getLastVideoDate(channelId);
        const daysSinceUpload = lastVideoDate
          ? Math.floor((Date.now() - lastVideoDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // 구독자 변화 체크
        const prevSubscriberCount = creator.subscriber_count || 0;
        const subscriberGrowth = channelInfo.subscriberCount - prevSubscriberCount;
        const growthRate = prevSubscriberCount > 0
          ? ((subscriberGrowth / prevSubscriberCount) * 100).toFixed(1)
          : 0;

        // 통계 저장
        creatorStats.push({
          name: creator.name,
          status: 'active',
          weeklyUploads: recentVideos.length,
          avgViews: avgViews,
          daysSinceUpload: daysSinceUpload,
          subscriberCount: channelInfo.subscriberCount,
          subscriberGrowth: subscriberGrowth,
          totalViews: channelInfo.viewCount
        });

        // 이상 징후 체크
        // 1. 업로드 중단 (4일 이상)
        if (daysSinceUpload !== null && daysSinceUpload >= 4) {
          alerts.push({
            type: 'upload_stopped',
            creator: creator.name,
            detail: `${daysSinceUpload}일간 업로드 없음`
          });
        }

        // 2. 구독자 급증 (10% 이상)
        if (growthRate > 10) {
          alerts.push({
            type: 'subscriber_surge',
            creator: creator.name,
            detail: `구독자 +${formatNumber(subscriberGrowth)} (+${growthRate}%)`
          });
        }

        // 3. 조회수 급상승 영상
        if (recentVideos.length > 0 && avgViews > 0) {
          const viralVideos = recentVideos.filter(v => v.viewCount > avgViews * 3);
          viralVideos.forEach(video => {
            alerts.push({
              type: 'viral_video',
              creator: creator.name,
              detail: `"${video.title.slice(0, 20)}..." ${formatNumber(video.viewCount)}회`
            });
          });
        }

        // DB 업데이트
        await supabaseAdmin
          .from('affiliated_creators')
          .update({
            subscriber_count: channelInfo.subscriberCount,
            video_count: channelInfo.videoCount,
            view_count: channelInfo.viewCount,
            last_checked_at: new Date().toISOString()
          })
          .eq('id', creator.id);

        console.log(`✅ ${creator.name}: 주간 ${recentVideos.length}개 업로드, 평균 ${formatNumber(avgViews)}회`);

      } catch (error) {
        console.error(`❌ ${creator.name} 분석 오류:`, error.message);
      }

      // API 호출 제한 방지 (1초 대기)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 메시지 작성
    let message = `📊 소속 크리에이터 주간 리포트\n`;
    message += `📅 ${koreanDate}\n`;
    if (isManualTest) {
      message += `🔧 수동 테스트 실행\n`;
    }
    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 요약 통계
    const activeCreators = creatorStats.filter(c => c.status === 'active');
    const totalWeeklyUploads = activeCreators.reduce((sum, c) => sum + c.weeklyUploads, 0);
    const avgWeeklyUploads = activeCreators.length > 0 ? (totalWeeklyUploads / activeCreators.length).toFixed(1) : 0;
    const totalAvgViews = activeCreators.length > 0
      ? Math.round(activeCreators.reduce((sum, c) => sum + c.avgViews, 0) / activeCreators.length)
      : 0;

    message += `📈 전체 현황\n\n`;
    message += `▸ 소속 크리에이터: ${affiliatedCreators.length}명\n`;
    message += `▸ 주간 총 업로드: ${totalWeeklyUploads}개\n`;
    message += `▸ 평균 업로드: ${avgWeeklyUploads}개/주\n`;
    message += `▸ 평균 조회수: ${formatNumber(totalAvgViews)}회\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 크리에이터별 상세
    message += `👤 크리에이터별 현황 (7일)\n\n`;

    // 업로드 많은 순으로 정렬
    const sortedCreators = [...activeCreators].sort((a, b) => b.weeklyUploads - a.weeklyUploads);

    sortedCreators.forEach((creator, index) => {
      const uploadStatus = creator.weeklyUploads > 0 ? '✅' : '⚠️';
      const dayInfo = creator.daysSinceUpload !== null
        ? `마지막 ${creator.daysSinceUpload}일전`
        : '';

      message += `${index + 1}. ${creator.name}\n`;
      message += `   ${uploadStatus} 업로드 ${creator.weeklyUploads}개 | 평균 ${formatNumber(creator.avgViews)}회\n`;
      message += `   구독자 ${formatNumber(creator.subscriberCount)}명`;
      if (creator.subscriberGrowth > 0) {
        message += ` (+${formatNumber(creator.subscriberGrowth)})`;
      }
      if (dayInfo) {
        message += ` | ${dayInfo}`;
      }
      message += `\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 알림 섹션
    if (alerts.length > 0) {
      message += `⚠️ 주의 사항 (${alerts.length}건)\n\n`;

      // 업로드 중단
      const uploadStoppedAlerts = alerts.filter(a => a.type === 'upload_stopped');
      if (uploadStoppedAlerts.length > 0) {
        message += `【업로드 중단】\n`;
        uploadStoppedAlerts.forEach(alert => {
          message += `• ${alert.creator}: ${alert.detail}\n`;
        });
        message += `\n`;
      }

      // 구독자 급증
      const subscriberAlerts = alerts.filter(a => a.type === 'subscriber_surge');
      if (subscriberAlerts.length > 0) {
        message += `【구독자 급증】\n`;
        subscriberAlerts.forEach(alert => {
          message += `• ${alert.creator}: ${alert.detail}\n`;
        });
        message += `\n`;
      }

      // 급상승 영상
      const viralAlerts = alerts.filter(a => a.type === 'viral_video');
      if (viralAlerts.length > 0) {
        message += `【급상승 영상】\n`;
        viralAlerts.forEach(alert => {
          message += `• ${alert.creator}: ${alert.detail}\n`;
        });
        message += `\n`;
      }
    } else {
      message += `✅ 특이사항 없음\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `관리자 페이지:\nhttps://cnecbiz.com/admin/creators`;

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

    console.log('🎉 소속 크리에이터 주간 리포트 완료');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        executionType: isManualTest ? 'manual' : 'scheduled',
        creatorCount: affiliatedCreators.length,
        totalWeeklyUploads: totalWeeklyUploads,
        alertCount: alerts.length,
        creatorStats: creatorStats.slice(0, 5), // 처음 5개만 반환 (디버깅용)
        message: '주간 리포트 완료'
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

// 스케줄 비활성화 - scheduled-weekly-report.js로 통합됨
// exports.config = { schedule: '0 1 * * 1' };
