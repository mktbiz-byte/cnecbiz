/**
 * 매일 오전 10시(한국시간) 실행되는 일일 보고서
 * Netlify Scheduled Function
 * 
 * Cron: 0 1 * * * (UTC 1시 = 한국시간 10시)
 * 
 * 보고 항목:
 * 1. 회원 현황 (나라별 신규/누적)
 * 2. 캠페인 현황 (나라별 신규, 상태별)
 * 3. 매출 현황 (나라별 일일/누적)
 * 4. 포인트 충전 현황
 * 5. 크리에이터 현황
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

console.log('Scheduled function: daily-report initialized');

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
 * 날짜 범위 계산 (전날 00:00 ~ 23:59)
 */
function getYesterdayRange() {
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  // 전날 00:00
  const yesterday = new Date(koreaTime);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  // 전날 23:59
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  return {
    start: yesterday.toISOString(),
    end: yesterdayEnd.toISOString(),
    dateStr: yesterday.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/**
 * 메인 핸들러
 */
exports.handler = async (event, context) => {
  console.log('🔔 [DAILY-REPORT] 일일 보고서 생성 시작');

  try {
    // 한국시간
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

    // 전날 범위
    const { start, end, dateStr } = getYesterdayRange();
    console.log(`📅 집계 기간: ${start} ~ ${end}`);

    // ━━━━━━━━━━━━━━━━━━━━━━
    // 1. 회원 현황
    // ━━━━━━━━━━━━━━━━━━━━━━
    
    // 신규 가입 (전날)
    const { data: newCompanies, error: newCompaniesError } = await supabaseAdmin
      .from('companies')
      .select('region')
      .gte('created_at', start)
      .lte('created_at', end);

    if (newCompaniesError) throw newCompaniesError;

    const newByRegion = {
      korea: newCompanies?.filter(c => c.region === 'korea').length || 0,
      japan: newCompanies?.filter(c => c.region === 'japan').length || 0,
      us: newCompanies?.filter(c => c.region === 'us').length || 0
    };
    const newTotal = (newCompanies?.length || 0);

    // 누적 회원
    const { data: allCompanies, error: allCompaniesError } = await supabaseAdmin
      .from('companies')
      .select('region');

    if (allCompaniesError) throw allCompaniesError;

    const totalByRegion = {
      korea: allCompanies?.filter(c => c.region === 'korea').length || 0,
      japan: allCompanies?.filter(c => c.region === 'japan').length || 0,
      us: allCompanies?.filter(c => c.region === 'us').length || 0
    };
    const totalCompanies = (allCompanies?.length || 0);

    // ━━━━━━━━━━━━━━━━━━━━━━
    // 2. 캠페인 현황
    // ━━━━━━━━━━━━━━━━━━━━━━

    // 신규 캠페인 (전날)
    const { data: newCampaigns, error: newCampaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('region')
      .gte('created_at', start)
      .lte('created_at', end);

    if (newCampaignsError) throw newCampaignsError;

    const newCampaignsByRegion = {
      korea: newCampaigns?.filter(c => c.region === 'korea').length || 0,
      japan: newCampaigns?.filter(c => c.region === 'japan').length || 0,
      us: newCampaigns?.filter(c => c.region === 'us').length || 0
    };
    const newCampaignsTotal = (newCampaigns?.length || 0);

    // 상태별 캠페인
    const { data: allCampaigns, error: allCampaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('status');

    if (allCampaignsError) throw allCampaignsError;

    const campaignsByStatus = {
      recruiting: allCampaigns?.filter(c => c.status === 'recruiting').length || 0,
      active: allCampaigns?.filter(c => c.status === 'active').length || 0,
      completed: allCampaigns?.filter(c => c.status === 'completed').length || 0
    };

    // ━━━━━━━━━━━━━━━━━━━━━━
    // 3. 매출 현황
    // ━━━━━━━━━━━━━━━━━━━━━━

    // 일일 매출 (전날 생성된 캠페인의 estimated_cost 합계)
    const { data: yesterdayCampaigns, error: yesterdayCampaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('region, estimated_cost')
      .gte('created_at', start)
      .lte('created_at', end);

    if (yesterdayCampaignsError) throw yesterdayCampaignsError;

    const dailyRevenue = {
      korea: yesterdayCampaigns?.filter(c => c.region === 'korea').reduce((sum, c) => sum + (c.estimated_cost || 0), 0) || 0,
      japan: yesterdayCampaigns?.filter(c => c.region === 'japan').reduce((sum, c) => sum + (c.estimated_cost || 0), 0) || 0,
      us: yesterdayCampaigns?.filter(c => c.region === 'us').reduce((sum, c) => sum + (c.estimated_cost || 0), 0) || 0
    };

    // 누적 매출
    const { data: allRevenueCampaigns, error: allRevenueCampaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('region, estimated_cost');

    if (allRevenueCampaignsError) throw allRevenueCampaignsError;

    const totalRevenue = {
      korea: allRevenueCampaigns?.filter(c => c.region === 'korea').reduce((sum, c) => sum + (c.estimated_cost || 0), 0) || 0,
      japan: allRevenueCampaigns?.filter(c => c.region === 'japan').reduce((sum, c) => sum + (c.estimated_cost || 0), 0) || 0,
      us: allRevenueCampaigns?.filter(c => c.region === 'us').reduce((sum, c) => sum + (c.estimated_cost || 0), 0) || 0
    };

    // ━━━━━━━━━━━━━━━━━━━━━━
    // 4. 포인트 충전 현황
    // ━━━━━━━━━━━━━━━━━━━━━━

    const { data: pointsCharges, error: pointsChargesError } = await supabaseAdmin
      .from('points_charges')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', start)
      .lte('created_at', end);

    if (pointsChargesError) throw pointsChargesError;

    const pointsCount = pointsCharges?.length || 0;
    const pointsAmount = pointsCharges?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const pointsAvg = pointsCount > 0 ? Math.round(pointsAmount / pointsCount) : 0;

    // ━━━━━━━━━━━━━━━━━━━━━━
    // 5. 크리에이터 현황
    // ━━━━━━━━━━━━━━━━━━━━━━

    // 신규 신청 (전날)
    const { data: newCreatorApps, error: newCreatorAppsError } = await supabaseAdmin
      .from('featured_creator_applications')
      .select('id')
      .gte('created_at', start)
      .lte('created_at', end);

    if (newCreatorAppsError) throw newCreatorAppsError;

    const newCreatorApplications = newCreatorApps?.length || 0;

    // 신규 승인 (전날) - updated_at 사용
    const { data: approvedCreators, error: approvedCreatorsError } = await supabaseAdmin
      .from('featured_creator_applications')
      .select('id')
      .eq('status', 'approved')
      .gte('updated_at', start)
      .lte('updated_at', end);

    if (approvedCreatorsError) throw approvedCreatorsError;

    const newCreatorApprovals = approvedCreators?.length || 0;

    // 총 크리에이터
    const { data: allCreators, error: allCreatorsError } = await supabaseAdmin
      .from('featured_creators')
      .select('id');

    if (allCreatorsError) throw allCreatorsError;

    const totalCreators = allCreators?.length || 0;

    // ━━━━━━━━━━━━━━━━━━━━━━
    // 메시지 작성
    // ━━━━━━━━━━━━━━━━━━━━━━

    let message = `📊 CNEC BIZ 일일 보고서\n`;
    message += `📅 ${koreanDateTime}\n\n`;
    message += `집계 기간: ${dateStr} 00:00 ~ 23:59\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 회원 현황
    message += `👥 회원 현황\n\n`;
    message += `【신규 가입】\n`;
    message += `🇰🇷 한국: ${newByRegion.korea}개 기업\n`;
    message += `🇯🇵 일본: ${newByRegion.japan}개 기업\n`;
    message += `🇺🇸 미국: ${newByRegion.us}개 기업\n`;
    message += `📊 전체: ${newTotal}개 기업\n\n`;
    
    message += `【누적 회원】\n`;
    message += `🇰🇷 한국: ${totalByRegion.korea}개\n`;
    message += `🇯🇵 일본: ${totalByRegion.japan}개\n`;
    message += `🇺🇸 미국: ${totalByRegion.us}개\n`;
    message += `📊 전체: ${totalCompanies}개\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 캠페인 현황
    message += `📢 캠페인 현황\n\n`;
    message += `【신규 캠페인】\n`;
    message += `🇰🇷 한국: ${newCampaignsByRegion.korea}개\n`;
    message += `🇯🇵 일본: ${newCampaignsByRegion.japan}개\n`;
    message += `🇺🇸 미국: ${newCampaignsByRegion.us}개\n`;
    message += `📊 전체: ${newCampaignsTotal}개\n\n`;
    
    message += `【상태별 현황】\n`;
    message += `⏳ 모집 중: ${campaignsByStatus.recruiting}개\n`;
    message += `🎬 진행 중: ${campaignsByStatus.active}개\n`;
    message += `✅ 완료: ${campaignsByStatus.completed}개\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 매출 현황
    message += `💰 매출 현황\n\n`;
    message += `【일일 매출】\n`;
    message += `🇰🇷 한국: ₩${dailyRevenue.korea.toLocaleString()}\n`;
    message += `🇯🇵 일본: ¥${dailyRevenue.japan.toLocaleString()} (₩${(dailyRevenue.japan * 10).toLocaleString()})\n`;
    message += `🇺🇸 미국: $${dailyRevenue.us.toLocaleString()} (₩${(dailyRevenue.us * 1400).toLocaleString()})\n`;
    const dailyTotal = dailyRevenue.korea + (dailyRevenue.japan * 10) + (dailyRevenue.us * 1400);
    message += `📊 전체: ₩${Math.round(dailyTotal).toLocaleString()}\n\n`;
    
    message += `【누적 매출】\n`;
    message += `🇰🇷 한국: ₩${totalRevenue.korea.toLocaleString()}\n`;
    message += `🇯🇵 일본: ₩${(totalRevenue.japan * 10).toLocaleString()}\n`;
    message += `🇺🇸 미국: ₩${(totalRevenue.us * 1400).toLocaleString()}\n`;
    const revenueTotal = totalRevenue.korea + (totalRevenue.japan * 10) + (totalRevenue.us * 1400);
    message += `📊 전체: ₩${Math.round(revenueTotal).toLocaleString()}\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 포인트 충전
    message += `💳 포인트 충전\n\n`;
    message += `충전 건수: ${pointsCount}건\n`;
    message += `충전 금액: ₩${pointsAmount.toLocaleString()}\n`;
    message += `평균 금액: ₩${pointsAvg.toLocaleString()}\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 크리에이터
    message += `🎨 크리에이터\n\n`;
    message += `신규 신청: ${newCreatorApplications}명\n`;
    message += `신규 승인: ${newCreatorApprovals}명\n`;
    message += `총 크리에이터: ${totalCreators}명\n\n`;
    
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
          newCompanies: newTotal,
          newCampaigns: newCampaignsTotal,
          dailyRevenue: Math.round(dailyTotal),
          pointsCharges: pointsCount
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
