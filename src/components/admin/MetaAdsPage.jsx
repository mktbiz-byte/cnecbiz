/**
 * Meta Ads Demo Page — ads_read + instagram_basic permission review demo
 * Uses mock data only, no real API calls
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Link2, Eye, MousePointerClick, DollarSign, TrendingUp,
  CheckCircle2, Target, BarChart3, ShoppingCart, ArrowUpRight, ArrowDownRight,
  Search, User, Heart, MessageCircle, Image as ImageIcon, Play, Grid3X3,
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import AdminNavigation from './AdminNavigation'

// ── Mock Data ──────────────────────────────────────────
const MOCK_AD_ACCOUNTS = [
  { id: 'act_123456789', name: 'Risebee', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
  { id: 'act_987654321', name: 'Medisection', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
  { id: 'act_456789123', name: 'Sister&', currency: 'KRW', timezone: 'Asia/Seoul', status: 1 },
]

const MOCK_CREATORS = {
  'beauty_creator_kr': {
    username: 'beauty_creator_kr',
    name: 'Soyeon Kim',
    bio: 'K-beauty & Skincare Creator\nDaily skincare tips & honest reviews\ncollab@beautycreator.kr',
    followers: 52300,
    following: 892,
    posts: 1284,
    engagementRate: 4.2,
    avgLikes: 3800,
    recentMedia: [
      { likes: 2100, comments: 89, type: 'IMAGE' },
      { likes: 4500, comments: 156, type: 'VIDEO' },
      { likes: 1800, comments: 72, type: 'IMAGE' },
      { likes: 3200, comments: 134, type: 'CAROUSEL' },
      { likes: 5100, comments: 201, type: 'VIDEO' },
      { likes: 2700, comments: 98, type: 'IMAGE' },
    ]
  },
  'glow_makeup_jp': {
    username: 'glow_makeup_jp',
    name: 'Yuki Tanaka',
    bio: 'Japanese Makeup Artist\nTutorials & Product Reviews\nyuki@glowmakeup.jp',
    followers: 31200,
    following: 445,
    posts: 876,
    engagementRate: 5.1,
    avgLikes: 2900,
    recentMedia: [
      { likes: 3400, comments: 112, type: 'VIDEO' },
      { likes: 2200, comments: 78, type: 'IMAGE' },
      { likes: 4100, comments: 189, type: 'VIDEO' },
      { likes: 1900, comments: 65, type: 'IMAGE' },
      { likes: 2800, comments: 94, type: 'CAROUSEL' },
      { likes: 3600, comments: 143, type: 'IMAGE' },
    ]
  },
  'skincare_daily_us': {
    username: 'skincare_daily_us',
    name: 'Sarah Chen',
    bio: 'Clean Beauty Advocate\nK-beauty imports & routines\nskincare-daily.com',
    followers: 78500,
    following: 612,
    posts: 2156,
    engagementRate: 3.5,
    avgLikes: 5200,
    recentMedia: [
      { likes: 5800, comments: 234, type: 'VIDEO' },
      { likes: 4200, comments: 167, type: 'IMAGE' },
      { likes: 6100, comments: 289, type: 'VIDEO' },
      { likes: 3900, comments: 145, type: 'CAROUSEL' },
      { likes: 5500, comments: 198, type: 'IMAGE' },
      { likes: 4700, comments: 176, type: 'IMAGE' },
    ]
  }
}

const MOCK_PERFORMANCE = {
  act_123456789: {
    summary: { impressions: 284500, clicks: 3420, ctr: 1.20, cpc: 287, spend: 982140, conversions: 89, roas: 4.2 },
    campaigns: [
      { id: 1, name: 'Risebee x Creator_A Video Ad', status: 'ACTIVE', impressions: 145200, clicks: 1840, spend: 528340, ctr: 1.27 },
      { id: 2, name: 'Risebee x Creator_B Reel Campaign', status: 'ACTIVE', impressions: 98300, clicks: 1120, spend: 321400, ctr: 1.14 },
      { id: 3, name: 'Risebee Retargeting', status: 'PAUSED', impressions: 41000, clicks: 460, spend: 132400, ctr: 1.12 },
    ],
  },
  act_987654321: {
    summary: { impressions: 156800, clicks: 2100, ctr: 1.34, cpc: 312, spend: 655200, conversions: 52, roas: 3.8 },
    campaigns: [
      { id: 4, name: 'Medisection x Creator_C Product Launch', status: 'ACTIVE', impressions: 98500, clicks: 1350, spend: 421200, ctr: 1.37 },
      { id: 5, name: 'Medisection Promotion', status: 'ACTIVE', impressions: 58300, clicks: 750, spend: 234000, ctr: 1.29 },
    ],
  },
  act_456789123: {
    summary: { impressions: 203100, clicks: 2780, ctr: 1.37, cpc: 265, spend: 736700, conversions: 67, roas: 3.5 },
    campaigns: [
      { id: 6, name: 'Sister& x Creator_D Summer Collection', status: 'ACTIVE', impressions: 132000, clicks: 1820, spend: 482350, ctr: 1.38 },
      { id: 7, name: 'Sister& Discount Event', status: 'PAUSED', impressions: 71100, clicks: 960, spend: 254350, ctr: 1.35 },
    ],
  },
}

// ── Utilities ──────────────────────────────────────────
const fmt = (n) => n?.toLocaleString('en-US') ?? '-'
const fmtKRW = (n) => `₩${fmt(n)}`

// ── Facebook Logo SVG ──────────────────────────────────
function FacebookIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

// ── Main Component ─────────────────────────────────────
export default function MetaAdsPage() {
  // Steps: idle → login → consent → selecting → connecting → dashboard
  const [step, setStep] = useState('idle')
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [activeAccount, setActiveAccount] = useState(null)

  useEffect(() => {
    if (connectedAccounts.length > 0) {
      setStep('dashboard')
      if (!activeAccount) setActiveAccount(connectedAccounts[0])
    }
  }, [connectedAccounts])

  const handleOAuthStart = () => {
    setStep('login')
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Meta Ad Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Connect your Facebook & Instagram ad accounts to view campaign performance
            </p>
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
              Reconnect Accounts
            </Button>
          )}
        </div>

        {step === 'idle' && <IdleView onStart={handleOAuthStart} />}
        {step === 'login' && (
          <LoginView
            onSuccess={() => setStep('consent')}
            onCancel={() => setStep('idle')}
          />
        )}
        {step === 'consent' && (
          <ConsentView
            onContinue={() => setStep('selecting')}
            onCancel={() => setStep('idle')}
          />
        )}
        {step === 'selecting' && (
          <AccountSelectView
            accounts={MOCK_AD_ACCOUNTS}
            selected={selectedAccounts}
            onToggle={toggleAccountSelect}
            onConnect={handleConnect}
          />
        )}
        {step === 'connecting' && <ConnectingView />}
        {step === 'dashboard' && (
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
          {/* Meta logo icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#1877F2] flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 36 36" className="w-10 h-10" fill="white">
              <path d="M20.181 35.87C29.094 34.791 36 27.202 36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 4.991 2.035 9.5 5.322 12.756l.002-.001 1.621-1.06A15.932 15.932 0 013 18C3 9.716 9.716 3 18 3s15 6.716 15 15-6.716 15-15 15c-.644 0-1.278-.04-1.9-.12l.081.99z" />
              <path d="M21.214 23.89l-2.909-4.644-3.58 4.644h-3.562l5.357-6.854-5.093-8.147h3.7l2.682 4.29 3.312-4.29h3.562l-5.088 6.473 5.357 8.527h-3.738z" />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Meta Ad Analytics
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Connect your Facebook & Instagram ad accounts<br />
              to view campaign performance and discover creator profiles
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onStart}
              className="w-full h-12 text-base font-semibold rounded-xl text-white"
              style={{ backgroundColor: '#1877F2' }}
            >
              <FacebookIcon className="w-5 h-5 mr-2 text-white" />
              Continue with Facebook
            </Button>
            <p className="text-xs text-gray-400">
              This app requires ads_read and instagram_basic permissions (read-only)
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 text-left">
            <p className="text-xs font-semibold text-gray-600 mb-3">Available features after connecting</p>
            <div className="grid grid-cols-2 gap-2.5 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                View ad accounts
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                Campaign analytics
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                Spend monitoring
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ROAS tracking
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                Creator profile lookup
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                Engagement analysis
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoginView({ onSuccess, onCancel }) {
  const [loggingIn, setLoggingIn] = useState(false)

  const handleLogin = () => {
    setLoggingIn(true)
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Blue header */}
        <div className="h-14 flex items-center justify-center gap-2" style={{ backgroundColor: '#1877F2' }}>
          <FacebookIcon className="w-6 h-6 text-white" />
          <span className="text-white font-bold text-lg tracking-tight">facebook</span>
        </div>

        {/* Form body */}
        <div className="p-8 space-y-5">
          <h3 className="text-center text-lg font-semibold text-gray-900">
            Log in to Facebook
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value="demo@cnecbiz.com"
                readOnly
                className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value="••••••••"
                readOnly
                className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-700 focus:outline-none"
              />
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loggingIn}
            className="w-full h-11 rounded-lg text-base font-semibold text-white"
            style={{ backgroundColor: '#1877F2' }}
          >
            {loggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Log In'
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={onCancel}
              className="text-sm text-[#1877F2] hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConsentView({ onContinue, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Blue header */}
        <div className="h-14 flex items-center justify-center gap-2" style={{ backgroundColor: '#1877F2' }}>
          <FacebookIcon className="w-6 h-6 text-white" />
          <span className="text-white font-bold text-lg tracking-tight">facebook</span>
        </div>

        {/* Body */}
        <div className="p-8 space-y-5">
          {/* App identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6C5CE7] flex items-center justify-center">
              <span className="text-white text-xs font-bold">CNEC</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">CNEC Ad Analytics</p>
              <p className="text-xs text-gray-500">wants to access your information</p>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Permissions list */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">This app will receive:</p>

            <div className="space-y-3">
              {/* Permission 1 */}
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">Your public profile (name, profile picture)</p>
              </div>

              {/* Permission 2 */}
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">Read your ad account performance data (ads_read)</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Includes: impressions, clicks, CTR, CPC, spend, conversions, ROAS
                  </p>
                </div>
              </div>

              {/* Permission 3 */}
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">Read your Instagram Business profile and media (instagram_basic)</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Includes: followers count, posts, bio, media, likes, comments
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Warning */}
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs font-medium text-amber-800 mb-1.5">This app will NOT:</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Create, modify, or delete any ads</li>
              <li>• Post content on your behalf</li>
              <li>• Access your private messages</li>
            </ul>
          </div>

          {/* Actions */}
          <Button
            onClick={onContinue}
            className="w-full h-11 rounded-lg text-base font-semibold text-white"
            style={{ backgroundColor: '#1877F2' }}
          >
            Continue as Demo User
          </Button>
          <button
            onClick={onCancel}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
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
            <CardTitle className="text-base">Select Ad Accounts</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Choose the Meta ad accounts you want to connect</p>
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
            {selected.length > 0 ? `Connect ${selected.length} account(s)` : 'Select an account'}
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
          <p className="font-semibold text-gray-800">Connecting ad accounts...</p>
          <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
        </div>
      </div>
    </div>
  )
}

function DashboardView({ connectedAccounts, activeAccount, onSelectAccount, perf }) {
  const [activeTab, setActiveTab] = useState('performance')

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Permission banner */}
      <PermissionBanner />

      {/* Account tabs */}
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
          Connected
        </Badge>
      </div>

      {/* Feature tabs */}
      <FeatureTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'performance' ? (
        <AdPerformanceTab perf={perf} />
      ) : (
        <CreatorDiscoveryTab />
      )}
    </div>
  )
}

function PermissionBanner() {
  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 flex-shrink-0">
        <span className="text-blue-600 text-xs font-bold">i</span>
      </div>
      <div>
        <p className="text-sm text-blue-800 font-medium">
          This dashboard uses the following read-only permissions:
        </p>
        <ul className="text-xs text-blue-700 mt-1.5 space-y-0.5">
          <li>• <strong>ads_read</strong> — View ad performance data (impressions, clicks, CTR, CPC, spend, ROAS)</li>
          <li>• <strong>instagram_basic</strong> — View public Instagram Business/Creator profiles and media</li>
        </ul>
        <p className="text-xs text-blue-600 mt-1.5">
          No data is created, modified, or deleted. Data is not shared with third parties.
        </p>
      </div>
    </div>
  )
}

function FeatureTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onTabChange('performance')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
          activeTab === 'performance'
            ? 'bg-[#6C5CE7] text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <BarChart3 className="w-4 h-4" />
        Ad Performance
      </button>
      <button
        onClick={() => onTabChange('discovery')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
          activeTab === 'discovery'
            ? 'bg-[#6C5CE7] text-white shadow-md'
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <Search className="w-4 h-4" />
        Creator Discovery
      </button>
    </div>
  )
}

function AdPerformanceTab({ perf }) {
  const { summary, campaigns } = perf

  const kpiCards = [
    { label: 'Impressions', value: fmt(summary.impressions), icon: Eye, change: '+18.5%', up: true },
    { label: 'Clicks', value: fmt(summary.clicks), icon: MousePointerClick, change: '+22.3%', up: true },
    { label: 'CTR', value: `${summary.ctr.toFixed(2)}%`, icon: Target, change: '+0.4%', up: true },
    { label: 'CPC', value: fmtKRW(summary.cpc), icon: DollarSign, change: '-8.1%', up: false },
    { label: 'Spend', value: fmtKRW(summary.spend), icon: BarChart3, change: '+12.4%', up: true },
    { label: 'Conversions', value: fmt(summary.conversions), icon: ShoppingCart, change: '+25.7%', up: true },
    { label: 'ROAS', value: `${summary.roas}x`, icon: TrendingUp, change: '+0.6', up: true },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
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

      {/* Campaign Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-[#6C5CE7]" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Spend</TableHead>
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
                      {camp.status === 'ACTIVE' ? 'Active' : 'Paused'}
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

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          Data period: Last 30 days · Last synced: {new Date().toLocaleDateString('en-US')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          · Permission: ads_read (read-only)
        </p>
      </div>
    </div>
  )
}

function CreatorDiscoveryTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setTimeout(() => {
      const cleaned = searchQuery.replace('@', '').trim().toLowerCase()
      const creator = MOCK_CREATORS[cleaned] || MOCK_CREATORS['beauty_creator_kr']
      setSearchResult(creator)
      setIsSearching(false)
    }, 1500)
  }

  const fmtShort = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
    return n.toString()
  }

  return (
    <div className="space-y-6">
      {/* Search area */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6C5CE7] flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Creator Profile Lookup</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Search Instagram Business/Creator accounts using Business Discovery API (instagram_basic)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Instagram username (e.g. beauty_creator_kr)"
              className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7]"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="h-11 px-6 rounded-xl font-semibold"
              style={{ backgroundColor: '#6C5CE7' }}
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isSearching && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#6C5CE7] animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Searching creator profile...</p>
          </div>
        </div>
      )}

      {/* Search result */}
      {!isSearching && searchResult && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 space-y-6">
            {/* Profile header */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#a78bfa] flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-gray-900">@{searchResult.username}</p>
                <p className="text-sm text-gray-600 font-medium">{searchResult.name}</p>
                <p className="text-sm text-gray-500 mt-2 whitespace-pre-line leading-relaxed">{searchResult.bio}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {fmtShort(searchResult.followers)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Followers</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {fmt(searchResult.posts)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Posts</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {searchResult.engagementRate}%
                </p>
                <p className="text-xs text-gray-400 mt-1">Eng. Rate</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {fmtShort(searchResult.avgLikes)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Avg. Likes</p>
              </div>
            </div>

            {/* Recent posts grid */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Recent Posts</p>
              <div className="grid grid-cols-6 gap-3">
                {searchResult.recentMedia.map((media, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square rounded-xl relative overflow-hidden ${
                      media.type === 'VIDEO'
                        ? 'bg-gradient-to-br from-blue-400 to-cyan-400'
                        : media.type === 'CAROUSEL'
                          ? 'bg-gradient-to-br from-amber-400 to-orange-400'
                          : 'bg-gradient-to-br from-pink-400 to-purple-400'
                    }`}
                  >
                    {/* Type icon */}
                    {media.type === 'VIDEO' && (
                      <div className="absolute top-2 right-2">
                        <Play className="w-4 h-4 text-white/80" />
                      </div>
                    )}
                    {media.type === 'CAROUSEL' && (
                      <div className="absolute top-2 right-2">
                        <Grid3X3 className="w-4 h-4 text-white/80" />
                      </div>
                    )}

                    {/* Engagement overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm px-2 py-1.5 flex items-center justify-center gap-3">
                      <span className="flex items-center gap-1 text-white text-xs">
                        <Heart className="w-3 h-3" />
                        {fmtShort(media.likes)}
                      </span>
                      <span className="flex items-center gap-1 text-white text-xs">
                        <MessageCircle className="w-3 h-3" />
                        {media.comments}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info footer */}
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm flex-shrink-0">ℹ️</span>
              <p className="text-xs text-gray-500">
                Data fetched via Business Discovery API using instagram_basic permission. Read-only access to public Instagram Business/Creator profiles.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
