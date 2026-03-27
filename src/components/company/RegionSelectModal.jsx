import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { X, Globe, ChevronRight, ArrowLeft } from 'lucide-react'

export default function RegionSelectModal({ isOpen, open, onClose, onSelectRegion }) {
  const navigate = useNavigate()
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [consentRefundPolicy, setConsentRefundPolicy] = useState(false)
  const [consentNoDirectContact, setConsentNoDirectContact] = useState(false)

  const shouldShow = isOpen !== undefined ? isOpen : (open !== undefined ? open : true)
  if (!shouldShow) return null

  const handleSelectRegion = (regionId) => {
    setSelectedRegion(regionId)
    setConsentRefundPolicy(false)
    setConsentNoDirectContact(false)
  }

  const handleConfirm = () => {
    if (!consentRefundPolicy || !consentNoDirectContact || !selectedRegion) return
    if (onSelectRegion) {
      onSelectRegion(selectedRegion)
    } else {
      navigate(`/company/campaigns/create/${selectedRegion}`)
    }
    if (onClose) onClose()
    setSelectedRegion(null)
    setConsentRefundPolicy(false)
    setConsentNoDirectContact(false)
  }

  const handleClose = () => {
    setSelectedRegion(null)
    setConsentRefundPolicy(false)
    setConsentNoDirectContact(false)
    if (onClose) onClose()
  }

  const handleBack = () => {
    setSelectedRegion(null)
    setConsentRefundPolicy(false)
    setConsentNoDirectContact(false)
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
              {/* 환불 규정 */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">1</span>
                  환불 규정
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex-shrink-0 w-12 h-8 bg-green-100 rounded flex items-center justify-center">
                        <span className="text-green-700 font-bold text-xs">100%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">캠페인 활성화 전</p>
                        <p className="text-xs text-gray-500">캠페인 활성화 이전 → 전액 환불</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex-shrink-0 w-12 h-8 bg-amber-100 rounded flex items-center justify-center">
                        <span className="text-amber-700 font-bold text-xs">50%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">캠페인 활성화 후</p>
                        <p className="text-xs text-gray-500">캠페인 활성화 이후 ~ 콘텐츠 제작 중 → 50% 환불 (실비 공제)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex-shrink-0 w-12 h-8 bg-red-100 rounded flex items-center justify-center">
                        <span className="text-red-700 font-bold text-xs">0%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">콘텐츠 제출 후</p>
                        <p className="text-xs text-gray-500">크리에이터가 콘텐츠를 제출한 이후 → 환불 불가</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">※ "캠페인 활성화"의 기준: 크리에이터 모집이 시작되는 시점</p>
                  <p className="text-xs text-gray-500">※ 부분 환불 시 이미 집행된 크리에이터 보상금, 제품 배송비 등 실비용은 공제 후 환불됩니다.</p>
                </div>
              </div>

              {/* 개별 연락 금지 */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">2</span>
                  크리에이터 개별 연락 금지
                </h3>
                <div className="bg-red-50 rounded-xl p-4 text-sm text-gray-700 space-y-2 border border-red-100">
                  <p>플랫폼을 통해 매칭된 크리에이터에게 회사의 사전 서면 동의 없이 <strong className="text-red-700">직접 연락(DM, 이메일, 전화, SNS 댓글 등)하여 별도 거래를 제안하거나 유인하는 행위</strong>를 해서는 안 됩니다.</p>
                  <p>크리에이터와의 모든 커뮤니케이션은 크넥(CNEC) 플랫폼을 통해 이루어져야 합니다.</p>
                  <p>본 조항은 <strong>캠페인 종료 후 6개월간</strong> 유효합니다.</p>
                  <p className="text-red-600 font-semibold">⚠ 위반 시 해당 캠페인 결제 금액의 200%에 해당하는 위약금이 청구될 수 있습니다.</p>
                </div>
              </div>

              {/* 콘텐츠 2차 활용 */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">3</span>
                  콘텐츠 저작권 및 2차 활용
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                  <p>크리에이터가 제작한 콘텐츠의 1차 저작권은 크리에이터에게 귀속됩니다.</p>
                  <p>캠페인 계약 범위를 초과하는 2차 활용은 별도 동의가 필요합니다.</p>
                  <p>2차 활용 기간은 크리에이터의 <strong>SNS 업로드일로부터 1년</strong>입니다.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mt-2">
                  <p className="font-semibold flex items-center gap-1.5 mb-1">⚠ 2차 활용 기간 만료 후 Meta 광고 사용 불가</p>
                  <p>2차 활용 기간(SNS 업로드일로부터 1년)이 만료된 후에는 크리에이터 콘텐츠를 <strong>Meta(Facebook/Instagram) 광고 소재로 사용할 수 없습니다.</strong> 기간 만료 후 Meta 광고에 활용하려면 별도의 2차 활용 계약이 필요합니다.</p>
                </div>
              </div>

              {/* 체크박스 */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentRefundPolicy}
                    onChange={(e) => setConsentRefundPolicy(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    <strong className="text-gray-900">환불 규정</strong>에 대해 충분히 이해하였으며, 이에 동의합니다.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentNoDirectContact}
                    onChange={(e) => setConsentNoDirectContact(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    <strong className="text-gray-900">크리에이터 개별 연락 금지 조항</strong>에 대해 충분히 이해하였으며, 이에 동의합니다.
                  </span>
                </label>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirm}
                disabled={!consentRefundPolicy || !consentNoDirectContact}
                className={`w-full h-12 text-base font-semibold rounded-xl transition-all ${
                  consentRefundPolicy && consentNoDirectContact
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
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
