/**
 * 캠페인 입금 수동 확인 API (관리자 전용)
 * 관리자가 강제로 입금을 확인하고 캠페인 상태를 변경
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL
const supabaseBizUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseKoreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
const supabaseBizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY  // Biz용 Service Role Key

// Korea DB (campaigns 테이블)
const supabaseKorea = createClient(supabaseKoreaUrl, supabaseKoreaServiceKey)
// Biz DB (admin_users, companies 테이블)
const supabaseBiz = createClient(supabaseBizUrl, supabaseBizServiceKey)

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
      campaignId,
      adminUserId,
      depositDate,
      depositAmount,
      depositorName,
      memo
    } = JSON.parse(event.body)

    console.log('[confirm-campaign-payment] Request received:', { campaignId, adminUserId, depositorName })

    // 입력 검증
    if (!campaignId || !adminUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        })
      }
    }

    // 관리자 권한 확인 (supabaseBiz에서 조회)
    const { data: admin, error: adminError } = await supabaseBiz
      .from('admin_users')
      .select('role, email')
      .eq('id', adminUserId)
      .single()

    if (adminError || !admin) {
      console.error('[confirm-campaign-payment] Admin verification failed:', adminError)
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '관리자 권한이 필요합니다.'
        })
      }
    }

    console.log('[confirm-campaign-payment] Admin verified:', admin.email)

    // 캠페인 조회 (supabaseKorea에서 조회)
    const { data: campaign, error: campaignError } = await supabaseKorea
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[confirm-campaign-payment] Campaign not found:', campaignError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인을 찾을 수 없습니다.'
        })
      }
    }

    console.log('[confirm-campaign-payment] Campaign found:', campaign.title)

    // 이미 입금 확인된 캠페인인지 확인
    if (campaign.payment_status === 'confirmed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 입금 확인된 캠페인입니다.'
        })
      }
    }

    // 1. payments 테이블에서 해당 캠페인의 결제 정보 조회 (supabaseKorea)
    const { data: payment, error: paymentError } = await supabaseKorea
      .from('payments')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // payments 테이블에 레코드가 없을 수 있음 (직접 입금 신청한 경우)
    if (payment) {
      console.log('[confirm-campaign-payment] Payment record found, updating...')
      
      // 2. payments 테이블 업데이트
      const paymentUpdateData = {
        status: 'completed',
        paid_at: depositDate || new Date().toISOString(),
        confirmed_by: adminUserId,
        confirmed_at: new Date().toISOString()
      }

      // bank_transfer_info에 입금자명 추가
      if (depositorName) {
        paymentUpdateData.bank_transfer_info = {
          ...payment.bank_transfer_info,
          depositor_name: depositorName,
          confirmed_deposit_amount: depositAmount
        }
      }

      const { error: paymentUpdateError } = await supabaseKorea
        .from('payments')
        .update(paymentUpdateData)
        .eq('id', payment.id)

      if (paymentUpdateError) {
        console.error('[confirm-campaign-payment] Payment update error:', paymentUpdateError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: '결제 정보 업데이트 중 오류가 발생했습니다.',
            details: paymentUpdateError.message
          })
        }
      }
      console.log('[confirm-campaign-payment] Payment record updated successfully')
    } else {
      console.log('[confirm-campaign-payment] No payment record found, skipping payment update')
    }

    // 3. campaigns 테이블 업데이트 - 상태를 active로 변경
    const campaignUpdateData = {
      status: 'active',  // 입금 확인 후 즉시 active 상태로 변경
      approval_status: 'pending_approval',  // 승인 대기 상태로 변경
      payment_status: 'confirmed',  // 입금 확인 상태로 변경
      payment_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (memo) campaignUpdateData.admin_memo = memo

    const { error: updateError } = await supabaseKorea
      .from('campaigns')
      .update(campaignUpdateData)
      .eq('id', campaignId)

    if (updateError) {
      console.error('[confirm-campaign-payment] Campaign update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인 업데이트 중 오류가 발생했습니다.',
          details: updateError.message
        })
      }
    }

    console.log('[confirm-campaign-payment] Campaign status updated to active')

    // 회사 정보 조회 (알림 발송용) (supabaseBiz에서 user_id로 조회)
    const { data: company, error: companyError } = await supabaseBiz
      .from('companies')
      .select('company_name, email, phone, contact_person, notification_phone, notification_email')
      .eq('user_id', campaign.company_id)
      .single()

    if (companyError) {
      console.error('[confirm-campaign-payment] Company lookup error:', companyError)
    } else {
      console.log('[confirm-campaign-payment] Company found:', company?.company_name)
    }

    // 4. 고객에게 카카오 알림톡 및 이메일 발송
    if (company) {
      // 카카오 알림톡 발송
      if (company.notification_phone || company.phone) {
        try {
          // 캠페인 기간 포맷팅
          const startDate = campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '미정'
          const endDate = campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '미정'
          
          await fetch('/.netlify/functions/send-kakao-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: company.notification_phone || company.phone,
              receiverName: company.company_name || '회사',
              templateCode: '025100001010',
              variables: {
                '회사명': company.company_name || '회사',
                '캠페인명': campaign.title || '캠페인',
                '시작일': startDate,
                '마감일': endDate,
                '모집인원': String(campaign.total_slots || 0)
              }
            })
          })
          console.log('[confirm-campaign-payment] Kakao alimtalk sent to customer')
        } catch (kakaoError) {
          console.error('[confirm-campaign-payment] Failed to send Kakao alimtalk:', kakaoError)
        }
      }

      // 이메일 발송
      if (company.notification_email || company.email) {
        try {
          const startDate = campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('ko-KR') : '미정'
          const endDate = campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('ko-KR') : '미정'
          
          await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: company.notification_email || company.email,
              subject: '[CNEC] 캠페인 입금 확인 완료',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #333;">[CNEC] 캠페인 입금 확인 완료</h2>
                  <p><strong>${company.company_name || '회사'}</strong>님, 신청하신 캠페인의 입금이 확인되었습니다.</p>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 10px 0;"><strong>캠페인:</strong> ${campaign.title || '캠페인'}</p>
                    <p style="margin: 10px 0;"><strong>모집 기간:</strong> ${startDate} ~ ${endDate}</p>
                    <p style="margin: 10px 0;"><strong>모집 인원:</strong> ${campaign.total_slots || 0}명</p>
                    <p style="margin: 10px 0;"><strong>입금 금액:</strong> ${(depositAmount || campaign.estimated_cost || 0).toLocaleString()}원</p>
                  </div>
                  
                  <p style="color: #666;">캠페인이 활성화되었습니다. 관리자 페이지에서 진행 상황을 확인하실 수 있습니다.</p>
                  <p style="color: #666;">문의: <strong>1833-6025</strong></p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                  </p>
                </div>
              `
            })
          })
          console.log('[confirm-campaign-payment] Email sent to customer')
        } catch (emailError) {
          console.error('[confirm-campaign-payment] Failed to send email:', emailError)
        }
      }
    }

    // 5. 네이버 웍스 알림 발송 (관리자용)
    const campaignTypeMap = {
      'planned': '기획형',
      'regular': '기획형',
      'oliveyoung': '올리브영',
      '4week_challenge': '4주 챌린지',
      '4week': '4주 챌린지'
    }
    const campaignTypeText = campaignTypeMap[campaign.campaign_type] || '기획형'

    const message = `💵 입금 확인 완료 + 캠페인 활성화 (한국)

• 회사명: ${company?.company_name || '회사명 없음'}
• 캠페인명: ${campaign.title}
• 캠페인 타입: ${campaignTypeText}
• 입금 금액: ${parseInt(depositAmount || campaign.estimated_cost || 0).toLocaleString()}원
• 입금자명: ${depositorName || '미입력'}
• 입금일: ${depositDate || new Date().toISOString().split('T')[0]}

✅ 캠페인이 활성화되었습니다.

관리 페이지: https://cnectotal.netlify.app/admin/campaigns`

    try {
      const naverWorksUrl = 'https://www.worksapis.com/v1.0/bots/7348965/channels/281474978639476/messages'
      const naverWorksToken = process.env.NAVER_WORKS_BOT_TOKEN

      await fetch(naverWorksUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${naverWorksToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: {
            type: 'text',
            text: message
          }
        })
      })
      console.log('[confirm-campaign-payment] Naver Works notification sent')
    } catch (notifError) {
      console.error('[confirm-campaign-payment] Failed to send Naver Works notification:', notifError)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '입금 확인 및 캠페인 활성화가 완료되었습니다.',
        data: {
          campaignId,
          companyName: company?.company_name,
          amount: depositAmount || campaign.estimated_cost
        }
      })
    }

  } catch (error) {
    console.error('[confirm-campaign-payment] Server error:', error)
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
