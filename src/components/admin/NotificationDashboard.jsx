import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Bell, Mail, MessageSquare, Send, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function NotificationDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, byChannel: {} })
  const [filter, setFilter] = useState({ channel: 'all', status: 'all', period: '24h' })
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const channelConfig = {
    kakao: { label: '카카오 알림톡', icon: MessageSquare, color: '#FEE500' },
    email: { label: '이메일', icon: Mail, color: '#6C5CE7' },
    naver_works: { label: '네이버웍스', icon: Send, color: '#03C75A' },
    line: { label: 'LINE', icon: MessageSquare, color: '#06C755' },
    whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: '#25D366' },
    sms: { label: 'SMS', icon: MessageSquare, color: '#FF6B6B' }
  }

  const getPeriodFilter = useCallback(() => {
    const now = new Date()
    switch (filter.period) {
      case '1h': return new Date(now - 60 * 60 * 1000).toISOString()
      case '6h': return new Date(now - 6 * 60 * 60 * 1000).toISOString()
      case '24h': return new Date(now - 24 * 60 * 60 * 1000).toISOString()
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
      default: return new Date(now - 24 * 60 * 60 * 1000).toISOString()
    }
  }, [filter.period])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const since = getPeriodFilter()
      let query = supabaseBiz
        .from('notification_send_logs')
        .select('*', { count: 'exact' })
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filter.channel !== 'all') query = query.eq('channel', filter.channel)
      if (filter.status !== 'all') query = query.eq('status', filter.status)

      const { data, error, count } = await query
      if (error) throw error

      setLogs(data || [])

      // Fetch stats separately
      let statsQuery = supabaseBiz
        .from('notification_send_logs')
        .select('channel, status')
        .gte('created_at', since)

      const { data: allData } = await statsQuery
      if (allData) {
        const total = allData.length
        const success = allData.filter(d => d.status === 'success').length
        const failed = allData.filter(d => d.status === 'failed').length
        const byChannel = {}
        allData.forEach(d => {
          if (!byChannel[d.channel]) byChannel[d.channel] = { total: 0, success: 0, failed: 0 }
          byChannel[d.channel].total++
          if (d.status === 'success') byChannel[d.channel].success++
          if (d.status === 'failed') byChannel[d.channel].failed++
        })
        setStats({ total, success, failed, byChannel, totalCount: count })
      }
    } catch (error) {
      console.error('[NotificationDashboard] Error:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, page, getPeriodFilter])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/admin/login')
        return
      }
      fetchLogs()
    }
    checkAuth()
  }, [navigate, fetchLogs])

  useEffect(() => {
    // 30초마다 자동 새로고침
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getChannelBadge = (channel) => {
    const config = channelConfig[channel] || { label: channel, color: '#888' }
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-medium text-white"
        style={{ backgroundColor: config.color }}
      >
        {config.label}
      </span>
    )
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[#6C5CE7]" />
          <h1 className="text-2xl font-bold text-gray-900">알림 발송 대시보드</h1>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">총 발송</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">성공</div>
            <div className="text-2xl font-bold text-green-600">{stats.success.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">실패</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">성공률</div>
            <div className="text-2xl font-bold" style={{ color: parseFloat(successRate) >= 90 ? '#10B981' : parseFloat(successRate) >= 70 ? '#F59E0B' : '#EF4444' }}>
              {successRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">채널별 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(channelConfig).map(([key, config]) => {
              const ch = stats.byChannel[key] || { total: 0, success: 0, failed: 0 }
              return (
                <div key={key} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-xs font-medium text-gray-600">{config.label}</span>
                  </div>
                  <div className="text-lg font-bold">{ch.total}</div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span className="text-green-600">{ch.success}건</span>
                    {ch.failed > 0 && <span className="text-red-600">{ch.failed}건 실패</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border rounded-lg px-3 py-1.5 text-sm"
          value={filter.period}
          onChange={e => { setFilter(f => ({ ...f, period: e.target.value })); setPage(0) }}
        >
          <option value="1h">최근 1시간</option>
          <option value="6h">최근 6시간</option>
          <option value="24h">최근 24시간</option>
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
        </select>
        <select
          className="border rounded-lg px-3 py-1.5 text-sm"
          value={filter.channel}
          onChange={e => { setFilter(f => ({ ...f, channel: e.target.value })); setPage(0) }}
        >
          <option value="all">전체 채널</option>
          {Object.entries(channelConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 py-1.5 text-sm"
          value={filter.status}
          onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(0) }}
        >
          <option value="all">전체 상태</option>
          <option value="success">성공</option>
          <option value="failed">실패</option>
        </select>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>해당 기간의 알림 로그가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">시간</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">채널</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">함수</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">수신자</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">내용</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">에러</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr key={log.id} className={`hover:bg-gray-50 ${log.status === 'failed' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-500 text-xs">
                        {formatTime(log.created_at)}
                      </td>
                      <td className="px-4 py-2.5">{getChannelBadge(log.channel)}</td>
                      <td className="px-4 py-2.5">{getStatusIcon(log.status)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 font-mono">
                        {log.function_name || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[150px] truncate">
                        {log.recipient || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">
                        {log.message_preview || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-red-500 max-w-[200px] truncate">
                        {log.error_message && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            {log.error_message}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                이전
              </Button>
              <span className="text-sm text-gray-500">
                페이지 {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={logs.length < PAGE_SIZE}
                onClick={() => setPage(p => p + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 mt-4 text-center">30초마다 자동 새로고침</p>
    </div>
  )
}
