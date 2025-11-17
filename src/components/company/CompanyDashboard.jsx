import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  FileText
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
          .from('campaign_participants')
          .select('*')
          .eq('campaign_id', campaign.id)
        
        participantsData[campaign.id] = {
          total: data?.length || 0,
          selected: data?.filter(p => p.selection_status === 'selected').length || 0,
          guideConfirmed: data?.filter(p => p.guide_confirmed).length || 0
        }
      }
      setParticipants(participantsData)

      // 통계 계산 (취소된 캠페인 제외)
      const activeCampaigns = campaignsData?.filter(c => !c.is_cancelled) || []
      const total = activeCampaigns.length
      const pending = activeCampaigns.filter(c => 
        c.approval_status === 'draft' || 
        c.approval_status === 'pending' || 
        c.approval_status === 'pending_payment'
      ).length
      const active = activeCampaigns.filter(c => c.approval_status === 'approved' && c.status !== 'completed').length
      const completed = activeCampaigns.filter(c => c.status === 'completed').length
      const totalSpent = activeCampaigns.reduce((sum, c) => {
        const packagePrice = getPackagePrice(c.package_type)
        const count = c.total_slots || 0
        return sum + (packagePrice * count)
      }, 0)
      setStats({ total, pending, active, completed, totalSpent })
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const getPackagePrice = (packageType) => {
    const prices = {
      'junior': 200000,
      'intermediate': 300000,
      'senior': 500000,
      'oliveyoung': 200000,
      '올영 20만원': 200000,
      'premium': 300000,
      '프리미엄 30만원': 300000,
      '4week_challenge': 600000,
      '4주챌린지 60만원': 600000
    }
    return prices[packageType?.toLowerCase()] || 200000
  }

  const getPaymentStatusBadge = (status, isCancelled) => {
    // 취소된 캠페인은 "취소됨" 표시
    if (isCancelled) {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          취소됨
        </Badge>
      )
    }
    
    const badges = {
      pending: { label: '입금 대기', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: '입금 완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { label: '입금 실패', color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }
    const badge = badges[status] || { label: '미입금', color: 'bg-gray-100 text-gray-800', icon: CreditCard }
    const Icon = badge.icon
    return (
      <Badge className={`${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </Badge>
    )
  }

   const getDaysRemaining = (deadline) => {
    if (!deadline) return null
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getRegionBadge = (region) => {
    const badges = {
      korea: { label: '🇰🇷 한국', color: 'bg-blue-100 text-blue-700' },
      japan: { label: '🇯🇵 일본', color: 'bg-red-100 text-red-700' },
      us: { label: '🇺🇸 미국', color: 'bg-purple-100 text-purple-700' },
      usa: { label: '🇺🇸 미국', color: 'bg-purple-100 text-purple-700' },
      taiwan: { label: '🇹🇼 대만', color: 'bg-green-100 text-green-700' }
    }
    const badge = badges[region] || badges.korea
    return (
      <Badge variant="outline" className={badge.color}>
        {badge.label}
      </Badge>
    )
  }

  const getProgressStatusBadge = (status, isCancelled) => {
    // 취소된 캠페인은 항상 "취소됨" 표시
    if (isCancelled) {
      return (
        <Badge className="bg-red-100 text-red-800">
          취소됨
        </Badge>
      )
    }
    
    const badges = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
      pending_payment: { label: '입금 대기', color: 'bg-yellow-100 text-yellow-700' },
      pending_approval: { label: '승인대기', color: 'bg-orange-100 text-orange-700' },
      pending: { label: '승인대기', color: 'bg-orange-100 text-orange-700' },
      recruiting: { label: '모집중', color: 'bg-blue-100 text-blue-700' },
      guide_confirmation: { label: '가이드 확인중', color: 'bg-purple-100 text-purple-700' },
      filming: { label: '촬영중', color: 'bg-yellow-100 text-yellow-700' },
      editing: { label: '수정중', color: 'bg-pink-100 text-pink-700' },
      approved: { label: '진행중', color: 'bg-green-100 text-green-700' },
      completed: { label: '완료', color: 'bg-green-100 text-green-700' }
    }
    const badge = badges[status] || badges.draft
    return (
      <Badge className={badge.color}>
        {badge.label}
      </Badge>
    )
  }

  const handleLogout = async () => {
    await supabaseBiz.auth.signOut()
    navigate('/login')
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        {/* Main Content */}
        <main className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">대시보드</h2>
            <p className="text-gray-600 mt-1">캠페인 현황을 한눈에 확인하세요</p>
          </div>

           {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">전체 캠페인</CardTitle>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">승인 대기</CardTitle>
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">진행중</CardTitle>
                <Clock className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">완료</CardTitle>
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">총 지출</CardTitle>
                <DollarSign className="w-5 h-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.totalSpent.toLocaleString()}원
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>최근 캠페인</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/company/campaigns')}
                >
                  전체보기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>아직 생성된 캠페인이 없습니다.</p>
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/company/campaigns/select-region')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    첫 캠페인 만들기
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => {
                    const packagePrice = getPackagePrice(campaign.package_type)
                    const totalCost = packagePrice * (campaign.total_slots || 0)
                    const participantInfo = participants[campaign.id] || { total: 0, selected: 0, guideConfirmed: 0 }
                    const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline)
                    const submissionDays = getDaysRemaining(campaign.content_submission_deadline)

                    return (
                      <div 
                        key={campaign.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/company/campaigns/${campaign.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{campaign.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {getRegionBadge(campaign.region)}
                              <span>•</span>
                              <span>{campaign.package_type}</span>
                              <span>•</span>
                              {getProgressStatusBadge(campaign.progress_status || campaign.approval_status, campaign.is_cancelled)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {totalCost.toLocaleString()}원
                            </div>
                            {getPaymentStatusBadge(campaign.payment_status, campaign.is_cancelled)}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">모집 인원</div>
                            <div className="text-xl font-bold text-blue-600">
                              {campaign.total_slots || 0}명
                            </div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">지원자</div>
                            <div className="text-xl font-bold text-green-600">
                              {participantInfo.total}명
                            </div>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">확정 크리에이터</div>
                            <div className="text-xl font-bold text-purple-600">
                              {participantInfo.selected}명
                            </div>
                          </div>
                        </div>

                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-gray-500 mb-1">모집 마감일</div>
                              <div className="font-medium">
                                {campaign.recruitment_deadline || campaign.application_deadline 
                                  ? new Date(campaign.recruitment_deadline || campaign.application_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ')
                                  : '-'
                                }
                                {recruitmentDays !== null && recruitmentDays >= 0 && (
                                  <span className={`ml-2 ${recruitmentDays < 7 ? 'text-red-600' : 'text-blue-600'}`}>
                                    (D-{recruitmentDays})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-1">캠페인 기간</div>
                              <div className="font-medium">
                                {campaign.start_date && campaign.end_date
                                  ? `${new Date(campaign.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ')} - ${new Date(campaign.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ')}`
                                  : '-'
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            {submissionDays !== null && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">
                                  제출 마감: <span className={submissionDays < 7 ? 'text-red-600 font-semibold' : 'font-medium'}>
                                    {submissionDays > 0 ? `D-${submissionDays}` : '마감'}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {(campaign.approval_status === 'draft' || !campaign.approval_status) && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                                <span className="text-orange-700 font-medium text-xs">
                                  승인 요청 필요
                                </span>
                              </div>
                            )}
                            {campaign.approval_status === 'pending' && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-blue-700 font-medium text-xs">
                                  승인 심사 중
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">
                                가이드 확인: {participantInfo.guideConfirmed}/{participantInfo.selected}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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

