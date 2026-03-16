import { ArrowRight, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function FinalCTASection({ user, navigate }) {
  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-[#0A0A0F] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(192,132,252,0.08)] rounded-full blur-[120px]" />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-white leading-tight">
            아직도 에이전시에<br />
            <span className="text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>300만원</span> 쓰시나요?
          </h2>
          <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto">
            가입 5분, 캠페인 오픈 3분. 오늘 시작하면 2주 후 결과를 확인합니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
              className="w-full sm:w-auto px-8 py-4 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-base sm:text-lg hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(192,132,252,0.3)]"
            >
              무료로 캠페인 시작하기
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="https://pf.kakao.com/_xgNdxlG"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 border border-white/20 text-white rounded-full font-medium text-base hover:border-white/40 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              카카오톡 상담
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
