import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Search, Eye, CheckCircle, XCircle, Clock, DollarSign, Edit, Trash2, PlayCircle } from 'lucide-react'
import { supabaseBiz, getCampaignsFromAllRegions, getCampaignsWithStats, getSupabaseClient } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function CampaignsManagement() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCampaigns()
  }, [])

  const checkAuth = async () => {
    console.log('[CampaignsManagement] checkAuth started')
    try {
      if (!supabaseBiz) {
        console.log('[CampaignsManagement] No supabaseBiz client')
        navigate('/login')
        return
      }

      console.log('[CampaignsManagement] Getting user...')
      const { data: { user }, error: userError } = await supabaseBiz.auth.getUser()
      if (userError) {
        console.error('[CampaignsManagement] User error:', userError)
        navigate('/login')
        return
      }
      if (!user) {
        console.log('[CampaignsManagement] No user found')
        navigate('/login')
        return
      }

      console.log('[CampaignsManagement] User email:', user.email)
      console.log('[CampaignsManagement] Fetching admin data...')
      const { data: adminData, error: adminError } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (adminError) {
        console.error('[CampaignsManagement] Admin data error:', adminError)
      }

      if (!adminData) {
        console.log('[CampaignsManagement] No admin data found')
        // 일반 관리자도 접근 가능하도록 변경
        setIsSuperAdmin(false)
        return
      }

      console.log('[CampaignsManagement] Admin role:', adminData.role)
      const isSuperAdminValue = adminData.role === 'super_admin'
      console.log('[CampaignsManagement] isSuperAdmin:', isSuperAdminValue)
      setIsSuperAdmin(isSuperAdminValue)
    } catch (error) {
      console.error('[CampaignsManagement] checkAuth error:', error)
      setIsSuperAdmin(false)
    }
  }

  const fetchCampaigns = async () => {
    console.log('[CampaignsManagement] Starting to fetch campaigns...')
    setLoading(true)
    try {
      const allCampaigns = await getCampaignsWithStats()
      console.log('[CampaignsManagement] Fetched campaigns:', allCampaigns.length)
      setCampaigns(allCampaigns)
    } catch (error) {
      console.error('[CampaignsManagement] Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveCampaign = async (campaign) => {
    if (!confirm(`캠페인을 승인하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}`)) {
      return
    }

    setConfirming(true)
    try {
      // 캠페인이 어느 DB에 있는지 확인하고 업데이트
      const region = campaign.region || 'biz'
      const supabaseClient = getSupabaseClient(region)

      const { error } = await supabaseClient
        .from('campaigns')
        .update({ 
          approval_status: 'approved',
          status: 'active'
        })
        .eq('id', campaign.id)

      if (error) throw error

      alert('캠페인이 승인되었습니다!')
      fetchCampaigns()

    } catch (error) {
      console.error('승인 오류:', error)
      alert('승인에 실패했습니다: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmPayment = async (campaign) => {
    if (!confirm(`입금을 확인하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}\n금액: ${(campaign.estimated_cost || 0).toLocaleString()}원`)) {
      return
    }

    setConfirming(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const response = await fetch('/.netlify/functions/confirm-campaign-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          adminUserId: user.id,
          depositAmount: campaign.estimated_cost
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '입금 확인 처리에 실패했습니다.')
      }

      alert('입금이 확인되었습니다. 캠페인이 승인 대기 상태로 변경되었습니다.')
      fetchCampaigns()

    } catch (error) {
      console.error('입금 확인 오류:', error)
      alert(error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleStatusChange = async (campaign, newStatus) => {
    const statusLabels = {
      draft: '임시',
      active: '활성',
      paused: '중단',
      completed: '완료'
    }

    if (!confirm(`캠페인 상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}`)) {
      return
    }

    setConfirming(true)
    try {
      const region = campaign.region || 'biz'
      const supabaseClient = getSupabaseClient(region)

      const { error } = await supabaseClient
        .from('campaigns')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)

      if (error) throw error

      alert(`캠페인 상태가 "${statusLabels[newStatus]}"로 변경되었습니다!`)
      fetchCampaigns()
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경에 실패했습니다: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleDelete = async (campaign) => {
    if (!confirm(`⚠️ 정말로 이 캠페인을 삭제하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    if (!confirm('⚠️ 최종 확인: 캠페인과 관련된 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    setConfirming(true)
    try {
      const region = campaign.region || 'biz'
      const supabaseClient = getSupabaseClient(region)

      const { error } = await supabaseClient
        .from('campaigns')
        .delete()
        .eq('id', campaign.id)

      if (error) throw error

      alert('캠페인이 삭제되었습니다.')
      fetchCampaigns()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    } finally {
      setConfirming(false)
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
        case 'cancelled':
          matchesStatus = campaign.approval_status === 'cancelled' || campaign.status === 'cancelled'
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
      pending_payment: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-gray-100 text-gray-700'
    }
    const labels = {
      pending: '대기중',
      pending_payment: '입금확인중',
      approved: '승인',
      rejected: '거부',
      cancelled: '취소됨',
      active: '진행중',
      completed: '완료'
    }
    const icons = {
      pending: Clock,
      pending_payment: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      cancelled: XCircle,
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
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">

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
          <TabsList className="grid w-full grid-cols-10 gap-1">
            <TabsTrigger value="all" className="text-xs px-2">전체</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs px-2">작성중</TabsTrigger>
            <TabsTrigger value="pending_payment" className="text-xs px-2">입금확인중</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2">승인요청중</TabsTrigger>
            <TabsTrigger value="recruiting" className="text-xs px-2">모집중</TabsTrigger>
            <TabsTrigger value="guide_review" className="text-xs px-2">가이드검토중</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-2">촬영중</TabsTrigger>
            <TabsTrigger value="revision" className="text-xs px-2">수정중</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2">최종완료</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs px-2">취소됨</TabsTrigger>
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
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">예산</div>
                            <div className="font-semibold text-gray-900">{campaign.currency || '₩'}{campaign.budget?.toLocaleString()}</div>
                          </div>
                          {campaign.region === 'korea' && (
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <div className="text-purple-600 text-xs mb-1">크리에이터 P</div>
                              <div className="font-semibold text-purple-900">₩{Math.round((campaign.reward_points || 0) * 0.6).toLocaleString()}</div>
                            </div>
                          )}
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">모집 인원</div>
                            <div className="font-semibold text-gray-900">{campaign.max_participants || 0}명</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">지원자</div>
                            <div className="font-semibold text-blue-600">{campaign.application_stats?.total || 0}명</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">선정 완료</div>
                            <div className="font-semibold text-green-600">{campaign.application_stats?.selected || 0}명</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">모집 마감일</div>
                            <div className="font-medium text-gray-900">{campaign.application_deadline ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ') : '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">캠페인 기간</div>
                            <div className="font-medium text-gray-900">
                              {campaign.start_date && campaign.end_date 
                                ? `${new Date(campaign.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ')} - ${new Date(campaign.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ')}`
                                : '-'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {campaign.payment_status === 'pending' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConfirmPayment(campaign)}
                            disabled={confirming}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            입금 확인
                          </Button>
                        )}
                        {campaign.approval_status === 'pending' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveCampaign(campaign)}
                            disabled={confirming}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            승인
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(campaign, 'active')}
                              disabled={confirming || campaign.status === 'active'}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              활성화
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(campaign)}
                              disabled={confirming}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit?region=${campaign.region}`)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/campaigns/${campaign.id}?region=${campaign.region}`)}
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
    </>
  )
}

