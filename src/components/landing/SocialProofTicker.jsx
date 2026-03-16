import { Users, Globe, Award, Sparkles, Video } from 'lucide-react'

const items = [
  { icon: Users, text: '520+ 브랜드 활용' },
  { icon: Globe, text: '3개국 운영 (한국·미국·일본)' },
  { icon: Award, text: 'KOTRA 수출바우처 공식 수행기관' },
  { icon: Sparkles, text: 'AI 기획안 무료 제공' },
  { icon: Video, text: '2차 활용 무료' },
]

export default function SocialProofTicker() {
  // Double items for seamless infinite scroll
  const doubled = [...items, ...items]

  return (
    <section className="py-4 bg-[#121218] border-y border-white/[0.04] overflow-hidden">
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 30s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-track flex items-center gap-8 sm:gap-12 w-max">
        {doubled.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-[#A0A0B0] whitespace-nowrap">
            <item.icon className="w-4 h-4 text-[#C084FC] flex-shrink-0" />
            <span className="text-sm font-medium">{item.text}</span>
            <span className="text-[#5A5A6E] ml-4">·</span>
          </div>
        ))}
      </div>
    </section>
  )
}
