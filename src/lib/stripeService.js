import { loadStripe } from '@stripe/stripe-js'

// Stripe 초기화
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// 패키지 가격 정보 (원화)
export const PACKAGE_PRICES = {
  basic: {
    name: '기본형',
    price: 200000,
    description: '일반 퀄리티 지원자',
    features: [
      '캠페인 생성 및 관리',
      '크리에이터 매칭',
      'AI 가이드 생성',
      '다국어 번역',
      '기본 보고서'
    ]
  },
  standard: {
    name: '스탠다드',
    price: 300000,
    description: '향상된 퀄리티 + 영상 수정 1회',
    features: [
      '기본형 모든 기능',
      '영상 수정 1회 포함',
      '우선 크리에이터 매칭',
      '상세 보고서'
    ]
  },
  premium: {
    name: '프리미엄',
    price: 400000,
    description: '최고 퀄리티 지원자',
    features: [
      '스탠다드 모든 기능',
      '프리미엄 크리에이터 우선 매칭',
      '영상 수정 2회 포함',
      '전담 매니저 지원',
      '고급 분석 보고서'
    ]
  },
  monthly: {
    name: '4주 연속',
    price: 600000,
    description: '매주 1건씩 4주간 진행',
    features: [
      '프리미엄 모든 기능',
      '4주간 매주 1건 영상',
      '일관된 브랜딩',
      '통합 성과 보고서',
      '전담 매니저 상시 지원'
    ]
  }
}

// 추천 크리에이터 추가 금액 계산
export const calculateFeaturedCreatorPrice = (basePrice, featuredCreatorPricing) => {
  if (!featuredCreatorPricing) return basePrice
  
  // 추천 크리에이터 선택 시 해당 크리에이터의 패키지별 가격 사용
  return featuredCreatorPricing
}

// 지역별 추가 금액 (옵션)
export const REGION_MULTIPLIER = {
  japan: 1.0,
  us: 1.0,
  taiwan: 1.0
}

// 총 금액 계산
export const calculateTotalAmount = (packageType, regions, featuredCreatorPrice = null) => {
  const basePrice = featuredCreatorPrice || PACKAGE_PRICES[packageType].price
  const regionCount = regions.length
  
  // 여러 지역 선택 시 지역당 금액 부과
  return basePrice * regionCount
}

// 원화를 센트로 변환 (Stripe는 최소 단위 사용)
export const convertToStripeAmount = (krw) => {
  return Math.round(krw)
}

// 센트를 원화로 변환
export const convertFromStripeAmount = (cents) => {
  return cents
}

// 금액 포맷팅
export const formatPrice = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount)
}

// Payment Intent 생성 (백엔드 API 호출)
export const createPaymentIntent = async (amount, campaignData) => {
  try {
    // 실제로는 백엔드 API를 호출해야 함
    // 여기서는 Supabase Edge Function 또는 별도 서버 필요
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: convertToStripeAmount(amount),
        currency: 'krw',
        campaignData
      })
    })

    const data = await response.json()
    return data.clientSecret
  } catch (error) {
    console.error('Payment Intent 생성 실패:', error)
    throw error
  }
}

// 결제 상태 확인
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled'
}

// 결제 내역 저장 (Supabase)
export const savePaymentRecord = async (supabase, paymentData) => {
  const { data, error } = await supabase
    .from('payments')
    .insert([{
      campaign_id: paymentData.campaignId,
      company_id: paymentData.companyId,
      amount: paymentData.amount,
      currency: 'KRW',
      payment_method: 'card',
      stripe_payment_intent_id: paymentData.paymentIntentId,
      status: paymentData.status,
      metadata: paymentData.metadata
    }])
    .select()
    .single()

  if (error) {
    console.error('결제 내역 저장 실패:', error)
    throw error
  }

  return data
}

// 결제 완료 후 캠페인 활성화
export const activateCampaign = async (supabase, campaignId) => {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ 
      status: 'active',
      payment_status: 'paid',
      activated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .select()
    .single()

  if (error) {
    console.error('캠페인 활성화 실패:', error)
    throw error
  }

  return data
}

