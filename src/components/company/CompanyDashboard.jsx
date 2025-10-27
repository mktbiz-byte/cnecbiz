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
  CheckCircle,
  Clock,
  AlertCircle,
  UserCheck,
  CreditCard,
  FileText
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { supabase as supabaseKorea } from '../../lib/supabaseKorea'

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
    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setCompany(companyData)
  }

  const fetchData = async () => {
    try {
      if (!user) return
      
      // 선택된 지역의 Supabase 클라이언트 선택
      const supabaseClient = selectedRegion === 'korea' ? supabaseKorea : supabaseBiz
      
      // 로그인한 회사의 캠페인만 가져오기 (company_email 기준)
      const { data: campaignsData } = await supabaseClient
        .from('campaigns')
        .select('*')
        .eq('company_email', user.email)
        .order('created_at', { ascending: false })
        .limit(5)

      setCampaigns(campaignsData || [])

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

      // 통계 계산
      const total = campaignsData?.length || 0
      const pending = campaignsData?.filter(c => c.approval_status === 'draft' || c.approval_status === 'pending').length || 0
      const active = campaignsData?.filter(c => c.approval_status === 'approved' && c.status !== 'completed').length || 0
      const completed = campaignsData?.filter(c => c.status === 'completed').length || 0
      const totalSpent = campaignsData?.reduce((sum, c) => {
        const packagePrice = getPackagePrice(c.package_type)
        const count = c.total_slots || 0
        return sum + (packagePrice * count)
      }, 0) || 0
      setStats({ total, pending, active, completed, totalSpent })
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const getPackagePrice = (packageType) => {
    const prices = {
      'oliveyoung': 200000,
      '올영 20만원': 200000,
      'premium': 300000,
      '프리미엄 30만원': 300000,
      '4week_challenge': 600000,
      '4주챌린지 60만원': 600000
    }
    return prices[packageType] || 0
  }

  const getPaymentStatusBadge = (status) => {
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

  const getProgressStatusBadge = (status) => {
    const badges = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-blue-600">CNEC Biz</h1>}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3"
            onClick={() => navigate('/company/dashboard')}
          >
            <LayoutDashboard className="w-5 h-5" />
            {sidebarOpen && <span>대시보드</span>}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3"
            onClick={() => navigate('/company/campaigns')}
          >
            <TrendingUp className="w-5 h-5" />
            {sidebarOpen && <span>내 캠페인</span>}
          </Button>
          <Button 
            variant="default" 
            className="w-full justify-start gap-3"
            onClick={() => navigate('/company/campaigns/select-region')}
          >
            <Plus className="w-5 h-5" />
            {sidebarOpen && <span>새 캠페인</span>}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3"
            onClick={() => navigate('/company/points')}
          >
            <CreditCard className="w-5 h-5" />
            {sidebarOpen && <span>포인트 결제하기</span>}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3"
            onClick={() => navigate('/company/payment-history')}
          >
            <FileText className="w-5 h-5" />
            {sidebarOpen && <span>내 결제내역</span>}
          </Button>
        </nav>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>로그아웃</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">대시보드</h2>
            <p className="text-gray-600 mt-1">캠페인 현황을 한눈에 확인하세요</p>
          </div>

           {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            </Card>>

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
                              <Badge variant="outline">{campaign.region || 'KR 한국'}</Badge>
                              <span>•</span>
                              <span>{campaign.package_type}</span>
                              <span>•</span>
                              {getProgressStatusBadge(campaign.progress_status || campaign.approval_status)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {totalCost.toLocaleString()}원
                            </div>
                            {getPaymentStatusBadge(campaign.payment_status)}
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

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            {recruitmentDays !== null && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">
                                  모집 마감: <span className={recruitmentDays < 7 ? 'text-red-600 font-semibold' : 'font-medium'}>
                                    {recruitmentDays > 0 ? `D-${recruitmentDays}` : '마감'}
                                  </span>
                                </span>
                              </div>
                            )}
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
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">
                              가이드 확인: {participantInfo.guideConfirmed}/{participantInfo.selected}
                            </span>
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
      </main>
    </div>
  )
}

