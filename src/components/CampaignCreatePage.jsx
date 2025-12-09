import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  Check, 
  FileText, 
  Download, 
  Package, 
  Globe, 
  Info, 
  Sparkles,
  ChevronRight,
  CheckCircle2
} from 'lucide-react'
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
      priceWithVat: '220,000원',
      features: ['일반 퀄리티 지원자', '영상 수정 불가'],
      icon: '📦',
      color: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-300',
      selectedColor: 'border-blue-600'
    },
    {
      value: 300000,
      name: '스탠다드',
      price: '300,000원',
      priceWithVat: '330,000원',
      features: ['향상된 퀄리티 지원자', '영상 수정 1회 가능'],
      popular: true,
      icon: '⭐',
      color: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-300',
      selectedColor: 'border-purple-600'
    },
    {
      value: 400000,
      name: '프리미엄',
      price: '400,000원',
      priceWithVat: '440,000원',
      features: ['최고 퀄리티 지원자', '영상 수정 1회 가능', '우선 지원'],
      icon: '💎',
      color: 'from-amber-50 to-amber-100',
      borderColor: 'border-amber-300',
      selectedColor: 'border-amber-600'
    },
    {
      value: 600000,
      name: '4주 연속',
      price: '600,000원',
      priceWithVat: '660,000원',
      features: ['매주 1건씩 총 4주간', '프리미엄 퀄리티', '영상 수정 1회 가능', '전담 매니저'],
      icon: '🏆',
      color: 'from-rose-50 to-rose-100',
      borderColor: 'border-rose-300',
      selectedColor: 'border-rose-600'
    }
  ]

  const regions = [
    { code: 'japan', name: '일본', flag: '🇯🇵', description: '일본 시장 진출' },
    { code: 'us', name: '미국', flag: '🇺🇸', description: '미국 시장 진출' },
    { code: 'taiwan', name: '대만', flag: '🇹🇼', description: '대만 시장 진출' }
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
    <div className="space-y-8">
      {/* Package Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-5 w-5 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">패키지 선택</h3>
        </div>
        <RadioGroup
          value={formData.package_type.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, package_type: parseInt(value) }))}
        >
          <div className="grid md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.value}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg bg-gradient-to-br ${pkg.color} ${
                  formData.package_type === pkg.value
                    ? `border-2 ${pkg.selectedColor} shadow-xl scale-[1.02]`
                    : `border ${pkg.borderColor} hover:border-gray-400`
                } ${pkg.popular ? 'relative' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, package_type: pkg.value }))}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 shadow-lg">
                      <Sparkles className="h-3 w-3 mr-1 inline" />
                      인기
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{pkg.icon}</div>
                      <div>
                        <CardTitle className="text-lg font-bold">{pkg.name}</CardTitle>
                        <CardDescription className="text-xl font-bold text-gray-900 mt-1">
                          {pkg.price}
                        </CardDescription>
                        <p className="text-xs text-gray-600 mt-0.5">VAT 별도 ({pkg.priceWithVat})</p>
                      </div>
                    </div>
                    <RadioGroupItem 
                      value={pkg.value.toString()} 
                      id={`pkg-${pkg.value}`}
                      className="mt-1"
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
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

      {/* Region Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">진행 지역 선택</h3>
          <Badge variant="outline" className="ml-2">복수 선택 가능</Badge>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {regions.map((region) => (
            <Card
              key={region.code}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                formData.regions.includes(region.code)
                  ? 'border-2 border-blue-600 bg-blue-50 shadow-md scale-[1.02]'
                  : 'border border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => handleRegionToggle(region.code)}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.regions.includes(region.code)}
                    onCheckedChange={() => handleRegionToggle(region.code)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-3xl">{region.flag}</span>
                      <span className="text-lg font-bold text-gray-900">{region.name}</span>
                    </div>
                    <p className="text-xs text-gray-600">{region.description}</p>
                  </div>
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

      {/* Price Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            결제 예상 금액
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">패키지 금액</span>
              <span className="font-semibold">{(formData.package_type * formData.regions.length).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <span>부가세 (10%)</span>
              <span>+{(formData.package_type * formData.regions.length * 0.1).toLocaleString()}원</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t-2 border-blue-200">
            <span className="text-base font-bold text-gray-900">총 결제액 (VAT 포함)</span>
            <span className="text-2xl font-bold text-blue-600">
              {(formData.package_type * formData.regions.length * 1.1).toLocaleString()}원
            </span>
          </div>
          {formData.regions.length > 1 && (
            <div className="text-xs text-gray-600 pt-2 border-t border-blue-100">
              💡 {formData.package_type.toLocaleString()}원 × {formData.regions.length}개 지역 = {(formData.package_type * formData.regions.length).toLocaleString()}원
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          캠페인 기본 정보
        </h4>
        <p className="text-sm text-blue-800">크리에이터들에게 표시될 캠페인의 기본 정보를 입력해주세요.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-semibold">
            캠페인명 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="예: 블랑네이처 9월 캠페인"
            className={`h-11 ${errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />
          {errors.title && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="recruitment_count" className="text-base font-semibold">
            모집 인원
          </Label>
          <Input
            id="recruitment_count"
            name="recruitment_count"
            type="number"
            value={formData.recruitment_count}
            onChange={handleChange}
            min="1"
            className="h-11"
          />
          <p className="text-xs text-gray-500">선정할 크리에이터 수를 입력하세요</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand_name" className="text-base font-semibold">
          브랜드명 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="brand_name"
          name="brand_name"
          value={formData.brand_name}
          onChange={handleChange}
          placeholder="예: 블랑네이처"
          className={`h-11 ${errors.brand_name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {errors.brand_name && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.brand_name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_name" className="text-base font-semibold">
          제품명 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="product_name"
          name="product_name"
          value={formData.product_name}
          onChange={handleChange}
          placeholder="예: 마그놀리아 앤 세레니티 뷰티 크림"
          className={`h-11 ${errors.product_name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {errors.product_name && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.product_name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_url" className="text-base font-semibold">
          제품 URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="product_url"
          name="product_url"
          value={formData.product_url}
          onChange={handleChange}
          placeholder="https://..."
          className={`h-11 ${errors.product_url ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {errors.product_url && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.product_url}</p>}
        <p className="text-xs text-gray-500">제품 구매 또는 상세 페이지 링크를 입력하세요</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand_identity" className="text-base font-semibold">
          브랜드 아이덴티티
        </Label>
        <Textarea
          id="brand_identity"
          name="brand_identity"
          value={formData.brand_identity}
          onChange={handleChange}
          placeholder="브랜드의 핵심 가치, 컨셉, 타겟 고객 등을 입력해주세요"
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">브랜드의 핵심 가치와 이미지를 설명해주세요</p>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          콘텐츠 제작 가이드
        </h4>
        <p className="text-sm text-purple-800">크리에이터가 영상을 제작할 때 참고할 상세 가이드를 작성해주세요.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="required_dialogue" className="text-base font-semibold">
          필수 대사 <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="required_dialogue"
          name="required_dialogue"
          value={formData.required_dialogue}
          onChange={handleChange}
          placeholder="크리에이터가 반드시 언급해야 하는 대사를 입력해주세요&#10;예: '블랑네이처 뷰티 크림은 피부에 촉촉함을 선사합니다'"
          rows={5}
          className={`resize-none ${errors.required_dialogue ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {errors.required_dialogue && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.required_dialogue}</p>}
        <p className="text-xs text-gray-500">크리에이터가 영상에서 반드시 언급해야 할 내용을 작성하세요</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="required_scenes" className="text-base font-semibold">
          필수 장면 <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="required_scenes"
          name="required_scenes"
          value={formData.required_scenes}
          onChange={handleChange}
          placeholder="크리에이터가 반드시 촬영해야 하는 장면을 입력해주세요&#10;예: 제품 언박싱, 텍스처 클로즈업, 사용 전후 비교"
          rows={5}
          className={`resize-none ${errors.required_scenes ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {errors.required_scenes && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.required_scenes}</p>}
        <p className="text-xs text-gray-500">영상에 포함되어야 할 필수 장면을 설명하세요</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference_urls" className="text-base font-semibold">
          레퍼런스 영상 URL
        </Label>
        <Textarea
          id="reference_urls"
          name="reference_urls"
          value={formData.reference_urls}
          onChange={handleChange}
          placeholder="참고할 영상 URL을 한 줄에 하나씩 입력해주세요&#10;https://youtube.com/...&#10;https://instagram.com/..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">크리에이터가 참고할 수 있는 영상 링크를 입력하세요 (선택사항)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_description" className="text-base font-semibold">
          제품 상세 설명
        </Label>
        <Textarea
          id="product_description"
          name="product_description"
          value={formData.product_description}
          onChange={handleChange}
          placeholder="제품의 특징, 효능, 사용법 등을 상세히 입력해주세요"
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">제품의 특징과 장점을 자세히 설명해주세요</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guidelines" className="text-base font-semibold">
          추가 가이드라인
        </Label>
        <Textarea
          id="guidelines"
          name="guidelines"
          value={formData.guidelines}
          onChange={handleChange}
          placeholder="크리에이터가 지켜야 할 추가 가이드라인을 입력해주세요&#10;예: 밝은 조명에서 촬영, BGM은 밝고 경쾌한 음악 사용"
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">영상 제작 시 주의사항이나 추가 요구사항을 작성하세요</p>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          캠페인 생성 시 견적서와 계약서가 자동으로 다운로드됩니다.
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-xl">캠페인 최종 확인</CardTitle>
          <CardDescription>아래 내용을 확인하고 캠페인을 생성하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Package Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
              <Package className="h-4 w-4" />
              패키지 정보
            </div>
            <div className="pl-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">선택 패키지</span>
                <Badge variant="secondary" className="text-base font-semibold">
                  {packages.find(p => p.value === formData.package_type)?.name}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">패키지 금액</span>
                <span className="font-semibold">{formData.package_type.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              <Globe className="h-4 w-4" />
              진행 지역
            </div>
            <div className="pl-6">
              <div className="flex flex-wrap gap-2">
                {formData.regions.map(r => {
                  const region = regions.find(reg => reg.code === r)
                  return (
                    <Badge key={r} variant="outline" className="text-base px-3 py-1">
                      {region?.flag} {region?.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              <FileText className="h-4 w-4" />
              캠페인 정보
            </div>
            <div className="pl-6 space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">캠페인명</p>
                <p className="font-semibold text-lg">{formData.title}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">브랜드</p>
                  <p className="font-semibold">{formData.brand_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">제품</p>
                  <p className="font-semibold">{formData.product_name}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">모집 인원</p>
                <p className="font-semibold">{formData.recruitment_count}명</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">결제 금액</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">패키지 금액</span>
                    <span className="font-semibold">{(formData.package_type * formData.regions.length).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>부가세 (10%)</span>
                    <span>+{(formData.package_type * formData.regions.length * 0.1).toLocaleString()}원</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-green-200">
                  <span className="text-base font-bold text-gray-900">총 결제액 (VAT 포함)</span>
                  <span className="text-3xl font-bold text-green-600">
                    {(formData.package_type * formData.regions.length * 1.1).toLocaleString()}원
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const getStepTitle = (stepNum) => {
    const titles = {
      1: '패키지 & 지역 선택',
      2: '기본 정보 입력',
      3: '콘텐츠 가이드 작성',
      4: '최종 확인'
    }
    return titles[stepNum] || ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">캠페인 생성</h1>
          <p className="text-gray-600">새로운 인플루언서 마케팅 캠페인을 시작하세요</p>
        </div>

        {/* Step Indicator */}
        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        s < step
                          ? 'bg-green-500 text-white'
                          : s === step
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {s < step ? <Check className="h-5 w-5" /> : s}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-semibold ${s === step ? 'text-blue-600' : 'text-gray-600'}`}>
                        STEP {s}
                      </p>
                      <p className={`text-xs mt-0.5 ${s === step ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                        {getStepTitle(s)}
                      </p>
                    </div>
                  </div>
                  {s < 4 && (
                    <div className={`h-1 flex-1 mx-2 rounded transition-all ${
                      s < step ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2">
            <CardTitle className="text-2xl">{getStepTitle(step)}</CardTitle>
            <CardDescription className="text-base">
              {step === 1 && '원하시는 패키지와 진행할 지역을 선택해주세요'}
              {step === 2 && '캠페인의 기본 정보를 입력해주세요'}
              {step === 3 && '크리에이터를 위한 콘텐츠 제작 가이드를 작성해주세요'}
              {step === 4 && '입력하신 내용을 최종 확인하고 캠페인을 생성하세요'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t-2">
              {step > 1 ? (
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  size="lg"
                  className="px-6"
                >
                  이전 단계
                </Button>
              ) : (
                <div />
              )}
              {step < 4 ? (
                <Button 
                  onClick={handleNext} 
                  size="lg"
                  className="px-8 bg-blue-600 hover:bg-blue-700"
                >
                  다음 단계
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading} 
                  size="lg"
                  className="px-8 bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      캠페인 생성하기
                    </>
                  )}
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
