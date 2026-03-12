import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Play, X, Users, Loader2 } from 'lucide-react'

export default function PackageCreatorSelector({
  creators = [],
  selectedIds = [],
  maxSelection = 20,
  onConfirm,
  disabled = false,
  loading = false,
}) {
  const [selected, setSelected] = useState(new Set(selectedIds))
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [videoModal, setVideoModal] = useState(null)

  const categories = ['전체', ...new Set(creators.map(c => c.category).filter(Boolean))]

  const filteredCreators = categoryFilter === '전체'
    ? creators
    : creators.filter(c => c.category === categoryFilter)

  const toggleCreator = (id) => {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else if (next.size < maxSelection) {
      next.add(id)
    }
    setSelected(next)
  }

  const handleConfirm = () => {
    if (selected.size === 0) {
      alert('크리에이터를 선택해주세요.')
      return
    }
    if (onConfirm) onConfirm(Array.from(selected))
  }

  return (
    <div>
      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setVideoModal(null)}>
          <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setVideoModal(null)} className="absolute -top-10 right-0 text-white hover:text-[#C084FC]">
              <X className="w-6 h-6" />
            </button>
            <div className="aspect-video rounded-2xl overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${videoModal}?autoplay=1`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">크리에이터 선택</h3>
          <p className="text-sm text-[#A0A0B0]">풀에서 {maxSelection}명을 선택해주세요</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`text-sm px-3 py-1 ${
            selected.size === maxSelection
              ? 'bg-[#C084FC]/20 text-[#C084FC]'
              : 'bg-white/10 text-[#A0A0B0]'
          }`}>
            <Users className="w-4 h-4 mr-1" />
            {selected.size}/{maxSelection} 선택됨
          </Badge>
          <Button
            onClick={handleConfirm}
            disabled={disabled || loading || selected.size === 0}
            className="bg-[#C084FC] hover:bg-[#A855F7]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            선택 확정
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm transition-all ${
              categoryFilter === cat
                ? 'bg-[#C084FC] text-white'
                : 'bg-white/5 text-[#A0A0B0] hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Creator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCreators.map((creator) => {
          const isSelected = selected.has(creator.id)
          return (
            <div
              key={creator.id}
              onClick={() => toggleCreator(creator.id)}
              className={`bg-[#1A1A2E] border rounded-2xl p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#C084FC] ring-1 ring-[#C084FC]/30'
                  : 'border-white/5 hover:border-white/20'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-semibold text-sm">
                    {creator.display_name || creator.creator_name}
                  </h4>
                  {creator.category && (
                    <Badge className="bg-[#C084FC]/20 text-[#C084FC] text-xs mt-1">
                      {creator.category}
                    </Badge>
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'bg-[#C084FC] border-[#C084FC]'
                    : 'border-white/20'
                }`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#A0A0B0] mb-3">
                {creator.avg_views && <span>조회 {creator.avg_views}</span>}
                {creator.subscriber_count && <span>구독 {creator.subscriber_count}</span>}
              </div>

              {creator.content_style && (
                <p className="text-xs text-[#636E72] mb-3">{creator.content_style}</p>
              )}

              {creator.highlight && (
                <Badge className="bg-amber-500/20 text-amber-400 text-xs mb-3">
                  {creator.highlight}
                </Badge>
              )}

              {/* Sample videos */}
              <div className="flex gap-1.5">
                {[creator.sample_video_url_1, creator.sample_video_url_2, creator.sample_video_url_3]
                  .filter(Boolean)
                  .map((url, i) => {
                    const videoId = url.match(/(?:v=|\/)([\w-]{11})/)?.[1]
                    return videoId ? (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setVideoModal(videoId) }}
                        className="relative flex-1 aspect-video rounded-lg overflow-hidden group"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    ) : null
                  })}
              </div>
            </div>
          )
        })}
      </div>

      {filteredCreators.length === 0 && (
        <div className="text-center py-12 text-[#636E72]">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>해당 카테고리에 크리에이터가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
