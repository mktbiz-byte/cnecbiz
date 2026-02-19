import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, Loader2, Target
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

const MONTHLY_GOALS = {
  profiles_visited: 30000,
  new_creators: 9000,
  approved: 2700,
  emails_collected: 1600,
  emails_sent: 1600,
  emails_opened: 320,
  replies_received: 80,
  new_registrations: 24
}

const GOAL_LABELS = {
  profiles_visited: '프로필 탐색',
  new_creators: '신규 크리에이터',
  approved: 'AI 승인',
  emails_collected: '이메일 수집',
  emails_sent: '이메일 발송',
  emails_opened: '이메일 오픈',
  replies_received: '회신',
  new_registrations: '가입 전환'
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']
const PIE_COLORS = ['#e879f9', '#f87171', '#38bdf8']

export default function OpenCloKPI() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [dailyKPI, setDailyKPI] = useState([])
  const [monthlyTotals, setMonthlyTotals] = useState({})
  const [platformDist, setPlatformDist] = useState([])
  const [scoreDist, setScoreDist] = useState([])
  const [conversionBySequence, setConversionBySequence] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const cutoff = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // 일별 KPI
      const { data: kpiData } = await supabaseBiz
        .from('oc_daily_kpi')
        .select('*')
        .eq('region', region)
        .gte('date', cutoff)
        .order('date', { ascending: true })
      setDailyKPI(kpiData || [])

      // 이번 달 합계
      const firstOfMonth = new Date()
      firstOfMonth.setDate(1)
      const monthStart = firstOfMonth.toISOString().split('T')[0]
      const { data: monthData } = await supabaseBiz
        .from('oc_daily_kpi')
        .select('*')
        .eq('region', region)
        .gte('date', monthStart)

      const totals = {}
      for (const key of Object.keys(MONTHLY_GOALS)) {
        totals[key] = (monthData || []).reduce((sum, d) => sum + (d[key] || 0), 0)
      }
      setMonthlyTotals(totals)

      // 플랫폼 분포
      const platforms = ['instagram', 'youtube', 'tiktok']
      const dist = []
      for (const p of platforms) {
        const { count } = await supabaseBiz
          .from('oc_creators')
          .select('*', { count: 'exact', head: true })
          .eq('region', region)
          .eq('platform', p)
        dist.push({ name: p === 'instagram' ? 'Instagram' : p === 'youtube' ? 'YouTube' : 'TikTok', value: count || 0 })
      }
      setPlatformDist(dist)

      // 점수 분포
      const { data: creators } = await supabaseBiz
        .from('oc_creators')
        .select('suspicion_score')
        .eq('region', region)
        .not('suspicion_score', 'is', null)

      const scoreBuckets = Array.from({ length: 10 }, (_, i) => ({
        range: `${i * 10}-${(i + 1) * 10}`,
        count: 0
      }))
      ;(creators || []).forEach(c => {
        const idx = Math.min(Math.floor(c.suspicion_score / 10), 9)
        scoreBuckets[idx].count++
      })
      setScoreDist(scoreBuckets)

      // 이메일 회차별 전환
      const { data: converted } = await supabaseBiz
        .from('oc_creators')
        .select('email_1_sent_at, email_2_sent_at, email_3_sent_at, is_registered')
        .eq('region', region)
        .eq('is_registered', true)
        .not('email_1_sent_at', 'is', null)

      const seqConversion = [
        { name: '1차에서 가입', count: 0 },
        { name: '2차에서 가입', count: 0 },
        { name: '3차에서 가입', count: 0 }
      ]
      ;(converted || []).forEach(c => {
        if (c.email_3_sent_at) seqConversion[2].count++
        else if (c.email_2_sent_at) seqConversion[1].count++
        else seqConversion[0].count++
      })
      setConversionBySequence(seqConversion)
    } catch (err) {
      console.error('KPI fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [region, period])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">KPI 통계</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {[{ v: '7', l: '7일' }, { v: '30', l: '30일' }, { v: '90', l: '90일' }].map(o => (
              <button key={o.v} onClick={() => setPeriod(o.v)}
                className={`px-3 py-1 rounded-md text-xs font-medium ${period === o.v ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
        ) : (
          <div className="space-y-6">
            {/* 월간 목표 달성률 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(MONTHLY_GOALS).map(([key, goal]) => {
                const current = monthlyTotals[key] || 0
                const pct = Math.min(Math.round((current / goal) * 100), 100)
                return (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500">{GOAL_LABELS[key]}</p>
                        <Badge variant="outline" className="text-xs">{pct}%</Badge>
                      </div>
                      <p className="text-xl font-bold">{current.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">목표: {goal.toLocaleString()}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* 일간 추이 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">일간 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyKPI}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="profiles_visited" name="탐색" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="new_creators" name="신규" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="emails_sent" name="이메일" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="new_registrations" name="가입" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 플랫폼 분포 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">플랫폼별 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={platformDist} cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                        {platformDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 점수 분포 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">의심 점수 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={scoreDist}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="크리에이터 수">
                        {scoreDist.map((_, i) => (
                          <Cell key={i} fill={i < 3 ? '#10b981' : i < 7 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 이메일 회차별 전환 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">이메일 회차별 전환</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={conversionBySequence} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" name="가입 수" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 봇 안정성 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">봇 안정성</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailyKPI}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="errors_count" name="에러" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="captcha_count" name="CAPTCHA" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
