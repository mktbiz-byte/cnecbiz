import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Download, Loader2 } from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

const CATEGORIES = [
  'campaign_setup', 'payment', 'guide', 'creator', 'video',
  'campaign_status', 'shipping', 'schedule', 'info', 'contract',
  'escalation', 'points', 'grade', 'general'
]

const CATEGORY_LABELS = {
  campaign_setup: '캠페인 설정', payment: '결제', guide: '가이드', creator: '크리에이터',
  video: '영상', campaign_status: '캠페인 상태', shipping: '배송', schedule: '일정',
  info: '정보', contract: '계약', escalation: '에스컬레이션', points: '포인트',
  grade: '등급', general: '일반'
}

const PAGE_SIZE = 30

export default function ChatbotFaqManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [botType, setBotType] = useState('business')
  const [faqs, setFaqs] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modal, setModal] = useState(null)

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) { navigate('/admin/login'); return false }
    const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
    if (!admin) { navigate('/admin/login'); return false }
    return true
  }, [navigate])

  const fetchFaqs = useCallback(async () => {
    setLoading(true)
    try {
      const offset = (page - 1) * PAGE_SIZE
      let query = supabaseBiz.from('chatbot_faq')
        .select('*', { count: 'exact' })
        .eq('bot_type', botType)
        .order('category')
        .range(offset, offset + PAGE_SIZE - 1)

      if (categoryFilter) query = query.eq('category', categoryFilter)
      if (search) query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`)

      const { data, count, error } = await query
      if (error) throw error
      setFaqs(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('FAQ 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [botType, page, categoryFilter, search])

  useEffect(() => {
    checkAuth().then(ok => ok && fetchFaqs())
  }, [checkAuth, fetchFaqs])

  useEffect(() => { setPage(1) }, [botType, categoryFilter, search])

  const handleSave = async (formData) => {
    try {
      if (modal.mode === 'add') {
        const { error } = await supabaseBiz.from('chatbot_faq').insert({
          bot_type: botType, category: formData.category, question: formData.question,
          answer: formData.answer, is_active: formData.is_active
        })
        if (error) throw error
      } else {
        const { error } = await supabaseBiz.from('chatbot_faq').update({
          category: formData.category, question: formData.question,
          answer: formData.answer, is_active: formData.is_active
        }).eq('id', modal.data.id)
        if (error) throw error
      }
      setModal(null)
      fetchFaqs()
    } catch (err) {
      alert('저장 실패: ' + err.message)
    }
  }

  const handleToggle = async (faq) => {
    try {
      await supabaseBiz.from('chatbot_faq').update({ is_active: !faq.is_active }).eq('id', faq.id)
      fetchFaqs()
    } catch (err) {
      alert('상태 변경 실패: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await supabaseBiz.from('chatbot_faq').delete().eq('id', id)
      fetchFaqs()
    } catch (err) {
      alert('삭제 실패: ' + err.message)
    }
  }

  const handleCsvExport = () => {
    if (!faqs.length) return
    const header = '카테고리,질문,답변,활성\n'
    const rows = faqs.map(f => `"${f.category}","${(f.question || '').replace(/"/g, '""')}","${(f.answer || '').replace(/"/g, '""')}",${f.is_active}`).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chatbot_faq_${botType}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <AdminNavigation />
      <main className="flex-1 ml-[240px] p-8">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-7 h-7 text-[#6C5CE7]" />
            <h1 className="text-2xl font-bold text-[#2D3436]" style={{ fontFamily: "'Outfit', sans-serif" }}>FAQ 관리</h1>
          </div>

          {/* 안내 배너 */}
          <div className="bg-[#F0EDFF] border border-[#6C5CE7]/20 rounded-2xl p-4 mb-6">
            <p className="text-sm text-[#6C5CE7]">GCP VM 봇이 이 FAQ를 실시간으로 참조합니다. 변경사항은 즉시 반영됩니다.</p>
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
                type="text" placeholder="질문/답변 검색..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#DFE6E9] rounded-xl text-sm focus:border-[#6C5CE7] focus:outline-none"
              />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none">
              <option value="">전체 카테고리</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <button onClick={() => setModal({ mode: 'add', data: { category: 'general', question: '', answer: '', is_active: true } })}
              className="flex items-center gap-2 px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6]">
              <Plus className="w-4 h-4" /> FAQ 추가
            </button>
            <button onClick={handleCsvExport}
              className="flex items-center gap-2 px-4 py-2 border border-[#DFE6E9] rounded-xl text-sm text-[#636E72] hover:border-[#6C5CE7]">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>

          {/* 테이블 */}
          <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
              </div>
            ) : faqs.length === 0 ? (
              <p className="text-sm text-[#636E72] text-center py-16">FAQ가 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#F8F9FA] border-b border-[#DFE6E9]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[#636E72] font-medium">카테고리</th>
                    <th className="text-left px-4 py-3 text-[#636E72] font-medium">질문</th>
                    <th className="text-left px-4 py-3 text-[#636E72] font-medium">답변</th>
                    <th className="text-center px-4 py-3 text-[#636E72] font-medium">활성</th>
                    <th className="text-center px-4 py-3 text-[#636E72] font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {faqs.map(faq => (
                    <tr key={faq.id} className="border-b border-[#DFE6E9] last:border-0 hover:bg-[#F8F9FA]">
                      <td className="px-4 py-3">
                        <span className="bg-[#F0EDFF] text-[#6C5CE7] px-2 py-0.5 rounded text-xs">{CATEGORY_LABELS[faq.category] || faq.category}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{faq.question}</td>
                      <td className="px-4 py-3 max-w-[250px] truncate text-[#636E72]">{faq.answer}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggle(faq)}>
                          {faq.is_active ? <ToggleRight className="w-5 h-5 text-green-600 mx-auto" /> : <ToggleLeft className="w-5 h-5 text-gray-400 mx-auto" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setModal({ mode: 'edit', data: faq })} className="text-[#636E72] hover:text-[#6C5CE7]">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(faq.id)} className="text-[#636E72] hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, page - 3), Math.min(totalPages, page + 2)
              ).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm ${p === page ? 'bg-[#6C5CE7] text-white' : 'border border-[#DFE6E9] text-[#636E72] hover:border-[#6C5CE7]'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 추가/수정 모달 */}
        {modal && <FaqModal modal={modal} onClose={() => setModal(null)} onSave={handleSave} />}
      </main>
    </div>
  )
}

function FaqModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState({
    category: modal.data.category || 'general',
    question: modal.data.question || '',
    answer: modal.data.answer || '',
    is_active: modal.data.is_active !== false,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.question.trim() || !form.answer.trim()) { alert('질문과 답변을 입력하세요.'); return }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#2D3436] mb-4">
          {modal.mode === 'add' ? 'FAQ 추가' : 'FAQ 수정'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#636E72] block mb-1">카테고리</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-[#636E72] block mb-1">질문</label>
            <input type="text" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none"
              placeholder="자주 묻는 질문을 입력하세요" />
          </div>
          <div>
            <label className="text-sm text-[#636E72] block mb-1">답변</label>
            <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })}
              rows={4} className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none"
              placeholder="답변 내용을 입력하세요" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-[#DFE6E9]" />
            <span className="text-sm text-[#636E72]">활성</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-[#DFE6E9] rounded-xl text-sm text-[#636E72] hover:border-[#6C5CE7]">취소</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6] disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} 저장
          </button>
        </div>
      </div>
    </div>
  )
}
