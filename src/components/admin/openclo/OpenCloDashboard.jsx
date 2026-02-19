import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, Mail, UserPlus, Activity, Bot, AlertTriangle,
  RefreshCw, Loader2, ExternalLink, Globe, TrendingUp, Send, MessageSquare
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

const REGIONS = [
  { value: 'korea', label: '한국', flag: '🇰🇷' },
  { value: 'japan', label: '일본', flag: '🇯🇵' },
  { value: 'us', label: '미국', flag: '🇺🇸' }
]

const NAV_ITEMS = [
  { path: '/admin/openclo', label: '대시보드' },
  { path: '/admin/openclo/creators', label: '크리에이터' },
  { path: '/admin/openclo/review', label: '검토 대기열' },
  { path: '/admin/openclo/bot-status', label: '봇 상태' },
  { path: '/admin/openclo/bot-config', label: '봇 설정' },
  { path: '/admin/openclo/emails', label: '이메일' },
  { path: '/admin/openclo/kpi', label: 'KPI' }
]

export function OpenCloNav({ currentRegion, onRegionChange }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">OpenClo</h1>
            <p className="text-xs text-gray-400">크리에이터 자동 탐색 시스템</p>
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

export default function OpenCloDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [region, setRegion] = useState('korea')
  const [kpi, setKpi] = useState({})
  const [botStatus, setBotStatus] = useState('unknown')
  const [lastActivity, setLastActivity] = useState(null)
  const [todayErrors, setTodayErrors] = useState(0)
  const [recentLogs, setRecentLogs] = useState([])
  const [registeredCount, setRegisteredCount] = useState(0)
  const [platformStats, setPlatformStats] = useState({})
  const [naverSending, setNaverSending] = useState(false)

  const handleSendNaverWorks = async () => {
    const regionLabels = { korea: '한국', japan: '일본', us: '미국' }
    const statusLabels = { running: '가동중', delayed: '지연', stopped: '중단', unknown: '미확인' }
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    const msg = `📊 오픈클로 현황 리포트 (수동)\n━━━━━━━━━━━━━━━━━\n📅 ${now}\n🌏 리전: ${regionLabels[region] || region}\n\n🤖 봇 상태: ${statusLabels[botStatus]}\n⚠️ 오늘 에러: ${todayErrors}건\n\n📈 오늘 KPI\n• 프로필 탐색: ${kpi.profiles_visited || 0}개\n• 신규 크리에이터: ${kpi.new_creators || 0}명\n• 이메일 발송: ${kpi.emails_sent || 0}건\n• 가입 전환: ${kpi.new_registrations || 0}명\n\n📱 플랫폼별\n• Instagram: ${platformStats.instagram || 0}명\n• YouTube: ${platformStats.youtube || 0}명\n• TikTok: ${platformStats.tiktok || 0}명\n\n✅ 누적 가입: ${registeredCount}명\n\n🔗 https://cnecbiz.com/admin/openclo`

    setNaverSending(true)
    try {
      const res = await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdminNotification: true, message: msg })
      })
      const result = await res.json()
      if (result.success) {
        alert('네이버웍스로 리포트가 발송되었습니다!')
      } else {
        alert('발송 실패: ' + (result.error || result.details || 'Unknown'))
      }
    } catch (err) {
      alert('발송 실패: ' + err.message)
    } finally {
      setNaverSending(false)
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // KPI
      const { data: kpiData } = await supabaseBiz
        .from('oc_daily_kpi')
        .select('*')
        .eq('date', today)
        .eq('region', region)
        .maybeSingle()
      setKpi(kpiData || {})

      // 봇 상태
      const { data: latestLog } = await supabaseBiz
        .from('oc_bot_activity_logs')
        .select('*')
        .eq('region', region)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setLastActivity(latestLog)
      if (latestLog) {
        const minutesAgo = (Date.now() - new Date(latestLog.created_at).getTime()) / 60000
        if (minutesAgo < 35) setBotStatus('running')
        else if (minutesAgo < 60) setBotStatus('delayed')
        else setBotStatus('stopped')
      } else {
        setBotStatus('unknown')
      }

      // 오늘 에러
      const { count: errorCount } = await supabaseBiz
        .from('oc_bot_activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('region', region)
        .eq('success', false)
        .gte('created_at', today)
      setTodayErrors(errorCount || 0)

      // 최근 활동
      const { data: logs } = await supabaseBiz
        .from('oc_bot_activity_logs')
        .select('*')
        .eq('region', region)
        .order('created_at', { ascending: false })
        .limit(20)
      setRecentLogs(logs || [])

      // 가입자 수
      const { count: regCount } = await supabaseBiz
        .from('oc_creators')
        .select('*', { count: 'exact', head: true })
        .eq('region', region)
        .eq('is_registered', true)
      setRegisteredCount(regCount || 0)

      // 플랫폼별 통계
      for (const platform of ['instagram', 'youtube', 'tiktok']) {
        const { count } = await supabaseBiz
          .from('oc_creators')
          .select('*', { count: 'exact', head: true })
          .eq('region', region)
          .eq('platform', platform)
        setPlatformStats(prev => ({ ...prev, [platform]: count || 0 }))
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [region])

  useEffect(() => {
    // 인증 체크
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

  useEffect(() => {
    setLoading(true)
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const statusConfig = {
    running: { color: 'bg-green-100 text-green-700', label: '가동중', dot: 'bg-green-500' },
    delayed: { color: 'bg-yellow-100 text-yellow-700', label: '지연', dot: 'bg-yellow-500' },
    stopped: { color: 'bg-red-100 text-red-700', label: '중단', dot: 'bg-red-500' },
    unknown: { color: 'bg-gray-100 text-gray-500', label: '미확인', dot: 'bg-gray-400' }
  }

  const currentStatus = statusConfig[botStatus]
  const regionObj = REGIONS.find(r => r.value === region)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 네이버웍스 발송 버튼 */}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendNaverWorks}
                disabled={naverSending}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                {naverSending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                네이버웍스 리포트 발송
              </Button>
            </div>

            {/* KPI 카드 4개 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">오늘 탐색</p>
                      <p className="text-2xl font-bold">{kpi.profiles_visited || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-violet-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">신규 크리에이터</p>
                      <p className="text-2xl font-bold">{kpi.new_creators || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">이메일 발송</p>
                      <p className="text-2xl font-bold">{kpi.emails_sent || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">가입 전환</p>
                      <p className="text-2xl font-bold text-green-600">{kpi.new_registrations || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 봇 상태 + 가입자 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">봇 상태</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${currentStatus.dot} animate-pulse`} />
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${currentStatus.color}`}>
                      {currentStatus.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>마지막 활동: {lastActivity ? timeAgo(lastActivity.created_at) : '없음'}</p>
                    <p>오늘 에러: <span className={todayErrors > 0 ? 'text-red-500 font-medium' : ''}>{todayErrors}건</span></p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">이미 가입된 크리에이터</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {registeredCount}명 가입 확인
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">CNEC에 이미 가입한 크리에이터</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">플랫폼별 현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Instagram</span>
                      <span className="font-medium">{platformStats.instagram || 0}명</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">YouTube</span>
                      <span className="font-medium">{platformStats.youtube || 0}명</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">TikTok</span>
                      <span className="font-medium">{platformStats.tiktok || 0}명</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 최근 활동 */}
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium">최근 활동</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> 새로고침
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {recentLogs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">활동 기록이 없습니다</p>
                  ) : (
                    recentLogs.map(log => (
                      <div
                        key={log.id}
                        className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                          !log.success ? 'bg-red-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          log.success ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        <span className="text-gray-400 text-xs w-16 flex-shrink-0">
                          {new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.platform || '-'}
                        </Badge>
                        <span className="text-gray-600">{log.action}</span>
                        {log.duration_ms && (
                          <span className="text-gray-400 text-xs">{(log.duration_ms / 1000).toFixed(1)}s</span>
                        )}
                        {log.error_message && (
                          <span className="text-red-500 text-xs truncate">{log.error_message}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}
