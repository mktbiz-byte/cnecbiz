import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  MessageSquare, TrendingUp, Star, AlertCircle, Loader2,
  Send, CheckCircle2, XCircle, Search, BookOpen, RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

export default function ChatbotDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [unanswered, setUnanswered] = useState([])
  const [learningQueue, setLearningQueue] = useState([])
  const [botTypeFilter, setBotTypeFilter] = useState('')
  const [answerInput, setAnswerInput] = useState({})
  const [submitting, setSubmitting] = useState({})

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()
      if (!admin) { navigate('/admin/login'); return }
      fetchAll()
    }
    checkAuth()
  }, [navigate])

  const fetchAll = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchStats(), fetchUnanswered(), fetchLearning()])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    const res = await fetch('/.netlify/functions/chatbot-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_type: botTypeFilter || undefined })
    })
    const result = await res.json()
    if (result.success) setStats(result.data)
  }

  const fetchUnanswered = async () => {
    const { data } = await supabaseBiz
      .from('chatbot_unanswered')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(20)
    setUnanswered(data || [])
  }

  const fetchLearning = async () => {
    const res = await fetch('/.netlify/functions/chatbot-learning-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', limit: 10 })
    })
    const result = await res.json()
    if (result.success) setLearningQueue(result.data.items || [])
  }

  const handleAnswer = async (item) => {
    const answer = answerInput[item.id]
    if (!answer) return

    setSubmitting(prev => ({ ...prev, [item.id]: true }))
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      await fetch('/.netlify/functions/chatbot-answer-escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, answer, adminEmail: user?.email })
      })
      setAnswerInput(prev => ({ ...prev, [item.id]: '' }))
      await fetchUnanswered()
      await fetchStats()
    } catch (err) {
      alert(`답변 전송 실패: ${err.message}`)
    } finally {
      setSubmitting(prev => ({ ...prev, [item.id]: false }))
    }
  }

  const handleLearningAction = async (id, action, faqData) => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      await fetch('/.netlify/functions/chatbot-learning-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, adminEmail: user?.email, faq_data: faqData })
      })
      await fetchLearning()
      await fetchStats()
    } catch (err) {
      alert(`처리 실패: ${err.message}`)
    }
  }

  const COLORS = ['#6C5CE7', '#A29BFE', '#DFE6E9']

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-[#F8F9FA] p-6 lg:p-8 lg:ml-60 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7]" />
        </div>
      </>
    )
  }

  const pieData = stats ? [
    { name: '크리에이터', value: stats.todayConversations > 0 ? Math.round(stats.todayConversations * 0.6) : 0 },
    { name: '기업', value: stats.todayConversations > 0 ? Math.round(stats.todayConversations * 0.4) : 0 }
  ] : []

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-[#F8F9FA] p-6 lg:p-8 lg:ml-60">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>AI 챗봇 대시보드</h1>
              <p className="text-sm text-[#636E72] mt-1">카카오톡 챗봇 운영 현황</p>
            </div>
            <Button onClick={fetchAll} variant="outline" className="gap-2 rounded-xl border-[#DFE6E9]">
              <RefreshCw className="w-4 h-4" /> 새로고침
            </Button>
          </div>

          {/* 통계 카드 */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: '오늘 대화', value: stats.todayConversations, icon: MessageSquare },
                { label: '응답률', value: `${stats.responseRate}%`, icon: TrendingUp },
                { label: '평균 만족도', value: stats.avgRating ? `${stats.avgRating}/5` : '-', icon: Star },
                { label: '미답변 대기', value: stats.pendingUnanswered, icon: AlertCircle }
              ].map((card, i) => (
                <Card key={i} className="border-[#DFE6E9] rounded-2xl shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#636E72]">{card.label}</p>
                        <p className="text-2xl font-bold text-[#1A1A2E] mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{card.value}</p>
                      </div>
                      <div className="w-10 h-10 bg-[#F0EDFF] rounded-xl flex items-center justify-center">
                        <card.icon className="w-5 h-5 text-[#6C5CE7]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 차트 영역 */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2 border-[#DFE6E9] rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[#1A1A2E]">최근 7일 대화 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stats.dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DFE6E9" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#636E72' }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 12, fill: '#636E72' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#6C5CE7" strokeWidth={2} dot={{ fill: '#6C5CE7' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[#1A1A2E]">현황 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#636E72]">활성 FAQ</span>
                    <span className="font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.activeFaqs}개</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#636E72]">총 대화</span>
                    <span className="font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.totalConversations}건</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#636E72]">학습 대기</span>
                    <span className="font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.pendingLearning}건</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#636E72]">총 에스컬레이션</span>
                    <span className="font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>{stats.totalEscalations}건</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 미답변 큐 */}
          <Card className="border-[#DFE6E9] rounded-2xl shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#1A1A2E] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#6C5CE7]" /> 미답변 대기 ({unanswered.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unanswered.length === 0 ? (
                <p className="text-sm text-[#B2BEC3] text-center py-8">대기 중인 미답변이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {unanswered.map(item => (
                    <div key={item.id} className="bg-[#F8F9FA] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-xs bg-[#F0EDFF] text-[#6C5CE7] hover:bg-[#F0EDFF]">
                              {item.bot_type === 'creator' ? '크리에이터' : '기업'}
                            </Badge>
                            <span className="text-xs text-[#B2BEC3]">
                              {new Date(item.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </span>
                          </div>
                          <p className="text-sm text-[#1A1A2E] font-medium">{item.question}</p>
                          {item.confidence && (
                            <p className="text-xs text-[#B2BEC3] mt-1">확신도: {(item.confidence * 100).toFixed(0)}%</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Input
                          placeholder="답변 입력..."
                          value={answerInput[item.id] || ''}
                          onChange={e => setAnswerInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="text-sm rounded-lg border-[#DFE6E9]"
                          onKeyDown={e => e.key === 'Enter' && handleAnswer(item)}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAnswer(item)}
                          disabled={!answerInput[item.id] || submitting[item.id]}
                          className="bg-[#6C5CE7] hover:bg-[#5A4BD6] rounded-lg whitespace-nowrap"
                        >
                          {submitting[item.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 학습 승인 대기 */}
          <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#1A1A2E] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#6C5CE7]" /> 학습 승인 대기 ({learningQueue.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {learningQueue.length === 0 ? (
                <p className="text-sm text-[#B2BEC3] text-center py-8">승인 대기 중인 학습 항목이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {learningQueue.map(item => (
                    <div key={item.id} className="bg-[#F8F9FA] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-xs bg-[#F0EDFF] text-[#6C5CE7] hover:bg-[#F0EDFF]">
                          {item.source_type === 'staff_answer' ? '담당자 답변' : item.source_type === 'choice' ? '선택지' : item.source_type}
                        </Badge>
                        <Badge className="text-xs" variant="outline">
                          {item.bot_type === 'creator' ? '크리에이터' : '기업'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-[#1A1A2E]">Q: {item.source_data?.question}</p>
                      <p className="text-sm text-[#636E72] mt-1">A: {item.source_data?.answer}</p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleLearningAction(item.id, 'approve')}
                          className="bg-[#00B894] hover:bg-[#00A381] rounded-lg gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> FAQ 추가
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLearningAction(item.id, 'reject')}
                          className="rounded-lg gap-1 text-[#D63031] border-[#D63031] hover:bg-[#D63031] hover:text-white"
                        >
                          <XCircle className="w-3 h-3" /> 거부
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
