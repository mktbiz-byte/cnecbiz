import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Video, HelpCircle, Edit, Plus, Trash2, Save,
  Eye, EyeOff, Shield, UserPlus, Search, FileText, Mail, Send, FileSignature,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Layout, Settings, Loader2, Building2
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function SiteManagementCreator() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('videos')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 영상 레퍼런스 (캠페인 영상)
  const [videos, setVideos] = useState([])
  const [newVideo, setNewVideo] = useState({ url: '', title: '', description: '' })

  // FAQ
  const [faqs, setFaqs] = useState([])
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'general', order: 0 })
  const [editingFaq, setEditingFaq] = useState(null)

  // 메인페이지 문구
  const [pageContents, setPageContents] = useState({
    hero_title: '',
    hero_subtitle: '',
    about_text: '',
    cta_button_text: '',
    stats_campaigns: '',
    stats_creators: '',
    stats_countries: '',
    stats_success: ''
  })

  // 관리자 등록
  const [admins, setAdmins] = useState([])
  const [newAdmin, setNewAdmin] = useState({ email: '', role: 'admin' })

  // SEO 설정
  const [seoSettings, setSeoSettings] = useState({
    site_title: 'CNEC - 크리에이터 네트워크',
    site_description: '숏폼 크리에이터를 위한 글로벌 마케팅 플랫폼',
    site_keywords: '크리에이터, 숏폼, 인플루언서, 마케팅',
    og_image: '',
    google_analytics_id: '',
    naver_site_verification: '',
    google_site_verification: ''
  })

  // Email 설정
  const [emailSettings, setEmailSettings] = useState({
    gmail_email: '',
    gmail_app_password: '',
    sender_name: 'CNEC',
    test_email: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [testEmailSending, setTestEmailSending] = useState(false)

  // 추천 크리에이터
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [searching, setSearching] = useState(false)

  // 이메일 템플릿
  const [emailTemplates, setEmailTemplates] = useState([])
  const [editingTemplate, setEditingTemplate] = useState(null)

  // 푸터/사이트 정보
  const [footerSettings, setFooterSettings] = useState({
    company_name: '',
    ceo_name: '',
    business_number: '',
    address: '',
    phone: '',
    email: '',
    customer_service_hours: '',
    copyright_text: '',
    instagram_url: '',
    youtube_url: '',
    blog_url: '',
    kakao_channel_url: '',
    privacy_policy_url: '',
    terms_url: ''
  })

  useEffect(() => {
    checkAuth()
    fetchVideos()
    fetchFaqs()
    fetchPageContents()
    fetchAdmins()
    fetchSeoSettings()
    fetchEmailSettings()
    fetchFeaturedCreators()
    fetchFooterSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'email-templates') {
      fetchEmailTemplates()
    }
  }, [activeTab])

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
      .maybeSingle()

    if (!adminData) {
      navigate('/login')
    }
  }

  // ===== 영상 레퍼런스 =====
  const fetchVideos = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea
        .from('reference_videos')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('영상 조회 오류:', error)
    }
  }

  const convertToEmbedUrl = (url) => {
    if (!url) return url
    if (url.includes('/embed/')) return url

    const match = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (!match) return url

    const videoId = match[1]
    const isShorts = url.includes('/shorts/')

    if (isShorts) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0&loop=1&playlist=${videoId}`
    }

    return `https://www.youtube.com/embed/${videoId}`
  }

  const handleAddVideo = async () => {
    if (!supabaseKorea) return
    if (!newVideo.url || !newVideo.title) {
      alert('URL과 제목을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const embedUrl = convertToEmbedUrl(newVideo.url)
      const maxOrder = videos.length > 0 ? Math.max(...videos.map(v => v.display_order || 0)) : 0

      const { error } = await supabaseKorea
        .from('reference_videos')
        .insert([{ ...newVideo, url: embedUrl, display_order: maxOrder + 1, is_active: true }])

      if (error) throw error

      alert('영상이 추가되었습니다.')
      setNewVideo({ url: '', title: '', description: '' })
      fetchVideos()
    } catch (error) {
      console.error('영상 추가 오류:', error)
      alert('영상 추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVideo = async (id) => {
    if (!supabaseKorea) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea
        .from('reference_videos')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchVideos()
    } catch (error) {
      console.error('영상 삭제 오류:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleMoveVideo = async (id, direction) => {
    if (!supabaseKorea) return
    const currentIndex = videos.findIndex(v => v.id === id)
    if (currentIndex === -1) return

    let targetIndex
    if (direction === 'top') targetIndex = 0
    else if (direction === 'bottom') targetIndex = videos.length - 1
    else if (direction === 'up') targetIndex = Math.max(0, currentIndex - 1)
    else if (direction === 'down') targetIndex = Math.min(videos.length - 1, currentIndex + 1)
    else return

    if (targetIndex === currentIndex) return

    const newVideos = [...videos]
    const [removed] = newVideos.splice(currentIndex, 1)
    newVideos.splice(targetIndex, 0, removed)

    try {
      const updates = newVideos.map((video, index) =>
        supabaseKorea.from('reference_videos').update({ display_order: index + 1 }).eq('id', video.id)
      )
      await Promise.all(updates)
      fetchVideos()
    } catch (error) {
      console.error('순서 변경 오류:', error)
    }
  }

  // ===== FAQ =====
  const fetchFaqs = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea
        .from('faqs')
        .select('*')
        .order('order', { ascending: true })

      if (error) throw error
      setFaqs(data || [])
    } catch (error) {
      console.error('FAQ 조회 오류:', error)
    }
  }

  const handleAddFaq = async () => {
    if (!supabaseKorea) return
    if (!newFaq.question || !newFaq.answer) {
      alert('질문과 답변을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.order || 0)) : 0

      const { error } = await supabaseKorea
        .from('faqs')
        .insert([{ ...newFaq, order: maxOrder + 1, is_active: true }])

      if (error) throw error
      alert('FAQ가 추가되었습니다.')
      setNewFaq({ question: '', answer: '', category: 'general', order: 0 })
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 추가 오류:', error)
      alert('FAQ 추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFaq = async (id) => {
    if (!supabaseKorea) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea.from('faqs').delete().eq('id', id)
      if (error) throw error
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 삭제 오류:', error)
    }
  }

  const handleUpdateFaq = async () => {
    if (!supabaseKorea || !editingFaq) return
    setSaving(true)
    try {
      const { error } = await supabaseKorea
        .from('faqs')
        .update({ question: editingFaq.question, answer: editingFaq.answer, category: editingFaq.category })
        .eq('id', editingFaq.id)

      if (error) throw error
      setEditingFaq(null)
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 수정 오류:', error)
    } finally {
      setSaving(false)
    }
  }

  // ===== 메인페이지 문구 =====
  const fetchPageContents = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea
        .from('page_contents')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setPageContents({
          hero_title: data.hero_title || '',
          hero_subtitle: data.hero_subtitle || '',
          about_text: data.about_text || '',
          cta_button_text: data.cta_button_text || '',
          stats_campaigns: data.stats_campaigns || '',
          stats_creators: data.stats_creators || '',
          stats_countries: data.stats_countries || '',
          stats_success: data.stats_success || ''
        })
      }
    } catch (error) {
      console.error('페이지 콘텐츠 조회 오류:', error)
    }
  }

  const handleSavePageContents = async () => {
    if (!supabaseKorea) return
    setSaving(true)
    try {
      const { data: existing } = await supabaseKorea.from('page_contents').select('id').limit(1).maybeSingle()

      if (existing) {
        const { error } = await supabaseKorea.from('page_contents').update(pageContents).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabaseKorea.from('page_contents').insert([pageContents])
        if (error) throw error
      }
      alert('저장되었습니다.')
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ===== 관리자 =====
  const fetchAdmins = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea.from('admin_users').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error('관리자 조회 오류:', error)
    }
  }

  const handleAddAdmin = async () => {
    if (!supabaseKorea) return
    if (!newAdmin.email) {
      alert('이메일을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabaseKorea
        .from('admin_users')
        .insert([{ email: newAdmin.email, role: newAdmin.role, is_active: true }])

      if (error) throw error
      alert('관리자가 등록되었습니다.')
      setNewAdmin({ email: '', role: 'admin' })
      fetchAdmins()
    } catch (error) {
      console.error('관리자 등록 오류:', error)
      alert('등록에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAdmin = async (id) => {
    if (!supabaseKorea) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea.from('admin_users').delete().eq('id', id)
      if (error) throw error
      fetchAdmins()
    } catch (error) {
      console.error('관리자 삭제 오류:', error)
    }
  }

  // ===== SEO =====
  const fetchSeoSettings = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea.from('seo_settings').select('*').limit(1).maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      if (data) setSeoSettings(data)
    } catch (error) {
      console.error('SEO 설정 조회 오류:', error)
    }
  }

  const handleSaveSeoSettings = async () => {
    if (!supabaseKorea) return
    setSaving(true)
    try {
      const { data: existing } = await supabaseKorea.from('seo_settings').select('id').limit(1).maybeSingle()

      if (existing) {
        const { error } = await supabaseKorea.from('seo_settings').update(seoSettings).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabaseKorea.from('seo_settings').insert([seoSettings])
        if (error) throw error
      }
      alert('SEO 설정이 저장되었습니다.')
    } catch (error) {
      console.error('SEO 저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ===== Email 설정 =====
  const fetchEmailSettings = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea.from('email_settings').select('*').limit(1).maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setEmailSettings({
          gmail_email: data.gmail_email || '',
          gmail_app_password: data.gmail_app_password || '',
          sender_name: data.sender_name || 'CNEC',
          test_email: ''
        })
      }
    } catch (error) {
      console.error('이메일 설정 조회 오류:', error)
    }
  }

  const handleSaveEmailSettings = async () => {
    if (!supabaseKorea) return
    setSaving(true)
    try {
      const { data: existing } = await supabaseKorea.from('email_settings').select('id').limit(1).maybeSingle()
      const saveData = { gmail_email: emailSettings.gmail_email, gmail_app_password: emailSettings.gmail_app_password, sender_name: emailSettings.sender_name }

      if (existing) {
        const { error } = await supabaseKorea.from('email_settings').update(saveData).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabaseKorea.from('email_settings').insert([saveData])
        if (error) throw error
      }
      alert('이메일 설정이 저장되었습니다.')
    } catch (error) {
      console.error('이메일 설정 저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!emailSettings.test_email) {
      alert('테스트 이메일 주소를 입력해주세요.')
      return
    }

    setTestEmailSending(true)
    try {
      const response = await fetch('/.netlify/functions/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailSettings.test_email,
          from_email: emailSettings.gmail_email,
          app_password: emailSettings.gmail_app_password,
          sender_name: emailSettings.sender_name
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('테스트 이메일이 발송되었습니다.')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('테스트 이메일 발송 실패: ' + error.message)
    } finally {
      setTestEmailSending(false)
    }
  }

  // ===== 추천 크리에이터 =====
  const fetchFeaturedCreators = async () => {
    if (!supabaseKorea) return
    setLoading(true)
    try {
      const { data, error } = await supabaseKorea
        .from('featured_creators')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setFeaturedCreators(data || [])
    } catch (error) {
      console.error('추천 크리에이터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchCreators = async () => {
    if (!supabaseKorea || !searchTerm.trim()) return
    setSearching(true)
    try {
      const { data, error } = await supabaseKorea
        .from('creators')
        .select('id, name, email, profile_image, channel_name, subscriber_count')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,channel_name.ilike.%${searchTerm}%`)
        .limit(20)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('크리에이터 검색 오류:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleAddFeaturedCreator = async (creator) => {
    if (!supabaseKorea) return
    const isAlreadyFeatured = featuredCreators.some(fc => fc.creator_id === creator.id)
    if (isAlreadyFeatured) {
      alert('이미 추천 크리에이터로 등록되어 있습니다.')
      return
    }

    try {
      const maxOrder = featuredCreators.length > 0 ? Math.max(...featuredCreators.map(fc => fc.display_order || 0)) : 0

      const { error } = await supabaseKorea
        .from('featured_creators')
        .insert([{
          creator_id: creator.id,
          creator_name: creator.name,
          profile_image: creator.profile_image,
          channel_name: creator.channel_name,
          subscriber_count: creator.subscriber_count,
          display_order: maxOrder + 1,
          is_active: true
        }])

      if (error) throw error
      alert('추천 크리에이터로 등록되었습니다.')
      fetchFeaturedCreators()
      setSearchResults([])
      setSearchTerm('')
    } catch (error) {
      console.error('추천 크리에이터 등록 오류:', error)
      alert('등록에 실패했습니다.')
    }
  }

  const handleRemoveFeaturedCreator = async (id) => {
    if (!supabaseKorea) return
    if (!confirm('추천 크리에이터에서 제거하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea.from('featured_creators').delete().eq('id', id)
      if (error) throw error
      fetchFeaturedCreators()
    } catch (error) {
      console.error('추천 크리에이터 제거 오류:', error)
    }
  }

  // ===== 이메일 템플릿 =====
  const fetchEmailTemplates = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea.from('email_templates').select('*').order('name', { ascending: true })
      if (error) throw error
      setEmailTemplates(data || [])
    } catch (error) {
      console.error('이메일 템플릿 조회 오류:', error)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!supabaseKorea || !editingTemplate) return
    setSaving(true)
    try {
      const { error } = await supabaseKorea
        .from('email_templates')
        .update({ subject: editingTemplate.subject, body: editingTemplate.body })
        .eq('id', editingTemplate.id)

      if (error) throw error
      alert('템플릿이 저장되었습니다.')
      setEditingTemplate(null)
      fetchEmailTemplates()
    } catch (error) {
      console.error('템플릿 저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ===== 푸터/사이트 정보 =====
  const fetchFooterSettings = async () => {
    if (!supabaseKorea) return
    try {
      const { data, error } = await supabaseKorea.from('site_settings').select('*').limit(1).maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setFooterSettings({
          company_name: data.company_name || '',
          ceo_name: data.ceo_name || '',
          business_number: data.business_number || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          customer_service_hours: data.customer_service_hours || '',
          copyright_text: data.copyright_text || '',
          instagram_url: data.instagram_url || '',
          youtube_url: data.youtube_url || '',
          blog_url: data.blog_url || '',
          kakao_channel_url: data.kakao_channel_url || '',
          privacy_policy_url: data.privacy_policy_url || '',
          terms_url: data.terms_url || ''
        })
      }
    } catch (error) {
      console.error('푸터 설정 조회 오류:', error)
    }
  }

  const handleSaveFooterSettings = async () => {
    if (!supabaseKorea) return
    setSaving(true)
    try {
      const { data: existing } = await supabaseKorea.from('site_settings').select('id').limit(1).maybeSingle()

      if (existing) {
        const { error } = await supabaseKorea.from('site_settings').update(footerSettings).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabaseKorea.from('site_settings').insert([footerSettings])
        if (error) throw error
      }
      alert('사이트 정보가 저장되었습니다.')
    } catch (error) {
      console.error('푸터 설정 저장 오류:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const faqCategories = [
    { value: 'general', label: '일반' },
    { value: 'service', label: '서비스' },
    { value: 'payment', label: '정산' },
    { value: 'campaign', label: '캠페인' }
  ]

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white lg:ml-64">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">사이트 관리 (크리에이터)</h1>
                <p className="text-gray-500 text-sm">cnec.co.kr 크리에이터 사이트 설정 관리</p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
              <TabsTrigger value="videos" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Video className="w-4 h-4" />
                영상
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <HelpCircle className="w-4 h-4" />
                FAQ
              </TabsTrigger>
              <TabsTrigger value="mainpage" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Layout className="w-4 h-4" />
                메인페이지
              </TabsTrigger>
              <TabsTrigger value="admins" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Shield className="w-4 h-4" />
                관리자
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Search className="w-4 h-4" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="featured" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <UserPlus className="w-4 h-4" />
                추천 크리에이터
              </TabsTrigger>
              <TabsTrigger value="email-templates" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <FileText className="w-4 h-4" />
                이메일 템플릿
              </TabsTrigger>
              <TabsTrigger value="footer" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Building2 className="w-4 h-4" />
                사이트 정보
              </TabsTrigger>
            </TabsList>

            {/* 영상 탭 */}
            <TabsContent value="videos">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-orange-500" />
                    캠페인 영상 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 새 영상 추가 */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      새 영상 추가
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL *</label>
                        <Input
                          value={newVideo.url}
                          onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                          placeholder="https://www.youtube.com/shorts/... 또는 https://www.youtube.com/watch?v=..."
                          className="bg-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">일반 영상 또는 Shorts URL을 입력하면 자동으로 embed 형태로 변환됩니다.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                        <Input
                          value={newVideo.title}
                          onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                          placeholder="영상 제목"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                        <Textarea
                          value={newVideo.description}
                          onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                          placeholder="영상 설명 (선택사항)"
                          className="bg-white"
                        />
                      </div>
                      <Button onClick={handleAddVideo} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        영상 추가
                      </Button>
                    </div>
                  </div>

                  {/* 등록된 영상 목록 */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">등록된 영상 ({videos.length}개)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videos.map((video, index) => (
                        <div key={video.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="relative">
                            <div className="absolute top-2 left-2 z-10 bg-black/70 text-white px-2 py-1 rounded-lg text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="absolute top-2 right-2 z-10 flex gap-1">
                              <button onClick={() => handleMoveVideo(video.id, 'top')} className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow" title="맨 위로">
                                <ChevronsUp className="w-4 h-4 text-gray-600" />
                              </button>
                              <button onClick={() => handleMoveVideo(video.id, 'up')} className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow" title="위로">
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              </button>
                              <button onClick={() => handleMoveVideo(video.id, 'down')} className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow" title="아래로">
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              </button>
                              <button onClick={() => handleMoveVideo(video.id, 'bottom')} className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow" title="맨 아래로">
                                <ChevronsDown className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                            <div className="aspect-[9/16] bg-black">
                              <iframe
                                src={video.url}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          </div>
                          <div className="p-4">
                            <h4 className="font-medium text-gray-900 truncate">{video.title}</h4>
                            {video.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{video.description}</p>}
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteVideo(video.id)} className="mt-3 w-full">
                              <Trash2 className="w-4 h-4 mr-1" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {videos.length === 0 && (
                      <div className="text-center py-12 text-gray-500">등록된 영상이 없습니다.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ 탭 */}
            <TabsContent value="faq">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-orange-500" />
                    FAQ 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 새 FAQ 추가 */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      새 FAQ 추가
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                        <select
                          value={newFaq.category}
                          onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          {faqCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">질문 *</label>
                        <Input
                          value={newFaq.question}
                          onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                          placeholder="자주 묻는 질문을 입력하세요"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">답변 *</label>
                        <Textarea
                          value={newFaq.answer}
                          onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                          placeholder="답변을 입력하세요"
                          rows={4}
                          className="bg-white"
                        />
                      </div>
                      <Button onClick={handleAddFaq} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        FAQ 추가
                      </Button>
                    </div>
                  </div>

                  {/* FAQ 목록 */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">등록된 FAQ ({faqs.length}개)</h3>
                    <div className="space-y-3">
                      {faqs.map((faq) => (
                        <div key={faq.id} className="bg-white border border-gray-200 rounded-xl p-4">
                          {editingFaq?.id === faq.id ? (
                            <div className="space-y-3">
                              <select
                                value={editingFaq.category}
                                onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                {faqCategories.map(cat => (
                                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                              </select>
                              <Input
                                value={editingFaq.question}
                                onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                              />
                              <Textarea
                                value={editingFaq.answer}
                                onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button onClick={handleUpdateFaq} disabled={saving} size="sm" className="bg-orange-500 hover:bg-orange-600">
                                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                  저장
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingFaq(null)}>취소</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full mb-2 ${
                                    faq.category === 'general' ? 'bg-gray-100 text-gray-700' :
                                    faq.category === 'service' ? 'bg-blue-100 text-blue-700' :
                                    faq.category === 'payment' ? 'bg-green-100 text-green-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                    {faqCategories.find(c => c.value === faq.category)?.label || faq.category}
                                  </span>
                                  <h4 className="font-medium text-gray-900">Q. {faq.question}</h4>
                                  <p className="text-gray-600 mt-2 text-sm whitespace-pre-wrap">A. {faq.answer}</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => setEditingFaq(faq)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(faq.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {faqs.length === 0 && (
                        <div className="text-center py-12 text-gray-500">등록된 FAQ가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 메인페이지 탭 */}
            <TabsContent value="mainpage">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="w-5 h-5 text-orange-500" />
                    메인페이지 문구 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">히어로 섹션</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">메인 타이틀</label>
                          <Input
                            value={pageContents.hero_title}
                            onChange={(e) => setPageContents({ ...pageContents, hero_title: e.target.value })}
                            placeholder="메인 타이틀"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">서브 타이틀</label>
                          <Textarea
                            value={pageContents.hero_subtitle}
                            onChange={(e) => setPageContents({ ...pageContents, hero_subtitle: e.target.value })}
                            placeholder="서브 타이틀"
                            rows={2}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CTA 버튼 텍스트</label>
                          <Input
                            value={pageContents.cta_button_text}
                            onChange={(e) => setPageContents({ ...pageContents, cta_button_text: e.target.value })}
                            placeholder="시작하기"
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">통계 숫자</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 수</label>
                          <Input
                            value={pageContents.stats_campaigns}
                            onChange={(e) => setPageContents({ ...pageContents, stats_campaigns: e.target.value })}
                            placeholder="100+"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">크리에이터 수</label>
                          <Input
                            value={pageContents.stats_creators}
                            onChange={(e) => setPageContents({ ...pageContents, stats_creators: e.target.value })}
                            placeholder="1,000+"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">진출 국가</label>
                          <Input
                            value={pageContents.stats_countries}
                            onChange={(e) => setPageContents({ ...pageContents, stats_countries: e.target.value })}
                            placeholder="4개국"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">성공률</label>
                          <Input
                            value={pageContents.stats_success}
                            onChange={(e) => setPageContents({ ...pageContents, stats_success: e.target.value })}
                            placeholder="98%"
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">소개 텍스트</label>
                      <Textarea
                        value={pageContents.about_text}
                        onChange={(e) => setPageContents({ ...pageContents, about_text: e.target.value })}
                        placeholder="서비스 소개 텍스트"
                        rows={4}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSavePageContents} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    저장하기
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 관리자 탭 */}
            <TabsContent value="admins">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-orange-500" />
                    관리자 등록
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      새 관리자 추가
                    </h3>
                    <div className="flex gap-3">
                      <Input
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                        placeholder="관리자 이메일"
                        className="flex-1 bg-white"
                      />
                      <select
                        value={newAdmin.role}
                        onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="admin">일반 관리자</option>
                        <option value="super_admin">슈퍼 관리자</option>
                      </select>
                      <Button onClick={handleAddAdmin} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">등록된 관리자 ({admins.length}명)</h3>
                    <div className="space-y-2">
                      {admins.map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${admin.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                              <Shield className={`w-5 h-5 ${admin.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{admin.email}</p>
                              <p className={`text-xs ${admin.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                                {admin.role === 'super_admin' ? '슈퍼 관리자' : '일반 관리자'}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAdmin(admin.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {admins.length === 0 && (
                        <div className="text-center py-12 text-gray-500">등록된 관리자가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO 탭 */}
            <TabsContent value="seo">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-orange-500" />
                    SEO 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">사이트 제목</label>
                      <Input
                        value={seoSettings.site_title}
                        onChange={(e) => setSeoSettings({ ...seoSettings, site_title: e.target.value })}
                        placeholder="CNEC - 크리에이터 네트워크"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">사이트 설명</label>
                      <Textarea
                        value={seoSettings.site_description}
                        onChange={(e) => setSeoSettings({ ...seoSettings, site_description: e.target.value })}
                        placeholder="검색엔진에 표시될 설명"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">키워드 (쉼표로 구분)</label>
                      <Input
                        value={seoSettings.site_keywords}
                        onChange={(e) => setSeoSettings({ ...seoSettings, site_keywords: e.target.value })}
                        placeholder="크리에이터, 숏폼, 인플루언서"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">OG 이미지 URL</label>
                      <Input
                        value={seoSettings.og_image}
                        onChange={(e) => setSeoSettings({ ...seoSettings, og_image: e.target.value })}
                        placeholder="https://example.com/og-image.png"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics ID</label>
                        <Input
                          value={seoSettings.google_analytics_id}
                          onChange={(e) => setSeoSettings({ ...seoSettings, google_analytics_id: e.target.value })}
                          placeholder="G-XXXXXXXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google 사이트 인증</label>
                        <Input
                          value={seoSettings.google_site_verification}
                          onChange={(e) => setSeoSettings({ ...seoSettings, google_site_verification: e.target.value })}
                          placeholder="인증 코드"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">네이버 사이트 인증</label>
                      <Input
                        value={seoSettings.naver_site_verification}
                        onChange={(e) => setSeoSettings({ ...seoSettings, naver_site_verification: e.target.value })}
                        placeholder="인증 코드"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSeoSettings} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    저장하기
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email 탭 */}
            <TabsContent value="email">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-orange-500" />
                    이메일 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    Gmail 앱 비밀번호 설정이 필요합니다. Google 계정 → 보안 → 2단계 인증 활성화 후 앱 비밀번호를 생성하세요.
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">발신자 이름</label>
                      <Input
                        value={emailSettings.sender_name}
                        onChange={(e) => setEmailSettings({ ...emailSettings, sender_name: e.target.value })}
                        placeholder="CNEC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gmail 이메일</label>
                      <Input
                        value={emailSettings.gmail_email}
                        onChange={(e) => setEmailSettings({ ...emailSettings, gmail_email: e.target.value })}
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gmail 앱 비밀번호</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={emailSettings.gmail_app_password}
                          onChange={(e) => setEmailSettings({ ...emailSettings, gmail_app_password: e.target.value })}
                          placeholder="xxxx xxxx xxxx xxxx"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleSaveEmailSettings} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    설정 저장
                  </Button>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">테스트 이메일 발송</h3>
                    <div className="flex gap-3">
                      <Input
                        value={emailSettings.test_email}
                        onChange={(e) => setEmailSettings({ ...emailSettings, test_email: e.target.value })}
                        placeholder="test@example.com"
                        className="flex-1"
                      />
                      <Button onClick={handleSendTestEmail} disabled={testEmailSending} variant="outline">
                        {testEmailSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        테스트 발송
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 추천 크리에이터 탭 */}
            <TabsContent value="featured">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-orange-500" />
                    추천 크리에이터 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 크리에이터 검색 */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">크리에이터 검색</h3>
                    <div className="flex gap-3 mb-4">
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="이름, 이메일, 채널명으로 검색"
                        className="flex-1 bg-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchCreators()}
                      />
                      <Button onClick={handleSearchCreators} disabled={searching} className="bg-orange-500 hover:bg-orange-600">
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map((creator) => (
                          <div key={creator.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                {creator.profile_image ? (
                                  <img src={creator.profile_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <UserPlus className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{creator.name}</p>
                                <p className="text-xs text-gray-500">{creator.channel_name || creator.email}</p>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleAddFeaturedCreator(creator)} className="bg-orange-500 hover:bg-orange-600">
                              <Plus className="w-4 h-4 mr-1" />
                              추가
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 추천 크리에이터 목록 */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">추천 크리에이터 목록 ({featuredCreators.length}명)</h3>
                    {loading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredCreators.map((fc) => (
                          <div key={fc.id} className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                {fc.profile_image ? (
                                  <img src={fc.profile_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <UserPlus className="w-6 h-6" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{fc.creator_name}</p>
                                <p className="text-xs text-gray-500 truncate">{fc.channel_name}</p>
                                {fc.subscriber_count && (
                                  <p className="text-xs text-orange-600">구독자 {fc.subscriber_count.toLocaleString()}명</p>
                                )}
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveFeaturedCreator(fc.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {featuredCreators.length === 0 && (
                          <div className="col-span-full text-center py-12 text-gray-500">추천 크리에이터가 없습니다.</div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 이메일 템플릿 탭 */}
            <TabsContent value="email-templates">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    이메일 템플릿 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    {emailTemplates.map((template) => (
                      <div key={template.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        {editingTemplate?.id === template.id ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">템플릿명</label>
                              <p className="text-gray-900">{template.name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                              <Input
                                value={editingTemplate.subject}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
                              <Textarea
                                value={editingTemplate.body}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                                rows={10}
                                className="font-mono text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleUpdateTemplate} disabled={saving} size="sm" className="bg-orange-500 hover:bg-orange-600">
                                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                저장
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>취소</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{template.name}</p>
                              <p className="text-sm text-gray-500">{template.subject}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setEditingTemplate(template)}>
                              <Edit className="w-4 h-4 mr-1" />
                              수정
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {emailTemplates.length === 0 && (
                      <div className="text-center py-12 text-gray-500">등록된 이메일 템플릿이 없습니다.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 사이트 정보/푸터 탭 */}
            <TabsContent value="footer">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-orange-500" />
                    사이트 정보 / 푸터 관리
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 회사 기본 정보 */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">회사 기본 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
                        <Input
                          value={footerSettings.company_name}
                          onChange={(e) => setFooterSettings({ ...footerSettings, company_name: e.target.value })}
                          placeholder="(주)씨넥"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">대표자명</label>
                        <Input
                          value={footerSettings.ceo_name}
                          onChange={(e) => setFooterSettings({ ...footerSettings, ceo_name: e.target.value })}
                          placeholder="홍길동"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                        <Input
                          value={footerSettings.business_number}
                          onChange={(e) => setFooterSettings({ ...footerSettings, business_number: e.target.value })}
                          placeholder="123-45-67890"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                        <Input
                          value={footerSettings.phone}
                          onChange={(e) => setFooterSettings({ ...footerSettings, phone: e.target.value })}
                          placeholder="02-1234-5678"
                          className="bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                        <Input
                          value={footerSettings.address}
                          onChange={(e) => setFooterSettings({ ...footerSettings, address: e.target.value })}
                          placeholder="서울특별시 강남구 테헤란로 123"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                        <Input
                          value={footerSettings.email}
                          onChange={(e) => setFooterSettings({ ...footerSettings, email: e.target.value })}
                          placeholder="contact@cnec.co.kr"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">고객센터 운영시간</label>
                        <Input
                          value={footerSettings.customer_service_hours}
                          onChange={(e) => setFooterSettings({ ...footerSettings, customer_service_hours: e.target.value })}
                          placeholder="평일 09:00 - 18:00"
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SNS 링크 */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">SNS 링크</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">인스타그램 URL</label>
                        <Input
                          value={footerSettings.instagram_url}
                          onChange={(e) => setFooterSettings({ ...footerSettings, instagram_url: e.target.value })}
                          placeholder="https://instagram.com/cnec"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">유튜브 URL</label>
                        <Input
                          value={footerSettings.youtube_url}
                          onChange={(e) => setFooterSettings({ ...footerSettings, youtube_url: e.target.value })}
                          placeholder="https://youtube.com/@cnec"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">블로그 URL</label>
                        <Input
                          value={footerSettings.blog_url}
                          onChange={(e) => setFooterSettings({ ...footerSettings, blog_url: e.target.value })}
                          placeholder="https://blog.naver.com/cnec"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">카카오 채널 URL</label>
                        <Input
                          value={footerSettings.kakao_channel_url}
                          onChange={(e) => setFooterSettings({ ...footerSettings, kakao_channel_url: e.target.value })}
                          placeholder="https://pf.kakao.com/cnec"
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 법적 문서 링크 및 저작권 */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">법적 문서 및 저작권</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">개인정보처리방침 URL</label>
                        <Input
                          value={footerSettings.privacy_policy_url}
                          onChange={(e) => setFooterSettings({ ...footerSettings, privacy_policy_url: e.target.value })}
                          placeholder="/privacy-policy 또는 전체 URL"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">이용약관 URL</label>
                        <Input
                          value={footerSettings.terms_url}
                          onChange={(e) => setFooterSettings({ ...footerSettings, terms_url: e.target.value })}
                          placeholder="/terms 또는 전체 URL"
                          className="bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">저작권 문구</label>
                        <Input
                          value={footerSettings.copyright_text}
                          onChange={(e) => setFooterSettings({ ...footerSettings, copyright_text: e.target.value })}
                          placeholder="© 2025 CNEC. All rights reserved."
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveFooterSettings} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    저장하기
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
