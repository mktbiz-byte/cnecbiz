import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Plus, LogOut, BarChart3, FileText, TrendingUp, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz, getCampaignsFromAllRegions, getCampaignStatsFromAllRegions } from '@/lib/supabaseClients'

const DashboardPage = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [companyData, setCompanyData] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('cnecbiz_user')
    if (!storedUser) {
      alert('로그인이 필요합니다')
      navigate('/login')
      return
    }

    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)

    // Fetch data
    fetchData(parsedUser.id)
  }, [navigate])

  const fetchData = async (userId) => {
    try {
      setLoading(true)

      // Fetch company data
      if (supabaseBiz) {
        const { data: company } = await supabaseBiz
          .from('companies')
          .select('*')
          .eq('id', userId)
          .single()
        
        setCompanyData(company)

        // Fetch campaigns from BIZ database
        const { data: bizCampaigns } = await supabaseBiz
          .from('campaigns')
          .select('*')
          .eq('company_id', userId)
          .order('created_at', { ascending: false })

        setCampaigns(bizCampaigns || [])
      }

      // Fetch stats from all regions
      const statsData = await getCampaignStatsFromAllRegions()
      setStats(statsData)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('cnecbiz_user')
    navigate('/')
  }

  const getRegionFlag = (regionCode) => {
    const flags = {
      japan: '🇯🇵',
      jp: '🇯🇵',
      us: '🇺🇸',
      usa: '🇺🇸',
      taiwan: '🇹🇼',
      tw: '🇹🇼'
    }
    return flags[regionCode] || '🌍'
  }

  const getRegionName = (regionCode) => {
    const names = {
      japan: '일본',
      jp: '일본',
      us: '미국',
      usa: '미국',
      taiwan: '대만',
      tw: '대만'
    }
    return names[regionCode] || regionCode
  }

  const getPackageName = (packageType) => {
    const packages = {
      200000: '기본형',
      300000: '스탠다드',
      400000: '프리미엄',
      600000: '4주 연속'
    }
    return packages[packageType] || '알 수 없음'
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      active: { text: '진행중', color: 'bg-green-100 text-green-800' },
      completed: { text: '완료', color: 'bg-gray-100 text-gray-800' }
    }
    const badge = badges[status] || badges.pending
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">CNEC BIZ</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {companyData?.company_name} ({companyData?.contact_name})
            </span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            안녕하세요, {companyData?.contact_name}님
          </h2>
          <p className="text-gray-600">
            글로벌 인플루언서 마케팅 캠페인을 관리하세요
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                전체 캠페인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold">{campaigns.length}</p>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                진행중
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-600">
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                대기중
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-yellow-600">
                  {campaigns.filter(c => c.status === 'pending').length}
                </p>
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-gray-600">
                  {campaigns.filter(c => c.status === 'completed').length}
                </p>
                <Users className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          <Button size="lg" onClick={() => navigate('/campaign/create')}>
            <Plus className="h-5 w-5 mr-2" />
            새 캠페인 생성
          </Button>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>캠페인 목록</CardTitle>
            <CardDescription>
              생성한 모든 캠페인을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">아직 생성된 캠페인이 없습니다</p>
                <Button onClick={() => navigate('/campaign/create')}>
                  첫 캠페인 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold">{campaign.title}</h3>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {campaign.brand_name} - {campaign.product_name}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <span>패키지:</span>
                              <span className="font-semibold">
                                {getPackageName(campaign.package_type)}
                              </span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span>지역:</span>
                              <span className="flex space-x-1">
                                {campaign.regions?.map((region, idx) => (
                                  <span key={idx} title={getRegionName(region)}>
                                    {getRegionFlag(region)}
                                  </span>
                                ))}
                              </span>
                            </span>
                            <span>
                              생성일: {new Date(campaign.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <p className="text-lg font-bold text-blue-600">
                            {(campaign.package_type * (campaign.regions?.length || 1)).toLocaleString()}원
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/campaign/${campaign.id}`)}
                          >
                            상세보기
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Stats (if available) */}
        {stats && stats.total > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>전체 플랫폼 통계</CardTitle>
              <CardDescription>
                모든 지역의 캠페인 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(stats.byRegion).map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getRegionFlag(region)}</span>
                      <span className="font-semibold">{getRegionName(region)}</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default DashboardPage

