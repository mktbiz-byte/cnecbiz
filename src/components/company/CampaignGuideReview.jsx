import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ArrowLeft, Edit, CheckCircle, Sparkles, Loader2, Save, X } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function CampaignGuideReview() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiGuide, setAiGuide] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [selectedConcepts, setSelectedConcepts] = useState([])
  const [additionalConcepts, setAdditionalConcepts] = useState('')

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
        const guide = JSON.parse(data.ai_generated_guide)
        setAiGuide(guide)
        // 모든 컨셉을 기본으로 선택
        if (guide.video_concepts) {
          setSelectedConcepts(guide.video_concepts.map((_, index) => index))
        }
      }
      // AI 가이드가 없어도 자동 생성하지 않음 (사용자가 버튼으로 생성)
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      alert('캠페인 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateAIGuideFromData = async (campaignData) => {
    if (!campaignData.guide_brand || !campaignData.guide_product_name || !campaignData.product_features || !campaignData.product_key_points) {
      alert('제품 정보를 먼저 입력해주세요.')
      navigate(`/company/campaigns/guide?id=${id}`)
      return
    }

    setGenerating(true)

    try {
      // Gemini API 호출
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      
      const autonomyNote = campaignData.creator_autonomy 
        ? '\n\n**중요:** 이 캠페인은 크리에이터 자율성을 보장합니다. 촬영 장면과 대사는 크리에이터가 자유롭게 결정할 수 있으나, 핵심 소구 포인트는 반드시 포함되어야 합니다.'
        : ''

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `당신은 한국 뷰티/패션 인플루언서 마케팅 전문가입니다. 크리에이터가 바로 실행할 수 있는 구체적이고 명확한 가이드를 작성해주세요.

## 캠페인 정보

### 제품 정보
- **브랜드**: ${campaignData.guide_brand}
- **제품명**: ${campaignData.guide_product_name}
- **제품 특징**: ${campaignData.product_features}
- **핵심 소구 포인트**: ${campaignData.product_key_points}

### 일정
- **촬영 마감일**: ${campaignData.start_date || '미정'}
- **SNS 업로드일**: ${campaignData.end_date || '미정'}

### 필수 대사
${campaignData.required_dialogues && campaignData.required_dialogues.length > 0 ? campaignData.required_dialogues.map((d, i) => `${i + 1}. "${d}"`).join('\n') : '- 없음'}

### 필수 촬영 장면
${campaignData.required_scenes && campaignData.required_scenes.length > 0 ? campaignData.required_scenes.map((s, i) => `${i + 1}. ${s}`).join('\n') : '- 없음'}

### 촬영 장면 요구사항
${[
  campaignData.shooting_scenes_ba_photo && '- BA 사진 (Before/After)',
  campaignData.shooting_scenes_no_makeup && '- 노메이크업',
  campaignData.shooting_scenes_closeup && '- 제품 제형 클로즈업',
  campaignData.shooting_scenes_product_closeup && '- 제품 클로즈업',
  campaignData.shooting_scenes_product_texture && '- 제품 텍스처',
  campaignData.shooting_scenes_outdoor && '- 외부촬영',
  campaignData.shooting_scenes_couple && '- 커플 출연',
  campaignData.shooting_scenes_child && '- 아이 출연',
  campaignData.shooting_scenes_troubled_skin && '- 트러블 피부 노출',
  campaignData.shooting_scenes_wrinkles && '- 피부 주름 노출'
].filter(Boolean).join('\n') || '- 없음'}

### 추가 촬영 요청
${campaignData.additional_shooting_requests || '- 없음'}

### 필수 해시태그
${campaignData.required_hashtags && campaignData.required_hashtags.length > 0 ? campaignData.required_hashtags.map(h => `#${h}`).join(' ') : '- 없음'}

### 영상 요구사항
- **영상 길이**: ${campaignData.video_duration || '자유'}
- **영상 템포**: ${campaignData.video_tempo || '자유'}
- **영상 톤앤매너**: ${campaignData.video_tone || '자유'}

### 기타 요청사항
${campaignData.additional_details || '- 없음'}

### 메타 파트너십 광고코드 (필수)
${campaignData.meta_ad_code_requested ? '- 요청됨: 영상 완료 후 메타 비즈니스 세팅에서 파트너십 광고 코드를 발급받아 CNEC에 반드시 제공해주세요. (발급 방법: 메타 비즈니스 세팅 > 파트너십 광고 > 코드 발급)' : '- 요청 안함'}
${autonomyNote}

---

## 작성 지침

1. **한국인 취향**: 화려하지 않고 단순 명료하게
2. **실용성**: 크리에이터가 바로 실행 가능한 구체적 내용
3. **가독성**: 짧은 문장, 명확한 구조
4. **완성도**: 위 모든 정보를 반영하여 통합된 가이드 작성
5. **주의사항**: 피부 트러블, 과장 광고 등 일반적인 내용은 제외. 이 캠페인에 필수적인 주의사항만 포함 (예: 마감일 엄수, 해시태그 필수 포함 등)

## 응답 형식 (JSON)

{
  "product_intro": "제품을 2-3문장으로 소개. 브랜드, 제품명, 핵심 특징 포함.",
  "video_concepts": [
    "컨셉 1: 구체적인 컨셉 설명 (예: 아침 루틴 브이로그 형식으로 자연스럽게 제품 사용)",
    "컨셉 2: 다른 컨셉 설명",
    "컨셉 3: 또 다른 컨셉 설명"
  ],
  "must_include": [
    "필수 대사와 소구 포인트를 구체적으로 명시",
    "필수 촬영 장면을 구체적으로 명시",
    "필수 해시태그 사용법"
  ],
  "filming_tips": [
    "촬영 장면 요구사항을 반영한 구체적 팁",
    "영상 길이/템포/톤앤매너를 고려한 팁",
    "추가 촬영 요청사항 반영"
  ],
  "cautions": [
    "이 캠페인에 필수적인 주의사항만 포함 (예: 마감일, 해시태그, 촬영 요구사항 등)"
  ]
}

JSON만 응답하세요.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          })
        }
      )

      if (!response.ok) {
        throw new Error('AI 가이드 생성 실패')
      }

      const result = await response.json()
      const generatedText = result.candidates[0].content.parts[0].text
      const guideData = JSON.parse(generatedText)

      setAiGuide(guideData)

      // Supabase에 저장
      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: JSON.stringify(guideData) })
        .eq('id', id)

      if (error) throw error

    } catch (error) {
      console.error('AI 가이드 생성 실패:', error)
      alert('AI 가이드 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const generateAIGuide = async () => {
    if (!campaign.guide_brand || !campaign.guide_product_name || !campaign.product_features || !campaign.product_key_points) {
      alert('제품 정보를 먼저 입력해주세요.')
      navigate(`/company/campaigns/guide?id=${id}`)
      return
    }

    await generateAIGuideFromData(campaign)
  }

  const regenerateAIGuide = async () => {
    setGenerating(true)

    try {
      // Gemini API 호출
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      
      const autonomyNote = campaign.creator_autonomy 
        ? '\n\n**중요:** 이 캠페인은 크리에이터 자율성을 보장합니다. 촬영 장면과 대사는 크리에이터가 자유롭게 결정할 수 있으나, 핵심 소구 포인트는 반드시 포함되어야 합니다.'
        : ''

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `당신은 한국 뷰티/패션 크리에이터를 위한 캠페인 가이드 작성 전문가입니다.

다음 제품 정보를 바탕으로 크리에이터가 쉽게 이해하고 실행할 수 있는 가이드를 작성해주세요.

**제품 정보:**
- 브랜드: ${campaign.guide_brand}
- 제품명: ${campaign.guide_product_name}
- 제품 특징: ${campaign.product_features}
- 핵심 소구 포인트: ${campaign.product_key_points}

**일정:**
- 촬영 마감일: ${campaign.start_date || '미정'}
- SNS 업로드일: ${campaign.end_date || '미정'}

**메타 파트너십 광고코드 (필수):**
${campaign.meta_ad_code_requested ? '- 요청됨: 영상 완료 후 메타 비즈니스 세팅에서 파트너십 광고 코드를 발급받아 CNEC에 반드시 제공해주세요. (발급 방법: 메타 비즈니스 세팅 > 파트너십 광고 > 코드 발급)' : '- 요청 안함'}
${autonomyNote}

**가이드 작성 요구사항:**
1. 한국인이 선호하는 단순하고 명료한 스타일로 작성
2. 불필요한 수식어 제거, 핵심만 전달
3. 실행 가능한 구체적인 내용 포함
4. 다음 섹션으로 구성:
   - 제품 소개 (간단명료하게)
   - 영상 컨셉 제안 (2-3가지)
   - 필수 포함 내용
   - 추천 촬영 팁
   - 주의사항 (피부 트러블, 과장 광고 등 일반적인 내용 제외, 이 캠페인에 필수적인 주의사항만 포함)

**응답 형식 (JSON):**
{
  "product_intro": "제품 소개 내용",
  "video_concepts": ["컨셉1", "컨셉2", "컨셉3"],
  "must_include": ["필수1", "필수2", "필수3"],
  "filming_tips": ["팁1", "팁2", "팁3"],
  "cautions": ["이 캠페인에 필수적인 주의사항만 포함"]
}

JSON 형식으로만 응답해주세요.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          })
        }
      )

      if (!response.ok) {
        throw new Error('AI 가이드 생성 실패')
      }

      const result = await response.json()
      const generatedText = result.candidates[0].content.parts[0].text
      const guideData = JSON.parse(generatedText)

      setAiGuide(guideData)

      // Supabase에 저장
      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: JSON.stringify(guideData) })
        .eq('id', id)

      if (error) throw error

    } catch (error) {
      console.error('AI 가이드 생성 실패:', error)
      alert('AI 가이드 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const startEdit = (section, value) => {
    setEditingSection(section)
    setEditValue(Array.isArray(value) ? value.join('\n') : value)
  }

  const cancelEdit = () => {
    setEditingSection(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    setSaving(true)

    try {
      const updatedGuide = { ...aiGuide }
      
      if (editingSection === 'product_intro') {
        updatedGuide.product_intro = editValue
      } else if (['video_concepts', 'must_include', 'filming_tips', 'cautions'].includes(editingSection)) {
        updatedGuide[editingSection] = editValue.split('\n').filter(line => line.trim())
      }

      setAiGuide(updatedGuide)

      // Supabase에 저장
      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: JSON.stringify(updatedGuide) })
        .eq('id', id)

      if (error) throw error

      setEditingSection(null)
      setEditValue('')
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const saveFinalGuide = async () => {
    setSaving(true)

    try {
      // 선택된 컨셉만 포함
      const selectedConceptsList = selectedConcepts
        .sort((a, b) => a - b)
        .map(index => aiGuide.video_concepts[index])
      
      // 추가 컨셉 포함
      const additionalConceptsList = additionalConcepts
        .split('\n')
        .filter(line => line.trim())
      
      const finalConcepts = [...selectedConceptsList, ...additionalConceptsList]

      const finalGuide = {
        ...aiGuide,
        video_concepts: finalConcepts
      }

      setAiGuide(finalGuide)

      // Supabase에 저장
      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: JSON.stringify(finalGuide) })
        .eq('id', id)

      if (error) throw error

      alert('최종 가이드가 저장되었습니다!')
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <CompanyNavigation />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (!campaign) {
    return (
      <>
        <CompanyNavigation />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12 text-red-600">캠페인을 찾을 수 없습니다.</div>
        </div>
      </>
    )
  }

  return (
    <>
      <CompanyNavigation />
      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/company/campaigns')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            캠페인 목록으로
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
              <p className="text-gray-600 mt-1">캠페인 가이드</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(`/company/campaigns/guide?id=${id}`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              제품 정보 수정
            </Button>
          </div>
        </div>

        {/* 제품 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">제품 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">브랜드</p>
              <p className="text-base font-medium">{campaign.guide_brand || '미입력'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">제품명</p>
              <p className="text-base font-medium">{campaign.guide_product_name || '미입력'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">제품 특징</p>
              <p className="text-base whitespace-pre-wrap">{campaign.product_features || '미입력'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">핵심 소구 포인트</p>
              <p className="text-base whitespace-pre-wrap">{campaign.product_key_points || '미입력'}</p>
            </div>
            {campaign.creator_autonomy && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  ✓ 크리에이터 자율성 보장 캠페인
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI 가이드 생성 버튼 */}
        {!aiGuide && (
          <div className="text-center py-8">
            <Button
              onClick={generateAIGuide}
              disabled={generating}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI 가이드 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI 가이드 생성
                </>
              )}
            </Button>
            <p className="text-sm text-gray-600 mt-3">
              제품 정보를 바탕으로 크리에이터용 가이드를 자동 생성합니다
            </p>
          </div>
        )}

        {/* AI 생성 가이드 */}
        {aiGuide && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-2xl font-bold">AI 생성 가이드</h2>
              </div>
              <Button
                onClick={generateAIGuide}
                variant="outline"
                disabled={generating}
                size="sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    재생성 중...
                  </>
                ) : (
                  '재생성'
                )}
              </Button>
            </div>

            {/* 제품 소개 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">제품 소개</CardTitle>
                {editingSection !== 'product_intro' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit('product_intro', aiGuide.product_intro)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingSection === 'product_intro' ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full h-32 p-3 border rounded-lg resize-none"
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={saving} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-base leading-relaxed">{aiGuide.product_intro}</p>
                )}
              </CardContent>
            </Card>

            {/* 영상 컨셉 제안 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">영상 컨셉 제안</CardTitle>
                {editingSection !== 'video_concepts' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit('video_concepts', aiGuide.video_concepts)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingSection === 'video_concepts' ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="각 줄에 하나씩 입력하세요"
                      className="w-full h-32 p-3 border rounded-lg resize-none"
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={saving} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {aiGuide.video_concepts.map((concept, index) => (
                        <label key={index} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition">
                          <input
                            type="checkbox"
                            checked={selectedConcepts.includes(index)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedConcepts([...selectedConcepts, index])
                              } else {
                                setSelectedConcepts(selectedConcepts.filter(i => i !== index))
                              }
                            }}
                            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <span className="inline-block w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-center text-sm font-medium leading-6 mr-2">
                              {index + 1}
                            </span>
                            <span className="text-base">{concept}</span>
                            {selectedConcepts.includes(index) && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">✓ 선택됨</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        추가 컨셉 (선택사항)
                      </label>
                      <textarea
                        value={additionalConcepts}
                        onChange={(e) => setAdditionalConcepts(e.target.value)}
                        placeholder="추가하고 싶은 영상 컨셉을 입력하세요 (각 줄에 하나씩)"
                        className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 필수 포함 내용 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">필수 포함 내용</CardTitle>
                {editingSection !== 'must_include' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit('must_include', aiGuide.must_include)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingSection === 'must_include' ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="각 줄에 하나씩 입력하세요"
                      className="w-full h-32 p-3 border rounded-lg resize-none"
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={saving} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {aiGuide.must_include.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 추천 촬영 팁 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">추천 촬영 팁</CardTitle>
                {editingSection !== 'filming_tips' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit('filming_tips', aiGuide.filming_tips)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingSection === 'filming_tips' ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="각 줄에 하나씩 입력하세요"
                      className="w-full h-32 p-3 border rounded-lg resize-none"
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={saving} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {aiGuide.filming_tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                        <span className="text-base">{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 주의사항 */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-orange-800">주의사항</CardTitle>
                {editingSection !== 'cautions' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit('cautions', aiGuide.cautions)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingSection === 'cautions' ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="각 줄에 하나씩 입력하세요"
                      className="w-full h-32 p-3 border rounded-lg resize-none"
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={saving} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {aiGuide.cautions.map((caution, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold flex-shrink-0">!</span>
                        <span className="text-base text-orange-800">{caution}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 크리에이터 자율성 안내 */}
            {campaign.creator_autonomy && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <p className="text-base text-blue-900 font-medium">
                    ✓ 이 캠페인은 <strong>크리에이터 자율성을 보장</strong>합니다.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    촬영 장면과 대사는 크리에이터가 자유롭게 결정할 수 있습니다. 
                    단, 위에 명시된 <strong>핵심 소구 포인트는 반드시 포함</strong>되어야 합니다.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 최종 가이드 저장 및 확인 버튼 */}
            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-600">
                선택된 컨셉: <strong>{selectedConcepts.length}개</strong>
                {additionalConcepts.trim() && (
                  <span className="ml-2">
                    + 추가 컨셉: <strong>{additionalConcepts.split('\n').filter(line => line.trim()).length}개</strong>
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={saveFinalGuide}
                  disabled={saving || selectedConcepts.length === 0}
                  size="lg"
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? '저장 중...' : '최종 가이드 저장'}
                </Button>
                <Button
                  onClick={() => navigate('/company/campaigns')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  확인 완료
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
