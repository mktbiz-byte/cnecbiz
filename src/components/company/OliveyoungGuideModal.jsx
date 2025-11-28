import { useState } from 'react'
import { X, Edit, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseKorea'

export default function OliveyoungGuideModal({ campaign, onClose, onUpdate }) {
  const [activeStep, setActiveStep] = useState('step1')
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(null)
  const [saving, setSaving] = useState(false)

  // Parse guide data to get URLs
  const parseGuideData = (guideText) => {
    if (!guideText) return null
    try {
      return typeof guideText === 'string' ? JSON.parse(guideText) : guideText
    } catch {
      return null
    }
  }

  const step1Data = parseGuideData(campaign.oliveyoung_step1_guide_ai)
  const step2Data = parseGuideData(campaign.oliveyoung_step2_guide_ai)

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
    setEditedData(JSON.parse(JSON.stringify(currentData || {
      product_info: '',
      required_dialogues: [],
      required_scenes: [],
      cautions: '',
      hashtags: [],
      reference_urls: []
    })))
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const fieldName = activeStep === 'step1' ? 'oliveyoung_step1_guide_ai' : 'oliveyoung_step2_guide_ai'
      
      const { error } = await supabase
        .from('campaigns')
        .update({ [fieldName]: JSON.stringify(editedData) })
        .eq('id', campaign.id)

      if (error) throw error

      alert('수정이 저장되었습니다!')
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

  // Extract all fields from JSON (only for STEP 1 and 2)
  const productInfo = currentStepData?.product_info || ''
  const requiredDialogues = currentStepData?.required_dialogues || []
  const requiredScenes = currentStepData?.required_scenes || []
  const cautions = currentStepData?.cautions || ''
  const hashtags = currentStepData?.hashtags || []
  const referenceUrls = currentStepData?.reference_urls || []

  const hasContent = productInfo || requiredDialogues.length > 0 || requiredScenes.length > 0 || cautions || hashtags.length > 0 || referenceUrls.length > 0

  // STEP 3 story URL
  const storyUrl = campaign.oliveyoung_step3_guide || ''

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50">
          <h3 className="text-xl font-bold text-gray-900">📸 올리브영 촬영 가이드</h3>
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

              {hasContent ? (
                <div className="space-y-6">
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
                  {requiredScenes.length > 0 && (
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

                  {/* 주의사항 */}
                  {cautions && (
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

                  {/* 참고 영상 URL */}
                  {(referenceUrls.length > 0 || isEditing) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <h4 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
                        <span>🔗</span>
                        참고 영상
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
