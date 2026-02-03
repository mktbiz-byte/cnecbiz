import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Lightbulb, X, Package, FileText, Info, Calendar, Sparkles, Link as LinkIcon, CheckCircle, XCircle, AlertTriangle, Globe, Languages } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import { missionExamples } from './missionExamples'
import ExternalGuideUploader from '../common/ExternalGuideUploader'

export default function CampaignGuide4WeekChallengeUS() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const supabase = getSupabaseClient('us')
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelWeek, setCancelWeek] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [expandedWeek, setExpandedWeek] = useState(1)
  const [showExamplesModal, setShowExamplesModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('skinTrouble')
  const [currentWeekForExample, setCurrentWeekForExample] = useState(1)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatingWeek, setTranslatingWeek] = useState(null)

  // 주차별 가이드 전달 완료 상태
  const [weekGuideDelivered, setWeekGuideDelivered] = useState({
    week1: false, week2: false, week3: false, week4: false
  })

  // 한국어 가이드 데이터
  const [guideData, setGuideData] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    precautions: '',
    week1: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week2: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week3: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week4: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' }
  })

  // 영어 번역 데이터
  const [guideDataEn, setGuideDataEn] = useState({
    brand: '',
    product_name: '',
    product_features: '',
    precautions: '',
    week1: { mission: '', required_dialogue: '', required_scenes: '' },
    week2: { mission: '', required_dialogue: '', required_scenes: '' },
    week3: { mission: '', required_dialogue: '', required_scenes: '' },
    week4: { mission: '', required_dialogue: '', required_scenes: '' }
  })

  // 주차별 가이드 전달 모드 ('ai' | 'external')
  const [weekGuideModes, setWeekGuideModes] = useState({
    week1: 'ai', week2: 'ai', week3: 'ai', week4: 'ai'
  })

  // 주차별 외부 가이드 데이터
  const [weekExternalGuides, setWeekExternalGuides] = useState({
    week1: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    week2: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    week3: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    week4: { type: null, url: null, fileUrl: null, fileName: null, title: '' }
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)

      // 기존 데이터가 있으면 로드
      if (data.challenge_guide_data) {
        setGuideData(data.challenge_guide_data)
      } else if (data.challenge_base_guide || data.challenge_weekly_guides) {
        const oldWeeklyGuides = data.challenge_weekly_guides || {}
        setGuideData({
          brand: data.brand || '',
          product_name: data.product_name || '',
          product_features: data.product_features || '',
          precautions: data.product_key_points || '',
          week1: {
            mission: oldWeeklyGuides.week1?.mission || '',
            required_dialogue: oldWeeklyGuides.week1?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week1?.required_scenes || '',
            reference_url: oldWeeklyGuides.week1?.reference || ''
          },
          week2: {
            mission: oldWeeklyGuides.week2?.mission || '',
            required_dialogue: oldWeeklyGuides.week2?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week2?.required_scenes || '',
            reference_url: oldWeeklyGuides.week2?.reference || ''
          },
          week3: {
            mission: oldWeeklyGuides.week3?.mission || '',
            required_dialogue: oldWeeklyGuides.week3?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week3?.required_scenes || '',
            reference_url: oldWeeklyGuides.week3?.reference || ''
          },
          week4: {
            mission: oldWeeklyGuides.week4?.mission || '',
            required_dialogue: oldWeeklyGuides.week4?.required_dialogue || '',
            required_scenes: oldWeeklyGuides.week4?.required_scenes || '',
            reference_url: oldWeeklyGuides.week4?.reference || ''
          }
        })
      } else {
        setGuideData(prev => ({
          ...prev,
          brand: data.brand || '',
          product_name: data.product_name || ''
        }))
      }

      // 영어 번역 데이터 로드
      if (data.challenge_guide_data_en) {
        setGuideDataEn(data.challenge_guide_data_en)
      }

      // 주차별 가이드 모드 및 외부 가이드 데이터 로드
      setWeekGuideModes({
        week1: data.week1_guide_mode || 'ai',
        week2: data.week2_guide_mode || 'ai',
        week3: data.week3_guide_mode || 'ai',
        week4: data.week4_guide_mode || 'ai'
      })

      setWeekExternalGuides({
        week1: {
          type: data.week1_external_type || null,
          url: data.week1_external_url || null,
          fileUrl: data.week1_external_file_url || null,
          fileName: data.week1_external_file_name || null,
          title: data.week1_external_title || ''
        },
        week2: {
          type: data.week2_external_type || null,
          url: data.week2_external_url || null,
          fileUrl: data.week2_external_file_url || null,
          fileName: data.week2_external_file_name || null,
          title: data.week2_external_title || ''
        },
        week3: {
          type: data.week3_external_type || null,
          url: data.week3_external_url || null,
          fileUrl: data.week3_external_file_url || null,
          fileName: data.week3_external_file_name || null,
          title: data.week3_external_title || ''
        },
        week4: {
          type: data.week4_external_type || null,
          url: data.week4_external_url || null,
          fileUrl: data.week4_external_file_url || null,
          fileName: data.week4_external_file_name || null,
          title: data.week4_external_title || ''
        }
      })

      // 주차별 가이드 전달 완료 상태 확인
      const weeklyAiGuides = data.challenge_weekly_guides_ai || {}
      setWeekGuideDelivered({
        week1: !!(weeklyAiGuides.week1 || data.week1_external_url || data.week1_external_file_url),
        week2: !!(weeklyAiGuides.week2 || data.week2_external_url || data.week2_external_file_url),
        week3: !!(weeklyAiGuides.week3 || data.week3_external_url || data.week3_external_file_url),
        week4: !!(weeklyAiGuides.week4 || data.week4_external_url || data.week4_external_file_url)
      })
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  // 주차별 영어 번역 함수
  const handleTranslateWeek = async (weekNum) => {
    setIsTranslating(true)
    setTranslatingWeek(weekNum)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다.')
      }

      const weekKey = `week${weekNum}`
      const weekData = guideData[weekKey]

      // 번역할 내용 준비
      const textToTranslate = `[브랜드명]
${guideData.brand}

[제품명]
${guideData.product_name}

[제품특징]
${guideData.product_features}

[주의사항]
${guideData.precautions}

[${weekNum}주차 미션]
${weekData.mission}

[${weekNum}주차 필수대사]
${weekData.required_dialogue}

[${weekNum}주차 필수장면]
${weekData.required_scenes}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `다음 한국어 캠페인 가이드 정보를 영어(미국)로 자연스럽게 번역해주세요.
중요: 각 필드의 한국어 라벨([브랜드명], [제품명], [제품특징], [주의사항], [${weekNum}주차 미션], [${weekNum}주차 필수대사], [${weekNum}주차 필수장면])은 반드시 그대로 유지하고, 라벨 다음의 내용만 영어로 번역하세요.
번역 결과만 출력하세요:

${textToTranslate}`
              }]
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const translatedText = data.candidates[0]?.content?.parts[0]?.text || ''

      // 번역 결과 파싱
      const cleanText = translatedText.replace(/\*\*/g, '')

      const brandMatch = cleanText.match(/\[브랜드명\]\s*([\s\S]*?)(?=\n\[|$)/)
      const productMatch = cleanText.match(/\[제품명\]\s*([\s\S]*?)(?=\n\[|$)/)
      const featuresMatch = cleanText.match(/\[제품특징\]\s*([\s\S]*?)(?=\n\[|$)/)
      const precautionsMatch = cleanText.match(/\[주의사항\]\s*([\s\S]*?)(?=\n\[|$)/)
      const missionMatch = cleanText.match(new RegExp(`\\[${weekNum}주차 미션\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
      const dialogueMatch = cleanText.match(new RegExp(`\\[${weekNum}주차 필수대사\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
      const scenesMatch = cleanText.match(new RegExp(`\\[${weekNum}주차 필수장면\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))

      setGuideDataEn(prev => ({
        ...prev,
        brand: brandMatch ? brandMatch[1].trim() : prev.brand,
        product_name: productMatch ? productMatch[1].trim() : prev.product_name,
        product_features: featuresMatch ? featuresMatch[1].trim() : prev.product_features,
        precautions: precautionsMatch ? precautionsMatch[1].trim() : prev.precautions,
        [weekKey]: {
          ...prev[weekKey],
          mission: missionMatch ? missionMatch[1].trim() : '',
          required_dialogue: dialogueMatch ? dialogueMatch[1].trim() : '',
          required_scenes: scenesMatch ? scenesMatch[1].trim() : ''
        }
      }))

      alert(`${weekNum}주차 영어 번역이 완료되었습니다!`)
    } catch (error) {
      console.error('번역 오류:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsTranslating(false)
      setTranslatingWeek(null)
    }
  }

  // 전체 번역 함수
  const handleTranslateAll = async () => {
    setIsTranslating(true)
    setTranslatingWeek('all')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다.')
      }

      // 전체 번역할 내용 준비
      let textToTranslate = `[브랜드명]
${guideData.brand}

[제품명]
${guideData.product_name}

[제품특징]
${guideData.product_features}

[주의사항]
${guideData.precautions}
`

      for (let weekNum = 1; weekNum <= 4; weekNum++) {
        const weekKey = `week${weekNum}`
        const weekData = guideData[weekKey]
        if (weekData.mission || weekData.required_dialogue || weekData.required_scenes) {
          textToTranslate += `
[${weekNum}주차 미션]
${weekData.mission}

[${weekNum}주차 필수대사]
${weekData.required_dialogue}

[${weekNum}주차 필수장면]
${weekData.required_scenes}
`
        }
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `다음 한국어 캠페인 가이드 정보를 영어(미국)로 자연스럽게 번역해주세요.
중요: 모든 한국어 라벨([브랜드명], [제품명] 등)은 반드시 그대로 유지하고, 라벨 다음의 내용만 영어로 번역하세요.
번역 결과만 출력하세요:

${textToTranslate}`
              }]
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const translatedText = data.candidates[0]?.content?.parts[0]?.text || ''
      const cleanText = translatedText.replace(/\*\*/g, '')

      // 파싱
      const brandMatch = cleanText.match(/\[브랜드명\]\s*([\s\S]*?)(?=\n\[|$)/)
      const productMatch = cleanText.match(/\[제품명\]\s*([\s\S]*?)(?=\n\[|$)/)
      const featuresMatch = cleanText.match(/\[제품특징\]\s*([\s\S]*?)(?=\n\[|$)/)
      const precautionsMatch = cleanText.match(/\[주의사항\]\s*([\s\S]*?)(?=\n\[|$)/)

      const newGuideDataEn = {
        brand: brandMatch ? brandMatch[1].trim() : '',
        product_name: productMatch ? productMatch[1].trim() : '',
        product_features: featuresMatch ? featuresMatch[1].trim() : '',
        precautions: precautionsMatch ? precautionsMatch[1].trim() : '',
        week1: { mission: '', required_dialogue: '', required_scenes: '' },
        week2: { mission: '', required_dialogue: '', required_scenes: '' },
        week3: { mission: '', required_dialogue: '', required_scenes: '' },
        week4: { mission: '', required_dialogue: '', required_scenes: '' }
      }

      for (let weekNum = 1; weekNum <= 4; weekNum++) {
        const weekKey = `week${weekNum}`
        const missionMatch = cleanText.match(new RegExp(`\\[${weekNum}주차 미션\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        const dialogueMatch = cleanText.match(new RegExp(`\\[${weekNum}주차 필수대사\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        const scenesMatch = cleanText.match(new RegExp(`\\[${weekNum}주차 필수장면\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))

        newGuideDataEn[weekKey] = {
          mission: missionMatch ? missionMatch[1].trim() : '',
          required_dialogue: dialogueMatch ? dialogueMatch[1].trim() : '',
          required_scenes: scenesMatch ? scenesMatch[1].trim() : ''
        }
      }

      setGuideDataEn(newGuideDataEn)
      alert('전체 영어 번역이 완료되었습니다!')
    } catch (error) {
      console.error('번역 오류:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsTranslating(false)
      setTranslatingWeek(null)
    }
  }

  const handleCancelWeekGuide = async (weekNum) => {
    setCancelling(true)

    try {
      const weekKey = `week${weekNum}`
      const currentAiGuides = campaign.challenge_weekly_guides_ai || {}
      const updatedAiGuides = { ...currentAiGuides }
      delete updatedAiGuides[weekKey]

      const updateData = {
        challenge_weekly_guides_ai: Object.keys(updatedAiGuides).length > 0 ? updatedAiGuides : null,
        [`${weekKey}_guide_mode`]: null,
        [`${weekKey}_external_type`]: null,
        [`${weekKey}_external_url`]: null,
        [`${weekKey}_external_file_url`]: null,
        [`${weekKey}_external_file_name`]: null,
        [`${weekKey}_external_title`]: null
      }

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setWeekGuideDelivered(prev => ({ ...prev, [weekKey]: false }))
      setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'ai' }))
      setWeekExternalGuides(prev => ({
        ...prev,
        [weekKey]: { type: null, url: null, fileUrl: null, fileName: null, title: '' }
      }))
      setCancelWeek(null)

      alert(`${weekNum}주차 가이드가 취소되었습니다.`)
      loadCampaign()
    } catch (error) {
      console.error('Error cancelling week guide:', error)
      alert('가이드 취소 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setCancelling(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      const updateData = {
        brand: guideData.brand,
        product_name: guideData.product_name,
        product_features: guideData.product_features,
        product_key_points: guideData.precautions,
        challenge_guide_data: guideData,
        challenge_guide_data_en: guideDataEn,
        challenge_weekly_guides: {
          week1: { mission: guideData.week1.mission, required_dialogue: guideData.week1.required_dialogue, required_scenes: guideData.week1.required_scenes, reference: guideData.week1.reference_url },
          week2: { mission: guideData.week2.mission, required_dialogue: guideData.week2.required_dialogue, required_scenes: guideData.week2.required_scenes, reference: guideData.week2.reference_url },
          week3: { mission: guideData.week3.mission, required_dialogue: guideData.week3.required_dialogue, required_scenes: guideData.week3.required_scenes, reference: guideData.week3.reference_url },
          week4: { mission: guideData.week4.mission, required_dialogue: guideData.week4.required_dialogue, required_scenes: guideData.week4.required_scenes, reference: guideData.week4.reference_url }
        },
        week1_guide_mode: weekGuideModes.week1,
        week2_guide_mode: weekGuideModes.week2,
        week3_guide_mode: weekGuideModes.week3,
        week4_guide_mode: weekGuideModes.week4,
        week1_external_type: weekExternalGuides.week1.type,
        week1_external_url: weekExternalGuides.week1.url,
        week1_external_file_url: weekExternalGuides.week1.fileUrl,
        week1_external_file_name: weekExternalGuides.week1.fileName,
        week1_external_title: weekExternalGuides.week1.title,
        week2_external_type: weekExternalGuides.week2.type,
        week2_external_url: weekExternalGuides.week2.url,
        week2_external_file_url: weekExternalGuides.week2.fileUrl,
        week2_external_file_name: weekExternalGuides.week2.fileName,
        week2_external_title: weekExternalGuides.week2.title,
        week3_external_type: weekExternalGuides.week3.type,
        week3_external_url: weekExternalGuides.week3.url,
        week3_external_file_url: weekExternalGuides.week3.fileUrl,
        week3_external_file_name: weekExternalGuides.week3.fileName,
        week3_external_title: weekExternalGuides.week3.title,
        week4_external_type: weekExternalGuides.week4.type,
        week4_external_url: weekExternalGuides.week4.url,
        week4_external_file_url: weekExternalGuides.week4.fileUrl,
        week4_external_file_name: weekExternalGuides.week4.fileName,
        week4_external_title: weekExternalGuides.week4.title
      }

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      alert('저장되었습니다.')
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!guideData.brand || !guideData.product_name || !guideData.product_features || !guideData.precautions) {
      alert('제품 정보와 주의사항을 모두 입력해주세요.')
      return
    }

    if (weekGuideModes.week1 === 'ai') {
      if (!guideData.week1.mission || !guideData.week1.required_dialogue || !guideData.week1.required_scenes) {
        alert('1주차 가이드를 모두 입력해주세요.')
        return
      }
      // 영어 번역 확인
      if (!guideDataEn.week1.mission || !guideDataEn.week1.required_dialogue || !guideDataEn.week1.required_scenes) {
        alert('1주차 영어 번역을 완료해주세요.')
        return
      }
    } else {
      if (!weekExternalGuides.week1.fileUrl && !weekExternalGuides.week1.url) {
        alert('1주차 외부 가이드(PDF 또는 URL)를 등록해주세요.')
        return
      }
    }

    setLoading(true)

    try {
      // 먼저 원본 데이터 저장
      const { error: saveError } = await supabase
        .from('campaigns')
        .update({
          brand: guideData.brand,
          product_name: guideData.product_name,
          product_features: guideData.product_features,
          product_key_points: guideData.precautions,
          challenge_guide_data: guideData,
          challenge_guide_data_en: guideDataEn,
          challenge_weekly_guides: {
            week1: { mission: guideData.week1.mission, required_dialogue: guideData.week1.required_dialogue, required_scenes: guideData.week1.required_scenes, reference: guideData.week1.reference_url },
            week2: { mission: guideData.week2.mission, required_dialogue: guideData.week2.required_dialogue, required_scenes: guideData.week2.required_scenes, reference: guideData.week2.reference_url },
            week3: { mission: guideData.week3.mission, required_dialogue: guideData.week3.required_dialogue, required_scenes: guideData.week3.required_scenes, reference: guideData.week3.reference_url },
            week4: { mission: guideData.week4.mission, required_dialogue: guideData.week4.required_dialogue, required_scenes: guideData.week4.required_scenes, reference: guideData.week4.reference_url }
          },
          week1_guide_mode: weekGuideModes.week1,
          week2_guide_mode: weekGuideModes.week2,
          week3_guide_mode: weekGuideModes.week3,
          week4_guide_mode: weekGuideModes.week4,
          week1_external_type: weekExternalGuides.week1.type,
          week1_external_url: weekExternalGuides.week1.url,
          week1_external_file_url: weekExternalGuides.week1.fileUrl,
          week1_external_file_name: weekExternalGuides.week1.fileName,
          week1_external_title: weekExternalGuides.week1.title,
          week2_external_type: weekExternalGuides.week2.type,
          week2_external_url: weekExternalGuides.week2.url,
          week2_external_file_url: weekExternalGuides.week2.fileUrl,
          week2_external_file_name: weekExternalGuides.week2.fileName,
          week2_external_title: weekExternalGuides.week2.title,
          week3_external_type: weekExternalGuides.week3.type,
          week3_external_url: weekExternalGuides.week3.url,
          week3_external_file_url: weekExternalGuides.week3.fileUrl,
          week3_external_file_name: weekExternalGuides.week3.fileName,
          week3_external_title: weekExternalGuides.week3.title,
          week4_external_type: weekExternalGuides.week4.type,
          week4_external_url: weekExternalGuides.week4.url,
          week4_external_file_url: weekExternalGuides.week4.fileUrl,
          week4_external_file_name: weekExternalGuides.week4.fileName,
          week4_external_title: weekExternalGuides.week4.title
        })
        .eq('id', id)

      if (saveError) throw saveError

      // AI 모드인 주차만 수집하여 가이드 생성 (영어 포함)
      const aiWeeks = []
      for (let weekNum = 1; weekNum <= 4; weekNum++) {
        const weekKey = `week${weekNum}`
        if (weekGuideModes[weekKey] === 'ai') {
          aiWeeks.push(weekNum)
        }
      }

      let simpleGuidesAI = {}

      if (aiWeeks.length > 0) {
        // AI 모드인 주차에 대해 가이드 생성
        for (const weekNum of aiWeeks) {
          const weekKey = `week${weekNum}`
          const weekData = guideData[weekKey]
          const weekDataEn = guideDataEn[weekKey]

          const originalDialogues = weekData.required_dialogue
            ? weekData.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim())
            : []
          const originalScenes = weekData.required_scenes
            ? weekData.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim())
            : []
          const originalDialoguesEn = weekDataEn.required_dialogue
            ? weekDataEn.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim())
            : []
          const originalScenesEn = weekDataEn.required_scenes
            ? weekDataEn.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim())
            : []

          simpleGuidesAI[weekKey] = {
            // 한국어
            product_info: `${guideData.product_name}: ${weekData.mission}`,
            mission: weekData.mission || '',
            required_dialogues: originalDialogues,
            required_scenes: originalScenes,
            hashtags: [],
            cautions: guideData.precautions || '',
            reference_urls: weekData.reference_url ? [weekData.reference_url] : [],
            // 영어
            product_info_en: `${guideDataEn.product_name}: ${weekDataEn.mission}`,
            mission_en: weekDataEn.mission || '',
            required_dialogues_en: originalDialoguesEn,
            required_scenes_en: originalScenesEn,
            cautions_en: guideDataEn.precautions || ''
          }
        }

        // AI 가이드 저장
        const updateData = {
          challenge_weekly_guides_ai: JSON.stringify(simpleGuidesAI),
          guide_generated_at: new Date().toISOString()
        }

        const { error: aiUpdateError } = await supabase
          .from('campaigns')
          .update(updateData)
          .eq('id', id)

        if (aiUpdateError) throw aiUpdateError
      }

      alert('4주 챌린지 가이드가 저장되었습니다! 결제를 진행하세요.')
      navigate(`/company/campaigns/payment?id=${id}&region=us`)
    } catch (error) {
      console.error('Error completing guide:', error)
      alert('가이드 완성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateGuideData = (field, value) => {
    setGuideData(prev => ({ ...prev, [field]: value }))
  }

  const updateWeekData = (week, field, value) => {
    setGuideData(prev => ({
      ...prev,
      [week]: { ...prev[week], [field]: value }
    }))
  }

  const updateGuideDataEn = (field, value) => {
    setGuideDataEn(prev => ({ ...prev, [field]: value }))
  }

  const updateWeekDataEn = (week, field, value) => {
    setGuideDataEn(prev => ({
      ...prev,
      [week]: { ...prev[week], [field]: value }
    }))
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <>
      <CompanyNavigation />

      {/* 주차별 가이드 취소 확인 모달 */}
      {cancelWeek && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{cancelWeek}주차 가이드 취소</h3>
                <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">주의사항:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>{cancelWeek}주차 가이드 데이터가 삭제됩니다</li>
                <li>이미 크리에이터에게 전달된 경우 혼란이 발생할 수 있습니다</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCancelWeek(null)} disabled={cancelling} className="flex-1">
                닫기
              </Button>
              <Button onClick={() => handleCancelWeekGuide(cancelWeek)} disabled={cancelling} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {cancelling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />취소 중...</> : <><XCircle className="w-4 h-4 mr-2" />가이드 취소</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              4-Week Challenge Campaign Guide (US)
            </h1>
            <p className="text-gray-700 text-base">
              Campaign: <span className="font-semibold text-blue-700">{campaign.title}</span>
            </p>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-5 mb-6 flex items-start gap-3">
          <Info className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-900">
            <p className="font-bold text-base mb-2">US 4-Week Challenge Guide Instructions</p>
            <p className="leading-relaxed">Enter content in Korean on the left, then click "Translate to English" to see the English translation on the right.</p>
            <p className="mt-2 font-semibold text-green-700">Admins can see both Korean and English. Only English will be sent to creators.</p>
          </div>
        </div>

        {/* 전체 번역 버튼 */}
        <div className="mb-6 flex justify-end">
          <Button
            onClick={handleTranslateAll}
            disabled={isTranslating}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
          >
            {isTranslating && translatingWeek === 'all' ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Translating all...</>
            ) : (
              <><Languages className="w-4 h-4 mr-2" />Translate All to English</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 한국어 입력 */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
                <Globe className="w-6 h-6" />
                한국어 입력 (Korean Input)
              </h2>

              {/* 제품 기본 정보 */}
              <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-lg border border-blue-100 p-4 mb-4">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  제품 기본 정보
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 text-sm font-semibold">
                      브랜드명 <span className="text-red-500">*</span>
                    </label>
                    <Input value={guideData.brand} onChange={(e) => updateGuideData('brand', e.target.value)} placeholder="예: SNP" />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-semibold">
                      제품명 <span className="text-red-500">*</span>
                    </label>
                    <Input value={guideData.product_name} onChange={(e) => updateGuideData('product_name', e.target.value)} placeholder="예: 콜라겐 마스크팩" />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-semibold">
                      제품 특징 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={guideData.product_features}
                      onChange={(e) => updateGuideData('product_features', e.target.value)}
                      placeholder="제품의 주요 성분, 효능, 특징"
                      className="w-full h-24 p-2 border rounded-lg resize-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-semibold">
                      주의사항 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={guideData.precautions}
                      onChange={(e) => updateGuideData('precautions', e.target.value)}
                      placeholder="크리에이터가 반드시 지켜야 할 주의사항"
                      className="w-full h-24 p-2 border rounded-lg resize-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 주차별 가이드 */}
              {['week1', 'week2', 'week3', 'week4'].map((weekKey) => {
                const weekNum = parseInt(weekKey.replace('week', ''))
                const weekData = guideData[weekKey]
                const isExpanded = expandedWeek === weekNum

                return (
                  <div key={weekKey} className="bg-white rounded-lg border border-blue-200 p-4 mb-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedWeek(isExpanded ? null : weekNum)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                          Week {weekNum}
                        </span>
                        <h3 className="text-base font-semibold">{weekNum}주차 미션</h3>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        {weekGuideDelivered[weekKey] ? (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-amber-800 text-sm">{weekNum}주차 가이드 등록됨</p>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); setCancelWeek(weekNum); }}
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 border-amber-400 text-amber-700 hover:bg-amber-100 text-xs"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />Cancel and recreate
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* 가이드 모드 선택 */}
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs font-medium text-blue-900 mb-2">Week {weekNum} Guide Type</p>
                              <div className="flex gap-3">
                                <label className="flex items-center gap-1 cursor-pointer text-xs">
                                  <input
                                    type="radio"
                                    name={`guide-mode-${weekKey}`}
                                    checked={weekGuideModes[weekKey] === 'ai'}
                                    onChange={() => setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'ai' }))}
                                    className="w-3 h-3"
                                  />
                                  <Sparkles className="w-3 h-3 text-blue-600" />AI Guide
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer text-xs">
                                  <input
                                    type="radio"
                                    name={`guide-mode-${weekKey}`}
                                    checked={weekGuideModes[weekKey] === 'external'}
                                    onChange={() => setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'external' }))}
                                    className="w-3 h-3"
                                  />
                                  <LinkIcon className="w-3 h-3 text-blue-600" />PDF/URL
                                </label>
                              </div>
                            </div>

                            {weekGuideModes[weekKey] === 'external' ? (
                              <ExternalGuideUploader
                                value={weekExternalGuides[weekKey]}
                                onChange={(data) => setWeekExternalGuides(prev => ({ ...prev, [weekKey]: data }))}
                                campaignId={id}
                                prefix={`${weekKey}_`}
                                supabaseClient={supabaseBiz}
                              />
                            ) : (
                              <>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-sm font-semibold">{weekNum}주차 미션 <span className="text-red-500">*</span></label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => { setCurrentWeekForExample(weekNum); setShowExamplesModal(true); }}
                                      className="text-xs h-7"
                                    >
                                      <Lightbulb className="w-3 h-3 mr-1" />Examples
                                    </Button>
                                  </div>
                                  <textarea
                                    value={weekData.mission}
                                    onChange={(e) => updateWeekData(weekKey, 'mission', e.target.value)}
                                    placeholder="이번 주차의 핵심 미션"
                                    className="w-full h-20 p-2 border rounded-lg resize-none text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="block mb-1 text-sm font-semibold">필수 대사 <span className="text-red-500">*</span></label>
                                  <textarea
                                    value={weekData.required_dialogue}
                                    onChange={(e) => updateWeekData(weekKey, 'required_dialogue', e.target.value)}
                                    placeholder="영상에 반드시 포함되어야 할 대사"
                                    className="w-full h-24 p-2 border rounded-lg resize-none text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="block mb-1 text-sm font-semibold">필수 장면 <span className="text-red-500">*</span></label>
                                  <textarea
                                    value={weekData.required_scenes}
                                    onChange={(e) => updateWeekData(weekKey, 'required_scenes', e.target.value)}
                                    placeholder="영상에 반드시 포함되어야 할 촬영 장면"
                                    className="w-full h-24 p-2 border rounded-lg resize-none text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="block mb-1 text-sm font-semibold">레퍼런스 영상 URL</label>
                                  <Input
                                    value={weekData.reference_url}
                                    onChange={(e) => updateWeekData(weekKey, 'reference_url', e.target.value)}
                                    placeholder="https://..."
                                    className="text-sm"
                                  />
                                </div>

                                {/* 주차별 번역 버튼 */}
                                <Button
                                  onClick={() => handleTranslateWeek(weekNum)}
                                  disabled={isTranslating}
                                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                                >
                                  {isTranslating && translatingWeek === weekNum ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Translating Week {weekNum}...</>
                                  ) : (
                                    <><Languages className="w-4 h-4 mr-2" />Translate Week {weekNum} to English</>
                                  )}
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 오른쪽: 영어 미리보기 */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-green-200 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-800">
                <Globe className="w-6 h-6" />
                English Preview
              </h2>

              {/* 제품 기본 정보 영어 */}
              <div className="bg-gradient-to-br from-green-50/50 to-white rounded-lg border border-green-100 p-4 mb-4">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Product Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 text-sm font-semibold text-green-700">Brand Name</label>
                    <Input
                      value={guideDataEn.brand}
                      onChange={(e) => updateGuideDataEn('brand', e.target.value)}
                      placeholder="Brand name translation"
                      className="border-green-200 focus:border-green-400"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-semibold text-green-700">Product Name</label>
                    <Input
                      value={guideDataEn.product_name}
                      onChange={(e) => updateGuideDataEn('product_name', e.target.value)}
                      placeholder="Product name translation"
                      className="border-green-200 focus:border-green-400"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-semibold text-green-700">Product Features</label>
                    <textarea
                      value={guideDataEn.product_features}
                      onChange={(e) => updateGuideDataEn('product_features', e.target.value)}
                      placeholder="Product features translation"
                      className="w-full h-24 p-2 border border-green-200 rounded-lg resize-none text-sm focus:border-green-400"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-semibold text-green-700">Cautions</label>
                    <textarea
                      value={guideDataEn.precautions}
                      onChange={(e) => updateGuideDataEn('precautions', e.target.value)}
                      placeholder="Cautions translation"
                      className="w-full h-24 p-2 border border-green-200 rounded-lg resize-none text-sm focus:border-green-400"
                    />
                  </div>
                </div>
              </div>

              {/* 주차별 가이드 영어 */}
              {['week1', 'week2', 'week3', 'week4'].map((weekKey) => {
                const weekNum = parseInt(weekKey.replace('week', ''))
                const weekDataEn = guideDataEn[weekKey]
                const isExpanded = expandedWeek === weekNum

                return (
                  <div key={weekKey} className="bg-white rounded-lg border border-green-200 p-4 mb-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedWeek(isExpanded ? null : weekNum)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                          Week {weekNum}
                        </span>
                        <h3 className="text-base font-semibold">Week {weekNum} Mission</h3>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>

                    {isExpanded && weekGuideModes[weekKey] === 'ai' && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block mb-1 text-sm font-semibold text-green-700">Week {weekNum} Mission</label>
                          <textarea
                            value={weekDataEn.mission}
                            onChange={(e) => updateWeekDataEn(weekKey, 'mission', e.target.value)}
                            placeholder="Mission translation"
                            className="w-full h-20 p-2 border border-green-200 rounded-lg resize-none text-sm focus:border-green-400"
                          />
                        </div>

                        <div>
                          <label className="block mb-1 text-sm font-semibold text-green-700">Required Lines</label>
                          <textarea
                            value={weekDataEn.required_dialogue}
                            onChange={(e) => updateWeekDataEn(weekKey, 'required_dialogue', e.target.value)}
                            placeholder="Required lines translation"
                            className="w-full h-24 p-2 border border-green-200 rounded-lg resize-none text-sm focus:border-green-400"
                          />
                        </div>

                        <div>
                          <label className="block mb-1 text-sm font-semibold text-green-700">Required Scenes</label>
                          <textarea
                            value={weekDataEn.required_scenes}
                            onChange={(e) => updateWeekDataEn(weekKey, 'required_scenes', e.target.value)}
                            placeholder="Required scenes translation"
                            className="w-full h-24 p-2 border border-green-200 rounded-lg resize-none text-sm focus:border-green-400"
                          />
                        </div>
                      </div>
                    )}

                    {isExpanded && weekGuideModes[weekKey] === 'external' && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        Using external guide (PDF/URL). No translation needed.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-4 justify-end sticky bottom-6 bg-gradient-to-r from-white to-blue-50 p-5 rounded-lg border-2 border-blue-200 shadow-xl mt-6">
          <Button
            onClick={handleSave}
            variant="outline"
            size="lg"
            disabled={loading}
            className="h-12 text-base font-semibold border-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Draft
          </Button>
          <Button
            onClick={handleComplete}
            disabled={loading}
            size="lg"
            className="h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating guide...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Complete Guide & View Quote</>
            )}
          </Button>
        </div>
      </div>

      {/* 미션 예시 모달 */}
      {showExamplesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                Week {currentWeekForExample} Mission Examples
              </h3>
              <button onClick={() => setShowExamplesModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 p-4 border-b overflow-x-auto">
              {Object.entries(missionExamples).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === key ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-3">
                {missionExamples[selectedCategory].missions.map((mission, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const weekKey = `week${currentWeekForExample}`
                      updateWeekData(weekKey, 'mission', mission)
                      setShowExamplesModal(false)
                    }}
                    className="text-left p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-semibold text-gray-400 group-hover:text-blue-600 mt-0.5">{index + 1}</span>
                      <p className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">{mission}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600 text-center">Click an example to auto-fill the mission for that week.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
