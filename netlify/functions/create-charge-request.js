/**
 * 포인트 충전 신청 API
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
    const {
      companyId,
      companyName,
      companyEmail,
      companyPhone,
      amount,
      packageAmount,
      quantity,
      paymentMethod,
      stripePaymentIntentId,
      depositorName,
      needsTaxInvoice,
      taxInvoiceInfo
    } = JSON.parse(event.body)

    // 필수 파라미터 검증
    if (!companyId || !amount || !paymentMethod) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 파라미터가 누락되었습니다.'
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

    // 세금계산서 필요 시 정보 검증
    if (needsTaxInvoice) {
      const required = ['companyName', 'businessNumber', 'ceoName', 'address', 'businessType', 'businessItem', 'email']
      const missing = required.filter(field => !taxInvoiceInfo?.[field])
      
      if (missing.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: `세금계산서 정보가 누락되었습니다: ${missing.join(', ')}`
          })
        }
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

    console.log('[INFO] Creating charge request:', chargeData)

    const { data: chargeRequest, error: chargeError } = await supabaseAdmin
      .from('points_charge_requests')
      .insert([chargeData])
      .select()
      .single()

    if (chargeError) {
      console.error('[ERROR] Failed to create charge request:', chargeError)
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

    console.log('[SUCCESS] Charge request created:', chargeRequest.id)

    // Stripe 결제인 경우 즉시 포인트 지급
    if (paymentMethod === 'stripe') {
      const { error: pointsError } = await supabaseAdmin.rpc('add_points', {
        user_id: companyId,
        points: parseInt(amount),
        transaction_type: 'charge',
        transaction_description: `Stripe 충전 - ${parseInt(amount).toLocaleString()}원`
      })

      if (pointsError) {
        console.error('[ERROR] Failed to add points:', pointsError)
      }
    }

    // 계좌이체의 경우 알림 발송
    if (paymentMethod === 'bank_transfer') {
      // 프론트엔드에서 전달받은 회사 정보 사용
      if (companyName && (companyEmail || companyPhone)) {
        console.log('[INFO] Using company info from request:', companyName)
        
        try {
          const axios = require('axios')
          
          // 1. 카카오톡 알림톡 발송
          if (companyPhone) {
            try {
              await axios.post(
                `${process.env.URL}/.netlify/functions/send-kakao-notification`,
                {
                  receiverNum: companyPhone,
                  receiverName: companyName,
                  templateCode: '025100000942',
                  variables: {
                    '회사명': companyName,
                    '금액': parseInt(amount).toLocaleString()
                  }
                }
              )
              console.log('[SUCCESS] Kakao notification sent')
            } catch (kakaoError) {
              console.error('[ERROR] Failed to send Kakao notification:', kakaoError.message)
            }
          }

          // 2. 이메일 발송
          if (companyEmail) {
            try {
              await axios.post(
                `${process.env.URL}/.netlify/functions/send-email`,
                {
                  to: companyEmail,
                  subject: '[CNEC] 포인트 충전 입금 안내',
                  html: `
                    <h2>포인트 충전 신청이 완료되었습니다</h2>
                    <p>안녕하세요, <strong>${companyName}</strong>님.</p>
                    <p>포인트 충전 신청이 완료되었습니다.</p>
                    
                    <h3>입금 정보</h3>
                    <ul>
                      <li><strong>입금 계좌:</strong> IBK기업은행 047-122753-04-011</li>
                      <li><strong>예금주:</strong> 주식회사 하우파파</li>
                      <li><strong>입금자명:</strong> ${depositorName}</li>
                      <li><strong>입금 금액:</strong> ${parseInt(amount).toLocaleString()}원</li>
                    </ul>
                    
                    <p>입금 확인 후 포인트가 자동으로 충전됩니다.</p>
                    <p>문의: 1833-6025</p>
                  `
                }
              )
              console.log('[SUCCESS] Email sent')
            } catch (emailError) {
              console.error('[ERROR] Failed to send email:', emailError.message)
            }
          }
        } catch (notificationError) {
          console.error('[ERROR] Notification error:', notificationError.message)
        }
      } else {
        console.warn('[WARN] Company info not provided, skipping notifications')
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: chargeRequest
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
