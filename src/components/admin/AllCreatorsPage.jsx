import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Users, Search, Globe, TrendingUp, Star, MessageSquare, X } from 'lucide-react'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AllCreatorsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [reviewData, setReviewData] = useState({ rating: 0, review: '' })
  
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
  const [saving, setSaving] = useState(false)

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
      const { data: koreaData } = await supabaseKorea
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
      ...creators.korea.map(c => ({ ...c, region: '한국', dbRegion: 'korea' })),
      ...creators.japan.map(c => ({ ...c, region: '일본', dbRegion: 'japan' })),
      ...creators.us.map(c => ({ ...c, region: '미국', dbRegion: 'us' })),
      ...creators.taiwan.map(c => ({ ...c, region: '대만', dbRegion: 'taiwan' }))
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

  const handleRatingChange = async (creatorId, newRating, region) => {
    try {
      // 지역에 따라 올바른 Supabase 클라이언트 사용
      let supabaseClient
      if (region === 'korea') {
        supabaseClient = supabaseKorea
      } else if (region === 'japan') {
        supabaseClient = supabaseJapan
      } else if (region === 'us') {
        supabaseClient = supabaseUS
      } else {
        supabaseClient = supabaseBiz
      }

      const { error } = await supabaseClient
        .from('user_profiles')
        .update({ 
          rating: newRating,
          review_updated_at: new Date().toISOString()
        })
        .eq('id', creatorId)

      if (error) throw error
      
      // 데이터 새로고침
      await fetchAllCreators()
      alert('별점이 업데이트되었습니다.')
    } catch (error) {
      console.error('별점 업데이트 오류:', error)
      alert('별점 업데이트에 실패했습니다: ' + error.message)
    }
  }

  const openReviewModal = (creator, region) => {
    setSelectedCreator({ ...creator, dbRegion: region })
    setReviewData({
      rating: creator.rating || 0,
      review: creator.company_review || ''
    })
    setShowReviewModal(true)
  }

  const handleSaveReview = async () => {
    if (!selectedCreator) return

    setSaving(true)
    try {
      let supabaseClient
      if (selectedCreator.dbRegion === 'korea') {
        supabaseClient = supabaseKorea
      } else if (selectedCreator.dbRegion === 'japan') {
        supabaseClient = supabaseJapan
      } else if (selectedCreator.dbRegion === 'us') {
        supabaseClient = supabaseUS
      } else {
        supabaseClient = supabaseBiz
      }

      const { error } = await supabaseClient
        .from('user_profiles')
        .update({
          rating: reviewData.rating,
          company_review: reviewData.review,
          review_updated_at: new Date().toISOString()
        })
        .eq('id', selectedCreator.id)

      if (error) throw error

      alert('별점 및 후기가 저장되었습니다.')
      setShowReviewModal(false)
      await fetchAllCreators()
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
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
              {region === 'korea' && <th className="text-left p-4">별점</th>}
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
                {region === 'korea' && (
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={creator.rating || 0}
                        onChange={(e) => handleRatingChange(creator.id, parseFloat(e.target.value), region)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="0">0.0</option>
                        <option value="1.0">1.0</option>
                        <option value="1.5">1.5</option>
                        <option value="2.0">2.0</option>
                        <option value="2.5">2.5</option>
                        <option value="3.0">3.0</option>
                        <option value="3.5">3.5</option>
                        <option value="4.0">4.0</option>
                        <option value="4.5">4.5</option>
                        <option value="5.0">5.0</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewModal(creator, region)}
                        className="h-8 px-2"
                        title="후기 작성"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                )}
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
            <p className="text-gray-600 mt-1">국가별 크리에이터 가입 현황 (별점 및 후기는 기업 전용 내부 평가)</p>
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
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="이름, 이메일, 채널명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* 탭 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="all">전체 ({stats.total})</TabsTrigger>
              <TabsTrigger value="korea">한국 ({stats.korea})</TabsTrigger>
              <TabsTrigger value="japan">일본 ({stats.japan})</TabsTrigger>
              <TabsTrigger value="us">미국 ({stats.us})</TabsTrigger>
              <TabsTrigger value="taiwan">대만 ({stats.taiwan})</TabsTrigger>
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

      {/* 후기 작성 모달 */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              크리에이터 평가 및 후기
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-semibold">이름:</span> {selectedCreator.name || '-'}</div>
                  <div><span className="font-semibold">이메일:</span> {selectedCreator.email || '-'}</div>
                  <div><span className="font-semibold">채널명:</span> {selectedCreator.channel_name || '-'}</div>
                  <div><span className="font-semibold">구독자:</span> {selectedCreator.followers?.toLocaleString() || '-'}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">별점</label>
                <select
                  value={reviewData.rating}
                  onChange={(e) => setReviewData({ ...reviewData, rating: parseFloat(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="0">0.0 - 평가 안 함</option>
                  <option value="1.0">1.0 - 매우 불만족</option>
                  <option value="1.5">1.5</option>
                  <option value="2.0">2.0 - 불만족</option>
                  <option value="2.5">2.5</option>
                  <option value="3.0">3.0 - 보통</option>
                  <option value="3.5">3.5</option>
                  <option value="4.0">4.0 - 만족</option>
                  <option value="4.5">4.5</option>
                  <option value="5.0">5.0 - 매우 만족</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  후기 (기업 내부용, 크리에이터에게 보이지 않음)
                </label>
                <Textarea
                  value={reviewData.review}
                  onChange={(e) => setReviewData({ ...reviewData, review: e.target.value })}
                  placeholder="크리에이터와의 협업 경험, 콘텐츠 품질, 소통 태도 등을 자유롭게 작성해주세요..."
                  className="min-h-[200px] bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ 이 평가와 후기는 기업 내부 관리용이며, 크리에이터에게는 절대 공개되지 않습니다.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewModal(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveReview}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
