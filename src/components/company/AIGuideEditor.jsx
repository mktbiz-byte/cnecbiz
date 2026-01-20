import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Save, X, Plus, Trash2 } from 'lucide-react'

/**
 * AI 가이드 구조화된 폼 편집 컴포넌트
 * JSON 텍스트 편집 대신 각 필드별로 편집 가능한 폼 제공
 */
export default function AIGuideEditor({ guide, onSave, onCancel }) {
  const [editedGuide, setEditedGuide] = useState(guide || {
    campaign_title: '',
    target_platform: 'youtube',
    video_duration: '50-60초',
    shooting_scenes: [],
    brand_info: {
      brand: '',
      product: '',
      product_url: '',
      deadline: ''
    },
    shooting_requirements: {
      video_style: {
        tempo: '자연스러운 흐름',
        tone: '친구에게 말하듯 편안하게'
      }
    },
    shooting_concept: '',
    content_philosophy: {
      core_message: '',
      authenticity_note: '',
      avoid: []
    },
    story_flow: {
      narrative_type: '',
      emotional_arc: ''
    },
    authenticity_guidelines: {
      do: [],
      dont: []
    },
    creator_tips: []
  })

  const [isSaving, setIsSaving] = useState(false)

  // 기본 필드 변경
  const handleFieldChange = (field, value) => {
    setEditedGuide({ ...editedGuide, [field]: value })
  }

  // 중첩 필드 변경 (brand_info, shooting_requirements 등)
  const handleNestedFieldChange = (parent, field, value) => {
    setEditedGuide({
      ...editedGuide,
      [parent]: {
        ...editedGuide[parent],
        [field]: value
      }
    })
  }

  // 깊은 중첩 필드 변경 (shooting_requirements.video_style.tempo 등)
  const handleDeepNestedFieldChange = (parent1, parent2, field, value) => {
    setEditedGuide({
      ...editedGuide,
      [parent1]: {
        ...editedGuide[parent1],
        [parent2]: {
          ...editedGuide[parent1][parent2],
          [field]: value
        }
      }
    })
  }

  // 씬 변경
  const handleSceneChange = (sceneIndex, field, value) => {
    const newScenes = [...(editedGuide.shooting_scenes || [])]
    newScenes[sceneIndex] = {
      ...newScenes[sceneIndex],
      [field]: value
    }
    setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
  }

  // 씬 추가
  const handleAddScene = () => {
    const newScene = {
      order: (editedGuide.shooting_scenes?.length || 0) + 1,
      scene_type: '',
      scene_description: '',
      dialogue: '',
      caption: '',
      shooting_tip: '',
      flexibility_note: '',
      example_scenario: ''
    }
    setEditedGuide({
      ...editedGuide,
      shooting_scenes: [...(editedGuide.shooting_scenes || []), newScene]
    })
  }

  // 배열 필드 변경 (content_philosophy.avoid, authenticity_guidelines.do/dont, creator_tips)
  const handleArrayChange = (parent, field, index, value) => {
    if (parent) {
      const newArray = [...(editedGuide[parent]?.[field] || [])]
      newArray[index] = value
      setEditedGuide({
        ...editedGuide,
        [parent]: {
          ...editedGuide[parent],
          [field]: newArray
        }
      })
    } else {
      const newArray = [...(editedGuide[field] || [])]
      newArray[index] = value
      setEditedGuide({ ...editedGuide, [field]: newArray })
    }
  }

  const handleAddArrayItem = (parent, field) => {
    if (parent) {
      const newArray = [...(editedGuide[parent]?.[field] || []), '']
      setEditedGuide({
        ...editedGuide,
        [parent]: {
          ...editedGuide[parent],
          [field]: newArray
        }
      })
    } else {
      const newArray = [...(editedGuide[field] || []), '']
      setEditedGuide({ ...editedGuide, [field]: newArray })
    }
  }

  const handleRemoveArrayItem = (parent, field, index) => {
    if (parent) {
      const newArray = (editedGuide[parent]?.[field] || []).filter((_, i) => i !== index)
      setEditedGuide({
        ...editedGuide,
        [parent]: {
          ...editedGuide[parent],
          [field]: newArray
        }
      })
    } else {
      const newArray = (editedGuide[field] || []).filter((_, i) => i !== index)
      setEditedGuide({ ...editedGuide, [field]: newArray })
    }
  }

  // 씬 삭제
  const handleRemoveScene = (sceneIndex) => {
    const newScenes = editedGuide.shooting_scenes.filter((_, idx) => idx !== sceneIndex)
    // order 재정렬
    newScenes.forEach((scene, idx) => {
      scene.order = idx + 1
    })
    setEditedGuide({ ...editedGuide, shooting_scenes: newScenes })
  }

  // 저장
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(editedGuide)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full my-8">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
          <h2 className="text-2xl font-bold text-gray-800">AI 가이드 수정</h2>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex items-center gap-2">
              <X className="w-4 h-4" />
              취소
            </Button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>캠페인 타이틀</Label>
                <Input
                  value={editedGuide.campaign_title || ''}
                  onChange={(e) => handleFieldChange('campaign_title', e.target.value)}
                  placeholder="예: 누씨오 누씨오 선크림 유튜브/인스타그램"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>타겟 플랫폼</Label>
                  <select
                    value={editedGuide.target_platform || 'youtube'}
                    onChange={(e) => handleFieldChange('target_platform', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
                <div>
                  <Label>영상 길이</Label>
                  <Input
                    value={editedGuide.video_duration || '50-60초'}
                    onChange={(e) => handleFieldChange('video_duration', e.target.value)}
                    placeholder="예: 50-60초"
                  />
                </div>
              </div>
              <div>
                <Label>전체 영상 컨셉</Label>
                <Textarea
                  value={editedGuide.shooting_concept || ''}
                  onChange={(e) => handleFieldChange('shooting_concept', e.target.value)}
                  placeholder="영상의 전체적인 컨셉과 방향성을 설명해주세요"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 브랜드 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>브랜드 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>브랜드명</Label>
                  <Input
                    value={editedGuide.brand_info?.brand || ''}
                    onChange={(e) => handleNestedFieldChange('brand_info', 'brand', e.target.value)}
                    placeholder="예: 누씨오"
                  />
                </div>
                <div>
                  <Label>제품명</Label>
                  <Input
                    value={editedGuide.brand_info?.product || ''}
                    onChange={(e) => handleNestedFieldChange('brand_info', 'product', e.target.value)}
                    placeholder="예: 선크림"
                  />
                </div>
              </div>
              <div>
                <Label>제품 URL</Label>
                <Input
                  value={editedGuide.brand_info?.product_url || ''}
                  onChange={(e) => handleNestedFieldChange('brand_info', 'product_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>영상 제출 마감일</Label>
                <Input
                  value={editedGuide.brand_info?.deadline || ''}
                  onChange={(e) => handleNestedFieldChange('brand_info', 'deadline', e.target.value)}
                  placeholder="예: 2025. 12. 8."
                />
              </div>
            </CardContent>
          </Card>

          {/* 촬영 요구사항 */}
          <Card>
            <CardHeader>
              <CardTitle>촬영 요구사항</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>템포 (속도)</Label>
                  <Input
                    value={editedGuide.shooting_requirements?.video_style?.tempo || '빠름'}
                    onChange={(e) => handleDeepNestedFieldChange('shooting_requirements', 'video_style', 'tempo', e.target.value)}
                    placeholder="예: 빠름, 보통, 느림"
                  />
                </div>
                <div>
                  <Label>톤 (분위기)</Label>
                  <Input
                    value={editedGuide.shooting_requirements?.video_style?.tone || '밝고 경쾌함'}
                    onChange={(e) => handleDeepNestedFieldChange('shooting_requirements', 'video_style', 'tone', e.target.value)}
                    placeholder="예: 밝고 경쾌함, 차분함"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 촬영 씬 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>촬영 씬 ({editedGuide.shooting_scenes?.length || 0}개)</CardTitle>
              <Button onClick={handleAddScene} size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                씬 추가
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {(editedGuide.shooting_scenes || []).map((scene, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-lg">씬 {scene.order}</h4>
                    <Button
                      onClick={() => handleRemoveScene(idx)}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </Button>
                  </div>
                  
                  <div>
                    <Label>씬 타입</Label>
                    <Input
                      value={scene.scene_type || ''}
                      onChange={(e) => handleSceneChange(idx, 'scene_type', e.target.value)}
                      placeholder="예: 출근 전, Before, After"
                    />
                  </div>
                  
                  <div>
                    <Label>촬영 장면</Label>
                    <Textarea
                      value={scene.scene_description || ''}
                      onChange={(e) => handleSceneChange(idx, 'scene_description', e.target.value)}
                      placeholder="촬영 장면을 설명해주세요"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label>대사</Label>
                    <Textarea
                      value={scene.dialogue || ''}
                      onChange={(e) => handleSceneChange(idx, 'dialogue', e.target.value)}
                      placeholder="크리에이터가 말할 대사를 입력하세요"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label>자막 (선택사항)</Label>
                    <Input
                      value={scene.caption || ''}
                      onChange={(e) => handleSceneChange(idx, 'caption', e.target.value)}
                      placeholder="화면에 표시될 자막"
                    />
                  </div>
                  
                  <div>
                    <Label>촬영 팁</Label>
                    <Textarea
                      value={scene.shooting_tip || ''}
                      onChange={(e) => handleSceneChange(idx, 'shooting_tip', e.target.value)}
                      placeholder="이 씬을 촬영할 때 유의할 점"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>자율 기획 공간 (선택)</Label>
                      <Textarea
                        value={scene.flexibility_note || ''}
                        onChange={(e) => handleSceneChange(idx, 'flexibility_note', e.target.value)}
                        placeholder="예: 본인의 실제 상황에 맞게 변형 가능"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>예시 시나리오 (선택)</Label>
                      <Textarea
                        value={scene.example_scenario || ''}
                        onChange={(e) => handleSceneChange(idx, 'example_scenario', e.target.value)}
                        placeholder="예: 아침에 일어나서 거울 보며..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {(!editedGuide.shooting_scenes || editedGuide.shooting_scenes.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>촬영 씬이 없습니다. "씬 추가" 버튼을 눌러 씬을 추가하세요.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 콘텐츠 철학 */}
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠 철학</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>핵심 메시지</Label>
                <Textarea
                  value={editedGuide.content_philosophy?.core_message || ''}
                  onChange={(e) => handleNestedFieldChange('content_philosophy', 'core_message', e.target.value)}
                  placeholder="이 영상에서 전달하고 싶은 핵심 감정/공감 포인트"
                  rows={2}
                />
              </div>
              <div>
                <Label>진정성 포인트</Label>
                <Textarea
                  value={editedGuide.content_philosophy?.authenticity_note || ''}
                  onChange={(e) => handleNestedFieldChange('content_philosophy', 'authenticity_note', e.target.value)}
                  placeholder="진정성을 살리기 위한 핵심 조언"
                  rows={2}
                />
              </div>
              <div>
                <Label className="flex items-center justify-between">
                  피해야 할 것들
                  <Button
                    type="button"
                    onClick={() => handleAddArrayItem('content_philosophy', 'avoid')}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-1" /> 추가
                  </Button>
                </Label>
                <div className="space-y-2 mt-2">
                  {(editedGuide.content_philosophy?.avoid || []).map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => handleArrayChange('content_philosophy', 'avoid', idx, e.target.value)}
                        placeholder="피해야 할 표현/구성"
                      />
                      <Button
                        type="button"
                        onClick={() => handleRemoveArrayItem('content_philosophy', 'avoid', idx)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 스토리 흐름 */}
          <Card>
            <CardHeader>
              <CardTitle>스토리 흐름</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>내러티브 타입</Label>
                <select
                  value={editedGuide.story_flow?.narrative_type || ''}
                  onChange={(e) => handleNestedFieldChange('story_flow', 'narrative_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">선택하세요</option>
                  <option value="일상 속 발견형">일상 속 발견형</option>
                  <option value="고민 해결형">고민 해결형</option>
                  <option value="습관 형성형">습관 형성형</option>
                  <option value="감정 공유형">감정 공유형</option>
                </select>
              </div>
              <div>
                <Label>감정 흐름</Label>
                <Input
                  value={editedGuide.story_flow?.emotional_arc || ''}
                  onChange={(e) => handleNestedFieldChange('story_flow', 'emotional_arc', e.target.value)}
                  placeholder="예: 불편함 → 발견 → 만족 → 일상화"
                />
              </div>
            </CardContent>
          </Card>

          {/* 진정성 가이드라인 */}
          <Card>
            <CardHeader>
              <CardTitle>진정성 가이드라인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* DO */}
                <div>
                  <Label className="flex items-center justify-between text-green-700">
                    이렇게 하세요
                    <Button
                      type="button"
                      onClick={() => handleAddArrayItem('authenticity_guidelines', 'do')}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </Label>
                  <div className="space-y-2 mt-2">
                    {(editedGuide.authenticity_guidelines?.do || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => handleArrayChange('authenticity_guidelines', 'do', idx, e.target.value)}
                          placeholder="해야 할 것"
                        />
                        <Button
                          type="button"
                          onClick={() => handleRemoveArrayItem('authenticity_guidelines', 'do', idx)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DON'T */}
                <div>
                  <Label className="flex items-center justify-between text-red-700">
                    이것은 피하세요
                    <Button
                      type="button"
                      onClick={() => handleAddArrayItem('authenticity_guidelines', 'dont')}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </Label>
                  <div className="space-y-2 mt-2">
                    {(editedGuide.authenticity_guidelines?.dont || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => handleArrayChange('authenticity_guidelines', 'dont', idx, e.target.value)}
                          placeholder="하지 말아야 할 것"
                        />
                        <Button
                          type="button"
                          onClick={() => handleRemoveArrayItem('authenticity_guidelines', 'dont', idx)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 크리에이터 팁 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>크리에이터 팁</CardTitle>
              <Button
                type="button"
                onClick={() => handleAddArrayItem(null, 'creator_tips')}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" /> 팁 추가
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(editedGuide.creator_tips || []).map((tip, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={tip}
                    onChange={(e) => handleArrayChange(null, 'creator_tips', idx, e.target.value)}
                    placeholder="예: 💡 촬영 전 제품을 충분히 사용해보세요"
                  />
                  <Button
                    type="button"
                    onClick={() => handleRemoveArrayItem(null, 'creator_tips', idx)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!editedGuide.creator_tips || editedGuide.creator_tips.length === 0) && (
                <p className="text-center text-gray-500 py-4">팁이 없습니다. "팁 추가" 버튼을 눌러 추가하세요.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <Button onClick={onCancel} variant="outline">
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
