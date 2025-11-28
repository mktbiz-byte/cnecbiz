import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function OliveyoungGuideViewer({ campaign, supabase, onUpdate }) {
  const [activeStep, setActiveStep] = useState('step1')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [stepGuides, setStepGuides] = useState({
    step1: '',
    step2: '',
    step3: ''
  })

  useEffect(() => {
    if (campaign) {
      setStepGuides({
        step1: campaign.oliveyoung_step1_guide || '',
        step2: campaign.oliveyoung_step2_guide || '',
        step3: campaign.oliveyoung_step3_guide || ''
      })
    }
  }, [campaign])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          oliveyoung_step1_guide: stepGuides.step1,
          oliveyoung_step2_guide: stepGuides.step2,
          oliveyoung_step3_guide: stepGuides.step3
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

  const currentGuide = stepGuides[activeStep]

  if (!campaign.oliveyoung_step1_guide && !campaign.oliveyoung_step2_guide && !campaign.oliveyoung_step3_guide) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">아직 생성된 올리브영 가이드가 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">상단의 "AI 최종 가이드 생성하기" 버튼을 클릭하세요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">올리브영 가이드</h3>
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
        {editing ? (
          <textarea
            value={currentGuide}
            onChange={(e) => setStepGuides(prev => ({ ...prev, [activeStep]: e.target.value }))}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 font-mono text-sm"
            placeholder={`STEP ${activeStep.replace('step', '')} 가이드를 입력하세요...`}
          />
        ) : (
          <div className="prose max-w-none">
            {currentGuide ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                {currentGuide}
              </pre>
            ) : (
              <p className="text-gray-500">STEP {activeStep.replace('step', '')} 가이드가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      {editing && (
        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            💾 저장
          </button>
        </div>
      )}
    </div>
  )
}
