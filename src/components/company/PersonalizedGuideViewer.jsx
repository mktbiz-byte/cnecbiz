import { useState } from 'react'
import { Edit, Save, X, ExternalLink, Video, Clock, Hash, Lightbulb, CheckCircle, Camera, MessageSquare, Sparkles, Film, Play } from 'lucide-react'
import { Button } from '../ui/button'

export default function PersonalizedGuideViewer({ guide, onSave, additionalMessage, onSaveMessage }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedGuide, setEditedGuide] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(additionalMessage || '')

  // Parse guide if it's a string
  const parseGuide = (guideData) => {
    if (!guideData) {
      console.log('No guide data provided')
      return null
    }

    // If it's already an object, return it
    if (typeof guideData === 'object') {
      console.log('Guide data is already an object:', guideData)
      return guideData
    }

    // If it's a string, try to parse it
    if (typeof guideData === 'string') {
      // Check for empty or invalid strings
      const trimmed = guideData.trim()
      if (!trimmed || trimmed === '``' || trimmed === '```') {
        console.log('Guide data is empty or invalid:', trimmed)
        return null
      }

      try {
        const parsed = JSON.parse(trimmed)
        console.log('Successfully parsed guide data:', parsed)
        return parsed
      } catch (e) {
        console.error('Failed to parse guide as JSON:', e)
        console.error('Raw guide data:', guideData)
        return null
      }
    }

    console.log('Unknown guide data type:', typeof guideData)
    return null
  }

  const guideData = parseGuide(guide)

  if (!guideData) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          <Film className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-600 mb-2">가이드 데이터를 불러올 수 없습니다</p>
        <p className="text-sm text-gray-400">가이드를 다시 생성해주세요</p>
      </div>
    )
  }

  // Validate that we have the required fields
  if (!guideData.shooting_scenes || !Array.isArray(guideData.shooting_scenes)) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
          <Film className="w-10 h-10 text-orange-400" />
        </div>
        <p className="text-lg font-medium text-gray-600 mb-2">가이드 형식이 올바르지 않습니다</p>
        <p className="text-sm text-gray-400">가이드를 다시 생성해주세요</p>
      </div>
    )
  }

  const handleEdit = () => {
    setEditedGuide(JSON.parse(JSON.stringify(guideData)))
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!onSave) return

    try {
      setSaving(true)
      await onSave(JSON.stringify(editedGuide))
      setIsEditing(false)
      alert('수정이 저장되었습니다!')
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedGuide(null)
    setIsEditing(false)
  }

  const displayData = isEditing ? editedGuide : guideData

  // Scene type colors
  const getSceneTypeStyle = (type) => {
    const typeStr = (type || '').toLowerCase()
    if (typeStr.includes('후킹') || typeStr.includes('hook')) {
      return 'bg-gradient-to-r from-orange-400 to-amber-400 text-white'
    }
    if (typeStr.includes('before')) {
      return 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
    }
    if (typeStr.includes('after')) {
      return 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
    }
    if (typeStr.includes('사용') || typeStr.includes('use')) {
      return 'bg-gradient-to-r from-purple-400 to-pink-400 text-white'
    }
    if (typeStr.includes('cta') || typeStr.includes('마무리')) {
      return 'bg-gradient-to-r from-rose-400 to-red-400 text-white'
    }
    return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
  }

  return (
    <div className="space-y-8">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
            <Film className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">맞춤 촬영 가이드</h3>
        </div>
        {!isEditing && onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-600 hover:text-purple-600 transition-all"
          >
            <Edit className="w-4 h-4 mr-1.5" />
            수정
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? '저장 중...' : '저장'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              size="sm"
              className="border-gray-200 hover:border-gray-300"
            >
              <X className="w-4 h-4 mr-1.5" />
              취소
            </Button>
          </div>
        )}
      </div>

      {/* Campaign Info Card */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-gray-100">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">캠페인 제목</p>
            <p className="font-semibold text-gray-900 leading-tight">{displayData.campaign_title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">플랫폼</p>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-500" />
              <p className="font-semibold text-gray-900 uppercase">{displayData.target_platform}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">영상 길이</p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <p className="font-semibold text-gray-900">{displayData.video_duration}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shooting Scenes */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Camera className="w-4 h-4 text-purple-600" />
            </div>
            <h4 className="font-bold text-gray-900">
              촬영 장면 구성 <span className="text-purple-600">({displayData.shooting_scenes?.length || 0}개)</span>
            </h4>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {displayData.shooting_scenes?.map((scene, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-r from-gray-50 to-white rounded-xl p-5 border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200"
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-pink-400 rounded-l-xl"></div>

              <div className="pl-3">
                {/* Scene badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                    장면 {scene.order}
                  </span>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getSceneTypeStyle(scene.scene_type)}`}>
                    {scene.scene_type}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">장면 설명</label>
                      <input
                        type="text"
                        value={scene.scene_description}
                        onChange={(e) => {
                          const newScenes = [...editedGuide.shooting_scenes]
                          newScenes[index].scene_description = e.target.value
                          setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">대사</label>
                      <input
                        type="text"
                        value={scene.dialogue}
                        onChange={(e) => {
                          const newScenes = [...editedGuide.shooting_scenes]
                          newScenes[index].dialogue = e.target.value
                          setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">촬영 팁</label>
                      <input
                        type="text"
                        value={scene.shooting_tip}
                        onChange={(e) => {
                          const newScenes = [...editedGuide.shooting_scenes]
                          newScenes[index].shooting_tip = e.target.value
                          setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-800 leading-relaxed">
                      <span className="font-semibold text-gray-900">장면:</span> {scene.scene_description}
                    </p>
                    <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-gray-100">
                      <MessageSquare className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700 italic">"{scene.dialogue}"</p>
                    </div>
                    <div className="flex items-start gap-2 text-gray-600">
                      <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm"><span className="font-medium">촬영 팁:</span> {scene.shooting_tip}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Required Hashtags */}
      {displayData.required_hashtags && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Hash className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-bold text-gray-900">필수 해시태그</h4>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {displayData.required_hashtags.real && displayData.required_hashtags.real.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">리얼 해시태그</p>
                <div className="flex flex-wrap gap-2">
                  {displayData.required_hashtags.real.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium border border-emerald-200 hover:shadow-md transition-shadow cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {displayData.required_hashtags.product && displayData.required_hashtags.product.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">제품 해시태그</p>
                <div className="flex flex-wrap gap-2">
                  {displayData.required_hashtags.product.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 px-4 py-2 rounded-full text-sm font-medium border border-rose-200 hover:shadow-md transition-shadow cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Why Recommended */}
      {displayData.why_recommended && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900">가이드 추천 이유</h4>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {displayData.why_recommended.scene_reasoning && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">장면 구성 이유</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {displayData.why_recommended.scene_reasoning}
                </p>
              </div>
            )}

            {displayData.why_recommended.content_strategy && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">콘텐츠 전략</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {displayData.why_recommended.content_strategy}
                </p>
              </div>
            )}

            {displayData.why_recommended.reference_videos && displayData.why_recommended.reference_videos.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">참고 영상</p>
                <div className="space-y-3">
                  {displayData.why_recommended.reference_videos.map((video, index) => (
                    <div key={index} className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Play className="w-4 h-4 text-purple-500" />
                            <p className="font-semibold text-gray-900 text-sm">{video.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">조회수: {video.views}</p>
                          <p className="text-sm text-gray-600">{video.key_point}</p>
                        </div>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-9 h-9 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shooting Requirements */}
      {displayData.shooting_requirements && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900">촬영 필수 요구사항</h4>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {displayData.shooting_requirements.must_include && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">필수 포함 장면</p>
                <div className="space-y-2">
                  {displayData.shooting_requirements.must_include.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-2.5 border border-blue-100">
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayData.shooting_requirements.video_style && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">영상 스타일</p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                  {displayData.shooting_requirements.video_style.tempo && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400 uppercase w-16">템포</span>
                      <span className="text-sm text-gray-700">{displayData.shooting_requirements.video_style.tempo}</span>
                    </div>
                  )}
                  {displayData.shooting_requirements.video_style.tone && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400 uppercase w-16">톤</span>
                      <span className="text-sm text-gray-700">{displayData.shooting_requirements.video_style.tone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creator Tips */}
      {displayData.creator_tips && displayData.creator_tips.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl border border-amber-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-bold text-gray-900">크리에이터 팁</h4>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {displayData.creator_tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-white">
                  <span className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Additional Message Input */}
      {onSaveMessage && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-gray-100">
            <h4 className="font-bold text-gray-900">크리에이터에게 전달할 추가 메시지 (선택사항)</h4>
          </div>
          <div className="p-6">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="예: 촬영 시 제품을 먼저 클로즈업해주세요. 배경은 밝게 유지해주시면 감사하겠습니다."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}
