/**
 * SNS OAuth 통합 테스트 페이지
 * - 크리에이터 Instagram OAuth 테스트
 * - 기업 Meta Ads OAuth 테스트
 * 내부 관리자 전용 (실 서비스 배포 전 테스트 용도)
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Loader2, FlaskConical, Instagram, Target, CheckCircle2, XCircle,
  AlertTriangle, ExternalLink, Shield, Eye, Users, BarChart3,
  Link2, RefreshCw, Copy, Info
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
export default function OAuthTestPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('instagram')
  // Instagram OAuth state
  const [igConnectLoading, setIgConnectLoading] = useState(false)
  const [igTestResult, setIgTestResult] = useState(null)
  const [igConnectedAccounts, setIgConnectedAccounts] = useState([])
  // Meta Ads OAuth state
  const [metaConnectLoading, setMetaConnectLoading] = useState(false)
  const [metaTestResult, setMetaTestResult] = useState(null)
  const [metaConnectedAccounts, setMetaConnectedAccounts] = useState([])
  useEffect(() => {
    checkAuth()
  }, [])
  // OAuth 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (code) {
      if (state === 'instagram_test') {
        handleInstagramCallback(code)
      } else if (state === 'meta_ads_test') {
        handleMetaAdsCallback(code)
      }
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])
  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      await fetchConnectedAccounts()
    } catch (err) {
      console.error('Auth error:', err)
      navigate('/admin/login')
    } finally {
      setLoading(false)
    }
  }
  const fetchConnectedAccounts = async () => {
    try {
      // Meta Ads 연동 계정 조회
      const { data: metaAccounts } = await supabaseBiz
        .from('meta_ad_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setMetaConnectedAccounts(metaAccounts || [])
    } catch (err) {
      console.error('Fetch accounts error:', err)
    }
  }
  // ========== Instagram OAuth ==========
  const handleInstagramConnect = () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID
    if (!appId) {
      alert('Facebook App ID (VITE_FACEBOOK_APP_ID)가 설정되지 않았습니다.')
      return
    }
    const redirectUri = `${window.location.origin}/admin/oauth-test`
    // instagram_basic: 앱 심사 불필요 (개발 모드에서 테스터 계정으로 바로 테스트 가능)
    // pages_show_list: Facebook 페이지 목록 조회 (Instagram 비즈니스 계정 연결 확인용)
    const scopes = 'public_profile'
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=instagram_test&response_type=code`
    window.location.href = authUrl
  }
  const handleInstagramCallback = async (code) => {
    setIgConnectLoading(true)
    setActiveTab('instagram')
    try {
      const redirectUri = `${window.location.origin}/admin/oauth-test`
      const res = await fetch('/.netlify/functions/instagram-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange_code', code, redirectUri })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setIgTestResult({
        success: true,
        message: `Instagram 연동 성공! @${result.data.username || result.data.name} 계정이 확인되었습니다.`,
        data: result.data
      })
    } catch (err) {
      setIgTestResult({
        success: false,
        message: `Instagram OAuth 실패: ${err.message}`,
        data: null
      })
    } finally {
      setIgConnectLoading(false)
    }
  }
  // ========== Meta Ads OAuth ==========
  const handleMetaAdsConnect = () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID
    if (!appId) {
      alert('Facebook App ID (VITE_FACEBOOK_APP_ID)가 설정되지 않았습니다.')
      return
    }
    const redirectUri = `${window.location.origin}/admin/oauth-test`
    const scopes = 'public_profile'
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=meta_ads_test&response_type=code`
    window.location.href = authUrl
  }
  const handleMetaAdsCallback = async (code) => {
    setMetaConnectLoading(true)
    setActiveTab('meta-ads')
    try {
      const redirectUri = `${window.location.origin}/admin/oauth-test`
      const res = await fetch('/.netlify/functions/meta-ads-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange_token', code, redirectUri })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setMetaTestResult({
        success: true,
        message: 'Meta Ads OAuth 성공! 토큰 및 광고 계정 조회 완료.',
        data: {
          tokenPreview: result.data.accessToken?.substring(0, 20) + '...',
          accountCount: result.data.adAccounts?.length || 0,
          accounts: result.data.adAccounts || []
        }
      })
    } catch (err) {
      setMetaTestResult({
        success: false,
        message: `Meta Ads OAuth 실패: ${err.message}`,
        data: null
      })
    } finally {
      setMetaConnectLoading(false)
    }
  }
  // ========== 로딩 ==========
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1200px] mx-auto">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="w-6 h-6" style={{ color: '#6C5CE7' }} />
              OAuth 연동 테스트
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Instagram / Meta Ads OAuth 연동을 내부 테스트합니다
            </p>
          </div>
          {/* 경고 배너 */}
          <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                이 페이지는 내부 테스트 전용입니다
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                실제 크리에이터/기업에게 노출되지 않습니다. OAuth 연동 흐름과 권한을 사전 검증하는 용도입니다.
              </p>
            </div>
          </div>
          {/* 탭 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="instagram" className="flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                크리에이터 Instagram
              </TabsTrigger>
              <TabsTrigger value="meta-ads" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                기업 Meta Ads
              </TabsTrigger>
            </TabsList>
            {/* ====== 탭 1: 크리에이터 Instagram ====== */}
            <TabsContent value="instagram">
              <div className="space-y-6">
                {/* 섹션 A: 크리에이터 안심 설명 UI */}
                <Card className="border-2" style={{ borderColor: '#6C5CE7' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="w-5 h-5" style={{ color: '#6C5CE7' }} />
                      크리에이터 안심 설명 (미리보기)
                    </CardTitle>
                    <CardDescription>
                      실제 연동 시 크리에이터에게 보여줄 화면입니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl p-6" style={{ background: '#F0EDFF' }}>
                      <h3 className="text-lg font-bold mb-4" style={{ color: '#1A1A2E' }}>
                        Instagram 계정을 안전하게 연동해주세요
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6C5CE7' }}>
                            <Shield className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">게시물 수정/삭제 권한 없음</p>
                            <p className="text-xs text-gray-600">크넥은 게시물 조회만 가능합니다. 수정, 삭제, 게시 권한은 요청하지 않습니다.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6C5CE7' }}>
                            <BarChart3 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">인사이트 조회 전용</p>
                            <p className="text-xs text-gray-600">팔로워 수, 도달률, 참여율 등 캠페인 성과 측정을 위한 통계 데이터만 수집합니다.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6C5CE7' }}>
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">개인정보 보호</p>
                            <p className="text-xs text-gray-600">DM, 비공개 게시물, 개인 메시지 등 사적인 정보에는 접근하지 않습니다.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6C5CE7' }}>
                            <Link2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">언제든 연동 해제 가능</p>
                            <p className="text-xs text-gray-600">Instagram 설정 &gt; 앱 및 웹사이트에서 직접 해제하거나, 크넥 내에서 해제할 수 있습니다.</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-white/70 border border-white">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          요청 권한: public_profile, pages_show_list, instagram_basic (앱 심사 불필요 — 테스터 계정으로 바로 테스트 가능)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* 섹션 B: Instagram OAuth 테스트 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Instagram className="w-5 h-5" style={{ color: '#6C5CE7' }} />
                      Instagram OAuth 테스트
                    </CardTitle>
                    <CardDescription>
                      Facebook Login 기반 Instagram Basic/Insights API 연동을 테스트합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 환경변수 체크 */}
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-2">환경변수 상태</p>
                        <div className="space-y-1">
                          <EnvCheck name="VITE_FACEBOOK_APP_ID" value={import.meta.env.VITE_FACEBOOK_APP_ID} />
                        </div>
                      </div>
                      {/* 연동 버튼 */}
                      <Button
                        onClick={handleInstagramConnect}
                        disabled={igConnectLoading || !import.meta.env.VITE_FACEBOOK_APP_ID}
                        style={{ background: '#6C5CE7' }}
                        className="text-white"
                      >
                        {igConnectLoading
                          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          : <Instagram className="w-4 h-4 mr-2" />
                        }
                        Instagram OAuth 시작
                      </Button>
                      {/* 테스트 결과 */}
                      {igTestResult && (
                        <InstagramResultCard result={igTestResult} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {/* ====== 탭 2: 기업 Meta Ads ====== */}
            <TabsContent value="meta-ads">
              <div className="space-y-6">
                {/* 섹션 A: 기업 안심 설명 UI */}
                <Card className="border-2" style={{ borderColor: '#6C5CE7' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="w-5 h-5" style={{ color: '#6C5CE7' }} />
                      기업 안심 설명 (미리보기)
                    </CardTitle>
                    <CardDescription>
                      실제 연동 시 기업 담당자에게 보여줄 화면입니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl p-6" style={{ background: '#F0EDFF' }}>
                      <h3 className="text-lg font-bold mb-4" style={{ color: '#1A1A2E' }}>
                        Meta 광고 계정을 연동해주세요
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6C5CE7' }}>
                            <Target className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">광고 성과 자동 수집</p>
                            <p className="text-xs text-gray-600">캠페인별 도달, 클릭, 전환 등 성과 데이터를 자동으로 수집하여 리포트를 제공합니다.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6C5CE7' }}>
                            <Shield className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">안전한 광고 관리</p>
                            <p className="text-xs text-gray-600">크넥이 승인한 크리에이터 콘텐츠만 광고로 집행합니다. 임의 광고 생성은 하지 않습니다.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6C5CE7' }}>
                            <Link2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">언제든 연동 해제 가능</p>
                            <p className="text-xs text-gray-600">Meta Business 설정에서 직접 해제하거나, 크넥 대시보드에서 해제할 수 있습니다.</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-white/70 border border-white">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          요청 권한: ads_management, ads_read, pages_show_list, pages_read_engagement, business_management
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* 섹션 B: Meta Ads OAuth 테스트 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5" style={{ color: '#6C5CE7' }} />
                      Meta Ads OAuth 테스트
                    </CardTitle>
                    <CardDescription>
                      Meta Business 광고 계정 연동을 테스트합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 환경변수 체크 */}
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-2">환경변수 상태</p>
                        <div className="space-y-1">
                          <EnvCheck name="VITE_FACEBOOK_APP_ID" value={import.meta.env.VITE_FACEBOOK_APP_ID} />
                        </div>
                      </div>
                      {/* 연동 버튼 */}
                      <Button
                        onClick={handleMetaAdsConnect}
                        disabled={metaConnectLoading || !import.meta.env.VITE_FACEBOOK_APP_ID}
                        style={{ background: '#6C5CE7' }}
                        className="text-white"
                      >
                        {metaConnectLoading
                          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          : <Target className="w-4 h-4 mr-2" />
                        }
                        Meta Ads OAuth 시작
                      </Button>
                      {/* 테스트 결과 */}
                      {metaTestResult && (
                        <TestResultCard result={metaTestResult} />
                      )}
                      {/* 기존 연동 계정 */}
                      {metaConnectedAccounts.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            기존 연동 계정 ({metaConnectedAccounts.length}개)
                          </p>
                          <div className="space-y-2">
                            {metaConnectedAccounts.map(acc => (
                              <div
                                key={acc.id}
                                className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{acc.ad_account_name || acc.ad_account_id}</p>
                                  <p className="text-xs text-gray-500">{acc.ad_account_id} · {acc.currency}</p>
                                </div>
                                <Badge
                                  className="text-xs"
                                  style={{
                                    background: acc.is_active ? 'rgba(0,184,148,0.1)' : 'rgba(255,107,107,0.1)',
                                    color: acc.is_active ? '#00B894' : '#FF6B6B'
                                  }}
                                >
                                  {acc.is_active ? '활성' : '비활성'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
// ========== 서브 컴포넌트 ==========
function EnvCheck({ name, value }) {
  const exists = !!value
  return (
    <div className="flex items-center gap-2">
      {exists
        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
        : <XCircle className="w-4 h-4 text-red-500" />
      }
      <span className="text-sm text-gray-700 font-mono">{name}</span>
      {exists
        ? <span className="text-xs text-green-600">설정됨</span>
        : <span className="text-xs text-red-500">미설정</span>
      }
    </div>
  )
}
function TestResultCard({ result }) {
  return (
    <div className={`p-4 rounded-xl border ${
      result.success
        ? 'border-green-200 bg-green-50'
        : 'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {result.success
          ? <CheckCircle2 className="w-5 h-5 text-green-600" />
          : <XCircle className="w-5 h-5 text-red-500" />
        }
        <p className={`text-sm font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
          {result.message}
        </p>
      </div>
      {result.data && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">토큰:</span>
            <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono">
              {result.data.tokenPreview}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">조회된 계정:</span>
            <span className="text-xs font-semibold text-gray-700">{result.data.accountCount}개</span>
          </div>
          {result.data.accounts?.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.data.accounts.map(acc => (
                <div key={acc.id} className="text-xs p-2 rounded-lg bg-white border border-gray-100 flex items-center justify-between">
                  <span className="text-gray-700">{acc.name || acc.id}</span>
                  <span className="text-gray-400 font-mono">{acc.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
// ========== Instagram 전용 결과 카드 ==========
function InstagramResultCard({ result }) {
  const [showRaw, setShowRaw] = useState(false)
  const d = result.data
  if (!result.success) {
    return (
      <div className="p-4 rounded-xl border border-red-200 bg-red-50">
        <div className="flex items-center gap-2 mb-1">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm font-semibold text-red-800">연동 실패</p>
        </div>
        <p className="text-xs text-red-600 mt-1">{result.message}</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {/* 성공 헤더 */}
      <div className="p-4 rounded-xl border border-green-200 bg-green-50 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">{result.message}</p>
          <p className="text-xs text-green-600 mt-0.5">
            토큰: <code className="bg-white px-1 rounded font-mono">{d?.tokenPreview}</code>
            {d?.tokenExpiresIn && <span className="ml-2">(유효기간 ~60일)</span>}
          </p>
        </div>
      </div>
      {/* Instagram 계정 정보 */}
      {d?.igConnected && d.igAccounts?.map(acc => (
        <div key={acc.igId} className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            {acc.profilePictureUrl
              ? <img src={acc.profilePictureUrl} alt={acc.username} className="w-12 h-12 rounded-full object-cover" />
              : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">{acc.username?.[0]?.toUpperCase()}</div>
            }
            <div>
              <p className="font-semibold text-gray-900">@{acc.username}</p>
              <p className="text-xs text-gray-500">Facebook 페이지: {acc.pageName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-purple-50 text-center">
              <p className="text-xl font-bold" style={{ color: '#6C5CE7' }}>{(acc.followersCount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">팔로워</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-center">
              <p className="text-xl font-bold" style={{ color: '#6C5CE7' }}>{(acc.mediaCount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">게시물</p>
            </div>
          </div>
        </div>
      ))}
      {/* Instagram 미연결 안내 */}
      {!d?.igConnected && (
        <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Facebook 연동은 성공, Instagram 계정 미연결</p>
              <p className="text-xs text-yellow-700 mt-1">{d?.igNotConnectedReason}</p>
            </div>
          </div>
        </div>
      )}
      {/* 최근 게시물 */}
      {d?.recentMedia?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">최근 게시물 ({d.recentMedia.length}개)</p>
          <div className="grid grid-cols-3 gap-2">
            {d.recentMedia.map(m => (
              <a key={m.id} href={m.permalink} target="_blank" rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                {m.thumbnail
                  ? <img src={m.thumbnail} alt="" className="w-full aspect-square object-cover" />
                  : <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs">{m.type}</div>
                }
                <div className="p-2 bg-white">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>❤️ {(m.likes || 0).toLocaleString()}</span>
                    <span>💬 {(m.comments || 0).toLocaleString()}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {/* 수집 가능 데이터 요약 */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">✅ 실제 서비스 시 수집 가능한 데이터</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
          <span>• 게시물 조회수 (Insights 심사 후)</span>
          <span>• 좋아요 / 댓글 수</span>
          <span>• 도달수 / 노출수 (Insights 심사 후)</span>
          <span>• 팔로워 수 / 증감</span>
          <span>• 저장수 / 공유수 (Insights 심사 후)</span>
          <span>• 팔로워 인구통계</span>
        </div>
        <p className="text-xs text-orange-600 mt-2">
          ⚠️ 조회수/도달수는 <code>instagram_manage_insights</code> 권한 필요 → 앱 심사 후 활성화
        </p>
      </div>
      {/* 원본 JSON 토글 */}
      <button
        onClick={() => setShowRaw(v => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <Info className="w-3 h-3" />
        {showRaw ? '원본 데이터 숨기기' : '원본 API 응답 보기'}
      </button>
      {showRaw && (
        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-xl overflow-auto max-h-60">
          {JSON.stringify(d, null, 2)}
        </pre>
      )}
    </div>
  )
}
