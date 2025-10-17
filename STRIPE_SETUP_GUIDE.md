# Stripe 결제 시스템 설정 가이드

## 📋 개요

CNEC BIZ 플랫폼에 Stripe 결제 시스템이 통합되었습니다. 이 가이드는 Stripe 계정 설정부터 실제 운영까지의 전체 과정을 설명합니다.

## 🚀 1단계: Stripe 계정 생성

### 1.1 Stripe 가입
1. [Stripe 웹사이트](https://stripe.com/kr) 방문
2. "시작하기" 클릭
3. 이메일, 비밀번호 입력

### 1.2 사업자 정보 등록
- 사업자 유형: 개인사업자 또는 법인
- 사업자등록번호
- 대표자 정보
- 은행 계좌 정보 (정산 받을 계좌)

### 1.3 본인 인증
- 신분증 제출
- 사업자등록증 제출
- 승인 대기 (보통 1-2일)

## 🔑 2단계: API 키 발급

### 2.1 테스트 키 (개발용)
1. Stripe 대시보드 로그인
2. 개발자 → API 키 메뉴
3. "테스트 모드" 활성화
4. **Publishable key** 복사 (pk_test_로 시작)
5. **Secret key** 복사 (sk_test_로 시작)

### 2.2 프로덕션 키 (실제 운영용)
1. "실제 모드"로 전환
2. **Publishable key** 복사 (pk_live_로 시작)
3. **Secret key** 복사 (sk_live_로 시작)

⚠️ **주의**: Secret key는 절대 프론트엔드에 노출하지 마세요!

## ⚙️ 3단계: 환경 변수 설정

### 3.1 프론트엔드 (.env)
```bash
# Stripe Publishable Key (프론트엔드용)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 3.2 백엔드 (Supabase Edge Functions 또는 별도 서버)
```bash
# Stripe Secret Key (백엔드용)
STRIPE_SECRET_KEY=sk_test_your_key_here
```

## 🖥️ 4단계: 백엔드 설정 (Payment Intent)

Stripe 결제는 보안상 백엔드에서 Payment Intent를 생성해야 합니다.

### 옵션 1: Supabase Edge Functions (추천)

#### 4.1 Edge Function 생성
```bash
# Supabase CLI 설치
npm install -g supabase

# Edge Function 생성
supabase functions new create-payment-intent
```

#### 4.2 Edge Function 코드 작성
`supabase/functions/create-payment-intent/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.3.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { amount, currency, campaignData } = await req.json()

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        campaign_id: campaignData.id,
        company_id: campaignData.company_id,
        package_type: campaignData.package_type,
        regions: JSON.stringify(campaignData.regions)
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 4.3 Edge Function 배포
```bash
# Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# Secret 설정
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here

# 배포
supabase functions deploy create-payment-intent
```

#### 4.4 프론트엔드 코드 수정
`src/lib/stripeService.js`의 `createPaymentIntent` 함수 수정:

```javascript
export const createPaymentIntent = async (amount, campaignData) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_BIZ_URL}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_BIZ_ANON_KEY}`
        },
        body: JSON.stringify({
          amount: convertToStripeAmount(amount),
          currency: 'krw',
          campaignData
        })
      }
    )

    const data = await response.json()
    return data.clientSecret
  } catch (error) {
    console.error('Payment Intent 생성 실패:', error)
    throw error
  }
}
```

### 옵션 2: Node.js 서버 (Express)

#### 4.1 서버 설정
```bash
mkdir stripe-server
cd stripe-server
npm init -y
npm install express stripe cors dotenv
```

#### 4.2 서버 코드
`server.js`:

```javascript
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, campaignData } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        campaign_id: campaignData.id,
        company_id: campaignData.company_id,
        package_type: campaignData.package_type,
        regions: JSON.stringify(campaignData.regions)
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

#### 4.3 서버 실행
```bash
node server.js
```

## 💳 5단계: 결제 플로우 테스트

### 5.1 테스트 카드 번호
Stripe 제공 테스트 카드:

| 카드 번호 | 결과 |
|----------|------|
| 4242 4242 4242 4242 | 성공 |
| 4000 0000 0000 0002 | 거부 (카드 거부) |
| 4000 0000 0000 9995 | 거부 (잔액 부족) |
| 4000 0025 0000 3155 | 3D Secure 인증 필요 |

**기타 정보**:
- 만료일: 미래 날짜 아무거나 (예: 12/34)
- CVC: 아무 3자리 숫자 (예: 123)
- 우편번호: 아무 5자리 숫자 (예: 12345)

### 5.2 테스트 시나리오
1. 캠페인 생성
2. 결제 페이지 이동
3. 테스트 카드 입력
4. 결제 완료 확인
5. Stripe 대시보드에서 결제 내역 확인

## 🔔 6단계: Webhook 설정 (선택)

결제 완료, 환불 등의 이벤트를 실시간으로 받으려면 Webhook 설정이 필요합니다.

### 6.1 Webhook Endpoint 생성
Supabase Edge Function 또는 별도 서버에 Webhook endpoint 생성:

```typescript
serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  try {
    const event = stripe.webhooks.constructEvent(
      await req.text(),
      sig,
      webhookSecret
    )

    switch (event.type) {
      case 'payment_intent.succeeded':
        // 결제 성공 처리
        const paymentIntent = event.data.object
        console.log('Payment succeeded:', paymentIntent.id)
        break
      case 'payment_intent.payment_failed':
        // 결제 실패 처리
        console.log('Payment failed')
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
```

### 6.2 Stripe 대시보드에서 Webhook 등록
1. 개발자 → Webhooks 메뉴
2. "엔드포인트 추가" 클릭
3. URL 입력 (예: https://your-project.supabase.co/functions/v1/stripe-webhook)
4. 이벤트 선택:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
5. Webhook 서명 비밀 복사

### 6.3 Webhook Secret 설정
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

## 🌍 7단계: 다국어/다통화 설정

### 7.1 지역별 통화 설정
```javascript
const REGION_CURRENCY = {
  japan: 'jpy',
  us: 'usd',
  taiwan: 'twd',
  korea: 'krw'
}

// 지역에 따라 통화 자동 선택
const currency = REGION_CURRENCY[selectedRegion]
```

### 7.2 Stripe 지원 통화
- KRW (한국 원화)
- JPY (일본 엔화)
- USD (미국 달러)
- TWD (대만 달러)

## 🔒 8단계: 보안 체크리스트

- [ ] Secret key는 백엔드에만 저장
- [ ] Publishable key만 프론트엔드에 노출
- [ ] HTTPS 사용 (Netlify 자동 제공)
- [ ] Webhook 서명 검증
- [ ] 결제 금액 백엔드에서 재검증
- [ ] PCI DSS 준수 (Stripe가 자동 처리)

## 📊 9단계: 실제 운영 전환

### 9.1 체크리스트
- [ ] Stripe 계정 본인 인증 완료
- [ ] 은행 계좌 등록 완료
- [ ] 테스트 모드에서 충분히 테스트
- [ ] Webhook 정상 작동 확인
- [ ] 환불 정책 명시
- [ ] 이용약관 업데이트

### 9.2 프로덕션 키로 전환
1. `.env` 파일 수정:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
```

2. 백엔드 Secret 업데이트:
```bash
STRIPE_SECRET_KEY=sk_live_your_live_key_here
```

3. 배포 및 테스트

## 💰 10단계: 수수료 및 정산

### 수수료
- 국내 카드: **2.9% + 30센트**
- 해외 카드: **3.9% + 30센트**
- 통화 변환: 추가 수수료 없음 (Stripe 자동 처리)

### 정산 주기
- 기본: 7일 (결제 후 7일 뒤 정산)
- 변경 가능: Stripe 대시보드에서 설정

### 정산 확인
Stripe 대시보드 → 잔액 → 정산 내역

## 🆘 문제 해결

### 결제 실패
1. Stripe 대시보드 → 결제 내역 확인
2. 로그 확인 (브라우저 콘솔, 서버 로그)
3. 카드 거부 사유 확인

### Webhook 작동 안 함
1. Webhook URL 확인
2. Webhook 서명 비밀 확인
3. Stripe 대시보드 → Webhooks → 이벤트 로그 확인

### 정산 안 됨
1. 은행 계좌 정보 확인
2. 본인 인증 완료 여부 확인
3. Stripe 지원팀 문의

## 📞 지원

- **Stripe 문서**: https://stripe.com/docs
- **Stripe 지원**: https://support.stripe.com
- **CNEC BIZ 문의**: help@cnecbiz.com

---

**작성일**: 2025-10-17
**버전**: 1.0.0

