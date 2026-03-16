import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3, Loader2, TrendingUp
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { DiscoveryNav } from './DiscoveryDashboard'

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function DiscoveryKPI() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)
  const [dailyTrend, setDailyTrend] = useState([])
  const [platformDist, setPlatformDist] = useState([])
  const [scoreDist, setScoreDist] = useState([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz
        .from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!admin) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  const fetchKPI = useCallback(async () => {
    setLoading(true)
    try {
      const startDate = new Date(Date.now() - period * 86400000).toISOString().split('T')[0]

      // 일별 발굴 트렌드
      let query = supabaseBiz.from('oc_discovery_runs')
        .select('started_at, new_count, api_source, server_region')
        .gte('started_at', `${startDate}T00:00:00Z`)
        .order('started_at', { ascending: true })

      if (region) query = query.eq('server_region', region)

      const { data: runs } = await query
      setDailyTrend(buildDailyTrend(runs || [], period))

      // 플랫폼별 분포
      let platQuery = supabaseBiz.from('oc_creators')
        .select('platform')
        .gte('created_at', `${startDate}T00:00:00Z`)

      if (region) platQuery = platQuery.eq('region', region)

      const { data: platData } = await platQuery
      setPlatformDist(buildPlatformDist(platData || []))

      // K-뷰티 점수 분포
      let scoreQuery = supabaseBiz.from('oc_creators')
        .select('kbeauty_score')
        .gt('kbeauty_score', 0)

      if (region) scoreQuery = scoreQuery.eq('region', region)

      const { data: scoreData } = await scoreQuery
      setScoreDist(buildScoreDist(scoreData || []))

    } catch (err) {
      console.error('Fetch KPI error:', err)
    } finally {
      setLoading(false)
    }
  }, [region, period])

  useEffect(() => { fetchKPI() }, [fetchKPI])

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 ml-0 md:ml-56 p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <DiscoveryNav currentRegion={region} onRegionChange={setRegion} />

        {/* 기간 선택 */}
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">기간:</span>
          {[7, 14, 30].map(d => (
            <Button
              key={d}
              variant={period === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(d)}
              className={period === d ? 'bg-violet-600 hover:bg-violet-700' : ''}
            >
              {d}일
            </Button>
          ))}
        </div>

        {/* 일별 발굴 트렌드 */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              일별 발굴 트렌드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="new_count" name="신규 발굴" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 플랫폼별 분포 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">플랫폼별 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6C5CE7" radius={[4, 4, 0, 0]}>
                      {platformDist.map((_, i) => (
                        <Bar key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* K-뷰티 점수 분포 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">K-뷰티 점수 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreDist.map((entry, i) => {
                        const colors = { '0-19': '#ef4444', '20-39': '#f59e0b', '40-59': '#eab308', '60-79': '#3b82f6', '80-100': '#8b5cf6' }
                        return <Bar key={i} fill={colors[entry.range] || '#6C5CE7'} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function buildDailyTrend(runs, period) {
  const days = {}
  for (let i = period - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    const shortDate = `${date.slice(5, 7)}/${date.slice(8, 10)}`
    days[date] = { date: shortDate, new_count: 0 }
  }
  runs.forEach(r => {
    const date = r.started_at.split('T')[0]
    if (days[date]) days[date].new_count += r.new_count || 0
  })
  return Object.values(days)
}

function buildPlatformDist(creators) {
  const counts = {}
  creators.forEach(c => {
    const p = c.platform || 'unknown'
    counts[p] = (counts[p] || 0) + 1
  })
  return Object.entries(counts).map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
}

function buildScoreDist(creators) {
  const ranges = { '0-19': 0, '20-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 }
  creators.forEach(c => {
    const s = c.kbeauty_score || 0
    if (s >= 80) ranges['80-100']++
    else if (s >= 60) ranges['60-79']++
    else if (s >= 40) ranges['40-59']++
    else if (s >= 20) ranges['20-39']++
    else ranges['0-19']++
  })
  return Object.entries(ranges).map(([range, count]) => ({ range, count }))
}
