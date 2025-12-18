/**
 * 크리에이터 관리자 비밀번호 재설정 API
 * 슈퍼 관리자가 크리에이터의 비밀번호를 재설정할 수 있는 API
 */

const { createClient } = require('@supabase/supabase-js')

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
    const { email, newPassword, region } = JSON.parse(event.body)

    console.log('크리에이터 비밀번호 재설정 요청:', { email, region })

    // 입력 검증
    if (!email || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '이메일과 새 비밀번호가 필요합니다.' })
      }
    }

    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '비밀번호는 최소 6자 이상이어야 합니다.' })
      }
    }

    // 지역에 따른 Supabase 클라이언트 선택
    let supabaseUrl, supabaseServiceKey

    switch (region) {
      case 'korea':
        supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
        supabaseServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
        break
      case 'japan':
        supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
        supabaseServiceKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
        break
      case 'us':
        supabaseUrl = process.env.VITE_SUPABASE_US_URL
        supabaseServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
        break
      case 'taiwan':
        supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
        supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        break
      default:
        // 기본값: 한국
        supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
        supabaseServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
    }

    // 환경 변수 확인
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('환경 변수 누락:', { region, hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey })
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: '서버 설정 오류입니다.' })
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Auth 사용자 목록에서 이메일로 찾기
    let targetUser = null
    let page = 1
    const perPage = 1000

    while (!targetUser && page <= 10) {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (listError) {
        console.error('사용자 목록 조회 오류:', listError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: '사용자 조회 중 오류: ' + listError.message })
        }
      }

      const users = data?.users || []
      console.log(`페이지 ${page}: ${users.length}명 조회`)

      // 이메일로 사용자 찾기 (대소문자 무시)
      targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (users.length < perPage) break
      page++
    }

    if (!targetUser) {
      console.error('사용자를 찾을 수 없음:', email)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '해당 이메일의 크리에이터를 찾을 수 없습니다.' })
      }
    }

    console.log('사용자 찾음:', targetUser.id, targetUser.email)

    // 비밀번호 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: '비밀번호 변경 실패: ' + updateError.message })
      }
    }

    console.log('크리에이터 비밀번호 변경 완료:', email)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' })
    }

  } catch (error) {
    console.error('서버 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: '서버 오류: ' + error.message })
    }
  }
}
