import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function OliveyoungGuideViewer({ campaign, supabase, onUpdate }) {
  const [activeStep, setActiveStep] = useState('step1')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  
  const [stepGuides, setStepGuides] = useState({
    step1: null,
    step2: null,
    step3: null
  })

  useEffect(() => {
    if (campaign) {
      const parseGuide = (guideText) => {
        if (!guideText) return null
        try {
          return typeof guideText === 'string' ? JSON.parse(guideText) : guideText
        } catch {
          return null
        }
      }

      setStepGuides({
        step1: parseGuide(campaign.oliveyoung_step1_guide_ai),
        step2: parseGuide(campaign.oliveyoung_step2_guide_ai),
        step3: parseGuide(campaign.oliveyoung_step3_guide_ai)
      })
    }
  }, [campaign])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          oliveyoung_step1_guide_ai: stepGuides.step1 ? JSON.stringify(stepGuides.step1) : null,
          oliveyoung_step2_guide_ai: stepGuides.step2 ? JSON.stringify(stepGuides.step2) : null,
          oliveyoung_step3_guide_ai: stepGuides.step3 ? JSON.stringify(stepGuides.step3) : null
        })
        .eq('id', campaign.id)

      if (error) throw error

      alert('✅ 가이드가 저장되었습니다!')
      setEditing(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error saving guide:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSendAll = async () => {
    if (!confirm('올리브영 가이드 (STEP 1, 2, 3)를 모든 참여자에게 전달하시겠습니까?\n\n알림톡과 이메일이 발송됩니다.')) {
      return
    }

    setSending(true)
    try {
      // First save the guide
      await handleSave()

      // Call Netlify Function to send notifications
      const response = await fetch('/.netlify/functions/deliver-oliveyoung-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          region: 'korea' // TODO: Get from campaign or context
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to deliver guide')
      }

      const result = await response.json()
      
      if (result.errorCount > 0) {
        alert(`✅ 올리브영 가이드 전달 완료\n\n성공: ${result.successCount}명\n실패: ${result.errorCount}명`)
      } else {
        alert(`✅ 올리브영 가이드가 ${result.successCount}명의 참여자에게 전달되었습니다!\n\n알림톡과 이메일이 발송되었습니다.`)
      }
      
      if (onUpdate) onUpdate()
      
    } catch (error) {
      console.error('Error sending guide:', error)
      alert('전달 실패: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const currentGuide = stepGuides[activeStep]

  if (!campaign.oliveyoung_step1_guide_ai && !campaign.oliveyoung_step2_guide_ai && !campaign.oliveyoung_step3_guide_ai) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">아직 생성된 올리브영 촬영 가이드가 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">상단의 "AI 최종 가이드 생성하기" 버튼을 클릭하세요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">📸 올리브영 촬영 가이드</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          {editing ? '취소' : '✏️ 수정'}
        </button>
      </div>

      {/* STEP 탭 */}
      <div className="flex gap-2 px-6 pt-4 border-b">
        {['step1', 'step2', 'step3'].map((step, idx) => (
          <button
            key={step}
            onClick={() => setActiveStep(step)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeStep === step
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            STEP {idx + 1}
          </button>
        ))}
      </div>

      {/* 가이드 내용 */}
      <div className="p-6">
        {!currentGuide ? (
          <p className="text-gray-500">STEP {activeStep.replace('step', '')} 가이드가 없습니다.</p>
        ) : editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상품 정보</label>
              <textarea
                value={currentGuide.product_info || ''}
                onChange={(e) => setStepGuides(prev => ({
                  ...prev,
                  [activeStep]: { ...prev[activeStep], product_info: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">필수 대사</label>
              <textarea
                value={Array.isArray(currentGuide.required_dialogues) ? currentGuide.required_dialogues.join('\n') : ''}
                onChange={(e) => setStepGuides(prev => ({
                  ...prev,
                  [activeStep]: { ...prev[activeStep], required_dialogues: e.target.value.split('\n') }
                }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                placeholder="한 줄에 하나씩 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">필수 촬영 장면</label>
              <textarea
                value={Array.isArray(currentGuide.required_scenes) ? currentGuide.required_scenes.join('\n') : ''}
                onChange={(e) => setStepGuides(prev => ({
                  ...prev,
                  [activeStep]: { ...prev[activeStep], required_scenes: e.target.value.split('\n') }
                }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                placeholder="한 줄에 하나씩 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">주의사항</label>
              <textarea
                value={currentGuide.cautions || ''}
                onChange={(e) => setStepGuides(prev => ({
                  ...prev,
                  [activeStep]: { ...prev[activeStep], cautions: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 상품 정보 */}
            {currentGuide.product_info && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📦 상품 정보</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {currentGuide.product_info}
                </p>
              </div>
            )}

            {/* 필수 해시태그 */}
            {currentGuide.hashtags && currentGuide.hashtags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">#️⃣ 필수 해시태그</h4>
                <div className="flex flex-wrap gap-2">
                  {currentGuide.hashtags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 필수 대사 */}
            {currentGuide.required_dialogues && currentGuide.required_dialogues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">💬 필수 대사</h4>
                <ul className="space-y-2">
                  {currentGuide.required_dialogues.map((dialogue, idx) => (
                    <li key={idx} className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
                      <span className="font-semibold text-yellow-700">{idx + 1}.</span>
                      <span>{dialogue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 필수 촬영 장면 */}
            {currentGuide.required_scenes && currentGuide.required_scenes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">🎥 필수 촬영 장면</h4>
                <ul className="space-y-2">
                  {currentGuide.required_scenes.map((scene, idx) => (
                    <li key={idx} className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                      <span className="font-semibold text-blue-700">{idx + 1}.</span>
                      <span>{scene}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 주의사항 */}
            {currentGuide.cautions && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">⚠️ 주의사항</h4>
                <p className="text-sm text-gray-600 bg-red-50 p-3 rounded-lg whitespace-pre-wrap">
                  {currentGuide.cautions}
                </p>
              </div>
            )}

            {/* 참고 영상 */}
            {currentGuide.reference_urls && currentGuide.reference_urls.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">🔗 참고 영상</h4>
                <div className="space-y-2">
                  {currentGuide.reference_urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-800 underline bg-gray-50 p-3 rounded-lg"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 저장 및 전달 버튼 */}
      {editing && (
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving || sending}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            💾 저장
          </button>
          <button
            onClick={handleSendAll}
            disabled={saving || sending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            📤 전체 전달 (STEP 1, 2, 3)
          </button>
        </div>
      )}
    </div>
  )
}
