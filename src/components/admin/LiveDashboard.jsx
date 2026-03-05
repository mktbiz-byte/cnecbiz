import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Video, Upload, Bell, Globe, TrendingUp, Activity,
  Volume2, VolumeX, RefreshCw, Loader2, ArrowLeft,
  CheckCircle, AlertCircle, Clock, Users, FileText,
  CreditCard, Eye, Film, Scissors, MonitorPlay, ArrowRight,
  MessageCircle
} from 'lucide-react'

const POLL_INTERVAL = 15000

const FLAGS = { kr: '🇰🇷', jp: '🇯🇵', us: '🇺🇸' }
const COUNTRY_NAMES = { kr: '한국 (KR)', jp: '일본 (JP)', us: '미국 (US)' }
const TYPE_LABELS = { planned: '기획', oliveyoung: '올영', '4week': '4주', megawari: '메가' }
const TYPE_COLORS = { planned: '#6C5CE7', oliveyoung: '#10B981', '4week': '#3B82F6', megawari: '#F59E0B' }

function playSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {}
}

function timeAgo(t) {
  if (!t) return ''
  const m = Math.floor((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function LiveDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [soundOn, setSoundOn] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [feedFilter, setFeedFilter] = useState('all') // all, kr, jp, us
  const prevFeedRef = useRef([])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/dashboard-realtime')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Error')
      setData(result)
      setLastUpdated(new Date())
      setError(null)

      const newFeed = result.feed || []
      if (prevFeedRef.current.length > 0 && newFeed.length > 0) {
        const prevFirst = prevFeedRef.current[0]?.time
        if (newFeed[0]?.time > prevFirst && soundOn) playSound()
      }
      prevFeedRef.current = newFeed
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [soundOn])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(iv)
  }, [fetchData])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#C084FC]" />
      </div>
    )
  }

  const today = data?.today || {}
  const action = data?.actionRequired || {}
  const proc = data?.process || {}
  const cs = data?.countryStats || {}
  const feed = (data?.feed || []).filter(f => feedFilter === 'all' || f.region === feedFilter)
  const regions = data?.regions || []

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      <div className="max-w-[1600px] mx-auto p-4 flex flex-col h-screen">

        {/* ===== 헤더 ===== */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="text-[#606070] hover:text-white hover:bg-white/5 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Outfit, Pretendard, sans-serif' }}>
              <Activity className="w-5 h-5 text-[#C084FC]" />
              크넥 실시간 현황판
            </h1>
            <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {regions.map(r => (
              <span key={r.code} className="text-[#505060] text-xs">{FLAGS[r.code]} {r.campaigns}</span>
            ))}
            <span className="text-[#505060]">|</span>
            <span className="text-[#606070]">마지막 갱신: {lastUpdated?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-[#606070] hover:text-white hover:bg-white/5" onClick={() => setSoundOn(!soundOn)}>
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-[#606070] hover:text-white hover:bg-white/5" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {error && <span className="text-red-400 text-xs">{error}</span>}
          </div>
        </div>

        {/* ===== 관리 포인트 (Action Required) ===== */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-sm font-semibold text-[#A0A0B0]">요주의 관리 포인트 (Action Required)</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <ActionCard label="승인 요청 대기" value={action.approvalPending || 0} color="#EF4444" desc="상담 신청 / 캠페인 생성 후 승인이 지연되고 있습니다." icon={<CheckCircle className="w-4 h-4" />} />
            <ActionCard label="크리에이터 선정 지연" value={action.selectionDelayed || 0} color="#F59E0B" desc="모집 완료일에 맞춰 선정을 진행하지 않은 기업입니다." icon={<Users className="w-4 h-4" />} />
            <ActionCard label="영상 검수 지연" value={action.reviewDelayed || 0} color="#8B5CF6" desc="촬영 완료 후 기업의 승인/반려 처리가 지연중입니다." icon={<Film className="w-4 h-4" />} />
            <ActionCard label="SNS 업로드 지연" value={action.snsDelayed || 0} color="#EC4899" desc="최종 승인 후 SNS 업로드를 하지 않는 크리에이터입니다." icon={<Upload className="w-4 h-4" />} />
          </div>
        </div>

        {/* ===== 전체 프로세스 진행 현황 ===== */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#C084FC]" />
            <span className="text-sm font-semibold text-[#A0A0B0]">전체 프로세스 진행 현황</span>
          </div>
          <div className="bg-[#12121A] rounded-xl border border-[#1E1E2E] p-4">
            <div className="flex items-center justify-between">
              <ProcessNode label="상담/가입" value={proc.consulting || 0} />
              <ProcessArrow />
              <ProcessNode label="캠페인생성" value={proc.campaignCreated || 0} />
              <ProcessArrow />
              <ProcessNode label="결제대기" value={proc.pendingPayment || 0} />
              <ProcessArrow />
              <ProcessNode label="모집중" value={proc.recruiting || 0} highlight />
              <ProcessArrow />
              <ProcessNode label="선정대기" value={proc.pendingSelection || 0} />
              <ProcessArrow />
              <ProcessNode label="촬영중" value={proc.filming || 0} highlight />
              <ProcessArrow />
              <ProcessNode label="수정/검수" value={proc.reviewing || 0} />
              <ProcessArrow />
              <ProcessNode label="업로드대기" value={proc.snsWaiting || 0} />
            </div>
          </div>
        </div>

        {/* ===== 하단: 국가별 + 활동 피드 ===== */}
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
          {/* 국가별 상품 운영 현황 (8/12) */}
          <div className="col-span-7 bg-[#12121A] rounded-xl border border-[#1E1E2E] p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <Globe className="w-4 h-4 text-[#C084FC]" />
              <span className="text-sm font-semibold text-[#A0A0B0]">국가별 상품 운영 현황</span>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
              {['kr', 'jp', 'us'].map(code => {
                const s = cs[code] || { total: 0, planned: 0, oliveyoung: 0, '4week': 0, megawari: 0 }
                return (
                  <div key={code} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white">{FLAGS[code]} {COUNTRY_NAMES[code]}</span>
                      <span className="text-sm font-bold text-[#C084FC]" style={{ fontFamily: 'Outfit' }}>{s.total}건</span>
                    </div>
                    <div className="space-y-2.5 flex-1">
                      {Object.entries(TYPE_LABELS).map(([key, label]) => {
                        const val = s[key] || 0
                        const max = Math.max(s.total, 1)
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-[#A0A0B0] w-7 text-right">{label}</span>
                            <div className="flex-1 h-2.5 bg-[#1A1A2A] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${(val / max) * 100}%`, backgroundColor: TYPE_COLORS[key] }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-white w-6 text-right" style={{ fontFamily: 'Outfit' }}>{val}</span>
                          </div>
                        )
                      })}
                    </div>
                    {/* 오늘 영상 */}
                    <div className="mt-3 pt-2 border-t border-[#1E1E2E]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#606070]">오늘 영상 제출</span>
                        <span className="text-xs font-bold text-white" style={{ fontFamily: 'Outfit' }}>{today.videoByRegion?.[code] || 0}건</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 실시간 활동 피드 (5/12) */}
          <div className="col-span-5 bg-[#12121A] rounded-xl border border-[#1E1E2E] flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C084FC]" />
                <span className="text-sm font-semibold text-[#A0A0B0]">실시간 활동 피드</span>
              </div>
              <div className="flex gap-1">
                {['all', 'kr', 'jp', 'us'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFeedFilter(f)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                      feedFilter === f
                        ? 'bg-[#C084FC]/20 text-[#C084FC] font-semibold'
                        : 'text-[#606070] hover:text-[#A0A0B0] hover:bg-white/5'
                    }`}
                  >
                    {f === 'all' ? '전체' : FLAGS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {feed.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[#404050] text-sm">
                  <Clock className="w-5 h-5 mr-2 opacity-50" /> 활동 없음
                </div>
              ) : (
                feed.map((item, idx) => (
                  <div
                    key={`${item.time}-${idx}`}
                    className={`flex items-start gap-3 px-4 py-2.5 border-b border-[#1A1A2A] ${idx === 0 ? 'bg-[#C084FC]/5' : 'hover:bg-[#16161F]'} transition-colors`}
                  >
                    <FeedIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-tight">
                        {item.region && <span className="text-[#606070] mr-1">{FLAGS[item.region]}</span>}
                        <span className="font-medium">{item.creator ? `@${item.creator}` : ''}</span>
                        <span className="text-[#A0A0B0]"> — </span>
                        <span className="text-[#A0A0B0]">{feedLabel(item)}</span>
                      </p>
                      {item.campaign && <p className="text-xs text-[#505060] truncate mt-0.5">{item.campaign}</p>}
                    </div>
                    <span className="text-xs text-[#404050] whitespace-nowrap flex-shrink-0 mt-0.5">{timeAgo(item.time)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Sub components ---

function ActionCard({ label, value, color, desc, icon }) {
  return (
    <div className="bg-[#12121A] rounded-xl border border-[#1E1E2E] p-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        </div>
        <span className="text-2xl font-bold" style={{ color, fontFamily: 'Outfit' }}>{value}</span>
      </div>
      <p className="text-xs text-[#505060] leading-relaxed">{desc}</p>
    </div>
  )
}

function ProcessNode({ label, value, highlight }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all ${
        highlight
          ? 'border-[#C084FC] bg-[#C084FC]/10 text-[#C084FC] shadow-[0_0_16px_rgba(192,132,252,0.2)]'
          : 'border-[#2A2A3A] bg-[#1A1A2A] text-white'
      }`} style={{ fontFamily: 'Outfit' }}>
        {value}
      </div>
      <span className="text-xs text-[#606070]">{label}</span>
    </div>
  )
}

function ProcessArrow() {
  return <ArrowRight className="w-4 h-4 text-[#2A2A3A] flex-shrink-0 mt-[-16px]" />
}

function FeedIcon({ type }) {
  const styles = {
    video_upload: 'text-blue-400 bg-blue-500/10',
    sns_upload: 'text-emerald-400 bg-emerald-500/10',
    whatsapp: 'text-green-400 bg-green-500/10'
  }
  const icons = {
    video_upload: <Film className="w-3.5 h-3.5" />,
    sns_upload: <Upload className="w-3.5 h-3.5" />,
    whatsapp: <MessageCircle className="w-3.5 h-3.5" />
  }
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${styles[type] || 'text-gray-400 bg-gray-500/10'}`}>
      {icons[type] || <Activity className="w-3.5 h-3.5" />}
    </div>
  )
}

function feedLabel(item) {
  switch (item.type) {
    case 'video_upload': {
      const tl = TYPE_LABELS[item.campaignType] || '기획'
      let d = tl + ' 캠페인'
      if (item.weekNumber) d += ` ${item.weekNumber}주차`
      if (item.videoNumber) d += ` V${item.videoNumber}`
      return `영상 ${item.version > 1 ? '재' : ''}제출 (${d})`
    }
    case 'sns_upload':
      return 'SNS 업로드 완료'
    case 'whatsapp':
      return `WhatsApp ${item.template || ''} ${item.status === 'failed' ? '실패' : '발송'}`
    default:
      return item.type
  }
}
