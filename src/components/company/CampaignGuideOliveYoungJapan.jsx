import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, Sparkles, Package, FileText, Info, CheckCircle2, Link as LinkIcon, CheckCircle, XCircle, AlertTriangle, Globe, Languages } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import ExternalGuideUploader from '../common/ExternalGuideUploader'

export default function CampaignGuideOliveYoungJapan() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const supabase = getSupabaseClient('japan')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelStep, setCancelStep] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatingStep, setTranslatingStep] = useState(null)

  // STEP별 가이드 전달 완료 상태 (2 steps only for megawari)
  const [stepGuideDelivered, setStepGuideDelivered] = useState({
    step1: false, step2: false
  })

  const [productData, setProductData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    product_key_points: ''
  })

  const [step1Guide, setStep1Guide] = useState('')
  const [step2Guide, setStep2Guide] = useState('')

  // 일본어 번역 데이터
  const [step1GuideJa, setStep1GuideJa] = useState('')
  const [step2GuideJa, setStep2GuideJa] = useState('')
  const [productDataJa, setProductDataJa] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    product_key_points: ''
  })

  // STEP별 가이드 전달 모드 ('ai' | 'external')
  const [stepGuideModes, setStepGuideModes] = useState({
    step1: 'ai',
    step2: 'ai'
  })

  // STEP별 외부 가이드 데이터
  const [stepExternalGuides, setStepExternalGuides] = useState({
    step1: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    step2: { type: null, url: null, fileUrl: null, fileName: null, title: '' }
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const client = supabase || supabaseBiz
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)

      setProductData({
        brand: data.brand || '',
        product_name: data.product_name || '',
        product_features: data.product_features || '',
        product_key_points: data.product_key_points || ''
      })

      // 올영세일/메가와리 가이드 데이터 로드
      setStep1Guide(data.oliveyoung_step1_guide || '')
      setStep2Guide(data.oliveyoung_step2_guide || '')

      // 일본어 번역 데이터 로드
      const jaData = data.megawari_guide_data_ja || {}
      setStep1GuideJa(jaData.step1_guide || '')
      setStep2GuideJa(jaData.step2_guide || '')
      setProductDataJa({
        brand: jaData.brand || '',
        product_name: jaData.product_name || '',
        product_features: jaData.product_features || '',
        product_key_points: jaData.product_key_points || ''
      })

      // STEP별 가이드 모드 및 외부 가이드 데이터 로드
      setStepGuideModes({
        step1: data.step1_guide_mode || 'ai',
        step2: data.step2_guide_mode || 'ai'
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
        }
      })

      // STEP별 가이드 전달 완료 상태 확인
      setStepGuideDelivered({
        step1: !!(data.oliveyoung_step1_guide_ai || data.step1_external_url || data.step1_external_file_url),
        step2: !!(data.oliveyoung_step2_guide_ai || data.step2_external_url || data.step2_external_file_url)
      })
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  // 일본어 번역 함수
  const handleTranslateStep = async (stepNum) => {
    setIsTranslating(true)
    setTranslatingStep(stepNum)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')

      const guideText = stepNum === 1 ? step1Guide : step2Guide

      const prompt = `다음 한국어 텍스트를 자연스러운 일본어로 번역해주세요. 마케팅/크리에이터 가이드 용어에 맞게 번역해주세요.
번역만 출력하세요. 다른 설명은 포함하지 마세요.

한국어:
${guideText}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      )

      if (!response.ok) throw new Error('번역 API 호출 실패')
      const result = await response.json()
      const translatedText = result.candidates[0].content.parts[0].text.trim()

      if (stepNum === 1) setStep1GuideJa(translatedText)
      else setStep2GuideJa(translatedText)
    } catch (error) {
      console.error('Translation error:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsTranslating(false)
      setTranslatingStep(null)
    }
  }

  // 제품 정보 번역
  const handleTranslateProductInfo = async () => {
    setIsTranslating(true)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')

      const prompt = `다음 제품 정보를 자연스러운 일본어로 번역해주세요. JSON 형식으로만 응답해주세요.

브랜드: ${productData.brand}
제품명: ${productData.product_name}
제품 특징: ${productData.product_features}
핵심 소구 포인트: ${productData.product_key_points}

\`\`\`json
{
  "brand": "브랜드명 일본어",
  "product_name": "제품명 일본어",
  "product_features": "제품 특징 일본어",
  "product_key_points": "핵심 소구 포인트 일본어"
}
\`\`\``

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      )

      if (!response.ok) throw new Error('번역 API 호출 실패')
      const result = await response.json()
      const text = result.candidates[0].content.parts[0].text

      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
      const parsed = JSON.parse(jsonStr)

      setProductDataJa({
        brand: parsed.brand || '',
        product_name: parsed.product_name || '',
        product_features: parsed.product_features || '',
        product_key_points: parsed.product_key_points || ''
      })
    } catch (error) {
      console.error('Translation error:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsTranslating(false)
    }
  }

  // STEP별 가이드 취소 함수
  const handleCancelStepGuide = async (stepNum) => {
    setCancelling(true)

    try {
      const client = supabase || supabaseBiz
      const stepKey = `step${stepNum}`

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

      setStepGuideDelivered(prev => ({ ...prev, [stepKey]: false }))
      setStepGuideModes(prev => ({ ...prev, [stepKey]: 'ai' }))
      setStepExternalGuides(prev => ({
        ...prev,
        [stepKey]: { type: null, url: null, fileUrl: null, fileName: null, title: '' }
      }))
      setCancelStep(null)

      alert(`STEP ${stepNum} 가이드가 취소되었습니다. 다시 생성할 수 있습니다.`)
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
      const client = supabase || supabaseBiz
      const { error } = await client
        .from('campaigns')
        .update({
          brand: productData.brand,
          product_name: productData.product_name,
          product_features: productData.product_features,
          product_key_points: productData.product_key_points,
          oliveyoung_step1_guide: step1Guide,
          oliveyoung_step2_guide: step2Guide,
          // 일본어 번역 데이터 저장
          megawari_guide_data_ja: {
            brand: productDataJa.brand,
            product_name: productDataJa.product_name,
            product_features: productDataJa.product_features,
            product_key_points: productDataJa.product_key_points,
            step1_guide: step1GuideJa,
            step2_guide: step2GuideJa
          },
          // STEP별 가이드 모드 저장
          step1_guide_mode: stepGuideModes.step1,
          step2_guide_mode: stepGuideModes.step2,
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
          step2_external_title: stepExternalGuides.step2.title
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
    for (const stepKey of ['step1', 'step2']) {
      const stepNum = stepKey.replace('step', '')
      if (stepGuideModes[stepKey] === 'ai') {
        const guideText = stepKey === 'step1' ? step1Guide : step2Guide
        if (!guideText) {
          alert(`STEP ${stepNum} 가이드를 입력해주세요.`)
          return
        }
      } else {
        if (!stepExternalGuides[stepKey].fileUrl && !stepExternalGuides[stepKey].url) {
          alert(`STEP ${stepNum} 외부 가이드(PDF 또는 URL)를 등록해주세요.`)
          return
        }
      }
    }

    setGenerating(true)

    try {
      const client = supabase || supabaseBiz
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
          megawari_guide_data_ja: {
            brand: productDataJa.brand,
            product_name: productDataJa.product_name,
            product_features: productDataJa.product_features,
            product_key_points: productDataJa.product_key_points,
            step1_guide: step1GuideJa,
            step2_guide: step2GuideJa
          },
          step1_guide_mode: stepGuideModes.step1,
          step2_guide_mode: stepGuideModes.step2,
          step1_external_type: stepExternalGuides.step1.type,
          step1_external_url: stepExternalGuides.step1.url,
          step1_external_file_url: stepExternalGuides.step1.fileUrl,
          step1_external_file_name: stepExternalGuides.step1.fileName,
          step1_external_title: stepExternalGuides.step1.title,
          step2_external_type: stepExternalGuides.step2.type,
          step2_external_url: stepExternalGuides.step2.url,
          step2_external_file_url: stepExternalGuides.step2.fileUrl,
          step2_external_file_name: stepExternalGuides.step2.fileName,
          step2_external_title: stepExternalGuides.step2.title
        })
        .eq('id', id)

      if (updateError) throw updateError

      // AI 모드인 STEP 확인
      const aiSteps = ['step1', 'step2'].filter(s => stepGuideModes[s] === 'ai')

      if (aiSteps.length > 0) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY
        if (!apiKey) {
          throw new Error('Gemini API 키가 설정되지 않았습니다.')
        }

        const prompt = `あなたはQoo10メガ割セールキャンペーン用のクリエイターガイドを作成する専門家です。
必ず以下のJSON形式のみで回答してください。他のテキストは含めないでください。

**商品情報**
- ブランド: ${productDataJa.brand || productData.brand}
- 商品名: ${productDataJa.product_name || productData.product_name}
- 商品特徴: ${productDataJa.product_features || productData.product_features}
- 核心訴求ポイント: ${productDataJa.product_key_points || productData.product_key_points}

**企業が作成したガイド内容（この内容をtext_guideに含め、構造化されたフィールドも生成）**
${stepGuideModes.step1 === 'ai' ? `STEP 1 (認知拡大 - 商品レビュー動画): ${step1GuideJa || step1Guide || '商品レビューおよび使用後の感想動画'}` : 'STEP 1: 外部ガイド使用'}
${stepGuideModes.step2 === 'ai' ? `STEP 2 (セール促進 - メガ割宣伝動画): ${step2GuideJa || step2Guide || 'メガ割プロモーション動画'}` : 'STEP 2: 外部ガイド使用'}

**必須生成フィールド:**
1. text_guide: 企業ガイドに基づく詳細撮影ガイド（2-3文）
2. product_info: "${productDataJa.brand || productData.brand} ${productDataJa.product_name || productData.product_name}" 形式
3. required_dialogues: 動画で必ず言うべきセリフ3-5個（具体的なセリフ）- 日本語で
4. required_scenes: 必ず撮影するシーン2-4個 - 日本語で
5. cautions: 注意事項（著作権、広告表記など）- 日本語で
6. hashtags: 必須ハッシュタグ3-5個（STEP2は必ず#メガ割を含む）
7. reference_urls: 空の配列 []

\`\`\`json
{
  "step1": {
    "text_guide": "商品レビュー撮影の詳細ガイド2-3文（日本語）",
    "product_info": "${productDataJa.brand || productData.brand} ${productDataJa.product_name || productData.product_name}",
    "required_dialogues": ["この商品本当にすごい", "使い心地が最高", "Qoo10でチェックしてみて"],
    "required_scenes": ["商品クローズアップ", "使用前後比較", "テクスチャー実演"],
    "cautions": "広告であることを明示し、著作権のある音楽は使用禁止",
    "hashtags": ["#${(productDataJa.brand || productData.brand)?.replace(/\\s/g, '') || 'ブランド名'}", "#Qoo10", "#レビュー"],
    "reference_urls": []
  },
  "step2": {
    "text_guide": "メガ割セールプロモーション動画撮影ガイド2-3文（日本語）",
    "product_info": "${productDataJa.brand || productData.brand} ${productDataJa.product_name || productData.product_name}",
    "required_dialogues": ["ついにメガ割スタート！", "この価格で手に入れて", "Qoo10アプリで今すぐチェック"],
    "required_scenes": ["割引価格強調", "商品使用シーン", "購入誘導CTA"],
    "cautions": "広告であることを明示し、著作権のある音楽は使用禁止",
    "hashtags": ["#メガ割", "#${(productDataJa.brand || productData.brand)?.replace(/\\s/g, '') || 'ブランド名'}", "#Qoo10"],
    "reference_urls": []
  }
}
\`\`\``

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`AI 가이드 생성 실패: ${errorData.error?.message || response.statusText}`)
        }

        const result = await response.json()
        const generatedText = result.candidates[0].content.parts[0].text

        let step1Data = null
        let step2Data = null
        const baseProductInfo = `${productDataJa.brand || productData.brand} ${productDataJa.product_name || productData.product_name}`

        try {
          let jsonStr = generatedText
          const codeBlockMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/)
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1]
          } else {
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
            if (jsonMatch) jsonStr = jsonMatch[0]
          }

          const parsed = JSON.parse(jsonStr)

          if (stepGuideModes.step1 === 'ai' && parsed.step1) {
            step1Data = {
              text_guide: parsed.step1.text_guide || step1GuideJa || step1Guide || '',
              product_info: parsed.step1.product_info || baseProductInfo,
              required_dialogues: Array.isArray(parsed.step1.required_dialogues) ? parsed.step1.required_dialogues : [],
              required_scenes: Array.isArray(parsed.step1.required_scenes) ? parsed.step1.required_scenes : [],
              cautions: parsed.step1.cautions || '広告であることを明示し、著作権のある音楽は使用禁止',
              hashtags: Array.isArray(parsed.step1.hashtags) ? parsed.step1.hashtags : [`#${(productDataJa.brand || productData.brand)?.replace(/\s/g, '') || 'ブランド'}`, '#Qoo10'],
              reference_urls: []
            }
          }
          if (stepGuideModes.step2 === 'ai' && parsed.step2) {
            step2Data = {
              text_guide: parsed.step2.text_guide || step2GuideJa || step2Guide || '',
              product_info: parsed.step2.product_info || baseProductInfo,
              required_dialogues: Array.isArray(parsed.step2.required_dialogues) ? parsed.step2.required_dialogues : [],
              required_scenes: Array.isArray(parsed.step2.required_scenes) ? parsed.step2.required_scenes : [],
              cautions: parsed.step2.cautions || '広告であることを明示し、著作権のある音楽は使用禁止',
              hashtags: Array.isArray(parsed.step2.hashtags) ? (parsed.step2.hashtags.includes('#メガ割') ? parsed.step2.hashtags : ['#メガ割', ...parsed.step2.hashtags]) : ['#メガ割'],
              reference_urls: []
            }
          }
        } catch (e) {
          console.error('JSON 파싱 실패:', e)
          const fallbackData = {
            text_guide: '',
            product_info: baseProductInfo,
            required_dialogues: ['商品の特徴を紹介してください', '使用後の感想を説明してください', '購入を促すコメントをしてください'],
            required_scenes: ['商品クローズアップ', '使用シーン', 'Before/After比較'],
            cautions: '広告であることを明示し、著作権のある音楽は使用禁止',
            hashtags: [`#${(productDataJa.brand || productData.brand)?.replace(/\s/g, '') || 'ブランド'}`, '#Qoo10'],
            reference_urls: []
          }
          if (stepGuideModes.step1 === 'ai') step1Data = { ...fallbackData, text_guide: step1GuideJa || step1Guide || '' }
          if (stepGuideModes.step2 === 'ai') step2Data = { ...fallbackData, text_guide: step2GuideJa || step2Guide || '', hashtags: ['#メガ割', ...fallbackData.hashtags] }
        }

        const aiUpdateData = { guide_generated_at: new Date().toISOString() }
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

      alert('メガ割ガイドが保存されました！決済ページに移動します。')
      navigate(`/company/campaigns/payment?id=${id}&region=japan`)
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

  const stepConfig = [
    { num: 1, label: '認知拡大 (商品レビュー)', labelKo: '상품 리뷰 콘텐츠', guide: step1Guide, setGuide: setStep1Guide, guideJa: step1GuideJa, setGuideJa: setStep1GuideJa, deadline: campaign.step1_deadline },
    { num: 2, label: 'セール促進 (メガ割宣伝)', labelKo: '메가와리 홍보 콘텐츠', guide: step2Guide, setGuide: setStep2Guide, guideJa: step2GuideJa, setGuideJa: setStep2GuideJa, deadline: campaign.step2_deadline }
  ]

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
                <h3 className="text-lg font-bold text-gray-900">STEP {cancelStep} ガイドキャンセル</h3>
                <p className="text-sm text-gray-500">この操作は元に戻せません</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">注意事項:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>STEP {cancelStep} ガイドデータが削除されます</li>
                <li>既にクリエイターに伝達済みの場合、混乱が発生する可能性があります</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCancelStep(null)} disabled={cancelling} className="flex-1">
                閉じる
              </Button>
              <Button onClick={() => handleCancelStepGuide(cancelStep)} disabled={cancelling} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {cancelling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />キャンセル中...</> : <><XCircle className="w-4 h-4 mr-2" />ガイドキャンセル</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <FileText className="h-8 w-8 text-orange-600" />
              メガ割キャンペーン ガイド作成
            </h1>
            <p className="text-gray-700 text-base">
              キャンペーン: <span className="font-semibold text-orange-700">{campaign.title}</span>
            </p>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-5 mb-6 flex items-start gap-3">
          <Info className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-900">
            <p className="font-bold text-base mb-2">メガ割キャンペーンガイド</p>
            <p className="leading-relaxed">2段階のコンテンツ制作のための統合ガイドを作成してください。</p>
            <p className="mt-2 font-semibold">STEP 1: 認知拡大（商品レビュー） → STEP 2: セール促進（メガ割宣伝）</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 제품 기본 정보 */}
          <div className="bg-gradient-to-br from-purple-50/50 to-white rounded-lg border-2 border-purple-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-purple-600" />
                제품 기본 정보 / 商品基本情報
              </h3>
              <Button
                size="sm"
                onClick={handleTranslateProductInfo}
                disabled={isTranslating || !productData.brand}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isTranslating && !translatingStep ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Languages className="w-4 h-4 mr-1" />}
                日本語に翻訳
              </Button>
            </div>

            <div className="space-y-4">
              {[
                { label: '브랜드명 / ブランド名', key: 'brand', placeholder: '예: ABC Beauty' },
                { label: '제품명 / 商品名', key: 'product_name', placeholder: '예: ヒアルロン酸 水分クリーム' }
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block mb-2">
                    <span className="text-base font-semibold">{label}</span>
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={productData[key]}
                      onChange={(e) => setProductData({ ...productData, [key]: e.target.value })}
                      placeholder={`한국어 - ${placeholder}`}
                    />
                    <Input
                      value={productDataJa[key]}
                      onChange={(e) => setProductDataJa({ ...productDataJa, [key]: e.target.value })}
                      placeholder="日本語"
                      className="border-blue-200 bg-blue-50/50"
                    />
                  </div>
                </div>
              ))}

              {[
                { label: '제품 특징 / 商品特徴', key: 'product_features', placeholder: '제품의 주요 성분, 효능, 특징' },
                { label: '핵심 소구 포인트 / 核心訴求ポイント', key: 'product_key_points', placeholder: '크리에이터가 반드시 강조해야 할 핵심 메시지' }
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block mb-2">
                    <span className="text-base font-semibold">{label}</span>
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <textarea
                      value={productData[key]}
                      onChange={(e) => setProductData({ ...productData, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full h-24 p-3 border rounded-lg resize-none"
                    />
                    <textarea
                      value={productDataJa[key]}
                      onChange={(e) => setProductDataJa({ ...productDataJa, [key]: e.target.value })}
                      placeholder="日本語"
                      className="w-full h-24 p-3 border border-blue-200 bg-blue-50/50 rounded-lg resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP별 가이드 */}
          {stepConfig.map(({ num, label, labelKo, guide, setGuide, guideJa, setGuideJa, deadline }) => {
            const stepKey = `step${num}`
            return (
              <div key={num} className="bg-white rounded-lg border border-orange-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">STEP {num}</span>
                  <h3 className="text-xl font-semibold">{label}</h3>
                  <span className="text-sm text-gray-500">({labelKo})</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  마감일: <span className="font-semibold">{deadline || '미설정'}</span>
                </p>

                {/* 가이드 전달 완료 상태 */}
                {stepGuideDelivered[stepKey] && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-800 mb-1">STEP {num} ガイドが登録済みです</p>
                        <p className="text-sm text-amber-700 mb-3">
                          {stepGuideModes[stepKey] === 'external' ? '外部ガイドが登録されています。' : 'AIガイドが生成されています。'}
                          再生成するには既存のガイドをキャンセルしてください。
                        </p>
                        <Button onClick={() => setCancelStep(num)} variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-100">
                          <XCircle className="w-4 h-4 mr-2" />
                          STEP {num} ガイドをキャンセルして再生成
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 가이드 전달 모드 선택 */}
                {!stepGuideDelivered[stepKey] && (
                  <>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
                      <p className="text-sm font-medium text-orange-900 mb-3">STEP {num} ガイド伝達方式を選択</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`guide-mode-step${num}`}
                            checked={stepGuideModes[stepKey] === 'ai'}
                            onChange={() => setStepGuideModes(prev => ({ ...prev, [stepKey]: 'ai' }))}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-sm"><Sparkles className="w-4 h-4 inline mr-1 text-orange-600" />AI ガイド生成</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`guide-mode-step${num}`}
                            checked={stepGuideModes[stepKey] === 'external'}
                            onChange={() => setStepGuideModes(prev => ({ ...prev, [stepKey]: 'external' }))}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-sm"><LinkIcon className="w-4 h-4 inline mr-1 text-blue-600" />PDF/URL 直接登録</span>
                        </label>
                      </div>
                    </div>

                    {stepGuideModes[stepKey] === 'external' && (
                      <ExternalGuideUploader
                        value={stepExternalGuides[stepKey]}
                        onChange={(data) => setStepExternalGuides(prev => ({ ...prev, [stepKey]: data }))}
                        campaignId={id}
                        prefix={`${stepKey}_`}
                        supabaseClient={supabaseBiz}
                      />
                    )}

                    {stepGuideModes[stepKey] === 'ai' && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600">가이드 내용 (한국어 / 日本語)</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTranslateStep(num)}
                            disabled={isTranslating || !guide}
                            className="text-blue-600 border-blue-300"
                          >
                            {isTranslating && translatingStep === num ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Languages className="w-3 h-3 mr-1" />}
                            日本語に翻訳
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <textarea
                            value={guide}
                            onChange={(e) => setGuide(e.target.value)}
                            placeholder={num === 1
                              ? "예:\n[콘텐츠 개요]\n- 제품 구매 장면\n- 제품 언박싱 및 텍스처 소개\n- 사용 후기 및 효과 리뷰\n\n[필수 포함 요소]\n- 제품 패키징 클로즈업\n- 텍스처 시연\n- 사용 전후 비교"
                              : "예:\n[콘텐츠 개요]\n- 메가와리 세일 예고 및 할인 정보\n- 제품 재사용 후기 및 추천 이유\n- 세일 기간 및 구매 방법 안내\n\n[필수 포함 요소]\n- 할인율 또는 특가 정보\n- 제품 사용 장면\n- 세일 기간 명시"
                            }
                            className="w-full h-48 p-3 border rounded-lg resize-none"
                          />
                          <textarea
                            value={guideJa}
                            onChange={(e) => setGuideJa(e.target.value)}
                            placeholder="日本語ガイド内容"
                            className="w-full h-48 p-3 border border-blue-200 bg-blue-50/50 rounded-lg resize-none"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {/* 업로드 스케줄 체크리스트 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📅</span>
              <h3 className="text-xl font-semibold text-blue-900">アップロードスケジュール</h3>
            </div>

            <div className="space-y-4">
              {stepConfig.map(({ num, label, deadline }) => (
                <div key={num} className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm font-semibold">STEP {num}</span>
                      <span className="font-semibold text-gray-800">{label}</span>
                    </div>
                    <span className="text-xs text-gray-500">締め切り</span>
                  </div>
                  <Input
                    type="date"
                    value={deadline ? new Date(deadline).toISOString().slice(0, 10) : ''}
                    disabled
                    className="mt-2 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              ))}
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
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</> : '一時保存'}
          </Button>

          <Button
            type="button"
            onClick={handleGenerateGuide}
            disabled={loading || generating}
            size="lg"
            className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg"
          >
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />ガイド生成中...</> : <><Sparkles className="w-4 h-4 mr-2" />ガイド生成 & 見積確認</>}
          </Button>
        </div>
      </div>
    </>
  )
}
