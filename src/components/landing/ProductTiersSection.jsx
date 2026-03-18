import { CheckCircle2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const tiers = [
  {
    name: '기획형 캠페인',
    price: '₩200,000',
    unit: '/건',
    desc: '숏폼 1건을 가장 합리적으로 시작하는 방법',
    popular: true,
    guideUrl: '/campaigns/intro/regular',
    features: [
      '브랜드 맞춤 시나리오 기획',
      '촬영 가이드라인 제공',
      'AI 크리에이터 매칭',
      'SNS 업로드 URL 1개',
      '2차 활용 및 파트너코드',
      '수정 1회 무료',
    ],
  },
  {
    name: '올영세일 패키지',
    price: '₩400,000',
    unit: '/건',
    desc: '올리브영 세일 기간 매출을 극대화하는 3단계 패키지',
    popular: false,
    guideUrl: '/campaigns/intro/oliveyoung',
    features: [
      '3단계 콘텐츠 (리뷰→홍보→당일)',
      '구매 전환 유도형 기획',
      'SNS 업로드 URL 3개',
      '원본 영상 파일 제공',
      '2차 활용 및 파트너코드',
      '수정 1회 무료',
    ],
  },
  {
    name: '4주 챌린지',
    price: '₩600,000',
    unit: '/건',
    desc: '진정성 있는 리뷰와 장기적인 바이럴 효과를 위한 프리미엄 플랜',
    popular: false,
    guideUrl: '/campaigns/intro/4week',
    features: [
      '주차별 미션 (총 4편 제작)',
      'Before & After 변화 기록',
      'SNS 업로드 URL 4개',
      '원본 영상 파일 제공',
      '2차 활용 및 파트너코드',
      '수정 1회 무료',
    ],
  },
]

export default function ProductTiersSection({ user, navigate }) {
  return (
    <section id="pricing" className="py-12 sm:py-16 lg:py-24 bg-[#121218]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12 lg:mb-16"
        >
          <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
            PRODUCT TIERS
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">목적에 맞는 <span className="text-[#C084FC]">캠페인 선택</span></h2>
          <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg">모든 캠페인에 AI 기획안, 크리에이터 매칭, 2차 활용이 포함됩니다.</p>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 max-w-5xl mx-auto -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tiers.map((tier, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`bg-[#0A0A0F] rounded-[20px] p-5 sm:p-6 lg:p-8 border snap-center min-w-[280px] sm:min-w-0 flex-shrink-0 md:flex-shrink relative ${
                tier.popular
                  ? 'border-[#C084FC]'
                  : 'border-white/[0.06] hover:border-white/15'
              } transition-colors`}
              style={tier.popular ? { boxShadow: '0 0 30px rgba(192,132,252,0.1)' } : {}}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C084FC] rounded-full text-xs font-semibold text-[#0A0A0F]">
                  인기
                </div>
              )}
              <h3 className={`text-base sm:text-lg font-medium mb-1.5 sm:mb-2 ${tier.popular ? 'text-[#C084FC]' : 'text-[#A0A0B0]'}`}>
                {tier.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{tier.price}</span>
                <span className="text-[#5A5A6E] text-sm">{tier.unit}</span>
              </div>
              <p className="text-[#5A5A6E] text-xs sm:text-sm mb-4 sm:mb-6">{tier.desc}</p>
              <button
                onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
                className={`w-full py-3 rounded-xl font-semibold text-sm sm:text-base transition-all mb-2 ${
                  tier.popular
                    ? 'bg-[#C084FC] text-[#0A0A0F] hover:brightness-110'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                이 캠페인으로 시작하기
              </button>
              <button
                onClick={() => window.open(tier.guideUrl, '_blank')}
                className="w-full py-2 text-[#5A5A6E] text-xs hover:text-white transition-colors mb-4 sm:mb-6"
              >
                캠페인 가이드 상세 보기 →
              </button>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#A0A0B0]">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        {/* 스와이프 힌트 - 모바일만 */}
        <div className="flex justify-center gap-1.5 mt-3 md:hidden">
          <span className="text-[#5A5A6E] text-[10px]">← 스와이프하여 모든 요금제 보기 →</span>
        </div>
      </div>
    </section>
  )
}
