import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ArrowLeft, CreditCard, Wallet, AlertCircle } from 'lucide-react'

const OrderConfirmation = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pointsBalance, setPointsBalance] = useState(0)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      // 1. 캠페인 정보 로드
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // 2. 포인트 잔액 로드
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (user) {
        const { data: companyData } = await supabaseBiz
          .from('companies')
          .select('points_balance')
          .eq('user_id', user.id)
          .single()

        if (companyData) {
          setPointsBalance(companyData.points_balance || 0)
        }
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handlePayWithPoints = async () => {
    if (processing) return
    
    const shortfall = totalCost - pointsBalance
    if (shortfall > 0) {
      alert(`포인트가 ${shortfall.toLocaleString()}원 부족합니다. 추가금 결제를 진행해주세요.`)
      return
    }

    if (!confirm(`${totalCost.toLocaleString()}원을 포인트로 결제하시겠습니까?`)) {
      return
    }

    setProcessing(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. 회사 정보 가져오기
      const { data: companyData } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!companyData) throw new Error('회사 정보를 찾을 수 없습니다')

      // 2. 포인트 차감
      const newBalance = companyData.points_balance - totalCost
      const { error: updateError } = await supabaseBiz
        .from('companies')
        .update({ points_balance: newBalance })
        .eq('id', companyData.id)

      if (updateError) throw updateError

      // 3. 포인트 거래 기록
      const { error: transactionError } = await supabaseBiz
        .from('points_transactions')
        .insert([{
          company_id: companyData.id,
          campaign_id: id,
          amount: -totalCost,
          type: 'campaign_payment',
          description: `캠페인 결제: ${campaign.title}`,
          balance_after: newBalance
        }])

      if (transactionError) throw transactionError

      // 4. 캠페인 상태 업데이트
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ 
          approval_status: 'pending',
          payment_status: 'confirmed'
        })
        .eq('id', id)

      if (campaignError) throw campaignError

      alert('포인트 결제가 완료되었습니다!')
      navigate(`/company/campaigns/${id}`)
    } catch (err) {
      console.error('결제 실패:', err)
      alert('결제에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handlePayAdditional = () => {
    // 견적서 페이지로 이동 (입금 계좌 정보 확인)
    navigate(`/company/campaigns/${id}/invoice`)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12 text-red-600">{error || '캠페인을 찾을 수 없습니다.'}</div>
      </div>
    )
  }

  const packagePrices = {
    'junior': 200000,
    'intermediate': 300000,
    'senior': 400000,
    '4week_challenge': 600000,
    'oliveyoung': 200000,
    '올영 20만원': 200000,
    'premium': 300000,
    '프리미엄 30만원': 300000,
    '4주챌린지 60만원': 600000
  }

  const packagePrice = packagePrices[campaign.package_type] || 200000
  const recruitmentCount = campaign.recruitment_count || campaign.total_slots || 0
  
  // 할인 계산
  let discountRate = 0
  if (recruitmentCount >= 20) {
    discountRate = 0.10 // 10% 할인
  } else if (recruitmentCount >= 10) {
    discountRate = 0.05 // 5% 할인
  }
  
  const subtotal = packagePrice * recruitmentCount
  const discountAmount = Math.floor(subtotal * discountRate)
  const totalCost = subtotal - discountAmount
  
  const shortfall = Math.max(0, totalCost - pointsBalance)
  const canPayWithPoints = shortfall === 0

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/company/campaigns/${id}/review`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        가이드 확인으로 돌아가기
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">주문서 확인</CardTitle>
            <Badge variant="secondary" className="text-sm">
              <CreditCard className="w-3 h-3 mr-1" />
              결제 대기
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            패키지 정보를 확인하고 결제 방법을 선택하세요
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 패키지 및 비용 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">패키지 및 비용</h3>
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">선택 패키지</span>
                <span className="font-semibold text-blue-600 text-lg">{campaign.package_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">패키지 단가</span>
                <span className="font-medium">{packagePrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">모집 인원</span>
                <span className="font-medium">{recruitmentCount}명</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">소계</span>
                <span className="font-medium">{subtotal.toLocaleString()}원</span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">할인 ({discountRate * 100}%)</span>
                  <span className="font-medium">-{discountAmount.toLocaleString()}원</span>
                </div>
              )}
              <div className="border-t border-blue-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold">예상 총 비용</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {totalCost.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 포인트 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">포인트 정보</h3>
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">현재 포인트 잔액</span>
                <span className="font-semibold text-lg">
                  {pointsBalance.toLocaleString()}P
                </span>
              </div>
              {shortfall > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="font-medium">부족한 포인트</span>
                  <span className="font-bold text-lg">
                    {shortfall.toLocaleString()}원
                  </span>
                </div>
              )}
              {canPayWithPoints && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">포인트로 결제 가능합니다!</span>
                </div>
              )}
            </div>
          </div>

          {/* 결제 방법 선택 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">결제 방법 선택</h3>
            <div className="space-y-3">
              {/* 포인트 차감 버튼 */}
              <Button
                onClick={handlePayWithPoints}
                disabled={!canPayWithPoints || processing}
                className="w-full h-auto py-4 flex items-center justify-between"
                variant={canPayWithPoints ? "default" : "outline"}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">포인트로 결제하기</div>
                    <div className="text-xs opacity-80">
                      {canPayWithPoints 
                        ? `${totalCost.toLocaleString()}P 차감` 
                        : `포인트 ${shortfall.toLocaleString()}원 부족`}
                    </div>
                  </div>
                </div>
                {canPayWithPoints && (
                  <span className="text-sm">→</span>
                )}
              </Button>

              {/* 추가금 결제 버튼 */}
              <Button
                onClick={handlePayAdditional}
                disabled={processing}
                className="w-full h-auto py-4 flex items-center justify-between"
                variant="outline"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">
                      {shortfall > 0 ? '추가금 결제하기' : '계좌 입금하기'}
                    </div>
                    <div className="text-xs opacity-80">
                      {shortfall > 0 
                        ? `${shortfall.toLocaleString()}원 입금` 
                        : '견적서에서 입금 계좌 확인'}
                    </div>
                  </div>
                </div>
                <span className="text-sm">→</span>
              </Button>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">결제 안내</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>포인트가 충분하면 즉시 결제 가능합니다</li>
              <li>포인트가 부족하면 추가금 입금이 필요합니다</li>
              <li>입금 완료 후 승인 요청을 진행해주세요</li>
              <li>관리자 승인 후 캠페인이 시작됩니다</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderConfirmation

