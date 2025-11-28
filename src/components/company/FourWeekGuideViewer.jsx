import { useState } from 'react'
import { X } from 'lucide-react'

export default function FourWeekGuideViewer({ campaign, onClose }) {
  const [activeWeek, setActiveWeek] = useState('week1')

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

  // Get current week data
  const getCurrentWeekData = () => {
    const weekData = weeklyGuides[activeWeek]
    
    // If weekData is a string, convert to simple object
    if (typeof weekData === 'string') {
      return {
        guide_text: weekData,
        is_simple: true
      }
    }
    
    // If weekData is an object, return as is
    return weekData || null
  }

  const getCurrentDeadline = () => {
    const weekNum = activeWeek.replace('week', '')
    const deadlineField = `week${weekNum}_deadline`
    return campaign[deadlineField]
  }

  const currentWeekData = getCurrentWeekData()
  const currentDeadline = getCurrentDeadline()

  // Debug logging
  console.log('FourWeekGuideViewer Debug:', {
    activeWeek,
    currentWeekData,
    isSimpleFormat: currentWeekData?.is_simple,
    guideText: currentWeekData?.guide_text
  })

  // Check if it's simple text format
  const isSimpleFormat = currentWeekData?.is_simple

  // Extract all fields from JSON (for object format)
  const productInfo = currentWeekData?.product_info || ''
  const mission = currentWeekData?.mission || ''
  const requiredDialogues = currentWeekData?.required_dialogues || []
  const requiredScenes = currentWeekData?.required_scenes || []
  const cautions = currentWeekData?.cautions || ''
  const hashtags = currentWeekData?.hashtags || []
  const referenceUrls = currentWeekData?.reference_urls || []

  // Simple text format
  const guideText = currentWeekData?.guide_text || ''

  const hasContent = isSimpleFormat ? !!guideText : (productInfo || mission || requiredDialogues.length > 0 || requiredScenes.length > 0 || cautions || hashtags.length > 0 || referenceUrls.length > 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* 주차 탭 */}
        <div className="flex gap-2 px-6 pt-4 border-b bg-white">
          {[
            { key: 'week1', label: '1주차' },
            { key: 'week2', label: '2주차' },
            { key: 'week3', label: '3주차' },
            { key: 'week4', label: '4주차' }
          ].map((week) => (
            <button
              key={week.key}
              onClick={() => setActiveWeek(week.key)}
              className={`px-6 py-3 font-medium text-sm transition-all ${
                activeWeek === week.key
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {week.label}
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

          {hasContent ? (
            <div className="space-y-6">
              {/* Simple text format */}
              {isSimpleFormat ? (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <h4 className="text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <span>📝</span>
                    {activeWeek.replace('week', '')}주차 가이드
                  </h4>
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {guideText}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Object format - 제품 정보 */}
                  {productInfo && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>📦</span>
                        제품 정보
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {productInfo}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 미션 */}
                  {mission && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span>🎯</span>
                        {activeWeek.replace('week', '')}주차 미션
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {mission}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 필수 대사 */}
                  {requiredDialogues.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span>💬</span>
                        필수 대사
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <ul className="space-y-2">
                          {requiredDialogues.map((dialogue, idx) => (
                            <li key={idx} className="text-sm text-gray-800 flex gap-2">
                              <span className="text-blue-600 font-semibold">{idx + 1}.</span>
                              <span>{dialogue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 필수 장면 */}
                  {requiredScenes.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-green-900 mb-3 flex items-center gap-2">
                        <span>🎬</span>
                        필수 장면
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-green-100">
                        <ul className="space-y-2">
                          {requiredScenes.map((scene, idx) => (
                            <li key={idx} className="text-sm text-gray-800 flex gap-2">
                              <span className="text-green-600 font-semibold">{idx + 1}.</span>
                              <span>{scene}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 주의사항 */}
                  {cautions && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                        <span>⚠️</span>
                        주의사항
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-red-100">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {cautions}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 필수 해시태그 */}
                  {hashtags.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <span>📌</span>
                        필수 해시태그
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {hashtags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium border border-indigo-300"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 참고 영상 URL */}
                  {referenceUrls.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
                        <span>🔗</span>
                        참고 영상
                      </h4>
                      <div className="space-y-3">
                        {referenceUrls.map((url, idx) => (
                          <div key={idx} className="bg-white border border-orange-200 rounded-lg p-4">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:text-blue-800 hover:underline break-all transition-all"
                            >
                              {url}
                            </a>
                          </div>
                        ))}
                        <p className="text-xs text-gray-500 mt-3">
                          💡 위 영상을 참고하여 촬영해 주세요. 클릭하면 새 창에서 열립니다.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">
                {activeWeek.replace('week', '')}주차 가이드가 등록되지 않았습니다.
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
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
