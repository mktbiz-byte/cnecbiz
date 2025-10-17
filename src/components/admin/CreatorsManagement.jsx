import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Plus, Trash2, ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CreatorsManagement() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [newCreator, setNewCreator] = useState({
    name: '',
    region: 'korea',
    platform: 'youtube',
    profile_url: '',
    instagram_url: '',
    tiktok_url: '',
    // Auto-generated fields
    followers: 0,
    engagement_rate: 0,
    specialty: '',
    profile_image_url: '',
    bio: ''
  })

  useEffect(() => {
    checkAuth()
    fetchCreators()
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
      .from('admins')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!adminData) {
      navigate('/company/dashboard')
    }
  }

  const fetchCreators = async () => {
    if (!supabaseBiz) return

    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCreators(data)
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
    }
  }

  const generateProfile = async () => {
    if (!newCreator.name || !newCreator.profile_url) {
      alert('이름과 프로필 URL을 입력해주세요')
      return
    }

    setIsGenerating(true)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다')
      }

      const prompt = `
다음 크리에이터의 프로필을 분석하여 JSON 형식으로 정보를 제공해주세요:

이름: ${newCreator.name}
지역: ${newCreator.region}
플랫폼: ${newCreator.platform}
프로필 URL: ${newCreator.profile_url}

다음 정보를 추정하여 JSON으로 반환해주세요:
{
  "followers": 팔로워 수 (숫자만),
  "engagement_rate": 참여율 (0-100 사이 소수),
  "specialty": "전문 분야 (예: 뷰티, 패션, 라이프스타일)",
  "bio": "크리에이터 소개 (2-3문장)"
}

프로필 URL을 직접 분석할 수 없다면, 플랫폼과 지역을 고려하여 합리적인 추정값을 제공해주세요.
JSON만 반환하고 다른 텍스트는 포함하지 마세요.
`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        }
      )

      if (!response.ok) {
        throw new Error('Gemini API 호출 실패')
      }

      const data = await response.json()
      const text = data.candidates[0].content.parts[0].text
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSON 파싱 실패')
      }

      const profileData = JSON.parse(jsonMatch[0])

      setNewCreator({
        ...newCreator,
        followers: profileData.followers || 0,
        engagement_rate: profileData.engagement_rate || 0,
        specialty: profileData.specialty || '',
        bio: profileData.bio || ''
      })

      alert('프로필이 자동 생성되었습니다! 확인 후 추가 버튼을 눌러주세요.')
      setShowAdvanced(true)

    } catch (error) {
      console.error('Error generating profile:', error)
      alert('프로필 생성 실패: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAdd = async () => {
    if (!newCreator.name || !newCreator.profile_url) {
      alert('이름과 프로필 URL을 입력해주세요')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .insert(newCreator)

      if (error) throw error

      alert('크리에이터가 추가되었습니다')
      setNewCreator({
        name: '',
        region: 'korea',
        platform: 'youtube',
        profile_url: '',
        instagram_url: '',
        tiktok_url: '',
        followers: 0,
        engagement_rate: 0,
        specialty: '',
        profile_image_url: '',
        bio: ''
      })
      setShowAddForm(false)
      setShowAdvanced(false)
      fetchCreators()
    } catch (error) {
      console.error('Error adding creator:', error)
      alert('추가 실패: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('삭제되었습니다')
      fetchCreators()
    } catch (error) {
      console.error('Error deleting creator:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold">추천 크리에이터 관리</h1>
            </div>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-5 h-5 mr-2" />
            {showAddForm ? '취소' : '새 크리에이터 추가'}
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새 크리에이터 추가</CardTitle>
              <p className="text-sm text-gray-600">
                기본 정보만 입력하면 AI가 자동으로 프로필을 생성합니다
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 필수 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">이름 *</label>
                  <Input
                    value={newCreator.name}
                    onChange={(e) => setNewCreator({ ...newCreator, name: e.target.value })}
                    placeholder="황자우"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">지역</label>
                  <select
                    value={newCreator.region}
                    onChange={(e) => setNewCreator({ ...newCreator, region: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="korea">한국</option>
                    <option value="japan">일본</option>
                    <option value="us">미국</option>
                    <option value="taiwan">대만</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">플랫폼</label>
                  <select
                    value={newCreator.platform}
                    onChange={(e) => setNewCreator({ ...newCreator, platform: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">프로필 URL *</label>
                  <Input
                    value={newCreator.profile_url}
                    onChange={(e) => setNewCreator({ ...newCreator, profile_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* AI 생성 버튼 */}
              <Button 
                onClick={generateProfile} 
                disabled={isGenerating || !newCreator.name || !newCreator.profile_url}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI 프로필 생성 중...
                  </>
                ) : (
                  <>
                    ✨ AI로 프로필 자동 생성
                  </>
                )}
              </Button>

              {/* 추가 SNS */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">추가 SNS (선택사항)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Instagram URL</label>
                    <Input
                      value={newCreator.instagram_url}
                      onChange={(e) => setNewCreator({ ...newCreator, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">TikTok URL</label>
                    <Input
                      value={newCreator.tiktok_url}
                      onChange={(e) => setNewCreator({ ...newCreator, tiktok_url: e.target.value })}
                      placeholder="https://tiktok.com/@..."
                    />
                  </div>
                </div>
              </div>

              {/* 고급 정보 (접기/펼치기) */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  고급 정보 (AI 자동 생성됨)
                </button>
                
                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">팔로워 수</label>
                      <Input
                        type="number"
                        value={newCreator.followers}
                        onChange={(e) => setNewCreator({ ...newCreator, followers: parseInt(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">참여율 (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newCreator.engagement_rate}
                        onChange={(e) => setNewCreator({ ...newCreator, engagement_rate: parseFloat(e.target.value) })}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">전문 분야</label>
                      <Input
                        value={newCreator.specialty}
                        onChange={(e) => setNewCreator({ ...newCreator, specialty: e.target.value })}
                        placeholder="예: 뷰티, 패션, 라이프스타일"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">프로필 이미지 URL</label>
                      <Input
                        value={newCreator.profile_image_url}
                        onChange={(e) => setNewCreator({ ...newCreator, profile_image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">소개</label>
                      <textarea
                        value={newCreator.bio}
                        onChange={(e) => setNewCreator({ ...newCreator, bio: e.target.value })}
                        placeholder="크리에이터 소개..."
                        className="w-full px-4 py-2 border rounded-lg"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleAdd} className="w-full">추가</Button>
            </CardContent>
          </Card>
        )}

        {/* Creators List */}
        <Card>
          <CardHeader>
            <CardTitle>크리에이터 목록 ({creators.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {creators.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                등록된 크리에이터가 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {creators.map((creator) => (
                  <div key={creator.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {creator.profile_image_url && (
                        <img
                          src={creator.profile_image_url}
                          alt={creator.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{creator.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>🌍 {creator.region}</span>
                          <span>📱 {creator.platform}</span>
                          <span>👥 {creator.followers?.toLocaleString() || 0}</span>
                          <span>💬 {creator.engagement_rate || 0}%</span>
                        </div>
                        {creator.specialty && (
                          <p className="text-sm text-gray-500 mt-1">{creator.specialty}</p>
                        )}
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(creator.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

