/**
 * 매일 오전 10시(한국시간) 실행 - 영상 제출 마감일 알림
 * Netlify Scheduled Function
 *
 * Cron: 0 1 * * * (UTC 1시 = 한국시간 10시)
 *
 * 기능:
 * - 영상 제출 마감일이 3일 후, 2일 후, 당일인 크리에이터에게 알림 발송
 * - 아직 영상을 제출하지 않은 크리에이터에게만 발송
 * - 템플릿: 025100001013 (3일 전), 025100001014 (2일 전), 025100001015 (당일)
 */

const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');
const https = require('https');
const crypto = require('crypto');

// 팝빌 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

const kakaoService = popbill.KakaoService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';

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

// 카카오톡 알림 발송 함수
const sendKakaoNotification = (receiverNum, receiverName, templateCode, campaignName, deadline) => {
  return new Promise((resolve, reject) => {
    // 템플릿별 메시지 내용
    const messages = {
      '025100001013': `[CNEC] 참여하신 캠페인의 영상 제출 기한 3일 전 안내
#{크리에이터명}님, 참여하신 캠페인의 영상 제출 기한이 3일 남았습니다.

캠페인: #{캠페인명}
영상 제출 기한: #{제출기한}

크리에이터 대시보드에서 촬영한 영상을 제출해 주세요.

기한 내 미제출 시 패널티가 부과됩니다.

문의: 1833-6025`,
      '025100001014': `[CNEC] 참여하신 캠페인의 영상 제출 기한 2일 전 안내
#{크리에이터명}님, 참여하신 캠페인의 영상 제출 기한이 2일 남았습니다.

캠페인: #{캠페인명}
영상 제출 기한: #{제출기한}

아직 영상이 제출되지 않았습니다. 크리에이터 대시보드에서 빠르게 제출해 주세요.

기한 내 미제출 시 패널티가 부과됩니다.

문의: 1833-6025`,
      '025100001015': `[CNEC] 참여하신 캠페인 영상 제출 마감일 안내
#{크리에이터명}님, 신청하신 캠페인의 영상 제출 기한이 오늘입니다.

캠페인: #{캠페인명}
영상 제출 기한: #{제출기한} (오늘)

아직 영상이 제출되지 않았습니다. 오늘 자정까지 크리에이터 대시보드에서 제출해 주세요.

기한 내 미제출 시 패널티가 부과됩니다.
특별한 사유가 있는 경우 관리자에게 문의해주세요.

문의: 1833-6025`
    };

    let content = messages[templateCode] || '';

    // 변수 치환
    content = content.replace(/#{크리에이터명}/g, receiverName);
    content = content.replace(/#{캠페인명}/g, campaignName);
    content = content.replace(/#{제출기한}/g, deadline);

    kakaoService.sendATS(
      POPBILL_CORP_NUM,
      templateCode,
      POPBILL_SENDER_NUM,
      content,
      '',  // altContent
      '',  // altSendType
      receiverNum,
      receiverName,
      '',  // sndDT (즉시 발송)
      '',  // requestNum
      '',  // userID
      null,  // btns
      (result) => {
        console.log(`카카오 알림톡 발송 성공: ${receiverNum} (${templateCode})`, result);
        resolve(result);
      },
      (error) => {
        console.error(`카카오 알림톡 발송 실패: ${receiverNum} (${templateCode})`, error);
        reject(error);
      }
    );
  });
};

// 메인 핸들러
exports.handler = async (event, context) => {
  console.log('=== 영상 제출 마감일 알림 스케줄러 시작 ===');
  console.log('실행 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase 클라이언트 초기화 실패');
    }

    // 오늘 날짜 (한국 시간 기준)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    // 오늘, 2일 후, 3일 후 날짜 계산
    const today = new Date(koreaTime);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const in2Days = new Date(today);
    in2Days.setDate(today.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split('T')[0];

    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    console.log('오늘:', todayStr);
    console.log('2일 후:', in2DaysStr);
    console.log('3일 후:', in3DaysStr);

    // 3일 후, 2일 후, 당일 마감되는 영상 제출 조회
    const deadlineDates = [
      { date: in3DaysStr, templateCode: '025100001013', label: '3일 전' },
      { date: in2DaysStr, templateCode: '025100001014', label: '2일 전' },
      { date: todayStr, templateCode: '025100001015', label: '당일' }
    ];

    const allResults = [];

    for (const { date, templateCode, label } of deadlineDates) {
      console.log(`\n=== ${label} 알림 처리 (마감일: ${date}) ===`);

      // 해당 날짜에 마감되는 applications 조회
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select(`
          id,
          user_id,
          campaign_id,
          video_submission_deadline,
          video_submitted,
          status,
          campaigns (
            id,
            title,
            campaign_name
          )
        `)
        .eq('video_submission_deadline', date)
        .or('video_submitted.is.null,video_submitted.eq.false')
        .in('status', ['selected', 'approved', 'guide_approved'])

      if (appError) {
        console.error(`Applications 조회 오류 (${date}):`, appError);
        continue;
      }

      console.log(`${label} 대상: ${applications?.length || 0}건`);

      if (!applications || applications.length === 0) {
        console.log(`${label} 알림 대상 없음`);
        continue;
      }

      // 각 application에 대해 알림 발송
      for (const app of applications) {
        try {
          const campaignName = app.campaigns?.title || app.campaigns?.campaign_name || '캠페인';

          // user_profiles에서 크리에이터 정보 조회
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('name, channel_name, phone')
            .eq('id', app.user_id)
            .maybeSingle();

          // id로 못 찾으면 user_id로 재시도
          let creatorProfile = profile;
          if (!creatorProfile) {
            const { data: profile2 } = await supabase
              .from('user_profiles')
              .select('name, channel_name, phone')
              .eq('user_id', app.user_id)
              .maybeSingle();
            creatorProfile = profile2;
          }

          if (!creatorProfile || !creatorProfile.phone) {
            console.log(`크리에이터 정보 없음 (user_id: ${app.user_id}), 알림 건너뜀`);
            allResults.push({
              userId: app.user_id,
              campaignName,
              deadline: date,
              label,
              status: 'skipped',
              reason: '크리에이터 전화번호 없음'
            });
            continue;
          }

          const creatorName = creatorProfile.channel_name || creatorProfile.name || '크리에이터';
          const creatorPhone = creatorProfile.phone;

          // 마감일 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
          const deadlineFormatted = date.replace(/-/g, '.');

          // 알림톡 발송
          try {
            await sendKakaoNotification(
              creatorPhone,
              creatorName,
              templateCode,
              campaignName,
              deadlineFormatted
            );

            console.log(`✓ 알림톡 발송 성공: ${creatorName} (${creatorPhone}) - ${campaignName}`);
            allResults.push({
              userId: app.user_id,
              creatorName,
              campaignName,
              deadline: date,
              label,
              status: 'sent',
              phone: creatorPhone
            });
          } catch (kakaoError) {
            console.error(`✗ 알림톡 발송 실패: ${creatorName}`, kakaoError.message);
            allResults.push({
              userId: app.user_id,
              creatorName,
              campaignName,
              deadline: date,
              label,
              status: 'failed',
              error: kakaoError.message
            });
          }
        } catch (error) {
          console.error(`Application 처리 오류 (${app.id}):`, error);
          allResults.push({
            applicationId: app.id,
            deadline: date,
            label,
            status: 'failed',
            error: error.message
          });
        }
      }
    }

    console.log('\n=== 영상 제출 마감일 알림 스케줄러 완료 ===');
    console.log('총 처리 결과:', JSON.stringify(allResults, null, 2));

    const sentCount = allResults.filter(r => r.status === 'sent').length;
    const failedCount = allResults.filter(r => r.status === 'failed').length;
    const skippedCount = allResults.filter(r => r.status === 'skipped').length;

    // 네이버 웍스로 보고서 전송
    try {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID;
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET;
      const botId = process.env.NAVER_WORKS_BOT_ID;
      const channelId = process.env.NAVER_WORKS_CHANNEL_ID;
      const serviceAccount = '7c15c.serviceaccount@howlab.co.kr';

      if (clientId && clientSecret && botId && channelId && allResults.length > 0) {
        // 보고서 메시지 작성
        const sent3Days = allResults.filter(r => r.status === 'sent' && r.label === '3일 전');
        const sent2Days = allResults.filter(r => r.status === 'sent' && r.label === '2일 전');
        const sentToday = allResults.filter(r => r.status === 'sent' && r.label === '당일');
        const failed = allResults.filter(r => r.status === 'failed');
        const skipped = allResults.filter(r => r.status === 'skipped');

        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let reportMessage = `🎬 영상 제출 마감일 알림톡 발송 완료 보고\n\n`;
        reportMessage += `일시: ${koreanDate}\n`;
        reportMessage += `총 처리: ${allResults.length}건\n\n`;

        if (sent3Days.length > 0) {
          reportMessage += `📅 3일 전 알림 (${sent3Days.length}건):\n`;
          sent3Days.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    마감일: ${r.deadline}\n`;
          });
          reportMessage += `\n`;
        }

        if (sent2Days.length > 0) {
          reportMessage += `⏰ 2일 전 알림 (${sent2Days.length}건):\n`;
          sent2Days.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    마감일: ${r.deadline}\n`;
          });
          reportMessage += `\n`;
        }

        if (sentToday.length > 0) {
          reportMessage += `🚨 당일 알림 (${sentToday.length}건):\n`;
          sentToday.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    마감일: ${r.deadline} (오늘)\n`;
          });
          reportMessage += `\n`;
        }

        if (skipped.length > 0) {
          reportMessage += `⚠️ 발송 생략 (${skipped.length}건):\n`;
          skipped.forEach(r => {
            reportMessage += `  • ${r.campaignName}\n`;
            reportMessage += `    사유: ${r.reason}\n`;
          });
          reportMessage += `\n`;
        }

        if (failed.length > 0) {
          reportMessage += `❌ 발송 실패 (${failed.length}건):\n`;
          failed.forEach(r => {
            reportMessage += `  • ${r.creatorName} - ${r.campaignName}\n`;
            reportMessage += `    오류: ${r.error}\n`;
          });
        }

        // Access Token 발급 및 메시지 전송
        const accessToken = await getNaverWorksAccessToken(clientId, clientSecret, serviceAccount);
        await sendNaverWorksMessage(accessToken, botId, channelId, reportMessage);
        console.log('네이버 웍스 보고서 전송 완료');
      } else if (!clientId || !clientSecret || !botId || !channelId) {
        console.log('네이버 웍스 설정이 없어 보고서 전송 생략');
      } else {
        console.log('처리된 알림이 없어 네이버 웍스 보고서 전송 생략');
      }
    } catch (worksError) {
      console.error('네이버 웍스 보고서 전송 실패:', worksError);
      // 보고서 전송 실패해도 스케줄러는 성공으로 처리
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '영상 제출 마감일 알림 발송 완료',
        summary: {
          total: allResults.length,
          sent: sentCount,
          failed: failedCount,
          skipped: skippedCount
        },
        results: allResults
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

// Netlify Scheduled Function 설정
exports.config = {
  schedule: '0 1 * * *'  // UTC 1시 = 한국시간 10시
};
