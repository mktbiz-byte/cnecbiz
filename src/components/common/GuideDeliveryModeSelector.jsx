import { Sparkles, FileText, Link as LinkIcon } from 'lucide-react'

/**
 * 가이드 전달 모드 선택 컴포넌트
 * AI 가이드 생성 vs 외부 파일/URL 직접 업로드
 */
export default function GuideDeliveryModeSelector({
  mode,
  onModeChange,
  label = '촬영 가이드 전달 방식',
  className = ''
}) {
  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <label className="block mb-4">
        <span className="text-lg font-semibold">{label}</span>
      </label>

      <div className="space-y-3">
        {/* AI 가이드 옵션 */}
        <label
          className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
            mode === 'ai'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="guide_delivery_mode"
            value="ai"
            checked={mode === 'ai'}
            onChange={() => onModeChange('ai')}
            className="mt-1 w-5 h-5 text-purple-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">AI 가이드 생성</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              제품/캠페인 정보를 기반으로 AI가 크리에이터 맞춤형 촬영 가이드를 자동 생성합니다.
            </p>
          </div>
        </label>

        {/* 직접 업로드 옵션 */}
        <label
          className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
            mode === 'external'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="guide_delivery_mode"
            value="external"
            checked={mode === 'external'}
            onChange={() => onModeChange('external')}
            className="mt-1 w-5 h-5 text-blue-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">직접 업로드</span>
              <LinkIcon className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              기업에서 제작한 PDF 파일 또는 구글 슬라이드/시트/독스 URL을 직접 전달합니다.
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}
