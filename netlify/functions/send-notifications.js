const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      type, // 'deposit_request' | 'deposit_confirmed' | 'credit_approved'
      chargeRequestId,
      userEmail,
      userPhone,
      userName,
      amount,
      depositorName,
      points
    } = JSON.parse(event.body);

    console.log('Sending notifications:', { type, chargeRequestId });

    const results = {
      kakao: null,
      email: null,
      sms: null
    };

    // 1. 카카오톡 알림톡 발송
    try {
      const kakaoMessage = getKakaoMessage(type, {
        userName,
        amount,
        depositorName,
        points
      });

      const kakaoResult = await sendKakaoTalk(userPhone, kakaoMessage);
      results.kakao = kakaoResult;
      console.log('Kakao sent:', kakaoResult);
    } catch (kakaoError) {
      console.error('Kakao failed:', kakaoError);
      
      // 카카오톡 실패 시 SMS 발송
      try {
        const smsMessage = getSMSMessage(type, {
          userName,
          amount,
          depositorName,
          points
        });

        const smsResult = await sendSMS(userPhone, smsMessage);
        results.sms = smsResult;
        console.log('SMS sent (fallback):', smsResult);
      } catch (smsError) {
        console.error('SMS failed:', smsError);
        results.sms = { error: smsError.message };
      }
    }

    // 2. 이메일 발송
    try {
      const emailContent = getEmailContent(type, {
        userName,
        amount,
        depositorName,
        points
      });

      const emailResult = await sendEmail(userEmail, emailContent);
      results.email = emailResult;
      console.log('Email sent:', emailResult);
    } catch (emailError) {
      console.error('Email failed:', emailError);
      results.email = { error: emailError.message };
    }

    // 3. 알림 기록 저장
    await supabase
      .from('notification_logs')
      .insert({
        charge_request_id: chargeRequestId,
        notification_type: type,
        kakao_result: results.kakao,
        email_result: results.email,
        sms_result: results.sms,
        created_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        results
      })
    };

  } catch (error) {
    console.error('Notification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

// 카카오톡 알림톡 발송
async function sendKakaoTalk(phone, message) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''), // 하이픈 제거
      rcvnm: message.receiverName,
      msg: message.content,
      altmsg: message.altContent, // 대체문자 내용
      altsjt: message.altSubject, // 대체문자 제목
      snd: '1833-6025', // 발신번호
      sndnm: 'CNEC'
    };

    // 템플릿 코드는 Popbill에서 미리 등록해야 함
    const templateCode = message.templateCode;

    kakaoService.sendATS(
      CorpNum,
      templateCode,
      '1833-6025', // 발신번호
      '', // 알림톡 내용 (템플릿 사용 시 빈 문자열)
      '', // 대체문자 내용
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

// SMS 문자 발송
async function sendSMS(phone, message) {
  return new Promise((resolve, reject) => {
    const receiver = {
      rcv: phone.replace(/-/g, ''),
      rcvnm: message.receiverName,
      msg: message.content
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

// 이메일 발송
async function sendEmail(email, content) {
  // Supabase에서 이메일 발송 (또는 다른 이메일 서비스 사용)
  // 여기서는 간단히 로그만 남김
  console.log('Email to:', email, content);
  return { sent: true, to: email };
}

// 카카오톡 메시지 내용 생성
function getKakaoMessage(type, data) {
  const messages = {
    deposit_request: {
      templateCode: 'DEPOSIT_REQUEST', // Popbill에서 미리 등록 필요
      receiverName: data.userName,
      content: `[CNEC] 포인트 충전 입금 요청
      
안녕하세요, ${data.userName}님.

포인트 충전 신청이 완료되었습니다.
아래 계좌로 입금해주시면 자동으로 포인트가 충전됩니다.

입금 계좌: IBK기업은행 047-122753-04-011
예금주: 주식회사 하우피파
입금자명: ${data.depositorName}
입금 금액: ${data.amount.toLocaleString()}원

입금 확인 후 포인트가 자동으로 충전됩니다.

문의: 1833-6025`,
      altContent: `[CNEC] 포인트 충전 입금 요청\n입금계좌: IBK기업은행 047-122753-04-011\n입금자명: ${data.depositorName}\n금액: ${data.amount.toLocaleString()}원\n문의: 1833-6025`,
      altSubject: '[CNEC] 포인트 충전 입금 요청'
    },
    deposit_confirmed: {
      templateCode: 'DEPOSIT_CONFIRMED',
      receiverName: data.userName,
      content: `[CNEC] 입금 확인 완료

안녕하세요, ${data.userName}님.

입금이 확인되었습니다!
충전 포인트: ${data.points.toLocaleString()}P

문의: 1833-6025`,
      altContent: `[CNEC] 입금 확인 완료\n충전 포인트: ${data.points.toLocaleString()}P\n문의: 1833-6025`,
      altSubject: '[CNEC] 입금 확인 완료'
    },
    credit_approved: {
      templateCode: 'CREDIT_APPROVED',
      receiverName: data.userName,
      content: `[CNEC] 미수금 포인트 선지급

안녕하세요, ${data.userName}님.

미수금으로 포인트가 선지급되었습니다.
충전 포인트: ${data.points.toLocaleString()}P
입금 예정일: ${data.expectedDate}

입금 계좌: IBK기업은행 047-122753-04-011
예금주: 주식회사 하우피파
입금자명: ${data.depositorName}
입금 금액: ${data.amount.toLocaleString()}원

문의: 1833-6025`,
      altContent: `[CNEC] 미수금 포인트 선지급\n충전 포인트: ${data.points.toLocaleString()}P\n입금 예정일: ${data.expectedDate}\n문의: 1833-6025`,
      altSubject: '[CNEC] 미수금 포인트 선지급'
    }
  };

  return messages[type];
}

// SMS 메시지 내용 생성
function getSMSMessage(type, data) {
  const messages = {
    deposit_request: {
      receiverName: data.userName,
      content: `[CNEC] 포인트 충전 입금 요청\n입금계좌: IBK기업은행 047-122753-04-011\n입금자명: ${data.depositorName}\n금액: ${data.amount.toLocaleString()}원\n문의: 1833-6025`
    },
    deposit_confirmed: {
      receiverName: data.userName,
      content: `[CNEC] 입금 확인 완료\n충전 포인트: ${data.points.toLocaleString()}P\n문의: 1833-6025`
    },
    credit_approved: {
      receiverName: data.userName,
      content: `[CNEC] 미수금 포인트 선지급\n충전 포인트: ${data.points.toLocaleString()}P\n입금 예정일: ${data.expectedDate}\n문의: 1833-6025`
    }
  };

  return messages[type];
}

// 이메일 내용 생성
function getEmailContent(type, data) {
  const contents = {
    deposit_request: {
      subject: '[CNEC] 포인트 충전 입금 요청',
      html: `
        <h2>포인트 충전 입금 요청</h2>
        <p>안녕하세요, ${data.userName}님.</p>
        <p>포인트 충전 신청이 완료되었습니다.</p>
        <h3>입금 정보</h3>
        <ul>
          <li>입금 계좌: IBK기업은행 047-122753-04-011</li>
          <li>예금주: 주식회사 하우피파</li>
          <li>입금자명: ${data.depositorName}</li>
          <li>입금 금액: ${data.amount.toLocaleString()}원</li>
        </ul>
        <p>입금 확인 후 포인트가 자동으로 충전됩니다.</p>
        <p>문의: 1833-6025</p>
      `
    },
    deposit_confirmed: {
      subject: '[CNEC] 입금 확인 완료',
      html: `
        <h2>입금 확인 완료</h2>
        <p>안녕하세요, ${data.userName}님.</p>
        <p>입금이 확인되었습니다!</p>
        <h3>충전 정보</h3>
        <ul>
          <li>충전 포인트: ${data.points.toLocaleString()}P</li>
        </ul>
        <p>문의: 1833-6025</p>
      `
    },
    credit_approved: {
      subject: '[CNEC] 미수금 포인트 선지급',
      html: `
        <h2>미수금 포인트 선지급</h2>
        <p>안녕하세요, ${data.userName}님.</p>
        <p>미수금으로 포인트가 선지급되었습니다.</p>
        <h3>충전 정보</h3>
        <ul>
          <li>충전 포인트: ${data.points.toLocaleString()}P</li>
          <li>입금 예정일: ${data.expectedDate}</li>
        </ul>
        <h3>입금 정보</h3>
        <ul>
          <li>입금 계좌: IBK기업은행 047-122753-04-011</li>
          <li>예금주: 주식회사 하우피파</li>
          <li>입금자명: ${data.depositorName}</li>
          <li>입금 금액: ${data.amount.toLocaleString()}원</li>
        </ul>
        <p>문의: 1833-6025</p>
      `
    }
  };

  return contents[type];
}

