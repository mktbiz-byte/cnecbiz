import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { 
  Plus, Edit, Trash2, Loader2, Youtube, Instagram, 
  TrendingUp, Sparkles, Save, X, Eye, EyeOff, ArrowUp, ArrowDown
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { GoogleGenerativeAI } from '@google/generative-ai'

export default function CNECPlusManagement() {
  const [activeTab, setActiveTab] = useState('list')
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [formData, setFormData] = useState({
    creator_name: '',
    nickname: '',
    youtube_url: '',
    instagram_url: '',
    tiktok_url: '',
    estimated_collaboration_fee: '',
    estimated_fee_description: '',
    country: 'korea'
  })
  const [aiData, setAiData] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // Load creators on mount
  useEffect(() => {
    loadCreators()
  }, [])

  const loadCreators = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('cnec_plus_creators')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setCreators(data || [])
    } catch (err) {
      console.error('크리에이터 로드 실패:', err)
      alert('크리에이터 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const generateProfile = async () => {
    if (!formData.youtube_url && !formData.instagram_url) {
      alert('YouTube 또는 Instagram URL을 입력해주세요.')
      return
    }

    setGenerating(true)
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      // Prepare prompt
      const prompt = `다음 크리에이터의 프로필을 분석하여 한국어로 마케팅용 소개를 작성해주세요.

크리에이터 정보:
- 이름: ${formData.creator_name || '미입력'}
- 닉네임: ${formData.nickname || '미입력'}
- YouTube: ${formData.youtube_url || '없음'}
- Instagram: ${formData.instagram_url || '없음'}
- TikTok: ${formData.tiktok_url || '없음'}

다음 JSON 형식으로 응답해주세요:
{
  "bio": "크리에이터 소개 (2-3문장)",
  "strengths": ["강점1", "강점2", "강점3"],
  "categories": ["카테고리1", "카테고리2"],
  "target_audience": "타겟 오디언스 설명",
  "content_style": "콘텐츠 스타일 설명"
}

응답은 반드시 유효한 JSON 형식이어야 합니다.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.')
      }

      const aiResponse = JSON.parse(jsonMatch[0])
      setAiData(aiResponse)
      
      alert('AI 프로필 생성이 완료되었습니다!')
    } catch (err) {
      console.error('AI 프로필 생성 실패:', err)
      alert('AI 프로필 생성 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!formData.creator_name) {
      alert('크리에이터 이름을 입력해주세요.')
      return
    }

    if (!aiData) {
      alert('먼저 AI 프로필을 생성해주세요.')
      return
    }

    setLoading(true)
    try {
      const creatorData = {
        creator_name: formData.creator_name,
        nickname: formData.nickname || null,
        youtube_url: formData.youtube_url || null,
        instagram_url: formData.instagram_url || null,
        tiktok_url: formData.tiktok_url || null,
        ai_generated_bio: aiData.bio,
        ai_generated_strengths: aiData.strengths,
        ai_generated_categories: aiData.categories,
        ai_generated_target_audience: aiData.target_audience,
        ai_generated_content_style: aiData.content_style,
        final_bio: aiData.bio,
        final_strengths: aiData.strengths,
        final_categories: aiData.categories,
        final_target_audience: aiData.target_audience,
        final_content_style: aiData.content_style,
        estimated_collaboration_fee: formData.estimated_collaboration_fee ? parseInt(formData.estimated_collaboration_fee.replace(/,/g, '')) : null,
        estimated_fee_description: formData.estimated_fee_description || null,
        country: formData.country || 'korea',
        status: 'active',
        is_featured: true,
        display_order: creators.length
      }

      if (editingId) {
        // Update existing creator
        const { error } = await supabaseBiz
          .from('cnec_plus_creators')
          .update(creatorData)
          .eq('id', editingId)

        if (error) throw error
        alert('크리에이터 정보가 수정되었습니다.')
      } else {
        // Insert new creator
        const { error } = await supabaseBiz
          .from('cnec_plus_creators')
          .insert([creatorData])

        if (error) throw error
        alert('새 크리에이터가 등록되었습니다.')
      }

      // Reset form
      setFormData({
        creator_name: '',
        nickname: '',
        youtube_url: '',
        instagram_url: '',
        tiktok_url: '',
        estimated_collaboration_fee: '',
        estimated_fee_description: '',
        country: 'korea'
      })
      setAiData(null)
      setEditingId(null)
      setActiveTab('list')
      loadCreators()
    } catch (err) {
      console.error('저장 실패:', err)
      alert('저장 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (creator) => {
    setFormData({
      creator_name: creator.creator_name,
      nickname: creator.nickname || '',
      youtube_url: creator.youtube_url || '',
      instagram_url: creator.instagram_url || '',
      tiktok_url: creator.tiktok_url || '',
      estimated_collaboration_fee: creator.estimated_collaboration_fee?.toString() || '',
      estimated_fee_description: creator.estimated_fee_description || '',
      country: creator.country || 'korea'
    })
    setAiData({
      bio: creator.final_bio,
      strengths: creator.final_strengths,
      categories: creator.final_categories,
      target_audience: creator.final_target_audience,
      content_style: creator.final_content_style
    })
    setEditingId(creator.id)
    setActiveTab('form')
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 이 크리에이터를 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('cnec_plus_creators')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('크리에이터가 삭제되었습니다.')
      loadCreators()
    } catch (err) {
      console.error('삭제 실패:', err)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const toggleFeatured = async (id, currentStatus) => {
    try {
      const { error } = await supabaseBiz
        .from('cnec_plus_creators')
        .update({ is_featured: !currentStatus })
        .eq('id', id)

      if (error) throw error
      loadCreators()
    } catch (err) {
      console.error('노출 상태 변경 실패:', err)
      alert('노출 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const moveCreator = async (id, direction) => {
    const currentIndex = creators.findIndex(c => c.id === id)
    if (currentIndex === -1) return
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= creators.length) return

    try {
      // Swap display_order
      const updates = [
        {
          id: creators[currentIndex].id,
          display_order: creators[targetIndex].display_order
        },
        {
          id: creators[targetIndex].id,
          display_order: creators[currentIndex].display_order
        }
      ]

      for (const update of updates) {
        const { error } = await supabaseBiz
          .from('cnec_plus_creators')
          .update({ display_order: update.display_order })
          .eq('id', update.id)

        if (error) throw error
      }

      loadCreators()
    } catch (err) {
      console.error('순서 변경 실패:', err)
      alert('순서 변경 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">크리에이터 목록</TabsTrigger>
          <TabsTrigger value="form">
            {editingId ? '크리에이터 수정' : '새 크리에이터 추가'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>CNEC Plus 크리에이터</CardTitle>
                  <CardDescription>
                    AI로 프로필을 생성한 추천 크리에이터 목록
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingId(null)
                  setFormData({
                    creator_name: '',
                    nickname: '',
                    youtube_url: '',
                    instagram_url: '',
                    tiktok_url: '',
                    estimated_collaboration_fee: '',
                    estimated_fee_description: '',
                    country: 'korea'
                  })
                  setAiData(null)
                  setActiveTab('form')
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  새 크리에이터 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : creators.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  등록된 크리에이터가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {creators.map((creator, index) => (
                    <Card key={creator.id} className={!creator.is_featured ? 'opacity-50' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-bold">{creator.creator_name}</h3>
                              {creator.nickname && (
                                <span className="text-sm text-gray-500">@{creator.nickname}</span>
                              )}
                              {!creator.is_featured && (
                                <Badge variant="secondary">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  비공개
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-3">{creator.final_bio}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {creator.final_categories?.map((cat, i) => (
                                <Badge key={i} variant="outline">{cat}</Badge>
                              ))}
                            </div>

                            <div className="flex gap-3 mb-3">
                              {creator.youtube_url && (
                                <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline">
                                    <Youtube className="w-4 h-4 mr-1 text-red-600" />
                                    YouTube
                                  </Button>
                                </a>
                              )}
                              {creator.instagram_url && (
                                <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline">
                                    <Instagram className="w-4 h-4 mr-1 text-pink-600" />
                                    Instagram
                                  </Button>
                                </a>
                              )}
                            </div>

                            {creator.estimated_collaboration_fee && (
                              <div className="text-sm">
                                <span className="font-semibold">예상 협업 비용:</span>{' '}
                                {creator.estimated_collaboration_fee.toLocaleString()}원
                                {creator.estimated_fee_description && (
                                  <span className="text-gray-500 ml-2">
                                    ({creator.estimated_fee_description})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveCreator(creator.id, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveCreator(creator.id, 'down')}
                                disabled={index === creators.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleFeatured(creator.id, creator.is_featured)}
                            >
                              {creator.is_featured ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-1" />
                                  숨기기
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  노출
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(creator)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              수정
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(creator.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              삭제
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
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input Form */}
            <Card>
              <CardHeader>
                <CardTitle>크리에이터 정보</CardTitle>
                <CardDescription>
                  크리에이터의 기본 정보와 SNS URL을 입력하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>크리에이터 이름 *</Label>
                  <Input
                    name="creator_name"
                    value={formData.creator_name}
                    onChange={handleInputChange}
                    placeholder="홍길동"
                  />
                </div>

                <div className="space-y-2">
                  <Label>닉네임</Label>
                  <Input
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    placeholder="@nickname"
                  />
                </div>

                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input
                    name="youtube_url"
                    value={formData.youtube_url}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/@channel"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input
                    name="instagram_url"
                    value={formData.instagram_url}
                    onChange={handleInputChange}
                    placeholder="https://instagram.com/username"
                  />
                </div>

                <div className="space-y-2">
                  <Label>TikTok URL</Label>
                  <Input
                    name="tiktok_url"
                    value={formData.tiktok_url}
                    onChange={handleInputChange}
                    placeholder="https://tiktok.com/@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label>예상 협업 비용 (원)</Label>
                  <Input
                    name="estimated_collaboration_fee"
                    value={formData.estimated_collaboration_fee}
                    onChange={handleInputChange}
                    placeholder="1000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>비용 설명</Label>
                  <Input
                    name="estimated_fee_description"
                    value={formData.estimated_fee_description}
                    onChange={handleInputChange}
                    placeholder="예: 영상 1개 기준"
                  />
                </div>

                <div className="space-y-2">
                  <Label>국가 *</Label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="korea">한국</option>
                    <option value="japan">일본</option>
                    <option value="usa">미국</option>
                    <option value="other">기타</option>
                  </select>
                </div>

                <Button
                  onClick={generateProfile}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI 프로필 생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI 프로필 생성
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right: AI Generated Profile */}
            <Card>
              <CardHeader>
                <CardTitle>AI 생성 프로필</CardTitle>
                <CardDescription>
                  AI가 자동으로 생성한 프로필 정보
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aiData ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold">소개</Label>
                      <Textarea
                        value={aiData.bio}
                        onChange={(e) => setAiData({ ...aiData, bio: e.target.value })}
                        rows={4}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">강점</Label>
                      <div className="mt-2 space-y-2">
                        {aiData.strengths?.map((strength, i) => (
                          <Input
                            key={i}
                            value={strength}
                            onChange={(e) => {
                              const newStrengths = [...aiData.strengths]
                              newStrengths[i] = e.target.value
                              setAiData({ ...aiData, strengths: newStrengths })
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">카테고리</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aiData.categories?.map((cat, i) => (
                          <Badge key={i}>{cat}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">타겟 오디언스</Label>
                      <p className="mt-2 text-sm text-gray-700">{aiData.target_audience}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">콘텐츠 스타일</Label>
                      <p className="mt-2 text-sm text-gray-700">{aiData.content_style}</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSave} disabled={loading} className="flex-1">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            저장 중...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            저장
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveTab('list')
                          setEditingId(null)
                          setFormData({
                            creator_name: '',
                            nickname: '',
                            youtube_url: '',
                            instagram_url: '',
                            tiktok_url: '',
                            estimated_collaboration_fee: '',
                            estimated_fee_description: '',
                            country: 'korea'
                          })
                          setAiData(null)
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <TrendingUp className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-center">
                      크리에이터 정보를 입력하고<br />
                      AI 프로필 생성 버튼을 클릭하세요
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
