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

  // 4주 챌린지 가이드 (기업이 설정한 원본 데이터)
  if (guideData.type === '4week_guide') {
    // 탭 상태 관리를 위한 내부 컴포넌트
    const FourWeekGuideContent = () => {
      const [activeWeek, setActiveWeek] = useState('week1')
      const [localEditing, setLocalEditing] = useState(false)
      const [localEditedData, setLocalEditedData] = useState(null)
      const [localSaving, setLocalSaving] = useState(false)

      const handleStartEdit = () => {
        setLocalEditedData(JSON.parse(JSON.stringify(guideData)))
        setLocalEditing(true)
      }

      const handleCancelEdit = () => {
        setLocalEditing(false)
        setLocalEditedData(null)
      }

      const handleSaveEdit = async () => {
        if (!onSave) return
        setLocalSaving(true)
        try {
          await onSave(JSON.stringify(localEditedData))
          setLocalEditing(false)
          setLocalEditedData(null)
          alert('가이드가 저장되었습니다.')
        } catch (error) {
          alert('저장 실패: ' + error.message)
        } finally {
          setLocalSaving(false)
        }
      }

      const updateWeekField = (weekKey, field, value) => {
        setLocalEditedData(prev => ({
          ...prev,
          [weekKey]: {
            ...(prev[weekKey] || {}),
            [field]: value
          }
        }))
      }

      const displayData = localEditing ? localEditedData : guideData
      const currentWeekData = displayData[activeWeek] || {}

      // 마감일 정보
      const weekDeadline = guideData[`${activeWeek}_deadline`]

      return (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50 -mx-4 -mt-4 px-4 pt-4 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-purple-500 to-indigo-500">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">🎯 4주 챌린지 촬영 가이드</h3>
            </div>
            {onSave && !localEditing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1 text-purple-600 border-purple-300 hover:bg-purple-50">
                <Edit className="w-4 h-4" />
                수정
              </Button>
            )}
            {localEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>취소</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={localSaving} className="bg-purple-600 hover:bg-purple-700">
                  {localSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </div>

          {/* 주차 탭 */}
          <div className="flex gap-2 border-b bg-white">
            {['week1', 'week2', 'week3', 'week4'].map((week, idx) => (
              <button
                key={week}
                onClick={() => {
                  if (localEditing) {
                    if (confirm('수정 중인 내용이 있습니다. 탭을 변경하시겠습니까?')) {
                      handleCancelEdit()
                      setActiveWeek(week)
                    }
                  } else {
                    setActiveWeek(week)
                  }
                }}
                className={`px-6 py-3 font-medium text-sm transition-all ${
                  activeWeek === week
                    ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {idx + 1}주차
              </button>
            ))}
          </div>

          {/* 마감일 표시 */}
          {weekDeadline && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <span className="text-yellow-700 font-semibold">📅 마감일:</span>
                <span className="text-yellow-900 font-bold">
                  {new Date(weekDeadline).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                  })}
                </span>
              </div>
            </div>
          )}

          {/* 제품 정보 섹션 */}
          {(displayData.brand || displayData.product_name || displayData.product_features || localEditing) && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
              <h4 className="text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
                <span>📦</span>
                제품 정보
              </h4>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                {localEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                        <input
                          type="text"
                          value={localEditedData.brand || ''}
                          onChange={(e) => setLocalEditedData({...localEditedData, brand: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">제품명</label>
                        <input
                          type="text"
                          value={localEditedData.product_name || ''}
                          onChange={(e) => setLocalEditedData({...localEditedData, product_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">제품 특징</label>
                      <textarea
                        value={localEditedData.product_features || ''}
                        onChange={(e) => setLocalEditedData({...localEditedData, product_features: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-2">
                    {displayData.brand && (
                      <p><span className="text-purple-600 font-medium">브랜드:</span> <span className="text-gray-800">{displayData.brand}</span></p>
                    )}
                    {displayData.product_name && (
                      <p><span className="text-purple-600 font-medium">제품명:</span> <span className="text-gray-800">{displayData.product_name}</span></p>
                    )}
                    {displayData.product_features && (
                      <p className="whitespace-pre-wrap"><span className="text-purple-600 font-medium">제품 특징:</span><br/><span className="text-gray-800">{displayData.product_features}</span></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 미션 */}
          {(currentWeekData.mission || localEditing) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>🎯</span>
                {activeWeek.replace('week', '')}주차 미션
              </h4>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                {localEditing ? (
                  <textarea
                    value={currentWeekData.mission || ''}
                    onChange={(e) => updateWeekField(activeWeek, 'mission', e.target.value)}
                    className="w-full p-2 border rounded text-sm min-h-[80px]"
                    placeholder="이번 주차 미션을 입력하세요"
                  />
                ) : (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {currentWeekData.mission}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 필수 대사 */}
          {(currentWeekData.required_dialogue || localEditing) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>💬</span>
                필수 대사
              </h4>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                {localEditing ? (
                  <textarea
                    value={currentWeekData.required_dialogue || ''}
                    onChange={(e) => updateWeekField(activeWeek, 'required_dialogue', e.target.value)}
                    className="w-full p-2 border rounded text-sm min-h-[80px]"
                    placeholder="필수로 포함해야 하는 대사"
                  />
                ) : (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    "{currentWeekData.required_dialogue}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 필수 장면 */}
          {(currentWeekData.required_scenes || localEditing) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="text-base font-bold text-green-900 mb-3 flex items-center gap-2">
                <span>🎬</span>
                필수 장면
              </h4>
              <div className="bg-white rounded-lg p-4 border border-green-100">
                {localEditing ? (
                  <textarea
                    value={currentWeekData.required_scenes || ''}
                    onChange={(e) => updateWeekField(activeWeek, 'required_scenes', e.target.value)}
                    className="w-full p-2 border rounded text-sm min-h-[80px]"
                    placeholder="필수로 촬영해야 하는 장면"
                  />
                ) : (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {currentWeekData.required_scenes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 주의사항 */}
          {(displayData.precautions || currentWeekData.cautions || localEditing) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h4 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                <span>⚠️</span>
                주의사항
              </h4>
              <div className="bg-white rounded-lg p-4 border border-red-100">
                {localEditing ? (
                  <textarea
                    value={localEditedData.precautions || ''}
                    onChange={(e) => setLocalEditedData({...localEditedData, precautions: e.target.value})}
                    className="w-full p-2 border rounded text-sm min-h-[80px]"
                    placeholder="주의사항을 입력하세요"
                  />
                ) : (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {displayData.precautions || currentWeekData.cautions}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 해시태그 */}
          {(currentWeekData.hashtags?.length > 0 || localEditing) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h4 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <span>📌</span>
                필수 해시태그
              </h4>
              {localEditing ? (
                <input
                  type="text"
                  value={(currentWeekData.hashtags || []).join(', ')}
                  onChange={(e) => updateWeekField(activeWeek, 'hashtags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="쉼표로 구분해서 입력"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(currentWeekData.hashtags || []).map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium border border-indigo-300">
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 참고 URL */}
          {(currentWeekData.reference_url || localEditing) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h4 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
                <span>🔗</span>
                참고 영상
              </h4>
              {localEditing ? (
                <input
                  type="text"
                  value={currentWeekData.reference_url || ''}
                  onChange={(e) => updateWeekField(activeWeek, 'reference_url', e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="참고할 영상 URL"
                />
              ) : (
                <div className="bg-white border border-orange-200 rounded-lg p-4">
                  <a
                    href={currentWeekData.reference_url?.startsWith('http') ? currentWeekData.reference_url : `https://${currentWeekData.reference_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 hover:underline break-all transition-all"
                  >
                    {currentWeekData.reference_url}
                  </a>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 위 영상을 참고하여 촬영해 주세요. 클릭하면 새 창에서 열립니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 내용이 없는 경우 */}
          {!currentWeekData.mission && !currentWeekData.required_dialogue && !currentWeekData.required_scenes && !currentWeekData.reference_url && !localEditing && (
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
      )
    }

    return <FourWeekGuideContent />
  }

  // 올영 가이드 (기업이 설정한 원본 데이터)
  if (guideData.type === 'oliveyoung_guide') {
    const OliveYoungGuideContent = () => {
      const [activeStep, setActiveStep] = useState('step1')
      const [localEditing, setLocalEditing] = useState(false)
      const [localEditedData, setLocalEditedData] = useState(null)
      const [localSaving, setLocalSaving] = useState(false)

      // STEP 3 고정 안내 문구
      const step3Instruction = {
        title: "📌 STEP 3: 인스타그램 스토리 링크 업로드 안내",
        content: `STEP 2 영상에 아래 제품 구매 링크(URL)를 삽입하여 지정된 날짜에 맞춰 업로드해 주세요.

⚠️ 중요 사항:
• 플랫폼: 인스타그램 스토리 한정
• 업로드 기한: ${guideData.step3_deadline ? new Date(guideData.step3_deadline).toLocaleDateString('ko-KR') : '캠페인 상세 확인'}
• 유지 기간: 24시간 이상 필수 유지
• URL 삽입 위치: 스토리 링크 스티커

※ 24시간 이내 삭제 시 캠페인 규정 위반으로 처리될 수 있습니다.`
      }

      const handleStartEdit = () => {
        setLocalEditedData(JSON.parse(JSON.stringify(guideData)))
        setLocalEditing(true)
      }

      const handleCancelEdit = () => {
        setLocalEditing(false)
        setLocalEditedData(null)
      }

      const handleSaveEdit = async () => {
        if (!onSave) return
        setLocalSaving(true)
        try {
          await onSave(JSON.stringify(localEditedData))
          setLocalEditing(false)
          setLocalEditedData(null)
          alert('가이드가 저장되었습니다.')
        } catch (error) {
          alert('저장 실패: ' + error.message)
        } finally {
          setLocalSaving(false)
        }
      }

      // 스텝 데이터 파싱
      const parseStepData = (stepData) => {
        if (!stepData) return null
        if (typeof stepData === 'object') return stepData
        try {
          return JSON.parse(stepData)
        } catch {
          return { content: stepData }
        }
      }

      const displayData = localEditing ? localEditedData : guideData
      const stepTitles = { step1: 'STEP 1: 세일 전 영상', step2: 'STEP 2: 세일 당일 영상', step3: 'STEP 3: 스토리 링크' }

      // 현재 스텝 데이터
      const currentStepData = activeStep !== 'step3' ? parseStepData(displayData[activeStep]) : null

      // 스텝 데이터에서 필드 추출
      const productInfo = currentStepData?.product_info || ''
      const requiredDialogues = currentStepData?.required_dialogues || []
      const requiredScenes = currentStepData?.required_scenes || []
      const cautions = currentStepData?.cautions || ''
      const hashtags = currentStepData?.hashtags || []
      const referenceUrls = currentStepData?.reference_urls || []

      const hasContent = productInfo || requiredDialogues.length > 0 || requiredScenes.length > 0 || cautions || hashtags.length > 0 || referenceUrls.length > 0

      // 스토리 URL (STEP 3용)
      const storyUrl = displayData.step3 || ''

      return (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50 -mx-4 -mt-4 px-4 pt-4 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-pink-500 to-purple-500">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">📸 올리브영 촬영 가이드</h3>
            </div>
            {onSave && !localEditing && activeStep !== 'step3' && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1 text-purple-600 border-purple-300 hover:bg-purple-50">
                <Edit className="w-4 h-4" />
                수정
              </Button>
            )}
            {localEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>취소</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={localSaving} className="bg-purple-600 hover:bg-purple-700">
                  {localSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </div>

          {/* STEP 탭 */}
          <div className="flex gap-2 border-b bg-white">
            {[
              { key: 'step1', label: 'STEP 1: 세일 전 영상' },
              { key: 'step2', label: 'STEP 2: 세일 당일 영상' },
              { key: 'step3', label: 'STEP 3: 스토리 링크' }
            ].map((step) => (
              <button
                key={step.key}
                onClick={() => {
                  if (localEditing) {
                    if (confirm('수정 중인 내용이 있습니다. 탭을 변경하시겠습니까?')) {
                      handleCancelEdit()
                      setActiveStep(step.key)
                    }
                  } else {
                    setActiveStep(step.key)
                  }
                }}
                className={`px-6 py-3 font-medium text-sm transition-all ${
                  activeStep === step.key
                    ? 'border-b-2 border-pink-600 text-pink-600 bg-pink-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          {/* STEP 3는 고정 안내 + 스토리 URL + 주의사항 표시 */}
          {activeStep === 'step3' ? (
            <>
              {/* 고정 안내 문구 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span>📌</span>
                  {step3Instruction.title}
                </h4>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    STEP 2 영상에 아래 제품 구매 링크(URL)를 삽입하여 지정된 날짜에 맞춰 업로드해 주세요.
                  </p>
                </div>
              </div>

              {/* 스토리 URL */}
              {storyUrl ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h4 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <span>🔗</span>
                    스토리에 삽입할 제품 구매 링크
                  </h4>
                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                    <a
                      href={storyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:text-blue-800 hover:underline break-all transition-all font-medium"
                    >
                      {storyUrl}
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 위 링크를 복사하여 인스타그램 스토리 링크 스티커에 삽입해 주세요.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">
                    스토리 URL이 등록되지 않았습니다.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    관리자에게 문의해 주세요.
                  </p>
                </div>
              )}

              {/* STEP 3 주의사항 - 고정 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h4 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                  <span>⚠️</span>
                  주의사항
                </h4>
                <div className="bg-white rounded-lg p-4 border border-red-100 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <p className="text-sm text-gray-800"><strong>플랫폼:</strong> 인스타그램 스토리 한정</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <p className="text-sm text-gray-800">
                      <strong>업로드 기한:</strong>{' '}
                      <span className="text-red-600 font-bold">
                        {guideData.step3_deadline
                          ? new Date(guideData.step3_deadline).toLocaleDateString('ko-KR', {
                              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                            })
                          : '캠페인 상세 확인'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <p className="text-sm text-gray-800"><strong>유지 기간:</strong> 24시간 이상 필수 유지</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <p className="text-sm text-gray-800"><strong>URL 삽입 위치:</strong> 스토리 링크 스티커</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                  <p className="text-sm text-red-800 font-semibold">
                    ⛔ 24시간 이내 삭제 시 캠페인 규정 위반으로 처리될 수 있습니다.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* STEP 1, 2 내용 */
            <>
              {hasContent ? (
                <div className="space-y-6">
                  {/* 제품 정보 */}
                  {(productInfo || localEditing) && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>📦</span>
                        제품 정보
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-purple-100">
                        {localEditing ? (
                          <textarea
                            value={localEditedData[activeStep]?.product_info || productInfo}
                            onChange={(e) => {
                              const stepData = parseStepData(localEditedData[activeStep]) || {}
                              setLocalEditedData({
                                ...localEditedData,
                                [activeStep]: JSON.stringify({ ...stepData, product_info: e.target.value })
                              })
                            }}
                            className="w-full p-2 border rounded text-sm min-h-[80px]"
                            placeholder="제품 정보를 입력하세요"
                          />
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {productInfo}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 필수 대사 */}
                  {(requiredDialogues.length > 0 || localEditing) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span>💬</span>
                        필수 대사
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        {localEditing ? (
                          <div className="space-y-2">
                            {(Array.isArray(requiredDialogues) ? requiredDialogues : []).map((dialogue, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="text-blue-600 font-semibold pt-2">{idx + 1}.</span>
                                <input
                                  type="text"
                                  value={dialogue}
                                  onChange={(e) => {
                                    const stepData = parseStepData(localEditedData[activeStep]) || {}
                                    const newDialogues = [...(stepData.required_dialogues || [])]
                                    newDialogues[idx] = e.target.value
                                    setLocalEditedData({
                                      ...localEditedData,
                                      [activeStep]: JSON.stringify({ ...stepData, required_dialogues: newDialogues })
                                    })
                                  }}
                                  className="flex-1 p-2 border rounded text-sm"
                                />
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const stepData = parseStepData(localEditedData[activeStep]) || {}
                                setLocalEditedData({
                                  ...localEditedData,
                                  [activeStep]: JSON.stringify({ ...stepData, required_dialogues: [...(stepData.required_dialogues || []), ''] })
                                })
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              + 대사 추가
                            </button>
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {requiredDialogues.map((dialogue, idx) => (
                              <li key={idx} className="text-sm text-gray-800 flex gap-2">
                                <span className="text-blue-600 font-semibold">{idx + 1}.</span>
                                <span>{dialogue}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 필수 장면 */}
                  {(requiredScenes.length > 0 || localEditing) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-green-900 mb-3 flex items-center gap-2">
                        <span>🎬</span>
                        필수 장면
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-green-100">
                        {localEditing ? (
                          <div className="space-y-2">
                            {(Array.isArray(requiredScenes) ? requiredScenes : []).map((scene, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="text-green-600 font-semibold pt-2">{idx + 1}.</span>
                                <input
                                  type="text"
                                  value={scene}
                                  onChange={(e) => {
                                    const stepData = parseStepData(localEditedData[activeStep]) || {}
                                    const newScenes = [...(stepData.required_scenes || [])]
                                    newScenes[idx] = e.target.value
                                    setLocalEditedData({
                                      ...localEditedData,
                                      [activeStep]: JSON.stringify({ ...stepData, required_scenes: newScenes })
                                    })
                                  }}
                                  className="flex-1 p-2 border rounded text-sm"
                                />
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const stepData = parseStepData(localEditedData[activeStep]) || {}
                                setLocalEditedData({
                                  ...localEditedData,
                                  [activeStep]: JSON.stringify({ ...stepData, required_scenes: [...(stepData.required_scenes || []), ''] })
                                })
                              }}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              + 장면 추가
                            </button>
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {requiredScenes.map((scene, idx) => (
                              <li key={idx} className="text-sm text-gray-800 flex gap-2">
                                <span className="text-green-600 font-semibold">{idx + 1}.</span>
                                <span>{scene}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 주의사항 */}
                  {(cautions || localEditing) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                        <span>⚠️</span>
                        주의사항
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-red-100">
                        {localEditing ? (
                          <textarea
                            value={localEditedData[activeStep]?.cautions || cautions}
                            onChange={(e) => {
                              const stepData = parseStepData(localEditedData[activeStep]) || {}
                              setLocalEditedData({
                                ...localEditedData,
                                [activeStep]: JSON.stringify({ ...stepData, cautions: e.target.value })
                              })
                            }}
                            className="w-full p-2 border rounded text-sm min-h-[80px]"
                            placeholder="주의사항을 입력하세요"
                          />
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {cautions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 필수 해시태그 */}
                  {(hashtags.length > 0 || localEditing) && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <span>📌</span>
                        필수 해시태그
                      </h4>
                      {localEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray(hashtags) ? hashtags : []).map((tag, idx) => (
                              <div key={idx} className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded">
                                <input
                                  type="text"
                                  value={tag}
                                  onChange={(e) => {
                                    const stepData = parseStepData(localEditedData[activeStep]) || {}
                                    const newTags = [...(stepData.hashtags || [])]
                                    newTags[idx] = e.target.value
                                    setLocalEditedData({
                                      ...localEditedData,
                                      [activeStep]: JSON.stringify({ ...stepData, hashtags: newTags })
                                    })
                                  }}
                                  className="w-24 p-1 border rounded text-sm"
                                />
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              const stepData = parseStepData(localEditedData[activeStep]) || {}
                              setLocalEditedData({
                                ...localEditedData,
                                [activeStep]: JSON.stringify({ ...stepData, hashtags: [...(stepData.hashtags || []), ''] })
                              })
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-700"
                          >
                            + 해시태그 추가
                          </button>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  )}

                  {/* 참고 영상 URL */}
                  {(referenceUrls.length > 0 || localEditing) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
                        <span>🔗</span>
                        참고 영상
                      </h4>
                      {localEditing ? (
                        <div className="space-y-2">
                          {(Array.isArray(referenceUrls) ? referenceUrls : []).map((url, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={url}
                                onChange={(e) => {
                                  const stepData = parseStepData(localEditedData[activeStep]) || {}
                                  const newUrls = [...(stepData.reference_urls || [])]
                                  newUrls[idx] = e.target.value
                                  setLocalEditedData({
                                    ...localEditedData,
                                    [activeStep]: JSON.stringify({ ...stepData, reference_urls: newUrls })
                                  })
                                }}
                                className="flex-1 p-2 border rounded text-sm"
                                placeholder="URL을 입력하세요"
                              />
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const stepData = parseStepData(localEditedData[activeStep]) || {}
                              setLocalEditedData({
                                ...localEditedData,
                                [activeStep]: JSON.stringify({ ...stepData, reference_urls: [...(stepData.reference_urls || []), ''] })
                              })
                            }}
                            className="text-sm text-orange-600 hover:text-orange-700"
                          >
                            + URL 추가
                          </button>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* 내용이 없는 경우 또는 단순 텍스트 형식 */
                <div className="rounded-xl border-2 border-pink-200 bg-pink-50 overflow-hidden">
                  <div className="bg-pink-100 px-4 py-2 border-b border-pink-200">
                    <h4 className="font-bold text-pink-800">{stepTitles[activeStep]}</h4>
                  </div>
                  <div className="p-4">
                    {localEditing ? (
                      <textarea
                        value={typeof localEditedData[activeStep] === 'string' ? localEditedData[activeStep] : JSON.stringify(localEditedData[activeStep] || '', null, 2)}
                        onChange={(e) => setLocalEditedData({...localEditedData, [activeStep]: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[250px]"
                        placeholder={`${stepTitles[activeStep]} 가이드 내용을 입력하세요...`}
                      />
                    ) : (
                      displayData[activeStep] ? (
                        <p className="text-gray-700 whitespace-pre-wrap">{typeof displayData[activeStep] === 'string' ? displayData[activeStep] : JSON.stringify(displayData[activeStep], null, 2)}</p>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-500">
                            {activeStep === 'step1' ? 'STEP 1' : 'STEP 2'}의 가이드가 등록되지 않았습니다.
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            관리자에게 문의해 주세요.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    return <OliveYoungGuideContent />
  }

  // 올영/4주 캠페인 레벨 AI 가이드 타입 처리 (레거시)
  if (guideData.type === '4week_ai' || guideData.type === 'oliveyoung_ai') {
    const is4Week = guideData.type === '4week_ai'

    // 디버깅 로그
    console.log('[Guide Viewer] guideData:', guideData)
    console.log('[Guide Viewer] weeklyGuides raw:', guideData.weeklyGuides)
    console.log('[Guide Viewer] step1 raw:', guideData.step1)

    // 4주 챌린지 가이드 데이터 파싱
    const parseWeeklyGuides = () => {
      if (!guideData.weeklyGuides) {
        console.log('[Guide Viewer] weeklyGuides is empty/undefined')
        return []
      }
      try {
        // weeklyGuides가 이중으로 stringify 되어 있을 수 있음
        let parsed = guideData.weeklyGuides
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed)
          // 한번 더 파싱이 필요할 수 있음
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed)
          }
        }
        console.log('[Guide Viewer] parsed weeklyGuides:', parsed)

        if (!parsed || typeof parsed !== 'object') return []

        return Object.entries(parsed).map(([week, data]) => ({
          week: week.replace('week', ''),
          ...(typeof data === 'object' ? data : { content: data })
        }))
      } catch (e) {
        console.error('[Guide Viewer] Failed to parse weekly guides:', e, guideData.weeklyGuides)
        return []
      }
    }

    // 올영 가이드 데이터 파싱
    const parseOliveyoungGuides = () => {
      const steps = []
      for (let i = 1; i <= 3; i++) {
        let stepData = guideData[`step${i}`]
        if (stepData) {
          try {
            // 이중 stringify 처리
            if (typeof stepData === 'string') {
              stepData = JSON.parse(stepData)
              if (typeof stepData === 'string') {
                stepData = JSON.parse(stepData)
              }
            }
            if (typeof stepData === 'object') {
              steps.push({ step: i, ...stepData })
            } else {
              steps.push({ step: i, content: stepData })
            }
          } catch (e) {
            console.error('[Guide Viewer] Failed to parse step', i, ':', e)
            steps.push({ step: i, content: String(stepData) })
          }
        }
      }
      console.log('[Guide Viewer] parsed oliveyoung steps:', steps)
      return steps
    }

    const weeklyGuides = is4Week ? parseWeeklyGuides() : []
    const oliveyoungSteps = !is4Week ? parseOliveyoungGuides() : []

    // 디버깅: 파싱 결과
    console.log('[Guide Viewer] weeklyGuides parsed count:', weeklyGuides.length)
    console.log('[Guide Viewer] oliveyoungSteps parsed count:', oliveyoungSteps.length)

    return (
      <div className="space-y-5">
        {/* Header with Edit button */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${
              is4Week ? 'bg-gradient-to-br from-purple-500 to-indigo-500' : 'bg-gradient-to-br from-green-500 to-emerald-500'
            }`}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {is4Week ? '4주 챌린지 AI 가이드' : '올영 AI 가이드'}
            </h3>
          </div>
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(!isEditing)
                if (!isEditing) {
                  setEditedGuide(guide)
                }
              }}
              className="gap-1"
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {isEditing ? '취소' : '수정'}
            </Button>
          )}
        </div>

        {isEditing ? (
          /* 수정 모드 */
          <div className="space-y-4">
            <textarea
              value={typeof editedGuide === 'string' ? editedGuide : JSON.stringify(editedGuide, null, 2)}
              onChange={(e) => setEditedGuide(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              placeholder="가이드 내용을 수정하세요..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditedGuide(null)
                }}
              >
                취소
              </Button>
              <Button
                onClick={async () => {
                  setSaving(true)
                  try {
                    await onSave(editedGuide)
                    setIsEditing(false)
                    alert('가이드가 저장되었습니다.')
                  } catch (error) {
                    alert('저장 실패: ' + error.message)
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        ) : (
          /* 보기 모드 */
          <div className="space-y-4">
            {is4Week ? (
              /* 4주 챌린지 가이드 표시 */
              weeklyGuides.length > 0 ? (
                weeklyGuides.map((week, idx) => (
                  <div key={idx} className="rounded-xl border-2 border-purple-200 bg-purple-50 overflow-hidden">
                    <div className="bg-purple-100 px-4 py-2 border-b border-purple-200">
                      <h4 className="font-bold text-purple-800">{week.week}주차</h4>
                    </div>
                    <div className="p-4 space-y-2">
                      {week.mission && (
                        <div>
                          <span className="text-sm font-medium text-purple-700">미션:</span>
                          <p className="text-gray-700">{week.mission}</p>
                        </div>
                      )}
                      {week.product_info && (
                        <div>
                          <span className="text-sm font-medium text-purple-700">제품 정보:</span>
                          <p className="text-gray-700">{week.product_info}</p>
                        </div>
                      )}
                      {week.key_message && (
                        <div>
                          <span className="text-sm font-medium text-purple-700">키 메시지:</span>
                          <p className="text-gray-700">{week.key_message}</p>
                        </div>
                      )}
                      {week.hashtags && (
                        <div>
                          <span className="text-sm font-medium text-purple-700">해시태그:</span>
                          <p className="text-gray-700">{Array.isArray(week.hashtags) ? week.hashtags.join(' ') : week.hashtags}</p>
                        </div>
                      )}
                      {week.precautions && (
                        <div>
                          <span className="text-sm font-medium text-purple-700">주의사항:</span>
                          <p className="text-gray-700">{week.precautions}</p>
                        </div>
                      )}
                      {week.content && (
                        <div>
                          <p className="text-gray-700 whitespace-pre-wrap">{week.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-4 text-gray-500">
                    4주차 가이드 데이터를 파싱할 수 없습니다.
                  </div>
                  {/* Raw 데이터 표시 (디버깅용) */}
                  {guideData.weeklyGuides && (
                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                      <h4 className="font-bold text-gray-700 mb-2">원본 데이터:</h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-96">
                        {typeof guideData.weeklyGuides === 'string'
                          ? guideData.weeklyGuides
                          : JSON.stringify(guideData.weeklyGuides, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!guideData.weeklyGuides && (
                    <div className="text-center text-sm text-gray-400">
                      캠페인 설정에서 가이드를 먼저 생성해주세요.
                    </div>
                  )}
                </div>
              )
            ) : (
              /* 올영 가이드 표시 */
              oliveyoungSteps.length > 0 ? (
                oliveyoungSteps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border-2 border-green-200 bg-green-50 overflow-hidden">
                    <div className="bg-green-100 px-4 py-2 border-b border-green-200">
                      <h4 className="font-bold text-green-800">STEP {step.step}</h4>
                    </div>
                    <div className="p-4 space-y-2">
                      {step.product_info && (
                        <div>
                          <span className="text-sm font-medium text-green-700">제품 정보:</span>
                          <p className="text-gray-700">{step.product_info}</p>
                        </div>
                      )}
                      {step.key_message && (
                        <div>
                          <span className="text-sm font-medium text-green-700">키 메시지:</span>
                          <p className="text-gray-700">{step.key_message}</p>
                        </div>
                      )}
                      {step.hashtags && (
                        <div>
                          <span className="text-sm font-medium text-green-700">해시태그:</span>
                          <p className="text-gray-700">{Array.isArray(step.hashtags) ? step.hashtags.join(' ') : step.hashtags}</p>
                        </div>
                      )}
                      {step.precautions && (
                        <div>
                          <span className="text-sm font-medium text-green-700">주의사항:</span>
                          <p className="text-gray-700">{step.precautions}</p>
                        </div>
                      )}
                      {step.content && (
                        <div>
                          <p className="text-gray-700 whitespace-pre-wrap">{step.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-4 text-gray-500">
                    올영 가이드 데이터를 파싱할 수 없습니다.
                  </div>
                  {/* Raw 데이터 표시 (디버깅용) */}
                  {(guideData.step1 || guideData.step2 || guideData.step3) && (
                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                      <h4 className="font-bold text-gray-700 mb-2">원본 데이터:</h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-96">
                        {JSON.stringify({ step1: guideData.step1, step2: guideData.step2, step3: guideData.step3 }, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!(guideData.step1 || guideData.step2 || guideData.step3) && (
                    <div className="text-center text-sm text-gray-400">
                      캠페인 설정에서 가이드를 먼저 생성해주세요.
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
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
