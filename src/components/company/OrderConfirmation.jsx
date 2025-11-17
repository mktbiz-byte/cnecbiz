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
  const [pointsBalance, setPointsBalance] = useState(0)
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

      // 2. 포인트 잔액 로드 - CNEC Korea DB 먼저, 없으면 Biz DB에서 조회
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (user) {
        let { data: companyData } = await supabaseKorea
          .from('companies')
          .select('points_balance')
          .eq('user_id', user.id)
          .maybeSingle()

        // Korea DB에 없으면 Biz DB에서 조회 (fallback)
        if (!companyData) {
          const result = await supabaseBiz
            .from('companies')
            .select('points_balance')
            .eq('user_id', user.id)
            .maybeSingle()
          companyData = result.data
        }

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
    
    // 포인트는 부가세 제외 금액으로 계산
    const packagePrice = packagePrices[campaign.package_type] || 200000
    const recruitmentCount = campaign.recruitment_count || campaign.total_slots || 0
    const subtotal = packagePrice * recruitmentCount
    let discountRate = 0
    if (subtotal >= 10000000) {
      discountRate = 0.05
    }
    const discountAmount = Math.floor(subtotal * discountRate)
    const afterDiscount = subtotal - discountAmount
    
    const shortfall = afterDiscount - pointsBalance
    if (shortfall > 0) {
      alert(`포인트가 ${shortfall.toLocaleString()}원 부족합니다. 추가금 결제를 진행해주세요.`)
      return
    }

    if (!confirm(`${afterDiscount.toLocaleString()}원을 포인트로 결제하시겠습니까?`)) {
      return
    }

    setProcessing(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. 회사 정보 가져오기 - Korea DB 먼저, 없으면 Biz DB
      let { data: companyData, error: companyError } = await supabaseKorea
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // Korea DB에 없으면 Biz DB에서 조회 (fallback)
      if (!companyData && !companyError) {
        const result = await supabaseBiz
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        companyData = result.data
        companyError = result.error
      }

      console.log('[OrderConfirmation] Company query result:', { companyData, companyError, userId: user.id })

      if (companyError) throw new Error(`회사 정보 조회 실패: ${companyError.message}`)
      if (!companyData) throw new Error('회사 정보를 찾을 수 없습니다. 회사 프로필을 먼저 설정해주세요.')

      // 2. 포인트 차감 (부가세 제외 금액) - 회사가 있는 DB에 저장
      const newBalance = companyData.points_balance - afterDiscount
      
      // 회사가 Korea DB에 있는지 Biz DB에 있는지 확인
      const isInKoreaDB = await supabaseKorea
        .from('companies')
        .select('id')
        .eq('id', companyData.id)
        .maybeSingle()
      
      const companyDB = isInKoreaDB.data ? supabaseKorea : supabaseBiz
      
      const { error: updateError } = await companyDB
        .from('companies')
        .update({ points_balance: newBalance })
        .eq('id', companyData.id)

      if (updateError) throw updateError

      // 3. 포인트 거래 기록
      const { error: transactionError } = await companyDB
        .from('points_transactions')
        .insert([{
          company_id: companyData.id,
          campaign_id: id,
          amount: -afterDiscount,
          type: 'campaign_payment',
          description: `캠페인 결제: ${campaign.title}`,
          balance_after: newBalance
        }])

      if (transactionError) throw transactionError

      // 4. 캠페인 상태 업데이트 (Biz DB 먼저 시도)
      let campaignUpdated = false
      const { error: bizCampaignError } = await supabaseBiz
        .from('campaigns')
        .update({ 
          approval_status: 'pending',
          payment_status: 'confirmed'
        })
        .eq('id', id)

      if (!bizCampaignError) {
        campaignUpdated = true
      }

      // Biz DB에 없으면 Korea DB 시도
      if (!campaignUpdated) {
        const { error: koreaCampaignError } = await supabaseKorea
          .from('campaigns')
          .update({ 
            approval_status: 'pending',
            payment_status: 'confirmed'
          })
          .eq('id', id)

        if (koreaCampaignError) throw koreaCampaignError
      }

      // 5. 네이버 웍스 알림 전송
      try {
        const campaignTypeText = 
          campaign.campaign_type === 'oliveyoung' ? '올영세일' :
          campaign.campaign_type === '4week' ? '4주 챌린지' :
          '기획형'
        
        const message = `🔔 새로운 캠페인 승인 요청\n\n` +
          `캠페인명: ${campaign.title}\n` +
          `기업명: ${companyData.company_name}\n` +
          `캠페인 타입: ${campaignTypeText}\n` +
          `결제 금액: ${afterDiscount.toLocaleString()}원 (포인트)\n` +
          `신청 시간: ${new Date().toLocaleString('ko-KR')}\n\n` +
          `승인 페이지: https://cnectotal.netlify.app/admin/approvals`
        
        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            isAdminNotification: true
          })
        })
      } catch (notifError) {
        console.error('네이버 웍스 알림 전송 실패:', notifError)
        // 알림 실패해도 결제는 성공으로 처리
      }

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
    if (region === 'japan') {
      navigate(`/company/campaigns/${id}/invoice?region=japan`)
    } else {
      navigate(`/company/campaigns/${id}/invoice`)
    }
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
  
  // 포인트는 부가세 제외 금액으로 계산
  const shortfall = Math.max(0, afterDiscount - pointsBalance)
  const canPayWithPoints = shortfall === 0
  
  // 추가금 결제는 부가세 포함 금액
  const totalShortfall = Math.max(0, totalCost - pointsBalance)

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
          } else if (campaign?.campaign_type === '4week') {
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
                      {totalShortfall > 0 
                        ? `${totalShortfall.toLocaleString()}원 입금` 
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
    </>
  )
}

export default OrderConfirmation

