import { ArrowRight, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function FinalCTASection({ user, navigate }) {
  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-gray-900 relative overflow-hidden">
      {/* 배경 보라색 글로우 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px]" />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-purple-400 text-xs font-medium tracking-[0.15em] uppercase mb-4">GET STARTED TODAY</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-white leading-tight">
            뷰티 브랜드의 숏폼 마케팅,<br />
            <span className="text-purple-400">크넥과 함께 다르게 시작하세요.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto">
            가입 5분, 캠페인 오픈 3분. 오늘 시작하면 2주 후 결과를 확인합니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
              className="w-full sm:w-auto px-8 py-4 bg-purple-600 text-white rounded-full font-semibold text-base sm:text-lg hover:bg-purple-500 transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50"
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
