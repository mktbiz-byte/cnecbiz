/**
 * 토스페이먼츠 카드결제 승인 + DB 저장 Netlify Function
 * 1. 토스 API로 결제 승인
 * 2. payments 테이블에 결제 정보 저장
 * 3. campaigns 테이블 payment_status 업데이트
 * 4. 네이버 웍스 관리자 알림 발송
 */

const { createClient } = require('@supabase/supabase-js')

// 토스페이먼츠 시크릿 키 (환경변수 필수)
const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY

// Supabase 클라이언트 초기화
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

// 리전별 Supabase 클라이언트 반환 (캠페인 조회/업데이트용)
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
    const { paymentKey, orderId, amount, campaignId, region } = JSON.parse(event.body)

    // 필수 파라미터 검증
    if (!paymentKey || !orderId || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '필수 파라미터가 누락되었습니다.' })
      }
    }

    if (!TOSS_SECRET_KEY) {
      console.error('[confirm-toss-payment] TOSS_PAYMENTS_SECRET_KEY 환경변수가 설정되지 않았습니다.')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: '결제 시스템 설정 오류입니다. 관리자에게 문의하세요.' })
      }
    }

    console.log('[confirm-toss-payment] 결제 승인 요청:', { paymentKey, orderId, amount, campaignId, region })

    // ===== 1단계: 토스페이먼츠 API로 결제 승인 =====
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount })
    })

    const tossResult = await tossResponse.json()

    if (!tossResponse.ok) {
      console.error('[confirm-toss-payment] 토스 결제 승인 실패:', tossResult)
      return {
        statusCode: tossResponse.status,
        headers,
        body: JSON.stringify({
          message: tossResult.message || '결제 승인에 실패했습니다.',
          code: tossResult.code
        })
      }
    }

    console.log('[confirm-toss-payment] 토스 결제 승인 성공:', {
      paymentKey: tossResult.paymentKey,
      method: tossResult.method,
      totalAmount: tossResult.totalAmount,
      status: tossResult.status
    })

    // ===== 2단계: DB에 결제 정보 저장 =====
    // 캠페인은 리전별 DB에, 결제 기록은 supabaseBiz(중앙)에 저장
    const supabaseRegion = getCampaignSupabase(region || 'korea')

    if (campaignId) {
      // 캠페인 조회 (리전별 DB에서)
      let campaign = null
      if (supabaseRegion) {
        const { data, error: campaignError } = await supabaseRegion
          .from('campaigns')
          .select('id, title, company_id, brand, campaign_type, estimated_cost')
          .eq('id', campaignId)
          .single()
        if (campaignError) {
          console.error('[confirm-toss-payment] 캠페인 조회 실패 (리전):', campaignError)
        }
        campaign = data
      }
      // 리전 DB에서 못 찾으면 supabaseBiz에서 시도
      if (!campaign && supabaseBiz) {
        const { data } = await supabaseBiz
          .from('campaigns')
          .select('id, title, company_email, company_id, brand, campaign_type, estimated_cost')
          .eq('id', campaignId)
          .single()
        campaign = data
      }

      if (campaign) {
        // supabaseBiz에 해당 campaign이 존재하는지 확인 (FK 제약 대비)
        let campaignExistsInBiz = false
        if (supabaseBiz) {
          const { data: bizCampaign } = await supabaseBiz
            .from('campaigns')
            .select('id')
            .eq('id', campaignId)
            .maybeSingle()
          campaignExistsInBiz = !!bizCampaign
        }

        // payments 테이블에 결제 기록 저장 (supabaseBiz 중앙 DB에 저장)
        const paymentData = {
          amount: tossResult.totalAmount || amount,
          currency: 'KRW',
          payment_method: 'toss_card',
          status: 'completed',
          paid_at: tossResult.approvedAt || new Date().toISOString(),
          region: region || 'korea',
          bank_transfer_info: {
            provider: 'toss',
            paymentKey: tossResult.paymentKey,
            orderId: tossResult.orderId,
            method: tossResult.method,
            campaignId: campaignId,
            card: tossResult.card ? {
              issuerCode: tossResult.card.issuerCode,
              number: tossResult.card.number,
              cardType: tossResult.card.cardType,
              ownerType: tossResult.card.ownerType,
              acquirerCode: tossResult.card.acquirerCode
            } : null,
            receipt: tossResult.receipt,
            approvedAt: tossResult.approvedAt
          }
        }

        // campaign_id는 supabaseBiz에 캠페인이 존재할 때만 FK로 설정
        if (campaignExistsInBiz) {
          paymentData.campaign_id = campaignId
        } else {
          console.log('[confirm-toss-payment] 캠페인이 supabaseBiz에 없어 campaign_id FK 생략 (bank_transfer_info에 저장)')
        }

        // company_id 설정 (캠페인에서 가져오거나, company_email로 companies 조회)
        if (campaign.company_biz_id) {
          const { data: compCheck } = await supabaseBiz
            .from('companies')
            .select('id')
            .eq('id', campaign.company_biz_id)
            .maybeSingle()
          if (compCheck) {
            paymentData.company_id = campaign.company_biz_id
          }
        } else if (campaign.company_id) {
          // companies.id 먼저 확인, 없으면 user_id로 확인
          const { data: compById } = await supabaseBiz
            .from('companies')
            .select('id')
            .eq('id', campaign.company_id)
            .maybeSingle()
          if (compById) {
            paymentData.company_id = campaign.company_id
          } else {
            const { data: compByUserId } = await supabaseBiz
              .from('companies')
              .select('user_id')
              .eq('user_id', campaign.company_id)
              .maybeSingle()
            if (compByUserId) {
              paymentData.company_id = campaign.company_id
            }
          }
        } else if (campaign.company_email && supabaseBiz) {
          const { data: companyData } = await supabaseBiz
            .from('companies')
            .select('user_id')
            .eq('email', campaign.company_email)
            .maybeSingle()
          if (companyData?.user_id) {
            paymentData.company_id = companyData.user_id
          }
        }

        // 결제 기록은 supabaseBiz(중앙)에 저장
        if (supabaseBiz) {
          const { error: insertError } = await supabaseBiz
            .from('payments')
            .insert(paymentData)

          if (insertError) {
            console.error('[confirm-toss-payment] 결제 기록 저장 실패 (supabaseBiz):', insertError)
            // FK 제약 위반 시 campaign_id, company_id 제외하고 재시도
            if (insertError.code === '23503') {
              console.log('[confirm-toss-payment] FK 제약 위반, campaign_id/company_id 제외하고 재시도')
              delete paymentData.campaign_id
              delete paymentData.company_id
              const { error: retryError } = await supabaseBiz
                .from('payments')
                .insert(paymentData)
              if (retryError) {
                console.error('[confirm-toss-payment] 재시도도 실패:', retryError)
              } else {
                console.log('[confirm-toss-payment] FK 제외 재시도 성공')
              }
            }
          } else {
            console.log('[confirm-toss-payment] 결제 기록 저장 완료 (supabaseBiz)')
          }
        }

        // campaigns 테이블 결제 상태 업데이트 (리전별 DB)
        if (supabaseRegion) {
          const { error: updateError } = await supabaseRegion
            .from('campaigns')
            .update({
              payment_status: 'paid',
              payment_method: 'toss_card',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignId)

          if (updateError) {
            console.error('[confirm-toss-payment] 캠페인 상태 업데이트 실패:', updateError)
          } else {
            console.log('[confirm-toss-payment] 캠페인 결제 상태 업데이트 완료')
          }
        }

        // ===== 3단계: 네이버 웍스 관리자 알림 =====
        try {
          const campaignTypeMap = {
            'planned': '기획형',
            'regular': '기획형',
            'oliveyoung': '올리브영',
            '4week_challenge': '4주 챌린지',
            '4week': '4주 챌린지'
          }
          const campaignTypeText = campaignTypeMap[campaign.campaign_type] || '기획형'

          // 회사 정보 조회 (company_email 또는 company_id)
          let companyName = campaign.brand || ''
          if (campaign.company_email && supabaseBiz) {
            const { data: companyData } = await supabaseBiz
              .from('companies')
              .select('company_name')
              .eq('email', campaign.company_email)
              .maybeSingle()
            if (companyData?.company_name) {
              companyName = companyData.company_name
            }
          } else if (campaign.company_biz_id && supabaseBiz) {
            const { data: companyData } = await supabaseBiz
              .from('companies')
              .select('company_name')
              .eq('id', campaign.company_biz_id)
              .maybeSingle()
            if (companyData?.company_name) {
              companyName = companyData.company_name
            }
          } else if (campaign.company_id && supabaseBiz) {
            // id 먼저, 없으면 user_id
            const { data: compById } = await supabaseBiz
              .from('companies')
              .select('company_name')
              .eq('id', campaign.company_id)
              .maybeSingle()
            if (compById?.company_name) {
              companyName = compById.company_name
            } else {
              const { data: compByUserId } = await supabaseBiz
                .from('companies')
                .select('company_name')
                .eq('user_id', campaign.company_id)
                .maybeSingle()
              if (compByUserId?.company_name) {
                companyName = compByUserId.company_name
              }
            }
          }

          const koreanDate = new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })

          const naverWorksMessage = `[카드결제 완료 - 캠페인 검수 요청]

캠페인: ${campaign.title}
타입: ${campaignTypeText}
브랜드: ${companyName || '미등록'}

결제 금액: ${(tossResult.totalAmount || amount).toLocaleString()}원
결제 수단: ${tossResult.method || '카드'}
기업: ${companyName}
이메일: ${campaign.company_email || '미등록'}

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
          console.log('[confirm-toss-payment] 네이버 웍스 알림 발송 성공')
        } catch (notifError) {
          console.error('[confirm-toss-payment] 네이버 웍스 알림 발송 실패:', notifError)
        }
      }
    } else {
      console.warn('[confirm-toss-payment] DB 저장 건너뜀 - supabase 또는 campaignId 없음')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        payment: tossResult
      })
    }

  } catch (error) {
    console.error('[confirm-toss-payment] 서버 오류:', error)

    // 에러 알림 발송
    try {
      const { orderId, amount, campaignId } = JSON.parse(event.body || '{}')
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'confirm-toss-payment (토스 카드결제)',
          errorMessage: error.message,
          context: { 주문번호: orderId, 금액: amount, 캠페인ID: campaignId }
        })
      })
    } catch (e) { console.error('[confirm-toss-payment] Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: '서버 오류가 발생했습니다.',
        error: error.message
      })
    }
  }
}
