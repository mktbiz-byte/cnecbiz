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
  GripVertical,
  HelpCircle,
  Edit,
  CreditCard
} from 'lucide-react'
import { supabaseBiz, getCampaignsFromAllRegions } from '../../lib/supabaseClients'

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
    if (!user) {
      navigate('/login')
      return
    }

    // Check if admin
    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!adminData) {
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

      // 모든 지역의 캠페인 수 계산
      const campaigns = await getCampaignsFromAllRegions()
      const campaignsCount = campaigns.length

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
    // YouTube Shorts 지원 추가
    if (url.includes('/shorts/')) {
      const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
      if (shortsMatch) return shortsMatch[1]
    }
    
    // 일반 YouTube URL
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
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-6 flex-1 overflow-y-auto">
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
              추천 크리에이터 관리
            </button>
            <button 
              onClick={() => navigate('/admin/regional-creators')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Users className="w-5 h-5" />
              각 나라별 크리에이터
            </button>
            <button 
              onClick={() => navigate('/admin/creator-approvals')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Shield className="w-5 h-5" />
              크리에이터 승인
            </button>
            <button 
              onClick={() => navigate('/admin/site-editor')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Edit className="w-5 h-5" />
              사이트 편집
            </button>
            <button 
              onClick={() => navigate('/admin/videos')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Video className="w-5 h-5" />
              영상 레퍼런스
            </button>
            <button 
              onClick={() => navigate('/admin/manage-faqs')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <HelpCircle className="w-5 h-5" />
              FAQ 관리
            </button>
            <button 
              onClick={() => navigate('/admin/revenue')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <TrendingUp className="w-5 h-5" />
              매출 관리
            </button>
            <button 
              onClick={() => navigate('/admin/payment')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <CreditCard className="w-5 h-5" />
              포인트 & 미수금 관리
            </button>
            <button 
              onClick={() => navigate('/admin/manage-admins')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Shield className="w-5 h-5" />
              관리자 권한 관리
            </button>
            <button 
              onClick={() => navigate('/company/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 border-t mt-4 pt-4"
            >
              <Building2 className="w-5 h-5" />
              기업 뷰로 보기
            </button>
          </nav>
        </div>

        <div className="p-6 border-t mt-auto">
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

          {/* Revenue Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                매출 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className="text-sm text-blue-700 font-medium mb-2">이번 달 매출</div>
                  <div className="text-3xl font-bold text-blue-900">0원</div>
                  <div className="text-xs text-blue-600 mt-2">전월 대비 -</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="text-sm text-green-700 font-medium mb-2">총 매출</div>
                  <div className="text-3xl font-bold text-green-900">0원</div>
                  <div className="text-xs text-green-600 mt-2">누적 매출</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <div className="text-sm text-purple-700 font-medium mb-2">포인트 충전</div>
                  <div className="text-3xl font-bold text-purple-900">0원</div>
                  <div className="text-xs text-purple-600 mt-2">이번 달 충전액</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button onClick={() => navigate('/admin/revenue')} variant="outline">
                  자세한 매출 보고서 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

