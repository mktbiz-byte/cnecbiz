import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, User, Mail, Phone, MapPin, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import CompanyNavigation from './CompanyNavigation'

export default function CompanyProfileEdit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [company, setCompany] = useState(null)
  
  const [formData, setFormData] = useState({
    // 기본 정보 (회원가입 시 입력된 정보)
    companyName: '',
    businessNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    
    // 추가 정보
    ceoName: '',
    businessType: '',
    businessCategory: '',
    companyPostalCode: '',
    companyAddress: '',
    companyAddressDetail: '',
    
    // 알림 담당자
    notificationContactPerson: '',
    notificationEmail: '',
    notificationPhone: '',
    
    // 기업 구분
    isAgency: false,
    
    // 알림 동의
    emailNotificationConsent: true,
    smsNotificationConsent: true,
    marketingConsent: false,
  })

  useEffect(() => {
    loadCompanyData()
  }, [])

  const loadCompanyData = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: companyData, error } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (companyData) {
        setCompany(companyData)
        
        // 프로필 수정 페이지이므로 profile_completed 체크 제거

        // 기존 데이터로 폼 초기화
        setFormData({
          companyName: companyData.company_name || '',
          businessNumber: companyData.business_registration_number || '',
          contactPerson: companyData.contact_person || '',
          email: companyData.email || '',
          phone: companyData.phone || '',
          ceoName: companyData.ceo_name || '',
          businessType: companyData.business_type || '',
          businessCategory: companyData.business_category || '',
          companyPostalCode: companyData.company_postal_code || '',
          companyAddress: companyData.company_address || '',
          companyAddressDetail: '',
          notificationContactPerson: companyData.notification_contact_person || companyData.contact_person || '',
          notificationEmail: companyData.notification_email || companyData.email || '',
          notificationPhone: companyData.notification_phone || companyData.phone || '',
          isAgency: companyData.is_agency || false,
          emailNotificationConsent: companyData.email_notification_consent !== false,
          smsNotificationConsent: companyData.sms_notification_consent !== false,
          marketingConsent: companyData.marketing_consent || false,
        })
      }
    } catch (err) {
      console.error('Error loading company data:', err)
      setError('기업 정보를 불러오는데 실패했습니다.')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const handleNextStep = () => {
    // Step 1 유효성 검사
    if (currentStep === 1) {
      if (!formData.ceoName) {
        setError('대표자명을 입력해주세요.')
        return
      }
      if (!formData.businessType) {
        setError('업태를 입력해주세요.')
        return
      }
      if (!formData.businessCategory) {
        setError('종목을 입력해주세요.')
        return
      }
      if (!formData.companyPostalCode || !formData.companyAddress) {
        setError('사업장 주소를 입력해주세요.')
        return
      }
    }

    // Step 2 유효성 검사
    if (currentStep === 2) {
      if (!formData.notificationContactPerson) {
        setError('알림 담당자명을 입력해주세요.')
        return
      }
      if (!formData.notificationEmail) {
        setError('알림 수신 이메일을 입력해주세요.')
        return
      }
      if (!formData.notificationPhone) {
        setError('알림 수신 핸드폰 번호를 입력해주세요.')
        return
      }
    }

    setError('')
    setCurrentStep(currentStep + 1)
  }

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 주소 합치기
      const fullAddress = formData.companyAddressDetail 
        ? `${formData.companyAddress} ${formData.companyAddressDetail}`
        : formData.companyAddress

      const { error: updateError } = await supabaseBiz
        .from('companies')
        .update({
          ceo_name: formData.ceoName,
          business_type: formData.businessType,
          business_category: formData.businessCategory,
          company_postal_code: formData.companyPostalCode,
          company_address: fullAddress,
          notification_contact_person: formData.notificationContactPerson,
          notification_email: formData.notificationEmail,
          notification_phone: formData.notificationPhone,
          is_agency: formData.isAgency,
          email_notification_consent: formData.emailNotificationConsent,
          sms_notification_consent: formData.smsNotificationConsent,
          marketing_consent: formData.marketingConsent,
          consent_date: new Date().toISOString(),
          profile_completed: true,
          profile_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // 완료 후 대시보드로 이동
      setTimeout(() => {
        navigate('/company/dashboard')
      }, 1500)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message || '프로필 저장에 실패했습니다.')
      setLoading(false)
    }
  }

  const searchAddress = () => {
    // Daum 우편번호 API 연동
    new window.daum.Postcode({
      oncomplete: function(data) {
        setFormData(prev => ({
          ...prev,
          companyPostalCode: data.zonecode,
          companyAddress: data.address,
        }))
      }
    }).open()
  }

  // 완료 화면
  if (loading && !error) {
    return (
      <>
        <CompanyNavigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6 lg:ml-64">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">프로필 수정 완료!</h2>
            <p className="text-gray-600 mb-6">
              기업 정보가 성공적으로 수정되었습니다.<br />
              잠시 후 대시보드로 이동합니다.
            </p>
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          </CardContent>
        </Card>
      </div>
      </>
    )
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 lg:ml-64">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-2xl border-none">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Building className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              프로필 수정
            </CardTitle>
            <CardDescription className="text-base">
              캠페인 생성을 위해 기업 정보를 입력해주세요
            </CardDescription>
            
            {/* 진행 단계 표시 */}
            <div className="flex items-center justify-center space-x-4 pt-4">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">기본 정보</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">알림 설정</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">확인</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: 기본 정보 */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">회원가입 시 입력한 정보</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">회사명:</span>
                        <span className="ml-2 font-medium">{formData.companyName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">사업자등록번호:</span>
                        <span className="ml-2 font-medium">{formData.businessNumber || '미입력'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">담당자:</span>
                        <span className="ml-2 font-medium">{formData.contactPerson}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">이메일:</span>
                        <span className="ml-2 font-medium">{formData.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">세금계산서 발행 정보</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">대표자명 *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            type="text"
                            name="ceoName"
                            placeholder="홍길동"
                            value={formData.ceoName}
                            onChange={handleChange}
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">업태 *</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            type="text"
                            name="businessType"
                            placeholder="예: 제조업, 도소매업"
                            value={formData.businessType}
                            onChange={handleChange}
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">종목 *</label>
                      <Input
                        type="text"
                        name="businessCategory"
                        placeholder="예: 화장품 제조, 화장품 도소매"
                        value={formData.businessCategory}
                        onChange={handleChange}
                        className="h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">사업장 주소</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">우편번호 *</label>
                        <Input
                          type="text"
                          name="companyPostalCode"
                          placeholder="12345"
                          value={formData.companyPostalCode}
                          onChange={handleChange}
                          className="h-12"
                          readOnly
                          required
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={searchAddress}
                          className="h-12 w-full"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          주소 검색
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">주소 *</label>
                      <Input
                        type="text"
                        name="companyAddress"
                        placeholder="주소 검색 버튼을 클릭하세요"
                        value={formData.companyAddress}
                        onChange={handleChange}
                        className="h-12"
                        readOnly
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">상세주소</label>
                      <Input
                        type="text"
                        name="companyAddressDetail"
                        placeholder="상세주소를 입력하세요"
                        value={formData.companyAddressDetail}
                        onChange={handleChange}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">기업 구분</h3>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isAgency"
                        checked={formData.isAgency}
                        onChange={handleChange}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">광고대행사입니다</span>
                    </label>
                    <p className="text-sm text-gray-500">
                      광고대행사는 여러 브랜드의 캠페인을 관리할 수 있습니다.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: 알림 설정 */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">알림 담당자 정보</h3>
                    <p className="text-sm text-gray-600">
                      캠페인 진행 상황, 입금 확인, 세금계산서 발행 등의 알림을 받을 담당자 정보를 입력해주세요.
                    </p>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">담당자명 *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          name="notificationContactPerson"
                          placeholder="홍길동"
                          value={formData.notificationContactPerson}
                          onChange={handleChange}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">알림 수신 이메일 *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="email"
                          name="notificationEmail"
                          placeholder="notification@company.com"
                          value={formData.notificationEmail}
                          onChange={handleChange}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        캠페인 관련 중요 알림이 발송됩니다.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">알림 수신 핸드폰 번호 *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="tel"
                          name="notificationPhone"
                          placeholder="010-1234-5678"
                          value={formData.notificationPhone}
                          onChange={handleChange}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        긴급 알림 발송 시 사용됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">알림 수신 동의</h3>
                    
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="emailNotificationConsent"
                          checked={formData.emailNotificationConsent}
                          onChange={handleChange}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                        />
                        <div>
                          <span className="text-gray-900 font-medium">이메일 알림 수신 동의</span>
                          <p className="text-sm text-gray-600 mt-1">
                            캠페인 진행 상황, 입금 확인, 세금계산서 발행 등의 알림을 이메일로 받습니다.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="smsNotificationConsent"
                          checked={formData.smsNotificationConsent}
                          onChange={handleChange}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                        />
                        <div>
                          <span className="text-gray-900 font-medium">SMS 알림 수신 동의</span>
                          <p className="text-sm text-gray-600 mt-1">
                            긴급 알림 및 중요 공지사항을 SMS로 받습니다.
                          </p>
                        </div>
                      </label>

                      <div className="border-t border-gray-300 my-3"></div>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="marketingConsent"
                          checked={formData.marketingConsent}
                          onChange={handleChange}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                        />
                        <div>
                          <span className="text-gray-900 font-medium">마케팅 정보 수신 동의 (선택)</span>
                          <p className="text-sm text-gray-600 mt-1">
                            신규 서비스, 이벤트, 프로모션 등의 마케팅 정보를 받습니다.
                          </p>
                        </div>
                      </label>
                    </div>

                    <p className="text-xs text-gray-500">
                      * 알림 수신 동의는 언제든지 설정에서 변경하실 수 있습니다.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: 확인 */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">입력하신 정보를 확인해주세요</h3>
                    <p className="text-gray-600">정보가 정확한지 확인 후 등록을 완료해주세요.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">기본 정보</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">회사명:</span>
                          <span className="ml-2 font-medium">{formData.companyName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">사업자등록번호:</span>
                          <span className="ml-2 font-medium">{formData.businessNumber || '미입력'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">대표자명:</span>
                          <span className="ml-2 font-medium">{formData.ceoName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">담당자:</span>
                          <span className="ml-2 font-medium">{formData.contactPerson}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">업태/종목:</span>
                          <span className="ml-2 font-medium">{formData.businessType} / {formData.businessCategory}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">주소:</span>
                          <span className="ml-2 font-medium">
                            ({formData.companyPostalCode}) {formData.companyAddress} {formData.companyAddressDetail}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">기업 구분:</span>
                          <span className="ml-2 font-medium">{formData.isAgency ? '광고대행사' : '일반 기업'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">알림 담당자</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">담당자명:</span>
                          <span className="ml-2 font-medium">{formData.notificationContactPerson}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">이메일:</span>
                          <span className="ml-2 font-medium">{formData.notificationEmail}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">핸드폰:</span>
                          <span className="ml-2 font-medium">{formData.notificationPhone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">알림 수신 설정</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <CheckCircle className={`w-4 h-4 mr-2 ${formData.emailNotificationConsent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className={formData.emailNotificationConsent ? 'text-gray-900' : 'text-gray-500'}>
                            이메일 알림 {formData.emailNotificationConsent ? '수신' : '수신 거부'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className={`w-4 h-4 mr-2 ${formData.smsNotificationConsent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className={formData.smsNotificationConsent ? 'text-gray-900' : 'text-gray-500'}>
                            SMS 알림 {formData.smsNotificationConsent ? '수신' : '수신 거부'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className={`w-4 h-4 mr-2 ${formData.marketingConsent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className={formData.marketingConsent ? 'text-gray-900' : 'text-gray-500'}>
                            마케팅 정보 {formData.marketingConsent ? '수신' : '수신 거부'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex justify-between pt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="px-8"
                  >
                    이전
                  </Button>
                )}
                
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="ml-auto px-8"
                  >
                    다음
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="ml-auto px-8"
                  >
                    {loading ? '등록 중...' : '등록 완료'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Daum 우편번호 API 스크립트 */}
      <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
      </div>
    </>
  )
}

