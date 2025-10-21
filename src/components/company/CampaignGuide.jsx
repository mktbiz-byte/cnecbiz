import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, CheckCircle, Plus, X } from 'lucide-react'

export default function CampaignGuide() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [referenceUrls, setReferenceUrls] = useState([''])
  
  const [guideData, setGuideData] = useState({
    product_info: '',
    usage_notes: '',
    required_dialogue: '',
    custom_scenes: '',
    required_scenes: {
      unboxing: false,
      closeup: false,
      before_after: false,
      texture: false,
      usage_process: false,
      packaging: false,
      brand_logo: false,
      other: false
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

      // 기존 가이드가 있으면 로드
      const { data: existingGuide } = await supabaseBiz
        .from('campaign_guides')
        .select('*')
        .eq('campaign_id', id)
        .single()

      if (existingGuide) {
        setGuideData({
          product_info: existingGuide.product_info || '',
          usage_notes: existingGuide.usage_notes || '',
          required_dialogue: existingGuide.required_dialogue || '',
          custom_scenes: existingGuide.custom_scenes || '',
          required_scenes: existingGuide.required_scenes || guideData.required_scenes
        })
        setReferenceUrls(existingGuide.reference_urls || [''])
      }
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  const addReferenceUrl = () => {
    setReferenceUrls([...referenceUrls, ''])
  }

  const removeReferenceUrl = (index) => {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== index))
  }

  const updateReferenceUrl = (index, value) => {
    const newUrls = [...referenceUrls]
    newUrls[index] = value
    setReferenceUrls(newUrls)
  }

  const handleSceneToggle = (scene) => {
    setGuideData({
      ...guideData,
      required_scenes: {
        ...guideData.required_scenes,
        [scene]: !guideData.required_scenes[scene]
      }
    })
  }

  const handleSaveDraft = async () => {
    await saveGuide('draft')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await saveGuide('pending_approval')
  }

  const saveGuide = async (status) => {
    setLoading(true)

    try {
      // 가이드 저장
      const guidePayload = {
        campaign_id: id,
        product_info: guideData.product_info,
        usage_notes: guideData.usage_notes,
        reference_urls: referenceUrls.filter(url => url.trim() !== ''),
        required_dialogue: guideData.required_dialogue,
        required_scenes: guideData.required_scenes,
        custom_scenes: guideData.custom_scenes
      }

      const { error: guideError } = await supabaseBiz
        .from('campaign_guides')
        .upsert(guidePayload)

      if (guideError) throw guideError

      // 캠페인 상태 업데이트
      const { error: campaignError } = await supabaseBiz
        .from('campaigns')
        .update({ status })
        .eq('id', id)

      if (campaignError) throw campaignError

      if (status === 'pending_approval') {
        alert('가이드가 저장되고 승인 요청이 제출되었습니다!')
        navigate('/company/campaigns')
      } else {
        alert('임시 저장되었습니다.')
      }
    } catch (error) {
      console.error('Error saving guide:', error)
      alert('저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const sceneOptions = [
    { id: 'unboxing', label: '제품 언박싱', description: '제품 포장을 여는 장면' },
    { id: 'closeup', label: '제품 클로즈업', description: '제품을 가까이서 보여주는 장면' },
    { id: 'before_after', label: '사용 전/후 비교', description: '사용 전후 피부 상태 비교' },
    { id: 'texture', label: '제품 텍스처', description: '제품의 질감과 발림성' },
    { id: 'usage_process', label: '제품 사용 과정', description: '실제 사용하는 장면' },
    { id: 'packaging', label: '제품 패키징 소개', description: '패키지 디자인과 구성' },
    { id: 'brand_logo', label: '브랜드 로고 노출', description: '브랜드 로고를 명확히 보여주기' },
    { id: 'other', label: '기타', description: '아래에 직접 입력' }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">캠페인 가이드 작성</h1>
        <p className="text-gray-600">
          캠페인: <span className="font-semibold">{campaign.title}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 제품 정보 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">제품 정보</h2>
          <textarea
            value={guideData.product_info}
            onChange={(e) => setGuideData({ ...guideData, product_info: e.target.value })}
            placeholder="제품의 특징, 성분, 효능 등을 상세히 작성해주세요.&#10;&#10;예:&#10;- 제품명: ABC 수분 크림&#10;- 주요 성분: 히알루론산, 세라마이드&#10;- 효능: 24시간 수분 지속, 피부 장벽 강화"
            className="w-full h-40 p-3 border rounded-lg resize-none"
            required
          />
        </div>

        {/* 제품 사용 시 참고사항 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">제품 사용 시 참고사항</h2>
          <textarea
            value={guideData.usage_notes}
            onChange={(e) => setGuideData({ ...guideData, usage_notes: e.target.value })}
            placeholder="제품 사용 방법, 주의사항, 보관 방법 등을 작성해주세요.&#10;&#10;예:&#10;- 세안 후 토너 다음 단계에서 사용&#10;- 적당량을 덜어 얼굴 전체에 부드럽게 펴 발라주세요&#10;- 직사광선을 피해 서늘한 곳에 보관"
            className="w-full h-32 p-3 border rounded-lg resize-none"
          />
        </div>

        {/* 참고할 레퍼런스 URL */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">참고할 레퍼런스 URL</h2>
          <p className="text-sm text-gray-600 mb-4">
            크리에이터가 참고할 수 있는 영상, 이미지, 웹사이트 링크를 추가해주세요.
          </p>
          <div className="space-y-3">
            {referenceUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => updateReferenceUrl(index, e.target.value)}
                  placeholder="https://example.com/reference-video"
                  className="flex-1"
                />
                {referenceUrls.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeReferenceUrl(index)}
                    variant="outline"
                    size="icon"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              onClick={addReferenceUrl}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              레퍼런스 URL 추가
            </Button>
          </div>
        </div>

        {/* 필수 대사 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">필수 대사</h2>
          <p className="text-sm text-gray-600 mb-4">
            크리에이터가 영상에서 꼭 언급해야 할 내용을 작성해주세요.
          </p>
          <textarea
            value={guideData.required_dialogue}
            onChange={(e) => setGuideData({ ...guideData, required_dialogue: e.target.value })}
            placeholder="예:&#10;- '이 제품은 24시간 수분을 지속시켜줍니다'&#10;- '민감한 피부에도 자극 없이 사용할 수 있어요'&#10;- '브랜드명 ABC의 신제품입니다'"
            className="w-full h-32 p-3 border rounded-lg resize-none"
          />
        </div>

        {/* 필수 촬영 장면 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">필수 촬영 장면</h2>
          <p className="text-sm text-gray-600 mb-4">
            영상에 포함되어야 할 장면을 선택해주세요. (AI 가이드 생성 시 참고됩니다)
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {sceneOptions.map(scene => (
              <label
                key={scene.id}
                className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={guideData.required_scenes[scene.id]}
                  onChange={() => handleSceneToggle(scene.id)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium">{scene.label}</div>
                  <div className="text-sm text-gray-500">{scene.description}</div>
                </div>
              </label>
            ))}
          </div>

          {guideData.required_scenes.other && (
            <div>
              <label className="block text-sm font-medium mb-2">기타 촬영 장면 (직접 입력)</label>
              <textarea
                value={guideData.custom_scenes}
                onChange={(e) => setGuideData({ ...guideData, custom_scenes: e.target.value })}
                placeholder="추가로 필요한 촬영 장면을 자유롭게 작성해주세요."
                className="w-full h-24 p-3 border rounded-lg resize-none"
              />
            </div>
          )}
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading}
            variant="outline"
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
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                승인 요청 제출
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

