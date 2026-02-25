/**
 * 토스페이먼츠 카드결제 취소 Netlify Function (관리자 전용)
 * 1. 토스 API로 결제 취소
 * 2. payments 테이블 상태 업데이트
 * 3. campaigns 테이블 payment_status 업데이트
 * 4. 네이버 웍스 관리자 알림 발송
 */

const { createClient } = require('@supabase/supabase-js')

const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY

const supabaseBizUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseBizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL
const supabaseKoreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
const supabaseJapanUrl = process.env.VITE_SUPABASE_JAPAN_URL
const supabaseJapanServiceKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
const supabaseUSUrl = process.env.VITE_SUPABASE_US_URL
const supabaseUSServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY

const supabaseBiz = supabaseBizUrl && supabaseBizServiceKey
  ? createClient(supabaseBizUrl, supabaseBizServiceKey)
  : null
const supabaseKorea = supabaseKoreaUrl && supabaseKoreaServiceKey
  ? createClient(supabaseKoreaUrl, supabaseKoreaServiceKey)
  : null
const supabaseJapan = supabaseJapanUrl && supabaseJapanServiceKey
  ? createClient(supabaseJapanUrl, supabaseJapanServiceKey)
  : null
const supabaseUS = supabaseUSUrl && supabaseUSServiceKey
  ? createClient(supabaseUSUrl, supabaseUSServiceKey)
  : null

// 리전별 Supabase 클라이언트 (캠페인 업데이트용)
function getCampaignSupabase(region) {
  switch (region) {
    case 'korea':
    case 'kr':
      return supabaseKorea
    case 'japan':
    case 'jp':
      return supabaseJapan
    case 'us':
    case 'usa':
      return supabaseUS
    default:
      return supabaseKorea
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    }
  }

  try {
    const { paymentId, paymentKey, cancelReason, adminUserId } = JSON.parse(event.body)

    if (!paymentKey || !cancelReason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'paymentKey와 취소 사유는 필수입니다.' })
      }
    }

    if (!TOSS_SECRET_KEY) {
      console.error('[cancel-toss-payment] TOSS_PAYMENTS_SECRET_KEY 환경변수가 설정되지 않았습니다.')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: '결제 시스템 설정 오류입니다.' })
      }
    }

    // 관리자 권한 확인
    if (adminUserId && supabaseBiz) {
      const { data: authUser } = await supabaseBiz.auth.admin.getUserById(adminUserId)
      if (authUser?.user?.email) {
        const { data: admin } = await supabaseBiz
          .from('admin_users')
          .select('role, email')
          .eq('email', authUser.user.email)
          .maybeSingle()

        if (!admin) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ success: false, error: '관리자 권한이 필요합니다.' })
          }
        }
        console.log('[cancel-toss-payment] 관리자 확인:', admin.email)
      }
    }

    console.log('[cancel-toss-payment] 결제 취소 요청:', { paymentKey, cancelReason })

    // ===== 1단계: 토스페이먼츠 API로 결제 취소 =====
    const tossResponse = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cancelReason })
    })

    const tossResult = await tossResponse.json()

    if (!tossResponse.ok) {
      console.error('[cancel-toss-payment] 토스 결제 취소 실패:', tossResult)
      return {
        statusCode: tossResponse.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: tossResult.message || '결제 취소에 실패했습니다.',
          code: tossResult.code
        })
      }
    }

    console.log('[cancel-toss-payment] 토스 결제 취소 성공:', {
      paymentKey: tossResult.paymentKey,
      status: tossResult.status,
      cancels: tossResult.cancels
    })

    // ===== 2단계: DB 업데이트 (payments는 supabaseBiz 중앙 DB에서 관리) =====
    if (paymentId && supabaseBiz) {
      // payments 레코드 조회 (supabaseBiz에서)
      const { data: payment } = await supabaseBiz
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()

      if (payment) {
        // payments 테이블 업데이트 (supabaseBiz에서)
        const cancelInfo = tossResult.cancels?.[tossResult.cancels.length - 1]
        await supabaseBiz
          .from('payments')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
            bank_transfer_info: {
              ...payment.bank_transfer_info,
              cancelReason,
              canceledAt: cancelInfo?.canceledAt || new Date().toISOString(),
              cancelAmount: cancelInfo?.cancelAmount,
              refundStatus: tossResult.status
            }
          })
          .eq('id', paymentId)

        // campaigns 테이블 결제 상태 초기화 (리전별 DB)
        if (payment.campaign_id) {
          const campaignRegion = payment.region || 'korea'
          const campaignDb = getCampaignSupabase(campaignRegion)
          if (campaignDb) {
            await campaignDb
              .from('campaigns')
              .update({
                payment_status: 'cancelled',
                updated_at: new Date().toISOString()
              })
              .eq('id', payment.campaign_id)
          }
          console.log('[cancel-toss-payment] 캠페인 결제 상태 업데이트 완료')
        }

        // 캠페인 정보 조회 (알림용)
        let campaignInfo = null
        if (payment.campaign_id) {
          const campaignRegion = payment.region || 'korea'
          const campaignDb = getCampaignSupabase(campaignRegion)
          if (campaignDb) {
            const { data } = await campaignDb
              .from('campaigns')
              .select('id, title, company_id, brand, campaign_type')
              .eq('id', payment.campaign_id)
              .single()
            campaignInfo = data
          }
        }

        // ===== 3단계: 네이버 웍스 알림 =====
        try {
          const campaign = campaignInfo
          let companyName = campaign?.brand || ''
          if (campaign?.company_id && supabaseBiz) {
            const { data: companyData } = await supabaseBiz
              .from('companies')
              .select('company_name')
              .eq('user_id', campaign.company_id)
              .maybeSingle()
            if (companyData?.company_name) companyName = companyData.company_name
          }

          const koreanDate = new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })

          const naverWorksMessage = `[카드결제 취소 완료]

캠페인: ${campaign?.title || '알 수 없음'}
기업: ${companyName || '알 수 없음'}
취소 금액: ${(cancelInfo?.cancelAmount || payment.amount || 0).toLocaleString()}원
취소 사유: ${cancelReason}

${koreanDate}`

          await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              message: naverWorksMessage,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
            })
          })
          console.log('[cancel-toss-payment] 네이버 웍스 알림 발송 성공')
        } catch (notifError) {
          console.error('[cancel-toss-payment] 네이버 웍스 알림 발송 실패:', notifError)
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '결제가 취소되었습니다.',
        payment: tossResult
      })
    }

  } catch (error) {
    console.error('[cancel-toss-payment] 서버 오류:', error)
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
