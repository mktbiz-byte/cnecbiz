import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ArrowLeft, CheckCircle, Loader2, Sparkles, Edit, Save, X } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function OliveYoungInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [aiGuide, setAiGuide] = useState(null)
  const [activeTab, setActiveTab] = useState('product_intro')
  const [editingSection, setEditingSection] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadCampaignData()
  }, [id])

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)

      // AI 가이드가 이미 생성되어 있으면 표시
      if (data.ai_generated_guide) {
        setAiGuide(data.ai_generated_guide)
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      alert('캠페인 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateAIGuide = async () => {
    try {
      setGenerating(true)

      // Gemini API를 사용한 AI 가이드 생성
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      const prompt = `당신은 올리브영 세일 캠페인 전문 기획자입니다. 다음 정보를 바탕으로 크리에이터가 실제로 사용할 수 있는 전문적이고 상세한 3단계 콘텐츠 제작 가이드를 생성해주세요.

**제품 정보**
- 브랜드: ${campaign.brand}
- 제품명: ${campaign.product_name}
- 제품 특징: ${campaign.product_features}
- 핵심 포인트: ${campaign.product_key_points}

**STEP 1 가이드 초안 (상품 리뷰)**
${campaign.oliveyoung_step1_guide || '미작성'}

**STEP 2 가이드 초안 (세일 홍보)**
${campaign.oliveyoung_step2_guide || '미작성'}

**STEP 3 가이드 초안 (세일 당일 스토리)**
${campaign.oliveyoung_step3_guide || '미작성'}

위 초안을 바탕으로 각 단계별로 구체적이고 실행 가능한 가이드를 작성해주세요.
- 각 단계의 목적과 핵심 메시지를 명확히 전달
- 구체적인 촬영 방법, 필수 대사, 촬영 장면 예시 포함
- 크리에이터가 바로 실행할 수 있도록 단계별 액션 아이템 제시

**응답 형식 (JSON):**
{
  "step1_guide_enhanced": "STEP 1 상품 리뷰 가이드 (전문적으로 가공된 버전, 구체적인 촬영 방법과 필수 요소 포함)",
  "step2_guide_enhanced": "STEP 2 세일 홍보 가이드 (전문적으로 가공된 버전, 구체적인 촬영 방법과 필수 요소 포함)",
  "step3_guide_enhanced": "STEP 3 세일 당일 스토리 가이드 (전문적으로 가공된 버전, 구체적인 촬영 방법과 필수 요소 포함)",
  "shooting_tips": "전체 촬영 팁 (조명, 각도, 배경, 소품 활용 등)",
  "cautions": "주의사항 (금지 사항, 필수 포함 요소, 법적 고지사항 등)"
}

명확하고 구체적이며 실행 가능한 가이드를 JSON 형식으로 작성해주세요.`

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
        throw new Error('AI 가이드 생성에 실패했습니다.')
      }

      const result = await response.json()
      const generatedText = result.candidates[0].content.parts[0].text
      
      // JSON 파싱
      let step1Enhanced = campaign.oliveyoung_step1_guide || ''
      let step2Enhanced = campaign.oliveyoung_step2_guide || ''
      let step3Enhanced = campaign.oliveyoung_step3_guide || ''
      let shootingTips = ''
      let cautions = ''
      
      try {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          step1Enhanced = parsed.step1_guide_enhanced || step1Enhanced
          step2Enhanced = parsed.step2_guide_enhanced || step2Enhanced
          step3Enhanced = parsed.step3_guide_enhanced || step3Enhanced
          shootingTips = parsed.shooting_tips || ''
          cautions = parsed.cautions || ''
        }
      } catch (e) {
        console.error('JSON 파싱 실패:', e)
      }

      // AI 가공된 가이드 저장
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          oliveyoung_step1_guide_ai: step1Enhanced,
          oliveyoung_step2_guide_ai: step2Enhanced,
          oliveyoung_step3_guide_ai: step3Enhanced,
          oliveyoung_shooting_tips: shootingTips,
          oliveyoung_cautions: cautions,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError

      // 화면에 표시할 가이드 설정
      setAiGuide({
        product_intro: `${campaign.brand} ${campaign.product_name}\n\n${campaign.product_features}`,
        video1_guide: step1Enhanced,
        video2_guide: step2Enhanced,
        story_guide: step3Enhanced,
        shooting_tips: shootingTips,
        cautions: cautions
      })

      alert('AI 가이드가 생성되었습니다!')
    } catch (error) {
      console.error('AI 가이드 생성 오류:', error)
      alert('AI 가이드 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleEdit = (section) => {
    setEditingSection(section)
    setEditValue(aiGuide[section] || '')
  }

  const handleSaveEdit = async () => {
    try {
      const updatedGuide = { ...aiGuide, [editingSection]: editValue }
      setAiGuide(updatedGuide)

      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: updatedGuide })
        .eq('id', id)

      if (error) throw error

      setEditingSection(null)
      alert('수정 사항이 저장되었습니다!')
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">캠페인을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          가이드 수정으로 돌아가기
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
          <p className="text-gray-600">캠페인 가이드</p>
        </div>

        {/* 제품 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>제품 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">브랜드</p>
                  <p className="font-medium">{campaign.brand || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">제품명</p>
                  <p className="font-medium">{campaign.product_name || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">제품 특징</p>
                <p className="font-medium">{campaign.product_features || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">핵심 소구 포인트</p>
                <p className="font-medium">{campaign.product_key_points || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 캠페인 지원 가이드 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-2xl font-bold">✨ AI 캠페인 지원 가이드</h2>
            </div>
            <Button
              onClick={generateAIGuide}
              disabled={generating}
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                '재생성'
              )}
            </Button>
          </div>

          {!aiGuide && !generating && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">AI 가이드를 생성하여 크리에이터가 이해하기 쉬운 가이드를 만드세요.</p>
                <Button onClick={generateAIGuide} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 가이드 생성
                </Button>
              </CardContent>
            </Card>
          )}

          {aiGuide && (
            <>
              {/* 탭 버튼 */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('product_intro')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'product_intro' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📦 제품 소개
                </button>
                <button
                  onClick={() => setActiveTab('video1')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'video1' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🎬 1차 영상
                </button>
                <button
                  onClick={() => setActiveTab('video2')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'video2' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🎬 2차 영상
                </button>
                <button
                  onClick={() => setActiveTab('story')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'story' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📱 스토리 URL
                </button>
                <button
                  onClick={() => setActiveTab('cautions')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'cautions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ⚠️ 주의사항
                </button>
              </div>

              {/* 제품 소개 */}
              {activeTab === 'product_intro' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">제품 소개</CardTitle>
                    {editingSection !== 'product_intro' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('product_intro')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'product_intro' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.product_intro}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 1차 영상 가이드 */}
              {activeTab === 'video1' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">1차 영상 가이드</CardTitle>
                    {editingSection !== 'video1_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('video1_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'video1_guide' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.video1_guide}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 2차 영상 가이드 */}
              {activeTab === 'video2' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">2차 영상 가이드</CardTitle>
                    {editingSection !== 'video2_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('video2_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'video2_guide' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.video2_guide}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 스토리 URL 가이드 */}
              {activeTab === 'story' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">스토리 URL 가이드</CardTitle>
                    {editingSection !== 'story_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('story_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'story_guide' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.story_guide}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 주의사항 */}
              {activeTab === 'cautions' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">주의사항</CardTitle>
                    {editingSection !== 'cautions' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('cautions')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'cautions' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.cautions}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
            className="flex-1"
          >
            가이드 수정
          </Button>
          <Button
            onClick={() => navigate(`/company/campaigns/${id}/order-confirmation`)}
            disabled={!aiGuide}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            결제하기
          </Button>
        </div>
      </div>
    </div>
  )
}
