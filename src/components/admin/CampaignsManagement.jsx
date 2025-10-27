import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Search, ArrowLeft, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import { supabaseBiz, getCampaignsFromAllRegions } from '../../lib/supabaseClients'

export default function CampaignsManagement() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCampaigns()
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

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchCampaigns = async () => {
    console.log('[CampaignsManagement] Starting to fetch campaigns...')
    setLoading(true)
    try {
      const allCampaigns = await getCampaignsFromAllRegions()
      console.log('[CampaignsManagement] Fetched campaigns:', allCampaigns.length)
      setCampaigns(allCampaigns)
    } catch (error) {
      console.error('[CampaignsManagement] Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = searchTerm === '' ||
      campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRegion = selectedRegion === 'all' || campaign.region === selectedRegion
    
    // 상태별 필터링 로직 개선
    let matchesStatus = true
    if (selectedStatus !== 'all') {
      switch (selectedStatus) {
        case 'draft':
          matchesStatus = campaign.status === 'draft' || campaign.approval_status === 'draft'
          break
        case 'pending_payment':
          matchesStatus = campaign.approval_status === 'pending_payment'
          break
        case 'pending':
          matchesStatus = campaign.approval_status === 'pending'
          break
        case 'recruiting':
          matchesStatus = campaign.approval_status === 'approved' && campaign.status !== 'completed'
          break
        case 'guide_review':
          matchesStatus = campaign.status === 'guide_review'
          break
        case 'in_progress':
          matchesStatus = campaign.status === 'in_progress' || campaign.status === 'active'
          break
        case 'revision':
          matchesStatus = campaign.approval_status === 'rejected' || campaign.status === 'revision'
          break
        case 'completed':
          matchesStatus = campaign.status === 'completed'
          break
        default:
          matchesStatus = true
      }
    }

    return matchesSearch && matchesRegion && matchesStatus
  })

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-gray-100 text-gray-700'
    }
    const labels = {
      pending: '대기중',
      approved: '승인',
      rejected: '거부',
      active: '진행중',
      completed: '완료'
    }
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      active: TrendingUp,
      completed: CheckCircle
    }
    const Icon = icons[status] || Clock

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        <Icon className="w-3 h-3" />
        {labels[status] || status}
      </span>
    )
  }

  const getRegionBadge = (region) => {
    const badges = {
      korea: 'bg-blue-100 text-blue-700',
      japan: 'bg-red-100 text-red-700',
      us: 'bg-purple-100 text-purple-700',
      usa: 'bg-purple-100 text-purple-700',
      taiwan: 'bg-green-100 text-green-700'
    }
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국',
      usa: '🇺🇸 미국',
      taiwan: '🇹🇼 대만'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[region] || 'bg-gray-100 text-gray-700'}`}>
        {labels[region] || region}
      </span>
    )
  }

  const stats = {
    total: campaigns.length,
    pending: campaigns.filter(c => c.status === 'pending' || c.approval_status === 'pending').length,
    active: campaigns.filter(c => c.status === 'active' || c.approval_status === 'approved').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">캠페인 관리</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">전체 캠페인</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">대기중</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">진행중</div>
              <div className="text-3xl font-bold text-blue-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">완료</div>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Region Tabs */}
        <Tabs value={selectedRegion} onValueChange={setSelectedRegion} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="korea">한국 🇰🇷</TabsTrigger>
            <TabsTrigger value="japan">일본 🇯🇵</TabsTrigger>
            <TabsTrigger value="us">미국 🇺🇸</TabsTrigger>
            <TabsTrigger value="taiwan">대만 🇹🇼</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Status Tabs */}
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="mb-6">
          <TabsList className="grid w-full grid-cols-9 gap-1">
            <TabsTrigger value="all" className="text-xs px-2">전체</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs px-2">작성중</TabsTrigger>
            <TabsTrigger value="pending_payment" className="text-xs px-2">입금확인중</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2">승인요청중</TabsTrigger>
            <TabsTrigger value="recruiting" className="text-xs px-2">모집중</TabsTrigger>
            <TabsTrigger value="guide_review" className="text-xs px-2">가이드검토중</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-2">촬영중</TabsTrigger>
            <TabsTrigger value="revision" className="text-xs px-2">수정중</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2">최종완료</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="캠페인 제목, 설명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>캠페인 목록 ({filteredCampaigns.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                {filteredCampaigns.map((campaign) => (
                  <div
                    key={`${campaign.region}-${campaign.id}`}
                    className="p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{campaign.campaign_name || campaign.title || campaign.product_name || '제목 없음'}</h3>
                          {getRegionBadge(campaign.region)}
                          {getStatusBadge(campaign.approval_status || campaign.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {campaign.description || '설명 없음'}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">예산:</span> {campaign.budget?.toLocaleString()}원
                          </div>
                          <div>
                            <span className="font-medium">크리에이터:</span> {campaign.creator_count || 0}명
                          </div>
                          <div>
                            <span className="font-medium">기간:</span>{' '}
                            {campaign.start_date && new Date(campaign.start_date).toLocaleDateString('ko-KR')}
                          </div>
                          <div>
                            <span className="font-medium">생성일:</span>{' '}
                            {new Date(campaign.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/company/campaigns/${campaign.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredCampaigns.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm || selectedRegion !== 'all' || selectedStatus !== 'all'
                      ? '검색 결과가 없습니다'
                      : '등록된 캠페인이 없습니다'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

