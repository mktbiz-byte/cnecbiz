import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseKorea } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function CampaignGuideOliveYoung() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [campaign, setCampaign] = useState(null)
  
  const [productData, setProductData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    product_key_points: ''
  })

  const [step1Guide, setStep1Guide] = useState('')
  const [step2Guide, setStep2Guide] = useState('')
  const [step3Guide, setStep3Guide] = useState('')

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
      setProductData({
        brand: data.brand || '',
        product_name: data.product_name || '',
        product_features: data.product_features || '',
        product_key_points: data.product_key_points || ''
      })

      // 올영세일 가이드 데이터 로드
      setStep1Guide(data.oliveyoung_step1_guide || '')
      setStep2Guide(data.oliveyoung_step2_guide || '')
      setStep3Guide(data.oliveyoung_step3_guide || '')
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)

    try {
      const { error } = await supabaseKorea
        .from('campaigns')
        .update({
          brand: productData.brand,
          product_name: productData.product_name,
          product_features: productData.product_features,
          product_key_points: productData.product_key_points,
          oliveyoung_step1_guide: step1Guide,
          oliveyoung_step2_guide: step2Guide,
          oliveyoung_step3_guide: step3Guide
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

  const handleGenerateGuide = async () => {
    // 필수 항목 체크
    if (!productData.brand || !productData.product_name || !productData.product_features || !productData.product_key_points) {
      alert('제품 정보를 모두 입력해주세요.')
      return
    }

    if (!step1Guide || !step2Guide || !step3Guide) {
      alert('3단계 가이드를 모두 입력해주세요.')
      return
    }

    setGenerating(true)

    try {
      // 먼저 데이터 저장
      const { error: updateError } = await supabaseKorea
        .from('campaigns')
        .update({
          brand: productData.brand,
          product_name: productData.product_name,
          product_features: productData.product_features,
          product_key_points: productData.product_key_points,
          oliveyoung_step1_guide: step1Guide,
          oliveyoung_step2_guide: step2Guide,
          oliveyoung_step3_guide: step3Guide
        })
        .eq('id', id)

      if (updateError) throw updateError

      // AI 가이드 생성
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      const prompt = `당신은 올리브영 세일 캐페인 전문 기획자입니다. 다음 정보를 바탕으로 3단계 콘텐츠 제작 가이드를 생성해주세요.

**제품 정보**
- 브랜드: ${productData.brand}
- 제품명: ${productData.product_name}
- 제품 특징: ${productData.product_features}
- 핵심 포인트: ${productData.product_key_points}

**STEP 1 가이드 (상품 리뷰)**
${step1Guide}

**STEP 2 가이드 (세일 홈보)**
${step2Guide}

**STEP 3 가이드 (세일 당일 스토리)**
${step3Guide}

위 내용을 바탕으로 크리에이터가 실제로 사용할 수 있는 상세하고 전문적인 콘텐츠 제작 가이드를 작성해주세요.

**응답 형식 (JSON):**
{
  "shooting_tips": "촬영 팁 내용 (조명, 각도, 배경, 소품 활용 등)",
  "cautions": "주의사항 내용 (금지 사항, 필수 포함 요소, 법적 고지사항 등)"
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
      let shootingTips = ''
      let cautions = ''
      try {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          shootingTips = parsed.shooting_tips || ''
          cautions = parsed.cautions || ''
        }
      } catch (e) {
        console.error('JSON 파싱 실패:', e)
        shootingTips = generatedText
      }

      // 생성된 가이드를 DB에 저장
      const { error: finalUpdateError } = await supabaseKorea
        .from('campaigns')
        .update({
          shooting_tips: shootingTips,
          cautions: cautions,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (finalUpdateError) throw finalUpdateError

      alert('올영세일 가이드가 생성되었습니다! 미리보기 페이지로 이동합니다.')
      navigate(`/company/campaigns/${id}/guide/oliveyoung/preview`)
    } catch (error) {
      console.error('Error generating guide:', error)
      alert('가이드 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setGenerating(false)
    }
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
            🌸 올영세일 캠페인 가이드 작성
          </h1>
          <p className="text-gray-600">
            캠페인: <span className="font-semibold">{campaign.title}</span>
          </p>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-pink-800">
            <p className="font-semibold mb-1">올영세일 캠페인 안내</p>
            <p>3단계 콘텐츠 제작을 위한 통합 가이드를 작성해주세요.</p>
            <p className="mt-1">STEP 1: 상품 리뷰 → STEP 2: 세일 홍보 → STEP 3: 세일 당일 스토리</p>
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
                  placeholder="예:&#10;- 24시간 수분 지속력 강조&#10;- 끈적임 없는 텍스처 언급&#10;- 민감성 피부도 사용 가능하다는 점 강조&#10;- 올영세일 특가 정보 명시"
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* STEP 1: 상품 리뷰 가이드 */}
          <div className="bg-white rounded-lg border border-pink-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">STEP 1</span>
              <h3 className="text-xl font-semibold">상품 리뷰 콘텐츠 가이드</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              마감일: <span className="font-semibold">{campaign.step1_deadline || '미설정'}</span>
            </p>
            <p className="text-sm text-gray-600 mb-3">
              상품 리뷰 콘텐츠 제작을 위한 통합 가이드를 작성해주세요.
            </p>
            <textarea
              value={step1Guide}
              onChange={(e) => setStep1Guide(e.target.value)}
              placeholder="예:&#10;[콘텐츠 개요]&#10;- 올리브영 매장 방문 후 제품 구매 장면&#10;- 제품 언박싱 및 텍스처 소개&#10;- 사용 후기 및 효과 리뷰&#10;&#10;[필수 포함 요소]&#10;- 올리브영 매장 외관 또는 내부&#10;- 제품 패키징 클로즈업&#10;- 텍스처 시연 (손등 또는 얼굴)&#10;- 사용 전후 비교&#10;&#10;[필수 대사]&#10;- '올리브영에서 발견한 이 제품'&#10;- '24시간 수분 지속력이 정말 대박'&#10;- '곧 올영세일 시작하니까 꼭 체크하세요'"
              className="w-full h-64 p-3 border rounded-lg resize-none"
              required
            />
          </div>

          {/* STEP 2: 세일 홍보 가이드 */}
          <div className="bg-white rounded-lg border border-pink-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">STEP 2</span>
              <h3 className="text-xl font-semibold">세일 홍보 콘텐츠 가이드</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              마감일: <span className="font-semibold">{campaign.step2_deadline || '미설정'}</span>
            </p>
            <p className="text-sm text-gray-600 mb-3">
              세일 홍보 콘텐츠 제작을 위한 통합 가이드를 작성해주세요.
            </p>
            <textarea
              value={step2Guide}
              onChange={(e) => setStep2Guide(e.target.value)}
              placeholder="예:&#10;[콘텐츠 개요]&#10;- 올영세일 예고 및 할인 정보 강조&#10;- 제품 재사용 후기 및 추천 이유&#10;- 세일 기간 및 구매 방법 안내&#10;&#10;[필수 포함 요소]&#10;- 올영세일 앰블럼 또는 로고&#10;- 할인율 또는 특가 정보 텍스트&#10;- 제품 사용 장면 (일상 루틴)&#10;- 세일 기간 명시 (예: 3월 1~7일)&#10;&#10;[필수 대사]&#10;- '드디어 올영세일 시작!'&#10;- 'XX% 할인으로 만나보세요'&#10;- '이 가격이면 무조건 사야 해요'&#10;- '올리브영 앱에서 지금 바로 확인'"
              className="w-full h-64 p-3 border rounded-lg resize-none"
              required
            />
          </div>

          {/* STEP 3: 세일 당일 스토리 가이드 */}
          <div className="bg-white rounded-lg border border-pink-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">STEP 3</span>
              <h3 className="text-xl font-semibold">세일 당일 스토리 가이드</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              마감일: <span className="font-semibold">{campaign.step3_deadline || '미설정'}</span>
            </p>
            <p className="text-sm text-gray-600 mb-3">
              세일 당일 스토리 콘텐츠 제작을 위한 통합 가이드를 작성해주세요.
            </p>
            <p className="text-xs text-pink-600 mb-3">
              ℹ️ 본 영상은 STEP 2의 영상이 업로드 + URL이 삽입됩니다
            </p>
            <textarea
              value={step3Guide}
              onChange={(e) => setStep3Guide(e.target.value)}
              placeholder="예:&#10;[콘텐츠 개요]&#10;- 인스타그램 스토리 형식&#10;- STEP 2 영상 링크 공유&#10;- 세일 당일 긴급 알림 느낌&#10;&#10;[필수 포함 요소]&#10;- STEP 2 영상 썸네일 또는 링크&#10;- '오늘만' '지금 바로' 등 긴박감 텍스트&#10;- 올리브영 앱 링크 또는 QR 코드&#10;- 할인 종료 시간 카운트다운 (선택)&#10;&#10;[필수 대사/텍스트]&#10;- '오늘이 마지막 날!'&#10;- '지금 바로 올리브영 가세요'&#10;- '이 영상 보고 바로 구매했어요' (STEP 2 링크)&#10;- '세일 놓치지 마세요 🔥'"
              className="w-full h-64 p-3 border rounded-lg resize-none"
              required
            />
          </div>

          {/* 업로드 스케줄 체크리스트 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📅</span>
              <h3 className="text-xl font-semibold text-blue-900">업로드 스케줄 체크리스트</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              크리에이터가 각 STEP별 마감일을 명확히 확인하고 준수할 수 있도록 스케줄을 설정해주세요.
            </p>

            <div className="space-y-4">
              {/* STEP 1 스케줄 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-sm font-semibold">STEP 1</span>
                    <span className="font-semibold text-gray-800">상품 리뷰 콘텐츠</span>
                  </div>
                  <span className="text-xs text-gray-500">마감일</span>
                </div>
                <Input
                  type="datetime-local"
                  value={campaign.step1_deadline ? new Date(campaign.step1_deadline).toISOString().slice(0, 16) : ''}
                  onChange={async (e) => {
                    const newDeadline = e.target.value ? new Date(e.target.value).toISOString() : null
                    try {
                      await supabaseKorea
                        .from('campaigns')
                        .update({ step1_deadline: newDeadline })
                        .eq('id', id)
                      setCampaign({ ...campaign, step1_deadline: newDeadline })
                    } catch (error) {
                      console.error('Error updating deadline:', error)
                    }
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 제품 리뷰 영상 제작 및 업로드 마감일
                </p>
              </div>

              {/* STEP 2 스케줄 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-sm font-semibold">STEP 2</span>
                    <span className="font-semibold text-gray-800">세일 홍보 콘텐츠</span>
                  </div>
                  <span className="text-xs text-gray-500">마감일</span>
                </div>
                <Input
                  type="datetime-local"
                  value={campaign.step2_deadline ? new Date(campaign.step2_deadline).toISOString().slice(0, 16) : ''}
                  onChange={async (e) => {
                    const newDeadline = e.target.value ? new Date(e.target.value).toISOString() : null
                    try {
                      await supabaseKorea
                        .from('campaigns')
                        .update({ step2_deadline: newDeadline })
                        .eq('id', id)
                      setCampaign({ ...campaign, step2_deadline: newDeadline })
                    } catch (error) {
                      console.error('Error updating deadline:', error)
                    }
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 세일 홍보 영상 제작 및 업로드 마감일
                </p>
              </div>

              {/* STEP 3 스케줄 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-sm font-semibold">STEP 3</span>
                    <span className="font-semibold text-gray-800">세일 당일 스토리</span>
                  </div>
                  <span className="text-xs text-gray-500">마감일</span>
                </div>
                <Input
                  type="datetime-local"
                  value={campaign.step3_deadline ? new Date(campaign.step3_deadline).toISOString().slice(0, 16) : ''}
                  onChange={async (e) => {
                    const newDeadline = e.target.value ? new Date(e.target.value).toISOString() : null
                    try {
                      await supabaseKorea
                        .from('campaigns')
                        .update({ step3_deadline: newDeadline })
                        .eq('id', id)
                      setCampaign({ ...campaign, step3_deadline: newDeadline })
                    } catch (error) {
                      console.error('Error updating deadline:', error)
                    }
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 세일 당일 스토리 업로드 마감일 (보통 세일 당일)
                </p>
              </div>
            </div>

            <div className="mt-4 bg-blue-100 border border-blue-300 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>⚠️ 주의사항:</strong> 각 STEP의 마감일을 명확히 설정하여 크리에이터가 일정을 준수할 수 있도록 해주세요.
              </p>
            </div>
          </div>
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
            onClick={handleGenerateGuide}
            disabled={loading || generating}
            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                가이드 생성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                가이드 생성
              </>
            )}
          </Button>
          
          <Button
            type="button"
            onClick={() => {
              if (!id) {
                alert('캠페인 ID가 없습니다.')
                return
              }
              navigate(`/company/campaigns/guide/oliveyoung/final?id=${id}`)
            }}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            최종 가이드 생성 및 발송
          </Button>
        </div>
      </div>
    </>
  )
}
