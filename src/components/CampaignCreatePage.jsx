import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Check, FileText, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz, createCampaignInRegions } from '@/lib/supabaseClients'
import { generateAndDownloadQuotation, generateAndDownloadContract } from '@/lib/pdfGenerator'
import { sendPaymentRequestNotification } from '../services/notifications'

const CampaignCreatePage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [companyData, setCompanyData] = useState(null)
  const [step, setStep] = useState(1)
  
  const [formData, setFormData] = useState({
    // Package Selection
    package_type: 300000,
    
    // Region Selection
    regions: [],
    
    // Campaign Basic Info
    title: '',
    recruitment_count: 10,
    
    // Company/Brand Info
    brand_name: '',
    product_name: '',
    product_url: '',
    brand_identity: '',
    
    // Product Info
    required_dialogue: '',
    required_scenes: '',
    
    // Reference
    reference_urls: '',
    
    // Additional Info
    product_description: '',
    guidelines: ''
  })

  const [errors, setErrors] = useState({})

  const packages = [
    {
      value: 200000,
      name: '기본형',
      price: '200,000원',
      features: ['일반 퀄리티 지원자', '영상 수정 불가']
    },
    {
      value: 300000,
      name: '스탠다드',
      price: '300,000원',
      features: ['향상된 퀄리티 지원자', '영상 수정 1회 가능'],
      popular: true
    },
    {
      value: 400000,
      name: '프리미엄',
      price: '400,000원',
      features: ['최고 퀄리티 지원자', '영상 수정 1회 가능', '우선 지원']
    },
    {
      value: 600000,
      name: '4주 연속',
      price: '600,000원',
      features: ['매주 1건씩 총 4주간', '프리미엄 퀄리티', '영상 수정 1회 가능', '전담 매니저']
    }
  ]

  const regions = [
    { code: 'japan', name: '일본', flag: '🇯🇵' },
    { code: 'us', name: '미국', flag: '🇺🇸' },
    { code: 'taiwan', name: '대만', flag: '🇹🇼' }
  ]

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('cnecbiz_user')
    if (!storedUser) {
      alert('로그인이 필요합니다')
      navigate('/login')
      return
    }

    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)

    // Fetch company data
    fetchCompanyData(parsedUser.id)
  }, [navigate])

  const fetchCompanyData = async (userId) => {
    try {
      if (!supabaseBiz) return

      const { data, error } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setCompanyData(data)
    } catch (error) {
      console.error('Error fetching company data:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleRegionToggle = (regionCode) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.includes(regionCode)
        ? prev.regions.filter(r => r !== regionCode)
        : [...prev.regions, regionCode]
    }))
  }

  const validateStep1 = () => {
    const newErrors = {}

    if (formData.regions.length === 0) {
      newErrors.regions = '최소 1개 이상의 지역을 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = '캠페인명을 입력해주세요'
    }

    if (!formData.brand_name.trim()) {
      newErrors.brand_name = '브랜드명을 입력해주세요'
    }

    if (!formData.product_name.trim()) {
      newErrors.product_name = '제품명을 입력해주세요'
    }

    if (!formData.product_url.trim()) {
      newErrors.product_url = '제품 URL을 입력해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors = {}

    if (!formData.required_dialogue.trim()) {
      newErrors.required_dialogue = '필수 대사를 입력해주세요'
    }

    if (!formData.required_scenes.trim()) {
      newErrors.required_scenes = '필수 장면을 입력해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      if (!supabaseBiz) {
        alert('서비스 연결에 실패했습니다')
        return
      }

      // Prepare campaign data
      const campaignData = {
        company_id: user.id,
        package_type: formData.package_type,
        regions: formData.regions,
        title: formData.title,
        brand_name: formData.brand_name,
        product_name: formData.product_name,
        product_url: formData.product_url,
        brand_identity: formData.brand_identity,
        required_dialogue: formData.required_dialogue,
        required_scenes: formData.required_scenes,
        reference_urls: formData.reference_urls.split('\n').filter(url => url.trim()),
        product_description: formData.product_description,
        guidelines: formData.guidelines,
        recruitment_count: formData.recruitment_count,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      // Save to BIZ database first
      const { data: bizCampaign, error: bizError } = await supabaseBiz
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single()

      if (bizError) throw bizError

      // Create campaigns in selected regions
      const results = await createCampaignInRegions(campaignData, formData.regions)

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        // 캠페인 신청 알림톡 발송
        try {
          await sendPaymentRequestNotification(
            companyData?.phone || user?.phone,
            companyData?.contact_person || user?.user_metadata?.name,
            {
              companyName: companyData?.company_name || '회사명 없음',
              campaignName: formData.title,
              packageType: packages.find(p => p.value === formData.package_type)?.name || '',
              regionCount: formData.regions.length.toString()
            }
          )
        } catch (notifError) {
          console.error('알림톡 발송 실패:', notifError)
        }

        alert(`캠페인이 생성되었습니다!\n성공: ${successCount}개 지역\n실패: ${failCount}개 지역\n\n이제 결제를 진행해주세요.`)
        
        // Generate documents
        if (companyData) {
          generateAndDownloadQuotation(formData, companyData)
          setTimeout(() => {
            generateAndDownloadContract(formData, companyData)
          }, 1000)
        }

        // Redirect to payment page
        navigate(`/campaigns/${bizCampaign.id}/payment`)
      } else {
        alert('캠페인 생성에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Campaign creation error:', error)
      alert(error.message || '캠페인 생성 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">패키지 선택</h3>
        <RadioGroup
          value={formData.package_type.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, package_type: parseInt(value) }))}
        >
          <div className="grid md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.value}
                className={`cursor-pointer transition-all ${
                  formData.package_type === pkg.value
                    ? 'border-2 border-blue-500 shadow-lg'
                    : 'hover:border-blue-300'
                } ${pkg.popular ? 'relative' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, package_type: pkg.value }))}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 -right-2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      인기
                    </span>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={pkg.value.toString()} id={`pkg-${pkg.value}`} />
                    <div>
                      <CardTitle className="text-xl">{pkg.name}</CardTitle>
                      <CardDescription className="text-lg font-semibold text-blue-600">
                        {pkg.price}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">진행 지역 선택</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {regions.map((region) => (
            <Card
              key={region.code}
              className={`cursor-pointer transition-all ${
                formData.regions.includes(region.code)
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'hover:border-blue-300'
              }`}
              onClick={() => handleRegionToggle(region.code)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={formData.regions.includes(region.code)}
                    onCheckedChange={() => handleRegionToggle(region.code)}
                  />
                  <div className="text-4xl">{region.flag}</div>
                  <span className="text-lg font-semibold">{region.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {errors.regions && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.regions}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>예상 금액:</strong>{' '}
          {(formData.package_type * formData.regions.length).toLocaleString()}원
          {formData.regions.length > 1 && (
            <span className="text-gray-600">
              {' '}({formData.package_type.toLocaleString()}원 × {formData.regions.length}개 지역)
            </span>
          )}
        </p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">캠페인명 *</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="예: 블랑네이처 9월 캠페인"
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand_name">브랜드명 *</Label>
        <Input
          id="brand_name"
          name="brand_name"
          value={formData.brand_name}
          onChange={handleChange}
          placeholder="예: 블랑네이처"
          className={errors.brand_name ? 'border-red-500' : ''}
        />
        {errors.brand_name && <p className="text-sm text-red-500">{errors.brand_name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_name">제품명 *</Label>
        <Input
          id="product_name"
          name="product_name"
          value={formData.product_name}
          onChange={handleChange}
          placeholder="예: 마그놀리아 앤 세레니티 뷰티 크림"
          className={errors.product_name ? 'border-red-500' : ''}
        />
        {errors.product_name && <p className="text-sm text-red-500">{errors.product_name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_url">제품 URL *</Label>
        <Input
          id="product_url"
          name="product_url"
          value={formData.product_url}
          onChange={handleChange}
          placeholder="https://..."
          className={errors.product_url ? 'border-red-500' : ''}
        />
        {errors.product_url && <p className="text-sm text-red-500">{errors.product_url}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand_identity">브랜드 아이덴티티</Label>
        <Textarea
          id="brand_identity"
          name="brand_identity"
          value={formData.brand_identity}
          onChange={handleChange}
          placeholder="브랜드의 핵심 가치, 컨셉, 타겟 고객 등을 입력해주세요"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recruitment_count">모집 인원</Label>
        <Input
          id="recruitment_count"
          name="recruitment_count"
          type="number"
          value={formData.recruitment_count}
          onChange={handleChange}
          min="1"
        />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="required_dialogue">필수 대사 *</Label>
        <Textarea
          id="required_dialogue"
          name="required_dialogue"
          value={formData.required_dialogue}
          onChange={handleChange}
          placeholder="크리에이터가 반드시 언급해야 하는 대사를 입력해주세요"
          rows={4}
          className={errors.required_dialogue ? 'border-red-500' : ''}
        />
        {errors.required_dialogue && <p className="text-sm text-red-500">{errors.required_dialogue}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="required_scenes">필수 장면 *</Label>
        <Textarea
          id="required_scenes"
          name="required_scenes"
          value={formData.required_scenes}
          onChange={handleChange}
          placeholder="영상에 반드시 포함되어야 하는 장면을 입력해주세요"
          rows={4}
          className={errors.required_scenes ? 'border-red-500' : ''}
        />
        {errors.required_scenes && <p className="text-sm text-red-500">{errors.required_scenes}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference_urls">레퍼런스 URL</Label>
        <Textarea
          id="reference_urls"
          name="reference_urls"
          value={formData.reference_urls}
          onChange={handleChange}
          placeholder="참고할 영상 링크를 한 줄에 하나씩 입력해주세요"
          rows={4}
        />
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ 메타 광고 영상 링크는 광고가 종료되면 볼 수 없을 수 있습니다.
          </AlertDescription>
        </Alert>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_description">제품 설명</Label>
        <Textarea
          id="product_description"
          name="product_description"
          value={formData.product_description}
          onChange={handleChange}
          placeholder="제품에 대한 상세 설명을 입력해주세요"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guidelines">가이드라인</Label>
        <Textarea
          id="guidelines"
          name="guidelines"
          value={formData.guidelines}
          onChange={handleChange}
          placeholder="크리에이터가 지켜야 할 가이드라인을 입력해주세요"
          rows={4}
        />
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          캠페인 생성 시 견적서와 계약서가 자동으로 다운로드됩니다.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>캠페인 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">패키지</p>
            <p className="font-semibold">
              {packages.find(p => p.value === formData.package_type)?.name} (
              {formData.package_type.toLocaleString()}원)
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">진행 지역</p>
            <p className="font-semibold">
              {formData.regions.map(r => regions.find(reg => reg.code === r)?.name).join(', ')}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">캠페인명</p>
            <p className="font-semibold">{formData.title}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">브랜드/제품</p>
            <p className="font-semibold">{formData.brand_name} - {formData.product_name}</p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">총 금액</p>
            <p className="text-2xl font-bold text-blue-600">
              {(formData.package_type * formData.regions.length).toLocaleString()}원
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">캠페인 생성</CardTitle>
            <CardDescription>
              Step {step} of 4
            </CardDescription>
            <div className="flex space-x-2 mt-4">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded ${
                    s <= step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}

            <div className="flex justify-between mt-8">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  이전
                </Button>
              )}
              {step < 4 ? (
                <Button onClick={handleNext} className={step === 1 ? 'ml-auto' : ''}>
                  다음
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                  {loading ? '생성 중...' : '캠페인 생성'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CampaignCreatePage

