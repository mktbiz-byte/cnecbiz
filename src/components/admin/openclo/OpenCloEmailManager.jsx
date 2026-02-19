import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Mail, Send, Loader2, RefreshCw, UserPlus, ArrowRight, CheckCircle
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

export default function OpenCloEmailManager() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [loading, setLoading] = useState(true)
  const [funnelData, setFunnelData] = useState({})
  const [pendingEmails, setPendingEmails] = useState([])
  const [emailLogs, setEmailLogs] = useState([])
  const [replies, setReplies] = useState([])
  const [conversions, setConversions] = useState([])
  const [templates, setTemplates] = useState({})
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [dateRange, setDateRange] = useState('7')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 퍼널 데이터
      const statuses = ['none', 'email_1', 'email_2', 'email_3', 'replied', 'registered', 'collab']
      const funnel = {}
      for (const status of statuses) {
        const { count } = await supabaseBiz
          .from('oc_creators')
          .select('*', { count: 'exact', head: true })
          .eq('region', region)
          .eq('status', 'approved')
          .eq('is_registered', false)
          .eq('contact_status', status)
        funnel[status] = count || 0
      }
      // 가입자 수
      const { count: regCount } = await supabaseBiz
        .from('oc_creators')
        .select('*', { count: 'exact', head: true })
        .eq('region', region)
        .eq('is_registered', true)
      funnel['registered_total'] = regCount || 0
      setFunnelData(funnel)

      // 발송 대기 (오늘 발송 가능)
      const { data: pending } = await supabaseBiz
        .from('oc_creators')
        .select('*')
        .eq('region', region)
        .eq('status', 'approved')
        .eq('is_registered', false)
        .not('email', 'is', null)
        .in('contact_status', ['none', 'email_1', 'email_2'])
        .order('created_at', { ascending: true })
        .limit(20)
      setPendingEmails(pending || [])

      // 발송 이력
      const cutoff = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString()
      const { data: logs } = await supabaseBiz
        .from('oc_contact_logs')
        .select('*, oc_creators!inner(username, email, region)')
        .eq('type', 'email')
        .eq('oc_creators.region', region)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(100)
      setEmailLogs(logs || [])

      // 회신 목록
      const { data: replyData } = await supabaseBiz
        .from('oc_creators')
        .select('*')
        .eq('region', region)
        .eq('contact_status', 'replied')
        .order('updated_at', { ascending: false })
      setReplies(replyData || [])

      // 가입 전환
      const { data: convData } = await supabaseBiz
        .from('oc_creators')
        .select('*')
        .eq('region', region)
        .eq('is_registered', true)
        .not('email_1_sent_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(20)
      setConversions(convData || [])

      // 이메일 템플릿
      const { data: config } = await supabaseBiz
        .from('oc_bot_config')
        .select('email_template_1, email_template_2, email_template_3')
        .eq('region', region)
        .limit(1)
        .maybeSingle()
      setTemplates(config || {})
    } catch (err) {
      console.error('Email manager fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [region, dateRange])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleManualTrigger = async () => {
    if (!confirm('오늘 발송을 즉시 실행하시겠습니까?')) return
    setTriggerLoading(true)
    try {
      const res = await fetch('/.netlify/functions/scheduled-openclo-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const result = await res.json()
      alert(result.success ? `발송 완료! ${result.results?.length || 0}건 처리` : '실패: ' + result.error)
      fetchData()
    } catch (err) {
      alert('트리거 실패: ' + err.message)
    } finally {
      setTriggerLoading(false)
    }
  }

  const handleCollab = async (id) => {
    await supabaseBiz.from('oc_creators').update({ contact_status: 'collab' }).eq('id', id)
    fetchData()
  }

  const resultColors = {
    sent: 'bg-blue-100 text-blue-700',
    opened: 'bg-yellow-100 text-yellow-700',
    replied: 'bg-green-100 text-green-700',
    bounced: 'bg-red-100 text-red-700',
    registered: 'bg-emerald-100 text-emerald-700'
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
        ) : (
          <div className="space-y-6">
            {/* 퍼널 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">이메일 발송 퍼널</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {[
                    { key: 'none', label: '미발송', color: 'bg-gray-100' },
                    { key: 'email_1', label: '1차 발송', color: 'bg-blue-100' },
                    { key: 'email_2', label: '2차 발송', color: 'bg-indigo-100' },
                    { key: 'email_3', label: '3차 발송', color: 'bg-purple-100' },
                    { key: 'replied', label: '회신', color: 'bg-green-100' },
                    { key: 'registered_total', label: '가입', color: 'bg-emerald-100' }
                  ].map((step, i) => (
                    <div key={step.key} className="flex items-center gap-2">
                      <div className={`${step.color} rounded-lg p-3 text-center min-w-[80px]`}>
                        <p className="text-lg font-bold">{funnelData[step.key] || 0}</p>
                        <p className="text-xs text-gray-500">{step.label}</p>
                      </div>
                      {i < 5 && <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 발송 대기 */}
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">발송 대기 ({pendingEmails.length}명)</CardTitle>
                <Button size="sm" onClick={handleManualTrigger} disabled={triggerLoading}>
                  {triggerLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                  전체 발송 실행
                </Button>
              </CardHeader>
              <CardContent>
                {pendingEmails.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">발송 대기 중인 크리에이터가 없습니다</p>
                ) : (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {pendingEmails.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">{c.platform === 'instagram' ? 'IG' : c.platform === 'youtube' ? 'YT' : 'TT'}</Badge>
                          <span className="font-medium">@{c.username}</span>
                          <span className="text-gray-400">{c.email}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {c.contact_status === 'none' ? '1차 예정' : c.contact_status === 'email_1' ? '2차 예정' : '3차 예정'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 발송 이력 */}
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">발송 이력</CardTitle>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="text-xs border rounded px-2 py-1">
                  <option value="7">최근 7일</option>
                  <option value="30">최근 30일</option>
                  <option value="90">최근 90일</option>
                </select>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="p-3 text-left">시간</th>
                        <th className="p-3 text-left">크리에이터</th>
                        <th className="p-3 text-left">이메일</th>
                        <th className="p-3 text-center">회차</th>
                        <th className="p-3 text-left">제목</th>
                        <th className="p-3 text-center">결과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">발송 이력이 없습니다</td></tr>
                      ) : emailLogs.map(log => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-xs text-gray-500">{new Date(log.created_at).toLocaleString('ko-KR')}</td>
                          <td className="p-3">@{log.oc_creators?.username || '-'}</td>
                          <td className="p-3 text-gray-400">{log.oc_creators?.email || '-'}</td>
                          <td className="p-3 text-center">{log.email_sequence || '-'}차</td>
                          <td className="p-3 text-xs truncate max-w-[200px]">{log.subject || '-'}</td>
                          <td className="p-3 text-center">
                            <Badge className={`text-xs ${resultColors[log.result] || 'bg-gray-100'}`}>
                              {log.result || '-'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 회신 관리 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">회신 ({replies.length}건)</CardTitle>
              </CardHeader>
              <CardContent>
                {replies.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">회신이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {replies.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <span className="font-medium">@{c.username}</span>
                          <span className="text-gray-500 ml-2">{c.email}</span>
                        </div>
                        <Button size="sm" onClick={() => handleCollab(c.id)} className="bg-violet-600 hover:bg-violet-700">
                          <CheckCircle className="w-3 h-3 mr-1" /> 협업 진행
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 가입 전환 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-600" /> 가입 전환 추적
                </CardTitle>
              </CardHeader>
              <CardContent>
                {conversions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">메일 발송 후 가입한 크리에이터가 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {conversions.map(c => {
                      const sentAt = c.email_1_sent_at
                      const daysToConvert = sentAt ? Math.floor((new Date(c.updated_at) - new Date(sentAt)) / (24 * 60 * 60 * 1000)) : '?'
                      return (
                        <div key={c.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700 text-xs">CNEC 가입</Badge>
                            <span className="font-medium">@{c.username}</span>
                            <span className="text-gray-400">{c.platform}</span>
                          </div>
                          <span className="text-xs text-gray-500">{daysToConvert}일 만에 전환</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 템플릿 미리보기 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">이메일 템플릿 미리보기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="border rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">{n}차 이메일</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {templates[`email_template_${n}`] || '(미설정)'}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
