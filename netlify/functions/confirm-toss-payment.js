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
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL
const supabaseKoreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
const supabaseBizUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseBizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseKorea = supabaseKoreaUrl && supabaseKoreaServiceKey
  ? createClient(supabaseKoreaUrl, supabaseKoreaServiceKey)
  : null
const supabaseBiz = supabaseBizUrl && supabaseBizServiceKey
  ? createClient(supabaseBizUrl, supabaseBizServiceKey)
  : null

// 리전별 Supabase 클라이언트 반환
function getSupabaseByRegion(region) {
  switch (region) {
    case 'korea':
      return supabaseKorea
    default:
      return supabaseKorea // 토스 결제는 한국 리전이 기본
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
    const supabaseRegion = getSupabaseByRegion(region || 'korea')

    if (supabaseRegion && campaignId) {
      // 캠페인 조회
      const { data: campaign, error: campaignError } = await supabaseRegion
        .from('campaigns')
        .select('id, title, company_email, company_id, brand, campaign_type, estimated_cost')
        .eq('id', campaignId)
        .single()

      if (campaignError) {
        console.error('[confirm-toss-payment] 캠페인 조회 실패:', campaignError)
      }

      if (campaign) {
        // payments 테이블에 결제 기록 저장
        const paymentData = {
          campaign_id: campaignId,
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

        // company_id 설정 (캠페인에서 가져오거나, company_email로 companies 조회)
        if (campaign.company_id) {
          paymentData.company_id = campaign.company_id
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

        const { error: insertError } = await supabaseRegion
          .from('payments')
          .insert(paymentData)

        if (insertError) {
          console.error('[confirm-toss-payment] 결제 기록 저장 실패:', insertError)
        } else {
          console.log('[confirm-toss-payment] 결제 기록 저장 완료')
        }

        // campaigns 테이블 결제 상태 업데이트
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

          // 회사 정보 조회
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

          await fetch('/.netlify/functions/send-naver-works-message', {
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
