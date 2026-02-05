import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building, User, Phone, Mail, Lock, CheckCircle, AlertCircle, Globe, ArrowLeft, Sparkles, Clock, MessageSquare } from 'lucide-react'
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
  const [signupComplete, setSignupComplete] = useState(false)

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

      // 가입 완료 화면 표시 (자동 로그인 제거 - 승인 필요)
      setSignupComplete(true)

    } catch (error) {
      console.error('가입 오류:', error)
      setSignupError(error.message || '가입 중 오류가 발생했습니다.')
    } finally {
      setSignupLoading(false)
    }
  }

  // 가입 완료 화면
  if (signupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <InAppBrowserWarning />

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div
              className="flex items-center gap-2 cursor-pointer flex-shrink-0"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">CNEC</span>
            </div>
          </div>
        </header>

        {/* Success Content */}
        <div className="max-w-lg mx-auto px-4 lg:px-6 py-8 sm:py-12 lg:py-20">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 lg:p-10 text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-lg shadow-green-500/25">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              회원가입이 완료되었습니다!
            </h1>

            <p className="text-gray-600 mb-8 leading-relaxed">
              크넥 비즈니스 플랫폼에 오신 것을 환영합니다.
            </p>

            {/* Info Box */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-8 text-left border border-indigo-100">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">지금 바로 시작하세요!</h3>
                  <p className="text-sm text-gray-600">
                    로그인 후 캠페인을 등록하고 크리에이터를 만나보세요.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">캠페인 등록 방법</h3>
                  <p className="text-sm text-gray-600">
                    로그인 → 캠페인 관리 → 새 캠페인 등록
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate('/login')}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
              >
                로그인하기
              </Button>
            </div>

            {/* Contact */}
            <p className="text-sm text-gray-500 mt-6">
              문의사항이 있으시면 <span className="font-medium text-indigo-600">1833-6025</span>로 연락해 주세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <InAppBrowserWarning />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 cursor-pointer flex-shrink-0"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">CNEC</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈으로</span>
          </button>
        </div>
      </header>

      {/* Signup Form */}
      <div className="max-w-lg mx-auto px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        {/* Title */}
        <div className="text-center mb-6 lg:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            회원가입
          </h1>
          <p className="text-sm lg:text-base text-gray-500">
            크넥 비즈니스 플랫폼에 오신 것을 환영합니다
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSignup} className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                기본 정보
              </h3>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="회사명을 입력하세요"
                  className="h-11 sm:h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  담당자명 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="담당자명을 입력하세요"
                  className="h-11 sm:h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* 계정 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                계정 정보
              </h3>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  className="h-11 sm:h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  비밀번호 <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(8자 이상)</span>
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="h-11 sm:h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="h-11 sm:h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* 핸드폰 인증 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                핸드폰 인증 <span className="text-red-500">*</span>
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
                    className="flex-1 h-11 sm:h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                  <Button
                    type="button"
                    onClick={handleSendSMS}
                    disabled={smsLoading || smsVerified || smsTimer > 0}
                    className="whitespace-nowrap h-11 sm:h-12 px-3 sm:px-5 text-sm sm:text-base rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none"
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
                      className="flex-1 h-11 sm:h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <Button
                      type="button"
                      onClick={handleVerifySMS}
                      disabled={smsLoading}
                      className="whitespace-nowrap h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium"
                    >
                      확인
                    </Button>
                  </div>
                </div>
              )}

              {smsVerified && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">핸드폰 인증이 완료되었습니다</span>
                </div>
              )}

              {smsError && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 p-4 rounded-xl border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{smsError}</span>
                </div>
              )}
            </div>

            {/* 오류 메시지 */}
            {signupError && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-4 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{signupError}</span>
              </div>
            )}

            {/* 가입 버튼 */}
            <Button
              type="submit"
              className="w-full h-12 lg:h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none transition-all"
              disabled={signupLoading || !smsVerified}
            >
              {signupLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  가입 처리 중...
                </div>
              ) : (
                '가입하기'
              )}
            </Button>

            {/* 로그인 링크 */}
            <div className="text-center text-sm text-gray-500 pt-2">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
              >
                로그인
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          가입 시 크넥의 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
