import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Package, Users, Clock, CheckCircle, Star, Play, X,
  Loader2, ArrowRight, Sparkles, ChevronDown
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
    <div className="flex gap-3">
      {[
        { val: timeLeft.days, label: '일' },
        { val: timeLeft.hours, label: '시' },
        { val: timeLeft.minutes, label: '분' },
        { val: timeLeft.seconds, label: '초' },
      ].map(({ val, label }) => (
        <div key={label} className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[60px]">
            <span className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {String(val).padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs text-[#A0A0B0] mt-1 block">{label}</span>
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
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-[#C084FC]">
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
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '',
    phone: '', brand_name: '', product_url: '', note: ''
  })
  const formRef = useRef(null)

  useEffect(() => {
    document.title = '크넥 특가 패키지 | CNEC'
    // Add noindex meta
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)

    fetchData()
    return () => {
      document.head.removeChild(meta)
    }
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

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {videoModal && <VideoModal url={videoModal} onClose={() => setVideoModal(null)} />}

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#C084FC]/10 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 relative z-10">
          <div className="text-center">
            <Badge className="bg-[#C084FC]/20 text-[#C084FC] border-[#C084FC]/30 mb-4 px-4 py-1">
              <Sparkles className="w-3 h-3 mr-1" />
              {settings.month} 특가 패키지
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {settings.title}
            </h1>
            {settings.subtitle && (
              <p className="text-lg md:text-xl text-[#A0A0B0] mb-8 max-w-2xl mx-auto">
                {settings.subtitle}
              </p>
            )}

            {/* Countdown */}
            {settings.deadline_date && (
              <div className="flex flex-col items-center gap-2 mb-8">
                <span className="text-sm text-[#A0A0B0] flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 마감까지
                </span>
                <CountdownTimer deadline={settings.deadline_date} />
              </div>
            )}

            {/* Slots indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                <div className="text-sm text-[#A0A0B0] mb-1">잔여 슬롯</div>
                <div className="text-3xl font-bold text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {remainingSlots}<span className="text-lg text-[#A0A0B0]">/{settings.max_companies}</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                <div className="text-sm text-[#A0A0B0] mb-1">크리에이터</div>
                <div className="text-3xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {settings.total_creators}<span className="text-lg text-[#A0A0B0]">명</span>
                </div>
              </div>
            </div>

            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-[#C084FC] hover:bg-[#A855F7] text-white px-8 py-6 text-lg rounded-2xl"
            >
              지금 신청하기 <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        <div className="text-center pb-8">
          <ChevronDown className="w-6 h-6 text-[#A0A0B0] mx-auto animate-bounce" />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16162A] border border-white/10 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
            패키지 가격
          </h2>
          <div className="flex items-baseline justify-center gap-3 mb-4">
            <span className="text-xl text-[#A0A0B0] line-through" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {totalPrice.toLocaleString()}원
            </span>
            <span className="text-4xl md:text-5xl font-bold text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {discountedPrice.toLocaleString()}원
            </span>
            <Badge className="bg-red-500/20 text-red-400 text-sm">{settings.discount_rate}% OFF</Badge>
          </div>
          <p className="text-[#A0A0B0]">
            크리에이터 {settings.total_creators}명 × {settings.per_creator_price.toLocaleString()}원
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              { icon: Users, text: `${settings.total_creators}명 크리에이터 배정` },
              { icon: CheckCircle, text: '크리에이터 거부 시 동급 교체' },
              { icon: Star, text: '전담 매니저 1:1 관리' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-[#A0A0B0] text-sm">
                <Icon className="w-4 h-4 text-[#C084FC] flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Showcase */}
      {creators.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
              이번 달 크리에이터
            </h2>
            <p className="text-[#A0A0B0]">엄선된 유튜브 크리에이터들과 함께하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <div
                key={creator.id}
                className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden hover:border-[#C084FC]/30 transition-all"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">
                        {creator.display_name || '비공개 크리에이터'}
                      </h3>
                      {creator.category && (
                        <Badge className="bg-[#C084FC]/20 text-[#C084FC] text-xs mt-1">
                          {creator.category}
                        </Badge>
                      )}
                    </div>
                    {creator.highlight && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                        {creator.highlight}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[#A0A0B0] mb-4">
                    {creator.avg_views && <span>평균 {creator.avg_views} 조회</span>}
                    {creator.subscriber_count && <span>구독 {creator.subscriber_count}</span>}
                  </div>
                  {creator.content_style && (
                    <p className="text-xs text-[#A0A0B0] mb-3">{creator.content_style}</p>
                  )}

                  {/* Sample Videos */}
                  <div className="flex gap-2">
                    {[creator.sample_video_url_1, creator.sample_video_url_2, creator.sample_video_url_3]
                      .filter(Boolean)
                      .map((url, i) => {
                        const videoId = url.match(/(?:v=|\/)([\w-]{11})/)?.[1]
                        return videoId ? (
                          <button
                            key={i}
                            onClick={() => setVideoModal(url)}
                            className="relative flex-1 aspect-video rounded-lg overflow-hidden group"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                              alt="샘플 영상"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Play className="w-6 h-6 text-white" />
                            </div>
                          </button>
                        ) : null
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Application Form */}
      <section ref={formRef} className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
            패키지 신청
          </h2>
          <p className="text-[#A0A0B0]">아래 정보를 입력하고 신청해주세요. 담당자가 빠르게 연락드립니다.</p>
        </div>

        {submitted ? (
          <div className="bg-[#1A1A2E] border border-[#C084FC]/30 rounded-3xl p-10 text-center">
            <CheckCircle className="w-16 h-16 text-[#C084FC] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">신청이 완료되었습니다!</h3>
            <p className="text-[#A0A0B0]">담당 매니저가 확인 후 빠르게 연락드리겠습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#1A1A2E] border border-white/10 rounded-3xl p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#A0A0B0] mb-1 block">회사명 *</label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="주식회사 ABC"
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#636E72]"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-[#A0A0B0] mb-1 block">담당자명 *</label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="홍길동"
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#636E72]"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#A0A0B0] mb-1 block">이메일 *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@company.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#636E72]"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-[#A0A0B0] mb-1 block">연락처</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-1234-5678"
                  className="bg-white/5 border-white/10 text-white placeholder:text-[#636E72]"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#A0A0B0] mb-1 block">브랜드/제품명</label>
              <Input
                value={form.brand_name}
                onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                placeholder="브랜드명 또는 제품명"
                className="bg-white/5 border-white/10 text-white placeholder:text-[#636E72]"
              />
            </div>
            <div>
              <label className="text-sm text-[#A0A0B0] mb-1 block">제품 링크</label>
              <Input
                value={form.product_url}
                onChange={(e) => setForm({ ...form, product_url: e.target.value })}
                placeholder="https://..."
                className="bg-white/5 border-white/10 text-white placeholder:text-[#636E72]"
              />
            </div>
            <div>
              <label className="text-sm text-[#A0A0B0] mb-1 block">요청사항</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="추가 요청사항이 있으면 작성해주세요"
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-[#636E72] rounded-lg p-3 text-sm min-h-[80px] resize-y"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || remainingSlots <= 0}
              className="w-full bg-[#C084FC] hover:bg-[#A855F7] text-white py-6 text-lg rounded-2xl"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : remainingSlots <= 0 ? (
                '마감되었습니다'
              ) : (
                <>신청하기 <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </form>
        )}
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
          자주 묻는 질문
        </h2>
        <div className="space-y-4">
          {[
            { q: '패키지 신청 후 어떻게 진행되나요?', a: '신청 확인 후 담당 매니저가 연락드립니다. 승인 후 전용 캠페인 페이지가 생성되며, 해당 페이지에서 크리에이터를 선택하고 캠페인을 진행할 수 있습니다.' },
            { q: '크리에이터가 거부하면 어떻게 되나요?', a: '동급 크리에이터로 교체해드립니다. 크리에이터 풀에서 대체 가능한 크리에이터를 배정합니다.' },
            { q: '수정 요청은 몇 번까지 가능한가요?', a: '기본적으로 1회 수정 요청이 가능합니다. 추가 수정이 필요한 경우 담당 매니저와 상의해주세요.' },
            { q: '영상 업로드는 어떻게 진행되나요?', a: '모든 영상이 승인되면 크리에이터들의 채널에 동시 업로드가 진행됩니다. 업로드 일정은 담당 매니저가 조율합니다.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-[#1A1A2E] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-2">{q}</h3>
              <p className="text-[#A0A0B0] text-sm">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-[#636E72] text-sm">
        <p>주식회사 하우파파 (HOWPAPA Inc.) | 크넥 (CNEC)</p>
      </footer>
    </div>
  )
}
