import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Video, Upload, Bell, Globe, TrendingUp, Activity,
  Volume2, VolumeX, RefreshCw, Loader2, ArrowLeft,
  CheckCircle, AlertCircle, Clock, Users, FileText,
  CreditCard, Eye, Film, Scissors, MonitorPlay, ArrowRight,
  MessageCircle, ExternalLink, ChevronDown, ChevronUp, Coins,
  ChevronRight, UserPlus, DollarSign, X, Building2,
  Mail, Send, AlertTriangle
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

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    // 더 눈에 띄는 알림음 (2톤)
    ;[880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const start = ctx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0.15, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
      osc.start(start)
      osc.stop(start + 0.3)
    })
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
    case 'company_signup':
      return '신규 기업 가입'
    case 'payment': {
      const method = item.paymentMethod === 'card' ? '카드' : item.paymentMethod === 'bank' ? '계좌이체' : (item.paymentMethod || '')
      const amount = item.amount ? `${Number(item.amount).toLocaleString()}원` : ''
      return `결제 ${amount} (${method})`
    }
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
  // 중요 이벤트 팝업
  const [alertQueue, setAlertQueue] = useState([])
  const [currentAlert, setCurrentAlert] = useState(null)
  const dismissedAlertsRef = useRef(new Set())

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

      // 새 피드 감지 + 중요 이벤트 팝업
      if (prevFeedRef.current.length > 0 && newFeed.length > 0) {
        const prevFirst = prevFeedRef.current[0]?.time
        const newItems = newFeed.filter(f => f.time > prevFirst)

        if (newItems.length > 0 && soundOn) playSound()

        // 중요 이벤트 (가입, 결제)만 팝업
        const importantNew = newItems.filter(f => f.important || f.type === 'company_signup' || f.type === 'payment')
        if (importantNew.length > 0) {
          const newAlerts = importantNew
            .filter(f => !dismissedAlertsRef.current.has(`${f.type}-${f.time}`))
            .map(f => ({ ...f, alertId: `${f.type}-${f.time}` }))
          if (newAlerts.length > 0) {
            if (soundOn) playAlertSound()
            setAlertQueue(prev => [...prev, ...newAlerts])
          }
        }
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

  // 팝업 큐 처리: 현재 팝업이 없으면 다음 꺼냄
  useEffect(() => {
    if (!currentAlert && alertQueue.length > 0) {
      setCurrentAlert(alertQueue[0])
      setAlertQueue(prev => prev.slice(1))
    }
  }, [currentAlert, alertQueue])

  const dismissAlert = () => {
    if (currentAlert) {
      dismissedAlertsRef.current.add(currentAlert.alertId)
      setCurrentAlert(null)
    }
  }

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
  const notifications = data?.notifications || {}
  const notificationFailures = data?.notificationFailures || []

  const toggleAction = (key) => {
    setExpandedAction(expandedAction === key ? null : key)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      <div className="max-w-[1600px] mx-auto p-4 flex flex-col h-screen">

        {/* 중요 이벤트 팝업 모달 */}
        {currentAlert && (
          <AlertModal alert={currentAlert} onDismiss={dismissAlert} remaining={alertQueue.length} />
        )}

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
            {/* 오늘 가입/결제 뱃지 */}
            {(today.signups > 0 || today.payments > 0 || today.creatorSignups > 0) && (
              <div className="flex items-center gap-2 ml-2">
                {today.signups > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Building2 className="w-3 h-3" />
                    기업 {today.signups}
                  </span>
                )}
                {today.creatorSignups > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <UserPlus className="w-3 h-3" />
                    크리에이터 {today.creatorSignups}
                  </span>
                )}
                {today.payments > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <CreditCard className="w-3 h-3" />
                    결제 {today.payments}
                  </span>
                )}
              </div>
            )}
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

        {/* 오늘의 신규 현황 + 알림 발송 현황 */}
        <div className="mb-4 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            {/* 오늘의 신규 현황 */}
            <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] px-5 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[#C084FC]" />
                <span className="text-sm font-bold text-white">오늘의 신규 현황</span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <StatMini label="기업 가입" value={today.signups || 0} color="#F59E0B" icon={<Building2 className="w-3.5 h-3.5" />} />
                <StatMini label="크리에이터 가입" value={today.creatorSignups || 0} color="#A78BFA" icon={<UserPlus className="w-3.5 h-3.5" />} />
                {['kr', 'jp', 'us'].map(code => (
                  <StatMini
                    key={code}
                    label={`${FLAGS[code]} 크리에이터`}
                    value={today.creatorSignupsByRegion?.[code] || 0}
                    color={BAR_COLORS[code]}
                    icon={<UserPlus className="w-3.5 h-3.5" />}
                  />
                ))}
              </div>
            </div>

            {/* 알림 발송 현황 */}
            <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] px-5 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Send className="w-4 h-4 text-[#C084FC]" />
                <span className="text-sm font-bold text-white">오늘 알림 발송 현황</span>
                {Object.values(notifications).some(n => n.failed > 0) && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    실패 있음
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-3">
                <NotifChannel label="네이버웍스" stats={notifications.naver_works} />
                <NotifChannel label="카카오" stats={notifications.kakao} />
                <NotifChannel label="이메일" stats={notifications.email} />
                <NotifChannel label="LINE" stats={notifications.line} />
                <NotifChannel label="WhatsApp" stats={{ success: today.whatsapp?.success || 0, failed: today.whatsapp?.failed || 0 }} />
              </div>
              {notificationFailures.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1A1A28]">
                  <div className="text-[10px] text-red-400/80 font-medium mb-1">최근 실패 로그</div>
                  <div className="space-y-0.5 max-h-[40px] overflow-y-auto">
                    {notificationFailures.slice(0, 3).map((f, i) => (
                      <div key={i} className="text-[10px] text-[#707080] truncate">
                        <span className="text-red-400/60">{f.channel}</span> — {f.error || '(알 수 없는 오류)'} <span className="text-[#404050]">{timeAgo(f.time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    className={`flex items-start gap-2.5 px-4 py-2.5 border-b border-[#141420] transition-colors group ${
                      item.important ? 'bg-amber-500/5 hover:bg-amber-500/10' :
                      idx === 0 ? 'bg-[#C084FC]/5' : 'hover:bg-[#16161F]'
                    }`}
                  >
                    <FeedIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.important && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                        <span className="text-xs font-bold text-white truncate max-w-[80px]">
                          {item.creator ? (item.type === 'company_signup' || item.type === 'payment' ? item.creator : `@${item.creator}`) : ''}
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

function AlertModal({ alert, onDismiss, remaining }) {
  const isSignup = alert.type === 'company_signup'
  const isPayment = alert.type === 'payment'

  const bgGradient = isSignup
    ? 'from-amber-500/20 to-amber-600/5'
    : 'from-blue-500/20 to-blue-600/5'
  const borderColor = isSignup ? 'border-amber-500/30' : 'border-blue-500/30'
  const iconBg = isSignup ? 'bg-amber-500/20' : 'bg-blue-500/20'
  const iconColor = isSignup ? 'text-amber-400' : 'text-blue-400'
  const title = isSignup ? '신규 기업 가입' : '신규 결제/입금'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-[420px] bg-gradient-to-b ${bgGradient} bg-[#12121A] rounded-2xl border ${borderColor} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        {/* 상단 컬러 라인 */}
        <div className="h-1" style={{ background: isSignup ? 'linear-gradient(90deg, #F59E0B, #F97316)' : 'linear-gradient(90deg, #3B82F6, #6366F1)' }} />

        <div className="p-6">
          {/* 아이콘 + 타이틀 */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
              {isSignup ? <Building2 className={`w-6 h-6 ${iconColor}`} /> : <CreditCard className={`w-6 h-6 ${iconColor}`} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-xs text-[#808090]">{new Date(alert.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* 내용 */}
          <div className="bg-[#0A0A0F]/50 rounded-xl p-4 mb-4 space-y-2">
            {isSignup && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#808090] w-14">회사명</span>
                  <span className="text-sm font-bold text-white">{alert.creator || '(미입력)'}</span>
                </div>
              </>
            )}
            {isPayment && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#808090] w-14">기업명</span>
                  <span className="text-sm font-bold text-white">{alert.creator || '(미확인)'}</span>
                </div>
                {alert.amount && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#808090] w-14">금액</span>
                    <span className="text-sm font-bold text-[#60A5FA]" style={{ fontFamily: 'Outfit' }}>{Number(alert.amount).toLocaleString()}원</span>
                  </div>
                )}
                {alert.campaign && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#808090] w-14">캠페인</span>
                    <span className="text-sm text-[#C0C0D0] truncate">{alert.campaign}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 하단 */}
          <div className="flex items-center justify-between">
            {remaining > 0 && (
              <span className="text-[11px] text-[#606070]">+{remaining}건 더 있음</span>
            )}
            <div className="flex-1" />
            <Button
              onClick={onDismiss}
              className="bg-white/10 hover:bg-white/20 text-white border-0 px-6 py-2 rounded-xl text-sm font-bold"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              확인
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
    whatsapp: 'text-green-400 bg-green-500/15',
    company_signup: 'text-amber-400 bg-amber-500/15',
    payment: 'text-blue-400 bg-blue-500/15'
  }
  const icons = {
    video_upload: <Film className="w-3.5 h-3.5" />,
    sns_upload: <Upload className="w-3.5 h-3.5" />,
    whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
    company_signup: <UserPlus className="w-3.5 h-3.5" />,
    payment: <CreditCard className="w-3.5 h-3.5" />
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
  if (type === 'company_signup') return <UserPlus className="w-3 h-3 text-amber-400 flex-shrink-0" />
  if (type === 'payment') return <CreditCard className="w-3 h-3 text-blue-400 flex-shrink-0" />
  return <Activity className="w-3 h-3 text-gray-400 flex-shrink-0" />
}

function StatMini({ label, value, color, icon }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-[#808090]">{label}</div>
        <div className="text-lg font-extrabold text-white leading-none" style={{ fontFamily: 'Outfit' }}>
          {value}<span className="text-[10px] text-[#505060] font-normal ml-0.5">명</span>
        </div>
      </div>
    </div>
  )
}

function NotifChannel({ label, stats }) {
  const s = stats || { success: 0, failed: 0 }
  const total = s.success + s.failed
  const hasFailed = s.failed > 0
  return (
    <div className="text-center">
      <div className="text-[10px] text-[#808090] mb-1">{label}</div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-sm font-bold text-emerald-400" style={{ fontFamily: 'Outfit' }}>{s.success}</span>
        <span className="text-[10px] text-[#404050]">/</span>
        <span className={`text-sm font-bold ${hasFailed ? 'text-red-400' : 'text-[#404050]'}`} style={{ fontFamily: 'Outfit' }}>{s.failed}</span>
      </div>
      <div className="text-[9px] text-[#505060]">성공/실패</div>
      {total > 0 && (
        <div className="mt-1 h-1.5 bg-[#1A1A28] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(s.success / total) * 100}%`,
              backgroundColor: hasFailed ? '#F59E0B' : '#10B981'
            }}
          />
        </div>
      )}
    </div>
  )
}
