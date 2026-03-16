import { FileText, Sparkles, Package, Video, Upload, BarChart3, ArrowRight, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
  {
    day: 'Day 1',
    title: '캠페인 개설 + AI 매칭',
    desc: '캠페인 정보 입력 3분. AI가 즉시 최적 크리에이터 추천.',
    icon: Sparkles,
    time: '5분',
  },
  {
    day: 'Day 2-3',
    title: '크리에이터 확정 + 제품 발송',
    desc: '추천 크리에이터 중 직접 선택 후 제품 발송.',
    icon: Package,
    time: '10분',
  },
  {
    day: 'Day 4-10',
    title: 'AI 가이드 기반 촬영 · 제작',
    desc: 'AI 촬영 가이드에 따라 크리에이터가 콘텐츠 제작.',
    icon: Video,
    time: '자동 진행',
  },
  {
    day: 'Day 11-14',
    title: 'SNS 업로드 + 결과 리포트',
    desc: '완성 콘텐츠 SNS 업로드. 대시보드에서 성과 확인.',
    icon: Upload,
    time: '자동 완료',
  },
]

export default function ProcessSection({ user, navigate }) {
  return (
    <section className="py-10 sm:py-20 lg:py-28 bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
            14-DAY PROCESS
          </p>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            캠페인 완료까지 <span className="text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>14일.</span><br className="sm:hidden" />
            <span className="text-[#A0A0B0] text-[15px] sm:text-2xl lg:text-3xl font-medium"> 브랜드가 직접 하는 건 제품 발송뿐.</span>
          </h2>
        </motion.div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden md:block relative">
          {/* Connecting line */}
          <div className="absolute top-[52px] left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-[#C084FC]/20 via-[#C084FC]/40 to-[#C084FC]/20 z-0" />

          <div className="grid grid-cols-4 gap-5 relative z-10">
            {steps.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                {/* Icon node */}
                <div className="w-[104px] h-[104px] rounded-2xl bg-[#121218] border border-[rgba(192,132,252,0.15)] flex flex-col items-center justify-center mb-5 relative">
                  <item.icon className="w-7 h-7 text-[#C084FC] mb-1" />
                  <span className="text-[#C084FC] text-[10px] font-bold tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {item.day}
                  </span>
                </div>

                {/* Time badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(192,132,252,0.08)] text-[#C084FC] text-xs font-medium mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Clock className="w-3 h-3" />
                  {item.time}
                </span>

                <h3 className="text-white font-bold text-base mb-1.5">{item.title}</h3>
                <p className="text-[#A0A0B0] text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="md:hidden relative">
          {/* Vertical line */}
          <div className="absolute left-[22px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#C084FC]/30 via-[#C084FC]/20 to-[#C084FC]/10 z-0" />

          <div className="space-y-6 relative z-10">
            {steps.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="flex gap-4 items-start"
              >
                {/* Timeline node */}
                <div className="w-11 h-11 rounded-xl bg-[#121218] border border-[rgba(192,132,252,0.2)] flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-[#C084FC]" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-[#121218] rounded-[16px] p-4 border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[#C084FC] text-[10px] font-bold tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {item.day}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(192,132,252,0.08)] text-[#C084FC] text-[10px] font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      <Clock className="w-2.5 h-2.5" />
                      {item.time}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-[15px] mb-1">{item.title}</h3>
                  <p className="text-[#A0A0B0] text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Summary + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-10 sm:mt-14"
        >
          <p className="text-[#A0A0B0] text-sm mb-5">
            가입부터 결과 확인까지 약 <span className="text-[#C084FC] font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>14일</span>
          </p>
          <button
            onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
            className="w-full sm:w-auto px-7 py-3.5 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-sm sm:text-base hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
          >
            무료로 캠페인 시작하기
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
