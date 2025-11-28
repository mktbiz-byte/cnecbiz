import { useState } from 'react'
import { Button } from '../ui/button'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'

export default function FourWeekGuideManager({ campaign, filteredParticipants, onRefresh }) {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [singleWeekGuideData, setSingleWeekGuideData] = useState({ 
    required_dialogue: '', 
    required_scenes: '', 
    examples: '', 
    reference_urls: '' 
  })
  const [showSingleWeekModal, setShowSingleWeekModal] = useState(false)
  const [showWeekGuideViewModal, setShowWeekGuideViewModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const safeParseGuide = (guideText) => {
    if (!guideText) return { required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' }
    try {
      const trimmed = guideText.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed)
      }
      return {
        required_dialogue: trimmed,
        required_scenes: '',
        examples: '',
        reference_urls: ''
      }
    } catch (e) {
      return {
        required_dialogue: guideText,
        required_scenes: '',
        examples: '',
        reference_urls: ''
      }
    }
  }

  const handleGenerateWeekGuide = async (week) => {
    setIsGenerating(true)
    try {
      const response = await fetch('/.netlify/functions/generate-4week-challenge-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: campaign,
          weekNumber: week,
          individualMessage: '',
          creatorName: '크리에이터'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Supabase에 가이드 저장
      const { error } = await getSupabaseClient()
        .from('campaigns')
        .update({ [`week${week}_guide`]: data.guide })
        .eq('id', campaign.id)

      if (error) throw error

      alert(`${week}주차 가이드가 생성되었습니다!`)
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error(`Error generating week${week} guide:`, error)
      alert(`${week}주차 가이드 생성 실패: ` + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendWeekGuide = async (week) => {
    if (!confirm(`${week}주차 가이드를 참여 크리에이터들에게 발송하시겠습니까?`)) return
    
    try {
      let successCount = 0
      let errorCount = 0
      
      for (const participant of filteredParticipants) {
        try {
          await getSupabaseClient()
            .from('participants')
            .update({
              [`week${week}_guide_sent`]: true,
              [`week${week}_guide_sent_at`]: new Date().toISOString()
            })
            .eq('id', participant.id)
          
          successCount++
        } catch (error) {
          console.error(`Error sending week${week} guide to ${participant.id}:`, error)
          errorCount++
        }
      }
      
      alert(`${week}주차 가이드 발송 완료!\\n성공: ${successCount}명\\n실패: ${errorCount}명`)
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error(`Error sending week${week} guides:`, error)
      alert(`${week}주차 가이드 발송 실패: ` + error.message)
    }
  }

  const renderWeekSection = (week) => {
    const guideField = `week${week}_guide`
    const hasGuide = campaign[guideField]

    return (
      <div key={week} className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">{week}주차 가이드</h4>
          <div className="flex gap-2">
            <Button
              onClick={() => handleGenerateWeekGuide(week)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isGenerating}
            >
              {isGenerating ? '생성 중...' : '🤖 AI 생성'}
            </Button>
            
            {hasGuide && (
              <>
                <Button
                  onClick={() => {
                    setCurrentWeek(week)
                    setSingleWeekGuideData(safeParseGuide(campaign[guideField]))
                    setShowWeekGuideViewModal(true)
                  }}
                  size="sm"
                  variant="outline"
                >
                  가이드 보기
                </Button>
                
                <Button
                  onClick={() => handleSendWeekGuide(week)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  발송
                </Button>
              </>
            )}
          </div>
        </div>
        {hasGuide && (
          <p className="text-sm text-gray-600">✅ 가이드 생성 완료</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">🏆 4주 챌린지 가이드 관리</h3>
      {[1, 2, 3, 4].map(week => renderWeekSection(week))}
      
      {/* 가이드 보기 모달 */}
      {showWeekGuideViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{currentWeek}주차 가이드</h3>
              <button
                onClick={() => setShowWeekGuideViewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {singleWeekGuideData.required_dialogue && (
                <div>
                  <h4 className="font-semibold mb-2">필수 대사</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {singleWeekGuideData.required_dialogue}
                  </p>
                </div>
              )}
              
              {singleWeekGuideData.required_scenes && (
                <div>
                  <h4 className="font-semibold mb-2">필수 장면</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {singleWeekGuideData.required_scenes}
                  </p>
                </div>
              )}
              
              {singleWeekGuideData.examples && (
                <div>
                  <h4 className="font-semibold mb-2">예시</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {singleWeekGuideData.examples}
                  </p>
                </div>
              )}
              
              {singleWeekGuideData.reference_urls && (
                <div>
                  <h4 className="font-semibold mb-2">참고 URL</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {singleWeekGuideData.reference_urls}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowWeekGuideViewModal(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
