import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  UserCheck,
  FolderOpen,
  Search,
  Filter,
  Star,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Instagram,
  Youtube,
  Video,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Calendar,
  Award,
  TrendingUp,
  Sparkles,
  UserPlus,
  MapPin
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import CompanyNavigation from './CompanyNavigation'

// SNS URL 정규화 함수 - @id 또는 id만 있으면 전체 URL로 변환
const normalizeInstagramUrl = (handle) => {
  if (!handle) return null
  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    return handle
  }
  const cleanHandle = handle.replace(/^@/, '').trim()
  if (!cleanHandle) return null
  return `https://www.instagram.com/${cleanHandle}`
}

const normalizeYoutubeUrl = (handle) => {
  if (!handle) return null
  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    return handle
  }
  const cleanHandle = handle.replace(/^@/, '').trim()
  if (!cleanHandle) return null
  return `https://www.youtube.com/@${cleanHandle}`
}

const normalizeTiktokUrl = (handle) => {
  if (!handle) return null
  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    return handle
  }
  const cleanHandle = handle.replace(/^@/, '').trim()
  if (!cleanHandle) return null
  return `https://www.tiktok.com/@${cleanHandle}`
}

// Skeleton loader for creator cards
const CreatorCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-200" />
    <div className="p-4">
      <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
      </div>
    </div>
  </div>
)

export default function CreatorManagement() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('applied') // applied, campaign, recommended
  const [creators, setCreators] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // 정렬 상태
  const [sortBy, setSortBy] = useState('latest') // latest, followers

  // 캠페인별 보기 서브탭
  const [campaignSubTab, setCampaignSubTab] = useState('all') // all, selected, completed

  // 프로필 모달 상태
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      // 탭 전환 시 크리에이터 목록 초기화
      setCreators([])
      fetchData()
    }
  }, [user, activeTab, selectedCampaign])

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
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // 캠페인 목록 가져오기 (supabaseKorea가 없으면 supabaseBiz 사용)
      const client = supabaseKorea || supabaseBiz
      const { data: campaignsData } = await client
        .from('campaigns')
        .select('id, title, campaign_type, status, main_image, thumbnail')
        .eq('company_email', user.email)
        .order('created_at', { ascending: false })

      setCampaigns(campaignsData || [])

      // 탭에 따라 크리에이터 데이터 가져오기
      if (activeTab === 'applied') {
        await fetchAppliedCreators(campaignsData || [])
      } else if (activeTab === 'campaign' && selectedCampaign) {
        await fetchCampaignCreators(selectedCampaign)
      } else if (activeTab === 'recommended') {
        await fetchRecommendedCreators()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAppliedCreators = async (campaignsList) => {
    if (!campaignsList || campaignsList.length === 0) {
      setCreators([])
      return
    }

    try {
      const client = supabaseKorea || supabaseBiz
      const { data: applications, error } = await client
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          campaign_id,
          campaigns (id, title, main_image, thumbnail),
          creator_id,
          name,
          instagram_handle,
          instagram_followers,
          youtube_handle,
          youtube_followers,
          tiktok_handle,
          profile_image_url,
          phone,
          email
        `)
        .in('campaign_id', campaignsList.map(c => c.id))
        .order('created_at', { ascending: false })

      if (error) throw error

      if (applications && applications.length > 0) {
        const formattedCreators = applications.map(app => ({
          id: app.id,
          creatorId: app.creator_id,
          name: app.name || '이름 없음',
          handle: app.instagram_handle ? `@${app.instagram_handle.replace(/^@/, '')}` : (app.tiktok_handle ? `@${app.tiktok_handle.replace(/^@/, '')}` : ''),
          avatar: app.profile_image_url || null,
          followers: app.instagram_followers || app.youtube_followers || 0,
          instagram: normalizeInstagramUrl(app.instagram_handle),
          youtube: normalizeYoutubeUrl(app.youtube_handle),
          tiktok: normalizeTiktokUrl(app.tiktok_handle),
          instagramHandle: app.instagram_handle?.replace(/^@/, ''),
          youtubeHandle: app.youtube_handle?.replace(/^@/, ''),
          tiktokHandle: app.tiktok_handle?.replace(/^@/, ''),
          phone: app.phone,
          email: app.email,
          campaignId: app.campaign_id,
          campaignTitle: app.campaigns?.title,
          campaignImage: app.campaigns?.main_image || app.campaigns?.thumbnail,
          applicationStatus: app.status,
          appliedAt: app.created_at,
          isSelected: ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed'].includes(app.status)
        }))
        setCreators(formattedCreators)
      } else {
        setCreators([])
      }
    } catch (error) {
      console.error('Error fetching applied creators:', error)
      setCreators([])
    }
  }

  const fetchCampaignCreators = async (campaignId) => {
    try {
      const client = supabaseKorea || supabaseBiz
      const { data: applications, error } = await client
        .from('applications')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (applications && applications.length > 0) {
        const formattedCreators = applications.map(app => ({
          id: app.id,
          creatorId: app.creator_id,
          name: app.name || '이름 없음',
          handle: app.instagram_handle ? `@${app.instagram_handle.replace(/^@/, '')}` : (app.tiktok_handle ? `@${app.tiktok_handle.replace(/^@/, '')}` : ''),
          avatar: app.profile_image_url || null,
          followers: app.instagram_followers || app.youtube_followers || 0,
          instagram: normalizeInstagramUrl(app.instagram_handle),
          youtube: normalizeYoutubeUrl(app.youtube_handle),
          tiktok: normalizeTiktokUrl(app.tiktok_handle),
          instagramHandle: app.instagram_handle?.replace(/^@/, ''),
          youtubeHandle: app.youtube_handle?.replace(/^@/, ''),
          tiktokHandle: app.tiktok_handle?.replace(/^@/, ''),
          phone: app.phone,
          email: app.email,
          applicationStatus: app.status,
          appliedAt: app.created_at,
          isSelected: ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed'].includes(app.status),
          isCompleted: app.status === 'completed'
        }))
        setCreators(formattedCreators)
      } else {
        setCreators([])
      }
    } catch (error) {
      console.error('Error fetching campaign creators:', error)
      setCreators([])
    }
  }

  const fetchRecommendedCreators = async () => {
    try {
      // cnec_grade_level >= 2 (GLOW 이상)만 표시
      // 1 = FRESH, 2 = GLOW, 3 = BLOOM, 4 = ICONIC, 5 = MUSE
      const { data: featuredCreators, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .eq('is_active', true)
        .gte('cnec_grade_level', 2)
        .order('cnec_grade_level', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      if (featuredCreators && featuredCreators.length > 0) {
        const formattedCreators = featuredCreators.map(creator => ({
          id: creator.id,
          name: creator.name || creator.creator_name || '이름 없음',
          handle: creator.instagram_handle ? `@${creator.instagram_handle.replace(/^@/, '')}` : '',
          avatar: creator.profile_image || creator.thumbnail_url || null,
          followers: creator.followers || 0,
          collaborationCount: creator.collaboration_count || 0,
          isRecommended: true,
          isFeatured: creator.featured_type === 'ai_recommended' || creator.is_featured === true,
          instagram: normalizeInstagramUrl(creator.instagram_handle),
          youtube: normalizeYoutubeUrl(creator.youtube_handle),
          tiktok: normalizeTiktokUrl(creator.tiktok_handle),
          instagramHandle: creator.instagram_handle?.replace(/^@/, ''),
          youtubeHandle: creator.youtube_handle?.replace(/^@/, ''),
          tiktokHandle: creator.tiktok_handle?.replace(/^@/, ''),
          evaluationScore: creator.evaluation_score,
          categories: creator.categories || [],
          regions: creator.regions || [],
          skinType: creator.skin_type || null
        }))
        setCreators(formattedCreators)
      } else {
        setCreators([])
      }
    } catch (error) {
      console.error('Error fetching featured creators:', error)
      setCreators([])
    }
  }

  // Filter and sort creators
  const filteredCreators = useMemo(() => {
    let filtered = creators

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.handle?.toLowerCase().includes(query) ||
        c.campaignTitle?.toLowerCase().includes(query)
      )
    }

    // Status filter for applied/campaign tabs
    if (statusFilter !== 'all' && (activeTab === 'applied' || activeTab === 'campaign')) {
      switch (statusFilter) {
        case 'selected':
          filtered = filtered.filter(c => c.isSelected)
          break
        case 'pending':
          filtered = filtered.filter(c => !c.isSelected && c.applicationStatus !== 'rejected')
          break
        case 'completed':
          filtered = filtered.filter(c => c.applicationStatus === 'completed')
          break
      }
    }

    // Campaign sub-tab filter
    if (activeTab === 'campaign' && selectedCampaign) {
      switch (campaignSubTab) {
        case 'selected':
          filtered = filtered.filter(c => c.isSelected)
          break
        case 'completed':
          filtered = filtered.filter(c => c.isCompleted)
          break
      }
    }

    // Sort
    if (sortBy === 'followers') {
      filtered = [...filtered].sort((a, b) => (b.followers || 0) - (a.followers || 0))
    }

    return filtered
  }, [creators, searchQuery, statusFilter, sortBy, activeTab, campaignSubTab, selectedCampaign])

  // Stats
  const stats = useMemo(() => {
    const total = creators.length
    const selected = creators.filter(c => c.isSelected).length
    const pending = creators.filter(c => !c.isSelected && c.applicationStatus !== 'rejected').length
    const completed = creators.filter(c => c.applicationStatus === 'completed').length
    return { total, selected, pending, completed }
  }, [creators])

  const formatFollowers = (num) => {
    if (!num) return '0'
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`
    return num.toLocaleString()
  }

  const getStatusInfo = (status) => {
    const statuses = {
      pending: { label: '검토중', color: 'bg-yellow-100 text-yellow-700' },
      selected: { label: '선정됨', color: 'bg-green-100 text-green-700' },
      approved: { label: '선정됨', color: 'bg-green-100 text-green-700' },
      virtual_selected: { label: '가선정', color: 'bg-blue-100 text-blue-700' },
      filming: { label: '촬영중', color: 'bg-purple-100 text-purple-700' },
      video_submitted: { label: '영상 제출', color: 'bg-indigo-100 text-indigo-700' },
      revision_requested: { label: '수정 요청', color: 'bg-orange-100 text-orange-700' },
      completed: { label: '완료', color: 'bg-emerald-100 text-emerald-700' },
      rejected: { label: '미선정', color: 'bg-red-100 text-red-700' }
    }
    return statuses[status] || { label: status || '대기', color: 'bg-gray-100 text-gray-700' }
  }

  const tabs = [
    { id: 'applied', label: '지원한 크리에이터', icon: UserCheck, count: stats.total },
    { id: 'campaign', label: '캠페인별 보기', icon: FolderOpen },
    { id: 'recommended', label: '크넥 추천', icon: Sparkles }
  ]

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Users className="w-6 h-6 text-white" />
              </div>
              크리에이터 현황
            </h1>
            <p className="text-gray-500 mt-2">캠페인에 지원한 크리에이터를 확인하고 관리하세요</p>
          </div>

          {/* Stats Cards */}
          {(activeTab === 'applied' || activeTab === 'campaign') && creators.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '전체 지원자', value: stats.total, icon: Users, color: 'blue', filter: 'all' },
                { label: '선정됨', value: stats.selected, icon: CheckCircle, color: 'green', filter: 'selected' },
                { label: '검토중', value: stats.pending, icon: Clock, color: 'yellow', filter: 'pending' },
                { label: '완료', value: stats.completed, icon: Award, color: 'emerald', filter: 'completed' }
              ].map(stat => (
                <button
                  key={stat.label}
                  onClick={() => setStatusFilter(statusFilter === stat.filter ? 'all' : stat.filter)}
                  className={`bg-white rounded-xl p-4 border transition-all text-left ${
                    statusFilter === stat.filter
                      ? `ring-2 ring-${stat.color}-400 border-${stat.color}-200 shadow-lg`
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{stat.label}</span>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-1.5 mb-6 inline-flex shadow-sm">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setStatusFilter('all')
                    if (tab.id !== 'campaign') {
                      setSelectedCampaign(null)
                    }
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                    ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Campaign Selector (캠페인별 보기) */}
          {activeTab === 'campaign' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                캠페인 선택
              </label>
              <select
                value={selectedCampaign || ''}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full md:w-96 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">캠페인을 선택하세요</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>

              {/* 캠페인별 서브탭 */}
              {selectedCampaign && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  {[
                    { id: 'all', label: '전체' },
                    { id: 'selected', label: '선정된 크리에이터' },
                    { id: 'completed', label: '완료' }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setCampaignSubTab(sub.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        campaignSubTab === sub.id
                          ? 'bg-violet-100 text-violet-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="크리에이터 이름 또는 핸들로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">정렬</span>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {[
                    { id: 'latest', label: '최신순' },
                    { id: 'followers', label: '팔로워순' }
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => setSortBy(sort.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sortBy === sort.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Creator Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              [...Array(8)].map((_, i) => <CreatorCardSkeleton key={i} />)
            ) : filteredCreators.length === 0 ? (
              <div className="col-span-full">
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                    {activeTab === 'recommended' ? (
                      <Sparkles className="w-10 h-10 text-violet-400" />
                    ) : (
                      <Users className="w-10 h-10 text-violet-400" />
                    )}
                  </div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    {activeTab === 'applied' && '아직 지원한 크리에이터가 없습니다'}
                    {activeTab === 'campaign' && (selectedCampaign ? '해당 캠페인에 지원자가 없습니다' : '캠페인을 선택해주세요')}
                    {activeTab === 'recommended' && '추천 크리에이터가 준비중입니다'}
                  </p>
                  <p className="text-gray-500">
                    {activeTab === 'applied' && '캠페인을 활성화하면 크리에이터들이 지원합니다'}
                    {activeTab === 'campaign' && !selectedCampaign && '상단에서 캠페인을 선택하세요'}
                    {activeTab === 'recommended' && '곧 크넥에서 선별한 우수 크리에이터를 추천해드립니다'}
                  </p>
                </div>
              </div>
            ) : (
              filteredCreators.map(creator => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  activeTab={activeTab}
                  formatFollowers={formatFollowers}
                  getStatusInfo={getStatusInfo}
                  onViewProfile={() => {
                    setSelectedCreatorProfile(creator)
                    setShowProfileModal(true)
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 프로필 모달 */}
      {showProfileModal && selectedCreatorProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">크리에이터 프로필</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* 프로필 내용 */}
            <div className="p-6">
              {/* 프로필 이미지 & 기본 정보 */}
              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                  {selectedCreatorProfile.avatar ? (
                    <img
                      src={selectedCreatorProfile.avatar}
                      alt={selectedCreatorProfile.name}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-violet-100"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                      <Users className="w-10 h-10 text-violet-400" />
                    </div>
                  )}
                  {selectedCreatorProfile.isRecommended && (
                    <span className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-medium rounded-full flex items-center gap-1 shadow-lg">
                      <Star className="w-3 h-3" />
                      추천
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedCreatorProfile.name}</h3>
                  {selectedCreatorProfile.handle && (
                    <p className="text-gray-500 text-sm mb-2">{selectedCreatorProfile.handle}</p>
                  )}
                  {selectedCreatorProfile.campaignTitle && (
                    <p className="text-xs text-violet-600 flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />
                      {selectedCreatorProfile.campaignTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* 통계 정보 */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 text-center">
                  <Users className="w-5 h-5 text-pink-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{formatFollowers(selectedCreatorProfile.followers)}</div>
                  <div className="text-xs text-gray-500">팔로워</div>
                </div>
                {selectedCreatorProfile.collaborationCount !== undefined && (
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 text-center">
                    <Award className="w-5 h-5 text-violet-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{selectedCreatorProfile.collaborationCount}</div>
                    <div className="text-xs text-gray-500">협업 횟수</div>
                  </div>
                )}
                {selectedCreatorProfile.evaluationScore && (
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 text-center">
                    <Star className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{selectedCreatorProfile.evaluationScore}</div>
                    <div className="text-xs text-gray-500">평가점수</div>
                  </div>
                )}
              </div>

              {/* 피부타입 정보 */}
              {selectedCreatorProfile.skinType && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">피부타입</h4>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-white/70 text-rose-700 rounded-full text-sm font-medium border border-rose-200">
                      {selectedCreatorProfile.skinType}
                    </span>
                  </div>
                </div>
              )}

              {/* 주력 카테고리 */}
              {selectedCreatorProfile.categories && selectedCreatorProfile.categories.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">주력 카테고리</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCreatorProfile.categories.map((cat, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SNS 링크 */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">SNS</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedCreatorProfile.instagram && (
                    <a
                      href={selectedCreatorProfile.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl hover:from-pink-100 hover:to-rose-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                        <Instagram className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Instagram</div>
                        <div className="text-sm text-gray-500">@{selectedCreatorProfile.instagramHandle || '프로필 보기'}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                  {selectedCreatorProfile.youtube && (
                    <a
                      href={selectedCreatorProfile.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                        <Youtube className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">YouTube</div>
                        <div className="text-sm text-gray-500">@{selectedCreatorProfile.youtubeHandle || '채널 보기'}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                  {selectedCreatorProfile.tiktok && (
                    <a
                      href={selectedCreatorProfile.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">TikTok</div>
                        <div className="text-sm text-gray-500">@{selectedCreatorProfile.tiktokHandle || '프로필 보기'}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                  {!selectedCreatorProfile.instagram && !selectedCreatorProfile.youtube && !selectedCreatorProfile.tiktok && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      등록된 SNS가 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 크리에이터 카드 컴포넌트
function CreatorCard({ creator, activeTab, formatFollowers, getStatusInfo, onViewProfile }) {
  const statusInfo = getStatusInfo(creator.applicationStatus)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-violet-200 transition-all duration-300 group">
      {/* 프로필 이미지 영역 */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
        {creator.avatar ? (
          <img
            src={creator.avatar}
            alt={creator.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div className={`w-full h-full flex flex-col items-center justify-center ${creator.avatar ? 'hidden' : ''}`}>
          <Users className="w-12 h-12 text-gray-400 mb-2" />
          <span className="text-sm text-gray-400">이미지 없음</span>
        </div>

        {/* 추천 배지 */}
        {creator.isRecommended && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium rounded-full flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3" />
            크넥 추천
          </span>
        )}

        {/* 상태 배지 (지원한 크리에이터) */}
        {activeTab !== 'recommended' && creator.applicationStatus && (
          <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        )}

        {/* SNS 아이콘 */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {creator.instagram && (
            <a
              href={creator.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram className="w-4 h-4 text-pink-500" />
            </a>
          )}
          {creator.youtube && (
            <a
              href={creator.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <Youtube className="w-4 h-4 text-red-500" />
            </a>
          )}
          {creator.tiktok && (
            <a
              href={creator.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <Video className="w-4 h-4 text-black" />
            </a>
          )}
        </div>
      </div>

      {/* 크리에이터 정보 */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-lg">{creator.name}</h3>
          {creator.handle && (
            <p className="text-sm text-gray-500">{creator.handle}</p>
          )}
          {activeTab === 'applied' && creator.campaignTitle && (
            <p className="text-xs text-violet-600 mt-1.5 flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {creator.campaignTitle}
            </p>
          )}
        </div>

        {/* 통계 */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">팔로워</span>
            <span className="font-semibold text-gray-900">{formatFollowers(creator.followers)}</span>
          </div>
          {activeTab === 'recommended' && creator.collaborationCount !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">협업 횟수</span>
              <span className="font-semibold text-violet-600">{creator.collaborationCount}회</span>
            </div>
          )}
          {creator.appliedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">지원일</span>
              <span className="text-gray-600">
                {new Date(creator.appliedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2">
          <button
            onClick={onViewProfile}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-md"
          >
            <Eye className="w-4 h-4" />
            프로필 보기
          </button>
        </div>
      </div>
    </div>
  )
}
