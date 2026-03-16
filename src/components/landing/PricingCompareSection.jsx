import { CheckCircle2, X, ArrowRight, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const comparisonRows = [
  {
    label: '숏폼 1건 가격',
    cnec: '₩200,000',
    agency: '₩3,000,000~',
    experience: '₩500,000~',
    cnecHighlight: true,
  },
  {
    label: '기획/시나리오',
    cnec: 'AI 자동 생성',
    agency: '별도 비용',
    experience: '크리에이터 자율',
  },
  {
    label: '크리에이터 매칭',
    cnec: 'AI 자동 매칭',
    agency: '수동 (1-2주)',
    experience: '랜덤 배정',
  },
  {
    label: 'SNS 업로드',
    cnec: '유튜브·인스타·틱톡',
    agency: true,
    experience: '인스타 한정',
    cnecHighlight: true,
  },
  {
    label: '2차 활용 (광고 소재)',
    cnec: '무료',
    agency: '추가 비용',
    experience: '별도 협의',
  },
  {
    label: '원본 파일 제공',
    cnec: true,
    agency: '추가 비용',
    experience: false,
  },
  {
    label: 'AI 기획안',
    cnec: true,
    agency: false,
    experience: false,
  },
  {
    label: '글로벌 (미국/일본)',
    cnec: true,
    agency: '별도 계약',
    experience: false,
  },
]

function CellValue({ value, highlight = false }) {
  if (value === true) {
    return <CheckCircle2 className={`w-5 h-5 ${highlight ? 'text-[#C084FC]' : 'text-green-400'}`} />
  }
  if (value === false) {
    return <X className="w-5 h-5 text-[#5A5A6E]" />
  }
  return (
    <span className={`text-sm ${highlight ? 'text-white font-semibold' : 'text-[#A0A0B0]'}`}>
      {value}
    </span>
  )
}

export default function PricingCompareSection({ user, navigate }) {
  return (
    <section id="pricing-compare" className="py-12 sm:py-16 lg:py-24 bg-[#121218]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
            PRICING COMPARISON
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
            같은 숏폼, <span className="text-[#C084FC]">다른 가격</span>
          </h2>
          <p className="text-[#A0A0B0] text-sm sm:text-base max-w-2xl mx-auto">
            에이전시, 체험단, 크넥 — 같은 결과물, 전혀 다른 비용.
          </p>
        </motion.div>

        {/* Desktop Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden md:block"
        >
          <div className="bg-[#0A0A0F] rounded-[20px] border border-white/[0.06] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 border-b border-white/[0.06]">
              <div className="p-5" />
              <div className="p-5 text-center border-x border-[#C084FC]/30 bg-[#C084FC]/[0.03]">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C084FC] text-[#0A0A0F] text-xs font-semibold mb-2">
                  추천
                </div>
                <p className="text-white font-bold text-lg">크넥 CNEC</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-[#A0A0B0] font-medium text-lg mt-7">대행사</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-[#A0A0B0] font-medium text-lg mt-7">체험단</p>
              </div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-4 ${idx < comparisonRows.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}
              >
                <div className="p-4 pl-6 flex items-center">
                  <span className="text-sm text-[#A0A0B0] font-medium">{row.label}</span>
                </div>
                <div className="p-4 flex items-center justify-center border-x border-[#C084FC]/10 bg-[#C084FC]/[0.02]">
                  <CellValue value={row.cnec} highlight={row.cnecHighlight} />
                </div>
                <div className="p-4 flex items-center justify-center">
                  <CellValue value={row.agency} />
                </div>
                <div className="p-4 flex items-center justify-center">
                  <CellValue value={row.experience} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mobile: CNEC-focused card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:hidden"
        >
          <div className="bg-[#0A0A0F] rounded-[20px] border border-[#C084FC]/30 p-5">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C084FC] text-[#0A0A0F] text-xs font-semibold mb-2">
                추천
              </div>
              <p className="text-white font-bold text-lg">크넥 CNEC</p>
              <p className="text-[#C084FC] text-2xl font-bold mt-2" style={{ fontFamily: "'Outfit', sans-serif" }}>₩200,000<span className="text-[#5A5A6E] text-sm font-normal">/건</span></p>
            </div>
            <div className="space-y-3">
              {comparisonRows.slice(1).map((row, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-sm text-[#A0A0B0]">{row.label}</span>
                  <CellValue value={row.cnec} highlight />
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
              <p className="text-[#5A5A6E] text-xs mb-1">대행사 평균 ₩3,000,000+ · 체험단 ₩500,000+</p>
            </div>
          </div>
        </motion.div>

        {/* Bottom badge + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C084FC]/20 bg-[#C084FC]/[0.05] text-[#C084FC] text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            숨겨진 비용 없음 — 기획비, 매칭비, 2차 활용비 모두 포함
          </div>
          <div className="block">
            <button
              onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-sm sm:text-base hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
            >
              20만원부터 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
