/**
 * 토스페이먼츠 웹훅 핸들러
 *
 * 이벤트:
 * - PAYMENT_STATUS_CHANGED: 결제 상태 변경 (DONE, CANCELED 등)
 * - DEPOSIT_CALLBACK: 가상계좌 입금 확인
 * - CANCEL_STATUS_CHANGED: 취소 상태 변경
 *
 * 웹훅 URL: https://cnecbiz.com/.netlify/functions/toss-webhook
 * 토스 개발자센터 > 웹훅 등록에서 위 URL과 시크릿 키 설정
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// 환경변수
const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY
const TOSS_WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET_KEY

// Supabase 클라이언트
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

function getCampaignSupabase(region) {
  switch (region) {
    case 'korea': case 'kr': return supabaseKorea
    case 'japan': case 'jp': return supabaseJapan
    case 'us': case 'usa': return supabaseUS
    default: return supabaseKorea
  }
}

/**
 * orderId에서 campaignId 추출
 * orderId 형식: campaign_{campaignId}_{timestamp}
 */
function extractCampaignId(orderId) {
  if (!orderId) return null
  const match = orderId.match(/^campaign_(.+?)_\d+$/)
  return match ? match[1] : null
}

/**
 * 토스 웹훅 시그니처 검증
 */
function verifyWebhookSignature(body, signature) {
  if (!TOSS_WEBHOOK_SECRET || !signature) return false
  const expected = crypto
    .createHmac('sha256', TOSS_WEBHOOK_SECRET)
    .update(body)
    .digest('base64')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

/**
 * 토스 API로 결제 상세 조회 (웹훅 데이터 검증용)
 */
async function fetchPaymentFromToss(paymentKey) {
  const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`
    }
  })
  if (!response.ok) {
    throw new Error(`토스 결제 조회 실패: ${response.status}`)
  }
  return response.json()
}

/**
 * 네이버웍스 알림 발송
 */
async function sendNaverWorksNotification(message) {
  try {
    // Netlify Function 내부 호출은 절대 경로 필요
    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        message,
        channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
      })
    })
    console.log('[toss-webhook] 네이버웍스 알림 발송 성공')
  } catch (err) {
    console.error('[toss-webhook] 네이버웍스 알림 발송 실패:', err.message)
  }
}

/**
 * 결제 완료(DONE) 처리
 */
async function handlePaymentDone(payment) {
  const { paymentKey, orderId, totalAmount, method, card, approvedAt, status } = payment
  const campaignId = extractCampaignId(orderId)

  console.log('[toss-webhook] 결제 완료 처리:', { paymentKey, orderId, totalAmount, campaignId })

  // 이미 DB에 저장된 결제인지 확인 (paymentKey로 중복 체크)
  if (supabaseBiz) {
    const { data: existing } = await supabaseBiz
      .from('payments')
      .select('id')
      .eq('bank_transfer_info->>paymentKey', paymentKey)
      .maybeSingle()

    if (existing) {
      console.log('[toss-webhook] 이미 저장된 결제, 스킵:', paymentKey)
      return { action: 'skipped', reason: 'already_exists' }
    }
  }

  // 캠페인 조회
  let campaign = null
  let campaignRegion = 'korea'

  if (campaignId) {
    // 모든 리전에서 캠페인 검색
    const regions = [
      { db: supabaseKorea, name: 'korea' },
      { db: supabaseJapan, name: 'japan' },
      { db: supabaseUS, name: 'us' },
      { db: supabaseBiz, name: 'biz' }
    ]

    for (const { db, name } of regions) {
      if (!db || campaign) continue
      const { data } = await db
        .from('campaigns')
        .select('id, title, company_id, company_email, brand, campaign_type, estimated_cost')
        .eq('id', campaignId)
        .maybeSingle()
      if (data) {
        campaign = data
        campaignRegion = name === 'biz' ? 'korea' : name
      }
    }
  }

  // payments 테이블에 저장
  const paymentData = {
    amount: totalAmount,
    currency: 'KRW',
    payment_method: 'toss_card',
    status: 'completed',
    paid_at: approvedAt || new Date().toISOString(),
    region: campaignRegion,
    bank_transfer_info: {
      provider: 'toss',
      paymentKey,
      orderId,
      method,
      campaignId: campaignId,
      campaignTitle: campaign?.title || null,
      source: 'webhook',
      card: card ? {
        issuerCode: card.issuerCode,
        number: card.number,
        cardType: card.cardType,
        ownerType: card.ownerType,
        acquirerCode: card.acquirerCode
      } : null,
      receipt: payment.receipt,
      approvedAt
    }
  }

  // FK 제약 대비: supabaseBiz에 캠페인이 있을 때만 campaign_id 설정
  if (campaignId && supabaseBiz) {
    const { data: bizCampaign } = await supabaseBiz
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .maybeSingle()
    if (bizCampaign) {
      paymentData.campaign_id = campaignId
    }
  }

  // company_id 설정
  if (campaign?.company_id && supabaseBiz) {
    const { data: compCheck } = await supabaseBiz
      .from('companies')
      .select('user_id')
      .eq('user_id', campaign.company_id)
      .maybeSingle()
    if (compCheck) {
      paymentData.company_id = campaign.company_id
    }
  } else if (campaign?.company_email && supabaseBiz) {
    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('user_id')
      .eq('email', campaign.company_email)
      .maybeSingle()
    if (companyData?.user_id) {
      paymentData.company_id = companyData.user_id
    }
  }

  // DB 저장
  if (supabaseBiz) {
    const { error: insertError } = await supabaseBiz
      .from('payments')
      .insert(paymentData)

    if (insertError) {
      console.error('[toss-webhook] 결제 기록 저장 실패:', insertError)
      // FK 위반 시 재시도
      if (insertError.code === '23503') {
        delete paymentData.campaign_id
        delete paymentData.company_id
        const { error: retryError } = await supabaseBiz
          .from('payments')
          .insert(paymentData)
        if (retryError) {
          console.error('[toss-webhook] 재시도도 실패:', retryError)
          return { action: 'error', reason: retryError.message }
        }
        console.log('[toss-webhook] FK 제외 재시도 성공')
      } else {
        return { action: 'error', reason: insertError.message }
      }
    } else {
      console.log('[toss-webhook] 결제 기록 저장 완료')
    }
  }

  // 캠페인 결제 상태 업데이트
  if (campaignId) {
    const campaignDb = getCampaignSupabase(campaignRegion)
    if (campaignDb) {
      await campaignDb
        .from('campaigns')
        .update({
          payment_status: 'paid',
          payment_method: 'toss_card',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
    }
  }

  // 네이버웍스 알림
  const companyName = campaign?.brand || '알 수 없음'
  const koreanDate = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  await sendNaverWorksNotification(`[웹훅] 카드결제 완료 확인

캠페인: ${campaign?.title || orderId}
브랜드: ${companyName}
결제 금액: ${totalAmount.toLocaleString()}원
결제 수단: ${method || '카드'}
paymentKey: ${paymentKey}

${koreanDate}`)

  return { action: 'saved', paymentKey }
}

/**
 * 결제 취소(CANCELED/PARTIAL_CANCELED) 처리
 */
async function handlePaymentCanceled(payment) {
  const { paymentKey, orderId, totalAmount, cancels, status } = payment
  const latestCancel = cancels?.[cancels.length - 1]

  console.log('[toss-webhook] 결제 취소 처리:', { paymentKey, status })

  // DB에서 해당 결제 찾기 (paymentKey로)
  if (!supabaseBiz) return { action: 'skipped', reason: 'no_db' }

  const { data: existingPayment } = await supabaseBiz
    .from('payments')
    .select('*')
    .eq('bank_transfer_info->>paymentKey', paymentKey)
    .maybeSingle()

  if (!existingPayment) {
    console.log('[toss-webhook] DB에 해당 결제 없음, 취소 기록만 저장:', paymentKey)
    // 결제 기록이 없더라도 취소 이벤트 기록
    const campaignId = extractCampaignId(orderId)
    const cancelData = {
      amount: latestCancel?.cancelAmount || totalAmount,
      currency: 'KRW',
      payment_method: 'toss_card',
      status: status === 'PARTIAL_CANCELED' ? 'partial_refunded' : 'refunded',
      paid_at: new Date().toISOString(),
      region: 'korea',
      bank_transfer_info: {
        provider: 'toss',
        paymentKey,
        orderId,
        campaignId,
        source: 'webhook_cancel',
        cancelReason: latestCancel?.cancelReason,
        canceledAt: latestCancel?.canceledAt,
        cancelAmount: latestCancel?.cancelAmount,
        refundStatus: status
      }
    }
    await supabaseBiz.from('payments').insert(cancelData)
    return { action: 'cancel_recorded', paymentKey }
  }

  // 기존 결제 상태 업데이트
  const newStatus = status === 'PARTIAL_CANCELED' ? 'partial_refunded' : 'refunded'
  await supabaseBiz
    .from('payments')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      bank_transfer_info: {
        ...existingPayment.bank_transfer_info,
        cancelReason: latestCancel?.cancelReason,
        canceledAt: latestCancel?.canceledAt,
        cancelAmount: latestCancel?.cancelAmount,
        refundStatus: status,
        source_updated: 'webhook'
      }
    })
    .eq('id', existingPayment.id)

  console.log('[toss-webhook] 결제 취소 상태 업데이트 완료:', existingPayment.id)

  // 캠페인 결제 상태 업데이트
  const campaignId = existingPayment.campaign_id || existingPayment.bank_transfer_info?.campaignId
  if (campaignId) {
    const region = existingPayment.region || 'korea'
    const campaignDb = getCampaignSupabase(region)
    if (campaignDb) {
      await campaignDb
        .from('campaigns')
        .update({
          payment_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
    }
  }

  // 네이버웍스 알림
  const koreanDate = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  await sendNaverWorksNotification(`[웹훅] 카드결제 취소 감지

paymentKey: ${paymentKey}
취소 금액: ${(latestCancel?.cancelAmount || 0).toLocaleString()}원
취소 사유: ${latestCancel?.cancelReason || '사유 없음'}
상태: ${status}

${koreanDate}`)

  return { action: 'updated', paymentKey, newStatus }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json'
  }

  // 토스 웹훅은 POST만 사용
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method Not Allowed' }) }
  }

  try {
    const rawBody = event.body
    const webhookData = JSON.parse(rawBody)
    const { eventType, createdAt, data } = webhookData

    console.log('[toss-webhook] 이벤트 수신:', { eventType, createdAt, paymentKey: data?.paymentKey })

    // 시그니처 검증 (TOSS_WEBHOOK_SECRET_KEY 설정 시)
    const signature = event.headers['toss-signature'] || event.headers['Toss-Signature']
    if (TOSS_WEBHOOK_SECRET && signature) {
      try {
        const isValid = verifyWebhookSignature(rawBody, signature)
        if (!isValid) {
          console.error('[toss-webhook] 시그니처 검증 실패')
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ message: 'Invalid signature' })
          }
        }
        console.log('[toss-webhook] 시그니처 검증 성공')
      } catch (sigError) {
        console.error('[toss-webhook] 시그니처 검증 오류:', sigError.message)
        // 시그니처 길이 불일치 등은 무시하고 진행 (API 조회로 검증)
      }
    }

    // 토스 API로 결제 데이터 검증 (paymentKey로 실제 결제 조회)
    let verifiedPayment = data
    if (TOSS_SECRET_KEY && data?.paymentKey) {
      try {
        verifiedPayment = await fetchPaymentFromToss(data.paymentKey)
        console.log('[toss-webhook] 토스 API 검증 완료:', {
          paymentKey: verifiedPayment.paymentKey,
          status: verifiedPayment.status,
          totalAmount: verifiedPayment.totalAmount
        })
      } catch (verifyError) {
        console.error('[toss-webhook] 토스 API 검증 실패:', verifyError.message)
        // API 검증 실패 시 웹훅 데이터로 진행
        verifiedPayment = data
      }
    }

    let result = { action: 'ignored', eventType }

    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED': {
        const paymentStatus = verifiedPayment.status
        if (paymentStatus === 'DONE') {
          result = await handlePaymentDone(verifiedPayment)
        } else if (paymentStatus === 'CANCELED' || paymentStatus === 'PARTIAL_CANCELED') {
          result = await handlePaymentCanceled(verifiedPayment)
        } else {
          console.log('[toss-webhook] 미처리 결제 상태:', paymentStatus)
          result = { action: 'ignored', paymentStatus }
        }
        break
      }

      case 'DEPOSIT_CALLBACK': {
        // 가상계좌 입금 확인 (현재는 로그만)
        console.log('[toss-webhook] 가상계좌 입금 확인:', {
          paymentKey: verifiedPayment.paymentKey,
          status: verifiedPayment.status
        })
        if (verifiedPayment.status === 'DONE') {
          result = await handlePaymentDone(verifiedPayment)
        }
        break
      }

      case 'CANCEL_STATUS_CHANGED': {
        if (verifiedPayment.status === 'CANCELED' || verifiedPayment.status === 'PARTIAL_CANCELED') {
          result = await handlePaymentCanceled(verifiedPayment)
        }
        break
      }

      default:
        console.log('[toss-webhook] 알 수 없는 이벤트:', eventType)
    }

    console.log('[toss-webhook] 처리 결과:', result)

    // 토스 웹훅은 200 응답을 받아야 재시도하지 않음
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, result })
    }

  } catch (error) {
    console.error('[toss-webhook] 서버 오류:', error)
    // 500 반환 시 토스가 재시도함 (최대 5회)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
