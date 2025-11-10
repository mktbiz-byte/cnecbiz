/**
 * 회원가입 완료 API
 * 팝빌 기업정보 조회 → SMS 인증 확인 → Supabase Auth 계정 생성 → companies 테이블 insert
 */

const { createClient } = require('@supabase/supabase-js')
const popbill = require('popbill')

// 팝빌 전역 설정
popbill.config({
  LinkID: (process.env.POPBILL_LINK_ID || 'HOWLAB').trim(),
  SecretKey: (process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=').trim(),
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
  console.log('[verifySMSCode] Searching for:', { phoneNumber, code })
  
  // verified 상태와 관계없이 최근 인증 레코드 찾기
  const { data, error } = await supabaseAdmin
    .from('sms_verifications')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('verification_code', code)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    console.log('[verifySMSCode] No matching verification found')
    console.log('[verifySMSCode] Error:', error)
    console.log('[verifySMSCode] Searching with phone:', phoneNumber, 'code:', code)
    return false
  }

  // 이미 인증되었더라도 만료되지 않았으면 허용
  console.log('[verifySMSCode] Verification found:', { id: data.id, verified: data.verified })
  
  // 아직 verified=false이면 업데이트
  if (!data.verified) {
    await supabaseAdmin
      .from('sms_verifications')
      .update({ verified: true })
      .eq('id', data.id)
  }

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

    console.log('[complete-signup] Step 1: Checking for existing email')
    
    // 이메일 중복 체크 (사업자번호는 중복 허용)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUser?.users?.some(u => u.email === email)
    if (emailExists) {
      console.log('[complete-signup] Email already exists:', email)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 가입된 이메일입니다.'
        })
      }
    }
    
    console.log('[complete-signup] Step 2: Verifying SMS')
    
    // SMS 인증 확인
    const smsVerified = await verifySMSCode(phoneNumber.replace(/[^0-9]/g, ''), smsCode)
    console.log('[complete-signup] SMS verified:', smsVerified)
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
    console.log('[complete-signup] Checking business info:', cleanBusinessNumber)
    let bizInfo
    try {
      bizInfo = await checkBizInfo(cleanBusinessNumber)
      console.log('[complete-signup] Business info:', bizInfo)
    } catch (error) {
      console.error('[complete-signup] Popbill API error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '기업정보 조회 중 오류가 발생했습니다.',
          details: error.message
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
    console.log('[complete-signup] Creating auth user:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('[complete-signup] Auth creation error:', authError)
      
      // 중복 이메일 오류 처리
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '이미 가입된 이메일입니다.'
          })
        }
      }
      
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
    console.log('[complete-signup] Auth user created:', authData.user.id)
    console.log('[complete-signup] Auth user created:', authData.user.id)

    // companies 테이블에 기업 정보 저장
    console.log('[complete-signup] Step 5: Inserting company data')
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{
        user_id: authData.user.id,
        company_name: companyName,
        business_registration_number: cleanBusinessNumber,
        ceo_name: ceoName,
        email,
        phone: phoneNumber.replace(/[^0-9]/g, ''),
        status: 'active',
        points_balance: 0,
        profile_completed: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (companyError) {
      console.error('[complete-signup] Company insert error:', companyError)
      
      // Auth 계정 롤백
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '회사 정보 저장 중 오류가 발생했습니다.',
          details: companyError.message
        })
      }
    }
    console.log('[complete-signup] Company data saved:', companyData.id)

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
    console.error('[complete-signup] Unexpected error:', error)
    console.error('[complete-signup] Error stack:', error.stack)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error.message,
        stack: error.stack
      })
    }
  }
}

