/**
 * 수동 입금 매칭 API
 * 관리자가 계좌 거래 내역과 충전 신청서를 수동으로 매칭
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 포인트 충전 처리
 */
async function processDeposit(request, transaction) {
  const { company_id, amount } = request

  // 1. 포인트 충전 (company_id는 auth.users.id이므로 user_id로 조회)
  const { data: currentPoints, error: pointsError } = await supabaseAdmin
    .from('companies')
    .select('points_balance')
    .eq('user_id', company_id)
    .single()

  if (pointsError) throw pointsError

  const newPoints = (currentPoints.points_balance || 0) + amount

  const { error: updateError } = await supabaseAdmin
    .from('companies')
    .update({ points_balance: newPoints })
    .eq('user_id', company_id)

  if (updateError) throw updateError

  // 2. 포인트 거래 내역 기록
  const { error: transactionError } = await supabaseAdmin
    .from('point_transactions')
    .insert({
      company_id,
      amount,
      type: 'charge',
      description: `계좌이체 입금 확인 (수동 매칭)`,
      balance_after: newPoints,
      charge_request_id: request.id
    })

  if (transactionError) throw transactionError

  // 3. 충전 요청 상태 업데이트
  const { error: statusError } = await supabaseAdmin
    .from('points_charge_requests')
    .update({
      status: 'completed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: 'admin_manual',
      deposit_date: transaction.tradeDate,
      actual_amount: parseInt(transaction.tradeBalance),
      memo: `수동 매칭 - 거래일시: ${transaction.tradeDate}`
    })
    .eq('id', request.id)

  if (statusError) throw statusError

  // 4. 매출 기록 추가 (financial_records)
  const { error: revenueError } = await supabaseAdmin
    .from('financial_records')
    .insert({
      record_date: transaction.tradeDate || new Date().toISOString().slice(0, 10),
      type: 'revenue',
      category: 'point_charge',
      amount: amount,
      description: `포인트 충전 - ${request.depositor_name || '미상'}`,
      is_receivable: false
    })

  if (revenueError) {
    console.error('⚠️ 매출 기록 실패:', revenueError)
    // 매출 기록 실패해도 포인트 충전은 완료되었으므로 에러 throw 안 함
  }

  return { success: true, newPoints }
}

/**
 * 알림 발송
 */
async function sendNotification(request) {
  try {
    const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'

    // 알림톡 발송
    if (request.company_phone) {
      await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: '025100000943',
          receiver: request.company_phone,
          variables: {
            회사명: request.company_name,
            금액: request.amount.toLocaleString()
          }
        })
      })
    }

    // 이메일 발송
    if (request.company_email) {
      await fetch(`${baseUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: request.company_email,
          subject: '[CNEC] 포인트 충전 완료',
          html: `
            <h2>포인트 충전이 완료되었습니다</h2>
            <p><strong>${request.company_name}</strong>님의 포인트 충전이 완료되었습니다.</p>
            <p><strong>충전 금액:</strong> ${request.amount.toLocaleString()}원</p>
            <p>충전된 포인트로 캠페인을 진행하실 수 있습니다.</p>
            <p>문의: 1833-6025</p>
          `
        })
      })
    }
  } catch (error) {
    console.error('⚠️ 알림 발송 실패:', error)
    // 알림 실패해도 충전은 완료되었으므로 에러 throw 안 함
  }
}

exports.handler = async (event, context) => {
  console.log('🔗 수동 입금 매칭 시작...')

  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' }
    }

    const { requestId, transaction } = JSON.parse(event.body)

    if (!requestId || !transaction) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 파라미터가 누락되었습니다.'
        })
      }
    }

    console.log(`📋 충전 요청 ID: ${requestId}`)
    console.log(`💰 거래 금액: ${transaction.tradeBalance}원`)

    // 1. 충전 요청 조회
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      throw new Error('충전 요청을 찾을 수 없습니다.')
    }

    // 2. 이미 처리된 요청인지 확인
    if (request.status === 'confirmed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 처리된 충전 요청입니다.'
        })
      }
    }

    // 3. 포인트 충전 처리
    const result = await processDeposit(request, transaction)

    // 4. 알림 발송
    await sendNotification(request)

    console.log(`✅ 수동 매칭 완료! 새 포인트: ${result.newPoints}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '입금이 확인되어 포인트가 충전되었습니다.',
        newPoints: result.newPoints
      })
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
