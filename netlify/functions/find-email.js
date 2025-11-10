/**
 * ID(이메일) 찾기 API
 * 사업자번호 + 담당자 전화번호로 이메일 찾기
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
    const { businessNumber, phoneNumber } = JSON.parse(event.body)

    // 입력 검증
    if (!businessNumber || !phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '사업자번호와 담당자 전화번호를 입력해주세요.'
        })
      }
    }

    // 사업자번호 형식 정리
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

    // 전화번호 형식 정리
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '')

    // companies 테이블에서 사업자번호 + 전화번호로 조회
    const { data: companies, error: queryError } = await supabaseAdmin
      .from('companies')
      .select('email, company_name, created_at')
      .eq('business_registration_number', cleanBusinessNumber)
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
          error: '일치하는 계정을 찾을 수 없습니다.'
        })
      }
    }

    // 이메일 마스킹 (앞 3자리만 표시)
    const maskedEmails = companies.map(company => {
      const email = company.email
      const [localPart, domain] = email.split('@')
      const maskedLocal = localPart.substring(0, 3) + '*'.repeat(Math.max(localPart.length - 3, 3))
      return {
        email: `${maskedLocal}@${domain}`,
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
