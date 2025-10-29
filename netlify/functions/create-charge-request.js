/**
 * 포인트 충전 신청 API
 * RLS 우회를 위해 Service Role Key 사용
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화 (Service Role Key 사용)
const supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
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
      paymentMethod,
      depositorName,
      needsTaxInvoice,
      taxInvoiceInfo,
      stripePaymentIntentId
    } = JSON.parse(event.body)

    // 입력 검증
    if (!companyId || !amount || !paymentMethod) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        })
      }
    }

    // 계좌이체의 경우 입금자명 필수
    if (paymentMethod === 'bank_transfer' && !depositorName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '입금자명을 입력해주세요.'
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

    // 충전 신청 생성
    const chargeData = {
      company_id: companyId,
      amount: parseInt(amount),
      quantity: quantity || 1,
      package_amount: packageAmount || amount,
      payment_method: paymentMethod,
      depositor_name: depositorName || null,
      needs_tax_invoice: needsTaxInvoice || false,
      tax_invoice_info: taxInvoiceInfo || null,
      status: paymentMethod === 'stripe' ? 'completed' : 'pending'
    }

    if (stripePaymentIntentId) {
      chargeData.stripe_payment_intent_id = stripePaymentIntentId
    }

    const { data: chargeRequest, error: chargeError } = await supabaseAdmin
      .from('points_charge_requests')
      .insert([chargeData])
      .select()
      .single()

    if (chargeError) {
      console.error('충전 신청 생성 오류:', chargeError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청 생성 중 오류가 발생했습니다.',
          details: chargeError.message
        })
      }
    }

    // Stripe 결제인 경우 즉시 포인트 지급
    if (paymentMethod === 'stripe') {
      const { error: pointsError } = await supabaseAdmin.rpc('add_points', {
        user_id: companyId,
        points: parseInt(amount),
        transaction_type: 'charge',
        transaction_description: `Stripe 충전 - ${parseInt(amount).toLocaleString()}원`
      })

      if (pointsError) {
        console.error('포인트 지급 오류:', pointsError)
      }
    }

    // 계좌이체의 경우 입금 요청 알림 발송
    if (paymentMethod === 'bank_transfer') {
      try {
        const axios = require('axios')
        await axios.post(
          `${process.env.URL}/.netlify/functions/send-notifications`,
          {
            type: 'deposit_request',
            chargeRequestId: chargeRequest.id,
            userEmail: company.email,
            userPhone: company.phone,
            userName: company.company_name,
            amount: parseInt(amount),
            depositorName: depositorName,
            points: parseInt(amount)
          }
        )
      } catch (notifError) {
        console.error('알림 발송 오류:', notifError.message)
        // 알림 발송 실패해도 충전 신청은 완료
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: chargeRequest,
        message: paymentMethod === 'stripe' 
          ? '포인트가 충전되었습니다.' 
          : '계좌이체 신청이 완료되었습니다. 입금 확인 후 포인트가 충전됩니다.'
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

