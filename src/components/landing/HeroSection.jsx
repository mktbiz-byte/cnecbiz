import { ArrowRight, Download, Sparkles, BarChart3, MessageCircle, Award, Globe, Users } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HeroSection({ user, navigate, brochureUrl }) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 bg-[#0A0A0F] overflow-hidden">
      {/* 배경 효과 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-[#C084FC]/20 rounded-full blur-[120px] pointer-events-none opacity-50 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/4 right-0 w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-16 lg:gap-8 relative z-10">

        {/* 좌측: 콘텐츠 */}
        <div className="flex flex-col justify-center max-w-2xl pt-10 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C084FC]/30 bg-[#C084FC]/10 text-[#E0AAFF] text-xs font-semibold tracking-wider w-fit"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            <Sparkles className="w-3 h-3" />
            K-BEAUTY GLOBAL SHORT-FORM PLATFORM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.2] tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-[#E0AAFF] to-[#C084FC] bg-clip-text text-transparent" style={{ fontFamily: "'Outfit', 'Pretendard', sans-serif" }}>30만원</span>이면<br />
            충분합니다.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-400 mb-8 sm:mb-10 leading-relaxed max-w-xl"
          >
            에이전시 없이, 글로벌 숏폼 캠페인을 직접 시작하세요.<br />
            AI가 최적의 크리에이터를 매칭합니다. 가입부터 캠페인 오픈까지 단 <span className="text-white font-semibold">5분</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-10 sm:mb-14"
          >
            <button
              onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
              className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-[#C084FC] text-[#0A0A0F] font-bold hover:brightness-110 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(192,132,252,0.3)]"
            >
              무료로 캠페인 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={brochureUrl || "https://docs.google.com/presentation/d/1PFEJi0gWZCWn9g9Vcx0bScZGf3W53_4n/export/pdf"}
              className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white/[0.03] backdrop-blur-[16px] border border-white/[0.08] text-white font-medium hover:bg-white/10 transition-all"
            >
              <Download className="w-4 h-4" />
              소개서 다운로드
            </a>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-wrap gap-3"
          >
            {[
              { icon: Users, label: '520+ 브랜드' },
              { icon: Globe, label: '3개국 운영' },
              { icon: Award, label: 'KOTRA 수출바우처' },
            ].map((badge, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-sm text-[#A0A0B0]"
              >
                <badge.icon className="w-3.5 h-3.5 text-[#C084FC]" />
                {badge.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* 우측: 모의 대시보드 UI */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative h-[600px] hidden lg:block"
        >
          <style>{`
            @keyframes hero-float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
            @keyframes hero-float-delayed {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
            .hero-float { animation: hero-float 6s ease-in-out infinite; }
            .hero-float-delayed { animation: hero-float-delayed 6s ease-in-out 3s infinite; }
          `}</style>

          {/* 메인 대시보드 카드 */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[520px] bg-white/[0.03] backdrop-blur-[16px] border border-white/[0.08] shadow-2xl rounded-2xl p-6 hero-float z-10">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C084FC] to-blue-500 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">캠페인 대시보드</h3>
                  <p className="text-xs text-gray-400">실시간 현황</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">캠페인 비용</p>
                <p className="text-2xl font-bold text-[#E0AAFF]" style={{ fontFamily: "'Outfit', sans-serif" }}>₩30<span className="text-sm text-gray-500 font-normal ml-0.5">만</span></p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">매칭 크리에이터</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>24<span className="text-sm text-gray-500 font-normal ml-1">명</span></p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs text-gray-400 mb-1">예상 도달 수</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>1.2<span className="text-sm text-gray-500 font-normal ml-1">M</span></p>
              </div>
            </div>

            {/* 매칭 리스트 */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 mb-2">최근 매칭 현황</p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-400" />
                  <div>
                    <p className="text-sm font-medium">글로우 립스틱 리뷰</p>
                    <p className="text-xs text-gray-500">미국 타겟 · 틱톡</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#E0AAFF]">12명 지원</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-400" />
                  <div>
                    <p className="text-sm font-medium">수분크림 챌린지</p>
                    <p className="text-xs text-gray-500">일본 타겟 · 릴스</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#E0AAFF]">8명 매칭 완료</span>
              </div>
            </div>
          </div>

          {/* 플로팅 AI 매칭 카드 */}
          <div className="absolute -left-12 top-1/4 bg-white/[0.03] backdrop-blur-[16px] border border-white/[0.08] shadow-2xl rounded-2xl p-4 flex items-center gap-4 hero-float-delayed z-20 w-64 border-l-4 border-l-[#E0AAFF]">
            <div className="w-12 h-12 rounded-full bg-[#C084FC]/20 flex items-center justify-center border border-[#C084FC]/50">
              <Sparkles className="w-6 h-6 text-[#E0AAFF]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#E0AAFF] mb-0.5">AI 매칭 완료</p>
              <p className="text-sm font-bold text-white">최적의 크리에이터 발견</p>
              <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>적합도 98.5%</p>
            </div>
          </div>

          {/* 플로팅 Quick Action 알약 */}
          <div className="absolute right-12 -bottom-4 bg-white/[0.03] backdrop-blur-[16px] border border-white/[0.08] rounded-full px-6 py-3 flex items-center gap-3 hero-float z-20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C084FC] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E0AAFF]" />
            </div>
            <p className="text-sm font-medium text-white">숏폼 1건 30만원, 숨겨진 비용 없음</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
