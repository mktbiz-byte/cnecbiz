import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Mail, Lock, AlertCircle } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'

export default function LoginPageNew() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!supabaseBiz) {
      setError('시스템 오류가 발생했습니다. 나중에 다시 시도해주세요.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabaseBiz.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Check if admin first (관리자 체크를 먼저 수행)
      const { data: adminData, error: adminError } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', data.user.email)
        .maybeSingle()

      if (adminData) {
        console.log('Admin user detected:', adminData)
        navigate('/admin/dashboard')
        return
      }

      // 관리자가 아니면 기업 사용자 확인
      const { data: userData, error: userError } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (userData) {
        // 일반 기업 사용자
        console.log('Company user detected:', userData)
        navigate('/company/dashboard')
      } else {
        setError('등록되지 않은 사용자입니다. 회원가입을 먼저 진행해주세요.')
      }
    } catch (error) {
      setError(error.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Globe className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CNEC BIZ
            </span>
          </CardTitle>
          <CardDescription className="text-base">
            글로벌 인플루언서 마케팅 플랫폼
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Email/Password Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                이메일
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                비밀번호
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>


          <div className="text-center space-y-2">
            <div className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <button
                type="button"
                className="text-blue-600 font-medium hover:underline"
                onClick={() => navigate('/signup')}
              >
                회원가입
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <button
                type="button"
                className="hover:text-blue-600 hover:underline"
                onClick={() => navigate('/find-email')}
              >
                ID 찾기
              </button>
              <span className="text-gray-400">|</span>
              <button
                type="button"
                className="hover:text-blue-600 hover:underline"
                onClick={() => navigate('/find-password')}
              >
                비밀번호 찾기
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

