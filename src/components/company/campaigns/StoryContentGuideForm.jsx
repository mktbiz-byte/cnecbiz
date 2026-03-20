import { Textarea } from '@/components/ui/textarea'
import InteractiveElementSelect from './InteractiveElementSelect'

const TONE_OPTIONS = [
  { value: 'raw_honest', label: '날것의 솔직함' },
  { value: 'daily_real', label: '일상에서 리얼하게' },
  { value: 'expert', label: '전문가 톤' },
  { value: 'emotional', label: '감성적' },
]

export default function StoryContentGuideForm({ guide = {}, onChange }) {
  const update = (field, value) => {
    onChange({ ...guide, [field]: value })
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1">슬라이드별 콘텐츠 가이드</h3>
        <p className="text-xs text-gray-500">10슬라이드 공식으로 스토리 구성을 안내합니다.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">
            슬라이드 1 — Hook (결과 먼저!) <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={guide.slide_1_hook || ''}
            onChange={(e) => update('slide_1_hook', e.target.value)}
            placeholder="비포앤애프터 결과 먼저 보여주기. '안녕하세요' 인사 금지. 숫자가 있으면 최고"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">
            슬라이드 2~3 — 제품 정보 <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={guide.slide_2_3_info || ''}
            onChange={(e) => update('slide_2_3_info', e.target.value)}
            placeholder="제품 클로즈업 + 핵심 성분 설명"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">
            슬라이드 4~6 — 사용 과정 <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={guide.slide_4_6_usage || ''}
            onChange={(e) => update('slide_4_6_usage', e.target.value)}
            placeholder="사용 과정 리얼 영상. 단점도 솔직하게."
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">
            슬라이드 7~8 — 인터랙티브
          </label>
          <Textarea
            value={guide.slide_7_8_interactive || ''}
            onChange={(e) => update('slide_7_8_interactive', e.target.value)}
            placeholder="인터랙티브 스티커 활용 안내 (투표/퀴즈 등)"
            rows={2}
            className="mt-1"
          />
          <div className="mt-2">
            <InteractiveElementSelect
              value={guide.interactive_type || ''}
              onChange={(val) => update('interactive_type', val)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">
            슬라이드 9~10 — CTA <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={guide.slide_9_10_cta || ''}
            onChange={(e) => update('slide_9_10_cta', e.target.value)}
            placeholder="링크 스티커 → 크넥샵. 할인 코드 배치"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">권장 슬라이드 수</label>
          <input
            type="number"
            value={guide.recommended_slides || 8}
            onChange={(e) => update('recommended_slides', parseInt(e.target.value) || 8)}
            min={6}
            max={13}
            className="mt-1 w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <span className="text-xs text-gray-500 ml-2">6~13장 권장</span>
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
                    ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium'
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
            placeholder="완치/치료 의료법 위반, 과도한 보정/필터, '안녕하세요' 인사 시작"
            rows={2}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}
