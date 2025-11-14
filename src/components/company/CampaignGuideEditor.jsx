import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseKorea } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function CampaignGuideEditor() {
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

  const [creatorAutonomy, setCreatorAutonomy] = useState(false)

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      console.log('Loading campaign with id:', id)
      
      if (!id) {
        alert('캠페인 ID가 없습니다.')
        return
      }

      const { data, error } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()
      
      console.log('Campaign data:', data)
      console.log('Campaign error:', error)

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
          creator_autonomy: creatorAutonomy
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
      alert('모든 항목을 입력해주세요.')
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
          creator_autonomy: creatorAutonomy
        })
        .eq('id', id)

      if (updateError) throw updateError

      // AI 가이드 생성 (추후 구현)
      alert('가이드가 생성되었습니다! 리뷰 페이지로 이동합니다.')
      navigate(`/company/campaigns/${id}/review`)
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

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">안내사항</p>
            <p>촬영 장면 및 대사는 크리에이터 선정 후 해당 크리에이터에 맞게 작성됩니다.</p>
            <p className="mt-1">현재 단계에서는 제품 정보만 입력해주세요.</p>
          </div>
        </div>

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
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
        </div>
      </div>
    </>
  )
}
