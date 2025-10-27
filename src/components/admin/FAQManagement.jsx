import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { HelpCircle, Plus, Trash2, Edit2, ArrowLeft, Save, X, ChevronUp, ChevronDown } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function FAQManagement() {
  const navigate = useNavigate()
  const [faqs, setFaqs] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ question: '', answer: '', category: 'general' })
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'general' })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchFaqs()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchFaqs = async () => {
    if (!supabaseBiz) return

    try {
      const { data, error } = await supabaseBiz
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true })

      console.log('FAQ fetch result:', { data, error })

      if (error) {
        console.error('Error fetching FAQs:', error)
        alert('FAQ 불러오기 실패: ' + error.message)
        return
      }

      if (data) {
        console.log('FAQs loaded:', data.length)
        setFaqs(data)
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error)
      alert('오류: ' + error.message)
    }
  }

  const handleAdd = async () => {
    if (!newFaq.question || !newFaq.answer) {
      alert('질문과 답변을 모두 입력해주세요')
      return
    }

    try {
      const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.display_order)) : 0
      
      const { error } = await supabaseBiz
        .from('faqs')
        .insert({
          ...newFaq,
          display_order: maxOrder + 1
        })

      if (error) throw error

      alert('FAQ가 추가되었습니다')
      setNewFaq({ question: '', answer: '', category: 'general' })
      setShowAddForm(false)
      fetchFaqs()
    } catch (error) {
      console.error('Error adding FAQ:', error)
      alert('추가 실패: ' + error.message)
    }
  }

  const handleEdit = (faq) => {
    setEditingId(faq.id)
    setEditForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category
    })
  }

  const handleSave = async (id) => {
    try {
      const { error } = await supabaseBiz
        .from('faqs')
        .update(editForm)
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      fetchFaqs()
    } catch (error) {
      console.error('Error updating FAQ:', error)
      alert('수정 실패: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('faqs')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchFaqs()
    } catch (error) {
      console.error('Error deleting FAQ:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabaseBiz
        .from('faqs')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      fetchFaqs()
    } catch (error) {
      console.error('Error toggling active:', error)
      alert('상태 변경 실패: ' + error.message)
    }
  }

  const handleMoveUp = async (faq, index) => {
    if (index === 0) return

    const prevFaq = faqs[index - 1]
    
    try {
      await supabaseBiz
        .from('faqs')
        .update({ display_order: prevFaq.display_order })
        .eq('id', faq.id)

      await supabaseBiz
        .from('faqs')
        .update({ display_order: faq.display_order })
        .eq('id', prevFaq.id)

      fetchFaqs()
    } catch (error) {
      console.error('Error moving FAQ:', error)
    }
  }

  const handleMoveDown = async (faq, index) => {
    if (index === faqs.length - 1) return

    const nextFaq = faqs[index + 1]
    
    try {
      await supabaseBiz
        .from('faqs')
        .update({ display_order: nextFaq.display_order })
        .eq('id', faq.id)

      await supabaseBiz
        .from('faqs')
        .update({ display_order: faq.display_order })
        .eq('id', nextFaq.id)

      fetchFaqs()
    } catch (error) {
      console.error('Error moving FAQ:', error)
    }
  }

  const getCategoryLabel = (category) => {
    const labels = {
      general: '일반',
      voucher: '수출바우처',
      service: '서비스',
      payment: '결제',
      technical: '기술'
    }
    return labels[category] || category
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">FAQ 관리</h1>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showAddForm ? '취소' : '새 FAQ 추가'}
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새 FAQ 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">카테고리</label>
                <select
                  value={newFaq.category}
                  onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="general">일반</option>
                  <option value="voucher">수출바우처</option>
                  <option value="service">서비스</option>
                  <option value="payment">결제</option>
                  <option value="technical">기술</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">질문</label>
                <Input
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  placeholder="질문을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">답변</label>
                <textarea
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                  placeholder="답변을 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg min-h-32"
                />
              </div>
              <Button onClick={handleAdd}>추가</Button>
            </CardContent>
          </Card>
        )}

        {/* FAQ List */}
        <Card>
          <CardHeader>
            <CardTitle>FAQ 목록 ({faqs.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className={`p-6 rounded-lg border-2 ${
                    faq.is_active ? 'bg-white border-slate-200' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  {editingId === faq.id ? (
                    <div className="space-y-4">
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="general">일반</option>
                        <option value="voucher">수출바우처</option>
                        <option value="service">서비스</option>
                        <option value="payment">결제</option>
                        <option value="technical">기술</option>
                      </select>
                      <Input
                        value={editForm.question}
                        onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                      />
                      <textarea
                        value={editForm.answer}
                        onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg min-h-32"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(faq.id)}>
                          <Save className="w-4 h-4 mr-2" />
                          저장
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 mr-2" />
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {getCategoryLabel(faq.category)}
                            </span>
                            <span className="text-sm text-gray-500">순서: {faq.display_order}</span>
                            {!faq.is_active && (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                비활성
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">{faq.question}</h3>
                          <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveUp(faq, index)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveDown(faq, index)}
                            disabled={index === faqs.length - 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(faq.id, faq.is_active)}
                          >
                            {faq.is_active ? '비활성화' : '활성화'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(faq)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(faq.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {faqs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  등록된 FAQ가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

