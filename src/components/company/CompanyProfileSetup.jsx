import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, User, Mail, Phone, MapPin, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CompanyProfileSetup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [company, setCompany] = useState(null)
  
  const [formData, setFormData] = useState({
    // 기본 정보
    companyName: '',
    businessNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    
    // 세금계산서 정보
    ceoName: '',
    businessType: '',
    businessCategory: '',
    companyPostalCode: '',
    companyAddress: '',
    companyAddressDetail: '',
    
    // 세금계산서 담당자
    taxInvoiceEmail: '',
    taxInvoiceContactPerson: '',
    
    // 알림 담당자
    notificationContactPerson: '',
    notificationEmail: '',
    notificationPhone: '',
    
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
        
        // 이미 프로필이 완성된 경우 대시보드로 이동
        if (companyData.profile_completed) {
          navigate('/company/dashboard')
          return
        }

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
          taxInvoiceEmail: companyData.tax_invoice_email || companyData.email || '',
          taxInvoiceContactPerson: companyData.tax_invoice_contact_person || companyData.contact_person || '',
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 유효성 검사
    if (!formData.companyName) {
      setError('회사명을 입력해주세요.')
      setLoading(false)
      return
    }
    if (!formData.businessNumber) {
      setError('사업자등록번호를 입력해주세요.')
      setLoading(false)
      return
    }
    if (!formData.ceoName) {
      setError('대표자명을 입력해주세요.')
      setLoading(false)
      return
    }
    if (!formData.businessType) {
      setError('업태를 입력해주세요.')
      setLoading(false)
      return
    }
    if (!formData.businessCategory) {
      setError('종목을 입력해주세요.')
      setLoading(false)
      return
    }
    if (!formData.companyPostalCode || !formData.companyAddress) {
      setError('사업장 주소를 입력해주세요.')
      setLoading(false)
      return
    }
    if (!formData.taxInvoiceEmail) {
      setError('세금계산서 수신 이메일을 입력해주세요.')
      setLoading(false)
      return
    }
    if (!formData.notificationEmail) {
      setError('알림 수신 이메일을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 주소 합치기
      const fullAddress = formData.companyAddressDetail 
        ? `${formData.companyAddress} ${formData.companyAddressDetail}`
        : formData.companyAddress

      // Supabase 업데이트
      const updateData = {
        company_name: formData.companyName,
        business_registration_number: formData.businessNumber,
        ceo_name: formData.ceoName,
        business_type: formData.businessType,
        business_category: formData.businessCategory,
        company_postal_code: formData.companyPostalCode,
        company_address: fullAddress,
        tax_invoice_email: formData.taxInvoiceEmail,
        tax_invoice_contact_person: formData.taxInvoiceContactPerson || formData.contactPerson,
        notification_contact_person: formData.notificationContactPerson || formData.contactPerson,
        notification_email: formData.notificationEmail,
        notification_phone: formData.notificationPhone || formData.phone,
        email_notification_consent: formData.emailNotificationConsent,
        sms_notification_consent: formData.smsNotificationConsent,
        marketing_consent: formData.marketingConsent,
        consent_date: new Date().toISOString(),
        profile_completed: true,
        profile_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('[ProfileSetup] 업데이트 데이터:', updateData)

      const { error: updateError } = await supabaseBiz
        .from('companies')
        .update(updateData)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[ProfileSetup] 업데이트 오류:', updateError)
        throw updateError
      }

      console.log('[ProfileSetup] 프로필 업데이트 성공')

      // 환영 알림 발송 (비동기)
      try {
        const notificationPhone = formData.notificationPhone || formData.phone
        const notificationEmail = formData.notificationEmail

        // 카카오톡 알림톡 발송
        if (notificationPhone && formData.smsNotificationConsent) {
          console.log('[ProfileSetup] 카카오톡 발송 시도:', notificationPhone)
          try {
            await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: notificationPhone,
                receiverName: formData.companyName,
                templateCode: '025100000912',
                variables: { '회원명': formData.companyName }
              })
            })
          } catch (kakaoError) {
            console.error('[ProfileSetup] 카카오톡 발송 오류:', kakaoError)
          }
        }

        // 이메일 발송
        if (notificationEmail && formData.emailNotificationConsent) {
          console.log('[ProfileSetup] 이메일 발송 시도:', notificationEmail)
          try {
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: notificationEmail,
                subject: '[CNEC BIZ] 회원가입을 환영합니다',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>회원가입을 환영합니다!</h2>
                    <p>안녕하세요, <strong>${formData.companyName}</strong>님.</p>
                    <p>CNEC BIZ 회원가입이 완료되었습니다.</p>
                    <p>앞으로도 많은 관심과 이용 부탁 드립니다.</p>
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h3>가입 정보</h3>
                      <p><strong>회사명:</strong> ${formData.companyName}</p>
                      <p><strong>이메일:</strong> ${formData.email}</p>
                    </div>
                    <p>감사합니다.</p>
                    <p>CNEC BIZ 팀</p>
                  </div>
                `
              })
            })
          } catch (emailError) {
            console.error('[ProfileSetup] 이메일 발송 오류:', emailError)
          }
        }
      } catch (notificationError) {
        console.error('[ProfileSetup] 환영 알림 발송 중 오류:', notificationError)
      }

      // 완료 후 대시보드로 이동
      alert('프로필 설정이 완료되었습니다!')
      navigate('/company/dashboard')

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

  // 로딩 화면
  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">프로필 등록 완료!</h2>
            <p className="text-gray-600 mb-6">
              기업 정보가 성공적으로 등록되었습니다.<br />
              잠시 후 대시보드로 이동합니다.
            </p>
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6 px-4 lg:py-12 pt-14 pb-20 lg:pt-12 lg:pb-12">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-2xl border-none">
          <CardHeader className="space-y-4 text-center pb-6 lg:pb-8">
            <div className="flex justify-center">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Building className="w-7 h-7 lg:w-10 lg:h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl lg:text-3xl font-bold">
              기업 정보 등록
            </CardTitle>
            <CardDescription className="text-base">
              캠페인 생성을 위해 기업 정보를 입력해주세요
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 lg:space-y-8 p-4 lg:p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
              {/* 회원가입 시 입력한 정보 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 lg:p-6">
                <h3 className="font-semibold text-blue-900 mb-4 text-base lg:text-lg">회원가입 시 입력한 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="min-w-0 truncate">
                    <span className="text-gray-600">담당자:</span>
                    <span className="ml-2 font-medium">{formData.contactPerson}</span>
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-gray-600">이메일:</span>
                    <span className="ml-2 font-medium">{formData.email}</span>
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-gray-600">전화번호:</span>
                    <span className="ml-2 font-medium">{formData.phone}</span>
                  </div>
                </div>
              </div>

              {/* 회사 기본 정보 */}
              <div className="space-y-6">
                <h3 className="font-bold text-lg lg:text-xl text-gray-900 border-b pb-3">회사 기본 정보</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">회사명 *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="text"
                        name="companyName"
                        placeholder="주식회사 하우파파"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">사업자등록번호 *</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="text"
                        name="businessNumber"
                        placeholder="123-45-67890"
                        value={formData.businessNumber}
                        onChange={handleChange}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 세금계산서 발행 정보 */}
              <div className="space-y-6">
                <h3 className="font-bold text-lg lg:text-xl text-gray-900 border-b pb-3">세금계산서 발행 정보</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">사업장 주소 *</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      name="companyPostalCode"
                      placeholder="우편번호"
                      value={formData.companyPostalCode}
                      readOnly
                      className="w-32 h-12"
                    />
                    <Button
                      type="button"
                      onClick={searchAddress}
                      variant="outline"
                      className="h-12 whitespace-nowrap"
                    >
                      주소 검색
                    </Button>
                  </div>
                  <Input
                    type="text"
                    name="companyAddress"
                    placeholder="주소"
                    value={formData.companyAddress}
                    readOnly
                    className="h-12"
                  />
                  <Input
                    type="text"
                    name="companyAddressDetail"
                    placeholder="상세주소"
                    value={formData.companyAddressDetail}
                    onChange={handleChange}
                    className="h-12"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">세금계산서 담당자</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="text"
                        name="taxInvoiceContactPerson"
                        placeholder="담당자명 (선택)"
                        value={formData.taxInvoiceContactPerson}
                        onChange={handleChange}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">세금계산서 수신 이메일 *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="email"
                        name="taxInvoiceEmail"
                        placeholder="tax@company.com"
                        value={formData.taxInvoiceEmail}
                        onChange={handleChange}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 알림 설정 */}
              <div className="space-y-6">
                <h3 className="font-bold text-lg lg:text-xl text-gray-900 border-b pb-3">알림 설정</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">알림 담당자명</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="text"
                        name="notificationContactPerson"
                        placeholder="담당자명 (선택)"
                        value={formData.notificationContactPerson}
                        onChange={handleChange}
                        className="pl-10 h-12"
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
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">알림 수신 핸드폰 번호</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="tel"
                      name="notificationPhone"
                      placeholder="01012345678"
                      value={formData.notificationPhone}
                      onChange={handleChange}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-gray-900">알림 수신 동의</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="emailNotificationConsent"
                        checked={formData.emailNotificationConsent}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">이메일 알림 수신 동의</span>
                        <p className="text-sm text-gray-600 mt-1">
                          캠페인 진행 상황, 결제 정보 등을 이메일로 받습니다.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="smsNotificationConsent"
                        checked={formData.smsNotificationConsent}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">SMS/카카오톡 알림 수신 동의</span>
                        <p className="text-sm text-gray-600 mt-1">
                          중요한 알림을 SMS 또는 카카오톡으로 받습니다.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="marketingConsent"
                        checked={formData.marketingConsent}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">마케팅 정보 수신 동의 (선택)</span>
                        <p className="text-sm text-gray-600 mt-1">
                          이벤트, 프로모션 등의 마케팅 정보를 받습니다.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? '저장 중...' : '확인'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
