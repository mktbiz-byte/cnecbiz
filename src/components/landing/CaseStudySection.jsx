import { Eye, Users, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

const caseStudies = [
  {
    brand: 'M사',
    campaign: '신제품 런칭 숏폼 8건',
    metrics: [
      { icon: Eye, value: '850K', label: '조회수' },
      { icon: Users, value: '520K', label: '도달수' },
      { icon: TrendingUp, value: '2.8%', label: '전환율' },
    ],
    quote: '"크리에이터 퀄리티가 다르더라구요. 기획안부터 달랐습니다."',
    person: { name: '김** 팀장', role: '마케팅팀 · M사' },
  },
  {
    brand: 'S사',
    campaign: '올리브영 세일 기간 집중 캠페인',
    metrics: [
      { icon: Eye, value: '1.6M', label: '조회수' },
      { icon: Users, value: '980K', label: '도달수' },
      { icon: TrendingUp, value: '3.5%', label: '전환율' },
    ],
    quote: '"매출 전월 대비 280% 상승. 부담 없이 시작할 수 있어서 좋았습니다."',
    person: { name: '박** 매니저', role: '이커머스팀 · S사' },
  },
  {
    brand: 'C사',
    campaign: '일본 시장 진출 글로벌 캠페인',
    metrics: [
      { icon: Eye, value: '1.1M', label: '조회수' },
      { icon: Users, value: '720K', label: '도달수' },
      { icon: TrendingUp, value: '3.1%', label: '전환율' },
    ],
    quote: '"현지 크리에이터 섭외부터 콘텐츠까지 크넥 하나로 해결했어요."',
    person: { name: '이** 이사', role: '해외사업부 · C사' },
  },
]

export default function CaseStudySection() {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-purple-600 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3">
            RESULTS
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            브랜드가 증명하는<br />
            <span className="text-purple-600">실제 성과</span>
          </h2>
        </motion.div>

        {/* Case Study Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {caseStudies.map((study, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              {/* Brand & Campaign */}
              <div>
                <h3 className="text-gray-900 font-bold text-lg sm:text-xl mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {study.brand}
                </h3>
                <p className="text-gray-400 text-sm mb-5">{study.campaign}</p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {study.metrics.map((metric, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                      <metric.icon className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {metric.value}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{metric.label}</p>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-600 text-sm leading-relaxed italic mb-6">
                  {study.quote}
                </p>
              </div>

              {/* Person */}
              <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">{study.person.name[0]}</span>
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-sm">{study.person.name}</p>
                  <p className="text-gray-400 text-xs">{study.person.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
