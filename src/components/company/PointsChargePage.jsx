import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabaseBiz as supabase } from '../../lib/supabaseClients'
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
  const [depositorName, setDepositorName] = useState('') // 입금자명
  const [needsTaxInvoice, setNeedsTaxInvoice] = useState(false)
  const [taxInvoiceInfo, setTaxInvoiceInfo] = useState({
    companyName: '',
    businessNumber: '',
    ceoName: '',
    address: '',
    businessType: '',
    businessItem: '',
    email: ''
  })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null) // 회사 정보 저장

  // 프로필 정보 불러오기
  useEffect(() => {
    const loadCompanyProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: companyData, error } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) throw error

        if (companyData) {
          // 회사 정보 저장
          setCompanyInfo({
            companyName: companyData.company_name || '',
            email: companyData.notification_email || companyData.email || '',
            phone: companyData.notification_phone || companyData.phone || ''
          })
          
          // 세금계산서 정보 자동 입력
          setTaxInvoiceInfo({
            companyName: companyData.company_name || '',
            businessNumber: companyData.business_registration_number || '',
            ceoName: companyData.ceo_name || '',
            address: companyData.company_address || '',
            businessType: companyData.business_type || '',
            businessItem: companyData.business_category || '',
            email: companyData.email || ''
          })
          // 입금자명 기본값 설정
          setDepositorName(companyData.contact_person || companyData.company_name || '')
        }
      } catch (err) {
        console.error('프로필 정보 불러오기 실패:', err)
      }
    }

    loadCompanyProfile()
  }, [])

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

    if (!depositorName.trim()) {
      setError('입금자명을 입력해주세요')
      return
    }

    if (needsTaxInvoice) {
      if (!taxInvoiceInfo.companyName || !taxInvoiceInfo.businessNumber || 
          !taxInvoiceInfo.ceoName || !taxInvoiceInfo.email) {
        setError('세금계산서 발행을 위한 필수 정보를 모두 입력해주세요')
        return
      }
    }

    setProcessing(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

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
      console.log('[DEBUG] companyInfo:', companyInfo)
      console.log('[DEBUG] Sending data:', {
        companyId: user.id,
        companyName: companyInfo?.companyName || '',
        companyEmail: companyInfo?.email || '',
        companyPhone: companyInfo?.phone || ''
      })
      
      const response = await fetch('/.netlify/functions/create-charge-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: user.id,
          companyName: companyInfo?.companyName || '',
          companyEmail: companyInfo?.email || '',
          companyPhone: companyInfo?.phone || '',
          amount: finalAmount,
          quantity,
          packageAmount: selectedPackage,
          paymentMethod,
          depositorName: depositorName.trim(),
          needsTaxInvoice,
          taxInvoiceInfo: needsTaxInvoice ? taxInvoiceInfo : null,
          stripePaymentIntentId
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '충전 신청에 실패했습니다.')
      }

      alert('계좌이체 신청이 완료되었습니다. 입금 확인 후 포인트가 충전됩니다.')
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
          onChange={(e) => {
            const val = e.target.value
            if (val === '') {
              setQuantity('')
            } else {
              const num = parseInt(val)
              if (!isNaN(num) && num >= 1) {
                setQuantity(num)
              }
            }
          }}
          onBlur={(e) => {
            if (e.target.value === '' || parseInt(e.target.value) < 1) {
              setQuantity(1)
            }
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
          placeholder="수량 입력"
          required
        />
        <p className="text-xs text-gray-500 mt-2">
          {selectedPackage.toLocaleString()}원 × {quantity}명 = {baseAmount.toLocaleString()}원
        </p>
      </div>

      {/* 입금자명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          입금자명 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={depositorName}
          onChange={(e) => setDepositorName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="계좌이체 시 입금할 이름을 정확히 입력해주세요"
          required
        />
        <p className="text-xs text-gray-500 mt-2">
          ⚠️ 입금자명이 일치해야 자동으로 포인트가 충전됩니다.
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

            {/* 세금계산서 정보 입력 */}
            {needsTaxInvoice && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-600 mb-3">
                  세금계산서 발행을 위한 정보를 입력해주세요.
                </p>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    회사명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxInvoiceInfo.companyName}
                    onChange={(e) => setTaxInvoiceInfo({...taxInvoiceInfo, companyName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="회사명"
                    required={needsTaxInvoice}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    사업자등록번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxInvoiceInfo.businessNumber}
                    onChange={(e) => setTaxInvoiceInfo({...taxInvoiceInfo, businessNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="000-00-00000"
                    required={needsTaxInvoice}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    대표자명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxInvoiceInfo.ceoName}
                    onChange={(e) => setTaxInvoiceInfo({...taxInvoiceInfo, ceoName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="대표자명"
                    required={needsTaxInvoice}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    주소
                  </label>
                  <input
                    type="text"
                    value={taxInvoiceInfo.address}
                    onChange={(e) => setTaxInvoiceInfo({...taxInvoiceInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="사업장 주소"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      업태
                    </label>
                    <input
                      type="text"
                      value={taxInvoiceInfo.businessType}
                      onChange={(e) => setTaxInvoiceInfo({...taxInvoiceInfo, businessType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="서비스업"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      종목
                    </label>
                    <input
                      type="text"
                      value={taxInvoiceInfo.businessItem}
                      onChange={(e) => setTaxInvoiceInfo({...taxInvoiceInfo, businessItem: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="광고업"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={taxInvoiceInfo.email}
                    onChange={(e) => setTaxInvoiceInfo({...taxInvoiceInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="세금계산서를 받을 이메일"
                    required={needsTaxInvoice}
                  />
                </div>
              </div>
            )}
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
  const [chargeRequests, setChargeRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const handleSuccess = () => {
    setShowSuccessModal(true)
    loadChargeRequests()
  }

  // 충전 신청 내역 로드
  const loadChargeRequests = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // points_charge_requests 테이블의 company_id가 실제로는 user_id임
      // 따라서 user.id로 직접 조회
      const { data, error } = await supabase
        .from('points_charge_requests')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChargeRequests(data || [])
    } catch (err) {
      console.error('충전 내역 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  // 충전 신청 취소
  const handleCancelRequest = async (requestId) => {
    console.log('[DEBUG] Cancel button clicked for request:', requestId)
    
    if (!window.confirm('충전 신청을 취소하시겠습니까?\n\n⚠️ 이미 입금하신 경우, 환불 처리에 시간이 걸릴 수 있습니다.')) {
      console.log('[DEBUG] User cancelled the confirmation')
      return
    }

    console.log('[DEBUG] User confirmed, proceeding with cancellation')
    setLoading(true)

    try {
      // 현재 로그인한 사용자 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }

      console.log('[DEBUG] Calling cancel-charge-request API')
      const response = await fetch('/.netlify/functions/cancel-charge-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId,
          userId: user.id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('[ERROR] API error:', result.error)
        throw new Error(result.error || '취소 처리에 실패했습니다.')
      }

      console.log('[SUCCESS] Request cancelled successfully')
      window.alert('충전 신청이 취소되었습니다.')
      await loadChargeRequests()
    } catch (err) {
      console.error('[ERROR] Cancel failed:', err)
      window.alert(err.message || '취소 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChargeRequests()
  }, [])

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
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <Elements stripe={stripePromise}>
              <ChargeForm onSuccess={handleSuccess} />
            </Elements>
          </div>

          {/* 충전 신청 내역 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">충전 신청 내역 ({chargeRequests.length}건)</h2>
            
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : chargeRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">충전 신청 내역이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">신청일시</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">회사명</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">입금자명</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">금액</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">세금계산서</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">상태</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargeRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(request.created_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {request.tax_invoice_info?.companyName || '-'}<br />
                          <span className="text-xs text-gray-500">{request.tax_invoice_info?.email || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {request.depositor_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                          {request.amount?.toLocaleString()}원
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          {request.needs_tax_invoice ? (
                            <span className="text-blue-600">필요함</span>
                          ) : (
                            <span className="text-gray-400">불필요</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {request.status === 'pending' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <span className="mr-1">⏱</span> 입금 대기
                            </span>
                          )}
                          {request.status === 'confirmed' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              입금 확인
                            </span>
                          )}
                          {request.status === 'cancelled' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              취소됨
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              취소
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 성공 모달 */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">충전 신청 완료!</h3>
                <p className="text-gray-600 mb-6">
                  충전 신청이 성공적으로 접수되었습니다.<br />
                  <span className="text-sm text-gray-500">
                    입금 확인은 <strong>1~5분 정도</strong> 소요됩니다.
                  </span>
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

