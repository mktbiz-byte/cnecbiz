import { Sparkles, Package, Video, Upload, ArrowRight, Clock } from 'lucide-react'
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
    <section className="py-10 sm:py-20 lg:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-purple-600 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3">
            14-DAY PROCESS
          </p>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            캠페인 완료까지 <span className="text-purple-600">14일.</span><br className="sm:hidden" />
            <span className="text-gray-400 text-[15px] sm:text-2xl lg:text-3xl font-medium"> 브랜드가 직접 하는 건 제품 발송뿐.</span>
          </h2>
        </motion.div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden md:block relative">
          {/* Connecting line */}
          <div className="absolute top-[52px] left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-purple-100 via-purple-300 to-purple-100 z-0" />

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
                <div className="w-[104px] h-[104px] rounded-2xl bg-white border-2 border-purple-200 flex flex-col items-center justify-center mb-5 relative shadow-sm">
                  <item.icon className="w-7 h-7 text-purple-600 mb-1" />
                  <span className="text-purple-600 text-[10px] font-bold tracking-wider">
                    {item.day}
                  </span>
                </div>

                {/* Time badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-medium mb-3 border border-purple-100">
                  <Clock className="w-3 h-3" />
                  {item.time}
                </span>

                <h3 className="text-gray-900 font-bold text-base mb-1.5">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="md:hidden relative">
          {/* Vertical line */}
          <div className="absolute left-[22px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-200 via-purple-100 to-purple-50 z-0" />

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
                <div className="w-11 h-11 rounded-xl bg-white border-2 border-purple-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <item.icon className="w-5 h-5 text-purple-600" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-[16px] p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-purple-600 text-[10px] font-bold tracking-wider">
                      {item.day}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-medium border border-purple-100">
                      <Clock className="w-2.5 h-2.5" />
                      {item.time}
                    </span>
                  </div>
                  <h3 className="text-gray-900 font-bold text-[15px] mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
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
          <p className="text-gray-500 text-sm mb-5">
            가입부터 결과 확인까지 약 <span className="text-purple-600 font-semibold">14일</span>
          </p>
          <button
            onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
            className="w-full sm:w-auto px-7 py-3.5 bg-purple-600 text-white rounded-full font-semibold text-sm sm:text-base hover:bg-purple-700 transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
          >
            무료로 캠페인 시작하기
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
