/**
 * 관리자 비밀번호 재설정 API
 * 슈퍼 관리자가 기업 사용자의 비밀번호를 재설정할 수 있는 API
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
    const { email, newPassword } = JSON.parse(event.body)

    // 입력 검증
    if (!email || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이메일과 새 비밀번호가 필요합니다.'
        })
      }
    }

    // 비밀번호 길이 검증
    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '비밀번호는 최소 6자 이상이어야 합니다.'
        })
      }
    }

    // 이메일로 사용자 찾기
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('사용자 목록 조회 오류:', listError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '사용자 조회 중 오류가 발생했습니다.'
        })
      }
    }

    // 해당 이메일의 사용자 찾기
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '해당 이메일의 사용자를 찾을 수 없습니다.'
        })
      }
    }

    // 비밀번호 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '비밀번호 변경 중 오류가 발생했습니다.',
          details: updateError.message
        })
      }
    }

    console.log(`관리자 비밀번호 재설정 완료: ${email}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.'
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
