import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { generateGuide, translateGuide } from '../lib/geminiService'
import { Loader2, Sparkles, Languages, Save, Send, FileText } from 'lucide-react'

export default function GuideEditorPage() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('ko')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Guide content for each language
  const [guides, setGuides] = useState({
    ko: null,  // Korean (original)
    ja: null,  // Japanese
    en: null,  // English
    'zh-TW': null  // Traditional Chinese
  })

  // Mock data - 실제로는 Supabase에서 가져와야 함
  const creatorData = {
    platform: 'youtube',
    channel_name: '뷰티유튜버김지수',
    content_style: '자연스러운 일상 브이로그, 솔직한 리뷰'
  }

  const campaignData = {
    brand_name: '뷰티브랜드',
    product_name: '수분크림',
    product_url: 'https://example.com/product',
    brand_identity: '자연주의, 친환경, 20-30대 여성',
    required_dialogue: '이 제품은 100% 천연 성분으로 만들어졌습니다',
    required_scenes: '제품 패키징 클로즈업, 제품 사용 장면',
    product_description: '민감성 피부를 위한 저자극 수분크림',
    guidelines: '과도한 홍보성 표현 자제, 솔직한 후기 중심'
  }

  const evaluation = {
    strengths: ['높은 참여율', '타겟 오디언스 일치']
  }

  // Generate initial guide
  useEffect(() => {
    handleGenerateGuide()
  }, [])

  const handleGenerateGuide = async () => {
    setError('')
    setLoading(true)

    try {
      const guide = await generateGuide(creatorData, campaignData, evaluation)
      setGuides(prev => ({ ...prev, ko: guide }))
      setSuccess('AI 가이드가 생성되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error generating guide:', err)
      setError('가이드 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleTranslate = async (targetLang) => {
    if (!guides.ko) {
      setError('먼저 한국어 가이드를 생성해주세요.')
      return
    }

    setError('')
    setTranslating(true)

    try {
      const translated = await translateGuide(guides.ko, targetLang)
      setGuides(prev => ({ ...prev, [targetLang]: translated }))
      setCurrentLanguage(targetLang)
      setSuccess(`${getLanguageName(targetLang)} 번역이 완료되었습니다!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error translating guide:', err)
      setError('번역 중 오류가 발생했습니다.')
    } finally {
      setTranslating(false)
    }
  }

  const handleTranslateAll = async () => {
    if (!guides.ko) {
      setError('먼저 한국어 가이드를 생성해주세요.')
      return
    }

    setError('')
    setTranslating(true)

    try {
      const languages = ['ja', 'en', 'zh-TW']
      const translations = await Promise.all(
        languages.map(lang => translateGuide(guides.ko, lang))
      )

      setGuides(prev => ({
        ...prev,
        ja: translations[0],
        en: translations[1],
        'zh-TW': translations[2]
      }))

      setSuccess('모든 언어로 번역이 완료되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error translating all:', err)
      setError('번역 중 오류가 발생했습니다.')
    } finally {
      setTranslating(false)
    }
  }

  const handleSave = () => {
    // Save to Supabase
    setSuccess('가이드가 저장되었습니다!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSendToCreator = () => {
    // Send guide to creator
    setSuccess('크리에이터에게 가이드가 전송되었습니다!')
    setTimeout(() => {
      navigate('/dashboard')
    }, 2000)
  }

  const handleFieldChange = (field, value) => {
    setGuides(prev => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        [field]: value
      }
    }))
  }

  const handleArrayFieldChange = (field, index, subfield, value) => {
    setGuides(prev => {
      const newArray = [...prev[currentLanguage][field]]
      if (subfield) {
        newArray[index] = { ...newArray[index], [subfield]: value }
      } else {
        newArray[index] = value
      }
      return {
        ...prev,
        [currentLanguage]: {
          ...prev[currentLanguage],
          [field]: newArray
        }
      }
    })
  }

  const getLanguageName = (code) => {
    const names = {
      ko: '한국어',
      ja: '일본어',
      en: '영어',
      'zh-TW': '중국어(번체)'
    }
    return names[code]
  }

  const currentGuide = guides[currentLanguage]

  if (loading && !currentGuide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600">AI가 가이드를 생성하고 있습니다...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                AI 가이드 편집기
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                AI가 생성한 가이드를 검토하고 수정하세요
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                저장
              </Button>
              <Button onClick={handleSendToCreator}>
                <Send className="mr-2 h-4 w-4" />
                크리에이터에게 전송
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Language Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  언어 선택
                </CardTitle>
                <CardDescription>
                  각 지역별 언어로 가이드를 확인하고 수정할 수 있습니다
                </CardDescription>
              </div>
              <Button 
                onClick={handleTranslateAll} 
                disabled={translating || !guides.ko}
                variant="outline"
              >
                {translating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    번역 중...
                  </>
                ) : (
                  <>
                    <Languages className="mr-2 h-4 w-4" />
                    전체 언어 번역
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={currentLanguage} onValueChange={setCurrentLanguage}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="ko" className="text-base">
                  🇰🇷 한국어 {guides.ko && '✓'}
                </TabsTrigger>
                <TabsTrigger value="ja" className="text-base">
                  🇯🇵 일본어 {guides.ja && '✓'}
                </TabsTrigger>
                <TabsTrigger value="en" className="text-base">
                  🇺🇸 영어 {guides.en && '✓'}
                </TabsTrigger>
                <TabsTrigger value="zh-TW" className="text-base">
                  🇹🇼 중국어(번체) {guides['zh-TW'] && '✓'}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {currentLanguage !== 'ko' && !guides[currentLanguage] && (
              <div className="mt-4">
                <Button 
                  onClick={() => handleTranslate(currentLanguage)}
                  disabled={translating}
                  className="w-full"
                >
                  {translating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      번역 중...
                    </>
                  ) : (
                    <>
                      <Languages className="mr-2 h-4 w-4" />
                      {getLanguageName(currentLanguage)}로 번역
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Guide Content */}
        {currentGuide && (
          <div className="space-y-6">
            {/* Title & Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">캠페인 개요</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">캠페인 제목</Label>
                  <Input
                    value={currentGuide.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="text-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">캠페인 개요</Label>
                  <Textarea
                    value={currentGuide.overview || ''}
                    onChange={(e) => handleFieldChange('overview', e.target.value)}
                    rows={3}
                    className="text-base leading-relaxed"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">캠페인 목표</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentGuide.objectives?.map((obj, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold mt-1">{index + 1}.</span>
                      <Input
                        value={obj}
                        onChange={(e) => handleArrayFieldChange('objectives', index, null, e.target.value)}
                        className="flex-1 text-base"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Script Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">대사 제안</CardTitle>
                <CardDescription>
                  타임라인별 추천 대사와 연출 팁입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {currentGuide.script_suggestions?.map((script, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-600">타이밍</Label>
                        <Input
                          value={script.timing}
                          onChange={(e) => handleArrayFieldChange('script_suggestions', index, 'timing', e.target.value)}
                          className="font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-600">추천 대사</Label>
                        <Textarea
                          value={script.dialogue}
                          onChange={(e) => handleArrayFieldChange('script_suggestions', index, 'dialogue', e.target.value)}
                          rows={2}
                          className="text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-600">연출 팁</Label>
                        <Input
                          value={script.notes}
                          onChange={(e) => handleArrayFieldChange('script_suggestions', index, 'notes', e.target.value)}
                          className="text-sm text-gray-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Required Elements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">필수 요소</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">반드시 언급해야 할 내용</Label>
                  {currentGuide.required_elements?.must_say?.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">•</span>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newMustSay = [...currentGuide.required_elements.must_say]
                          newMustSay[index] = e.target.value
                          handleFieldChange('required_elements', {
                            ...currentGuide.required_elements,
                            must_say: newMustSay
                          })
                        }}
                        className="flex-1 text-base"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">반드시 촬영해야 할 장면</Label>
                  {currentGuide.required_elements?.must_show?.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">•</span>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newMustShow = [...currentGuide.required_elements.must_show]
                          newMustShow[index] = e.target.value
                          handleFieldChange('required_elements', {
                            ...currentGuide.required_elements,
                            must_show: newMustShow
                          })
                        }}
                        className="flex-1 text-base"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Do's and Don'ts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">주의사항</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-green-700">✅ 해야 할 것</Label>
                  {currentGuide.dos_and_donts?.dos?.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-green-500 mt-1">•</span>
                      <Textarea
                        value={item}
                        onChange={(e) => {
                          const newDos = [...currentGuide.dos_and_donts.dos]
                          newDos[index] = e.target.value
                          handleFieldChange('dos_and_donts', {
                            ...currentGuide.dos_and_donts,
                            dos: newDos
                          })
                        }}
                        rows={2}
                        className="flex-1 text-base"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold text-red-700">❌ 하지 말아야 할 것</Label>
                  {currentGuide.dos_and_donts?.donts?.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">•</span>
                      <Textarea
                        value={item}
                        onChange={(e) => {
                          const newDonts = [...currentGuide.dos_and_donts.donts]
                          newDonts[index] = e.target.value
                          handleFieldChange('dos_and_donts', {
                            ...currentGuide.dos_and_donts,
                            donts: newDonts
                          })
                        }}
                        rows={2}
                        className="flex-1 text-base"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Technical Specs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">기술 사양</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">영상 길이</Label>
                  <Input
                    value={currentGuide.technical_specs?.video_length || ''}
                    onChange={(e) => handleFieldChange('technical_specs', {
                      ...currentGuide.technical_specs,
                      video_length: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">화면 비율</Label>
                  <Input
                    value={currentGuide.technical_specs?.aspect_ratio || ''}
                    onChange={(e) => handleFieldChange('technical_specs', {
                      ...currentGuide.technical_specs,
                      aspect_ratio: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">해상도</Label>
                  <Input
                    value={currentGuide.technical_specs?.resolution || ''}
                    onChange={(e) => handleFieldChange('technical_specs', {
                      ...currentGuide.technical_specs,
                      resolution: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">파일 형식</Label>
                  <Input
                    value={currentGuide.technical_specs?.format || ''}
                    onChange={(e) => handleFieldChange('technical_specs', {
                      ...currentGuide.technical_specs,
                      format: e.target.value
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  추가 팁
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentGuide.tips?.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-yellow-500 mt-1">•</span>
                      <Textarea
                        value={tip}
                        onChange={(e) => handleArrayFieldChange('tips', index, null, e.target.value)}
                        rows={2}
                        className="flex-1 text-base"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 sticky bottom-6">
              <Button 
                onClick={handleSave}
                variant="outline"
                className="flex-1 h-12 text-base"
                size="lg"
              >
                <Save className="mr-2 h-5 w-5" />
                저장
              </Button>
              <Button 
                onClick={handleSendToCreator}
                className="flex-1 h-12 text-base"
                size="lg"
              >
                <Send className="mr-2 h-5 w-5" />
                크리에이터에게 전송
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

