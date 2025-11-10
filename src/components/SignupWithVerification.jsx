import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, User, Phone, Mail, Lock, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import InAppBrowserWarning from './InAppBrowserWarning'

export default function SignupWithVerification() {
  const navigate = useNavigate()
  
  // 단계 관리
  const [step, setStep] = useState(1) // 1: 기업정보, 2: 담당자정보, 3: 계정생성
  
  // Step 1: 기업 정보
  const [businessNumber, setBusinessNumber] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [ceoName, setCeoName] = useState('')
  const [verifiedBizInfo, setVerifiedBizInfo] = useState(null)
  const [bizCheckLoading, setBizCheckLoading] = useState(false)
  const [bizCheckError, setBizCheckError] = useState('')
  
  // Step 2: 담당자 정보 및 SMS 인증
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [smsVerified, setSmsVerified] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [smsTimer, setSmsTimer] = useState(0)
  
  // Step 3: 계정 생성
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState('')

  // SMS 타이머
  useEffect(() => {
    if (smsTimer > 0) {
      const timer = setTimeout(() => setSmsTimer(smsTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [smsTimer])

  // Step 1: 기업 정보 확인
  const handleCheckBusinessInfo = async () => {
    setBizCheckError('')
    
    if (!businessNumber || !companyName || !ceoName) {
      setBizCheckError('사업자번호, 회사명, 대표자명을 모두 입력해주세요.')
      return
    }

    setBizCheckLoading(true)

    try {
      const response = await fetch('/.netlify/functions/check-business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessNumber: businessNumber.replace(/[^0-9]/g, ''),
          ceoName: ceoName.trim(),
          companyName: companyName.trim()
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setBizCheckError(data.error || '기업 정보 확인 실패')
        return
      }

      // 검증 성공 - 사용자 입력값 포함
      setVerifiedBizInfo({
        ...data.data,
        corpName: companyName,
        ceoName: ceoName
      })
      setStep(2)
      
    } catch (error) {
      console.error('기업 정보 확인 오류:', error)
      setBizCheckError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setBizCheckLoading(false)
    }
  }

  // Step 2: SMS 인증번호 발송
  const handleSendSMS = async () => {
    setSmsError('')
    
    if (!contactPhone) {
      setSmsError('핸드폰 번호를 입력해주세요.')
      return
    }

    setSmsLoading(true)

    try {
      const response = await fetch('/.netlify/functions/send-sms-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contactPhone.replace(/[^0-9]/g, ''),
          name: contactPerson
        })
      })

      const data = await response.json()

      if (!data.success) {
        setSmsError(data.error || 'SMS 발송 실패')
        return
      }

      setSmsSent(true)
      setSmsTimer(600) // 10분
      alert('인증번호가 발송되었습니다. (10분 이내 입력)')
      
    } catch (error) {
      console.error('SMS 발송 오류:', error)
      setSmsError('서버 오류가 발생했습니다.')
    } finally {
      setSmsLoading(false)
    }
  }

  // Step 2: SMS 인증번호 확인
  const handleVerifySMS = async () => {
    setSmsError('')
    
    if (!smsCode) {
      setSmsError('인증번호를 입력해주세요.')
      return
    }

    setSmsLoading(true)

    try {
      const response = await fetch('/.netlify/functions/verify-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contactPhone.replace(/[^0-9]/g, ''),
          code: smsCode
        })
      })

      const data = await response.json()

      if (!data.success || !data.verified) {
        setSmsError(data.message || '인증번호가 일치하지 않습니다.')
        return
      }

      setSmsVerified(true)
      setStep(3)
      
    } catch (error) {
      console.error('SMS 인증 오류:', error)
      setSmsError('서버 오류가 발생했습니다.')
    } finally {
      setSmsLoading(false)
    }
  }

  // Step 3: 회원가입
  const handleSignup = async () => {
    setSignupError('')

    // 유효성 검사
    if (!email || !password || !passwordConfirm) {
      setSignupError('모든 필드를 입력해주세요.')
      return
    }

    if (password !== passwordConfirm) {
      setSignupError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      setSignupError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (!smsVerified) {
      setSignupError('SMS 인증을 먼저 완료해주세요.')
      return
    }

    setSignupLoading(true)

    try {
      // Netlify Function API 호출
      const response = await fetch('/.netlify/functions/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessNumber,
          ceoName,
          companyName,
          phoneNumber: contactPhone,
          smsCode,
          email,
          password
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '회원가입에 실패했습니다.')
      }

      // 회원가입 성공 - 로그인 후 프로필 작성 페이지로 이동
      const { error: loginError } = await supabaseBiz.auth.signInWithPassword({
        email,
        password
      })

      if (loginError) {
        alert('회원가입은 성공했으나 로그인에 실패했습니다. 로그인 페이지에서 다시 시도해주세요.')
        navigate('/login')
        return
      }

      alert('회원가입이 완료되었습니다! 프로필을 작성해주세요.')
      navigate('/company/profile-setup')

    } catch (error) {
      console.error('회원가입 오류:', error)
      setSignupError(error.message || '회원가입 중 오류가 발생했습니다.')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <>
      <InAppBrowserWarning />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-2xl border-none">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              기업 회원가입
            </CardTitle>
            
            {/* 진행 단계 표시 */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="text-sm font-medium">기업정보</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="text-sm font-medium">담당자정보</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="text-sm font-medium">계정생성</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: 기업 정보 확인 */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    사업자등록정보와 대조하여 본인 확인을 진행합니다.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사업자번호 *
                    </label>
                    <Input
                      type="text"
                      placeholder="10자리 숫자 (- 제외)"
                      value={businessNumber}
                      onChange={(e) => setBusinessNumber(e.target.value)}
                      maxLength={12}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      회사명 *
                    </label>
                    <Input
                      type="text"
                      placeholder="회사명을 입력하세요"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      대표자명 *
                    </label>
                    <Input
                      type="text"
                      placeholder="사업자등록증상의 대표자명"
                      value={ceoName}
                      onChange={(e) => setCeoName(e.target.value)}
                    />
                  </div>

                  {bizCheckError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{bizCheckError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleCheckBusinessInfo}
                    disabled={bizCheckLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    {bizCheckLoading ? '확인 중...' : '기업 정보 확인'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: 담당자 정보 및 SMS 인증 */}
            {step === 2 && (
              <div className="space-y-6">
                {/* 검증된 기업 정보 표시 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">기업 정보 확인 완료</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>회사명: {verifiedBizInfo?.corpName}</p>
                    <p>대표자: {verifiedBizInfo?.ceoName}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      담당자명 *
                    </label>
                    <Input
                      type="text"
                      placeholder="담당자 이름"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      담당자 핸드폰 *
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="010-1234-5678"
                        value={contactPhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          let formatted = value
                          if (value.length <= 3) {
                            formatted = value
                          } else if (value.length <= 7) {
                            formatted = value.slice(0, 3) + '-' + value.slice(3)
                          } else if (value.length <= 11) {
                            formatted = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7)
                          } else {
                            formatted = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11)
                          }
                          setContactPhone(formatted)
                        }}
                        disabled={smsSent && smsTimer > 0}
                        maxLength={13}
                      />
                      <Button
                        onClick={handleSendSMS}
                        disabled={smsLoading || (smsSent && smsTimer > 0)}
                        className="whitespace-nowrap"
                      >
                        {smsLoading ? '발송 중...' : smsSent ? '재발송' : '인증번호 발송'}
                      </Button>
                    </div>
                  </div>

                  {smsSent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        인증번호 *
                        {smsTimer > 0 && (
                          <span className="text-blue-600 ml-2">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {Math.floor(smsTimer / 60)}:{String(smsTimer % 60).padStart(2, '0')}
                          </span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="6자리 숫자"
                          value={smsCode}
                          onChange={(e) => setSmsCode(e.target.value)}
                          maxLength={6}
                        />
                        <Button
                          onClick={handleVerifySMS}
                          disabled={smsLoading}
                        >
                          {smsLoading ? '확인 중...' : '확인'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {smsError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{smsError}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="w-full"
                  >
                    이전 단계로
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: 계정 생성 */}
            {step === 3 && (
              <div className="space-y-6">
                {/* SMS 인증 완료 표시 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">SMS 인증 완료</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일 (로그인 ID) *
                    </label>
                    <Input
                      type="email"
                      placeholder="example@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 *
                    </label>
                    <Input
                      type="password"
                      placeholder="최소 6자 이상"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 확인 *
                    </label>
                    <Input
                      type="password"
                      placeholder="비밀번호 재입력"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                    />
                  </div>

                  {signupError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{signupError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleSignup}
                    disabled={signupLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    {signupLoading ? '가입 중...' : '회원가입 완료'}
                  </Button>

                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="w-full"
                  >
                    이전 단계로
                  </Button>
                </div>
              </div>
            )}

            {/* 로그인 링크 */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 font-medium hover:underline"
                >
                  로그인
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

