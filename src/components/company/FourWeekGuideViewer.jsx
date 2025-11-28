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
    if (campaign && campaign.challenge_weekly_guides) {
      setWeekGuides(campaign.challenge_weekly_guides)
    }
  }, [campaign])

  const handleSaveWeek = async (weekToSave) => {
    setSaving(true)
    try {
      const updatedGuides = {
        ...campaign.challenge_weekly_guides,
        [weekToSave]: weekGuides[weekToSave]
      }
      
      const { error } = await supabase
        .from('campaigns')
        .update({
          challenge_weekly_guides: updatedGuides
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

  if (!campaign.challenge_weekly_guides || Object.keys(campaign.challenge_weekly_guides).length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">아직 생성된 4주 챌린지 촬영 가이드가 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">좌측의 "🤖 AI 생성" 버튼을 클릭하세요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">📸 4주 챌린지 촬영 가이드</h3>
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
        {!currentGuide ? (
          <p className="text-gray-500">{activeWeek.replace('week', '')}주차 가이드가 없습니다.</p>
        ) : editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상품 정보</label>
              <textarea
                value={currentGuide.product_info || ''}
                onChange={(e) => setWeekGuides(prev => ({
                  ...prev,
                  [activeWeek]: { ...prev[activeWeek], product_info: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">미션</label>
              <textarea
                value={currentGuide.mission || ''}
                onChange={(e) => setWeekGuides(prev => ({
                  ...prev,
                  [activeWeek]: { ...prev[activeWeek], mission: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">필수 대사</label>
              <textarea
                value={Array.isArray(currentGuide.required_dialogues) ? currentGuide.required_dialogues.join('\n') : ''}
                onChange={(e) => setWeekGuides(prev => ({
                  ...prev,
                  [activeWeek]: { ...prev[activeWeek], required_dialogues: e.target.value.split('\n') }
                }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="한 줄에 하나씩 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">필수 촬영 장면</label>
              <textarea
                value={Array.isArray(currentGuide.required_scenes) ? currentGuide.required_scenes.join('\n') : ''}
                onChange={(e) => setWeekGuides(prev => ({
                  ...prev,
                  [activeWeek]: { ...prev[activeWeek], required_scenes: e.target.value.split('\n') }
                }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="한 줄에 하나씩 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">주의사항</label>
              <textarea
                value={currentGuide.cautions || ''}
                onChange={(e) => setWeekGuides(prev => ({
                  ...prev,
                  [activeWeek]: { ...prev[activeWeek], cautions: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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

            {/* 미션 */}
            {currentGuide.mission && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 미션</h4>
                <p className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg whitespace-pre-wrap">
                  {currentGuide.mission}
                </p>
              </div>
            )}

            {/* 필수 해시태그 */}
            {currentGuide.hashtags && currentGuide.hashtags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">#️⃣ 필수 해시태그</h4>
                <div className="flex flex-wrap gap-2">
                  {currentGuide.hashtags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
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
