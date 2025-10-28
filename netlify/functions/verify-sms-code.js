/**
 * SMS 인증번호 확인 API
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * SMS 인증번호 확인
 */
async function verifySMSCode(phone, code) {
  // 인증번호 조회
  const { data, error } = await supabase
    .from('sms_verifications')
    .select('*')
    .eq('phone', phone)
    .eq('code', code)
    .eq('verified', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  // 인증 완료 처리
  await supabase
    .from('sms_verifications')
    .update({ verified: true })
    .eq('id', data.id)

  return data
}

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리 (CORS preflight)
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
    const { phone, code } = JSON.parse(event.body)

    // 입력 검증
    if (!phone || !code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '핸드폰 번호와 인증번호를 입력해주세요.'
        })
      }
    }

    // 핸드폰 번호 형식 검증
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '올바른 핸드폰 번호를 입력해주세요.'
        })
      }
    }

    // 인증번호 형식 검증 (6자리 숫자)
    const cleanCode = code.replace(/[^0-9]/g, '')
    if (cleanCode.length !== 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '올바른 인증번호를 입력해주세요. (6자리)'
        })
      }
    }

    // 인증번호 확인
    const verification = await verifySMSCode(cleanPhone, cleanCode)

    if (verification) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verified: true,
          message: '인증이 완료되었습니다.'
        })
      }
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verified: false,
          message: '인증번호가 일치하지 않거나 만료되었습니다.'
        })
      }
    }

  } catch (error) {
    console.error('서버 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.'
      })
    }
  }
}

