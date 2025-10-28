import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Users, Plus, Trash2, Loader2, Sparkles, 
  Instagram, Youtube, Video, Edit, CheckCircle, XCircle, Eye, X
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { scrapeAllPlatforms } from '../../lib/youtubeScraperService'
import AdminNavigation from './AdminNavigation'

export default function CreatorsManagement() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingCreator, setEditingCreator] = useState(null)
  
  const [formData, setFormData] = useState({
    creator_name: '',
    email: '',
    phone: '',
    instagram_url: '',
    youtube_url: '',
    tiktok_url: '',
    other_sns_url: '',
    
    // AI Generated
    ai_generated_bio: '',
    ai_generated_strengths: [],
    ai_generated_categories: [],
    ai_generated_target_audience: '',
    ai_generated_content_style: '',
    
    // Final (Editable)
    final_bio: '',
    final_strengths: [],
    final_categories: [],
    final_target_audience: '',
    final_content_style: '',
    
    // Stats
    total_followers: 0,
    avg_engagement_rate: 0,
    avg_views: 0,
    
    status: 'approved' // 관리자가 직접 등록하면 자동 승인
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
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!adminData) {
      navigate('/company/dashboard')
    }
  }

  const fetchCreators = async () => {
    if (!supabaseBiz) return

    try {
      const { data, error } = await supabaseBiz
        .from('featured_creator_applications')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCreators(data)
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      creator_name: '',
      email: '',
      phone: '',
      instagram_url: '',
      youtube_url: '',
      tiktok_url: '',
      other_sns_url: '',
      ai_generated_bio: '',
      ai_generated_strengths: [],
      ai_generated_categories: [],
      ai_generated_target_audience: '',
      ai_generated_content_style: '',
      final_bio: '',
      final_strengths: [],
      final_categories: [],
      final_target_audience: '',
      final_content_style: '',
      total_followers: 0,
      avg_engagement_rate: 0,
      avg_views: 0,
      status: 'approved'
    })
    setEditingCreator(null)
  }

  const generateAIProfile = async () => {
    if (!formData.instagram_url && !formData.youtube_url && !formData.tiktok_url) {
      alert('최소 하나의 SNS URL을 입력해주세요')
      return
    }

    setIsGenerating(true)
    try {
      // 1단계: SNS 크롤링으로 실제 데이터 수집
      console.log('📊 SNS 데이터 크롤링 중...')
      const scrapedData = await scrapeAllPlatforms({
        youtube_url: formData.youtube_url,
        instagram_url: formData.instagram_url,
        tiktok_url: formData.tiktok_url
      })

      console.log('✅ 크롤링 결과:', scrapedData)

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다')

      const snsUrls = [
        formData.instagram_url,
        formData.youtube_url,
        formData.tiktok_url,
        formData.other_sns_url
      ].filter(Boolean).join('\n')

      // 2단계: 크롤링된 실제 데이터를 포함한 프롬프트 생성
      const realDataInfo = `
실제 수집된 데이터:
- 총 팔로워: ${scrapedData.totalFollowers.toLocaleString()}명
- 평균 조회수: ${scrapedData.avgViews.toLocaleString()}회
- 평균 참여율: ${scrapedData.avgEngagement}%
${scrapedData.youtube ? `- YouTube 구독자: ${scrapedData.youtube.subscribers.toLocaleString()}명` : ''}
${scrapedData.youtube ? `- YouTube 영상 수: ${scrapedData.youtube.videoCount}개` : ''}`

      const prompt = `당신은 크리에이터 프로필 분석 전문가입니다. 다음 정보를 바탕으로 크리에이터의 프로필을 생성해주세요.

크리에이터 이름: ${formData.creator_name}
SNS URLs:
${snsUrls}

${realDataInfo}

다음 형식의 JSON으로 응답해주세요:
{
  "bio": "크리에이터 소개 (2-3문장, 매력적이고 전문적으로, 기업이 선택하고 싶어지는 내용)",
  "strengths": ["강점1", "강점2", "강점3", "강점4", "강점5"],
  "categories": ["카테고리1", "카테고리2", "카테고리3"],
  "target_audience": "주요 타겟 오디언스 설명 (구체적으로)",
  "content_style": "콘텐츠 스타일 설명 (특징과 강점 중심)",
  "estimated_followers": 예상 팔로워 수 (숫자),
  "estimated_engagement": 예상 참여율 (소수점, 예: 3.5),
  "estimated_views": 평균 조회수 (숫자)
}

참고:
- 강점은 비즈니스 가치가 있고 구체적으로 작성하세요
- 카테고리는 beauty, fashion, food, lifestyle, tech, travel, fitness, gaming, education, entertainment 등에서 선택하세요
- 소개는 기업 담당자가 "이 사람과 일하고 싶다"고 느낄 수 있도록 작성하세요`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.7, 
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const resultText = data.candidates[0]?.content?.parts[0]?.text
      
      if (!resultText) throw new Error('AI 응답이 비어있습니다')
      
      const aiProfile = JSON.parse(resultText)

      // 3단계: 크롤링된 실제 데이터 우선 사용, AI 추정치는 보조
      setFormData(prev => ({
        ...prev,
        ai_generated_bio: aiProfile.bio,
        ai_generated_strengths: aiProfile.strengths,
        ai_generated_categories: aiProfile.categories,
        ai_generated_target_audience: aiProfile.target_audience,
        ai_generated_content_style: aiProfile.content_style,
        
        final_bio: aiProfile.bio,
        final_strengths: aiProfile.strengths,
        final_categories: aiProfile.categories,
        final_target_audience: aiProfile.target_audience,
        final_content_style: aiProfile.content_style,
        
        // 실제 크롤링 데이터 우선 사용
        total_followers: scrapedData.totalFollowers || aiProfile.estimated_followers || 0,
        avg_engagement_rate: scrapedData.avgEngagement || aiProfile.estimated_engagement || 0,
        avg_views: scrapedData.avgViews || aiProfile.estimated_views || 0
      }))

      alert('✨ AI 프로필이 생성되었습니다! 내용을 확인하고 필요시 수정해주세요.')
    } catch (error) {
      console.error('AI generation error:', error)
      alert('AI 프로필 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!formData.creator_name || !formData.email) {
      alert('이름과 이메일은 필수입니다')
      return
    }

    if (!formData.final_bio || formData.final_strengths.length === 0) {
      alert('소개와 강점을 입력해주세요')
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const creatorData = {
        user_id: null, // 관리자가 등록하는 경우 user_id는 null
        creator_name: formData.creator_name,
        email: formData.email,
        phone: formData.phone,
        instagram_url: formData.instagram_url,
        youtube_url: formData.youtube_url,
        tiktok_url: formData.tiktok_url,
        other_sns_url: formData.other_sns_url,
        
        ai_generated_bio: formData.ai_generated_bio,
        ai_generated_strengths: formData.ai_generated_strengths,
        ai_generated_categories: formData.ai_generated_categories,
        ai_generated_target_audience: formData.ai_generated_target_audience,
        ai_generated_content_style: formData.ai_generated_content_style,
        
        final_bio: formData.final_bio,
        final_strengths: formData.final_strengths,
        final_categories: formData.final_categories,
        final_target_audience: formData.final_target_audience,
        final_content_style: formData.final_content_style,
        
        total_followers: formData.total_followers,
        avg_engagement_rate: formData.avg_engagement_rate,
        avg_views: formData.avg_views,
        
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        approved_at: new Date().toISOString()
      }

      if (editingCreator) {
        const { error } = await supabaseBiz
          .from('featured_creator_applications')
          .update(creatorData)
          .eq('id', editingCreator.id)
        
        if (error) throw error
        alert('크리에이터 정보가 수정되었습니다')
      } else {
        const { error } = await supabaseBiz
          .from('featured_creator_applications')
          .insert(creatorData)
        
        if (error) throw error
        alert('크리에이터가 등록되었습니다')
      }

      setShowAddForm(false)
      resetForm()
      fetchCreators()
    } catch (error) {
      console.error('Save error:', error)
      alert('저장 실패: ' + error.message)
    }
  }

  const handleEdit = (creator) => {
    setEditingCreator(creator)
    setFormData({
      creator_name: creator.creator_name,
      email: creator.email,
      phone: creator.phone || '',
      instagram_url: creator.instagram_url || '',
      youtube_url: creator.youtube_url || '',
      tiktok_url: creator.tiktok_url || '',
      other_sns_url: creator.other_sns_url || '',
      
      ai_generated_bio: creator.ai_generated_bio || '',
      ai_generated_strengths: creator.ai_generated_strengths || [],
      ai_generated_categories: creator.ai_generated_categories || [],
      ai_generated_target_audience: creator.ai_generated_target_audience || '',
      ai_generated_content_style: creator.ai_generated_content_style || '',
      
      final_bio: creator.final_bio || '',
      final_strengths: creator.final_strengths || [],
      final_categories: creator.final_categories || [],
      final_target_audience: creator.final_target_audience || '',
      final_content_style: creator.final_content_style || '',
      
      total_followers: creator.total_followers || 0,
      avg_engagement_rate: creator.avg_engagement_rate || 0,
      avg_views: creator.avg_views || 0,
      
      status: 'approved'
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('featured_creator_applications')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('삭제되었습니다')
      fetchCreators()
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const addStrength = () => {
    setFormData(prev => ({
      ...prev,
      final_strengths: [...prev.final_strengths, '']
    }))
  }

  const updateStrength = (index, value) => {
    const newStrengths = [...formData.final_strengths]
    newStrengths[index] = value
    setFormData(prev => ({ ...prev, final_strengths: newStrengths }))
  }

  const removeStrength = (index) => {
    setFormData(prev => ({
      ...prev,
      final_strengths: prev.final_strengths.filter((_, i) => i !== index)
    }))
  }

  const addCategory = () => {
    setFormData(prev => ({
      ...prev,
      final_categories: [...prev.final_categories, '']
    }))
  }

  const updateCategory = (index, value) => {
    const newCategories = [...formData.final_categories]
    newCategories[index] = value
    setFormData(prev => ({ ...prev, final_categories: newCategories }))
  }

  const removeCategory = (index) => {
    setFormData(prev => ({
      ...prev,
      final_categories: prev.final_categories.filter((_, i) => i !== index)
    }))
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                추천 크리에이터 관리
              </h1>
              <p className="text-gray-600 mt-1">AI 프로필 생성으로 빠르게 크리에이터를 등록하세요</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm)
              if (!showAddForm) resetForm()
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {showAddForm ? (
              <>
                <X className="w-5 h-5 mr-2" />
                취소
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                크리에이터 추가
              </>
            )}
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-8 shadow-xl border-2 border-blue-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6 text-purple-600" />
                {editingCreator ? '크리에이터 수정' : '새 크리에이터 등록'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Basic Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  기본 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">크리에이터 이름 *</label>
                    <Input
                      value={formData.creator_name}
                      onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                      placeholder="활동명"
                      className="border-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">이메일 *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="border-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">연락처</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="010-0000-0000"
                      className="border-2"
                    />
                  </div>
                </div>
              </div>

              {/* SNS URLs */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-bold mb-4">SNS 계정</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      Instagram URL
                    </label>
                    <Input
                      value={formData.instagram_url}
                      onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/username"
                      className="border-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-600" />
                      YouTube URL
                    </label>
                    <Input
                      value={formData.youtube_url}
                      onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                      placeholder="https://youtube.com/@username"
                      className="border-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      TikTok URL
                    </label>
                    <Input
                      value={formData.tiktok_url}
                      onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                      placeholder="https://tiktok.com/@username"
                      className="border-2"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    type="button"
                    onClick={generateAIProfile}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI 프로필 생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        ✨ AI로 프로필 자동 생성
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Profile Content */}
              {(formData.final_bio || formData.ai_generated_bio) && (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      프로필 내용
                    </h3>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">크리에이터 소개 *</label>
                        <textarea
                          value={formData.final_bio}
                          onChange={(e) => setFormData({ ...formData, final_bio: e.target.value })}
                          placeholder="매력적인 소개를 작성하세요"
                          className="w-full px-4 py-3 border-2 rounded-lg min-h-32"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">주요 강점 *</label>
                        <div className="space-y-2">
                          {formData.final_strengths.map((strength, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={strength}
                                onChange={(e) => updateStrength(index, e.target.value)}
                                placeholder={`강점 ${index + 1}`}
                                className="border-2"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => removeStrength(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" onClick={addStrength} className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            강점 추가
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">콘텐츠 카테고리 *</label>
                        <div className="space-y-2">
                          {formData.final_categories.map((category, index) => (
                            <div key={index} className="flex gap-2">
                              <select
                                value={category}
                                onChange={(e) => updateCategory(index, e.target.value)}
                                className="flex-1 px-4 py-2 border-2 rounded-lg"
                              >
                                <option value="">선택하세요</option>
                                <option value="beauty">뷰티</option>
                                <option value="fashion">패션</option>
                                <option value="food">푸드</option>
                                <option value="lifestyle">라이프스타일</option>
                                <option value="tech">테크</option>
                                <option value="travel">여행</option>
                                <option value="fitness">피트니스</option>
                                <option value="gaming">게임</option>
                                <option value="education">교육</option>
                                <option value="entertainment">엔터테인먼트</option>
                              </select>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => removeCategory(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {formData.final_categories.length < 5 && (
                            <Button variant="outline" onClick={addCategory} className="w-full">
                              <Plus className="w-4 h-4 mr-2" />
                              카테고리 추가
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">타겟 오디언스</label>
                          <Input
                            value={formData.final_target_audience}
                            onChange={(e) => setFormData({ ...formData, final_target_audience: e.target.value })}
                            placeholder="예: 20-30대 여성"
                            className="border-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">콘텐츠 스타일</label>
                          <Input
                            value={formData.final_content_style}
                            onChange={(e) => setFormData({ ...formData, final_content_style: e.target.value })}
                            placeholder="예: 밝고 유쾌한 톤"
                            className="border-2"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">총 팔로워</label>
                          <Input
                            type="number"
                            value={formData.total_followers}
                            onChange={(e) => setFormData({ ...formData, total_followers: parseInt(e.target.value) || 0 })}
                            className="border-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">평균 참여율 (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.avg_engagement_rate}
                            onChange={(e) => setFormData({ ...formData, avg_engagement_rate: parseFloat(e.target.value) || 0 })}
                            className="border-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">평균 조회수</label>
                          <Input
                            type="number"
                            value={formData.avg_views}
                            onChange={(e) => setFormData({ ...formData, avg_views: parseInt(e.target.value) || 0 })}
                            className="border-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        resetForm()
                      }}
                      className="flex-1"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {editingCreator ? '수정 완료' : '등록 완료'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Creators List */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-2xl">
                <Users className="w-6 h-6 text-blue-600" />
                등록된 크리에이터 ({creators.length}명)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {creators.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">등록된 크리에이터가 없습니다</p>
                <p className="text-sm mt-2">위의 "크리에이터 추가" 버튼을 눌러 시작하세요</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {creators.map((creator) => (
                  <div
                    key={creator.id}
                    className="border-2 rounded-xl p-6 hover:shadow-lg transition-all bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold">{creator.creator_name}</h3>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            승인됨
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {creator.final_bio || creator.ai_generated_bio}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {(creator.final_categories || creator.ai_generated_categories || []).map((cat, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {cat}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          <div>
                            <div className="text-gray-500">팔로워</div>
                            <div className="font-bold text-lg">{(creator.total_followers || 0).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">참여율</div>
                            <div className="font-bold text-lg">{creator.avg_engagement_rate || 0}%</div>
                          </div>
                          <div>
                            <div className="text-gray-500">평균 조회수</div>
                            <div className="font-bold text-lg">{(creator.avg_views || 0).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {creator.instagram_url && (
                            <a
                              href={creator.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-pink-600"
                            >
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </a>
                          )}
                          {creator.youtube_url && (
                            <a
                              href={creator.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-red-600"
                            >
                              <Youtube className="w-4 h-4" />
                              YouTube
                            </a>
                          )}
                          {creator.tiktok_url && (
                            <a
                              href={creator.tiktok_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-black"
                            >
                              <Video className="w-4 h-4" />
                              TikTok
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(creator)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(creator.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  )
}

