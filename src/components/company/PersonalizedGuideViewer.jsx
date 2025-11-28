import { useState } from 'react'
import { Edit, Save, X, ExternalLink } from 'lucide-react'
import { Button } from '../ui/button'

export default function PersonalizedGuideViewer({ guide, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedGuide, setEditedGuide] = useState(null)
  const [saving, setSaving] = useState(false)

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
      <div className="text-center text-gray-500 py-8">
        <p className="mb-2">가이드 데이터를 불러올 수 없습니다.</p>
        <p className="text-sm">가이드를 다시 생성해주세요.</p>
      </div>
    )
  }
  
  // Validate that we have the required fields
  if (!guideData.shooting_scenes || !Array.isArray(guideData.shooting_scenes)) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="mb-2">가이드 형식이 올바르지 않습니다.</p>
        <p className="text-sm">가이드를 다시 생성해주세요.</p>
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

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">🎬 맞춤 촬영 가이드</h3>
        {!isEditing && onSave && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-1" />
            수정
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="w-4 h-4 mr-1" />
              {saving ? '저장 중...' : '저장'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={saving} size="sm">
              <X className="w-4 h-4 mr-1" />
              취소
            </Button>
          </div>
        )}
      </div>

      {/* Campaign Info */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">캠페인 제목</p>
            <p className="font-semibold">{displayData.campaign_title}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">플랫폼</p>
            <p className="font-semibold uppercase">{displayData.target_platform}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">영상 길이</p>
            <p className="font-semibold">{displayData.video_duration}</p>
          </div>
        </div>
      </div>

      {/* Shooting Scenes */}
      <div className="bg-white rounded-lg border p-6">
        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
          🎥 촬영 장면 구성 ({displayData.shooting_scenes?.length || 0}개)
        </h4>
        <div className="space-y-4">
          {displayData.shooting_scenes?.map((scene, index) => (
            <div key={index} className="border-l-4 border-purple-500 pl-4 py-2 bg-gray-50 rounded-r">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  장면 {scene.order}
                </span>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {scene.scene_type}
                </span>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600">장면 설명</label>
                    <input
                      type="text"
                      value={scene.scene_description}
                      onChange={(e) => {
                        const newScenes = [...editedGuide.shooting_scenes]
                        newScenes[index].scene_description = e.target.value
                        setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                      }}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">대사</label>
                    <input
                      type="text"
                      value={scene.dialogue}
                      onChange={(e) => {
                        const newScenes = [...editedGuide.shooting_scenes]
                        newScenes[index].dialogue = e.target.value
                        setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                      }}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">촬영 팁</label>
                    <input
                      type="text"
                      value={scene.shooting_tip}
                      onChange={(e) => {
                        const newScenes = [...editedGuide.shooting_scenes]
                        newScenes[index].shooting_tip = e.target.value
                        setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
                      }}
                      className="w-full p-2 border rounded text-sm"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">장면:</span> {scene.scene_description}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">💬 대사:</span> "{scene.dialogue}"
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">💡 촬영 팁:</span> {scene.shooting_tip}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Required Hashtags */}
      {displayData.required_hashtags && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-bold text-lg mb-4">🏷️ 필수 해시태그</h4>
          <div className="space-y-3">
            {displayData.required_hashtags.real && displayData.required_hashtags.real.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">리얼 해시태그</p>
                <div className="flex flex-wrap gap-2">
                  {displayData.required_hashtags.real.map((tag, index) => (
                    <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {displayData.required_hashtags.product && displayData.required_hashtags.product.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">제품 해시태그</p>
                <div className="flex flex-wrap gap-2">
                  {displayData.required_hashtags.product.map((tag, index) => (
                    <span key={index} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
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
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-bold text-lg mb-4">💡 가이드 추천 이유</h4>
          
          {displayData.why_recommended.scene_reasoning && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">장면 구성 이유</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {displayData.why_recommended.scene_reasoning}
              </p>
            </div>
          )}

          {displayData.why_recommended.content_strategy && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">콘텐츠 전략</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {displayData.why_recommended.content_strategy}
              </p>
            </div>
          )}

          {displayData.why_recommended.reference_videos && displayData.why_recommended.reference_videos.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">참고 영상</p>
              <div className="space-y-2">
                {displayData.why_recommended.reference_videos.map((video, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">{video.title}</p>
                        <p className="text-xs text-gray-600 mb-1">조회수: {video.views}</p>
                        <p className="text-xs text-gray-700">{video.key_point}</p>
                      </div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 flex-shrink-0"
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
      )}

      {/* Shooting Requirements */}
      {displayData.shooting_requirements && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-bold text-lg mb-4">📋 촬영 필수 요구사항</h4>
          
          {displayData.shooting_requirements.must_include && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">필수 포함 장면</p>
              <ul className="list-disc list-inside space-y-1">
                {displayData.shooting_requirements.must_include.map((item, index) => (
                  <li key={index} className="text-sm text-gray-600">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {displayData.shooting_requirements.video_style && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">영상 스타일</p>
              <div className="bg-gray-50 p-3 rounded space-y-2">
                {displayData.shooting_requirements.video_style.tempo && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">템포:</span> {displayData.shooting_requirements.video_style.tempo}
                  </p>
                )}
                {displayData.shooting_requirements.video_style.tone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">톤:</span> {displayData.shooting_requirements.video_style.tone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creator Tips */}
      {displayData.creator_tips && displayData.creator_tips.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
          <h4 className="font-bold text-lg mb-4">✨ 크리에이터 팁</h4>
          <ul className="space-y-2">
            {displayData.creator_tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-orange-500 font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
