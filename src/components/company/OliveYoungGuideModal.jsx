import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Plus, X, Loader2 } from 'lucide-react'

export default function OliveYoungGuideModal({ 
  campaign, 
  onClose, 
  onSave,
  supabase 
}) {
  const [guideData, setGuideData] = useState({
    product_info: '',
    hashtags: [],
    required_dialogues: ['', '', ''],
    required_scenes: ['', '', ''],
    cautions: '',
    reference_urls: ['']
  })
  
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing guide if available
  useEffect(() => {
    if (campaign.oliveyoung_final_guide) {
      try {
        const parsed = JSON.parse(campaign.oliveyoung_final_guide)
        setGuideData(parsed)
      } catch (e) {
        console.error('Failed to parse guide:', e)
      }
    }
  }, [campaign])

  const handleGenerateGuide = async () => {
    setGenerating(true)
    try {
      // AI 가이드 생성 로직
      const response = await fetch('/.netlify/functions/generate-oliveyoung-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: {
            brand: campaign.brand,
            product_name: campaign.product_name,
            product_features: campaign.product_features,
            oliveyoung_step1_guide: campaign.oliveyoung_step1_guide,
            oliveyoung_step2_guide: campaign.oliveyoung_step2_guide,
            oliveyoung_step3_guide: campaign.oliveyoung_step3_guide
          }
        })
      })

      if (!response.ok) throw new Error('AI 생성 실패')
      
      const { guide } = await response.json()
      setGuideData(guide)
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
          oliveyoung_final_guide: JSON.stringify(guideData),
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

  const addItem = (field) => {
    setGuideData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeItem = (field, index) => {
    setGuideData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const updateItem = (field, index, value) => {
    setGuideData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold">🎉 올리브영 세일 가이드</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* AI 생성 버튼 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800 mb-3">
                캠페인 생성 시 작성한 내용을 바탕으로 AI가 가이드를 생성합니다.
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

            {/* 상품 정보 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📦 상품 정보
              </label>
              <textarea
                value={guideData.product_info}
                onChange={(e) => setGuideData({ ...guideData, product_info: e.target.value })}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="브랜드, 제품명, 주요 특징 등을 정리해주세요."
              />
            </div>

            {/* 해시태그 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                #️⃣ 해시태그
              </label>
              {guideData.hashtags.map((tag, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => updateItem('hashtags', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="#해시태그"
                  />
                  <button
                    onClick={() => removeItem('hashtags', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                onClick={() => addItem('hashtags')}
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
              {guideData.required_dialogues.map((dialogue, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={dialogue}
                    onChange={(e) => updateItem('required_dialogues', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`필수 대사 ${index + 1}`}
                  />
                  {guideData.required_dialogues.length > 3 && (
                    <button
                      onClick={() => removeItem('required_dialogues', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {guideData.required_dialogues.length < 5 && (
                <Button
                  onClick={() => addItem('required_dialogues')}
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
              {guideData.required_scenes.map((scene, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <textarea
                    value={scene}
                    onChange={(e) => updateItem('required_scenes', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder={`필수 장면 ${index + 1}`}
                    rows={2}
                  />
                  {guideData.required_scenes.length > 3 && (
                    <button
                      onClick={() => removeItem('required_scenes', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {guideData.required_scenes.length < 5 && (
                <Button
                  onClick={() => addItem('required_scenes')}
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
                value={guideData.cautions}
                onChange={(e) => setGuideData({ ...guideData, cautions: e.target.value })}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="크리에이터가 반드시 지켜야 할 주의사항을 작성해주세요."
              />
            </div>

            {/* 참고 영상 URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔗 참고 영상 URL
              </label>
              {guideData.reference_urls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateItem('reference_urls', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <button
                    onClick={() => removeItem('reference_urls', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                onClick={() => addItem('reference_urls')}
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
