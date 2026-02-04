import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import CompanyNavigation from './CompanyNavigation'

const CampaignConfirmation = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')
  const region = searchParams.get('region') || 'korea'

  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (campaignId) {
      loadCampaignData()
    }
  }, [campaignId])

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (err) {
      console.error('캠페인 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  }

  const formatPrice = (price) => {
    if (!price) return '-'
    return Number(price).toLocaleString() + '원'
  }

  const getCampaignTypeName = (type) => {
    const types = {
      standard: '스탠다드',
      premium: '프리미엄',
      basic: '베이직'
    }
    return types[type] || type || '-'
  }

  const getChannelName = (channel) => {
    const channels = {
      instagram: '인스타그램',
      youtube: '유튜브',
      tiktok: '틱톡'
    }
    return channels[channel] || channel || '-'
  }

  const getMissionLabels = (missions) => {
    if (!missions) return '-'
    const missionMap = {
      beforeAfter: 'Before & After',
      productCloseup: '제품 클로즈업',
      productTexture: '제품 텍스처',
      storeVisit: '매장 방문 인증',
      weeklyReview: '7일 사용 후기',
      priceInfo: '가격/혜택 정보',
      purchaseLink: '구매 링크 유도'
    }
    const activeMissions = Object.entries(missions)
      .filter(([_, value]) => value)
      .map(([key]) => missionMap[key] || key)
    return activeMissions.length > 0 ? activeMissions.join(', ') : '-'
  }

  const handleConfirm = async () => {
    if (!confirmed) return
    setProcessing(true)
    navigate(`/company/campaigns/payment?id=${campaignId}&region=${region}`)
  }

  if (loading) {
    return (
      <>
        <CompanyNavigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-14 lg:pt-0">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </>
    )
  }

  const guideData = campaign?.ai_generated_guide || {}

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gray-50 pt-14 pb-32 lg:pt-8 lg:pb-32">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* 스텝 인디케이터 */}
          <div className="flex items-center justify-between mb-6 lg:mb-8 overflow-x-auto pb-2">
            {[
              { step: 1, label: '캠페인 선택', completed: true },
              { step: 2, label: '상품 정보', completed: true },
              { step: 3, label: '스케줄', completed: true },
              { step: 4, label: '가이드', completed: true },
              { step: 5, label: '확인', current: true }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    item.current
                      ? 'bg-purple-100 text-purple-600 border-2 border-purple-600'
                      : item.completed
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {item.completed && !item.current ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      item.step
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${item.current ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`w-8 md:w-24 h-0.5 mx-1 md:mx-2 flex-shrink-0 ${item.completed ? 'bg-purple-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* 헤더 */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">최종 확인</h1>
            <p className="text-gray-600 mt-1">입력하신 내용을 확인하고 캠페인을 등록하세요</p>
          </div>

          {/* 캠페인 요약 */}
          <Card className="mb-4 lg:mb-6 shadow-sm">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg lg:text-xl">📋</span>
                  <h2 className="text-base lg:text-lg font-semibold">캠페인 요약</h2>
                </div>
                <button
                  onClick={() => navigate(`/company/campaigns/wizard?id=${campaignId}`)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  수정
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 gap-1">
                  <span className="text-gray-600 text-sm">캠페인 타입</span>
                  <span className="text-gray-900 font-medium text-sm">
                    기획형 캠페인 · {getCampaignTypeName(campaign?.campaign_type)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 gap-1">
                  <span className="text-gray-600 text-sm">브랜드 / 제품</span>
                  <span className="text-gray-900 text-sm">
                    {campaign?.brand || '-'} · {campaign?.product_name || '-'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 gap-1">
                  <span className="text-gray-600 text-sm">모집 채널</span>
                  <span className="text-gray-900 text-sm">{getChannelName(campaign?.platform)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-2 gap-1">
                  <span className="text-gray-600 text-sm">예상 비용</span>
                  <span className="text-gray-900 font-semibold text-base lg:text-lg">
                    {formatPrice(campaign?.budget || campaign?.estimated_cost)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 스케줄 */}
          <Card className="mb-4 lg:mb-6 shadow-sm">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-lg lg:text-xl">📅</span>
                  <h2 className="text-base lg:text-lg font-semibold">스케줄</h2>
                </div>
                <button
                  onClick={() => navigate(`/company/campaigns/wizard?id=${campaignId}&step=schedule`)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  수정
                </button>
              </div>

              {/* 타임라인 */}
              <div className="relative">
                <div className="flex justify-between items-center">
                  {[
                    { date: campaign?.shipping_date || campaign?.start_date, label: '발송일' },
                    { date: campaign?.recruitment_deadline, label: '모집마감' },
                    { date: campaign?.shooting_deadline, label: '촬영마감' },
                    { date: campaign?.upload_deadline || campaign?.end_date, label: '업로드' }
                  ].map((item, index) => (
                    <div key={index} className="flex flex-col items-center z-10">
                      <span className="text-sm text-gray-700 mb-2">{formatDate(item.date)}</span>
                      <div className="w-3 h-3 bg-purple-600 rounded-full" />
                      <span className="text-xs text-gray-500 mt-2">{item.label}</span>
                    </div>
                  ))}
                </div>
                {/* 연결선 */}
                <div className="absolute top-[2.1rem] left-[8%] right-[8%] h-0.5 bg-purple-600" />
              </div>
            </CardContent>
          </Card>

          {/* 크리에이터 가이드 요약 */}
          <Card className="mb-4 lg:mb-6 shadow-sm">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg lg:text-xl">🎯</span>
                  <h2 className="text-base lg:text-lg font-semibold">크리에이터 가이드 요약</h2>
                </div>
                <button
                  onClick={() => navigate(`/company/campaigns/guide?id=${campaignId}`)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  수정
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100 gap-1">
                  <span className="text-gray-600 w-28 flex-shrink-0 flex items-center gap-1 text-sm">
                    <span>⚡</span> 1초 후킹
                  </span>
                  <span className="text-gray-900 text-sm">"{guideData.hookingPoint || '-'}"</span>
                </div>
                <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100 gap-1">
                  <span className="text-gray-600 w-28 flex-shrink-0 flex items-center gap-1 text-sm">
                    <span>💬</span> 핵심 메시지
                  </span>
                  <span className="text-gray-900 text-sm">{guideData.coreMessage || '-'}</span>
                </div>
                <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100 gap-1">
                  <span className="text-gray-600 w-28 flex-shrink-0 flex items-center gap-1 text-sm">
                    <span>🎬</span> 필수 미션
                  </span>
                  <span className="text-gray-900 text-sm">{getMissionLabels(guideData.missions)}</span>
                </div>
                <div className="flex flex-col sm:flex-row py-2 gap-1">
                  <span className="text-gray-600 w-28 flex-shrink-0 flex items-center gap-1 text-sm">
                    <span>#</span> 해시태그
                  </span>
                  <span className="text-gray-900 text-sm">
                    {guideData.hashtags?.length > 0 ? guideData.hashtags.join(' ') : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 확인 체크박스 */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setConfirmed(!confirmed)}
            >
              <Checkbox
                checked={confirmed}
                onCheckedChange={setConfirmed}
                className="border-purple-300 data-[state=checked]:bg-purple-600"
              />
              <span className="text-purple-800 font-medium">
                입력한 내용이 정확함을 확인했습니다
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-3 lg:py-3">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              이전 단계
            </Button>

            <Button
              onClick={handleConfirm}
              disabled={!confirmed || processing}
              className="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300"
            >
              {processing ? '처리 중...' : '결제하기'}
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CampaignConfirmation
