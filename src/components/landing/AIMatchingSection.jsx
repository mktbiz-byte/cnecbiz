import { Shield, Sparkles, Globe, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    icon: Shield,
    title: '클린스코어 필터링',
    desc: '가짜 팔로워, 봇 댓글, 비정상 인게이지먼트를 4단계로 필터링',
  },
  {
    icon: Sparkles,
    title: '피부타입 매칭',
    desc: '크리에이터 피부타입 데이터와 제품 특성을 AI가 교차 분석',
  },
  {
    icon: Globe,
    title: '콘텐츠 스타일 분석',
    desc: '과거 콘텐츠의 톤, 구도, 편집 스타일을 분석하여 브랜드 핏 예측',
  },
  {
    icon: TrendingUp,
    title: '성과 예측 모델',
    desc: '유사 캠페인 데이터 기반으로 예상 조회수와 전환율을 사전 제공',
  },
]

// AI 매칭 다이어그램을 SVG + HTML로 구현
function AIMatchingDiagram() {
  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[420px] flex items-center justify-center">
      {/* 중앙 원 - AI 엔진 */}
      <div className="relative">
        {/* 외곽 링 */}
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-purple-200 flex items-center justify-center relative">
          {/* 중간 링 */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border border-purple-100 bg-purple-50/30 flex items-center justify-center">
            {/* 내부 원 */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-200">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>

          {/* 회전하는 분석 항목 라벨들 */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-full text-[10px] sm:text-xs font-medium text-purple-600 whitespace-nowrap shadow-sm">
              Price Fit
            </span>
          </div>
          <div className="absolute top-6 -right-16 sm:-right-20">
            <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-full text-[10px] sm:text-xs font-medium text-purple-600 whitespace-nowrap shadow-sm">
              Collaboration History
            </span>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-20 sm:-right-24">
            <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-full text-[10px] sm:text-xs font-medium text-purple-600 whitespace-nowrap shadow-sm">
              Category Expertise
            </span>
          </div>
          <div className="absolute bottom-6 -right-20 sm:-right-24">
            <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-full text-[10px] sm:text-xs font-medium text-purple-600 whitespace-nowrap shadow-sm">
              Content Performance
            </span>
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-full text-[10px] sm:text-xs font-medium text-purple-600 whitespace-nowrap shadow-sm">
              Audience Fit
            </span>
          </div>
        </div>

        {/* 좌측 크리에이터 프로필 카드들 */}
        <div className="absolute -left-20 sm:-left-28 top-0 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-24 sm:w-28">
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                i === 1 ? 'bg-purple-100' : i === 2 ? 'bg-blue-100' : 'bg-pink-100'
              }`}>
                <svg className={`w-3.5 h-3.5 ${i === 1 ? 'text-purple-500' : i === 2 ? 'text-blue-500' : 'text-pink-500'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 bg-gray-200 rounded w-full mb-1" />
                <div className="h-1 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>

        {/* 우측 매칭 결과 카드 */}
        <div className="absolute -right-16 sm:-right-24 top-0 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm w-24 sm:w-32">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                  i === 1 ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  <svg className={`w-3.5 h-3.5 ${i === 1 ? 'text-green-500' : 'text-orange-500'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-1.5 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-1 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className={`h-1 flex-1 rounded-full ${j <= (i === 1 ? 4 : 3) ? 'bg-purple-400' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 정확도 배지 */}
        <div className="absolute -right-12 sm:-right-16 -bottom-4 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-lg">
          <p className="text-[10px] text-gray-400 mb-0.5">평균 매칭 정확도</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>96.8%</p>
        </div>
      </div>
    </div>
  )
}

export default function AIMatchingSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* 좌측: 텍스트 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-purple-600 text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3">
              AI MATCHING
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
              AI가 찾아주는<br />
              <span className="text-purple-600">최적의 크리에이터</span>
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
              단순 팔로워 수가 아닌, 피부타입·콘텐츠 스타일·과거 성과 데이터를 종합 분석하여 브랜드에 가장 적합한 크리에이터를 매칭합니다.
            </p>

            <div className="space-y-5">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold text-sm sm:text-base mb-0.5">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 우측: AI 매칭 다이어그램 */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 relative overflow-hidden">
              <AIMatchingDiagram />
            </div>
          </motion.div>

          {/* 모바일: 간소화 버전 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:hidden"
          >
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {['Price Fit', 'Collaboration', 'Category', 'Content', 'Audience'].map((label) => (
                  <span key={label} className="px-2.5 py-1 bg-white border border-purple-200 rounded-full text-[10px] font-medium text-purple-600 shadow-sm">
                    {label}
                  </span>
                ))}
              </div>
              <div className="bg-gray-900 text-white rounded-xl px-4 py-3 inline-block">
                <p className="text-[10px] text-gray-400 mb-0.5">평균 매칭 정확도</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>96.8%</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
