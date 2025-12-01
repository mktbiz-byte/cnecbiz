import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Plus, X, Loader2 } from 'lucide-react'

export default function FourWeekGuideModal({ 
  campaign, 
  initialWeek = 1,
  onClose, 
  onSave,
  supabase 
}) {
  const [activeWeek, setActiveWeek] = useState(`week${initialWeek}`)
  
  const [commonData, setCommonData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    precautions: ''
  })

  const [weeklyGuides, setWeeklyGuides] = useState({
    week1: { mission: '', required_dialogue: '', required_scenes: '', reference: '', hashtags: [] },
    week2: { mission: '', required_dialogue: '', required_scenes: '', reference: '', hashtags: [] },
    week3: { mission: '', required_dialogue: '', required_scenes: '', reference: '', hashtags: [] },
    week4: { mission: '', required_dialogue: '', required_scenes: '', reference: '', hashtags: [] }
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
        precautions: campaign.product_key_points || ''
      })

      // Load guides with fallback logic
      const loadedGuides = {}
      const aiGuides = campaign.challenge_weekly_guides_ai 
        ? (typeof campaign.challenge_weekly_guides_ai === 'string'
            ? JSON.parse(campaign.challenge_weekly_guides_ai)
            : campaign.challenge_weekly_guides_ai)
        : null
      const oldGuides = campaign.challenge_weekly_guides || {}

      ;['week1', 'week2', 'week3', 'week4'].forEach(week => {
        const aiWeekData = aiGuides?.[week]
        const oldWeekData = oldGuides[week] || {}
        
        // If AI guide exists (string or object), use it
        if (aiWeekData && typeof aiWeekData === 'string') {
          // AI guide is a simple string description - merge with old guide structure
          loadedGuides[week] = {
            mission: oldWeekData.mission || '',
            required_dialogue: oldWeekData.required_dialogue || '',
            required_scenes: oldWeekData.required_scenes || '',
            reference: oldWeekData.reference || '',
            hashtags: [],
            ai_description: aiWeekData  // Add AI description
          }
        } else if (aiWeekData && typeof aiWeekData === 'object') {
          loadedGuides[week] = {
            mission: aiWeekData.mission || oldWeekData.mission || '',
            required_dialogue: Array.isArray(aiWeekData.required_dialogues)
              ? aiWeekData.required_dialogues.map((d, i) => `${i+1}. ${d}`).join('\n')
              : (aiWeekData.required_dialogue || oldWeekData.required_dialogue || ''),
            required_scenes: Array.isArray(aiWeekData.required_scenes)
              ? aiWeekData.required_scenes.map((s, i) => `${i+1}. ${s}`).join('\n')
              : (aiWeekData.required_scenes || oldWeekData.required_scenes || ''),
            reference: Array.isArray(aiWeekData.reference_urls) && aiWeekData.reference_urls.length > 0
              ? aiWeekData.reference_urls[0]
              : (aiWeekData.reference || oldWeekData.reference || ''),
            hashtags: aiWeekData.hashtags || []
          }
        } else {
          // Fallback to old format or empty
          loadedGuides[week] = {
            mission: oldWeekData.mission || '',
            required_dialogue: oldWeekData.required_dialogue || '',
            required_scenes: oldWeekData.required_scenes || '',
            reference: oldWeekData.reference || '',
            hashtags: [],
            ai_description: null
          }
        }
      })
      
      setWeeklyGuides(loadedGuides)
    }
  }, [campaign])

  const handleGenerateWeekGuide = async (weekToGenerate) => {
    // Validate current week
    const weekData = weeklyGuides[weekToGenerate]
    if (!weekData.mission || !weekData.required_dialogue || !weekData.required_scenes) {
      alert(`${weekToGenerate.replace('week', '')}주차 가이드를 모두 입력해주세요.`)
      return
    }

    setGenerating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      const weekNum = weekToGenerate.replace('week', '')
        
        const prompt = `당신은 한국 뷰티/패션 크리에이터를 위한 4주 챌린지 캠페인 가이드 작성 전문가입니다.

다음 제품 정보와 ${weekNum}주차 미션을 바탕으로, 크리에이터가 쉽게 실행할 수 있는 가이드를 작성해주세요.

**제품 정보 (통합):**
- 브랜드: ${commonData.brand || '미정'}
- 제품명: ${commonData.product_name || '미정'}
- 제품 특징: ${commonData.product_features || '미정'}
- 주의사항: ${commonData.precautions || '미정'}

**${weekNum}주차 미션:**
${weekData.mission}

**필수 대사:**
${weekData.required_dialogue}

**필수 장면:**
${weekData.required_scenes}

${weekData.reference ? `**참고 영상:**\n${weekData.reference}` : ''}

${weekData.hashtags.length > 0 ? `**필수 해시태그:**\n${weekData.hashtags.join(', ')}` : ''}

**가이드 작성 요구사항:**
1. 상품 정보 + 종합 정보를 간단명료하게 정리
2. 해당 주차 미션을 명확하게 설명
3. 필수 해시태그 3~5개 제안 (기업이 제공한 해시태그가 있다면 반드시 포함)
4. 필수 대사 3~5개 작성 - 크리에이터가 반드시 말해야 할 핵심 멘트
5. 필수 촬영 장면 3~5개 작성 - 반드시 포함되어야 할 장면 설명
6. 주의사항 작성 (FHD 이상, 필터 자제, 마감일 엄수, 패널티 등)
7. 참고 영상 URL이 있다면 포함

**응답 형식 (JSON):**
{
  "product_info": "상품 정보 + 종합 정보 요약",
  "mission": "${weekNum}주차 미션",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3"],
  "required_dialogues": ["필수 대사1", "필수 대사2", "필수 대사3"],
  "required_scenes": ["필수 장면1", "필수 장면2", "필수 장면3"],
  "cautions": "주의사항 내용",
  "reference_urls": ${weekData.reference ? `["${weekData.reference}"]` : '[]'}
}

JSON 형식으로만 응답해주세요.`

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
          throw new Error(`${weekNum}주차 AI 생성 실패: ${errorData.error?.message || response.statusText}`)
        }

        const result = await response.json()
        
        if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
          throw new Error(`${weekNum}주차 AI 응답 형식이 올바르지 않습니다.`)
        }

      const generatedText = result.candidates[0].content.parts[0].text
      const generatedGuide = JSON.parse(generatedText)

      // Update UI state with generated guide for current week
      setWeeklyGuides(prev => ({
        ...prev,
        [weekToGenerate]: {
          ...prev[weekToGenerate],
          mission: generatedGuide.mission || prev[weekToGenerate].mission,
          required_dialogue: generatedGuide.required_dialogues.map((d, i) => `${i+1}. ${d}`).join('\n'),
          required_scenes: generatedGuide.required_scenes.map((s, i) => `${i+1}. ${s}`).join('\n'),
          hashtags: generatedGuide.hashtags || []
        }
      }))

      // Save to database using challenge_weekly_guides_ai JSONB column
      const existingGuides = campaign.challenge_weekly_guides_ai 
        ? (typeof campaign.challenge_weekly_guides_ai === 'string' 
            ? JSON.parse(campaign.challenge_weekly_guides_ai) 
            : campaign.challenge_weekly_guides_ai)
        : {}
      const updatedGuides = {
        ...existingGuides,
        [weekToGenerate]: generatedGuide
      }
      
      console.log('🔍 Saving AI guide to DB:', JSON.stringify(updatedGuides, null, 2))
      
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          challenge_weekly_guides_ai: updatedGuides,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)

      if (error) throw error

      alert(`✅ ${weekNum}주차 AI 가이드가 생성되었습니다! 내용을 확인하고 수정하세요.`)
    } catch (error) {
      console.error('Error generating guides:', error)
      alert('가이드 생성 실패: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveWeek = async (weekToSave) => {
    setSaving(true)
    try {
      const weekData = weeklyGuides[weekToSave]
      const weekNum = weekToSave.replace('week', '')

      // Load existing AI guides
      const existingGuides = campaign.challenge_weekly_guides_ai
        ? (typeof campaign.challenge_weekly_guides_ai === 'string'
            ? JSON.parse(campaign.challenge_weekly_guides_ai)
            : campaign.challenge_weekly_guides_ai)
        : {}
      
      // Update with current week - preserve AI-generated structure if exists
      const existingWeekGuide = existingGuides[weekToSave]
      const updatedGuides = {
        ...existingGuides,
        [weekToSave]: {
          // Preserve AI-generated fields
          product_info: existingWeekGuide?.product_info,
          cautions: existingWeekGuide?.cautions,
          // Update editable fields from form
          mission: weekData.mission,
          required_dialogues: weekData.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.replace(/^\d+\.\s*/, '')),
          required_scenes: weekData.required_scenes.split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '')),
          reference_urls: weekData.reference ? [weekData.reference] : [],
          hashtags: weekData.hashtags || []
        }
      }

      console.log('💾 handleSaveWeek - Saving to DB:', JSON.stringify(updatedGuides, null, 2))

      const { error } = await supabase
        .from('campaigns')
        .update({
          brand: commonData.brand,
          product_name: commonData.product_name,
          product_features: commonData.product_features,
          product_key_points: commonData.precautions,
          challenge_weekly_guides_ai: updatedGuides
        })
        .eq('id', campaign.id)

      if (error) throw error

      alert(`✅ ${weekNum}주차 가이드가 저장되었습니다!`)
      onSave()
    } catch (error) {
      console.error('Error saving guide:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const [sending, setSending] = useState(false)

  const handleSendWeek = async (weekToSend) => {
    const weekNum = weekToSend.replace('week', '')
    
    if (!confirm(`${weekNum}주차 가이드를 모든 참여자에게 전달하시겠습니까?`)) {
      return
    }

    setSending(true)
    try {
      // First save the guide to campaign
      await handleSaveWeek(weekToSend)

      // Get the saved guide data from challenge_weekly_guides_ai
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('challenge_weekly_guides_ai, challenge_weekly_guides')
        .eq('id', campaign.id)
        .single()

      if (campaignError) throw campaignError

      // Get guide from AI guides or fallback to basic guides
      const aiGuides = typeof campaignData.challenge_weekly_guides_ai === 'string'
        ? JSON.parse(campaignData.challenge_weekly_guides_ai)
        : campaignData.challenge_weekly_guides_ai
      
      const weekGuide = aiGuides?.[weekToSend] || campaignData.challenge_weekly_guides?.[weekToSend]

      if (!weekGuide) {
        alert(`${weekNum}주차 가이드를 찾을 수 없습니다. 먼저 저장해주세요.`)
        return
      }

      // Get all applications for this campaign
      const { data: applications, error: applicationsError } = await supabase
        .from('applications')
        .select('id, user_id, custom_guide')
        .eq('campaign_id', campaign.id)
        .eq('is_selected', true)

      if (applicationsError) throw applicationsError

      if (!applications || applications.length === 0) {
        alert('선정된 참여자가 없습니다.')
        return
      }

      // Save guide to each application's custom_guide field
      const updatePromises = applications.map(async (app) => {
        // Get existing custom_guide
        const existingGuide = app.custom_guide || {}
        
        // Update with current week guide
        const updatedGuide = {
          ...existingGuide,
          [weekToSend]: {
            ...weekGuide,
            delivered_at: new Date().toISOString(),
            week_number: parseInt(weekNum)
          }
        }

        // Update application
        return supabase
          .from('applications')
          .update({ custom_guide: updatedGuide })
          .eq('id', app.id)
      })

      const results = await Promise.all(updatePromises)
      
      // Check for errors
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        console.error('Some updates failed:', errors)
        throw new Error(`${errors.length}개 업데이트 실패`)
      }

      // TODO: Send email/notification to participants
      
      alert(`✅ ${weekNum}주차 가이드가 ${applications.length}명의 참여자에게 전달되었습니다!`)
      
    } catch (error) {
      console.error('Error sending guide:', error)
      alert('전달 실패: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const updateWeekData = (week, field, value) => {
    setWeeklyGuides(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [field]: value
      }
    }))
  }

  const addHashtag = (week) => {
    updateWeekData(week, 'hashtags', [...weeklyGuides[week].hashtags, ''])
  }

  const removeHashtag = (week, index) => {
    updateWeekData(week, 'hashtags', weeklyGuides[week].hashtags.filter((_, i) => i !== index))
  }

  const updateHashtag = (week, index, value) => {
    const newHashtags = [...weeklyGuides[week].hashtags]
    newHashtags[index] = value
    updateWeekData(week, 'hashtags', newHashtags)
  }

  const currentWeek = weeklyGuides[activeWeek]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">🏆 4주 챌린지 캠페인 가이드</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 제품 기본 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">📦 제품 기본 정보 (모든 주차 공통)</h4>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">주의사항</label>
                <textarea
                  value={commonData.precautions}
                  onChange={(e) => setCommonData(prev => ({ ...prev, precautions: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="주의사항"
                />
              </div>
            </div>
          </div>

          {/* 주차 탭 */}
          <div className="flex gap-2 border-b">
            {['week1', 'week2', 'week3', 'week4'].map((week, idx) => (
              <button
                key={week}
                onClick={() => setActiveWeek(week)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeWeek === week
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {idx + 1}주차
              </button>
            ))}
          </div>

          {/* 현재 주차 가이드 */}
          <div className="space-y-4">
            {/* AI 생성 가이드 설명 */}
            {currentWeek.ai_description && (
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300 rounded-lg p-4">
                <h6 className="text-sm font-semibold text-blue-800 mb-2">🤖 AI 맞춤형 가이드</h6>
                <p className="text-sm text-blue-900 font-medium whitespace-pre-wrap">{currentWeek.ai_description}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 미션
              </label>
              <textarea
                value={currentWeek.mission}
                onChange={(e) => updateWeekData(activeWeek, 'mission', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="이번 주차 미션을 입력하세요..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💬 필수 대사
              </label>
              <textarea
                value={currentWeek.required_dialogue}
                onChange={(e) => updateWeekData(activeWeek, 'required_dialogue', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="필수 대사를 입력하세요..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎥 필수 촬영 장면
              </label>
              <textarea
                value={currentWeek.required_scenes}
                onChange={(e) => updateWeekData(activeWeek, 'required_scenes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="필수 촬영 장면을 입력하세요..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔗 참고 영상 URL
              </label>
              <input
                type="url"
                value={currentWeek.reference}
                onChange={(e) => updateWeekData(activeWeek, 'reference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://..."
              />
            </div>

            {/* 해시태그 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  #️⃣ 필수 해시태그
                </label>
                <button
                  onClick={() => addHashtag(activeWeek)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
              <div className="space-y-2">
                {currentWeek.hashtags.map((tag, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => updateHashtag(activeWeek, index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="해시태그 (# 제외)"
                    />
                    <button
                      onClick={() => removeHashtag(activeWeek, index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {currentWeek.hashtags.length === 0 && (
                  <p className="text-sm text-gray-500">해시태그를 추가해주세요.</p>
                )}
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="space-y-3 pt-4 border-t">
            <button
              onClick={() => handleGenerateWeekGuide(activeWeek)}
              disabled={generating}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              🤖 {activeWeek.replace('week', '')}주차 AI 가이드 생성
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleSaveWeek(activeWeek)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                💾 {activeWeek.replace('week', '')}주차 저장
              </button>
              <button
                onClick={() => handleSendWeek(activeWeek)}
                disabled={sending || saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                📤 {activeWeek.replace('week', '')}주차 전달
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
