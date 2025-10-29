import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, TrendingUp, DollarSign, Package, 
  Shield, Building2, Video, Menu, X, LogOut 
} from 'lucide-react'
import { supabaseBiz, getCampaignsFromAllRegions } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    companies: 0,
    campaigns: 0,
    creators: 0,
    revenue: 0
  })
  const [videos, setVideos] = useState([])
  const [newVideo, setNewVideo] = useState({ url: '', title: '', description: '' })

  useEffect(() => {
    checkAuth()
    fetchStats()
    fetchVideos()
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

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      console.error('Not an admin user:', user.email)
      navigate('/login')
      return
    }

    console.log('Admin authenticated:', adminData)

    setUser(user)
  }

  const fetchStats = async () => {
    if (!supabaseBiz) return

    try {
      const [companiesRes, creatorsRes, paymentsRes] = await Promise.all([
        supabaseBiz.from('companies').select('id', { count: 'exact', head: true }),
        supabaseBiz.from('featured_creators').select('id', { count: 'exact', head: true }),
        supabaseBiz.from('payments').select('amount').eq('status', 'completed')
      ])

      const campaigns = await getCampaignsFromAllRegions()

      setStats({
        companies: companiesRes.count || 0,
        campaigns: campaigns?.length || 0,
        creators: creatorsRes.count || 0,
        revenue: paymentsRes.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      })
    } catch (error) {
      console.error('통계 조회 오류:', error)
    }
  }

  const fetchVideos = async () => {
    if (!supabaseBiz) return

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

  const handleAddVideo = async () => {
    if (!newVideo.url || !newVideo.title) {
      alert('URL과 제목을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('reference_videos')
        .insert([{
          url: newVideo.url,
          title: newVideo.title,
          description: newVideo.description
        }])

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
    if (!confirm('이 영상을 삭제하시겠습니까?')) return

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

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 p-6 lg:ml-64">
        <h1 className="text-3xl font-bold mb-6">슈퍼 관리자 대시보드</h1>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/companies')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 기업</CardTitle>
              <Building2 className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.companies}</div>
              <p className="text-xs text-gray-500 mt-1">클릭하여 관리</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/campaigns')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 캠페인</CardTitle>
              <Package className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.campaigns}</div>
              <p className="text-xs text-gray-500 mt-1">클릭하여 관리</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/featured-creators')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">크리에이터</CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creators}</div>
              <p className="text-xs text-gray-500 mt-1">클릭하여 관리</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 매출</CardTitle>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩{stats.revenue.toLocaleString()}</div>
              <Button onClick={() => navigate('/admin/revenue')} variant="outline" className="mt-4 w-full">
                자세한 매출 보고서 보기
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 영상 레퍼런스 관리 */}
        <Card>
          <CardHeader>
            <CardTitle>영상 레퍼런스 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="YouTube URL"
                  value={newVideo.url}
                  onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                  className="px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="제목"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  className="px-4 py-2 border rounded-lg"
                />
                <Button onClick={handleAddVideo}>추가</Button>
              </div>

              <div className="space-y-2">
                {videos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{video.title}</p>
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        {video.url}
                      </a>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteVideo(video.id)}>
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
