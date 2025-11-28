import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

export default function OliveyoungGuideModal({ campaign, supabase, onUpdate, onClose }) {
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

  // STEP 3 고정 안내 문구
  const step3FixedInstruction = {
    title: "📌 STEP 3: 인스타그램 URL 업로드 안내",
    content: `2번 영상에 제품 구매 링크(URL)를 삽입하여 지정된 날짜에 맞춰 업로드해 주세요.

⚠️ 중요 사항:
• 플랫폼: 인스타그램 한정
• 업로드 기한: ${campaign.step3_deadline ? new Date(campaign.step3_deadline).toLocaleDateString('ko-KR') : '캠페인 상세 확인'}
• 유지 기간: 24시간 이상 필수 유지
• URL 삽입 위치: 2번 영상 설명란 또는 스토리 링크

※ 24시간 이내 삭제 시 캠페인 규정 위반으로 처리될 수 있습니다.`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
          <h3 className="text-xl font-bold text-gray-900">📸 올리브영 촬영 가이드</h3>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ✏️ 수정
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* STEP 탭 */}
        <div className="flex gap-2 px-6 pt-4 border-b bg-white">
          {['step1', 'step2', 'step3'].map((step, idx) => (
            <button
              key={step}
              onClick={() => setActiveStep(step)}
              className={`px-6 py-3 font-medium text-sm transition-all ${
                activeStep === step
                  ? 'border-b-2 border-pink-600 text-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              STEP {idx + 1}
            </button>
          ))}
        </div>

        {/* 가이드 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 3 고정 안내 */}
          {activeStep === 'step3' && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <h4 className="text-sm font-bold text-blue-900 mb-2">{step3FixedInstruction.title}</h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                {step3FixedInstruction.content}
              </p>
            </div>
          )}

          {!currentGuide ? (
            <p className="text-gray-500 text-center py-12">
              STEP {activeStep.replace('step', '')} 가이드가 없습니다.
              <br />
              <span className="text-sm text-gray-400 mt-2 block">
                "AI 최종 가이드 생성하기" 버튼을 클릭하여 가이드를 생성하세요.
              </span>
            </p>
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

        {/* 하단 버튼 */}
        {editing && (
          <div className="px-6 py-4 border-t bg-gray-50 space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                disabled={saving || sending}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || sending}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                💾 저장
              </button>
            </div>
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
    </div>
  )
}
