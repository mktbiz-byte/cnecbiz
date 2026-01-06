import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
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
import AdminNavigation from './AdminNavigation'

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

export default function CreatorSceneGuideEditor() {
  const navigate = useNavigate()
  const { id: campaignId } = useParams()
  const [searchParams] = useSearchParams()
  const applicationId = searchParams.get('applicationId')
  const region = searchParams.get('region') || 'us'

  const supabase = getSupabaseClient(region)

  // Data
  const [campaign, setCampaign] = useState(null)
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      if (campaignData.required_dialogues && Array.isArray(campaignData.required_dialogues)) {
        setRequiredDialogues(campaignData.required_dialogues)
      }
      if (campaignData.required_scenes && Array.isArray(campaignData.required_scenes)) {
        setRequiredScenes(campaignData.required_scenes)
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

  // AI Translation
  const handleTranslateAll = async () => {
    setTranslating(true)
    setError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')

      const targetLang = region === 'japan' ? '일본어' : '영어'

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

      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('번역 결과를 파싱할 수 없습니다.')

      const translations = JSON.parse(jsonMatch[0])

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

      const { error } = await supabase
        .from('applications')
        .update({
          personalized_guide: guideData,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error

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
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
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
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/campaigns/${campaignId}?region=${region}`)}
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
