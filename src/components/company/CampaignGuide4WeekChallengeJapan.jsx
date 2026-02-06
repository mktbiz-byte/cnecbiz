import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Loader2, ChevronDown, ChevronUp, Lightbulb, X, Package, Info, Calendar, Sparkles, Link as LinkIcon, CheckCircle, XCircle, AlertTriangle, Globe, Languages, Save } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import { missionExamples } from './missionExamples'
import ExternalGuideUploader from '../common/ExternalGuideUploader'

export default function CampaignGuide4WeekChallengeJapan() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const supabase = getSupabaseClient('japan')

  const [loading, setLoading] = useState(false)
  const [savingWeek, setSavingWeek] = useState(null)
  const [generatingWeek, setGeneratingWeek] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [activeWeek, setActiveWeek] = useState(1)
  const [showExamplesModal, setShowExamplesModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('skinTrouble')
  const [showProductInfo, setShowProductInfo] = useState(true)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatingWeek, setTranslatingWeek] = useState(null)

  // 주차별 저장 상태
  const [weekStatus, setWeekStatus] = useState({
    week1: 'empty', week2: 'empty', week3: 'empty', week4: 'empty'
  })

  // 한국어 가이드 데이터
  const [guideData, setGuideData] = useState({
    brand: '', product_name: '', product_features: '', precautions: '',
    week1: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week2: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week3: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' },
    week4: { mission: '', required_dialogue: '', required_scenes: '', reference_url: '' }
  })

  // 일본어 번역 데이터
  const [guideDataJa, setGuideDataJa] = useState({
    brand: '', product_name: '', product_features: '', precautions: '',
    week1: { mission: '', required_dialogue: '', required_scenes: '' },
    week2: { mission: '', required_dialogue: '', required_scenes: '' },
    week3: { mission: '', required_dialogue: '', required_scenes: '' },
    week4: { mission: '', required_dialogue: '', required_scenes: '' }
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
  const defaultWeekJa = { mission: '', required_dialogue: '', required_scenes: '' }

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single()
      if (error) throw error
      setCampaign(data)

      // 가이드 데이터 로드
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

      // 일본어 번역 데이터 로드
      if (data.challenge_guide_data_ja) {
        const de = data.challenge_guide_data_ja
        setGuideDataJa({
          brand: de.brand || '', product_name: de.product_name || '',
          product_features: de.product_features || '', precautions: de.precautions || '',
          week1: { ...defaultWeekJa, ...de.week1 }, week2: { ...defaultWeekJa, ...de.week2 },
          week3: { ...defaultWeekJa, ...de.week3 }, week4: { ...defaultWeekJa, ...de.week4 }
        })
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
        return (hasAI || hasExt) ? 'saved' : 'empty'
      }
      setWeekStatus({ week1: calcStatus('week1'), week2: calcStatus('week2'), week3: calcStatus('week3'), week4: calcStatus('week4') })
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    }
  }

  const updateGuideData = (field, value) => setGuideData(prev => ({ ...prev, [field]: value }))
  const updateWeekData = (week, field, value) => setGuideData(prev => ({ ...prev, [week]: { ...prev[week], [field]: value } }))
  const updateGuideDataJa = (field, value) => setGuideDataJa(prev => ({ ...prev, [field]: value }))
  const updateWeekDataJa = (week, field, value) => setGuideDataJa(prev => ({ ...prev, [week]: { ...prev[week], [field]: value } }))

  // === 주차별 일본어 번역 ===
  const handleTranslateWeek = async (weekNum) => {
    setIsTranslating(true)
    setTranslatingWeek(weekNum)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')

      const weekKey = `week${weekNum}`
      const wd = guideData[weekKey]

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `다음 한국어 텍스트를 일본어(日本語)로 자연스럽게 번역하고 반드시 JSON 형식으로만 출력하세요.

번역할 내용:
- brand: ${guideData.brand}
- product_name: ${guideData.product_name}
- product_features: ${guideData.product_features}
- precautions: ${guideData.precautions}
- mission: ${wd.mission}
- required_dialogue: ${wd.required_dialogue}
- required_scenes: ${wd.required_scenes}

출력 형식 (JSON만):
{"brand":"translation","product_name":"translation","product_features":"translation","precautions":"translation","mission":"translation","required_dialogue":"translation","required_scenes":"translation"}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' }
          })
        }
      )

      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data = await response.json()
      const parsed = JSON.parse(data.candidates[0]?.content?.parts[0]?.text || '{}')

      setGuideDataJa(prev => ({
        ...prev,
        brand: parsed.brand || prev.brand,
        product_name: parsed.product_name || prev.product_name,
        product_features: parsed.product_features || prev.product_features,
        precautions: parsed.precautions || prev.precautions,
        [weekKey]: {
          mission: parsed.mission || '',
          required_dialogue: parsed.required_dialogue || '',
          required_scenes: parsed.required_scenes || ''
        }
      }))
      alert(`${weekNum}주차 일본어 번역이 완료되었습니다!`)
    } catch (error) {
      console.error('Translation error:', error)
      alert('번역 실패: ' + error.message)
    } finally {
      setIsTranslating(false)
      setTranslatingWeek(null)
    }
  }

  // === 전체 번역 ===
  const handleTranslateAll = async () => {
    setIsTranslating(true)
    setTranslatingWeek('all')
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')

      const weeksToTranslate = {}
      for (let n = 1; n <= 4; n++) {
        const wd = guideData[`week${n}`]
        if (wd.mission || wd.required_dialogue || wd.required_scenes) {
          weeksToTranslate[`week${n}_mission`] = wd.mission
          weeksToTranslate[`week${n}_required_dialogue`] = wd.required_dialogue
          weeksToTranslate[`week${n}_required_scenes`] = wd.required_scenes
        }
      }

      const fieldsToTranslate = {
        brand: guideData.brand, product_name: guideData.product_name,
        product_features: guideData.product_features, precautions: guideData.precautions,
        ...weeksToTranslate
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Translate the following JSON values from Korean to natural Japanese (日本語). Keep the keys unchanged. Output ONLY pure JSON:

${JSON.stringify(fieldsToTranslate, null, 2)}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: 'application/json' }
          })
        }
      )

      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data = await response.json()
      const parsed = JSON.parse(data.candidates[0]?.content?.parts[0]?.text || '{}')

      const newJa = {
        brand: parsed.brand || '', product_name: parsed.product_name || '',
        product_features: parsed.product_features || '', precautions: parsed.precautions || '',
        week1: { mission: '', required_dialogue: '', required_scenes: '' },
        week2: { mission: '', required_dialogue: '', required_scenes: '' },
        week3: { mission: '', required_dialogue: '', required_scenes: '' },
        week4: { mission: '', required_dialogue: '', required_scenes: '' }
      }
      for (let n = 1; n <= 4; n++) {
        newJa[`week${n}`] = {
          mission: parsed[`week${n}_mission`] || '',
          required_dialogue: parsed[`week${n}_required_dialogue`] || '',
          required_scenes: parsed[`week${n}_required_scenes`] || ''
        }
      }
      setGuideDataJa(newJa)
      alert('전체 일본어 번역이 완료되었습니다!')
    } catch (error) {
      console.error('Translation error:', error)
      alert('번역 실패: ' + error.message)
    } finally {
      setIsTranslating(false)
      setTranslatingWeek(null)
    }
  }

  // === 주차별 AI 가이드 생성 ===
  const handleGenerateWeekAI = async (weekNum) => {
    if (!guideData.brand && !guideData.product_name) {
      alert('제품 정보(브랜드, 제품명)를 먼저 입력해주세요.')
      return
    }
    setGeneratingWeek(weekNum)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.')

      const weekKey = `week${weekNum}`
      const wd = guideData[weekKey]

      const prompt = `You are a 4-week challenge campaign guide expert for Japanese beauty/lifestyle creators.

**Product Info:**
- Brand: ${guideData.brand || 'TBD'}
- Product: ${guideData.product_name || 'TBD'}
- Features: ${guideData.product_features || 'TBD'}
- Cautions: ${guideData.precautions || 'TBD'}

${wd.mission ? `**Week ${weekNum} Mission Draft (expand):**\n${wd.mission}` : `**Week ${weekNum}:** Generate a suitable mission.
- Week 1: Unboxing/first impression
- Week 2: Usage routine/effects
- Week 3: Before & after/changes
- Week 4: Final review/recommendation`}

Generate in Korean:
1. mission: 미션 설명 (2-3 sentences)
2. required_dialogue: 필수 대사 3-5개 (numbered, newline separated)
3. required_scenes: 필수 장면 3-5개 (numbered, newline separated)

**Response (JSON only):**
{"mission":"...","required_dialogue":"1. ...\\n2. ...","required_scenes":"1. ...\\n2. ..."}`

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

      if (!response.ok) throw new Error(`AI API Error: ${response.status}`)
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
      alert(`${weekNum}주차 AI 가이드가 생성되었습니다! 검토 후 일본어로 번역하세요.`)
    } catch (error) {
      console.error('AI generation error:', error)
      alert('AI 가이드 생성 실패: ' + error.message)
    } finally {
      setGeneratingWeek(null)
    }
  }

  // === 전체 AI 생성 ===
  const handleGenerateAllAI = async () => {
    if (!guideData.brand && !guideData.product_name) {
      alert('제품 정보를 먼저 입력해주세요.')
      return
    }
    setGeneratingWeek('all')
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.')

      const existingWeeks = [1,2,3,4].map(n => {
        const w = guideData[`week${n}`]
        return w.mission ? `Week ${n} draft: ${w.mission}` : `Week ${n}: auto-generate`
      }).join('\n')

      const prompt = `당신은 4주 챌린지 캠페인 전문 기획자입니다.

**제품 정보:**
- 브랜드: ${guideData.brand || '미정'}
- 제품명: ${guideData.product_name || '미정'}
- 제품 특징: ${guideData.product_features || '미정'}
- 주의사항: ${guideData.precautions || '미정'}

**주차별 상태:**
${existingWeeks}

4주 챌린지 가이드를 한국어로 생성 (일본 크리에이터 대상):
- 1주차: 첫 사용/언박싱/첫인상
- 2주차: 사용 루틴/효과 체험
- 3주차: 비포&애프터/변화 공유
- 4주차: 최종 리뷰/추천

각 주차별:
1. mission: 미션 설명 (2-3문장)
2. required_dialogue: 필수 대사 3-5개 (줄바꿈, 번호 포함)
3. required_scenes: 필수 촬영 장면 3-5개 (줄바꿈, 번호 포함)

**응답 형식 (JSON):**
{
  "week1": { "mission": "...", "required_dialogue": "1. ...\\n2. ...", "required_scenes": "1. ...\\n2. ..." },
  "week2": { "mission": "...", "required_dialogue": "...", "required_scenes": "..." },
  "week3": { "mission": "...", "required_dialogue": "...", "required_scenes": "..." },
  "week4": { "mission": "...", "required_dialogue": "...", "required_scenes": "..." }
}`

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

      if (!response.ok) throw new Error(`AI API Error: ${response.status}`)
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
      alert('1~4주차 전체 AI 가이드가 생성되었습니다! 검토 후 일본어로 번역하세요.')
    } catch (error) {
      console.error('AI generation error:', error)
      alert('AI 가이드 생성 실패: ' + error.message)
    } finally {
      setGeneratingWeek(null)
    }
  }

  // === 주차별 저장 ===
  const handleSaveWeek = async (weekNum) => {
    const weekKey = `week${weekNum}`
    const wd = guideData[weekKey]

    if (weekGuideModes[weekKey] === 'ai' && !wd.mission) {
      alert(`${weekNum}주차 미션을 입력해주세요.`)
      return
    }

    setSavingWeek(weekNum)
    try {
      const updateData = {
        brand: guideData.brand, product_name: guideData.product_name,
        product_features: guideData.product_features, product_key_points: guideData.precautions,
        challenge_guide_data: guideData,
        challenge_guide_data_ja: guideDataJa,
        [`${weekKey}_guide_mode`]: weekGuideModes[weekKey],
        [`${weekKey}_external_type`]: weekExternalGuides[weekKey].type,
        [`${weekKey}_external_url`]: weekExternalGuides[weekKey].url,
        [`${weekKey}_external_file_url`]: weekExternalGuides[weekKey].fileUrl,
        [`${weekKey}_external_file_name`]: weekExternalGuides[weekKey].fileName,
        [`${weekKey}_external_title`]: weekExternalGuides[weekKey].title
      }

      if (weekGuideModes[weekKey] === 'ai') {
        const dialogues = wd.required_dialogue ? wd.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim()) : []
        const scenes = wd.required_scenes ? wd.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim()) : []
        const wdJa = guideDataJa[weekKey] || {}
        const dialoguesJa = wdJa.required_dialogue ? wdJa.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim()) : []
        const scenesJa = wdJa.required_scenes ? wdJa.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim()) : []

        let existingAI = {}
        try {
          const raw = campaign?.challenge_weekly_guides_ai
          existingAI = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
        } catch (e) {}

        existingAI[weekKey] = {
          product_info: `${guideData.product_name}: ${wd.mission}`,
          mission: wd.mission,
          required_dialogues: dialogues,
          required_scenes: scenes,
          hashtags: [],
          cautions: guideData.precautions || '',
          reference_urls: wd.reference_url ? [wd.reference_url] : [],
          product_info_ja: `${guideDataJa.product_name}: ${wdJa.mission}`,
          mission_ja: wdJa.mission || '',
          required_dialogues_ja: dialoguesJa,
          required_scenes_ja: scenesJa,
          cautions_ja: guideDataJa.precautions || ''
        }

        updateData.challenge_weekly_guides_ai = JSON.stringify(existingAI)

        const existingWeekly = campaign?.challenge_weekly_guides || {}
        existingWeekly[weekKey] = {
          mission: wd.mission, required_dialogue: wd.required_dialogue,
          required_scenes: wd.required_scenes, reference: wd.reference_url
        }
        updateData.challenge_weekly_guides = existingWeekly
      }

      const { error } = await supabase.from('campaigns').update(updateData).eq('id', id)
      if (error) throw error

      setWeekStatus(prev => ({ ...prev, [weekKey]: 'saved' }))
      alert(`${weekNum}주차 가이드가 저장되었습니다!`)
      loadCampaign()
    } catch (error) {
      console.error('Save error:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSavingWeek(null)
    }
  }

  // === 전체 저장 + 결제 ===
  const handleCompleteAll = async () => {
    if (!guideData.brand || !guideData.product_name) {
      alert('제품 정보를 입력해주세요.')
      return
    }
    if (!guideData.week1.mission && weekGuideModes.week1 === 'ai') {
      alert('최소 1주차 미션을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const updateData = {
        brand: guideData.brand, product_name: guideData.product_name,
        product_features: guideData.product_features, product_key_points: guideData.precautions,
        challenge_guide_data: guideData,
        challenge_guide_data_ja: guideDataJa,
        challenge_weekly_guides: {
          week1: { mission: guideData.week1.mission, required_dialogue: guideData.week1.required_dialogue, required_scenes: guideData.week1.required_scenes, reference: guideData.week1.reference_url },
          week2: { mission: guideData.week2.mission, required_dialogue: guideData.week2.required_dialogue, required_scenes: guideData.week2.required_scenes, reference: guideData.week2.reference_url },
          week3: { mission: guideData.week3.mission, required_dialogue: guideData.week3.required_dialogue, required_scenes: guideData.week3.required_scenes, reference: guideData.week3.reference_url },
          week4: { mission: guideData.week4.mission, required_dialogue: guideData.week4.required_dialogue, required_scenes: guideData.week4.required_scenes, reference: guideData.week4.reference_url }
        },
        week1_guide_mode: weekGuideModes.week1, week2_guide_mode: weekGuideModes.week2,
        week3_guide_mode: weekGuideModes.week3, week4_guide_mode: weekGuideModes.week4,
        week1_external_type: weekExternalGuides.week1.type, week1_external_url: weekExternalGuides.week1.url,
        week1_external_file_url: weekExternalGuides.week1.fileUrl, week1_external_file_name: weekExternalGuides.week1.fileName, week1_external_title: weekExternalGuides.week1.title,
        week2_external_type: weekExternalGuides.week2.type, week2_external_url: weekExternalGuides.week2.url,
        week2_external_file_url: weekExternalGuides.week2.fileUrl, week2_external_file_name: weekExternalGuides.week2.fileName, week2_external_title: weekExternalGuides.week2.title,
        week3_external_type: weekExternalGuides.week3.type, week3_external_url: weekExternalGuides.week3.url,
        week3_external_file_url: weekExternalGuides.week3.fileUrl, week3_external_file_name: weekExternalGuides.week3.fileName, week3_external_title: weekExternalGuides.week3.title,
        week4_external_type: weekExternalGuides.week4.type, week4_external_url: weekExternalGuides.week4.url,
        week4_external_file_url: weekExternalGuides.week4.fileUrl, week4_external_file_name: weekExternalGuides.week4.fileName, week4_external_title: weekExternalGuides.week4.title
      }

      let aiGuides = {}
      try {
        const raw = campaign?.challenge_weekly_guides_ai
        aiGuides = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
      } catch (e) {}

      for (let n = 1; n <= 4; n++) {
        const wk = `week${n}`
        if (weekGuideModes[wk] === 'ai' && guideData[wk].mission) {
          const wd = guideData[wk]
          const wdJa = guideDataJa[wk] || {}
          aiGuides[wk] = {
            product_info: `${guideData.product_name}: ${wd.mission}`,
            mission: wd.mission,
            required_dialogues: wd.required_dialogue ? wd.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim()) : [],
            required_scenes: wd.required_scenes ? wd.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim()) : [],
            hashtags: [], cautions: guideData.precautions || '',
            reference_urls: wd.reference_url ? [wd.reference_url] : [],
            product_info_ja: `${guideDataJa.product_name}: ${wdJa.mission}`,
            mission_ja: wdJa.mission || '',
            required_dialogues_ja: wdJa.required_dialogue ? wdJa.required_dialogue.split('\n').filter(d => d.trim()).map(d => d.trim()) : [],
            required_scenes_ja: wdJa.required_scenes ? wdJa.required_scenes.split('\n').filter(s => s.trim()).map(s => s.trim()) : [],
            cautions_ja: guideDataJa.precautions || ''
          }
        }
      }

      updateData.challenge_weekly_guides_ai = JSON.stringify(aiGuides)
      updateData.guide_generated_at = new Date().toISOString()

      const { error } = await supabase.from('campaigns').update(updateData).eq('id', id)
      if (error) throw error

      alert('가이드가 저장되었습니다! 결제 페이지로 이동합니다.')
      navigate(`/company/campaigns/payment?id=${id}&region=japan`)
    } catch (error) {
      console.error('Error:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // === 주차 초기화 ===
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

      const { error } = await supabase.from('campaigns').update({
        challenge_weekly_guides_ai: Object.keys(aiGuides).length > 0 ? JSON.stringify(aiGuides) : null,
        [`${weekKey}_guide_mode`]: null,
        [`${weekKey}_external_type`]: null, [`${weekKey}_external_url`]: null,
        [`${weekKey}_external_file_url`]: null, [`${weekKey}_external_file_name`]: null,
        [`${weekKey}_external_title`]: null
      }).eq('id', id)
      if (error) throw error

      setWeekStatus(prev => ({ ...prev, [weekKey]: 'empty' }))
      setGuideData(prev => ({ ...prev, [weekKey]: { ...defaultWeek } }))
      setGuideDataJa(prev => ({ ...prev, [weekKey]: { ...defaultWeekJa } }))
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
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      </>
    )
  }

  const weekKey = `week${activeWeek}`
  const weekData = guideData[weekKey] || defaultWeek
  const weekDataJa = guideDataJa[weekKey] || defaultWeekJa

  return (
    <>
      <CompanyNavigation />

      <div className="max-w-7xl mx-auto px-4 py-4 pt-16 pb-24 lg:px-6 lg:py-6 lg:pt-6 lg:pb-6">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-lg p-4 lg:p-6 mb-4">
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-7 w-7 text-red-600" />
            4주 챌린지 가이드 작성 (일본)
          </h1>
          <p className="text-gray-700 mt-1">
            캠페인: <span className="font-semibold text-red-700">{campaign.title}</span>
          </p>
        </div>

        {/* 안내 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-900">
            <p className="font-bold mb-1">일본 가이드 작성 안내</p>
            <p>왼쪽에 한국어로 입력하고, 일본어 번역 버튼을 클릭하면 오른쪽에 일본어 번역이 표시됩니다. 관리자는 한국어/일본어 모두 볼 수 있고, 크리에이터에게는 일본어만 전달됩니다.</p>
          </div>
        </div>

        {/* === 제품 정보 (접이식) === */}
        <div className="bg-white rounded-lg border-2 border-red-200 mb-4 overflow-hidden">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-50 transition-colors"
            onClick={() => setShowProductInfo(!showProductInfo)}>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-bold">제품 정보</h3>
              {guideData.brand && guideData.product_name && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">입력됨</span>
              )}
            </div>
            {showProductInfo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {showProductInfo && (
            <div className="px-4 pb-4 border-t">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                {/* Korean */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-red-700 flex items-center gap-1"><Globe className="w-4 h-4" />한국어 입력</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-semibold mb-1">브랜드 <span className="text-red-500">*</span></label>
                      <Input value={guideData.brand} onChange={e => updateGuideData('brand', e.target.value)} placeholder="SNP" className="h-9 text-sm" /></div>
                    <div><label className="block text-xs font-semibold mb-1">제품명 <span className="text-red-500">*</span></label>
                      <Input value={guideData.product_name} onChange={e => updateGuideData('product_name', e.target.value)} placeholder="콜라겐 마스크" className="h-9 text-sm" /></div>
                  </div>
                  <div><label className="block text-xs font-semibold mb-1">제품 특징 <span className="text-red-500">*</span></label>
                    <textarea value={guideData.product_features} onChange={e => updateGuideData('product_features', e.target.value)}
                      placeholder="제품 주요 성분, 효능, 특징" className="w-full h-20 p-2 border rounded-lg resize-none text-sm" /></div>
                  <div><label className="block text-xs font-semibold mb-1">주의사항 <span className="text-red-500">*</span></label>
                    <textarea value={guideData.precautions} onChange={e => updateGuideData('precautions', e.target.value)}
                      placeholder="주의사항" className="w-full h-20 p-2 border rounded-lg resize-none text-sm" /></div>
                </div>
                {/* Japanese */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-red-700 flex items-center gap-1"><Globe className="w-4 h-4" />日本語プレビュー</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-semibold mb-1 text-red-700">ブランド名</label>
                      <Input value={guideDataJa.brand} onChange={e => updateGuideDataJa('brand', e.target.value)} placeholder="ブランド名" className="h-9 text-sm border-red-200" /></div>
                    <div><label className="block text-xs font-semibold mb-1 text-red-700">製品名</label>
                      <Input value={guideDataJa.product_name} onChange={e => updateGuideDataJa('product_name', e.target.value)} placeholder="製品名" className="h-9 text-sm border-red-200" /></div>
                  </div>
                  <div><label className="block text-xs font-semibold mb-1 text-red-700">製品特徴</label>
                    <textarea value={guideDataJa.product_features} onChange={e => updateGuideDataJa('product_features', e.target.value)}
                      placeholder="日本語 製品特徴" className="w-full h-20 p-2 border border-red-200 rounded-lg resize-none text-sm" /></div>
                  <div><label className="block text-xs font-semibold mb-1 text-red-700">注意事項</label>
                    <textarea value={guideDataJa.precautions} onChange={e => updateGuideDataJa('precautions', e.target.value)}
                      placeholder="日本語 注意事項" className="w-full h-20 p-2 border border-red-200 rounded-lg resize-none text-sm" /></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* === AI + 번역 버튼 === */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Button onClick={handleGenerateAllAI} disabled={!!generatingWeek}
            className="bg-purple-600 hover:bg-purple-700 text-white flex-1">
            {generatingWeek === 'all' ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />생성 중...</> : <><Sparkles className="w-4 h-4 mr-1" />1~4주차 전체 AI 생성</>}
          </Button>
          <Button onClick={handleTranslateAll} disabled={isTranslating}
            className="bg-red-500 hover:bg-red-600 text-white flex-1">
            {isTranslating && translatingWeek === 'all' ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />번역 중...</> : <><Languages className="w-4 h-4 mr-1" />전체 일본어 번역</>}
          </Button>
        </div>

        {/* === 주차 탭 === */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map(n => {
            const wk = `week${n}`
            const status = weekStatus[wk]
            const isActive = activeWeek === n
            return (
              <button key={n} onClick={() => setActiveWeek(n)}
                className={`flex-1 py-3 px-2 rounded-lg text-center transition-all font-semibold text-sm border-2 ${
                  isActive ? 'bg-red-600 text-white border-red-600 shadow-lg'
                    : status === 'saved' ? 'bg-green-50 text-green-700 border-green-300 hover:border-green-400'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                }`}>
                <div>{n}주차</div>
                <div className="text-[10px] mt-0.5">{status === 'saved' ? '작성완료' : '미작성'}</div>
              </button>
            )
          })}
        </div>

        {/* === 주차별 가이드 폼 (2컬럼) === */}
        <div className="bg-white rounded-lg border-2 border-red-200 p-4 lg:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">{activeWeek}주차</span>
              {activeWeek}주차 가이드
            </h3>
            {weekStatus[weekKey] === 'saved' && (
              <Button variant="outline" size="sm" onClick={() => handleResetWeek(activeWeek)}
                className="text-red-500 border-red-300 hover:bg-red-50 text-xs">
                <XCircle className="w-3 h-3 mr-1" />초기화
              </Button>
            )}
          </div>

          {/* 가이드 타입 */}
          <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" checked={weekGuideModes[weekKey] === 'ai'}
                onChange={() => setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'ai' }))} className="w-4 h-4" />
              <Sparkles className="w-4 h-4 text-purple-600" />AI Guide
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" checked={weekGuideModes[weekKey] === 'external'}
                onChange={() => setWeekGuideModes(prev => ({ ...prev, [weekKey]: 'external' }))} className="w-4 h-4" />
              <LinkIcon className="w-4 h-4 text-red-600" />PDF/URL
            </label>
          </div>

          {weekGuideModes[weekKey] === 'external' ? (
            <ExternalGuideUploader value={weekExternalGuides[weekKey]}
              onChange={(data) => setWeekExternalGuides(prev => ({ ...prev, [weekKey]: data }))}
              campaignId={id} prefix={`${weekKey}_`} supabaseClient={supabaseBiz} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Korean */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-red-700 flex items-center gap-1 pb-2 border-b border-red-200"><Globe className="w-4 h-4" />한국어 입력</h4>
                <div className="flex items-center justify-between">
                  <Button size="sm" onClick={() => handleGenerateWeekAI(activeWeek)} disabled={!!generatingWeek}
                    className="bg-purple-500 hover:bg-purple-600 text-white text-xs">
                    {generatingWeek === activeWeek ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />생성 중...</> : <><Sparkles className="w-3 h-3 mr-1" />{activeWeek}주차 AI 생성</>}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowExamplesModal(true)} className="text-xs h-7">
                    <Lightbulb className="w-3 h-3 mr-1" />미션 예시
                  </Button>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">미션 <span className="text-red-500">*</span></label>
                  <textarea value={weekData.mission} onChange={e => updateWeekData(weekKey, 'mission', e.target.value)}
                    placeholder="이번 주차의 핵심 미션" className="w-full h-24 p-2 border rounded-lg resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">필수 대사 <span className="text-red-500">*</span></label>
                  <textarea value={weekData.required_dialogue} onChange={e => updateWeekData(weekKey, 'required_dialogue', e.target.value)}
                    placeholder="필수 대사 (줄바꿈으로 구분)" className="w-full h-28 p-2 border rounded-lg resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">필수 장면 <span className="text-red-500">*</span></label>
                  <textarea value={weekData.required_scenes} onChange={e => updateWeekData(weekKey, 'required_scenes', e.target.value)}
                    placeholder="필수 촬영 장면 (줄바꿈으로 구분)" className="w-full h-28 p-2 border rounded-lg resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">참고 URL</label>
                  <Input value={weekData.reference_url} onChange={e => updateWeekData(weekKey, 'reference_url', e.target.value)} placeholder="https://..." />
                </div>
                <Button onClick={() => handleTranslateWeek(activeWeek)} disabled={isTranslating}
                  className="w-full bg-red-500 hover:bg-red-600 text-white">
                  {isTranslating && translatingWeek === activeWeek ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />번역 중...</> : <><Languages className="w-4 h-4 mr-1" />{activeWeek}주차 일본어 번역</>}
                </Button>
              </div>

              {/* Japanese */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-red-700 flex items-center gap-1 pb-2 border-b border-red-200"><Globe className="w-4 h-4" />日本語プレビュー</h4>
                <div className="h-8" />
                <div>
                  <label className="block text-sm font-semibold mb-1 text-red-700">ミッション</label>
                  <textarea value={weekDataJa.mission} onChange={e => updateWeekDataJa(weekKey, 'mission', e.target.value)}
                    placeholder="日本語 ミッション" className="w-full h-24 p-2 border border-red-200 rounded-lg resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-red-700">必須セリフ</label>
                  <textarea value={weekDataJa.required_dialogue} onChange={e => updateWeekDataJa(weekKey, 'required_dialogue', e.target.value)}
                    placeholder="日本語 必須セリフ" className="w-full h-28 p-2 border border-red-200 rounded-lg resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-red-700">必須シーン</label>
                  <textarea value={weekDataJa.required_scenes} onChange={e => updateWeekDataJa(weekKey, 'required_scenes', e.target.value)}
                    placeholder="日本語 必須シーン" className="w-full h-28 p-2 border border-red-200 rounded-lg resize-none text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex gap-2 mt-5 pt-4 border-t">
            <Button onClick={() => handleSaveWeek(activeWeek)} disabled={!!savingWeek || !!loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {savingWeek === activeWeek ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />저장 중...</> : <><Save className="w-4 h-4 mr-1" />{activeWeek}주차 저장</>}
            </Button>
            {activeWeek < 4 && (
              <Button variant="outline" onClick={() => setActiveWeek(activeWeek + 1)}
                className="text-red-600 border-red-300 hover:bg-red-50">
                다음 주차 →
              </Button>
            )}
          </div>
        </div>

        {/* === 하단 === */}
        <div className="sticky bottom-4 bg-white p-4 rounded-lg border-2 border-red-300 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {[1,2,3,4].map(n => (
                <span key={n} className={`px-2 py-1 rounded text-xs font-medium ${
                  weekStatus[`week${n}`] === 'saved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {n}주 {weekStatus[`week${n}`] === 'saved' ? '✅' : '—'}
                </span>
              ))}
            </div>
            <Button onClick={handleCompleteAll} disabled={loading}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold shadow-lg">
              {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />저장 중...</> : <><Sparkles className="w-4 h-4 mr-1" />전체 저장 및 견적서 확인</>}
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
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm ${selectedCategory === key ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {category.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-2">
                {missionExamples[selectedCategory].missions.map((mission, index) => (
                  <button key={index} onClick={() => { updateWeekData(weekKey, 'mission', mission); setShowExamplesModal(false) }}
                    className="text-left p-3 border rounded-lg hover:border-red-500 hover:bg-red-50 text-sm">
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
