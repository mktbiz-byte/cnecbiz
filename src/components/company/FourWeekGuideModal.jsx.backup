import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Plus, X, Loader2 } from 'lucide-react'

export default function FourWeekGuideModal({ 
  campaign, 
  onClose, 
  onSave,
  supabase 
}) {
  const [activeWeek, setActiveWeek] = useState('week1')
  const [guideData, setGuideData] = useState({
    week1: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    },
    week2: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    },
    week3: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    },
    week4: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    }
  })
  
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing guides if available
  useEffect(() => {
    ['week1', 'week2', 'week3', 'week4'].forEach(week => {
      const fieldName = `${week}_guide`
      if (campaign[fieldName]) {
        try {
          const parsed = JSON.parse(campaign[fieldName])
          setGuideData(prev => ({
            ...prev,
            [week]: parsed
          }))
        } catch (e) {
          console.error(`Failed to parse ${week} guide:`, e)
        }
      }
    })
  }, [campaign])

  const handleGenerateGuide = async () => {
    if (!campaign.challenge_weekly_guides) {
      alert('캠페인 생성 시 작성한 주차별 가이드가 없습니다.')
      return
    }

    setGenerating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      const weeklyGuides = campaign.challenge_weekly_guides
      const prompt = `당신은 한국 뷰티/패션 크리에이터를 위한 4주 챌린지 캠페인 가이드 작성 전문가입니다.

다음 제품 정보와 주차별 미션을 바탕으로, 각 주차별로 크리에이터가 쉽게 실행할 수 있는 가이드를 작성해주세요.

**제품 정보:**
- 브랜드: ${campaign.brand || '미정'}
- 제품명: ${campaign.product_name || '미정'}
- 제품 특징: ${campaign.product_features || '미정'}
- 핵심 포인트: ${campaign.product_key_points || '미정'}

**주차별 미션:**
${['week1', 'week2', 'week3', 'week4'].map((week, idx) => {
  const weekData = weeklyGuides[week]
  return `
${idx + 1}주차:
- 미션: ${weekData?.mission || '미정'}
- 필수 대사: ${weekData?.required_dialogue || '미정'}
- 필수 장면: ${weekData?.required_scenes || '미정'}
- 참고 URL: ${weekData?.reference || '없음'}`
}).join('\n')}

**가이드 작성 요구사항:**
각 주차별로 다음 항목을 포함해주세요:
1. 상품 정보 + 종합 정보 (간단명료하게)
2. 해당 주차 미션 (명확하게)
3. 필수 해시태그 3~5개 (배열)
4. 필수 대사 3~5개 (배열)
5. 필수 촬영 장면 3~5개 (배열)
6. 주의사항 (FHD 이상, 필터 자제, 마감일 엄수, 패널티 등)
7. 참고 영상 URL (있다면 포함, 배열)

**응답 형식 (JSON):**
{
  "week1": {
    "product_info": "상품 정보 + 종합 정보",
    "mission": "1주차 미션",
    "hashtags": ["해시태그1", "해시태그2"],
    "required_dialogues": ["필수 대사1", "필수 대사2"],
    "required_scenes": ["필수 장면1", "필수 장면2"],
    "cautions": "주의사항",
    "reference_urls": []
  },
  "week2": { ... },
  "week3": { ... },
  "week4": { ... }
}

JSON 형식으로만 응답해주세요.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
              responseMimeType: "application/json"
            }
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`AI 생성 실패: ${errorData.error?.message || response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        throw new Error('AI 응답 형식이 올바르지 않습니다.')
      }

      const generatedText = result.candidates[0].content.parts[0].text
      const guides = JSON.parse(generatedText)
      
      setGuideData(guides)
      alert('✅ AI 가이드가 생성되었습니다!')
    } catch (error) {
      console.error('Error generating guide:', error)
      alert('가이드 생성 실패: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          week1_guide: JSON.stringify(guideData.week1),
          week2_guide: JSON.stringify(guideData.week2),
          week3_guide: JSON.stringify(guideData.week3),
          week4_guide: JSON.stringify(guideData.week4),
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
      
      if (error) throw error
      
      alert('✅ 가이드가 저장되었습니다!')
      if (onSave) onSave()
      onClose()
    } catch (error) {
      console.error('Error saving guide:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const addItem = (week, field) => {
    setGuideData(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: [...prev[week][field], '']
      }
    }))
  }

  const removeItem = (week, field, index) => {
    setGuideData(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: prev[week][field].filter((_, i) => i !== index)
      }
    }))
  }

  const updateItem = (week, field, index, value) => {
    setGuideData(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: prev[week][field].map((item, i) => i === index ? value : item)
      }
    }))
  }

  const updateField = (week, field, value) => {
    setGuideData(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: value
      }
    }))
  }

  const currentWeekData = guideData[activeWeek]
  const weekNumber = activeWeek.replace('week', '')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold">🏆 4주 챌린지 가이드</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Week Tabs */}
        <div className="border-b">
          <div className="flex">
            {['week1', 'week2', 'week3', 'week4'].map((week, idx) => (
              <button
                key={week}
                onClick={() => setActiveWeek(week)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeWeek === week
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {idx + 1}주차 가이드
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* AI 생성 버튼 */}
            {activeWeek === 'week1' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800 mb-3">
                  캠페인 생성 시 작성한 내용을 바탕으로 AI가 4주차 가이드를 모두 생성합니다.
                </p>
                <Button
                  onClick={handleGenerateGuide}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    '🤖 AI로 가이드 생성'
                  )}
                </Button>
              </div>
            )}

            {/* 상품 정보 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📦 상품 정보 + 종합 정보
              </label>
              <textarea
                value={currentWeekData.product_info}
                onChange={(e) => updateField(activeWeek, 'product_info', e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="브랜드, 제품명, 주요 특징 등을 정리해주세요."
              />
            </div>

            {/* 미션 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 {weekNumber}주차 미션
              </label>
              <textarea
                value={currentWeekData.mission}
                onChange={(e) => updateField(activeWeek, 'mission', e.target.value)}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder={`${weekNumber}주차에 크리에이터가 수행할 미션을 작성해주세요.`}
              />
            </div>

            {/* 해시태그 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                #️⃣ 해시태그
              </label>
              {currentWeekData.hashtags.map((tag, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => updateItem(activeWeek, 'hashtags', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="#해시태그"
                  />
                  <button
                    onClick={() => removeItem(activeWeek, 'hashtags', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                onClick={() => addItem(activeWeek, 'hashtags')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                해시태그 추가
              </Button>
            </div>

            {/* 필수 대사 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💬 필수 대사 (3~5개)
              </label>
              {currentWeekData.required_dialogues.map((dialogue, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={dialogue}
                    onChange={(e) => updateItem(activeWeek, 'required_dialogues', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`필수 대사 ${index + 1}`}
                  />
                  {currentWeekData.required_dialogues.length > 3 && (
                    <button
                      onClick={() => removeItem(activeWeek, 'required_dialogues', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {currentWeekData.required_dialogues.length < 5 && (
                <Button
                  onClick={() => addItem(activeWeek, 'required_dialogues')}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  대사 추가
                </Button>
              )}
            </div>

            {/* 필수 촬영 장면 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎥 필수 촬영 장면 (3~5개)
              </label>
              {currentWeekData.required_scenes.map((scene, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <textarea
                    value={scene}
                    onChange={(e) => updateItem(activeWeek, 'required_scenes', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder={`필수 장면 ${index + 1}`}
                    rows={2}
                  />
                  {currentWeekData.required_scenes.length > 3 && (
                    <button
                      onClick={() => removeItem(activeWeek, 'required_scenes', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {currentWeekData.required_scenes.length < 5 && (
                <Button
                  onClick={() => addItem(activeWeek, 'required_scenes')}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  장면 추가
                </Button>
              )}
            </div>

            {/* 주의사항 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ⚠️ 주의사항
              </label>
              <textarea
                value={currentWeekData.cautions}
                onChange={(e) => updateField(activeWeek, 'cautions', e.target.value)}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="크리에이터가 반드시 지켜야 할 주의사항을 작성해주세요."
              />
            </div>

            {/* 참고 영상 URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔗 참고 영상 URL
              </label>
              {currentWeekData.reference_urls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateItem(activeWeek, 'reference_urls', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <button
                    onClick={() => removeItem(activeWeek, 'reference_urls', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                onClick={() => addItem(activeWeek, 'reference_urls')}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                URL 추가
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '💾 가이드 저장'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
