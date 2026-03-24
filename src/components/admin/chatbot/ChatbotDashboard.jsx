import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Bot, MessageSquare, AlertCircle, CheckCircle, TrendingUp, Loader2, RefreshCw, Send } from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

export default function ChatbotDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, replied: 0, escalated: 0, today: 0 })
  const [faqStats, setFaqStats] = useState({ business: 0, creator: 0 })
  const [chartData, setChartData] = useState([])
  const [escalations, setEscalations] = useState([])
  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) { navigate('/admin/login'); return false }
    const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
    if (!admin) { navigate('/admin/login'); return false }
    return true
  }, [navigate])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      const [totalRes, repliedRes, escalatedRes, todayRes, faqRes] = await Promise.all([
        supabaseBiz.from('kakao_bot_processed').select('*', { count: 'exact', head: true }),
        supabaseBiz.from('kakao_bot_processed').select('*', { count: 'exact', head: true }).eq('replied', true),
        supabaseBiz.from('kakao_bot_processed').select('*', { count: 'exact', head: true }).eq('escalated', true),
        supabaseBiz.from('kakao_bot_processed').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabaseBiz.from('chatbot_faq').select('bot_type').eq('is_active', true),
      ])

      setStats({
        total: totalRes.count || 0,
        replied: repliedRes.count || 0,
        escalated: escalatedRes.count || 0,
        today: todayRes.count || 0,
      })

      const biz = (faqRes.data || []).filter(f => f.bot_type === 'business').length
      const cre = (faqRes.data || []).filter(f => f.bot_type === 'creator').length
      setFaqStats({ business: biz, creator: cre })

      // 최근 7일 차트 데이터
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const { data: recentData } = await supabaseBiz.from('kakao_bot_processed')
        .select('created_at, replied, escalated')
        .gte('created_at', sevenDaysAgo.toISOString().split('T')[0])
        .order('created_at', { ascending: true })

      const dayMap = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - 6 + i)
        const key = d.toISOString().split('T')[0]
        dayMap[key] = { date: `${d.getMonth() + 1}/${d.getDate()}`, total: 0, replied: 0, escalated: 0 }
      }
      ;(recentData || []).forEach(row => {
        const key = row.created_at?.split('T')[0]
        if (dayMap[key]) {
          dayMap[key].total++
          if (row.replied) dayMap[key].replied++
          if (row.escalated) dayMap[key].escalated++
        }
      })
      setChartData(Object.values(dayMap))

      // 에스컬레이션 대기
      const { data: escData } = await supabaseBiz.from('kakao_bot_processed')
        .select('*')
        .eq('escalated', true)
        .eq('replied', false)
        .order('created_at', { ascending: false })
        .limit(10)
      setEscalations(escData || [])
    } catch (err) {
      console.error('데이터 로딩 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth().then(ok => ok && fetchData())
  }, [checkAuth, fetchData])

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !replyModal) return
    setSubmitting(true)
    try {
      await supabaseBiz.from('kakao_bot_processed')
        .update({ reply_text: replyText.trim(), replied: true })
        .eq('id', replyModal.id)
      setReplyModal(null)
      setReplyText('')
      fetchData()
    } catch (err) {
      alert('답변 저장 실패: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const statCards = [
    { label: '총 처리건수', value: stats.total, icon: MessageSquare, color: 'bg-[#F0EDFF] text-[#6C5CE7]' },
    { label: '답변 완료', value: stats.replied, icon: CheckCircle, color: 'bg-green-100 text-green-700' },
    { label: '에스컬레이션', value: stats.escalated, icon: AlertCircle, color: 'bg-red-100 text-red-700' },
    { label: '오늘 처리', value: stats.today, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FA]">
        <AdminNavigation />
        <main className="flex-1 ml-[240px] p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7]" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <AdminNavigation />
      <main className="flex-1 ml-[240px] p-8">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bot className="w-7 h-7 text-[#6C5CE7]" />
              <h1 className="text-2xl font-bold text-[#2D3436]" style={{ fontFamily: "'Outfit', sans-serif" }}>AI 챗봇 대시보드</h1>
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-[#DFE6E9] rounded-xl text-[#636E72] hover:border-[#6C5CE7] transition-colors">
              <RefreshCw className="w-4 h-4" /> 새로고침
            </button>
          </div>

          {/* 운영 상태 배너 */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-700 font-medium">
              GCP VM 정상 운영 중 &nbsp;|&nbsp; business 모드 &nbsp;|&nbsp; 15초 주기 감지
            </span>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {statCards.map(card => (
              <div key={card.label} className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#636E72]">{card.label}</span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-[#2D3436]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {card.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* 차트 */}
          <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#2D3436] mb-4">최근 7일 처리 현황</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#6C5CE7" strokeWidth={2} name="전체" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="replied" stroke="#00B894" strokeWidth={2} name="답변완료" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="escalated" stroke="#E17055" strokeWidth={2} name="에스컬레이션" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 에스컬레이션 대기 + FAQ 현황 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> 에스컬레이션 대기 ({escalations.length})
              </h2>
              {escalations.length === 0 ? (
                <p className="text-sm text-[#636E72] py-4">미처리 에스컬레이션이 없습니다.</p>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                  {escalations.map(item => (
                    <div key={item.id} className="border border-[#DFE6E9] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#2D3436]">{item.chat_name || '알 수 없음'}</span>
                        <span className="text-xs text-[#636E72]">{new Date(item.created_at).toLocaleString('ko-KR')}</span>
                      </div>
                      <p className="text-sm text-[#636E72] mb-3 line-clamp-2">{item.last_message}</p>
                      <button
                        onClick={() => { setReplyModal(item); setReplyText('') }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#6C5CE7] text-white rounded-lg hover:bg-[#5A4BD6] transition-colors"
                      >
                        <Send className="w-3 h-3" /> 답변 입력
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#2D3436] mb-4">FAQ 현황</h2>
              <div className="space-y-4">
                <div className="bg-[#F0EDFF] rounded-xl p-4">
                  <p className="text-sm text-[#636E72] mb-1">기업 (business)</p>
                  <p className="text-2xl font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>{faqStats.business}개</p>
                </div>
                <div className="bg-[#F0EDFF] rounded-xl p-4">
                  <p className="text-sm text-[#636E72] mb-1">크리에이터 (creator)</p>
                  <p className="text-2xl font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>{faqStats.creator}개</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 답변 입력 모달 */}
        {replyModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setReplyModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-[#2D3436] mb-4">수동 답변 입력</h3>
              <div className="mb-4">
                <label className="text-sm text-[#636E72] block mb-1">사용자</label>
                <p className="text-sm font-medium">{replyModal.chat_name || '알 수 없음'}</p>
              </div>
              <div className="mb-4">
                <label className="text-sm text-[#636E72] block mb-1">질문</label>
                <p className="text-sm bg-gray-50 rounded-xl p-3">{replyModal.last_message}</p>
              </div>
              <div className="mb-4">
                <label className="text-sm text-[#636E72] block mb-1">답변</label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full border border-[#DFE6E9] rounded-xl p-3 text-sm focus:border-[#6C5CE7] focus:outline-none"
                  placeholder="답변을 입력하세요..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setReplyModal(null)} className="px-4 py-2 border border-[#DFE6E9] rounded-xl text-sm text-[#636E72] hover:border-[#6C5CE7]">
                  취소
                </button>
                <button
                  onClick={handleReplySubmit}
                  disabled={submitting || !replyText.trim()}
                  className="px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6] disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} 저장
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
