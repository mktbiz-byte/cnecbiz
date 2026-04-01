import { Sparkles, ArrowRight, Download, Users, Globe, Award, BarChart3, TrendingUp, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HeroSection({ user, navigate, brochureUrl }) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 bg-white overflow-hidden">
      {/* 배경 - 미묘한 보라색 그라데이션 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-50 rounded-full blur-[100px] opacity-40" />
        {/* 그리드 패턴 */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(to right, #7C3AED 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 relative z-10 py-16 lg:py-0">

        {/* 좌측: 콘텐츠 */}
        <div className="flex flex-col justify-center max-w-2xl">
          {/* 배지 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold tracking-wider w-fit"
          >
            <Sparkles className="w-3 h-3" />
            K-BEAUTY GLOBAL SHORT-FORM PLATFORM
          </motion.div>

          {/* 메인 타이틀 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6 text-gray-900"
          >
            뷰티 브랜드의<br />
            숏폼 마케팅,<br />
            <span className="text-purple-600">크넥이 다르다.</span>
          </motion.h1>

          {/* 서브 문구 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-500 mb-8 leading-relaxed max-w-xl"
          >
            27,000명 검증된 뷰티 크리에이터. AI가 브랜드에 최적화된 크리에이터를 매칭합니다.<br />
            가입 <span className="text-gray-900 font-semibold">5분</span>, 캠페인 완료 <span className="text-gray-900 font-semibold">14일</span>.
          </motion.p>

          {/* 차별점 포인트 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-col gap-2 mb-8"
          >
            {[
              '유튜브·인스타·틱톡 전 채널 동시 업로드',
              'AI 기획안 무료 · 2차 활용 무료',
              '숨겨진 비용 없음 — 가격표 공개',
            ].map((point, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                {point}
              </div>
            ))}
          </motion.div>

          {/* CTA 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 mb-10"
          >
            <button
              onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
              className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 text-base"
            >
              무료로 캠페인 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={brochureUrl || "https://docs.google.com/presentation/d/1PFEJi0gWZCWn9g9Vcx0bScZGf3W53_4n/export/pdf"}
              className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white border border-gray-200 text-gray-700 font-medium hover:border-purple-300 hover:text-purple-700 transition-all text-base"
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
              { icon: Users, label: '27,000+ 크리에이터' },
              { icon: Globe, label: '3개국 글로벌' },
              { icon: Award, label: 'KOTRA 수출바우처' },
            ].map((badge, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-600"
              >
                <badge.icon className="w-3.5 h-3.5 text-purple-600" />
                {badge.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* 우측: 대시보드 UI 모형 */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative h-[580px] hidden lg:block"
        >
          <style>{`
            @keyframes hero-float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-16px); }
            }
            @keyframes hero-float-delayed {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-12px); }
            }
            .hero-float { animation: hero-float 6s ease-in-out infinite; }
            .hero-float-delayed { animation: hero-float-delayed 6s ease-in-out 2s infinite; }
          `}</style>

          {/* 메인 대시보드 카드 */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] bg-white border border-gray-100 shadow-2xl shadow-gray-200/60 rounded-2xl p-6 hero-float z-10">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">캠페인 대시보드</h3>
                  <p className="text-xs text-gray-400">실시간 현황</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-semibold flex items-center gap-1.5 border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-xs text-gray-500 mb-1">캠페인 비용</p>
                <p className="text-xl font-bold text-purple-700">₩20<span className="text-sm text-gray-400 font-normal ml-0.5">만</span></p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">매칭 크리에이터</p>
                <p className="text-xl font-bold text-gray-900">24<span className="text-sm text-gray-400 font-normal ml-1">명</span></p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">예상 도달 수</p>
                <p className="text-xl font-bold text-gray-900">1.2<span className="text-sm text-gray-400 font-normal ml-1">M</span></p>
              </div>
            </div>

            {/* 매칭 리스트 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 mb-2">최근 매칭 현황</p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-300" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">글로우 립스틱 리뷰</p>
                    <p className="text-xs text-gray-400">미국 타겟 · 틱톡</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-purple-600">12명 지원</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-300 to-blue-300" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">수분크림 챌린지</p>
                    <p className="text-xs text-gray-400">일본 타겟 · 릴스</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-purple-600">8명 매칭 완료</span>
              </div>
            </div>
          </div>

          {/* 플로팅 AI 매칭 카드 */}
          <div className="absolute -left-8 top-1/4 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 flex items-center gap-4 hero-float-delayed z-20 w-60 border-l-4 border-l-purple-500">
            <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-600 mb-0.5">AI 매칭 완료</p>
              <p className="text-sm font-bold text-gray-900">최적의 크리에이터 발견</p>
              <p className="text-xs text-gray-400 mt-0.5">적합도 98.5%</p>
            </div>
          </div>

          {/* 플로팅 성과 배지 */}
          <div className="absolute right-8 -bottom-2 bg-white border border-gray-100 shadow-lg rounded-full px-5 py-3 flex items-center gap-3 hero-float z-20">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-semibold text-gray-800">AI 매칭 적합도 95%</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
