import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, Sparkles, Package, FileText, Info, CheckCircle2, Link as LinkIcon, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import ExternalGuideUploader from '../common/ExternalGuideUploader'

export default function CampaignGuideOliveYoung() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelStep, setCancelStep] = useState(null) // 취소할 STEP
  const [campaign, setCampaign] = useState(null)

  // STEP별 가이드 전달 완료 상태
  const [stepGuideDelivered, setStepGuideDelivered] = useState({
    step1: false, step2: false, step3: false
  })
  
  const [productData, setProductData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    product_key_points: ''
  })

  const [step1Guide, setStep1Guide] = useState('')
  const [step2Guide, setStep2Guide] = useState('')
  const [step3Guide, setStep3Guide] = useState('')

  // STEP별 가이드 전달 모드 ('ai' | 'external')
  const [stepGuideModes, setStepGuideModes] = useState({
    step1: 'ai',
    step2: 'ai',
    step3: 'ai'
  })

  // STEP별 외부 가이드 데이터
  const [stepExternalGuides, setStepExternalGuides] = useState({
    step1: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    step2: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    step3: { type: null, url: null, fileUrl: null, fileName: null, title: '' }
  })

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

      // STEP별 가이드 모드 및 외부 가이드 데이터 로드
      setStepGuideModes({
        step1: data.step1_guide_mode || 'ai',
        step2: data.step2_guide_mode || 'ai',
        step3: data.step3_guide_mode || 'ai'
      })

      setStepExternalGuides({
        step1: {
          type: data.step1_external_type || null,
          url: data.step1_external_url || null,
          fileUrl: data.step1_external_file_url || null,
          fileName: data.step1_external_file_name || null,
          title: data.step1_external_title || ''
        },
        step2: {
          type: data.step2_external_type || null,
          url: data.step2_external_url || null,
          fileUrl: data.step2_external_file_url || null,
          fileName: data.step2_external_file_name || null,
          title: data.step2_external_title || ''
        },
        step3: {
          type: data.step3_external_type || null,
          url: data.step3_external_url || null,
          fileUrl: data.step3_external_file_url || null,
          fileName: data.step3_external_file_name || null,
          title: data.step3_external_title || ''
        }
      })

      // STEP별 가이드 전달 완료 상태 확인
      setStepGuideDelivered({
        step1: !!(data.oliveyoung_step1_guide_ai || data.step1_external_url || data.step1_external_file_url),
        step2: !!(data.oliveyoung_step2_guide_ai || data.step2_external_url || data.step2_external_file_url),
        step3: !!(data.oliveyoung_step3_guide_ai || data.step3_external_url || data.step3_external_file_url)
      })
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  // STEP별 가이드 취소 함수
  const handleCancelStepGuide = async (stepNum) => {
    setCancelling(true)

    try {
      const client = supabaseKorea || supabaseBiz
      const stepKey = `step${stepNum}`

      // 업데이트할 데이터
      const updateData = {
        [`oliveyoung_${stepKey}_guide_ai`]: null,
        [`${stepKey}_guide_mode`]: null,
        [`${stepKey}_external_type`]: null,
        [`${stepKey}_external_url`]: null,
        [`${stepKey}_external_file_url`]: null,
        [`${stepKey}_external_file_name`]: null,
        [`${stepKey}_external_title`]: null
      }

      const { error } = await client
        .from('campaigns')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // 상태 초기화
      setStepGuideDelivered(prev => ({ ...prev, [stepKey]: false }))
      setStepGuideModes(prev => ({ ...prev, [stepKey]: 'ai' }))
      setStepExternalGuides(prev => ({
        ...prev,
        [stepKey]: { type: null, url: null, fileUrl: null, fileName: null, title: '' }
      }))
      setCancelStep(null)

      alert(`STEP ${stepNum} 가이드가 취소되었습니다. 다시 생성할 수 있습니다.`)

      // 캠페인 데이터 다시 로드
      loadCampaign()
    } catch (error) {
      console.error('Error cancelling step guide:', error)
      alert('가이드 취소 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setCancelling(false)
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
          oliveyoung_step3_guide: step3Guide,
          // STEP별 가이드 모드 저장
          step1_guide_mode: stepGuideModes.step1,
          step2_guide_mode: stepGuideModes.step2,
          step3_guide_mode: stepGuideModes.step3,
          // STEP별 외부 가이드 데이터 저장
          step1_external_type: stepExternalGuides.step1.type,
          step1_external_url: stepExternalGuides.step1.url,
          step1_external_file_url: stepExternalGuides.step1.fileUrl,
          step1_external_file_name: stepExternalGuides.step1.fileName,
          step1_external_title: stepExternalGuides.step1.title,
          step2_external_type: stepExternalGuides.step2.type,
          step2_external_url: stepExternalGuides.step2.url,
          step2_external_file_url: stepExternalGuides.step2.fileUrl,
          step2_external_file_name: stepExternalGuides.step2.fileName,
          step2_external_title: stepExternalGuides.step2.title,
          step3_external_type: stepExternalGuides.step3.type,
          step3_external_url: stepExternalGuides.step3.url,
          step3_external_file_url: stepExternalGuides.step3.fileUrl,
          step3_external_file_name: stepExternalGuides.step3.fileName,
          step3_external_title: stepExternalGuides.step3.title
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

    // 각 STEP별 가이드 체크 (AI 모드인 경우에만 텍스트 필수)
    for (const stepKey of ['step1', 'step2', 'step3']) {
      const stepNum = stepKey.replace('step', '')
      if (stepGuideModes[stepKey] === 'ai') {
        const guideText = stepKey === 'step1' ? step1Guide : stepKey === 'step2' ? step2Guide : step3Guide
        if (!guideText) {
          alert(`STEP ${stepNum} 가이드를 입력해주세요.`)
          return
        }
      } else {
        // external 모드인 경우 파일 또는 URL 체크
        if (!stepExternalGuides[stepKey].fileUrl && !stepExternalGuides[stepKey].url) {
          alert(`STEP ${stepNum} 외부 가이드(PDF 또는 URL)를 등록해주세요.`)
          return
        }
      }
    }

    setGenerating(true)

    try {
      const client = supabaseKorea || supabaseBiz
      // 먼저 데이터 저장 (AI 가이드 + 외부 가이드 모두)
      const { error: updateError } = await client
        .from('campaigns')
        .update({
          brand: productData.brand,
          product_name: productData.product_name,
          product_features: productData.product_features,
          product_key_points: productData.product_key_points,
          oliveyoung_step1_guide: step1Guide,
          oliveyoung_step2_guide: step2Guide,
          oliveyoung_step3_guide: step3Guide,
          // STEP별 가이드 모드 저장
          step1_guide_mode: stepGuideModes.step1,
          step2_guide_mode: stepGuideModes.step2,
          step3_guide_mode: stepGuideModes.step3,
          // STEP별 외부 가이드 데이터 저장
          step1_external_type: stepExternalGuides.step1.type,
          step1_external_url: stepExternalGuides.step1.url,
          step1_external_file_url: stepExternalGuides.step1.fileUrl,
          step1_external_file_name: stepExternalGuides.step1.fileName,
          step1_external_title: stepExternalGuides.step1.title,
          step2_external_type: stepExternalGuides.step2.type,
          step2_external_url: stepExternalGuides.step2.url,
          step2_external_file_url: stepExternalGuides.step2.fileUrl,
          step2_external_file_name: stepExternalGuides.step2.fileName,
          step2_external_title: stepExternalGuides.step2.title,
          step3_external_type: stepExternalGuides.step3.type,
          step3_external_url: stepExternalGuides.step3.url,
          step3_external_file_url: stepExternalGuides.step3.fileUrl,
          step3_external_file_name: stepExternalGuides.step3.fileName,
          step3_external_title: stepExternalGuides.step3.title
        })
        .eq('id', id)

      if (updateError) throw updateError

      // AI 모드인 STEP 확인
      const aiSteps = ['step1', 'step2'].filter(s => stepGuideModes[s] === 'ai')

      // AI 모드인 STEP이 있을 경우에만 AI 생성 실행
      if (aiSteps.length > 0) {
        // AI 가이드 생성 (Gemini API 직접 호출)
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
        if (!apiKey) {
          throw new Error('Gemini API 키가 설정되지 않았습니다.')
        }

        const prompt = `당신은 올리브영 세일 캠페인용 크리에이터 가이드를 작성하는 전문가입니다.
반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요.

**제품 정보**
- 브랜드: ${productData.brand}
- 제품명: ${productData.product_name}
- 제품 특징: ${productData.product_features}
- 핵심 소구 포인트: ${productData.product_key_points}

**기업이 작성한 가이드 내용 (이 내용을 text_guide에 포함하고, 구조화된 필드도 생성)**
${stepGuideModes.step1 === 'ai' ? `STEP 1 (세일 전 상품 리뷰 영상): ${step1Guide || '제품 리뷰 및 사용 후기 영상'}` : 'STEP 1: 외부 가이드 사용'}
${stepGuideModes.step2 === 'ai' ? `STEP 2 (세일 당일 홍보 영상): ${step2Guide || '올영세일 홍보 영상'}` : 'STEP 2: 외부 가이드 사용'}

**필수 생성 필드:**
1. text_guide: 기업이 작성한 가이드 내용을 기반으로 크리에이터가 따라야 할 상세 촬영 가이드 (2-3문장)
2. product_info: "${productData.brand} ${productData.product_name}" 형식으로 제품 정보
3. required_dialogues: 영상에서 반드시 말해야 할 대사 3-5개 (구체적인 멘트)
4. required_scenes: 반드시 촬영해야 할 장면 2-4개
5. cautions: 주의사항 (저작권, 광고 표기 등)
6. hashtags: 필수 해시태그 3-5개 (#포함, STEP2는 반드시 #올영세일 포함)
7. reference_urls: 빈 배열 []

\`\`\`json
{
  "step1": {
    "text_guide": "기업 가이드 기반 상세 촬영 안내 2-3문장",
    "product_info": "${productData.brand} ${productData.product_name} - 제품 핵심 특징",
    "required_dialogues": ["이 제품 진짜 대박이에요", "수분감이 24시간 지속돼요", "올리브영에서 꼭 찾아보세요"],
    "required_scenes": ["제품 클로즈업", "사용 전후 비교", "텍스처 시연"],
    "cautions": "광고임을 명시하고, 저작권이 있는 음악 사용 금지",
    "hashtags": ["#${productData.brand?.replace(/\s/g, '') || '브랜드명'}", "#올리브영", "#뷰티리뷰"],
    "reference_urls": []
  },
  "step2": {
    "text_guide": "올영세일 기간 홍보 영상 촬영 안내 2-3문장",
    "product_info": "${productData.brand} ${productData.product_name} - 제품 핵심 특징",
    "required_dialogues": ["드디어 올영세일 시작!", "이 가격에 득템하세요", "올리브영 앱에서 지금 바로"],
    "required_scenes": ["할인 가격 강조", "제품 사용 장면", "구매 유도 CTA"],
    "cautions": "광고임을 명시하고, 저작권이 있는 음악 사용 금지",
    "hashtags": ["#올영세일", "#${productData.brand?.replace(/\s/g, '') || '브랜드명'}", "#올리브영", "#뷰티득템"],
    "reference_urls": []
  }
}
\`\`\``

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

        // JSON 파싱 - 구조화된 가이드 데이터
        let step1Data = null
        let step2Data = null

        // 기본 제품 정보 (모든 STEP에서 공통으로 사용)
        const baseProductInfo = `${productData.brand} ${productData.product_name} - ${productData.product_features?.slice(0, 100) || ''}`

        try {
          // JSON 블록 추출 (```json ... ``` 또는 { ... })
          let jsonStr = generatedText
          const codeBlockMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/)
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1]
          } else {
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              jsonStr = jsonMatch[0]
            }
          }

          const parsed = JSON.parse(jsonStr)
          console.log('[AI Guide] Parsed JSON:', parsed)

          if (stepGuideModes.step1 === 'ai' && parsed.step1) {
            step1Data = {
              text_guide: parsed.step1.text_guide || step1Guide || '',
              product_info: parsed.step1.product_info || baseProductInfo,
              required_dialogues: Array.isArray(parsed.step1.required_dialogues) ? parsed.step1.required_dialogues : [],
              required_scenes: Array.isArray(parsed.step1.required_scenes) ? parsed.step1.required_scenes : [],
              cautions: parsed.step1.cautions || '광고임을 명시하고, 저작권이 있는 음악 사용 금지',
              hashtags: Array.isArray(parsed.step1.hashtags) ? parsed.step1.hashtags : [`#${productData.brand?.replace(/\s/g, '') || '브랜드'}`, '#올리브영'],
              reference_urls: Array.isArray(parsed.step1.reference_urls) ? parsed.step1.reference_urls : []
            }
          }
          if (stepGuideModes.step2 === 'ai' && parsed.step2) {
            step2Data = {
              text_guide: parsed.step2.text_guide || step2Guide || '',
              product_info: parsed.step2.product_info || baseProductInfo,
              required_dialogues: Array.isArray(parsed.step2.required_dialogues) ? parsed.step2.required_dialogues : [],
              required_scenes: Array.isArray(parsed.step2.required_scenes) ? parsed.step2.required_scenes : [],
              cautions: parsed.step2.cautions || '광고임을 명시하고, 저작권이 있는 음악 사용 금지',
              hashtags: Array.isArray(parsed.step2.hashtags) ? parsed.step2.hashtags.includes('#올영세일') ? parsed.step2.hashtags : ['#올영세일', ...parsed.step2.hashtags] : ['#올영세일'],
              reference_urls: Array.isArray(parsed.step2.reference_urls) ? parsed.step2.reference_urls : []
            }
          }
        } catch (e) {
          console.error('JSON 파싱 실패:', e, generatedText)
          // 파싱 실패 시 기본 구조 생성 (기업이 입력한 가이드를 text_guide로 사용)
          const fallbackData = {
            text_guide: '',
            product_info: baseProductInfo,
            required_dialogues: ['제품의 핵심 특징을 언급해주세요', '사용 후 느낌을 설명해주세요', '구매를 유도하는 멘트를 해주세요'],
            required_scenes: ['제품 클로즈업', '사용 장면', 'Before/After 비교'],
            cautions: '광고임을 명시하고, 저작권이 있는 음악 사용 금지',
            hashtags: [`#${productData.brand?.replace(/\s/g, '') || '브랜드'}`, '#올리브영'],
            reference_urls: []
          }
          if (stepGuideModes.step1 === 'ai') step1Data = { ...fallbackData, text_guide: step1Guide || '' }
          if (stepGuideModes.step2 === 'ai') step2Data = { ...fallbackData, text_guide: step2Guide || '', hashtags: ['#올영세일', ...fallbackData.hashtags] }
        }

        // AI 가공된 가이드 저장 (AI 모드인 STEP만) - JSON 문자열로 저장
        const aiUpdateData = {
          guide_generated_at: new Date().toISOString()
        }
        if (stepGuideModes.step1 === 'ai' && step1Data) {
          aiUpdateData.oliveyoung_step1_guide_ai = JSON.stringify(step1Data)
        }
        if (stepGuideModes.step2 === 'ai' && step2Data) {
          aiUpdateData.oliveyoung_step2_guide_ai = JSON.stringify(step2Data)
        }

        const { error: finalUpdateError } = await client
          .from('campaigns')
          .update(aiUpdateData)
          .eq('id', id)

        if (finalUpdateError) throw finalUpdateError
      }

      alert('올영세일 가이드가 저장되었습니다! 결제 페이지로 이동합니다.')
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

      {/* STEP별 가이드 취소 확인 모달 */}
      {cancelStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">STEP {cancelStep} 가이드 취소</h3>
                <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">주의사항:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>STEP {cancelStep} 가이드 데이터가 삭제됩니다</li>
                <li>이미 크리에이터에게 전달된 경우 혼란이 발생할 수 있습니다</li>
                <li>업로드된 PDF 파일은 스토리지에서 삭제되지 않습니다</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              STEP {cancelStep} 가이드를 취소하고 다시 생성하시겠습니까?
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCancelStep(null)}
                disabled={cancelling}
                className="flex-1"
              >
                닫기
              </Button>
              <Button
                onClick={() => handleCancelStepGuide(cancelStep)}
                disabled={cancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    취소 중...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    가이드 취소
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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

            {/* 가이드 전달 완료 상태 표시 */}
            {stepGuideDelivered.step1 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-1">STEP 1 가이드가 이미 등록되었습니다</p>
                    <p className="text-sm text-amber-700 mb-3">
                      {stepGuideModes.step1 === 'external'
                        ? '외부 가이드(파일/URL)가 등록되어 있습니다.'
                        : 'AI 가이드가 생성되어 있습니다.'}
                      {' '}다시 생성하려면 기존 가이드를 취소해야 합니다.
                    </p>
                    <Button
                      onClick={() => setCancelStep(1)}
                      variant="outline"
                      size="sm"
                      className="border-amber-400 text-amber-700 hover:bg-amber-100"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      STEP 1 가이드 취소하고 다시 생성
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 가이드 전달 모드 선택 (가이드가 없을 때만) */}
            {!stepGuideDelivered.step1 && (
            <>
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200 mb-4">
              <p className="text-sm font-medium text-pink-900 mb-3">
                STEP 1 가이드 전달 방식을 선택하세요
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="guide-mode-step1"
                    checked={stepGuideModes.step1 === 'ai'}
                    onChange={() => setStepGuideModes(prev => ({ ...prev, step1: 'ai' }))}
                    className="w-4 h-4 text-pink-600"
                  />
                  <span className="text-sm">
                    <Sparkles className="w-4 h-4 inline mr-1 text-pink-600" />
                    AI 가이드 생성
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="guide-mode-step1"
                    checked={stepGuideModes.step1 === 'external'}
                    onChange={() => setStepGuideModes(prev => ({ ...prev, step1: 'external' }))}
                    className="w-4 h-4 text-pink-600"
                  />
                  <span className="text-sm">
                    <LinkIcon className="w-4 h-4 inline mr-1 text-blue-600" />
                    PDF/URL 직접 등록
                  </span>
                </label>
              </div>
              {stepGuideModes.step1 === 'external' && (
                <p className="text-xs text-gray-500 mt-2">
                  <CheckCircle className="w-3 h-3 inline mr-1 text-green-600" />
                  외부 가이드를 등록하면 AI 가이드 생성 단계를 건너뜁니다.
                </p>
              )}
            </div>

            {/* 외부 가이드 업로더 (external 모드) */}
            {stepGuideModes.step1 === 'external' && (
              <ExternalGuideUploader
                value={stepExternalGuides.step1}
                onChange={(data) => setStepExternalGuides(prev => ({ ...prev, step1: data }))}
                campaignId={id}
                prefix="step1_"
                supabaseClient={supabaseBiz}
              />
            )}

            {/* AI 가이드 입력 폼 (ai 모드) */}
            {stepGuideModes.step1 === 'ai' && (
              <>
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
              </>
            )}
            </>
            )}
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

            {/* 가이드 전달 완료 상태 표시 */}
            {stepGuideDelivered.step2 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-1">STEP 2 가이드가 이미 등록되었습니다</p>
                    <p className="text-sm text-amber-700 mb-3">
                      {stepGuideModes.step2 === 'external'
                        ? '외부 가이드(파일/URL)가 등록되어 있습니다.'
                        : 'AI 가이드가 생성되어 있습니다.'}
                      {' '}다시 생성하려면 기존 가이드를 취소해야 합니다.
                    </p>
                    <Button
                      onClick={() => setCancelStep(2)}
                      variant="outline"
                      size="sm"
                      className="border-amber-400 text-amber-700 hover:bg-amber-100"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      STEP 2 가이드 취소하고 다시 생성
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 가이드 전달 모드 선택 (가이드가 없을 때만) */}
            {!stepGuideDelivered.step2 && (
            <>
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200 mb-4">
              <p className="text-sm font-medium text-pink-900 mb-3">
                STEP 2 가이드 전달 방식을 선택하세요
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="guide-mode-step2"
                    checked={stepGuideModes.step2 === 'ai'}
                    onChange={() => setStepGuideModes(prev => ({ ...prev, step2: 'ai' }))}
                    className="w-4 h-4 text-pink-600"
                  />
                  <span className="text-sm">
                    <Sparkles className="w-4 h-4 inline mr-1 text-pink-600" />
                    AI 가이드 생성
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="guide-mode-step2"
                    checked={stepGuideModes.step2 === 'external'}
                    onChange={() => setStepGuideModes(prev => ({ ...prev, step2: 'external' }))}
                    className="w-4 h-4 text-pink-600"
                  />
                  <span className="text-sm">
                    <LinkIcon className="w-4 h-4 inline mr-1 text-blue-600" />
                    PDF/URL 직접 등록
                  </span>
                </label>
              </div>
              {stepGuideModes.step2 === 'external' && (
                <p className="text-xs text-gray-500 mt-2">
                  <CheckCircle className="w-3 h-3 inline mr-1 text-green-600" />
                  외부 가이드를 등록하면 AI 가이드 생성 단계를 건너뜁니다.
                </p>
              )}
            </div>

            {/* 외부 가이드 업로더 (external 모드) */}
            {stepGuideModes.step2 === 'external' && (
              <ExternalGuideUploader
                value={stepExternalGuides.step2}
                onChange={(data) => setStepExternalGuides(prev => ({ ...prev, step2: data }))}
                campaignId={id}
                prefix="step2_"
                supabaseClient={supabaseBiz}
              />
            )}

            {/* AI 가이드 입력 폼 (ai 모드) */}
            {stepGuideModes.step2 === 'ai' && (
              <>
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
              </>
            )}
            </>
            )}
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

            {/* 가이드 전달 완료 상태 표시 */}
            {stepGuideDelivered.step3 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-1">STEP 3 가이드가 이미 등록되었습니다</p>
                    <p className="text-sm text-amber-700 mb-3">
                      {stepGuideModes.step3 === 'external'
                        ? '외부 가이드(파일/URL)가 등록되어 있습니다.'
                        : '스토리 URL이 입력되어 있습니다.'}
                      {' '}다시 생성하려면 기존 가이드를 취소해야 합니다.
                    </p>
                    <Button
                      onClick={() => setCancelStep(3)}
                      variant="outline"
                      size="sm"
                      className="border-amber-400 text-amber-700 hover:bg-amber-100"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      STEP 3 가이드 취소하고 다시 생성
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 가이드 전달 모드 선택 (가이드가 없을 때만) */}
            {!stepGuideDelivered.step3 && (
            <>
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200 mb-4">
              <p className="text-sm font-medium text-pink-900 mb-3">
                STEP 3 가이드 전달 방식을 선택하세요
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="guide-mode-step3"
                    checked={stepGuideModes.step3 === 'ai'}
                    onChange={() => setStepGuideModes(prev => ({ ...prev, step3: 'ai' }))}
                    className="w-4 h-4 text-pink-600"
                  />
                  <span className="text-sm">
                    <Sparkles className="w-4 h-4 inline mr-1 text-pink-600" />
                    스토리 URL 입력
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="guide-mode-step3"
                    checked={stepGuideModes.step3 === 'external'}
                    onChange={() => setStepGuideModes(prev => ({ ...prev, step3: 'external' }))}
                    className="w-4 h-4 text-pink-600"
                  />
                  <span className="text-sm">
                    <LinkIcon className="w-4 h-4 inline mr-1 text-blue-600" />
                    PDF/URL 직접 등록
                  </span>
                </label>
              </div>
            </div>

            {/* 외부 가이드 업로더 (external 모드) */}
            {stepGuideModes.step3 === 'external' && (
              <ExternalGuideUploader
                value={stepExternalGuides.step3}
                onChange={(data) => setStepExternalGuides(prev => ({ ...prev, step3: data }))}
                campaignId={id}
                prefix="step3_"
                supabaseClient={supabaseBiz}
              />
            )}

            {/* 스토리 URL 입력 (ai 모드) */}
            {stepGuideModes.step3 === 'ai' && (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  세일 당일 스토리 콘텐츠 제작을 위한 URL을 입력해주세요.
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
              </>
            )}
            </>
            )}
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
