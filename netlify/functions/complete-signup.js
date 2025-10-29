/**
 * 회원가입 완료 API
 * 팝빌 기업정보 조회 → SMS 인증 확인 → Supabase Auth 계정 생성 → companies 테이블 insert
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

// 팝빌 서비스 객체 생성
const bizInfoCheckService = popbill.BizInfoCheckService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';

console.log('Popbill service initialized');

// Supabase Admin 클라이언트 초기화 (Service Role Key 사용 - RLS 우회)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Supabase admin client initialized');

/**
 * 팝빌 기업정보 조회 API 호출
 */
async function checkBizInfo(checkCorpNum) {
  return new Promise((resolve, reject) => {
    bizInfoCheckService.checkBizInfo(
      POPBILL_CORP_NUM,
      checkCorpNum,
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )
  })
}

/**
 * SMS 인증 확인
 */
async function verifySMSCode(phoneNumber, code) {
  const { data, error } = await supabaseAdmin
    .from('sms_verifications')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('verification_code', code)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return false
  }

  // 인증 완료 표시
  await supabaseAdmin
    .from('sms_verifications')
    .update({ verified: true })
    .eq('id', data.id)

  return true
}

exports.handler = async (event, context) => {
  console.log('Complete signup function invoked')
  
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
    const {
      businessNumber,
      ceoName,
      companyName,
      email,
      password,
      phoneNumber,
      smsCode
    } = JSON.parse(event.body)

    // 입력 검증
    if (!businessNumber || !ceoName || !companyName || !email || !password || !phoneNumber || !smsCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '모든 필수 정보를 입력해주세요.'
        })
      }
    }

    // 사업자번호 형식 검증
    const cleanBusinessNumber = businessNumber.replace(/[^0-9]/g, '')
    if (cleanBusinessNumber.length !== 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '올바른 사업자번호를 입력해주세요.'
        })
      }
    }

    // SMS 인증 확인
    const smsVerified = await verifySMSCode(phoneNumber.replace(/[^0-9]/g, ''), smsCode)
    if (!smsVerified) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '인증번호가 올바르지 않거나 만료되었습니다.'
        })
      }
    }

    // 팝빌 기업정보 조회
    let bizInfo
    try {
      bizInfo = await checkBizInfo(cleanBusinessNumber)
    } catch (error) {
      console.error('팝빌 API 오류:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '기업정보 조회 중 오류가 발생했습니다.'
        })
      }
    }

    // 대표자명 검증
    if (bizInfo.CEOName !== ceoName.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '대표자명이 일치하지 않습니다.',
          hint: `등록된 대표자명: ${bizInfo.CEOName}`
        })
      }
    }

    // Supabase Auth 계정 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('Auth 계정 생성 오류:', authError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '계정 생성 중 오류가 발생했습니다.',
          details: authError.message
        })
      }
    }

    // companies 테이블에 기업 정보 저장
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{
        id: authData.user.id,
        company_name: companyName,
        business_registration_number: cleanBusinessNumber,
        ceo_name: ceoName,
        email,
        phone_number: phoneNumber.replace(/[^0-9]/g, ''),
        verified: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (companyError) {
      console.error('회사 정보 저장 오류:', companyError)
      
      // Auth 계정 롤백
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '회사 정보 저장 중 오류가 발생했습니다.'
        })
      }
    }

    // 회원가입 카카오톡 전송 (비동기 - 실패해도 회원가입은 성공)
    try {
      await fetch('/.netlify/functions/send-signup-kakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: companyName,
          userPhone: phoneNumber,
          userEmail: email
        })
      })
    } catch (kakaoError) {
      console.error('카카오톡 전송 실패:', kakaoError)
      // 카카오톡 실패는 무시
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '회원가입이 완료되었습니다.',
        data: {
          userId: authData.user.id,
          email: authData.user.email,
          companyName: companyData.company_name
        }
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

