import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Radar, Users, Mail, Server, Loader2, TrendingUp, Zap
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

const REGIONS = [
  { value: '', label: '전체', flag: '' },
  { value: 'kr', label: '한국', flag: '🇰🇷' },
  { value: 'jp', label: '일본', flag: '🇯🇵' },
  { value: 'us', label: '미국', flag: '🇺🇸' }
]

const NAV_ITEMS = [
  { path: '/admin/openclo', label: '대시보드' },
  { path: '/admin/openclo/creators', label: '크리에이터' },
  { path: '/admin/discovery/servers', label: '서버 상태' },
  { path: '/admin/discovery/blocklist', label: '차단 목록' },
  { path: '/admin/discovery/emails', label: '이메일 현황' },
  { path: '/admin/openclo/kpi', label: 'KPI 통계' },
]

export function DiscoveryNav({ currentRegion, onRegionChange }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">오픈클로</h1>
            <p className="text-xs text-gray-400">크리에이터 자동 발굴 시스템</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {REGIONS.map(r => (
            <button
              key={r.value}
              onClick={() => onRegionChange(r.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentRegion === r.value
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.flag} {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1 border-b">
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              location.pathname === item.path
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export default function DiscoveryDashboard() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(true)
  const [servers, setServers] = useState([])
  const [kpi, setKpi] = useState({ totalCreators: 0, todayCreators: 0, todayEmails: 0, monthEmails: 0 })
  const [hourlyData, setHourlyData] = useState([])
  const [recentCreators, setRecentCreators] = useState([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()
      if (!admin) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  const fetchData = useCallback(async () => {
    try {
      const regionParam = region ? `&region=${region}` : ''

      const [serversRes, kpiRes, hourlyRes, recentRes] = await Promise.all([
        fetch(`/.netlify/functions/discovery-stats?type=servers`).then(r => r.json()),
        fetch(`/.netlify/functions/discovery-stats?type=kpi${regionParam}`).then(r => r.json()),
        fetch(`/.netlify/functions/discovery-stats?type=hourly${regionParam}`).then(r => r.json()),
        fetch(`/.netlify/functions/discovery-stats?type=recent${regionParam}`).then(r => r.json()),
      ])

      if (serversRes.success) setServers(serversRes.data || [])
      if (kpiRes.success) setKpi(kpiRes.data)
      if (hourlyRes.success) setHourlyData(buildHourlyChart(hourlyRes.data || []))
      if (recentRes.success) setRecentCreators(recentRes.data || [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [region])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // 30초 자동 갱신
    return () => clearInterval(interval)
  }, [fetchData])

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

        {/* 서버 상태 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {servers.length > 0 ? servers.map(server => {
            const isAlive = server.status === 'alive' && isRecentHeartbeat(server.last_heartbeat_at)
            return (
              <Card key={server.server_name}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-sm">{server.server_name}</span>
                    </div>
                    <Badge className={isAlive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {isAlive ? 'alive' : 'down'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>CPU</span>
                      <span style={{ fontFamily: "'Outfit', sans-serif" }}>{server.cpu_percent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>메모리</span>
                      <span style={{ fontFamily: "'Outfit', sans-serif" }}>{server.memory_percent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>오늘 수집</span>
                      <span style={{ fontFamily: "'Outfit', sans-serif" }}>{server.today_discovered || 0}</span>
                    </div>
                    <div className={`flex justify-between ${!isRecentHeartbeat(server.last_heartbeat_at) ? 'text-red-500' : ''}`}>
                      <span>마지막 응답</span>
                      <span>{timeAgo(server.last_heartbeat_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }) : (
            <Card className="col-span-3">
              <CardContent className="p-5 text-center text-gray-400 text-sm">
                서버 heartbeat 데이터가 없습니다.
              </CardContent>
            </Card>
          )}
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={<Zap className="w-5 h-5" />} label="오늘 스캔" value={kpi.todayCreators} />
          <KpiCard icon={<Mail className="w-5 h-5" />} label="오늘 이메일" value={kpi.todayEmails} />
          <KpiCard icon={<Mail className="w-5 h-5" />} label="이번달 이메일" value={kpi.monthEmails} />
          <KpiCard icon={<Users className="w-5 h-5" />} label="전체 크리에이터" value={kpi.totalCreators} />
        </div>

        {/* 시간별 수집 차트 */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              시간별 수집 현황 (24시간)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 최근 발굴 리스트 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">최근 발굴 크리에이터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">유저네임</th>
                    <th className="pb-2 font-medium">플랫폼</th>
                    <th className="pb-2 font-medium">팔로워</th>
                    <th className="pb-2 font-medium">이메일</th>
                    <th className="pb-2 font-medium">K-뷰티 점수</th>
                    <th className="pb-2 font-medium">리전</th>
                    <th className="pb-2 font-medium">수집일</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCreators.map(c => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 font-medium">
                        @{c.username}
                        {c.is_special_target && <Badge className="ml-1 bg-amber-100 text-amber-700 text-[10px]">VIP</Badge>}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">{c.platform}</Badge>
                      </td>
                      <td className="py-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {formatNumber(c.followers)}
                      </td>
                      <td className="py-2">
                        {c.email ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">있음</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-400 text-[10px]">없음</Badge>
                        )}
                      </td>
                      <td className="py-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        <span className={c.kbeauty_score >= 80 ? 'text-violet-600 font-bold' : c.kbeauty_score >= 50 ? 'text-amber-600' : 'text-gray-400'}>
                          {c.kbeauty_score || '-'}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-gray-500">{c.region}</td>
                      <td className="py-2 text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                  {recentCreators.length === 0 && (
                    <tr><td colSpan="7" className="py-8 text-center text-gray-400">데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: '#6C5CE7' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F0EDFF', color: '#6C5CE7' }}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function buildHourlyChart(runs) {
  const hours = {}
  for (let i = 0; i < 24; i++) {
    hours[i] = { hour: `${String(i).padStart(2, '0')}:00`, count: 0 }
  }
  runs.forEach(r => {
    const h = new Date(r.started_at).getHours()
    hours[h].count += r.new_count || 0
  })
  return Object.values(hours)
}

function isRecentHeartbeat(timestamp) {
  if (!timestamp) return false
  return (Date.now() - new Date(timestamp).getTime()) < 2 * 60 * 1000 // 2분
}

function timeAgo(timestamp) {
  if (!timestamp) return '-'
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  return `${Math.floor(diff / 3600)}시간 전`
}
