import { useState, useEffect } from 'react'
import { X, Send, Mail, MessageSquare, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'

/**
 * 캠페인 초대장 발송 모달
 * - 추천 크리에이터에게 캠페인 초대장 발송
 * - 카카오톡 + 이메일 발송 지원
 */
export default function CampaignInvitationModal({
  isOpen,
  onClose,
  creator,
  companyId,
  companyEmail
}) {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null) // { success: boolean, message: string }
  const [sendOptions, setSendOptions] = useState({
    kakao: true,
    email: true
  })

  useEffect(() => {
    if (isOpen && companyEmail) {
      fetchCompanyCampaigns()
    }
  }, [isOpen, companyEmail])

  const fetchCompanyCampaigns = async () => {
    setLoading(true)
    try {
      const client = supabaseKorea || supabaseBiz

      // 기업이 만든 활성 캠페인만 조회
      const { data: campaignsData, error } = await client
        .from('campaigns')
        .select('id, title, campaign_type, status, deadline, reward_amount, package_type, main_image, thumbnail')
        .eq('company_email', companyEmail)
        .in('status', ['active', 'approved', 'recruiting'])
        .order('created_at', { ascending: false })

      if (error) throw error

      setCampaigns(campaignsData || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!selectedCampaign || !creator) return

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/.netlify/functions/send-creator-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          creatorId: creator.id,
          invitedBy: companyId,
          companyEmail: companyEmail,
          sendKakao: sendOptions.kakao,
          sendEmail: sendOptions.email
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          message: '초대장을 성공적으로 발송했습니다.'
        })
        // 3초 후 모달 닫기
        setTimeout(() => {
          onClose()
          setResult(null)
          setSelectedCampaign(null)
        }, 2000)
      } else {
        setResult({
          success: false,
          message: data.error || '초대장 발송에 실패했습니다.'
        })
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      setResult({
        success: false,
        message: '네트워크 오류가 발생했습니다.'
      })
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '상시 모집'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAmount = (amount) => {
    if (!amount) return '협의'
    return amount.toLocaleString() + '원'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨테이너 - 모바일 최적화 */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl transform transition-all max-h-[90vh] overflow-hidden">
          {/* 모바일 드래그 핸들 */}
          <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />

          {/* 헤더 */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">캠페인 초대장 발송</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {creator?.name || '크리에이터'}님에게 초대장을 보냅니다
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 본문 */}
          <div className="p-5 overflow-y-auto max-h-[60vh]">
            {/* 크리에이터 정보 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center overflow-hidden">
                {creator?.avatar ? (
                  <img
                    src={creator.avatar}
                    alt={creator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {creator?.name?.charAt(0) || 'C'}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{creator?.name || '이름 없음'}</p>
                {creator?.handle && (
                  <p className="text-sm text-gray-500">{creator.handle}</p>
                )}
                <p className="text-xs text-violet-600 mt-0.5">
                  팔로워 {creator?.followers?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            {/* 캠페인 선택 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                초대할 캠페인 선택 *
              </label>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">활성 캠페인이 없습니다</p>
                  <p className="text-sm text-gray-500 mt-1">
                    캠페인을 먼저 생성하고 승인받으세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.map(campaign => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedCampaign?.id === campaign.id
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {campaign.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span>{formatAmount(campaign.reward_amount)}</span>
                            <span className="text-gray-300">|</span>
                            <span>{formatDate(campaign.deadline)}</span>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedCampaign?.id === campaign.id
                            ? 'border-violet-500 bg-violet-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedCampaign?.id === campaign.id && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 발송 옵션 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발송 방법
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSendOptions(prev => ({ ...prev, kakao: !prev.kakao }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    sendOptions.kakao
                      ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">카카오톡</span>
                  {sendOptions.kakao && <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSendOptions(prev => ({ ...prev, email: !prev.email }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    sendOptions.email
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">이메일</span>
                  {sendOptions.email && <Check className="w-4 h-4" />}
                </button>
              </div>
              {!sendOptions.kakao && !sendOptions.email && (
                <p className="text-xs text-red-500 mt-2">최소 하나의 발송 방법을 선택하세요</p>
              )}
            </div>

            {/* 결과 메시지 */}
            {result && (
              <div className={`p-4 rounded-xl mb-5 ${
                result.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">{result.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* 푸터 - 발송 버튼 */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5">
            <Button
              onClick={handleSendInvitation}
              disabled={!selectedCampaign || (!sendOptions.kakao && !sendOptions.email) || sending}
              className="w-full h-14 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl text-base font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  초대장 발송하기
                </>
              )}
            </Button>
            <p className="text-xs text-gray-400 text-center mt-3">
              초대장 수신 후 크리에이터가 신청하면 알림을 받습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
