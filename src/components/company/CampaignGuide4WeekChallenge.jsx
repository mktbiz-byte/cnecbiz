import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseKorea } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Lightbulb, X } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import { missionExamples } from './missionExamples'

export default function CampaignGuide4WeekChallenge() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [expandedWeek, setExpandedWeek] = useState(1)
  const [showExamplesModal, setShowExamplesModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('skinTrouble')
  const [currentWeekForExample, setCurrentWeekForExample] = useState(1)
  
  const [guideData, setGuideData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    precautions: '',
    week1: {
      mission: '',
      required_dialogue: '',
      required_scenes: '',
      reference_url: ''
    },
    week2: {
      mission: '',
      required_dialogue: '',
      required_scenes: '',
      reference_url: ''
    },
    week3: {
      mission: '',
      required_dialogue: '',
      required_scenes: '',
      reference_url: ''
    },
    week4: {
      mission: '',
      required_dialogue: '',
      required_scenes: '',
      reference_url: ''
    }
  })

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)

      // 기존 데이터가 있으면 로드
      if (data.challenge_guide_data) {
        setGuideData(data.challenge_guide_data)
      } else if (data.challenge_base_guide || data.challenge_weekly_guides) {
        // 이전 구조의 데이터를 새 구조로 변환
        const oldWeeklyGuides = data.challenge_weekly_guides || {}
        setGuideData({
          brand: data.brand || '',
          product_name: data.product_name || '',
          product_features: data.product_features || '',
          precautions: data.product_key_points || '',
          week1: {
            mission: oldWeeklyGuides.week1?.mission || '',
            required_dialogue: oldWeeklyGuides.week1?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week1?.required_scenes || '',
            reference_url: oldWeeklyGuides.week1?.reference || ''
          },
          week2: {
            mission: oldWeeklyGuides.week2?.mission || '',
            required_dialogue: oldWeeklyGuides.week2?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week2?.required_scenes || '',
            reference_url: oldWeeklyGuides.week2?.reference || ''
          },
          week3: {
            mission: oldWeeklyGuides.week3?.mission || '',
            required_dialogue: oldWeeklyGuides.week3?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week3?.required_scenes || '',
            reference_url: oldWeeklyGuides.week3?.reference || ''
          },
          week4: {
            mission: oldWeeklyGuides.week4?.mission || '',
            required_dialogue: oldWeeklyGuides.week4?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week4?.required_scenes || '',
            reference_url: oldWeeklyGuides.week4?.reference || ''
          }
        })
      } else {
        // 브랜드명과 제품명 자동 입력
        setGuideData(prev => ({
          ...prev,
          brand: data.brand || '',
          product_name: data.product_name || ''
        }))
      }
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      // 기존 데이터베이스 구조에 맞춰 저장
      const { error } = await supabaseKorea
        .from('campaigns')
        .update({
          brand: guideData.brand,
          product_name: guideData.product_name,
          product_features: guideData.product_features,
          product_key_points: guideData.precautions,
          challenge_weekly_guides: {
            week1: {
              mission: guideData.week1.mission,
              required_dialogue: guideData.week1.required_dialogue,
              required_scenes: guideData.week1.required_scenes,
              reference: guideData.week1.reference_url
            },
            week2: {
              mission: guideData.week2.mission,
              required_dialogue: guideData.week2.required_dialogue,
              required_scenes: guideData.week2.required_scenes,
              reference: guideData.week2.reference_url
            },
            week3: {
              mission: guideData.week3.mission,
              required_dialogue: guideData.week3.required_dialogue,
              required_scenes: guideData.week3.required_scenes,
              reference: guideData.week3.reference_url
            },
            week4: {
              mission: guideData.week4.mission,
              required_dialogue: guideData.week4.required_dialogue,
              required_scenes: guideData.week4.required_scenes,
              reference: guideData.week4.reference_url
            }
          }
        })
        .eq('id', id)

      if (error) throw error

      alert('저장되었습니다.')
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    // 필수 항목 체크
    if (!guideData.brand || !guideData.product_name || !guideData.product_features || !guideData.precautions) {
      alert('제품 정보와 주의사항을 모두 입력해주세요.')
      return
    }

    // 1주차 가이드 체크
    if (!guideData.week1.mission || !guideData.week1.required_dialogue || !guideData.week1.required_scenes) {
      alert('1주차 가이드를 모두 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      // 먼저 원본 데이터 저장
      const { error: saveError } = await supabaseKorea
        .from('campaigns')
        .update({
          brand: guideData.brand,
          product_name: guideData.product_name,
          product_features: guideData.product_features,
          product_key_points: guideData.precautions,
          challenge_weekly_guides: {
            week1: {
              mission: guideData.week1.mission,
              required_dialogue: guideData.week1.required_dialogue,
              required_scenes: guideData.week1.required_scenes,
              reference: guideData.week1.reference_url
            },
            week2: {
              mission: guideData.week2.mission,
              required_dialogue: guideData.week2.required_dialogue,
              required_scenes: guideData.week2.required_scenes,
              reference: guideData.week2.reference_url
            },
            week3: {
              mission: guideData.week3.mission,
              required_dialogue: guideData.week3.required_dialogue,
              required_scenes: guideData.week3.required_scenes,
              reference: guideData.week3.reference_url
            },
            week4: {
              mission: guideData.week4.mission,
              required_dialogue: guideData.week4.required_dialogue,
              required_scenes: guideData.week4.required_scenes,
              reference: guideData.week4.reference_url
            }
          }
        })
        .eq('id', id)

      if (saveError) throw saveError

      // AI로 가이드 가공
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      // 주차별 가이드 생성
      const weeklyGuidesAI = {}
      
      for (let weekNum = 1; weekNum <= 4; weekNum++) {
        const weekKey = `week${weekNum}`
        const weekData = guideData[weekKey]
        
        // 해당 주차 데이터가 있을 때만 AI 가공
        if (weekData.mission || weekData.required_dialogue || weekData.required_scenes) {
          const prompt = `당신은 4주 챌린지 캠페인 전문 기획자입니다. 다음 정보를 바탕으로 ${weekNum}주차 가이드를 전문적으로 가공해주세요.

**제품 정보**
- 브랜드: ${guideData.brand}
- 제품명: ${guideData.product_name}
- 제품 특징: ${guideData.product_features}
- 주의사항: ${guideData.precautions}

**${weekNum}주차 가이드 초안**
- 미션: ${weekData.mission}
- 필수 대사: ${weekData.required_dialogue}
- 필수 촬영 장면: ${weekData.required_scenes}

위 초안을 바탕으로 크리에이터가 실제로 사용할 수 있는 구체적이고 전문적인 가이드를 작성해주세요.
- 미션의 목적과 핵심 메시지를 명확히 전달
- 구체적인 촬영 방법과 예시 포함
- 크리에이터가 바로 실행할 수 있도록 단계별 액션 아이템 제시

**응답 형식 (JSON):**
{
  "mission_enhanced": "미션 설명 (전문적으로 가공된 버전)",
  "required_dialogue_enhanced": "필수 대사 (구체적이고 자연스러운 대사 예시)",
  "required_scenes_enhanced": "필수 촬영 장면 (구체적인 촬영 방법과 예시)"
}

JSON 형식으로 작성해주세요.`

          try {
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

            if (response.ok) {
              const result = await response.json()
              const generatedText = result.candidates[0].content.parts[0].text
              
              try {
                const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0])
                  weeklyGuidesAI[weekKey] = {
                    mission: parsed.mission_enhanced || weekData.mission,
                    required_dialogue: parsed.required_dialogue_enhanced || weekData.required_dialogue,
                    required_scenes: parsed.required_scenes_enhanced || weekData.required_scenes,
                    reference: weekData.reference_url
                  }
                }
              } catch (e) {
                console.error(`Week ${weekNum} JSON 파싱 실패:`, e)
                // 파싱 실패 시 원본 사용
                weeklyGuidesAI[weekKey] = {
                  mission: weekData.mission,
                  required_dialogue: weekData.required_dialogue,
                  required_scenes: weekData.required_scenes,
                  reference: weekData.reference_url
                }
              }
            }
          } catch (aiError) {
            console.error(`Week ${weekNum} AI 생성 실패:`, aiError)
            // AI 실패 시 원본 사용
            weeklyGuidesAI[weekKey] = {
              mission: weekData.mission,
              required_dialogue: weekData.required_dialogue,
              required_scenes: weekData.required_scenes,
              reference: weekData.reference_url
            }
          }
        }
      }

      // 간단한 AI 가이드 생성
      const simpleGuidesAI = {}
      
      for (let weekNum = 1; weekNum <= 4; weekNum++) {
        const weekKey = `week${weekNum}`
        const weekData = guideData[weekKey]
        
        if (!weekData.mission || weekData.mission.trim() === '') {
          // 미기입 시
          simpleGuidesAI[weekKey] = '미정'
        } else {
          // 기입 시 - AI로 간단한 메시지 생성
          const prompt = `다음은 4주 챌린지 캠페인의 ${weekNum}주차 미션입니다.

**제품 정보**
- 브랜드: ${guideData.brand}
- 제품명: ${guideData.product_name}
- 제품 특징: ${guideData.product_features}

**${weekNum}주차 미션**
${weekData.mission}

위 미션을 바탕으로 크리에이터가 해당 주차에 무엇을 촬영해야 하는지 간단하고 명확하게 알려주세요.
- 2-3문장 이내로 작성
- "해당 미션에 맞게 촬영 필수"라는 메시지 포함
- 구체적인 촬영 방법이나 대사는 필요 없음

간단한 텍스트로만 작성해주세요.`

          try {
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

            if (response.ok) {
              const result = await response.json()
              const generatedText = result.candidates[0].content.parts[0].text
              simpleGuidesAI[weekKey] = generatedText.trim()
            } else {
              simpleGuidesAI[weekKey] = `${weekNum}주차 미션: ${weekData.mission}\n\n해당 미션에 맞게 촬영해주세요.`
            }
          } catch (aiError) {
            console.error(`Week ${weekNum} AI 생성 실패:`, aiError)
            simpleGuidesAI[weekKey] = `${weekNum}주차 미션: ${weekData.mission}\n\n해당 미션에 맞게 촬영해주세요.`
          }
        }
      }

      // AI 가이드 저장 (challenge_weekly_guides_ai JSON)
      const updateData = {
        challenge_weekly_guides_ai: simpleGuidesAI,
        guide_generated_at: new Date().toISOString()
      }

      const { error: aiUpdateError } = await supabaseKorea
        .from('campaigns')
        .update(updateData)
        .eq('id', id)

      if (aiUpdateError) throw aiUpdateError

      alert('4주 챌린지 가이드가 생성되었습니다! 가이드를 확인하고 결제를 진행하세요.')
      navigate(`/company/campaigns/${id}/guide/4week/review`)
    } catch (error) {
      console.error('Error completing guide:', error)
      alert('가이드 완성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateGuideData = (field, value) => {
    setGuideData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateWeekData = (week, field, value) => {
    setGuideData(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: value
      }
    }))
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <>
      <CompanyNavigation />
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            🏆 4주 챌린지 가이드 작성
          </h1>
          <p className="text-gray-600">
            캠페인: <span className="font-semibold">{campaign.title}</span>
          </p>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-semibold mb-1">4주 챌린지 안내</p>
            <p>제품 정보 + 주의사항 + 주차별 미션 가이드를 작성해주세요.</p>
            <p className="mt-1">2~4주차 가이드는 캠페인 진행 중 생성 가능합니다.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 제품 기본 정보 */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-xl font-semibold mb-4">📦 제품 기본 정보</h3>
            
            <div className="space-y-4">
              {/* 브랜드명 */}
              <div>
                <label className="block mb-2">
                  <span className="text-base font-semibold">브랜드명</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Input
                  value={guideData.brand}
                  onChange={(e) => updateGuideData('brand', e.target.value)}
                  placeholder="예: SNP"
                />
              </div>

              {/* 제품명 */}
              <div>
                <label className="block mb-2">
                  <span className="text-base font-semibold">제품명</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Input
                  value={guideData.product_name}
                  onChange={(e) => updateGuideData('product_name', e.target.value)}
                  placeholder="예: 콜라겐 마스크팩"
                />
              </div>

              {/* 제품 특징 */}
              <div>
                <label className="block mb-2">
                  <span className="text-base font-semibold">제품 특징</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  제품의 주요 성분, 효능, 특징을 작성해주세요. (여러 버전 예시 가능)
                </p>
                <textarea
                  value={guideData.product_features}
                  onChange={(e) => updateGuideData('product_features', e.target.value)}
                  placeholder={`예시 1: 콜라겐 함유로 탄력 개선, 24시간 촉촉함 유지
예시 2: 모공 축소와 피부결 개선에 효과적
예시 3: 저자극 성분으로 민감성 피부도 안심`}
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                />
              </div>

              {/* 주의사항 */}
              <div>
                <label className="block mb-2">
                  <span className="text-base font-semibold">주의사항</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  크리에이터가 반드시 지켜야 할 주의사항을 작성해주세요.
                </p>
                <textarea
                  value={guideData.precautions}
                  onChange={(e) => updateGuideData('precautions', e.target.value)}
                  placeholder={`예:
- 제품명과 브랜드명 정확히 언급
- 과장된 효능 표현 금지
- 개인적인 사용 경험 중심으로 작성
- 타 제품 비교 금지`}
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                />
              </div>
            </div>
          </div>

          {/* 주차별 가이드 */}
          {['week1', 'week2', 'week3', 'week4'].map((weekKey) => {
            const weekNum = parseInt(weekKey.replace('week', ''))
            const weekData = guideData[weekKey]
            const isExpanded = expandedWeek === weekNum
            
            return (
              <div key={weekKey} className="bg-white rounded-lg border border-purple-200 p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedWeek(isExpanded ? null : weekNum)}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                      Week {weekNum}
                    </span>
                    <h3 className="text-xl font-semibold">
                      {weekNum === 1 ? '주차별 미션 가이드' : '주차별 미션 가이드 (진행하면서 생성 가능)'}
                    </h3>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>

                {isExpanded && (
                  <div className="mt-6 space-y-6">
                    {/* 미션 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <span className="text-base font-semibold">{weekNum}주차 미션</span>
                          <span className="text-red-500">*</span>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentWeekForExample(weekNum)
                            setShowExamplesModal(true)
                          }}
                          className="flex items-center gap-1 text-sm"
                        >
                          <Lightbulb className="w-4 h-4" />
                          미션 예시 보기
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        이번 주차의 핵심 미션을 작성해주세요. (여러 버전 예시 가능)
                      </p>
                      <textarea
                        value={weekData.mission}
                        onChange={(e) => updateWeekData(weekKey, 'mission', e.target.value)}
                        placeholder={`예시 1: 제품 첫 사용 후기와 첫인상 공유
예시 2: 언박싱부터 첫 사용까지의 과정 기록
예시 3: 제품의 텍스처와 향, 발림성 소개`}
                        className="w-full h-32 p-3 border rounded-lg resize-none"
                      />
                    </div>

                    {/* 필수 대사 */}
                    <div>
                      <label className="block mb-2">
                        <span className="text-base font-semibold">필수 대사</span>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        영상에 반드시 포함되어야 할 대사를 작성해주세요. (여러 버전 예시 가능)
                      </p>
                      <textarea
                        value={weekData.required_dialogue}
                        onChange={(e) => updateWeekData(weekKey, 'required_dialogue', e.target.value)}
                        placeholder={`예시 대사 1: "안녕하세요! 오늘은 콜라겐 마스크팩 4주 챌린지 첫 번째 미션입니다!"
예시 대사 2: "SNP 콜라겐 마스크팩으로 시작하는 꿀피부 챌린지, 24시간 촉촉함의 경험을 공유하고 함께 변화를 만들어가요!"
예시 대사 3: "모공 피부가 푸석했는데 고민이었는데..."

* 해시태그: #SNP콜라겐챌린지 #콜라겐마스크팩 #꿀촉미부 #피부변화 #챗사용후기 #피부고민 #미부개선`}
                        className="w-full h-40 p-3 border rounded-lg resize-none"
                      />
                    </div>

                    {/* 필수 장면 */}
                    <div>
                      <label className="block mb-2">
                        <span className="text-base font-semibold">필수 장면</span>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        영상에 반드시 포함되어야 할 촬영 장면을 작성해주세요.
                      </p>
                      <textarea
                        value={weekData.required_scenes}
                        onChange={(e) => updateWeekData(weekKey, 'required_scenes', e.target.value)}
                        placeholder={`필수 장면:
1. 오프닝: 꿀피부의 시작 - 밝고 활기찬 모습으로 등장, "안녕하세요! 오늘은 콜라겐 마스크팩 4주 챌린지 첫 번째 미션입니다!" 라고 소개
2. 현재 피부 상태 공개 (Before): 민낯 또는 가벼운 메이크업 상태로 피부 고민 공개 (건조함, 각질함 등)
3. 제품 소개 & 언박싱: SNP 콜라겐 마스크팩을 소개하고, 패키지를 깨끗하게 보여주기
4. 제품 사용: 마스크팩 디자인, 텍스처 등을 자세히 보여주기, 자막으로 제품명 강조
5. 사용 후 느낌: 피부 변화를 확인하고 느낌을 표현`}
                        className="w-full h-56 p-3 border rounded-lg resize-none"
                      />
                    </div>

                    {/* 레퍼런스 영상 URL */}
                    <div>
                      <label className="block mb-2">
                        <span className="text-base font-semibold">레퍼런스 영상 URL</span>
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        참고할 수 있는 영상 링크를 입력해주세요. (선택사항)
                      </p>
                      <Input
                        value={weekData.reference_url}
                        onChange={(e) => updateWeekData(weekKey, 'reference_url', e.target.value)}
                        placeholder="예: https://www.youtube.com/watch?v=..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-end sticky bottom-6 bg-white p-4 rounded-lg border shadow-lg">
            <Button
              onClick={handleSave}
              variant="outline"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              임시 저장
            </Button>
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              가이드 완성 및 견적서 확인
            </Button>
          </div>
        </div>
      </div>

      {/* 미션 예시 모달 */}
      {showExamplesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                {currentWeekForExample}주차 미션 예시
              </h3>
              <button
                onClick={() => setShowExamplesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 카테고리 탭 */}
            <div className="flex gap-2 p-4 border-b overflow-x-auto">
              {Object.entries(missionExamples).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* 예시 목록 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-3">
                {missionExamples[selectedCategory].missions.map((mission, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const weekKey = `week${currentWeekForExample}`
                      updateWeekData(weekKey, 'mission', mission)
                      setShowExamplesModal(false)
                    }}
                    className="text-left p-4 border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-semibold text-gray-400 group-hover:text-purple-600 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">
                        {mission}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                예시를 클릭하면 해당 주차 미션에 자동으로 입력됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
