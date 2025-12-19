import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users, TrendingUp, DollarSign, Package,
  Building2, CheckCircle, Clock, XCircle,
  BarChart3, PieChart, Calendar
} from 'lucide-react'
import { supabaseBiz, getCampaignsFromAllRegions } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    companies: 0,
    campaigns: 0,
    creators: 0,
    revenue: 0
  })
  const [campaignStats, setCampaignStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0
  })
  const [monthlyRevenue, setMonthlyRevenue] = useState([])

  useEffect(() => {
    checkAuth()
    fetchStats()
    fetchCampaignStats()
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
      .maybeSingle()

    if (!adminData) {
      navigate('/login')
      return
    }

    setUser(user)
  }

  const fetchStats = async () => {
    if (!supabaseBiz) return

    try {
      const [companiesRes, creatorsRes] = await Promise.all([
        supabaseBiz.from('companies').select('id', { count: 'exact', head: true }),
        supabaseBiz.from('featured_creators').select('id', { count: 'exact', head: true })
      ])

      const campaigns = await getCampaignsFromAllRegions()

      // 총 매출: 승인된 캠페인의 estimated_cost 합산
      const totalRevenue = campaigns
        ?.filter(c => c.approval_status === 'approved' || c.status === 'completed')
        ?.reduce((sum, c) => sum + (c.estimated_cost || 0), 0) || 0

      setStats({
        companies: companiesRes.count || 0,
        campaigns: campaigns?.length || 0,
        creators: creatorsRes.count || 0,
        revenue: totalRevenue
      })
    } catch (error) {
      console.error('통계 조회 오류:', error)
    }
  }

  const fetchCampaignStats = async () => {
    try {
      const campaigns = await getCampaignsFromAllRegions()

      if (campaigns) {
        const stats = {
          total: campaigns.length,
          draft: campaigns.filter(c => c.approval_status === 'draft' || c.status === 'draft').length,
          pending: campaigns.filter(c => c.approval_status === 'pending').length,
          approved: campaigns.filter(c => c.approval_status === 'approved' && c.status !== 'completed').length,
          in_progress: campaigns.filter(c => c.status === 'in_progress').length,
          completed: campaigns.filter(c => c.status === 'completed').length,
          cancelled: campaigns.filter(c => c.is_cancelled === true).length
        }
        setCampaignStats(stats)

        // 월별 매출 데이터 (최근 6개월)
        const monthlyData = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

          const monthCampaigns = campaigns.filter(c => {
            const created = new Date(c.created_at)
            return created >= month && created <= monthEnd &&
                   (c.approval_status === 'approved' || c.status === 'completed')
          })

          monthlyData.push({
            month: month.toLocaleDateString('ko-KR', { month: 'short' }),
            revenue: monthCampaigns.reduce((sum, c) => sum + (c.estimated_cost || 0), 0),
            count: monthCampaigns.length
          })
        }
        setMonthlyRevenue(monthlyData)
      }
    } catch (error) {
      console.error('캠페인 통계 조회 오류:', error)
    }
  }

  // 그래프 최대값 계산
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1)

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 p-6 lg:ml-64">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">슈퍼 관리자 대시보드</h1>
          <p className="text-gray-500 mt-1">전체 현황을 한눈에 확인하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => navigate('/admin/companies')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 기업</CardTitle>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.companies}</div>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 클릭하여 관리
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => navigate('/admin/campaigns')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 캠페인</CardTitle>
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.campaigns}</div>
              <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 클릭하여 관리
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => navigate('/admin/featured-creators')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">크리에이터</CardTitle>
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.creators}</div>
              <p className="text-xs text-pink-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 클릭하여 관리
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => navigate('/admin/revenue')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 매출</CardTitle>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">₩{stats.revenue.toLocaleString()}</div>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 상세 보고서 보기
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 캠페인 현황 그래프 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 캠페인 상태별 현황 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                캠페인 진행 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 상태별 바 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="text-sm text-gray-600">임시저장</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-400 h-2 rounded-full transition-all"
                          style={{ width: `${campaignStats.total ? (campaignStats.draft / campaignStats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{campaignStats.draft}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-gray-600">승인대기</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{ width: `${campaignStats.total ? (campaignStats.pending / campaignStats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{campaignStats.pending}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-600">승인완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${campaignStats.total ? (campaignStats.approved / campaignStats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{campaignStats.approved}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm text-gray-600">진행중</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${campaignStats.total ? (campaignStats.in_progress / campaignStats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{campaignStats.in_progress}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-600">완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${campaignStats.total ? (campaignStats.completed / campaignStats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{campaignStats.completed}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm text-gray-600">취소</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${campaignStats.total ? (campaignStats.cancelled / campaignStats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{campaignStats.cancelled}</span>
                    </div>
                  </div>
                </div>

                {/* 요약 카드 */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-yellow-700">{campaignStats.pending}</div>
                    <div className="text-xs text-yellow-600">승인대기</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-700">{campaignStats.in_progress + campaignStats.approved}</div>
                    <div className="text-xs text-blue-600">진행중</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-700">{campaignStats.completed}</div>
                    <div className="text-xs text-green-600">완료</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 월별 매출 그래프 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                월별 매출 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 바 차트 */}
                <div className="flex items-end justify-between gap-2 h-48">
                  {monthlyRevenue.map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '160px' }}>
                        <div
                          className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all duration-500"
                          style={{ height: `${maxRevenue ? (data.revenue / maxRevenue) * 100 : 0}%` }}
                        >
                          {data.revenue > 0 && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                              {(data.revenue / 10000).toFixed(0)}만
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">{data.month}</div>
                      <div className="text-xs text-gray-400">{data.count}건</div>
                    </div>
                  ))}
                </div>

                {/* 총합 */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-gray-600">최근 6개월 총 매출</span>
                  <span className="text-xl font-bold text-green-600">
                    ₩{monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 빠른 액션 버튼 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              빠른 액션
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-yellow-50 hover:border-yellow-300"
                onClick={() => navigate('/admin/campaigns?filter=pending')}
              >
                <Clock className="w-6 h-6 text-yellow-600" />
                <span className="text-sm">승인 대기 캠페인</span>
                <span className="text-lg font-bold text-yellow-600">{campaignStats.pending}건</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => navigate('/admin/companies')}
              >
                <Building2 className="w-6 h-6 text-blue-600" />
                <span className="text-sm">기업 관리</span>
                <span className="text-lg font-bold text-blue-600">{stats.companies}개</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-300"
                onClick={() => navigate('/admin/consultations')}
              >
                <Users className="w-6 h-6 text-purple-600" />
                <span className="text-sm">상담 관리</span>
                <span className="text-lg font-bold text-purple-600">바로가기</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300"
                onClick={() => navigate('/admin/revenue')}
              >
                <DollarSign className="w-6 h-6 text-green-600" />
                <span className="text-sm">매출 보고서</span>
                <span className="text-lg font-bold text-green-600">상세보기</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
