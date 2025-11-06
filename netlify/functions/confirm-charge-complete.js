/**
 * 포인트 충전 완료 API (관리자용)
 * 입금 확인 후 포인트 지급 및 알림 발송
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification, generateEmailHtml } = require('./send-notification-helper')

// Supabase Admin 클라이언트 초기화
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    const { chargeRequestId, adminNote } = JSON.parse(event.body)

    // 입력 검증
    if (!chargeRequestId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청 ID가 필요합니다.'
        })
      }
    }

    // 충전 신청 정보 조회
    const { data: chargeRequest, error: chargeError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*, companies(company_name, email, phone)')
      .eq('id', chargeRequestId)
      .single()

    if (chargeError || !chargeRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청을 찾을 수 없습니다.'
        })
      }
    }

    // 이미 처리된 경우
    if (chargeRequest.status === 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 처리된 충전 신청입니다.'
        })
      }
    }

    // 포인트 지급
    const { error: pointsError } = await supabaseAdmin.rpc('add_points', {
      user_id: chargeRequest.company_id,
      points: parseInt(chargeRequest.amount),
      transaction_type: 'charge',
      transaction_description: `포인트 충전 - ${parseInt(chargeRequest.amount).toLocaleString()}원`
    })

    if (pointsError) {
      console.error('포인트 지급 오류:', pointsError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '포인트 지급 중 오류가 발생했습니다.'
        })
      }
    }

    // 충전 신청 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        admin_note: adminNote || null
      })
      .eq('id', chargeRequestId)

    if (updateError) {
      console.error('충전 신청 상태 업데이트 오류:', updateError)
    }

    // 알림 발송 (카카오톡 + 이메일)
    try {
      const templateCode = '025100000943' // 포인트 충전 완료
      const variables = {
        '회사명': chargeRequest.companies.company_name,
        '포인트': parseInt(chargeRequest.amount).toLocaleString(),
        '캠페인명': '' // 캠페인 연결 시 추가
      }

      const emailTemplate = generateEmailHtml(templateCode, variables)

      await sendNotification({
        receiverNum: chargeRequest.companies.phone,
        receiverEmail: chargeRequest.companies.email,
        receiverName: chargeRequest.companies.company_name,
        templateCode,
        variables,
        emailSubject: emailTemplate.subject,
        emailHtml: emailTemplate.html
      })

      console.log('알림 발송 완료')
    } catch (notifError) {
      console.error('알림 발송 오류:', notifError.message)
      // 알림 발송 실패해도 포인트 지급은 완료
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '포인트 충전이 완료되었습니다.'
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
