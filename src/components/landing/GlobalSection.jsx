import { Globe, Languages } from 'lucide-react'
import { motion } from 'framer-motion'

const countries = [
  {
    flag: '/flags/kr.png',
    country: '한국',
    region: 'South Korea',
    creators: '1,200+',
    stat: 'K-뷰티 특화',
    desc: '1,200+ 뷰티 크리에이터 네트워크. 인스타그램, 틱톡, 유튜브 숏폼 전문.',
  },
  {
    flag: '/flags/jp.png',
    country: '일본',
    region: 'Japan',
    creators: '800+',
    stat: 'J-뷰티 현지화',
    desc: '일본 현지 크리에이터와 함께하는 섬세한 뷰티 마케팅. 자연스러운 일본어 콘텐츠.',
  },
  {
    flag: '/flags/us.png',
    country: '미국',
    region: 'United States',
    creators: '700+',
    stat: '다양성 · 글로벌',
    desc: '북미 시장 타겟 글로벌 뷰티 콘텐츠. 다양한 피부톤과 피부 타입 커버.',
  },
]

export default function GlobalSection({ navigate }) {
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
            GLOBAL NETWORK
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            <span className="text-purple-600">3개국</span> 크리에이터를 한 곳에서
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">
            한국어로 캠페인을 만들면 AI가 자동 번역하여 각국 크리에이터에게 발송합니다.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {countries.map((country, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <img src={country.flag} alt={country.country} className="w-8 h-6 object-contain rounded-[3px] shadow-sm" />
                <div>
                  <h3 className="text-gray-900 font-bold text-lg">{country.country}</h3>
                  <p className="text-gray-400 text-xs">{country.region}</p>
                </div>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed mb-5">{country.desc}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-purple-600 text-xl font-bold">{country.creators}</p>
                  <p className="text-gray-400 text-xs">크리에이터</p>
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                  <Languages className="w-3 h-3" />
                  {country.stat}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8 sm:mt-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-sm">
            <Globe className="w-4 h-4 text-purple-600" />
            총 <span className="text-gray-900 font-semibold">2,700+</span> 검증된 뷰티 크리에이터
          </div>
        </motion.div>
      </div>
    </section>
  )
}
