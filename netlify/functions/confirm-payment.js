/**
 * 수동 입금 확인 처리 API (관리자 전용)
 * 포인트 충전 신청을 승인하고 포인트 지급
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화 (Service Role Key 사용)
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      chargeRequestId,
      adminUserId,
      depositDate,
      depositAmount,
      depositorName,
      memo
    } = JSON.parse(event.body)

    // 입력 검증
    if (!chargeRequestId || !adminUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        })
      }
    }

    // 관리자 권한 확인 (이메일 기반)
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(adminUserId)

    if (adminError || !adminUser) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '사용자 정보를 찾을 수 없습니다.'
        })
      }
    }

    // @cnec.co.kr 도메인 또는 특정 관리자 이메일 확인
    const isAdmin = adminUser.user.email?.endsWith('@cnec.co.kr') || 
                    adminUser.user.email === 'admin@test.com' ||
                    adminUser.user.user_metadata?.role === 'admin'

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '관리자 권한이 필요합니다.'
        })
      }
    }

    // 충전 신청 조회
    const { data: chargeRequest, error: requestError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*')
      .eq('id', chargeRequestId)
      .single()

    if (requestError || !chargeRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청을 찾을 수 없습니다.'
        })
      }
    }

    // 이미 처리된 신청인지 확인
    if (chargeRequest.status === 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 처리된 신청입니다.'
        })
      }
    }

    // 충전 신청 상태 업데이트
    const updateData = {
      status: 'completed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: adminUserId
    }

    if (depositDate) updateData.deposit_date = depositDate
    if (depositAmount) updateData.deposit_amount = depositAmount
    if (depositorName) updateData.depositor_name = depositorName
    if (memo) updateData.admin_memo = memo

    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update(updateData)
      .eq('id', chargeRequestId)

    if (updateError) {
      console.error('충전 신청 업데이트 오류:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청 업데이트 중 오류가 발생했습니다.',
          details: updateError.message
        })
      }
    }

    // 포인트 지급
    const pointsToAdd = depositAmount || chargeRequest.amount
    const { error: pointsError } = await supabaseAdmin.rpc('add_points', {
      user_id: chargeRequest.company_id,
      points: parseInt(pointsToAdd),
      transaction_type: 'charge',
      transaction_description: `계좌이체 충전 - ${parseInt(pointsToAdd).toLocaleString()}원 (관리자 승인)`
    })

    if (pointsError) {
      console.error('포인트 지급 오류:', pointsError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '포인트 지급 중 오류가 발생했습니다.',
          details: pointsError.message
        })
      }
    }

    // 회사 정보 조회 (알림 발송용)
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('company_name, email, phone, contact_person')
      .eq('user_id', chargeRequest.company_id)
      .single()

    // TODO: 카카오톡 알림 발송 (입금 확인 완료)
    // await sendKakaoNotification(...)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '입금 확인이 완료되었습니다.',
        data: {
          chargeRequestId,
          companyName: company?.company_name,
          pointsAdded: pointsToAdd
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

