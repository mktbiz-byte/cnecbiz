import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Loader2, Package, Users, Truck, Video, CheckCircle,
  Upload, ExternalLink, ArrowLeft
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import PackageProgressTracker from './PackageProgressTracker'
import PackageCreatorSelector from './PackageCreatorSelector'
import PackageVideoReview from './PackageVideoReview'

export default function CompanyPackageCampaign() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [trackingInputs, setTrackingInputs] = useState({})

  useEffect(() => {
    document.title = '패키지 캠페인 | CNEC'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    checkAuthAndLoad()
    return () => { document.head.removeChild(meta) }
  }, [campaignId])

  const checkAuthAndLoad = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      await loadData()
    } catch (error) {
      console.error('Auth error:', error)
      navigate('/login')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/.netlify/functions/get-package-campaign?campaign_id=${campaignId}`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setData(result.data)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      alert(`데이터 로드 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const callStatusUpdate = async (action, payload) => {
    const res = await fetch('/.netlify/functions/update-package-creator-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, campaign_id: campaignId, ...payload })
    })
    const result = await res.json()
    if (!result.success) throw new Error(result.error)
    return result.data
  }

  // Step 1: Select creators
  const handleSelectCreators = async (creatorIds) => {
    setActionLoading(true)
    try {
      await callStatusUpdate('select_creators', {
        package_creator_ids: creatorIds,
        application_id: data.application?.id
      })
      await loadData()
    } catch (error) {
      alert(`선택 실패: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Step 2: Ship product
  const handleShipProduct = async (creatorCampaignId) => {
    const trackingNumber = trackingInputs[creatorCampaignId] || ''
    setActionLoading(true)
    try {
      await callStatusUpdate('ship_product', {
        creator_campaign_id: creatorCampaignId,
        tracking_number: trackingNumber
      })
      await loadData()
    } catch (error) {
      alert(`발송 처리 실패: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Step 4: Approve video
  const handleApproveVideo = async (creatorCampaignId, videoUrl) => {
    try {
      await callStatusUpdate('approve_video', {
        creator_campaign_id: creatorCampaignId,
        final_video_url: videoUrl
      })
      await loadData()
    } catch (error) {
      alert(`승인 실패: ${error.message}`)
    }
  }

  // Step 4: Request revision
  const handleRequestRevision = async (creatorCampaignId, message) => {
    try {
      await callStatusUpdate('request_revision', {
        creator_campaign_id: creatorCampaignId,
        request_message: message
      })
      await loadData()
    } catch (error) {
      alert(`수정 요청 실패: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C084FC]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#A0A0B0]">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">캠페인을 찾을 수 없습니다.</p>
          <Button
            onClick={() => navigate('/company/dashboard')}
            variant="outline"
            className="mt-4 border-white/10 text-[#A0A0B0]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> 대시보드로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const { application, settings, creators, campaignCreators, currentStep, stepCounts } = data
  const selectedCreatorIds = campaignCreators.map(cc => cc.package_creator_id)
  const hasSelectedCreators = campaignCreators.length > 0

  const getCreatorInfo = (packageCreatorId) => {
    return creators.find(c => c.id === packageCreatorId) || {}
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/company/dashboard')} className="text-[#A0A0B0] hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {application?.brand_name || '패키지 캠페인'}
              </h1>
              <p className="text-xs text-[#636E72]">{application?.month} 특가 패키지</p>
            </div>
          </div>
          <Badge className="bg-[#C084FC]/20 text-[#C084FC]">
            {application?.company_name}
          </Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Progress Tracker */}
        <div className="mb-8">
          <PackageProgressTracker currentStep={currentStep} stepCounts={stepCounts} />
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Step 1: Creator Selection */}
            {(!hasSelectedCreators || currentStep === 1) && !hasSelectedCreators && (
              <PackageCreatorSelector
                creators={creators}
                selectedIds={selectedCreatorIds}
                maxSelection={settings?.total_creators || 20}
                onConfirm={handleSelectCreators}
                disabled={hasSelectedCreators}
                loading={actionLoading}
              />
            )}

            {/* Step 2: Shipping */}
            {hasSelectedCreators && currentStep <= 2 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">제품 발송</h3>
                <p className="text-sm text-[#A0A0B0] mb-6">
                  각 크리에이터에게 제품을 발송하고 송장번호를 입력해주세요.
                </p>
                <div className="space-y-3">
                  {campaignCreators.map((cc) => {
                    const creator = getCreatorInfo(cc.package_creator_id)
                    const canShip = cc.status === 'selected'
                    const isShipped = ['product_shipping', 'product_delivered', 'filming', 'video_submitted', 'revision_requested', 'approved', 'uploaded'].includes(cc.status)

                    return (
                      <div key={cc.id} className="bg-[#1A1A2E] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium text-sm">
                            {creator.display_name || creator.creator_name || '크리에이터'}
                          </span>
                          {creator.category && (
                            <span className="text-xs text-[#636E72] ml-2">{creator.category}</span>
                          )}
                        </div>
                        {canShip ? (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="송장번호"
                              value={trackingInputs[cc.id] || ''}
                              onChange={(e) => setTrackingInputs({ ...trackingInputs, [cc.id]: e.target.value })}
                              className="w-48 bg-white/5 border-white/10 text-white text-sm placeholder:text-[#636E72]"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleShipProduct(cc.id)}
                              disabled={actionLoading}
                              className="bg-[#C084FC] hover:bg-[#A855F7]"
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" /> 발송
                            </Button>
                          </div>
                        ) : isShipped ? (
                          <div className="flex items-center gap-2">
                            {cc.tracking_number && (
                              <span className="text-xs text-[#636E72]">송장: {cc.tracking_number}</span>
                            )}
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" /> 발송완료
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Filming Status */}
            {hasSelectedCreators && currentStep === 3 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">촬영 진행 현황</h3>
                <p className="text-sm text-[#A0A0B0] mb-6">
                  크리에이터가 촬영을 진행 중입니다. 영상이 제출되면 알림을 드립니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {campaignCreators.map((cc) => {
                    const creator = getCreatorInfo(cc.package_creator_id)
                    const statusColors = {
                      selected: 'border-gray-500/20',
                      product_shipping: 'border-blue-500/30',
                      product_delivered: 'border-blue-500/30',
                      filming: 'border-yellow-500/30',
                      video_submitted: 'border-green-500/30',
                      revision_requested: 'border-orange-500/30',
                      approved: 'border-green-500/30',
                      uploaded: 'border-[#C084FC]/30',
                    }
                    const statusLabels = {
                      selected: '대기',
                      product_shipping: '배송중',
                      product_delivered: '배송완료',
                      filming: '촬영중',
                      video_submitted: '영상 제출됨',
                      revision_requested: '수정 요청',
                      approved: '승인됨',
                      uploaded: '업로드 완료',
                    }

                    return (
                      <div key={cc.id} className={`bg-[#1A1A2E] border ${statusColors[cc.status] || 'border-white/5'} rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">
                            {creator.display_name || creator.creator_name || '크리에이터'}
                          </span>
                          <Badge className="text-xs bg-white/10 text-[#A0A0B0]">
                            {statusLabels[cc.status] || cc.status}
                          </Badge>
                        </div>
                        {creator.category && (
                          <span className="text-xs text-[#636E72]">{creator.category}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Video Review */}
            {hasSelectedCreators && currentStep === 4 && (
              <PackageVideoReview
                campaignCreators={campaignCreators}
                creators={creators}
                onApprove={handleApproveVideo}
                onRequestRevision={handleRequestRevision}
                loading={actionLoading}
              />
            )}

            {/* Step 5: Upload Status */}
            {hasSelectedCreators && currentStep === 5 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">업로드 현황</h3>
                <p className="text-sm text-[#A0A0B0] mb-6">
                  승인된 영상들의 유튜브 업로드 상태를 확인하세요.
                </p>
                <div className="space-y-3">
                  {campaignCreators.map((cc) => {
                    const creator = getCreatorInfo(cc.package_creator_id)
                    return (
                      <div key={cc.id} className="bg-[#1A1A2E] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium text-sm">
                            {creator.display_name || creator.creator_name || '크리에이터'}
                          </span>
                        </div>
                        {cc.status === 'uploaded' && cc.upload_url ? (
                          <a
                            href={cc.upload_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#C084FC] text-sm hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> 영상 보기
                          </a>
                        ) : cc.status === 'approved' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                            업로드 대기
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> 업로드 완료
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              <Card className="bg-[#1A1A2E] border-white/5 rounded-2xl">
                <CardContent className="p-5">
                  <h4 className="text-white font-semibold mb-4">진행 현황</h4>
                  <div className="space-y-3">
                    {[
                      { label: '선택됨', count: stepCounts.selected, icon: Users },
                      { label: '발송됨', count: stepCounts.shipped, icon: Truck },
                      { label: '영상 제출', count: stepCounts.videoSubmitted, icon: Video },
                      { label: '승인됨', count: stepCounts.approved, icon: CheckCircle },
                      { label: '업로드', count: stepCounts.uploaded, icon: Upload },
                    ].map(({ label, count, icon: Icon }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-[#A0A0B0]">
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </div>
                        <span className="text-white font-semibold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {count || 0}/{stepCounts.total || 20}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A2E] border-white/5 rounded-2xl">
                <CardContent className="p-5">
                  <h4 className="text-white font-semibold mb-2">도움이 필요하신가요?</h4>
                  <p className="text-xs text-[#636E72] mb-3">
                    크리에이터 교체, 일정 조율 등은 담당 매니저에게 문의해주세요.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-white/10 text-[#A0A0B0] hover:text-white"
                    onClick={() => window.open('mailto:support@cnecbiz.com')}
                  >
                    매니저에게 문의
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
