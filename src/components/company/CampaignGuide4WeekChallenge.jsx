import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, ChevronDown, ChevronUp, Lightbulb, X, Package, Info, Calendar, Sparkles, Link as LinkIcon, CheckCircle, XCircle, AlertTriangle, Send, Save } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import { missionExamples } from './missionExamples'
import ExternalGuideUploader from '../common/ExternalGuideUploader'

export default function CampaignGuide4WeekChallenge() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const client = supabaseKorea || supabaseBiz

  const [loading, setLoading] = useState(false)
  const [savingWeek, setSavingWeek] = useState(null)
  const [generatingWeek, setGeneratingWeek] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [activeWeek, setActiveWeek] = useState(1)
  const [showExamplesModal, setShowExamplesModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('skinTrouble')
  const [showProductInfo, setShowProductInfo] = useState(true)

  // 주차별 저장 상태 (DB에 실제 가이드가 있는지)
  const [weekStatus, setWeekStatus] = useState({
    week1: 'empty', week2: 'empty', week3: 'empty', week4: 'empty'
  }) // empty | saved | delivered

  const [guideData, setGuideData] = useState({
    brand: '', product_name: '', product_features: '', precautions: '',
    week1: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week2: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week3: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week4: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' }
  })

  const [weekGuideModes, setWeekGuideModes] = useState({
    week1: 'ai', week2: 'ai', week3: 'ai', week4: 'ai'
  })

  const [weekExternalGuides, setWeekExternalGuides] = useState({
    week1: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    week2: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    week3: { type: null, url: null, fileUrl: null, fileName: null, title: '' },
    week4: { type: null, url: null, fileUrl: null, fileName: null, title: '' }
  })

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { if (id) loadCampaign() }, [id])

  const defaultWeek = { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' }

  const loadCampaign = async () => {
    try {
      const { data, error } = await client.from('campaigns').select('*').eq('id', id).single()
      if (error) throw error
      setCampaign(data)

      // 가이드 데이터 로드 (week 키 기본값 병합)
      if (data.challenge_guide_data) {
        const d = data.challenge_guide_data
        setGuideData({
          brand: d.brand || '', product_name: d.product_name || '',
          product_features: d.product_features || '', precautions: d.precautions || '',
          week1: { ...defaultWeek, ...d.week1 }, week2: { ...defaultWeek, ...d.week2 },
          week3: { ...defaultWeek, ...d.week3 }, week4: { ...defaultWeek, ...d.week4 }
        })
      } else if (data.challenge_weekly_guides) {
        const old = data.challenge_weekly_guides
        setGuideData({
          brand: data.brand || '', product_name: data.product_name || '',
          product_features: data.product_features || '', precautions: data.product_key_points || '',
          week1: { mission: old.week1?.mission || '', required_dialogue: old.week1?.required_dialogue || '', required_scenes: old.week1?.required_scenes || '', reference_url: old.week1?.reference || '' },
          week2: { mission: old.week2?.mission || '', required_dialogue: old.week2?.required_dialogue || '', required_scenes: old.week2?.required_scenes || '', reference_url: old.week2?.reference || '' },
          week3: { mission: old.week3?.mission || '', required_dialogue: old.week3?.required_dialogue || '', required_scenes: old.week3?.required_scenes || '', reference_url: old.week3?.reference || '' },
          week4: { mission: old.week4?.mission || '', required_dialogue: old.week4?.required_dialogue || '', required_scenes: old.week4?.required_scenes || '', reference_url: old.week4?.reference || '' }
        })
      } else {
        setGuideData(prev => ({ ...prev, brand: data.brand || '', product_name: data.product_name || '' }))
      }

      // 가이드 모드 로드
      setWeekGuideModes({
        week1: data.week1_guide_mode || 'ai', week2: data.week2_guide_mode || 'ai',
        week3: data.week3_guide_mode || 'ai', week4: data.week4_guide_mode || 'ai'
      })

      // 외부 가이드 로드
      const loadExt = (w) => ({
        type: data[`${w}_external_type`] || null, url: data[`${w}_external_url`] || null,
        fileUrl: data[`${w}_external_file_url`] || null, fileName: data[`${w}_external_file_name`] || null,
        title: data[`${w}_external_title`] || ''
      })
      setWeekExternalGuides({ week1: loadExt('week1'), week2: loadExt('week2'), week3: loadExt('week3'), week4: loadExt('week4') })

      // 주차별 상태 계산
      let aiGuides = {}
      try {
        const raw = data.challenge_weekly_guides_ai
        aiGuides = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
      } catch (e) {}

      const calcStatus = (w) => {
        const hasAI = aiGuides[w] && (typeof aiGuides[w] === 'object' ? aiGuides[w].mission : true)
        const hasExt = data[`${w}_external_url`] || data[`${w}_external_file_url`]
        if (hasAI || hasExt) return 'saved'
        return 'empty'
      }
      setWeekStatus({ week1: calcStatus('week1'), week2: calcStatus('week2'), week3: calcStatus('week3'), week4: calcStatus('week4') })
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  const updateGuideData = (field, value) => setGuideData(prev => ({ ...prev, [field]: value }))
  const updateWeekData = (week, field, value) => setGuideData(prev => ({
    ...prev, [week]: { ...prev[week], [field]: value }
  }))

  // === 주차별 AI 가이드 생성 ===
  const handleGenerateWeekAI = async (weekNum) => {
    const weekKey = `week${weekNum}`
    const weekData = guideData[weekKey]

    if (!guideData.brand && !guideData.product_name) {
      alert('제품 정보(브랜드명, 제품명)를 먼저 입력해주세요.')
      return
    }

    setGeneratingWeek(weekNum)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.')

      const prompt = `당신은 4주 챌린지 캠페인 전문 기획자입니다.

**제품 정보:**
- 브랜드: ${guideData.brand || '미정'}
- 제품명: ${guideData.product_name || '미정'}
- 제품 특징: ${guideData.product_features || '미정'}
- 주의사항: ${guideData.precautions || '미정'}

${weekData.mission ? `**${weekNum}주차 미션 초안 (이것을 발전시켜주세요):**\n${weekData.mission}` : `**${weekNum}주차:** 4주 챌린지의 ${weekNum}주차에 맞는 미션을 생성해주세요.
- 1주차: 첫 사용/언박싱/첫인상
- 2주차: 사용 루틴/효과 체험
- 3주차: 비포&애프터/변화 공유
- 4주차: 최종 리뷰/추천`}

${weekData.required_dialogue ? `\n**기존 필수 대사:**\n${weekData.required_dialogue}` : ''}
${weekData.required_scenes ? `\n**기존 필수 장면:**\n${weekData.required_scenes}` : ''}

다음을 생성해주세요:
1. mission: 주차 미션 설명 (2-3문장)
2. required_dialogue: 필수 대사 3-5개 (줄바꿈으로 구분, 번호 포함)
3. required_scenes: 필수 촬영 장면 3-5개 (줄바꿈으로 구분, 번호 포함)

**응답 형식 (JSON):**
{
  "mission": "미션 설명",
  "required_dialogue": "1. 대사1\\n2. 대사2\\n3. 대사3",
  "required_scenes": "1. 장면1\\n2. 장면2\\n3. 장면3"
}

JSON 형식으로만 응답해주세요.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json' }
          })
        }
      )

      if (!response.ok) throw new Error(`AI API 오류: ${response.status}`)

      const result = await response.json()
      const generated = JSON.parse(result.candidates[0].content.parts[0].text)

      setGuideData(prev => ({
        ...prev,
        [weekKey]: {
          ...prev[weekKey],
          mission: generated.mission || prev[weekKey].mission,
          required_dialogue: generated.required_dialogue || generated.required_dialogues || prev[weekKey].required_dialogue,
          required_scenes: generated.required_scenes || prev[weekKey].required_scenes
        }
      }))

      alert(`✅ ${weekNum}주차 AI 가이드가 생성되었습니다! 내용을 확인 후 수정하세요.`)
    } catch (error) {
      console.error('AI 생성 오류:', error)
      alert('AI 가이드 생성 실패: ' + error.message)
    } finally {
      setGeneratingWeek(null)
    }
  }

  // === 전체 AI 생성 (1~4주 한번에) ===
  const handleGenerateAllAI = async () => {
    if (!guideData.brand && !guideData.product_name) {
      alert('제품 정보(브랜드명, 제품명)를 먼저 입력해주세요.')
      return
    }

    setGeneratingWeek('all')
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.')

      const existingWeeks = [1,2,3,4].map(n => {
        const w = guideData[`week${n}`]
        return w.mission ? `${n}주차 미션 초안: ${w.mission}` : `${n}주차: 자동 생성`
      }).join('\n')

      const prompt = `당신은 4주 챌린지 캠페인 전문 기획자입니다.

**제품 정보:**
- 브랜드: ${guideData.brand || '미정'}
- 제품명: ${guideData.product_name || '미정'}
- 제품 특징: ${guideData.product_features || '미정'}
- 주의사항: ${guideData.precautions || '미정'}

**주차별 상태:**
${existingWeeks}

4주 챌린지 가이드를 생성해주세요. 자연스러운 4주 흐름으로:
- 1주차: 첫 사용/언박싱/첫인상
- 2주차: 사용 루틴/효과 체험
- 3주차: 비포&애프터/변화 공유
- 4주차: 최종 리뷰/추천

각 주차별로:
1. mission: 미션 설명 (2-3문장)
2. required_dialogue: 필수 대사 3-5개 (줄바꿈, 번호 포함)
3. required_scenes: 필수 촬영 장면 3-5개 (줄바꿈, 번호 포함)

**응답 형식 (JSON):**
{
  "week1": { "mission": "...", "required_dialogue": "1. ...\\n2. ...", "required_scenes": "1. ...\\n2. ..." },
  "week2": { "mission": "...", "required_dialogue": "...", "required_scenes": "..." },
  "week3": { "mission": "...", "required_dialogue": "...", "required_scenes": "..." },
  "week4": { "mission": "...", "required_dialogue": "...", "required_scenes": "..." }
}

JSON 형식으로만 응답해주세요.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096, responseMimeType: 'application/json' }
          })
        }
      )

      if (!response.ok) throw new Error(`AI API 오류: ${response.status}`)

      const result = await response.json()
      const generated = JSON.parse(result.candidates[0].content.parts[0].text)

      setGuideData(prev => {
        const updated = { ...prev }
        for (let n = 1; n <= 4; n++) {
          const wk = `week${n}`
          const g = generated[wk]
          if (g) {
            updated[wk] = {
              ...prev[wk],
              mission: g.mission || prev[wk].mission,
              required_dialogue: g.required_dialogue || g.required_dialogues || prev[wk].required_dialogue,
              required_scenes: g.required_scenes || prev[wk].required_scenes
            }
          }
        }
        return updated
      })

      alert('✅ 1~4주차 AI 가이드가 모두 생성되었습니다! 내용을 확인 후 수정하세요.')
    } catch (error) {
      console.error('전체 AI 생성 오류:', error)
      alert('AI 가이드 생성 실패: ' + error.message)
    } finally {
      setGeneratingWeek(null)
    }
  }

  // === 주차별 저장 ===
  const handleSaveWeek = async (weekNum) => {
    const weekKey = `week${weekNum}`
    const weekData = guideData[weekKey]

    if (weekGuideModes[weekKey] === 'ai' && !weekData.mission) {
      alert(`${weekNum}주차 미션을 입력해주세요.`)
      return
    }

    setSavingWeek(weekNum)
    try {
      // 제품 정보 + 해당 주차 가이드 데이터 저장
      const updateData = {
        brand: guideData.brand,
        product_name: guideData.product_name,
        product_features: guideData.product_features,
        product_key_points: guideData.precautions,
        challenge_guide_data: guideData,
        [`${weekKey}_guide_mode`]: weekGuideModes[weekKey],
        [`${weekKey}_external_type`]: weekExternalGuides[weekKey].type,
        [`${weekKey}_external_url`]: weekExternalGuides[weekKey].url,
        [`${weekKey}_external_file_url`]: weekExternalGuides[weekKey].fileUrl,
        [`${weekKey}_external_file_name`]: weekExternalGuides[weekKey].fileName,
        [`${weekKey}_external_title`]: weekExternalGuides[weekKey].title
      }

      // AI 모드면 AI 가이드 생성하여 저장
      if (weekGuideModes[weekKey] === 'ai') {
        const dialogues = weekData.required_dialogue
          ? weekData.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim()) : []
        const scenes = weekData.required_scenes
          ? weekData.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim()) : []

        // 기존 AI 가이드 병합
        let existingAI = {}
        try {
          const raw = campaign?.challenge_weekly_guides_ai
          existingAI = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
        } catch (e) {}

        existingAI[weekKey] = {
          product_info: `${guideData.product_name}: ${weekData.mission}`,
          mission: weekData.mission,
          required_dialogues: dialogues,
          required_scenes: scenes,
          hashtags: [],
          cautions: guideData.precautions || '',
          reference_urls: weekData.reference_url ? [weekData.reference_url] : []
        }

        updateData.challenge_weekly_guides_ai = JSON.stringify(existingAI)

        // 기존 weekly guides도 업데이트
        const existingWeekly = campaign?.challenge_weekly_guides || {}
        existingWeekly[weekKey] = {
          mission: weekData.mission,
          required_dialogue: weekData.required_dialogue,
          required_scenes: weekData.required_scenes,
          reference: weekData.reference_url
        }
        updateData.challenge_weekly_guides = existingWeekly
      }

      const { error } = await client.from('campaigns').update(updateData).eq('id', id)
      if (error) throw error

      setWeekStatus(prev => ({ ...prev, [weekKey]: 'saved' }))
      alert(`✅ ${weekNum}주차 가이드가 저장되었습니다!`)
      loadCampaign()
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSavingWeek(null)
    }
  }

  // === 전체 저장 + AI 가공 (가이드 완성) ===
  const handleCompleteAll = async () => {
    if (!guideData.brand || !guideData.product_name) {
      alert('제품 정보를 입력해주세요.')
      return
    }

    // 최소 1주차는 있어야 함
    if (!guideData.week1.mission && weekGuideModes.week1 === 'ai') {
      alert('최소 1주차 미션을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      // 전체 데이터 저장
      const updateData = {
        brand: guideData.brand,
        product_name: guideData.product_name,
        product_features: guideData.product_features,
        product_key_points: guideData.precautions,
        challenge_guide_data: guideData,
        challenge_weekly_guides: {
          week1: { mission: guideData.week1.mission, required_dialogue: guideData.week1.required_dialogue, required_scenes: guideData.week1.required_scenes, reference: guideData.week1.reference_url },
          week2: { mission: guideData.week2.mission, required_dialogue: guideData.week2.required_dialogue, required_scenes: guideData.week2.required_scenes, reference: guideData.week2.reference_url },
          week3: { mission: guideData.week3.mission, required_dialogue: guideData.week3.required_dialogue, required_scenes: guideData.week3.required_scenes, reference: guideData.week3.reference_url },
          week4: { mission: guideData.week4.mission, required_dialogue: guideData.week4.required_dialogue, required_scenes: guideData.week4.required_scenes, reference: guideData.week4.reference_url }
        },
        week1_guide_mode: weekGuideModes.week1, week2_guide_mode: weekGuideModes.week2,
        week3_guide_mode: weekGuideModes.week3, week4_guide_mode: weekGuideModes.week4,
        week1_external_type: weekExternalGuides.week1.type, week1_external_url: weekExternalGuides.week1.url,
        week1_external_file_url: weekExternalGuides.week1.fileUrl, week1_external_file_name: weekExternalGuides.week1.fileName,
        week1_external_title: weekExternalGuides.week1.title,
        week2_external_type: weekExternalGuides.week2.type, week2_external_url: weekExternalGuides.week2.url,
        week2_external_file_url: weekExternalGuides.week2.fileUrl, week2_external_file_name: weekExternalGuides.week2.fileName,
        week2_external_title: weekExternalGuides.week2.title,
        week3_external_type: weekExternalGuides.week3.type, week3_external_url: weekExternalGuides.week3.url,
        week3_external_file_url: weekExternalGuides.week3.fileUrl, week3_external_file_name: weekExternalGuides.week3.fileName,
        week3_external_title: weekExternalGuides.week3.title,
        week4_external_type: weekExternalGuides.week4.type, week4_external_url: weekExternalGuides.week4.url,
        week4_external_file_url: weekExternalGuides.week4.fileUrl, week4_external_file_name: weekExternalGuides.week4.fileName,
        week4_external_title: weekExternalGuides.week4.title
      }

      // AI 모드 주차 수집 & AI 가이드 데이터 생성
      let aiGuides = {}
      try {
        const raw = campaign?.challenge_weekly_guides_ai
        aiGuides = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
      } catch (e) {}

      for (let n = 1; n <= 4; n++) {
        const wk = `week${n}`
        if (weekGuideModes[wk] === 'ai' && guideData[wk].mission) {
          const wd = guideData[wk]
          aiGuides[wk] = {
            product_info: `${guideData.product_name}: ${wd.mission}`,
            mission: wd.mission,
            required_dialogues: wd.required_dialogue ? wd.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim()) : [],
            required_scenes: wd.required_scenes ? wd.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim()) : [],
            hashtags: [],
            cautions: guideData.precautions || '',
            reference_urls: wd.reference_url ? [wd.reference_url] : []
          }
        }
      }

      updateData.challenge_weekly_guides_ai = JSON.stringify(aiGuides)
      updateData.guide_generated_at = new Date().toISOString()

      const { error } = await client.from('campaigns').update(updateData).eq('id', id)
      if (error) throw error

      alert('✅ 가이드가 저장되었습니다! 견적서를 확인하세요.')
      navigate(`/company/campaigns/payment?id=${id}`)
    } catch (error) {
      console.error('완성 오류:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // === 주차 가이드 초기화 ===
  const handleResetWeek = async (weekNum) => {
    if (!confirm(`${weekNum}주차 가이드를 초기화하시겠습니까?`)) return

    const weekKey = `week${weekNum}`
    try {
      let aiGuides = {}
      try {
        const raw = campaign?.challenge_weekly_guides_ai
        aiGuides = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
      } catch (e) {}
      delete aiGuides[weekKey]

      const updateData = {
        challenge_weekly_guides_ai: Object.keys(aiGuides).length > 0 ? JSON.stringify(aiGuides) : null,
        [`${weekKey}_guide_mode`]: null,
        [`${weekKey}_external_type`]: null, [`${weekKey}_external_url`]: null,
        [`${weekKey}_external_file_url`]: null, [`${weekKey}_external_file_name`]: null,
        [`${weekKey}_external_title`]: null
      }

      const { error } = await client.from('campaigns').update(updateData).eq('id', id)
      if (error) throw error

      setWeekStatus(prev => ({ ...prev, [weekKey]: 'empty' }))
      setGuideData(prev => ({ ...prev, [weekKey]: { ...defaultWeek } }))
      setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'ai' }))
      setWeekExternalGuides(prev => ({ ...prev, [weekKey]: { type: null, url: null, fileUrl: null, fileName: null, title: '' } }))
      alert(`${weekNum}주차 가이드가 초기화되었습니다.`)
      loadCampaign()
    } catch (error) {
      alert('초기화 실패: ' + error.message)
    }
  }

  if (!campaign) {
    return (
      <>
        <CompanyNavigation />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </>
    )
  }

  const weekKey = `week${activeWeek}`
  const weekData = guideData[weekKey] || defaultWeek

  return (
    <>
      <CompanyNavigation />

      <div className="max-w-4xl mx-auto px-4 py-4 pt-16 pb-24 lg:px-6 lg:py-6 lg:pt-6 lg:pb-6">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4 lg:p-6 mb-4">
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-7 w-7 text-purple-600" />
            4주 챌린지 가이드 작성
          </h1>
          <p className="text-gray-700 mt-1">
            캠페인: <span className="font-semibold text-purple-700">{campaign.title}</span>
          </p>
        </div>

        {/* === 제품 정보 (접이식) === */}
        <div className="bg-white rounded-lg border-2 border-purple-200 mb-4 overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-purple-50 transition-colors"
            onClick={() => setShowProductInfo(!showProductInfo)}
          >
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold">제품 기본 정보</h3>
              {guideData.brand && guideData.product_name && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">입력됨</span>
              )}
            </div>
            {showProductInfo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {showProductInfo && (
            <div className="px-4 pb-4 space-y-3 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">브랜드명 <span className="text-red-500">*</span></label>
                  <Input value={guideData.brand} onChange={e => updateGuideData('brand', e.target.value)} placeholder="예: SNP" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">제품명 <span className="text-red-500">*</span></label>
                  <Input value={guideData.product_name} onChange={e => updateGuideData('product_name', e.target.value)} placeholder="예: 콜라겐 마스크팩" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">제품 특징 <span className="text-red-500">*</span></label>
                <textarea value={guideData.product_features} onChange={e => updateGuideData('product_features', e.target.value)}
                  placeholder="제품의 주요 성분, 효능, 특징" className="w-full h-24 p-2 border rounded-lg resize-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">주의사항 <span className="text-red-500">*</span></label>
                <textarea value={guideData.precautions} onChange={e => updateGuideData('precautions', e.target.value)}
                  placeholder="크리에이터가 지켜야 할 주의사항" className="w-full h-24 p-2 border rounded-lg resize-none text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* === 1~4주 전체 AI 생성 버튼 === */}
        <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-300 rounded-lg p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-purple-900">🤖 AI 가이드 자동 생성</p>
              <p className="text-xs text-purple-700 mt-0.5">제품 정보를 기반으로 1~4주차 미션을 한번에 자동 생성합니다</p>
            </div>
            <Button
              onClick={handleGenerateAllAI}
              disabled={!!generatingWeek}
              className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
            >
              {generatingWeek === 'all' ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />생성 중...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" />1~4주차 전체 AI 생성</>
              )}
            </Button>
          </div>
        </div>

        {/* === 주차 탭 === */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map(n => {
            const wk = `week${n}`
            const status = weekStatus[wk]
            const isActive = activeWeek === n
            return (
              <button
                key={n}
                onClick={() => setActiveWeek(n)}
                className={`flex-1 py-3 px-2 rounded-lg text-center transition-all font-semibold text-sm border-2 ${
                  isActive
                    ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                    : status === 'saved'
                    ? 'bg-green-50 text-green-700 border-green-300 hover:border-green-400'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                }`}
              >
                <div>{n}주차</div>
                <div className="text-[10px] mt-0.5">
                  {status === 'saved' ? '✅ 작성완료' : '📝 미작성'}
                </div>
              </button>
            )
          })}
        </div>

        {/* === 현재 주차 가이드 폼 === */}
        <div className="bg-white rounded-lg border-2 border-purple-200 p-4 lg:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">Week {activeWeek}</span>
              {activeWeek}주차 가이드
            </h3>
            {weekStatus[weekKey] === 'saved' && (
              <Button variant="outline" size="sm" onClick={() => handleResetWeek(activeWeek)}
                className="text-red-500 border-red-300 hover:bg-red-50 text-xs">
                <XCircle className="w-3 h-3 mr-1" />초기화
              </Button>
            )}
          </div>

          {/* 가이드 타입 선택 */}
          <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" checked={weekGuideModes[weekKey] === 'ai'}
                onChange={() => setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'ai' }))} className="w-4 h-4" />
              <Sparkles className="w-4 h-4 text-purple-600" />AI 가이드
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" checked={weekGuideModes[weekKey] === 'external'}
                onChange={() => setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'external' }))} className="w-4 h-4" />
              <LinkIcon className="w-4 h-4 text-blue-600" />PDF/URL
            </label>
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
            <div className="space-y-4">
              {/* AI 생성 버튼 (개별 주차) */}
              <div className="flex justify-end">
                <Button size="sm" onClick={() => handleGenerateWeekAI(activeWeek)}
                  disabled={!!generatingWeek}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs">
                  {generatingWeek === activeWeek ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />생성 중...</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1" />{activeWeek}주차 AI 생성</>
                  )}
                </Button>
              </div>

              {/* 미션 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold">{activeWeek}주차 미션 <span className="text-red-500">*</span></label>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => { setShowExamplesModal(true) }} className="text-xs h-7">
                    <Lightbulb className="w-3 h-3 mr-1" />미션 예시
                  </Button>
                </div>
                <textarea value={weekData.mission} onChange={e => updateWeekData(weekKey, 'mission', e.target.value)}
                  placeholder="이번 주차의 핵심 미션을 작성해주세요" className="w-full h-24 p-2 border rounded-lg resize-none text-sm" />
              </div>

              {/* 필수 대사 */}
              <div>
                <label className="block text-sm font-semibold mb-1">필수 대사 <span className="text-red-500">*</span></label>
                <textarea value={weekData.required_dialogue} onChange={e => updateWeekData(weekKey, 'required_dialogue', e.target.value)}
                  placeholder="영상에 반드시 포함할 대사 (줄바꿈으로 구분)" className="w-full h-28 p-2 border rounded-lg resize-none text-sm" />
              </div>

              {/* 필수 장면 */}
              <div>
                <label className="block text-sm font-semibold mb-1">필수 장면 <span className="text-red-500">*</span></label>
                <textarea value={weekData.required_scenes} onChange={e => updateWeekData(weekKey, 'required_scenes', e.target.value)}
                  placeholder="반드시 포함할 촬영 장면 (줄바꿈으로 구분)" className="w-full h-28 p-2 border rounded-lg resize-none text-sm" />
              </div>

              {/* 레퍼런스 URL */}
              <div>
                <label className="block text-sm font-semibold mb-1">참고 영상 URL</label>
                <Input value={weekData.reference_url} onChange={e => updateWeekData(weekKey, 'reference_url', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            </div>
          )}

          {/* 이번 주차 저장 버튼 */}
          <div className="flex gap-2 mt-5 pt-4 border-t">
            <Button
              onClick={() => handleSaveWeek(activeWeek)}
              disabled={!!savingWeek || !!loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {savingWeek === activeWeek ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />저장 중...</>
              ) : (
                <><Save className="w-4 h-4 mr-1" />{activeWeek}주차 저장</>
              )}
            </Button>
            {activeWeek < 4 && (
              <Button variant="outline" onClick={() => setActiveWeek(activeWeek + 1)}
                className="text-purple-600 border-purple-300 hover:bg-purple-50">
                다음 주차 →
              </Button>
            )}
          </div>
        </div>

        {/* === 하단 액션 (전체 저장 + 결제) === */}
        <div className="sticky bottom-4 bg-white p-4 rounded-lg border-2 border-purple-300 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {[1,2,3,4].map(n => (
                <span key={n} className={`px-2 py-1 rounded text-xs font-medium ${
                  weekStatus[`week${n}`] === 'saved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {n}주 {weekStatus[`week${n}`] === 'saved' ? '✅' : '—'}
                </span>
              ))}
            </div>
            <Button
              onClick={handleCompleteAll}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />저장 중...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" />전체 저장 및 견적서 확인</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 미션 예시 모달 */}
      {showExamplesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                {activeWeek}주차 미션 예시
              </h3>
              <button onClick={() => setShowExamplesModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 p-3 border-b overflow-x-auto">
              {Object.entries(missionExamples).map(([key, category]) => (
                <button key={key} onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm ${selectedCategory === key ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {category.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-2">
                {missionExamples[selectedCategory].missions.map((mission, index) => (
                  <button key={index} onClick={() => { updateWeekData(weekKey, 'mission', mission); setShowExamplesModal(false) }}
                    className="text-left p-3 border rounded-lg hover:border-purple-500 hover:bg-purple-50 text-sm">
                    <span className="text-gray-400 mr-2">{index + 1}.</span>{mission}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
