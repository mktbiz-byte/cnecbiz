/**
 * 매일 오전 10시(한국시간) 실행되는 일일 보고서
 * Netlify Scheduled Function
 *
 * Cron: 0 1 * * * (UTC 1시 = 한국시간 10시)
 *
 * 보고 항목:
 * 1. 캠페인 현황 (진행중/마감임박/영상업로드/SNS업로드)
 * 2. 회원 현황 (나라별 신규/누적)
 * 3. 크리에이터 현황
 *
 * Multi-region 지원: Korea, Japan, US (각각 별도의 Supabase 프로젝트)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

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

// Supabase 클라이언트 초기화 (각 지역별)
const createRegionClients = () => {
  const clients = {};

  // Korea
  if (process.env.VITE_SUPABASE_KOREA_URL && process.env.VITE_SUPABASE_KOREA_ANON_KEY) {
    clients.korea = createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.VITE_SUPABASE_KOREA_ANON_KEY
    );
  }

  // Japan
  if (process.env.VITE_SUPABASE_JAPAN_URL && process.env.VITE_SUPABASE_JAPAN_ANON_KEY) {
    clients.japan = createClient(
      process.env.VITE_SUPABASE_JAPAN_URL,
      process.env.VITE_SUPABASE_JAPAN_ANON_KEY
    );
  }

  // US
  if (process.env.VITE_SUPABASE_US_URL && process.env.VITE_SUPABASE_US_ANON_KEY) {
    clients.us = createClient(
      process.env.VITE_SUPABASE_US_URL,
      process.env.VITE_SUPABASE_US_ANON_KEY
    );
  }

  // BIZ (중앙 관리 - 포인트 충전 등)
  if (process.env.VITE_SUPABASE_BIZ_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    clients.biz = createClient(
      process.env.VITE_SUPABASE_BIZ_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  return clients;
};

// 전날 범위 계산
const getYesterdayRange = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');

  const start = `${year}-${month}-${day}T00:00:00`;
  const end = `${year}-${month}-${day}T23:59:59`;
  const dateStr = `${year}년 ${month}월 ${day}일`;

  return { start, end, dateStr };
};

// JWT 생성
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

// Access Token 발급
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

// 네이버 웍스 메시지 전송
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

// 메인 핸들러
exports.handler = async (event, context) => {
  console.log('🚀 일일 보고서 생성 시작');

  try {
    const clients = createRegionClients();
    const regions = ['korea', 'japan', 'us'];

    console.log('📊 사용 가능한 클라이언트:', Object.keys(clients));

    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const koreanDateTime = koreaTime.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const { start, end, dateStr } = getYesterdayRange();
    console.log(`📅 집계 기간: ${start} ~ ${end}`);

    // 3일 후 날짜 (마감 임박 기준)
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

    // 데이터 수집
    const stats = {
      companies: { new: {}, total: {} },
      campaigns: {
        total: 0,
        active: 0,
        recruiting: 0,
        deadlineSoon: [], // 3일 이내 마감
        byRegion: {}
      },
      videos: {
        todayUploads: 0, // 오늘 영상 업로드 (검수용 영상)
        todaySnsUploads: 0, // 오늘 SNS 업로드 완료
        pendingReview: 0, // 검수 대기 중
        byRegion: {}
      },
      creators: { new: 0, total: 0 }
    };

    // 각 지역별 데이터 수집
    for (const region of regions) {
      const client = clients[region];
      if (!client) {
        console.warn(`⚠️ ${region} 클라이언트 없음`);
        continue;
      }

      try {
        // 1. 회원 현황
        const { data: newCompanies } = await client
          .from('companies')
          .select('id')
          .gte('created_at', start)
          .lte('created_at', end);

        const { data: allCompanies } = await client
          .from('companies')
          .select('id');

        stats.companies.new[region] = newCompanies?.length || 0;
        stats.companies.total[region] = allCompanies?.length || 0;

        // 2. 캠페인 현황
        const { data: allCampaigns } = await client
          .from('campaigns')
          .select('id, title, status, end_date, company_id');

        if (allCampaigns) {
          stats.campaigns.total += allCampaigns.length;
          stats.campaigns.byRegion[region] = allCampaigns.length;

          allCampaigns.forEach(campaign => {
            // 진행 중 캠페인
            if (campaign.status === 'active' || campaign.status === 'in_progress') {
              stats.campaigns.active++;
            }
            // 모집 중 캠페인
            if (campaign.status === 'recruiting' || campaign.status === 'open') {
              stats.campaigns.recruiting++;
            }
            // 3일 이내 마감 캠페인
            if (campaign.end_date) {
              const endDate = new Date(campaign.end_date);
              const today = new Date();
              const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
              if (diffDays >= 0 && diffDays <= 3) {
                stats.campaigns.deadlineSoon.push({
                  region,
                  title: campaign.title,
                  daysLeft: diffDays
                });
              }
            }
          });
        }

        // 3. 영상 업로드 현황 (applications 테이블)
        // 오늘 영상 파일 업로드 (video_file_url이 오늘 업데이트된 건)
        const { data: todayVideoUploads } = await client
          .from('applications')
          .select('id')
          .not('video_file_url', 'is', null)
          .gte('updated_at', start)
          .lte('updated_at', end);

        // 오늘 SNS 업로드 완료 (sns_upload_url이 오늘 업데이트된 건)
        const { data: todaySnsUploads } = await client
          .from('applications')
          .select('id')
          .not('sns_upload_url', 'is', null)
          .gte('updated_at', start)
          .lte('updated_at', end);

        // 검수 대기 중 (submitted 상태)
        const { data: pendingReviews } = await client
          .from('applications')
          .select('id')
          .eq('status', 'submitted');

        const regionVideoUploads = todayVideoUploads?.length || 0;
        const regionSnsUploads = todaySnsUploads?.length || 0;
        const regionPendingReview = pendingReviews?.length || 0;

        stats.videos.todayUploads += regionVideoUploads;
        stats.videos.todaySnsUploads += regionSnsUploads;
        stats.videos.pendingReview += regionPendingReview;
        stats.videos.byRegion[region] = {
          videoUploads: regionVideoUploads,
          snsUploads: regionSnsUploads,
          pendingReview: regionPendingReview
        };

        // video_submissions 테이블도 체크
        try {
          const { data: vsUploads } = await client
            .from('video_submissions')
            .select('id')
            .gte('created_at', start)
            .lte('created_at', end);

          if (vsUploads) {
            stats.videos.todayUploads += vsUploads.length;
          }

          const { data: vsPending } = await client
            .from('video_submissions')
            .select('id')
            .eq('status', 'pending');

          if (vsPending) {
            stats.videos.pendingReview += vsPending.length;
          }
        } catch (e) {
          // video_submissions 테이블이 없을 수 있음
        }

        // 4. 크리에이터 현황
        try {
          const { data: allProfiles } = await client
            .from('user_profiles')
            .select('id');

          const { data: newProfiles } = await client
            .from('user_profiles')
            .select('id')
            .gte('created_at', start)
            .lte('created_at', end);

          stats.creators.total += (allProfiles?.length || 0);
          stats.creators.new += (newProfiles?.length || 0);
        } catch (e) {
          console.warn(`${region} user_profiles 조회 실패`);
        }

        console.log(`✅ ${region} 데이터 수집 완료`);
      } catch (error) {
        console.error(`❌ ${region} 데이터 수집 실패:`, error.message);
      }
    }

    // BIZ DB에서 추가 데이터 수집
    if (clients.biz) {
      try {
        // BIZ applications 테이블
        const { data: bizVideoUploads } = await clients.biz
          .from('applications')
          .select('id')
          .not('video_file_url', 'is', null)
          .gte('updated_at', start)
          .lte('updated_at', end);

        const { data: bizSnsUploads } = await clients.biz
          .from('applications')
          .select('id')
          .not('sns_upload_url', 'is', null)
          .gte('updated_at', start)
          .lte('updated_at', end);

        const { data: bizPendingReviews } = await clients.biz
          .from('applications')
          .select('id')
          .eq('status', 'submitted');

        stats.videos.todayUploads += bizVideoUploads?.length || 0;
        stats.videos.todaySnsUploads += bizSnsUploads?.length || 0;
        stats.videos.pendingReview += bizPendingReviews?.length || 0;
      } catch (e) {
        console.warn('BIZ 영상 데이터 조회 실패');
      }
    }

    // 메시지 작성
    let message = `📊 CNEC BIZ 일일 현황 보고서\n`;
    message += `📅 ${koreanDateTime}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 캠페인 현황 (핵심 정보)
    message += `🎬 캠페인 현황\n\n`;
    message += `▸ 현재 진행 중: ${stats.campaigns.active}개\n`;
    message += `▸ 모집 중: ${stats.campaigns.recruiting}개\n`;
    message += `▸ 전체 캠페인: ${stats.campaigns.total}개\n\n`;

    // 마감 임박 캠페인
    if (stats.campaigns.deadlineSoon.length > 0) {
      message += `⚠️ 3일 이내 마감 예정 (${stats.campaigns.deadlineSoon.length}개)\n`;
      stats.campaigns.deadlineSoon.slice(0, 5).forEach((c, idx) => {
        const flag = c.region === 'korea' ? '🇰🇷' : c.region === 'japan' ? '🇯🇵' : '🇺🇸';
        const daysText = c.daysLeft === 0 ? '오늘 마감' : `D-${c.daysLeft}`;
        message += `  ${idx + 1}. ${flag} ${c.title?.slice(0, 20)}${c.title?.length > 20 ? '...' : ''} (${daysText})\n`;
      });
      if (stats.campaigns.deadlineSoon.length > 5) {
        message += `  ... 외 ${stats.campaigns.deadlineSoon.length - 5}개\n`;
      }
      message += `\n`;
    } else {
      message += `✅ 3일 이내 마감 예정 캠페인 없음\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 영상 현황 (핵심 정보)
    message += `📹 영상 현황 (${dateStr})\n\n`;
    message += `▸ 영상 업로드: ${stats.videos.todayUploads}건\n`;
    message += `▸ SNS 업로드 완료: ${stats.videos.todaySnsUploads}건\n`;
    message += `▸ 검수 대기: ${stats.videos.pendingReview}건\n\n`;

    // 지역별 상세
    if (Object.keys(stats.videos.byRegion).length > 0) {
      message += `[지역별 영상 업로드]\n`;
      Object.entries(stats.videos.byRegion).forEach(([region, data]) => {
        const flag = region === 'korea' ? '🇰🇷' : region === 'japan' ? '🇯🇵' : '🇺🇸';
        const regionName = region === 'korea' ? '한국' : region === 'japan' ? '일본' : '미국';
        message += `  ${flag} ${regionName}: 영상 ${data.videoUploads}건 / SNS ${data.snsUploads}건\n`;
      });
      message += `\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 회원 현황
    const newTotal = (stats.companies.new.korea || 0) + (stats.companies.new.japan || 0) + (stats.companies.new.us || 0);
    const totalCompanies = (stats.companies.total.korea || 0) + (stats.companies.total.japan || 0) + (stats.companies.total.us || 0);

    message += `👥 기업 회원\n\n`;
    message += `▸ 신규 가입: ${newTotal}개 기업\n`;
    message += `▸ 누적 회원: ${totalCompanies}개 기업\n`;
    if (newTotal > 0) {
      message += `  (🇰🇷 ${stats.companies.new.korea || 0} / 🇯🇵 ${stats.companies.new.japan || 0} / 🇺🇸 ${stats.companies.new.us || 0})\n`;
    }
    message += `\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 크리에이터
    message += `🎨 크리에이터\n\n`;
    message += `▸ 신규 가입: ${stats.creators.new}명\n`;
    message += `▸ 총 크리에이터: ${stats.creators.total}명\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📈 관리자 페이지:\nhttps://cnecbiz.com/admin`;

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

    console.log('🎉 일일 보고서 생성 완료');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reportDate: dateStr,
        summary: {
          activeCampaigns: stats.campaigns.active,
          deadlineSoon: stats.campaigns.deadlineSoon.length,
          todayVideoUploads: stats.videos.todayUploads,
          todaySnsUploads: stats.videos.todaySnsUploads,
          pendingReview: stats.videos.pendingReview
        }
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
