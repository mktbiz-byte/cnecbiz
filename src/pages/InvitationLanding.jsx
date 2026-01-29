import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Gift,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
  X,
  Phone,
  Mail
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../lib/supabaseClients'

/**
 * 캠페인 초대장 랜딩 페이지 (모바일 최적화)
 * - 크리에이터가 초대장 링크 클릭 시 보여지는 페이지
 * - 캠페인 정보 확인 및 바로 신청 가능
 */
export default function InvitationLanding() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [company, setCompany] = useState(null)
  const [creator, setCreator] = useState(null)
  const [error, setError] = useState(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (id) {
      fetchInvitationData()
    }
  }, [id])

  const fetchInvitationData = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. 초대장 정보 조회
      const { data: invitationData, error: invitationError } = await supabaseBiz
        .from('campaign_invitations')
        .select('*')
        .eq('id', id)
        .single()

      if (invitationError || !invitationData) {
        setError('초대장을 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      setInvitation(invitationData)

      // 만료 확인
      if (invitationData.expires_at && new Date(invitationData.expires_at) < new Date()) {
        setExpired(true)
      }

      // 이미 신청했는지 확인
      if (invitationData.status === 'accepted') {
        setApplied(true)
      }

      // 2. 캠페인 정보 조회
      const client = supabaseKorea || supabaseBiz
      const { data: campaignData, error: campaignError } = await client
        .from('campaigns')
        .select('*')
        .eq('id', invitationData.campaign_id)
        .single()

      if (campaignError) {
        console.error('Campaign error:', campaignError)
      }
      setCampaign(campaignData)

      // 3. 기업 정보 조회
      const { data: companyData } = await supabaseBiz
        .from('user_profiles')
        .select('full_name, company_name, profile_image_url')
        .eq('id', invitationData.invited_by)
        .single()

      setCompany(companyData)

      // 4. 크리에이터 정보 조회
      const { data: creatorData } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .eq('id', invitationData.invited_creator_id)
        .single()

      setCreator(creatorData)

    } catch (err) {
      console.error('Error fetching invitation:', err)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!invitation || !campaign || !creator) return

    setApplying(true)

    try {
      const response = await fetch('/.netlify/functions/apply-from-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: invitation.id,
          campaignId: campaign.id,
          creatorId: creator.id
        })
      })

      const result = await response.json()

      if (result.success) {
        setApplied(true)
        // 초대장 상태 업데이트
        setInvitation(prev => ({ ...prev, status: 'accepted' }))
      } else {
        setError(result.error || '신청에 실패했습니다.')
      }
    } catch (err) {
      console.error('Error applying:', err)
      setError('신청 중 오류가 발생했습니다.')
    } finally {
      setApplying(false)
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

  // 캠페인 타입 한글 라벨
  const getCampaignTypeLabel = (campaignType) => {
    const labels = {
      'planned': '기획형',
      'regular': '기획형',
      'oliveyoung': '올영세일',
      'oliveyoung_sale': '올영세일',
      '4week_challenge': '4주 챌린지',
      '4week': '4주 챌린지',
      'megawari': '메가와리'
    }
    return labels[campaignType] || campaignType || '기획형'
  }

  // 크리에이터 포인트 계산
  // reward_points에는 이미 1인당 크리에이터 포인트(패키지 가격의 60%)가 저장됨
  const calculateCreatorPoints = (campaign) => {
    if (!campaign) return 0

    // 수동 설정값이 있으면 우선 사용
    if (campaign.creator_points_override) {
      return campaign.creator_points_override
    }

    const campaignType = campaign.campaign_type
    const totalSlots = campaign.total_slots || campaign.max_participants || 1

    // 4주 챌린지: 주차별 보상이 설정되어 있으면 합산
    if (campaignType === '4week_challenge' || campaignType === '4week') {
      const weeklyTotal = (campaign.week1_reward || 0) + (campaign.week2_reward || 0) +
                         (campaign.week3_reward || 0) + (campaign.week4_reward || 0)
      if (weeklyTotal > 0) {
        return Math.round((weeklyTotal * 0.7) / totalSlots)
      }
      // reward_points에 이미 1인당 포인트가 저장되어 있음
      return campaign.reward_points || 0
    }

    // 기획형: 단계별 보상이 설정되어 있으면 합산
    if (campaignType === 'planned' || campaignType === 'regular') {
      const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) +
                       (campaign.step3_reward || 0)
      if (stepTotal > 0) {
        return Math.round((stepTotal * 0.6) / totalSlots)
      }
      // reward_points에 이미 1인당 포인트가 저장되어 있음
      return campaign.reward_points || 0
    }

    // 올리브영: 단계별 보상이 설정되어 있으면 합산
    if (campaignType === 'oliveyoung' || campaignType === 'oliveyoung_sale') {
      const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) +
                       (campaign.step3_reward || 0)
      if (stepTotal > 0) {
        return Math.round((stepTotal * 0.7) / totalSlots)
      }
      // reward_points에 이미 1인당 포인트가 저장되어 있음
      return campaign.reward_points || 0
    }

    // 기본: reward_amount 또는 reward_points (이미 1인당 포인트)
    return campaign.reward_amount || campaign.reward_points || 0
  }

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-gray-600">초대장을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 화면
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const companyName = company?.company_name || company?.full_name || campaign?.brand_name || '기업'

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm mb-4">
            <Gift className="w-4 h-4" />
            캠페인 초대장
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {companyName}에서
            <br />
            초대장을 보냈습니다
          </h1>
          {creator && (
            <p className="text-violet-200">
              {creator.name || creator.creator_name}님을 위한 특별 초대
            </p>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-lg mx-auto px-4 py-6 -mt-4">
        {/* 만료/신청완료 알림 */}
        {expired && !applied && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-orange-700">초대장이 만료되었습니다</p>
              <p className="text-sm text-orange-600">유효기간이 지났습니다.</p>
            </div>
          </div>
        )}

        {applied && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-700">신청이 완료되었습니다!</p>
              <p className="text-sm text-green-600">기업에서 확인 후 연락드릴 예정입니다.</p>
            </div>
          </div>
        )}

        {/* 캠페인 카드 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          {/* 캠페인 이미지 */}
          {(campaign?.main_image || campaign?.thumbnail) && (
            <div className="aspect-video bg-gray-100">
              <img
                src={campaign.main_image || campaign.thumbnail}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5">
            {/* 캠페인 타입 배지 */}
            {campaign?.campaign_type && (
              <span className="inline-block px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium mb-3">
                {getCampaignTypeLabel(campaign.campaign_type)}
              </span>
            )}

            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {campaign?.title || '캠페인'}
            </h2>

            {/* 캠페인 정보 */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">기업</p>
                  <p className="font-medium text-gray-900">{companyName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Gift className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">보상금</p>
                  <p className="font-medium text-gray-900">{formatAmount(calculateCreatorPoints(campaign))}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">캠페인 타입</p>
                  <p className="font-medium text-gray-900">{getCampaignTypeLabel(campaign?.campaign_type)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">모집 마감</p>
                  <p className="font-medium text-gray-900">{formatDate(campaign?.application_deadline || campaign?.deadline)}</p>
                </div>
              </div>
            </div>

            {/* 설명 */}
            {campaign?.description && (
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                  {campaign.description}
                </p>
              </div>
            )}

            {/* 특별 안내 */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-violet-700">지원 시 확정</p>
                  <p className="text-sm text-violet-600 mt-1">
                    기업에서 회원님의 프로필을 확인하고 초대했습니다.
                    지원하시면 바로 확정됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 초대 만료일 */}
        {invitation?.expires_at && !expired && (
          <div className="text-center text-sm text-gray-500 mb-4">
            초대 유효기간: {formatDate(invitation.expires_at)}까지
          </div>
        )}

        {/* 신청 버튼 */}
        {!applied && !expired && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-violet-500/30 hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {applying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                신청 중...
              </>
            ) : (
              <>
                지금 바로 지원하기
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}

        {/* 에러 메시지 */}
        {error && invitation && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 문의 */}
        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-gray-500 mb-3">문의가 있으신가요?</p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="tel:1833-6025"
              className="flex items-center gap-2 text-gray-600 hover:text-violet-600"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">1833-6025</span>
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="mailto:support@cnecbiz.com"
              className="flex items-center gap-2 text-gray-600 hover:text-violet-600"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm">이메일</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
