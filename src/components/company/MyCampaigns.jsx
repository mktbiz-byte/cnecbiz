import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Plus,
  Eye,
  TrendingUp,
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  CreditCard,
  CheckCircle,
  DollarSign,
  Search,
  FolderOpen,
  Filter,
  ChevronRight
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import RegionSelectModal from './RegionSelectModal'
import CompanyNavigation from './CompanyNavigation'

export default function MyCampaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [participants, setParticipants] = useState({})
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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

    // Korea DB에서 회사 정보 조회 (오류 시 Biz DB로 fallback)
    let companyData = null

    try {
      const result = await supabaseKorea
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      companyData = result.data
    } catch (koreaError) {
      console.log('[MyCampaigns] Korea DB query failed, trying Biz DB:', koreaError)
    }

    // Korea DB에 없거나 오류 발생 시 Biz DB에서 조회
    if (!companyData) {
      const result = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      companyData = result.data
    }

    if (companyData) {
      setCompany(companyData)
    }

    // 회사 정보가 없어도 캠페인은 조회
    fetchCampaigns(user.email, companyData?.id, user.id)
  }

  const fetchCampaigns = async (userEmail, companyId, userId) => {
    setLoading(true)
    try {
      console.log('[MyCampaigns] Fetching campaigns for email:', userEmail, 'companyId:', companyId)

      // 한국 지역 캠페인 가져오기 (company_email 기준)
      const { data: koreaCampaigns, error: koreaError } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('company_email', userEmail)
        .order('created_at', { ascending: false })

      console.log('[MyCampaigns] Korea campaigns result:', { koreaCampaigns, koreaError })

      // 일본 지역 캠페인 가져오기 (company_email 기준)
      const supabaseJapan = getSupabaseClient('japan')
      const { data: japanCampaigns, error: japanError } = await supabaseJapan
        .from('campaigns')
        .select('*')
        .eq('company_email', userEmail)
        .order('created_at', { ascending: false })

      console.log('[MyCampaigns] Japan campaigns result:', { japanCampaigns, japanError })

      // 미국 지역 캠페인 가져오기 (company_id에 user_id 저장됨)
      const supabaseUS = getSupabaseClient('us')
      let usCampaigns = null
      let usError = null

      if (userId) {
        const result = await supabaseUS
          .from('campaigns')
          .select('*')
          .eq('company_id', userId)
          .order('created_at', { ascending: false })
        usCampaigns = result.data
        usError = result.error
      }

      console.log('[MyCampaigns] US campaigns result:', { usCampaigns, usError })

      // 지역 표시를 위해 region 필드 추가
      const koreaCampaignsWithRegion = (koreaCampaigns || []).map(c => ({
        ...c,
        region: 'korea'
      }))

      const japanCampaignsWithRegion = (japanCampaigns || []).map(c => ({
        ...c,
        region: 'japan'
      }))

      const usCampaignsWithRegion = (usCampaigns || []).map(c => ({
        ...c,
        region: 'us'
      }))

      // 한국 + 일본 + 미국 캠페인 합치기
      const campaignsWithRegion = [...koreaCampaignsWithRegion, ...japanCampaignsWithRegion, ...usCampaignsWithRegion]

      // 취소된 캠페인은 하단으로 정렬
      const sortedCampaigns = campaignsWithRegion.sort((a, b) => {
        // 취소된 캠페인은 하단으로
        if (a.is_cancelled && !b.is_cancelled) return 1
        if (!a.is_cancelled && b.is_cancelled) return -1
        // 나머지는 생성일 기준 내림차순
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setCampaigns(sortedCampaigns)

      // 각 캠페인의 참여자 정보 가져오기
      const participantsData = {}
      for (const campaign of campaignsWithRegion) {
        const supabaseClient = campaign.region === 'korea' ? supabaseKorea : campaign.region === 'japan' ? getSupabaseClient('japan') : getSupabaseClient('us')
        const { data } = await supabaseClient
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign.id)

        participantsData[campaign.id] = {
          total: data?.length || 0,
          selected: data?.filter(p => ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed'].includes(p.status)).length || 0,
          guideConfirmed: data?.filter(p => p.guide_confirmed).length || 0
        }
      }
      setParticipants(participantsData)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDepositConfirmationRequest = async (campaign) => {
    if (!confirm('입금 확인 요청을 보내시겠습니까?')) {
      return
    }

    try {
      const regionMap = {
        'korea': '한국',
        'japan': '일본',
        'usa': '미국'
      }
      const regionText = regionMap[campaign.region] || '한국'

      const campaignTypeMap = {
        'planned': '기획형',
        'regular': '기획형',
        'oliveyoung': '올리브영',
        '4week_challenge': '4주 챌린지',
        '4week': '4주 챌린지'
      }
      const campaignTypeText = campaignTypeMap[campaign.campaign_type] || '기획형'

      const packagePrice = getPackagePrice(campaign.package_type)
      const totalSlots = campaign.max_participants || campaign.total_slots || 0
      const subtotal = packagePrice * totalSlots
      const vat = Math.floor(subtotal * 0.1)
      const total = subtotal + vat

      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data: companyData } = await supabaseBiz
        .from('companies')
        .select('company_name')
        .eq('user_id', user.id)
        .single()

      const companyName = companyData?.company_name || '회사명 없음'

      const message = `[새로운 입금 확인 요청]

• 지역: ${regionText}
• 캠페인 타입: ${campaignTypeText}
• 회사명: ${companyName}
• 캠페인명: ${campaign.title}
• 금액: ${total.toLocaleString()}원
• 결제 방법: 계좌입금

입금 확인 페이지: https://cnectotal.netlify.app/admin/payment-requests`

      try {
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
      }

      alert('입금 확인 요청이 전송되었습니다!')
    } catch (error) {
      console.error('Error requesting deposit confirmation:', error)
      alert('오류가 발생했습니다: ' + error.message)
    }
  }

  const getPackagePrice = (packageType, campaignType) => {
    const oliveyoungPrices = {
      'standard': 400000,
      'premium': 500000,
      'professional': 600000
    }

    const generalPrices = {
      'junior': 200000,
      'intermediate': 300000,
      'senior': 400000,
      'basic': 200000,
      'standard': 300000,
      'premium': 400000,
      'professional': 600000,
      'enterprise': 1000000
    }

    const legacyPrices = {
      'oliveyoung': 200000,
      '올영 20만원': 200000,
      '프리미엄 30만원': 300000,
      '4week_challenge': 600000,
      '4주챌린지 60만원': 600000
    }

    const packageKey = packageType?.toLowerCase()

    if (legacyPrices[packageKey]) {
      return legacyPrices[packageKey]
    }

    if (campaignType === 'oliveyoung' && oliveyoungPrices[packageKey]) {
      return oliveyoungPrices[packageKey]
    }

    return generalPrices[packageKey] || 200000
  }

  const getCampaignTypeInfo = (campaignType) => {
    const types = {
      '4week_challenge': { label: '4주 챌린지', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
      '4week': { label: '4주 챌린지', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
      'oliveyoung': { label: '올영세일', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400' },
      'planned': { label: '기획형', color: 'bg-indigo-100 text-indigo-700', dotColor: 'bg-indigo-400' },
      'regular': { label: '기획형', color: 'bg-indigo-100 text-indigo-700', dotColor: 'bg-indigo-400' }
    }
    return types[campaignType] || { label: '기타', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' }
  }

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getProgressStatusInfo = (status, isCancelled) => {
    if (isCancelled) {
      return { label: '취소됨', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' }
    }

    const statuses = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' },
      pending_payment: { label: '입금 대기', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-400' },
      pending_approval: { label: '승인대기', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400' },
      pending: { label: '승인대기', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400' },
      recruiting: { label: '모집중', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-400' },
      guide_confirmation: { label: '가이드 확인중', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
      filming: { label: '촬영중', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-400' },
      editing: { label: '수정중', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400' },
      approved: { label: '진행중', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-400' },
      completed: { label: '완료', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' }
    }
    return statuses[status] || statuses.draft
  }

  const getRegionInfo = (region) => {
    const regions = {
      korea: { label: '한국', flag: '🇰🇷', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      japan: { label: '일본', flag: '🇯🇵', color: 'bg-red-50 text-red-700 border-red-200' },
      us: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      usa: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      taiwan: { label: '대만', flag: '🇹🇼', color: 'bg-green-50 text-green-700 border-green-200' }
    }
    return regions[region] || regions.korea
  }

  // Filter chips
  const regionFilters = [
    { value: 'all', label: '전체' },
    { value: 'korea', label: '🇰🇷 한국' },
    { value: 'us', label: '🇺🇸 미국' },
    { value: 'japan', label: '🇯🇵 일본' }
  ]

  const statusFilters = [
    { value: 'all', label: '전체' },
    { value: 'draft', label: '작성중' },
    { value: 'pending_payment', label: '입금확인중' },
    { value: 'pending', label: '승인요청중' },
    { value: 'recruiting', label: '모집중' },
    { value: 'in_progress', label: '진행중' },
    { value: 'completed', label: '완료' }
  ]

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    // Search filter
    if (searchQuery && !campaign.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Region filter
    if (selectedRegion !== 'all' && campaign.region !== selectedRegion) {
      return false
    }

    // Status filter
    if (selectedStatus !== 'all') {
      switch (selectedStatus) {
        case 'draft':
          return campaign.status === 'draft' || campaign.approval_status === 'draft'
        case 'pending_payment':
          return campaign.approval_status === 'pending_payment'
        case 'pending':
          return campaign.approval_status === 'pending' || campaign.approval_status === 'pending_approval'
        case 'recruiting':
          return campaign.approval_status === 'approved' && campaign.status !== 'completed'
        case 'in_progress':
          return campaign.status === 'in_progress' || campaign.progress_status === 'filming'
        case 'completed':
          return campaign.status === 'completed'
        default:
          return true
      }
    }

    return true
  })

  const activeCampaigns = campaigns.filter(c => !c.is_cancelled)

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-[#F9FAFB] lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                내 캠페인
              </h1>
              <p className="text-gray-500 mt-1 ml-13">생성한 캠페인을 관리하세요</p>
            </div>
            <Button onClick={() => setShowRegionModal(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              새 캠페인 만들기
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="stats-card">
              <div className="stats-card-header">
                <span className="stats-card-title">전체</span>
                <div className="stats-card-icon bg-blue-50">
                  <FolderOpen className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div className="stats-card-value">{activeCampaigns.length}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-header">
                <span className="stats-card-title">승인 대기</span>
                <div className="stats-card-icon bg-orange-50">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <div className="stats-card-value text-orange-500">
                {activeCampaigns.filter(c => c.approval_status === 'draft' || c.approval_status === 'pending').length}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-header">
                <span className="stats-card-title">진행중</span>
                <div className="stats-card-icon bg-blue-50">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div className="stats-card-value text-blue-500">
                {activeCampaigns.filter(c => c.approval_status === 'approved' && c.status !== 'completed').length}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-header">
                <span className="stats-card-title">완료</span>
                <div className="stats-card-icon bg-green-50">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <div className="stats-card-value text-green-500">
                {activeCampaigns.filter(c => c.status === 'completed').length}
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="dashboard-card mb-6">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="캠페인 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            {/* Region Filters */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                국가별 필터
              </p>
              <div className="flex flex-wrap gap-2">
                {regionFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedRegion(filter.value)}
                    className={`chip ${selectedRegion === filter.value ? 'chip-active' : 'chip-inactive'}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filters */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">상태별 필터</p>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedStatus(filter.value)}
                    className={`chip ${selectedStatus === filter.value ? 'chip-active' : 'chip-inactive'}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="dashboard-card">
            <div className="section-header px-1 mb-4">
              <FolderOpen className="w-5 h-5 text-gray-600" />
              <h2 className="section-title">캠페인 목록</h2>
              <span className="section-count">({filteredCampaigns.length}개)</span>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-500">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p>캠페인을 불러오는 중...</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-600 mb-2">
                  {campaigns.length === 0 ? '아직 생성된 캠페인이 없습니다' : '검색 결과가 없습니다'}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  {campaigns.length === 0 ? '첫 번째 캠페인을 만들어보세요' : '다른 검색어나 필터를 시도해보세요'}
                </p>
                {campaigns.length === 0 && (
                  <Button onClick={() => setShowRegionModal(true)} className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" />
                    첫 캠페인 만들기
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCampaigns.map((campaign) => {
                  const packagePrice = getPackagePrice(campaign.package_type, campaign.campaign_type)
                  const totalCost = Math.floor(packagePrice * (campaign.total_slots || 0) * 1.1)
                  const participantInfo = participants[campaign.id] || { total: 0, selected: 0, guideConfirmed: 0 }
                  const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline)
                  const typeInfo = getCampaignTypeInfo(campaign.campaign_type)
                  const statusInfo = getProgressStatusInfo(
                    campaign.status === 'active' && campaign.payment_status === 'confirmed'
                      ? 'recruiting'
                      : (campaign.progress_status || campaign.approval_status),
                    campaign.is_cancelled
                  )
                  const regionInfo = getRegionInfo(campaign.region)

                  return (
                    <div
                      key={campaign.id}
                      className="border border-gray-100 rounded-xl p-4 md:p-5 hover:border-orange-200 hover:shadow-md cursor-pointer transition-all bg-white"
                      onClick={() => navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)}
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${regionInfo.color}`}>
                              {regionInfo.flag} {regionInfo.label}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${typeInfo.dotColor}`}></span>
                              {typeInfo.label}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`}></span>
                              {statusInfo.label}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{campaign.title}</h3>
                          <p className="text-sm text-gray-500 truncate">
                            {campaign.brand} • {campaign.product_name}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500 mb-1">결제 예상 금액</div>
                          <div className="text-xl font-bold text-orange-500">
                            {totalCost.toLocaleString()}원
                          </div>
                          <div className="text-xs text-gray-400">{campaign.package_type}</div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-blue-50 p-3 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-xs text-gray-600">모집 인원</span>
                          </div>
                          <div className="text-lg font-bold text-blue-600">{campaign.total_slots || 0}명</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <UserCheck className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-gray-600">지원자</span>
                          </div>
                          <div className="text-lg font-bold text-green-600">{participantInfo.total}명</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-purple-500" />
                            <span className="text-xs text-gray-600">확정</span>
                          </div>
                          <div className="text-lg font-bold text-purple-600">{participantInfo.selected}명</div>
                        </div>
                      </div>

                      {/* Deposit Request Alert */}
                      {campaign.payment_status === 'pending' && !campaign.is_cancelled && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                          <p className="text-sm text-yellow-800 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            입금 후 10분이 지났으나, 입금 확인이 안되실 경우 버튼을 눌러 주세요.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDepositConfirmationRequest(campaign)
                            }}
                          >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            입금 확인 요청
                          </Button>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {recruitmentDays !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              모집 마감:
                              <span className={`font-medium ${recruitmentDays <= 3 ? 'text-red-600' : recruitmentDays <= 7 ? 'text-orange-600' : 'text-gray-700'}`}>
                                {recruitmentDays > 0 ? `D-${recruitmentDays}` : '마감'}
                              </span>
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)
                          }}
                        >
                          상세보기
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {showRegionModal && (
            <RegionSelectModal onClose={() => setShowRegionModal(false)} />
          )}
        </div>
      </div>
    </>
  )
}
