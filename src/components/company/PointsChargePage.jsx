import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Check, Sparkles } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

// Stripe는 현재 사용하지 않음 (무통장 입금만 사용)
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null)

// 패키지 정의
const PACKAGES = [
  { value: 200000, label: '20만원' },
  { value: 300000, label: '30만원' },
  { value: 400000, label: '40만원' },
  { value: 600000, label: '60만원' }
]

function ChargeForm({ onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [selectedPackage, setSelectedPackage] = useState(200000)
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [needsTaxInvoice, setNeedsTaxInvoice] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  // 금액 계산
  const baseAmount = selectedPackage * quantity
  const discount = baseAmount >= 10000000 ? Math.floor(baseAmount * 0.05) : 0
  const finalAmount = baseAmount - discount
  const discountRate = discount > 0 ? 5 : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (quantity < 1) {
      setError('수량을 1개 이상 입력해주세요')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      let stripePaymentIntentId = null

      if (paymentMethod === 'stripe') {
        // Stripe payment
        if (!stripe || !elements) {
          throw new Error('Stripe가 로드되지 않았습니다')
        }

        const { error: paymentError, paymentMethod: pm } = await stripe.createPaymentMethod({
          type: 'card',
          card: elements.getElement(CardElement),
        })

        if (paymentError) {
          throw new Error(paymentError.message)
        }

        stripePaymentIntentId = pm.id
      }

      // Netlify Function API 호출
      const response = await fetch('/.netlify/functions/create-charge-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: user.id,
          amount: finalAmount,
          paymentMethod,
          needsTaxInvoice,
          stripePaymentIntentId
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '충전 신청에 실패했습니다.')
      }

      alert(result.message)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 패키지 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          충전 패키지 선택
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.value}
              type="button"
              onClick={() => setSelectedPackage(pkg.value)}
              className={`p-4 border-2 rounded-xl font-medium transition-all ${
                selectedPackage === pkg.value
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {pkg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 수량 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          수량 (명)
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
          placeholder="수량 입력"
          required
        />
        <p className="text-xs text-gray-500 mt-2">
          {selectedPackage.toLocaleString()}원 × {quantity}명 = {baseAmount.toLocaleString()}원
        </p>
      </div>

      {/* 할인 정보 (1천만원 이상) */}
      {baseAmount >= 10000000 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-bold text-purple-900">
              🎉 1천만원 이상 특별 할인!
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">기본 금액</span>
              <span className="text-lg font-medium line-through text-gray-400">
                {baseAmount.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-700 font-medium">할인 (5%)</span>
              <span className="text-lg font-bold text-purple-600">
                -{discount.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t-2 border-purple-200">
              <span className="text-lg font-bold text-purple-900">최종 결제 금액</span>
              <span className="text-2xl font-bold text-purple-600">
                {finalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 일반 금액 표시 (1천만원 미만) */}
      {baseAmount < 10000000 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">결제 금액</span>
            <span className="text-2xl font-bold text-blue-600">
              {finalAmount.toLocaleString()}원
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 1천만원 이상 충전 시 5% 할인 혜택!
          </p>
        </div>
      )}

      {/* 결제 방법 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          결제 방법
        </label>
        <div className="space-y-3">
          <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="bank_transfer"
              checked={paymentMethod === 'bank_transfer'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3 w-5 h-5"
            />
            <div className="flex-1">
              <div className="font-medium">계좌이체 (권장)</div>
              <div className="text-xs text-gray-500 mt-1">입금 확인 후 충전 (영업일 기준 1시간 이내)</div>
            </div>
            {paymentMethod === 'bank_transfer' && (
              <Check className="w-5 h-5 text-blue-600" />
            )}
          </label>

          <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="stripe"
              checked={paymentMethod === 'stripe'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3 w-5 h-5"
            />
            <div className="flex-1">
              <div className="font-medium">신용카드</div>
              <div className="text-xs text-gray-500 mt-1">즉시 충전</div>
            </div>
            {paymentMethod === 'stripe' && (
              <Check className="w-5 h-5 text-blue-600" />
            )}
          </label>
        </div>
      </div>

      {/* 계좌이체 정보 */}
      {paymentMethod === 'bank_transfer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-4">입금 계좌 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">은행</span>
              <span className="font-medium">IBK기업은행</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">계좌번호</span>
              <span className="font-medium">047-122753-04-011</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">예금주</span>
              <span className="font-medium">주식회사 하우파파</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={needsTaxInvoice}
                onChange={(e) => setNeedsTaxInvoice(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">세금계산서 발행 필요</span>
            </label>
          </div>
        </div>
      )}

      {/* 카드 정보 입력 */}
      {paymentMethod === 'stripe' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            카드 정보
          </label>
          <div className="p-4 border border-gray-300 rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
      >
        {processing ? '처리 중...' : paymentMethod === 'stripe' ? '카드 결제하기' : '계좌이체 신청하기'}
      </button>

      {/* 안내 사항 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">안내 사항</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 1포인트 = 1원</li>
          <li>• 포인트 유효기간: 충전일로부터 5년</li>
          <li>• 1천만원 이상 충전 시 5% 자동 할인</li>
          <li>• 계좌이체: 영업일 기준 1시간 내 확인</li>
          <li>• 환불 시 수수료 10% 차감</li>
        </ul>
      </div>
    </form>
  )
}

export default function PointsChargePage() {
  const navigate = useNavigate()

  const handleSuccess = () => {
    navigate('/company/dashboard')
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 lg:ml-64">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">포인트 충전</h1>
            <p className="text-gray-600 mt-2">포인트를 충전하여 캠페인을 생성하세요</p>
          </div>

          {/* 충전 폼 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Elements stripe={stripePromise}>
              <ChargeForm onSuccess={handleSuccess} />
            </Elements>
          </div>
        </div>
      </div>
    </>
  )
}

