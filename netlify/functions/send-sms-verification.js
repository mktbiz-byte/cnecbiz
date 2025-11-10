/**
 * SMS 인증번호 발송 API
 * 팝빌 SMS API를 사용하여 인증번호 발송
 */

const { createClient } = require('@supabase/supabase-js')
const popbill = require('popbill')

// 팝빌 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

// 팝빌 SMS 서비스 객체 생성
const messageService = popbill.MessageService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SMS_SENDER = process.env.POPBILL_SMS_SENDER || '1833-6025';

console.log('Popbill SMS service initialized');

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.VITE_SUPABASE_BIZ_ANON_KEY
);

console.log('Supabase client initialized');

/**
 * 6자리 랜덤 인증번호 생성
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * 팝빌 SMS 발송 API 호출 (공식 문서 방식)
 */
async function sendSMS(receiver, message) {
  return new Promise((resolve, reject) => {
    messageService.sendSMS(
      POPBILL_CORP_NUM,     // 사업자번호
      POPBILL_SMS_SENDER,   // 발신번호
      receiver,             // 수신번호
      '',                   // 수신자명
      message,              // 메시지 내용
      '',                   // 예약일시
      false,                // 광고여부
      'CNEC',               // 발신자명
      '',                   // 요청번호
      (receiptNum) => {
        resolve({ receiptNum })
      },
      (error) => {
        reject(error)
      }
    )
  })
}

exports.handler = async (event, context) => {
  console.log('SMS Function invoked:', event.httpMethod)
  
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const { phone, phoneNumber, name } = JSON.parse(event.body)
    const targetPhone = phone || phoneNumber

    console.log('SMS 발송 요청:', targetPhone)

    // 입력 검증
    if (!targetPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '전화번호를 입력해주세요.'
        })
      }
    }

    // 전화번호 형식 검증 (10-11자리)
    const cleanPhoneNumber = targetPhone.replace(/[^0-9]/g, '')
    if (cleanPhoneNumber.length < 10 || cleanPhoneNumber.length > 11) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '올바른 전화번호를 입력해주세요.'
        })
      }
    }

    // 인증번호 생성
    const verificationCode = generateVerificationCode()
    // 명시적으로 UTC 시간 사용 (Supabase는 UTC 저장)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000) // 10분 후 만료
    
    console.log('[sendSMS] Current time (UTC):', now.toISOString())
    console.log('[sendSMS] Expires at (UTC):', expiresAt.toISOString())

    // SMS 메시지 작성
    const message = `[CNEC] 인증번호: ${verificationCode}\n10분 이내에 입력해주세요.`

    console.log('팡빌 SMS 발송 시작:', cleanPhoneNumber)

    // 팝빌 SMS 발송
    try {
      const result = await sendSMS(cleanPhoneNumber, message)
      console.log('SMS 발송 성공:', result)
    } catch (error) {
      console.error('팝빌 SMS 발송 오류:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'SMS 발송 중 오류가 발생했습니다.',
          details: error.message
        })
      }
    }

    // Supabase에 인증번호 저장
    const { error: dbError } = await supabase
      .from('sms_verifications')
      .insert([{
        phone_number: cleanPhoneNumber,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        verified: false
      }])

    if (dbError) {
      console.error('DB 저장 오류:', dbError)
      // DB 저장 실패해도 SMS는 발송되었으므로 성공으로 처리
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'SMS 인증번호가 발송되었습니다.',
        expiresIn: 600 // 10분 (초 단위)
      })
    }

  } catch (error) {
    console.error('서버 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error.message
      })
    }
  }
}

