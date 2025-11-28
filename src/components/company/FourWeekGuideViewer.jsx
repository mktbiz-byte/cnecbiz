import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function FourWeekGuideViewer({ campaign, supabase, onUpdate }) {
  const [activeWeek, setActiveWeek] = useState('week1')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  
  const [weekGuides, setWeekGuides] = useState({
    week1: null,
    week2: null,
    week3: null,
    week4: null
  })

  useEffect(() => {
    if (campaign) {
      setWeekGuides({
        week1: campaign.week1_guide ? (typeof campaign.week1_guide === 'string' ? campaign.week1_guide : JSON.stringify(campaign.week1_guide, null, 2)) : null,
        week2: campaign.week2_guide ? (typeof campaign.week2_guide === 'string' ? campaign.week2_guide : JSON.stringify(campaign.week2_guide, null, 2)) : null,
        week3: campaign.week3_guide ? (typeof campaign.week3_guide === 'string' ? campaign.week3_guide : JSON.stringify(campaign.week3_guide, null, 2)) : null,
        week4: campaign.week4_guide ? (typeof campaign.week4_guide === 'string' ? campaign.week4_guide : JSON.stringify(campaign.week4_guide, null, 2)) : null
      })
    }
  }, [campaign])

  const handleSaveWeek = async (weekToSave) => {
    setSaving(true)
    try {
      const weekColumn = `${weekToSave}_guide`
      
      const { error } = await supabase
        .from('campaigns')
        .update({
          [weekColumn]: weekGuides[weekToSave]
        })
        .eq('id', campaign.id)

      if (error) throw error

      const weekNum = weekToSave.replace('week', '')
      alert(`✅ ${weekNum}주차 가이드가 저장되었습니다!`)
      setEditing(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error saving guide:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSendWeek = async (weekToSend) => {
    const weekNum = weekToSend.replace('week', '')
    
    if (!confirm(`${weekNum}주차 가이드를 모든 참여자에게 전달하시겠습니까?`)) {
      return
    }

    setSending(true)
    try {
      // First save the guide
      await handleSaveWeek(weekToSend)

      // Get all participants for this campaign
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('user_id, user_profiles(email, name)')
        .eq('campaign_id', campaign.id)
        .eq('status', 'selected')

      if (participantsError) throw participantsError

      if (!participants || participants.length === 0) {
        alert('선정된 참여자가 없습니다.')
        return
      }

      // TODO: Send email/notification to participants
      // For now, just show success message
      alert(`✅ ${weekNum}주차 가이드가 ${participants.length}명의 참여자에게 전달되었습니다!`)
      
    } catch (error) {
      console.error('Error sending guide:', error)
      alert('전달 실패: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const currentGuide = weekGuides[activeWeek]

  if (!campaign.week1_guide && !campaign.week2_guide && !campaign.week3_guide && !campaign.week4_guide) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">아직 생성된 4주 챌린지 가이드가 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">상단의 "AI 최종 가이드 생성하기" 버튼을 클릭하세요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">4주 챌린지 가이드</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          {editing ? '취소' : '✏️ 수정'}
        </button>
      </div>

      {/* 주차 탭 */}
      <div className="flex gap-2 px-6 pt-4 border-b">
        {['week1', 'week2', 'week3', 'week4'].map((week, idx) => (
          <button
            key={week}
            onClick={() => setActiveWeek(week)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeWeek === week
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {idx + 1}주차
          </button>
        ))}
      </div>

      {/* 가이드 내용 */}
      <div className="p-6">
        {editing ? (
          <textarea
            value={currentGuide || ''}
            onChange={(e) => setWeekGuides(prev => ({ ...prev, [activeWeek]: e.target.value }))}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            placeholder={`${activeWeek.replace('week', '')}주차 가이드를 입력하세요...`}
          />
        ) : (
          <div className="prose max-w-none">
            {currentGuide ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                {currentGuide}
              </pre>
            ) : (
              <p className="text-gray-500">{activeWeek.replace('week', '')}주차 가이드가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 저장 및 전달 버튼 */}
      {editing && (
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => handleSaveWeek(activeWeek)}
            disabled={saving}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            💾 {activeWeek.replace('week', '')}주차 저장
          </button>
          <button
            onClick={() => handleSendWeek(activeWeek)}
            disabled={sending || saving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            📤 {activeWeek.replace('week', '')}주차 전달
          </button>
        </div>
      )}
    </div>
  )
}
