/**
 * 관리자 비밀번호 재설정 API
 * 슈퍼 관리자가 기업 사용자의 비밀번호를 재설정할 수 있는 API
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase Admin 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    // 환경 변수 확인
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('환경 변수 누락:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      })
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '서버 설정 오류입니다.'
        })
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { email, newPassword } = JSON.parse(event.body)

    console.log('비밀번호 재설정 요청:', { email, passwordLength: newPassword?.length })

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

    // 1. 먼저 companies 테이블에서 해당 이메일의 기업 확인
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, email, company_name, auth_user_id')
      .eq('email', email.toLowerCase())
      .single()

    if (companyError) {
      console.error('기업 조회 오류:', companyError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '해당 이메일의 기업을 찾을 수 없습니다.'
        })
      }
    }

    console.log('기업 정보:', { companyId: company.id, companyName: company.company_name })

    // 2. auth.users에서 이메일로 사용자 찾기 (페이징 처리)
    let targetUser = null
    let page = 1
    const perPage = 100

    while (!targetUser) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (listError) {
        console.error('사용자 목록 조회 오류:', listError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: '사용자 조회 중 오류가 발생했습니다.',
            details: listError.message
          })
        }
      }

      // 해당 이메일의 사용자 찾기
      targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

      // 더 이상 사용자가 없으면 종료
      if (users.length < perPage) {
        break
      }
      page++

      // 무한 루프 방지
      if (page > 100) {
        console.error('사용자 검색 페이지 초과')
        break
      }
    }

    if (!targetUser) {
      console.error('Auth 사용자를 찾을 수 없음:', email)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '해당 이메일의 인증 계정을 찾을 수 없습니다.'
        })
      }
    }

    console.log('Auth 사용자 찾음:', { userId: targetUser.id, email: targetUser.email })

    // 3. 비밀번호 업데이트
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
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

    console.log(`관리자 비밀번호 재설정 완료: ${email} (User ID: ${targetUser.id})`)

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
