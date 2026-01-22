import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, Sparkles, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import GuideDeliveryModeSelector from '../common/GuideDeliveryModeSelector'
import ExternalGuideUploader from '../common/ExternalGuideUploader'

export default function CampaignGuide() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [isGuideDelivered, setIsGuideDelivered] = useState(false)
  
  const [productData, setProductData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    product_key_points: ''
  })

  const [creatorAutonomy, setCreatorAutonomy] = useState(false)

  // 가이드 전달 모드 ('ai' | 'external')
  const [guideDeliveryMode, setGuideDeliveryMode] = useState('ai')

  // 외부 가이드 데이터
  const [externalGuide, setExternalGuide] = useState({
    type: null,
    url: null,
    fileUrl: null,
    fileName: null,
    title: ''
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
      setCreatorAutonomy(data.creator_autonomy || false)

      // 가이드 전달 모드 로드
      setGuideDeliveryMode(data.guide_delivery_mode || 'ai')

      // 외부 가이드 데이터 로드
      if (data.guide_delivery_mode === 'external') {
        setExternalGuide({
          type: data.external_guide_type || null,
          url: data.external_guide_url || null,
          fileUrl: data.external_guide_file_url || null,
          fileName: data.external_guide_file_name || null,
          title: data.external_guide_title || ''
        })
      }

      // 가이드 전달 완료 상태 확인
      const hasGuide = data.guide_generated_at && (
        data.ai_generated_guide ||
        data.external_guide_url ||
        data.external_guide_file_url
      )
      setIsGuideDelivered(!!hasGuide)
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  // 가이드 취소 함수
  const handleCancelGuide = async () => {
    setCancelling(true)

    try {
      const client = supabaseKorea || supabaseBiz

      // 가이드 관련 필드 초기화
      const { error } = await client
        .from('campaigns')
        .update({
          ai_generated_guide: null,
          guide_generated_at: null,
          guide_delivery_mode: null,
          external_guide_type: null,
          external_guide_url: null,
          external_guide_file_url: null,
          external_guide_file_name: null,
          external_guide_title: null
        })
        .eq('id', id)

      if (error) throw error

      // 상태 초기화
      setIsGuideDelivered(false)
      setGuideDeliveryMode('ai')
      setExternalGuide({
        type: null,
        url: null,
        fileUrl: null,
        fileName: null,
        title: ''
      })
      setShowCancelModal(false)

      alert('가이드가 취소되었습니다. 다시 생성할 수 있습니다.')

      // 캠페인 데이터 다시 로드
      loadCampaign()
    } catch (error) {
      console.error('Error cancelling guide:', error)
      alert('가이드 취소 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setCancelling(false)
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)

    try {
      const client = supabaseKorea || supabaseBiz

      // 기본 업데이트 데이터
      const updateData = {
        brand: productData.brand,
        product_name: productData.product_name,
        product_features: productData.product_features,
        product_key_points: productData.product_key_points,
        creator_autonomy: creatorAutonomy,
        guide_delivery_mode: guideDeliveryMode
      }

      // 외부 가이드 모드일 때 추가 데이터
      if (guideDeliveryMode === 'external') {
        updateData.external_guide_type = externalGuide.type
        updateData.external_guide_url = externalGuide.url
        updateData.external_guide_file_url = externalGuide.fileUrl
        updateData.external_guide_file_name = externalGuide.fileName
        updateData.external_guide_title = externalGuide.title
      }

      const { error } = await client
        .from('campaigns')
        .update(updateData)
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
    // 외부 가이드 모드일 때 처리
    if (guideDeliveryMode === 'external') {
      // 외부 가이드 필수 체크
      if (!externalGuide.url && !externalGuide.fileUrl) {
        alert('PDF 파일을 업로드하거나 Google 문서 URL을 입력해주세요.')
        return
      }

      setGenerating(true)

      try {
        const client = supabaseKorea || supabaseBiz

        const { error } = await client
          .from('campaigns')
          .update({
            brand: productData.brand,
            product_name: productData.product_name,
            product_features: productData.product_features,
            product_key_points: productData.product_key_points,
            creator_autonomy: creatorAutonomy,
            guide_delivery_mode: 'external',
            external_guide_type: externalGuide.type,
            external_guide_url: externalGuide.url,
            external_guide_file_url: externalGuide.fileUrl,
            external_guide_file_name: externalGuide.fileName,
            external_guide_title: externalGuide.title,
            guide_generated_at: new Date().toISOString()
          })
          .eq('id', id)

        if (error) throw error

        alert('가이드가 등록되었습니다! 결제 페이지로 이동합니다.')
        navigate(`/company/campaigns/${id}/invoice?region=korea`)
      } catch (error) {
        console.error('Error saving external guide:', error)
        alert('가이드 저장 중 오류가 발생했습니다: ' + error.message)
      } finally {
        setGenerating(false)
      }
      return
    }

    // AI 가이드 모드일 때 (기존 로직)
    // 필수 항목 체크
    if (!productData.brand || !productData.product_name || !productData.product_features || !productData.product_key_points) {
      alert('모든 항목을 입력해주세요.')
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
          creator_autonomy: creatorAutonomy,
          guide_delivery_mode: 'ai'
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Gemini API를 사용한 AI 가이드 생성
      const prompt = `당신은 전문 마케팅 콘텐츠 기획자입니다. 다음 제품에 대한 크리에이터 콘텐츠 가이드를 작성해주세요.

[제품 정보]
브랜드: ${productData.brand}
제품명: ${productData.product_name}
제품 특징: ${productData.product_features}
핵심 포인트: ${productData.product_key_points}

${creatorAutonomy ? '크리에이터에게 자율성을 부여하여 창의적인 콘텐츠를 만들 수 있도록 가이드해주세요.' : '구체적이고 상세한 가이드를 제공해주세요.'}

다음 항목을 포함해야 합니다:
1. 콘텐츠 개요 (목표와 메시지)
2. 촬영 가이드 (장면 구성과 순서)
3. 필수 요소 (대사, 장면, 해시태그)
4. 편집 팁 (영상 분위기, 음악, 자막)
5. 주의사항

전문적이고 실용적인 가이드를 작성해주세요.`

      // 가이드 생성: 복잡한 콘텐츠 → gemini-1.5-flash (품질 중요)
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + import.meta.env.VITE_GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })

      if (!response.ok) throw new Error('AI 생성 실패')

      const data = await response.json()
      const generatedGuide = data.candidates[0].content.parts[0].text

      // AI 캠페인 지원 가이드 저장
      const { error: guideError } = await client
        .from('campaigns')
        .update({
          ai_generated_guide: generatedGuide,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (guideError) throw guideError

      alert('가이드가 생성되었습니다! 결제 페이지로 이동합니다.')
      navigate(`/company/campaigns/${id}/invoice?region=korea`)
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
          <h1 className="text-3xl font-bold mb-2">캠페인 가이드 작성</h1>
          <p className="text-gray-600">
            캠페인: <span className="font-semibold">{campaign.title}</span>
          </p>
        </div>

        {/* 가이드 취소 확인 모달 */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">가이드 취소</h3>
                  <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-medium mb-2">주의사항:</p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>기존 가이드 데이터가 모두 삭제됩니다</li>
                  <li>이미 크리에이터에게 전달된 경우 혼란이 발생할 수 있습니다</li>
                  <li>업로드된 PDF 파일은 스토리지에서 삭제되지 않습니다</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                가이드를 취소하고 다시 생성하시겠습니까?
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1"
                >
                  닫기
                </Button>
                <Button
                  onClick={handleCancelGuide}
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

        {/* 가이드 전달 완료 상태 표시 */}
        {isGuideDelivered && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 mb-1">가이드가 이미 등록되었습니다</p>
                <p className="text-sm text-amber-700 mb-3">
                  {campaign.guide_delivery_mode === 'external'
                    ? '외부 가이드(파일/URL)가 등록되어 있습니다.'
                    : 'AI 가이드가 생성되어 있습니다.'}
                  {' '}다시 생성하려면 기존 가이드를 취소해야 합니다.
                </p>
                <Button
                  onClick={() => setShowCancelModal(true)}
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-100"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  가이드 취소하고 다시 생성
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        {!isGuideDelivered && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">안내사항</p>
              <p>촬영 장면 및 대사는 크리에이터 선정 후 해당 크리에이터에 맞게 작성됩니다.</p>
              <p className="mt-1">현재 단계에서는 제품 정보만 입력해주세요.</p>
            </div>
          </div>
        )}

        {/* 가이드 전달 방식 선택 (가이드가 없을 때만) */}
        {!isGuideDelivered && (
          <>
            <GuideDeliveryModeSelector
              mode={guideDeliveryMode}
              onModeChange={setGuideDeliveryMode}
              className="mb-6"
            />

            {/* 외부 가이드 업로드 (외부 가이드 모드일 때만) */}
            {guideDeliveryMode === 'external' && (
              <div className="mb-6">
                <ExternalGuideUploader
                  value={externalGuide}
                  onChange={setExternalGuide}
                  campaignId={id}
                  prefix=""
                  supabaseClient={supabaseBiz}
                />

                {/* 외부 가이드 등록 완료 상태 표시 */}
                {(externalGuide.url || externalGuide.fileUrl) && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-semibold">가이드가 준비되었습니다</p>
                      <p className="mt-1">
                        {externalGuide.type === 'pdf' ? 'PDF 파일이 업로드' : 'Google 문서 URL이 등록'}되었습니다.
                        아래 "가이드 등록" 버튼을 눌러 완료해주세요.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI 모드일 때만 크리에이터 자율성 체크박스와 제품 정보 입력 표시 */}
            {guideDeliveryMode === 'ai' && (
          <>
            {/* 크리에이터 자율성 체크박스 */}
            <div className="bg-white rounded-lg border p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={creatorAutonomy}
                  onChange={(e) => setCreatorAutonomy(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    촬영 장면 및 대사는 크리에이터 자율로 하겠습니다
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    체크 시 크리에이터가 제품 소개 방식을 자유롭게 결정할 수 있습니다.
                    단, 핵심 소구 포인트는 반드시 포함되어야 합니다.
                  </p>
                </div>
              </label>
            </div>

        <div className="space-y-6">
          {/* 브랜드명 */}
          <div className="bg-white rounded-lg border p-6">
            <label className="block mb-2">
              <span className="text-lg font-semibold">브랜드명</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              value={productData.brand}
              onChange={(e) => setProductData({ ...productData, brand: e.target.value })}
              placeholder="예: ABC Beauty"
              className="text-base"
              required
            />
          </div>

          {/* 제품명 */}
          <div className="bg-white rounded-lg border p-6">
            <label className="block mb-2">
              <span className="text-lg font-semibold">제품명</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              value={productData.product_name}
              onChange={(e) => setProductData({ ...productData, product_name: e.target.value })}
              placeholder="예: 히알루론산 수분 크림"
              className="text-base"
              required
            />
          </div>

          {/* 제품 특징 */}
          <div className="bg-white rounded-lg border p-6">
            <label className="block mb-2">
              <span className="text-lg font-semibold">제품 특징</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-3">
              제품의 주요 성분, 효능, 특징 등을 상세히 작성해주세요.
            </p>
            <textarea
              value={productData.product_features}
              onChange={(e) => setProductData({ ...productData, product_features: e.target.value })}
              placeholder="예:&#10;- 주요 성분: 히알루론산, 세라마이드, 나이아신아마이드&#10;- 효능: 24시간 수분 지속, 피부 장벽 강화, 브라이트닝&#10;- 특징: 끈적임 없는 수분 제형, 민감성 피부 테스트 완료"
              className="w-full h-40 p-3 border rounded-lg resize-none text-base"
              required
            />
          </div>

          {/* 영상에 꼭 들어갈 제품 소구 포인트 */}
          <div className="bg-white rounded-lg border p-6">
            <label className="block mb-2">
              <span className="text-lg font-semibold">영상에 꼭 들어갈 제품 소구 포인트</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-3">
              크리에이터가 영상에서 반드시 강조해야 할 핵심 메시지를 작성해주세요.
            </p>
            <textarea
              value={productData.product_key_points}
              onChange={(e) => setProductData({ ...productData, product_key_points: e.target.value })}
              placeholder="예:&#10;- 24시간 수분 지속력 강조&#10;- 끈적임 없는 텍스처 언급&#10;- 민감성 피부도 사용 가능하다는 점 강조&#10;- 브랜드 ABC의 신제품임을 명시"
              className="w-full h-40 p-3 border rounded-lg resize-none text-base"
              required
                />
              </div>
            </div>
              </>
            )}

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
                className={`flex-1 ${
                  guideDeliveryMode === 'external'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                }`}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {guideDeliveryMode === 'external' ? '등록 중...' : '가이드 생성 중...'}
                  </>
                ) : (
                  <>
                    {guideDeliveryMode === 'external' ? (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        가이드 등록
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        가이드 생성
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
