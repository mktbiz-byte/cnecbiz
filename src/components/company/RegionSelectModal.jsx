import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { X, Globe, ChevronRight, ShieldCheck, ArrowLeft } from 'lucide-react'

export default function RegionSelectModal({ isOpen, open, onClose, onSelectRegion }) {
  const navigate = useNavigate()
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [agreed, setAgreed] = useState(false)

  const shouldShow = isOpen !== undefined ? isOpen : (open !== undefined ? open : true)
  if (!shouldShow) return null

  const handleSelectRegion = (regionId) => {
    setSelectedRegion(regionId)
    setAgreed(false)
  }

  const handleConfirm = () => {
    if (!agreed || !selectedRegion) return
    if (onSelectRegion) {
      onSelectRegion(selectedRegion)
    } else {
      navigate(`/company/campaigns/create/${selectedRegion}`)
    }
    if (onClose) onClose()
    setSelectedRegion(null)
    setAgreed(false)
  }

  const handleClose = () => {
    setSelectedRegion(null)
    setAgreed(false)
    if (onClose) onClose()
  }

  const handleBack = () => {
    setSelectedRegion(null)
    setAgreed(false)
  }

  const regions = [
    {
      id: 'korea',
      name: '대한민국',
      flag: '🇰🇷',
      description: '바로 캠페인 생성 가능',
      available: true
    },
    {
      id: 'japan',
      name: '일본',
      flag: '🇯🇵',
      description: '바로 캠페인 생성 가능',
      available: true
    },
    {
      id: 'us',
      name: '미국',
      flag: '🇺🇸',
      description: '바로 캠페인 생성 가능',
      available: true
    },
    {
      id: 'taiwan',
      name: '대만',
      flag: '🇹🇼',
      description: '서비스 준비 중',
      disabled: true,
      available: false
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
      >
        {!selectedRegion ? (
          <>
            {/* Step 1: Region Selection */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">캠페인 지역 선택</h2>
                  <p className="text-sm text-gray-500">캠페인을 진행할 국가를 선택해주세요</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {regions.map((region) => (
                <button
                  key={region.id}
                  disabled={region.disabled}
                  onClick={() => !region.disabled && handleSelectRegion(region.id)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                    ${region.disabled
                      ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                      : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                    }
                  `}
                >
                  <div className="text-4xl flex-shrink-0">{region.flag}</div>
                  <div className="flex-1 text-left">
                    <h3 className={`text-base font-semibold ${region.disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                      {region.name}
                    </h3>
                    <p className={`text-sm ${region.disabled ? 'text-gray-400' : 'text-gray-500'}`}>
                      {region.description}
                    </p>
                  </div>
                  {!region.disabled && (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Consent Agreement */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">캠페인 등록 동의</h2>
                  <p className="text-sm text-gray-500">캠페인 등록 전 아래 내용을 확인해주세요</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Notice */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <h3 className="text-sm font-bold text-red-800">[주의] 플랫폼 외부 개별 연락 및 부정 거래 시도 금지</h3>
                </div>
                <div className="text-xs text-red-700 leading-relaxed space-y-2 ml-7">
                  <p>
                    모든 캠페인 관련 소통 및 거래는 반드시 본 플랫폼을 통해 진행되어야 합니다.
                    이는 크리에이터와 의뢰인 모두의 안전을 보장하고 공정한 기회를 제공하기 위함입니다.
                  </p>
                  <p>
                    플랫폼을 통하지 않고 의뢰인에게 개별적으로 연락하거나, 직거래를 유도하는 행위는
                    심각한 약관 위반으로 간주됩니다. 위반 사실이 확인될 경우, 아래와 같은 조치가 취해질 수 있습니다.
                  </p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>서비스 이용 자격 영구 박탈</li>
                    <li>플랫폼 수수료 및 영업 손실에 대한 손해배상 청구</li>
                    <li>관련 법률에 따른 민·형사상 법적 조치</li>
                  </ol>
                  <p>
                    투명하고 신뢰할 수 있는 플랫폼 환경을 위해 모든 참여자의 적극적인 협조를 부탁드립니다.
                  </p>
                </div>
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  <span className="text-red-600 font-bold">[필수]</span>{' '}
                  본인은 캠페인 진행과 관련하여 플랫폼을 통하지 않고 의뢰인에게 개별적으로 연락하거나
                  부정 거래를 시도하지 않을 것을 서약합니다. 이를 위반할 경우, 서비스 이용 제한,
                  손해배상 청구를 포함한 모든 법적 조치에 이의 없이 동의합니다.
                </span>
              </label>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirm}
                disabled={!agreed}
                className={`w-full h-12 text-base font-semibold rounded-xl transition-all ${
                  agreed
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                동의하고 캠페인 생성하기
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
