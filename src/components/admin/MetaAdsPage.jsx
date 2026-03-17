/**
 * Meta Ads Demo Page — ads_read 권한 심사용 데모
 * 실제 API 호출 없이 목업 데이터로 작동
 */

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Loader2, Link2, Eye, MousePointerClick, DollarSign, TrendingUp,
  CheckCircle2, Target, BarChart3, ShoppingCart, ArrowUpRight, ArrowDownRight,
  Info, User, AlertCircle,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import AdminNavigation from './AdminNavigation'

// ── 목업 데이터 ──────────────────────────────────────────
const MOCK_AD_ACCOUNTS = [
  { id: 'act_123456789', name: '라이즈비', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
  { id: 'act_987654321', name: '메디셕션', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
  { id: 'act_456789123', name: '씨스터앤', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
]

const MOCK_PERFORMANCE = {
  act_123456789: {
    summary: { impressions: 384200, clicks: 11526, ctr: 3.0, cpc: 215, spend: 2478090, conversions: 312, roas: 4.8 },
    campaigns: [
      { id: 1, name: '라이즈비 x 크리에이터A 영상 광고', status: 'ACTIVE', impressions: 182400, clicks: 5840, spend: 1255600, ctr: 3.20, roas: 5.1 },
      { id: 2, name: '라이즈비 x 크리에이터B 릴스 전환', status: 'ACTIVE', impressions: 128300, clicks: 3820, spend: 821500, ctr: 2.98, roas: 4.6 },
      { id: 3, name: '라이즈비 크리에이터 리뷰 리타겟팅', status: 'PAUSED', impressions: 73500, clicks: 1866, spend: 400990, ctr: 2.54, roas: 4.2 },
    ],
  },
  act_987654321: {
    summary: { impressions: 256800, clicks: 6420, ctr: 2.5, cpc: 278, spend: 1784760, conversions: 198, roas: 3.6 },
    campaigns: [
      { id: 4, name: '메디셕션 x 뷰티크리에이터 영상 광고', status: 'ACTIVE', impressions: 168500, clicks: 4372, spend: 1215400, ctr: 2.59, roas: 3.9 },
      { id: 5, name: '메디셕션 크리에이터 후기 프로모션', status: 'ACTIVE', impressions: 88300, clicks: 2048, spend: 569360, ctr: 2.32, roas: 3.1 },
    ],
  },
  act_456789123: {
    summary: { impressions: 423100, clicks: 14808, ctr: 3.5, cpc: 198, spend: 2931984, conversions: 421, roas: 5.2 },
    campaigns: [
      { id: 6, name: '씨스터앤 x 크리에이터C 썸머 영상', status: 'ACTIVE', impressions: 245000, clicks: 9310, spend: 1843380, ctr: 3.80, roas: 5.8 },
      { id: 7, name: '씨스터앤 크리에이터 콘텐츠 전환', status: 'ACTIVE', impressions: 112600, clicks: 3488, spend: 690604, ctr: 3.10, roas: 4.5 },
      { id: 8, name: '씨스터앤 인플루언서 리타겟팅', status: 'PAUSED', impressions: 65500, clicks: 2010, spend: 398000, ctr: 3.07, roas: 4.0 },
    ],
  },
}

// 크리에이터별 광고 효율 목업
const MOCK_CREATOR_PERFORMANCE = [
  { creator: '크리에이터C (김소연)', campaign: '씨스터앤 x 크리에이터C 썸머 영상', impressions: 245000, clicks: 9310, ctr: 3.80, roas: 5.8 },
  { creator: '크리에이터A (박지은)', campaign: '라이즈비 x 크리에이터A 영상 광고', impressions: 182400, clicks: 5840, ctr: 3.20, roas: 5.1 },
  { creator: '크리에이터B (이수빈)', campaign: '라이즈비 x 크리에이터B 릴스 전환', impressions: 128300, clicks: 3820, ctr: 2.98, roas: 4.6 },
  { creator: '크리에이터F (정유나)', campaign: '씨스터앤 크리에이터 콘텐츠 전환', impressions: 112600, clicks: 3488, ctr: 3.10, roas: 4.5 },
  { creator: '크리에이터D (최혜원)', campaign: '라이즈비 크리에이터 리뷰 리타겟팅', impressions: 73500, clicks: 1866, ctr: 2.54, roas: 4.2 },
  { creator: '크리에이터G (한서윤)', campaign: '씨스터앤 인플루언서 리타겟팅', impressions: 65500, clicks: 2010, ctr: 3.07, roas: 4.0 },
  { creator: '크리에이터E (오민지)', campaign: '메디셕션 x 뷰티크리에이터 영상 광고', impressions: 168500, clicks: 4372, ctr: 2.59, roas: 3.9 },
  { creator: '크리에이터H (송다영)', campaign: '메디셕션 크리에이터 후기 프로모션', impressions: 88300, clicks: 2048, ctr: 2.32, roas: 3.1 },
]

// 일별 ROAS 추이 (최근 30일)
function generateDailyRoas() {
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const base = 3.8 + Math.sin(i * 0.3) * 1.2
    const noise = (Math.random() - 0.5) * 0.8
    data.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      roas: Math.max(1.8, +(base + noise).toFixed(2)),
    })
  }
  return data
}

// ── 유틸 ──────────────────────────────────────────────────
const fmt = (n) => n?.toLocaleString('ko-KR') ?? '-'
const fmtKRW = (n) => `₩${fmt(n)}`

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function MetaAdsPage() {
  // 단계: idle → oauth → auth_complete → selecting → connecting → dashboard
  const [step, setStep] = useState('idle')
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [activeAccount, setActiveAccount] = useState(null)
  const [oauthProgress, setOauthProgress] = useState(0)

  useEffect(() => {
    if (connectedAccounts.length > 0) {
      setStep('dashboard')
      if (!activeAccount) setActiveAccount(connectedAccounts[0])
    }
  }, [connectedAccounts])

  // ── OAuth 시뮬레이션 (팝업 → 인증완료 모달 → 계정선택) ──
  const handleOAuthStart = () => {
    setStep('oauth')
    setOauthProgress(0)
    const steps = [10, 25, 45, 65, 80, 95, 100]
    steps.forEach((pct, i) => {
      setTimeout(() => {
        setOauthProgress(pct)
        if (pct === 100) {
          // 2초 후 인증 완료 모달 표시
          setTimeout(() => setStep('auth_complete'), 800)
        }
      }, 600 + i * 400)
    })
  }

  const toggleAccountSelect = (acc) => {
    setSelectedAccounts((prev) =>
      prev.find((a) => a.id === acc.id) ? prev.filter((a) => a.id !== acc.id) : [...prev, acc]
    )
  }

  const handleConnect = () => {
    setStep('connecting')
    setTimeout(() => {
      setConnectedAccounts(selectedAccounts)
      setActiveAccount(selectedAccounts[0])
      setStep('dashboard')
    }, 1800)
  }

  const perf = activeAccount ? MOCK_PERFORMANCE[activeAccount.id] : null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-60 p-6 space-y-6">
        {/* 권한 안내 문구 */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800 font-medium">
              이 기능은 ads_read 권한을 사용하여 광고 성과 데이터를 읽기 전용으로 조회합니다. 광고를 생성하거나 수정하지 않습니다.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              수집된 데이터는 광고 효율 분석 대시보드 제공 목적으로만 사용되며, 제3자에게 판매되거나 공유되지 않습니다.
            </p>
          </div>
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Meta 광고 관리
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Facebook & Instagram 광고 계정을 연동하고 크리에이터 영상 광고 성과를 확인하세요</p>
          </div>
          {step === 'dashboard' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep('idle')
                setConnectedAccounts([])
                setActiveAccount(null)
                setSelectedAccounts([])
              }}
            >
              계정 재연동
            </Button>
          )}
        </div>

        {step === 'idle' && <IdleView onStart={handleOAuthStart} />}
        {step === 'oauth' && <OAuthModal progress={oauthProgress} />}
        {step === 'auth_complete' && <AuthCompleteModal onContinue={() => setStep('selecting')} />}
        {step === 'selecting' && (
          <AccountSelectView
            accounts={MOCK_AD_ACCOUNTS}
            selected={selectedAccounts}
            onToggle={toggleAccountSelect}
            onConnect={handleConnect}
          />
        )}
        {step === 'connecting' && <ConnectingView />}
        {step === 'dashboard' && perf && (
          <DashboardView
            connectedAccounts={connectedAccounts}
            activeAccount={activeAccount}
            onSelectAccount={setActiveAccount}
            perf={perf}
          />
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function IdleView({ onStart }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg text-center shadow-lg border-0">
        <CardContent className="py-16 px-10 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#1877F2] flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 36 36" className="w-10 h-10" fill="white">
              <path d="M20.181 35.87C29.094 34.791 36 27.202 36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 4.991 2.035 9.5 5.322 12.756l.002-.001 1.621-1.06A15.932 15.932 0 013 18C3 9.716 9.716 3 18 3s15 6.716 15 15-6.716 15-15 15c-.644 0-1.278-.04-1.9-.12l.081.99z" />
              <path d="M21.214 23.89l-2.909-4.644-3.58 4.644h-3.562l5.357-6.854-5.093-8.147h3.7l2.682 4.29 3.312-4.29h3.562l-5.088 6.473 5.357 8.527h-3.738z" />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Meta 광고 계정 연동
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Facebook & Instagram 광고 계정을 연동하면<br />
              크리에이터 영상 광고 성과를 실시간으로 확인하고 관리할 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onStart}
              className="w-full h-12 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#1877F2' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook으로 로그인하여 연동
            </Button>
            <p className="text-xs text-gray-400">
              연동 시 광고 계정 읽기(ads_read) 권한만 요청합니다
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 text-left">
            <p className="text-xs font-semibold text-gray-600 mb-2">연동 후 사용 가능한 기능</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                광고 계정 조회
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                캠페인 성과 분석
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                실시간 지출 모니터링
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                크리에이터별 ROAS 분석
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OAuthModal({ progress }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-14 flex items-center px-5" style={{ backgroundColor: '#1877F2' }}>
          <svg viewBox="0 0 24 24" className="w-6 h-6 mr-2" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-white font-semibold text-sm">Facebook 로그인</span>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
          </div>
        </div>

        <div className="p-8 space-y-6 text-center">
          {progress < 100 ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#1877F2] animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">Facebook 인증 중...</p>
                <p className="text-xs text-gray-400">광고 계정 접근 권한을 확인하고 있습니다</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, backgroundColor: '#1877F2' }}
                />
              </div>
              <div className="space-y-2 text-left text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${progress >= 25 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={progress >= 25 ? 'text-gray-700' : ''}>사용자 인증 확인</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${progress >= 50 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={progress >= 50 ? 'text-gray-700' : ''}>ads_read 권한 승인</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${progress >= 80 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={progress >= 80 ? 'text-gray-700' : ''}>Business Manager 연결</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${progress >= 95 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={progress >= 95 ? 'text-gray-700' : ''}>광고 계정 목록 조회</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-1">인증 완료!</p>
                <p className="text-xs text-gray-400">광고 계정을 불러오고 있습니다...</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AuthCompleteModal({ onContinue }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-14 flex items-center px-5" style={{ backgroundColor: '#1877F2' }}>
          <svg viewBox="0 0 24 24" className="w-6 h-6 mr-2" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-white font-semibold text-sm">인증 완료</span>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Facebook 인증이 완료되었습니다</h3>
            <p className="text-sm text-gray-500">아래 정보로 로그인되었습니다</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">CNEC Admin</p>
                <p className="text-xs text-gray-500">admin@howpapa.co.kr</p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">승인된 권한</span>
                <Badge className="bg-green-50 text-green-700 border-0 text-xs">ads_read</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Business Manager</span>
                <span className="text-gray-700 font-medium">HOWPAPA Inc.</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">연결 가능 계정</span>
                <span className="text-gray-700 font-medium">{MOCK_AD_ACCOUNTS.length}개</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              ads_read 권한만 승인되었습니다. 광고 데이터는 읽기 전용으로만 조회되며, 광고 생성/수정/삭제는 수행되지 않습니다.
            </p>
          </div>

          <Button
            onClick={onContinue}
            className="w-full h-11 rounded-xl font-semibold"
            style={{ backgroundColor: '#6C5CE7' }}
          >
            광고 계정 선택하기
          </Button>
        </div>
      </div>
    </div>
  )
}

function AccountSelectView({ accounts, selected, onToggle, onConnect }) {
  return (
    <Card className="shadow-md border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
            <Link2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">광고 계정 선택</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">연동할 Meta 광고 계정을 선택하세요 (ads_read 전용)</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.map((acc) => {
          const isSelected = selected.find((a) => a.id === acc.id)
          return (
            <button
              key={acc.id}
              onClick={() => onToggle(acc)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-[#6C5CE7] bg-[#F0EDFF]'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  isSelected ? 'bg-[#6C5CE7] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {acc.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className={`font-semibold text-sm ${isSelected ? 'text-[#6C5CE7]' : 'text-gray-800'}`}>
                    {acc.name}
                  </p>
                  <p className="text-xs text-gray-400">{acc.id} · {acc.currency}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected ? 'border-[#6C5CE7] bg-[#6C5CE7]' : 'border-gray-300'
              }`}>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </button>
          )
        })}

        <div className="pt-4 flex justify-end">
          <Button
            onClick={onConnect}
            disabled={selected.length === 0}
            className="h-11 px-8 rounded-xl font-semibold"
            style={{ backgroundColor: '#6C5CE7' }}
          >
            <Link2 className="w-4 h-4 mr-2" />
            {selected.length > 0 ? `${selected.length}개 계정 연동하기` : '계정을 선택하세요'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectingView() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-4">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-[#6C5CE7]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#6C5CE7] border-t-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-[#F0EDFF] flex items-center justify-center">
            <Link2 className="w-6 h-6 text-[#6C5CE7]" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-gray-800">광고 계정 연동 중...</p>
          <p className="text-sm text-gray-400 mt-1">성과 데이터를 동기화하고 있습니다</p>
        </div>
      </div>
    </div>
  )
}

function DashboardView({ connectedAccounts, activeAccount, onSelectAccount, perf }) {
  const { summary, campaigns } = perf
  const dailyRoas = useMemo(() => generateDailyRoas(), [activeAccount?.id])
  const avgRoas = +(dailyRoas.reduce((s, d) => s + d.roas, 0) / dailyRoas.length).toFixed(2)

  const prevSpend = summary.spend * 0.88
  const spendChange = ((summary.spend - prevSpend) / prevSpend * 100).toFixed(1)

  const kpiCards = [
    { label: '노출수', value: fmt(summary.impressions), icon: Eye, change: '+18.5%', up: true },
    { label: '클릭수', value: fmt(summary.clicks), icon: MousePointerClick, change: '+22.3%', up: true },
    { label: 'CTR', value: `${summary.ctr.toFixed(1)}%`, icon: Target, change: '+0.4%', up: true },
    { label: 'CPC', value: fmtKRW(summary.cpc), icon: DollarSign, change: '-8.1%', up: false },
    { label: '총 지출', value: fmtKRW(summary.spend), icon: BarChart3, change: `+${spendChange}%`, up: true },
    { label: '전환수', value: fmt(summary.conversions), icon: ShoppingCart, change: '+25.7%', up: true },
    { label: 'ROAS', value: `${summary.roas}x`, icon: TrendingUp, change: '+0.6', up: true },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 계정 탭 */}
      <div className="flex items-center gap-2">
        {connectedAccounts.map((acc) => (
          <button
            key={acc.id}
            onClick={() => onSelectAccount(acc)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeAccount?.id === acc.id
                ? 'bg-[#6C5CE7] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {acc.name}
          </button>
        ))}
        <Badge variant="outline" className="ml-2 text-green-600 border-green-200 bg-green-50">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
          연동됨
        </Badge>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#F0EDFF] flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-[#6C5CE7]" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${
                  kpi.up ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {kpi.up
                    ? <ArrowUpRight className="w-3 h-3" />
                    : <ArrowDownRight className="w-3 h-3" />
                  }
                  {kpi.change}
                </span>
              </div>
              <p className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {kpi.value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROAS 추이 차트 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6C5CE7]" />
            일별 ROAS 추이 (최근 30일)
          </CardTitle>
          <p className="text-xs text-gray-400 mt-1">평균 ROAS: {avgRoas}x</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRoas} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: '#999' }} domain={[1, 'auto']} tickFormatter={(v) => `${v}x`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v) => [`${v}x`, 'ROAS']}
                />
                <ReferenceLine y={avgRoas} stroke="#6C5CE7" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `평균 ${avgRoas}x`, position: 'right', fill: '#6C5CE7', fontSize: 11 }} />
                <Line type="monotone" dataKey="roas" stroke="#6C5CE7" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#6C5CE7' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 캠페인별 성과 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-[#6C5CE7]" />
            캠페인별 성과
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>캠페인명</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-right">노출수</TableHead>
                <TableHead className="text-right">클릭수</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">지출</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((camp) => (
                <TableRow key={camp.id}>
                  <TableCell className="font-medium text-sm">{camp.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={
                      camp.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-700 border-0'
                        : 'bg-gray-50 text-gray-500 border-0'
                    }>
                      {camp.status === 'ACTIVE' ? '활성' : '일시정지'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmt(camp.impressions)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmt(camp.clicks)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{camp.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-medium">{camp.roas}x</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums" style={{ color: '#6C5CE7' }}>
                    {fmtKRW(camp.spend)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 크리에이터별 광고 효율 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-[#6C5CE7]" />
            크리에이터별 광고 효율 (ROAS 순)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>크리에이터</TableHead>
                <TableHead>캠페인</TableHead>
                <TableHead className="text-right">노출수</TableHead>
                <TableHead className="text-right">클릭수</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CREATOR_PERFORMANCE.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-sm">{row.creator}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">{row.campaign}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmt(row.impressions)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{fmt(row.clicks)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{row.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${row.roas >= 4.5 ? 'text-green-600' : row.roas >= 3.5 ? 'text-[#6C5CE7]' : 'text-amber-600'}`}>
                      {row.roas}x
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 푸터 */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          데이터 기간: 최근 30일 · 마지막 동기화: {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          · 권한: ads_read (읽기 전용)
        </p>
      </div>
    </div>
  )
}
