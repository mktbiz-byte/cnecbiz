import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, Sparkles, Package, FileText, Info, CheckCircle2 } from 'lucide-react'
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
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
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
      const client = supabaseKorea || supabaseBiz
      const { error } = await client
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
      const client = supabaseKorea || supabaseBiz
      // 먼저 데이터 저장
      const { error: updateError } = await client
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

      // AI 가이드 생성 (Gemini API 직접 호출)
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      const prompt = `다음 제품 정보와 기업의 요구사항을 바탕으로, 크리에이터가 참고할 수 있도록 간단하고 명확한 가이드를 작성해주세요.

**제품 정보**
- 브랜드: ${productData.brand}
- 제품명: ${productData.product_name}
- 제품 특징: ${productData.product_features}
- 핵심 포인트: ${productData.product_key_points}

**기업 요구사항**
- STEP 1 (세일 전 영상): ${step1Guide}
- STEP 2 (올영 스케줄 맞춤 제작): ${step2Guide}

**각 스텝별 핵심 요구사항:**
- STEP 1: 세일 전 영상 콘텐츠 1건 제작 후 SNS 업로드 (기업이 작성한 가이드 내용 포함)
- STEP 2: 올영 스케줄에 맞춰서 제작 (기업이 작성한 가이드 내용 포함)

**작성 규칙:**
- 불필요한 촬영 팁, 예시 대사 등은 절대 포함하지 마세요
- 각 단계별로 핵심 요구사항만 2-3문장으로 간결하게
- shooting_tips는 빈 문자열로 유지
- 주의사항은 필수 사항만 1-2문장으로

JSON 형식으로 응답해주세요:
{
  "step1_guide_enhanced": "STEP 1 핵심 요구사항 (2-3문장)",
  "step2_guide_enhanced": "STEP 2 핵심 요구사항 (2-3문장)",
  "shooting_tips": "",
  "cautions": "필수 사항 (1-2문장)"
}`

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
      let step1Enhanced = step1Guide
      let step2Enhanced = step2Guide
      let shootingTips = ''
      let cautions = ''
      
      try {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          step1Enhanced = parsed.step1_guide_enhanced || step1Guide
          step2Enhanced = parsed.step2_guide_enhanced || step2Guide
          shootingTips = parsed.shooting_tips || ''
          cautions = parsed.cautions || ''
        }
      } catch (e) {
        console.error('JSON 파싱 실패:', e)
        // 파싱 실패 시 원본 사용
      }

      // AI 가공된 가이드 저장 (STEP 3는 제외)
      const { error: finalUpdateError } = await client
        .from('campaigns')
        .update({
          oliveyoung_step1_guide_ai: step1Enhanced,
          oliveyoung_step2_guide_ai: step2Enhanced,
          oliveyoung_shooting_tips: shootingTips,
          oliveyoung_cautions: cautions,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (finalUpdateError) throw finalUpdateError

      alert('올영세일 가이드가 생성되었습니다! 가이드 리뷰 페이지로 이동합니다.')
      navigate(`/company/campaigns/payment?id=${id}&region=korea`)
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
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <FileText className="h-8 w-8 text-pink-600" />
              올영세일 캠페인 가이드 작성
            </h1>
            <p className="text-gray-700 text-base">
              캠페인: <span className="font-semibold text-pink-700">{campaign.title}</span>
            </p>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-lg p-5 mb-6 flex items-start gap-3">
          <Info className="w-6 h-6 text-pink-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-pink-900">
            <p className="font-bold text-base mb-2">올영세일 캠페인 안내</p>
            <p className="leading-relaxed">3단계 콘텐츠 제작을 위한 통합 가이드를 작성해주세요.</p>
            <p className="mt-2 font-semibold">STEP 1: 상품 리뷰 → STEP 2: 세일 홍보 → STEP 3: 세일 당일 스토리</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 제품 기본 정보 */}
          <div className="bg-gradient-to-br from-purple-50/50 to-white rounded-lg border-2 border-purple-200 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="h-6 w-6 text-purple-600" />
              제품 기본 정보
            </h3>
            
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">⚠️ 중요: STEP 2의 영상이 링크로 + URL이 삽입됩니다</p>
              <p className="text-xs text-blue-700">스토리에 넣을 URL을 공유해주세요</p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              스토리 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={step3Guide}
              onChange={(e) => setStep3Guide(e.target.value)}
              placeholder="https://www.oliveyoung.co.kr/store/..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              예시: https://www.oliveyoung.co.kr/store/goods/getSaleGoodsList.do
            </p>
          </div>

          {/* 업로드 스케줄 체크리스트 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📅</span>
              <h3 className="text-xl font-semibold text-blue-900">업로드 스케줄 체크리스트</h3>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ 주의항: 각 STEP의 마감일은 명확히 설정하여 크리에이터가 원활히 준수할 수 있도록 해주세요.
              </p>
            </div>

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
                  type="date"
                  value={campaign.step1_deadline ? new Date(campaign.step1_deadline).toISOString().slice(0, 10) : ''}
                  disabled
                  className="mt-2 bg-gray-50 cursor-not-allowed"
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
                  type="date"
                  value={campaign.step2_deadline ? new Date(campaign.step2_deadline).toISOString().slice(0, 10) : ''}
                  disabled
                  className="mt-2 bg-gray-50 cursor-not-allowed"
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
                  type="date"
                  value={campaign.step3_deadline ? new Date(campaign.step3_deadline).toISOString().slice(0, 10) : ''}
                  disabled
                  className="mt-2 bg-gray-50 cursor-not-allowed"
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
        <div className="flex gap-4 mt-8 pt-6 border-t-2">
          <Button
            type="button"
            onClick={handleSaveDraft}
            variant="outline"
            size="lg"
            disabled={loading || generating}
            className="flex-1 h-12 text-base font-semibold border-2"
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
            size="lg"
            className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                가이드 생성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                가이드 생성 및 견적서 확인
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
