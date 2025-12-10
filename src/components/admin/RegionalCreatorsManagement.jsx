import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, Search, Instagram, Youtube, Video, 
  Eye, Mail, Phone, TrendingUp
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { getCreatorsFromAllRegions, getCreatorStats } from '../../lib/creatorsHelper'
import AdminNavigation from './AdminNavigation'

export default function RegionalCreatorsManagement() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    byRegion: {},
    byPlatform: { instagram: 0, youtube: 0, tiktok: 0 }
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [loading, setLoading] = useState(false)

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

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [creatorsData, statsData] = await Promise.all([
        getCreatorsFromAllRegions(),
        getCreatorStats()
      ])
      setCreators(creatorsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = 
      creator.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creator.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRegion = selectedRegion === 'all' || creator.region === selectedRegion

    return matchesSearch && matchesRegion
  })

  const getRegionBadge = (region) => {
    const badges = {
      korea: { label: '🇰🇷 한국', color: 'bg-blue-100 text-blue-700' },
      japan: { label: '🇯🇵 일본', color: 'bg-red-100 text-red-700' },
      us: { label: '🇺🇸 미국', color: 'bg-purple-100 text-purple-700' },
      usa: { label: '🇺🇸 미국', color: 'bg-purple-100 text-purple-700' },
      taiwan: { label: '🇹🇼 대만', color: 'bg-green-100 text-green-700' }
    }
    const badge = badges[region] || { label: region, color: 'bg-gray-100 text-gray-700' }
    return (
      <Badge className={badge.color}>
        {badge.label}
      </Badge>
    )
  }

  const getTotalFollowers = (creator) => {
    return (creator.instagram_followers || 0) + 
           (creator.youtube_subscribers || 0) + 
           (creator.tiktok_followers || 0)
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">각 나라별 크리에이터 관리</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">전체 크리에이터</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">🇰🇷 한국</div>
              <div className="text-3xl font-bold text-blue-600">{stats.byRegion.korea || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">🇯🇵 일본</div>
              <div className="text-3xl font-bold text-red-600">{stats.byRegion.japan || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">🇺🇸 미국</div>
              <div className="text-3xl font-bold text-purple-600">{stats.byRegion.us || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">🇹🇼 대만</div>
              <div className="text-3xl font-bold text-green-600">{stats.byRegion.taiwan || 0}</div>
            </CardContent>
          </Card>
        </div>
        {/* Region Tabs */}
        <Tabs value={selectedRegion} onValueChange={setSelectedRegion} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="korea">한국 🇰🇷</TabsTrigger>
            <TabsTrigger value="japan">일본 🇯🇵</TabsTrigger>
            <TabsTrigger value="us">미국 🇺🇸</TabsTrigger>
            <TabsTrigger value="taiwan">대만 🇹🇼</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="이름, 이메일 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>   </div>
          </CardContent>
        </Card>

        {/* Creators List */}
        <Card>
          <CardHeader>
            <CardTitle>크리에이터 목록 ({filteredCreators.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                {filteredCreators.map((creator) => (
                  <div
                    key={`${creator.region}-${creator.id}`}
                    className="p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{creator.name || '이름 없음'}</h3>
                          {getRegionBadge(creator.region)}
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          {creator.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              {creator.email}
                            </div>
                          )}
                          {creator.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {creator.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">총 팔로워</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {getTotalFollowers(creator).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* SNS Links */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      {creator.instagram_url && (
                        <a
                          href={creator.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {creator.instagram_followers?.toLocaleString() || 0} 팔로워
                          </span>
                        </a>
                      )}
                      {creator.youtube_url && (
                        <a
                          href={creator.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Youtube className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {creator.youtube_subscribers?.toLocaleString() || 0} 구독자
                          </span>
                        </a>
                      )}
                      {creator.tiktok_url && (
                        <a
                          href={creator.tiktok_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {creator.tiktok_followers?.toLocaleString() || 0} 팔로워
                          </span>
                        </a>
                      )}
                    </div>

                    {/* Additional Info */}
                    {creator.bio && (
                      <p className="text-sm text-gray-600 mb-3">{creator.bio}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div>
                        가입일: {new Date(creator.created_at).toLocaleDateString('ko-KR')}
                      </div>
                      {creator.region && (
                        <div>
                          플랫폼: {creator.platform_region || creator.country_code}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredCreators.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm || selectedRegion !== 'all'
                      ? '검색 결과가 없습니다'
                      : '등록된 크리에이터가 없습니다'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  )
}

