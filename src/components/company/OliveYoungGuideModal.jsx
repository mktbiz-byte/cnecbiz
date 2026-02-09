import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Plus, X, Loader2 } from 'lucide-react'

export default function OliveYoungGuideModal({
  campaign,
  onClose,
  onSave,
  supabase,
  groupName // 그룹별 가이드 수정 시 그룹명 전달
}) {
  const [activeStep, setActiveStep] = useState('step1')
  
  const [commonData, setCommonData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    product_key_points: ''
  })

  const [stepGuides, setStepGuides] = useState({
    step1: { guide: '', hashtags: [], reference_urls: [] },
    step2: { guide: '', hashtags: [], reference_urls: [] },
    step3: { guide: '', hashtags: [], reference_urls: [] }
  })
  
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing data
  useEffect(() => {
    if (campaign) {
      setCommonData({
        brand: campaign.brand || '',
        product_name: campaign.product_name || '',
        product_features: campaign.product_features || '',
        product_key_points: campaign.product_key_points || ''
      })

      // 그룹별 가이드가 있으면 우선 로드
      const groupData = groupName && campaign.guide_group_data?.[groupName]

      setStepGuides({
        step1: {
          guide: groupData?.step1 || campaign.oliveyoung_step1_guide || '',
          hashtags: [],
          reference_urls: []
        },
        step2: {
          guide: groupData?.step2 || campaign.oliveyoung_step2_guide || '',
          hashtags: [],
          reference_urls: []
        },
        step3: {
          guide: groupData?.step3 || campaign.oliveyoung_step3_guide || '',
          hashtags: [],
          reference_urls: []
        }
      })

      // Load AI guides if exist (그룹 데이터가 없을 때만)
      if (!groupData) {
        if (campaign.oliveyoung_step1_guide_ai) {
          try {
            const parsed = JSON.parse(campaign.oliveyoung_step1_guide_ai)
            setStepGuides(prev => ({
              ...prev,
              step1: {
                ...prev.step1,
                hashtags: parsed.hashtags || [],
                reference_urls: parsed.reference_urls || []
              }
            }))
          } catch (e) {}
        }
        if (campaign.oliveyoung_step2_guide_ai) {
          try {
            const parsed = JSON.parse(campaign.oliveyoung_step2_guide_ai)
            setStepGuides(prev => ({
              ...prev,
              step2: {
                ...prev.step2,
                hashtags: parsed.hashtags || [],
                reference_urls: parsed.reference_urls || []
              }
            }))
          } catch (e) {}
        }
        if (campaign.oliveyoung_step3_guide_ai) {
          try {
            const parsed = JSON.parse(campaign.oliveyoung_step3_guide_ai)
            setStepGuides(prev => ({
              ...prev,
              step3: {
                ...prev.step3,
                hashtags: parsed.hashtags || [],
                reference_urls: parsed.reference_urls || []
              }
            }))
          } catch (e) {}
        }
      }
    }
  }, [campaign, groupName])

  const handleGenerateGuides = async () => {
    if (!stepGuides.step1.guide || !stepGuides.step2.guide || !stepGuides.step3.guide) {
      alert('STEP 1, 2, 3 가이드를 모두 입력해주세요.')
      return
    }

    setGenerating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      // Generate guides for each step
      const steps = ['step1', 'step2', 'step3']
      const stepNames = {
        step1: 'STEP 1 (세일 전 영상)',
        step2: 'STEP 2 (세일 당일 영상)',
        step3: 'STEP 3 (스토리 URL 링크)'
      }
      const generatedGuides = {}

      for (const step of steps) {
        const stepData = stepGuides[step]
        
        const prompt = `당신은 한국 뷰티/패션 크리에이터를 위한 올리브영 세일 캠페인 가이드 작성 전문가입니다.

다음 제품 정보와 기업의 요구사항을 바탕으로, ${stepNames[step]}에 대한 크리에이터 가이드를 작성해주세요.

**제품 정보:**
- 브랜드: ${commonData.brand || '미정'}
- 제품명: ${commonData.product_name || '미정'}
- 제품 특징: ${commonData.product_features || '미정'}
- 핵심 포인트: ${commonData.product_key_points || '미정'}

**${stepNames[step]} 요구사항:**
${stepData.guide}

${stepData.hashtags.length > 0 ? `**필수 해시태그:**\n${stepData.hashtags.join(', ')}` : ''}

${stepData.reference_urls.length > 0 ? `**참고 영상:**\n${stepData.reference_urls.join('\\n')}` : ''}

**가이드 작성 요구사항:**
1. 상품 정보를 간단명료하게 정리
2. 필수 해시태그 3~5개 제안 (기업이 제공한 해시태그가 있다면 반드시 포함)
3. 필수 대사 3~5개 작성 - 크리에이터가 반드시 말해야 할 핵심 멘트
4. 필수 촬영 장면 3~5개 작성 - 반드시 포함되어야 할 장면 설명
5. 주의사항 작성 (FHD 이상, 필터 자제, 마감일 엄수, 패널티, 해시태그 필수 등)
6. 참고 영상 URL이 있다면 포함

**응답 형식 (JSON):**
{
  "product_info": "상품 정보 요약",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3"],
  "required_dialogues": ["필수 대사1", "필수 대사2", "필수 대사3"],
  "required_scenes": ["필수 장면1", "필수 장면2", "필수 장면3"],
  "cautions": "주의사항 내용",
  "reference_urls": ${JSON.stringify(stepData.reference_urls)}
}

JSON 형식으로만 응답해주세요.`

        // 올리브영 가이드 모달: 복잡한 콘텐츠 → gemini-2.5-flash-lite (품질 중요)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
                responseMimeType: "application/json"
              }
            })
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`${stepNames[step]} AI 생성 실패: ${errorData.error?.message || response.statusText}`)
        }

        const result = await response.json()
        
        if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
          throw new Error(`${stepNames[step]} AI 응답 형식이 올바르지 않습니다.`)
        }

        const generatedText = result.candidates[0].content.parts[0].text
        generatedGuides[step] = JSON.parse(generatedText)
      }

      // Update UI state with generated guides
      setStepGuides(prev => ({
        step1: {
          ...prev.step1,
          guide: generatedGuides.step1.product_info + '\n\n' +
                 '필수 대사:\n' + generatedGuides.step1.required_dialogues.map((d, i) => `${i+1}. ${d}`).join('\n') + '\n\n' +
                 '필수 장면:\n' + generatedGuides.step1.required_scenes.map((s, i) => `${i+1}. ${s}`).join('\n') + '\n\n' +
                 '주의사항:\n' + generatedGuides.step1.cautions,
          hashtags: generatedGuides.step1.hashtags || [],
          reference_urls: generatedGuides.step1.reference_urls || []
        },
        step2: {
          ...prev.step2,
          guide: generatedGuides.step2.product_info + '\n\n' +
                 '필수 대사:\n' + generatedGuides.step2.required_dialogues.map((d, i) => `${i+1}. ${d}`).join('\n') + '\n\n' +
                 '필수 장면:\n' + generatedGuides.step2.required_scenes.map((s, i) => `${i+1}. ${s}`).join('\n') + '\n\n' +
                 '주의사항:\n' + generatedGuides.step2.cautions,
          hashtags: generatedGuides.step2.hashtags || [],
          reference_urls: generatedGuides.step2.reference_urls || []
        },
        step3: {
          ...prev.step3,
          guide: generatedGuides.step3.product_info + '\n\n' +
                 '필수 대사:\n' + generatedGuides.step3.required_dialogues.map((d, i) => `${i+1}. ${d}`).join('\n') + '\n\n' +
                 '필수 장면:\n' + generatedGuides.step3.required_scenes.map((s, i) => `${i+1}. ${s}`).join('\n') + '\n\n' +
                 '주의사항:\n' + generatedGuides.step3.cautions,
          hashtags: generatedGuides.step3.hashtags || [],
          reference_urls: generatedGuides.step3.reference_urls || []
        }
      }))

      // Save to database
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          oliveyoung_step1_guide_ai: JSON.stringify(generatedGuides.step1),
          oliveyoung_step2_guide_ai: JSON.stringify(generatedGuides.step2),
          oliveyoung_step3_guide_ai: JSON.stringify(generatedGuides.step3),
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)

      if (error) throw error

      alert('✅ 3개 STEP별 AI 가이드가 생성되었습니다! 각 탭에서 확인하고 수정하세요.')
    } catch (error) {
      console.error('Error generating guides:', error)
      alert('가이드 생성 실패: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let updateData

      if (groupName) {
        // 그룹별 가이드 저장
        const existingGroupData = campaign.guide_group_data || {}
        updateData = {
          guide_group_data: {
            ...existingGroupData,
            [groupName]: {
              step1: stepGuides.step1.guide,
              step2: stepGuides.step2.guide,
              step3: stepGuides.step3.guide
            }
          }
        }
      } else {
        // 전체 가이드 저장 (기존)
        updateData = {
          brand: commonData.brand,
          product_name: commonData.product_name,
          product_features: commonData.product_features,
          product_key_points: commonData.product_key_points,
          oliveyoung_step1_guide: stepGuides.step1.guide,
          oliveyoung_step2_guide: stepGuides.step2.guide,
          oliveyoung_step3_guide: stepGuides.step3.guide
        }
      }

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaign.id)

      if (error) throw error

      alert(groupName ? `✅ "${groupName}" 그룹 가이드가 저장되었습니다!` : '✅ 가이드가 저장되었습니다!')
      onSave()
    } catch (error) {
      console.error('Error saving guide:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateStepData = (step, field, value) => {
    setStepGuides(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value
      }
    }))
  }

  const addHashtag = (step) => {
    updateStepData(step, 'hashtags', [...stepGuides[step].hashtags, ''])
  }

  const removeHashtag = (step, index) => {
    updateStepData(step, 'hashtags', stepGuides[step].hashtags.filter((_, i) => i !== index))
  }

  const updateHashtag = (step, index, value) => {
    const newHashtags = [...stepGuides[step].hashtags]
    newHashtags[index] = value
    updateStepData(step, 'hashtags', newHashtags)
  }

  const addReferenceUrl = (step) => {
    updateStepData(step, 'reference_urls', [...stepGuides[step].reference_urls, ''])
  }

  const removeReferenceUrl = (step, index) => {
    updateStepData(step, 'reference_urls', stepGuides[step].reference_urls.filter((_, i) => i !== index))
  }

  const updateReferenceUrl = (step, index, value) => {
    const newUrls = [...stepGuides[step].reference_urls]
    newUrls[index] = value
    updateStepData(step, 'reference_urls', newUrls)
  }

  const currentStep = stepGuides[activeStep]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">
            🎉 올리브영 세일 캠페인 가이드
            {groupName && <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{groupName}</span>}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 제품 기본 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">📦 제품 기본 정보 (모든 STEP 공통)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                <input
                  type="text"
                  value={commonData.brand}
                  onChange={(e) => setCommonData(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="브랜드명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품명</label>
                <input
                  type="text"
                  value={commonData.product_name}
                  onChange={(e) => setCommonData(prev => ({ ...prev, product_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="제품명"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 특징</label>
                <textarea
                  value={commonData.product_features}
                  onChange={(e) => setCommonData(prev => ({ ...prev, product_features: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="제품의 주요 특징"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">핵심 포인트</label>
                <textarea
                  value={commonData.product_key_points}
                  onChange={(e) => setCommonData(prev => ({ ...prev, product_key_points: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="핵심 소구 포인트"
                />
              </div>
            </div>
          </div>

          {/* STEP 탭 */}
          <div className="flex gap-2 border-b">
            {[
              { id: 'step1', label: '📹 STEP 1: 세일 전' },
              { id: 'step2', label: '🛍️ STEP 2: 세일 당일' },
              { id: 'step3', label: '🔗 STEP 3: 스토리 링크' }
            ].map(step => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeStep === step.id
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          {/* 현재 STEP 가이드 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📝 {activeStep === 'step1' ? '세일 전 영상' : activeStep === 'step2' ? '세일 당일 영상' : '스토리 URL 링크'} 가이드
              </label>
              <textarea
                value={currentStep.guide}
                onChange={(e) => updateStepData(activeStep, 'guide', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="가이드 내용을 입력하세요..."
              />
            </div>

            {/* 해시태그 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  #️⃣ 필수 해시태그
                </label>
                <button
                  onClick={() => addHashtag(activeStep)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
              <div className="space-y-2">
                {currentStep.hashtags.map((tag, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => updateHashtag(activeStep, index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="해시태그 (# 제외)"
                    />
                    <button
                      onClick={() => removeHashtag(activeStep, index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {currentStep.hashtags.length === 0 && (
                  <p className="text-sm text-gray-500">해시태그를 추가해주세요.</p>
                )}
              </div>
            </div>

            {/* 참고 영상 URL */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  🔗 참고 영상 URL
                </label>
                <button
                  onClick={() => addReferenceUrl(activeStep)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
              <div className="space-y-2">
                {currentStep.reference_urls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateReferenceUrl(activeStep, index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => removeReferenceUrl(activeStep, index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {currentStep.reference_urls.length === 0 && (
                  <p className="text-sm text-gray-500">참고 영상 URL을 추가해주세요.</p>
                )}
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              💾 가이드 저장
            </button>
            <button
              onClick={handleGenerateGuides}
              disabled={generating}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              🤖 AI로 3개 STEP 가이드 생성
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
