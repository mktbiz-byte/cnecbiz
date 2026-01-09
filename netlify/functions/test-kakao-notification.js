/**
 * 알림톡 발송 테스트 함수
 * 호출: POST /.netlify/functions/test-kakao-notification
 * Body: { "phone": "01012345678", "name": "테스트" }
 */

const popbill = require('popbill');

// 팝빌 설정
const POPBILL_LINK_ID = process.env.POPBILL_LINK_ID || 'HOWLAB';
const POPBILL_SECRET_KEY = process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=';
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';

// 팝빌 전역 설정
popbill.config({
  LinkID: POPBILL_LINK_ID,
  SecretKey: POPBILL_SECRET_KEY,
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true
});

// 팝빌 카카오톡 서비스 초기화
const kakaoService = popbill.KakaoService();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 환경변수 체크
    const envCheck = {
      POPBILL_LINK_ID: process.env.POPBILL_LINK_ID ? '✅' : '❌ (기본값 사용)',
      POPBILL_SECRET_KEY: process.env.POPBILL_SECRET_KEY ? '✅' : '❌ (기본값 사용)',
      POPBILL_CORP_NUM: POPBILL_CORP_NUM,
      POPBILL_SENDER_NUM: POPBILL_SENDER_NUM,
      POPBILL_TEST_MODE: process.env.POPBILL_TEST_MODE
    };

    console.log('=== 알림톡 테스트 시작 ===');
    console.log('환경변수:', JSON.stringify(envCheck, null, 2));

    // GET 요청이면 환경변수만 반환
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: '알림톡 테스트 - POST 요청으로 테스트하세요',
          envCheck,
          usage: 'POST /.netlify/functions/test-kakao-notification',
          body: '{ "phone": "01012345678", "name": "테스트" }'
        })
      };
    }

    const { phone, name } = JSON.parse(event.body || '{}');

    if (!phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'phone 필수' })
      };
    }

    // 테스트 메시지 (기업용 템플릿 025100001008 - 영상 제출 검수 요청)
    const templateCode = '025100001008';
    const templateContent = `[CNEC] 신청하신 캠페인 영상 제출
#{회사명}님, 신청하신 캠페인의 크리에이터가 촬영 영상을 제출했습니다.
캠페인: #{캠페인명}
크리에이터: #{크리에이터명}
관리자 페이지에서 영상을 검토하시고, 수정 사항이 있으면 피드백을 남겨주세요.
검수 완료 후 sns 업로드 될 예정입니다.
문의: 1833-6025`;

    // 변수 치환
    const variables = {
      '회사명': name || '테스트기업',
      '캠페인명': '테스트 캠페인',
      '크리에이터명': '테스트 크리에이터'
    };

    let message = templateContent;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
    }

    console.log('템플릿 코드:', templateCode);
    console.log('수신번호:', phone);
    console.log('메시지:', message);

    // 기업용 템플릿이므로 @크넥 사용
    const plusFriendID = '@크넥';
    console.log('plusFriendID:', plusFriendID);

    // 팝빌 API 호출
    const result = await new Promise((resolve, reject) => {
      kakaoService.sendATS_one(
        POPBILL_CORP_NUM,
        templateCode,
        POPBILL_SENDER_NUM,
        message,
        message, // altContent
        'A', // altSendType
        '', // requestNum
        phone.replace(/-/g, ''),
        name || '테스트',
        '', // userID
        '', // reserveDT
        null, // btns
        (receiptNum) => {
          console.log('✅ 알림톡 발송 성공:', receiptNum);
          resolve({ success: true, receiptNum });
        },
        (error) => {
          console.error('❌ 알림톡 발송 실패:', error);
          reject(error);
        }
      );
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '알림톡 발송 성공',
        result,
        envCheck
      })
    };

  } catch (error) {
    console.error('테스트 실패:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || JSON.stringify(error),
        code: error.code
      })
    };
  }
};
