import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mail, Loader2, Send, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { DiscoveryNav } from './DiscoveryDashboard'

export default function DiscoveryEmailStatus() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(true)
  const [emailStats, setEmailStats] = useState({ queued: 0, sent: 0, failed: 0, bounced: 0 })
  const [recentEmails, setRecentEmails] = useState([])

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

  const fetchData = useCallback(async () => {
    try {
      const regionParam = region ? `&region=${region}` : ''

      // 이메일 상태 통계
      const statsRes = await fetch(`/.netlify/functions/discovery-stats?type=email_stats${regionParam}`)
      const statsData = await statsRes.json()
      if (statsData.success) setEmailStats(statsData.data)

      // 최근 이메일 50건
      let query = supabaseBiz.from('oc_email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (region) query = query.eq('server_region', region)

      const { data } = await query
      setRecentEmails(data || [])
    } catch (err) {
      console.error('Fetch email status error:', err)
    } finally {
      setLoading(false)
    }
  }, [region])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const total = emailStats.queued + emailStats.sent + emailStats.failed + emailStats.bounced

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

        {/* 이메일 퍼널 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <FunnelCard
            icon={<Mail className="w-5 h-5" />}
            label="대기중"
            value={emailStats.queued}
            total={total}
            color="#3b82f6"
            bgColor="#eff6ff"
          />
          <FunnelCard
            icon={<Send className="w-5 h-5" />}
            label="발송완료"
            value={emailStats.sent}
            total={total}
            color="#10b981"
            bgColor="#ecfdf5"
          />
          <FunnelCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="실패"
            value={emailStats.failed}
            total={total}
            color="#f59e0b"
            bgColor="#fffbeb"
          />
          <FunnelCard
            icon={<XCircle className="w-5 h-5" />}
            label="바운스"
            value={emailStats.bounced}
            total={total}
            color="#ef4444"
            bgColor="#fef2f2"
          />
        </div>

        {/* 퍼널 바 */}
        {total > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex h-4 rounded-full overflow-hidden">
                {emailStats.sent > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${(emailStats.sent / total) * 100}%` }} />
                )}
                {emailStats.queued > 0 && (
                  <div className="bg-blue-500 transition-all" style={{ width: `${(emailStats.queued / total) * 100}%` }} />
                )}
                {emailStats.failed > 0 && (
                  <div className="bg-amber-500 transition-all" style={{ width: `${(emailStats.failed / total) * 100}%` }} />
                )}
                {emailStats.bounced > 0 && (
                  <div className="bg-red-500 transition-all" style={{ width: `${(emailStats.bounced / total) * 100}%` }} />
                )}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>발송률: {total > 0 ? ((emailStats.sent / total) * 100).toFixed(1) : 0}%</span>
                <span>전체: {total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 최근 이메일 목록 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Mail className="w-4 h-4" />
              최근 이메일 발송 내역
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">유저네임</th>
                    <th className="px-4 py-3 font-medium">이메일</th>
                    <th className="px-4 py-3 font-medium">플랫폼</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">리전</th>
                    <th className="px-4 py-3 font-medium">발송일</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmails.map(e => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">@{e.creator_username || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[200px]">{e.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{e.platform || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] ${
                          e.status === 'sent' ? 'bg-green-100 text-green-700' :
                          e.status === 'queued' ? 'bg-blue-100 text-blue-700' :
                          e.status === 'failed' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {e.status}
                        </Badge>
                        {e.retry_count > 0 && (
                          <span className="text-[10px] text-gray-400 ml-1">retry:{e.retry_count}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.server_region}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {e.sent_at ? new Date(e.sent_at).toLocaleString('ko-KR') :
                         e.created_at ? new Date(e.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                    </tr>
                  ))}
                  {recentEmails.length === 0 && (
                    <tr><td colSpan="6" className="py-12 text-center text-gray-400">이메일 데이터가 없습니다.</td></tr>
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

function FunnelCard({ icon, label, value, total, color, bgColor }) {
  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif", color }}>
              {value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {percent}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: bgColor, color }}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
