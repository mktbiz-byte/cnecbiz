import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, CheckCircle, XCircle, Search, Star, Clock } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function CreatorManagementIntegrated() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('featured')
  
  // 추천 크리에이터
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [searchFeatured, setSearchFeatured] = useState('')
  
  // 승인 대기 크리에이터
  const [pendingCreators, setPendingCreators] = useState([])
  const [searchPending, setSearchPending] = useState('')
  
  // 통계
  const [stats, setStats] = useState({
    totalFeatured: 0,
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0
  })

  useEffect(() => {
    checkAuth()
    fetchData()
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

    if (!adminData) {
      navigate('/admin/login')
    }
  }

  const fetchData = async () => {
    await Promise.all([
      fetchFeaturedCreators(),
      fetchPendingCreators(),
      fetchStats()
    ])
  }

  const fetchFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators_korea')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeaturedCreators(data || [])
    } catch (error) {
      console.error('추천 크리에이터 조회 오류:', error)
    }
  }

  const fetchPendingCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('user_profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingCreators(data || [])
    } catch (error) {
      console.error('승인 대기 크리에이터 조회 오류:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: featured } = await supabaseBiz
        .from('featured_creators_korea')
        .select('id', { count: 'exact', head: true })

      const { data: pending } = await supabaseBiz
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending')

      const { data: approved } = await supabaseBiz
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'approved')

      const { data: rejected } = await supabaseBiz
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'rejected')

      setStats({
        totalFeatured: featured?.length || 0,
        totalPending: pending?.length || 0,
        totalApproved: approved?.length || 0,
        totalRejected: rejected?.length || 0
      })
    } catch (error) {
      console.error('통계 조회 오류:', error)
    }
  }

  const handleApprove = async (creatorId) => {
    if (!confirm('이 크리에이터를 승인하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('creator_profiles')
        .update({ approval_status: 'approved' })
        .eq('id', creatorId)

      if (error) throw error

      alert('승인되었습니다.')
      fetchData()
    } catch (error) {
      console.error('승인 오류:', error)
      alert('승인에 실패했습니다.')
    }
  }

  const handleReject = async (creatorId) => {
    if (!confirm('이 크리에이터를 거절하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('creator_profiles')
        .update({ approval_status: 'rejected' })
        .eq('id', creatorId)

      if (error) throw error

      alert('거절되었습니다.')
      fetchData()
    } catch (error) {
      console.error('거절 오류:', error)
      alert('거절에 실패했습니다.')
    }
  }

  const handleRemoveFeatured = async (creatorId) => {
    if (!confirm('추천 크리에이터에서 제거하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('featured_creators_korea')
        .delete()
        .eq('id', creatorId)

      if (error) throw error

      alert('제거되었습니다.')
      fetchData()
    } catch (error) {
      console.error('제거 오류:', error)
      alert('제거에 실패했습니다.')
    }
  }

  const filteredFeatured = featuredCreators.filter(creator =>
    creator.name?.toLowerCase().includes(searchFeatured.toLowerCase()) ||
    creator.email?.toLowerCase().includes(searchFeatured.toLowerCase())
  )

  const filteredPending = pendingCreators.filter(creator =>
    creator.name?.toLowerCase().includes(searchPending.toLowerCase()) ||
    creator.email?.toLowerCase().includes(searchPending.toLowerCase())
  )

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              크리에이터 관리
            </h1>
            <p className="text-gray-600 mt-1">추천 크리에이터 및 승인 관리</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  추천 크리에이터
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.totalFeatured}명
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  승인 대기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {stats.totalPending}명
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  승인됨
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.totalApproved}명
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  거절됨
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {stats.totalRejected}명
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto">
              <TabsTrigger value="featured">
                <Star className="w-4 h-4 mr-2" />
                추천 크리에이터
              </TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="w-4 h-4 mr-2" />
                승인 대기
              </TabsTrigger>
            </TabsList>

            {/* 추천 크리에이터 탭 */}
            <TabsContent value="featured" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>추천 크리에이터 목록</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="이름, 이메일 검색..."
                        value={searchFeatured}
                        onChange={(e) => setSearchFeatured(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">이름</th>
                          <th className="text-left p-4">이메일</th>
                          <th className="text-left p-4">지역</th>
                          <th className="text-left p-4">등록일</th>
                          <th className="text-center p-4">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFeatured.map((creator) => (
                          <tr key={creator.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">{creator.name}</td>
                            <td className="p-4">{creator.email}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                한국
                              </span>
                            </td>
                            <td className="p-4">
                              {new Date(creator.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveFeatured(creator.id)}
                              >
                                제거
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredFeatured.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        추천 크리에이터가 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 승인 대기 탭 */}
            <TabsContent value="pending" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>승인 대기 목록</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="이름, 이메일 검색..."
                        value={searchPending}
                        onChange={(e) => setSearchPending(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">이름</th>
                          <th className="text-left p-4">이메일</th>
                          <th className="text-left p-4">지역</th>
                          <th className="text-left p-4">신청일</th>
                          <th className="text-center p-4">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPending.map((creator) => (
                          <tr key={creator.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">{creator.name}</td>
                            <td className="p-4">{creator.email}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                {creator.region === 'korea' ? '한국' : creator.region === 'japan' ? '일본' : '미국'}
                              </span>
                            </td>
                            <td className="p-4">
                              {new Date(creator.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(creator.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(creator.id)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  거절
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredPending.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        승인 대기 중인 크리에이터가 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

