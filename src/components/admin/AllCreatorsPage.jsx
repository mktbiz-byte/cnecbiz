import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Search, Globe, TrendingUp } from 'lucide-react'
import { supabaseBiz, supabaseJapan, supabaseUS } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AllCreatorsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [creators, setCreators] = useState({
    korea: [],
    japan: [],
    us: [],
    taiwan: []
  })

  const [stats, setStats] = useState({
    korea: 0,
    japan: 0,
    us: 0,
    taiwan: 0,
    total: 0
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchAllCreators()
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

  const fetchAllCreators = async () => {
    setLoading(true)
    try {
      // 한국 크리에이터
      const { data: koreaData } = await supabaseBiz
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      // 일본 크리에이터
      const { data: japanData } = await supabaseJapan
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      // 미국 크리에이터
      const { data: usData } = await supabaseUS
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      // 대만 크리에이터 (한국 DB에서 region 필터)
      const { data: taiwanData } = await supabaseBiz
        .from('user_profiles')
        .select('*')
        .eq('region', 'taiwan')
        .order('created_at', { ascending: false })

      setCreators({
        korea: koreaData || [],
        japan: japanData || [],
        us: usData || [],
        taiwan: taiwanData || []
      })

      setStats({
        korea: koreaData?.length || 0,
        japan: japanData?.length || 0,
        us: usData?.length || 0,
        taiwan: taiwanData?.length || 0,
        total: (koreaData?.length || 0) + (japanData?.length || 0) + (usData?.length || 0) + (taiwanData?.length || 0)
      })
    } catch (error) {
      console.error('크리에이터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인됨', color: 'bg-green-100 text-green-800' },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-800' }
    }
    const { label, color } = statusMap[status] || statusMap.pending
    return <span className={`px-2 py-1 rounded text-xs ${color}`}>{label}</span>
  }

  const getAllCreators = () => {
    return [
      ...creators.korea.map(c => ({ ...c, region: '한국' })),
      ...creators.japan.map(c => ({ ...c, region: '일본' })),
      ...creators.us.map(c => ({ ...c, region: '미국' })),
      ...creators.taiwan.map(c => ({ ...c, region: '대만' }))
    ]
  }

  const filterCreators = (creatorList) => {
    if (!searchTerm) return creatorList
    return creatorList.filter(creator =>
      creator.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creator.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creator.channel_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const CreatorTable = ({ creators, region }) => {
    const filtered = filterCreators(creators)

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">이름</th>
              <th className="text-left p-4">이메일</th>
              <th className="text-left p-4">채널명</th>
              <th className="text-left p-4">구독자</th>
              <th className="text-left p-4">상태</th>
              {region === 'all' && <th className="text-left p-4">지역</th>}
              <th className="text-left p-4">가입일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((creator, index) => (
              <tr key={`${creator.id}-${index}`} className="border-b hover:bg-gray-50">
                <td className="p-4">{creator.name || '-'}</td>
                <td className="p-4">{creator.email || '-'}</td>
                <td className="p-4">{creator.channel_name || '-'}</td>
                <td className="p-4">
                  {creator.followers ? Number(creator.followers).toLocaleString() : '-'}
                </td>
                <td className="p-4">{getStatusBadge(creator.approval_status)}</td>
                {region === 'all' && (
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {creator.region}
                    </span>
                  </td>
                )}
                <td className="p-4">
                  {creator.created_at ? new Date(creator.created_at).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '크리에이터가 없습니다.'}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">크리에이터 정보를 불러오는 중...</p>
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
              전체 크리에이터 현황
            </h1>
            <p className="text-gray-600 mt-1">국가별 크리에이터 가입 현황</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  전체
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.total}명
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  🇰🇷 한국
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.korea}명
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  🇯🇵 일본
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {stats.japan}명
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  🇺🇸 미국
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {stats.us}명
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  🇹🇼 대만
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {stats.taiwan}명
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 검색 */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="이름, 이메일, 채널명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </CardContent>
          </Card>

          {/* 탭 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                <Globe className="w-4 h-4 mr-2" />
                전체
              </TabsTrigger>
              <TabsTrigger value="korea">🇰🇷 한국</TabsTrigger>
              <TabsTrigger value="japan">🇯🇵 일본</TabsTrigger>
              <TabsTrigger value="us">🇺🇸 미국</TabsTrigger>
              <TabsTrigger value="taiwan">🇹🇼 대만</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>전체 크리에이터 ({stats.total}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorTable creators={getAllCreators()} region="all" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="korea">
              <Card>
                <CardHeader>
                  <CardTitle>한국 크리에이터 ({stats.korea}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorTable creators={creators.korea.map(c => ({ ...c, region: '한국' }))} region="korea" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="japan">
              <Card>
                <CardHeader>
                  <CardTitle>일본 크리에이터 ({stats.japan}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorTable creators={creators.japan.map(c => ({ ...c, region: '일본' }))} region="japan" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="us">
              <Card>
                <CardHeader>
                  <CardTitle>미국 크리에이터 ({stats.us}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorTable creators={creators.us.map(c => ({ ...c, region: '미국' }))} region="us" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="taiwan">
              <Card>
                <CardHeader>
                  <CardTitle>대만 크리에이터 ({stats.taiwan}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorTable creators={creators.taiwan.map(c => ({ ...c, region: '대만' }))} region="taiwan" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

