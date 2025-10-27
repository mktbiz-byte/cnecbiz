import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Eye, TrendingUp } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { supabase as supabaseKorea } from '../../lib/supabaseKorea'
import RegionSelectModal from './RegionSelectModal'

export default function MyCampaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRegionModal, setShowRegionModal] = useState(false)

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

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
      fetchCampaigns(companyData.id)
    }
  }

  const fetchCampaigns = async (companyId) => {
    setLoading(true)
    try {
      // 현재 로그인한 사용자의 이메일 가져오기
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        setCampaigns([])
        return
      }

      // 한국 지역 캠페인 가져오기 (company_email 기준)
      const { data: koreaCampaigns } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('company_email', user.email)
        .order('created_at', { ascending: false })

      // 지역 표시를 위해 region 필드 추가
      const campaignsWithRegion = (koreaCampaigns || []).map(c => ({
        ...c,
        region: 'korea'
      }))

      setCampaigns(campaignsWithRegion)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-gray-100 text-gray-700'
    }
    const labels = {
      pending: '승인 대기',
      approved: '승인됨',
      rejected: '거부됨',
      active: '진행중',
      completed: '완료'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getRegionBadge = (region) => {
    const badges = {
      korea: 'bg-blue-100 text-blue-700',
      japan: 'bg-red-100 text-red-700',
      us: 'bg-blue-100 text-blue-700',
      taiwan: 'bg-green-100 text-green-700'
    }
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국',
      taiwan: '🇹🇼 대만'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[region] || 'bg-gray-100 text-gray-700'}`}>
        {labels[region] || region}
      </span>
    )
  }

  const handleRegionSelect = (regionId) => {
    navigate(`/company/campaigns/new?region=${regionId}`)
  }

  const stats = {
    total: campaigns.length,
    pending: campaigns.filter(c => c.status === 'pending').length,
    active: campaigns.filter(c => c.status === 'active').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">내 캠페인</h1>
          </div>
          <Button onClick={() => setShowRegionModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            새 캠페인 만들기
          </Button>
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
              <div className="text-sm text-gray-600 mb-2">승인 대기</div>
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

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>캠페인 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">아직 생성된 캠페인이 없습니다</p>
                <Button onClick={() => setShowRegionModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  첫 캠페인 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={`${campaign.region}-${campaign.id}`}
                    className="p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{campaign.title}</h3>
                          {getRegionBadge(campaign.region)}
                          {getStatusBadge(campaign.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/company/campaigns/${campaign.id}`)}
                        className="ml-4"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        상세보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RegionSelectModal
        isOpen={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        onSelectRegion={handleRegionSelect}
      />
    </div>
  )
}

