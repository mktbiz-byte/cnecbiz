import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Coins, CreditCard, History } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { loadStripe } from '@stripe/stripe-js'

// Stripe는 현재 사용하지 않음 (무통장 입금만 사용)
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : Promise.resolve(null)

export default function PointsManagement() {
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [currentPoints, setCurrentPoints] = useState(0)
  const [chargeHistory, setChargeHistory] = useState([])
  const [selectedAmount, setSelectedAmount] = useState(100000)
  const [loading, setLoading] = useState(false)

  const pointPackages = [
    { points: 50000, price: 50000, bonus: 0 },
    { points: 100000, price: 100000, bonus: 5000 },
    { points: 300000, price: 300000, bonus: 20000 },
    { points: 500000, price: 500000, bonus: 50000 },
    { points: 1000000, price: 1000000, bonus: 150000 }
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
      setCurrentPoints(companyData.points_balance || 0)
      fetchChargeHistory(companyData.id)
    }
  }

  const fetchChargeHistory = async (companyId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('points_charge_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setChargeHistory(data)
      }
    } catch (error) {
      console.error('Error fetching charge history:', error)
    }
  }

  const handleCharge = async (amount, points) => {
    setLoading(true)
    try {
      // Create charge request
      const { data: chargeData, error: chargeError } = await supabaseBiz
        .from('points_charge_requests')
        .insert({
          company_id: company.id,
          points: points,
          amount: amount,
          status: 'pending'
        })
        .select()
        .single()

      if (chargeError) throw chargeError

      // Create Stripe payment
      const stripe = await stripePromise
      if (!stripe) {
        alert('결제 시스템을 불러올 수 없습니다')
        return
      }

      // Here you would create a Stripe Checkout session
      // For now, we'll just show a success message
      alert(`${points.toLocaleString()}P 충전 요청이 완료되었습니다!\n관리자 승인 후 포인트가 지급됩니다.`)
      
      fetchChargeHistory(company.id)
    } catch (error) {
      console.error('Error charging points:', error)
      alert('충전 요청 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700'
    }
    const labels = {
      pending: '대기중',
      approved: '승인',
      rejected: '거부',
      completed: '완료'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Coins className="w-8 h-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">포인트 관리</h1>
        </div>

        {/* Current Balance */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">보유 포인트</div>
              <div className="text-5xl font-bold text-blue-600 mb-4">
                {currentPoints.toLocaleString()}P
              </div>
              <p className="text-sm text-gray-500">
                1P = 1원으로 캠페인 비용 결제에 사용됩니다
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Point Packages */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              포인트 충전
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {pointPackages.map((pkg) => (
                <div
                  key={pkg.points}
                  className={`p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                    selectedAmount === pkg.price
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedAmount(pkg.price)}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {pkg.points.toLocaleString()}P
                    </div>
                    {pkg.bonus > 0 && (
                      <div className="text-xs text-green-600 font-medium mb-2">
                        +{pkg.bonus.toLocaleString()}P 보너스
                      </div>
                    )}
                    <div className="text-lg font-bold text-gray-900">
                      {pkg.price.toLocaleString()}원
                    </div>
                    {pkg.bonus > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        실제: {(pkg.points + pkg.bonus).toLocaleString()}P
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                onClick={() => {
                  const pkg = pointPackages.find(p => p.price === selectedAmount)
                  if (pkg) {
                    handleCharge(pkg.price, pkg.points + pkg.bonus)
                  }
                }}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 px-12"
              >
                {loading ? '처리 중...' : '충전하기'}
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 결제는 신용카드로만 가능합니다</li>
                <li>• 충전 후 관리자 승인이 필요합니다 (영업일 기준 1일 이내)</li>
                <li>• 포인트는 환불이 불가능합니다</li>
                <li>• 세금계산서 발급이 필요한 경우 고객센터로 문의해주세요</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Charge History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              충전 내역
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chargeHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                충전 내역이 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">날짜</th>
                      <th className="text-left p-4">포인트</th>
                      <th className="text-left p-4">금액</th>
                      <th className="text-left p-4">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargeHistory.map((charge) => (
                      <tr key={charge.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-sm">
                          {new Date(charge.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-4 font-bold text-blue-600">
                          +{charge.points?.toLocaleString()}P
                        </td>
                        <td className="p-4 font-medium">
                          {charge.amount?.toLocaleString()}원
                        </td>
                        <td className="p-4">{getStatusBadge(charge.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

