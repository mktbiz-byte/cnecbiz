import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, ArrowLeft, Key, Eye, EyeOff, X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz } from '@/lib/supabaseClients'

const LoginPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})

  // 비밀번호 변경 모달 상태
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState('')

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

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      if (!supabaseBiz) {
        alert('서비스 연결에 실패했습니다. 환경 변수를 확인해주세요.')
        setLoading(false)
        return
      }

      const { data, error } = await supabaseBiz.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) throw error

      // Store user session
      localStorage.setItem('cnecbiz_user', JSON.stringify(data.user))

      // 비밀번호 변경 필요 여부 확인
      const { data: companyData } = await supabaseBiz
        .from('companies')
        .select('password_reset_required')
        .eq('user_id', data.user.id)
        .single()

      if (companyData?.password_reset_required) {
        // 비밀번호 변경 모달 표시
        setShowPasswordChangeModal(true)
        setLoading(false)
      } else {
        alert('로그인 성공!')
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      if (error.message === 'Invalid login credentials') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
      }
      alert(errorMessage)
    } finally {
      if (!showPasswordChangeModal) {
        setLoading(false)
      }
    }
  }

  // 비밀번호 변경 처리
  const handlePasswordChange = async () => {
    setPasswordChangeError('')

    // 유효성 검사
    if (!passwordChangeData.newPassword || !passwordChangeData.confirmPassword) {
      setPasswordChangeError('모든 필드를 입력해주세요.')
      return
    }

    if (passwordChangeData.newPassword.length < 8) {
      setPasswordChangeError('비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }

    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordChangeError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    // 복잡성 검사
    const hasUpperCase = /[A-Z]/.test(passwordChangeData.newPassword)
    const hasLowerCase = /[a-z]/.test(passwordChangeData.newPassword)
    const hasNumbers = /\d/.test(passwordChangeData.newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordChangeData.newPassword)

    if (!(hasUpperCase && hasLowerCase && hasNumbers) && !hasSpecialChar) {
      setPasswordChangeError('비밀번호는 대문자, 소문자, 숫자를 포함하거나 특수문자를 포함해야 합니다.')
      return
    }

    setPasswordChangeLoading(true)

    try {
      // Supabase Auth 비밀번호 업데이트
      const { error: updateError } = await supabaseBiz.auth.updateUser({
        password: passwordChangeData.newPassword
      })

      if (updateError) throw updateError

      // companies 테이블의 플래그 해제
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (user) {
        await supabaseBiz
          .from('companies')
          .update({ password_reset_required: false })
          .eq('user_id', user.id)
      }

      alert('비밀번호가 성공적으로 변경되었습니다!')
      setShowPasswordChangeModal(false)
      navigate('/dashboard')
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordChangeError('비밀번호 변경에 실패했습니다: ' + error.message)
    } finally {
      setPasswordChangeLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
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

      {/* Login Form */}
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20">
        <Card className="shadow-lg">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-3xl">로그인</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              CNEC 계정으로 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Email */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@company.com"
                  className={`h-11 sm:h-12 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">비밀번호</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`h-11 sm:h-12 ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full py-3 sm:py-4 text-base sm:text-lg" size="lg" disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </Button>

              {/* Links */}
              <div className="text-center space-y-2">
                <div className="text-sm sm:text-base text-gray-600">
                  계정이 없으신가요?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    회원가입
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => navigate('/find-email')}
                    className="hover:underline"
                  >
                    ID 찾기
                  </button>
                  <span className="mx-2">|</span>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="hover:underline"
                  >
                    비밀번호 찾기
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">비밀번호 변경 필요</h2>
                  <p className="text-sm opacity-90">보안을 위해 새 비밀번호를 설정해주세요</p>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 space-y-5">
              {/* 경고 메시지 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">임시 비밀번호로 로그인하셨습니다</p>
                  <p className="text-sm text-amber-700 mt-1">
                    계정 보안을 위해 새로운 비밀번호를 설정해야 합니다.
                  </p>
                </div>
              </div>

              {/* 에러 메시지 */}
              {passwordChangeError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{passwordChangeError}</p>
                </div>
              )}

              {/* 새 비밀번호 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordChangeData.newPassword}
                    onChange={(e) => setPasswordChangeData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="8자 이상 입력"
                    className="pr-10 h-12"
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
                  대문자, 소문자, 숫자를 포함하거나 특수문자 포함 (8자 이상)
                </p>
              </div>

              {/* 비밀번호 확인 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordChangeData.confirmPassword}
                    onChange={(e) => setPasswordChangeData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="비밀번호 재입력"
                    className="pr-10 h-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordChangeData.confirmPassword && passwordChangeData.newPassword === passwordChangeData.confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    비밀번호가 일치합니다
                  </p>
                )}
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 bg-slate-50 border-t">
              <Button
                onClick={handlePasswordChange}
                disabled={passwordChangeLoading}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {passwordChangeLoading ? (
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
              <p className="text-xs text-center text-gray-500 mt-3">
                비밀번호 변경 후 서비스를 이용하실 수 있습니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage
