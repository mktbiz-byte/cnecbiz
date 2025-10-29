const popbill = require('popbill');

// Popbill 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID,
  SecretKey: process.env.POPBILL_SECRET_KEY,
  IsTest: false, // 운영 환경 (테스트 시 true로 변경)
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

// 관리자 번호 (알림 수신)
const ADMIN_PHONES = ['010-7714-7675', '010-6886-3302'];

exports.handler = async (event) => {
  try {
    const { userName, userEmail, userPhone } = JSON.parse(event.body);

    console.log('회원가입 알림 발송:', { userName, userEmail, userPhone });

    const results = [];

    // 관리자들에게 알림톡 발송 (실패 시 SMS)
    for (const adminPhone of ADMIN_PHONES) {
      try {
        // 1단계: 알림톡 시도
        const kakaoResult = await sendKakaoTalk(adminPhone, userName, userEmail, userPhone);
        results.push({
          phone: adminPhone,
          method: 'kakao',
          success: true,
          result: kakaoResult
        });
        console.log(`✓ 알림톡 발송 성공 (${adminPhone}):`, kakaoResult);
      } catch (kakaoError) {
        console.log(`✗ 알림톡 실패 (${adminPhone}):`, kakaoError.message);
        
        try {
          // 2단계: SMS 대체 발송
          const smsResult = await sendSMS(adminPhone, userName, userEmail, userPhone);
          results.push({
            phone: adminPhone,
            method: 'sms_fallback',
            success: true,
            result: smsResult,
            kakaoError: kakaoError.message
          });
          console.log(`✓ SMS 대체 발송 성공 (${adminPhone}):`, smsResult);
        } catch (smsError) {
          results.push({
            phone: adminPhone,
            method: 'both_failed',
            success: false,
            kakaoError: kakaoError.message,
            smsError: smsError.message
          });
          console.error(`✗ SMS 발송도 실패 (${adminPhone}):`, smsError.message);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '회원가입 알림 발송 완료',
        results
      })
    };

  } catch (error) {
    console.error('회원가입 알림 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

// 카카오톡 알림톡 발송
function sendKakaoTalk(phone, userName, userEmail, userPhone) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''),
      rcvnm: '관리자',
      msg: '', // 템플릿 사용 시 빈 문자열
      altmsg: `[CNEC BIZ] 신규 회원가입 알림

회원명: ${userName}
이메일: ${userEmail}
연락처: ${userPhone}

가입 일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

문의: 1833-6025`,
      altsjt: '[CNEC BIZ] 신규 회원가입',
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
function sendSMS(phone, userName, userEmail, userPhone) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''),
      rcvnm: '관리자',
      msg: `[CNEC BIZ] 신규 회원가입 알림

회원명: ${userName}
이메일: ${userEmail}
연락처: ${userPhone}

가입 일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

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

