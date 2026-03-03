import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  HelpCircle, Plus, Edit, Trash2, Loader2, Search,
  Upload, Download, ToggleLeft, ToggleRight
} from 'lucide-react'

import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

export default function ChatbotFaqManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [faqs, setFaqs] = useState([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState([])
  const [botType, setBotType] = useState('creator')
  const [category, setCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ category: '', question: '', answer: '', keywords: '', confidence: 1.0 })
  const [saving, setSaving] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadData, setUploadData] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!admin) { navigate('/admin/login'); return }
      fetchFaqs()
    }
    checkAuth()
  }, [navigate])

  useEffect(() => { fetchFaqs() }, [botType, category, page])

  const fetchFaqs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/chatbot-manage-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', bot_type: botType, category: category || undefined, search: searchQuery || undefined, page, limit: 30 })
      })
      const result = await res.json()
      if (result.success) {
        setFaqs(result.data.items || [])
        setTotal(result.data.total || 0)
        setCategories(result.data.categories || [])
      }
    } catch (err) {
      console.error('FAQ fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => { setPage(1); fetchFaqs() }

  const openCreate = () => {
    setEditItem(null)
    setForm({ category: '', question: '', answer: '', keywords: '', confidence: 1.0 })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      category: item.category,
      question: item.question,
      answer: item.answer,
      keywords: (item.keywords || []).join(', '),
      confidence: item.confidence || 1.0
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.question || !form.answer || !form.category) {
      alert('카테고리, 질문, 답변을 모두 입력하세요.')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      const keywords = form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : []
      const payload = {
        action: editItem ? 'update' : 'create',
        adminEmail: user?.email,
        bot_type: botType,
        category: form.category,
        question: form.question,
        answer: form.answer,
        keywords,
        confidence: parseFloat(form.confidence) || 1.0,
        ...(editItem && { id: editItem.id })
      }
      await fetch('/.netlify/functions/chatbot-manage-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      setShowModal(false)
      fetchFaqs()
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id) => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    await fetch('/.netlify/functions/chatbot-manage-faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id, adminEmail: user?.email })
    })
    fetchFaqs()
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { data: { user } } = await supabaseBiz.auth.getUser()
    await fetch('/.netlify/functions/chatbot-manage-faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, adminEmail: user?.email })
    })
    fetchFaqs()
  }

  const handleBulkUpload = async () => {
    try {
      const items = JSON.parse(uploadData)
      if (!Array.isArray(items)) throw new Error('JSON 배열 형식이어야 합니다.')
      const { data: { user } } = await supabaseBiz.auth.getUser()
      const res = await fetch('/.netlify/functions/chatbot-bulk-upload-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_type: botType, items, adminEmail: user?.email })
      })
      const result = await res.json()
      if (result.success) {
        alert(`${result.data.uploaded}개 업로드 완료 (${result.data.skipped}개 건너뜀)`)
        setShowUpload(false)
        setUploadData('')
        fetchFaqs()
      } else {
        alert(`업로드 실패: ${result.error}`)
      }
    } catch (err) {
      alert(`JSON 파싱 오류: ${err.message}`)
    }
  }

  const exportCsv = () => {
    const header = 'category,question,answer,keywords\n'
    const rows = faqs.map(f => `"${f.category}","${f.question.replace(/"/g, '""')}","${f.answer.replace(/"/g, '""')}","${(f.keywords || []).join(';')}"`).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chatbot-faq-${botType}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-[#F8F9FA] p-6 lg:p-8 lg:ml-60">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>FAQ 관리</h1>
              <p className="text-sm text-[#636E72] mt-1">챗봇 FAQ 데이터 관리</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowUpload(true)} variant="outline" className="gap-2 rounded-xl border-[#DFE6E9]">
                <Upload className="w-4 h-4" /> 일괄 업로드
              </Button>
              <Button onClick={exportCsv} variant="outline" className="gap-2 rounded-xl border-[#DFE6E9]">
                <Download className="w-4 h-4" /> CSV 내보내기
              </Button>
              <Button onClick={openCreate} className="gap-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">
                <Plus className="w-4 h-4" /> FAQ 추가
              </Button>
            </div>
          </div>

          {/* 탭 + 필터 */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex bg-white rounded-xl border border-[#DFE6E9] p-1">
              {['creator', 'business'].map(t => (
                <button
                  key={t}
                  onClick={() => { setBotType(t); setCategory(''); setPage(1) }}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-all ${botType === t ? 'bg-[#6C5CE7] text-white' : 'text-[#636E72] hover:bg-[#F0EDFF]'}`}
                >
                  {t === 'creator' ? '크리에이터' : '기업'}
                </button>
              ))}
            </div>

            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1) }}
              className="text-sm border border-[#DFE6E9] rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">전체 카테고리</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="flex gap-1">
              <Input
                placeholder="검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-48 text-sm rounded-lg border-[#DFE6E9]"
              />
              <Button onClick={handleSearch} size="sm" variant="outline" className="rounded-lg border-[#DFE6E9]">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <span className="text-sm text-[#B2BEC3] ml-auto">총 {total}개</span>
          </div>

          {/* FAQ 목록 */}
          <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
                </div>
              ) : faqs.length === 0 ? (
                <p className="text-sm text-[#B2BEC3] text-center py-16">FAQ가 없습니다</p>
              ) : (
                <div className="divide-y divide-[#DFE6E9]">
                  {faqs.map(faq => (
                    <div key={faq.id} className={`p-4 hover:bg-[#F8F9FA] transition-colors ${!faq.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-xs bg-[#F0EDFF] text-[#6C5CE7] hover:bg-[#F0EDFF]">{faq.category}</Badge>
                            {(faq.keywords || []).slice(0, 3).map(k => (
                              <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                            ))}
                          </div>
                          <p className="text-sm font-medium text-[#1A1A2E]">{faq.question}</p>
                          <p className="text-sm text-[#636E72] mt-1 line-clamp-2">{faq.answer}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleToggle(faq.id)} className="h-8 w-8 p-0">
                            {faq.is_active ? <ToggleRight className="w-4 h-4 text-[#00B894]" /> : <ToggleLeft className="w-4 h-4 text-[#B2BEC3]" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(faq)} className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4 text-[#636E72]" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(faq.id)} className="h-8 w-8 p-0">
                            <Trash2 className="w-4 h-4 text-[#D63031]" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? 'default' : 'outline'}
                  onClick={() => setPage(p)}
                  className={`rounded-lg ${p === page ? 'bg-[#6C5CE7]' : 'border-[#DFE6E9]'}`}
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">{editItem ? 'FAQ 수정' : 'FAQ 추가'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#636E72]">카테고리</label>
                <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="예: 캠페인, 정산, 계약" className="mt-1 rounded-lg border-[#DFE6E9]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#636E72]">질문</label>
                <Input value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} placeholder="사용자가 물어볼 질문" className="mt-1 rounded-lg border-[#DFE6E9]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#636E72]">답변</label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
                  placeholder="챗봇이 응답할 내용"
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-[#DFE6E9] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#636E72]">키워드 (쉼표 구분)</label>
                <Input value={form.keywords} onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))} placeholder="캠페인, 지원, 신청" className="mt-1 rounded-lg border-[#DFE6E9]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-xl border-[#DFE6E9]">취소</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editItem ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 업로드 모달 */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">FAQ 일괄 업로드</h2>
            <p className="text-sm text-[#636E72] mb-3">JSON 배열 형식으로 입력하세요:</p>
            <textarea
              value={uploadData}
              onChange={e => setUploadData(e.target.value)}
              rows={8}
              placeholder={`[{"category":"캠페인","question":"캠페인 참여 방법은?","answer":"크넥 앱에서...","keywords":["캠페인","참여"]}]`}
              className="w-full rounded-lg border border-[#DFE6E9] px-3 py-2 text-sm font-mono"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowUpload(false)} className="rounded-xl border-[#DFE6E9]">취소</Button>
              <Button onClick={handleBulkUpload} className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">업로드</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
