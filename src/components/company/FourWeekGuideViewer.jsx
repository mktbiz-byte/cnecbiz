import { useState } from 'react'
import { X, Calendar, Target } from 'lucide-react'

export default function FourWeekGuideViewer({ campaign, onClose }) {
  // Parse challenge_weekly_guides_ai JSON
  const parseWeeklyGuides = () => {
    if (!campaign.challenge_weekly_guides_ai) return {}
    try {
      return typeof campaign.challenge_weekly_guides_ai === 'string' 
        ? JSON.parse(campaign.challenge_weekly_guides_ai) 
        : campaign.challenge_weekly_guides_ai
    } catch {
      return {}
    }
  }

  const weeklyGuides = parseWeeklyGuides()

  // Get week data
  const getWeekData = (weekNum) => {
    return weeklyGuides[`week${weekNum}`] || null
  }

  const getWeekDeadline = (weekNum) => {
    const deadlineField = `week${weekNum}_deadline`
    return campaign[deadlineField]
  }

  const renderWeekSection = (weekNum) => {
    const weekData = getWeekData(weekNum)
    const deadline = getWeekDeadline(weekNum)
    const urls = weekData?.reference_urls || []
    const mission = weekData?.mission || ''

    return (
      <div key={weekNum} className="border-b border-gray-200 last:border-b-0 pb-8 mb-8 last:mb-0">
        {/* 주차 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold text-lg">
            {weekNum}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{weekNum}주차 미션</h3>
            {deadline && (
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700 font-semibold">
                  마감일: {new Date(deadline).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 미션 설명 */}
        {mission ? (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-base font-bold text-blue-900 mb-2">미션 가이드</h4>
                <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                  {mission}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-gray-50 border-l-4 border-gray-300 p-6 rounded-r-lg">
            <p className="text-gray-500 text-sm">
              {weekNum}주차 미션 가이드가 아직 생성되지 않았습니다.
            </p>
          </div>
        )}

        {/* 참고 영상 URL */}
        {urls.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="text-purple-600">🔗</span>
              참고 영상
            </h4>
            {urls.map((url, idx) => (
              <div key={idx} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:text-blue-800 hover:underline break-all bg-white px-4 py-3 rounded-lg border border-blue-200 transition-all hover:shadow-md text-sm"
                >
                  {url}
                </a>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-2">
              💡 위 영상을 참고하여 촬영해 주세요. 클릭하면 새 창에서 열립니다.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">
              {weekNum}주차의 참고 영상 URL이 등록되지 않았습니다.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              관리자에게 문의해 주세요.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <h2 className="text-xl font-bold text-gray-900">🎯 4주 챌린지 촬영 가이드</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 전체 주차 가이드 */}
        <div className="flex-1 overflow-y-auto p-6">
          {[1, 2, 3, 4].map(weekNum => renderWeekSection(weekNum))}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
