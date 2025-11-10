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

    // 세금계산서 신청 내역 저장
    if (needsTaxInvoice && taxInvoiceInfo) {
      console.log('[INFO] Creating tax invoice request')
      const taxInvoiceData = {
        charge_request_id: chargeRequest.id,
        company_id: companyId,
        company_name: taxInvoiceInfo.companyName,
        business_number: taxInvoiceInfo.businessNumber,
        ceo_name: taxInvoiceInfo.ceoName,
        address: taxInvoiceInfo.address,
        business_type: taxInvoiceInfo.businessType,
        business_item: taxInvoiceInfo.businessItem,
        email: taxInvoiceInfo.email,
        amount: parseInt(amount),
        status: 'pending'
      }

      const { error: taxInvoiceError } = await supabaseAdmin
        .from('tax_invoice_requests')
        .insert([taxInvoiceData])

      if (taxInvoiceError) {
        console.error('[ERROR] Failed to create tax invoice request:', taxInvoiceError)
        // 세금계산서 저장 실패해도 충전 신청은 성공으로 처리
      } else {
        console.log('[SUCCESS] Tax invoice request created')
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
        console.error('[ERROR] Failed to add points:', pointsError)
      }
    }

    // 계좌이체의 경우 알림 발송
    if (paymentMethod === 'bank_transfer') {
      console.log('[DEBUG] Payment method is bank_transfer')
      console.log('[DEBUG] companyName:', companyName)
      console.log('[DEBUG] companyEmail:', companyEmail)
      console.log('[DEBUG] companyPhone:', companyPhone)
      
      // 프론트엔드에서 전달받은 회사 정보 사용
      if (companyName && (companyEmail || companyPhone)) {
        console.log('[INFO] Using company info from request:', companyName)
        
        try {
          const axios = require('axios')
          console.log('[DEBUG] process.env.URL:', process.env.URL)
          
          // 1. 카카오톡 알림톡 발송
          if (companyPhone) {
            console.log('[INFO] Sending Kakao notification to:', companyPhone)
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
              console.error('[ERROR] Kakao error details:', kakaoError.response?.data || kakaoError)
            }
          }

          // 2. 네이버 웍스 메시지 발송 (관리자용)
          try {
            console.log('[INFO] Sending Naver Works notification to admin')
            const koreanDate = new Date().toLocaleString('ko-KR', { 
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const naverMessage = `💰 포인트 충전 신청\n\n` +
              `회사명: ${companyName}\n` +
              `충전 금액: ${parseInt(amount).toLocaleString()}원\n` +
              `세금계산서: ${needsTaxInvoice ? '신청' : '미신청'}\n` +
              `입금자명: ${depositorName}\n` +
              `신청 시간: ${koreanDate}\n\n` +
              `관리자 페이지: https://cnectotal.netlify.app/admin/deposits`;

            await axios.post(
              `${process.env.URL}/.netlify/functions/send-naver-works-message`,
              {
                message: naverMessage,
                isAdminNotification: true
              }
            )
            console.log('[SUCCESS] Naver Works notification sent')
          } catch (naverError) {
            console.error('[ERROR] Failed to send Naver Works notification:', naverError.message)
          }

          // 3. 이메일 발송
          if (companyEmail) {
            try {
              console.log('[INFO] Attempting to send email to:', companyEmail)
              console.log('[DEBUG] Email service URL:', `${process.env.URL}/.netlify/functions/send-email`)
              
              const emailResponse = await axios.post(
                `${process.env.URL}/.netlify/functions/send-email`,
                {
                  to: companyEmail,
                  subject: '[CNEC] 포인트 충전 입금 안내',
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #333;">포인트 충전 신청이 완료되었습니다</h2>
                      <p>안녕하세요, <strong>${companyName}</strong>님.</p>
                      <p>포인트 충전 신청이 완료되었습니다.</p>
                      
                      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #555;">입금 정보</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #666;"><strong>입금 계좌:</strong></td>
                            <td style="padding: 8px 0;">IBK기업은행 047-122753-04-011</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #666;"><strong>예금주:</strong></td>
                            <td style="padding: 8px 0;">주식회사 하우파파</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #666;"><strong>입금자명:</strong></td>
                            <td style="padding: 8px 0;">${depositorName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #666;"><strong>입금 금액:</strong></td>
                            <td style="padding: 8px 0; font-size: 18px; color: #4CAF50;"><strong>${parseInt(amount).toLocaleString()}원</strong></td>
                          </tr>
                        </table>
                      </div>
                      
                      <p style="color: #666;">입금 확인 후 포인트가 자동으로 충전됩니다.</p>
                      <p style="color: #666;">문의: <strong>1833-6025</strong></p>
                      
                      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                      <p style="font-size: 12px; color: #999; text-align: center;">
                        본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                      </p>
                    </div>
                  `
                },
                {
                  timeout: 10000 // 10초 타임아웃
                }
              )
              console.log('[SUCCESS] Email sent successfully')
              console.log('[DEBUG] Email response:', JSON.stringify(emailResponse.data))
            } catch (emailError) {
              console.error('[ERROR] Failed to send email')
              console.error('[ERROR] Error message:', emailError.message)
              console.error('[ERROR] Error code:', emailError.code)
              if (emailError.response) {
                console.error('[ERROR] Response status:', emailError.response.status)
                console.error('[ERROR] Response data:', JSON.stringify(emailError.response.data))
              }
              // 이메일 발송 실패는 무시하고 계속 진행
              console.log('[WARN] Email sending failed, but charge request was created successfully')
            }
          } else {
            console.log('[WARN] No email address provided, skipping email notification')
            console.log('[DEBUG] companyEmail value:', companyEmail)
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
