import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, User, Phone, Mail, Lock, CheckCircle, AlertCircle, Globe, ArrowLeft } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import InAppBrowserWarning from './InAppBrowserWarning'

export default function SignupWithVerification() {
  const navigate = useNavigate()
  
  // 기본 정보
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  
  // SMS 인증
  const [contactPhone, setContactPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [smsVerified, setSmsVerified] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [smsTimer, setSmsTimer] = useState(0)
  
  // 가입 처리
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState('')

  // SMS 타이머
  useEffect(() => {
    if (smsTimer > 0) {
      const timer = setTimeout(() => setSmsTimer(smsTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [smsTimer])

  // SMS 인증번호 발송
  const handleSendSMS = async () => {
    setSmsError('')
    
    if (!contactPhone) {
      setSmsError('핸드폰 번호를 입력해주세요.')
      return
    }

    // 핸드폰 번호 형식 검증
    const phoneRegex = /^01[0-9]{8,9}$/
    const cleanPhone = contactPhone.replace(/[^0-9]/g, '')
    
    if (!phoneRegex.test(cleanPhone)) {
      setSmsError('올바른 핸드폰 번호 형식이 아닙니다.')
      return
    }

    setSmsLoading(true)

    try {
      const response = await fetch('/.netlify/functions/send-sms-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setSmsError(data.error || 'SMS 발송 실패')
        return
      }

      setSmsSent(true)
      setSmsTimer(600) // 10분
      alert('인증번호가 발송되었습니다.')
      
    } catch (error) {
      console.error('SMS 발송 오류:', error)
      setSmsError('서버 오류가 발생했습니다.')
    } finally {
      setSmsLoading(false)
    }
  }

  // SMS 인증번호 확인
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

      if (!response.ok || !data.success) {
        setSmsError(data.error || '인증번호가 일치하지 않습니다.')
        return
      }

      setSmsVerified(true)
      setSmsTimer(0)
      alert('핸드폰 인증이 완료되었습니다!')
      
    } catch (error) {
      console.error('SMS 인증 오류:', error)
      setSmsError('서버 오류가 발생했습니다.')
    } finally {
      setSmsLoading(false)
    }
  }

  // 회원가입 처리
  const handleSignup = async (e) => {
    e.preventDefault()
    setSignupError('')

    // 유효성 검사
    if (!companyName || !contactPerson || !email || !password || !passwordConfirm) {
      setSignupError('모든 필드를 입력해주세요.')
      return
    }

    if (!smsVerified) {
      setSignupError('핸드폰 인증을 완료해주세요.')
      return
    }

    if (password !== passwordConfirm) {
      setSignupError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 8) {
      setSignupError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setSignupLoading(true)

    try {
      // 백엔드 Function을 통해 가입 처리 (이메일 인증 없이)
      const response = await fetch('/.netlify/functions/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.trim(),
          password: password,
          phoneNumber: contactPhone.replace(/[^0-9]/g, ''),
          smsCode: smsCode
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '가입 중 오류가 발생했습니다.')
      }

      // 자동 로그인
      const { error: signInError } = await supabaseBiz.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (signInError) throw signInError

      // 성공 메시지 및 리다이렉트
      alert('가입이 완료되었습니다! 프로필을 설정해주세요.')
      navigate('/company/profile-setup')

    } catch (error) {
      console.error('가입 오류:', error)
      setSignupError(error.message || '가입 중 오류가 발생했습니다.')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <InAppBrowserWarning />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">CNEC</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="text-sm">
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">홈으로</span>
            <span className="sm:hidden">홈</span>
          </Button>
        </div>
      </header>

      {/* Signup Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-3xl font-bold text-center text-gray-800">
              회원가입
            </CardTitle>
            <p className="text-center text-sm sm:text-base text-gray-600">
              크넥 비즈니스 플랫폼에 오신 것을 환영합니다
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4 sm:space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5" />
                  기본 정보
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    회사명 *
                  </label>
                  <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="회사명을 입력하세요"
                    className="h-11 sm:h-12"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    담당자명 *
                  </label>
                  <Input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="담당자명을 입력하세요"
                    className="h-11 sm:h-12"
                    required
                  />
                </div>
              </div>

              {/* 계정 정보 */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  계정 정보
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    이메일 *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일을 입력하세요"
                    className="h-11 sm:h-12"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    비밀번호 * (8자 이상)
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="h-11 sm:h-12"
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    비밀번호 확인 *
                  </label>
                  <Input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                    className="h-11 sm:h-12"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {/* 핸드폰 인증 */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  핸드폰 인증 *
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    핸드폰 번호
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="01012345678"
                      disabled={smsVerified}
                      className="h-11 sm:h-12 flex-1"
                      required
                    />
                    <Button
                      type="button"
                      onClick={handleSendSMS}
                      disabled={smsLoading || smsVerified || smsTimer > 0}
                      className="whitespace-nowrap h-11 sm:h-12 px-3 sm:px-4 text-sm"
                    >
                      {smsTimer > 0 ? `${Math.floor(smsTimer / 60)}:${String(smsTimer % 60).padStart(2, '0')}` : '인증번호 발송'}
                    </Button>
                  </div>
                </div>

                {smsSent && !smsVerified && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      인증번호
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        placeholder="인증번호 6자리"
                        maxLength={6}
                        className="h-11 sm:h-12 flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifySMS}
                        disabled={smsLoading}
                        className="whitespace-nowrap h-11 sm:h-12 px-4 sm:px-6"
                      >
                        확인
                      </Button>
                    </div>
                  </div>
                )}

                {smsVerified && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm sm:text-base">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="font-medium">핸드폰 인증 완료</span>
                  </div>
                )}

                {smsError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>{smsError}</span>
                  </div>
                )}
              </div>

              {/* 오류 메시지 */}
              {signupError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>{signupError}</span>
                </div>
              )}

              {/* 가입 버튼 */}
              <Button
                type="submit"
                className="w-full h-12 sm:h-14 text-base sm:text-lg"
                disabled={signupLoading || !smsVerified}
              >
                {signupLoading ? '가입 중...' : '가입하기'}
              </Button>

              {/* 로그인 링크 */}
              <div className="text-center text-sm sm:text-base text-gray-600 pt-2">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  로그인
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
