import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Star, Loader2, Save, ArrowUp, ArrowDown } from 'lucide-react'

export default function ConsultationReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [formName, setFormName] = useState('')
  const [formText, setFormText] = useState('')
  const [formOrder, setFormOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/manage-program-reviews')
      const data = await res.json()
      if (data.success) setReviews(data.reviews || [])
    } catch (err) {
      console.error('후기 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingReview(null)
    setFormName('')
    setFormText('')
    setFormOrder(reviews.length)
    setFormActive(true)
    setModalOpen(true)
  }

  const openEditModal = (review) => {
    setEditingReview(review)
    setFormName(review.display_name)
    setFormText(review.review_text)
    setFormOrder(review.display_order || 0)
    setFormActive(review.is_active)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formText.trim()) {
      alert('표시이름과 후기 내용을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const method = editingReview ? 'PUT' : 'POST'
      const body = {
        display_name: formName.trim(),
        review_text: formText.trim(),
        display_order: formOrder,
        is_active: formActive
      }
      if (editingReview) body.id = editingReview.id

      const res = await fetch('/.netlify/functions/manage-program-reviews', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) {
        setModalOpen(false)
        fetchReviews()
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (err) {
      alert(`오류: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('이 후기를 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/.netlify/functions/manage-program-reviews?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) fetchReviews()
      else alert(`오류: ${data.error}`)
    } catch (err) {
      alert(`오류: ${err.message}`)
    }
  }

  const handleToggleActive = async (review) => {
    try {
      const res = await fetch('/.netlify/functions/manage-program-reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, is_active: !review.is_active })
      })
      const data = await res.json()
      if (data.success) fetchReviews()
    } catch (err) {
      console.error('토글 오류:', err)
    }
  }

  const handleReorder = async (review, direction) => {
    const currentIdx = reviews.findIndex(r => r.id === review.id)
    const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (swapIdx < 0 || swapIdx >= reviews.length) return

    const swapReview = reviews[swapIdx]
    try {
      await Promise.all([
        fetch('/.netlify/functions/manage-program-reviews', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: review.id, display_order: swapReview.display_order })
        }),
        fetch('/.netlify/functions/manage-program-reviews', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: swapReview.id, display_order: review.display_order })
        })
      ])
      fetchReviews()
    } catch (err) {
      console.error('순서 변경 오류:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
      </div>
    )
  }

  return (
    <>
      <Card className="border-[#E8E8E8]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
              <Star className="w-4 h-4 text-[#6C5CE7]" />
              프로그램 상담 후기 ({reviews.length}개)
            </CardTitle>
            <Button size="sm" onClick={openAddModal} className="bg-[#6C5CE7] hover:bg-[#5A4BD1]">
              <Plus className="w-4 h-4 mr-1" /> 후기 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <div className="text-center py-16 text-[#636E72] text-sm">
              등록된 후기가 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#F8F9FA]">
                    <th className="text-left py-3 px-4 font-medium text-[#636E72] w-12">순서</th>
                    <th className="text-left py-3 px-4 font-medium text-[#636E72]">표시이름</th>
                    <th className="text-left py-3 px-4 font-medium text-[#636E72]">후기 내용</th>
                    <th className="text-center py-3 px-4 font-medium text-[#636E72] w-20">활성</th>
                    <th className="text-right py-3 px-4 font-medium text-[#636E72] w-32">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review, idx) => (
                    <tr key={review.id} className="border-b hover:bg-[#F8F9FA]">
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleReorder(review, 'up')}
                            disabled={idx === 0}
                            className="text-[#636E72] hover:text-[#6C5CE7] disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleReorder(review, 'down')}
                            disabled={idx === reviews.length - 1}
                            className="text-[#636E72] hover:text-[#6C5CE7] disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1A1A2E]">{review.display_name}</td>
                      <td className="py-3 px-4 text-[#636E72] max-w-[400px]">
                        <p className="line-clamp-2">{review.review_text}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={review.is_active}
                          onCheckedChange={() => handleToggleActive(review)}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openEditModal(review)}
                          >
                            <Edit className="w-3 h-3 mr-1" /> 수정
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleDelete(review.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReview ? '후기 수정' : '후기 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#636E72] block mb-1">표시이름</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="예: 크리에이터 A님"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>
            <div>
              <label className="text-sm text-[#636E72] block mb-1">후기 내용</label>
              <textarea
                value={formText}
                onChange={e => setFormText(e.target.value)}
                placeholder="후기 내용을 입력하세요..."
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-[#636E72] block mb-1">순서</label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={e => setFormOrder(parseInt(e.target.value) || 0)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="text-sm text-[#636E72]">활성</label>
                <Switch checked={formActive} onCheckedChange={setFormActive} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#6C5CE7] hover:bg-[#5A4BD1]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                {editingReview ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
