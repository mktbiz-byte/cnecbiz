import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Video, Upload, Bell, Globe, TrendingUp, Activity,
  Volume2, VolumeX, RefreshCw, Loader2, ArrowLeft,
  CheckCircle, AlertCircle, Clock, Users, FileText,
  CreditCard, Eye, Film, Scissors, MonitorPlay, ArrowRight,
  MessageCircle, ExternalLink, ChevronDown, ChevronUp, Coins
} from 'lucide-react'

const POLL_INTERVAL = 15000

const FLAGS = { kr: '\u{1F1F0}\u{1F1F7}', jp: '\u{1F1EF}\u{1F1F5}', us: '\u{1F1FA}\u{1F1F8}' }
const COUNTRY_NAMES = { kr: '\uD55C\uAD6D (KR)', jp: '\uC77C\uBCF8 (JP)', us: '\uBBF8\uAD6D (US)' }
const TYPE_LABELS = { planned: '\uAE30\uD68D', oliveyoung: '\uC62C\uC601', '4week': '4\uC8FC', megawari: '\uBA54\uAC00' }

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
  if (m < 1) return '\uBC29\uAE08 \uC804'
  if (m < 60) return `${m}\uBD84 \uC804`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}\uC2DC\uAC04 \uC804`
  return `${Math.floor(h / 24)}\uC77C \uC804`
}

function feedLabel(item) {
  switch (item.type) {
    case 'video_upload': {
      const tl = TYPE_LABELS[item.campaignType] || '\uAE30\uD68D'
      let d = tl + ' \uCEA0\uD398\uC778'
      if (item.weekNumber) d += ` ${item.weekNumber}\uC8FC\uCC28`
      if (item.videoNumber) d += ` V${item.videoNumber}`
      return `\uC601\uC0C1 ${item.version > 1 ? '\uC7AC' : ''}\uC81C\uCD9C (${d})`
    }
    case 'sns_upload':
      return 'SNS \uC5C5\uB85C\uB4DC \uC644\uB8CC'
    case 'whatsapp':
      return `WhatsApp ${item.template || ''} ${item.status === 'failed' ? '\uC2E4\uD328' : '\uBC1C\uC1A1'}`
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

        {/* ===== \uD5E4\uB354 ===== */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="text-[#808090] hover:text-white hover:bg-white/5 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Outfit, Pretendard, sans-serif' }}>
              <Activity className="w-5 h-5 text-[#C084FC]" />
              \uD06C\uB125 \uC2E4\uC2DC\uAC04 \uD604\uD669\uD310
            </h1>
            <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {regions.map(r => (
              <span key={r.code} className="text-[#808090] text-xs">{FLAGS[r.code]} {r.campaigns}</span>
            ))}
            <span className="text-[#404050]">|</span>
            <span className="text-[#808090]">{lastUpdated?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-[#808090] hover:text-white hover:bg-white/5" onClick={() => setSoundOn(!soundOn)}>
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-[#808090] hover:text-white hover:bg-white/5" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {error && <span className="text-red-400 text-xs">{error}</span>}
          </div>
        </div>

        {/* ===== \uAD00\uB9AC \uD3EC\uC778\uD2B8 (Action Required) ===== */}
        <div className="mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-[#C084FC]" />
            <span className="text-sm font-semibold text-[#D0D0E0]">\uC694\uC8FC\uC758 \uAD00\uB9AC \uD3EC\uC778\uD2B8 (Action Required) — \uCEA0\uD398\uC778 \uC218 \uAE30\uC900</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <ActionCard
              label="\uC2B9\uC778 \uC694\uCCAD \uB300\uAE30" value={action.approvalPending || 0}
              icon={<CheckCircle className="w-4 h-4" />}
              desc="\uCEA0\uD398\uC778 \uC0DD\uC131 \uD6C4 \uC2B9\uC778\uC774 \uC9C0\uC5F0\uB41C \uCEA0\uD398\uC778"
              criteria="status = draft / pending"
              expanded={expandedAction === 'approval'}
              onToggle={() => toggleAction('approval')}
              campaigns={actionCampaigns.approval}
              navigate={navigate}
            />
            <ActionCard
              label="\uD06C\uB9AC\uC5D0\uC774\uD130 \uC120\uC815 \uC9C0\uC5F0" value={action.selectionDelayed || 0}
              icon={<Users className="w-4 h-4" />}
              desc="\uBAA8\uC9D1\uC911\uC778\uB370 \uC120\uC815\uC744 \uC548 \uD55C \uCEA0\uD398\uC778"
              criteria="active & selected 0\uBA85 & pending \uC788\uC74C"
              expanded={expandedAction === 'selection'}
              onToggle={() => toggleAction('selection')}
              campaigns={actionCampaigns.selection}
              navigate={navigate}
            />
            <ActionCard
              label="\uC601\uC0C1 \uAC80\uC218 \uC9C0\uC5F0" value={action.reviewDelayed || 0}
              icon={<Film className="w-4 h-4" />}
              desc="\uC601\uC0C1 \uC81C\uCD9C \uD6C4 \uAE30\uC5C5 \uAC80\uC218 \uB300\uAE30 \uCEA0\uD398\uC778"
              criteria="status = video_submitted"
              expanded={expandedAction === 'review'}
              onToggle={() => toggleAction('review')}
              campaigns={actionCampaigns.review}
              navigate={navigate}
            />
            <ActionCard
              label="SNS \uC5C5\uB85C\uB4DC \uC9C0\uC5F0" value={action.snsDelayed || 0}
              icon={<Upload className="w-4 h-4" />}
              desc="\uC2B9\uC778 \uD6C4 SNS \uBBF8\uC5C5\uB85C\uB4DC \uCEA0\uD398\uC778"
              criteria="status = approved"
              expanded={expandedAction === 'sns'}
              onToggle={() => toggleAction('sns')}
              campaigns={actionCampaigns.sns}
              navigate={navigate}
            />
            <ActionCard
              label="\uD3EC\uC778\uD2B8 \uC9C0\uAE09 \uC9C0\uC5F0" value={action.pointDelayed || 0}
              icon={<Coins className="w-4 h-4" />}
              desc="SNS \uC5C5\uB85C\uB4DC \uC644\uB8CC \uD6C4 \uBBF8\uC644\uB8CC \uCEA0\uD398\uC778"
              criteria="status = sns_uploaded (completed \uC544\uB2D8)"
              expanded={expandedAction === 'point'}
              onToggle={() => toggleAction('point')}
              campaigns={actionCampaigns.point}
              navigate={navigate}
            />
          </div>
        </div>

        {/* ===== \uC804\uCCB4 \uD504\uB85C\uC138\uC2A4 \uC9C4\uD589 \uD604\uD669 ===== */}
        <div className="mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#C084FC]" />
            <span className="text-sm font-semibold text-[#D0D0E0]">\uC804\uCCB4 \uD504\uB85C\uC138\uC2A4 \uC9C4\uD589 \uD604\uD669 — \uCEA0\uD398\uC778 \uC218 \uAE30\uC900</span>
          </div>
          <div className="bg-[#12121A] rounded-xl border border-[#1E1E2E] p-3">
            <div className="flex items-center justify-between">
              <ProcessNode label="\uC0C1\uB2F4/\uAC00\uC785" value={proc.consulting || 0} />
              <ProcessArrow />
              <ProcessNode label="\uCEA0\uD398\uC778\uC0DD\uC131" value={proc.campaignCreated || 0} />
              <ProcessArrow />
              <ProcessNode label="\uACB0\uC81C\uB300\uAE30" value={proc.pendingPayment || 0} />
              <ProcessArrow />
              <ProcessNode label="\uBAA8\uC9D1\uC911" value={proc.recruiting || 0} highlight />
              <ProcessArrow />
              <ProcessNode label="\uC120\uC815\uB300\uAE30" value={proc.pendingSelection || 0} />
              <ProcessArrow />
              <ProcessNode label="\uCD2C\uC601\uC911" value={proc.filming || 0} highlight />
              <ProcessArrow />
              <ProcessNode label="\uC218\uC815/\uAC80\uC218" value={proc.reviewing || 0} />
              <ProcessArrow />
              <ProcessNode label="\uC5C5\uB85C\uB4DC\uB300\uAE30" value={proc.snsWaiting || 0} />
            </div>
          </div>
        </div>

        {/* ===== \uD558\uB2E8: \uAD6D\uAC00\uBCC4 + \uC2E4\uC2DC\uAC04 \uD53C\uB4DC ===== */}
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* \uAD6D\uAC00\uBCC4 \uC0C1\uD488 \uC6B4\uC601 \uD604\uD669 + \uB098\uB77C\uBCC4 \uD53C\uB4DC (7/12) */}
          <div className="col-span-7 flex flex-col gap-3 min-h-0 overflow-y-auto">
            {['kr', 'jp', 'us'].map(code => {
              const s = cs[code] || { total: 0, planned: 0, oliveyoung: 0, '4week': 0, megawari: 0 }
              const countryFeed = allFeed.filter(f => f.region === code).slice(0, 10)
              return (
                <div key={code} className="bg-[#12121A] rounded-xl border border-[#1E1E2E] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{FLAGS[code]} {COUNTRY_NAMES[code]}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#909098]">\uC624\uB298 \uC601\uC0C1 {today.videoByRegion?.[code] || 0}\uAC74</span>
                      <span className="text-sm font-bold text-[#C084FC]" style={{ fontFamily: 'Outfit' }}>\uD65C\uC131 {s.total}\uAC74</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {/* \uBC14 \uCC28\uD2B8 */}
                    <div className="w-48 flex-shrink-0 space-y-1.5">
                      {Object.entries(TYPE_LABELS).map(([key, label]) => {
                        const val = s[key] || 0
                        const max = Math.max(s.total, 1)
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-[#B0B0C0] w-7 text-right">{label}</span>
                            <div className="flex-1 h-2 bg-[#1A1A2A] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${(val / max) * 100}%`, backgroundColor: '#C084FC' }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-white w-5 text-right" style={{ fontFamily: 'Outfit' }}>{val}</span>
                          </div>
                        )
                      })}
                    </div>
                    {/* \uB098\uB77C\uBCC4 \uD53C\uB4DC */}
                    <div className="flex-1 min-w-0 border-l border-[#1E1E2E] pl-3">
                      {countryFeed.length === 0 ? (
                        <div className="text-xs text-[#505060] py-2">\uCD5C\uADFC \uD65C\uB3D9 \uC5C6\uC74C</div>
                      ) : (
                        <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                          {countryFeed.map((item, idx) => (
                            <div key={`${item.time}-${idx}`} className="flex items-center gap-2 py-0.5 text-xs group">
                              <MiniIcon type={item.type} />
                              <span className="text-white font-medium truncate max-w-[100px]">
                                {item.creator ? `@${item.creator}` : ''}
                              </span>
                              <span className="text-[#909098] truncate flex-1">{feedLabel(item)}</span>
                              {item.campaignId && (
                                <button
                                  onClick={() => navigate(`/admin/campaigns`)}
                                  className="opacity-0 group-hover:opacity-100 text-[#C084FC] hover:text-white transition-opacity"
                                  title="\uCEA0\uD398\uC778 \uBC14\uB85C\uAC00\uAE30"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                              <span className="text-[#606070] whitespace-nowrap flex-shrink-0">{timeAgo(item.time)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* \uC2E4\uC2DC\uAC04 \uD65C\uB3D9 \uD53C\uB4DC \uC804\uCCB4 (5/12) */}
          <div className="col-span-5 bg-[#12121A] rounded-xl border border-[#1E1E2E] flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C084FC]" />
                <span className="text-sm font-semibold text-[#D0D0E0]">\uC2E4\uC2DC\uAC04 \uD65C\uB3D9 \uD53C\uB4DC</span>
              </div>
              <span className="text-xs text-[#606070]">\uC804\uCCB4 {allFeed.length}\uAC74</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {allFeed.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[#505060] text-sm">
                  <Clock className="w-5 h-5 mr-2 opacity-50" /> \uD65C\uB3D9 \uC5C6\uC74C
                </div>
              ) : (
                allFeed.map((item, idx) => (
                  <div
                    key={`${item.time}-${idx}`}
                    className={`flex items-start gap-3 px-4 py-2.5 border-b border-[#1A1A2A] ${idx === 0 ? 'bg-[#C084FC]/5' : 'hover:bg-[#16161F]'} transition-colors group`}
                  >
                    <FeedIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-tight">
                        {item.region && <span className="text-[#808090] mr-1">{FLAGS[item.region]}</span>}
                        <span className="font-medium">{item.creator ? `@${item.creator}` : ''}</span>
                        <span className="text-[#606070]"> — </span>
                        <span className="text-[#C0C0D0]">{feedLabel(item)}</span>
                      </p>
                      {item.campaign && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-[#808090] truncate">{item.campaign}</p>
                          {item.campaignId && (
                            <button
                              onClick={() => navigate(`/admin/campaigns`)}
                              className="opacity-0 group-hover:opacity-100 text-[#C084FC] hover:text-white transition-opacity flex-shrink-0"
                              title="\uCEA0\uD398\uC778 \uBC14\uB85C\uAC00\uAE30"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[#707080] whitespace-nowrap flex-shrink-0 mt-0.5">{timeAgo(item.time)}</span>
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
  return (
    <div className="bg-[#12121A] rounded-xl border border-[#1E1E2E] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-[#C084FC]" />
      <div className="p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#C084FC]">{icon}</span>
            <span className="text-xs font-semibold text-white">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-[#C084FC]" style={{ fontFamily: 'Outfit' }}>{value}</span>
            {value > 0 && (
              expanded
                ? <ChevronUp className="w-3 h-3 text-[#606070]" />
                : <ChevronDown className="w-3 h-3 text-[#606070]" />
            )}
          </div>
        </div>
        <p className="text-[10px] text-[#909098] leading-relaxed">{desc}</p>
        <p className="text-[9px] text-[#505060] mt-1">
          <span className="text-[#606070]">\uAE30\uC900:</span> {criteria}
        </p>
      </div>
      {expanded && campaigns.length > 0 && (
        <div className="border-t border-[#1E1E2E] px-3 py-2 max-h-[140px] overflow-y-auto">
          {campaigns.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 py-1 text-xs group">
              <span className="text-[#808090]">{FLAGS[c.region]}</span>
              <span className="text-[#C0C0D0] truncate flex-1">{c.title || '(\uC81C\uBAA9\uC5C6\uC74C)'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/admin/campaigns') }}
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
    <div className="flex flex-col items-center gap-1">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border-2 transition-all ${
        highlight
          ? 'border-[#C084FC] bg-[#C084FC]/10 text-[#C084FC] shadow-[0_0_16px_rgba(192,132,252,0.2)]'
          : 'border-[#2A2A3A] bg-[#1A1A2A] text-white'
      }`} style={{ fontFamily: 'Outfit' }}>
        {value}
      </div>
      <span className="text-[10px] text-[#909098]">{label}</span>
    </div>
  )
}

function ProcessArrow() {
  return <ArrowRight className="w-3.5 h-3.5 text-[#2A2A3A] flex-shrink-0 mt-[-12px]" />
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

function MiniIcon({ type }) {
  if (type === 'video_upload') return <Film className="w-3 h-3 text-blue-400 flex-shrink-0" />
  if (type === 'sns_upload') return <Upload className="w-3 h-3 text-emerald-400 flex-shrink-0" />
  if (type === 'whatsapp') return <MessageCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
  return <Activity className="w-3 h-3 text-gray-400 flex-shrink-0" />
}
