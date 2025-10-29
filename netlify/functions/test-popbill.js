const popbill = require('popbill');

// Popbill 설정
const LinkID = process.env.POPBILL_LINK_ID;
const SecretKey = process.env.POPBILL_SECRET_KEY;
const CorpNum = process.env.POPBILL_CORP_NUM;
const UserID = process.env.POPBILL_USER_ID;

// Popbill 서비스 초기화
const kakaoService = popbill.KakaoService(LinkID, SecretKey);
const messageService = popbill.MessageService(LinkID, SecretKey);

exports.handler = async (event) => {
  try {
    // 테스트할 번호 2개
    const testPhones = ['010-7714-7675', '010-6886-3302'];
    const userName = '테스트사용자';
    
    console.log('=== Popbill 알림톡/SMS 테스트 시작 ===');
    console.log('테스트 번호:', testPhones);

    const results = [];

    // 각 번호에 대해 알림톡 시도 -> 실패 시 SMS 발송
    for (const phone of testPhones) {
      console.log(`\n--- ${phone} 테스트 시작 ---`);
      
      try {
        // 1단계: 알림톡 시도
        console.log(`[${phone}] 알림톡 발송 시도...`);
        const kakaoResult = await sendKakaoTalk(phone, userName);
        
        results.push({
          phone,
          method: 'kakao',
          success: true,
          result: kakaoResult,
          message: '알림톡 발송 성공'
        });
        console.log(`[${phone}] ✓ 알림톡 발송 성공`);
        
      } catch (kakaoError) {
        console.log(`[${phone}] ✗ 알림톡 발송 실패:`, kakaoError.message);
        
        try {
          // 2단계: SMS 대체 발송
          console.log(`[${phone}] SMS 대체 발송 시도...`);
          const smsResult = await sendSMS(phone, userName);
          
          results.push({
            phone,
            method: 'sms_fallback',
            success: true,
            result: smsResult,
            message: 'SMS 대체 발송 성공',
            kakaoError: kakaoError.message
          });
          console.log(`[${phone}] ✓ SMS 대체 발송 성공`);
          
        } catch (smsError) {
          results.push({
            phone,
            method: 'both_failed',
            success: false,
            kakaoError: kakaoError.message,
            smsError: smsError.message,
            message: '알림톡 및 SMS 모두 실패'
          });
          console.error(`[${phone}] ✗ SMS 발송도 실패:`, smsError.message);
        }
      }
    }

    console.log('\n=== 테스트 완료 ===');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        success: true,
        message: '테스트 완료',
        testPhones,
        results
      }, null, 2)
    };

  } catch (error) {
    console.error('테스트 오류:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};

// 카카오톡 알림톡 발송
async function sendKakaoTalk(phone, userName) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''), // 하이픈 제거
      rcvnm: userName,
      msg: '', // 템플릿 사용 시 빈 문자열
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

    const templateCode = '025100000912'; // Popbill에 등록된 템플릿 코드

    kakaoService.sendATS(
      CorpNum,
      templateCode,
      '1833-6025', // 발신번호
      '', // 알림톡 내용 (템플릿 사용 시 빈 문자열)
      '', // 대체문자 내용
      [receiver], // 수신자 배열
      null, // 예약일시
      UserID,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}

// SMS 문자 발송
async function sendSMS(phone, userName) {
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

    messageService.sendSMS(
      CorpNum,
      '1833-6025', // 발신번호
      '', // 제목 (SMS는 제목 없음)
      '', // 내용 (receiver에 포함)
      [receiver],
      null, // 예약일시
      UserID,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}

