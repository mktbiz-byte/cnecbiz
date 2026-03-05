import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Video, Upload, Bell, Globe, TrendingUp, Activity,
  Volume2, VolumeX, RefreshCw, Loader2, ArrowLeft,
  CheckCircle, AlertCircle, Send, MessageCircle, Play, Clock
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts'

const POLL_INTERVAL = 12000 // 12초마다 갱신
const FEED_DISPLAY_LIMIT = 100

const COUNTRY_FLAGS = { kr: '🇰🇷', jp: '🇯🇵', us: '🇺🇸', tw: '🇹🇼' }
const COUNTRY_LABELS = { kr: '한국', jp: '일본', us: '미국', tw: '대만' }

const TYPE_LABELS = {
  planned: '기획형',
  olive_young: '올리브영',
  oliveyoung: '올리브영',
  oliveyoung_sale: '올리브영',
  '4week_challenge': '4주챌린지',
  '4week': '4주챌린지',
  megawari: '메가와리',
  'mega-warri': '메가와리'
}

const STATUS_COLORS = {
  submitted: '#3B82F6',
  approved: '#10B981',
  revision_requested: '#F59E0B',
  pending: '#6B7280',
  completed: '#8B5CF6'
}

// 알림음
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    // 소리 재생 실패 무시
  }
}

export default function LiveDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastFeedCount, setLastFeedCount] = useState(0)
  const [feedHistory, setFeedHistory] = useState([])
  const [pollCount, setPollCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [hoveredFeedId, setHoveredFeedId] = useState(null)
  const feedRef = useRef(null)
  const prevFeedRef = useRef([])
  const intervalRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/dashboard-realtime')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Unknown error')

      setData(result)
      setLastUpdated(new Date())
      setPollCount(c => c + 1)
      setError(null)

      // 새 피드 감지 → 소리
      const newFeed = result.feed || []
      if (prevFeedRef.current.length > 0 && newFeed.length > 0) {
        const prevFirstTime = prevFeedRef.current[0]?.time
        const newItems = newFeed.filter(f => f.time > prevFirstTime)
        if (newItems.length > 0 && soundEnabled) {
          playNotificationSound()
        }
      }
      prevFeedRef.current = newFeed

      // 히스토리 기록 (차트용)
      setFeedHistory(prev => {
        const entry = {
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          videos: result.stats?.videoSubmissions?.total || 0,
          sns: result.stats?.applicationStatus?.snsUploaded || 0,
          whatsapp: result.stats?.whatsapp?.total || 0
        }
        const next = [...prev, entry]
        return next.length > 30 ? next.slice(-30) : next
      })

      setLoading(false)
    } catch (err) {
      console.error('[LiveDashboard] fetch error:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [soundEnabled])

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchData])

  // 피드 자동 스크롤
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0
    }
  }, [data?.feed])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C084FC] mx-auto mb-4" />
          <p className="text-[#A0A0B0] text-lg">실시간 현황판 로딩중...</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats || {}
  const feed = data?.feed || []
  const campaigns = data?.activeCampaigns || []

  const videoStats = stats.videoSubmissions || {}
  const appStats = stats.applicationStatus || {}
  const campaignStats = stats.activeCampaigns || {}
  const waStats = stats.whatsapp || {}

  // 파이 차트 데이터
  const countryPieData = [
    { name: '한국', value: videoStats.korea || 0, color: '#3B82F6' },
    { name: '일본', value: videoStats.japan || 0, color: '#F59E0B' },
    { name: '미국', value: videoStats.us || 0, color: '#10B981' }
  ].filter(d => d.value > 0)

  const statusPieData = [
    { name: '제출됨', value: videoStats.byStatus?.submitted || 0, color: '#3B82F6' },
    { name: '승인', value: videoStats.byStatus?.approved || 0, color: '#10B981' },
    { name: '수정요청', value: videoStats.byStatus?.revision || 0, color: '#F59E0B' }
  ].filter(d => d.value > 0)

  // 캠페인 타입 차트
  const campaignTypeData = [
    { name: '기획형', value: campaignStats.byType?.planned || 0 },
    { name: '올리브영', value: campaignStats.byType?.olive_young || 0 },
    { name: '4주챌린지', value: campaignStats.byType?.['4week'] || 0 },
    { name: '메가와리', value: campaignStats.byType?.megawari || 0 }
  ].filter(d => d.value > 0)

  // 피드 아이콘 + 색상
  const getFeedIcon = (type) => {
    switch (type) {
      case 'video_upload': return <Video className="w-4 h-4" />
      case 'sns_upload': return <Upload className="w-4 h-4" />
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getFeedColor = (type) => {
    switch (type) {
      case 'video_upload': return 'text-blue-400 bg-blue-500/10'
      case 'sns_upload': return 'text-emerald-400 bg-emerald-500/10'
      case 'whatsapp': return 'text-green-400 bg-green-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getFeedLabel = (item) => {
    switch (item.type) {
      case 'video_upload': {
        const typeLabel = TYPE_LABELS[item.campaignType] || '기획형'
        let detail = typeLabel
        if (item.campaignType === '4week_challenge' || item.campaignType === '4week') {
          detail += ` ${item.weekNumber || item.videoNumber || 1}주차`
        }
        if (item.isCleanVideo) detail += ' 클린본'
        return `📹 ${item.creator} — 영상 ${item.version > 1 ? '재' : ''}제출 (${detail})`
      }
      case 'sns_upload':
        return `📱 ${item.creator} — SNS 업로드 완료`
      case 'whatsapp':
        return `💬 ${item.creator || '알 수 없음'} — WhatsApp ${item.template || ''} ${item.status === 'failed' ? '❌실패' : '✅발송'}`
      default:
        return `${item.type}`
    }
  }

  const getTimeAgo = (timeStr) => {
    if (!timeStr) return ''
    const diff = Date.now() - new Date(timeStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '방금'
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="text-[#A0A0B0] hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-1" /> 관리자
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#C084FC]" />
            실시간 현황판
          </h1>
          <div className="flex items-center gap-2 ml-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="text-green-400 text-sm font-medium">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[#A0A0B0] text-sm">
              마지막 갱신: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          )}
          <Button
            variant="ghost" size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'text-[#C084FC] hover:bg-white/5' : 'text-[#A0A0B0] hover:bg-white/5'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData} className="text-[#A0A0B0] hover:text-white hover:bg-white/5">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {error && <span className="text-red-400 text-sm">{error}</span>}
        </div>
      </div>

      {/* 리전 연결 상태 */}
      {data?.regions && (
        <div className="flex items-center gap-4 mb-4 px-2">
          <span className="text-xs text-[#606070]">DB 연결:</span>
          {data.regions.map(r => (
            <span key={r.code} className="text-xs text-[#A0A0B0] flex items-center gap-1">
              {COUNTRY_FLAGS[r.code]} {r.videoCount}영상 / {r.appCount}신청 / {r.campaignCount}캠페인
            </span>
          ))}
        </div>
      )}

      {/* 상단 KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard label="오늘 영상 제출" value={videoStats.total || 0} icon={<Video className="w-5 h-5" />} color="#3B82F6" />
        <KpiCard label="SNS 업로드" value={appStats.snsUploaded || 0} icon={<Upload className="w-5 h-5" />} color="#10B981" />
        <KpiCard label="영상 승인" value={appStats.approved || 0} icon={<CheckCircle className="w-5 h-5" />} color="#8B5CF6" />
        <KpiCard label="수정 요청" value={appStats.revisionRequested || 0} icon={<AlertCircle className="w-5 h-5" />} color="#F59E0B" />
        <KpiCard label="WhatsApp 발송" value={waStats.total || 0} sub={waStats.failed > 0 ? `실패 ${waStats.failed}` : null} icon={<MessageCircle className="w-5 h-5" />} color="#25D366" />
        <KpiCard label="활성 캠페인" value={campaignStats.total || 0} icon={<TrendingUp className="w-5 h-5" />} color="#C084FC" />
      </div>

      {/* 메인 그리드: 피드(좌측) + 차트(우측) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 실시간 피드 (주식 틱커 스타일) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 실시간 활동 피드 */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1E1E2E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#C084FC]" />
                <h2 className="text-lg font-semibold">실시간 활동 피드</h2>
                <span className="text-[#A0A0B0] text-sm ml-2">({feed.length}건)</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-blue-400">● 영상</span>
                <span className="text-emerald-400 ml-2">● SNS</span>
                <span className="text-green-400 ml-2">● WhatsApp</span>
              </div>
            </div>

            <div ref={feedRef} className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2A2A3A] scrollbar-track-transparent">
              {feed.length === 0 ? (
                <div className="p-8 text-center text-[#A0A0B0]">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  오늘 아직 활동이 없습니다
                </div>
              ) : (
                feed.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.time}-${idx}`}
                    className={`flex items-center gap-3 px-5 py-3 border-b border-[#1A1A2A] transition-colors duration-200 ${
                      idx === 0 ? 'bg-[#1A1A2A]' : 'hover:bg-[#16161F]'
                    }`}
                    onMouseEnter={() => setHoveredFeedId(idx)}
                    onMouseLeave={() => setHoveredFeedId(null)}
                  >
                    <div className={`p-1.5 rounded-lg ${getFeedColor(item.type)}`}>
                      {getFeedIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{getFeedLabel(item)}</p>
                      {item.campaign && (
                        <p className="text-xs text-[#A0A0B0] truncate mt-0.5">캠페인: {item.campaign}</p>
                      )}
                    </div>
                    <div className="text-xs text-[#606070] whitespace-nowrap">
                      {getTimeAgo(item.time)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 트렌드 차트 (시간대별 누적) */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#C084FC]" />
              <h2 className="text-lg font-semibold">실시간 트렌드</h2>
              <span className="text-[#A0A0B0] text-sm ml-2">(갱신마다 기록)</span>
            </div>
            {feedHistory.length < 2 ? (
              <div className="h-[200px] flex items-center justify-center text-[#A0A0B0] text-sm">
                데이터 수집중... ({feedHistory.length}/2)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={feedHistory}>
                  <defs>
                    <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
                  <XAxis dataKey="time" stroke="#606070" fontSize={11} />
                  <YAxis stroke="#606070" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: '#1E1E2E', border: '1px solid #2A2A3A', borderRadius: 8, color: '#fff' }}
                    itemStyle={{ color: '#A0A0B0' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="videos" stroke="#3B82F6" fill="url(#colorVideos)" name="영상 제출" />
                  <Area type="monotone" dataKey="sns" stroke="#10B981" fill="url(#colorSns)" name="SNS 업로드" />
                  <Line type="monotone" dataKey="whatsapp" stroke="#25D366" strokeDasharray="5 5" dot={false} name="WhatsApp" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 우측: 차트 + 캠페인 목록 */}
        <div className="space-y-6">
          {/* 나라별 영상 제출 */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-5">
            <h3 className="text-sm font-semibold text-[#A0A0B0] mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#C084FC]" /> 나라별 영상 제출
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {['kr', 'jp', 'us'].map(c => (
                <div key={c} className="bg-[#1A1A2A] rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{COUNTRY_FLAGS[c]}</div>
                  <div className="text-2xl font-bold text-white">
                    {c === 'kr' ? videoStats.korea : c === 'jp' ? videoStats.japan : videoStats.us}
                  </div>
                  <div className="text-xs text-[#A0A0B0]">{COUNTRY_LABELS[c]}</div>
                </div>
              ))}
            </div>
            {countryPieData.length > 0 && (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={countryPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {countryPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E1E2E', border: '1px solid #2A2A3A', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 영상 상태별 */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-5">
            <h3 className="text-sm font-semibold text-[#A0A0B0] mb-3">영상 상태</h3>
            <div className="space-y-3">
              {[
                { label: '제출됨', value: videoStats.byStatus?.submitted || 0, color: '#3B82F6' },
                { label: '승인', value: videoStats.byStatus?.approved || 0, color: '#10B981' },
                { label: '수정요청', value: videoStats.byStatus?.revision || 0, color: '#F59E0B' }
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#A0A0B0]">{s.label}</span>
                    <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                  <div className="h-2 bg-[#1A1A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${videoStats.total > 0 ? (s.value / videoStats.total * 100) : 0}%`,
                        backgroundColor: s.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 캠페인 타입별 */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-5">
            <h3 className="text-sm font-semibold text-[#A0A0B0] mb-3">활성 캠페인 유형</h3>
            {campaignTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={campaignTypeData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
                  <XAxis type="number" stroke="#606070" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#A0A0B0" fontSize={12} width={70} />
                  <Bar dataKey="value" fill="#C084FC" radius={[0, 6, 6, 0]} />
                  <Tooltip contentStyle={{ background: '#1E1E2E', border: '1px solid #2A2A3A', borderRadius: 8, color: '#fff' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[#A0A0B0] text-sm text-center py-4">데이터 없음</p>
            )}
          </div>

          {/* 활성 캠페인 목록 */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-5">
            <h3 className="text-sm font-semibold text-[#A0A0B0] mb-3">진행중 캠페인 ({campaigns.length})</h3>
            <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-[#2A2A3A] scrollbar-track-transparent">
              {campaigns.length === 0 ? (
                <p className="text-[#A0A0B0] text-sm text-center py-4">활성 캠페인 없음</p>
              ) : (
                campaigns.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#1A1A2A] hover:bg-[#222232] transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/campaigns/${c.id}`)}
                  >
                    <span className="text-lg">{COUNTRY_FLAGS[c.country] || '🌐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{c.title}</p>
                      <p className="text-xs text-[#A0A0B0]">{TYPE_LABELS[c.type] || c.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WhatsApp 요약 */}
          <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-5">
            <h3 className="text-sm font-semibold text-[#A0A0B0] mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-400" /> WhatsApp 발송
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1A1A2A] rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{waStats.success || 0}</div>
                <div className="text-xs text-[#A0A0B0]">성공</div>
              </div>
              <div className="bg-[#1A1A2A] rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{waStats.failed || 0}</div>
                <div className="text-xs text-[#A0A0B0]">실패</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// KPI 카드 컴포넌트
function KpiCard({ label, value, sub, icon, color }) {
  return (
    <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-4 flex flex-col items-center justify-center text-center">
      <div className="p-2 rounded-xl mb-2" style={{ backgroundColor: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{value}</div>
      <div className="text-xs text-[#A0A0B0]">{label}</div>
      {sub && <div className="text-xs text-red-400 mt-1">{sub}</div>}
    </div>
  )
}
