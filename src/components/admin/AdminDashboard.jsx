import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users, TrendingUp, DollarSign, Package,
  Building2, CheckCircle, Clock, XCircle,
  BarChart3, PieChart, Calendar, ChevronRight,
  Target, ImageIcon, Eye, Globe
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS, supabaseTaiwan, getCampaignsFromAllRegions } from '../../lib/supabaseClients'
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
  const [creatorSignups, setCreatorSignups] = useState([])
  const [creatorSignupsDaily, setCreatorSignupsDaily] = useState([])
  const [applicationStats, setApplicationStats] = useState([])
  const [applicationStatsDaily, setApplicationStatsDaily] = useState([])
  const [regionTotals, setRegionTotals] = useState({ korea: 0, japan: 0, us: 0, taiwan: 0 })
  const [signupViewMode, setSignupViewMode] = useState('monthly') // 'monthly' | 'daily'
  const [appViewMode, setAppViewMode] = useState('monthly')

  useEffect(() => {
    checkAuth()
    fetchStats()
    fetchCampaignStats()
    fetchRegionalStats()
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

  // 나라별 크리에이터 가입 & 캠페인 지원 통계
  const fetchRegionalStats = async () => {
    try {
      const now = new Date()
      const regions = [
        { key: 'korea', label: '한국', client: supabaseKorea },
        { key: 'japan', label: '일본', client: supabaseJapan },
        { key: 'us', label: '미국', client: supabaseUS },
        { key: 'taiwan', label: '대만', client: supabaseTaiwan }
      ].filter(r => r.client)

      // 최근 6개월 월별 데이터 생성
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          date: d,
          label: d.toLocaleDateString('ko-KR', { month: 'short' }),
          yearMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })
      }

      const sixMonthsAgo = months[0].date.toISOString()
      const totals = { korea: 0, japan: 0, us: 0, taiwan: 0 }

      // 각 리전별 user_profiles(가입자), applications(지원) 조회
      const regionResults = await Promise.all(
        regions.map(async (region) => {
          const [profilesRes, appsRes] = await Promise.all([
            region.client.from('user_profiles')
              .select('created_at')
              .gte('created_at', sixMonthsAgo)
              .order('created_at', { ascending: true }),
            region.client.from('applications')
              .select('created_at, status')
              .gte('created_at', sixMonthsAgo)
              .order('created_at', { ascending: true })
          ])

          // 전체 가입자 수 (전체 기간)
          const { count: totalCreators } = await region.client
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
          totals[region.key] = totalCreators || 0

          return {
            key: region.key,
            profiles: profilesRes.data || [],
            applications: appsRes.data || []
          }
        })
      )

      setRegionTotals(totals)

      // 월별 가입자 집계
      const signupData = months.map(m => {
        const nextMonth = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 1)
        const entry = { month: m.label }

        regionResults.forEach(r => {
          entry[r.key] = r.profiles.filter(p => {
            const d = new Date(p.created_at)
            return d >= m.date && d < nextMonth
          }).length
        })

        return entry
      })
      setCreatorSignups(signupData)

      // 월별 지원 현황 집계
      const appData = months.map(m => {
        const nextMonth = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 1)
        const entry = { month: m.label }

        regionResults.forEach(r => {
          const monthApps = r.applications.filter(a => {
            const d = new Date(a.created_at)
            return d >= m.date && d < nextMonth
          })
          entry[r.key] = monthApps.length
          entry[`${r.key}_selected`] = monthApps.filter(a =>
            ['selected', 'virtual_selected', 'approved', 'completed'].includes(a.status)
          ).length
        })

        return entry
      })
      setApplicationStats(appData)

      // 일별 데이터 (최근 30일)
      const days = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        days.push({
          date: d,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          dateStr: d.toISOString().split('T')[0]
        })
      }

      const dailySignupData = days.map(day => {
        const nextDay = new Date(day.date)
        nextDay.setDate(nextDay.getDate() + 1)
        const entry = { month: day.label }

        regionResults.forEach(r => {
          entry[r.key] = r.profiles.filter(p => {
            const d = new Date(p.created_at)
            return d >= day.date && d < nextDay
          }).length
        })
        return entry
      })
      setCreatorSignupsDaily(dailySignupData)

      const dailyAppData = days.map(day => {
        const nextDay = new Date(day.date)
        nextDay.setDate(nextDay.getDate() + 1)
        const entry = { month: day.label }

        regionResults.forEach(r => {
          const dayApps = r.applications.filter(a => {
            const d = new Date(a.created_at)
            return d >= day.date && d < nextDay
          })
          entry[r.key] = dayApps.length
          entry[`${r.key}_selected`] = dayApps.filter(a =>
            ['selected', 'virtual_selected', 'approved', 'completed'].includes(a.status)
          ).length
        })
        return entry
      })
      setApplicationStatsDaily(dailyAppData)
    } catch (error) {
      console.error('리전별 통계 조회 오류:', error)
    }
  }

  const REGION_COLORS = {
    korea: '#6C5CE7',
    japan: '#E17055',
    us: '#00B894',
    taiwan: '#0984E3'
  }
  const REGION_LABELS = { korea: '한국', japan: '일본', us: '미국', taiwan: '대만' }

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

        {/* 나라별 크리에이터 & 지원 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 나라별 크리에이터 가입 추이 */}
          <Card className="border-[#DFE6E9] rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#6C5CE7]" />
                  나라별 크리에이터 가입 추이
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setSignupViewMode('monthly')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${signupViewMode === 'monthly' ? 'bg-white text-[#6C5CE7] shadow-sm' : 'text-gray-500'}`}
                    >월별</button>
                    <button
                      onClick={() => setSignupViewMode('daily')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${signupViewMode === 'daily' ? 'bg-white text-[#6C5CE7] shadow-sm' : 'text-gray-500'}`}
                    >일별</button>
                  </div>
                  <div className="h-4 w-px bg-gray-200" />
                  {Object.entries(REGION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[key] }} />
                      <span className="text-xs text-[#636E72]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {creatorSignups.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={signupViewMode === 'daily' ? creatorSignupsDaily : creatorSignups}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: signupViewMode === 'daily' ? 10 : 12, fill: '#636E72' }} interval={signupViewMode === 'daily' ? 4 : 0} />
                      <YAxis tick={{ fontSize: 12, fill: '#636E72' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #DFE6E9', fontSize: '13px' }}
                        formatter={(value, name) => [value + '명', REGION_LABELS[name]]}
                      />
                      <Area type="monotone" dataKey="korea" stroke={REGION_COLORS.korea} fill={REGION_COLORS.korea} fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="japan" stroke={REGION_COLORS.japan} fill={REGION_COLORS.japan} fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="us" stroke={REGION_COLORS.us} fill={REGION_COLORS.us} fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="taiwan" stroke={REGION_COLORS.taiwan} fill={REGION_COLORS.taiwan} fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  {/* 누적 총 가입자 */}
                  <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#DFE6E9]">
                    {Object.entries(REGION_LABELS).map(([key, label]) => (
                      <div key={key} className="text-center">
                        <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {(regionTotals[key] || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-[#636E72]">{label} 총 가입</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-[#636E72] text-sm">데이터 로딩 중...</div>
              )}
            </CardContent>
          </Card>

          {/* 나라별 캠페인 지원 현황 */}
          <Card className="border-[#DFE6E9] rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#6C5CE7]" />
                  나라별 캠페인 지원 현황
                </CardTitle>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setAppViewMode('monthly')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${appViewMode === 'monthly' ? 'bg-white text-[#6C5CE7] shadow-sm' : 'text-gray-500'}`}
                  >월별</button>
                  <button
                    onClick={() => setAppViewMode('daily')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${appViewMode === 'daily' ? 'bg-white text-[#6C5CE7] shadow-sm' : 'text-gray-500'}`}
                  >일별</button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {applicationStats.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={appViewMode === 'daily' ? applicationStatsDaily : applicationStats} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: appViewMode === 'daily' ? 10 : 12, fill: '#636E72' }} interval={appViewMode === 'daily' ? 4 : 0} />
                      <YAxis tick={{ fontSize: 12, fill: '#636E72' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #DFE6E9', fontSize: '13px' }}
                        formatter={(value, name) => {
                          const isSelected = name.includes('_selected')
                          const region = name.replace('_selected', '')
                          return [value + '명', REGION_LABELS[region] + (isSelected ? ' (선정)' : ' (지원)')]
                        }}
                      />
                      <Bar dataKey="korea" fill={REGION_COLORS.korea} radius={[4, 4, 0, 0]} name="korea" />
                      <Bar dataKey="japan" fill={REGION_COLORS.japan} radius={[4, 4, 0, 0]} name="japan" />
                      <Bar dataKey="us" fill={REGION_COLORS.us} radius={[4, 4, 0, 0]} name="us" />
                      <Bar dataKey="taiwan" fill={REGION_COLORS.taiwan} radius={[4, 4, 0, 0]} name="taiwan" />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* 합계 */}
                  <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#DFE6E9]">
                    {Object.entries(REGION_LABELS).map(([key, label]) => {
                      const statsData = appViewMode === 'daily' ? applicationStatsDaily : applicationStats
                      const total = statsData.reduce((sum, m) => sum + (m[key] || 0), 0)
                      const selected = statsData.reduce((sum, m) => sum + (m[`${key}_selected`] || 0), 0)
                      return (
                        <div key={key} className="text-center">
                          <div className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {total}
                          </div>
                          <div className="text-xs text-[#636E72]">{label} 지원</div>
                          <div className="text-xs font-medium mt-0.5" style={{ color: REGION_COLORS[key] }}>
                            선정 {selected}명
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-[#636E72] text-sm">데이터 로딩 중...</div>
              )}
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
