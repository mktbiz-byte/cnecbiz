import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function CampaignGuide4WeekChallenge() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [expandedWeek, setExpandedWeek] = useState(1)
  
  const [productData, setProductData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    product_key_points: ''
  })

  const [baseGuide, setBaseGuide] = useState('')

  const [weeklyGuides, setWeeklyGuides] = useState({
    week1: {
      mission: '',
      reference: '',
      required_dialogue: '',
      required_scenes: '',
      generated_guide: ''
    },
    week2: {
      mission: '',
      reference: '',
      required_dialogue: '',
      required_scenes: '',
      generated_guide: ''
    },
    week3: {
      mission: '',
      reference: '',
      required_dialogue: '',
      required_scenes: '',
      generated_guide: ''
    },
    week4: {
      mission: '',
      reference: '',
      required_dialogue: '',
      required_scenes: '',
      generated_guide: ''
    }
  })

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)

      // 기존 데이터가 있으면 로드
      setProductData({
        brand: data.brand || '',
        product_name: data.product_name || '',
        product_features: data.product_features || '',
        product_key_points: data.product_key_points || ''
      })

      setBaseGuide(data.challenge_base_guide || '')

      // 주차별 가이드 로드
      if (data.challenge_weekly_guides) {
        setWeeklyGuides(data.challenge_weekly_guides)
      }
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)

    try {
      const { error } = await supabaseBiz
        .from('campaigns')
        .update({
          brand: productData.brand,
          product_name: productData.product_name,
          product_features: productData.product_features,
          product_key_points: productData.product_key_points,
          challenge_base_guide: baseGuide,
          challenge_weekly_guides: weeklyGuides
        })
        .eq('id', id)

      if (error) throw error

      alert('임시 저장되었습니다.')
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateWeeklyGuide = async (week) => {
    const weekData = weeklyGuides[week]
    
    if (!weekData.mission || !weekData.required_dialogue || !weekData.required_scenes) {
      alert(`Week ${week.replace('week', '')} 필수 항목을 모두 입력해주세요.`)
      return
    }

    setGenerating(true)

    try {
      // Gemini API를 사용한 AI 가이드 생성
      const weekNumber = week.replace('week', '')
      const prompt = `당신은 전문 마케팅 콘텐츠 기획자입니다. 4주 챌린지 캠페인의 Week ${weekNumber} 가이드를 작성해주세요.

[제품 정보]
브랜드: ${productData.brand}
제품명: ${productData.product_name}
제품 특징: ${productData.product_features}
핵심 포인트: ${productData.product_key_points}

[기본 가이드]
${baseGuide}

[Week ${weekNumber} 미션]
${weekData.mission}

[참고 레퍼런스]
${weekData.reference || '없음'}

[필수 대사]
${weekData.required_dialogue}

[필수 장면]
${weekData.required_scenes}

위 정보를 바탕으로 크리에이터가 실제로 촬영할 수 있는 상세한 콘텐츠 가이드를 작성해주세요.
다음 항목을 포함해야 합니다:
1. 콘텐츠 개요 (이번 주차의 목표와 메시지)
2. 촬영 가이드 (구체적인 장면 구성과 순서)
3. 필수 요소 체크리스트 (반드시 포함해야 할 대사와 장면)
4. 편집 팁 (영상 분위기, 음악, 자막 등)
5. 주의사항

전문적이고 실용적인 가이드를 작성해주세요.`

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + import.meta.env.VITE_GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })

      if (!response.ok) throw new Error('AI 생성 실패')
      
      const data = await response.json()
      const generatedGuide = data.candidates[0].content.parts[0].text
      
      setWeeklyGuides(prev => ({
        ...prev,
        [week]: {
          ...prev[week],
          generated_guide: generatedGuide
        }
      }))

      alert(`Week ${weekNumber} 가이드가 생성되었습니다!`)
    } catch (error) {
      console.error('Error generating guide:', error)
      alert('가이드 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleFinalizeGuide = async () => {
    // 필수 항목 체크
    if (!productData.brand || !productData.product_name || !productData.product_features || !productData.product_key_points) {
      alert('제품 정보를 모두 입력해주세요.')
      return
    }

    if (!baseGuide) {
      alert('기본 가이드를 입력해주세요.')
      return
    }

    // 모든 주차 가이드 체크
    const allWeeksComplete = Object.keys(weeklyGuides).every(week => {
      const data = weeklyGuides[week]
      return data.mission && data.required_dialogue && data.required_scenes && data.generated_guide
    })

    if (!allWeeksComplete) {
      alert('모든 주차의 가이드를 생성해주세요.')
      return
    }

    setGenerating(true)

    try {
      // 먼저 데이터 저장
      const { error: updateError } = await supabaseBiz
        .from('campaigns')
        .update({
          brand: productData.brand,
          product_name: productData.product_name,
          product_features: productData.product_features,
          product_key_points: productData.product_key_points,
          challenge_base_guide: baseGuide,
          challenge_weekly_guides: weeklyGuides
        })
        .eq('id', id)

      if (updateError) throw updateError

      alert('4주 챌린지 가이드가 완성되었습니다! 리뷰 페이지로 이동합니다.')
      navigate(`/company/campaigns/${id}/review`)
    } catch (error) {
      console.error('Error finalizing guide:', error)
      alert('가이드 완성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const updateWeeklyGuide = (week, field, value) => {
    setWeeklyGuides(prev => ({
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
      <div className="max-w-4xl mx-auto p-6">
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
            <p>기본 가이드 + 주차별 미션 가이드를 작성해주세요.</p>
            <p className="mt-1">각 주차별로 가이드를 생성하고, 스케줄에 맞춰 크리에이터에게 발송됩니다.</p>
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
                  value={productData.brand}
                  onChange={(e) => setProductData({ ...productData, brand: e.target.value })}
                  placeholder="예: ABC Beauty"
                  required
                />
              </div>

              {/* 제품명 */}
              <div>
                <label className="block mb-2">
                  <span className="text-base font-semibold">제품명</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Input
                  value={productData.product_name}
                  onChange={(e) => setProductData({ ...productData, product_name: e.target.value })}
                  placeholder="예: 히알루론산 수분 크림"
                  required
                />
              </div>

              {/* 제품 특징 */}
              <div>
                <label className="block mb-2">
                  <span className="text-base font-semibold">제품 특징</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  제품의 주요 성분, 효능, 특징 등을 상세히 작성해주세요.
                </p>
                <textarea
                  value={productData.product_features}
                  onChange={(e) => setProductData({ ...productData, product_features: e.target.value })}
                  placeholder="예:&#10;- 주요 성분: 히알루론산, 세라마이드, 나이아신아마이드&#10;- 효능: 24시간 수분 지속, 피부 장벽 강화, 브라이트닝&#10;- 특징: 끈적임 없는 수분 제형, 민감성 피부 테스트 완료"
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                  required
                />
              </div>

              {/* 핵심 소구 포인트 */}
              <div>
                <label className="block mb-2">
                  <span className="text-base font-semibold">영상에 꼭 들어갈 제품 소구 포인트</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  크리에이터가 영상에서 반드시 강조해야 할 핵심 메시지를 작성해주세요.
                </p>
                <textarea
                  value={productData.product_key_points}
                  onChange={(e) => setProductData({ ...productData, product_key_points: e.target.value })}
                  placeholder="예:&#10;- 24시간 수분 지속력 강조&#10;- 끈적임 없는 텍스처 언급&#10;- 4주 사용 시 피부 변화 강조&#10;- 민감성 피부도 사용 가능하다는 점 강조"
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* 기본 가이드 */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-xl font-semibold mb-4">📋 기본 가이드 (전체 캠페인 개요)</h3>
            <p className="text-sm text-gray-600 mb-3">
              4주 챌린지 전체 개요, 참여 방법, 주의사항 등을 작성해주세요.
            </p>
            <textarea
              value={baseGuide}
              onChange={(e) => setBaseGuide(e.target.value)}
              placeholder="예:&#10;[4주 챌린지 개요]&#10;- 4주간 매주 1회 콘텐츠 제작 및 업로드&#10;- 제품 사용 전후 변화 기록&#10;- 주차별 미션 수행 및 인증&#10;&#10;[참여 방법]&#10;- 매주 월요일 새로운 미션 발송&#10;- 해당 주 일요일까지 콘텐츠 업로드&#10;- URL 및 영상 파일 제출&#10;&#10;[주의사항]&#10;- 제품은 매일 사용해주세요&#10;- 솔직한 후기 작성 권장&#10;- 브랜드명 및 제품명 정확히 언급"
              className="w-full h-48 p-3 border rounded-lg resize-none"
              required
            />
          </div>

          {/* 주차별 가이드 */}
          {[1, 2, 3, 4].map(weekNum => {
            const weekKey = `week${weekNum}`
            const weekData = weeklyGuides[weekKey]
            const isExpanded = expandedWeek === weekNum
            const deadline = campaign[`week${weekNum}_deadline`]

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
                    <h3 className="text-xl font-semibold">주차별 미션 가이드</h3>
                    {weekData.generated_guide && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                        생성 완료
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>

                <p className="text-sm text-gray-600 mt-2">
                  마감일: <span className="font-semibold">{deadline || '미설정'}</span>
                </p>

                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    {/* 주차별 미션 */}
                    <div>
                      <label className="block mb-2">
                        <span className="text-base font-semibold">주차별 미션</span>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        이번 주에 크리에이터가 수행할 미션을 작성해주세요.
                      </p>
                      <textarea
                        value={weekData.mission}
                        onChange={(e) => updateWeeklyGuide(weekKey, 'mission', e.target.value)}
                        placeholder={`예:&#10;Week ${weekNum} 미션: ${weekNum === 1 ? '첫 사용 후기 및 텍스처 소개' : weekNum === 2 ? '1주차 사용 후 피부 변화 체크' : weekNum === 3 ? '3주차 중간 점검 및 루틴 공유' : '4주 완주 후 최종 비포/애프터'}`}
                        className="w-full h-24 p-3 border rounded-lg resize-none"
                        required
                      />
                    </div>

                    {/* 참고 레퍼런스 */}
                    <div>
                      <label className="block mb-2">
                        <span className="text-base font-semibold">참고 레퍼런스</span>
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        참고할 영상 링크, 이미지 URL 등을 입력해주세요. (선택사항)
                      </p>
                      <Input
                        value={weekData.reference}
                        onChange={(e) => updateWeeklyGuide(weekKey, 'reference', e.target.value)}
                        placeholder="예: https://youtube.com/example"
                      />
                    </div>

                    {/* 필수 대사 */}
                    <div>
                      <label className="block mb-2">
                        <span className="text-base font-semibold">필수 대사</span>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        이번 주 영상에 반드시 포함되어야 할 대사를 작성해주세요.
                      </p>
                      <textarea
                        value={weekData.required_dialogue}
                        onChange={(e) => updateWeeklyGuide(weekKey, 'required_dialogue', e.target.value)}
                        placeholder={`예:&#10;- "${weekNum}주차 챌린지 시작!"&#10;- "확실히 피부가 ${weekNum === 1 ? '촉촉해진 느낌' : weekNum === 2 ? '좀 더 밝아진 것 같아요' : weekNum === 3 ? '탄력이 생긴 것 같아요' : '완전히 달라졌어요'}"&#10;- "ABC Beauty 수분 크림 ${weekNum}주 사용 후기"`}
                        className="w-full h-32 p-3 border rounded-lg resize-none"
                        required
                      />
                    </div>

                    {/* 필수 장면 */}
                    <div>
                      <label className="block mb-2">
                        <span className="text-base font-semibold">필수 장면</span>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <p className="text-sm text-gray-600 mb-2">
                        이번 주 영상에 반드시 포함되어야 할 촬영 장면을 작성해주세요.
                      </p>
                      <textarea
                        value={weekData.required_scenes}
                        onChange={(e) => updateWeeklyGuide(weekKey, 'required_scenes', e.target.value)}
                        placeholder={`예:&#10;- 제품 클로즈업 (브랜드명 명확히)&#10;- ${weekNum === 1 ? '언박싱 또는 첫 사용 장면' : weekNum === 2 ? '피부 상태 체크 (거울 앞)' : weekNum === 3 ? '일상 루틴에 제품 사용하는 장면' : '비포/애프터 비교 (Week 1 vs Week 4)'}&#10;- 텍스처 시연 (손등 또는 얼굴)&#10;- 사용 후 표정 (만족스러운 느낌)`}
                        className="w-full h-32 p-3 border rounded-lg resize-none"
                        required
                      />
                    </div>

                    {/* 생성된 가이드 미리보기 */}
                    {weekData.generated_guide && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-green-800 mb-2">✓ 생성된 가이드</p>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">{weekData.generated_guide}</pre>
                      </div>
                    )}

                    {/* 주차별 가이드 생성 버튼 */}
                    <Button
                      type="button"
                      onClick={() => handleGenerateWeeklyGuide(weekKey)}
                      disabled={generating}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Week {weekNum} 가이드 생성
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 버튼 */}
        <div className="flex gap-4 mt-8">
          <Button
            type="button"
            onClick={handleSaveDraft}
            variant="outline"
            disabled={loading || generating}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '임시 저장'
            )}
          </Button>

          <Button
            type="button"
            onClick={handleFinalizeGuide}
            disabled={loading || generating}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                완성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                가이드 완성
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
