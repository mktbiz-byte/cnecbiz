import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users, TrendingUp, DollarSign, Package,
  Building2, CheckCircle, Clock, XCircle,
  BarChart3, PieChart, Calendar, ChevronRight,
  Target, ImageIcon, Eye
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
    revenue: 0,
    // 매출 관리 데이터
    thisMonthRevenue: 0,
    thisMonthExpenses: 0,
    thisQuarterRevenue: 0,
    thisQuarterExpenses: 0,
    thisYearRevenue: 0,
    thisYearExpenses: 0
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
  const [activeCampaigns, setActiveCampaigns] = useState([])

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
      // 현재 날짜 기준
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1 // 1-12
      const currentQuarter = Math.ceil(currentMonth / 3) // 1-4
      const quarterStartMonth = (currentQuarter - 1) * 3 + 1
      const quarterEndMonth = currentQuarter * 3

      const [companiesRes, creatorsRes, revenueRes, expenseRes] = await Promise.all([
        supabaseBiz.from('companies').select('id', { count: 'exact', head: true }),
        supabaseBiz.from('featured_creators').select('id', { count: 'exact', head: true }),
        // 매출 관리와 동일한 revenue_records 테이블 사용
        supabaseBiz.from('revenue_records').select('*')
          .gte('year_month', `${currentYear}-01`)
          .lte('year_month', `${currentYear}-12`),
        // 매출 관리와 동일한 expense_records 테이블 사용
        supabaseBiz.from('expense_records').select('*')
          .gte('year_month', `${currentYear}-01`)
          .lte('year_month', `${currentYear}-12`)
      ])

      const campaigns = await getCampaignsFromAllRegions()
      const revenueData = revenueRes.data || []
      const expenseData = expenseRes.data || []

      const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

      // 총 매출: revenue_records 합산
      const totalRevenue = revenueData.reduce((sum, r) => sum + (r.amount || 0), 0)

      // 이번 달 매출/매입
      const thisMonthRevenue = revenueData
        .filter(r => r.year_month === currentMonthStr)
        .reduce((sum, r) => sum + (r.amount || 0), 0)

      const thisMonthExpenses = expenseData
        .filter(e => e.year_month === currentMonthStr)
        .reduce((sum, e) => sum + (e.amount || 0), 0)

      // 이번 분기 매출/매입
      const thisQuarterRevenue = revenueData
        .filter(r => {
          const month = parseInt(r.year_month?.split('-')[1] || '0')
          return month >= quarterStartMonth && month <= quarterEndMonth
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0)

      const thisQuarterExpenses = expenseData
        .filter(e => {
          const month = parseInt(e.year_month?.split('-')[1] || '0')
          return month >= quarterStartMonth && month <= quarterEndMonth
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0)

      // 올해 매출/매입 (이미 현재 연도만 가져왔으므로 전체 합산)
      const thisYearRevenue = totalRevenue
      const thisYearExpenses = expenseData.reduce((sum, e) => sum + (e.amount || 0), 0)

      setStats({
        companies: companiesRes.count || 0,
        campaigns: campaigns?.length || 0,
        creators: creatorsRes.count || 0,
        revenue: totalRevenue,
        thisMonthRevenue,
        thisMonthExpenses,
        thisQuarterRevenue,
        thisQuarterExpenses,
        thisYearRevenue,
        thisYearExpenses
      })
    } catch (error) {
      console.error('통계 조회 오류:', error)
    }
  }

  const fetchCampaignStats = async () => {
    try {
      const now = new Date()
      // 최근 6개월의 시작과 끝 월 계산
      const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const startMonthStr = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`
      const endMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const [campaigns, revenueRes] = await Promise.all([
        getCampaignsFromAllRegions(),
        // 매출 관리와 동일한 revenue_records 테이블 사용
        supabaseBiz.from('revenue_records').select('*')
          .gte('year_month', startMonthStr)
          .lte('year_month', endMonthStr)
      ])

      const revenueData = revenueRes.data || []

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

        // 진행중 캠페인 목록 (active/approved 상태)
        const active = campaigns
          .filter(c => c.status === 'active' || c.status === 'approved' || c.status === 'in_progress')
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 8)
        setActiveCampaigns(active)

        // 월별 매출 데이터 (최근 6개월) - revenue_records 기준
        const monthlyData = []
        for (let i = 5; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`

          // revenue_records의 year_month 필드로 필터링
          const monthRevenue = revenueData
            .filter(r => r.year_month === monthStr)
            .reduce((sum, r) => sum + (r.amount || 0), 0)

          const monthCampaigns = campaigns.filter(c => {
            const created = new Date(c.created_at)
            return created.getFullYear() === month.getFullYear() &&
                   created.getMonth() === month.getMonth() &&
                   (c.approval_status === 'approved' || c.status === 'completed')
          })

          monthlyData.push({
            month: month.toLocaleDateString('ko-KR', { month: 'short' }),
            revenue: monthRevenue,
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
      <div className="min-h-screen bg-[#F8F9FA] p-6 lg:p-8 lg:ml-60">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Pretendard', sans-serif" }}>슈퍼 관리자 대시보드</h1>
          <p className="text-[#636E72] mt-1 text-sm">전체 현황을 한눈에 확인하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-[#DFE6E9] rounded-2xl" onClick={() => navigate('/admin/companies')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#636E72]">총 기업</CardTitle>
              <div className="w-9 h-9 bg-[#F0EDFF] rounded-[10px] flex items-center justify-center">
                <Building2 className="w-[18px] h-[18px] text-[#6C5CE7]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.companies}</div>
              <p className="text-xs text-[#6C5CE7] mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 클릭하여 관리
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-[#DFE6E9] rounded-2xl" onClick={() => navigate('/admin/campaigns')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#636E72]">총 캠페인</CardTitle>
              <div className="w-9 h-9 bg-[#F0EDFF] rounded-[10px] flex items-center justify-center">
                <Package className="w-[18px] h-[18px] text-[#6C5CE7]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.campaigns}</div>
              <p className="text-xs text-[#6C5CE7] mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 클릭하여 관리
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-[#DFE6E9] rounded-2xl" onClick={() => navigate('/admin/featured-creators')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#636E72]">크리에이터</CardTitle>
              <div className="w-9 h-9 bg-[#F0EDFF] rounded-[10px] flex items-center justify-center">
                <Users className="w-[18px] h-[18px] text-[#6C5CE7]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.creators}</div>
              <p className="text-xs text-[#6C5CE7] mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 클릭하여 관리
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-[#DFE6E9] rounded-2xl" onClick={() => navigate('/admin/revenue-charts')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#636E72]">{new Date().getFullYear()}년 매출</CardTitle>
              <div className="w-9 h-9 bg-[#F0EDFF] rounded-[10px] flex items-center justify-center">
                <DollarSign className="w-[18px] h-[18px] text-[#6C5CE7]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[28px] font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>₩{stats.thisYearRevenue.toLocaleString()}</div>
              <p className="text-xs text-[#6C5CE7] mt-2 flex items-center gap-1">
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
                <PieChart className="w-5 h-5 text-[#6C5CE7]" />
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
                <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-[#DFE6E9]">
                  <div className="text-center p-3 bg-[rgba(253,203,110,0.1)] rounded-xl">
                    <Clock className="w-5 h-5 text-[#E17055] mx-auto mb-1" />
                    <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{campaignStats.pending}</div>
                    <div className="text-xs text-[#636E72]">승인대기</div>
                  </div>
                  <div className="text-center p-3 bg-[#F0EDFF] rounded-xl">
                    <BarChart3 className="w-5 h-5 text-[#6C5CE7] mx-auto mb-1" />
                    <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{campaignStats.in_progress + campaignStats.approved}</div>
                    <div className="text-xs text-[#636E72]">진행중</div>
                  </div>
                  <div className="text-center p-3 bg-[rgba(0,184,148,0.1)] rounded-xl">
                    <CheckCircle className="w-5 h-5 text-[#00B894] mx-auto mb-1" />
                    <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{campaignStats.completed}</div>
                    <div className="text-xs text-[#636E72]">완료</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 월별 매출 그래프 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#6C5CE7]" />
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
                          className="absolute bottom-0 w-full bg-gradient-to-t from-[#6C5CE7] to-[#A29BFE] rounded-t-lg transition-all duration-500"
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
                  <span className="text-xl font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    ₩{monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 진행중 캠페인 현황 */}
        {activeCampaigns.length > 0 && (
          <Card className="mb-8 border-[#DFE6E9] rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#6C5CE7]" />
                진행중 캠페인 현황
                <span className="text-sm font-normal text-[#636E72] ml-1">({activeCampaigns.length}개)</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6C5CE7] hover:bg-[#F0EDFF]"
                onClick={() => navigate('/admin/campaigns?filter=active')}
              >
                전체보기 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeCampaigns.map(campaign => {
                  const maxParticipants = campaign.max_participants || campaign.total_slots || 0
                  const applicants = campaign.application_stats?.total || 0
                  const selected = campaign.application_stats?.selected || 0
                  const deadline = campaign.application_deadline || campaign.recruitment_deadline
                  const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
                  const progress = maxParticipants > 0 ? Math.min((selected / maxParticipants) * 100, 100) : 0
                  const regionEmoji = { korea: '🇰🇷', japan: '🇯🇵', us: '🇺🇸', taiwan: '🇹🇼' }[campaign.region] || '🌐'

                  return (
                    <div
                      key={campaign.id}
                      className="p-4 border border-[#DFE6E9] rounded-xl hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                      onClick={() => navigate(`/company/campaigns/${campaign.id}?region=${campaign.region}`)}
                    >
                      {/* 헤더 */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {campaign.image_url ? (
                            <img src={campaign.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F0EDFF] to-[#E8E4FF]">
                              <ImageIcon className="w-5 h-5 text-[#6C5CE7]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-[#1A1A2E] truncate">
                            {campaign.campaign_name || campaign.title || '제목 없음'}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs">{regionEmoji}</span>
                            {daysLeft !== null && (
                              <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-[#636E72]'}`}>
                                {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day' : '마감'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 선정 진행률 */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#636E72]">선정</span>
                          <span className="text-xs font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            <span className="text-[#6C5CE7]">{selected}</span>
                            <span className="text-[#636E72]">/{maxParticipants}명</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-[#6C5CE7] h-1.5 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* 통계 */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#636E72]">지원 <span className="font-semibold text-blue-600" style={{ fontFamily: "'Outfit', sans-serif" }}>{applicants}</span></span>
                        <span className="text-[#636E72]">예산 <span className="font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{campaign.currency || '₩'}{((campaign.budget || 0) / 10000).toFixed(0)}만</span></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 빠른 액션 버튼 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#636E72]" />
              빠른 액션
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-[#F0EDFF] hover:border-[#6C5CE7] border-[#DFE6E9] rounded-xl"
                onClick={() => navigate('/admin/campaigns?filter=pending')}
              >
                <Clock className="w-6 h-6 text-[#6C5CE7]" />
                <span className="text-sm text-[#636E72]">승인 대기 캠페인</span>
                <span className="text-lg font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>{campaignStats.pending}건</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-[#F0EDFF] hover:border-[#6C5CE7] border-[#DFE6E9] rounded-xl"
                onClick={() => navigate('/admin/companies')}
              >
                <Building2 className="w-6 h-6 text-[#6C5CE7]" />
                <span className="text-sm text-[#636E72]">기업 관리</span>
                <span className="text-lg font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.companies}개</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-[#F0EDFF] hover:border-[#6C5CE7] border-[#DFE6E9] rounded-xl"
                onClick={() => navigate('/admin/consultations')}
              >
                <Users className="w-6 h-6 text-[#6C5CE7]" />
                <span className="text-sm text-[#636E72]">상담 관리</span>
                <span className="text-lg font-bold text-[#6C5CE7]">바로가기</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-[#F0EDFF] hover:border-[#6C5CE7] border-[#DFE6E9] rounded-xl"
                onClick={() => navigate('/admin/revenue-charts')}
              >
                <DollarSign className="w-6 h-6 text-[#6C5CE7]" />
                <span className="text-sm text-[#636E72]">매출 보고서</span>
                <span className="text-lg font-bold text-[#6C5CE7]">상세보기</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
