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
        // 원본 데이터를 복사해서 편집용으로 사용
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

      return (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-purple-500 to-indigo-500">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">4주 챌린지 가이드</h3>
            </div>
            {onSave && !localEditing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1">
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

          {/* 제품 정보 */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              제품 정보
            </h4>
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
                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">⚠️ 주의사항</label>
                  <textarea
                    value={localEditedData.precautions || ''}
                    onChange={(e) => setLocalEditedData({...localEditedData, precautions: e.target.value})}
                    className="w-full px-3 py-2 border border-red-200 rounded-md text-sm bg-red-50"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {displayData.brand && (
                  <div><span className="text-purple-600 font-medium">브랜드:</span> <span className="ml-2 text-gray-800">{displayData.brand}</span></div>
                )}
                {displayData.product_name && (
                  <div><span className="text-purple-600 font-medium">제품명:</span> <span className="ml-2 text-gray-800">{displayData.product_name}</span></div>
                )}
                {displayData.product_features && (
                  <div className="col-span-2"><span className="text-purple-600 font-medium">제품 특징:</span><p className="mt-1 text-gray-800 whitespace-pre-wrap">{displayData.product_features}</p></div>
                )}
                {displayData.precautions && (
                  <div className="col-span-2"><span className="text-red-600 font-medium">⚠️ 주의사항:</span><p className="mt-1 text-gray-800 whitespace-pre-wrap">{displayData.precautions}</p></div>
                )}
              </div>
            )}
          </div>

          {/* 주차 탭 */}
          <div className="flex gap-2 border-b">
            {['week1', 'week2', 'week3', 'week4'].map((week, idx) => (
              <button
                key={week}
                onClick={() => setActiveWeek(week)}
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

          {/* 선택된 주차 내용 */}
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50 overflow-hidden">
            <div className="bg-purple-100 px-4 py-2 border-b border-purple-200">
              <h4 className="font-bold text-purple-800">{activeWeek.replace('week', '')}주차 가이드</h4>
            </div>
            <div className="p-4 space-y-4">
              {localEditing ? (
                <>
                  <div>
                    <label className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-1">
                      <CheckCircle className="w-4 h-4" /> 미션
                    </label>
                    <textarea
                      value={currentWeekData.mission || ''}
                      onChange={(e) => updateWeekField(activeWeek, 'mission', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={3}
                      placeholder="이번 주차 미션을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-1">
                      <MessageSquare className="w-4 h-4" /> 필수 대사
                    </label>
                    <textarea
                      value={currentWeekData.required_dialogue || ''}
                      onChange={(e) => updateWeekField(activeWeek, 'required_dialogue', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={2}
                      placeholder="필수로 포함해야 하는 대사"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-1">
                      <Camera className="w-4 h-4" /> 필수 장면
                    </label>
                    <textarea
                      value={currentWeekData.required_scenes || ''}
                      onChange={(e) => updateWeekField(activeWeek, 'required_scenes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={2}
                      placeholder="필수로 촬영해야 하는 장면"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-1">
                      <ExternalLink className="w-4 h-4" /> 참고 URL
                    </label>
                    <input
                      type="text"
                      value={currentWeekData.reference_url || ''}
                      onChange={(e) => updateWeekField(activeWeek, 'reference_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="참고할 영상 URL"
                    />
                  </div>
                </>
              ) : (
                <>
                  {currentWeekData.mission && (
                    <div>
                      <span className="text-sm font-semibold text-purple-700 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> 미션</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{currentWeekData.mission}</p>
                    </div>
                  )}
                  {currentWeekData.required_dialogue && (
                    <div>
                      <span className="text-sm font-semibold text-purple-700 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> 필수 대사</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap bg-white/60 p-2 rounded-lg border border-purple-100">"{currentWeekData.required_dialogue}"</p>
                    </div>
                  )}
                  {currentWeekData.required_scenes && (
                    <div>
                      <span className="text-sm font-semibold text-purple-700 flex items-center gap-1"><Camera className="w-4 h-4" /> 필수 장면</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{currentWeekData.required_scenes}</p>
                    </div>
                  )}
                  {currentWeekData.reference_url && (
                    <div>
                      <span className="text-sm font-semibold text-purple-700 flex items-center gap-1"><ExternalLink className="w-4 h-4" /> 참고 URL</span>
                      <a href={currentWeekData.reference_url.startsWith('http') ? currentWeekData.reference_url : `https://${currentWeekData.reference_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline mt-1 block text-sm break-all">{currentWeekData.reference_url}</a>
                    </div>
                  )}
                  {!currentWeekData.mission && !currentWeekData.required_dialogue && !currentWeekData.required_scenes && !currentWeekData.reference_url && (
                    <p className="text-gray-500 text-center py-4">이 주차에 설정된 가이드가 없습니다.</p>
                  )}
                </>
              )}
            </div>
          </div>
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

      const displayData = localEditing ? localEditedData : guideData
      const stepTitles = { step1: 'STEP 1: 세일 전 영상', step2: 'STEP 2: 세일 당일 영상', step3: 'STEP 3: 스토리 링크' }

      return (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-green-500 to-emerald-500">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">올영 세일 가이드</h3>
            </div>
            {onSave && !localEditing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1">
                <Edit className="w-4 h-4" />
                수정
              </Button>
            )}
            {localEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>취소</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={localSaving} className="bg-green-600 hover:bg-green-700">
                  {localSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </div>

          {/* 제품 정보 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              제품 정보
            </h4>
            {localEditing ? (
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
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {displayData.brand && (
                  <div><span className="text-green-600 font-medium">브랜드:</span> <span className="ml-2 text-gray-800">{displayData.brand}</span></div>
                )}
                {displayData.product_name && (
                  <div><span className="text-green-600 font-medium">제품명:</span> <span className="ml-2 text-gray-800">{displayData.product_name}</span></div>
                )}
              </div>
            )}
          </div>

          {/* STEP 탭 */}
          <div className="flex gap-2 border-b">
            {['step1', 'step2', 'step3'].map((step, idx) => (
              <button
                key={step}
                onClick={() => setActiveStep(step)}
                className={`px-4 py-3 font-medium text-sm transition-all ${
                  activeStep === step
                    ? 'border-b-2 border-green-600 text-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                STEP {idx + 1}
              </button>
            ))}
          </div>

          {/* 선택된 STEP 내용 */}
          <div className="rounded-xl border-2 border-green-200 bg-green-50 overflow-hidden">
            <div className="bg-green-100 px-4 py-2 border-b border-green-200">
              <h4 className="font-bold text-green-800">{stepTitles[activeStep]}</h4>
            </div>
            <div className="p-4">
              {localEditing ? (
                <textarea
                  value={localEditedData[activeStep] || ''}
                  onChange={(e) => setLocalEditedData({...localEditedData, [activeStep]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[250px]"
                  placeholder={`${stepTitles[activeStep]} 가이드 내용을 입력하세요...`}
                />
              ) : (
                displayData[activeStep] ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{typeof displayData[activeStep] === 'string' ? displayData[activeStep] : JSON.stringify(displayData[activeStep], null, 2)}</p>
                ) : (
                  <p className="text-gray-500 text-center py-4">이 스텝에 설정된 가이드가 없습니다.</p>
                )
              )}
            </div>
          </div>
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
