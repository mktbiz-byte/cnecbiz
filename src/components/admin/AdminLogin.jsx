import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Mail } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error: signInError } = await supabaseBiz.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=admin`
        }
      })

      if (signInError) throw signInError
    } catch (error) {
      console.error('Google 로그인 오류:', error)
      setError('로그인에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-full">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            슈퍼 관리자 로그인
          </CardTitle>
          <CardDescription className="text-base mt-2">
            CNEC Biz 슈퍼 관리자 전용 페이지입니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? '로그인 중...' : 'Google로 로그인'}
          </Button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">📌 안내사항</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Google 계정으로 로그인하세요</li>
              <li>첫 로그인 시 자동으로 관리자 계정이 생성됩니다</li>
              <li>승인된 이메일만 접근 가능합니다</li>
            </ul>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              메인 페이지로 돌아가기
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

