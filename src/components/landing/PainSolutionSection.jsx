import { ArrowRight, DollarSign, Clock, Eye, TrendingDown, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const comparisons = [
  {
    painIcon: DollarSign,
    painTitle: '높은 비용',
    painDesc: '에이전시 숏폼 1건 300만원 이상. 기획비, 매칭비, 2차 활용비 별도.',
    solutionIcon: Shield,
    solutionTitle: '20만원, 올인원',
    solutionDesc: '기획부터 2차 활용까지 20만원에 모두 포함. 추가 비용 없음.',
  },
  {
    painIcon: Clock,
    painTitle: '느린 진행',
    painDesc: '상담 → 견적 → 계약 → 매칭까지 최소 2-4주 소요.',
    solutionIcon: Zap,
    solutionTitle: '14일 완료',
    solutionDesc: '가입 5분, AI 매칭 즉시. 14일 안에 SNS 업로드까지 완료.',
  },
  {
    painIcon: Eye,
    painTitle: '불투명한 가격',
    painDesc: '"견적 문의" 뒤에 숨겨진 비용. 결과물 나올 때까지 총 비용 불명확.',
    solutionIcon: TrendingDown,
    solutionTitle: '투명한 가격표',
    solutionDesc: '홈페이지에 가격 공개. 결제 전 정확한 금액을 확인할 수 있습니다.',
  },
]

export default function PainSolutionSection({ navigate }) {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
            BEFORE & AFTER
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
            숏폼 마케팅, <span className="text-[#C084FC]">이렇게 달라집니다</span>
          </h2>
          <p className="text-[#A0A0B0] text-sm sm:text-base">
            에이전시에 맡길 때 vs 크넥에서 직접 할 때
          </p>
        </motion.div>

        <div className="space-y-4 sm:space-y-6">
          {comparisons.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0"
            >
              {/* Pain (Before) */}
              <div className="bg-[#121218] rounded-[20px] p-5 sm:p-6 border border-white/[0.06] md:rounded-r-none md:border-r-0">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                    <item.painIcon className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-red-400/60 font-medium tracking-wider uppercase mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>BEFORE</p>
                    <h3 className="text-white font-bold text-base sm:text-lg mb-1">{item.painTitle}</h3>
                    <p className="text-[#A0A0B0] text-sm leading-relaxed">{item.painDesc}</p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center w-12">
                <ArrowRight className="w-5 h-5 text-[#C084FC]" />
              </div>
              <div className="flex md:hidden items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#C084FC]/10 border border-[#C084FC]/20 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-[#C084FC] rotate-90" />
                </div>
              </div>

              {/* Solution (After) */}
              <div className="bg-[#121218] rounded-[20px] p-5 sm:p-6 border border-[#C084FC]/15 md:rounded-l-none md:border-l-0 md:border-l-2 md:border-l-[#C084FC]/30">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(192,132,252,0.1)] border border-[rgba(192,132,252,0.2)] flex items-center justify-center flex-shrink-0">
                    <item.solutionIcon className="w-5 h-5 text-[#C084FC]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#C084FC]/60 font-medium tracking-wider uppercase mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>AFTER</p>
                    <h3 className="text-white font-bold text-base sm:text-lg mb-1">{item.solutionTitle}</h3>
                    <p className="text-[#A0A0B0] text-sm leading-relaxed">{item.solutionDesc}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
