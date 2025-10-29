import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Video, HelpCircle, Edit, Plus, Trash2, Save, 
  Eye, EyeOff, ArrowUp, ArrowDown 
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
  
  // 사이트 콘텐츠
  const [siteContent, setSiteContent] = useState({
    hero_title: '',
    hero_subtitle: '',
    about_text: '',
    features: []
  })

  useEffect(() => {
    checkAuth()
    fetchVideos()
    fetchFaqs()
    fetchSiteContent()
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
        .order('created_at', { ascending: false })

      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('영상 조회 오류:', error)
    }
  }

  // YouTube URL을 embed 형태로 변환
  const convertToEmbedUrl = (url) => {
    if (!url) return url
    
    // 이미 embed 형태면 그대로 반환
    if (url.includes('/embed/')) return url
    
    // YouTube URL에서 video ID 추출
    const match = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (!match) return url
    
    const videoId = match[1]
    
    // Shorts URL인지 확인
    const isShorts = url.includes('/shorts/')
    
    // Shorts는 파라미터 추가, 일반 영상은 기본 embed URL
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
      // URL을 embed 형태로 변환
      const embedUrl = convertToEmbedUrl(newVideo.url)
      
      const { error } = await supabaseBiz
        .from('reference_videos')
        .insert([{ ...newVideo, url: embedUrl }])

      if (error) throw error

      alert('영상이 추가되었습니다. (embed URL로 자동 변환됨)')
      setNewVideo({ url: '', title: '', description: '' })
      fetchVideos()
    } catch (error) {
      console.error('영상 추가 오류:', error)
      alert('영상 추가에 실패했습니다.')
    }
  }

  const handleUpdateVideo = async (id) => {
    try {
      // URL을 embed 형태로 변환
      const embedUrl = convertToEmbedUrl(editingVideo.url)
      
      const { error } = await supabaseBiz
        .from('reference_videos')
        .update({ ...editingVideo, url: embedUrl })
        .eq('id', id)

      if (error) throw error

      alert('영상이 수정되었습니다. (embed URL로 자동 변환됨)')
      setEditingVideo(null)
      fetchVideos()
    } catch (error) {
      console.error('영상 수정 오류:', error)
      alert('영상 수정에 실패했습니다.')
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
        .insert([{ ...newFaq, order: faqs.length }])

      if (error) throw error

      alert('FAQ가 추가되었습니다.')
      setNewFaq({ question: '', answer: '', category: 'general', order: 0 })
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 추가 오류:', error)
      alert('FAQ 추가에 실패했습니다.')
    }
  }

  const handleUpdateFaq = async (id) => {
    try {
      const { error } = await supabaseBiz
        .from('faqs')
        .update(editingFaq)
        .eq('id', id)

      if (error) throw error

      alert('FAQ가 수정되었습니다.')
      setEditingFaq(null)
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 수정 오류:', error)
      alert('FAQ 수정에 실패했습니다.')
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

  const handleToggleFaqVisibility = async (id, currentVisibility) => {
    try {
      const { error } = await supabaseBiz
        .from('faqs')
        .update({ is_visible: !currentVisibility })
        .eq('id', id)

      if (error) throw error
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 표시 상태 변경 오류:', error)
    }
  }

  // ===== 사이트 콘텐츠 =====
  const fetchSiteContent = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('site_content')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setSiteContent(data)
    } catch (error) {
      console.error('사이트 콘텐츠 조회 오류:', error)
    }
  }

  const handleSaveSiteContent = async () => {
    try {
      const { data: existing } = await supabaseBiz
        .from('site_content')
        .select('id')
        .single()

      if (existing) {
        const { error } = await supabaseBiz
          .from('site_content')
          .update(siteContent)
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabaseBiz
          .from('site_content')
          .insert([siteContent])

        if (error) throw error
      }

      alert('사이트 콘텐츠가 저장되었습니다.')
    } catch (error) {
      console.error('사이트 콘텐츠 저장 오류:', error)
      alert('사이트 콘텐츠 저장에 실패했습니다.')
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
            <p className="text-gray-600 mt-1">영상 레퍼런스, FAQ, 사이트 콘텐츠를 관리하세요</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto">
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                영상 레퍼런스
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                FAQ 관리
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                사이트 콘텐츠
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
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newVideo.url}
                      onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                    />
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
                    <textarea
                      className="w-full p-3 border rounded-lg"
                      rows="3"
                      placeholder="영상 설명"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
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
                  <CardTitle>영상 목록 ({videos.length}개)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {videos.map((video) => (
                      <div key={video.id} className="border rounded-lg p-4 space-y-3">
                        {editingVideo?.id === video.id ? (
                          <>
                            <Input
                              value={editingVideo.url}
                              onChange={(e) => setEditingVideo({ ...editingVideo, url: e.target.value })}
                              placeholder="URL"
                            />
                            <Input
                              value={editingVideo.title}
                              onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                              placeholder="제목"
                            />
                            <textarea
                              className="w-full p-3 border rounded-lg"
                              rows="3"
                              value={editingVideo.description || ''}
                              onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                              placeholder="설명"
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => handleUpdateVideo(video.id)} size="sm">
                                <Save className="w-4 h-4 mr-2" />
                                저장
                              </Button>
                              <Button onClick={() => setEditingVideo(null)} variant="outline" size="sm">
                                취소
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{video.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                                <a 
                                  href={video.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                                >
                                  {video.url}
                                </a>
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => setEditingVideo(video)} variant="outline" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button onClick={() => handleDeleteVideo(video.id)} variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
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
                    <label className="block text-sm font-medium text-gray-900 mb-2">카테고리</label>
                    <select
                      className="w-full p-3 border rounded-lg"
                      value={newFaq.category}
                      onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                    >
                      <option value="general">일반</option>
                      <option value="payment">결제</option>
                      <option value="campaign">캠페인</option>
                      <option value="creator">크리에이터</option>
                      <option value="technical">기술</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">질문 *</label>
                    <Input
                      type="text"
                      placeholder="자주 묻는 질문"
                      value={newFaq.question}
                      onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">답변 *</label>
                    <textarea
                      className="w-full p-3 border rounded-lg"
                      rows="5"
                      placeholder="답변 내용"
                      value={newFaq.answer}
                      onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddFaq} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    FAQ 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>FAQ 목록 ({faqs.length}개)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="border rounded-lg p-4 space-y-3">
                        {editingFaq?.id === faq.id ? (
                          <>
                            <select
                              className="w-full p-3 border rounded-lg"
                              value={editingFaq.category}
                              onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                            >
                              <option value="general">일반</option>
                              <option value="payment">결제</option>
                              <option value="campaign">캠페인</option>
                              <option value="creator">크리에이터</option>
                              <option value="technical">기술</option>
                            </select>
                            <Input
                              value={editingFaq.question}
                              onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                              placeholder="질문"
                            />
                            <textarea
                              className="w-full p-3 border rounded-lg"
                              rows="5"
                              value={editingFaq.answer}
                              onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                              placeholder="답변"
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => handleUpdateFaq(faq.id)} size="sm">
                                <Save className="w-4 h-4 mr-2" />
                                저장
                              </Button>
                              <Button onClick={() => setEditingFaq(null)} variant="outline" size="sm">
                                취소
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {faq.category}
                                  </span>
                                  {faq.is_visible ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1">
                                      <Eye className="w-3 h-3" />
                                      표시중
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded flex items-center gap-1">
                                      <EyeOff className="w-3 h-3" />
                                      숨김
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-semibold text-lg">{faq.question}</h3>
                                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{faq.answer}</p>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button 
                                  onClick={() => handleToggleFaqVisibility(faq.id, faq.is_visible)} 
                                  variant="outline" 
                                  size="sm"
                                >
                                  {faq.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button onClick={() => setEditingFaq(faq)} variant="outline" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button onClick={() => handleDeleteFaq(faq.id)} variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 사이트 콘텐츠 탭 */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>메인 페이지 콘텐츠</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">히어로 제목</label>
                    <Input
                      type="text"
                      placeholder="메인 제목"
                      value={siteContent.hero_title}
                      onChange={(e) => setSiteContent({ ...siteContent, hero_title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">히어로 부제목</label>
                    <Input
                      type="text"
                      placeholder="부제목"
                      value={siteContent.hero_subtitle}
                      onChange={(e) => setSiteContent({ ...siteContent, hero_subtitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">소개 텍스트</label>
                    <textarea
                      className="w-full p-3 border rounded-lg"
                      rows="5"
                      placeholder="회사 소개"
                      value={siteContent.about_text}
                      onChange={(e) => setSiteContent({ ...siteContent, about_text: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveSiteContent} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    저장
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

