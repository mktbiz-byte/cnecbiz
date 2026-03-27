import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise, PACKAGE_PRICES, calculateTotalAmount, formatPrice, PAYMENT_STATUS } from '../lib/stripeService'
import { supabaseBiz } from '../lib/supabaseClients'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, CreditCard, CheckCircle2, XCircle, ShieldCheck, Lock } from 'lucide-react'
import { sendPointChargeCompleteNotification } from '../services/notifications'

// Stripe Card Element 스타일
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: true,
}

function CheckoutForm({ campaignData, amount, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [cardComplete, setCardComplete] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    if (!cardComplete) {
      setError('카드 정보를 모두 입력해주세요.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // 실제 환경에서는 백엔드에서 Payment Intent를 생성해야 함
      // 여기서는 데모용으로 직접 처리
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          name: campaignData.company_name,
          email: campaignData.company_email,
        },
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      // 결제 성공 시뮬레이션 (실제로는 백엔드에서 confirmPayment 필요)
      console.log('Payment Method Created:', paymentMethod)

      // Supabase에 결제 내역 저장
      const { data: paymentRecord, error: dbError } = await supabaseBiz
        .from('payments')
        .insert([{
          campaign_id: campaignData.id,
          company_id: campaignData.company_id,
          amount: amount,
          currency: 'KRW',
          payment_method: 'card',
          stripe_payment_method_id: paymentMethod.id,
          status: PAYMENT_STATUS.SUCCEEDED,
          metadata: {
            package_type: campaignData.package_type,
            regions: campaignData.regions,
            card_brand: paymentMethod.card.brand,
            card_last4: paymentMethod.card.last4
          }
        }])
        .select()
        .single()

      if (dbError) throw dbError

      // 캠페인 활성화
      const { error: campaignError } = await supabaseBiz
        .from('campaigns')
        .update({ 
          status: 'active',
          payment_status: 'paid',
          payment_id: paymentRecord.id,
          activated_at: new Date().toISOString()
        })
        .eq('id', campaignData.id)

      if (campaignError) throw campaignError

      onSuccess(paymentRecord)
    } catch (err) {
      console.error('결제 실패:', err)
      setError(err.message || '결제 처리 중 오류가 발생했습니다.')
      onError(err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            카드 정보
          </label>
          <div className="p-4 border-2 border-gray-200 rounded-lg bg-white">
            <CardElement
              options={CARD_ELEMENT_OPTIONS}
              onChange={(e) => setCardComplete(e.complete)}
            />
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            모든 결제 정보는 Stripe를 통해 안전하게 암호화됩니다
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">총 결제 금액</span>
            <span className="text-2xl font-bold text-blue-600">{formatPrice(amount)}</span>
          </div>

          <Button
            type="submit"
            disabled={!stripe || processing || !cardComplete}
            className="w-full h-12 text-lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                결제 처리 중...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                {formatPrice(amount)} 결제하기
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 결제 완료 후 즉시 캠페인이 활성화됩니다</p>
          <p>• 환불 정책: 캠페인 활성화 전 100% 환불 가능</p>
          <p>• 문의: help@cnecbiz.com</p>
        </div>
      </div>
    </form>
  )
}

export default function PaymentPage() {
  const navigate = useNavigate()
  const { campaignId } = useParams()
  const location = useLocation()
  const [campaignData, setCampaignData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentRecord, setPaymentRecord] = useState(null)

  useEffect(() => {
    loadCampaignData()
  }, [campaignId])

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) throw error

      // 이미 결제된 캠페인인지 확인
      if (data.payment_status === 'paid') {
        navigate(`/campaigns/${campaignId}`)
        return
      }

      setCampaignData(data)
    } catch (error) {
      console.error('캠페인 정보 로드 실패:', error)
      alert('캠페인 정보를 불러올 수 없습니다.')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async (record) => {
    setPaymentRecord(record)
    setPaymentSuccess(true)
    
    // 포인트 충전 알림톡 발송
    try {
      const { data: userData } = await supabaseBiz.auth.getUser()
      const { data: companyData } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', userData?.user?.id)
        .single()
      
      if (companyData) {
        await sendPointChargeCompleteNotification(
          companyData.phone,
          companyData.contact_person,
          {
            companyName: companyData.company_name,
            amount: formatPrice(record.amount),
            paymentMethod: `${record.metadata?.card_brand?.toUpperCase()} ****${record.metadata?.card_last4}`
          }
        )
      }
    } catch (notifError) {
      console.error('알림톡 발송 실패:', notifError)
    }
  }

  const handlePaymentError = (error) => {
    console.error('결제 오류:', error)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!campaignData) {
    return null
  }

  const totalAmount = calculateTotalAmount(
    campaignData.package_type,
    campaignData.regions,
    campaignData.featured_creator_price
  )

  const packageInfo = PACKAGE_PRICES[campaignData.package_type]

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">결제가 완료되었습니다!</CardTitle>
              <CardDescription className="text-green-700">
                캠페인이 성공적으로 활성화되었습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-6 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">결제 금액</span>
                  <span className="font-bold">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">결제 방법</span>
                  <span className="font-medium">
                    {paymentRecord?.metadata?.card_brand?.toUpperCase()} ****{paymentRecord?.metadata?.card_last4}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">결제 일시</span>
                  <span className="font-medium">
                    {new Date(paymentRecord?.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => navigate(`/campaigns/${campaignId}`)}
                  className="flex-1"
                >
                  캠페인 관리하기
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="flex-1"
                >
                  대시보드로
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">결제하기</h1>
          <p className="text-gray-600">안전한 결제를 위해 Stripe를 사용합니다</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 주문 요약 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">주문 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{packageInfo.name} 패키지</p>
                      <p className="text-sm text-gray-600">{packageInfo.description}</p>
                    </div>
                    <p className="font-bold">{formatPrice(packageInfo.price)}</p>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm font-semibold text-gray-700 mb-2">선택한 지역</p>
                    <div className="flex gap-2 flex-wrap">
                      {campaignData.regions.map(region => {
                        const regionNames = { japan: '🇯🇵 일본', us: '🇺🇸 미국', taiwan: '🇹🇼 대만' }
                        return (
                          <span key={region} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {regionNames[region]}
                          </span>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {campaignData.regions.length}개 지역 × {formatPrice(packageInfo.price)}
                    </p>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm font-semibold text-gray-700 mb-2">포함 기능</p>
                    <ul className="space-y-1">
                      {packageInfo.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">총 결제 금액</span>
                    <span className="text-2xl font-bold text-blue-600">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-900">안전한 결제</p>
                    <p className="text-sm text-blue-700">
                      모든 결제는 PCI DSS 인증을 받은 Stripe를 통해 안전하게 처리됩니다. 
                      카드 정보는 저장되지 않으며, 256비트 SSL 암호화로 보호됩니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 결제 폼 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">결제 정보</CardTitle>
                <CardDescription>카드 정보를 입력해주세요</CardDescription>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    campaignData={campaignData}
                    amount={totalAmount}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

