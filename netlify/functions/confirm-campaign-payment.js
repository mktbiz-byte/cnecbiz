/**
 * 캠페인 입금 수동 확인 API (관리자 전용)
 * 관리자가 강제로 입금을 확인하고 캠페인 상태를 변경
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL
const supabaseBizUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Korea DB (campaigns 테이블)
const supabaseKorea = createClient(supabaseKoreaUrl, supabaseServiceKey)
// Biz DB (admin_users 테이블)
const supabaseBiz = createClient(supabaseBizUrl, supabaseServiceKey)

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
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '관리자 권한이 필요합니다.'
        })
      }
    }

    // 캠페인 조회 (supabaseKorea에서 조회)
    const { data: campaign, error: campaignError } = await supabaseKorea
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인을 찾을 수 없습니다.'
        })
      }
    }

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
      .single()

    if (paymentError || !payment) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '결제 정보를 찾을 수 없습니다.'
        })
      }
    }

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
      console.error('결제 정보 업데이트 오류:', paymentUpdateError)
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

    // 3. campaigns 테이블 업데이트
    const campaignUpdateData = {
      payment_status: 'confirmed',
      payment_confirmed_at: new Date().toISOString(),
      approval_status: 'pending' // 입금 확인 후 승인 대기 상태로 변경
    }

    if (memo) campaignUpdateData.admin_memo = memo

    const { error: updateError } = await supabaseKorea
      .from('campaigns')
      .update(campaignUpdateData)
      .eq('id', campaignId)

    if (updateError) {
      console.error('캠페인 업데이트 오류:', updateError)
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

    // 회사 정보 조회 (알림 발송용) (supabaseBiz에서 조회)
    const { data: company } = await supabaseBiz
      .from('companies')
      .select('company_name, email, phone, contact_person')
      .eq('user_id', campaign.company_id)
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
          campaignId,
          companyName: company?.company_name,
          amount: depositAmount || campaign.estimated_cost
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

