import { useState } from 'react'
import { X } from 'lucide-react'

export default function FourWeekGuideViewer({ campaign, onClose }) {
  const [activeWeek, setActiveWeek] = useState(1)

  // Parse challenge_weekly_guides JSON
  const parseWeeklyGuides = () => {
    if (!campaign.challenge_weekly_guides) return {}
    try {
      return typeof campaign.challenge_weekly_guides === 'string' 
        ? JSON.parse(campaign.challenge_weekly_guides) 
        : campaign.challenge_weekly_guides
    } catch {
      return {}
    }
  }

  const weeklyGuides = parseWeeklyGuides()

  // Get current week data
  const getCurrentWeekData = () => {
    return weeklyGuides[`week${activeWeek}`] || null
  }

  const getWeekDeadline = () => {
    const deadlineField = `week${activeWeek}_deadline`
    return campaign[deadlineField]
  }

  const currentWeekData = getCurrentWeekData()
  const currentDeadline = getWeekDeadline()
  const currentUrls = currentWeekData?.reference_urls || []
  const weekMission = currentWeekData?.mission || ''

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <h3 className="text-xl font-bold text-gray-900">🎯 4주 챌린지 촬영 가이드</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 주차 탭 */}
        <div className="flex gap-2 px-6 pt-4 border-b bg-white">
          {[1, 2, 3, 4].map((week) => (
            <button
              key={week}
              onClick={() => setActiveWeek(week)}
              className={`px-6 py-3 font-medium text-sm transition-all ${
                activeWeek === week
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {week}주차
            </button>
          ))}
        </div>

        {/* 가이드 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 마감일 표시 */}
          {currentDeadline && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <span className="text-yellow-700 font-semibold">📅 마감일:</span>
                <span className="text-yellow-900 font-bold">
                  {new Date(currentDeadline).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </span>
              </div>
            </div>
          )}

          {/* 미션 설명 */}
          {weekMission && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
              <h4 className="text-base font-bold text-blue-900 mb-3">🎯 {activeWeek}주차 미션</h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                {weekMission}
              </p>
            </div>
          )}

          {/* URL 표시 */}
          {currentUrls.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-purple-600">🔗</span>
                참고 영상
              </h4>
              {currentUrls.map((url, idx) => (
                <div key={idx} className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 hover:underline break-all bg-white px-4 py-3 rounded-lg border border-blue-200 transition-all hover:shadow-md"
                  >
                    {url}
                  </a>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-3">
                💡 위 영상을 참고하여 촬영해 주세요. 클릭하면 새 창에서 열립니다.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">
                {activeWeek}주차의 참고 영상 URL이 등록되지 않았습니다.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                관리자에게 문의해 주세요.
              </p>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
