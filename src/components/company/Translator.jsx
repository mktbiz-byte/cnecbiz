import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Languages, Copy, Check, Loader2 } from 'lucide-react'

export default function Translator() {
  const navigate = useNavigate()
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('japanese')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const languages = [
    { id: 'japanese', label: '🇯🇵 일본어', code: 'ja' },
    { id: 'english', label: '🇺🇸 영어', code: 'en' },
    { id: 'chinese_simplified', label: '🇨🇳 중국어 (간체)', code: 'zh-CN' },
    { id: 'chinese_traditional', label: '🇹🇼 중국어 (번체)', code: 'zh-TW' },
    { id: 'russian', label: '🇷🇺 러시아어', code: 'ru' },
    { id: 'spanish', label: '🇪🇸 스페인어', code: 'es' },
    { id: 'italian', label: '🇮🇹 이탈리아어', code: 'it' },
    { id: 'french', label: '🇫🇷 프랑스어', code: 'fr' },
    { id: 'german', label: '🇩🇪 독일어', code: 'de' },
    { id: 'thai', label: '🇹🇭 태국어', code: 'th' },
    { id: 'vietnamese', label: '🇻🇳 베트남어', code: 'vi' },
    { id: 'indonesian', label: '🇮🇩 인도네시아어', code: 'id' },
    { id: 'arabic', label: '🇸🇦 아랍어', code: 'ar' }
  ]

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      alert('번역할 텍스트를 입력해주세요')
      return
    }

    setLoading(true)
    setTranslatedText('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다')
      }

      const selectedLang = languages.find(l => l.id === targetLanguage)
      const targetLangName = selectedLang.label.split(' ')[1]

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `다음 한국어 텍스트를 ${targetLangName}로 자연스럽게 번역해주세요. 번역 결과만 출력하고 다른 설명은 하지 마세요:\n\n${sourceText}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048
            }
          })
        }
      )

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`)
      }

      const data = await response.json()
      const translated = data.candidates[0]?.content?.parts[0]?.text || '번역 실패'
      setTranslatedText(translated.trim())
    } catch (error) {
      console.error('Translation error:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!translatedText) return

    try {
      await navigator.clipboard.writeText(translatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy error:', error)
      alert('복사 실패')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleTranslate()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Languages className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">AI 번역기</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            Powered by Gemini
          </span>
        </div>

        {/* Source Text */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🇰🇷</span>
              한국어 (원문)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="번역할 한국어 텍스트를 입력하세요...&#10;&#10;Ctrl + Enter로 빠른 번역"
              className="w-full h-48 px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                {sourceText.length} 자
              </span>
              <Button
                onClick={handleTranslate}
                disabled={loading || !sourceText.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    번역 중...
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4 mr-2" />
                    번역하기
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Language Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>타겟 언어 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setTargetLanguage(lang.id)}
                  className={`p-3 border-2 rounded-lg transition-all text-sm font-medium ${
                    targetLanguage === lang.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Translated Text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {languages.find(l => l.id === targetLanguage)?.label.split(' ')[0]}
                </span>
                {languages.find(l => l.id === targetLanguage)?.label.split(' ')[1]} (번역 결과)
              </div>
              {translatedText && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      복사
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : translatedText ? (
              <div className="w-full min-h-48 px-4 py-3 border rounded-lg bg-gray-50">
                <p className="whitespace-pre-wrap">{translatedText}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">
                번역 결과가 여기에 표시됩니다
              </div>
            )}
            {translatedText && (
              <div className="mt-4 text-sm text-gray-500">
                {translatedText.length} 자
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="font-medium mb-3">💡 사용 팁</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <strong>Ctrl + Enter</strong>를 눌러 빠르게 번역할 수 있습니다</li>
              <li>• 마케팅 문구, 제품 설명 등을 자연스럽게 번역합니다</li>
              <li>• 번역 결과는 복사 버튼으로 간편하게 복사할 수 있습니다</li>
              <li>• Gemini AI가 문맥을 이해하여 자연스러운 번역을 제공합니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

