import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Heart,
  UserCheck,
  FolderOpen,
  Search,
  Filter,
  Star,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Instagram,
  Youtube,
  Video,
  ChevronDown,
  X,
  Download,
  Copy,
  CheckCircle,
  Clock,
  Play
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import CompanyNavigation from './CompanyNavigation'

export default function CreatorManagement() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('saved') // saved, applied, campaign
  const [creators, setCreators] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 필터 상태
  const [filters, setFilters] = useState({
    recommended: false,
    newbie: false
  })

  // 정렬 상태
  const [sortBy, setSortBy] = useState('saved') // saved, followers, selected

  // 캠페인별 보기 서브탭
  const [campaignSubTab, setCampaignSubTab] = useState('selected') // selected, postings

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
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
      // 캠페인 목록 가져오기
      const { data: campaignsData } = await supabaseKorea
        .from('campaigns')
        .select('id, title, campaign_type, status')
        .eq('company_email', user.email)
        .order('created_at', { ascending: false })

      setCampaigns(campaignsData || [])

      // 탭에 따라 크리에이터 데이터 가져오기
      if (activeTab === 'saved') {
        await fetchSavedCreators()
      } else if (activeTab === 'applied') {
        await fetchAppliedCreators()
      } else if (activeTab === 'campaign' && selectedCampaign) {
        await fetchCampaignCreators(selectedCampaign)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedCreators = async () => {
    // 통합관리자에서 등록한 추천 크리에이터 목록 가져오기
    try {
      const { data: featuredCreators, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (featuredCreators && featuredCreators.length > 0) {
        const formattedCreators = featuredCreators.map(creator => ({
          id: creator.id,
          name: creator.name || creator.creator_name || '이름 없음',
          handle: creator.instagram_handle ? `@${creator.instagram_handle}` : '',
          avatar: creator.profile_image || creator.thumbnail_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          followers: creator.followers || 0,
          selectedCount: creator.collaboration_count || 0,
          applyingCount: 0,
          isRecommended: creator.featured_type === 'ai_recommended' || creator.is_featured === true,
          isNewbie: creator.is_new || false,
          isSaved: false,
          instagram: creator.instagram_handle ? `https://instagram.com/${creator.instagram_handle}` : null,
          youtube: creator.youtube_handle ? `https://youtube.com/@${creator.youtube_handle}` : null,
          tiktok: creator.tiktok_handle ? `https://tiktok.com/@${creator.tiktok_handle}` : null,
          evaluationScore: creator.evaluation_score,
          categories: creator.categories || [],
          regions: creator.regions || []
        }))
        setCreators(formattedCreators)
      } else {
        // 데이터가 없을 경우 데모 데이터 표시
        setCreators([
          {
            id: 'demo-1',
            name: '크넥 추천 크리에이터',
            handle: '@cnec_creator',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            followers: 50000,
            selectedCount: 0,
            applyingCount: 0,
            isRecommended: true,
            isNewbie: false,
            isSaved: false,
            instagram: null,
            youtube: null,
            tiktok: null
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching featured creators:', error)
      setCreators([])
    }
  }

  const fetchAppliedCreators = async () => {
    // 지원한 크리에이터 목록 가져오기
    try {
      const { data: applications } = await supabaseKorea
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          campaign_id,
          campaigns (id, title),
          creator_id,
          name,
          instagram_handle,
          instagram_followers,
          youtube_handle,
          youtube_followers,
          tiktok_handle,
          profile_image_url
        `)
        .in('campaign_id', campaigns.map(c => c.id))
        .order('created_at', { ascending: false })

      if (applications && applications.length > 0) {
        const formattedCreators = applications.map(app => ({
          id: app.id,
          name: app.name || '이름 없음',
          handle: app.instagram_handle ? `@${app.instagram_handle}` : '',
          avatar: app.profile_image_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          followers: app.instagram_followers || 0,
          selectedCount: 0,
          applyingCount: 1,
          isRecommended: false,
          isNewbie: false,
          isSaved: false,
          instagram: app.instagram_handle ? `https://instagram.com/${app.instagram_handle}` : null,
          youtube: app.youtube_handle ? `https://youtube.com/@${app.youtube_handle}` : null,
          tiktok: app.tiktok_handle ? `https://tiktok.com/@${app.tiktok_handle}` : null,
          campaignTitle: app.campaigns?.title,
          applicationStatus: app.status
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
      const { data: applications } = await supabaseKorea
        .from('applications')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (applications) {
        const formattedCreators = applications.map(app => ({
          id: app.id,
          name: app.name || '이름 없음',
          handle: app.instagram_handle ? `@${app.instagram_handle}` : '',
          avatar: app.profile_image_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          followers: app.instagram_followers || 0,
          selectedCount: 0,
          applyingCount: 0,
          isRecommended: false,
          isNewbie: false,
          isSaved: false,
          instagram: app.instagram_handle ? `https://instagram.com/${app.instagram_handle}` : null,
          youtube: app.youtube_handle ? `https://youtube.com/@${app.youtube_handle}` : null,
          tiktok: app.tiktok_handle ? `https://tiktok.com/@${app.tiktok_handle}` : null,
          applicationStatus: app.status,
          isSelected: ['selected', 'approved', 'virtual_selected'].includes(app.status)
        }))
        setCreators(formattedCreators)
      }
    } catch (error) {
      console.error('Error fetching campaign creators:', error)
      setCreators([])
    }
  }

  const toggleSaveCreator = (creatorId) => {
    setCreators(prev => prev.map(c =>
      c.id === creatorId ? { ...c, isSaved: !c.isSaved } : c
    ))
  }

  const filteredCreators = creators.filter(creator => {
    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!creator.name.toLowerCase().includes(query) &&
          !creator.handle.toLowerCase().includes(query)) {
        return false
      }
    }

    // 추천 필터
    if (filters.recommended && !creator.isRecommended) {
      return false
    }

    // 신입 필터
    if (filters.newbie && !creator.isNewbie) {
      return false
    }

    return true
  })

  // 정렬
  const sortedCreators = [...filteredCreators].sort((a, b) => {
    if (sortBy === 'followers') {
      return b.followers - a.followers
    }
    if (sortBy === 'selected') {
      return b.selectedCount - a.selectedCount
    }
    return 0 // 저장순은 기본 순서 유지
  })

  const formatFollowers = (num) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}만`
    }
    return num.toLocaleString()
  }

  const tabs = [
    { id: 'saved', label: '크넥 추천 크리에이터', icon: Star },
    { id: 'applied', label: '지원한 크리에이터', icon: UserCheck },
    { id: 'campaign', label: '캠페인별 보기', icon: FolderOpen }
  ]

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-[#F9FAFB] lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              크리에이터 현황
            </h1>
            <p className="text-gray-500 mt-1 ml-13">캠페인에 지원한 크리에이터를 확인하고 관리하세요</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-100 p-1 mb-6 inline-flex">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    if (tab.id !== 'campaign') {
                      setSelectedCampaign(null)
                    }
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                    ${activeTab === tab.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Campaign Selector (캠페인별 보기) */}
          {activeTab === 'campaign' && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                캠페인 선택
              </label>
              <select
                value={selectedCampaign || ''}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full md:w-96 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <div className="flex gap-2 mt-4 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setCampaignSubTab('selected')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      campaignSubTab === 'selected'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    선정한 인플루언서
                  </button>
                  <button
                    onClick={() => setCampaignSubTab('postings')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      campaignSubTab === 'postings'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    포스팅
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search & Filters */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="크리에이터 이름 또는 핸들 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Filters */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  필터
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.recommended}
                    onChange={(e) => setFilters(prev => ({ ...prev, recommended: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">크넥 추천</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.newbie}
                    onChange={(e) => setFilters(prev => ({ ...prev, newbie: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">신규 크리에이터</span>
                </label>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">정렬</span>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {[
                    { id: 'saved', label: '최신순' },
                    { id: 'followers', label: '팔로워순' },
                    { id: 'selected', label: '협업 많은 순' }
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => setSortBy(sort.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-16">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">크리에이터를 불러오는 중...</p>
              </div>
            ) : sortedCreators.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-600 mb-2">
                  {activeTab === 'saved' && '저장한 크리에이터가 없습니다'}
                  {activeTab === 'applied' && '지원한 크리에이터가 없습니다'}
                  {activeTab === 'campaign' && (selectedCampaign ? '해당 캠페인에 지원자가 없습니다' : '캠페인을 선택해주세요')}
                </p>
              </div>
            ) : (
              sortedCreators.map(creator => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  onToggleSave={() => toggleSaveCreator(creator.id)}
                  showApplyPrice={activeTab === 'applied'}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// 크리에이터 카드 컴포넌트
function CreatorCard({ creator, onToggleSave, showApplyPrice }) {
  const [showMessage, setShowMessage] = useState(false)

  const formatFollowers = (num) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}만`
    }
    return num.toLocaleString()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all">
      {/* 프로필 이미지 영역 */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={creator.avatar}
          alt={creator.name}
          className="w-full h-full object-cover"
        />

        {/* 추천 배지 */}
        {creator.isRecommended && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-indigo-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />
            크넥 추천
          </span>
        )}

        {/* 신규 배지 */}
        {creator.isNewbie && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
            신규
          </span>
        )}

        {/* SNS 아이콘 */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {creator.instagram && (
            <a
              href={creator.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
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
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
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
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <Video className="w-4 h-4 text-black" />
            </a>
          )}
        </div>

        {/* 지원 메시지 보기 버튼 (지원한 크리에이터) */}
        {showApplyPrice && (
          <button
            onClick={() => setShowMessage(!showMessage)}
            className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-full text-gray-700 hover:bg-white transition-colors"
          >
            지원 메시지 보기
          </button>
        )}
      </div>

      {/* 크리에이터 정보 */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900">{creator.name}</h3>
          <p className="text-sm text-gray-500">{creator.handle}</p>
          {showApplyPrice && creator.campaignTitle && (
            <p className="text-xs text-indigo-600 mt-1">{creator.campaignTitle}</p>
          )}
        </div>

        {/* 통계 */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">팔로워</span>
            <span className="font-medium text-gray-900">{formatFollowers(creator.followers)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">협업 횟수</span>
            <span className={`font-medium ${creator.selectedCount > 0 ? 'text-indigo-600' : 'text-gray-900'}`}>
              {creator.selectedCount}회
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">지원 중인 캠페인</span>
            <span className="font-medium text-gray-900">{creator.applyingCount}건</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2">
          {creator.instagram && (
            <a
              href={creator.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <Instagram className="w-4 h-4" />
              인스타그램 보기
            </a>
          )}

          <button
            onClick={onToggleSave}
            className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              creator.isSaved
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {creator.isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4" />
                관심 크리에이터
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                관심 등록
              </>
            )}
          </button>

          <button className="w-full text-sm text-indigo-600 hover:text-indigo-700 py-2">
            캠페인 참여 요청하기
          </button>
        </div>
      </div>
    </div>
  )
}
