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

  const perf = activeAccount ? {} : null

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
  return (
    <div className="p-8 text-center text-gray-400">
      Dashboard — will be implemented in next step
    </div>
  )
}
