import { useState, useEffect } from 'react'
import { AlertCircle, ExternalLink } from 'lucide-react'

export default function InAppBrowserWarning() {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [browserName, setBrowserName] = useState('')

  useEffect(() => {
    detectInAppBrowser()
  }, [])

  const detectInAppBrowser = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera

    // Instagram 인앱 브라우저 감지
    if (userAgent.includes('Instagram')) {
      setIsInAppBrowser(true)
      setBrowserName('Instagram')
      return
    }

    // Facebook/Messenger 인앱 브라우저 감지
    if (userAgent.includes('FBAN') || userAgent.includes('FBAV') || userAgent.includes('FB_IAB')) {
      setIsInAppBrowser(true)
      setBrowserName('Facebook')
      return
    }

    // 카카오톡 인앱 브라우저 감지
    if (userAgent.includes('KAKAOTALK')) {
      setIsInAppBrowser(true)
      setBrowserName('카카오톡')
      return
    }

    // 네이버 앱 인앱 브라우저 감지
    if (userAgent.includes('NAVER')) {
      setIsInAppBrowser(true)
      setBrowserName('네이버')
      return
    }

    // Line 앱 인앱 브라우저 감지
    if (userAgent.includes('Line')) {
      setIsInAppBrowser(true)
      setBrowserName('Line')
      return
    }

    // Twitter 앱 인앱 브라우저 감지
    if (userAgent.includes('Twitter')) {
      setIsInAppBrowser(true)
      setBrowserName('Twitter')
      return
    }

    // WeChat 인앱 브라우저 감지
    if (userAgent.includes('MicroMessenger')) {
      setIsInAppBrowser(true)
      setBrowserName('WeChat')
      return
    }
  }

  const openInSafari = () => {
    // iOS에서 현재 URL을 Safari로 열기
    const currentUrl = window.location.href
    
    // iOS Safari에서 열기 (Universal Link 방식)
    window.location.href = currentUrl
    
    // 또는 사용자에게 복사 안내
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl)
      alert('현재 페이지 주소가 복사되었습니다. Safari 브라우저를 열어 주소창에 붙여넣기 해주세요.')
    }
  }

  if (!isInAppBrowser) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b-2 border-yellow-400 shadow-lg">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-yellow-900 mb-1">
              ⚠️ Google 로그인이 지원되지 않는 환경입니다
            </h3>
            <p className="text-sm text-yellow-800 mb-3">
              {browserName} 앱 내에서는 보안상의 이유로 Google 로그인을 사용할 수 없습니다.
              <br />
              원활한 로그인을 위해 <strong>Safari 브라우저</strong>에서 열어주세요.
            </p>
            
            <div className="bg-white rounded-lg p-3 border border-yellow-300">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                📱 Safari에서 열기 방법:
              </p>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>화면 우측 하단 또는 상단의 <strong>더보기(...)</strong> 버튼을 누르세요</li>
                <li><strong>"Safari에서 열기"</strong> 또는 <strong>"기본 브라우저에서 열기"</strong>를 선택하세요</li>
                <li>Safari에서 다시 Google 로그인을 시도해주세요</li>
              </ol>
            </div>

            <button
              onClick={openInSafari}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Safari에서 열기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

