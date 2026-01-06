import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  ArrowLeft,
  Plus,
  FileText,
  Globe,
  Sparkles,
  Send,
  Save,
  Mail,
  Loader2,
  Trash2,
  Copy,
  CheckCircle,
  User
} from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

// Style presets
const DIALOGUE_STYLES = [
  { value: 'natural', label: '자연스러운 (Natural)', labelEn: 'Natural and conversational', labelJa: '自然な会話調' },
  { value: 'enthusiastic', label: '열정적인 (Enthusiastic)', labelEn: 'Energetic and excited', labelJa: '熱狂的でエネルギッシュ' },
  { value: 'professional', label: '전문적인 (Professional)', labelEn: 'Expert and informative', labelJa: '専門的で情報豊富' },
  { value: 'friendly', label: '친근한 (Friendly)', labelEn: 'Warm and approachable', labelJa: '温かく親しみやすい' },
  { value: 'storytelling', label: '스토리텔링 (Storytelling)', labelEn: 'Narrative and engaging', labelJa: '物語調で魅力的' }
]

const TEMPO_OPTIONS = [
  { value: 'fast', label: '빠름 (Fast)', labelEn: 'Fast-paced, dynamic', labelJa: 'テンポ良く、ダイナミック' },
  { value: 'normal', label: '보통 (Normal)', labelEn: 'Natural pace', labelJa: '自然なペース' },
  { value: 'slow', label: '느림 (Slow)', labelEn: 'Calm and relaxed', labelJa: '落ち着いてリラックス' }
]

const MOOD_OPTIONS = [
  { value: 'bright', label: '밝고 경쾌한', labelEn: 'Bright and cheerful', labelJa: '明るく快活' },
  { value: 'calm', label: '차분하고 진지한', labelEn: 'Calm and serious', labelJa: '落ち着いて真剣' },
  { value: 'emotional', label: '감성적인', labelEn: 'Emotional and touching', labelJa: '感動的' },
  { value: 'humorous', label: '유머러스한', labelEn: 'Humorous and fun', labelJa: 'ユーモラスで楽しい' },
  { value: 'luxurious', label: '고급스러운', labelEn: 'Luxurious and elegant', labelJa: '高級感がありエレガント' }
]

// Default 10 scenes template
const DEFAULT_SCENES = Array.from({ length: 10 }, (_, i) => ({
  order: i + 1,
  scene_type: '',
  scene_description: '',
  scene_description_translated: '',
  dialogue: '',
  dialogue_translated: '',
  shooting_tip: '',
  shooting_tip_translated: ''
}))

export default function CompanySceneGuideEditor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')
  const applicationId = searchParams.get('applicationId')
  const region = searchParams.get('region') || 'us'

  const supabase = getSupabaseClient(region)

  // Data
  const [campaign, setCampaign] = useState(null)
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Style settings
  const [dialogueStyle, setDialogueStyle] = useState('natural')
  const [tempo, setTempo] = useState('normal')
  const [mood, setMood] = useState('bright')

  // Scenes (10 scenes with dialogues)
  const [scenes, setScenes] = useState(DEFAULT_SCENES)

  // Required elements from campaign
  const [requiredDialogues, setRequiredDialogues] = useState([])
  const [requiredScenes, setRequiredScenes] = useState([])

  // Messages
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Target language based on region
  const targetLanguage = region === 'japan' ? 'ja' : 'en'
  const targetLanguageLabel = region === 'japan' ? '일본어' : '영어'

  useEffect(() => {
    if (campaignId && applicationId) {
      loadData()
    }
  }, [campaignId, applicationId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load campaign data
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // Load application data
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (appError) throw appError
      setApplication(appData)

      // Load campaign-level settings as defaults
      // Check both plural and singular field names for compatibility
      const dialogueSource = campaignData.required_dialogues || campaignData.required_dialogue
      if (dialogueSource) {
        if (Array.isArray(dialogueSource)) {
          setRequiredDialogues(dialogueSource)
        } else if (typeof dialogueSource === 'string') {
          setRequiredDialogues(dialogueSource.split('\n').filter(d => d.trim()))
        }
      }
      const scenesSource = campaignData.required_scenes
      if (scenesSource) {
        if (Array.isArray(scenesSource)) {
          setRequiredScenes(scenesSource)
        } else if (typeof scenesSource === 'string') {
          setRequiredScenes(scenesSource.split('\n').filter(s => s.trim()))
        }
      }
      if (campaignData.video_tempo) setTempo(campaignData.video_tempo)
      if (campaignData.video_tone) setMood(campaignData.video_tone)
      if (campaignData.dialogue_style) setDialogueStyle(campaignData.dialogue_style)

      // Load existing creator guide if available
      if (appData.personalized_guide) {
        try {
          const guide = typeof appData.personalized_guide === 'string'
            ? JSON.parse(appData.personalized_guide)
            : appData.personalized_guide

          if (guide.scenes && Array.isArray(guide.scenes)) {
            setScenes(guide.scenes)
          }
          if (guide.dialogue_style) setDialogueStyle(guide.dialogue_style)
          if (guide.tempo) setTempo(guide.tempo)
          if (guide.mood) setMood(guide.mood)
          if (guide.required_dialogues) setRequiredDialogues(guide.required_dialogues)
          if (guide.required_scenes) setRequiredScenes(guide.required_scenes)
        } catch (e) {
          console.error('Error parsing guide:', e)
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSceneChange = (index, field, value) => {
    setScenes(prev => {
      const newScenes = [...prev]
      newScenes[index] = { ...newScenes[index], [field]: value }
      return newScenes
    })
  }

  const addScene = () => {
    if (scenes.length >= 15) {
      setError('최대 15개의 씬까지 추가할 수 있습니다.')
      return
    }
    setScenes(prev => [...prev, {
      order: prev.length + 1,
      scene_type: '',
      scene_description: '',
      scene_description_translated: '',
      dialogue: '',
      dialogue_translated: '',
      shooting_tip: '',
      shooting_tip_translated: ''
    }])
  }

  const removeScene = (index) => {
    if (scenes.length <= 5) {
      setError('최소 5개의 씬이 필요합니다.')
      return
    }
    setScenes(prev => prev.filter((_, i) => i !== index).map((scene, i) => ({
      ...scene,
      order: i + 1
    })))
  }

  // AI Auto-Generate Scene Guide
  const handleAutoGenerate = async () => {
    setGenerating(true)
    setError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')

      // Get style labels
      const styleLabel = DIALOGUE_STYLES.find(s => s.value === dialogueStyle)?.label || '자연스러운'
      const tempoLabel = TEMPO_OPTIONS.find(t => t.value === tempo)?.label || '보통'
      const moodLabel = MOOD_OPTIONS.find(m => m.value === mood)?.label || '밝고 경쾌한'

      // Campaign info for context
      const productName = campaign?.product_name || campaign?.title || '제품'
      const brandName = campaign?.brand_name || campaign?.brand || '브랜드'
      const productInfo = campaign?.product_info || campaign?.description || campaign?.product_description || ''
      const category = campaign?.category || ''
      const videoLength = campaign?.video_length || '60초'
      const guidelines = campaign?.guidelines || ''

      // Required elements
      const reqDialogues = requiredDialogues.filter(d => d.trim()).join('\n- ')
      const reqScenes = requiredScenes.filter(s => s.trim()).join('\n- ')

      // Region-specific context
      const isJapan = region === 'japan'
      const regionContext = isJapan
        ? `[일본 시장 특성]
- 일본 소비자의 라이프스타일에 맞게 작성
- 정중하고 세련된 표현 사용
- 제품의 섬세한 디테일과 품질 강조
- 미니멀하고 깔끔한 촬영 스타일
- 자연스럽고 차분한 톤 유지`
        : `[미국 시장 특성]
- 미국 소비자의 라이프스타일에 맞게 작성
- 직접적이고 자신감 있는 표현 사용
- 실용적인 효과와 결과 강조
- 역동적이고 밝은 촬영 스타일
- 친근하고 에너지 넘치는 톤`

      const prompt = `당신은 UGC(User Generated Content) 영상 촬영 가이드 전문가입니다.
${isJapan ? '일본' : '미국'} 시장을 타겟으로 크리에이터를 위한 10개의 촬영 씬 가이드를 작성해주세요.

⚠️ 중요: 모든 내용(scene_description, dialogue, shooting_tip)은 반드시 한국어로 작성해주세요!
대사(dialogue)도 한국어로 작성하세요. 번역은 별도로 진행됩니다.

[캠페인 정보]
- 제품명: ${productName}
- 브랜드: ${brandName}
- 카테고리: ${category}
- 영상 길이: ${videoLength}
- 제품 설명: ${productInfo}
${guidelines ? `- 가이드라인: ${guidelines}` : ''}

${regionContext}

[스타일 설정]
- 대사 스타일: ${styleLabel}
- 템포: ${tempoLabel}
- 분위기: ${moodLabel}

${reqDialogues ? `[필수 대사 - 반드시 포함]\n- ${reqDialogues}` : ''}

${reqScenes ? `[필수 촬영장면 - 반드시 포함]\n- ${reqScenes}` : ''}

[핵심 요청사항]
1. ⚡ 첫 번째 씬은 반드시 "훅(Hook)"으로 시작 - 3초 내에 시청자의 관심을 확 끌어야 함
   - 충격적인 Before 상태 또는 놀라운 결과 먼저 보여주기
   - "이 제품 없이 어떻게 살았지?" 같은 강렬한 오프닝

2. 🔄 B&A(Before & After) 중심 구성
   - 제품 사용 전 문제/고민 상황 명확히 보여주기
   - 제품 사용 과정 상세히
   - 사용 후 변화/효과를 드라마틱하게 표현

3. 📍 ${isJapan ? '일본' : '미국'} 라이프스타일 반영
   - ${isJapan ? '일본식 집, 욕실, 화장대 등 일본 생활환경에서 촬영' : '미국식 집, 욕실, 주방 등 미국 생활환경에서 촬영'}
   - ${isJapan ? '일본 소비자가 공감할 수 있는 상황과 표현' : '미국 소비자가 공감할 수 있는 상황과 표현'}

4. 필수 대사와 필수 촬영장면은 반드시 가이드에 포함
5. 각 씬은 자연스럽게 연결되어야 함
6. 마지막 씬은 CTA(Call to Action)로 마무리
7. ⚠️ 모든 텍스트는 한국어로 작성 (영어/일본어 X)

응답 형식 (반드시 JSON으로만):
{
  "scenes": [
    {
      "order": 1,
      "scene_type": "훅 (3초 집중)",
      "scene_description": "이 씬에서 촬영해야 할 장면 설명 (한국어)",
      "dialogue": "크리에이터가 말해야 할 대사 (한국어)",
      "shooting_tip": "촬영 팁 (한국어)"
    }
  ]
}

JSON만 출력하세요.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const responseText = data.candidates[0]?.content?.parts[0]?.text || ''

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('가이드 생성 결과를 파싱할 수 없습니다.')

      const result = JSON.parse(jsonMatch[0])

      if (result.scenes && Array.isArray(result.scenes)) {
        // 자동 번역 - 영어(US) 또는 일본어(Japan)
        const targetLang = isJapan ? '일본어' : '영어'
        const translatePrompt = `다음 촬영 가이드의 각 항목을 ${targetLang}로 번역해주세요.
자연스럽고 현지화된 표현을 사용하세요.

번역할 내용:
${result.scenes.map((s, i) => `장면 ${i + 1}:
- 장면 설명: ${s.scene_description}
- 대사: ${s.dialogue}
- 촬영 팁: ${s.shooting_tip}`).join('\n\n')}

응답 형식 (JSON만):
{"translations": [{"scene_description": "번역된 장면 설명", "dialogue": "번역된 대사", "shooting_tip": "번역된 촬영 팁"}]}
JSON만 출력.`

        let translations = []
        try {
          const transResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: translatePrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
              })
            }
          )

          if (transResponse.ok) {
            const transData = await transResponse.json()
            const transText = transData.candidates[0]?.content?.parts[0]?.text || ''
            const transMatch = transText.match(/\{[\s\S]*\}/)
            if (transMatch) {
              const transResult = JSON.parse(transMatch[0])
              translations = transResult.translations || []
            }
          }
        } catch (transErr) {
          console.error('번역 실패:', transErr)
        }

        setScenes(result.scenes.map((scene, i) => ({
          order: i + 1,
          scene_type: scene.scene_type || '',
          scene_description: scene.scene_description || '',
          scene_description_translated: translations[i]?.scene_description || '',
          dialogue: scene.dialogue || '',
          dialogue_translated: translations[i]?.dialogue || '',
          shooting_tip: scene.shooting_tip || '',
          shooting_tip_translated: translations[i]?.shooting_tip || ''
        })))
      }

      setSuccess(`AI 가이드 생성 및 ${isJapan ? '일본어' : '영어'} 번역이 완료되었습니다! 내용을 검토하고 필요시 수정해주세요.`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('Generation error:', err)
      setError('가이드 생성 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // AI Translation
  const handleTranslateAll = async () => {
    setTranslating(true)
    setError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')

      const targetLang = region === 'japan' ? '일본어' : '영어'

      // Prepare content for translation
      const contentToTranslate = scenes.map((scene, i) => ({
        index: i,
        scene_description: scene.scene_description,
        dialogue: scene.dialogue,
        shooting_tip: scene.shooting_tip
      })).filter(s => s.scene_description || s.dialogue || s.shooting_tip)

      if (contentToTranslate.length === 0) {
        throw new Error('번역할 내용이 없습니다.')
      }

      const prompt = `다음 촬영 가이드 내용을 ${targetLang}로 자연스럽게 번역해주세요.
크리에이터가 이해하기 쉽게 자연스러운 표현을 사용해주세요.

번역할 내용:
${contentToTranslate.map(item => `
[씬 ${item.index + 1}]
촬영장면: ${item.scene_description || '(없음)'}
대사: ${item.dialogue || '(없음)'}
촬영팁: ${item.shooting_tip || '(없음)'}
`).join('\n')}

응답 형식 (JSON):
{
  "translations": [
    {
      "index": 0,
      "scene_description_translated": "번역된 촬영장면",
      "dialogue_translated": "번역된 대사",
      "shooting_tip_translated": "번역된 촬영팁"
    }
  ]
}

JSON만 출력하세요.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const responseText = data.candidates[0]?.content?.parts[0]?.text || ''

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('번역 결과를 파싱할 수 없습니다.')

      const translations = JSON.parse(jsonMatch[0])

      // Update scenes with translations
      setScenes(prev => {
        const newScenes = [...prev]
        translations.translations.forEach(t => {
          if (newScenes[t.index]) {
            newScenes[t.index] = {
              ...newScenes[t.index],
              scene_description_translated: t.scene_description_translated || '',
              dialogue_translated: t.dialogue_translated || '',
              shooting_tip_translated: t.shooting_tip_translated || ''
            }
          }
        })
        return newScenes
      })

      setSuccess(`${targetLang} 번역이 완료되었습니다!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Translation error:', err)
      setError('번역 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setTranslating(false)
    }
  }

  // Save guide to application
  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const guideData = {
        scenes: scenes,
        dialogue_style: dialogueStyle,
        tempo: tempo,
        mood: mood,
        required_dialogues: requiredDialogues.filter(d => d.trim()),
        required_scenes: requiredScenes.filter(s => s.trim()),
        updated_at: new Date().toISOString()
      }

      // US/Japan 캠페인은 API 사용 (RLS 우회)
      if (region === 'us' || region === 'japan') {
        const saveResponse = await fetch('/.netlify/functions/save-personalized-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region: region,
            applicationId: applicationId,
            guide: guideData
          })
        })

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json()
          throw new Error(errorData.error || 'Failed to save guide')
        }
      } else {
        const { error } = await supabase
          .from('applications')
          .update({
            personalized_guide: guideData
          })
          .eq('id', applicationId)

        if (error) throw error
      }

      setSuccess('가이드가 저장되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setError('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Send guide via email
  const handleSendEmail = async () => {
    setSendingEmail(true)
    setError('')

    try {
      // Prepare guide content for email
      const guideContent = {
        campaign_title: campaign?.title || campaign?.product_name,
        brand_name: campaign?.brand_name || campaign?.brand,
        dialogue_style: DIALOGUE_STYLES.find(s => s.value === dialogueStyle)?.[region === 'japan' ? 'labelJa' : 'labelEn'],
        tempo: TEMPO_OPTIONS.find(t => t.value === tempo)?.[region === 'japan' ? 'labelJa' : 'labelEn'],
        mood: MOOD_OPTIONS.find(m => m.value === mood)?.[region === 'japan' ? 'labelJa' : 'labelEn'],
        scenes: scenes.map(scene => ({
          order: scene.order,
          scene_type: scene.scene_type,
          scene_description: scene.scene_description_translated || scene.scene_description,
          dialogue: scene.dialogue_translated || scene.dialogue,
          shooting_tip: scene.shooting_tip_translated || scene.shooting_tip
        })),
        required_dialogues: requiredDialogues,
        required_scenes: requiredScenes
      }

      const response = await fetch('/.netlify/functions/send-scene-guide-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          region,
          guide_content: guideContent,
          creators: [{
            id: application.id,
            name: application.applicant_name || application.creator_name,
            email: application.email
          }]
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Email sending failed')
      }

      setSuccess('가이드가 이메일로 전송되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Email error:', err)
      setError('이메일 전송 실패: ' + err.message)
    } finally {
      setSendingEmail(false)
    }
  }

  const copyGuideToClipboard = () => {
    const guideText = scenes.map(scene => `
[씬 ${scene.order}] ${scene.scene_type}
촬영장면: ${scene.scene_description}
${scene.scene_description_translated ? `(${targetLanguageLabel}) ${scene.scene_description_translated}` : ''}
대사: ${scene.dialogue}
${scene.dialogue_translated ? `(${targetLanguageLabel}) ${scene.dialogue_translated}` : ''}
${scene.shooting_tip ? `촬영팁: ${scene.shooting_tip}` : ''}
${scene.shooting_tip_translated ? `(${targetLanguageLabel}) ${scene.shooting_tip_translated}` : ''}
`).join('\n---\n')

    navigator.clipboard.writeText(guideText)
    setSuccess('가이드가 클립보드에 복사되었습니다!')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) {
    return (
      <>
        <CompanyNavigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </>
    )
  }

  const creatorName = application?.applicant_name || application?.creator_name || '크리에이터'

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/company/campaigns/${campaignId}?region=${region}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <User className="w-6 h-6 text-purple-600" />
                  {creatorName}님 씬 가이드
                </h1>
                <p className="text-gray-600 mt-1">
                  {campaign?.title || campaign?.product_name} - {region === 'japan' ? '일본' : '미국'} 캠페인
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyGuideToClipboard}>
                <Copy className="w-4 h-4 mr-2" />
                복사
              </Button>
              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={sendingEmail || !application?.email}
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                이메일 전송
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                저장
              </Button>
            </div>
          </div>

          {/* Creator Info */}
          <Card className="mb-6 bg-purple-50 border-purple-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold">{creatorName}</span>
                </div>
                {application?.email && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">이메일:</span> {application.email}
                  </div>
                )}
                {application?.instagram_url && (
                  <a
                    href={application.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer Notice */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div>
                <p className="font-semibold text-amber-800 mb-1">주의사항</p>
                <p className="text-amber-700 text-sm">
                  본 가이드는 100% 동일하게 촬영이 아닌 크리에이터의 스타일에 맞게 변경되어 촬영될 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Settings & Required Elements */}
            <div className="space-y-6">
              {/* Style Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    스타일 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">대사 스타일</Label>
                    <Select value={dialogueStyle} onValueChange={setDialogueStyle}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIALOGUE_STYLES.map(style => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">템포</Label>
                    <Select value={tempo} onValueChange={setTempo}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPO_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">분위기</Label>
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOOD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Required Dialogues */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">필수 대사</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {requiredDialogues.map((dialogue, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={dialogue}
                        onChange={(e) => {
                          const newDialogues = [...requiredDialogues]
                          newDialogues[index] = e.target.value
                          setRequiredDialogues(newDialogues)
                        }}
                        placeholder={`필수 대사 ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRequiredDialogues(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRequiredDialogues(prev => [...prev, ''])}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" /> 추가
                  </Button>
                </CardContent>
              </Card>

              {/* Required Scenes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">필수 촬영장면</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {requiredScenes.map((scene, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={scene}
                        onChange={(e) => {
                          const newScenes = [...requiredScenes]
                          newScenes[index] = e.target.value
                          setRequiredScenes(newScenes)
                        }}
                        placeholder={`필수 장면 ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRequiredScenes(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRequiredScenes(prev => [...prev, ''])}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" /> 추가
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right: Scene Editor (2 columns) */}
            <div className="lg:col-span-2 space-y-4">
              {/* AI Auto-Generate Button */}
              <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">AI 가이드 자동 작성</span>
                  <span className="text-sm text-purple-700">- 캠페인 정보 기반 10개 씬 생성</span>
                </div>
                <Button
                  onClick={handleAutoGenerate}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI 자동 작성
                    </>
                  )}
                </Button>
              </div>

              {/* Translation Button */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">AI {targetLanguageLabel} 번역</span>
                  <span className="text-sm text-blue-700">- 모든 씬을 자동으로 번역합니다</span>
                </div>
                <Button
                  onClick={handleTranslateAll}
                  disabled={translating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {translating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      번역 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {targetLanguageLabel}로 번역
                    </>
                  )}
                </Button>
              </div>

              {/* Scenes List */}
              <div className="space-y-4">
                {scenes.map((scene, index) => (
                  <Card key={index} className="border-2 hover:border-purple-300 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {scene.order}
                          </span>
                          씬 {scene.order}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Input
                            value={scene.scene_type}
                            onChange={(e) => handleSceneChange(index, 'scene_type', e.target.value)}
                            placeholder="씬 타입 (예: 인트로, 제품 소개)"
                            className="w-40"
                          />
                          {scenes.length > 5 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeScene(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Scene Description - Side by side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">촬영장면 (한국어)</Label>
                          <Textarea
                            value={scene.scene_description}
                            onChange={(e) => handleSceneChange(index, 'scene_description', e.target.value)}
                            placeholder="이 씬에서 촬영해야 할 장면을 설명하세요"
                            rows={3}
                            className="mt-1 resize-none"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-blue-700">촬영장면 ({targetLanguageLabel})</Label>
                          <Textarea
                            value={scene.scene_description_translated}
                            onChange={(e) => handleSceneChange(index, 'scene_description_translated', e.target.value)}
                            placeholder={`${targetLanguageLabel} 번역이 여기에 표시됩니다`}
                            rows={3}
                            className="mt-1 resize-none bg-blue-50 border-blue-200"
                          />
                        </div>
                      </div>

                      {/* Dialogue - Side by side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">대사 (한국어)</Label>
                          <Textarea
                            value={scene.dialogue}
                            onChange={(e) => handleSceneChange(index, 'dialogue', e.target.value)}
                            placeholder="크리에이터가 말해야 할 대사를 입력하세요"
                            rows={3}
                            className="mt-1 resize-none"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-blue-700">대사 ({targetLanguageLabel})</Label>
                          <Textarea
                            value={scene.dialogue_translated}
                            onChange={(e) => handleSceneChange(index, 'dialogue_translated', e.target.value)}
                            placeholder={`${targetLanguageLabel} 번역이 여기에 표시됩니다`}
                            rows={3}
                            className="mt-1 resize-none bg-blue-50 border-blue-200"
                          />
                        </div>
                      </div>

                      {/* Shooting Tip - Side by side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">촬영 팁 (한국어)</Label>
                          <Input
                            value={scene.shooting_tip}
                            onChange={(e) => handleSceneChange(index, 'shooting_tip', e.target.value)}
                            placeholder="촬영 팁 (선택사항)"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-blue-700">촬영 팁 ({targetLanguageLabel})</Label>
                          <Input
                            value={scene.shooting_tip_translated}
                            onChange={(e) => handleSceneChange(index, 'shooting_tip_translated', e.target.value)}
                            placeholder={`${targetLanguageLabel} 번역`}
                            className="mt-1 bg-blue-50 border-blue-200"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Add Scene Button */}
                <Button
                  variant="outline"
                  onClick={addScene}
                  className="w-full py-6 border-2 border-dashed"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  씬 추가 ({scenes.length}/15)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
