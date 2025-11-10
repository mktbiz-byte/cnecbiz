/**
 * 비밀번호 재설정 요청 API
 * 이메일로 비밀번호 재설정 링크 발송
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase Admin 클라이언트 초기화
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
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
    const { email } = JSON.parse(event.body)

    // 입력 검증
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이메일을 입력해주세요.'
        })
      }
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '올바른 이메일 형식을 입력해주세요.'
        })
      }
    }

    // 계정 존재 여부 확인
    const { data: company, error: queryError } = await supabaseAdmin
      .from('companies')
      .select('id, email, company_name')
      .eq('email', email)
      .single()

    if (queryError || !company) {
      // 보안을 위해 계정이 없어도 성공 메시지 반환
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '비밀번호 재설정 이메일이 발송되었습니다. (등록된 이메일인 경우)'
        })
      }
    }

    // Supabase Auth 비밀번호 재설정 이메일 발송
    const redirectUrl = `${process.env.URL}/reset-password`
    
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl
      }
    )

    if (resetError) {
      console.error('비밀번호 재설정 이메일 발송 오류:', resetError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이메일 발송 중 오류가 발생했습니다.'
        })
      }
    }

    console.log(`비밀번호 재설정 이메일 발송 완료: ${email}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.'
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
