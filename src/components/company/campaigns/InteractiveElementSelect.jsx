const INTERACTIVE_OPTIONS = [
  { value: 'poll', label: '투표', description: '이것 vs 저것 투표로 참여 유도' },
  { value: 'quiz', label: '퀴즈', description: '정답 맞추기로 제품 정보 전달' },
  { value: 'question', label: '질문', description: '팔로워 의견 수집 + DM 유도' },
  { value: 'countdown', label: '카운트다운', description: '세일/출시 기대감 조성' },
]

export default function InteractiveElementSelect({ value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">필수 인터랙티브 스티커</label>
      <div className="grid grid-cols-2 gap-2">
        {INTERACTIVE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`p-3 rounded-lg border text-left transition-all ${
              value === option.value
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm font-medium text-gray-900">{option.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
