import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  TrendingUp,
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  FolderOpen,
  Filter,
  ChevronRight,
  X,
  Image as ImageIcon,
  Calendar,
  Megaphone
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import RegionSelectModal from './RegionSelectModal'
import CompanyNavigation from './CompanyNavigation'

// Skeleton component for loading state
const CampaignSkeleton = () => (
  <div className="border border-gray-100 rounded-xl p-4 md:p-5 bg-white animate-pulse">
    <div className="flex gap-4">
      <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-2">
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
        </div>
        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-1/2 bg-gray-200 rounded mb-3" />
        <div className="flex gap-3">
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
)

export default function MyCampaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [participants, setParticipants] = useState({})
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statsFilter, setStatsFilter] = useState(null)

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

    // Fetch company info and campaigns in parallel for speed
    fetchCompanyAndCampaigns(user)
  }

  const fetchCompanyAndCampaigns = async (user) => {
    setLoading(true)

    try {
      // Parallel fetch: company info from both DBs
      const [koreaCompanyResult, bizCompanyResult] = await Promise.allSettled([
        supabaseKorea?.from('companies').select('*').eq('user_id', user.id).maybeSingle(),
        supabaseBiz.from('companies').select('*').eq('user_id', user.id).maybeSingle()
      ])

      const companyData = koreaCompanyResult.status === 'fulfilled' && koreaCompanyResult.value?.data
        ? koreaCompanyResult.value.data
        : bizCompanyResult.status === 'fulfilled' ? bizCompanyResult.value?.data : null

      if (companyData) {
        setCompany(companyData)
      }

      // Fetch campaigns from all regions in parallel
      await fetchCampaignsParallel(user.email, companyData?.id, user.id)
    } catch (error) {
      console.error('Error in fetchCompanyAndCampaigns:', error)
      setLoading(false)
    }
  }

  const fetchCampaignsParallel = async (userEmail, companyId, userId) => {
    try {
      const supabaseJapan = getSupabaseClient('japan')
      const supabaseUS = getSupabaseClient('us')

      // Fetch all regions in parallel - by email, company_id, AND user_id for proper transfer support
      const [koreaByEmail, koreaByCompanyId, koreaByUserId, japanResult, usResult] = await Promise.allSettled([
        supabaseKorea?.from('campaigns').select('*').eq('company_email', userEmail).order('created_at', { ascending: false }),
        companyId ? supabaseKorea?.from('campaigns').select('*').eq('company_id', companyId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        userId ? supabaseKorea?.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabaseJapan?.from('campaigns').select('*').eq('company_email', userEmail).order('created_at', { ascending: false }),
        userId ? supabaseUS?.from('campaigns').select('*').eq('company_id', userId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] })
      ])

      // Merge Korea campaigns (by email, company_id, AND user_id - deduplicate)
      const koreaByEmailData = (koreaByEmail.status === 'fulfilled' && koreaByEmail.value?.data || [])
      const koreaByCompanyIdData = (koreaByCompanyId.status === 'fulfilled' && koreaByCompanyId.value?.data || [])
      const koreaByUserIdData = (koreaByUserId.status === 'fulfilled' && koreaByUserId.value?.data || [])
      const koreaIds = new Set()
      const koreaCampaigns = []
      ;[...koreaByEmailData, ...koreaByCompanyIdData, ...koreaByUserIdData].forEach(c => {
        if (!koreaIds.has(c.id)) {
          koreaIds.add(c.id)
          koreaCampaigns.push({ ...c, region: 'korea' })
        }
      })

      const japanCampaigns = (japanResult.status === 'fulfilled' && japanResult.value?.data || []).map(c => ({ ...c, region: 'japan' }))
      const usCampaigns = (usResult.status === 'fulfilled' && usResult.value?.data || []).map(c => ({ ...c, region: 'us' }))

      const allCampaigns = [...koreaCampaigns, ...japanCampaigns, ...usCampaigns]

      // Sort: cancelled at bottom, then by created_at desc
      const sortedCampaigns = allCampaigns.sort((a, b) => {
        if (a.is_cancelled && !b.is_cancelled) return 1
        if (!a.is_cancelled && b.is_cancelled) return -1
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setCampaigns(sortedCampaigns)
      setLoading(false)

      // Fetch participants in parallel (background, don't block UI)
      fetchParticipantsParallel(allCampaigns)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setLoading(false)
    }
  }

  const fetchParticipantsParallel = async (campaignsList) => {
    if (campaignsList.length === 0) return

    // Group campaigns by region
    const byRegion = {
      korea: campaignsList.filter(c => c.region === 'korea').map(c => c.id),
      japan: campaignsList.filter(c => c.region === 'japan').map(c => c.id),
      us: campaignsList.filter(c => c.region === 'us').map(c => c.id)
    }

    const supabaseJapan = getSupabaseClient('japan')
    const supabaseUS = getSupabaseClient('us')

    // Fetch all applications in parallel by region (single query per region)
    const [koreaApps, japanApps, usApps] = await Promise.allSettled([
      byRegion.korea.length > 0
        ? supabaseKorea?.from('applications').select('campaign_id, status, guide_confirmed').in('campaign_id', byRegion.korea)
        : Promise.resolve({ data: [] }),
      byRegion.japan.length > 0
        ? supabaseJapan?.from('applications').select('campaign_id, status, guide_confirmed').in('campaign_id', byRegion.japan)
        : Promise.resolve({ data: [] }),
      byRegion.us.length > 0
        ? supabaseUS?.from('applications').select('campaign_id, status, guide_confirmed').in('campaign_id', byRegion.us)
        : Promise.resolve({ data: [] })
    ])

    // Combine all applications
    const allApps = [
      ...(koreaApps.status === 'fulfilled' && koreaApps.value?.data || []),
      ...(japanApps.status === 'fulfilled' && japanApps.value?.data || []),
      ...(usApps.status === 'fulfilled' && usApps.value?.data || [])
    ]

    // Process into participants map
    const participantsData = {}
    const selectedStatuses = ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed']

    allApps.forEach(app => {
      if (!participantsData[app.campaign_id]) {
        participantsData[app.campaign_id] = { total: 0, selected: 0, guideConfirmed: 0 }
      }
      participantsData[app.campaign_id].total++
      if (selectedStatuses.includes(app.status)) {
        participantsData[app.campaign_id].selected++
      }
      if (app.guide_confirmed) {
        participantsData[app.campaign_id].guideConfirmed++
      }
    })

    setParticipants(participantsData)
  }

  const handleDepositConfirmationRequest = async (campaign) => {
    if (!confirm('입금 확인 요청을 보내시겠습니까?')) return

    try {
      const regionText = { korea: '한국', japan: '일본', usa: '미국', us: '미국' }[campaign.region] || '한국'
      const campaignTypeText = { planned: '기획형', regular: '기획형', oliveyoung: '올리브영', '4week_challenge': '4주 챌린지', '4week': '4주 챌린지' }[campaign.campaign_type] || '기획형'

      const packagePrice = getPackagePrice(campaign.package_type, campaign.campaign_type)
      const totalSlots = campaign.max_participants || campaign.total_slots || 0
      const total = Math.floor(packagePrice * totalSlots * 1.1)

      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data: companyData } = await supabaseBiz.from('companies').select('company_name').eq('user_id', user.id).single()
      const companyName = companyData?.company_name || '회사명 없음'

      const message = `[새로운 입금 확인 요청]\n\n• 지역: ${regionText}\n• 캠페인 타입: ${campaignTypeText}\n• 회사명: ${companyName}\n• 캠페인명: ${campaign.title}\n• 금액: ${total.toLocaleString()}원\n• 결제 방법: 계좌입금\n\n입금 확인 페이지: https://cnectotal.netlify.app/admin/payment-requests`

      await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isAdminNotification: true })
      }).catch(console.error)

      alert('입금 확인 요청이 전송되었습니다!')
    } catch (error) {
      console.error('Error requesting deposit confirmation:', error)
      alert('오류가 발생했습니다: ' + error.message)
    }
  }

  const getPackagePrice = (packageType, campaignType) => {
    const prices = {
      oliveyoung: { standard: 400000, premium: 500000, professional: 600000 },
      general: { junior: 200000, intermediate: 300000, senior: 400000, basic: 200000, standard: 300000, premium: 400000, professional: 600000, enterprise: 1000000 },
      legacy: { oliveyoung: 200000, '올영 20만원': 200000, '프리미엄 30만원': 300000, '4week_challenge': 600000, '4주챌린지 60만원': 600000 }
    }
    const key = packageType?.toLowerCase()
    return prices.legacy[key] || (campaignType === 'oliveyoung' && prices.oliveyoung[key]) || prices.general[key] || 200000
  }

  const getCampaignTypeInfo = useCallback((campaignType) => {
    const types = {
      '4week_challenge': { label: '4주 챌린지', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
      '4week': { label: '4주 챌린지', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
      oliveyoung: { label: '올영세일', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400' },
      planned: { label: '기획형', color: 'bg-indigo-100 text-indigo-700', dotColor: 'bg-indigo-400' },
      regular: { label: '기획형', color: 'bg-indigo-100 text-indigo-700', dotColor: 'bg-indigo-400' }
    }
    return types[campaignType] || { label: '기타', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400' }
  }, [])

  const getDaysRemaining = useCallback((deadline) => {
    if (!deadline) return null
    const diffDays = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
    return diffDays
  }, [])

  const getProgressStatusInfo = useCallback((status, isCancelled) => {
    if (isCancelled) return { label: '취소됨', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' }
    const statuses = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
      pending_payment: { label: '입금 대기', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-400' },
      pending_approval: { label: '승인대기', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400' },
      pending: { label: '승인대기', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400' },
      recruiting: { label: '크리에이터 모집중', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-400' },
      guide_confirmation: { label: '가이드 확인중', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
      filming: { label: '콘텐츠 제작중', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-400' },
      editing: { label: '수정중', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400' },
      approved: { label: '진행중', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-400' },
      completed: { label: '캠페인 완료', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' }
    }
    return statuses[status] || statuses.draft
  }, [])

  const getRegionInfo = useCallback((region) => {
    const regions = {
      korea: { label: '한국', flag: '🇰🇷', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      japan: { label: '일본', flag: '🇯🇵', color: 'bg-red-50 text-red-700 border-red-200' },
      us: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      usa: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      taiwan: { label: '대만', flag: '🇹🇼', color: 'bg-green-50 text-green-700 border-green-200' }
    }
    return regions[region] || regions.korea
  }, [])

  // Memoized filters
  const regionFilters = useMemo(() => [
    { value: 'all', label: '전체' },
    { value: 'korea', label: '🇰🇷 한국' },
    { value: 'us', label: '🇺🇸 미국' },
    { value: 'japan', label: '🇯🇵 일본' }
  ], [])

  const statusFilters = useMemo(() => [
    { value: 'all', label: '전체' },
    { value: 'draft', label: '작성중' },
    { value: 'pending_payment', label: '입금확인중' },
    { value: 'pending', label: '승인요청중' },
    { value: 'recruiting', label: '모집중' },
    { value: 'in_progress', label: '진행중' },
    { value: 'completed', label: '완료' }
  ], [])

  // Memoized filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      if (searchQuery && !campaign.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedRegion !== 'all' && campaign.region !== selectedRegion) return false

      if (statsFilter && statsFilter !== 'all') {
        if (statsFilter === 'pending') return ['draft', 'pending', 'pending_payment'].includes(campaign.approval_status)
        if (statsFilter === 'active') return campaign.approval_status === 'approved' && campaign.status !== 'completed'
        if (statsFilter === 'completed') return campaign.status === 'completed'
      }

      if (selectedStatus !== 'all' && !statsFilter) {
        switch (selectedStatus) {
          case 'draft': return campaign.status === 'draft' || campaign.approval_status === 'draft'
          case 'pending_payment': return campaign.approval_status === 'pending_payment'
          case 'pending': return ['pending', 'pending_approval'].includes(campaign.approval_status)
          case 'recruiting': return campaign.approval_status === 'approved' && campaign.status !== 'completed'
          case 'in_progress': return campaign.status === 'in_progress' || campaign.progress_status === 'filming'
          case 'completed': return campaign.status === 'completed'
          default: return true
        }
      }
      return true
    })
  }, [campaigns, searchQuery, selectedRegion, statsFilter, selectedStatus])

  // Memoized stats
  const stats = useMemo(() => {
    const active = campaigns.filter(c => !c.is_cancelled)
    return {
      total: active.length,
      pending: active.filter(c => ['draft', 'pending', 'pending_payment'].includes(c.approval_status)).length,
      active: active.filter(c => c.approval_status === 'approved' && c.status !== 'completed').length,
      completed: active.filter(c => c.status === 'completed').length
    }
  }, [campaigns])

  // Get campaign thumbnail
  const getThumbnail = (campaign) => {
    return campaign.main_image || campaign.thumbnail || campaign.thumbnail_url || campaign.image_url || campaign.product_image || campaign.images?.[0] || null
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                내 캠페인
              </h1>
              <p className="text-gray-500 mt-2 text-base">인플루언서 마케팅 캠페인을 한눈에 관리하세요</p>
            </div>
            <Button onClick={() => setShowRegionModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 h-11 px-5">
              <Plus className="w-5 h-5 mr-2" />
              새 캠페인 등록
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { key: 'all', label: '전체 캠페인', value: stats.total, icon: FolderOpen, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
              { key: 'pending', label: '승인 대기', value: stats.pending, icon: Clock, color: 'amber', gradient: 'from-amber-500 to-orange-500' },
              { key: 'active', label: '진행중', value: stats.active, icon: Users, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
              { key: 'completed', label: '완료', value: stats.completed, icon: CheckCircle, color: 'violet', gradient: 'from-violet-500 to-purple-600' }
            ].map(({ key, label, value, icon: Icon, color, gradient }) => (
              <button
                key={key}
                onClick={() => setStatsFilter(statsFilter === key ? null : key)}
                className={`relative overflow-hidden bg-white rounded-2xl p-5 border transition-all duration-300 text-left group ${
                  statsFilter === key
                    ? `ring-2 ring-${color}-400 ring-offset-2 border-${color}-200 shadow-lg`
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">{label}</span>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className={`text-3xl font-bold text-gray-900`}>{value}</div>
                {statsFilter === key && (
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
                )}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="캠페인명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <Filter className="w-4 h-4" /> 국가
                </p>
                <div className="flex flex-wrap gap-2">
                  {regionFilters.map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setSelectedRegion(filter.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedRegion === filter.value
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">상태</p>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setSelectedStatus(filter.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedStatus === filter.value
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-gray-900">캠페인 목록</h2>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                  {filteredCampaigns.length}개
                </span>
                {statsFilter && (
                  <button
                    onClick={() => setStatsFilter(null)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    {statsFilter === 'all' && '전체'}{statsFilter === 'pending' && '승인 대기'}{statsFilter === 'active' && '진행중'}{statsFilter === 'completed' && '완료'}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <CampaignSkeleton key={i} />)}
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
                    <FolderOpen className="w-10 h-10 text-indigo-400" />
                  </div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    {campaigns.length === 0 ? '아직 등록된 캠페인이 없습니다' : '검색 결과가 없습니다'}
                  </p>
                  <p className="text-gray-500 mb-8">
                    {campaigns.length === 0 ? '첫 번째 인플루언서 마케팅 캠페인을 시작해보세요' : '다른 검색어나 필터를 시도해보세요'}
                  </p>
                  {campaigns.length === 0 && (
                    <Button onClick={() => setShowRegionModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 h-11 px-6">
                      <Plus className="w-5 h-5 mr-2" />
                      첫 캠페인 등록하기
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCampaigns.map((campaign) => {
                    const packagePrice = getPackagePrice(campaign.package_type, campaign.campaign_type)
                    const totalCost = Math.floor(packagePrice * (campaign.total_slots || 0) * 1.1)
                    const participantInfo = participants[campaign.id] || { total: 0, selected: 0, guideConfirmed: 0 }
                    const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline)
                    const typeInfo = getCampaignTypeInfo(campaign.campaign_type)
                    const statusInfo = getProgressStatusInfo(
                      campaign.status === 'active' && campaign.payment_status === 'confirmed' ? 'recruiting' : (campaign.progress_status || campaign.approval_status),
                      campaign.is_cancelled
                    )
                    const regionInfo = getRegionInfo(campaign.region)
                    const thumbnail = getThumbnail(campaign)

                    return (
                      <div
                        key={campaign.id}
                        className="group border border-gray-100 rounded-2xl p-4 md:p-5 hover:border-indigo-200 hover:shadow-xl cursor-pointer transition-all duration-300 bg-white hover:bg-gradient-to-r hover:from-white hover:to-indigo-50/30"
                        onClick={() => navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)}
                      >
                        <div className="flex gap-4 md:gap-5">
                          {/* Thumbnail */}
                          <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={campaign.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex flex-col items-center justify-center ${thumbnail ? 'hidden' : ''}`}>
                              <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-400">이미지 없음</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${regionInfo.color}`}>
                                {regionInfo.flag} {regionInfo.label}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${typeInfo.dotColor}`} />
                                {typeInfo.label}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor} animate-pulse`} />
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* Title & Info */}
                            <h3 className="font-bold text-gray-900 text-lg md:text-xl mb-1 truncate group-hover:text-indigo-600 transition-colors">
                              {campaign.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-3 truncate">
                              {campaign.brand && <span className="font-medium">{campaign.brand}</span>}
                              {campaign.brand && campaign.product_name && ' • '}
                              {campaign.product_name}
                            </p>

                            {/* Stats Row */}
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg text-sm">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-600">모집</span>
                                <span className="font-bold text-blue-600">{campaign.total_slots || 0}명</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg text-sm">
                                <UserCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-gray-600">지원</span>
                                <span className="font-bold text-emerald-600">{participantInfo.total}명</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-lg text-sm">
                                <CheckCircle className="w-4 h-4 text-violet-500" />
                                <span className="text-gray-600">확정</span>
                                <span className="font-bold text-violet-600">{participantInfo.selected}명</span>
                              </span>
                              {recruitmentDays !== null && recruitmentDays >= 0 && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                                  recruitmentDays <= 3 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <Calendar className={`w-4 h-4 ${recruitmentDays <= 3 ? 'text-red-500' : 'text-gray-500'}`} />
                                  D-{recruitmentDays}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price & Action */}
                          <div className="hidden md:flex flex-col items-end justify-between flex-shrink-0">
                            <div className="text-right">
                              <div className="text-xs text-gray-400 mb-1">예상 비용</div>
                              <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {totalCost.toLocaleString()}원
                              </div>
                              <div className="text-xs text-gray-400 mt-1">{campaign.package_type || '패키지 미선택'}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 gap-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)
                              }}
                            >
                              상세보기
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Mobile Price */}
                        <div className="md:hidden flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                          <div>
                            <span className="text-xs text-gray-400">예상 비용</span>
                            <div className="text-lg font-bold text-indigo-600">{totalCost.toLocaleString()}원</div>
                          </div>
                          <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                            상세보기 <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>

                        {/* Deposit Alert */}
                        {campaign.payment_status === 'pending' && !campaign.is_cancelled && (
                          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
                            <p className="text-sm text-amber-700 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>입금 확인이 완료되지 않았습니다</span>
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-400 text-amber-700 hover:bg-amber-100 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDepositConfirmationRequest(campaign)
                              }}
                            >
                              입금 확인 요청
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {showRegionModal && <RegionSelectModal onClose={() => setShowRegionModal(false)} />}
        </div>
      </div>
    </>
  )
}
