import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit,
  Save,
  X,
  FileText,
  Calendar,
  Link as LinkIcon,
  Hash,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AIGuideEditor from './AIGuideEditor'

/**
 * PPT 스타일의 AI 가이드 뷰어 컴포넌트 (편집 기능 포함)
 * 10개 씬을 탭으로 구분하여 가독성 좋게 표시
 */
export default function CampaignGuideViewer({ guide, campaignId, onClose, onUpdate }) {
  const [currentScene, setCurrentScene] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editedGuide, setEditedGuide] = useState(guide)
  const [isSaving, setIsSaving] = useState(false)

  if (!guide) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">가이드 데이터가 없습니다.</p>
      </div>
    )
  }

  // JSON 형식인지 텍스트 형식인지 확인
  const isJsonGuide = typeof guide === 'object' && (guide.shooting_scenes || guide.scenes)

  if (!isJsonGuide) {
    // 기존 텍스트 형식 가이드 표시
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              캠페인 가이드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">{typeof guide === 'string' ? guide : JSON.stringify(guide, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scenes = editedGuide?.shooting_scenes || editedGuide?.scenes || []
  const currentSceneData = scenes[currentScene]

  const handlePrevScene = () => {
    if (currentScene > 0) {
      setCurrentScene(currentScene - 1)
    }
  }

  const handleNextScene = () => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene(currentScene + 1)
    }
  }

  const handleEdit = () => {
    setShowEditor(true)
    setEditedGuide(JSON.parse(JSON.stringify(guide))) // Deep copy
  }

  const handleCancel = () => {
    setShowEditor(false)
    setIsEditing(false)
    setEditedGuide(guide)
  }

  const handleSave = async (updatedGuide) => {
    if (!campaignId) {
      alert('캠페인 ID가 없습니다.')
      return
    }

    setIsSaving(true)
    try {
      const guideToSave = updatedGuide || editedGuide
      const { error } = await supabaseBiz
        .from('campaigns')
        .update({ ai_generated_guide: guideToSave })
        .eq('id', campaignId)

      if (error) throw error

      alert('가이드가 저장되었습니다.')
      setShowEditor(false)
      setIsEditing(false)
      if (onUpdate) {
        onUpdate(guideToSave)
      }
      // 저장 후 editedGuide 업데이트
      setEditedGuide(guideToSave)
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSceneChange = (sceneIndex, field, value) => {
    const newGuide = { ...editedGuide }
    const sceneKey = newGuide.shooting_scenes ? 'shooting_scenes' : 'scenes'
    newGuide[sceneKey] = [...(newGuide[sceneKey] || [])]
    newGuide[sceneKey][sceneIndex] = { ...newGuide[sceneKey][sceneIndex], [field]: value }
    setEditedGuide(newGuide)
  }

  const handleFieldChange = (field, value) => {
    setEditedGuide({ ...editedGuide, [field]: value })
  }

  const handleNestedFieldChange = (parent, field, value) => {
    setEditedGuide({
      ...editedGuide,
      [parent]: {
        ...editedGuide[parent],
        [field]: value
      }
    })
  }

  const handleArrayFieldChange = (field, index, value) => {
    const newArray = [...(editedGuide[field] || [])]
    newArray[index] = value
    setEditedGuide({ ...editedGuide, [field]: newArray })
  }

  const handleArrayAdd = (field) => {
    const newArray = [...(editedGuide[field] || []), '']
    setEditedGuide({ ...editedGuide, [field]: newArray })
  }

  const handleArrayRemove = (field, index) => {
    const newArray = (editedGuide[field] || []).filter((_, i) => i !== index)
    setEditedGuide({ ...editedGuide, [field]: newArray })
  }

  return (
    <>
      {/* AI 가이드 편집 모달 */}
      {showEditor && (
        <AIGuideEditor
          guide={editedGuide}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더: 캠페인 타이틀 */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-gray-800">숏폼 콘텐츠 크리에이터</span>{' '}
            <span className="text-red-500">촬영 가이드</span>
          </h1>
          <p className="text-lg text-gray-600">
            브랜드 맞춤형 고퀄리티 숏폼 제작을 위한 가이드라인
          </p>
          
          {/* 편집 버튼 */}
          <div className="mt-4 flex justify-center gap-2">
            {!isEditing ? (
              <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                수정
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4" />
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
                <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  취소
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 영상 정보 카드 */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">영상 길이</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedGuide.video_duration || '30-60초'}
                      onChange={(e) => handleFieldChange('video_duration', e.target.value)}
                      className="text-base font-bold text-blue-800 w-full border rounded px-2 py-1"
                    />
                  ) : (
                    <p className="text-base font-bold text-blue-800">{editedGuide.video_duration || '30-60초'}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">템포 (속도)</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedGuide.shooting_requirements?.video_style?.tempo || '빠름'}
                      onChange={(e) => handleNestedFieldChange('shooting_requirements', 'tempo', e.target.value)}
                      className="text-base font-bold text-purple-800 w-full border rounded px-2 py-1"
                    />
                  ) : (
                    <p className="text-base font-bold text-purple-800">
                      {editedGuide.shooting_requirements?.video_style?.tempo || '빠름'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                <Sparkles className="w-6 h-6 text-pink-600" />
                <div>
                  <p className="text-xs text-gray-600">톤 (분위기)</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedGuide.shooting_requirements?.video_style?.tone || '밝고 경쾌함'}
                      onChange={(e) => handleNestedFieldChange('shooting_requirements', 'tone', e.target.value)}
                      className="text-base font-bold text-pink-800 w-full border rounded px-2 py-1"
                    />
                  ) : (
                    <p className="text-base font-bold text-pink-800">
                      {editedGuide.shooting_requirements?.video_style?.tone || '밝고 경쾌함'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 브랜드 정보 카드 */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 좌측: 기본 정보 */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  기본 브랜드 정보
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">브랜드명</Label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedGuide.brand_info?.brand || ''}
                        onChange={(e) => handleNestedFieldChange('brand_info', 'brand', e.target.value)}
                        className="text-lg font-semibold text-red-500 w-full border rounded px-2 py-1"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-red-500">
                        {editedGuide.brand_info?.brand || '브랜드명'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">제품명</Label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedGuide.brand_info?.product || ''}
                        onChange={(e) => handleNestedFieldChange('brand_info', 'product', e.target.value)}
                        className="text-base font-medium w-full border rounded px-2 py-1"
                      />
                    ) : (
                      <p className="text-base font-medium">
                        {editedGuide.brand_info?.product || '제품명'}
                      </p>
                    )}
                  </div>
                  {editedGuide.brand_info?.product_url && (
                    <div>
                      <Label className="text-sm text-gray-600">제품 URL</Label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedGuide.brand_info?.product_url || ''}
                          onChange={(e) => handleNestedFieldChange('brand_info', 'product_url', e.target.value)}
                          className="text-sm w-full border rounded px-2 py-1"
                        />
                      ) : (
                        <a 
                          href={editedGuide.brand_info.product_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          <LinkIcon className="w-4 h-4" />
                          {editedGuide.brand_info.product_url}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 우측: 촬영 관련 요구사항 */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-pink-600" />
                  촬영 관련 요구사항
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">영상 제출 마감일</Label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedGuide.brand_info?.deadline || ''}
                        onChange={(e) => handleNestedFieldChange('brand_info', 'deadline', e.target.value)}
                        className="text-base font-semibold text-red-600 w-full border rounded px-2 py-1"
                      />
                    ) : (
                      <p className="text-base font-semibold text-red-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {editedGuide.brand_info?.deadline || '협의'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">타겟 플랫폼</Label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedGuide.target_platform || 'Instagram'}
                        onChange={(e) => handleFieldChange('target_platform', e.target.value)}
                        className="text-base w-full border rounded px-2 py-1"
                      />
                    ) : (
                      <Badge variant="secondary" className="mt-1">
                        {editedGuide.target_platform || 'Instagram'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 전체 영상 컨셉 */}
            {editedGuide.shooting_concept && (
              <div className="mt-6 p-4 bg-pink-50 rounded-lg border border-pink-200">
                <h4 className="font-bold text-gray-800 mb-2">📌 성공적인 콘텐츠 제작을 위해 아래 사항을 반드시 숙지해주세요</h4>
                {isEditing ? (
                  <textarea
                    value={editedGuide.shooting_concept}
                    onChange={(e) => handleFieldChange('shooting_concept', e.target.value)}
                    className="w-full border rounded px-3 py-2 text-gray-700 leading-relaxed"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">{editedGuide.shooting_concept}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 콘텐츠 철학 카드 */}
        {editedGuide.content_philosophy && (
          <Card className="mb-6 shadow-lg border-0 border-l-4 border-l-orange-500">
            <CardHeader className="bg-orange-50">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Sparkles className="w-6 h-6" />
                크넥 콘텐츠 철학
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-bold text-orange-800 mb-2">💡 핵심 메시지</h4>
                  <p className="text-gray-700">{editedGuide.content_philosophy.core_message}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-bold text-green-800 mb-2">✅ 진정성 포인트</h4>
                  <p className="text-gray-700">{editedGuide.content_philosophy.authenticity_note}</p>
                </div>
                {editedGuide.content_philosophy.avoid && editedGuide.content_philosophy.avoid.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-bold text-red-800 mb-2">❌ 피해야 할 것들</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {editedGuide.content_philosophy.avoid.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 스토리 흐름 카드 */}
        {editedGuide.story_flow && (
          <Card className="mb-6 shadow-lg border-0 border-l-4 border-l-blue-500">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="w-6 h-6" />
                스토리 흐름
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-bold text-blue-800 mb-2">📖 내러티브 타입</h4>
                  <p className="text-gray-700">{editedGuide.story_flow.narrative_type}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-bold text-purple-800 mb-2">💫 감정 흐름</h4>
                  <p className="text-gray-700">{editedGuide.story_flow.emotional_arc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 인스타그램 파트너십 광고 코드 발급 방법 (필수) */}
        <Card className="mb-6 shadow-lg border-0 border-l-4 border-l-purple-500">
          <CardHeader className="bg-purple-50">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Sparkles className="w-6 h-6" />
              인스타그램 파트너십 광고 코드 발급 방법 (필수)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ol className="space-y-3 mb-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <span className="text-gray-700 pt-0.5">인스타그램 앱에서 프로필 → 설정 → 크리에이터 도구 및 관리 → 브랜드 콘텐츠로 이동</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <span className="text-gray-700 pt-0.5">브랜드 콘텐츠 도구 활성화</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <span className="text-gray-700 pt-0.5">게시물 업로드 시 '고급 설정' → '브랜드 콘텐츠 태그'에서 브랜드 계정 태그</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                  4
                </span>
                <span className="text-gray-700 pt-0.5">'유료 파트너십 라벨' 토글 활성화</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                  5
                </span>
                <span className="text-gray-700 pt-0.5">게시 후 브랜드가 Meta 비즈니스 스위트에서 광고로 승격 가능</span>
              </li>
            </ol>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-900">
                <span className="font-bold">📌 주의:</span> 파트너십 라벨을 활성화하지 않으면 Meta 광고로 사용할 수 없습니다. 반드시 설정 후 게시해주세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 숏폼 가이드 (씬별) */}
        {scenes.length > 0 && (
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-red-100 to-pink-100">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="w-6 h-6 text-red-600" />
                  숏폼 가이드
                </span>
                <Badge variant="secondary" className="text-base">
                  {currentScene + 1} / {scenes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* 씬 네비게이션 탭 */}
              <div className="border-b overflow-x-auto">
                <div className="flex min-w-max">
                  {scenes.map((scene, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentScene(idx)}
                      className={`px-4 py-3 text-sm font-medium transition-colors ${
                        currentScene === idx
                          ? 'bg-red-500 text-white border-b-2 border-red-600'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      씬 {scene.order}
                    </button>
                  ))}
                </div>
              </div>

              {/* 현재 씬 내용 */}
              {currentSceneData && (
                <div className="p-6 md:p-8">
                  <div className="mb-6">
                    <Badge className="mb-3 text-base px-4 py-1 bg-red-500">
                      순서 {currentSceneData.order}
                    </Badge>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentSceneData.scene_type}
                        onChange={(e) => handleSceneChange(currentScene, 'scene_type', e.target.value)}
                        className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 w-full border rounded px-3 py-2"
                      />
                    ) : (
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                        {currentSceneData.scene_type}
                      </h3>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* 촬영장면 */}
                    <div className="md:col-span-1 p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        촬영장면
                      </h4>
                      {isEditing ? (
                        <textarea
                          value={currentSceneData.scene_description}
                          onChange={(e) => handleSceneChange(currentScene, 'scene_description', e.target.value)}
                          className="w-full border rounded px-3 py-2 text-gray-700 leading-relaxed"
                          rows={4}
                        />
                      ) : (
                        <p className="text-gray-700 leading-relaxed">
                          {currentSceneData.scene_description}
                        </p>
                      )}
                    </div>

                    {/* 대사 및 자막 */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                        <h4 className="font-bold text-yellow-800 mb-2">
                          💬 대사 (자신의 스타일에 맞게 자연스럽게 변형 가능)
                        </h4>
                        {isEditing ? (
                          <textarea
                            value={currentSceneData.dialogue}
                            onChange={(e) => handleSceneChange(currentScene, 'dialogue', e.target.value)}
                            className="w-full border rounded px-3 py-2 text-gray-800 text-lg leading-relaxed"
                            rows={3}
                          />
                        ) : (
                          <p className="text-gray-800 text-lg leading-relaxed">
                            "{currentSceneData.dialogue}"
                          </p>
                        )}
                      </div>

                      {currentSceneData.caption && (
                        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <h4 className="font-bold text-blue-800 mb-2">
                            📝 자막
                          </h4>
                          {isEditing ? (
                            <textarea
                              value={currentSceneData.caption}
                              onChange={(e) => handleSceneChange(currentScene, 'caption', e.target.value)}
                              className="w-full border rounded px-3 py-2 text-gray-800 leading-relaxed"
                              rows={2}
                            />
                          ) : (
                            <p className="text-gray-800 leading-relaxed">
                              {currentSceneData.caption}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          촬영 팁
                        </h4>
                        {isEditing ? (
                          <textarea
                            value={currentSceneData.shooting_tip}
                            onChange={(e) => handleSceneChange(currentScene, 'shooting_tip', e.target.value)}
                            className="w-full border rounded px-3 py-2 text-gray-700 leading-relaxed"
                            rows={3}
                          />
                        ) : (
                          <p className="text-gray-700 leading-relaxed">
                            {currentSceneData.shooting_tip}
                          </p>
                        )}
                      </div>

                      {/* 자율 기획 공간 */}
                      {currentSceneData.flexibility_note && (
                        <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                          <h4 className="font-bold text-orange-800 mb-2">
                            🎨 자율 기획 공간
                          </h4>
                          {isEditing ? (
                            <textarea
                              value={currentSceneData.flexibility_note}
                              onChange={(e) => handleSceneChange(currentScene, 'flexibility_note', e.target.value)}
                              className="w-full border rounded px-3 py-2 text-gray-700 leading-relaxed"
                              rows={2}
                            />
                          ) : (
                            <p className="text-gray-700 leading-relaxed">
                              {currentSceneData.flexibility_note}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 예시 시나리오 */}
                      {currentSceneData.example_scenario && (
                        <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
                          <h4 className="font-bold text-indigo-800 mb-2">
                            💡 예시 시나리오
                          </h4>
                          {isEditing ? (
                            <textarea
                              value={currentSceneData.example_scenario}
                              onChange={(e) => handleSceneChange(currentScene, 'example_scenario', e.target.value)}
                              className="w-full border rounded px-3 py-2 text-gray-700 leading-relaxed"
                              rows={2}
                            />
                          ) : (
                            <p className="text-gray-700 leading-relaxed italic">
                              {currentSceneData.example_scenario}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 네비게이션 버튼 */}
                  <div className="flex justify-between items-center mt-8 pt-6 border-t">
                    <Button
                      onClick={handlePrevScene}
                      disabled={currentScene === 0}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전 씬
                    </Button>
                    <span className="text-sm text-gray-600">
                      {currentScene + 1} / {scenes.length}
                    </span>
                    <Button
                      onClick={handleNextScene}
                      disabled={currentScene === scenes.length - 1}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600"
                    >
                      다음 씬
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 진정성 가이드라인 카드 */}
        {editedGuide.authenticity_guidelines && (
          <Card className="mb-6 shadow-lg border-0 border-l-4 border-l-emerald-500">
            <CardHeader className="bg-emerald-50">
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-6 h-6" />
                진정성 가이드라인
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* DO */}
                {editedGuide.authenticity_guidelines.do && editedGuide.authenticity_guidelines.do.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      이렇게 하세요
                    </h4>
                    <ul className="space-y-2">
                      {editedGuide.authenticity_guidelines.do.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-600 mt-0.5">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* DON'T */}
                {editedGuide.authenticity_guidelines.dont && editedGuide.authenticity_guidelines.dont.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      이것은 피하세요
                    </h4>
                    <ul className="space-y-2">
                      {editedGuide.authenticity_guidelines.dont.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-red-600 mt-0.5">✗</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 예외 사항 (아이 제품) */}
              {editedGuide.authenticity_guidelines.exception && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 font-medium">
                    {editedGuide.authenticity_guidelines.exception}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 크리에이터 팁 카드 */}
        {editedGuide.creator_tips && editedGuide.creator_tips.length > 0 && (
          <Card className="mb-6 shadow-lg border-0 border-l-4 border-l-cyan-500">
            <CardHeader className="bg-cyan-50">
              <CardTitle className="flex items-center gap-2 text-cyan-800">
                <Sparkles className="w-6 h-6" />
                크리에이터 팁
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {editedGuide.creator_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-cyan-50 rounded-lg">
                    <span className="text-cyan-600 text-lg">{tip.split(' ')[0]}</span>
                    <span className="text-gray-700">{tip.split(' ').slice(1).join(' ')}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 하단 액션 버튼 */}
        <div className="flex justify-center gap-4 mt-8">
          {onClose && (
            <Button variant="outline" onClick={onClose} size="lg">
              닫기
            </Button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

// 보조 컴포넌트들
function Label({ children, className = '' }) {
  return <label className={`block text-sm font-medium text-gray-700 ${className}`}>{children}</label>
}
