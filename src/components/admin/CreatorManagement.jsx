import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Youtube, TrendingUp, Plus } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import OurChannels from './OurChannels'
import AffiliatedCreators from './AffiliatedCreators'

export default function CreatorManagement() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('our-channels')
  const [stats, setStats] = useState({
    ourChannels: 0,
    affiliatedCreators: 0,
    totalSubscribers: 0,
    totalVideos: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchStats()
  }, [])

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

    if (!adminData || adminData.role !== 'super_admin') {
      alert('슈퍼 관리자만 접근할 수 있습니다.')
      navigate('/admin/dashboard')
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      // 우리 채널 통계
      const { data: ourChannelsData, count: ourChannelsCount } = await supabaseBiz
        .from('our_channels')
        .select('*', { count: 'exact' })
        .eq('is_active', true)

      // 소속 크리에이터 통계
      const { data: affiliatedData, count: affiliatedCount } = await supabaseBiz
        .from('affiliated_creators')
        .select('*', { count: 'exact' })
        .eq('is_active', true)

      // 최신 통계 데이터
      const { data: statsData } = await supabaseBiz
        .from('channel_statistics')
        .select('subscriber_count, video_count')
        .order('recorded_at', { ascending: false })
        .limit(10)

      const totalSubscribers = statsData?.reduce((sum, stat) => sum + (stat.subscriber_count || 0), 0) || 0
      const totalVideos = statsData?.reduce((sum, stat) => sum + (stat.video_count || 0), 0) || 0

      setStats({
        ourChannels: ourChannelsCount || 0,
        affiliatedCreators: affiliatedCount || 0,
        totalSubscribers,
        totalVideos
      })
    } catch (error) {
      console.error('통계 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              크리에이터 관리
            </h1>
            <p className="text-gray-600 mt-1">YouTube 채널 분석 및 관리</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Youtube className="w-4 h-4 mr-2 text-red-600" />
                  지원 프로그램
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.ourChannels}개
                </div>
                <p className="text-xs text-gray-500 mt-1">최대 10개</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-purple-600" />
                  소속 크리에이터
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {stats.affiliatedCreators}명
                </div>
                <p className="text-xs text-gray-500 mt-1">파트너 채널</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                  총 구독자
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.totalSubscribers.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">전체 채널 합계</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Youtube className="w-4 h-4 mr-2 text-orange-600" />
                  총 영상
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {stats.totalVideos.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">전체 채널 합계</p>
              </CardContent>
            </Card>
          </div>

          {/* 탭 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="our-channels">
                <Youtube className="w-4 h-4 mr-2" />
                지원 프로그램
              </TabsTrigger>
              <TabsTrigger value="affiliated-creators">
                <Users className="w-4 h-4 mr-2" />
                소속 크리에이터
              </TabsTrigger>
            </TabsList>

            <TabsContent value="our-channels">
              <OurChannels onUpdate={fetchStats} />
            </TabsContent>

            <TabsContent value="affiliated-creators">
              <AffiliatedCreators onUpdate={fetchStats} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

