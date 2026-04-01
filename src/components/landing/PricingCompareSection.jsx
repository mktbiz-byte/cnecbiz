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
    label: '영상 수정',
    cnec: '1회 무료',
    agency: '추가 비용',
    experience: false,
    cnecHighlight: true,
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
    return <CheckCircle2 className={`w-5 h-5 ${highlight ? 'text-purple-600' : 'text-green-500'}`} />
  }
  if (value === false) {
    return <X className="w-5 h-5 text-gray-300" />
  }
  return (
    <span className={`text-sm ${highlight ? 'text-purple-700 font-semibold' : 'text-gray-500'}`}>
      {value}
    </span>
  )
}

export default function PricingCompareSection({ user, navigate }) {
  return (
    <section id="pricing-compare" className="py-12 sm:py-16 lg:py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <p className="text-purple-600 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3">
            PRICING COMPARISON
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            같은 숏폼, <span className="text-purple-600">다른 가격</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">
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
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-4 border-b border-gray-100">
              <div className="p-5" />
              <div className="p-5 text-center border-x border-purple-200 bg-purple-50">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-semibold mb-2">
                  추천
                </div>
                <p className="text-gray-900 font-bold text-lg">크넥 CNEC</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-gray-400 font-medium text-lg mt-7">대행사</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-gray-400 font-medium text-lg mt-7">체험단</p>
              </div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-4 ${idx < comparisonRows.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}
              >
                <div className="p-4 pl-6 flex items-center">
                  <span className="text-sm text-gray-600 font-medium">{row.label}</span>
                </div>
                <div className="p-4 flex items-center justify-center border-x border-purple-100 bg-purple-50/40">
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
          <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 shadow-sm">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-semibold mb-2">
                추천
              </div>
              <p className="text-gray-900 font-bold text-lg">크넥 CNEC</p>
              <p className="text-purple-600 text-2xl font-bold mt-2">₩200,000<span className="text-gray-400 text-sm font-normal">/건</span></p>
            </div>
            <div className="space-y-3">
              {comparisonRows.slice(1).map((row, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <CellValue value={row.cnec} highlight />
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <p className="text-gray-400 text-xs mb-1">대행사 평균 ₩3,000,000+ · 체험단 ₩500,000+</p>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            숨겨진 비용 없음 — 기획비, 매칭비, 2차 활용비, 수정 1회 모두 포함
          </div>
          <div className="block">
            <button
              onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
              className="w-full sm:w-auto px-7 py-3.5 bg-purple-600 text-white rounded-full font-semibold text-sm sm:text-base hover:bg-purple-700 transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
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
