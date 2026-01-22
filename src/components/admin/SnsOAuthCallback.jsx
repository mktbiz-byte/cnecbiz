/**
 * SNS OAuth 콜백 페이지
 * OAuth 인증 완료 후 코드를 서버로 전송하고 결과 표시
 */

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Youtube, Instagram, Music2 } from 'lucide-react'

const PLATFORMS = {
  youtube: { name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  tiktok: { name: 'TikTok', icon: Music2, color: 'text-black' }
}

export default function SnsOAuthCallback() {
  const { platform } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState('processing') // processing, success, error
  const [message, setMessage] = useState('')
  const [accountInfo, setAccountInfo] = useState(null)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // 에러 체크
    if (error) {
      setStatus('error')
      setMessage(errorDescription || error)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('인증 코드가 없습니다.')
      return
    }

    try {
      const redirectUri = `${window.location.origin}/admin/sns-uploads/callback/${platform}`

      const response = await fetch('/.netlify/functions/sns-oauth-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          code,
          redirectUri
        })
      })

      const result = await response.json()

      if (result.success) {
        setStatus('success')
        setAccountInfo(result.data)
        setMessage(`${PLATFORMS[platform]?.name || platform} 계정이 연동되었습니다.`)
      } else {
        setStatus('error')
        setMessage(result.error || '계정 연동에 실패했습니다.')
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      setStatus('error')
      setMessage('서버 오류가 발생했습니다.')
    }
  }

  const platformConfig = PLATFORMS[platform] || { name: platform, icon: Loader2 }
  const Icon = platformConfig.icon

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full bg-gray-100`}>
              <Icon className={`w-12 h-12 ${platformConfig.color}`} />
            </div>
          </div>
          <CardTitle>{platformConfig.name} 계정 연동</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'processing' && (
            <div className="py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-gray-500">계정 연동 중...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-green-600 font-medium mb-2">{message}</p>
              {accountInfo && (
                <div className="bg-gray-50 p-4 rounded-lg mt-4 text-left">
                  <p className="text-sm text-gray-500">연동된 계정</p>
                  <p className="font-medium">{accountInfo.account_name}</p>
                  {accountInfo.account_id && (
                    <p className="text-sm text-gray-500">{accountInfo.account_id}</p>
                  )}
                </div>
              )}
              <Button
                className="mt-6"
                onClick={() => navigate('/admin/sns-uploads')}
              >
                SNS 업로드 관리로 이동
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <p className="text-red-600 font-medium mb-2">연동 실패</p>
              <p className="text-gray-500 text-sm">{message}</p>
              <div className="flex gap-2 justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/sns-uploads')}
                >
                  돌아가기
                </Button>
                <Button onClick={() => window.location.reload()}>
                  다시 시도
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
