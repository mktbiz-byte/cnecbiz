import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Search, Edit, Loader2, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

const PAGE_SIZE = 20

export default function ChatbotReplyHistory() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [botType, setBotType] = useState('business')
  const [filter, setFilter] = useState('all') // all | replied | escalated
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [editModal, setEditModal] = useState(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

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
      const offset = (page - 1) * PAGE_SIZE
      let query = supabaseBiz.from('kakao_bot_processed')
        .select('*', { count: 'exact' })
        .eq('bot_type', botType)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (filter === 'replied') query = query.eq('replied', true).eq('escalated', false)
      if (filter === 'escalated') query = query.eq('escalated', true)
      if (search) query = query.or(`chat_name.ilike.%${search}%,last_message.ilike.%${search}%`)

      const { data, count, error } = await query
      if (error) throw error
      setItems(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('이력 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [botType, filter, search, page])

  useEffect(() => {
    checkAuth().then(ok => ok && fetchData())
  }, [checkAuth, fetchData])

  useEffect(() => { setPage(1) }, [botType, filter, search])

  const handleEditSave = async () => {
    if (!editText.trim() || !editModal) return
    setSaving(true)
    try {
      const { error } = await supabaseBiz.from('kakao_bot_processed')
        .update({ reply_text: editText.trim(), replied: true, escalated: false })
        .eq('id', editModal.id)
      if (error) throw error
      setEditModal(null)
      setEditText('')
      fetchData()
    } catch (err) {
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (item) => {
    if (item.escalated) return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">에스컬레이션</span>
    if (item.replied) return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">답변완료</span>
    return <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">대기</span>
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <AdminNavigation />
      <main className="flex-1 ml-[240px] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-7 h-7 text-[#6C5CE7]" />
            <h1 className="text-2xl font-bold text-[#2D3436]" style={{ fontFamily: "'Outfit', sans-serif" }}>답변 이력</h1>
            <span className="text-sm text-[#636E72] ml-2">총 {totalCount.toLocaleString()}건</span>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mb-4">
            {['business', 'creator'].map(t => (
              <button key={t} onClick={() => setBotType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${botType === t ? 'bg-[#6C5CE7] text-white' : 'border border-[#DFE6E9] text-[#636E72] hover:border-[#6C5CE7]'}`}>
                {t === 'business' ? '기업 (business)' : '크리에이터 (creator)'}
              </button>
            ))}
          </div>

          {/* 필터 바 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#636E72]" />
              <input
                type="text" placeholder="사용자명/질문 검색..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#DFE6E9] rounded-xl text-sm focus:border-[#6C5CE7] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: 'all', label: '전체', icon: MessageSquare },
                { id: 'replied', label: '답변완료', icon: CheckCircle },
                { id: 'escalated', label: '에스컬레이션', icon: AlertCircle },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${filter === f.id ? 'bg-[#6C5CE7] text-white' : 'border border-[#DFE6E9] text-[#636E72] hover:border-[#6C5CE7]'}`}>
                  <f.icon className="w-3.5 h-3.5" /> {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 테이블 */}
          <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-[#636E72] text-center py-16">이력이 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#F8F9FA] border-b border-[#DFE6E9]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#636E72] font-medium">날짜</th>
                    <th className="text-left px-4 py-3 text-[#636E72] font-medium">사용자</th>
                    <th className="text-left px-4 py-3 text-[#636E72] font-medium">질문</th>
                    <th className="text-left px-4 py-3 text-[#636E72] font-medium">봇 답변</th>
                    <th className="text-center px-4 py-3 text-[#636E72] font-medium">상태</th>
                    <th className="text-center px-4 py-3 text-[#636E72] font-medium">수정</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-[#DFE6E9] last:border-0 hover:bg-[#F8F9FA]">
                      <td className="px-4 py-3 text-xs text-[#636E72] whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{item.chat_name || '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-sm">{item.last_message || '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-sm text-[#636E72]">{item.reply_text || '-'}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(item)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => { setEditModal(item); setEditText(item.reply_text || '') }}
                          className="text-[#636E72] hover:text-[#6C5CE7]">
                          <Edit className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {page > 1 && (
                <button onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-[#DFE6E9] rounded-lg text-sm text-[#636E72]">이전</button>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - page) <= 2)
                .map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm ${p === page ? 'bg-[#6C5CE7] text-white' : 'border border-[#DFE6E9] text-[#636E72] hover:border-[#6C5CE7]'}`}>
                    {p}
                  </button>
                ))}
              {page < totalPages && (
                <button onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-[#DFE6E9] rounded-lg text-sm text-[#636E72]">다음</button>
              )}
            </div>
          )}
        </div>

        {/* 수정 모달 */}
        {editModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-[#2D3436] mb-4">답변 수정</h3>
              <div className="mb-4">
                <label className="text-sm text-[#636E72] block mb-1">사용자</label>
                <p className="text-sm font-medium">{editModal.chat_name || '-'}</p>
              </div>
              <div className="mb-4">
                <label className="text-sm text-[#636E72] block mb-1">질문</label>
                <p className="text-sm bg-gray-50 rounded-xl p-3">{editModal.last_message || '-'}</p>
              </div>
              <div className="mb-4">
                <label className="text-sm text-[#636E72] block mb-1">답변</label>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={4}
                  className="w-full border border-[#DFE6E9] rounded-xl p-3 text-sm focus:border-[#6C5CE7] focus:outline-none"
                  placeholder="답변을 입력하세요..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 border border-[#DFE6E9] rounded-xl text-sm text-[#636E72]">취소</button>
                <button onClick={handleEditSave} disabled={saving || !editText.trim()}
                  className="px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6] disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} 저장
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
