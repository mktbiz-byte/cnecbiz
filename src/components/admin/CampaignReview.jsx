import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Loader2, CheckCircle, XCircle, ArrowLeft, AlertCircle } from 'lucide-react'

export default function CampaignReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'
  const supabase = region === 'japan' ? getSupabaseClient('japan') : supabaseBiz
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [guide, setGuide] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    loadCampaignAndGuide()
  }, [id])

  const loadCampaignAndGuide = async () => {
    setLoading(true)
    try {
      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // Load guide
      const { data: guideData, error: guideError } = await supabase
        .from('campaign_guides')
        .select('*')
        .eq('campaign_id', id)
        .single()

      if (guideError && guideError.code !== 'PGRST116') {
        console.error('Error loading guide:', guideError)
      }
      setGuide(guideData)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!confirm('이 캠페인을 승인하시겠습니까?')) return

    setProcessing(true)
    try {
      // Update campaign status in Biz DB
      const { error: bizError } = await supabaseBiz
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', id)

      if (bizError) throw bizError

      // Update campaign status in regional DB (JP or US)
      const regionalClient = getSupabaseClient(campaign.region)
      const { error: regionalError } = await regionalClient
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', id)

      if (regionalError) {
        console.error('Regional DB update error:', regionalError)
        // Continue even if regional update fails
      }

      // Record approval
      await supabaseBiz.from('campaign_approvals').insert({
        campaign_id: id,
        action: 'approved',
        reason: null,
        approved_by: (await supabaseBiz.auth.getUser()).data.user?.id
      })

      // 알림톡은 update-campaign-status.js에서 발송하므로 여기서는 발송하지 않음

      alert('캠페인이 승인되었습니다!')
      navigate('/admin/campaign-approvals')
    } catch (error) {
      console.error('Error approving campaign:', error)
      alert('승인 처리 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('거부 사유를 입력해주세요.')
      return
    }

    setProcessing(true)
    try {
      // Update campaign status in Biz DB
      const { error: bizError } = await supabaseBiz
        .from('campaigns')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (bizError) throw bizError

      // Update campaign status in regional DB
      const regionalClient = getSupabaseClient(campaign.region)
      const { error: regionalError } = await regionalClient
        .from('campaigns')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (regionalError) {
        console.error('Regional DB update error:', regionalError)
      }

      // Record rejection
      await supabaseBiz.from('campaign_approvals').insert({
        campaign_id: id,
        action: 'rejected',
        reason: rejectionReason,
        approved_by: (await supabaseBiz.auth.getUser()).data.user?.id
      })

      alert('캠페인이 거부되었습니다.')
      navigate('/admin/campaign-approvals')
    } catch (error) {
      console.error('Error rejecting campaign:', error)
      alert('거부 처리 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setProcessing(false)
      setShowRejectModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">캠페인을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const sceneLabels = {
    unboxing: '제품 언박싱',
    closeup: '제품 클로즈업',
    before_after: '사용 전/후 비교',
    texture: '제품 텍스처',
    usage_process: '제품 사용 과정',
    packaging: '제품 패키징 소개',
    brand_logo: '브랜드 로고 노출',
    other: '기타'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/admin/campaign-approvals')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
          <h1 className="text-3xl font-bold mb-2">캠페인 상세 검토</h1>
          <p className="text-gray-600">캠페인 정보와 가이드를 확인하고 승인/거부를 결정하세요.</p>
        </div>

        {/* Campaign Info */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">{campaign.title}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">브랜드:</span>
              <span className="ml-2 font-medium">{campaign.brand}</span>
            </div>
            <div>
              <span className="text-gray-500">지역:</span>
              <span className="ml-2 font-medium">
                {campaign.region === 'japan' ? '🇯🇵 일본' : campaign.region === 'us' ? '🇺🇸 미국' : campaign.region}
              </span>
            </div>
            <div>
              <span className="text-gray-500">보상 금액:</span>
              <span className="ml-2 font-medium">
                {campaign.region === 'japan' ? '¥' : campaign.region === 'us' ? '$' : '₩'}
                {campaign.reward_amount?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">최대 참가자:</span>
              <span className="ml-2 font-medium">{campaign.max_participants}명</span>
            </div>
            <div>
              <span className="text-gray-500">모집 마감:</span>
              <span className="ml-2 font-medium">
                {new Date(campaign.application_deadline).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div>
              <span className="text-gray-500">캠페인 기간:</span>
              <span className="ml-2 font-medium">
                {new Date(campaign.start_date).toLocaleDateString('ko-KR')} ~ {new Date(campaign.end_date).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">캠페인 설명</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{campaign.description}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">참가 요구사항</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{campaign.requirements}</p>
          </div>
        </div>

        {/* Campaign Guide */}
        {guide ? (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">📋 캠페인 가이드</h2>

            {guide.product_info && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">제품 정보</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">{guide.product_info}</p>
              </div>
            )}

            {guide.usage_notes && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">제품 사용 시 참고사항</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">{guide.usage_notes}</p>
              </div>
            )}

            {guide.reference_urls && guide.reference_urls.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">참고 레퍼런스</h3>
                <ul className="space-y-2">
                  {guide.reference_urls.map((url, index) => (
                    <li key={index}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guide.required_dialogue && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">필수 대사</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">{guide.required_dialogue}</p>
              </div>
            )}

            {guide.required_scenes && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">필수 촬영 장면</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(guide.required_scenes).map(([key, value]) => 
                    value && (
                      <span key={key} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {sceneLabels[key] || key}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {guide.custom_scenes && (
              <div>
                <h3 className="font-semibold mb-2">기타 촬영 장면</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">{guide.custom_scenes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">가이드가 작성되지 않았습니다.</p>
            </div>
          </div>
        )}

        {/* Approval Actions */}
        {campaign.status === 'pending_approval' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">승인 처리</h2>
            <div className="flex gap-4">
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    승인
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                거부
              </Button>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">캠페인 거부</h3>
              <p className="text-gray-600 mb-4">거부 사유를 입력해주세요:</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="예: 제품 정보가 불충분합니다. 추가 정보를 제공해주세요."
                className="w-full h-32 p-3 border rounded-lg resize-none mb-4"
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowRejectModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '거부 확정'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

