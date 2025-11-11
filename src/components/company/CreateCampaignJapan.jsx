import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, X, Save, ArrowLeft, Languages, Lightbulb } from 'lucide-react'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'

const CreateCampaignJapan = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    description: '',
    reward_amount: '',
    status: 'draft',
    platforms: [],
    questions: []
  })

  // Translator state
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [bulkTranslating, setBulkTranslating] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }
    setUser(user)

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePlatformToggle = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `question_${Date.now()}`,
          question: '',
          type: 'text',
          required: false
        }
      ]
    }))
  }

  const updateQuestion = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
  }

  // 단일 텍스트 번역
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      alert('번역할 텍스트를 입력해주세요')
      return
    }

    setTranslating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다')

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `다음 한국어 텍스트를 일본어로 자연스럽게 번역해주세요. 번역 결과만 출력하세요:\n\n${sourceText}` 
              }] 
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const translated = data.candidates[0]?.content?.parts[0]?.text || '번역 실패'
      setTranslatedText(translated.trim())
    } catch (error) {
      console.error('Translation error:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setTranslating(false)
    }
  }

  // 일괄 번역 (제목, 브랜드, 설명)
  const handleBulkTranslate = async () => {
    if (!formData.title || !formData.brand) {
      alert('제목과 브랜드는 필수입니다')
      return
    }

    setBulkTranslating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다')

      const sourceData = {
        title: formData.title,
        brand: formData.brand,
        description: formData.description
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `다음 한국어 캠페인 정보를 일본어로 자연스럽게 번역해주세요. JSON 형식으로만 출력하세요:\n\n${JSON.stringify(sourceData, null, 2)}\n\n출력 형식: {"title": "...", "brand": "...", "description": "..."}` 
              }] 
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const resultText = data.candidates[0]?.content?.parts[0]?.text || ''
      
      // JSON 추출
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('번역 결과를 파싱할 수 없습니다')
      
      const translated = JSON.parse(jsonMatch[0])

      // 폼 데이터 업데이트
      setFormData(prev => ({
        ...prev,
        title: translated.title || prev.title,
        brand: translated.brand || prev.brand,
        description: translated.description || prev.description
      }))

      alert('번역 완료! 일본어로 변환되었습니다.')
    } catch (error) {
      console.error('Bulk translation error:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setBulkTranslating(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // 폼 검증
      if (!formData.title || !formData.brand || !formData.reward_amount) {
        setError('필수 필드를 모두 입력해주세요.')
        return
      }

      const campaignData = {
        company_id: company.id,
        title: formData.title,
        brand: formData.brand,
        description: formData.description,
        reward_amount: parseInt(formData.reward_amount),
        status: formData.status,
        platforms: formData.platforms,
        questions: formData.questions
      }

      // Japan Supabase에 저장
      const japanClient = getSupabaseClient('japan')
      if (!japanClient) {
        throw new Error('일본 Supabase 클라이언트를 찾을 수 없습니다')
      }

      const { data, error: insertError } = await japanClient
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess('새 캠페인이 성공적으로 생성되었습니다.')
      
      // 3초 후 캠페인 목록으로 이동
      setTimeout(() => {
        navigate('/company/campaigns')
      }, 2000)
    } catch (error) {
      console.error('Save campaign error:', error)
      setError('캠페인 저장에 실패했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/company/campaigns')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                캠페인 목록으로
              </Button>
              
              <h1 className="text-xl font-bold text-gray-800">
                일본 캠페인 생성
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 알림 메시지 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Campaign Form */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                캠페인 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">기본 정보</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">캠페인 제목 *</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="캠페인 제목을 입력하세요"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="brand">브랜드명 *</Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="브랜드명을 입력하세요"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">캠페인 설명</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="캠페인에 대한 자세한 설명을 입력하세요"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reward_amount">보상 금액 (¥) *</Label>
                      <Input
                        id="reward_amount"
                        name="reward_amount"
                        type="number"
                        min="0"
                        value={formData.reward_amount}
                        onChange={handleInputChange}
                        placeholder="50000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">상태</Label>
                      <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">초안</SelectItem>
                          <SelectItem value="active">활성</SelectItem>
                          <SelectItem value="inactive">비활성</SelectItem>
                          <SelectItem value="completed">완료</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 일괄 번역 버튼 */}
                  <Button
                    type="button"
                    onClick={handleBulkTranslate}
                    disabled={bulkTranslating || !formData.title || !formData.brand}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {bulkTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        번역 중...
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4 mr-2" />
                        일본어로 일괄 번역
                      </>
                    )}
                  </Button>
                </div>

                {/* 플랫폼 선택 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">대상 플랫폼</h3>
                  
                  <div className="flex flex-wrap gap-3">
                    {['instagram', 'tiktok', 'youtube', 'twitter'].map((platform) => (
                      <Button
                        key={platform}
                        type="button"
                        variant={formData.platforms.includes(platform) ? 'default' : 'outline'}
                        onClick={() => handlePlatformToggle(platform)}
                        className="capitalize"
                      >
                        {platform}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 질문 관리 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">캠페인 질문</h3>
                    <Button type="button" variant="outline" onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      질문 추가
                    </Button>
                  </div>
                  
                  {formData.questions.map((question, index) => (
                    <div key={question.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>질문 {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Input
                        value={question.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        placeholder="질문 내용을 입력하세요"
                      />
                      
                      <div className="flex items-center space-x-4">
                        <Select
                          value={question.type}
                          onValueChange={(value) => updateQuestion(index, 'type', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">텍스트</SelectItem>
                            <SelectItem value="textarea">장문</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                          />
                          <span className="text-sm">필수</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 저장 버튼 */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/company/campaigns')}
                    disabled={loading}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    생성
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Translator */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                실시간 번역기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">번역 팁</p>
                      <ul className="space-y-1 text-xs">
                        <li>• 왼쪽 폼에서 제목/브랜드/설명을 입력 후 "일괄 번역" 버튼 클릭</li>
                        <li>• 또는 아래에서 개별 텍스트를 번역하여 복사/붙여넣기</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>한국어 입력</Label>
                  <Textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="번역할 한국어 텍스트를 입력하세요"
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleTranslate}
                  disabled={translating || !sourceText.trim()}
                  className="w-full"
                >
                  {translating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      번역 중...
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4 mr-2" />
                      일본어로 번역
                    </>
                  )}
                </Button>

                <div className="space-y-2">
                  <Label>일본어 결과</Label>
                  <Textarea
                    value={translatedText}
                    onChange={(e) => setTranslatedText(e.target.value)}
                    placeholder="번역 결과가 여기에 표시됩니다"
                    rows={4}
                    className="bg-gray-50"
                  />
                </div>

                {translatedText && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(translatedText)
                      alert('클립보드에 복사되었습니다!')
                    }}
                    className="w-full"
                  >
                    클립보드에 복사
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CreateCampaignJapan
