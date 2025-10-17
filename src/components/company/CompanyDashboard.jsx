import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LayoutDashboard, 
  Plus, 
  TrendingUp, 
  Users, 
  DollarSign,
  LogOut,
  Menu,
  X,
  Coins,
  Receipt,
  Languages
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalSpent: 0
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchData()
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
    setUser(user)
  }

  const fetchData = async () => {
    if (!supabaseBiz) return

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      // 기업 정보
      const { data: companyData } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      setCompany(companyData)

      // 캠페인 목록
      const { data: campaignsData } = await supabaseBiz
        .from('campaigns')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setCampaigns(campaignsData || [])

      // 통계
      const total = campaignsData?.length || 0
      const active = campaignsData?.filter(c => c.status === 'active').length || 0
      const completed = campaignsData?.filter(c => c.status === 'completed').length || 0
      const totalSpent = campaignsData?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0

      setStats({ total, active, completed, totalSpent })
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleLogout = async () => {
    if (supabaseBiz) {
      await supabaseBiz.auth.signOut()
    }
    navigate('/login')
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-800' },
      pending_payment: { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
      active: { label: '진행중', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-800' },
      completed: { label: '완료', color: 'bg-green-100 text-green-800' },
      cancelled: { label: '취소', color: 'bg-red-100 text-red-800' },
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CNEC BIZ
            </span>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => navigate('/company/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-medium"
            >
              <LayoutDashboard className="w-5 h-5" />
              대시보드
            </button>
            <button 
              onClick={() => navigate('/company/campaigns')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <TrendingUp className="w-5 h-5" />
              내 캐페인
            </button>
            <button 
              onClick={() => navigate('/company/campaigns/new')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Plus className="w-5 h-5" />
              캐페인 만들기
            </button>
            <button 
              onClick={() => navigate('/company/translator')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Languages className="w-5 h-5" />
              AI 번역기
            </button>
            <button 
              onClick={() => navigate('/company/teams')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Users className="w-5 h-5" />
              팀 관리
            </button>
            <button 
              onClick={() => navigate('/company/points')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Coins className="w-5 h-5" />
              포인트 충전
            </button>
            <button 
              onClick={() => navigate('/company/payments')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Receipt className="w-5 h-5" />
              결제 내역
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t">
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-900">{company?.company_name}</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-2xl font-bold">대시보드</h1>
          </div>
          <Button onClick={() => navigate('/company/campaigns/create')} className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="w-5 h-5 mr-2" />
            새 캠페인
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 캠페인</p>
                    <p className="text-3xl font-bold mt-2">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">진행중</p>
                    <p className="text-3xl font-bold mt-2">{stats.active}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">완료</p>
                    <p className="text-3xl font-bold mt-2">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 지출</p>
                    <p className="text-3xl font-bold mt-2">{(stats.totalSpent / 10000).toFixed(0)}만원</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>최근 캠페인</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">아직 캠페인이 없습니다</p>
                  <Button onClick={() => navigate('/company/campaigns/create')} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-5 h-5 mr-2" />
                    첫 캠페인 만들기
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/company/campaigns/${campaign.id}`)}>
                      <div className="flex-1">
                        <h3 className="font-medium">{campaign.brand_name} - {campaign.product_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {campaign.selected_regions?.join(', ')} • {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{(campaign.total_amount / 10000).toFixed(0)}만원</p>
                          <p className="text-sm text-gray-600">{campaign.package_type}</p>
                        </div>
                        {getStatusBadge(campaign.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

