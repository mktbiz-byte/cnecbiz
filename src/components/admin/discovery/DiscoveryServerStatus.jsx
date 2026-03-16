import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Server, Cpu, HardDrive, MemoryStick, Loader2, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { DiscoveryNav } from './DiscoveryDashboard'

export default function DiscoveryServerStatus() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(true)
  const [servers, setServers] = useState([])

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

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/discovery-stats?type=servers')
      const data = await res.json()
      if (data.success) setServers(data.data || [])
    } catch (err) {
      console.error('Fetch servers error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
    const interval = setInterval(fetchServers, 30000)
    return () => clearInterval(interval)
  }, [fetchServers])

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

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">서버 상태 모니터링</h2>
          <Button variant="outline" size="sm" onClick={fetchServers}>
            <RefreshCw className="w-4 h-4 mr-1" />
            새로고침
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {servers.length > 0 ? servers.map(server => {
            const isAlive = server.status === 'alive' && isRecentHeartbeat(server.last_heartbeat_at)
            return (
              <Card key={server.server_name} className={!isAlive ? 'border-red-200' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      {server.server_name}
                    </CardTitle>
                    <Badge className={isAlive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {isAlive ? 'alive' : 'down'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">{server.server_region}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* CPU */}
                  <MetricBar
                    icon={<Cpu className="w-4 h-4" />}
                    label="CPU"
                    value={server.cpu_percent}
                    color={getMetricColor(server.cpu_percent)}
                  />

                  {/* Memory */}
                  <MetricBar
                    icon={<MemoryStick className="w-4 h-4" />}
                    label="메모리"
                    value={server.memory_percent}
                    color={getMetricColor(server.memory_percent)}
                  />

                  {/* Disk */}
                  <MetricBar
                    icon={<HardDrive className="w-4 h-4" />}
                    label="디스크"
                    value={server.disk_percent}
                    color={getMetricColor(server.disk_percent)}
                  />

                  {/* 오늘 통계 */}
                  <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">오늘 발굴</span>
                      <span className="font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {(server.today_discovered || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">오늘 이메일</span>
                      <span className="font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {(server.today_emails_sent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">오늘 DM</span>
                      <span className="font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {(server.today_dms_sent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IC 크레딧</span>
                      <span className="font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {server.ic_credits_remaining >= 0 ? server.ic_credits_remaining.toLocaleString() : '-'}
                      </span>
                    </div>
                  </div>

                  {/* 마지막 heartbeat */}
                  <div className={`text-xs pt-2 border-t ${!isRecentHeartbeat(server.last_heartbeat_at) ? 'text-red-500' : 'text-gray-400'}`}>
                    마지막 응답: {timeAgo(server.last_heartbeat_at)}
                  </div>
                </CardContent>
              </Card>
            )
          }) : (
            <Card className="col-span-3">
              <CardContent className="p-12 text-center text-gray-400">
                서버 heartbeat 데이터가 없습니다.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricBar({ icon, label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-sm font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {value != null ? `${value}%` : '-'}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(value || 0, 100)}%`, background: color }}
        />
      </div>
    </div>
  )
}

function getMetricColor(value) {
  if (value >= 90) return '#ef4444'
  if (value >= 70) return '#f59e0b'
  return '#6C5CE7'
}

function isRecentHeartbeat(timestamp) {
  if (!timestamp) return false
  return (Date.now() - new Date(timestamp).getTime()) < 2 * 60 * 1000
}

function timeAgo(timestamp) {
  if (!timestamp) return '-'
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  return `${Math.floor(diff / 3600)}시간 전`
}
