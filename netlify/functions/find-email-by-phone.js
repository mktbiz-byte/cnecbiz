/**
 * 핸드폰 번호로 ID(이메일) 찾기 API
 * SMS 인증 후 호출됨
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
    const { phoneNumber } = JSON.parse(event.body)

    // 입력 검증
    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '핸드폰 번호를 입력해주세요.'
        })
      }
    }

    // 전화번호 형식 정리
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '')

    if (cleanPhoneNumber.length < 10 || cleanPhoneNumber.length > 11) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '올바른 핸드폰 번호를 입력해주세요.'
        })
      }
    }

    // SMS 인증이 완료되었는지 확인
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', cleanPhoneNumber)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (verifyError || !verification) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: '핸드폰 인증을 먼저 완료해주세요.'
        })
      }
    }

    // 인증이 5분 이내인지 확인
    const verifiedAt = new Date(verification.updated_at || verification.created_at)
    const now = new Date()
    const diffMinutes = (now - verifiedAt) / (1000 * 60)

    if (diffMinutes > 5) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: '인증이 만료되었습니다. 다시 인증해주세요.'
        })
      }
    }

    // companies 테이블에서 전화번호로 조회
    const { data: companies, error: queryError } = await supabaseAdmin
      .from('companies')
      .select('email, company_name, created_at')
      .eq('phone_number', cleanPhoneNumber)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('조회 오류:', queryError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '서버 오류가 발생했습니다.'
        })
      }
    }

    // 일치하는 계정이 없는 경우
    if (!companies || companies.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '해당 핸드폰 번호로 등록된 계정을 찾을 수 없습니다.'
        })
      }
    }

    // 이메일 부분 마스킹 (보안을 위해 일부만 표시)
    const maskedEmails = companies.map(company => {
      const email = company.email
      const [localPart, domain] = email.split('@')
      // 앞 3자리만 표시하고 나머지는 마스킹
      const visiblePart = localPart.substring(0, 3)
      const maskedPart = '*'.repeat(Math.max(localPart.length - 3, 3))
      return {
        email: `${visiblePart}${maskedPart}@${domain}`,
        companyName: company.company_name,
        createdAt: company.created_at
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '계정을 찾았습니다.',
        accounts: maskedEmails
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
