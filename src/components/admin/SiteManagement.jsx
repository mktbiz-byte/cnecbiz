import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Video, HelpCircle, Edit, Plus, Trash2, Save, 
  Eye, EyeOff, Shield, UserPlus, Search, FileText, Mail, Send
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function SiteManagement() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('videos')
  
  // 영상 레퍼런스
  const [videos, setVideos] = useState([])
  const [newVideo, setNewVideo] = useState({ url: '', title: '', description: '' })
  const [editingVideo, setEditingVideo] = useState(null)
  
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
    stats_success: '',
    feature_1_title: '',
    feature_1_desc: '',
    feature_2_title: '',
    feature_2_desc: '',
    feature_3_title: '',
    feature_3_desc: ''
  })
  
  // 관리자 등록
  const [admins, setAdmins] = useState([])
  const [newAdmin, setNewAdmin] = useState({ email: '', role: 'admin' })
  
  // SEO 설정
  const [seoSettings, setSeoSettings] = useState({
    site_title: 'CNEC BIZ - 글로벌 인플루언서 마케팅 플랫폼',
    site_description: 'K-뷰티를 세계로, 14일 만에 완성하는 숏폼. 일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼.',
    site_keywords: '인플루언서마케팅, 숏폼, K-뷰티, 글로벌마케팅, 수출바우처',
    og_image: '',
    google_analytics_id: '',
    naver_site_verification: '',
    google_site_verification: ''
  })
  
  // Email 설정
  const [emailSettings, setEmailSettings] = useState({
    gmail_email: '',
    gmail_app_password: '',
    sender_name: 'CNEC BIZ',
    test_email: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [testEmailSending, setTestEmailSending] = useState(false)

  // 추천 크리에이터
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchVideos()
    fetchFaqs()
    fetchPageContents()
    fetchAdmins()
    fetchSeoSettings()
    fetchEmailSettings()
    fetchFeaturedCreators()
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
      .maybeSingle()

    if (!adminData) {
      navigate('/login')
    }
  }

  // ===== 영상 레퍼런스 =====
  const fetchVideos = async () => {
    try {
      const { data, error } = await supabaseBiz
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
    if (!newVideo.url || !newVideo.title) {
      alert('URL과 제목을 입력해주세요.')
      return
    }

    try {
      const embedUrl = convertToEmbedUrl(newVideo.url)
      const maxOrder = videos.length > 0 ? Math.max(...videos.map(v => v.display_order || 0)) : 0
      
      const { error } = await supabaseBiz
        .from('reference_videos')
        .insert([{ ...newVideo, url: embedUrl, display_order: maxOrder + 1, is_active: true }])

      if (error) throw error

      alert('영상이 추가되었습니다.')
      setNewVideo({ url: '', title: '', description: '' })
      fetchVideos()
    } catch (error) {
      console.error('영상 추가 오류:', error)
      alert('영상 추가에 실패했습니다.')
    }
  }

  const handleDeleteVideo = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('reference_videos')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('영상이 삭제되었습니다.')
      fetchVideos()
    } catch (error) {
      console.error('영상 삭제 오류:', error)
      alert('영상 삭제에 실패했습니다.')
    }
  }

  // ===== FAQ =====
  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabaseBiz
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
    if (!newFaq.question || !newFaq.answer) {
      alert('질문과 답변을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('faqs')
        .insert([{ ...newFaq, order: faqs.length, is_visible: true }])

      if (error) throw error

      alert('FAQ가 추가되었습니다.')
      setNewFaq({ question: '', answer: '', category: 'general', order: 0 })
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 추가 오류:', error)
      alert('FAQ 추가에 실패했습니다.')
    }
  }

  const handleDeleteFaq = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('faqs')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('FAQ가 삭제되었습니다.')
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 삭제 오류:', error)
      alert('FAQ 삭제에 실패했습니다.')
    }
  }

  // ===== 메인페이지 문구 =====
  const fetchPageContents = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('page_contents')
        .select('*')

      if (error) throw error
      
      // 배열을 객체로 변환
      const contentsObj = {}
      data?.forEach(item => {
        contentsObj[item.content_key] = item.content
      })
      
      setPageContents(prev => ({ ...prev, ...contentsObj }))
    } catch (error) {
      console.error('페이지 콘텐츠 조회 오류:', error)
    }
  }

  const handleSaveAllContents = async () => {
    try {
      // 모든 콘텐츠를 upsert
      const updates = Object.entries(pageContents).map(([key, value]) => ({
        content_key: key,
        content: value,
        updated_at: new Date().toISOString()
      }))

      for (const update of updates) {
        const { error } = await supabaseBiz
          .from('page_contents')
          .upsert(update, {
            onConflict: 'content_key'
          })
        
        if (error) throw error
      }

      alert('모든 변경사항이 저장되었습니다!')
      fetchPageContents()
    } catch (error) {
      console.error('콘텐츠 저장 오류:', error)
      alert('저장에 실패했습니다: ' + error.message)
    }
  }

  // ===== 관리자 등록 =====
  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error('관리자 조회 오류:', error)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.email) {
      alert('이메일을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('admin_users')
        .insert({
          email: newAdmin.email,
          role: newAdmin.role,
          permissions: newAdmin.role === 'super_admin' 
            ? {
                manage_companies: true,
                manage_campaigns: true,
                manage_payments: true,
                manage_creators: true,
                manage_admins: true
              }
            : {
                manage_companies: true,
                manage_campaigns: true,
                manage_payments: true,
                manage_creators: true,
                manage_admins: false
              }
        })

      if (error) throw error

      alert('관리자가 추가되었습니다. 해당 이메일로 로그인하면 관리자 권한이 부여됩니다.')
      setNewAdmin({ email: '', role: 'admin' })
      fetchAdmins()
    } catch (error) {
      console.error('관리자 추가 오류:', error)
      alert('관리자 추가에 실패했습니다: ' + error.message)
    }
  }

  const handleDeleteAdmin = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('admin_users')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('관리자가 삭제되었습니다.')
      fetchAdmins()
    } catch (error) {
      console.error('관리자 삭제 오류:', error)
      alert('관리자 삭제에 실패했습니다.')
    }
  }

  // ===== SEO 설정 =====
  const fetchSeoSettings = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('seo_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setSeoSettings(data)
    } catch (error) {
      console.error('SEO 설정 조회 오류:', error)
    }
  }

  const handleSaveSeoSettings = async () => {
    try {
      const { data: existing } = await supabaseBiz
        .from('seo_settings')
        .select('id')
        .single()

      if (existing) {
        const { error } = await supabaseBiz
          .from('seo_settings')
          .update(seoSettings)
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabaseBiz
          .from('seo_settings')
          .insert([seoSettings])

        if (error) throw error
      }

      alert('SEO 설정이 저장되었습니다.')
    } catch (error) {
      console.error('SEO 설정 저장 오류:', error)
      alert('SEO 설정 저장에 실패했습니다.')
    }
  }

  // ===== Email 설정 =====
  const fetchEmailSettings = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('email_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setEmailSettings(data)
    } catch (error) {
      console.error('Email 설정 조회 오류:', error)
    }
  }

  const handleSaveEmailSettings = async () => {
    try {
      if (!emailSettings.gmail_email || !emailSettings.gmail_app_password) {
        alert('Gmail 이메일과 앱 비밀번호를 모두 입력해주세요.')
        return
      }

      const { data: existing } = await supabaseBiz
        .from('email_settings')
        .select('id')
        .single()

      const saveData = {
        gmail_email: emailSettings.gmail_email,
        gmail_app_password: emailSettings.gmail_app_password,
        sender_name: emailSettings.sender_name
      }

      if (existing) {
        const { error } = await supabaseBiz
          .from('email_settings')
          .update(saveData)
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabaseBiz
          .from('email_settings')
          .insert([saveData])

        if (error) throw error
      }

      alert('Email 설정이 저장되었습니다.')
      fetchEmailSettings()
    } catch (error) {
      console.error('Email 설정 저장 오류:', error)
      alert('Email 설정 저장에 실패했습니다.')
    }
  }

  const handleSendTestEmail = async () => {
    try {
      if (!emailSettings.test_email) {
        alert('테스트 이메일 주소를 입력해주세요.')
        return
      }

      setTestEmailSending(true)

      const response = await fetch('/.netlify/functions/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailSettings.test_email,
          subject: '[CNEC BIZ] 테스트 이메일',
          text: '이것은 Gmail SMTP 테스트 이메일입니다.'
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`테스트 이메일이 ${emailSettings.test_email}로 발송되었습니다!`)
      } else {
        throw new Error(result.error || '이메일 발송 실패')
      }
    } catch (error) {
      console.error('테스트 이메일 발송 오류:', error)
      alert('테스트 이메일 발송에 실패했습니다: ' + error.message)
    } finally {
      setTestEmailSending(false)
    }
  }

  // 추천 크리에이터 함수들
  const fetchFeaturedCreators = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/.netlify/functions/get-featured-creators?country=${selectedCountry}`)
      const result = await response.json()
      if (result.success) {
        setFeaturedCreators(result.data || [])
      }
    } catch (error) {
      console.error('추천 크리에이터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchCreators = async () => {
    if (!searchTerm.trim()) {
      alert('검색어를 입력해주세요.')
      return
    }

    try {
      setSearching(true)
      const response = await fetch('/.netlify/functions/search-creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm,
          country: selectedCountry === 'all' ? null : selectedCountry
        })
      })
      const result = await response.json()
      if (result.success) {
        setSearchResults(result.results || [])
      }
    } catch (error) {
      console.error('크리에이터 검색 오류:', error)
      alert('검색에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  const handleAddFeaturedCreator = async (creator, sourceCountry) => {
    try {
      const response = await fetch('/.netlify/functions/add-featured-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator, sourceCountry })
      })
      const result = await response.json()
      if (result.success) {
        alert('추천 크리에이터로 등록되었습니다!')
        fetchFeaturedCreators()
        setSearchResults([])
        setSearchTerm('')
      } else {
        alert(result.error || '등록에 실패했습니다.')
      }
    } catch (error) {
      console.error('추천 크리에이터 등록 오류:', error)
      alert('등록에 실패했습니다.')
    }
  }

  const handleRemoveFeaturedCreator = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch('/.netlify/functions/remove-featured-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const result = await response.json()
      if (result.success) {
        alert('삭제되었습니다.')
        fetchFeaturedCreators()
      }
    } catch (error) {
      console.error('추천 크리에이터 삭제 오류:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              사이트 관리
            </h1>
            <p className="text-gray-600 mt-1">영상, FAQ, 메인페이지, 관리자, SEO를 관리하세요</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                영상
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                FAQ
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                메인페이지
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                관리자
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="featured" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                추천 크리에이터
              </TabsTrigger>
            </TabsList>

            {/* 영상 레퍼런스 탭 */}
            <TabsContent value="videos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    새 영상 추가
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">YouTube URL *</label>
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/shorts/... 또는 https://www.youtube.com/watch?v=..."
                      value={newVideo.url}
                      onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">일반 영상 또는 Shorts URL을 입력하면 자동으로 embed 형태로 변환됩니다.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">제목 *</label>
                    <Input
                      type="text"
                      placeholder="영상 제목"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">설명</label>
                    <Textarea
                      placeholder="영상 설명 (선택사항)"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAddVideo} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    영상 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>등록된 영상 ({videos.length}개)</CardTitle>
                </CardHeader>
                <CardContent>
                  {videos.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">등록된 영상이 없습니다.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {videos.map((video) => (
                        <div key={video.id} className="border rounded-lg p-4 space-y-3">
                          <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                            <iframe
                              src={video.url}
                              title={video.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <div>
                            <h3 className="font-bold">{video.title}</h3>
                            {video.description && (
                              <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">{video.url}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVideo(video.id)}
                            className="w-full text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ 탭 */}
            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    새 FAQ 추가
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">질문 *</label>
                    <Input
                      type="text"
                      placeholder="자주 묻는 질문을 입력하세요"
                      value={newFaq.question}
                      onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">답변 *</label>
                    <Textarea
                      placeholder="답변을 입력하세요"
                      value={newFaq.answer}
                      onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                      rows={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">카테고리</label>
                    <select
                      value={newFaq.category}
                      onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="general">일반</option>
                      <option value="service">서비스</option>
                      <option value="payment">결제</option>
                      <option value="voucher">수출바우처</option>
                    </select>
                  </div>
                  <Button onClick={handleAddFaq} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    FAQ 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>등록된 FAQ ({faqs.length}개)</CardTitle>
                </CardHeader>
                <CardContent>
                  {faqs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">등록된 FAQ가 없습니다.</div>
                  ) : (
                    <div className="space-y-4">
                      {faqs.map((faq) => (
                        <div key={faq.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{faq.question}</h3>
                              <p className="text-gray-600 mt-2">{faq.answer}</p>
                              <p className="text-xs text-gray-400 mt-2">카테고리: {faq.category}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFaq(faq.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 메인페이지 문구 탭 */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>메인페이지 문구 관리</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 히어로 섹션 */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-4">히어로 섹션</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">히어로 타이틀</label>
                        <Input
                          type="text"
                          placeholder="K-뷰티를 세계로, 14일 만에 완성하는 숏폼"
                          value={pageContents.hero_title}
                          onChange={(e) => setPageContents({ ...pageContents, hero_title: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">히어로 서브타이틀</label>
                        <Textarea
                          placeholder="일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼"
                          value={pageContents.hero_subtitle}
                          onChange={(e) => setPageContents({ ...pageContents, hero_subtitle: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">CTA 버튼 텍스트</label>
                        <Input
                          type="text"
                          placeholder="무료로 시작하기"
                          value={pageContents.cta_button_text}
                          onChange={(e) => setPageContents({ ...pageContents, cta_button_text: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 통계 섹션 */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-4">통계 섹션</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">완료된 캠페인</label>
                        <Input
                          type="text"
                          placeholder="1,200+"
                          value={pageContents.stats_campaigns}
                          onChange={(e) => setPageContents({ ...pageContents, stats_campaigns: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">파트너 크리에이터</label>
                        <Input
                          type="text"
                          placeholder="500+"
                          value={pageContents.stats_creators}
                          onChange={(e) => setPageContents({ ...pageContents, stats_creators: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">진출 국가</label>
                        <Input
                          type="text"
                          placeholder="3개국"
                          value={pageContents.stats_countries}
                          onChange={(e) => setPageContents({ ...pageContents, stats_countries: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">평균 조회수</label>
                        <Input
                          type="text"
                          placeholder="50만+"
                          value={pageContents.stats_success}
                          onChange={(e) => setPageContents({ ...pageContents, stats_success: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 특징 섹션 */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-4">특징 섹션</h3>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">특징 1</h4>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            placeholder="타이틀"
                            value={pageContents.feature_1_title}
                            onChange={(e) => setPageContents({ ...pageContents, feature_1_title: e.target.value })}
                          />
                          <Textarea
                            placeholder="설명"
                            value={pageContents.feature_1_desc}
                            onChange={(e) => setPageContents({ ...pageContents, feature_1_desc: e.target.value })}
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">특징 2</h4>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            placeholder="타이틀"
                            value={pageContents.feature_2_title}
                            onChange={(e) => setPageContents({ ...pageContents, feature_2_title: e.target.value })}
                          />
                          <Textarea
                            placeholder="설명"
                            value={pageContents.feature_2_desc}
                            onChange={(e) => setPageContents({ ...pageContents, feature_2_desc: e.target.value })}
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2">특징 3</h4>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            placeholder="타이틀"
                            value={pageContents.feature_3_title}
                            onChange={(e) => setPageContents({ ...pageContents, feature_3_title: e.target.value })}
                          />
                          <Textarea
                            placeholder="설명"
                            value={pageContents.feature_3_desc}
                            onChange={(e) => setPageContents({ ...pageContents, feature_3_desc: e.target.value })}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장 버튼 */}
                  <Button onClick={handleSaveAllContents} className="w-full" size="lg">
                    <Save className="w-5 h-5 mr-2" />
                    모든 변경사항 저장
                  </Button>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      💡 변경한 내용은 '저장' 버튼을 클릭해야 반영됩니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 관리자 등록 탭 */}
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    새 관리자 추가
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">이메일 *</label>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">권한 *</label>
                    <select
                      value={newAdmin.role}
                      onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="admin">일반 관리자</option>
                      <option value="super_admin">슈퍼 관리자</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      슈퍼 관리자는 다른 관리자를 추가/삭제할 수 있습니다.
                    </p>
                  </div>
                  <Button onClick={handleAddAdmin} className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    관리자 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>등록된 관리자 ({admins.length}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  {admins.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">등록된 관리자가 없습니다.</div>
                  ) : (
                    <div className="space-y-3">
                      {admins.map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{admin.email}</p>
                            <p className="text-sm text-gray-600">
                              {admin.role === 'super_admin' ? '슈퍼 관리자' : '일반 관리자'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              등록일: {new Date(admin.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO 설정 탭 */}
            <TabsContent value="seo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    SEO 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">사이트 제목</label>
                    <Input
                      type="text"
                      placeholder="CNEC BIZ - 글로벌 인플루언서 마케팅 플랫폼"
                      value={seoSettings.site_title}
                      onChange={(e) => setSeoSettings({ ...seoSettings, site_title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">사이트 설명</label>
                    <Textarea
                      placeholder="사이트 설명 (검색 결과에 표시됩니다)"
                      value={seoSettings.site_description}
                      onChange={(e) => setSeoSettings({ ...seoSettings, site_description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">키워드 (쉼표로 구분)</label>
                    <Input
                      type="text"
                      placeholder="인플루언서마케팅, 숏폼, K-뷰티, 글로벌마케팅"
                      value={seoSettings.site_keywords}
                      onChange={(e) => setSeoSettings({ ...seoSettings, site_keywords: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">OG 이미지 URL</label>
                    <Input
                      type="url"
                      placeholder="https://example.com/og-image.jpg"
                      value={seoSettings.og_image}
                      onChange={(e) => setSeoSettings({ ...seoSettings, og_image: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">소셜 미디어 공유 시 표시될 이미지</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Google Analytics ID</label>
                    <Input
                      type="text"
                      placeholder="G-XXXXXXXXXX"
                      value={seoSettings.google_analytics_id}
                      onChange={(e) => setSeoSettings({ ...seoSettings, google_analytics_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">네이버 사이트 인증 코드</label>
                    <Input
                      type="text"
                      placeholder="naver-site-verification"
                      value={seoSettings.naver_site_verification}
                      onChange={(e) => setSeoSettings({ ...seoSettings, naver_site_verification: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Google 사이트 인증 코드</label>
                    <Input
                      type="text"
                      placeholder="google-site-verification"
                      value={seoSettings.google_site_verification}
                      onChange={(e) => setSeoSettings({ ...seoSettings, google_site_verification: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveSeoSettings} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    SEO 설정 저장
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email 설정 탭 */}
            <TabsContent value="email" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gmail SMTP 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Gmail 앱 비밀번호 생성 방법 안내 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Gmail 앱 비밀번호 생성 방법
                    </h4>
                    <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                      <li>Google 계정 설정 페이지로 이동: <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline">https://myaccount.google.com/security</a></li>
                      <li>"보안" 섹션에서 "2단계 인증" 활성화</li>
                      <li>2단계 인증 페이지에서 "앱 비밀번호" 선택</li>
                      <li>"앱 선택"에서 "기타" 선택 후 "CNEC BIZ" 입력</li>
                      <li>"기기 선택"에서 "기타" 선택 후 "웹 서버" 입력</li>
                      <li>"생성" 버튼 클릭 후 16자리 비밀번호 복사</li>
                      <li>아래 "앱 비밀번호" 필드에 붙여넣기</li>
                    </ol>
                  </div>

                  {/* Gmail 설정 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Gmail 이메일 주소</label>
                    <Input
                      type="email"
                      placeholder="your-email@gmail.com"
                      value={emailSettings.gmail_email}
                      onChange={(e) => setEmailSettings({ ...emailSettings, gmail_email: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">이메일 발송에 사용할 Gmail 계정</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Gmail 앱 비밀번호</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="16자리 앱 비밀번호"
                        value={emailSettings.gmail_app_password}
                        onChange={(e) => setEmailSettings({ ...emailSettings, gmail_app_password: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">위 안내에 따라 생성한 16자리 비밀번호 (공백 제거)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">발신자 이름</label>
                    <Input
                      type="text"
                      placeholder="CNEC BIZ"
                      value={emailSettings.sender_name}
                      onChange={(e) => setEmailSettings({ ...emailSettings, sender_name: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">수신자에게 표시될 발신자 이름</p>
                  </div>

                  <Button onClick={handleSaveEmailSettings} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Email 설정 저장
                  </Button>

                  {/* 테스트 이메일 발송 */}
                  <div className="border-t pt-6">
                    <h4 className="font-bold text-gray-900 mb-4">테스트 이메일 발송</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">테스트 수신 이메일</label>
                        <Input
                          type="email"
                          placeholder="test@example.com"
                          value={emailSettings.test_email}
                          onChange={(e) => setEmailSettings({ ...emailSettings, test_email: e.target.value })}
                        />
                      </div>
                      <Button 
                        onClick={handleSendTestEmail} 
                        disabled={testEmailSending}
                        className="w-full"
                        variant="outline"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {testEmailSending ? '발송 중...' : '테스트 이메일 발송'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 추천 크리에이터 탭 */}
            <TabsContent value="featured" className="space-y-6">
              {/* 검색 카드 */}
              <Card>
                <CardHeader>
                  <CardTitle>크리에이터 검색</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    이름 또는 이메일로 크리에이터를 검색하여 추천 크리에이터로 등록하세요.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <select 
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="all">전체 국가</option>
                      <option value="KR">한국</option>
                      <option value="JP">일본</option>
                      <option value="US">미국</option>
                      <option value="TW">대만</option>
                    </select>
                    <Input
                      placeholder="크리에이터 이름 또는 이메일 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchCreators()}
                      className="flex-1"
                    />
                    <Button onClick={handleSearchCreators} disabled={searching}>
                      <Search className="w-4 h-4 mr-2" />
                      {searching ? '검색 중...' : '검색'}
                    </Button>
                  </div>

                  {/* 검색 결과 */}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2">
                      <h4 className="font-semibold">검색 결과 ({searchResults.length}명)</h4>
                      {searchResults.map((creator) => (
                        <div key={creator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{creator.name || creator.email}</p>
                            <p className="text-sm text-gray-600">
                              {creator.source_country} | 
                              Instagram: {creator.instagram_followers || 0} | 
                              TikTok: {creator.tiktok_followers || 0} | 
                              YouTube: {creator.youtube_subscribers || 0}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleAddFeaturedCreator(creator, creator.source_country)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            등록
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 추천 크리에이터 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle>추천 크리에이터 목록 ({featuredCreators.length}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">로딩 중...</div>
                  ) : featuredCreators.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">등록된 추천 크리에이터가 없습니다.</div>
                  ) : (
                    <div className="space-y-2">
                      {featuredCreators.map((creator) => (
                        <div key={creator.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{creator.name || creator.email}</p>
                              <Badge variant={creator.recommendation_badge === 'excellent' ? 'default' : 'secondary'}>
                                {creator.recommendation_badge}
                              </Badge>
                              <Badge variant="outline">{creator.primary_country}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              점수: {creator.overall_score}/100 | 
                              Instagram: {creator.instagram_followers || 0} | 
                              TikTok: {creator.tiktok_followers || 0} | 
                              YouTube: {creator.youtube_subscribers || 0}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRemoveFeaturedCreator(creator.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

