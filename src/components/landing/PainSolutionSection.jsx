import { ArrowRight, DollarSign, Clock, Eye, TrendingDown, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const comparisons = [
  {
    painIcon: DollarSign,
    painTitle: '높은 비용',
    painDesc: '에이전시 숏폼 1건 300만원 이상. 기획비, 매칭비, 2차 활용비 별도.',
    solutionIcon: Shield,
    solutionTitle: '20만원부터, 올인원',
    solutionDesc: '기획부터 2차 활용까지 20만원부터 모두 포함. 수정 1회 무료, 추가 비용 없음.',
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
    solutionDesc: '홈페이지에 가격 공개. 결제 전 정확한 금액 확인 가능.',
  },
]

export default function PainSolutionSection({ navigate }) {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-purple-600 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3">
            BEFORE & AFTER
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            에이전시 300만원 vs <span className="text-purple-600">크넥 20만원부터</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
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
              <div className="bg-gray-50 rounded-[20px] p-5 sm:p-6 border border-gray-200 md:rounded-r-none md:border-r-0">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                    <item.painIcon className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-red-400 font-medium tracking-wider uppercase mb-1">BEFORE</p>
                    <h3 className="text-gray-900 font-bold text-base sm:text-lg mb-1">{item.painTitle}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.painDesc}</p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center w-12">
                <ArrowRight className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex md:hidden items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-purple-600 rotate-90" />
                </div>
              </div>

              {/* Solution (After) */}
              <div className="bg-white rounded-[20px] p-5 sm:p-6 border-2 border-purple-200 md:rounded-l-none md:border-l-0 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
                    <item.solutionIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-purple-500 font-medium tracking-wider uppercase mb-1">AFTER</p>
                    <h3 className="text-gray-900 font-bold text-base sm:text-lg mb-1">{item.solutionTitle}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.solutionDesc}</p>
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
