import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

const TONE_OPTIONS = [
  { value: 'raw_honest', label: '날것의 솔직함' },
  { value: 'expert', label: '전문가 톤' },
  { value: 'humorous', label: '유머러스' },
  { value: 'emotional', label: '감성적' },
]

const REQUIRED_ELEMENTS = [
  { key: 'product_image', label: '제품 사진 1장 이상' },
  { key: 'brand_tag', label: '브랜드 태그 (@계정)' },
  { key: 'ad_disclosure', label: '광고 표시 (#광고)' },
  { key: 'profile_link', label: '프로필 링크 → 크넥샵' },
]

export default function TextContentGuideForm({ guide = {}, onChange }) {
  const update = (field, value) => {
    onChange({ ...guide, [field]: value })
  }

  const toggleRequired = (key) => {
    const current = guide.required_elements || []
    const updated = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key]
    update('required_elements', updated)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1">텍스트 콘텐츠 가이드</h3>
        <p className="text-xs text-gray-500">3단계 퍼널 구조로 포스트 방향을 안내합니다.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">Step 1 — 관심 유도 (Hook) <span className="text-red-500">*</span></label>
          <Textarea
            value={guide.hook || ''}
            onChange={(e) => update('hook', e.target.value)}
            placeholder="어떤 경험/고민으로 시작할지 안내 (예: 개인 피부 고민 경험으로 시작)"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Step 2 — 신뢰 구축 (Value) <span className="text-red-500">*</span></label>
          <Textarea
            value={guide.value || ''}
            onChange={(e) => update('value', e.target.value)}
            placeholder="제품 성분/원리/전문 정보 방향 (예: 제품 성분/원리 설명)"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Step 3 — 전환 유도 (Offer) <span className="text-red-500">*</span></label>
          <Textarea
            value={guide.offer || ''}
            onChange={(e) => update('offer', e.target.value)}
            placeholder="제품 추천 방식 + CTA 안내 (예: 사용 결과 + 크넥샵 링크)"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">톤앤매너</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('tone', opt.value)}
                className={`py-2 px-3 rounded-lg border text-sm transition-all ${
                  guide.tone === opt.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">금지 사항</label>
          <Textarea
            value={guide.restrictions || ''}
            onChange={(e) => update('restrictions', e.target.value)}
            placeholder="의료법 위반, 과장 광고, 경쟁사 비하 등"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">필수 포함 사항</label>
          <div className="space-y-2 mt-2">
            {REQUIRED_ELEMENTS.map((elem) => (
              <label key={elem.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(guide.required_elements || []).includes(elem.key)}
                  onCheckedChange={() => toggleRequired(elem.key)}
                />
                <span className="text-sm text-gray-700">{elem.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">광고 표시 문구</label>
          <input
            type="text"
            value={guide.ad_disclosure || '#광고'}
            onChange={(e) => update('ad_disclosure', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            placeholder="#광고"
          />
        </div>
      </div>
    </div>
  )
}
