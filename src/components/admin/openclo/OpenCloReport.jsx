import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, CheckCircle } from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

const CATEGORY_OPTIONS = [
  { value: 'data_error', label: '데이터 오류' },
  { value: 'registration_error', label: '가입 여부 오류' },
  { value: 'bot_error', label: '봇 수집 오류' },
  { value: 'ui_bug', label: 'UI 버그' },
  { value: 'other', label: '기타' }
]

export default function OpenCloReport() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [category, setCategory] = useState('data_error')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/admin/login')
        return
      }
      const { data: admin } = await supabaseBiz
        .from('admin_users')
        .select('name, email')
        .eq('user_id', user.id)
        .maybeSingle()
      setAdminName(admin?.name || admin?.email || user.email || '관리자')
    }
    checkAuth()
  }, [navigate])

  const handleSend = async () => {
    if (!message.trim()) {
      alert('메시지 내용을 입력해주세요.')
      return
    }

    setSending(true)
    try {
      const categoryLabel = CATEGORY_OPTIONS.find(o => o.value === category)?.label || category
      const koreanTime = new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })

      const fullMessage = [
        '🔧 OpenClo 오류 수정 요청',
        '',
        `📌 카테고리: ${categoryLabel}`,
        title.trim() ? `📝 제목: ${title.trim()}` : null,
        `👤 요청자: ${adminName}`,
        `🕐 시간: ${koreanTime}`,
        '',
        '--- 내용 ---',
        message.trim()
      ].filter(Boolean).join('\n')

      const res = await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: '54220a7e-0b14-1138-54ec-a55f62dc8b75',
          message: fullMessage
        })
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error || '발송 실패')

      setSent(true)
      setHistory(prev => [{
        category: categoryLabel,
        title: title.trim(),
        message: message.trim(),
        time: koreanTime
      }, ...prev])

      setTimeout(() => {
        setSent(false)
        setTitle('')
        setMessage('')
        setCategory('data_error')
      }, 2000)
    } catch (err) {
      alert('발송 실패: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        <h2 className="text-lg font-bold mb-4">오류 수정 요청</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 요청 폼 */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-gray-500">
                  OpenClo 관련 오류나 수정이 필요한 사항을 작성하면 네이버 웍스로 전달됩니다.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {CATEGORY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목 (선택)</label>
                  <Input
                    placeholder="간단한 제목"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">내용 *</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="오류 내용이나 수정 요청 사항을 자세히 작성해주세요..."
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[160px] resize-y focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSend}
                    disabled={sending || sent || !message.trim()}
                    className={sent ? 'bg-green-600 hover:bg-green-600' : 'bg-violet-600 hover:bg-violet-700'}
                  >
                    {sending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />발송 중...</>
                    ) : sent ? (
                      <><CheckCircle className="w-4 h-4 mr-2" />발송 완료</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />네이버 웍스로 발송</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 발송 내역 */}
          <div>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">이번 세션 발송 내역</h3>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">발송 내역이 없습니다</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((item, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-violet-600">{item.category}</span>
                          <span className="text-gray-400">{item.time}</span>
                        </div>
                        {item.title && <p className="font-medium text-gray-700">{item.title}</p>}
                        <p className="text-gray-500 line-clamp-3">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
