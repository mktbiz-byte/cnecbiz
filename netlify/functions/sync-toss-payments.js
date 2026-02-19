/**
 * 토스페이먼츠 거래내역 동기화 (관리자 전용)
 *
 * 토스 API에서 최근 거래를 조회하여 DB에 누락된 결제를 자동 보완
 * - GET /v1/transactions 로 기간 내 거래 조회
 * - paymentKey 기준으로 DB에 없는 건만 insert
 *
 * 요청 파라미터:
 * - startDate: 조회 시작일 (YYYY-MM-DD) (기본: 30일 전)
 * - endDate: 조회 종료일 (YYYY-MM-DD) (기본: 오늘)
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

function getCampaignSupabase(region) {
  switch (region) {
    case 'korea': case 'kr': return supabaseKorea
    case 'japan': case 'jp': return supabaseJapan
    case 'us': case 'usa': return supabaseUS
    default: return supabaseKorea
  }
}

function extractCampaignId(orderId) {
  if (!orderId) return null
  const match = orderId.match(/^campaign_(.+?)_\d+$/)
  return match ? match[1] : null
}

/**
 * 토스 API에서 거래내역 조회
 */
async function fetchTossTransactions(startDate, endDate) {
  const allTransactions = []
  let startingAfter = null
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      startDate: `${startDate}T00:00:00`,
      endDate: `${endDate}T23:59:59`,
      limit: '100'
    })
    if (startingAfter) {
      params.set('startingAfter', startingAfter)
    }

    const response = await fetch(`https://api.tosspayments.com/v1/transactions?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`
      }
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(`토스 거래 조회 실패: ${errData.message || response.status}`)
    }

    const transactions = await response.json()

    if (!Array.isArray(transactions) || transactions.length === 0) {
      hasMore = false
    } else {
      allTransactions.push(...transactions)
      if (transactions.length < 100) {
        hasMore = false
      } else {
        startingAfter = transactions[transactions.length - 1].transactionKey
      }
    }
  }

  return allTransactions
}

exports.handler = async (event) => {
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
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method Not Allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')

    if (!TOSS_SECRET_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'TOSS_PAYMENTS_SECRET_KEY 환경변수가 없습니다.' })
      }
    }

    if (!supabaseBiz) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Supabase 연결 실패' })
      }
    }

    // 날짜 기본값: 최근 30일
    const now = new Date()
    const defaultStart = new Date(now)
    defaultStart.setDate(defaultStart.getDate() - 30)

    const startDate = body.startDate || defaultStart.toISOString().split('T')[0]
    const endDate = body.endDate || now.toISOString().split('T')[0]

    console.log('[sync-toss-payments] 동기화 시작:', { startDate, endDate })

    // 1단계: 토스 API에서 거래내역 조회
    const transactions = await fetchTossTransactions(startDate, endDate)
    console.log('[sync-toss-payments] 토스 거래 조회:', transactions.length, '건')

    // 첫 번째 거래의 전체 필드를 로그에 남겨서 구조 확인
    if (transactions.length > 0) {
      console.log('[sync-toss-payments] 거래 샘플 필드:', JSON.stringify(Object.keys(transactions[0])))
      console.log('[sync-toss-payments] 거래 샘플:', JSON.stringify(transactions[0]).substring(0, 500))
    }

    if (transactions.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '조회 기간 내 토스 거래가 없습니다.',
          stats: { total: 0, synced: 0, skipped: 0, failed: 0 }
        })
      }
    }

    // 2단계: DB에 이미 있는 paymentKey 조회
    const paymentKeys = transactions.map(t => t.paymentKey).filter(Boolean)
    const { data: existingPayments } = await supabaseBiz
      .from('payments')
      .select('bank_transfer_info')
      .eq('payment_method', 'toss_card')

    const existingKeys = new Set()
    if (existingPayments) {
      existingPayments.forEach(p => {
        const key = p.bank_transfer_info?.paymentKey
        if (key) existingKeys.add(key)
      })
    }

    console.log('[sync-toss-payments] DB 기존 결제:', existingKeys.size, '건')

    // 3단계: 누락된 결제만 저장
    const results = { synced: 0, skipped: 0, failed: 0, details: [] }

    for (const tx of transactions) {
      const { paymentKey, orderId, method, card, status, approvedAt } = tx
      // 토스 transactions API는 amount 또는 totalAmount로 내려올 수 있음
      const totalAmount = tx.totalAmount || tx.amount || 0

      // 이미 DB에 있으면 스킵
      if (existingKeys.has(paymentKey)) {
        results.skipped++
        continue
      }

      // DONE(승인)된 결제만 동기화 (취소건은 별도 처리)
      if (status !== 'DONE' && status !== 'CANCELED' && status !== 'PARTIAL_CANCELED') {
        results.skipped++
        continue
      }

      const campaignId = extractCampaignId(orderId)

      // 캠페인 조회 (모든 리전)
      let campaign = null
      let campaignRegion = 'korea'
      if (campaignId) {
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
            .select('id, title, company_id, company_email, brand, campaign_type')
            .eq('id', campaignId)
            .maybeSingle()
          if (data) {
            campaign = data
            campaignRegion = name === 'biz' ? 'korea' : name
          }
        }
      }

      // 결제 데이터 구성
      // status CHECK: ('pending', 'completed', 'failed', 'refunded') 만 허용
      const paymentStatus = status === 'DONE' ? 'completed' : 'refunded'

      const bankTransferInfo = {
        provider: 'toss',
        paymentKey,
        orderId,
        method,
        campaignId,
        campaignTitle: campaign?.title || null,
        source: 'sync',
        tossStatus: status,
        card: card ? {
          issuerCode: card.issuerCode,
          number: card.number,
          cardType: card.cardType,
          ownerType: card.ownerType,
          acquirerCode: card.acquirerCode
        } : null,
        receipt: tx.receipt,
        approvedAt,
        cancels: tx.cancels || null
      }

      // FK 제약 대비: supabaseBiz에 캠페인이 있을 때만 campaign_id 설정
      let safeCampaignId = null
      if (campaignId) {
        const { data: bizCampaign } = await supabaseBiz
          .from('campaigns')
          .select('id')
          .eq('id', campaignId)
          .maybeSingle()
        if (bizCampaign) safeCampaignId = campaignId
      }

      // company_id 설정 (auth.users에 존재하는지 확인)
      let safeCompanyId = null
      if (campaign?.company_id) {
        const { data: compCheck } = await supabaseBiz
          .from('companies')
          .select('user_id')
          .eq('user_id', campaign.company_id)
          .maybeSingle()
        if (compCheck) safeCompanyId = campaign.company_id
      } else if (campaign?.company_email) {
        const { data: companyData } = await supabaseBiz
          .from('companies')
          .select('user_id')
          .eq('email', campaign.company_email)
          .maybeSingle()
        if (companyData?.user_id) safeCompanyId = companyData.user_id
      }

      // 단계적 insert: 전체 컬럼 → FK 제외 → 최소 컬럼
      const insertAttempts = [
        // 1차: 전체 컬럼
        {
          amount: totalAmount,
          currency: 'KRW',
          payment_method: 'toss_card',
          status: paymentStatus,
          paid_at: approvedAt || new Date().toISOString(),
          region: campaignRegion,
          bank_transfer_info: bankTransferInfo,
          ...(safeCampaignId ? { campaign_id: safeCampaignId } : {}),
          ...(safeCompanyId ? { company_id: safeCompanyId } : {})
        },
        // 2차: FK 제외
        {
          amount: totalAmount,
          currency: 'KRW',
          payment_method: 'toss_card',
          status: paymentStatus,
          paid_at: approvedAt || new Date().toISOString(),
          region: campaignRegion,
          bank_transfer_info: bankTransferInfo
        },
        // 3차: 최소 컬럼 (region, bank_transfer_info 없이)
        {
          amount: totalAmount,
          currency: 'KRW',
          payment_method: 'toss_card',
          status: paymentStatus,
          paid_at: approvedAt || new Date().toISOString(),
          stripe_payment_intent_id: `toss_${paymentKey}`
        }
      ]

      let inserted = false
      let lastError = null
      for (let i = 0; i < insertAttempts.length; i++) {
        const { error: err } = await supabaseBiz
          .from('payments')
          .insert(insertAttempts[i])

        if (!err) {
          inserted = true
          if (i > 0) console.log(`[sync-toss-payments] ${i+1}차 시도에 성공:`, paymentKey)
          break
        }
        lastError = err
        console.error(`[sync-toss-payments] ${i+1}차 시도 실패:`, paymentKey, err.message, err.code)
      }

      if (!inserted) {
        results.failed++
        results.details.push({ paymentKey, error: lastError?.message || '알 수 없는 오류', code: lastError?.code })
        continue
      }

      results.synced++
      results.details.push({
        paymentKey,
        orderId,
        amount: totalAmount,
        status: paymentStatus,
        campaign: campaign?.title || null
      })

      console.log('[sync-toss-payments] 동기화 완료:', paymentKey, totalAmount, '원')
    }

    console.log('[sync-toss-payments] 동기화 완료:', results)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `동기화 완료: ${results.synced}건 추가, ${results.skipped}건 스킵, ${results.failed}건 실패`,
        stats: {
          total: transactions.length,
          synced: results.synced,
          skipped: results.skipped,
          failed: results.failed
        },
        details: results.details
      })
    }

  } catch (error) {
    console.error('[sync-toss-payments] 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
