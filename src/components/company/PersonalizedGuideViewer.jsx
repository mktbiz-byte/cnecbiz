import { useState } from 'react'
import { Edit, Save, X, ExternalLink, Video, Clock, Hash, Lightbulb, CheckCircle, Camera, MessageSquare, Sparkles, Film, Play, User, Instagram, Youtube, FileText, Link as LinkIcon } from 'lucide-react'
import { Button } from '../ui/button'

export default function PersonalizedGuideViewer({ guide, creator, onSave, additionalMessage, onSaveMessage }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedGuide, setEditedGuide] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(additionalMessage || '')

  // Parse guide if it's a string
  const parseGuide = (guideData) => {
    if (!guideData) return null
    if (typeof guideData === 'object') return guideData
    if (typeof guideData === 'string') {
      const trimmed = guideData.trim()
      if (!trimmed || trimmed === '``' || trimmed === '```') return null
      try {
        return JSON.parse(trimmed)
      } catch (e) {
        console.error('Failed to parse guide as JSON:', e)
        return null
      }
    }
    return null
  }

  const guideData = parseGuide(guide)

  if (!guideData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          <Film className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-base font-medium text-gray-600 mb-1">가이드 데이터를 불러올 수 없습니다</p>
        <p className="text-sm text-gray-400">가이드를 다시 생성해주세요</p>
      </div>
    )
  }

  // 외부 가이드 (PDF/URL) 타입 처리
  if (guideData.type === 'external_pdf' || guideData.type === 'external_url') {
    const isPdf = guideData.type === 'external_pdf'
    const guideUrl = isPdf ? guideData.fileUrl : guideData.url
    const guideTitle = guideData.title || (isPdf ? 'PDF 가이드' : '외부 가이드')

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${
            isPdf ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
          }`}>
            {isPdf ? <FileText className="w-4 h-4 text-white" /> : <LinkIcon className="w-4 h-4 text-white" />}
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {isPdf ? 'PDF 가이드' : '외부 가이드'}
          </h3>
        </div>

        {/* 가이드 카드 */}
        <div className={`rounded-xl border-2 overflow-hidden ${
          isPdf ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50' : 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50'
        }`}>
          <div className="p-6 text-center">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
              isPdf ? 'bg-gradient-to-br from-red-100 to-orange-100' : 'bg-gradient-to-br from-blue-100 to-cyan-100'
            }`}>
              {isPdf ? (
                <FileText className="w-10 h-10 text-red-500" />
              ) : (
                <LinkIcon className="w-10 h-10 text-blue-500" />
              )}
            </div>

            <h4 className="text-xl font-bold text-gray-900 mb-2">{guideTitle}</h4>

            {isPdf && guideData.originalFileName && (
              <p className="text-sm text-gray-500 mb-4">
                파일명: {guideData.originalFileName}
              </p>
            )}

            {guideUrl ? (
              <a
                href={guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 ${
                  isPdf
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                }`}
              >
                <ExternalLink className="w-5 h-5" />
                {isPdf ? 'PDF 열기' : '가이드 열기'}
              </a>
            ) : (
              <p className="text-sm text-gray-400">가이드 URL이 없습니다</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Support both old format (shooting_scenes) and new format (scenes)
  const scenes = guideData.shooting_scenes || guideData.scenes

  if (!scenes || !Array.isArray(scenes)) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
          <Film className="w-8 h-8 text-orange-400" />
        </div>
        <p className="text-base font-medium text-gray-600 mb-1">가이드 형식이 올바르지 않습니다</p>
        <p className="text-sm text-gray-400">가이드를 다시 생성해주세요</p>
      </div>
    )
  }

  // Normalize the data to use shooting_scenes
  const normalizedData = {
    ...guideData,
    shooting_scenes: scenes
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

  const displayData = isEditing ? editedGuide : normalizedData

  // Scene type badge styles
  const getSceneTypeStyle = (type) => {
    const typeStr = (type || '').toLowerCase()
    if (typeStr.includes('후킹') || typeStr.includes('hook')) return 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
    if (typeStr.includes('before')) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    if (typeStr.includes('after')) return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
    if (typeStr.includes('사용') || typeStr.includes('use')) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
    if (typeStr.includes('cta') || typeStr.includes('마무리')) return 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
    return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
  }

  // Platform icon
  const getPlatformIcon = (platform) => {
    const p = (platform || '').toLowerCase()
    if (p.includes('instagram') || p.includes('인스타')) return <Instagram className="w-4 h-4" />
    if (p.includes('youtube') || p.includes('유튜브')) return <Youtube className="w-4 h-4" />
    return <Video className="w-4 h-4" />
  }

  // Open URL safely
  const openUrl = (url) => {
    if (!url) return
    let finalUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer')
  }

  const creatorName = creator?.creator_name || creator?.applicant_name || '크리에이터'
  const creatorPlatform = creator?.creator_platform || creator?.main_channel || creator?.platform || ''
  const creatorProfileImage = creator?.profile_image_url || creator?.creator_profile_image

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
            <Film className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">맞춤 촬영 가이드</h3>
        </div>
        {!isEditing && onSave && (
          <Button variant="outline" size="sm" onClick={handleEdit} className="text-gray-600 hover:text-purple-600 border-gray-200 hover:border-purple-300">
            <Edit className="w-3.5 h-3.5 mr-1" />
            수정
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Save className="w-3.5 h-3.5 mr-1" />
              {saving ? '저장 중...' : '저장'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={saving} size="sm">
              <X className="w-3.5 h-3.5 mr-1" />
              취소
            </Button>
          </div>
        )}
      </div>

      {/* Creator Profile + Campaign Info */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-start gap-4">
          {/* Creator Profile */}
          {creator && (
            <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
              {creatorProfileImage ? (
                <img
                  src={creatorProfileImage}
                  alt={creatorName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg font-bold shadow-md">
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{creatorName}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {getPlatformIcon(creatorPlatform)}
                  <span>{creatorPlatform || '플랫폼'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Info */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">캠페인 제목</p>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{displayData.campaign_title}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">플랫폼</p>
              <div className="flex items-center gap-1.5">
                {getPlatformIcon(displayData.target_platform)}
                <p className="text-sm font-semibold text-gray-900 uppercase">{displayData.target_platform}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">영상 길이</p>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-500" />
                <p className="text-sm font-semibold text-gray-900">{displayData.video_duration}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shooting Scenes - Table Format */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <Camera className="w-4 h-4 text-purple-600" />
          <h4 className="font-bold text-gray-900 text-sm">
            촬영 장면 구성 <span className="text-purple-600">({displayData.shooting_scenes?.length || 0}개)</span>
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16">순서</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-24">장면 유형</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">촬영 장면</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">대사 및 자막</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-48">촬영 팁</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayData.shooting_scenes?.map((scene, index) => (
                <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-2.5 py-1 rounded-full text-xs font-bold">
                      {scene.order}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getSceneTypeStyle(scene.scene_type)}`}>
                      {scene.scene_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={scene.scene_description}
                        onChange={(e) => {
                          const newScenes = [...editedGuide.shooting_scenes]
                          newScenes[index].scene_description = e.target.value
                          setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                        }}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="장면 설명"
                      />
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-800">{scene.scene_description}</p>
                        {scene.scene_description_translated && (
                          <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">{scene.scene_description_translated}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={scene.dialogue}
                        onChange={(e) => {
                          const newScenes = [...editedGuide.shooting_scenes]
                          newScenes[index].dialogue = e.target.value
                          setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                        }}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="대사"
                      />
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 italic">"{scene.dialogue}"</span>
                        </div>
                        {scene.dialogue_translated && (
                          <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded italic">"{scene.dialogue_translated}"</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={scene.shooting_tip}
                        onChange={(e) => {
                          const newScenes = [...editedGuide.shooting_scenes]
                          newScenes[index].shooting_tip = e.target.value
                          setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                        }}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="촬영 팁"
                      />
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-500">{scene.shooting_tip}</span>
                        </div>
                        {scene.shooting_tip_translated && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{scene.shooting_tip_translated}</p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Required Hashtags - Compact */}
      {displayData.required_hashtags && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-gray-900 text-sm">필수 해시태그</h4>
          </div>

          <div className="p-4 space-y-3">
            {displayData.required_hashtags.real && displayData.required_hashtags.real.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">리얼 해시태그</p>
                <div className="flex flex-wrap gap-1.5">
                  {displayData.required_hashtags.real.map((tag, index) => (
                    <span key={index} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium border border-emerald-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {displayData.required_hashtags.product && displayData.required_hashtags.product.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">제품 해시태그</p>
                <div className="flex flex-wrap gap-1.5">
                  {displayData.required_hashtags.product.map((tag, index) => (
                    <span key={index} className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-medium border border-rose-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Why Recommended - Compact */}
      {displayData.why_recommended && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-gray-900 text-sm">가이드 추천 이유</h4>
          </div>

          <div className="p-4 space-y-4">
            {displayData.why_recommended.scene_reasoning && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">장면 구성 이유</p>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                  {displayData.why_recommended.scene_reasoning}
                </p>
              </div>
            )}

            {displayData.why_recommended.content_strategy && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">콘텐츠 전략</p>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                  {displayData.why_recommended.content_strategy}
                </p>
              </div>
            )}

            {/* Reference Videos - Fixed URL handling */}
            {displayData.why_recommended.reference_videos && displayData.why_recommended.reference_videos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">참고 영상</p>
                <div className="space-y-2">
                  {displayData.why_recommended.reference_videos.map((video, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-purple-200 cursor-pointer transition-all"
                      onClick={() => openUrl(video.url)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Play className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <p className="font-medium text-gray-900 text-sm truncate">{video.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">조회수: {video.views}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">{video.key_point}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openUrl(video.url)
                          }}
                          className="flex items-center justify-center w-8 h-8 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shooting Requirements - Compact */}
      {displayData.shooting_requirements && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-gray-900 text-sm">촬영 필수 요구사항</h4>
          </div>

          <div className="p-4 space-y-3">
            {displayData.shooting_requirements.must_include && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">필수 포함 장면</p>
                <div className="space-y-1">
                  {displayData.shooting_requirements.must_include.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-blue-50 rounded px-3 py-1.5 border border-blue-100">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayData.shooting_requirements.video_style && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                {displayData.shooting_requirements.video_style.tempo && (
                  <p className="text-sm text-gray-600"><span className="font-medium">템포:</span> {displayData.shooting_requirements.video_style.tempo}</p>
                )}
                {displayData.shooting_requirements.video_style.tone && (
                  <p className="text-sm text-gray-600"><span className="font-medium">톤:</span> {displayData.shooting_requirements.video_style.tone}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creator Tips - Compact */}
      {displayData.creator_tips && displayData.creator_tips.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-amber-200/50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-gray-900 text-sm">크리에이터 팁</h4>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              {displayData.creator_tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 bg-white/60 rounded-lg px-3 py-2 border border-white">
                  <span className="w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
