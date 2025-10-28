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

      // 사용자 역할 확인
      const { data: userData } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      // Check if admin first
      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', data.user.email)
        .single()

      if (adminData) {
        navigate('/admin/dashboard')
        return
      }

      if (userData) {
        // 일반 기업 사용자
        navigate('/company/dashboard')
      } else {
        setError('등록되지 않은 사용자입니다.')
      }
    } catch (error) {
      setError(error.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
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
      setError(error.message || 'Google 로그인에 실패했습니다.')
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

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-2 hover:bg-gray-50"
            onClick={handleGoogleLogin}
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

