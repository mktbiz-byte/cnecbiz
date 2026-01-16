import React, { useState, useEffect, useCallback } from 'react'
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
  Key, Check, AlertCircle, LayoutGrid, List, CheckSquare, Square, ArrowUp, ArrowDown, GripVertical, Lock, Unlock,
  FileText, Code, X, Maximize2, Monitor, Smartphone, Bold, Italic, Underline, Strikethrough, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Undo, Redo, Type, Upload
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Link as LinkExtension } from '@tiptap/extension-link'
import { Image as ImageExtension } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline as UnderlineExtension } from '@tiptap/extension-underline'

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

  // 구독 기본 주소록 설정
  const [defaultListId, setDefaultListId] = useState('')
  const [savingDefaultList, setSavingDefaultList] = useState(false)

  // 썸네일 추출 및 업로드
  const [extractingThumbnails, setExtractingThumbnails] = useState(false)
  const [extractingThumbnailFor, setExtractingThumbnailFor] = useState(null)
  const [availableImages, setAvailableImages] = useState([])
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const thumbnailInputRef = React.useRef(null)

  // HTML 콘텐츠 편집
  const [fetchingContent, setFetchingContent] = useState(false)
  const [showHtmlEditor, setShowHtmlEditor] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')

  // 전체 화면 비주얼 에디터
  const [showFullEditor, setShowFullEditor] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // visual, code, preview
  const [previewDevice, setPreviewDevice] = useState('desktop') // desktop, mobile

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
      }),
      ImageExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => {
      setHtmlContent(editor.getHTML())
    },
  }, [showFullEditor])

  // 에디터 내용 업데이트
  useEffect(() => {
    if (editor && htmlContent !== editor.getHTML()) {
      editor.commands.setContent(htmlContent)
    }
  }, [htmlContent, editor])

  useEffect(() => {
    checkAuth()
    fetchNewsletters()
    fetchApiKey()
    fetchDefaultListId()
  }, [])

  // API 키가 로드되면 주소록 목록 가져오기
  useEffect(() => {
    if (apiKeyLoaded) {
      fetchStibeeLists()
    }
  }, [apiKeyLoaded])

  // ESC 키로 전체 화면 에디터 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showFullEditor) {
        setShowFullEditor(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFullEditor])

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

  // 기본 구독 주소록 ID 조회
  const fetchDefaultListId = async () => {
    try {
      const { data } = await supabaseBiz
        .from('site_settings')
        .select('value')
        .eq('key', 'stibee_default_list_id')
        .maybeSingle()

      if (data?.value) {
        setDefaultListId(data.value)
      }
    } catch (error) {
      console.error('기본 주소록 조회 오류:', error)
    }
  }

  // 기본 구독 주소록 ID 저장
  const saveDefaultListId = async (listId) => {
    setSavingDefaultList(true)
    try {
      // upsert 사용
      const { error } = await supabaseBiz
        .from('site_settings')
        .upsert({
          key: 'stibee_default_list_id',
          value: listId,
          description: '웹사이트 뉴스레터 구독 시 사용할 스티비 주소록 ID',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

      if (error) throw error
      setDefaultListId(listId)
      alert('기본 구독 주소록이 설정되었습니다.')
    } catch (error) {
      console.error('기본 주소록 저장 오류:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSavingDefaultList(false)
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
      // display_order 컬럼이 있으면 사용, 없으면 published_at만 사용
      let query = supabaseBiz
        .from('newsletters')
        .select('*')

      // 먼저 display_order로 시도
      const { data, error } = await query
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('published_at', { ascending: false })

      if (error) {
        // display_order 컬럼이 없으면 published_at만으로 재시도
        if (error.message?.includes('display_order') || error.code === '42703') {
          console.log('display_order 컬럼 없음, published_at로 정렬')
          const { data: fallbackData, error: fallbackError } = await supabaseBiz
            .from('newsletters')
            .select('*')
            .order('published_at', { ascending: false })

          if (fallbackError) throw fallbackError
          setNewsletters(fallbackData || [])
          return
        }
        throw error
      }
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
    setHtmlContent(newsletter.html_content || '')
    setShowHtmlEditor(false)
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

  // 썸네일 이미지 업로드
  const handleThumbnailUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    setUploadingThumbnail(true)
    try {
      // 파일명 생성 (타임스탬프 + 원본 파일명)
      const timestamp = Date.now()
      const ext = file.name.split('.').pop()
      const fileName = `newsletter_${timestamp}.${ext}`

      // Supabase Storage에 업로드
      const { data, error } = await supabaseBiz.storage
        .from('newsletter-thumbnails')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabaseBiz.storage
        .from('newsletter-thumbnails')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }))
      alert('썸네일이 업로드되었습니다.')
    } catch (error) {
      console.error('썸네일 업로드 오류:', error)
      alert('썸네일 업로드에 실패했습니다: ' + error.message)
    } finally {
      setUploadingThumbnail(false)
      // 입력 초기화 (같은 파일 재선택 가능하도록)
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = ''
      }
    }
  }

  // HTML 콘텐츠 가져오기
  const handleFetchHtmlContent = async (newsletter) => {
    if (!newsletter?.stibee_url) {
      alert('스티비 URL이 없습니다.')
      return
    }

    setFetchingContent(true)
    try {
      const response = await fetch('/.netlify/functions/extract-newsletter-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetchContent',
          newsletterId: newsletter.id,
          stibeeUrl: newsletter.stibee_url
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('HTML 콘텐츠가 저장되었습니다.')
        fetchNewsletters()
        // 모달에서 편집 중이면 콘텐츠 새로고침
        if (selectedNewsletter?.id === newsletter.id) {
          const { data } = await supabaseBiz
            .from('newsletters')
            .select('html_content')
            .eq('id', newsletter.id)
            .single()
          if (data) {
            setHtmlContent(data.html_content || '')
          }
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('콘텐츠 가져오기 오류:', error)
      alert('콘텐츠 가져오기에 실패했습니다: ' + error.message)
    } finally {
      setFetchingContent(false)
    }
  }

  // HTML 콘텐츠 저장
  const handleSaveHtmlContent = async () => {
    if (!selectedNewsletter) return

    setSaving(true)
    try {
      const { error } = await supabaseBiz
        .from('newsletters')
        .update({
          html_content: htmlContent,
          content_source: 'custom'
        })
        .eq('id', selectedNewsletter.id)

      if (error) throw error
      alert('콘텐츠가 저장되었습니다.')
      setShowHtmlEditor(false)
      setShowFullEditor(false)
      fetchNewsletters()
    } catch (error) {
      console.error('콘텐츠 저장 오류:', error)
      alert('콘텐츠 저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // 전체 화면 에디터 열기
  const openFullScreenEditor = async (newsletter) => {
    setSelectedNewsletter(newsletter)

    // 콘텐츠가 없으면 먼저 가져오기
    if (!newsletter.html_content && newsletter.stibee_url) {
      setFetchingContent(true)
      try {
        const response = await fetch('/.netlify/functions/extract-newsletter-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fetchContent',
            newsletterId: newsletter.id,
            stibeeUrl: newsletter.stibee_url
          })
        })

        const result = await response.json()
        if (result.success) {
          const { data } = await supabaseBiz
            .from('newsletters')
            .select('html_content')
            .eq('id', newsletter.id)
            .single()
          if (data) {
            setHtmlContent(data.html_content || '')
          }
        }
      } catch (error) {
        console.error('콘텐츠 가져오기 오류:', error)
      } finally {
        setFetchingContent(false)
      }
    } else {
      setHtmlContent(newsletter.html_content || '')
    }

    setEditorMode('visual')
    setShowFullEditor(true)
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
    if (index === 0) return

    const prevNewsletter = filteredNewsletters[index - 1]

    try {
      // 단순히 현재 화면의 인덱스 값으로 교환
      const { error: err1 } = await supabaseBiz
        .from('newsletters')
        .update({ display_order: index - 1 })
        .eq('id', newsletter.id)

      if (err1) throw err1

      const { error: err2 } = await supabaseBiz
        .from('newsletters')
        .update({ display_order: index })
        .eq('id', prevNewsletter.id)

      if (err2) throw err2

      await fetchNewsletters()
    } catch (error) {
      console.error('순서 변경 오류:', error)
      alert('순서 변경에 실패했습니다: ' + error.message)
    }
  }

  // 순서 아래로 이동
  const handleMoveDown = async (newsletter, index) => {
    if (index >= filteredNewsletters.length - 1) return

    const nextNewsletter = filteredNewsletters[index + 1]

    try {
      // 단순히 현재 화면의 인덱스 값으로 교환
      const { error: err1 } = await supabaseBiz
        .from('newsletters')
        .update({ display_order: index + 1 })
        .eq('id', newsletter.id)

      if (err1) throw err1

      const { error: err2 } = await supabaseBiz
        .from('newsletters')
        .update({ display_order: index })
        .eq('id', nextNewsletter.id)

      if (err2) throw err2

      await fetchNewsletters()
    } catch (error) {
      console.error('순서 변경 오류:', error)
      alert('순서 변경에 실패했습니다: ' + error.message)
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

                {/* 구독 기본 주소록 설정 */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">웹사이트 구독 설정</span>
                    {defaultListId && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> 설정됨
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 p-2 border rounded-lg text-sm"
                      value={defaultListId}
                      onChange={(e) => setDefaultListId(e.target.value)}
                      disabled={stibeeLists.length === 0}
                    >
                      <option value="">구독 주소록 선택...</option>
                      {stibeeLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveDefaultListId(defaultListId)}
                      disabled={!defaultListId || savingDefaultList}
                    >
                      {savingDefaultList ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '저장'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    SEO로 유입된 방문자가 뉴스레터 페이지에서 구독 시 추가될 스티비 주소록을 선택하세요.
                  </p>
                </div>
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
                              title="기본 정보 편집"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openFullScreenEditor(newsletter)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-500"
                              title="비주얼 에디터"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(newsletter)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500"
                              title="삭제"
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
              <label className="block text-sm font-medium mb-1">썸네일 이미지</label>
              <div className="flex gap-2">
                <Input
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="이미지 URL을 입력하거나 파일을 업로드하세요"
                  className="flex-1"
                />
                {/* 파일 업로드 버튼 */}
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={uploadingThumbnail}
                  className="whitespace-nowrap"
                >
                  {uploadingThumbnail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  업로드
                </Button>
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
                <div className="mt-2 flex items-end gap-3">
                  <div className="border rounded-lg overflow-hidden w-40 h-24">
                    <img
                      src={formData.thumbnail_url}
                      alt="썸네일 미리보기"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, thumbnail_url: '' })}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
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

            {/* HTML 콘텐츠 편집 섹션 */}
            {isEditing && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-sm">HTML 콘텐츠</span>
                    {selectedNewsletter?.content_source && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        selectedNewsletter.content_source === 'custom'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedNewsletter.content_source === 'custom' ? '수정됨' : '원본'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleFetchHtmlContent(selectedNewsletter)}
                      disabled={fetchingContent}
                    >
                      {fetchingContent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      가져오기
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openFullScreenEditor(selectedNewsletter)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Maximize2 className="w-4 h-4 mr-1" />
                      비주얼 에디터
                    </Button>
                  </div>
                </div>

                {selectedNewsletter?.html_content && (
                  <p className="text-xs text-gray-500">
                    저장된 콘텐츠: {selectedNewsletter.html_content.length.toLocaleString()} 글자
                  </p>
                )}
              </div>
            )}
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

          <div className="py-4 overflow-y-auto max-h-[60vh]">
            {selectedNewsletter?.html_content ? (
              // 저장된 HTML 콘텐츠가 있으면 해당 콘텐츠 표시
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedNewsletter.html_content }}
              />
            ) : selectedNewsletter?.stibee_url ? (
              // HTML 콘텐츠가 없으면 스티비 원본 iframe 표시
              <iframe
                src={selectedNewsletter.stibee_url}
                className="w-full h-[60vh] border rounded-lg"
                title={selectedNewsletter.title}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                콘텐츠가 없습니다.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedNewsletter?.html_content && selectedNewsletter?.stibee_url && (
              <Button
                variant="outline"
                onClick={() => window.open(selectedNewsletter.stibee_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                스티비 원본
              </Button>
            )}
            <Button onClick={() => setShowPreviewModal(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 전체 화면 비주얼 에디터 */}
      {showFullEditor && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* 에디터 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-lg truncate max-w-md">{selectedNewsletter?.title}</h2>
              {selectedNewsletter?.content_source && (
                <span className={`text-xs px-2 py-1 rounded ${
                  selectedNewsletter.content_source === 'custom'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedNewsletter.content_source === 'custom' ? '수정됨' : '원본'}
                </span>
              )}
            </div>

            {/* 모드 선택 탭 */}
            <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setEditorMode('visual')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  editorMode === 'visual'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit className="w-4 h-4 inline mr-1" />
                비주얼 편집
              </button>
              <button
                onClick={() => setEditorMode('code')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  editorMode === 'code'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Code className="w-4 h-4 inline mr-1" />
                코드
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  editorMode === 'preview'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-1" />
                미리보기
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* 미리보기 디바이스 선택 */}
              {editorMode === 'preview' && (
                <div className="flex items-center gap-1 mr-4">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-2 rounded ${previewDevice === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="데스크톱"
                  >
                    <Monitor className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-2 rounded ${previewDevice === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="모바일"
                  >
                    <Smartphone className="w-5 h-5" />
                  </button>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => handleFetchHtmlContent(selectedNewsletter)}
                disabled={fetchingContent}
              >
                {fetchingContent ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                스티비에서 다시 가져오기
              </Button>
              <Button
                onClick={handleSaveHtmlContent}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
              <button
                onClick={() => setShowFullEditor(false)}
                className="p-2 hover:bg-gray-100 rounded-lg ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 에디터 본문 */}
          <div className="flex-1 overflow-hidden">
            {fetchingContent ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">콘텐츠를 불러오는 중...</p>
                </div>
              </div>
            ) : editorMode === 'visual' ? (
              <div className="h-full flex flex-col">
                {/* Tiptap 툴바 */}
                {editor && (
                  <div className="flex items-center gap-1 px-4 py-2 border-b bg-gray-50 flex-wrap">
                    <button
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="굵게"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="기울임"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="밑줄"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="취소선"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="제목 1"
                    >
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="제목 2"
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().setParagraph().run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('paragraph') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="본문"
                    >
                      <Type className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <button
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="글머리 기호"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="번호 목록"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <button
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="왼쪽 정렬"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="가운데 정렬"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="오른쪽 정렬"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <button
                      onClick={() => {
                        const url = window.prompt('링크 URL을 입력하세요:')
                        if (url) {
                          editor.chain().focus().setLink({ href: url }).run()
                        }
                      }}
                      className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-blue-100 text-blue-600' : ''}`}
                      title="링크"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const url = window.prompt('이미지 URL을 입력하세요:')
                        if (url) {
                          editor.chain().focus().setImage({ src: url }).run()
                        }
                      }}
                      className="p-2 rounded hover:bg-gray-200"
                      title="이미지"
                    >
                      <Image className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <button
                      onClick={() => editor.chain().focus().undo().run()}
                      disabled={!editor.can().undo()}
                      className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"
                      title="실행 취소"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().redo().run()}
                      disabled={!editor.can().redo()}
                      className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"
                      title="다시 실행"
                    >
                      <Redo className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Tiptap 에디터 */}
                <div className="flex-1 overflow-auto bg-white">
                  <EditorContent
                    editor={editor}
                    className="tiptap-editor h-full"
                  />
                </div>

                <style>{`
                  .tiptap-editor .ProseMirror {
                    min-height: calc(100vh - 200px);
                    padding: 40px;
                    max-width: 800px;
                    margin: 0 auto;
                    outline: none;
                  }
                  .tiptap-editor .ProseMirror p {
                    margin: 1em 0;
                  }
                  .tiptap-editor .ProseMirror h1 {
                    font-size: 2em;
                    font-weight: bold;
                    margin: 0.67em 0;
                  }
                  .tiptap-editor .ProseMirror h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                    margin: 0.83em 0;
                  }
                  .tiptap-editor .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                  }
                  .tiptap-editor .ProseMirror ul,
                  .tiptap-editor .ProseMirror ol {
                    padding-left: 1.5em;
                    margin: 1em 0;
                  }
                  .tiptap-editor .ProseMirror a {
                    color: #2563eb;
                    text-decoration: underline;
                  }
                  .tiptap-editor .ProseMirror table {
                    max-width: 100%;
                    border-collapse: collapse;
                  }
                  .tiptap-editor .ProseMirror td,
                  .tiptap-editor .ProseMirror th {
                    border: 1px solid #ccc;
                    padding: 8px;
                  }
                `}</style>
              </div>
            ) : editorMode === 'code' ? (
              <div className="h-full p-4 bg-gray-900">
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-full font-mono text-sm bg-gray-900 text-green-400 border-0 resize-none focus:ring-0"
                  placeholder="HTML 코드..."
                />
              </div>
            ) : (
              <div className="h-full overflow-auto bg-gray-100 flex justify-center p-8">
                <div
                  className={`bg-white shadow-lg transition-all duration-300 ${
                    previewDevice === 'mobile'
                      ? 'w-[375px] rounded-3xl border-8 border-gray-800'
                      : 'w-full max-w-4xl rounded-lg'
                  }`}
                  style={{ minHeight: previewDevice === 'mobile' ? '667px' : 'auto' }}
                >
                  <div
                    className="p-6 newsletter-preview"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                  <style>{`
                    .newsletter-preview img {
                      max-width: 100%;
                      height: auto;
                    }
                    .newsletter-preview table {
                      max-width: 100%;
                    }
                    .newsletter-preview a {
                      color: #2563eb;
                    }
                  `}</style>
                </div>
              </div>
            )}
          </div>

          {/* 에디터 푸터 상태바 */}
          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-sm text-gray-500">
            <span>{htmlContent ? `${htmlContent.length.toLocaleString()} 글자` : '콘텐츠 없음'}</span>
            <span>ESC를 눌러 닫기</span>
          </div>
        </div>
      )}
    </>
  )
}
