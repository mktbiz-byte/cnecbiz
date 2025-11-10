const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

// Popbill 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID,
  SecretKey: process.env.POPBILL_SECRET_KEY,
  IsTest: false, // 운영 환경
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

const CorpNum = process.env.POPBILL_CORP_NUM;
const UserID = process.env.POPBILL_USER_ID;

// Popbill 서비스 초기화
const kakaoService = popbill.KakaoService();
const messageService = popbill.MessageService();

// Supabase 클라이언트 (이메일 발송용)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  try {
    const { userName, userEmail, userPhone } = JSON.parse(event.body);

    console.log('회원가입 환영 메시지 발송:', { userName, userEmail, userPhone });

    const results = {
      kakao: null,
      sms: null,
      email: null
    };

    // 1. 카카오톡 알림톡 시도
    try {
      const kakaoResult = await sendKakaoTalk(userPhone, userName);
      results.kakao = { success: true, result: kakaoResult };
      console.log('✓ 알림톡 발송 성공:', kakaoResult);
    } catch (kakaoError) {
      console.log('✗ 알림톡 발송 실패:', kakaoError.message);
      results.kakao = { success: false, error: kakaoError.message };
      
      // 2. 알림톡 실패 시 SMS 대체 발송
      try {
        const smsResult = await sendSMS(userPhone, userName);
        results.sms = { success: true, result: smsResult };
        console.log('✓ SMS 대체 발송 성공:', smsResult);
      } catch (smsError) {
        console.error('✗ SMS 발송도 실패:', smsError.message);
        results.sms = { success: false, error: smsError.message };
      }
    }

    // 3. 이메일 발송
    try {
      const emailResult = await sendEmail(userEmail, userName);
      results.email = { success: true, result: emailResult };
      console.log('✓ 이메일 발송 성공:', emailResult);
    } catch (emailError) {
      console.error('✗ 이메일 발송 실패:', emailError.message);
      results.email = { success: false, error: emailError.message };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '회원가입 환영 메시지 발송 완료',
        results
      })
    };

  } catch (error) {
    console.error('회원가입 메시지 발송 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

// 카카오톡 알림톡 발송
function sendKakaoTalk(phone, userName) {
  return new Promise((resolve, reject) => {
    // 템플릿 내용: #{회원명}님 가입을 환영합니다.
    const templateContent = `${userName}님 가입을 환영합니다.
앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 기업 프로필을 설정해 주세요.`;

    const receiver = {
      rcv: phone.replace(/-/g, ''),
      rcvnm: userName,
      msg: templateContent,
      altmsg: `[CNEC BIZ] 회원가입을 환영합니다!

안녕하세요, ${userName}님.

회원가입이 완료되었습니다.
앞으로도 많은 관심과 이용 부탁 드립니다.

가입 후 기업 프로필을 설정해 주세요.

문의: 1833-6025`,
      altsjt: '[CNEC BIZ] 회원가입 완료',
      snd: '1833-6025',
      sndnm: 'CNEC'
    };

    const templateCode = '025100000912'; // 회원가입 템플릿

    kakaoService.sendATS_one(
      CorpNum,
      templateCode,
      '1833-6025',
      receiver.msg,
      receiver.altmsg,
      'A',
      '',
      receiver.rcv,
      receiver.rcvnm,
      UserID,
      '',
      null,
      (receiptNum) => {
        resolve({ receiptNum });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// SMS 문자 발송
function sendSMS(phone, userName) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''),
      rcvnm: userName,
      msg: `[CNEC BIZ] 회원가입을 환영합니다!

안녕하세요, ${userName}님.

회원가입이 완료되었습니다.
앞으로도 많은 관심과 이용 부탁 드립니다.

가입 후 기업 프로필을 설정해 주세요.

문의: 1833-6025`
    };

    messageService.sendSMS_multi(
      CorpNum,
      '1833-6025',
      'CNEC',
      [receiver],
      '',
      UserID,
      (receiptNum) => {
        resolve({ receiptNum });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// 이메일 발송 (send-notification-helper 사용)
async function sendEmail(email, userName) {
  try {
    const { generateEmailHtml } = require('./send-notification-helper');
    const templateCode = '025100000912'; // 회원가입
    const variables = { '회원명': userName };
    const emailTemplate = generateEmailHtml(templateCode, variables);
    
    // send-email Function 호출
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      })
    });

    const result = await response.json();

    if (result.success) {
      return { sent: true, to: email, method: 'gmail', messageId: result.messageId };
    } else {
      throw new Error(result.error || '이메일 발송 실패');
    }
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    throw error;
  }
}

