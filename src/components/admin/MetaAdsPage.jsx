/**
 * Meta Ads Demo Page — ads_read 권한 심사용 데모
 * 실제 API 호출 없이 목업 데이터로 작동
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Loader2, Link2, Eye, MousePointerClick, DollarSign, TrendingUp,
  CheckCircle2, Target, BarChart3, ShoppingCart, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'

// ── 목업 데이터 ──────────────────────────────────────────
const MOCK_AD_ACCOUNTS = [
  { id: 'act_123456789', name: '라이즈비', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
  { id: 'act_987654321', name: '메디셕션', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
  { id: 'act_456789123', name: '씨스터앤', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
]

const MOCK_PERFORMANCE = {
  act_123456789: {
    summary: { impressions: 284500, clicks: 3420, ctr: 1.20, cpc: 287, spend: 982140, conversions: 89, roas: 4.2 },
    campaigns: [
      { id: 1, name: '라이즈비 브랜드 인지도', status: 'ACTIVE', impressions: 145200, clicks: 1840, spend: 528340, ctr: 1.27 },
      { id: 2, name: '라이즈비 전환 캠페인', status: 'ACTIVE', impressions: 98300, clicks: 1120, spend: 321400, ctr: 1.14 },
      { id: 3, name: '라이즈비 리타겟팅', status: 'PAUSED', impressions: 41000, clicks: 460, spend: 132400, ctr: 1.12 },
    ],
  },
  act_987654321: {
    summary: { impressions: 156800, clicks: 2100, ctr: 1.34, cpc: 312, spend: 655200, conversions: 52, roas: 3.8 },
    campaigns: [
      { id: 4, name: '메디셕션 신제품 런칭', status: 'ACTIVE', impressions: 98500, clicks: 1350, spend: 421200, ctr: 1.37 },
      { id: 5, name: '메디셕션 프로모션', status: 'ACTIVE', impressions: 58300, clicks: 750, spend: 234000, ctr: 1.29 },
    ],
  },
  act_456789123: {
    summary: { impressions: 203100, clicks: 2780, ctr: 1.37, cpc: 265, spend: 736700, conversions: 67, roas: 3.5 },
    campaigns: [
      { id: 6, name: '씨스터앤 여름 컬렉션', status: 'ACTIVE', impressions: 132000, clicks: 1820, spend: 482350, ctr: 1.38 },
      { id: 7, name: '씨스터앤 할인 이벤트', status: 'PAUSED', impressions: 71100, clicks: 960, spend: 254350, ctr: 1.35 },
    ],
  },
}

// ── 유틸 ──────────────────────────────────────────────────
const fmt = (n) => n?.toLocaleString('ko-KR') ?? '-'
const fmtKRW = (n) => `₩${fmt(n)}`

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function MetaAdsPage() {
  // 단계: idle → oauth → selecting → connecting → dashboard
  const [step, setStep] = useState('idle')
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [activeAccount, setActiveAccount] = useState(null)
  const [oauthProgress, setOauthProgress] = useState(0) // 0~100

  // 이미 연동된 계정이 있으면 대시보드부터
  useEffect(() => {
    if (connectedAccounts.length > 0) {
      setStep('dashboard')
      if (!activeAccount) setActiveAccount(connectedAccounts[0])
    }
  }, [connectedAccounts])

  // ── OAuth 시뮬레이션 ────────────────────────────────────
  const handleOAuthStart = () => {
    setStep('oauth')
    setOauthProgress(0)
    // 프로그레스 바 애니메이션
    const steps = [10, 30, 55, 75, 90, 100]
    steps.forEach((pct, i) => {
      setTimeout(() => {
        setOauthProgress(pct)
        if (pct === 100) {
          setTimeout(() => setStep('selecting'), 400)
        }
      }, 600 + i * 500)
    })
  }

  // ── 계정 선택 토글 ─────────────────────────────────────
  const toggleAccountSelect = (acc) => {
    setSelectedAccounts((prev) =>
      prev.find((a) => a.id === acc.id) ? prev.filter((a) => a.id !== acc.id) : [...prev, acc]
    )
  }

  // ── 연동하기 시뮬레이션 ─────────────────────────────────
  const handleConnect = () => {
    setStep('connecting')
    setTimeout(() => {
      setConnectedAccounts(selectedAccounts)
      setActiveAccount(selectedAccounts[0])
      setStep('dashboard')
    }, 1800)
  }

  // ── 현재 계정의 성과 데이터 ────────────────────────────
  const perf = activeAccount ? MOCK_PERFORMANCE[activeAccount.id] : null

  // ── 렌더링 ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-60 p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Meta 광고 관리
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Facebook & Instagram 광고 계정을 연동하고 성과를 확인하세요</p>
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

        {/* ── Step 1: 연동 전 (idle) ── */}
        {step === 'idle' && <IdleView onStart={handleOAuthStart} />}

        {/* ── Step 2: OAuth 진행 중 ── */}
        {step === 'oauth' && <OAuthModal progress={oauthProgress} />}

        {/* ── Step 3: 계정 선택 ── */}
        {step === 'selecting' && (
          <AccountSelectView
            accounts={MOCK_AD_ACCOUNTS}
            selected={selectedAccounts}
            onToggle={toggleAccountSelect}
            onConnect={handleConnect}
          />
        )}

        {/* ── Step 4: 연동 중 ── */}
        {step === 'connecting' && <ConnectingView />}

        {/* ── Step 5: 대시보드 ── */}
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
          {/* Meta 로고 */}
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
              광고 성과를 실시간으로 확인하고 관리할 수 있습니다.
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
              연동 시 광고 계정 읽기(ads_read) 권한이 필요합니다
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
                전환/ROAS 추적
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
        {/* Facebook 헤더 */}
        <div className="h-14 flex items-center px-5" style={{ backgroundColor: '#1877F2' }}>
          <svg viewBox="0 0 24 24" className="w-6 h-6 mr-2" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-white font-semibold text-sm">Facebook 로그인</span>
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
              {/* 프로그레스 바 */}
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, backgroundColor: '#1877F2' }}
                />
              </div>
              <div className="space-y-2 text-left text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${progress >= 30 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={progress >= 30 ? 'text-gray-700' : ''}>사용자 인증 확인</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${progress >= 60 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={progress >= 60 ? 'text-gray-700' : ''}>ads_read 권한 승인</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${progress >= 90 ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={progress >= 90 ? 'text-gray-700' : ''}>광고 계정 목록 조회</span>
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
            <p className="text-xs text-gray-500 mt-0.5">연동할 Meta 광고 계정을 선택하세요</p>
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
          <p className="text-sm text-gray-400 mt-1">잠시만 기다려주세요</p>
        </div>
      </div>
    </div>
  )
}

function DashboardView({ connectedAccounts, activeAccount, onSelectAccount, perf }) {
  const { summary, campaigns } = perf
  const prevSpend = summary.spend * 0.88
  const spendChange = ((summary.spend - prevSpend) / prevSpend * 100).toFixed(1)

  const kpiCards = [
    { label: '노출수', value: fmt(summary.impressions), icon: Eye, change: '+12.3%', up: true },
    { label: '클릭수', value: fmt(summary.clicks), icon: MousePointerClick, change: '+8.7%', up: true },
    { label: 'CTR', value: `${summary.ctr.toFixed(2)}%`, icon: Target, change: '+0.15%', up: true },
    { label: 'CPC', value: fmtKRW(summary.cpc), icon: DollarSign, change: '-3.2%', up: false },
    { label: '총 지출', value: fmtKRW(summary.spend), icon: BarChart3, change: `+${spendChange}%`, up: true },
    { label: '전환수', value: fmt(summary.conversions), icon: ShoppingCart, change: '+15.4%', up: true },
    { label: 'ROAS', value: `${summary.roas}x`, icon: TrendingUp, change: '+0.3', up: true },
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

      {/* 캠페인 목록 */}
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
                  <TableCell className="text-right text-sm font-medium tabular-nums" style={{ color: '#6C5CE7' }}>
                    {fmtKRW(camp.spend)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 푸터 정보 */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          데이터 기간: 최근 30일 · 마지막 동기화: {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
