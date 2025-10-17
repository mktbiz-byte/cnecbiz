import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Shield, 
  Building2, 
  TrendingUp, 
  Users, 
  Video,
  LogOut,
  Menu,
  X,
  Plus,
  Trash2,
  GripVertical
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    companies: 0,
    campaigns: 0,
    creators: 0,
    videos: 0
  })
  const [videos, setVideos] = useState([])
  const [newVideo, setNewVideo] = useState({ url: '', title: '', description: '' })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user || user.email !== 'admin@cnecbiz.com') {
      navigate('/login')
      return
    }
    setUser(user)
  }

  const fetchData = async () => {
    if (!supabaseBiz) return

    try {
      // 통계
      const { count: companiesCount } = await supabaseBiz
        .from('companies')
        .select('*', { count: 'exact', head: true })

      const { count: campaignsCount } = await supabaseBiz
        .from('campaigns')
        .select('*', { count: 'exact', head: true })

      const { count: creatorsCount } = await supabaseBiz
        .from('featured_creators')
        .select('*', { count: 'exact', head: true })

      const { data: videosData, count: videosCount } = await supabaseBiz
        .from('reference_videos')
        .select('*', { count: 'exact' })
        .order('display_order', { ascending: true })

      setStats({
        companies: companiesCount || 0,
        campaigns: campaignsCount || 0,
        creators: creatorsCount || 0,
        videos: videosCount || 0
      })

      setVideos(videosData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleAddVideo = async () => {
    if (!newVideo.url) {
      alert('영상 URL을 입력해주세요')
      return
    }

    if (!supabaseBiz) return

    try {
      // YouTube URL에서 ID 추출
      let platform = 'other'
      let thumbnailUrl = ''
      
      if (newVideo.url.includes('youtube.com') || newVideo.url.includes('youtu.be')) {
        platform = 'youtube'
        const videoId = extractYouTubeId(newVideo.url)
        if (videoId) {
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        }
      } else if (newVideo.url.includes('vimeo.com')) {
        platform = 'vimeo'
      }

      const { error } = await supabaseBiz
        .from('reference_videos')
        .insert([
          {
            url: newVideo.url,
            title: newVideo.title || '제목 없음',
            description: newVideo.description,
            platform,
            thumbnail_url: thumbnailUrl,
            display_order: videos.length,
            is_active: true
          }
        ])

      if (error) throw error

      setNewVideo({ url: '', title: '', description: '' })
      fetchData()
    } catch (error) {
      console.error('Error adding video:', error)
      alert('영상 추가에 실패했습니다')
    }
  }

  const handleDeleteVideo = async (id) => {
    if (!confirm('이 영상을 삭제하시겠습니까?')) return

    if (!supabaseBiz) return

    try {
      const { error } = await supabaseBiz
        .from('reference_videos')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('영상 삭제에 실패했습니다')
    }
  }

  const toggleVideoActive = async (id, currentStatus) => {
    if (!supabaseBiz) return

    try {
      const { error } = await supabaseBiz
        .from('reference_videos')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error toggling video:', error)
    }
  }

  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const handleLogout = async () => {
    if (supabaseBiz) {
      await supabaseBiz.auth.signOut()
    }
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Admin
            </span>
          </div>

          <nav className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 text-red-600 font-medium">
              <Shield className="w-5 h-5" />
              대시보드
            </button>
            <button 
              onClick={() => navigate('/admin/companies')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Building2 className="w-5 h-5" />
              기업 관리
            </button>
            <button 
              onClick={() => navigate('/admin/campaigns')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <TrendingUp className="w-5 h-5" />
              캠페인 관리
            </button>
            <button 
              onClick={() => navigate('/admin/featured-creators')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Users className="w-5 h-5" />
              추천 크리에이터
            </button>
            <button 
              onClick={() => window.scrollTo({ top: document.getElementById('videos')?.offsetTop, behavior: 'smooth' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Video className="w-5 h-5" />
              영상 관리
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t">
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-900">슈퍼 관리자</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-2xl font-bold">슈퍼 관리자 대시보드</h1>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 기업</p>
                    <p className="text-3xl font-bold mt-2">{stats.companies}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 캠페인</p>
                    <p className="text-3xl font-bold mt-2">{stats.campaigns}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">추천 크리에이터</p>
                    <p className="text-3xl font-bold mt-2">{stats.creators}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">레퍼런스 영상</p>
                    <p className="text-3xl font-bold mt-2">{stats.videos}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Video Management */}
          <Card id="videos">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-6 h-6" />
                영상 레퍼런스 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Video Form */}
              <div className="border rounded-lg p-6 bg-gray-50">
                <h3 className="font-medium mb-4">새 영상 추가</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">영상 URL *</label>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newVideo.url}
                      onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">제목</label>
                    <Input
                      placeholder="영상 제목"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">설명</label>
                    <Input
                      placeholder="영상 설명"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleAddVideo} className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  영상 추가
                </Button>
              </div>

              {/* Video List */}
              <div className="space-y-4">
                {videos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    아직 등록된 영상이 없습니다
                  </div>
                ) : (
                  videos.map((video) => (
                    <div key={video.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                      
                      {video.thumbnail_url && (
                        <img src={video.thumbnail_url} alt={video.title} className="w-32 h-20 object-cover rounded" />
                      )}
                      
                      <div className="flex-1">
                        <h4 className="font-medium">{video.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{video.url}</p>
                        {video.description && (
                          <p className="text-sm text-gray-500 mt-1">{video.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={video.is_active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleVideoActive(video.id, video.is_active)}
                        >
                          {video.is_active ? '활성화' : '비활성화'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

