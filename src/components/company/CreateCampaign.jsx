import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, CheckCircle, Languages, Loader2, Lightbulb, FileText } from 'lucide-react'
import { supabaseBiz, createCampaignInRegions } from '../../lib/supabaseClients'

export default function CreateCampaign() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    description: '',
    requirements: '',
    category: 'beauty',
    image_url: '',
    reward_amount: '',
    max_participants: '',
    application_deadline: '',
    start_date: '',
    end_date: '',
    status: 'active',
    target_platforms: {
      instagram: true,
      youtube: false,
      tiktok: false
    },
    question1: '',
    question1_type: 'short',
    question1_options: '',
    question2: '',
    question2_type: 'short',
    question2_options: '',
    question3: '',
    question3_type: 'short',
    question3_options: '',
    question4: '',
    question4_type: 'short',
    question4_options: '',
    age_requirement: '',
    skin_type_requirement: '',
    offline_visit_requirement: '',
    budget: 0,
    creator_count: 1,
    target_audience: '',
    product_category: 'beauty',
    region: ''
  })

  // Translator state
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [targetLang, setTargetLang] = useState('japanese')
  const [translating, setTranslating] = useState(false)
  const [bulkTranslating, setBulkTranslating] = useState(false)

  const languages = [
    { id: 'japanese', label: '🇯🇵 일본어', flag: 'JP' },
    { id: 'english', label: '🇺🇸 영어', flag: 'US' },
    { id: 'chinese_simplified', label: '🇨🇳 중국어(간체)', flag: 'CN' },
    { id: 'chinese_traditional', label: '🇹🇼 중국어(번체)', flag: 'TW' }
  ]

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

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      alert('번역할 텍스트를 입력해주세요')
      return
    }

    setTranslating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다')

      const selectedLang = languages.find(l => l.id === targetLang)
      const targetLangName = selectedLang.label.split(' ')[1]

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `다음 한국어 텍스트를 ${targetLangName}로 자연스럽게 번역해주세요. 번역 결과만 출력하세요:\n\n${sourceText}` 
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

  const handleBulkTranslate = async () => {
    if (!formData.region) {
      alert('타겟 지역을 먼저 선택해주세요')
      return
    }

    if (!formData.title || !formData.brand) {
      alert('제목과 브랜드는 필수입니다')
      return
    }

    setBulkTranslating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다')

      // 타겟 언어 결정
      const targetLangMap = {
        'japan': '일본어',
        'us': '영어',
        'taiwan': '중국어 번체',
        'china': '중국어 간체',
        'korea': '한국어'
      }
      const targetLang = targetLangMap[formData.region] || '영어'

      // 번역할 텍스트 모음
      const textsToTranslate = {
        title: formData.title,
        brand: formData.brand,
        description: formData.description || '',
        target_audience: formData.target_audience || ''
      }

      // 한번에 모두 번역
      const prompt = `다음 한국어 텍스트들을 ${targetLang}로 자연스럽게 번역해주세요. JSON 형식으로 반환해주세요.

입력:
${JSON.stringify(textsToTranslate, null, 2)}

출력 형식:
{
  "title": "번역된 제목",
  "brand": "번역된 브랜드",
  "description": "번역된 설명",
  "target_audience": "번역된 참가조건"
}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
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
        description: translated.description || prev.description,
        target_audience: translated.target_audience || prev.target_audience
      }))

      alert(`번역 완료! ${targetLang}로 변환되었습니다.`)
    } catch (error) {
      console.error('Bulk translation error:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setBulkTranslating(false)
    }
  }

  const handleRegionSelect = (region) => {
    setFormData(prev => ({
      ...prev,
      region: region
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.description || !formData.region) {
      alert('필수 항목을 모두 입력해주세요')
      return
    }

    if (formData.budget <= 0) {
      alert('예산을 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const campaignData = {
        company_id: company.id,
        title: formData.title,
        brand: formData.brand,
        description: formData.description,
        requirements: formData.requirements || formData.target_audience,
        category: formData.category || formData.product_category,
        image_url: formData.image_url || '',
        reward_amount: parseInt(formData.reward_amount) || 0,
        max_participants: parseInt(formData.max_participants) || 0,
        application_deadline: formData.application_deadline,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'pending',
        target_platforms: formData.target_platforms,
        question1: formData.question1 || '',
        question1_type: formData.question1_type || 'short',
        question1_options: formData.question1_options || '',
        question2: formData.question2 || '',
        question2_type: formData.question2_type || 'short',
        question2_options: formData.question2_options || '',
        question3: formData.question3 || '',
        question3_type: formData.question3_type || 'short',
        question3_options: formData.question3_options || '',
        question4: formData.question4 || '',
        question4_type: formData.question4_type || 'short',
        question4_options: formData.question4_options || '',
        age_requirement: formData.age_requirement || '',
        skin_type_requirement: formData.skin_type_requirement || '',
        offline_visit_requirement: formData.offline_visit_requirement || '',
        budget: formData.budget,
        creator_count: formData.creator_count,
        target_audience: formData.target_audience,
        product_category: formData.product_category
      }

      const results = await createCampaignInRegions(campaignData, [formData.region])

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        const createdCampaign = results.find(r => r.success)
        if (createdCampaign && createdCampaign.data) {
          // 캠페인 생성 성공 후 가이드 작성 페이지로 이동
          alert(`캠페인이 생성되었습니다! 이제 가이드를 작성해주세요.`)
          navigate(`/company/campaigns/${createdCampaign.data.id}/guide`)
        } else {
          alert(`캠페인이 생성되었습니다!\n성공: ${successCount}개 지역\n실패: ${failCount}개 지역`)
          navigate('/company/campaigns')
        }
      } else {
        alert('캠페인 생성에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('캠페인 생성 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-2">새 캠페인 생성</h1>
        <p className="text-gray-600 mb-8">일주에서 캠페인 정보를 입력하고, 오른쪽 번역기를 활용하세요.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Campaign Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                캠페인 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">캠페인 제목 *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="캠페인 제목을 입력하세요"
                    required
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium mb-2">브랜드 *</label>
                  <Input
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="브랜드명을 입력하세요"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    value={formData.product_category}
                    onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="beauty">Beauty</option>
                    <option value="fashion">Fashion</option>
                    <option value="food">Food</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="tech">Tech</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">설명</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="캠페인 설명을 입력하세요"
                    className="w-full px-4 py-2 border rounded-lg min-h-32"
                    required
                  />
                </div>

                {/* Target Regions */}
                <div>
                  <label className="block text-sm font-medium mb-2">참가조건 *</label>
                  <Input
                    value={formData.target_audience || ''}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    placeholder="참가 조건을 입력하세요"
                  />
                </div>

                {/* 일괄 번역 버튼 */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Languages className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">일괄 번역</h4>
                    </div>
                    <Button
                      type="button"
                      onClick={handleBulkTranslate}
                      disabled={bulkTranslating || !formData.title || !formData.brand}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg"
                    >
                      {bulkTranslating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          번역 중...
                        </>
                      ) : (
                        <>
                          <Languages className="w-4 h-4 mr-2" />
                          한국어 → {formData.region === 'japan' ? '일본어' : formData.region === 'us' ? '영어' : formData.region === 'taiwan' ? '중국어(번체)' : '번역'}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    제목, 브랜드, 설명, 참가조건을 선택한 타겟 지역 언어로 자동 번역합니다.
                  </p>
                </div>

                {/* Reward Amount Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3">보상 금액 선택 *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 20만원 */}
                    <button
                      type="button"
                      onClick={() => {
                        const amount = formData.region === 'japan' ? 20000 : formData.region === 'us' ? 150 : 200000
                        setFormData({ ...formData, reward_amount: amount })
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        (formData.region === 'japan' && formData.reward_amount === 20000) ||
                        (formData.region === 'us' && formData.reward_amount === 150) ||
                        (!formData.region && formData.reward_amount === 200000)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold text-lg mb-1">
                        {formData.region === 'japan' ? '¥20,000' : formData.region === 'us' ? '$150' : '₩200,000'}
                      </div>
                      <div className="text-sm text-gray-600">기본 리뷰 (1건)</div>
                      <div className="text-xs text-gray-500 mt-1">제품 사용 후기 영상</div>
                    </button>

                    {/* 30만원 */}
                    <button
                      type="button"
                      onClick={() => {
                        const amount = formData.region === 'japan' ? 30000 : formData.region === 'us' ? 220 : 300000
                        setFormData({ ...formData, reward_amount: amount })
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        (formData.region === 'japan' && formData.reward_amount === 30000) ||
                        (formData.region === 'us' && formData.reward_amount === 220) ||
                        (!formData.region && formData.reward_amount === 300000)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold text-lg mb-1">
                        {formData.region === 'japan' ? '¥30,000' : formData.region === 'us' ? '$220' : '₩300,000'}
                      </div>
                      <div className="text-sm text-gray-600">프리미엄 리뷰 (1건)</div>
                      <div className="text-xs text-gray-500 mt-1">상세 리뷰 + Before/After</div>
                    </button>

                    {/* 40만원 */}
                    <button
                      type="button"
                      onClick={() => {
                        const amount = formData.region === 'japan' ? 40000 : formData.region === 'us' ? 300 : 400000
                        setFormData({ ...formData, reward_amount: amount })
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        (formData.region === 'japan' && formData.reward_amount === 40000) ||
                        (formData.region === 'us' && formData.reward_amount === 300) ||
                        (!formData.region && formData.reward_amount === 400000)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold text-lg mb-1">
                        {formData.region === 'japan' ? '¥40,000' : formData.region === 'us' ? '$300' : '₩400,000'}
                      </div>
                      <div className="text-sm text-gray-600">스페셜 리뷰 (1건)</div>
                      <div className="text-xs text-gray-500 mt-1">전문가 리뷰 + 상세 가이드</div>
                    </button>

                    {/* 60만원 (4주 챌린지) */}
                    <button
                      type="button"
                      onClick={() => {
                        const amount = formData.region === 'japan' ? 60000 : formData.region === 'us' ? 450 : 600000
                        setFormData({ ...formData, reward_amount: amount, max_participants: 4 })
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        (formData.region === 'japan' && formData.reward_amount === 60000) ||
                        (formData.region === 'us' && formData.reward_amount === 450) ||
                        (!formData.region && formData.reward_amount === 600000)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-bold text-lg mb-1">
                        {formData.region === 'japan' ? '¥60,000' : formData.region === 'us' ? '$450' : '₩600,000'}
                      </div>
                      <div className="text-sm text-gray-600">4주 챌린지 (4건)</div>
                      <div className="text-xs text-gray-500 mt-1">매주 1건씩 총 4건 업로드</div>
                      <div className="text-xs text-blue-600 mt-1">주당 {formData.region === 'japan' ? '¥15,000' : formData.region === 'us' ? '$112' : '₩150,000'}</div>
                    </button>
                  </div>
                  {formData.reward_amount && (
                    <div className="mt-2 text-sm text-gray-600">
                      선택된 금액: <span className="font-bold">
                        {formData.region === 'japan' ? `¥${formData.reward_amount.toLocaleString()}` : 
                         formData.region === 'us' ? `$${formData.reward_amount}` : 
                         `₩${formData.reward_amount.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">모집 마감일 *</label>
                    <Input
                      type="date"
                      value={formData.application_deadline}
                      onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">촬영 마감일</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">SNS 업로드일</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Max Participants */}
                <div>
                  <label className="block text-sm font-medium mb-2">최대 참가자 수 *</label>
                  <Input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
                    placeholder="예: 10"
                    min="1"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">선착순으로 모집되며, 인원이 마감되면 자동으로 모집이 종료됩니다.</p>
                </div>

                {/* Budget & Creators */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">예산 (원) *</label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">크리에이터 수</label>
                    <Input
                      type="number"
                      value={formData.creator_count}
                      onChange={(e) => setFormData({ ...formData, creator_count: parseInt(e.target.value) })}
                      placeholder="1"
                      min="1"
                    />
                  </div>
                </div>

                {/* SNS Platforms */}
                <div>
                  <label className="block text-sm font-medium mb-3">대상 SNS 플랫폼 *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.target_platforms.instagram}
                        onChange={(e) => setFormData({
                          ...formData,
                          target_platforms: {
                            ...formData.target_platforms,
                            instagram: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium">📷 Instagram</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.target_platforms.youtube}
                        onChange={(e) => setFormData({
                          ...formData,
                          target_platforms: {
                            ...formData.target_platforms,
                            youtube: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-red-600 rounded"
                      />
                      <span className="text-sm font-medium">🎥 YouTube</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.target_platforms.tiktok}
                        onChange={(e) => setFormData({
                          ...formData,
                          target_platforms: {
                            ...formData.target_platforms,
                            tiktok: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-pink-600 rounded"
                      />
                      <span className="text-sm font-medium">🎵 TikTok</span>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">하나 이상 선택해주세요</p>
                </div>

                {/* Target Region */}
                <div>
                  <label className="block text-sm font-medium mb-2">타겟 지역 * (1개만 선택 가능)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'korea', label: '🇰🇷 한국', available: true },
                      { id: 'japan', label: '🇯🇵 일본', available: true },
                      { id: 'us', label: '🇺🇸 미국', available: true },
                      { id: 'taiwan', label: '🇹🇼 대만', available: true },
                      { id: 'china', label: '🇨🇳 중국', available: false },
                      { id: 'thailand', label: '🇹🇭 태국', available: false },
                      { id: 'vietnam', label: '🇻🇳 베트남', available: false },
                      { id: 'indonesia', label: '🇮🇩 인도네시아', available: false }
                    ].map(region => (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => region.available && handleRegionSelect(region.id)}
                        disabled={!region.available}
                        className={`p-3 border-2 rounded-lg transition-all relative ${
                          formData.region === region.id
                            ? 'border-blue-600 bg-blue-50'
                            : region.available
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            region.available ? '' : 'text-gray-400'
                          }`}>
                            {region.label}
                          </span>
                          {formData.region === region.id && (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        {!region.available && (
                          <div className="mt-1 text-xs text-gray-400">오픈예정</div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    * 각 국가별로 언어가 달라 각각 등록해주세요
                  </p>
                </div>

                {/* Additional Questions (Optional) */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">추가 질문 (선택사항)</h3>
                  <p className="text-sm text-gray-500 mb-4">크리에이터에게 물어볼 추가 질문을 설정할 수 있습니다.</p>
                  
                  {[1, 2, 3, 4].map(num => (
                    <div key={num} className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium mb-2">질문 {num}</label>
                      <Input
                        type="text"
                        value={formData[`question${num}`]}
                        onChange={(e) => setFormData({ ...formData, [`question${num}`]: e.target.value })}
                        placeholder="예: 피부 타입을 알려주세요"
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <select
                          value={formData[`question${num}_type`]}
                          onChange={(e) => setFormData({ ...formData, [`question${num}_type`]: e.target.value })}
                          className="px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="short">단답형</option>
                          <option value="long">장문형</option>
                          <option value="select">선택형</option>
                        </select>
                        {formData[`question${num}_type`] === 'select' && (
                          <Input
                            type="text"
                            value={formData[`question${num}_options`]}
                            onChange={(e) => setFormData({ ...formData, [`question${num}_options`]: e.target.value })}
                            placeholder="옵션 (쉼표로 구분: 지성,건성,복합성)"
                            className="flex-1"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Participation Requirements (Optional) */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">참가 조건 (선택사항)</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">나이 제한</label>
                      <Input
                        type="text"
                        value={formData.age_requirement}
                        onChange={(e) => setFormData({ ...formData, age_requirement: e.target.value })}
                        placeholder="예: 20세 이상"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">피부 타입 제한</label>
                      <Input
                        type="text"
                        value={formData.skin_type_requirement}
                        onChange={(e) => setFormData({ ...formData, skin_type_requirement: e.target.value })}
                        placeholder="예: 지성 피부, 건성 피부"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">오프라인 방문 여부</label>
                      <Input
                        type="text"
                        value={formData.offline_visit_requirement}
                        onChange={(e) => setFormData({ ...formData, offline_visit_requirement: e.target.value })}
                        placeholder="예: 서울 강남 매장 방문 필수"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    {loading ? '생성 중...' : '캠페인 생성'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/company/dashboard')}
                  >
                    취소
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right: Translator */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-blue-600" />
                  한국어 → 일본어 번역기
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Language Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {languages.find(l => l.id === targetLang)?.flag} 번역 결과
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {languages.map(lang => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setTargetLang(lang.id)}
                        className={`p-2 border rounded-lg text-sm transition-all ${
                          targetLang === lang.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source Text */}
                <div>
                  <label className="block text-sm font-medium mb-2">📝 한국어 입력</label>
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="번역할 한국어 텍스트를 입력하세요..."
                    className="w-full px-4 py-3 border rounded-lg min-h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {sourceText.length} / 5000자
                  </div>
                </div>

                {/* Translate Button */}
                <Button
                  type="button"
                  onClick={handleTranslate}
                  disabled={translating || !sourceText.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {translating ? (
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

                {/* Translated Text */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {languages.find(l => l.id === targetLang)?.label} 번역 결과
                  </label>
                  {translating ? (
                    <div className="w-full min-h-40 border rounded-lg bg-gray-50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : translatedText ? (
                    <div className="w-full min-h-40 px-4 py-3 border rounded-lg bg-green-50 border-green-200">
                      <p className="whitespace-pre-wrap text-gray-800">{translatedText}</p>
                    </div>
                  ) : (
                    <div className="w-full min-h-40 border rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      번역 결과가 여기에 표시됩니다
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-900 mb-2">💡 사용 팁</h3>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• 번역 결과는 수정 가능합니다</li>
                      <li>• 특사 버튼으로 쉽게 캠페인 폼에 붙여넣기 할 수 있습니다</li>
                      <li>• 마케팅 문구는 현지 감각에 맞게 자연스럽게 번역됩니다</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

