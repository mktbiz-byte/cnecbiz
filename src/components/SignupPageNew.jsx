import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Mail, Lock, Building, User, Phone, AlertCircle, CheckCircle } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import { sendCompanySignupNotification } from '../services/notifications'

export default function SignupPageNew() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    companyName: '',
    businessNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 유효성 검사
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    if (!supabaseBiz) {
      setError('시스템 오류가 발생했습니다. 나중에 다시 시도해주세요.')
      setLoading(false)
      return
    }

    try {
      // 1. Supabase Auth에 사용자 생성
      const { data: authData, error: authError } = await supabaseBiz.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      // 2. Companies 테이블에 기업 정보 저장
      const { error: companyError } = await supabaseBiz
        .from('companies')
        .insert([
          {
            user_id: authData.user.id,
            company_name: formData.companyName,
            business_registration_number: formData.businessNumber,
            contact_person: formData.contactPerson,
            email: formData.email,
            phone: formData.phone,
          },
        ])

      if (companyError) throw companyError

      // 3. 기본 팀 생성
      const { data: teamData, error: teamError } = await supabaseBiz
        .from('teams')
        .insert([
          {
            name: `${formData.companyName} 팀`,
            description: '기본 팀',
            company_id: authData.user.id,
          },
        ])
        .select()
        .single()

      if (teamError) throw teamError

      // 4. 팀원으로 추가 (Owner)
      const { error: memberError } = await supabaseBiz
        .from('team_members')
        .insert([
          {
            team_id: teamData.id,
            user_id: authData.user.id,
            role: 'owner',
          },
        ])

      if (memberError) throw memberError

      // 회원가입 환영 알림톡 발송
      try {
        await sendCompanySignupNotification(
          formData.phone,
          formData.contactPerson,
          { companyName: formData.companyName }
        )
      } catch (notifError) {
        console.error('알림톡 발송 실패:', notifError)
        // 알림톡 실패해도 회원가입은 성공
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/company/dashboard')
      }, 2000)
    } catch (error) {
      setError(error.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')

    if (!supabaseBiz) {
      setError('시스템 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabaseBiz.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error) {
      setError(error.message || 'Google 회원가입에 실패했습니다.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">회원가입 완료!</h2>
            <p className="text-gray-600 mb-6">
              환영합니다! 잠시 후 대시보드로 이동합니다.
            </p>
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl border-none">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <Globe className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              CNEC
            </span>
          </CardTitle>
          <CardDescription className="text-base">
            글로벌 인플루언서 마케팅을 시작하세요
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Google 회원가입 */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-2 hover:bg-gray-50"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 계속하기
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">또는 이메일로 가입</span>
            </div>
          </div>

          {/* 이메일 회원가입 폼 */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">회사명 *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    name="companyName"
                    placeholder="주식회사 CNEC"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">사업자등록번호</label>
                <Input
                  type="text"
                  name="businessNumber"
                  placeholder="123-45-67890"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  className="h-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">담당자명 *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    name="contactPerson"
                    placeholder="홍길동"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">전화번호</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="tel"
                    name="phone"
                    placeholder="010-1234-5678"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">이메일 *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="your@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">비밀번호 *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">비밀번호 확인 *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                회원가입 시 <span className="font-medium">이용약관</span> 및{' '}
                <span className="font-medium">개인정보처리방침</span>에 동의하게 됩니다.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-medium"
              disabled={loading}
            >
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          <div className="text-center">
            <div className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                className="text-blue-600 font-medium hover:underline"
                onClick={() => navigate('/login')}
              >
                로그인
              </button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              type="button"
              className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => navigate('/')}
            >
              ← 메인으로 돌아가기
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

