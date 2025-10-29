const popbill = require('popbill');

// Popbill 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID,
  SecretKey: process.env.POPBILL_SECRET_KEY,
  IsTest: true, // 테스트 환경
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

// 관리자 정보 (이름과 번호)
const ADMINS = [
  { name: '이지훈', phone: '010-7714-7675' },
  { name: '박현용', phone: '010-6886-3302' }
];

exports.handler = async (event) => {
  try {
    const { userName, userEmail, userPhone } = JSON.parse(event.body);

    console.log('회원가입 알림 발송:', { userName, userEmail, userPhone });

    const results = [];

    // 각 관리자에게 카카오톡 알림톡 발송
    for (const admin of ADMINS) {
      try {
        const kakaoResult = await sendKakaoTalk(admin.phone, admin.name, userName, userEmail, userPhone);
        results.push({
          phone: admin.phone,
          name: admin.name,
          method: 'kakao',
          success: true,
          result: kakaoResult
        });
        console.log(`✓ 알림톡 발송 성공 (${admin.name} ${admin.phone}):`, kakaoResult);
      } catch (error) {
        results.push({
          phone: admin.phone,
          name: admin.name,
          method: 'kakao',
          success: false,
          error: error.message
        });
        console.error(`✗ 알림톡 발송 실패 (${admin.name} ${admin.phone}):`, error.message);
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
function sendKakaoTalk(phone, adminName, userName, userEmail, userPhone) {
  return new Promise((resolve, reject) => {
    // 템플릿 내용: #{회원명}님 가입을 환영합니다.
    const templateContent = `${userName}님 가입을 환영합니다.
앞으로도 많은 관심과 이용 부탁 드립니다.
가입 후 기업 프로필을 설정해 주세요.`;

    const receiver = {
      rcv: phone.replace(/-/g, ''),
      rcvnm: adminName,
      msg: templateContent, // 템플릿 내용 (#{회원명} 대신 실제 이름)
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

    console.log('Sending KakaoTalk:', {
      to: phone,
      name: adminName,
      template: templateCode,
      content: templateContent
    });

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

