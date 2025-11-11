import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { X, Plus } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

const CampaignGuideJapan = () => {
  const supabase = getSupabaseClient('japan')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)

  // 가이드 상세 필드
  const [requiredDialogues, setRequiredDialogues] = useState([''])
  const [requiredScenes, setRequiredScenes] = useState([''])
  const [requiredHashtags, setRequiredHashtags] = useState([''])
  const [videoDuration, setVideoDuration] = useState('')
  const [videoTempo, setVideoTempo] = useState('')
  const [videoTone, setVideoTone] = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')

  // 필수 촬영 장면 체크박스
  const [shootingScenes, setShootingScenes] = useState({
    baPhoto: false,
    noMakeup: false,
    closeup: false,
    productCloseup: false,
    productTexture: false,
    outdoor: false,
    couple: false,
    child: false,
    troubledSkin: false,
    wrinkles: false
  })

  // 추가 요청사항
  const [additionalShootingRequests, setAdditionalShootingRequests] = useState('')

  // 메타광고코드 발급 요청
  const [metaAdCodeRequested, setMetaAdCodeRequested] = useState(false)

  // 일본어 번역 미리보기
  const [translatedDialogues, setTranslatedDialogues] = useState([])
  const [translatedScenes, setTranslatedScenes] = useState([])
  const [translatedHashtags, setTranslatedHashtags] = useState([])
  const [translatedDuration, setTranslatedDuration] = useState('')
  const [translatedTempo, setTranslatedTempo] = useState('')
  const [translatedTone, setTranslatedTone] = useState('')
  const [translatedAdditionalDetails, setTranslatedAdditionalDetails] = useState('')
  const [translatedShootingRequests, setTranslatedShootingRequests] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')

  // 캠페인 정보 및 가이드 로드
  useEffect(() => {
    if (campaignId) {
      loadCampaignGuide()
    }
  }, [campaignId])

  // 자동 저장 (10초마다)
  useEffect(() => {
    if (!campaignId) return

    const timer = setTimeout(() => {
      autoSaveGuide()
    }, 10000)

    return () => clearTimeout(timer)
  }, [requiredDialogues, requiredScenes, requiredHashtags, videoDuration, videoTempo, videoTone, additionalDetails, shootingScenes, additionalShootingRequests, metaAdCodeRequested, campaignId])

  const loadCampaignGuide = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          title, 
          required_dialogues, 
          required_scenes, 
          required_hashtags, 
          video_duration, 
          video_tempo, 
          video_tone, 
          additional_details,
          shooting_scenes_ba_photo,
          shooting_scenes_no_makeup,
          shooting_scenes_closeup,
          shooting_scenes_product_closeup,
          shooting_scenes_product_texture,
          shooting_scenes_outdoor,
          shooting_scenes_couple,
          shooting_scenes_child,
          shooting_scenes_troubled_skin,
          shooting_scenes_wrinkles,
          additional_shooting_requests,
          meta_ad_code_requested
        `)
        .eq('id', campaignId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignTitle(data.title)
        setRequiredDialogues(data.required_dialogues || [''])
        setRequiredScenes(data.required_scenes || [''])
        setRequiredHashtags(data.required_hashtags || [''])
        setVideoDuration(data.video_duration || '')
        setVideoTempo(data.video_tempo || '')
        setVideoTone(data.video_tone || '')
        setAdditionalDetails(data.additional_details || '')
        setShootingScenes({
          baPhoto: data.shooting_scenes_ba_photo || false,
          noMakeup: data.shooting_scenes_no_makeup || false,
          closeup: data.shooting_scenes_closeup || false,
          productCloseup: data.shooting_scenes_product_closeup || false,
          productTexture: data.shooting_scenes_product_texture || false,
          outdoor: data.shooting_scenes_outdoor || false,
          couple: data.shooting_scenes_couple || false,
          child: data.shooting_scenes_child || false,
          troubledSkin: data.shooting_scenes_troubled_skin || false,
          wrinkles: data.shooting_scenes_wrinkles || false
        })
        setAdditionalShootingRequests(data.additional_shooting_requests || '')
        setMetaAdCodeRequested(data.meta_ad_code_requested || false)
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      setError('캠페인 정보를 불러오는데 실패했습니다.')
    }
  }

  const autoSaveGuide = async () => {
    setAutoSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          required_dialogues: requiredDialogues.filter(d => d.trim()),
          required_scenes: requiredScenes.filter(s => s.trim()),
          required_hashtags: requiredHashtags.filter(h => h.trim()),
          video_duration: videoDuration,
          video_tempo: videoTempo,
          video_tone: videoTone,
          additional_details: additionalDetails,
          shooting_scenes_ba_photo: shootingScenes.baPhoto,
          shooting_scenes_no_makeup: shootingScenes.noMakeup,
          shooting_scenes_closeup: shootingScenes.closeup,
          shooting_scenes_product_closeup: shootingScenes.productCloseup,
          shooting_scenes_product_texture: shootingScenes.productTexture,
          shooting_scenes_outdoor: shootingScenes.outdoor,
          shooting_scenes_couple: shootingScenes.couple,
          shooting_scenes_child: shootingScenes.child,
          shooting_scenes_troubled_skin: shootingScenes.troubledSkin,
          shooting_scenes_wrinkles: shootingScenes.wrinkles,
          additional_shooting_requests: additionalShootingRequests,
          meta_ad_code_requested: metaAdCodeRequested
        })
        .eq('id', campaignId)

      if (error) throw error
    } catch (err) {
      console.error('자동 저장 실패:', err)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          required_dialogues: requiredDialogues.filter(d => d.trim()),
          required_scenes: requiredScenes.filter(s => s.trim()),
          required_hashtags: requiredHashtags.filter(h => h.trim()),
          video_duration: videoDuration,
          video_tempo: videoTempo,
          video_tone: videoTone,
          additional_details: additionalDetails,
          shooting_scenes_ba_photo: shootingScenes.baPhoto,
          shooting_scenes_no_makeup: shootingScenes.noMakeup,
          shooting_scenes_closeup: shootingScenes.closeup,
          shooting_scenes_product_closeup: shootingScenes.productCloseup,
          shooting_scenes_product_texture: shootingScenes.productTexture,
          shooting_scenes_outdoor: shootingScenes.outdoor,
          shooting_scenes_couple: shootingScenes.couple,
          shooting_scenes_child: shootingScenes.child,
          shooting_scenes_troubled_skin: shootingScenes.troubledSkin,
          shooting_scenes_wrinkles: shootingScenes.wrinkles,
          additional_shooting_requests: additionalShootingRequests,
          meta_ad_code_requested: metaAdCodeRequested
        })
        .eq('id', campaignId)

      if (error) throw error

      setSuccess('크리에이터 가이드가 저장되었습니다!')
      setTimeout(() => {
        navigate(`/company/campaigns/${campaignId}/review`)
      }, 1500)
    } catch (err) {
      console.error('가이드 저장 실패:', err)
      setError('가이드 저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleSkip = () => {
    navigate('/company/campaigns')
  }

  // 일괄 번역 함수
  const handleBatchTranslate = async () => {
    setIsTranslating(true)
    setTranslationError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다.')
      }

      // 번역할 필드 준비
      const fieldsToTranslate = []
      
      // 필수 대사
      requiredDialogues.filter(d => d.trim()).forEach((dialogue, idx) => {
        fieldsToTranslate.push({ key: `dialogue${idx}`, label: `필수대사${idx + 1}`, value: dialogue })
      })
      
      // 필수 장면
      requiredScenes.filter(s => s.trim()).forEach((scene, idx) => {
        fieldsToTranslate.push({ key: `scene${idx}`, label: `필수장면${idx + 1}`, value: scene })
      })
      
      // 필수 해시태그
      requiredHashtags.filter(h => h.trim()).forEach((hashtag, idx) => {
        fieldsToTranslate.push({ key: `hashtag${idx}`, label: `필수해시태그${idx + 1}`, value: hashtag })
      })
      
      // 기타 필드
      if (videoDuration.trim()) fieldsToTranslate.push({ key: 'duration', label: '영상시간', value: videoDuration })
      if (videoTempo.trim()) fieldsToTranslate.push({ key: 'tempo', label: '영상템포', value: videoTempo })
      if (videoTone.trim()) fieldsToTranslate.push({ key: 'tone', label: '영상톤', value: videoTone })
      if (additionalDetails.trim()) fieldsToTranslate.push({ key: 'additional', label: '추가전달사항', value: additionalDetails })
      if (additionalShootingRequests.trim()) fieldsToTranslate.push({ key: 'shooting', label: '추가촬영요청', value: additionalShootingRequests })

      if (fieldsToTranslate.length === 0) {
        throw new Error('번역할 내용이 없습니다.')
      }

      const textToTranslate = fieldsToTranslate.map(f => `[${f.label}]\n${f.value}`).join('\n\n')

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `다음 한국어 캠페인 가이드 정보를 일본어로 자연스럽게 번역해주세요. 각 필드별로 [필수대사1], [필수장면1], [필수해시태그1] 등의 형식을 유지하고, 번역 결과만 출력하세요:\n\n${textToTranslate}` 
              }] 
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const translatedText = data.candidates[0]?.content?.parts[0]?.text || '번역 실패'

      console.log('=== 일괄 번역 결과 ====')
      console.log('원본:', textToTranslate)
      console.log('번역:', translatedText)

      // 번역 결과 파싱
      const cleanText = translatedText.replace(/\*\*/g, '')
      
      // 필수 대사 파싱
      const newTranslatedDialogues = []
      requiredDialogues.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[(필수대사${idx + 1}|必須セリフ${idx + 1})\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedDialogues.push(match[2].trim())
      })
      
      // 필수 장면 파싱
      const newTranslatedScenes = []
      requiredScenes.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[(필수장면${idx + 1}|必須シーン${idx + 1})\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedScenes.push(match[2].trim())
      })
      
      // 필수 해시태그 파싱
      const newTranslatedHashtags = []
      requiredHashtags.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[(필수해시태그${idx + 1}|必須ハッシュタグ${idx + 1})\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedHashtags.push(match[2].trim())
      })
      
      // 기타 필드 파싱
      const durationMatch = cleanText.match(/\[(영상시간|希望動画時間)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const tempoMatch = cleanText.match(/\[(영상템포|動画テンポ)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const toneMatch = cleanText.match(/\[(영상톤|動画トーン)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const additionalMatch = cleanText.match(/\[(추가전달사항|追加伝達事項)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const shootingMatch = cleanText.match(/\[(추가촬영요청|追加撮影リクエスト)\]\s*([\s\S]*?)(?=\n\[|$)/)

      setTranslatedDialogues(newTranslatedDialogues)
      setTranslatedScenes(newTranslatedScenes)
      setTranslatedHashtags(newTranslatedHashtags)
      setTranslatedDuration(durationMatch ? durationMatch[2].trim() : '')
      setTranslatedTempo(tempoMatch ? tempoMatch[2].trim() : '')
      setTranslatedTone(toneMatch ? toneMatch[2].trim() : '')
      setTranslatedAdditionalDetails(additionalMatch ? additionalMatch[2].trim() : '')
      setTranslatedShootingRequests(shootingMatch ? shootingMatch[2].trim() : '')

      setSuccess('일괄 번역이 완료되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('일괄 번역 오류:', error)
      setTranslationError(error.message || '일괄 번역 중 오류가 발생했습니다.')
    } finally {
      setIsTranslating(false)
    }
  }

  // 배열 필드 추가/삭제 함수
  const addDialogue = () => setRequiredDialogues([...requiredDialogues, ''])
  const removeDialogue = (index) => setRequiredDialogues(requiredDialogues.filter((_, i) => i !== index))
  const updateDialogue = (index, value) => {
    const newDialogues = [...requiredDialogues]
    newDialogues[index] = value
    setRequiredDialogues(newDialogues)
  }

  const addScene = () => setRequiredScenes([...requiredScenes, ''])
  const removeScene = (index) => setRequiredScenes(requiredScenes.filter((_, i) => i !== index))
  const updateScene = (index, value) => {
    const newScenes = [...requiredScenes]
    newScenes[index] = value
    setRequiredScenes(newScenes)
  }

  const addHashtag = () => setRequiredHashtags([...requiredHashtags, ''])
  const removeHashtag = (index) => setRequiredHashtags(requiredHashtags.filter((_, i) => i !== index))
  const updateHashtag = (index, value) => {
    const newHashtags = [...requiredHashtags]
    newHashtags[index] = value
    setRequiredHashtags(newHashtags)
  }

  // 촬영 장면 체크박스 변경 함수
  const handleShootingSceneChange = (scene, checked) => {
    setShootingScenes(prev => ({
      ...prev,
      [scene]: checked
    }))
  }

  return (
    <>
      <CompanyNavigation />
      <div className="container mx-auto p-6 max-w-7xl">
        {/* 일괄 번역 버튼 */}
        <div className="mb-4 flex justify-end">
          <Button 
            onClick={handleBatchTranslate} 
            disabled={isTranslating}
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100"
          >
            {isTranslating ? '번역 중...' : '일괄 번역 (한국어 → 일본어)'}
          </Button>
        </div>

        {translationError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {translationError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 한국어 입력 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">크리에이터 가이드 작성 (한국어)</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                {campaignTitle && <span className="font-semibold">{campaignTitle}</span>}
              </p>
              {autoSaving && (
                <p className="text-xs text-blue-600 mt-1">자동 저장 중...</p>
              )}
            </CardHeader>

        <CardContent className="space-y-6">
          {/* 필수 대사 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">필수 대사</Label>
              <Button type="button" size="sm" variant="outline" onClick={addDialogue}>
                <Plus className="w-4 h-4 mr-1" /> 추가
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">크리에이터가 꼭 말해야 하는 대사를 입력하세요</p>
            {requiredDialogues.map((dialogue, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={dialogue}
                  onChange={(e) => updateDialogue(index, e.target.value)}
                  placeholder={`필수 대사 ${index + 1}`}
                  className="flex-1"
                />
                {requiredDialogues.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeDialogue(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 필수 장면 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">필수 장면</Label>
              <Button type="button" size="sm" variant="outline" onClick={addScene}>
                <Plus className="w-4 h-4 mr-1" /> 추가
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">영상에 꼭 포함되어야 하는 장면을 설명하세요</p>
            {requiredScenes.map((scene, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={scene}
                  onChange={(e) => updateScene(index, e.target.value)}
                  placeholder={`필수 장면 ${index + 1} (예: 제품 클로즈업 촬영)`}
                  className="flex-1"
                />
                {requiredScenes.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeScene(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 필수 촬영 장면 체크박스 */}
          <div>
            <Label className="text-base font-semibold mb-3 block">필수 촬영 장면</Label>
            <p className="text-sm text-gray-600 mb-3">필요한 촬영 장면을 선택하세요</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ba-photo" 
                  checked={shootingScenes.baPhoto}
                  onCheckedChange={(checked) => handleShootingSceneChange('baPhoto', checked)}
                />
                <label htmlFor="ba-photo" className="text-sm cursor-pointer">
                  확실한 B&A 촬영
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="no-makeup" 
                  checked={shootingScenes.noMakeup}
                  onCheckedChange={(checked) => handleShootingSceneChange('noMakeup', checked)}
                />
                <label htmlFor="no-makeup" className="text-sm cursor-pointer">
                  노메이크업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="closeup" 
                  checked={shootingScenes.closeup}
                  onCheckedChange={(checked) => handleShootingSceneChange('closeup', checked)}
                />
                <label htmlFor="closeup" className="text-sm cursor-pointer">
                  클로즈업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="product-closeup" 
                  checked={shootingScenes.productCloseup}
                  onCheckedChange={(checked) => handleShootingSceneChange('productCloseup', checked)}
                />
                <label htmlFor="product-closeup" className="text-sm cursor-pointer">
                  제품 클로즈업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="product-texture" 
                  checked={shootingScenes.productTexture}
                  onCheckedChange={(checked) => handleShootingSceneChange('productTexture', checked)}
                />
                <label htmlFor="product-texture" className="text-sm cursor-pointer">
                  제품 제형 클로즈업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="outdoor" 
                  checked={shootingScenes.outdoor}
                  onCheckedChange={(checked) => handleShootingSceneChange('outdoor', checked)}
                />
                <label htmlFor="outdoor" className="text-sm cursor-pointer">
                  외부촬영(카페, 외출 등)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="couple" 
                  checked={shootingScenes.couple}
                  onCheckedChange={(checked) => handleShootingSceneChange('couple', checked)}
                />
                <label htmlFor="couple" className="text-sm cursor-pointer">
                  커플출연
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="child" 
                  checked={shootingScenes.child}
                  onCheckedChange={(checked) => handleShootingSceneChange('child', checked)}
                />
                <label htmlFor="child" className="text-sm cursor-pointer">
                  아이출연
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="troubled-skin" 
                  checked={shootingScenes.troubledSkin}
                  onCheckedChange={(checked) => handleShootingSceneChange('troubledSkin', checked)}
                />
                <label htmlFor="troubled-skin" className="text-sm cursor-pointer">
                  트러블 피부 노출
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="wrinkles" 
                  checked={shootingScenes.wrinkles}
                  onCheckedChange={(checked) => handleShootingSceneChange('wrinkles', checked)}
                />
                <label htmlFor="wrinkles" className="text-sm cursor-pointer">
                  피부 주름 노출
                </label>
              </div>
            </div>
          </div>

          {/* 추가 촬영 요청사항 */}
          <div>
            <Label className="text-base font-semibold">추가 촬영 요청사항</Label>
            <p className="text-sm text-gray-600 mb-2">위 항목 외에 추가로 요청하고 싶은 촬영 장면이나 요구사항을 작성하세요</p>
            <Textarea
              value={additionalShootingRequests}
              onChange={(e) => setAdditionalShootingRequests(e.target.value)}
              placeholder="예: 자연광에서 촬영해주세요, 밝은 배경에서 촬영 부탁드립니다"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 필수 해시태그 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">필수 해시태그</Label>
              <Button type="button" size="sm" variant="outline" onClick={addHashtag}>
                <Plus className="w-4 h-4 mr-1" /> 추가
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">게시물에 꼭 포함해야 하는 해시태그를 입력하세요</p>
            {requiredHashtags.map((hashtag, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={hashtag}
                  onChange={(e) => updateHashtag(index, e.target.value)}
                  placeholder={`#해시태그${index + 1}`}
                  className="flex-1"
                />
                {requiredHashtags.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeHashtag(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 원하는 영상 시간 */}
          <div>
            <Label className="text-base font-semibold">원하는 영상 시간</Label>
            <Select value={videoDuration} onValueChange={setVideoDuration}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 시간을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="15sec">15초</SelectItem>
                <SelectItem value="30sec">30초</SelectItem>
                <SelectItem value="45sec">45초</SelectItem>
                <SelectItem value="1min">1분</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 영상 템포 */}
          <div>
            <Label className="text-base font-semibold">영상 템포</Label>
            <Select value={videoTempo} onValueChange={setVideoTempo}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 템포를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="fast">빠름 (역동적, 빠른 편집)</SelectItem>
                <SelectItem value="normal">보통 (자연스러운 속도)</SelectItem>
                <SelectItem value="slow">느림 (차분하고 여유로운)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 영상 톤앤매너 */}
          <div>
            <Label className="text-base font-semibold">영상 톤앤매너</Label>
            <Select value={videoTone} onValueChange={setVideoTone}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 분위기를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="bright">밝고 경쾌한</SelectItem>
                <SelectItem value="calm">차분하고 진지한</SelectItem>
                <SelectItem value="emotional">감성적인</SelectItem>
                <SelectItem value="humorous">유머러스한</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 기타 디테일 요청사항 */}
          <div>
            <Label className="text-base font-semibold">기타 디테일 요청사항</Label>
            <p className="text-sm text-gray-600 mb-2">추가로 요청하고 싶은 사항을 자유롭게 작성하세요</p>
            <Textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="예: 밝은 조명에서 촬영해주세요, 배경 음악은 경쾌한 느낌으로 부탁드립니다"
              rows={5}
              className="resize-none"
            />
          </div>

          {/* 메타광고코드 발급 요청 */}
          <div className="border-t pt-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="meta-ad-code" 
                checked={metaAdCodeRequested}
                onCheckedChange={setMetaAdCodeRequested}
              />
              <label htmlFor="meta-ad-code" className="text-base font-semibold cursor-pointer">
                메타광고코드 발급 요청
              </label>
            </div>
            <p className="text-sm text-gray-600 mt-2 ml-6">
              체크하시면 메타(Facebook/Instagram) 광고 코드를 발급해드립니다
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={processing}
              className="flex-1"
            >
              {processing ? '저장 중...' : '저장하고 완료'}
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              disabled={processing}
            >
              나중에 작성
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            작성 중인 내용은 10초마다 자동으로 저장됩니다
          </p>
        </CardContent>
      </Card>

      {/* 오른쪽: 일본어 번역 미리보기 */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardTitle className="text-3xl font-bold">🎬 クリエイターガイド</CardTitle>
          <p className="text-sm text-blue-100 mt-2">
            {campaignTitle || 'キャンペーンタイトル'}
          </p>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          {/* 필수 대사 미리보기 */}
          {translatedDialogues.length > 0 && (
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💬</span>
                <Label className="text-xl font-bold text-gray-800">必須セリフ</Label>
              </div>
              <div className="space-y-3">
                {translatedDialogues.map((dialogue, index) => (
                  <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                      <p className="text-base text-gray-800 leading-relaxed">{dialogue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필수 장면 미리보기 */}
          {translatedScenes.length > 0 && (
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎥</span>
                <Label className="text-xl font-bold text-gray-800">必須シーン</Label>
              </div>
              <div className="space-y-3">
                {translatedScenes.map((scene, index) => (
                  <div key={index} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                      <p className="text-base text-gray-800 leading-relaxed">{scene}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필수 해시태그 미리보기 */}
          {translatedHashtags.length > 0 && (
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">#️⃣</span>
                <Label className="text-xl font-bold text-gray-800">必須ハッシュタグ</Label>
              </div>
              <div className="flex flex-wrap gap-3">
                {translatedHashtags.map((hashtag, index) => (
                  <span key={index} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-semibold shadow-md">
                    {hashtag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 영상 정보 미리보기 */}
          {(translatedDuration || translatedTempo || translatedTone) && (
            <div className="border-l-4 border-orange-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎬</span>
                <Label className="text-xl font-bold text-gray-800">動画仕様</Label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {translatedDuration && (
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600 mb-2">希望時間</p>
                    <p className="text-lg font-bold text-orange-700">{translatedDuration}</p>
                  </div>
                )}
                {translatedTempo && (
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600 mb-2">テンポ</p>
                    <p className="text-lg font-bold text-orange-700">{translatedTempo}</p>
                  </div>
                )}
                {translatedTone && (
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600 mb-2">トーン</p>
                    <p className="text-lg font-bold text-orange-700">{translatedTone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 추가 전달사항 미리보기 */}
          {translatedAdditionalDetails && (
            <div className="border-l-4 border-yellow-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📝</span>
                <Label className="text-xl font-bold text-gray-800">追加伝達事項</Label>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{translatedAdditionalDetails}</p>
              </div>
            </div>
          )}

          {/* 추가 촬영 요청 미리보기 */}
          {translatedShootingRequests && (
            <div className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📸</span>
                <Label className="text-xl font-bold text-gray-800">追加撮影リクエスト</Label>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{translatedShootingRequests}</p>
              </div>
            </div>
          )}

          {translatedDialogues.length === 0 && translatedScenes.length === 0 && !translatedDuration && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg text-gray-500 mb-2">ガイドを作成してください</p>
              <p className="text-sm text-gray-400">左側に韓国語で入力後、「一括翻訳」ボタンをクリックしてください</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
    </>
  )
}

export default CampaignGuideJapan
