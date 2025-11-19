import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { 
  Star, Loader2, Users, Award, Search, Sparkles, CheckCircle2
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CreatorsManagement() {
  const navigate = useNavigate()
  
  const [registeredCreators, setRegisteredCreators] = useState([])
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedCreators, setSelectedCreators] = useState([])
  const [campaignTypes, setCampaignTypes] = useState({
    can_join_planned: false,
    can_join_4week: false,
    can_join_oliveyoung: false
  })

  useEffect(() => {
    checkAuth()
    loadData()
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

  const loadData = async () => {
    setLoading(true)
    try {
      // 가입한 크리에이터 (승인된 사용자만)
      const { data: creators } = await supabaseBiz
        .from('user_profiles')
        .select('*')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false })

      // 추천 크리에이터
      const { data: featured } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .order('created_at', { ascending: false })

      setRegisteredCreators(creators || [])
      setFeaturedCreators(featured || [])
    } catch (error) {
      console.error('Error loading data:', error)
      alert('데이터 로딩 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatorSelect = (creatorId) => {
    setSelectedCreators(prev => 
      prev.includes(creatorId)
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    )
  }

  const openGenerateModal = () => {
    if (selectedCreators.length === 0) {
      alert('크리에이터를 선택해주세요.')
      return
    }
    setShowGenerateModal(true)
  }

  const generateAIProfiles = async () => {
    setGenerating(true)
    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
      
      for (const creatorId of selectedCreators) {
        const creator = registeredCreators.find(c => c.id === creatorId)
        if (!creator) continue

        // AI 프로필 생성
        const prompt = `
다음 크리에이터의 정보를 분석하여 추천 크리에이터 프로필을 생성해주세요:

이름: ${creator.name || '미상'}
이메일: ${creator.email}
채널명: ${creator.channel_name || '미상'}
팔로워: ${creator.followers || 0}
소개: ${creator.bio || '없음'}

다음 형식으로 JSON만 반환해주세요:
{
  "category": "뷰티|패션|라이프스타일|푸드|테크 중 하나",
  "target_audience": "타겟 청중 설명",
  "content_style": "콘텐츠 스타일 설명",
  "basic_price": 팔로워 기반 기본 가격 (숫자만),
  "standard_price": 기본 가격 * 1.5 (숫자만),
  "premium_price": 기본 가격 * 2 (숫자만),
  "rating": 팔로워와 활동성 기반 평점 (0-100)
}
`

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        )

        if (!response.ok) throw new Error('AI 생성 실패')
        
        const data = await response.json()
        const aiText = data.candidates[0].content.parts[0].text
        const aiData = JSON.parse(aiText.replace(/```json\n?|\n?```/g, ''))

        // featured_creators에 저장
        const { error } = await supabaseBiz
          .from('featured_creators')
          .insert({
            user_profile_id: creator.id,
            platform: creator.primary_platform || 'youtube',
            channel_name: creator.channel_name,
            channel_url: creator.youtube_url || creator.instagram_url || creator.tiktok_url,
            profile_image: creator.profile_image,
            followers: creator.followers,
            category: aiData.category,
            target_audience: aiData.target_audience,
            content_style: aiData.content_style,
            basic_price: aiData.basic_price,
            standard_price: aiData.standard_price,
            premium_price: aiData.premium_price,
            rating: aiData.rating,
            can_join_planned: campaignTypes.can_join_planned,
            can_join_4week: campaignTypes.can_join_4week,
            can_join_oliveyoung: campaignTypes.can_join_oliveyoung,
            regions: ['korea']
          })

        if (error) throw error
      }

      alert(`${selectedCreators.length}명의 AI 프로필이 생성되었습니다!`)
      setShowGenerateModal(false)
      setSelectedCreators([])
      await loadData()
    } catch (error) {
      console.error('Error generating profiles:', error)
      alert('AI 프로필 생성 실패: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteFeatured = async (id) => {
    if (!confirm('이 추천 크리에이터를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('삭제되었습니다.')
      await loadData()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const filteredCreators = registeredCreators.filter(creator =>
    creator.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.channel_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isFeatured = (creatorId) => {
    return featuredCreators.some(fc => fc.user_profile_id === creatorId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">크리에이터 관리</h1>
          <p className="text-gray-600">추천 크리에이터와 CNEC Plus를 관리하세요</p>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">가입 크리에이터</CardTitle>
              <Users className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{registeredCreators.length}명</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">추천 크리에이터</CardTitle>
              <Star className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{featuredCreators.length}명</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">선택됨</CardTitle>
              <Award className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCreators.length}명</div>
            </CardContent>
          </Card>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={openGenerateModal}
            disabled={selectedCreators.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI 프로필 생성 ({selectedCreators.length})
          </Button>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="이름, 이메일, 채널명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* 가입 크리에이터 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>가입 크리에이터 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">선택</th>
                    <th className="p-4 text-left">이름</th>
                    <th className="p-4 text-left">이메일</th>
                    <th className="p-4 text-left">채널명</th>
                    <th className="p-4 text-left">팔로워</th>
                    <th className="p-4 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.map(creator => (
                    <tr key={creator.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedCreators.includes(creator.id)}
                          onCheckedChange={() => handleCreatorSelect(creator.id)}
                          disabled={isFeatured(creator.id)}
                        />
                      </td>
                      <td className="p-4">{creator.name || '-'}</td>
                      <td className="p-4">{creator.email}</td>
                      <td className="p-4">{creator.channel_name || '-'}</td>
                      <td className="p-4">
                        {creator.followers ? Number(creator.followers).toLocaleString() : '-'}
                      </td>
                      <td className="p-4">
                        {isFeatured(creator.id) ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            추천 등록됨
                          </span>
                        ) : (
                          <span className="text-gray-500">미등록</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 추천 크리에이터 목록 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>추천 크리에이터 ({featuredCreators.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCreators.map(fc => (
                <div key={fc.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{fc.channel_name}</h3>
                      <p className="text-sm text-gray-500">{fc.category}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFeatured(fc.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      삭제
                    </Button>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>팔로워: {fc.followers?.toLocaleString()}</div>
                    <div>평점: {fc.rating}/100</div>
                    <div>기본 가격: ₩{fc.basic_price?.toLocaleString()}</div>
                    <div className="flex gap-2 mt-2">
                      {fc.can_join_planned && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">기획형</span>}
                      {fc.can_join_4week && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">4주</span>}
                      {fc.can_join_oliveyoung && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">올영</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI 프로필 생성 모달 */}
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI 프로필 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>{selectedCreators.length}명의 크리에이터에 대한 AI 프로필을 생성합니다.</p>
              
              <div className="space-y-2">
                <label className="font-semibold">캠페인 참여 가능 여부</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={campaignTypes.can_join_planned}
                      onCheckedChange={(checked) => 
                        setCampaignTypes(prev => ({ ...prev, can_join_planned: checked }))
                      }
                    />
                    <label>기획형 캠페인</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={campaignTypes.can_join_4week}
                      onCheckedChange={(checked) => 
                        setCampaignTypes(prev => ({ ...prev, can_join_4week: checked }))
                      }
                    />
                    <label>4주 챌린지</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={campaignTypes.can_join_oliveyoung}
                      onCheckedChange={(checked) => 
                        setCampaignTypes(prev => ({ ...prev, can_join_oliveyoung: checked }))
                      }
                    />
                    <label>올영세일</label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                취소
              </Button>
              <Button onClick={generateAIProfiles} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '생성'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
