import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  LayoutDashboard,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  LogOut,
  Menu,
  X,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  UserCheck,
  CreditCard,
  FileText,
  Search,
  Calendar,
  Bell,
  ChevronRight,
  FolderOpen,
  Wallet,
  Play
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import RegionSelectModal from './RegionSelectModal'
import CompanyNavigation from './CompanyNavigation'

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [participants, setParticipants] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    totalSpent: 0
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState('korea')
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(null) // 상태 필터: null, 'all', 'completed', 'active', 'pending'

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [selectedRegion, user])

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
    setUser(user)

    // 회사 정보 가져오기
    const { data: companyData } = await supabaseKorea
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setCompany(companyData)
  }

  const fetchData = async () => {
    try {
      if (!user) return

      console.log('[CompanyDashboard] Fetching campaigns for user:', user.email)
      console.log('[CompanyDashboard] Selected region:', selectedRegion)

      // 선택된 지역의 Supabase 클라이언트 선택
      const supabaseClient = selectedRegion === 'korea' ? supabaseKorea : supabaseBiz

      // 로그인한 회사의 캠페인만 가져오기 (company_email 기준)
      const { data: campaignsData, error } = await supabaseClient
        .from('campaigns')
        .select('*')
        .eq('company_email', user.email)
        .order('created_at', { ascending: false })
        .limit(5)

      console.log('[CompanyDashboard] Campaigns query result:', { campaignsData, error })

      // 취소된 캠페인은 하단으로 정렬
      const sortedCampaigns = (campaignsData || []).sort((a, b) => {
        // 취소된 캠페인은 하단으로
        if (a.is_cancelled && !b.is_cancelled) return 1
        if (!a.is_cancelled && b.is_cancelled) return -1
        // 나머지는 생성일 기준 내림차순
        return new Date(b.created_at) - new Date(a.created_at)
      })
      setCampaigns(sortedCampaigns)

      // 각 캠페인의 참여자 정보 가져오기
      const participantsData = {}
      for (const campaign of campaignsData || []) {
         const { data } = await supabaseClient
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign.id)

        participantsData[campaign.id] = {
          total: data?.length || 0,
          selected: data?.filter(p => ['selected', 'approved', 'virtual_selected'].includes(p.status)).length || 0,
          guideConfirmed: data?.filter(p => p.guide_confirmed).length || 0
        }
      }
      setParticipants(participantsData)

      // 통계 계산 (취소된 캠페인 제외)
      const activeCampaigns = campaignsData?.filter(c => !c.is_cancelled) || []
      const total = activeCampaigns.length
      const pending = activeCampaigns.filter(c =>
        c.status === 'draft' ||
        c.status === 'pending' ||
        c.status === 'pending_payment' ||
        c.approval_status === 'pending_approval'
      ).length
      const active = activeCampaigns.filter(c =>
        (c.status === 'recruiting' ||
        c.status === 'guide_review' ||
        c.status === 'in_progress' ||
        c.status === 'revision') &&
        c.approval_status !== 'pending_approval'
      ).length
      const completed = activeCampaigns.filter(c => c.status === 'completed').length
      const totalSpent = activeCampaigns.reduce((sum, c) => {
        const packagePrice = getPackagePrice(c.package_type, c.campaign_type)
        const count = c.max_participants || c.total_slots || 0
        const subtotal = packagePrice * count
        const vat = Math.floor(subtotal * 0.1)
        return sum + (subtotal + vat)
      }, 0)
      setStats({ total, pending, active, completed, totalSpent })
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const getPackagePrice = (packageType, campaignType) => {
    // 올리브영 패키지 가격
    const oliveyoungPrices = {
      'standard': 400000,
      'premium': 500000,
      'professional': 600000
    }

    // 기획형 & 4주 챌린지 패키지 가격 (동일)
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

    // 레거시 패키지
    const legacyPrices = {
      'oliveyoung': 200000,
      '올영 20만원': 200000,
      '프리미엄 30만원': 300000,
      '4week_challenge': 600000,
      '4주챌린지 60만원': 600000
    }

    const packageKey = packageType?.toLowerCase()

    // 레거시 패키지 먼저 확인
    if (legacyPrices[packageKey]) {
      return legacyPrices[packageKey]
    }

    // 올리브영 패키지
    if (campaignType === 'oliveyoung' && oliveyoungPrices[packageKey]) {
      return oliveyoungPrices[packageKey]
    }

    // 기획형 & 4주 챌린지 패키지
    return generalPrices[packageKey] || 200000
  }

   const getDaysRemaining = (deadline) => {
    if (!deadline) return null
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getCampaignTypeBadge = (campaignType) => {
    const badges = {
      regular: { label: '기타', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' },
      oliveyoung: { label: '올영세일', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400' },
      '4week_challenge': { label: '4주 챌린지', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' }
    }
    return badges[campaignType] || badges.regular
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

  // Get upcoming deadlines
  const getUpcomingDeadlines = () => {
    const upcoming = []
    campaigns.forEach(campaign => {
      if (campaign.is_cancelled) return

      const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline || campaign.application_deadline)
      const submissionDays = getDaysRemaining(campaign.content_submission_deadline)

      if (recruitmentDays !== null && recruitmentDays >= 0 && recruitmentDays <= 14) {
        upcoming.push({
          id: campaign.id,
          type: getCampaignTypeBadge(campaign.campaign_type),
          title: '크리에이터 모집 마감일',
          subtitle: campaign.title,
          date: campaign.recruitment_deadline || campaign.application_deadline,
          daysLeft: recruitmentDays
        })
      }

      if (submissionDays !== null && submissionDays >= 0 && submissionDays <= 14) {
        upcoming.push({
          id: campaign.id,
          type: { label: '샘플 수령', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-400' },
          title: '콘텐츠 제출 마감일',
          subtitle: campaign.title,
          date: campaign.content_submission_deadline,
          daysLeft: submissionDays
        })
      }
    })

    return upcoming.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4)
  }

  // Get delayed items
  const getDelayedItems = () => {
    const delayed = []
    campaigns.forEach(campaign => {
      if (campaign.is_cancelled) return

      const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline || campaign.application_deadline)
      const submissionDays = getDaysRemaining(campaign.content_submission_deadline)

      if (recruitmentDays !== null && recruitmentDays < 0) {
        delayed.push({
          id: campaign.id,
          title: campaign.title,
          type: '모집 마감',
          date: campaign.recruitment_deadline || campaign.application_deadline,
          daysOverdue: Math.abs(recruitmentDays)
        })
      }

      if (submissionDays !== null && submissionDays < 0) {
        delayed.push({
          id: campaign.id,
          title: campaign.title,
          type: '제출 마감',
          date: campaign.content_submission_deadline,
          daysOverdue: Math.abs(submissionDays)
        })
      }
    })

    return delayed.slice(0, 3)
  }

  const upcomingDeadlines = getUpcomingDeadlines()
  const delayedItems = getDelayedItems()

  const handleLogout = async () => {
    await supabaseBiz.auth.signOut()
    navigate('/login')
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-[#F9FAFB] lg:ml-64">
        {/* Main Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="캠페인 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-gray-200 bg-white shadow-sm"
                />
              </div>
            </div>

            {/* Dashboard Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">대시보드</h1>
              <p className="text-gray-500 mt-1">안녕하세요, {company?.company_name || user?.email?.split('@')[0]}님!</p>
            </div>

            {/* Stats Cards Grid - 클릭으로 필터링 가능 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {/* Total Campaigns */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'all' ? null : 'all')}
                className={`stats-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left ${statusFilter === 'all' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
              >
                <div className="stats-card-header">
                  <span className="stats-card-title">전체 캠페인</span>
                  <div className="stats-card-icon bg-blue-50">
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <div className="stats-card-value">{stats.total}</div>
              </button>

              {/* Completed */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'completed' ? null : 'completed')}
                className={`stats-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left ${statusFilter === 'completed' ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}
              >
                <div className="stats-card-header">
                  <span className="stats-card-title">완료</span>
                  <div className="stats-card-icon bg-green-50">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <div className="stats-card-value">{stats.completed}</div>
                {stats.total > 0 && (
                  <>
                    <div className="progress-bar mt-3">
                      <div
                        className="progress-bar-fill bg-green-500"
                        style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      완료율 {Math.round((stats.completed / stats.total) * 100)}%
                    </span>
                  </>
                )}
              </button>

              {/* In Progress */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'active' ? null : 'active')}
                className={`stats-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left ${statusFilter === 'active' ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}
              >
                <div className="stats-card-header">
                  <span className="stats-card-title">진행중</span>
                  <div className="stats-card-icon bg-yellow-50">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                </div>
                <div className="stats-card-value">{stats.active}</div>
              </button>

              {/* Pending */}
              <button
                onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
                className={`stats-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left ${statusFilter === 'pending' ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
              >
                <div className="stats-card-header">
                  <span className="stats-card-title">대기중</span>
                  <div className="stats-card-icon bg-orange-50">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
                <div className="stats-card-value">{stats.pending}</div>
              </button>
            </div>

            {/* Recent Campaigns */}
            <div className="mb-6">
              <div className="dashboard-card">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-3">
                    <div className="section-header !mb-0">
                      <TrendingUp className="w-5 h-5 text-gray-600" />
                      <h2 className="section-title">최근 캠페인</h2>
                    </div>
                    {/* 필터 표시 및 리셋 */}
                    {statusFilter && (
                      <button
                        onClick={() => setStatusFilter(null)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-100 transition-colors"
                      >
                        {statusFilter === 'all' && '전체'}
                        {statusFilter === 'completed' && '완료'}
                        {statusFilter === 'active' && '진행중'}
                        {statusFilter === 'pending' && '대기중'}
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/company/campaigns')}
                      className="text-gray-600 border-gray-200"
                    >
                      전체보기
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowRegionModal(true)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      새 캠페인
                    </Button>
                  </div>
                </div>

                {campaigns.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-600 mb-2">아직 생성된 캠페인이 없습니다</p>
                    <p className="text-sm text-gray-500 mb-6">첫 번째 캠페인을 만들어 크리에이터들과 협업해보세요</p>
                    <Button
                      onClick={() => setShowRegionModal(true)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      첫 캠페인 만들기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns
                      .filter((campaign) => {
                        // 상태 필터 적용
                        if (!statusFilter || statusFilter === 'all') return true

                        const status = campaign.progress_status || campaign.approval_status
                        if (statusFilter === 'completed') {
                          return status === 'completed'
                        }
                        if (statusFilter === 'active') {
                          return ['recruiting', 'guide_review', 'in_progress', 'revision', 'guide_confirmation', 'filming', 'editing', 'approved'].includes(status) && campaign.approval_status !== 'pending_approval'
                        }
                        if (statusFilter === 'pending') {
                          return ['draft', 'pending', 'pending_payment'].includes(status) || campaign.approval_status === 'pending_approval'
                        }
                        return true
                      })
                      .map((campaign) => {
                      // Use estimated_cost if available, otherwise calculate from max_participants
                      let totalCost
                      if (campaign.estimated_cost) {
                        totalCost = campaign.estimated_cost
                      } else {
                        const packagePrice = getPackagePrice(campaign.package_type, campaign.campaign_type)
                        const slots = campaign.max_participants || campaign.total_slots || 0
                        const subtotal = packagePrice * slots
                        const vat = Math.floor(subtotal * 0.1)
                        totalCost = subtotal + vat
                      }
                      const participantInfo = participants[campaign.id] || { total: 0, selected: 0, guideConfirmed: 0 }
                      const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline)
                      const statusInfo = getProgressStatusInfo(campaign.progress_status || campaign.approval_status, campaign.is_cancelled)
                      const typeInfo = getCampaignTypeBadge(campaign.campaign_type)

                      return (
                        <div
                          key={campaign.id}
                          className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all bg-white"
                          onClick={() => navigate(`/company/campaigns/${campaign.id}`)}
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Badges */}
                              <div className="flex flex-wrap items-center gap-2 mb-2">
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
                              <h3 className="font-semibold text-gray-900 text-base truncate mb-1">{campaign.title}</h3>

                              {/* Meta info */}
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {participantInfo.total}/{campaign.max_participants || campaign.total_slots || 0}명
                                </span>
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-4 h-4" />
                                  확정 {participantInfo.selected}명
                                </span>
                                {recruitmentDays !== null && recruitmentDays >= 0 && (
                                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${recruitmentDays <= 3 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} text-xs font-medium`}>
                                    D-{recruitmentDays}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Price */}
                            <div className="text-right sm:text-right flex-shrink-0">
                              <div className="text-xl font-bold text-indigo-500">
                                {totalCost.toLocaleString()}원
                              </div>
                              <span className="text-xs text-gray-400">{campaign.package_type}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Schedules - 2 columns */}
              <div className="lg:col-span-2">
                <div className="dashboard-card">
                  <div className="section-header px-1">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <h2 className="section-title">다가오는 일정</h2>
                    <span className="section-count">({upcomingDeadlines.length}개)</span>
                  </div>

                  {upcomingDeadlines.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">다가오는 일정이 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {upcomingDeadlines.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="schedule-item"
                          onClick={() => navigate(`/company/campaigns/${item.id}`)}
                        >
                          <div className={`schedule-item-dot ${item.type.dotColor}`} />
                          <div className="schedule-item-content">
                            <span className={`schedule-item-badge ${item.type.color}`}>
                              {item.type.label}
                            </span>
                            <p className="schedule-item-title">{item.title}</p>
                            <p className="schedule-item-subtitle">{item.subtitle}</p>
                            <div className="schedule-item-date">
                              <span>{new Date(item.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                              <span className={`schedule-item-dday ${item.daysLeft <= 3 ? 'bg-red-100 text-red-700' : ''}`}>
                                D-{item.daysLeft}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Delayed Items - 1 column */}
              <div className="lg:col-span-1">
                <div className="warning-card">
                  <div className="warning-card-header">
                    <AlertCircle className="w-5 h-5" />
                    <span>지연된 일정</span>
                  </div>

                  {delayedItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-300" />
                      <p className="text-sm text-gray-600">지연된 일정이 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {delayedItems.map((item, index) => (
                        <div
                          key={`delayed-${item.id}-${index}`}
                          className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                          onClick={() => navigate(`/company/campaigns/${item.id}`)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                            <p className="text-xs text-red-600">마감: {new Date(item.date).toLocaleDateString('ko-KR')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Region Select Modal */}
          <RegionSelectModal
            open={showRegionModal}
            onClose={() => setShowRegionModal(false)}
          />
        </main>
      </div>
    </>
  )
}
