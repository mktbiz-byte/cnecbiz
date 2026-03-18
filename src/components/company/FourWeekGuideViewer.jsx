import { useState } from 'react'
import { X, Edit, Save, FileText, Link as LinkIcon, ExternalLink, Globe, Languages, PenLine, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'

export default function FourWeekGuideViewer({ campaign, onClose, onUpdate, onEdit, region, supabaseClient }) {
  const navigate = useNavigate()
  const [activeWeek, setActiveWeek] = useState('week1')
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewLanguage, setViewLanguage] = useState(region === 'japan' ? 'ja' : region === 'us' ? 'en' : 'ko')

  // Use provided supabase client or fall back to region-based client
  const supabase = supabaseClient || getSupabaseClient(region || 'korea')

  // Determine translation suffix based on region
  const isJapan = region === 'japan'
  const isUS = region === 'us'
  const isKorea = !isJapan && !isUS
  const translationSuffix = isJapan ? '_ja' : isUS ? '_en' : null

  // 외부 가이드 정보 가져오기
  const getExternalGuide = (weekKey) => {
    const mode = campaign[`${weekKey}_guide_mode`]
    const url = campaign[`${weekKey}_external_url`]
    const fileUrl = campaign[`${weekKey}_external_file_url`]
    const fileName = campaign[`${weekKey}_external_file_name`]
    const title = campaign[`${weekKey}_external_title`]

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

  // Parse and merge challenge_weekly_guides and challenge_weekly_guides_ai
  const parseWeeklyGuides = () => {
    let aiGuides = null
    try {
      if (campaign.challenge_weekly_guides_ai) {
        let raw = campaign.challenge_weekly_guides_ai
        if (typeof raw === 'string') {
          raw = JSON.parse(raw)
          // Handle double-stringified
          if (typeof raw === 'string') raw = JSON.parse(raw)
        }
        aiGuides = raw
      }
    } catch (e) {
      console.error('[FourWeekGuideViewer] challenge_weekly_guides_ai JSON parse error:', e)
    }
    const oldGuides = campaign.challenge_weekly_guides || {}

    // 원본 데이터를 배열로 변환하는 헬퍼 함수
    const parseToArray = (data) => {
      if (!data) return []
      if (Array.isArray(data)) return data.filter(d => d && d.trim())
      if (typeof data === 'string') {
        return data.split('\n').filter(d => d.trim()).map(d => d.trim())
      }
      return []
    }

    const mergedGuides = {}
    ;['week1', 'week2', 'week3', 'week4'].forEach(week => {
      const aiWeekData = aiGuides?.[week]
      const oldWeekData = oldGuides[week] || {}

      // 원본 데이터 파싱
      const oldDialogues = parseToArray(oldWeekData.required_dialogue)
      const oldScenes = parseToArray(oldWeekData.required_scenes)

      // If AI guide exists and is an object (not a string), use it with fallback to old data
      if (aiWeekData && typeof aiWeekData === 'object') {
        // AI 데이터도 배열로 파싱
        const aiDialogues = parseToArray(aiWeekData.required_dialogues)
        const aiScenes = parseToArray(aiWeekData.required_scenes)

        mergedGuides[week] = {
          mission: aiWeekData.mission || oldWeekData.mission || '',
          required_dialogues: aiDialogues.length > 0 ? aiDialogues : oldDialogues,
          required_scenes: aiScenes.length > 0 ? aiScenes : oldScenes,
          hashtags: aiWeekData.hashtags || [],
          product_info: aiWeekData.product_info || '',
          cautions: aiWeekData.cautions || oldWeekData.cautions || campaign.product_key_points || '',
          reference_urls: aiWeekData.reference_urls || (oldWeekData.reference ? [oldWeekData.reference] : []),
          // Translated fields (EN/JA)
          mission_en: aiWeekData.mission_en || '',
          required_dialogues_en: parseToArray(aiWeekData.required_dialogues_en),
          required_scenes_en: parseToArray(aiWeekData.required_scenes_en),
          product_info_en: aiWeekData.product_info_en || '',
          cautions_en: aiWeekData.cautions_en || '',
          mission_ja: aiWeekData.mission_ja || '',
          required_dialogues_ja: parseToArray(aiWeekData.required_dialogues_ja),
          required_scenes_ja: parseToArray(aiWeekData.required_scenes_ja),
          product_info_ja: aiWeekData.product_info_ja || '',
          cautions_ja: aiWeekData.cautions_ja || ''
        }
      } else if (aiWeekData && typeof aiWeekData === 'string') {
        mergedGuides[week] = {
          mission: aiWeekData,
          ai_description: aiWeekData,
          required_dialogues: oldDialogues,
          required_scenes: oldScenes,
          hashtags: [],
          product_info: '',
          cautions: oldWeekData.cautions || campaign.product_key_points || '',
          reference_urls: oldWeekData.reference ? [oldWeekData.reference] : []
        }
      } else {
        mergedGuides[week] = {
          mission: oldWeekData.mission || '',
          required_dialogues: oldDialogues,
          required_scenes: oldScenes,
          hashtags: [],
          product_info: '',
          cautions: oldWeekData.cautions || campaign.product_key_points || '',
          reference_urls: oldWeekData.reference ? [oldWeekData.reference] : []
        }
      }
    })

    return mergedGuides
  }

  // Parse translated guide data (from challenge_guide_data_en / challenge_guide_data_ja)
  const getTranslatedGuideData = () => {
    if (isUS && campaign.challenge_guide_data_en) {
      return campaign.challenge_guide_data_en
    }
    if (isJapan && campaign.challenge_guide_data_ja) {
      return campaign.challenge_guide_data_ja
    }
    return null
  }

  const weeklyGuides = parseWeeklyGuides()
  const translatedGuideData = getTranslatedGuideData()

  // Get current week data for the selected language
  const getCurrentWeekData = () => {
    if (isEditing && editedData) return editedData

    const weekData = weeklyGuides[activeWeek]

    if (typeof weekData === 'string') {
      const text = weekData
      const lines = text.split(/[.!]/).filter(line => line.trim())
      const mission = lines[0]?.trim() || text
      const dialogueMatches = text.match(/['\"](.*?)['\"]/g) || []
      const required_dialogues = dialogueMatches.map(d => d.replace(/['\"]/g, ''))
      const hashtagMatches = text.match(/#\w+/g) || []
      const hashtags = hashtagMatches.map(h => h.replace('#', ''))

      if (required_dialogues.length > 0 || hashtags.length > 0) {
        return {
          mission, required_dialogues, required_scenes: [], hashtags,
          product_info: '', cautions: '해당 미션에 맞게 촬영 필수', reference_urls: []
        }
      }

      return { guide_text: weekData, is_simple: true }
    }

    return weekData || null
  }

  // Get translated version of current week data
  const getTranslatedWeekData = () => {
    const weekData = weeklyGuides[activeWeek]
    if (!weekData) return null

    const suffix = isUS ? '_en' : isJapan ? '_ja' : null
    if (!suffix) return null

    // First try to get from AI guide's translated fields
    const hasTrFields = weekData[`mission${suffix}`] ||
                        (weekData[`required_dialogues${suffix}`] && weekData[`required_dialogues${suffix}`].length > 0) ||
                        (weekData[`required_scenes${suffix}`] && weekData[`required_scenes${suffix}`].length > 0)

    if (hasTrFields) {
      return {
        mission: weekData[`mission${suffix}`] || '',
        required_dialogues: weekData[`required_dialogues${suffix}`] || [],
        required_scenes: weekData[`required_scenes${suffix}`] || [],
        product_info: weekData[`product_info${suffix}`] || '',
        cautions: weekData[`cautions${suffix}`] || ''
      }
    }

    // Fallback to challenge_guide_data_en / challenge_guide_data_ja
    if (translatedGuideData) {
      const weekKey = activeWeek
      const trWeek = translatedGuideData[weekKey]
      if (trWeek) {
        return {
          mission: trWeek.mission || '',
          required_dialogues: trWeek.required_dialogue
            ? trWeek.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim())
            : [],
          required_scenes: trWeek.required_scenes
            ? trWeek.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim())
            : [],
          product_info: `${translatedGuideData.product_name || ''}: ${trWeek.mission || ''}`,
          cautions: translatedGuideData.precautions || ''
        }
      }
    }

    return null
  }

  const handleEdit = () => {
    const currentData = getCurrentWeekData()
    // If no data for this week, initialize with structured format for easy editing
    if (!currentData || (!currentData.mission && !currentData.guide_text && (currentData.required_dialogues || []).length === 0)) {
      setEditedData({
        product_info: campaign.product_name ? `${campaign.product_name}: ${campaign.product_features || ''}` : '',
        mission: '',
        required_dialogues: [],
        required_scenes: [],
        cautions: campaign.product_key_points || '',
        hashtags: [],
        reference_urls: []
      })
    } else {
      setEditedData(JSON.parse(JSON.stringify(currentData)))
    }
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const updatedGuides = { ...weeklyGuides }

      if (editedData.is_simple) {
        updatedGuides[activeWeek] = editedData.guide_text
      } else {
        updatedGuides[activeWeek] = {
          ...updatedGuides[activeWeek],
          product_info: editedData.product_info || '',
          mission: editedData.mission || '',
          required_dialogues: editedData.required_dialogues || [],
          required_scenes: editedData.required_scenes || [],
          cautions: editedData.cautions || '',
          hashtags: editedData.hashtags || [],
          reference_urls: editedData.reference_urls || []
        }
      }

      // challenge_weekly_guides_ai is a TEXT column, so stringify the object
      const { error } = await supabase
        .from('campaigns')
        .update({
          challenge_weekly_guides_ai: JSON.stringify(updatedGuides),
          challenge_weekly_guides: updatedGuides
        })
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

  const getCurrentDeadline = () => {
    const weekNum = activeWeek.replace('week', '')
    const deadlineField = `week${weekNum}_deadline`
    return campaign[deadlineField]
  }

  const currentWeekData = getCurrentWeekData()
  const translatedWeekData = getTranslatedWeekData()
  const currentDeadline = getCurrentDeadline()
  const currentExternalGuide = getExternalGuide(activeWeek)

  const isSimpleFormat = currentWeekData?.is_simple
  const hasExternalGuide = !!currentExternalGuide

  // Extract fields from current week data (Korean / original)
  const productInfo = currentWeekData?.product_info || ''
  const mission = currentWeekData?.mission || ''
  const requiredDialogues = currentWeekData?.required_dialogues || []
  const requiredScenes = currentWeekData?.required_scenes || []
  const cautions = currentWeekData?.cautions || ''
  const hashtags = currentWeekData?.hashtags || []
  const referenceUrls = currentWeekData?.reference_urls || []
  const guideText = currentWeekData?.guide_text || ''

  const hasContent = isSimpleFormat ? !!guideText : (productInfo || mission || requiredDialogues.length > 0 || requiredScenes.length > 0 || cautions || hashtags.length > 0 || referenceUrls.length > 0)
  const hasTranslation = !!translatedWeekData && (translatedWeekData.mission || translatedWeekData.required_dialogues?.length > 0 || translatedWeekData.required_scenes?.length > 0)

  // Language labels
  const langLabel = isJapan ? '日本語' : isUS ? 'English' : '한국어'
  const langLabelKo = '한국어'

  // Render a guide section (Korean or translated)
  const renderGuideContent = (data, label, colorTheme = 'purple') => {
    if (!data) return null
    const m = data.mission || data.guide_text || ''
    const dl = data.required_dialogues || []
    const sc = data.required_scenes || []
    const pi = data.product_info || ''
    const ca = data.cautions || ''

    if (!m && dl.length === 0 && sc.length === 0 && !pi && !ca) return null

    return (
      <div className="space-y-4">
        {pi && (
          <div className={`bg-gradient-to-r from-${colorTheme}-50 to-blue-50 border border-${colorTheme}-200 rounded-lg p-4`}>
            <h4 className={`text-sm font-bold text-${colorTheme}-900 mb-2 flex items-center gap-2`}>
              <span>📦</span> {label === 'ko' ? '제품 정보' : label === 'en' ? 'Product Info' : '商品情報'}
            </h4>
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{pi}</p>
            </div>
          </div>
        )}

        {m && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <span>🎯</span> {label === 'ko' ? `${activeWeek.replace('week', '')}주차 미션` : label === 'en' ? `Week ${activeWeek.replace('week', '')} Mission` : `${activeWeek.replace('week', '')}週目 ミッション`}
            </h4>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{m}</p>
            </div>
          </div>
        )}

        {dl.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <span>💬</span> {label === 'ko' ? '필수 대사' : label === 'en' ? 'Required Lines' : '必須セリフ'}
            </h4>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <ul className="space-y-1.5">
                {dl.map((d, idx) => (
                  <li key={idx} className="text-sm text-gray-800 flex gap-2">
                    <span className="text-blue-600 font-semibold">{idx + 1}.</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {sc.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
              <span>🎬</span> {label === 'ko' ? '필수 장면' : label === 'en' ? 'Required Scenes' : '必須シーン'}
            </h4>
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <ul className="space-y-1.5">
                {sc.map((s, idx) => (
                  <li key={idx} className="text-sm text-gray-800 flex gap-2">
                    <span className="text-green-600 font-semibold">{idx + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {ca && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
              <span>⚠️</span> {label === 'ko' ? '주의사항' : label === 'en' ? 'Cautions' : '注意事項'}
            </h4>
            <div className="bg-white rounded-lg p-3 border border-red-100">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{ca}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white sm:rounded-lg w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <h2 className="text-base sm:text-xl font-bold text-gray-900">🎯 4주 챌린지 촬영 가이드</h2>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language toggle for US/Japan */}
            {(isUS || isJapan) && hasTranslation && !isEditing && (
              <div className="flex items-center bg-white border rounded-lg overflow-hidden text-xs">
                <button
                  onClick={() => setViewLanguage('ko')}
                  className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${
                    viewLanguage === 'ko' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🇰🇷 한국어
                </button>
                <button
                  onClick={() => setViewLanguage(isJapan ? 'ja' : 'en')}
                  className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${
                    viewLanguage !== 'ko' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isJapan ? '🇯🇵 日本語' : '🇺🇸 English'}
                </button>
                <button
                  onClick={() => setViewLanguage('both')}
                  className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${
                    viewLanguage === 'both' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Languages className="w-3 h-3" /> Both
                </button>
              </div>
            )}
            {!isEditing && (
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

        {/* 주차 탭 */}
        <div className="flex gap-1 sm:gap-2 px-3 sm:px-6 pt-3 sm:pt-4 border-b bg-white overflow-x-auto">
          {[
            { key: 'week1', label: '1주차', labelEn: 'Week 1', labelJa: '1週目' },
            { key: 'week2', label: '2주차', labelEn: 'Week 2', labelJa: '2週目' },
            { key: 'week3', label: '3주차', labelEn: 'Week 3', labelJa: '3週目' },
            { key: 'week4', label: '4주차', labelEn: 'Week 4', labelJa: '4週目' }
          ].map((week) => {
            // Check if this week has content
            const wd = weeklyGuides[week.key]
            const extGuide = getExternalGuide(week.key)
            const weekHasContent = extGuide || (wd && (
              wd.mission || wd.guide_text ||
              (wd.required_dialogues && wd.required_dialogues.length > 0) ||
              (wd.required_scenes && wd.required_scenes.length > 0) ||
              wd.product_info || wd.cautions
            ))
            return (
              <button
                key={week.key}
                onClick={() => {
                  if (isEditing) {
                    if (confirm('수정 중인 내용이 있습니다. 주차를 변경하시겠습니까?')) {
                      handleCancel()
                      setActiveWeek(week.key)
                    }
                  } else {
                    setActiveWeek(week.key)
                  }
                }}
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  activeWeek === week.key
                    ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {isJapan ? week.labelJa : isUS ? week.labelEn : week.label}
                {weekHasContent ? (
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                )}
              </button>
            )
          })}
        </div>

        {/* 가이드 내용 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* 마감일 표시 */}
          {currentDeadline && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2">
                <span className="text-yellow-700 font-semibold">📅 {isUS ? 'Deadline:' : isJapan ? '締切日:' : '마감일:'}</span>
                <span className="text-yellow-900 font-bold">
                  {new Date(currentDeadline).toLocaleDateString(isJapan ? 'ja-JP' : isUS ? 'en-US' : 'ko-KR', {
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
                      {isUS ? 'File:' : isJapan ? 'ファイル:' : '파일명:'} {currentExternalGuide.fileName}
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
                    {currentExternalGuide.type === 'pdf'
                      ? (isUS ? 'Open PDF' : isJapan ? 'PDFを開く' : 'PDF 열기')
                      : (isUS ? 'Open Guide' : isJapan ? 'ガイドを開く' : '가이드 열기')}
                  </a>
                </div>
              </div>
            </div>
          ) : hasContent ? (
            <div className="space-y-6">
              {/* Simple text format */}
              {isSimpleFormat ? (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <h4 className="text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <span>📝</span>
                    {activeWeek.replace('week', '')}주차 가이드
                  </h4>
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    {isEditing ? (
                      <textarea
                        value={guideText}
                        onChange={(e) => setEditedData({ ...editedData, guide_text: e.target.value })}
                        className="w-full p-2 border rounded text-sm min-h-[200px]"
                        placeholder="가이드 내용을 입력하세요"
                      />
                    ) : (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {guideText}
                      </p>
                    )}
                  </div>
                </div>
              ) : isEditing ? (
                /* Object format - 수정 모드 */
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-purple-900 mb-2">📦 제품 정보</h4>
                    <textarea
                      value={editedData?.product_info || productInfo || ''}
                      onChange={(e) => setEditedData({ ...editedData, product_info: e.target.value })}
                      className="w-full p-2 border rounded text-sm min-h-[80px]"
                      placeholder="제품 정보를 입력하세요"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">🎯 {activeWeek.replace('week', '')}주차 미션</h4>
                    <textarea
                      value={editedData?.mission || mission || ''}
                      onChange={(e) => setEditedData({ ...editedData, mission: e.target.value })}
                      className="w-full p-2 border rounded text-sm min-h-[80px]"
                      placeholder="미션을 입력하세요"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">💬 필수 대사</h4>
                    <textarea
                      value={(editedData?.required_dialogues || requiredDialogues || []).join('\n')}
                      onChange={(e) => setEditedData({ ...editedData, required_dialogues: e.target.value.split('\n').filter(d => d.trim()) })}
                      className="w-full p-2 border rounded text-sm min-h-[80px]"
                      placeholder="한 줄에 하나씩 입력하세요"
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-green-900 mb-2">🎬 필수 장면</h4>
                    <textarea
                      value={(editedData?.required_scenes || requiredScenes || []).join('\n')}
                      onChange={(e) => setEditedData({ ...editedData, required_scenes: e.target.value.split('\n').filter(s => s.trim()) })}
                      className="w-full p-2 border rounded text-sm min-h-[80px]"
                      placeholder="한 줄에 하나씩 입력하세요"
                    />
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-red-900 mb-2">⚠️ 주의사항</h4>
                    <textarea
                      value={editedData?.cautions || cautions || ''}
                      onChange={(e) => setEditedData({ ...editedData, cautions: e.target.value })}
                      className="w-full p-2 border rounded text-sm min-h-[60px]"
                      placeholder="주의사항을 입력하세요"
                    />
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2">📌 필수 해시태그</h4>
                    <input
                      type="text"
                      value={(editedData?.hashtags || hashtags || []).join(', ')}
                      onChange={(e) => setEditedData({ ...editedData, hashtags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="쉼표로 구분해서 입력 (예: #태그1, #태그2)"
                    />
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-orange-900 mb-2">🔗 참고 영상 URL</h4>
                    <textarea
                      value={(editedData?.reference_urls || referenceUrls || []).join('\n')}
                      onChange={(e) => setEditedData({ ...editedData, reference_urls: e.target.value.split('\n').filter(u => u.trim()) })}
                      className="w-full p-2 border rounded text-sm min-h-[60px]"
                      placeholder="한 줄에 하나씩 URL을 입력하세요"
                    />
                  </div>
                </div>
              ) : (
                /* Object format - View mode with language toggle */
                <>
                  {/* Bilingual: Both side by side */}
                  {viewLanguage === 'both' && hasTranslation ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-3 px-2">
                          <span className="text-lg">🇰🇷</span>
                          <span className="text-sm font-bold text-gray-700">한국어</span>
                        </div>
                        {renderGuideContent(currentWeekData, 'ko')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3 px-2">
                          <span className="text-lg">{isJapan ? '🇯🇵' : '🇺🇸'}</span>
                          <span className="text-sm font-bold text-gray-700">{langLabel}</span>
                        </div>
                        {renderGuideContent(translatedWeekData, isJapan ? 'ja' : 'en')}
                      </div>
                    </div>
                  ) : viewLanguage !== 'ko' && hasTranslation ? (
                    /* Translated language only */
                    renderGuideContent(translatedWeekData, isJapan ? 'ja' : 'en')
                  ) : (
                    /* Korean / default view */
                    <>
                      {/* 미션 미작성 안내 + 수정 버튼 */}
                      {!mission && !isEditing && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex-1">
                            <p className="font-bold text-amber-900 text-sm">
                              {isUS ? `Week ${activeWeek.replace('week', '')} mission not written` : isJapan ? `${activeWeek.replace('week', '')}週目のミッション未作成` : `${activeWeek.replace('week', '')}주차 미션이 작성되지 않았습니다`}
                            </p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              {isUS ? 'Click edit to add mission, required lines, and scenes.' : isJapan ? '編集をクリックしてミッション等を追加してください。' : '수정하기를 눌러 미션, 필수 대사, 필수 장면을 추가하세요.'}
                            </p>
                          </div>
                          <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm whitespace-nowrap"
                          >
                            <Edit className="w-4 h-4" />
                            {isUS ? 'Edit' : isJapan ? '編集' : '수정하기'}
                          </button>
                        </div>
                      )}

                      {productInfo && (
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                          <h4 className="text-base font-bold text-purple-900 mb-3 flex items-center gap-2">
                            <span>📦</span>
                            제품 정보
                          </h4>
                          <div className="bg-white rounded-lg p-4 border border-purple-100">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{productInfo}</p>
                          </div>
                        </div>
                      )}

                      {mission && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                          <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <span>🎯</span>
                            {activeWeek.replace('week', '')}주차 미션
                          </h4>
                          <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{mission}</p>
                          </div>
                        </div>
                      )}

                      {requiredDialogues.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                          <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <span>💬</span>
                            필수 대사
                          </h4>
                          <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <ul className="space-y-2">
                              {requiredDialogues.map((dialogue, idx) => (
                                <li key={idx} className="text-sm text-gray-800 flex gap-2">
                                  <span className="text-blue-600 font-semibold">{idx + 1}.</span>
                                  <span>{dialogue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {requiredScenes.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <h4 className="text-base font-bold text-green-900 mb-3 flex items-center gap-2">
                            <span>🎬</span>
                            필수 장면
                          </h4>
                          <div className="bg-white rounded-lg p-4 border border-green-100">
                            <ul className="space-y-2">
                              {requiredScenes.map((scene, idx) => (
                                <li key={idx} className="text-sm text-gray-800 flex gap-2">
                                  <span className="text-green-600 font-semibold">{idx + 1}.</span>
                                  <span>{scene}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {cautions && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                          <h4 className="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
                            <span>⚠️</span>
                            주의사항
                          </h4>
                          <div className="bg-white rounded-lg p-4 border border-red-100">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{cautions}</p>
                          </div>
                        </div>
                      )}

                      {hashtags.length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                          <h4 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
                            <span>📌</span>
                            필수 해시태그
                          </h4>
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
                        </div>
                      )}

                      {referenceUrls.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                          <h4 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
                            <span>🔗</span>
                            참고 영상
                          </h4>
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
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-10 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                <PenLine className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-gray-600 font-medium text-base">
                {isUS
                  ? `Week ${activeWeek.replace('week', '')} guide has not been written yet.`
                  : isJapan
                  ? `${activeWeek.replace('week', '')}週目のガイドがまだ作成されていません。`
                  : `${activeWeek.replace('week', '')}주차 가이드가 아직 작성되지 않았습니다.`}
              </p>
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  onClick={() => {
                    handleEdit()
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  <Edit className="w-4 h-4" />
                  {isUS ? 'Write Here' : isJapan ? 'ここで作成' : '여기서 직접 작성'}
                </button>
                <button
                  onClick={() => {
                    const guidePath = isJapan
                      ? `/company/campaigns/guide/4week/japan?id=${campaign.id}`
                      : isUS
                      ? `/company/campaigns/guide/4week/us?id=${campaign.id}`
                      : `/company/campaigns/guide/4week?id=${campaign.id}`
                    onClose()
                    navigate(guidePath)
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {isUS ? 'Go to Guide Page' : isJapan ? 'ガイドページへ' : '가이드 작성 페이지로 이동'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 하단: 미작성 주차 바로가기 + 닫기 */}
        <div className="px-4 py-3 border-t bg-gray-50 space-y-2">
          {/* 미작성 주차 가이드 작성 바로가기 */}
          {(() => {
            const emptyWeeks = ['week1','week2','week3','week4'].filter(wk => {
              const wd = weeklyGuides[wk]
              const ext = getExternalGuide(wk)
              return !ext && !(wd && (wd.mission || wd.guide_text || (wd.required_dialogues && wd.required_dialogues.length > 0)))
            })
            if (emptyWeeks.length === 0) return null
            return (
              <div className="flex flex-wrap gap-1.5">
                {emptyWeeks.map(wk => {
                  const weekNum = wk.replace('week', '')
                  return (
                    <button
                      key={wk}
                      onClick={() => {
                        const guidePath = isJapan
                          ? `/company/campaigns/guide/4week/japan?id=${campaign.id}`
                          : isUS
                          ? `/company/campaigns/guide/4week/us?id=${campaign.id}`
                          : `/company/campaigns/guide/4week?id=${campaign.id}`
                        onClose()
                        navigate(guidePath)
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium"
                    >
                      <PenLine className="w-3 h-3" />
                      {isUS ? `Write Week ${weekNum}` : isJapan ? `${weekNum}週目を作成` : `${weekNum}주차 작성하기`}
                    </button>
                  )
                })}
              </div>
            )
          })()}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
          >
            {isUS ? 'Close' : isJapan ? '閉じる' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  )
}
