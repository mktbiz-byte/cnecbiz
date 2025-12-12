import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { X, Globe, ChevronRight, AlertTriangle } from 'lucide-react'

export default function RegionSelectModal({ isOpen, open, onClose, onSelectRegion }) {
  const navigate = useNavigate()
  // isOpen이나 open 중 하나라도 명시적으로 전달되면 그 값을 사용, 아니면 true (조건부 렌더링으로 이미 제어됨)
  const shouldShow = isOpen !== undefined ? isOpen : (open !== undefined ? open : true)
  if (!shouldShow) return null

  const handleSelectRegion = (regionId) => {
    if (onSelectRegion) {
      onSelectRegion(regionId)
    } else {
      // 기본 동작: 해당 지역의 캠페인 생성 페이지로 이동
      navigate(`/company/campaigns/create/${regionId}`)
    }
    if (onClose) onClose()
  }

  const regions = [
    {
      id: 'korea',
      name: '대한민국',
      flag: '🇰🇷',
      description: '바로 캠페인 생성 가능',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-indigo-600',
      bgColor: 'bg-blue-50',
      hoverBg: 'hover:bg-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    {
      id: 'japan',
      name: '일본',
      flag: '🇯🇵',
      description: '카카오톡 @크넥 상담 후 진행',
      gradientFrom: 'from-red-500',
      gradientTo: 'to-pink-600',
      bgColor: 'bg-red-50',
      hoverBg: 'hover:bg-red-100',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      requiresConsultation: true
    },
    {
      id: 'us',
      name: '미국',
      flag: '🇺🇸',
      description: '카카오톡 @크넥 상담 후 진행',
      gradientFrom: 'from-indigo-500',
      gradientTo: 'to-purple-600',
      bgColor: 'bg-indigo-50',
      hoverBg: 'hover:bg-indigo-100',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-700',
      requiresConsultation: true
    },
    {
      id: 'taiwan',
      name: '대만',
      flag: '🇹🇼',
      description: '서비스 준비 중',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-teal-600',
      bgColor: 'bg-gray-50',
      hoverBg: '',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-400',
      disabled: true
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">캠페인 지역 선택</h2>
              <p className="text-sm text-gray-500">캠페인을 진행할 국가를 선택해주세요</p>
            </div>
          </div>
          <button
            onClick={() => onClose && onClose()}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Region Cards */}
        <div className="p-6 space-y-3">
          {regions.map((region) => (
            <button
              key={region.id}
              disabled={region.disabled}
              onClick={() => !region.disabled && handleSelectRegion(region.id)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200
                ${region.disabled
                  ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                  : `${region.bgColor} ${region.borderColor} ${region.hoverBg} cursor-pointer hover:shadow-md hover:-translate-y-0.5`
                }
              `}
            >
              {/* Flag */}
              <div className="text-4xl flex-shrink-0">{region.flag}</div>

              {/* Content */}
              <div className="flex-1 text-left">
                <h3 className={`text-base font-semibold ${region.disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                  {region.name}
                </h3>
                <p className={`text-sm ${region.disabled ? 'text-gray-400' : region.textColor}`}>
                  {region.description}
                </p>
                {region.requiresConsultation && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-600">상담 필요</span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              {!region.disabled && (
                <ChevronRight className={`w-5 h-5 ${region.textColor} flex-shrink-0`} />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            해외 캠페인의 경우 상담 후 진행됩니다
          </p>
        </div>
      </div>
    </div>
  )
}
