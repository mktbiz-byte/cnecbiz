/**
 * 포인트 충전 신청 취소 API
 * RLS 우회를 위해 Service Role Key 사용
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
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { requestId, userId } = JSON.parse(event.body)

    // 필수 파라미터 검증
    if (!requestId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 파라미터가 누락되었습니다.'
        })
      }
    }

    console.log('[INFO] Cancelling charge request:', requestId, 'for user:', userId)

    // 충전 신청 조회 (본인 확인)
    const { data: chargeRequest, error: fetchError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('id, company_id, status')
      .eq('id', requestId)
      .single()

    if (fetchError || !chargeRequest) {
      console.error('[ERROR] Charge request not found:', fetchError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청을 찾을 수 없습니다.'
        })
      }
    }

    // 본인 확인
    if (chargeRequest.company_id !== userId) {
      console.error('[ERROR] User mismatch:', chargeRequest.company_id, '!==', userId)
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '본인의 충전 신청만 취소할 수 있습니다.'
        })
      }
    }

    // 이미 취소된 경우
    if (chargeRequest.status === 'cancelled') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 취소된 충전 신청입니다.'
        })
      }
    }

    // 완료된 경우 취소 불가
    if (chargeRequest.status === 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 완료된 충전 신청은 취소할 수 없습니다.'
        })
      }
    }

    // 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)

    if (updateError) {
      console.error('[ERROR] Failed to cancel charge request:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '취소 처리 중 오류가 발생했습니다.',
          details: updateError.message
        })
      }
    }

    console.log('[SUCCESS] Charge request cancelled:', requestId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '충전 신청이 취소되었습니다.'
      })
    }

  } catch (error) {
    console.error('[ERROR] Unexpected error:', error)
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
