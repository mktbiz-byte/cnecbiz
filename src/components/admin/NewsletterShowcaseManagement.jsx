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
  ExternalLink, Star, StarOff, Calendar, Tag, Image, Link2, Download, Loader2,
  Key, Check, AlertCircle, LayoutGrid, List, CheckSquare, Square, ArrowUp, ArrowDown, GripVertical, Lock, Unlock
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
  const [viewMode, setViewMode] = useState('list') // card, list
  const [selectedIds, setSelectedIds] = useState([]) // 선택된 뉴스레터 ID들

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
    is_featured: false,
    is_members_only: false
  })

  const [saving, setSaving] = useState(false)
  const [fetchingStibee, setFetchingStibee] = useState(false)

  // API 키 관리
  const [stibeeApiKey, setStibeeApiKey] = useState('')
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [savingApiKey, setSavingApiKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // 스티비 주소록 관리
  const [stibeeLists, setStibeeLists] = useState([])
  const [selectedListId, setSelectedListId] = useState('')
  const [loadingLists, setLoadingLists] = useState(false)

  // 썸네일 추출
  const [extractingThumbnails, setExtractingThumbnails] = useState(false)
  const [extractingThumbnailFor, setExtractingThumbnailFor] = useState(null)
  const [availableImages, setAvailableImages] = useState([])

  useEffect(() => {
    checkAuth()
    fetchNewsletters()
    fetchApiKey()
  }, [])

  // API 키가 로드되면 주소록 목록 가져오기
  useEffect(() => {
    if (apiKeyLoaded) {
      fetchStibeeLists()
    }
  }, [apiKeyLoaded])

  // API 키 조회
  const fetchApiKey = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('api_keys')
        .select('api_key')
        .eq('service_name', 'stibee')
        .eq('is_active', true)
        .maybeSingle()

      if (data?.api_key) {
        setStibeeApiKey(data.api_key)
        setApiKeyLoaded(true)
      }
    } catch (error) {
      console.error('API 키 조회 오류:', error)
    }
  }

  // API 키 저장
  const saveApiKey = async () => {
    if (!stibeeApiKey.trim()) {
      alert('API 키를 입력해주세요.')
      return
    }

    setSavingApiKey(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      // 기존 키 확인
      const { data: existing } = await supabaseBiz
        .from('api_keys')
        .select('id')
        .eq('service_name', 'stibee')
        .maybeSingle()

      if (existing) {
        // 업데이트
        const { error } = await supabaseBiz
          .from('api_keys')
          .update({
            api_key: stibeeApiKey.trim(),
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) throw error
        alert('스티비 API 키가 업데이트되었습니다.')
      } else {
        // 새로 저장
        const { error } = await supabaseBiz
          .from('api_keys')
          .insert({
            service_name: 'stibee',
            api_key: stibeeApiKey.trim(),
            description: '스티비 뉴스레터 API 키',
            is_active: true,
            created_by: user?.id
          })

        if (error) throw error
        alert('스티비 API 키가 저장되었습니다.')
      }

      setApiKeyLoaded(true)
    } catch (error) {
      console.error('API 키 저장 오류:', error)
      alert('API 키 저장에 실패했습니다: ' + error.message)
    } finally {
      setSavingApiKey(false)
    }
  }

  // 스티비 주소록 목록 가져오기
  const fetchStibeeLists = async () => {
    setLoadingLists(true)
    try {
      const response = await fetch('/.netlify/functions/fetch-stibee-newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lists' })
      })

      const result = await response.json()

      if (result.success && result.lists) {
        setStibeeLists(result.lists)
        // 첫 번째 주소록 자동 선택
        if (result.lists.length > 0 && !selectedListId) {
          setSelectedListId(result.lists[0].id)
        }
      }
    } catch (error) {
      console.error('주소록 조회 오류:', error)
    } finally {
      setLoadingLists(false)
    }
  }

  // 스티비에서 뉴스레터 가져오기
  const fetchFromStibee = async () => {
    if (fetchingStibee) return

    if (!selectedListId) {
      alert('가져올 주소록을 선택해주세요.')
      return
    }

    setFetchingStibee(true)
    try {
      const response = await fetch('/.netlify/functions/fetch-stibee-newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedListId })
      })

      // 응답 텍스트를 먼저 가져옴
      const responseText = await response.text()

      // JSON 파싱 시도
      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON 파싱 실패. 응답:', responseText.substring(0, 500))
        throw new Error('서버에서 잘못된 응답을 받았습니다. 잠시 후 다시 시도해주세요.')
      }

      if (!response.ok) {
        throw new Error(result.error || `서버 오류 (${response.status})`)
      }

      if (result.success) {
        alert(`${result.message}\n\n새로 가져온 뉴스레터: ${result.saved}개\n전체 가져온 이메일: ${result.fetched}개`)
        fetchNewsletters() // 목록 새로고침
      } else {
        alert('스티비 연동 오류: ' + (result.error || '알 수 없는 오류'))
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
        .order('display_order', { ascending: true })
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
      is_featured: false,
      is_members_only: false
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
      is_featured: newsletter.is_featured || false,
      is_members_only: newsletter.is_members_only || false
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
        is_featured: formData.is_featured,
        is_members_only: formData.is_members_only
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

  const handleToggleMembersOnly = async (newsletter) => {
    try {
      const { error } = await supabaseBiz
        .from('newsletters')
        .update({ is_members_only: !newsletter.is_members_only })
        .eq('id', newsletter.id)

      if (error) throw error
      fetchNewsletters()
    } catch (error) {
      console.error('회원 전용 상태 변경 오류:', error)
      alert('회원 전용 상태 변경에 실패했습니다.')
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

  // 썸네일 일괄 추출
  const handleExtractThumbnails = async () => {
    if (!confirm('썸네일이 없는 뉴스레터에서 이미지를 추출합니다. 계속하시겠습니까?')) return

    setExtractingThumbnails(true)
    try {
      const response = await fetch('/.netlify/functions/extract-newsletter-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk' })
      })

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        fetchNewsletters()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('썸네일 추출 오류:', error)
      alert('썸네일 추출에 실패했습니다: ' + error.message)
    } finally {
      setExtractingThumbnails(false)
    }
  }

  // 단일 뉴스레터 썸네일 추출
  const handleExtractSingleThumbnail = async (newsletter) => {
    if (!newsletter.stibee_url) {
      alert('스티비 URL이 없습니다.')
      return
    }

    setExtractingThumbnailFor(newsletter.id)
    try {
      const response = await fetch('/.netlify/functions/extract-newsletter-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'single',
          newsletterId: newsletter.id,
          stibeeUrl: newsletter.stibee_url
        })
      })

      const result = await response.json()
      if (result.success) {
        setAvailableImages(result.allImages || [])
        if (result.thumbnailUrl) {
          setFormData(prev => ({ ...prev, thumbnail_url: result.thumbnailUrl }))
          alert('썸네일이 추출되었습니다. 다른 이미지를 선택할 수도 있습니다.')
        }
        fetchNewsletters()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('썸네일 추출 오류:', error)
      alert('썸네일 추출에 실패했습니다: ' + error.message)
    } finally {
      setExtractingThumbnailFor(null)
    }
  }

  // 체크박스 토글
  const handleSelectToggle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedIds.length === filteredNewsletters.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredNewsletters.map(n => n.id))
    }
  }

  // 일괄 활성화
  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`${selectedIds.length}개 뉴스레터를 활성화하시겠습니까?`)) return

    try {
      const { error } = await supabaseBiz
        .from('newsletters')
        .update({ is_active: true })
        .in('id', selectedIds)

      if (error) throw error
      alert('활성화되었습니다.')
      setSelectedIds([])
      fetchNewsletters()
    } catch (error) {
      console.error('일괄 활성화 오류:', error)
      alert('활성화에 실패했습니다.')
    }
  }

  // 일괄 비활성화
  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`${selectedIds.length}개 뉴스레터를 비활성화하시겠습니까?`)) return

    try {
      const { error } = await supabaseBiz
        .from('newsletters')
        .update({ is_active: false })
        .in('id', selectedIds)

      if (error) throw error
      alert('비활성화되었습니다.')
      setSelectedIds([])
      fetchNewsletters()
    } catch (error) {
      console.error('일괄 비활성화 오류:', error)
      alert('비활성화에 실패했습니다.')
    }
  }

  // 선택한 뉴스레터 썸네일 일괄 추출
  const handleBulkExtractThumbnails = async () => {
    if (selectedIds.length === 0) return

    const selectedNewsletters = newsletters.filter(n => selectedIds.includes(n.id))
    if (!confirm(`${selectedNewsletters.length}개 뉴스레터의 썸네일을 추출하시겠습니까?`)) return

    setExtractingThumbnails(true)
    let successCount = 0
    let failCount = 0

    for (const newsletter of selectedNewsletters) {
      if (!newsletter.stibee_url) {
        failCount++
        continue
      }

      try {
        const response = await fetch('/.netlify/functions/extract-newsletter-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'single',
            newsletterId: newsletter.id,
            stibeeUrl: newsletter.stibee_url
          })
        })

        const result = await response.json()
        if (result.success && result.thumbnailUrl) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`썸네일 추출 실패 (${newsletter.id}):`, error)
        failCount++
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    setExtractingThumbnails(false)
    alert(`썸네일 추출 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    setSelectedIds([])
    fetchNewsletters()
  }

  // 순서 위로 이동
  const handleMoveUp = async (newsletter, index) => {
    if (index === 0) return // 이미 맨 위

    const prevNewsletter = filteredNewsletters[index - 1]
    const currentOrder = newsletter.display_order ?? index
    const prevOrder = prevNewsletter.display_order ?? (index - 1)

    try {
      // 두 뉴스레터의 순서를 교환
      await supabaseBiz
        .from('newsletters')
        .update({ display_order: prevOrder })
        .eq('id', newsletter.id)

      await supabaseBiz
        .from('newsletters')
        .update({ display_order: currentOrder })
        .eq('id', prevNewsletter.id)

      fetchNewsletters()
    } catch (error) {
      console.error('순서 변경 오류:', error)
      alert('순서 변경에 실패했습니다.')
    }
  }

  // 순서 아래로 이동
  const handleMoveDown = async (newsletter, index) => {
    if (index >= filteredNewsletters.length - 1) return // 이미 맨 아래

    const nextNewsletter = filteredNewsletters[index + 1]
    const currentOrder = newsletter.display_order ?? index
    const nextOrder = nextNewsletter.display_order ?? (index + 1)

    try {
      // 두 뉴스레터의 순서를 교환
      await supabaseBiz
        .from('newsletters')
        .update({ display_order: nextOrder })
        .eq('id', newsletter.id)

      await supabaseBiz
        .from('newsletters')
        .update({ display_order: currentOrder })
        .eq('id', nextNewsletter.id)

      fetchNewsletters()
    } catch (error) {
      console.error('순서 변경 오류:', error)
      alert('순서 변경에 실패했습니다.')
    }
  }

  // 순서 초기화 (현재 순서대로 display_order 재설정)
  const handleResetOrder = async () => {
    if (!confirm('모든 뉴스레터의 표시 순서를 현재 목록 순서대로 초기화하시겠습니까?')) return

    try {
      for (let i = 0; i < filteredNewsletters.length; i++) {
        await supabaseBiz
          .from('newsletters')
          .update({ display_order: i })
          .eq('id', filteredNewsletters[i].id)
      }
      alert('순서가 초기화되었습니다.')
      fetchNewsletters()
    } catch (error) {
      console.error('순서 초기화 오류:', error)
      alert('순서 초기화에 실패했습니다.')
    }
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
            <Button
              variant="outline"
              onClick={handleExtractThumbnails}
              disabled={extractingThumbnails}
              className="border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              {extractingThumbnails ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Image className="w-4 h-4 mr-2" />
              )}
              {extractingThumbnails ? '추출 중...' : '썸네일 추출'}
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

        {/* API 키 설정 */}
        <Card className={!apiKeyLoaded ? 'border-orange-300 bg-orange-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-gray-600" />
              <span className="font-medium">스티비 API 키 설정</span>
              {apiKeyLoaded ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <Check className="w-4 h-4" /> 등록됨
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-600 text-sm">
                  <AlertCircle className="w-4 h-4" /> 미등록
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={stibeeApiKey}
                  onChange={(e) => setStibeeApiKey(e.target.value)}
                  placeholder="스티비 API 키를 입력하세요"
                  className="pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showApiKey ? '숨기기' : '보기'}
                </button>
              </div>
              <Button
                onClick={saveApiKey}
                disabled={savingApiKey}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingApiKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : apiKeyLoaded ? '업데이트' : '저장'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              스티비 &gt; 설정 &gt; API 키에서 발급받은 키를 입력하세요. 뉴스레터를 자동으로 가져오려면 API 키가 필요합니다.
            </p>

            {/* 주소록 선택 */}
            {apiKeyLoaded && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">주소록 선택</span>
                  {loadingLists && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex-1 p-2 border rounded-lg text-sm"
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    disabled={loadingLists || stibeeLists.length === 0}
                  >
                    {stibeeLists.length === 0 ? (
                      <option value="">주소록 없음</option>
                    ) : (
                      stibeeLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))
                    )}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStibeeLists}
                    disabled={loadingLists}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingLists ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  뉴스레터를 가져올 주소록을 선택하세요. "스티비에서 가져오기" 버튼을 누르면 선택된 주소록의 발송 완료된 메일을 가져옵니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
              {/* 뷰 모드 토글 */}
              <div className="flex gap-1 border rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetOrder} title="순서 초기화">
                <GripVertical className="w-4 h-4 mr-1" />
                순서 초기화
              </Button>
              <Button variant="outline" size="sm" onClick={fetchNewsletters}>
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 뉴스레터 목록 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>뉴스레터 목록 ({filteredNewsletters.length}개)</CardTitle>
            {/* 일괄 작업 버튼 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedIds.length === filteredNewsletters.length && filteredNewsletters.length > 0
                  ? <><CheckSquare className="w-4 h-4 mr-1" /> 전체 해제</>
                  : <><Square className="w-4 h-4 mr-1" /> 전체 선택</>
                }
              </Button>
              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">{selectedIds.length}개 선택</span>
                  {/* 카테고리 일괄 변경 */}
                  <div className="flex items-center gap-1">
                    <select
                      id="bulkCategory"
                      className="text-sm border rounded px-2 py-1.5"
                      defaultValue=""
                    >
                      <option value="" disabled>카테고리</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const select = document.getElementById('bulkCategory')
                        const category = select.value
                        if (!category) {
                          alert('카테고리를 선택하세요.')
                          return
                        }
                        if (!confirm(`${selectedIds.length}개 뉴스레터의 카테고리를 변경하시겠습니까?`)) return
                        try {
                          await supabaseBiz
                            .from('newsletters')
                            .update({ category })
                            .in('id', selectedIds)
                          alert('카테고리가 변경되었습니다.')
                          setSelectedIds([])
                          fetchNewsletters()
                        } catch (err) {
                          alert('카테고리 변경에 실패했습니다.')
                        }
                      }}
                    >
                      적용
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleBulkExtractThumbnails}
                    disabled={extractingThumbnails}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {extractingThumbnails ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4 mr-1" />
                    )}
                    썸네일 추출
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkActivate}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Eye className="w-4 h-4 mr-1" /> 일괄 활성화
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDeactivate}
                    className="text-orange-600 border-orange-300"
                  >
                    <EyeOff className="w-4 h-4 mr-1" /> 일괄 비활성화
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredNewsletters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                뉴스레터가 없습니다. 새 뉴스레터를 추가해주세요.
              </div>
            ) : viewMode === 'list' ? (
              /* 리스트 뷰 */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredNewsletters.length && filteredNewsletters.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="p-3 text-center text-sm font-medium text-gray-600 w-16">순서</th>
                      <th className="p-3 text-left text-sm font-medium text-gray-600">제목</th>
                      <th className="p-3 text-left text-sm font-medium text-gray-600 w-24">카테고리</th>
                      <th className="p-3 text-left text-sm font-medium text-gray-600 w-28">발행일</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-600 w-20">상태</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-600 w-20">추천</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-600 w-20">회원</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-600 w-32">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNewsletters.map((newsletter, index) => (
                      <tr
                        key={newsletter.id}
                        className={`border-b hover:bg-gray-50 ${!newsletter.is_active ? 'opacity-60' : ''} ${selectedIds.includes(newsletter.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(newsletter.id)}
                            onChange={() => handleSelectToggle(newsletter.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => handleMoveUp(newsletter, index)}
                              disabled={index === 0}
                              className={`p-1 rounded ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                              title="위로 이동"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(newsletter, index)}
                              disabled={index >= filteredNewsletters.length - 1}
                              className={`p-1 rounded ${index >= filteredNewsletters.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                              title="아래로 이동"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 cursor-pointer"
                              onClick={() => openPreview(newsletter)}
                            >
                              {newsletter.thumbnail_url ? (
                                <img src={newsletter.thumbnail_url} alt="" className="w-full h-full object-cover rounded" />
                              ) : (
                                <Mail className="w-5 h-5 text-white/50" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{newsletter.title}</div>
                              <div className="text-xs text-gray-500 truncate">{newsletter.description || '설명 없음'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={newsletter.category || 'other'}
                            onChange={async (e) => {
                              const newCategory = e.target.value
                              try {
                                await supabaseBiz
                                  .from('newsletters')
                                  .update({ category: newCategory })
                                  .eq('id', newsletter.id)
                                fetchNewsletters()
                              } catch (err) {
                                console.error('카테고리 변경 오류:', err)
                              }
                            }}
                            className="text-xs border rounded px-1.5 py-1 bg-white"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {newsletter.published_at
                            ? new Date(newsletter.published_at).toLocaleDateString('ko-KR')
                            : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleActive(newsletter)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              newsletter.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {newsletter.is_active ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleFeatured(newsletter)}
                            className={`p-1.5 rounded ${newsletter.is_featured ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                          >
                            <Star className={`w-4 h-4 ${newsletter.is_featured ? 'fill-yellow-500' : ''}`} />
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleMembersOnly(newsletter)}
                            className={`p-1.5 rounded ${newsletter.is_members_only ? 'text-blue-600' : 'text-gray-300 hover:text-blue-500'}`}
                            title={newsletter.is_members_only ? '회원 전용' : '전체 공개'}
                          >
                            {newsletter.is_members_only ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => openEditModal(newsletter)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(newsletter)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* 카드 뷰 */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNewsletters.map((newsletter) => (
                  <Card
                    key={newsletter.id}
                    className={`relative overflow-hidden transition-all ${
                      !newsletter.is_active ? 'opacity-60' : ''
                    } ${newsletter.is_featured ? 'ring-2 ring-yellow-400' : ''} ${selectedIds.includes(newsletter.id) ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {/* 체크박스 */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(newsletter.id)}
                        onChange={() => handleSelectToggle(newsletter.id)}
                        className="w-5 h-5 rounded border-gray-300 bg-white/90 shadow cursor-pointer"
                      />
                    </div>

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
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {newsletter.is_featured && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            추천
                          </span>
                        )}
                        {newsletter.is_members_only && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> 회원 전용
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
              <div className="flex gap-2">
                <Input
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="이미지 URL (선택)"
                  className="flex-1"
                />
                {isEditing && selectedNewsletter?.stibee_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleExtractSingleThumbnail(selectedNewsletter)}
                    disabled={extractingThumbnailFor === selectedNewsletter?.id}
                    className="whitespace-nowrap"
                  >
                    {extractingThumbnailFor === selectedNewsletter?.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4 mr-1" />
                    )}
                    자동 추출
                  </Button>
                )}
              </div>
              {/* 현재 썸네일 미리보기 */}
              {formData.thumbnail_url && (
                <div className="mt-2 border rounded-lg overflow-hidden w-40 h-24">
                  <img
                    src={formData.thumbnail_url}
                    alt="썸네일 미리보기"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {/* 추출된 이미지 선택 옵션 */}
              {availableImages.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">추출된 이미지에서 선택:</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {availableImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, thumbnail_url: imgUrl })}
                        className={`flex-shrink-0 w-20 h-14 border-2 rounded overflow-hidden ${
                          formData.thumbnail_url === imgUrl ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img src={imgUrl} alt={`이미지 ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 flex-wrap">
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_members_only}
                  onChange={(e) => setFormData({ ...formData, is_members_only: e.target.checked })}
                  className="w-4 h-4"
                />
                <Lock className="w-4 h-4 text-blue-600" />
                <span>회원 전용</span>
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
