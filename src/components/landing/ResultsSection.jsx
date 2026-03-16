import { Zap, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ResultsSection({
  selectedRegion,
  setSelectedRegion,
  portfolioShorts,
  portfolioPage,
  setPortfolioPage,
  FLAGS,
  PortfolioSlider,
}) {
  const channels = {
    korea: { region: 'South Korea', name: 'CNEC Korea', desc: '가장 빠른 트렌드 반영, K-뷰티 특화 숏폼 솔루션. 현지 크리에이터 네트워크를 통한 폭발적인 도달률을 보장합니다.', url: 'https://www.youtube.com/@bizcnec/shorts' },
    japan: { region: 'Japan', name: 'CNEC Japan', desc: '일본 현지 크리에이터와 함께 만드는 J-뷰티 숏폼 마케팅. 일본 시장의 섬세한 뷰티 트렌드를 정확히 포착합니다.', url: 'https://www.youtube.com/@CNEC_JP/shorts' },
    usa: { region: 'United States', name: 'CNEC USA', desc: '북미 시장을 타겟으로 한 글로벌 뷰티 콘텐츠. 다양한 인종과 피부 타입에 맞는 진정성 있는 리뷰를 제공합니다.', url: 'https://www.youtube.com/@CNEC_USA/shorts' }
  }

  const ch = channels[selectedRegion]
  const shorts = (portfolioShorts[selectedRegion] || []).slice(0, 12)
  const VISIBLE_COUNT_DESKTOP = 4
  const VISIBLE_COUNT_MOBILE = 2
  const totalPages = Math.max(1, Math.ceil(shorts.length / VISIBLE_COUNT_DESKTOP))
  const totalPagesMobile = Math.max(1, Math.ceil(shorts.length / VISIBLE_COUNT_MOBILE))

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]" id="showcase">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <p className="text-[#C084FC] text-xs font-medium tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
              <Zap className="w-3.5 h-3.5" />
              RESULTS & PORTFOLIO
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white" style={{ fontFamily: "'Outfit', 'Pretendard', sans-serif" }}>
              PORTFOLIO <span className="italic font-light opacity-80">Series.</span>
            </h2>
          </div>
          {/* Region tabs */}
          <div className="flex rounded-full p-1">
            {[
              { key: 'korea', label: 'KR' },
              { key: 'japan', label: 'JP' },
              { key: 'usa', label: 'US' }
            ].map(tab => {
              const FlagIcon = FLAGS[tab.key]
              return (
                <button
                  key={tab.key}
                  onClick={() => { setSelectedRegion(tab.key); setPortfolioPage(0) }}
                  className={`px-5 sm:px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedRegion === tab.key
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-[#5A5A6E] hover:text-white'
                  }`}
                >
                  <FlagIcon className="w-5 h-3.5 rounded-[2px] overflow-hidden shadow-sm" /> {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_2fr] gap-5 lg:gap-6">
          {/* Left: Info card */}
          <div className="bg-[#121218] border border-white/[0.06] rounded-[20px] p-6 sm:p-8 flex flex-col justify-between min-h-[320px] lg:min-h-[400px]">
            <div>
              <p className="text-[#5A5A6E] text-[10px] font-medium tracking-[0.2em] uppercase mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Selected Region</p>
              <div className="flex items-center gap-2.5 mb-6">
                {(() => { const FlagIcon = FLAGS[selectedRegion]; return <FlagIcon className="w-7 h-5 rounded-[2px] shadow-sm" /> })()}
                <p className="text-white text-base font-medium">{ch.region}</p>
              </div>
              <h3 className="text-white font-black text-3xl sm:text-4xl mb-4 italic" style={{ fontFamily: "'Outfit', sans-serif" }}>{ch.name}</h3>
              <p className="text-[#A0A0B0] text-sm leading-relaxed">{ch.desc}</p>
            </div>
            <div className="mt-6 pt-5 border-t border-white/[0.08]">
              <a
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center group-hover:border-white/15 transition-colors">
                  <Play className="w-4 h-4 text-white ml-0.5" />
                </div>
                <span className="text-[#A0A0B0] text-xs font-medium tracking-wider uppercase group-hover:text-white transition-colors" style={{ fontFamily: "'Outfit', sans-serif" }}>Watch All Works</span>
                {shorts.length > 0 && (
                  <div className="ml-auto flex items-center -space-x-2">
                    {shorts.slice(0, 3).map((s) => (
                      <div key={s.video_id} className="w-7 h-7 rounded-full border-2 border-gray-900 overflow-hidden">
                        <img src={s.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {shorts.length > 3 && (
                      <div className="w-7 h-7 rounded-full border-2 border-[#121218] bg-[#1A1A24] flex items-center justify-center">
                        <span className="text-gray-400 text-[9px] font-medium">+{shorts.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}
              </a>
              {/* Slider controls */}
              {shorts.length > VISIBLE_COUNT_DESKTOP && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPortfolioPage(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          portfolioPage === i ? 'w-6 bg-white' : 'w-1.5 bg-[#24243A] hover:bg-[#5A5A6E]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPortfolioPage(p => Math.max(0, p - 1))}
                      disabled={portfolioPage === 0}
                      className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center text-[#A0A0B0] hover:text-white hover:border-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPortfolioPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={portfolioPage === totalPages - 1}
                      className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center text-[#A0A0B0] hover:text-white hover:border-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Video slider */}
          <div className="relative overflow-hidden">
            {shorts.length > 0 ? (
              <PortfolioSlider
                shorts={shorts}
                page={portfolioPage}
                setPage={setPortfolioPage}
                totalPages={totalPages}
                totalPagesMobile={totalPagesMobile}
                visibleDesktop={VISIBLE_COUNT_DESKTOP}
                visibleMobile={VISIBLE_COUNT_MOBILE}
                selectedRegion={selectedRegion}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#121218] animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-gray-900" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
