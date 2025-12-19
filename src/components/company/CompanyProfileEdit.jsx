import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, User, Mail, Phone, MapPin, FileText, CheckCircle, AlertCircle, Key, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import CompanyNavigation from './CompanyNavigation'

export default function CompanyProfileEdit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // const [currentStep, setCurrentStep] = useState(1) // 한 페이지로 통합
  const [company, setCompany] = useState(null)
  
  // 비밀번호 변경 관련 상태
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

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
          companyAddressDetail: '',  // 상세주소는 매번 입력
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

  // handleNextStep, handlePrevStep 제거 - 한 페이지로 통합

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
          company_name: formData.companyName,
          business_registration_number: formData.businessNumber,
          contact_person: formData.contactPerson,
          ceo_name: formData.ceoName,
          business_type: formData.businessType,
          business_category: formData.businessCategory,
          company_postal_code: formData.companyPostalCode,
          company_address: fullAddress,  // 기본주소 + 상세주소 합쳐서 저장
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

  // 비밀번호 변경 처리
  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    // 유효성 검사
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    // 복잡성 검사
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword)
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword)
    const hasNumbers = /\d/.test(passwordData.newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)

    if (!(hasUpperCase && hasLowerCase && hasNumbers) && !hasSpecialChar) {
      setPasswordError('비밀번호는 대문자, 소문자, 숫자를 포함하거나 특수문자를 포함해야 합니다.')
      return
    }

    setPasswordLoading(true)

    try {
      // 현재 비밀번호로 재인증
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { error: signInError } = await supabaseBiz.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      })

      if (signInError) {
        setPasswordError('현재 비밀번호가 올바르지 않습니다.')
        setPasswordLoading(false)
        return
      }

      // 비밀번호 업데이트
      const { error: updateError } = await supabaseBiz.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) throw updateError

      setPasswordSuccess(true)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })

      // 3초 후 성공 메시지 숨김
      setTimeout(() => setPasswordSuccess(false), 5000)
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordError('비밀번호 변경에 실패했습니다: ' + error.message)
    } finally {
      setPasswordLoading(false)
    }
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
            
            {/* 진행 단계 표시 제거 - 한 페이지로 통합 */}
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 기본 정보 */}
              <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-4">회원가입 시 입력한 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">회사명 *</label>
                        <Input
                          type="text"
                          name="companyName"
                          placeholder="회사명을 입력하세요"
                          value={formData.companyName}
                          onChange={handleChange}
                          className="h-12"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">사업자등록번호 *</label>
                        <Input
                          type="text"
                          name="businessNumber"
                          placeholder="123-45-67890"
                          value={formData.businessNumber}
                          onChange={handleChange}
                          className="h-12"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">담당자 *</label>
                        <Input
                          type="text"
                          name="contactPerson"
                          placeholder="홍길동"
                          value={formData.contactPerson}
                          onChange={handleChange}
                          className="h-12"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">이메일</label>
                        <div className="text-sm font-medium text-gray-900 p-3 bg-white rounded-md border">{formData.email}</div>
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


                </div>

              {/* 알림 설정 */}
              <div className="space-y-6 border-t border-gray-200 pt-8">
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

              {/* 비밀번호 변경 */}
              <div className="space-y-6 border-t border-gray-200 pt-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">비밀번호 변경</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    계정 보안을 위해 비밀번호를 주기적으로 변경해주세요.
                  </p>

                  {/* 성공 메시지 */}
                  {passwordSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-800">비밀번호가 성공적으로 변경되었습니다!</p>
                    </div>
                  )}

                  {/* 에러 메시지 */}
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-800">{passwordError}</p>
                    </div>
                  )}

                  <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                    {/* 현재 비밀번호 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">현재 비밀번호</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="현재 비밀번호 입력"
                          className="pl-10 pr-10 h-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* 새 비밀번호 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">새 비밀번호</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="8자 이상, 대소문자/숫자/특수문자 조합"
                          className="pl-10 pr-10 h-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        대문자, 소문자, 숫자를 포함하거나 특수문자를 포함해야 합니다 (8자 이상)
                      </p>
                    </div>

                    {/* 새 비밀번호 확인 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">새 비밀번호 확인</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="새 비밀번호 재입력"
                          className="pl-10 pr-10 h-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          비밀번호가 일치합니다
                        </p>
                      )}
                    </div>

                    {/* 변경 버튼 */}
                    <Button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={passwordLoading}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          변경 중...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          비밀번호 변경
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 입력 정보 확인 */}
              <div className="space-y-6 border-t border-gray-200 pt-8">
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

              {/* 저장 버튼 */}
              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-8"
                >
                  {loading ? '저장 중...' : '프로필 저장'}
                </Button>
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

