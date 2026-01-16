import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Mail, Plus, Search, Eye, EyeOff, Edit, Trash2, RefreshCw,
  ExternalLink, Star, StarOff, Calendar, Tag, Image, Link2, Download, Loader2
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'

const CATEGORIES = [
  { value: 'marketing', label: '마케팅 인사이트' },
  { value: 'insight', label: '산업 트렌드' },
  { value: 'case_study', label: '성공 사례' },
  { value: 'tips', label: '실용 팁' },
  { value: 'news', label: '업계 뉴스' },
  { value: 'other', label: '기타' }
]

export default function NewsletterShowcaseManagement() {
  const navigate = useNavigate()
  const [newsletters, setNewsletters] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, active, inactive

  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedNewsletter, setSelectedNewsletter] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // 폼 데이터
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    stibee_url: '',
    published_at: '',
    issue_number: '',
    category: 'marketing',
    tags: '',
    is_active: false,
    is_featured: false
  })

  const [saving, setSaving] = useState(false)
  const [fetchingStibee, setFetchingStibee] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchNewsletters()
  }, [])

  // 스티비에서 뉴스레터 가져오기
  const fetchFromStibee = async () => {
    if (fetchingStibee) return

    setFetchingStibee(true)
    try {
      const response = await fetch('/.netlify/functions/fetch-stibee-newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        alert(`${result.message}\n\n새로 가져온 뉴스레터: ${result.saved}개\n전체 가져온 이메일: ${result.fetched}개`)
        fetchNewsletters() // 목록 새로고침
      } else {
        alert('스티비 연동 오류: ' + result.error)
      }
    } catch (error) {
      console.error('스티비 연동 오류:', error)
      alert('스티비에서 데이터를 가져오는데 실패했습니다: ' + error.message)
    } finally {
      setFetchingStibee(false)
    }
  }

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/login')
    }
  }

  const fetchNewsletters = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('newsletters')
        .select('*')
        .order('published_at', { ascending: false })

      if (error) throw error
      setNewsletters(data || [])
    } catch (error) {
      console.error('뉴스레터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      thumbnail_url: '',
      stibee_url: '',
      published_at: new Date().toISOString().split('T')[0],
      issue_number: '',
      category: 'marketing',
      tags: '',
      is_active: false,
      is_featured: false
    })
    setIsEditing(false)
    setSelectedNewsletter(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (newsletter) => {
    setSelectedNewsletter(newsletter)
    setFormData({
      title: newsletter.title || '',
      description: newsletter.description || '',
      thumbnail_url: newsletter.thumbnail_url || '',
      stibee_url: newsletter.stibee_url || '',
      published_at: newsletter.published_at ? newsletter.published_at.split('T')[0] : '',
      issue_number: newsletter.issue_number?.toString() || '',
      category: newsletter.category || 'marketing',
      tags: newsletter.tags?.join(', ') || '',
      is_active: newsletter.is_active || false,
      is_featured: newsletter.is_featured || false
    })
    setIsEditing(true)
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.stibee_url) {
      alert('제목과 스티비 URL은 필수입니다.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const tagsArray = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(t => t)
        : []

      const saveData = {
        title: formData.title,
        description: formData.description || null,
        thumbnail_url: formData.thumbnail_url || null,
        stibee_url: formData.stibee_url,
        published_at: formData.published_at ? new Date(formData.published_at).toISOString() : null,
        issue_number: formData.issue_number ? parseInt(formData.issue_number) : null,
        category: formData.category,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_active: formData.is_active,
        is_featured: formData.is_featured
      }

      if (isEditing && selectedNewsletter) {
        const { error } = await supabaseBiz
          .from('newsletters')
          .update(saveData)
          .eq('id', selectedNewsletter.id)

        if (error) throw error
        alert('뉴스레터가 수정되었습니다.')
      } else {
        saveData.created_by = user.id
        const { error } = await supabaseBiz
          .from('newsletters')
          .insert([saveData])

        if (error) throw error
        alert('뉴스레터가 추가되었습니다.')
      }

      setShowAddModal(false)
      resetForm()
      fetchNewsletters()
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (newsletter) => {
    try {
      const { error } = await supabaseBiz
        .from('newsletters')
        .update({ is_active: !newsletter.is_active })
        .eq('id', newsletter.id)

      if (error) throw error
      fetchNewsletters()
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const handleToggleFeatured = async (newsletter) => {
    try {
      const { error } = await supabaseBiz
        .from('newsletters')
        .update({ is_featured: !newsletter.is_featured })
        .eq('id', newsletter.id)

      if (error) throw error
      fetchNewsletters()
    } catch (error) {
      console.error('추천 상태 변경 오류:', error)
      alert('추천 상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (newsletter) => {
    if (!confirm(`"${newsletter.title}" 뉴스레터를 삭제하시겠습니까?`)) return

    try {
      const { error } = await supabaseBiz
        .from('newsletters')
        .delete()
        .eq('id', newsletter.id)

      if (error) throw error
      alert('뉴스레터가 삭제되었습니다.')
      fetchNewsletters()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const openPreview = (newsletter) => {
    setSelectedNewsletter(newsletter)
    setShowPreviewModal(true)
  }

  const filteredNewsletters = newsletters.filter(newsletter => {
    const matchesSearch = !searchTerm ||
      newsletter.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      newsletter.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && newsletter.is_active) ||
      (filterStatus === 'inactive' && !newsletter.is_active)

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: newsletters.length,
    active: newsletters.filter(n => n.is_active).length,
    featured: newsletters.filter(n => n.is_featured).length
  }

  const getCategoryLabel = (value) => {
    const cat = CATEGORIES.find(c => c.value === value)
    return cat ? cat.label : value
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="p-6 lg:ml-64 min-h-screen bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">로딩 중...</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="p-6 lg:ml-64 min-h-screen bg-gray-50 space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">뉴스레터 쇼케이스 관리</h1>
              <p className="text-sm text-gray-500">기업에게 보여줄 뉴스레터를 관리합니다</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchFromStibee}
              disabled={fetchingStibee}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              {fetchingStibee ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {fetchingStibee ? '가져오는 중...' : '스티비에서 가져오기'}
            </Button>
            <Button variant="outline" onClick={() => window.open('/newsletters', '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              미리보기
            </Button>
            <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              뉴스레터 추가
            </Button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">전체 뉴스레터</div>
              <div className="text-2xl font-bold mt-1">{stats.total}개</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-green-600">활성화</div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.active}개</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-yellow-600">추천</div>
              <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.featured}개</div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 및 검색 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  전체
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('active')}
                >
                  활성화
                </Button>
                <Button
                  variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('inactive')}
                >
                  비활성화
                </Button>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="제목, 설명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchNewsletters}>
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 뉴스레터 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>뉴스레터 목록 ({filteredNewsletters.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredNewsletters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                뉴스레터가 없습니다. 새 뉴스레터를 추가해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNewsletters.map((newsletter) => (
                  <Card
                    key={newsletter.id}
                    className={`overflow-hidden transition-all ${
                      !newsletter.is_active ? 'opacity-60' : ''
                    } ${newsletter.is_featured ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    {/* 썸네일 */}
                    <div
                      className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer"
                      onClick={() => openPreview(newsletter)}
                    >
                      {newsletter.thumbnail_url ? (
                        <img
                          src={newsletter.thumbnail_url}
                          alt={newsletter.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Mail className="w-12 h-12 text-white/50" />
                      )}
                    </div>

                    <CardContent className="p-4">
                      {/* 배지 */}
                      <div className="flex gap-2 mb-2">
                        {newsletter.is_featured && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            추천
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          newsletter.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {newsletter.is_active ? '활성화' : '비활성화'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {getCategoryLabel(newsletter.category)}
                        </span>
                      </div>

                      {/* 제목 및 설명 */}
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{newsletter.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {newsletter.description || '설명 없음'}
                      </p>

                      {/* 메타 정보 */}
                      <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {newsletter.published_at
                          ? new Date(newsletter.published_at).toLocaleDateString('ko-KR')
                          : '발행일 미설정'}
                        {newsletter.issue_number && ` | ${newsletter.issue_number}호`}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(newsletter)}
                          className={newsletter.is_active ? 'text-orange-600' : 'text-green-600'}
                        >
                          {newsletter.is_active ? (
                            <><EyeOff className="w-3 h-3 mr-1" /> 숨김</>
                          ) : (
                            <><Eye className="w-3 h-3 mr-1" /> 공개</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleFeatured(newsletter)}
                          className={newsletter.is_featured ? 'text-yellow-600' : ''}
                        >
                          {newsletter.is_featured ? (
                            <StarOff className="w-3 h-3" />
                          ) : (
                            <Star className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(newsletter)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(newsletter)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 추가/수정 모달 */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? '뉴스레터 수정' : '새 뉴스레터 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">제목 *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="뉴스레터 제목"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">스티비 URL *</label>
              <div className="flex gap-2">
                <Input
                  value={formData.stibee_url}
                  onChange={(e) => setFormData({ ...formData, stibee_url: e.target.value })}
                  placeholder="https://stibee.com/api/v1.0/emails/share/..."
                />
                {formData.stibee_url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(formData.stibee_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">설명</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="간단한 설명 (선택)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">발행일</label>
                <Input
                  type="date"
                  value={formData.published_at}
                  onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">호수</label>
                <Input
                  type="number"
                  value={formData.issue_number}
                  onChange={(e) => setFormData({ ...formData, issue_number: e.target.value })}
                  placeholder="예: 1, 2, 3..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select
                className="w-full p-2 border rounded-lg"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">태그</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="콤마로 구분 (예: 마케팅, 인플루언서, 트렌드)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">썸네일 이미지 URL</label>
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="이미지 URL (선택)"
              />
              {formData.thumbnail_url && (
                <div className="mt-2 border rounded-lg overflow-hidden w-40 h-24">
                  <img
                    src={formData.thumbnail_url}
                    alt="썸네일 미리보기"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>활성화 (기업에게 노출)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>추천</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : isEditing ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 미리보기 모달 */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedNewsletter?.title}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {selectedNewsletter?.stibee_url ? (
              <iframe
                src={selectedNewsletter.stibee_url}
                className="w-full h-[60vh] border rounded-lg"
                title={selectedNewsletter.title}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                스티비 URL이 설정되지 않았습니다.
              </div>
            )}
          </div>

          <DialogFooter>
            {selectedNewsletter?.stibee_url && (
              <Button
                variant="outline"
                onClick={() => window.open(selectedNewsletter.stibee_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                새 탭에서 열기
              </Button>
            )}
            <Button onClick={() => setShowPreviewModal(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
