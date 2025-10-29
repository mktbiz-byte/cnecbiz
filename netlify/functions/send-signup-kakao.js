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

// 이메일 발송 (Gmail SMTP 사용)
async function sendEmail(email, userName) {
  try {
    // send-email Function 호출
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `[CNEC BIZ] ${userName}님, 회원가입을 환영합니다!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">CNEC BIZ</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">글로벌 인플루언서 마케팅 플랫폼</p>
            </div>
            
            <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">🎉 ${userName}님, 환영합니다!</h2>
              
              <p style="color: #4b5563; line-height: 1.6;">
                안녕하세요, ${userName}님!<br><br>
                <strong>CNEC BIZ</strong> 회원가입이 완료되었습니다.<br>
                앞으로도 많은 관심과 이용 부탁 드립니다.
              </p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">📋 다음 단계</h3>
                <ol style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>로그인 후 <strong>기업 프로필</strong>을 설정해 주세요</li>
                  <li>진행 중인 <strong>캠페인</strong>을 확인하세요</li>
                  <li>관심 있는 캠페인에 <strong>지원</strong>하세요</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://cnecbiz.com/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">로그인하기</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                문의사항이 있으시면 <a href="tel:1833-6025" style="color: #667eea; text-decoration: none;">1833-6025</a>로 연락주세요.<br>
                또는 이메일로 문의하실 수 있습니다.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>© 2025 CNEC BIZ. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `
[CNEC BIZ] ${userName}님, 환영합니다!

안녕하세요, ${userName}님!

CNEC BIZ 회원가입이 완료되었습니다.
앞으로도 많은 관심과 이용 부탁 드립니다.

다음 단계:
1. 로그인 후 기업 프로필을 설정해 주세요
2. 진행 중인 캠페인을 확인하세요
3. 관심 있는 캠페인에 지원하세요

로그인: https://cnecbiz.com/login

문의사항이 있으시면 1833-6025로 연락주세요.

© 2025 CNEC BIZ. All rights reserved.
        `
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

