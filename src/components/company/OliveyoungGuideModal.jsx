import { useState } from 'react'
import { X, Edit, Save, FileText, Link as LinkIcon, ExternalLink } from 'lucide-react'

export default function OliveyoungGuideModal({ campaign, onClose, onUpdate, supabase, groupName }) {
  const [activeStep, setActiveStep] = useState('step1')
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(null)
  const [saving, setSaving] = useState(false)

  // Parse guide data to get URLs
  const parseGuideData = (guideText) => {
    if (!guideText) return null
    try {
      const parsed = typeof guideText === 'string' ? JSON.parse(guideText) : guideText
      return parsed
    } catch {
      // JSON 파싱 실패 시 텍스트 가이드로 처리
      if (typeof guideText === 'string' && guideText.trim()) {
        return { text_guide: guideText }
      }
      return null
    }
  }

  // 그룹별 가이드 데이터 우선 확인
  const groupData = groupName && campaign.guide_group_data?.[groupName]

  // AI 가이드 또는 일반 가이드 둘 다 확인 (그룹 데이터 우선)
  // 그룹: step1_ai (AI 가이드) → step1 (텍스트 가이드) → 글로벌 fallback
  const step1Data = (groupData?.step1_ai ? parseGuideData(groupData.step1_ai) : null) || (groupData?.step1 ? parseGuideData(groupData.step1) : null) || parseGuideData(campaign.oliveyoung_step1_guide_ai) || parseGuideData(campaign.oliveyoung_step1_guide)
  const step2Data = (groupData?.step2_ai ? parseGuideData(groupData.step2_ai) : null) || (groupData?.step2 ? parseGuideData(groupData.step2) : null) || parseGuideData(campaign.oliveyoung_step2_guide_ai) || parseGuideData(campaign.oliveyoung_step2_guide)

  console.log('[OliveyoungGuideModal] Raw campaign.oliveyoung_step1_guide_ai:', campaign.oliveyoung_step1_guide_ai)
  console.log('[OliveyoungGuideModal] Parsed step1Data:', step1Data)

  // 외부 가이드 정보
  const getExternalGuide = (stepNum) => {
    const mode = campaign[`step${stepNum}_guide_mode`]
    const url = campaign[`step${stepNum}_external_url`]
    const fileUrl = campaign[`step${stepNum}_external_file_url`]
    const fileName = campaign[`step${stepNum}_external_file_name`]
    const title = campaign[`step${stepNum}_external_title`]

    if (mode === 'external' && (url || fileUrl)) {
      return {
        type: fileUrl ? 'pdf' : 'url',
        url: url,
        fileUrl: fileUrl,
        fileName: fileName,
        title: title
      }
    }
    return null
  }

  const step1External = getExternalGuide(1)
  const step2External = getExternalGuide(2)
  const step3External = getExternalGuide(3)

  // STEP 3 고정 안내 문구
  const step3Instruction = {
    title: "📌 STEP 3: 인스타그램 스토리 링크 업로드 안내",
    content: `STEP 2 영상에 아래 제품 구매 링크(URL)를 삽입하여 지정된 날짜에 맞춰 업로드해 주세요.

⚠️ 중요 사항:
• 플랫폼: 인스타그램 스토리 한정
• 업로드 기한: ${campaign.step3_deadline ? new Date(campaign.step3_deadline).toLocaleDateString('ko-KR') : '캠페인 상세 확인'}
• 유지 기간: 24시간 이상 필수 유지
• URL 삽입 위치: 스토리 링크 스티커

※ 24시간 이내 삭제 시 캠페인 규정 위반으로 처리될 수 있습니다.`
  }

  // Get current step data
  const getCurrentStepData = () => {
    if (isEditing && editedData) return editedData
    if (activeStep === 'step1') return step1Data
    if (activeStep === 'step2') return step2Data
    return null
  }

  const handleEdit = () => {
    const currentData = activeStep === 'step1' ? step1Data : step2Data
    console.log('[OliveyoungGuideModal] handleEdit - activeStep:', activeStep)
    console.log('[OliveyoungGuideModal] handleEdit - currentData:', currentData)
    console.log('[OliveyoungGuideModal] handleEdit - currentData.text_guide:', currentData?.text_guide)

    // 캠페인의 원본 가이드 텍스트도 fallback으로 사용
    const rawGuideText = activeStep === 'step1'
      ? campaign.oliveyoung_step1_guide
      : campaign.oliveyoung_step2_guide
    console.log('[OliveyoungGuideModal] handleEdit - rawGuideText:', rawGuideText)

    // 캠페인 정보를 기본값으로 사용
    const defaultProductInfo = campaign.brand && campaign.product_name
      ? `${campaign.brand} ${campaign.product_name}${campaign.product_features ? ' - ' + campaign.product_features.slice(0, 100) : ''}`
      : ''

    // 문자열을 배열로 변환하는 헬퍼 함수
    const toArray = (value) => {
      if (!value) return []
      if (Array.isArray(value)) return value
      if (typeof value === 'string') {
        return value.split(/\n|(?:\d+\.\s)/).map(s => s.trim()).filter(s => s && s.length > 0)
      }
      return []
    }

    // 캠페인에서 기본 해시태그 가져오기
    const defaultHashtags = toArray(campaign.required_hashtags || campaign.hashtags)
    if (activeStep === 'step2' && !defaultHashtags.includes('#올영세일') && !defaultHashtags.includes('올영세일')) {
      defaultHashtags.push('올영세일')
    }

    const baseData = {
      text_guide: '',
      product_info: defaultProductInfo,
      required_dialogues: [],
      required_scenes: [],
      cautions: campaign.cautions || '',
      hashtags: defaultHashtags,
      reference_urls: []
    }

    // 기존 데이터가 있으면 병합, 없으면 기본값 사용
    if (currentData && typeof currentData === 'object') {
      // required_dialogue (단수) → required_dialogues (복수) 변환 지원
      const dialogues = toArray(currentData.required_dialogues || currentData.required_dialogue)
      const scenes = toArray(currentData.required_scenes)
      const tags = toArray(currentData.hashtags)
      const urls = toArray(currentData.reference_urls)

      // text_guide를 여러 소스에서 찾기 (우선순위: currentData > rawGuideText)
      const textGuideValue = currentData.text_guide || currentData.guide || rawGuideText || ''
      console.log('[OliveyoungGuideModal] handleEdit - textGuideValue:', textGuideValue)

      setEditedData({
        ...baseData,
        ...currentData,
        text_guide: textGuideValue,
        product_info: currentData.product_info || defaultProductInfo,
        required_dialogues: dialogues.length > 0 ? dialogues : baseData.required_dialogues,
        required_scenes: scenes.length > 0 ? scenes : baseData.required_scenes,
        hashtags: tags.length > 0 ? tags : baseData.hashtags,
        reference_urls: urls.length > 0 ? urls : baseData.reference_urls,
        cautions: currentData.cautions || baseData.cautions
      })
    } else if (rawGuideText) {
      // AI 가이드는 없지만 원본 가이드가 있는 경우
      setEditedData({
        ...baseData,
        text_guide: rawGuideText
      })
    } else {
      setEditedData(baseData)
    }
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!supabase) {
      alert('데이터베이스 연결 오류: supabase 클라이언트가 없습니다.')
      return
    }

    try {
      setSaving(true)
      const fieldName = activeStep === 'step1' ? 'oliveyoung_step1_guide_ai' : 'oliveyoung_step2_guide_ai'

      // 저장할 데이터 구조 확인
      const dataToSave = {
        text_guide: editedData?.text_guide || '',
        product_info: editedData?.product_info || '',
        required_dialogues: editedData?.required_dialogues || [],
        required_scenes: editedData?.required_scenes || [],
        cautions: editedData?.cautions || '',
        hashtags: editedData?.hashtags || [],
        reference_urls: editedData?.reference_urls || []
      }

      let updateData
      if (groupName) {
        // 그룹별 가이드 저장 → guide_group_data에 저장
        const existingGroupData = campaign.guide_group_data || {}
        const existingGroup = existingGroupData[groupName] || {}
        const stepKey = activeStep // 'step1' or 'step2'
        updateData = {
          guide_group_data: {
            ...existingGroupData,
            [groupName]: {
              ...existingGroup,
              [`${stepKey}_ai`]: JSON.stringify(dataToSave)
            }
          }
        }
        console.log('[OliveyoungGuideModal] 그룹별 저장:', { groupName, stepKey, campaignId: campaign.id })
      } else {
        // 전체 가이드 저장 (기존)
        updateData = { [fieldName]: JSON.stringify(dataToSave) }
        console.log('[OliveyoungGuideModal] 전체 저장:', { fieldName, campaignId: campaign.id })
      }

      const { data, error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaign.id)
        .select()

      if (error) {
        console.error('[OliveyoungGuideModal] 저장 에러:', error)
        throw error
      }

      console.log('[OliveyoungGuideModal] 저장 성공:', data)
      alert(groupName ? `✅ "${groupName}" 그룹 가이드가 저장되었습니다!` : '수정이 저장되었습니다!')
      setIsEditing(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedData(null)
  }

  const getStepDeadline = () => {
    if (activeStep === 'step1') return campaign.step1_deadline
    if (activeStep === 'step2') return campaign.step2_deadline
    if (activeStep === 'step3') return campaign.step3_deadline
    return null
  }

  const currentStepData = getCurrentStepData()
  const currentDeadline = getStepDeadline()

  // 현재 스텝의 외부 가이드
  const getCurrentExternalGuide = () => {
    if (activeStep === 'step1') return step1External
    if (activeStep === 'step2') return step2External
    if (activeStep === 'step3') return step3External
    return null
  }
  const currentExternalGuide = getCurrentExternalGuide()

  // Extract all fields from JSON (only for STEP 1 and 2)
  // 캠페인 기본 정보를 fallback으로 사용
  const campaignProductInfo = campaign.brand && campaign.product_name
    ? `${campaign.brand} ${campaign.product_name}${campaign.product_features ? ' - ' + campaign.product_features.slice(0, 100) : ''}`
    : ''

  // 다양한 필드명 형식 지원 (required_dialogue vs required_dialogues 등)
  const parseToArray = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      // 줄바꿈 또는 번호로 분리된 텍스트를 배열로 변환
      return value.split(/\n|(?:\d+\.\s)/).map(s => s.trim()).filter(s => s && s.length > 0)
    }
    return []
  }

  // 편집 모드일 때는 editedData, 아닐 때는 currentStepData 사용
  const displayData = isEditing ? editedData : currentStepData

  const productInfo = displayData?.product_info || campaignProductInfo
  // required_dialogues (배열) 또는 required_dialogue (문자열) 둘 다 지원
  const requiredDialogues = parseToArray(displayData?.required_dialogues || displayData?.required_dialogue)
  // required_scenes가 배열 또는 문자열일 수 있음
  const requiredScenes = parseToArray(displayData?.required_scenes)
  // cautions - 캠페인 기본 cautions를 fallback으로 사용
  const cautions = displayData?.cautions || campaign.cautions || ''
  // hashtags - 캠페인 기본 hashtags도 확인
  const hashtags = parseToArray(displayData?.hashtags || campaign.required_hashtags || campaign.hashtags)
  const referenceUrls = parseToArray(displayData?.reference_urls)
  // text_guide를 여러 소스에서 찾기 (displayData > guide > rawGuide)
  const rawGuideForDisplay = activeStep === 'step1'
    ? campaign.oliveyoung_step1_guide
    : campaign.oliveyoung_step2_guide
  const textGuide = displayData?.text_guide || displayData?.guide || rawGuideForDisplay || ''
  // examples 필드도 지원 (필수 장면이 비어있을 때 fallback)
  const examples = displayData?.examples || ''

  const hasContent = productInfo || requiredDialogues.length > 0 || requiredScenes.length > 0 || cautions || hashtags.length > 0 || referenceUrls.length > 0 || textGuide || examples
  const hasExternalGuide = !!currentExternalGuide

  // STEP 3 story URL
  const storyUrl = campaign.oliveyoung_step3_guide || ''

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
          <h3 className="text-xl font-bold text-gray-900">
            📸 올리브영 촬영 가이드
            {groupName && <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{groupName}</span>}
          </h3>
          <div className="flex items-center gap-2">
            {activeStep !== 'step3' && !isEditing && (
              <button
                onClick={handleEdit}
                className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600"
              >
                <Edit className="w-5 h-5" />
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  취소
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* STEP 탭 */}
        <div className="flex gap-2 px-6 pt-4 border-b bg-white">
          {[
            { key: 'step1', label: 'STEP 1: 세일 전 영상' },
            { key: 'step2', label: 'STEP 2: 세일 당일 영상' },
            { key: 'step3', label: 'STEP 3: 스토리 링크' }
          ].map((step) => (
            <button
              key={step.key}
              onClick={() => {
                if (isEditing) {
                  if (confirm('수정 중인 내용이 있습니다. 탭을 변경하시게습니까?')) {
                    handleCancel()
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

        {/* 가이드 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 3는 고정 안내 + 스토리 URL만 표시 */}
          {activeStep === 'step3' ? (
            <>
              {/* 고정 안내 문구 */}
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                <h4 className="text-base font-bold text-blue-900 mb-3">{step3Instruction.title}</h4>
                <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                  {step3Instruction.content}
                </p>
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
            </>
          ) : (
            <>
              {/* 마감일 표시 (STEP 1, 2만) */}
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

              {/* 외부 가이드 (PDF/URL) */}
              {hasExternalGuide ? (
                <div className="space-y-6">
                  <div className={`rounded-xl border-2 overflow-hidden ${
                    currentExternalGuide.type === 'pdf'
                      ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'
                      : 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50'
                  }`}>
                    <div className="p-8 text-center">
                      <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                        currentExternalGuide.type === 'pdf'
                          ? 'bg-gradient-to-br from-red-100 to-orange-100'
                          : 'bg-gradient-to-br from-blue-100 to-cyan-100'
                      }`}>
                        {currentExternalGuide.type === 'pdf' ? (
                          <FileText className="w-10 h-10 text-red-500" />
                        ) : (
                          <LinkIcon className="w-10 h-10 text-blue-500" />
                        )}
                      </div>

                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        {currentExternalGuide.title || (currentExternalGuide.type === 'pdf' ? 'PDF 가이드' : '외부 가이드')}
                      </h4>

                      {currentExternalGuide.type === 'pdf' && currentExternalGuide.fileName && (
                        <p className="text-sm text-gray-500 mb-4">
                          파일명: {currentExternalGuide.fileName}
                        </p>
                      )}

                      <a
                        href={currentExternalGuide.type === 'pdf' ? currentExternalGuide.fileUrl : currentExternalGuide.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 ${
                          currentExternalGuide.type === 'pdf'
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                        }`}
                      >
                        <ExternalLink className="w-5 h-5" />
                        {currentExternalGuide.type === 'pdf' ? 'PDF 열기' : '가이드 열기'}
                      </a>
                    </div>
                  </div>
                </div>
              ) : hasContent ? (
                <div className="space-y-6">
                  {/* 텍스트 가이드 (일반 텍스트 형식) */}
                  {(textGuide || isEditing) && (
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-pink-900 mb-3 flex items-center gap-2">
                        <span>📝</span>
                        {activeStep === 'step1' ? 'STEP 1' : 'STEP 2'} 가이드
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-pink-100">
                        {isEditing ? (
                          <textarea
                            value={editedData?.text_guide || ''}
                            onChange={(e) => setEditedData({ ...editedData, text_guide: e.target.value })}
                            className="w-full p-2 border rounded text-sm min-h-[120px]"
                            placeholder="가이드 내용을 입력하세요"
                          />
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {textGuide}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 제품 정보 */}
                  {(productInfo || isEditing) && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>📦</span>
                        제품 정보
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-purple-100">
                        {isEditing ? (
                          <textarea
                            value={productInfo}
                            onChange={(e) => setEditedData({ ...editedData, product_info: e.target.value })}
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
                  {(requiredDialogues.length > 0 || isEditing) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span>💬</span>
                        필수 대사
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        {isEditing ? (
                          <div className="space-y-2">
                            {requiredDialogues.map((dialogue, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="text-blue-600 font-semibold pt-2">{idx + 1}.</span>
                                <input
                                  type="text"
                                  value={dialogue}
                                  onChange={(e) => {
                                    const newDialogues = [...requiredDialogues]
                                    newDialogues[idx] = e.target.value
                                    setEditedData({ ...editedData, required_dialogues: newDialogues })
                                  }}
                                  className="flex-1 p-2 border rounded text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const newDialogues = requiredDialogues.filter((_, i) => i !== idx)
                                    setEditedData({ ...editedData, required_dialogues: newDialogues })
                                  }}
                                  className="px-2 text-red-600 hover:text-red-700"
                                >
                                  삭제
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                setEditedData({ ...editedData, required_dialogues: [...requiredDialogues, ''] })
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
                  {(requiredScenes.length > 0 || isEditing) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-green-900 mb-3 flex items-center gap-2">
                        <span>🎬</span>
                        필수 장면
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-green-100">
                        {isEditing ? (
                          <div className="space-y-2">
                            {requiredScenes.map((scene, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="text-green-600 font-semibold pt-2">{idx + 1}.</span>
                                <input
                                  type="text"
                                  value={scene}
                                  onChange={(e) => {
                                    const newScenes = [...requiredScenes]
                                    newScenes[idx] = e.target.value
                                    setEditedData({ ...editedData, required_scenes: newScenes })
                                  }}
                                  className="flex-1 p-2 border rounded text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const newScenes = requiredScenes.filter((_, i) => i !== idx)
                                    setEditedData({ ...editedData, required_scenes: newScenes })
                                  }}
                                  className="px-2 text-red-600 hover:text-red-700"
                                >
                                  삭제
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                setEditedData({ ...editedData, required_scenes: [...requiredScenes, ''] })
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

                  {/* 예시 (examples) */}
                  {examples && !isEditing && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-teal-900 mb-3 flex items-center gap-2">
                        <span>💡</span>
                        예시
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-teal-100">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {examples}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 주의사항 */}
                  {(cautions || isEditing) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                        <span>⚠️</span>
                        주의사항
                      </h4>
                      <div className="bg-white rounded-lg p-4 border border-red-100">
                        {isEditing ? (
                          <textarea
                            value={cautions}
                            onChange={(e) => setEditedData({ ...editedData, cautions: e.target.value })}
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
                  {(hashtags.length > 0 || isEditing) && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <span>📌</span>
                        필수 해시태그
                      </h4>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {hashtags.map((tag, idx) => (
                              <div key={idx} className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded">
                                <input
                                  type="text"
                                  value={tag}
                                  onChange={(e) => {
                                    const newTags = [...hashtags]
                                    newTags[idx] = e.target.value
                                    setEditedData({ ...editedData, hashtags: newTags })
                                  }}
                                  className="w-24 p-1 border rounded text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const newTags = hashtags.filter((_, i) => i !== idx)
                                    setEditedData({ ...editedData, hashtags: newTags })
                                  }}
                                  className="text-red-600 hover:text-red-700 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              setEditedData({ ...editedData, hashtags: [...hashtags, ''] })
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

                  {/* 참고 영상 URL - 항상 표시 */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h4 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
                      <span>🔗</span>
                      참고 영상
                      <span className="text-xs text-orange-600 font-normal">(선택사항)</span>
                    </h4>
                    {isEditing ? (
                      <div className="space-y-2">
                        {referenceUrls.map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...referenceUrls]
                                newUrls[idx] = e.target.value
                                setEditedData({ ...editedData, reference_urls: newUrls })
                              }}
                              className="flex-1 p-2 border rounded text-sm"
                              placeholder="URL을 입력하세요"
                            />
                            <button
                              onClick={() => {
                                const newUrls = referenceUrls.filter((_, i) => i !== idx)
                                setEditedData({ ...editedData, reference_urls: newUrls })
                              }}
                              className="px-2 text-red-600 hover:text-red-700"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setEditedData({ ...editedData, reference_urls: [...referenceUrls, ''] })
                          }}
                          className="text-sm text-orange-600 hover:text-orange-700"
                        >
                          + URL 추가
                        </button>
                      </div>
                    ) : referenceUrls.length > 0 ? (
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
                    ) : (
                      <div className="bg-white border border-orange-100 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">
                          참고 영상 URL이 등록되지 않았습니다.
                        </p>
                        <p className="text-xs text-orange-600 mt-2">
                          📝 우측 상단의 수정 버튼을 클릭하여 참고 영상 URL을 추가할 수 있습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">
                    {activeStep === 'step1' ? 'STEP 1' : 'STEP 2'}의 가이드가 등록되지 않았습니다.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    관리자에게 문의해 주세요.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
