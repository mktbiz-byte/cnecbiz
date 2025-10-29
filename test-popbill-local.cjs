// 로컬에서 Popbill 테스트
const popbill = require('popbill');

// Netlify 환경 변수
const LinkID = process.env.POPBILL_LINK_ID || 'LINKHUB';
const SecretKey = process.env.POPBILL_SECRET_KEY || 'SECRET_KEY';
const CorpNum = process.env.POPBILL_CORP_NUM || '1234567890';
const UserID = process.env.POPBILL_USER_ID || 'testuser';

console.log('=== Popbill 설정 확인 ===');
console.log('LinkID:', LinkID);
console.log('CorpNum:', CorpNum);
console.log('UserID:', UserID);
console.log('SecretKey:', SecretKey ? '설정됨' : '미설정');
console.log('');

// Popbill 전역 설정 (테스트 환경)
popbill.config({
  LinkID: LinkID,
  SecretKey: SecretKey,
  IsTest: true, // 테스트 환경
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

console.log('✓ 테스트 환경 모드 활성화');
console.log('');

// Popbill 서비스 초기화
const kakaoService = popbill.KakaoService();

// 관리자 정보
const ADMINS = [
  { name: '이지훈', phone: '010-7714-7675' },
  { name: '박현용', phone: '010-6886-3302' }
];

// 테스트 회원 정보
const testUser = {
  name: '테스트사용자',
  email: 'test@example.com',
  phone: '010-1234-5678'
};

async function testAll() {
  console.log('=== Popbill 알림톡 테스트 시작 ===');
  console.log('테스트 회원:', testUser);
  console.log('관리자:', ADMINS);
  console.log('');

  const results = [];

  for (const admin of ADMINS) {
    console.log(`\n--- ${admin.name} (${admin.phone}) 테스트 시작 ---`);
    
    try {
      const kakaoResult = await sendKakaoTalk(admin.phone, admin.name, testUser.name, testUser.email, testUser.phone);
      
      results.push({
        phone: admin.phone,
        name: admin.name,
        method: 'kakao',
        success: true,
        result: kakaoResult
      });
      console.log(`✓ 알림톡 발송 성공:`, kakaoResult);
      
    } catch (error) {
      results.push({
        phone: admin.phone,
        name: admin.name,
        method: 'kakao',
        success: false,
        error: error.message
      });
      console.error(`✗ 알림톡 발송 실패:`, error.message);
    }
  }

  console.log('\n=== 테스트 완료 ===');
  console.log(JSON.stringify(results, null, 2));
}

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
      msg: templateContent,
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

    const templateCode = '025100000912';

    console.log(`  - 템플릿 코드: ${templateCode}`);
    console.log(`  - 수신번호: ${receiver.rcv}`);
    console.log(`  - 수신자명: ${receiver.rcvnm}`);
    console.log(`  - 메시지: ${receiver.msg}`);

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

// 테스트 실행
testAll().catch(err => {
  console.error('테스트 실행 오류:', err);
  process.exit(1);
});

