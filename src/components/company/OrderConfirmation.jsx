import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ArrowLeft, CreditCard, Wallet, AlertCircle } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

const OrderConfirmation = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'

  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      console.log('[OrderConfirmation] Loading campaign:', id, 'region:', region)
      
      // 1. 캠페인 정보 로드 - region에 따라 올바른 DB 사용
      const regionClient = getSupabaseClient(region)
      let { data: campaignData, error: campaignError } = await regionClient
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      console.log(`[OrderConfirmation] ${region} DB result:`, { campaignData, campaignError })
      
      // region DB에 없으면 Biz DB 시도
      if (!campaignData && !campaignError) {
        const result = await supabaseBiz
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        
        campaignData = result.data
        campaignError = result.error
        console.log('[OrderConfirmation] Biz DB result:', { campaignData, campaignError })
      }
      
      if (campaignError) throw campaignError
      if (!campaignData) throw new Error('캠페인을 찾을 수 없습니다.')
      setCampaign(campaignData)

      // 포인트 시스템 제거됨 - 계좌 입금만 사용
    } catch (err) {
      console.error('데이터 로드 실패:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // handlePayWithPoints 함수 제거됨 - 포인트 결제 시스템 제거

  const handlePayAdditional = () => {
    // 견적서 페이지로 이동 (입금 계좌 정보 확인, region 파라미터 유지)
    navigate(`/company/campaigns/${id}/invoice?region=${region}`)
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
  
  const subtotal = packagePrice * recruitmentCount
  
  // 할인 계산 (1천만원 이상 5% 할인)
  let discountRate = 0
  if (subtotal >= 10000000) {
    discountRate = 0.05 // 1천만원 이상: 5% 할인
  }
  
  const discountAmount = Math.floor(subtotal * discountRate)
  const afterDiscount = subtotal - discountAmount
  const vat = Math.floor(afterDiscount * 0.1) // 부가세 10%
  const totalCost = afterDiscount + vat
  
  // 포인트 계산 제거됨 - 계좌 입금만 사용

  return (
    <>
      <CompanyNavigation />
      <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => {
          // 캠페인 타입에 따라 다른 페이지로 이동
          if (campaign?.campaign_type === 'oliveyoung') {
            navigate(`/company/campaigns/${id}/guide/oliveyoung/preview`)
          } else if (campaign?.campaign_type === '4week' || campaign?.campaign_type === '4week_challenge') {
            navigate(`/company/campaigns/guide/4week?id=${id}`)
          } else {
            navigate(`/company/campaigns/${id}/review`)
          }
        }}
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
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">할인 ({discountRate * 100}%)</span>
                  <span className="font-medium">-{discountAmount.toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between items-center text-gray-600 mt-2">
                <span className="font-medium">부가세 (10%)</span>
                <span className="font-medium">+{vat.toLocaleString()}원</span>
              </div>
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



          {/* 결제 방법 선택 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">결제 방법 선택</h3>
            <div className="space-y-3">
              {/* 계좌 입금 버튼 */}
              <Button
                onClick={handlePayAdditional}
                disabled={processing}
                className="w-full h-auto py-4 flex items-center justify-between"
                variant="default"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">계좌 입금하기</div>
                    <div className="text-xs opacity-80">
                      {totalCost.toLocaleString()}원 입금 (견적서에서 계좌 확인)
                    </div>
                  </div>
                </div>
                <span className="text-sm">→</span>
              </Button>

              {/* 카드 결제 버튼 (비활성화) */}
              <Button
                disabled={true}
                className="w-full h-auto py-4 flex items-center justify-between opacity-50 cursor-not-allowed"
                variant="outline"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">카드 결제</div>
                    <div className="text-xs opacity-80">
                      카드결제는 빠른 시일내에 진행 되도록 하겠습니다
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">결제 안내</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>계좌 입금하기를 클릭하여 견적서 페이지로 이동합니다</li>
              <li>견적서에서 입금 계좌 정보를 확인하고 입금해주세요</li>
              <li>입금자명을 입력하고 입금 요청을 완료해주세요</li>
              <li>입금 확인 후 자동으로 캠페인이 승인됩니다</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  )
}

export default OrderConfirmation

