import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabaseBiz } from '../../lib/supabaseClients'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function ChargeForm({ onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [needsTaxInvoice, setNeedsTaxInvoice] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!amount || parseInt(amount) < 10000) {
      setError('최소 충전 금액은 10,000원입니다')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

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

        // Create charge request
        const { data: chargeRequest, error: dbError } = await supabaseBiz
          .from('points_charge_requests')
          .insert({
            company_id: user.id,
            amount: parseInt(amount),
            payment_method: 'stripe',
            stripe_payment_intent_id: pm.id,
            status: 'completed'
          })
          .select()
          .single()

        if (dbError) throw dbError

        // Add points
        const { error: pointsError } = await supabaseBiz.rpc('add_points', {
          user_id: user.id,
          points: parseInt(amount),
          transaction_type: 'charge',
          transaction_description: `Stripe 충전 - ${parseInt(amount).toLocaleString()}원`
        })

        if (pointsError) throw pointsError

        onSuccess()
      } else {
        // Bank transfer
        const { error: dbError } = await supabaseBiz
          .from('points_charge_requests')
          .insert({
            company_id: user.id,
            amount: parseInt(amount),
            payment_method: 'bank_transfer',
            needs_tax_invoice: needsTaxInvoice,
            status: 'pending'
          })

        if (dbError) throw dbError

        alert('계좌이체 신청이 완료되었습니다. 입금 확인 후 포인트가 충전됩니다.')
        onSuccess()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const supplyPrice = parseInt(amount) || 0
  const vat = Math.floor(supplyPrice * 0.1)
  const totalPrice = supplyPrice + vat

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          충전 금액 (원)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10,000"
          min="10000"
          step="1000"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <p className="text-xs text-gray-500 mt-1">최소 충전 금액: 10,000원</p>
      </div>

      {/* Quick Amount Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[50000, 100000, 300000, 500000].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => setAmount(amt.toString())}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            {(amt / 10000).toFixed(0)}만원
          </button>
        ))}
      </div>

      {/* Price Breakdown */}
      {amount && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">공급가액</span>
            <span className="font-medium">{supplyPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">부가세 (10%)</span>
            <span className="font-medium">{vat.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t">
            <span>총 결제 금액</span>
            <span className="text-blue-600">{totalPrice.toLocaleString()}원</span>
          </div>
        </div>
      )}

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          결제 방법
        </label>
        <div className="space-y-3">
          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="stripe"
              checked={paymentMethod === 'stripe'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">신용카드</div>
              <div className="text-xs text-gray-500">즉시 충전</div>
            </div>
          </label>

          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="bank_transfer"
              checked={paymentMethod === 'bank_transfer'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">계좌이체</div>
              <div className="text-xs text-gray-500">입금 확인 후 충전 (영업일 기준 1-2일)</div>
            </div>
          </label>
        </div>
      </div>

      {/* Card Element */}
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

      {/* Bank Transfer Info */}
      {paymentMethod === 'bank_transfer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">입금 계좌 안내</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>은행: 신한은행</p>
            <p>계좌번호: 110-123-456789</p>
            <p>예금주: (주)CNEC</p>
            <p className="text-xs text-blue-600 mt-2">
              * 입금자명을 회사명으로 입력해주세요
            </p>
          </div>

          <label className="flex items-center mt-4">
            <input
              type="checkbox"
              checked={needsTaxInvoice}
              onChange={(e) => setNeedsTaxInvoice(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">세금계산서 발행 요청</span>
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={processing || !amount}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? '처리 중...' : paymentMethod === 'stripe' ? '충전하기' : '신청하기'}
      </button>
    </form>
  )
}

export default function PointsChargePage() {
  const navigate = useNavigate()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      // Get balance
      const { data: balanceData } = await supabaseBiz
        .from('points_balance')
        .select('*')
        .eq('company_id', user.id)
        .single()

      setBalance(balanceData?.balance || 0)

      // Get recent transactions
      const { data: txData } = await supabaseBiz
        .from('points_transactions')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setTransactions(txData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/company/dashboard')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 대시보드로 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">포인트 충전</h1>
          <p className="text-gray-600 mt-2">포인트를 충전하여 캠페인을 생성하세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charge Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">충전하기</h2>
              <Elements stripe={stripePromise}>
                <ChargeForm onSuccess={handleSuccess} />
              </Elements>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Balance */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-2">현재 포인트</div>
              <div className="text-4xl font-bold">{balance.toLocaleString()}</div>
              <div className="text-sm opacity-75 mt-1">P</div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">최근 내역</h3>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">내역이 없습니다</p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-start text-sm">
                      <div>
                        <div className="font-medium">
                          {tx.type === 'charge' && '충전'}
                          {tx.type === 'spend' && '사용'}
                          {tx.type === 'grant' && '지급'}
                          {tx.type === 'refund' && '환불'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <div className={`font-medium ${tx.type === 'spend' ? 'text-red-600' : 'text-blue-600'}`}>
                        {tx.type === 'spend' ? '-' : '+'}{tx.amount.toLocaleString()}P
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <h4 className="font-medium text-gray-900 mb-2">안내사항</h4>
              <ul className="space-y-1 text-xs">
                <li>• 1포인트 = 1원</li>
                <li>• 최소 충전 금액: 10,000원</li>
                <li>• 포인트 유효기간: 충전일로부터 5년</li>
                <li>• 환불 시 수수료 10% 차감</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

