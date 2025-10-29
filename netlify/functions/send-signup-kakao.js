const popbill = require('popbill');

// Popbill 설정
const LinkID = process.env.POPBILL_LINK_ID;
const SecretKey = process.env.POPBILL_SECRET_KEY;
const CorpNum = process.env.POPBILL_CORP_NUM;
const UserID = process.env.POPBILL_USER_ID;

// Popbill 서비스 초기화
const kakaoService = popbill.KakaoService(LinkID, SecretKey);

exports.handler = async (event) => {
  try {
    const { 
      userName,
      userPhone,
      userEmail
    } = JSON.parse(event.body);

    console.log('Sending signup kakao:', { userName, userPhone });

    // 카카오톡 알림톡 발송
    const result = await sendSignupKakao(userPhone, userName);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result
      })
    };

  } catch (error) {
    console.error('Signup kakao error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// 회원가입 카카오톡 알림톡 발송
async function sendSignupKakao(phone, userName) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''), // 하이픈 제거
      rcvnm: userName,
      msg: '', // 템플릿 사용 시 빈 문자열
      altmsg: `[CNEC BIZ] 회원가입을 환영합니다!\n\n안녕하세요, ${userName}님.\n\n회원가입이 완료되었습니다.\n앞으로도 많은 관심과 이용 부탁 드립니다.\n\n가입 후 기업 프로필을 설정해 주세요.\n\n문의: 1833-6025`,
      altsjt: '[CNEC BIZ] 회원가입 완료',
      snd: '1833-6025', // 발신번호
      sndnm: 'CNEC'
    };

    // 템플릿 코드: 025100000912 (회원가입)
    const templateCode = '025100000912';

    // sendATS_one 사용 (단건 전송)
    kakaoService.sendATS_one(
      CorpNum,
      templateCode,
      '1833-6025', // 발신번호
      '', // 알림톡 내용 (템플릿 사용 시 빈 문자열)
      receiver.altmsg, // 대체문자 내용
      'A', // 대체문자 유형
      '', // 예약일시
      receiver.rcv, // 수신번호
      receiver.rcvnm, // 수신자명
      UserID,
      '', // 요청번호
      null, // 버튼정보
      (receiptNum) => {
        console.log('Kakao send success:', receiptNum);
        resolve({ success: true, receiptNum });
      },
      (error) => {
        console.error('Kakao send error:', error);
        reject(error);
      }
    );
  });
}

