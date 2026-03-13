import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Package, Users, Clock, CheckCircle, Star, Play, X,
  Loader2, ArrowRight, Sparkles, ChevronDown, ChevronUp,
  Lock, Zap, ShieldCheck, Bell
} from 'lucide-react'

function CountdownTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    if (!deadline) return
    const target = new Date(deadline).getTime()
    const interval = setInterval(() => {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  return (
    <div className="flex justify-center gap-4 md:gap-6">
      {[
        { val: timeLeft.days, label: '일' },
        { val: timeLeft.hours, label: '시간' },
        { val: timeLeft.minutes, label: '분' },
        { val: timeLeft.seconds, label: '초' },
      ].map(({ val, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-16 h-20 md:w-20 md:h-24 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-3xl md:text-5xl font-black tabular-nums shadow-inner relative overflow-hidden"
               style={{ fontFamily: "'Outfit', sans-serif" }}>
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            {String(val).padStart(2, '0')}
          </div>
          <span className="mt-3 text-sm font-medium text-[#A0A0B0]">{label}</span>
        </div>
      ))}
    </div>
  )
}

function VideoModal({ url, onClose }) {
  if (!url) return null
  const videoId = url.match(/(?:v=|\/)([\w-]{11})/)?.[1]
  if (!videoId) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-[#C084FC] transition-colors">
          <X className="w-6 h-6" />
        </button>
        <div className="aspect-video rounded-2xl overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
        </div>
      </div>
    </div>
  )
}

export default function PackageLanding() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [creators, setCreators] = useState([])
  const [remainingSlots, setRemainingSlots] = useState(0)
  const [videoModal, setVideoModal] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeFaq, setActiveFaq] = useState(0)
  const [showNotification, setShowNotification] = useState(false)
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '',
    phone: '', brand_name: '', product_url: '', note: ''
  })
  const formRef = useRef(null)

  useEffect(() => {
    document.title = '크넥 특가 패키지 | CNEC'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    fetchData()
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  // Social proof notification
  useEffect(() => {
    const notifyTimer = setInterval(() => {
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 4000)
    }, 15000)
    return () => clearInterval(notifyTimer)
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/.netlify/functions/get-package-data')
      const result = await res.json()
      if (result.success && result.data.settings) {
        setSettings(result.data.settings)
        setCreators(result.data.creators)
        setRemainingSlots(result.data.remaining_slots)
      }
    } catch (error) {
      console.error('패키지 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.company_name || !form.contact_name || !form.email) {
      alert('회사명, 담당자명, 이메일은 필수입니다.')
      return
    }
    if (remainingSlots <= 0) {
      alert('이번 달 패키지 신청이 마감되었습니다.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/.netlify/functions/submit-package-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, package_setting_id: settings.id })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setSubmitted(true)
    } catch (error) {
      alert(`신청 실패: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C084FC]" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#A0A0B0]">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">현재 진행 중인 패키지가 없습니다.</p>
          <p className="text-sm mt-2">다음 패키지 오픈을 기다려주세요.</p>
        </div>
      </div>
    )
  }

  const totalPrice = settings.per_creator_price * settings.total_creators
  const discountedPrice = totalPrice * (1 - settings.discount_rate / 100)
  const displayMax = settings._display_max || settings.max_companies

  const faqs = [
    { q: '패키지 신청 후 어떻게 진행되나요?', a: '신청 확인 후 24시간 이내에 전담 매니저가 연락드립니다. 심사 승인 후 전용 캠페인 대시보드가 오픈되며, 브랜드에 최적화된 크리에이터를 매칭하여 캠페인을 시작합니다.' },
    { q: '매칭된 크리에이터가 거부하면 어떻게 되나요?', a: '걱정하지 마세요. 크리에이터 사정으로 진행이 불가할 경우, 동일 등급 혹은 그 이상의 상위 크리에이터로 무상 교체 매칭을 100% 보장해 드립니다.' },
    { q: '영상의 2차 활용이 가능한가요?', a: '네, 국내·해외 마케팅 전 채널에서 1년간 자유롭게 사용 가능합니다. 메타(Facebook/Instagram) 광고 집행을 위한 광고 코드 발급까지 함께 진행해 드립니다.' },
    { q: '영상은 편집본만 제공되나요?', a: '편집본과 함께 클린본(자막·로고 없는 원본)도 무상으로 지급됩니다. 브랜드 자체 편집이나 광고 소재 제작에 바로 활용하실 수 있습니다.' },
    { q: '크리에이터 가이드는 제공되나요?', a: 'AI 기반 맞춤 가이드를 무상으로 제공해 드립니다. 원하실 경우 PDF 파일로도 전달 가능하며, 브랜드 톤앤매너에 맞춰 세부 조율도 가능합니다.' },
    { q: '수정 요청은 몇 번까지 가능한가요?', a: '브랜드의 만족도를 위해 기본 1회 수정이 포함되어 있습니다. 디테일한 연출이 필요한 경우 전담 매니저의 조율 하에 유연하게 대처해 드립니다.' },
    { q: '영상 업로드는 어떻게 진행되나요?', a: '가장 파급력이 높은 황금 시간대를 분석하여 크리에이터 채널에 전략적 동시/순차 업로드를 진행합니다. 모든 일정은 전담 매니저가 컨트롤합니다.' },
    { q: '결제는 어떻게 진행되나요?', a: '신청 승인 후 세금계산서 발행과 함께 선입금으로 진행됩니다. 카드 결제 및 계좌이체 모두 가능하며, 결제 완료 후 크리에이터 매칭이 시작됩니다.' },
    { q: '캠페인 성과 리포트를 받을 수 있나요?', a: '캠페인 종료 후 크리에이터별 조회수, 좋아요, 댓글 등 주요 지표가 포함된 성과 리포트를 제공해 드립니다.' },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-gray-100 selection:bg-purple-500/30">
      {videoModal && <VideoModal url={videoModal} onClose={() => setVideoModal(null)} />}

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#C084FC]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/15 rounded-full blur-[120px]" />
      </div>

      {/* Social Proof Notification Toast */}
      <div className={`fixed bottom-24 md:bottom-8 left-4 z-50 transition-all duration-500 transform ${showNotification ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-[#121218]/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
          <div className="bg-[#C084FC]/20 p-2 rounded-full">
            <Bell className="w-5 h-5 text-[#C084FC]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">방금 전, <span className="text-[#C084FC]">새 브랜드</span>에서</p>
            <p className="text-xs text-[#A0A0B0]">크넥 패키지를 신청했습니다.</p>
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-[#C084FC]/30 text-[#C084FC] text-sm font-semibold mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            {settings.month} 한정 VIP 매니지먼트 패키지
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6" style={{ fontFamily: "'Pretendard', sans-serif" }}>
            {settings.title || (
              <>
                상위 1% 크리에이터 {settings.total_creators}인,<br />
                <span className="text-[#C084FC]">당신의 브랜드로 섭외합니다.</span>
              </>
            )}
          </h1>

          {settings.subtitle && (
            <p className="text-lg md:text-xl text-[#A0A0B0] mb-10 max-w-2xl mx-auto">
              {settings.subtitle}
            </p>
          )}

          {/* Urgency Module */}
          {settings.deadline_date && (
            <div className="max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 opacity-50" />

              <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-6">
                <Zap className="w-5 h-5 animate-pulse" />
                <span>혜택 마감까지 남은 시간</span>
              </div>

              <div className="mb-10">
                <CountdownTimer deadline={settings.deadline_date} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left">
                  <p className="text-sm text-[#A0A0B0] mb-1">현재 잔여 슬롯</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-red-400" style={{ fontFamily: "'Outfit', sans-serif" }}>{remainingSlots}</span>
                    <span className="text-[#5A5A6E] mb-1">/ {displayMax} 브랜드</span>
                  </div>
                  <div className="w-full bg-black/50 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-red-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((displayMax - remainingSlots) / displayMax) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="bg-[#C084FC]/10 border border-[#C084FC]/20 rounded-2xl p-4 text-left flex flex-col justify-center">
                  <p className="text-sm text-[#A0A0B0] mb-1">배정 크리에이터</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>{settings.total_creators}</span>
                    <span className="text-[#5A5A6E] mb-1">명 확정</span>
                  </div>
                  <p className="text-xs text-[#C084FC]/80 mt-2 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> 무상 교체 보장
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="mb-20">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/[0.08] rounded-3xl p-8 md:p-12 relative overflow-hidden group hover:border-[#C084FC]/30 transition-colors duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
              <Star className="w-64 h-64 text-[#C084FC]" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-2 text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>프리미엄 패키지 가격</h2>
                <p className="text-[#A0A0B0] mb-6">검증된 상위 크리에이터가 브랜드의 매출을 만듭니다.</p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[#5A5A6E] line-through text-2xl font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {totalPrice.toLocaleString()}원
                    </span>
                    {settings.discount_rate > 0 && (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-bold">
                        {settings.discount_rate}% 특별 할인
                      </span>
                    )}
                  </div>
                  <div className="text-5xl md:text-6xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <span className="text-white">{discountedPrice.toLocaleString()}</span>
                    <span className="text-3xl font-bold text-[#5A5A6E]">원</span>
                  </div>
                  <p className="text-sm text-[#C084FC] font-medium mt-2">
                    크리에이터 {settings.total_creators}명 × {settings.per_creator_price.toLocaleString()}원 (VAT 별도)
                  </p>
                </div>
              </div>

              <div className="w-full md:w-auto grid grid-cols-1 gap-4">
                {[
                  `${settings.total_creators}명 상위 크리에이터 즉시 배정`,
                  '크리에이터 거부 시 무상 동급 교체',
                  '캠페인 전담 매니저 1:1 밀착 관리',
                ].map((perk, i) => (
                  <div key={i} className="flex items-center gap-3 bg-black/30 border border-white/5 px-6 py-4 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-[#C084FC] flex-shrink-0" />
                    <span className="font-medium text-white">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Creator Showcase */}
        {creators.length > 0 && (
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3 text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                이번 달 VIP 크리에이터 라인업
              </h2>
              <p className="text-[#A0A0B0]">철저한 심사를 거친 상위 1% 유튜버/인플루언서입니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creators.map((creator) => {
                const sampleVideos = [creator.sample_video_url_1, creator.sample_video_url_2, creator.sample_video_url_3].filter(Boolean)
                const firstVideoId = sampleVideos[0]?.match(/(?:v=|\/)([\w-]{11})/)?.[1]

                return (
                  <div
                    key={creator.id}
                    className="group relative bg-white/5 border border-white/[0.08] rounded-2xl overflow-hidden hover:border-[#C084FC]/40 transition-all duration-300"
                  >
                    {/* Thumbnail / Header */}
                    <div className="h-48 relative overflow-hidden bg-[#121218]">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-transparent to-transparent z-10" />
                      {firstVideoId ? (
                        <img
                          src={`https://img.youtube.com/vi/${firstVideoId}/mqdefault.jpg`}
                          alt={creator.display_name || '크리에이터'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-12 h-12 text-[#5A5A6E]" />
                        </div>
                      )}
                      {firstVideoId && (
                        <button
                          onClick={() => setVideoModal(sampleVideos[0])}
                          className="absolute inset-0 flex items-center justify-center z-20"
                        >
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:bg-[#C084FC]/80 transition-colors">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        </button>
                      )}
                      {creator.highlight && (
                        <div className="absolute top-4 right-4 z-20">
                          <span className="bg-amber-500/90 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            {creator.highlight}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-5 relative z-20">
                      {creator.category && (
                        <div className="flex gap-2 mb-3">
                          <span className="text-xs bg-[#C084FC]/15 text-[#C084FC] px-2 py-1 rounded-md">
                            #{creator.category}
                          </span>
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-white mb-2">
                        {creator.display_name || '비공개 크리에이터'}
                      </h3>
                      {creator.avg_views && (
                        <p className="text-sm text-[#A0A0B0] mb-3">평균 {creator.avg_views} 조회</p>
                      )}
                      {creator.content_style && (
                        <p className="text-xs text-[#A0A0B0] mb-3 leading-relaxed whitespace-pre-line">{creator.content_style}</p>
                      )}

                      {/* Sample Video Thumbnails */}
                      {sampleVideos.length > 1 && (
                        <div className="flex gap-2 mt-3">
                          {sampleVideos.map((url, i) => {
                            const vid = url.match(/(?:v=|\/)([\w-]{11})/)?.[1]
                            return vid ? (
                              <button
                                key={i}
                                onClick={() => setVideoModal(url)}
                                className="relative flex-1 aspect-video rounded-lg overflow-hidden group/thumb"
                              >
                                <img
                                  src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                                  alt="샘플 영상"
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                                  <Play className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Application Form */}
        <div ref={formRef} className="mb-20 scroll-mt-24">
          <div className="max-w-3xl mx-auto bg-[#121218] border border-white/[0.08] rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C084FC] to-indigo-500" />

            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3 flex items-center justify-center gap-2 text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <Lock className="w-6 h-6 text-[#C084FC]" /> VIP 패키지 신청
              </h2>
              <p className="text-[#A0A0B0]">아래 정보를 입력하시면 전담 매니저가 24시간 이내에 연락드립니다.</p>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-[#C084FC] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">신청이 완료되었습니다!</h3>
                <p className="text-[#A0A0B0]">담당 매니저가 확인 후 빠르게 연락드리겠습니다.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0B0] mb-2">회사명 *</label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      placeholder="주식회사 ABC"
                      className="bg-white/5 border-white/10 text-white placeholder:text-[#5A5A6E] rounded-xl h-12 focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0B0] mb-2">담당자명 *</label>
                    <Input
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                      placeholder="홍길동 매니저"
                      className="bg-white/5 border-white/10 text-white placeholder:text-[#5A5A6E] rounded-xl h-12 focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0B0] mb-2">이메일 *</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@company.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-[#5A5A6E] rounded-xl h-12 focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A0A0B0] mb-2">연락처</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="010-1234-5678"
                      className="bg-white/5 border-white/10 text-white placeholder:text-[#5A5A6E] rounded-xl h-12 focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0B0] mb-2">브랜드/제품명</label>
                  <Input
                    value={form.brand_name}
                    onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                    placeholder="마케팅하실 브랜드명 또는 제품명"
                    className="bg-white/5 border-white/10 text-white placeholder:text-[#5A5A6E] rounded-xl h-12 focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0B0] mb-2">제품 링크</label>
                  <Input
                    value={form.product_url}
                    onChange={(e) => setForm({ ...form, product_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-[#5A5A6E] rounded-xl h-12 focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0B0] mb-2">요청사항</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows="4"
                    placeholder="특별히 원하시는 크리에이터 스타일이나 타겟이 있다면 남겨주세요."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[#5A5A6E] focus:outline-none focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC] transition-colors resize-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || remainingSlots <= 0}
                  className="w-full group relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#C084FC] to-indigo-500 hover:from-[#A855F7] hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(192,132,252,0.3)] hover:shadow-[0_0_30px_rgba(192,132,252,0.5)] transition-all duration-300 overflow-hidden"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : remainingSlots <= 0 ? (
                    '마감되었습니다'
                  ) : (
                    <>
                      <span className="relative z-10">마지막 {remainingSlots}자리 선점하기</span>
                      <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-[#5A5A6E] mt-4">
                  * 남은 자리가 모두 소진될 경우, 예약 대기로 전환됩니다.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/[0.15]">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-medium text-gray-200">{faq.q}</span>
                  {activeFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-[#C084FC] flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#5A5A6E] flex-shrink-0 ml-4" />
                  )}
                </button>
                <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${activeFaq === i ? 'max-h-60 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-[#A0A0B0] text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Sticky Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-[#0A0A0F]/80 backdrop-blur-xl border-t border-white/[0.08] p-4 z-40">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="hidden md:flex flex-col">
              <span className="text-xs text-red-400 font-bold">마감 임박 (잔여 {remainingSlots}자리)</span>
              <span className="text-lg font-bold text-white">크넥 {settings.total_creators}인 패키지</span>
            </div>
            <div className="flex-1 md:hidden flex justify-between items-center text-sm font-bold">
              <span className="text-gray-300">잔여 {remainingSlots}자리</span>
              <span className="text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {settings.month}
              </span>
            </div>
          </div>
          <button
            onClick={scrollToForm}
            className="w-full md:w-auto px-8 py-3 bg-white text-[#0A0A0F] font-bold rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            지금 바로 신청하기
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-[#5A5A6E] text-sm pb-24">
        <p>주식회사 하우파파 (HOWPAPA Inc.) | 크넥 (CNEC)</p>
      </footer>
    </div>
  )
}
