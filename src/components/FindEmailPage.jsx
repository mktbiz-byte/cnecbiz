import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Mail, Phone, CheckCircle, AlertCircle, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FindEmailPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [smsVerified, setSmsVerified] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsTimer, setSmsTimer] = useState(0)
  const [error, setError] = useState('')
  const [foundAccounts, setFoundAccounts] = useState(null)

  // SMS 타이머
  useEffect(() => {
    if (smsTimer > 0) {
      const timer = setTimeout(() => setSmsTimer(smsTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [smsTimer])

  // SMS 인증번호 발송
  const handleSendSMS = async () => {
    setError('')

    if (!phoneNumber) {
      setError('핸드폰 번호를 입력해주세요.')
      return
    }

    const phoneRegex = /^01[0-9]{8,9}$/
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')

    if (!phoneRegex.test(cleanPhone)) {
      setError('올바른 핸드폰 번호 형식이 아닙니다.')
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
        setError(data.error || 'SMS 발송 실패')
        return
      }

      setSmsSent(true)
      setSmsTimer(600) // 10분
      alert('인증번호가 발송되었습니다.')

    } catch (error) {
      console.error('SMS 발송 오류:', error)
      setError('서버 오류가 발생했습니다.')
    } finally {
      setSmsLoading(false)
    }
  }

  // SMS 인증번호 확인 및 이메일 찾기
  const handleVerifyAndFind = async () => {
    setError('')

    if (!smsCode) {
      setError('인증번호를 입력해주세요.')
      return
    }

    setSmsLoading(true)

    try {
      // 1. SMS 인증번호 확인
      const verifyResponse = await fetch('/.netlify/functions/verify-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.replace(/[^0-9]/g, ''),
          code: smsCode
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok || !verifyData.success || !verifyData.verified) {
        setError(verifyData.message || '인증번호가 일치하지 않습니다.')
        return
      }

      setSmsVerified(true)
      setSmsTimer(0)

      // 2. 이메일 찾기
      const findResponse = await fetch('/.netlify/functions/find-email-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/[^0-9]/g, '')
        })
      })

      const findData = await findResponse.json()

      if (!findResponse.ok || !findData.success) {
        setError(findData.error || '등록된 계정을 찾을 수 없습니다.')
        return
      }

      setFoundAccounts(findData.accounts)

    } catch (error) {
      console.error('오류:', error)
      setError('서버 오류가 발생했습니다.')
    } finally {
      setSmsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 cursor-pointer flex-shrink-0"
            onClick={() => navigate('/')}
          >
            <Globe className="w-6 h-6 text-orange-500" />
            <span className="text-lg font-bold text-gray-900">CNEC</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>로그인</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4 px-4 lg:px-6">
            <CardTitle className="text-xl lg:text-2xl font-bold text-center text-gray-800">
              ID(이메일) 찾기
            </CardTitle>
            <CardDescription className="text-center text-sm lg:text-base">
              가입 시 등록한 핸드폰 번호로 이메일을 찾을 수 있습니다.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 lg:px-6">
            {!foundAccounts ? (
              <div className="space-y-4 sm:space-y-6">
                {/* 핸드폰 번호 입력 */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    핸드폰 번호
                  </label>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="01012345678"
                      disabled={smsVerified}
                      className="h-12"
                    />
                    <Button
                      type="button"
                      onClick={handleSendSMS}
                      disabled={smsLoading || smsVerified || smsTimer > 0}
                      className="whitespace-nowrap h-12 px-3 sm:px-4 text-sm"
                    >
                      {smsTimer > 0 ? `${Math.floor(smsTimer / 60)}:${String(smsTimer % 60).padStart(2, '0')}` : '인증번호 발송'}
                    </Button>
                  </div>
                </div>

                {/* 인증번호 입력 */}
                {smsSent && !smsVerified && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      인증번호
                    </label>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Input
                        type="text"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        placeholder="인증번호 6자리"
                        maxLength={6}
                        className="h-12"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyAndFind}
                        disabled={smsLoading}
                        className="whitespace-nowrap h-12 px-4 sm:px-6"
                      >
                        {smsLoading ? '확인 중...' : '확인'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 인증 완료 */}
                {smsVerified && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">핸드폰 인증 완료</span>
                  </div>
                )}

                {/* 오류 메시지 */}
                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 안내 */}
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">💡 안내</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>가입 시 등록한 핸드폰 번호로만 찾을 수 있습니다</li>
                    <li>인증번호는 10분간 유효합니다</li>
                    <li>번호가 변경되었다면 고객센터로 문의해주세요</li>
                  </ul>
                </div>

                {/* 로그인 링크 */}
                <div className="text-center text-sm text-gray-600 pt-2">
                  비밀번호가 기억나지 않으세요?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/find-password')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    비밀번호 찾기
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">
                      {foundAccounts.length}개의 계정을 찾았습니다
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {foundAccounts.map((account, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <p className="font-medium text-gray-900">{account.email}</p>
                        <p className="text-sm text-gray-600">{account.companyName}</p>
                        <p className="text-xs text-gray-400">
                          가입일: {new Date(account.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => {
                      setFoundAccounts(null)
                      setPhoneNumber('')
                      setSmsCode('')
                      setSmsSent(false)
                      setSmsVerified(false)
                      setError('')
                    }}
                  >
                    다시 찾기
                  </Button>
                  <Button
                    className="flex-1 h-12"
                    onClick={() => navigate('/login')}
                  >
                    로그인하기
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  비밀번호가 기억나지 않으세요?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/find-password')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    비밀번호 찾기
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FindEmailPage
