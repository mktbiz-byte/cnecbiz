/**
 * 미수금 선지급 API
 * 슈퍼관리자가 기업에게 포인트를 선지급하고 나중에 입금받는 시스템
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
      companyId,
      amount,
      quantity,
      packageAmount,
      depositorName,
      expectedPaymentDate,
      creditNotes,
      needsTaxInvoice,
      taxInvoiceInfo,
      adminUserId
    } = JSON.parse(event.body)

    // 입력 검증
    if (!companyId || !amount || !depositorName || !expectedPaymentDate || !adminUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        })
      }
    }

    // 금액 검증
    if (amount < 10000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '최소 충전 금액은 10,000원입니다.'
        })
      }
    }

    // 관리자 권한 확인
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single()

    if (adminError || !adminUser || adminUser.role !== 'super_admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '관리자 권한이 필요합니다.'
        })
      }
    }

    // 회사 정보 확인
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, company_name, email')
      .eq('user_id', companyId)
      .single()

    if (companyError || !company) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '회사 정보를 찾을 수 없습니다.'
        })
      }
    }

    // 1. 포인트 선지급
    const { error: pointsError } = await supabaseAdmin.rpc('add_points', {
      user_id: companyId,
      points: parseInt(amount),
      transaction_type: 'credit',
      transaction_description: `미수금 선지급 - ${parseInt(amount).toLocaleString()}원 (입금 예정: ${expectedPaymentDate})`
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

    // 2. 미수금 충전 요청 생성
    const chargeData = {
      company_id: companyId,
      amount: parseInt(amount),
      quantity: quantity || 1,
      package_amount: packageAmount || amount,
      payment_method: 'bank_transfer',
      depositor_name: depositorName,
      needs_tax_invoice: needsTaxInvoice || false,
      tax_invoice_info: taxInvoiceInfo || null,
      is_credit: true,
      expected_payment_date: expectedPaymentDate,
      credit_notes: creditNotes || null,
      credit_approved_by: adminUserId,
      credit_approved_at: new Date().toISOString(),
      status: 'pending' // 입금 대기 상태
    }

    const { data: chargeRequest, error: chargeError } = await supabaseAdmin
      .from('points_charge_requests')
      .insert([chargeData])
      .select()
      .single()

    if (chargeError) {
      console.error('미수금 요청 생성 오류:', chargeError)
      
      // 포인트 지급은 이미 완료되었으므로 롤백 필요
      await supabaseAdmin.rpc('add_points', {
        user_id: companyId,
        points: -parseInt(amount),
        transaction_type: 'credit_rollback',
        transaction_description: `미수금 선지급 롤백 - 요청 생성 실패`
      })

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '미수금 요청 생성 중 오류가 발생했습니다.',
          details: chargeError.message
        })
      }
    }

    console.log(`✅ 미수금 선지급 완료: ${company.company_name} - ${amount.toLocaleString()}원`)

    // 3. 미수금 선지급 알림 발송
    try {
      const axios = require('axios')
      await axios.post(
        `${process.env.URL}/.netlify/functions/send-notifications`,
        {
          type: 'credit_approved',
          chargeRequestId: chargeRequest.id,
          userEmail: company.email,
          userPhone: company.phone,
          userName: company.company_name,
          amount: parseInt(amount),
          depositorName: depositorName,
          points: parseInt(amount),
          expectedDate: expectedPaymentDate
        }
      )
    } catch (notifError) {
      console.error('알림 발송 오류:', notifError.message)
      // 알림 발송 실패해도 선지급은 완료
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: chargeRequest,
        message: `${company.company_name}에게 ${amount.toLocaleString()}원을 선지급했습니다. 입금 예정일: ${expectedPaymentDate}`
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

