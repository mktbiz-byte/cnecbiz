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
    const { 
      type, // 'kakao' | 'sms'
      phone = '010-7714-7675',
      userName = '하우랩'
    } = event.queryStringParameters || {};

    console.log('Testing Popbill:', { type, phone, userName });

    let result;

    if (type === 'kakao') {
      // 카카오톡 테스트
      result = await testKakao(phone, userName);
    } else if (type === 'sms') {
      // SMS 테스트
      result = await testSMS(phone, userName);
    } else {
      throw new Error('Invalid type. Use ?type=kakao or ?type=sms');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        type,
        phone,
        userName,
        result
      })
    };

  } catch (error) {
    console.error('Popbill test error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      })
    };
  }
};

// 카카오톡 테스트
async function testKakao(phone, userName) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''), // 하이픈 제거
      rcvnm: userName,
      msg: '', // 템플릿 사용 시 빈 문자열
      altmsg: `[CNEC BIZ] 회원가입을 환영합니다!\n\n안녕하세요, ${userName}님.\n\n회원가입이 완료되었습니다.\n앞으로도 많은 관심과 이용 부탁 드립니다.\n\n가입 후 기업 프로필을 설정해 주세요.\n\n문의: 1833-6025`,
      altsjt: '[CNEC BIZ] 회원가입 완료',
      snd: '1833-6025',
      sndnm: 'CNEC'
    };

    // 템플릿 코드: 025100000912 (회원가입)
    const templateCode = '025100000912';

    console.log('Sending kakao with:', {
      CorpNum,
      templateCode,
      receiver
    });

    // sendATS_one 사용 (단건 전송)
    kakaoService.sendATS_one(
      CorpNum,
      templateCode,
      '1833-6025', // 발신번호
      '', // 알림톡 내용 (템플릿 사용 시 빈 문자열)
      `[CNEC BIZ] 회원가입을 환영합니다!\n\n안녕하세요, ${userName}님.\n\n회원가입이 완료되었습니다.\n앞으로도 많은 관심과 이용 부탁 드립니다.\n\n가입 후 기업 프로필을 설정해 주세요.\n\n문의: 1833-6025`, // 대체문자 내용
      'A', // 대체문자 유형 [A-대체문자내용]
      '', // 예약일시
      receiver.rcv, // 수신번호
      receiver.rcvnm || userName, // 수신자명
      UserID,
      '', // 요청번호
      null, // 버튼정보
      (receiptNum) => {
        console.log('Kakao success:', receiptNum);
        resolve({ success: true, receiptNum });
      },
      (error) => {
        console.error('Kakao error:', error);
        reject(error);
      }
    );
  });
}

// SMS 테스트
async function testSMS(phone, userName) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''),
      rcvnm: userName,
      msg: `[CNEC BIZ] 테스트 문자입니다.\n\n안녕하세요, ${userName}님.\n\nSMS 발송 테스트가 정상적으로 진행되었습니다.\n\n문의: 1833-6025`
    };

    console.log('Sending SMS with:', {
      CorpNum,
      receiver
    });

    messageService.sendSMS(
      CorpNum,
      '1833-6025',
      '',
      '',
      [receiver],
      null,
      UserID,
      (error, result) => {
        if (error) {
          console.error('SMS error:', error);
          reject(error);
        } else {
          console.log('SMS success:', result);
          resolve(result);
        }
      }
    );
  });
}

