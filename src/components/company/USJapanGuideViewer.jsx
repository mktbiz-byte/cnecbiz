import { useState } from 'react'
import { Edit, Save, X, Copy, Film, MessageSquare, Lightbulb, Camera, Sparkles, Globe } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'

/**
 * US/Japan Scene Guide Viewer - Shows Korean and translated content side by side
 * This viewer is specifically designed for the new scene guide format with translations
 */
export default function USJapanGuideViewer({ guide, creator, onSave, region = 'us' }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedGuide, setEditedGuide] = useState(null)
  const [saving, setSaving] = useState(false)

  const targetLanguage = region === 'japan' ? '日本語' : 'English'
  const targetLanguageLabel = region === 'japan' ? '일본어' : '영어'

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

  // Support both old format (shooting_scenes) and new format (scenes)
  const scenes = guideData.scenes || guideData.shooting_scenes

  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
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

  // Normalize the data
  const normalizedData = {
    ...guideData,
    scenes: scenes
  }

  const handleEdit = () => {
    setEditedGuide(JSON.parse(JSON.stringify(normalizedData)))
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!onSave) return
    try {
      setSaving(true)
      await onSave(editedGuide)
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

  const handleSceneChange = (index, field, value) => {
    setEditedGuide(prev => {
      const newScenes = [...prev.scenes]
      newScenes[index] = { ...newScenes[index], [field]: value }
      return { ...prev, scenes: newScenes }
    })
  }

  const displayData = isEditing ? editedGuide : normalizedData

  // Scene type badge styles
  const getSceneTypeStyle = (type) => {
    const typeStr = (type || '').toLowerCase()
    if (typeStr.includes('후킹') || typeStr.includes('hook') || typeStr.includes('훅'))
      return 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
    if (typeStr.includes('before') || typeStr.includes('비포'))
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    if (typeStr.includes('after') || typeStr.includes('애프터'))
      return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
    if (typeStr.includes('사용') || typeStr.includes('use') || typeStr.includes('제품'))
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
    if (typeStr.includes('cta') || typeStr.includes('마무리') || typeStr.includes('엔딩'))
      return 'bg-gradient-to-r from-rose-500 to-red-500 text-white'
    if (typeStr.includes('인트로') || typeStr.includes('intro'))
      return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
    return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
  }

  const copyGuideToClipboard = () => {
    const guideText = displayData.scenes.map(scene => `
[씬 ${scene.order}] ${scene.scene_type || ''}
촬영장면: ${scene.scene_description || ''}
${scene.scene_description_translated ? `(${targetLanguageLabel}) ${scene.scene_description_translated}` : ''}
대사: ${scene.dialogue || ''}
${scene.dialogue_translated ? `(${targetLanguageLabel}) ${scene.dialogue_translated}` : ''}
${scene.shooting_tip ? `촬영팁: ${scene.shooting_tip}` : ''}
${scene.shooting_tip_translated ? `(${targetLanguageLabel}) ${scene.shooting_tip_translated}` : ''}
`).join('\n---\n')

    navigator.clipboard.writeText(guideText)
    alert('가이드가 클립보드에 복사되었습니다!')
  }

  const creatorName = creator?.creator_name || creator?.applicant_name || '크리에이터'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
            <Film className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            맞춤 촬영 가이드
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({region === 'japan' ? '일본' : '미국'})
            </span>
          </h3>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={copyGuideToClipboard} className="text-gray-600">
                <Copy className="w-3.5 h-3.5 mr-1" />
                복사
              </Button>
              {onSave && (
                <Button variant="outline" size="sm" onClick={handleEdit} className="text-gray-600 hover:text-purple-600 border-gray-200 hover:border-purple-300">
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  수정
                </Button>
              )}
            </>
          )}
          {isEditing && (
            <>
              <Button onClick={handleSave} disabled={saving} size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Save className="w-3.5 h-3.5 mr-1" />
                {saving ? '저장 중...' : '저장'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving} size="sm">
                <X className="w-3.5 h-3.5 mr-1" />
                취소
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Language Legend */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
          <span className="text-sm text-gray-600">한국어 (원본)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-sm text-blue-700">{targetLanguageLabel} (번역)</span>
        </div>
      </div>

      {/* Scenes Table with Side-by-Side View */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <Camera className="w-4 h-4 text-purple-600" />
          <h4 className="font-bold text-gray-900 text-sm">
            촬영 장면 구성 <span className="text-purple-600">({displayData.scenes?.length || 0}개)</span>
          </h4>
          <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <Globe className="w-3.5 h-3.5" />
            <span>한국어 / {targetLanguageLabel} 병렬 표시</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {displayData.scenes?.map((scene, index) => (
            <div key={index} className="p-4 hover:bg-gray-50/50 transition-colors">
              {/* Scene Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-sm font-bold min-w-[40px] text-center">
                  {scene.order || index + 1}
                </span>
                {isEditing ? (
                  <Input
                    value={scene.scene_type || ''}
                    onChange={(e) => handleSceneChange(index, 'scene_type', e.target.value)}
                    className="w-48"
                    placeholder="씬 타입"
                  />
                ) : (
                  scene.scene_type && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSceneTypeStyle(scene.scene_type)}`}>
                      {scene.scene_type}
                    </span>
                  )
                )}
              </div>

              {/* Scene Description - Side by Side */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Camera className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase">촬영 장면</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={scene.scene_description || ''}
                      onChange={(e) => handleSceneChange(index, 'scene_description', e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                      placeholder="촬영 장면 설명"
                    />
                  ) : (
                    <p className="text-sm text-gray-800 bg-white border border-gray-100 rounded-lg p-3">
                      {scene.scene_description || '-'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600 uppercase">{targetLanguage}</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={scene.scene_description_translated || ''}
                      onChange={(e) => handleSceneChange(index, 'scene_description_translated', e.target.value)}
                      rows={3}
                      className="resize-none text-sm bg-blue-50 border-blue-200"
                      placeholder={`${targetLanguageLabel} 번역`}
                    />
                  ) : (
                    <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3">
                      {scene.scene_description_translated || <span className="text-blue-400 italic">번역 없음</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Dialogue - Side by Side */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase">대사 / 자막</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={scene.dialogue || ''}
                      onChange={(e) => handleSceneChange(index, 'dialogue', e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                      placeholder="대사"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 bg-white border border-gray-100 rounded-lg p-3 italic">
                      "{scene.dialogue || '-'}"
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-semibold text-green-600 uppercase">{targetLanguage}</span>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={scene.dialogue_translated || ''}
                      onChange={(e) => handleSceneChange(index, 'dialogue_translated', e.target.value)}
                      rows={3}
                      className="resize-none text-sm bg-green-50 border-green-200"
                      placeholder={`${targetLanguageLabel} 번역`}
                    />
                  ) : (
                    <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg p-3 italic">
                      "{scene.dialogue_translated || <span className="not-italic text-green-400">번역 없음</span>}"
                    </div>
                  )}
                </div>
              </div>

              {/* Shooting Tip - Side by Side */}
              {(scene.shooting_tip || scene.shooting_tip_translated || isEditing) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase">촬영 팁</span>
                    </div>
                    {isEditing ? (
                      <Input
                        value={scene.shooting_tip || ''}
                        onChange={(e) => handleSceneChange(index, 'shooting_tip', e.target.value)}
                        className="text-sm"
                        placeholder="촬영 팁"
                      />
                    ) : (
                      <p className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                        {scene.shooting_tip || '-'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-600 uppercase">{targetLanguage}</span>
                    </div>
                    {isEditing ? (
                      <Input
                        value={scene.shooting_tip_translated || ''}
                        onChange={(e) => handleSceneChange(index, 'shooting_tip_translated', e.target.value)}
                        className="text-sm bg-amber-50 border-amber-200"
                        placeholder={`${targetLanguageLabel} 번역`}
                      />
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        {scene.shooting_tip_translated || <span className="text-amber-400">번역 없음</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Required Elements */}
      {(displayData.required_dialogues?.length > 0 || displayData.required_scenes?.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {displayData.required_dialogues?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-gray-900 text-sm">필수 대사</h4>
              </div>
              <div className="p-4 space-y-2">
                {displayData.required_dialogues.filter(d => d.trim()).map((dialogue, index) => (
                  <div key={index} className="flex items-start gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                    <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700">{dialogue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {displayData.required_scenes?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-gray-900 text-sm">필수 촬영장면</h4>
              </div>
              <div className="p-4 space-y-2">
                {displayData.required_scenes.filter(s => s.trim()).map((scene, index) => (
                  <div key={index} className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700">{scene}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Style Settings (if available) */}
      {(displayData.dialogue_style || displayData.tempo || displayData.mood) && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-purple-200/50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h4 className="font-bold text-gray-900 text-sm">스타일 설정</h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              {displayData.dialogue_style && (
                <div className="text-center">
                  <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">대사 스타일</p>
                  <p className="text-sm font-semibold text-gray-800">{displayData.dialogue_style}</p>
                </div>
              )}
              {displayData.tempo && (
                <div className="text-center">
                  <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">템포</p>
                  <p className="text-sm font-semibold text-gray-800">{displayData.tempo}</p>
                </div>
              )}
              {displayData.mood && (
                <div className="text-center">
                  <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">분위기</p>
                  <p className="text-sm font-semibold text-gray-800">{displayData.mood}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
