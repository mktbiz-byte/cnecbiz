/**
 * 회원가입 완료 API (간소화 버전)
 * SMS 인증 확인 → Supabase Auth 계정 생성 (Admin API) → companies 테이블 insert
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase Admin 클라이언트 초기화 (Service Role Key 사용 - RLS 우회)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Supabase admin client initialized');

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
  console.log('Complete signup function invoked (simplified version)')
  
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
      companyName,
      contactPerson,
      email,
      password,
      phoneNumber,
      smsCode
    } = JSON.parse(event.body)

    // 입력 검증
    if (!companyName || !contactPerson || !email || !password || !phoneNumber || !smsCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '모든 필수 정보를 입력해주세요.'
        })
      }
    }

    console.log('[complete-signup] Step 1: Checking for existing email')
    
    // 이메일 중복 체크
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

    // Supabase Auth 계정 생성 (Admin API - 이메일 인증 없이)
    console.log('[complete-signup] Step 3: Creating auth user:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 없이 즉시 확인 처리
      user_metadata: {
        company_name: companyName,
        contact_person: contactPerson,
        phone: phoneNumber
      }
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

    // companies 테이블에 기업 정보 저장
    console.log('[complete-signup] Step 4: Inserting company data')
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{
        user_id: authData.user.id,
        company_name: companyName,
        contact_person: contactPerson,
        email,
        phone: phoneNumber.replace(/[^0-9]/g, ''),
        status: 'active',
        points_balance: 0,
        profile_completed: false,
        is_approved: false,  // 승인 대기 상태로 시작
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
    console.log('[complete-signup] 회원가입 완료 - 승인 대기')

    // Step 5: 관리자에게 알림 발송 (네이버웍스)
    console.log('[complete-signup] Step 5: Sending admin notification')
    try {
      const koreanDate = new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const adminMessage = `🆕 신규 브랜드 가입 승인 요청

회사명: ${companyName}
담당자: ${contactPerson}
이메일: ${email}
연락처: ${phoneNumber}

가입일시: ${koreanDate}

⚠️ 상담 완료 후 승인 처리가 필요합니다.
관리자 페이지에서 승인해 주세요.`

      // 네이버웍스로 알림 전송 (내부 호출)
      const https = require('https')
      const notifyData = JSON.stringify({
        isAdminNotification: true,
        message: adminMessage
      })

      // 같은 도메인의 netlify function 호출 (환경에 따라 다름)
      const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'
      const notifyUrl = new URL('/.netlify/functions/send-naver-works-message', baseUrl)

      await new Promise((resolve, reject) => {
        const protocol = notifyUrl.protocol === 'https:' ? https : require('http')
        const req = protocol.request({
          hostname: notifyUrl.hostname,
          port: notifyUrl.port || (notifyUrl.protocol === 'https:' ? 443 : 80),
          path: notifyUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(notifyData)
          }
        }, (res) => {
          res.on('data', () => {})
          res.on('end', () => resolve())
        })
        req.on('error', (err) => {
          console.error('[complete-signup] Admin notification failed:', err.message)
          resolve() // 알림 실패해도 가입은 완료
        })
        req.write(notifyData)
        req.end()
      })

      console.log('[complete-signup] Admin notification sent')
    } catch (notifyError) {
      console.error('[complete-signup] Admin notification error:', notifyError.message)
      // 알림 실패해도 가입은 완료 처리
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '회원가입이 완료되었습니다. 승인 후 서비스 이용이 가능합니다.',
        data: {
          userId: authData.user.id,
          email: authData.user.email,
          companyName: companyData.company_name,
          isApproved: false
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
