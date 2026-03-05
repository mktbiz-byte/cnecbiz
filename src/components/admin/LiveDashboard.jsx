import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Video, Upload, Bell, Globe, TrendingUp, Activity,
  Volume2, VolumeX, RefreshCw, Loader2, ArrowLeft,
  CheckCircle, AlertCircle, Clock, Users, FileText,
  CreditCard, Eye, Film, Scissors, MonitorPlay, ArrowRight,
  MessageCircle, ExternalLink, ChevronDown, ChevronUp, Coins,
  ChevronRight
} from 'lucide-react'

const POLL_INTERVAL = 15000

const FLAGS = { kr: '🇰🇷', jp: '🇯🇵', us: '🇺🇸' }
const COUNTRY_NAMES = { kr: 'KR 한국', jp: 'JP 일본', us: 'US 미국' }
const TYPE_LABELS = { planned: '기획', oliveyoung: '올영', '4week': '4주', megawari: '메가' }
const TYPE_LABELS_US = { planned: '기획', other: '기타' }
const BAR_COLORS = { kr: '#E879A8', jp: '#F87171', us: '#60A5FA' }
const ACCENT_PINK = '#FF6B8A'

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

export default function LiveDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [soundOn, setSoundOn] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [expandedAction, setExpandedAction] = useState(null)
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
  const actionCampaigns = data?.actionCampaigns || {}
  const proc = data?.process || {}
  const cs = data?.countryStats || {}
  const allFeed = data?.feed || []
  const regions = data?.regions || []

  const toggleAction = (key) => {
    setExpandedAction(expandedAction === key ? null : key)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      <div className="max-w-[1600px] mx-auto p-4 flex flex-col h-screen">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="text-[#808090] hover:text-white hover:bg-white/5 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2.5" style={{ fontFamily: 'Outfit, Pretendard, sans-serif' }}>
              <Activity className="w-5 h-5 text-[#C084FC]" />
              크넥 실시간 현황판
            </h1>
            <span className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-3">
              {regions.map(r => (
                <span key={r.code} className="text-[#A0A0B0] text-xs font-medium" style={{ fontFamily: 'Outfit' }}>
                  <span className="text-[#606070] mr-1">{r.code.toUpperCase()}</span>
                  <span className="text-white font-bold">{r.campaigns}</span>
                </span>
              ))}
            </div>
            <span className="text-[#2A2A3A]">|</span>
            <span className="text-[#808090] text-xs" style={{ fontFamily: 'Outfit' }}>
              {lastUpdated?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-[#808090] hover:text-white hover:bg-white/5" onClick={() => setSoundOn(!soundOn)}>
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-[#808090] hover:text-white hover:bg-white/5" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {error && <span className="text-red-400 text-xs">{error}</span>}
          </div>
        </div>

        {/* Action Required */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertCircle className="w-4 h-4 text-[#FF6B8A]" />
            <span className="text-sm font-bold text-white">요주의 관리 포인트</span>
            <span className="text-xs text-[#808090]">(Action Required)</span>
            <span className="text-xs text-[#505060]">— 캠페인 수 기준</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <ActionCard
              label="승인 요청 대기" value={action.approvalPending || 0}
              icon={<Clock className="w-4 h-4" />}
              desc="캠페인 생성 후 승인이 지연..."
              criteria="status = draft / pending"
              expanded={expandedAction === 'approval'}
              onToggle={() => toggleAction('approval')}
              campaigns={actionCampaigns.approval}
              navigate={navigate}
            />
            <ActionCard
              label="크리에이터 선정 지연" value={action.selectionDelayed || 0}
              icon={<AlertCircle className="w-4 h-4" />}
              desc="모집중인데 선정을 안 한 캠..."
              criteria="active & selected 0명"
              expanded={expandedAction === 'selection'}
              onToggle={() => toggleAction('selection')}
              campaigns={actionCampaigns.selection}
              navigate={navigate}
            />
            <ActionCard
              label="영상 검수 지연" value={action.reviewDelayed || 0}
              icon={<Film className="w-4 h-4" />}
              desc="영상 제출 후 기업 검수 대기..."
              criteria="status = video_submitted"
              expanded={expandedAction === 'review'}
              onToggle={() => toggleAction('review')}
              campaigns={actionCampaigns.review}
              navigate={navigate}
            />
            <ActionCard
              label="SNS 업로드 지연" value={action.snsDelayed || 0}
              icon={<Upload className="w-4 h-4" />}
              desc="승인 후 SNS 미업로드 캠페인"
              criteria="status = approved"
              expanded={expandedAction === 'sns'}
              onToggle={() => toggleAction('sns')}
              campaigns={actionCampaigns.sns}
              navigate={navigate}
            />
            <ActionCard
              label="포인트 지급 지연" value={action.pointDelayed || 0}
              icon={<Coins className="w-4 h-4" />}
              desc="SNS 업로드 완료 후 미완료..."
              criteria="status = sns_uploaded"
              expanded={expandedAction === 'point'}
              onToggle={() => toggleAction('point')}
              campaigns={actionCampaigns.point}
              navigate={navigate}
            />
          </div>
        </div>

        {/* 전체 프로세스 진행 현황 */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <TrendingUp className="w-4 h-4 text-[#C084FC]" />
            <span className="text-sm font-bold text-white">전체 프로세스 진행 현황</span>
            <span className="text-xs text-[#505060]">— 캠페인 수 기준</span>
          </div>
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] px-6 py-4">
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

        {/* 하단: 국가별 3개 + 실시간 피드 1개 */}
        <div className="grid grid-cols-4 gap-3 flex-1 min-h-0">
          {/* 국가별 패널들 */}
          {['kr', 'jp', 'us'].map(code => {
            const s = cs[code] || { total: 0, planned: 0, oliveyoung: 0, '4week': 0, megawari: 0 }
            const countryFeed = allFeed.filter(f => f.region === code).slice(0, 10)
            const barColor = BAR_COLORS[code]
            const labels = code === 'us'
              ? { planned: s.planned || 0, other: (s.total - (s.planned || 0)) || 0 }
              : { planned: s.planned || 0, oliveyoung: s.oliveyoung || 0, '4week': s['4week'] || 0, megawari: s.megawari || 0 }
            const labelNames = code === 'us' ? TYPE_LABELS_US : TYPE_LABELS
            const maxVal = Math.max(s.total, 1)

            return (
              <div key={code} className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] flex flex-col min-h-0">
                {/* 헤더 */}
                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{FLAGS[code]} {COUNTRY_NAMES[code]}</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      style={{ fontFamily: 'Outfit' }}>
                      활성 {s.total}건
                    </span>
                  </div>
                  <div className="text-[11px] text-[#606070]">오늘 영상 {today.videoByRegion?.[code] || 0}건</div>
                </div>

                {/* 바 차트 */}
                <div className="px-4 pb-3 space-y-2 flex-shrink-0">
                  {Object.entries(labelNames).map(([key, label]) => {
                    const val = labels[key] || 0
                    const pct = (val / maxVal) * 100
                    return (
                      <div key={key} className="flex items-center gap-2.5">
                        <span className="text-xs text-[#A0A0B0] w-7 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-2.5 bg-[#1A1A28] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(pct, val > 0 ? 2 : 0)}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white w-8 text-right flex-shrink-0"
                          style={{ fontFamily: 'Outfit' }}>
                          {val}<span className="text-[10px] text-[#606070] font-normal">건</span>
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* 미니 피드 */}
                <div className="border-t border-[#1A1A28] px-4 py-2 flex-1 overflow-y-auto min-h-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#505060]" />
                    <span className="text-[11px] text-[#505060] font-medium">최근 활동</span>
                  </div>
                  {countryFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-[#303040]">
                      <Activity className="w-5 h-5 mb-1 opacity-40" />
                      <span className="text-xs">최근 활동 없음</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {countryFeed.map((item, idx) => (
                        <div key={`${item.time}-${idx}`} className="flex items-center gap-1.5 py-0.5 text-xs group">
                          <MiniIcon type={item.type} />
                          <span className="text-white font-semibold truncate max-w-[80px]">
                            {item.creator ? `@${item.creator}` : ''}
                          </span>
                          <span className="text-[#707080] truncate flex-1 text-[11px]">{feedLabel(item)}</span>
                          {item.campaignId && (
                            <button
                              onClick={() => window.open('/admin/campaigns', '_blank')}
                              className="opacity-0 group-hover:opacity-100 text-[#C084FC] hover:text-white transition-opacity"
                              title="캠페인 바로가기"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                          <span className="text-[#404050] whitespace-nowrap flex-shrink-0 text-[10px]">{timeAgo(item.time)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* 실시간 활동 피드 */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A28] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C084FC]" />
                <span className="text-sm font-bold text-white">실시간 활동 피드</span>
              </div>
              <span className="text-xs font-bold text-[#808090]" style={{ fontFamily: 'Outfit' }}>{allFeed.length}건</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {allFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#303040]">
                  <Activity className="w-6 h-6 mb-2 opacity-30" />
                  <span className="text-xs">활동 없음</span>
                </div>
              ) : (
                allFeed.map((item, idx) => (
                  <div
                    key={`${item.time}-${idx}`}
                    className={`flex items-start gap-2.5 px-4 py-2.5 border-b border-[#141420] ${idx === 0 ? 'bg-[#C084FC]/5' : 'hover:bg-[#16161F]'} transition-colors group`}
                  >
                    <FeedIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate max-w-[80px]">
                          {item.creator ? `@${item.creator}` : ''}
                        </span>
                        <span className="text-[10px] text-[#505060]">—</span>
                        <span className="text-[11px] text-[#909098] truncate">{feedLabel(item)}</span>
                        <span className="text-[10px] text-[#404050] whitespace-nowrap flex-shrink-0 ml-auto">{timeAgo(item.time)}</span>
                      </div>
                      {item.campaign && (
                        <p className="text-[10px] text-[#606070] truncate mt-0.5">{item.campaign}</p>
                      )}
                    </div>
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

function ActionCard({ label, value, icon, desc, criteria, expanded, onToggle, campaigns = [], navigate }) {
  const hasItems = value > 0
  return (
    <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] relative overflow-hidden">
      {/* 상단 핫핑크 라인 */}
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT_PINK}, #C084FC)` }} />
      <div className={`p-4 ${hasItems ? 'cursor-pointer' : ''}`} onClick={hasItems ? onToggle : undefined}>
        {/* 아이콘 */}
        <div className="w-8 h-8 rounded-lg bg-[#1E1E2E] flex items-center justify-center mb-3">
          <span className="text-[#A0A0B0]">{icon}</span>
        </div>
        {/* 라벨 */}
        <div className="text-xs font-semibold text-[#D0D0E0] mb-1">{label}</div>
        {/* 큰 숫자 */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-extrabold leading-none" style={{ fontFamily: 'Outfit', color: ACCENT_PINK }}>
            {value}
          </span>
          <span className="text-sm text-[#606070] font-medium">건</span>
        </div>
        {/* 설명 */}
        <p className="text-[11px] text-[#707080] leading-relaxed mb-1">{desc}</p>
        <p className="text-[10px] text-[#404050]">
          <span className="text-[#505060]">기준:</span> {criteria}
        </p>
        {hasItems && (
          <div className="flex justify-end mt-1">
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-[#505060]" />
              : <ChevronDown className="w-3.5 h-3.5 text-[#505060]" />
            }
          </div>
        )}
      </div>
      {expanded && campaigns.length > 0 && (
        <div className="border-t border-[#1A1A28] px-4 py-2 max-h-[140px] overflow-y-auto">
          {campaigns.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 py-1 text-xs group">
              <span className="text-[#808090]">{FLAGS[c.region]}</span>
              <span className="text-[#C0C0D0] truncate flex-1">{c.title || '(제목없음)'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); window.open('/admin/campaigns', '_blank') }}
                className="opacity-0 group-hover:opacity-100 text-[#C084FC] hover:text-white transition-opacity flex-shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProcessNode({ label, value, highlight }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold border-2 transition-all ${
        highlight
          ? 'border-[#C084FC] bg-[#C084FC]/10 text-[#C084FC] shadow-[0_0_20px_rgba(192,132,252,0.25)]'
          : 'border-[#2A2A3A] bg-[#1A1A2A] text-[#E0E0F0]'
      }`} style={{ fontFamily: 'Outfit' }}>
        {value}
      </div>
      <span className="text-[10px] text-[#808090] font-medium">{label}</span>
    </div>
  )
}

function ProcessArrow() {
  return <ChevronRight className="w-4 h-4 text-[#2A2A3A] flex-shrink-0 mt-[-14px]" />
}

function FeedIcon({ type }) {
  const styles = {
    video_upload: 'text-blue-400 bg-blue-500/15',
    sns_upload: 'text-emerald-400 bg-emerald-500/15',
    whatsapp: 'text-green-400 bg-green-500/15'
  }
  const icons = {
    video_upload: <Film className="w-3.5 h-3.5" />,
    sns_upload: <Upload className="w-3.5 h-3.5" />,
    whatsapp: <MessageCircle className="w-3.5 h-3.5" />
  }
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${styles[type] || 'text-gray-400 bg-gray-500/15'}`}>
      {icons[type] || <Activity className="w-3.5 h-3.5" />}
    </div>
  )
}

function MiniIcon({ type }) {
  if (type === 'video_upload') return <Film className="w-3 h-3 text-blue-400 flex-shrink-0" />
  if (type === 'sns_upload') return <Upload className="w-3 h-3 text-emerald-400 flex-shrink-0" />
  if (type === 'whatsapp') return <MessageCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
  return <Activity className="w-3 h-3 text-gray-400 flex-shrink-0" />
}
