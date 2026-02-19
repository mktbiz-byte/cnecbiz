import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bot, Play, Loader2, RefreshCw, AlertTriangle
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

export default function OpenCloBotStatus() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [botStatus, setBotStatus] = useState('unknown')
  const [todayStats, setTodayStats] = useState({ total: 0, errors: 0 })
  const [triggerLoading, setTriggerLoading] = useState(null)
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterSuccess, setFilterSuccess] = useState('all')
  const [pendingCount, setPendingCount] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // 최근 로그 100건
      let query = supabaseBiz.from('oc_bot_activity_logs').select('*').eq('region', region).order('created_at', { ascending: false }).limit(100)
      if (filterPlatform !== 'all') query = query.eq('platform', filterPlatform)
      if (filterSuccess !== 'all') query = query.eq('success', filterSuccess === 'true')
      const { data: logData } = await query
      setLogs(logData || [])

      // 봇 상태 판단
      const latest = logData?.[0]
      if (latest) {
        const minutesAgo = (Date.now() - new Date(latest.created_at).getTime()) / 60000
        if (minutesAgo < 35) setBotStatus('running')
        else if (minutesAgo < 60) setBotStatus('delayed')
        else setBotStatus('stopped')
      } else {
        setBotStatus('unknown')
      }

      // 오늘 통계
      const { count: totalToday } = await supabaseBiz.from('oc_bot_activity_logs').select('*', { count: 'exact', head: true }).eq('region', region).gte('created_at', today)
      const { count: errorsToday } = await supabaseBiz.from('oc_bot_activity_logs').select('*', { count: 'exact', head: true }).eq('region', region).eq('success', false).gte('created_at', today)
      setTodayStats({ total: totalToday || 0, errors: errorsToday || 0 })

      // 미분석 크리에이터 수
      const { count: pending } = await supabaseBiz.from('oc_creators').select('*', { count: 'exact', head: true }).eq('region', region).eq('status', 'pending').is('ai_summary', null)
      setPendingCount(pending || 0)
    } catch (err) {
      console.error('Bot status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [region, filterPlatform, filterSuccess])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTrigger = async (platform) => {
    setTriggerLoading(platform)
    try {
      const res = await fetch(`/.netlify/functions/openclo-bot-${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region })
      })
      const result = await res.json()
      if (result.success) {
        alert(`${platform} 크롤링 완료!\n방문: ${result.visited}개, 신규: ${result.new}개`)
      } else {
        alert('실패: ' + (result.error || 'Unknown error'))
      }
      fetchData()
    } catch (err) {
      alert('트리거 실패: ' + err.message)
    } finally {
      setTriggerLoading(null)
    }
  }

  const handleBulkAnalyze = async () => {
    if (pendingCount === 0) { alert('미분석 크리에이터가 없습니다'); return }
    setTriggerLoading('analyze')
    try {
      const { data: pending } = await supabaseBiz
        .from('oc_creators')
        .select('id')
        .eq('region', region)
        .eq('status', 'pending')
        .is('ai_summary', null)
        .limit(20)

      if (pending && pending.length > 0) {
        await fetch('/.netlify/functions/openclo-ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creator_ids: pending.map(c => c.id) })
        })
        alert(`${pending.length}명 AI 분석 요청 완료`)
      }
      fetchData()
    } catch (err) {
      alert('AI 분석 실패: ' + err.message)
    } finally {
      setTriggerLoading(null)
    }
  }

  const statusConfig = {
    running: { color: 'bg-green-100 text-green-700', label: '가동중', dot: 'bg-green-500' },
    delayed: { color: 'bg-yellow-100 text-yellow-700', label: '지연', dot: 'bg-yellow-500' },
    stopped: { color: 'bg-red-100 text-red-700', label: '중단', dot: 'bg-red-500' },
    unknown: { color: 'bg-gray-100 text-gray-500', label: '미확인', dot: 'bg-gray-400' }
  }

  const st = statusConfig[botStatus]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        {/* 상태 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${st.dot} animate-pulse`} />
              <div>
                <p className="text-xs text-gray-500">봇 상태</p>
                <p className={`text-sm font-medium ${st.color.split(' ')[1]}`}>{st.label}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">오늘 활동</p>
              <p className="text-xl font-bold">{todayStats.total}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">오늘 에러</p>
              <p className={`text-xl font-bold ${todayStats.errors > 0 ? 'text-red-500' : ''}`}>{todayStats.errors}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">미분석 대기</p>
              <p className="text-xl font-bold text-amber-600">{pendingCount}명</p>
            </CardContent>
          </Card>
        </div>

        {/* 수동 트리거 */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">수동 트리거</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['instagram', 'youtube', 'tiktok'].map(p => (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTrigger(p)}
                  disabled={triggerLoading !== null}
                >
                  {triggerLoading === p ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                  {p.charAt(0).toUpperCase() + p.slice(1)} 즉시 크롤링
                </Button>
              ))}
              <Button
                variant="outline" size="sm"
                onClick={handleBulkAnalyze}
                disabled={triggerLoading !== null || pendingCount === 0}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {triggerLoading === 'analyze' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                AI 일괄 분석 ({pendingCount}명)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 로그 필터 */}
        <div className="flex items-center gap-2 mb-3">
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="text-xs border rounded px-2 py-1">
            <option value="all">전체 플랫폼</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
          </select>
          <select value={filterSuccess} onChange={e => setFilterSuccess(e.target.value)} className="text-xs border rounded px-2 py-1">
            <option value="all">전체 결과</option>
            <option value="true">성공</option>
            <option value="false">실패</option>
          </select>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="w-3 h-3 mr-1" /> 새로고침
          </Button>
        </div>

        {/* 로그 테이블 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-left">시간</th>
                    <th className="p-3 text-left">플랫폼</th>
                    <th className="p-3 text-left">액션</th>
                    <th className="p-3 text-center">결과</th>
                    <th className="p-3 text-right">소요시간</th>
                    <th className="p-3 text-left">에러</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">로그가 없습니다</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className={`border-b ${!log.success ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="p-3 text-xs text-gray-500">{new Date(log.created_at).toLocaleString('ko-KR')}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{log.platform || '-'}</Badge></td>
                      <td className="p-3">{log.action}</td>
                      <td className="p-3 text-center">
                        {log.success ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">성공</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">실패</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right text-xs">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                      <td className="p-3 text-xs text-red-500 max-w-xs truncate">{log.error_message || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
