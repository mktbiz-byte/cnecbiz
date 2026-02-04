import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FindPasswordPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setEmail(e.target.value)
    if (error) setError('')
  }

  const validateEmail = () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식을 입력해주세요')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateEmail()) return

    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || '비밀번호 재설정 요청에 실패했습니다.')
      }
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error)
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-6 lg:px-8 lg:py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 px-4 lg:px-6">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              로그인으로 돌아가기
            </Button>
          </div>
          <CardTitle className="text-xl lg:text-2xl font-bold">비밀번호 찾기</CardTitle>
          <CardDescription className="text-sm lg:text-base">
            가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 lg:px-6">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-12"
                />
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading}
              >
                {loading ? '전송 중...' : '비밀번호 재설정 이메일 받기'}
              </Button>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                <p className="font-medium mb-1">💡 안내</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>등록된 이메일로 비밀번호 재설정 링크가 발송됩니다</li>
                  <li>이메일이 오지 않으면 스팸함을 확인해주세요</li>
                  <li>링크는 1시간 동안 유효합니다</li>
                </ul>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">
                    이메일이 발송되었습니다
                  </h3>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>{email}</strong>로 비밀번호 재설정 링크를 보냈습니다.
                  </p>
                  <p className="text-gray-600">
                    이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정하세요.
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                <p className="font-medium mb-1">📧 이메일이 오지 않나요?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>스팸함을 확인해주세요</li>
                  <li>이메일 주소가 정확한지 확인해주세요</li>
                  <li>몇 분 후에 다시 시도해주세요</li>
                </ul>
              </div>

              <Button
                className="w-full h-12"
                onClick={() => navigate('/login')}
              >
                로그인 페이지로 이동
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FindPasswordPage
