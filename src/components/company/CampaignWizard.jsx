import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Check, ChevronRight, ChevronLeft, Save, Clock, Package, Calendar, FileText, CheckCircle } from 'lucide-react'

// 단계 정의
const STEPS = [
  { id: 1, name: '캠페인 선택', icon: Package },
  { id: 2, name: '상품 정보', icon: FileText },
  { id: 3, name: '스케줄', icon: Calendar },
  { id: 4, name: '가이드', icon: FileText },
  { id: 5, name: '확인', icon: CheckCircle },
]

// 캠페인 타입 정의
const CAMPAIGN_TYPES = [
  {
    id: 'planned',
    name: '기획형 캠페인',
    price: 200000,
    description: '합리적인 비용으로 전문적인 숏폼 기획을 시작하고 싶은 브랜드',
    features: [
      { text: '브랜드 맞춤 시나리오 기획', included: true },
      { text: '촬영 가이드라인 제공', included: true },
      { text: 'SNS 업로드 URL 1개', included: true },
      { text: '2차 활용 라이선스', included: false },
      { text: '심층 성과 분석 리포트', included: false },
    ]
  },
  {
    id: 'oliveyoung',
    name: '올영세일 패키지',
    price: 400000,
    badge: 'MOST POPULAR',
    description: '세일 기간 집중 트래픽과 구매 전환을 유도하는 실속형 패키지',
    features: [
      { text: '티징 + 본편 (2단계 구성)', included: true },
      { text: '구매 전환 유도형 기획', included: true },
      { text: 'SNS 업로드 URL 3개', included: true },
      { text: '원본 영상 파일 제공', included: true },
      { text: '기본 성과 리포트', included: true },
    ]
  },
  {
    id: '4week_challenge',
    name: '4주 챌린지',
    price: 600000,
    description: '진정성 있는 리뷰와 장기적인 바이럴 효과를 위한 프리미엄 플랜',
    features: [
      { text: '주차별 미션 (총 4편 제작)', included: true },
      { text: 'Before & After 변화 기록', included: true },
      { text: 'SNS 업로드 URL 무제한', included: true },
      { text: '2차 활용 라이선스 포함', included: true },
      { text: '심층 성과 분석 리포트', included: true },
    ]
  }
]

// 패키지 옵션 정의
const PACKAGE_OPTIONS = [
  { value: 'basic', label: '베이직', price: 200000, description: '팔로워 1만~3만명' },
  { value: 'standard', label: '스탠다드', price: 300000, description: '팔로워 3만~10만명', badge: 'BEST', extra: '기획형 숏폼' },
  { value: 'premium', label: '프리미엄', price: 400000, description: '팔로워 10만~30만명', extra: '구매 전환 유도' },
  { value: 'professional', label: '프로페셔널', price: 600000, description: '팔로워 30만~50만명', extra: '팔로워 30만+' },
  { value: 'enterprise', label: '엔터프라이즈', price: 1000000, description: '팔로워 50만명 이상', extra: 'TVC급 영상미' },
]

// 필수 미션 옵션
const MISSION_OPTIONS = [
  { id: 'before_after', label: 'Before & After 보여주기' },
  { id: 'closeup', label: '제품 사용 장면 클로즈업' },
  { id: 'texture', label: '제품 텍스처 보여주기' },
  { id: 'store_visit', label: '올리브영 매장 방문 인증' },
  { id: '7day_review', label: '7일 사용 후기 기록' },
  { id: 'price_info', label: '가격/혜택 정보 언급' },
  { id: 'purchase_link', label: '구매 링크 유도' },
]

// 금지 사항 옵션
const PROHIBITION_OPTIONS = [
  { id: 'competitor', label: '경쟁사 제품 언급 금지' },
  { id: 'exaggeration', label: '과장된 효능/효과 표현 금지' },
  { id: 'medicine', label: '의약품 오인 표현 금지' },
  { id: 'price_outside_sale', label: '세일 기간 외 가격 언급 금지' },
  { id: 'negative', label: '부정적 표현 사용 금지' },
]

// 채널 옵션
const CHANNEL_OPTIONS = [
  { value: 'youtube', label: '유튜브', emoji: '🎬' },
  { value: 'instagram', label: '인스타그램', emoji: '📸' },
  { value: 'tiktok', label: '틱톡', emoji: '🎵' },
]

export default function CampaignWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  // 현재 단계
  const [currentStep, setCurrentStep] = useState(1)

  // 자동저장 상태
  const [lastSaved, setLastSaved] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // 폼 데이터
  const [formData, setFormData] = useState({
    // Step 1: 캠페인 선택
    campaign_type: 'planned',
    package_type: 'standard',
    creator_count: 10,

    // Step 2: 상품 정보
    product_url: '',
    brand_name: '',
    product_name: '',
    product_price: '',
    thumbnail_url: '',
    product_description: '',
    participation_conditions: ['product_sponsored'],
    sponsored_content: '',
    channels: ['instagram'],

    // Step 3: 스케줄
    shipping_date: '',
    recruitment_deadline: '',
    shooting_deadline: '',
    upload_date: '',

    // Step 4: 가이드
    hooking_point: '',
    core_message: '',
    required_missions: ['before_after', 'closeup'],
    custom_missions: [],
    prohibitions: ['competitor', 'exaggeration', 'medicine'],
    custom_prohibitions: [],
    required_hashtags: [],
    video_duration: '30s',
    video_tempo: 'normal',
    tone_and_manner: 'bright',
    product_keywords: [],
    reference_urls: [],
    additional_requests: '',
  })

  // 계산된 값들
  const selectedPackage = PACKAGE_OPTIONS.find(p => p.value === formData.package_type)
  const supplyPrice = selectedPackage ? selectedPackage.price * formData.creator_count : 0
  const vat = Math.round(supplyPrice * 0.1)
  const totalPrice = supplyPrice + vat

  // AI 예상 지원자 수
  const getEstimatedApplicants = () => {
    switch (formData.package_type) {
      case 'basic': return '30~50명'
      case 'standard': return '15~25명'
      case 'premium': return '10~15명'
      case 'professional': return '5~10명'
      case 'enterprise': return '3~5명'
      default: return '15~20명'
    }
  }

  // localStorage에서 임시저장 데이터 불러오기
  useEffect(() => {
    const savedDraft = localStorage.getItem('campaign_draft')
    if (savedDraft && !editId) {
      try {
        const parsed = JSON.parse(savedDraft)
        setFormData(prev => ({ ...prev, ...parsed.data }))
        setCurrentStep(parsed.step || 1)
        setLastSaved(new Date(parsed.savedAt))
      } catch (e) {
        console.error('Failed to load draft:', e)
      }
    }
  }, [editId])

  // 자동 저장 (2초 디바운스)
  const autoSave = useCallback(() => {
    setIsSaving(true)
    const draft = {
      data: formData,
      step: currentStep,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem('campaign_draft', JSON.stringify(draft))
    setTimeout(() => {
      setLastSaved(new Date())
      setIsSaving(false)
    }, 500)
  }, [formData, currentStep])

  useEffect(() => {
    const timer = setTimeout(autoSave, 2000)
    return () => clearTimeout(timer)
  }, [formData, autoSave])

  // 스케줄 자동 추천
  const autoCalculateSchedule = (shippingDate) => {
    if (!shippingDate) return

    const shipping = new Date(shippingDate)
    const campaignType = formData.campaign_type

    // 캠페인 타입별 기본 간격
    let recruitmentDays = 7
    let shootingDays = 14
    let uploadDays = 7

    if (campaignType === 'oliveyoung') {
      recruitmentDays = 7
      shootingDays = 7
      uploadDays = 3
    } else if (campaignType === '4week_challenge') {
      recruitmentDays = 7
      shootingDays = 7
      uploadDays = 28
    }

    const recruitment = new Date(shipping)
    recruitment.setDate(recruitment.getDate() + recruitmentDays)

    const shooting = new Date(recruitment)
    shooting.setDate(shooting.getDate() + shootingDays)

    const upload = new Date(shooting)
    upload.setDate(upload.getDate() + uploadDays)

    setFormData(prev => ({
      ...prev,
      shipping_date: shippingDate,
      recruitment_deadline: recruitment.toISOString().split('T')[0],
      shooting_deadline: shooting.toISOString().split('T')[0],
      upload_date: upload.toISOString().split('T')[0],
    }))
  }

  // 단계 이동
  const goToStep = (step) => {
    if (step >= 1 && step <= 5) {
      setCurrentStep(step)
      window.scrollTo(0, 0)
    }
  }

  const nextStep = () => goToStep(currentStep + 1)
  const prevStep = () => goToStep(currentStep - 1)

  // 폼 제출
  const handleSubmit = async () => {
    // TODO: Supabase에 캠페인 저장
    console.log('Submitting campaign:', formData)
    localStorage.removeItem('campaign_draft')
    alert('캠페인이 등록되었습니다!')
    navigate('/company/campaigns')
  }

  // 프로그레스 바 렌더링
  const renderProgressBar = () => (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => step.id <= currentStep && goToStep(step.id)}
                disabled={step.id > currentStep}
                className={`flex items-center gap-2 ${step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step.id < currentStep
                    ? 'bg-indigo-600 text-white'
                    : step.id === currentStep
                    ? 'bg-white border-2 border-indigo-600 text-indigo-600'
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}>
                  {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${
                  step.id <= currentStep ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.name}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                  step.id < currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Step 1: 캠페인 선택
  const renderStep1 = () => (
    <div className="space-y-8">
      {/* 타이틀 */}
      <div className="text-center">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">가장 합리적인 캠페인을 선택하세요</h1>
        <p className="text-gray-500">복잡한 옵션은 빼고, 꼭 필요한 기능만 담았습니다.</p>
      </div>

      {/* 캠페인 타입 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {CAMPAIGN_TYPES.map((type) => (
          <div
            key={type.id}
            onClick={() => setFormData(prev => ({ ...prev, campaign_type: type.id }))}
            className={`relative bg-white rounded-xl border-2 p-5 lg:p-6 cursor-pointer transition-all ${
              formData.campaign_type === type.id
                ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-100'
                : type.badge ? 'border-indigo-600 hover:shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
          >
            {type.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {type.badge}
                </span>
              </div>
            )}

            <div className={`mb-4 ${type.badge ? 'pt-2' : ''}`}>
              <h3 className={`text-base font-bold mb-1 ${type.badge ? 'text-indigo-600' : 'text-gray-900'}`}>
                {type.name}
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl lg:text-3xl font-bold text-gray-900">
                  ₩{type.price.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm">/건</span>
              </div>
              <p className="text-gray-500 text-xs mt-2">{type.description}</p>
            </div>

            <button
              type="button"
              className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all mb-4 ${
                formData.campaign_type === type.id
                  ? 'bg-indigo-600 text-white'
                  : type.badge ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              선택하기
            </button>

            <ul className="space-y-2 text-sm">
              {type.features.map((feature, idx) => (
                <li key={idx} className={`flex items-center gap-2 ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                  {feature.included ? (
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  )}
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 기획형 캠페인 옵션 */}
      {formData.campaign_type === 'planned' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 옵션 선택 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">캠페인 옵션 선택</h2>
            <p className="text-gray-500 text-sm mb-6">예산에 따라 지원하는 크리에이터의 퀄리티와 지원율이 달라집니다.</p>

            {/* 패키지 선택 */}
            <div className="mb-6">
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">크리에이터 등급 (단가)</Label>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {PACKAGE_OPTIONS.map((pkg) => (
                  <div
                    key={pkg.value}
                    onClick={() => setFormData(prev => ({ ...prev, package_type: pkg.value }))}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.package_type === pkg.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-2 right-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                        {pkg.badge}
                      </span>
                    )}
                    <div className={`text-sm font-medium mb-1 ${formData.package_type === pkg.value ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {pkg.label}
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {pkg.price.toLocaleString()}원
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        {pkg.description}
                      </div>
                      {pkg.extra && (
                        <div className="flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          {pkg.extra}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI 예상 지원자 배너 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-indigo-600">AI 예측:</span>{' '}
                  현재 설정하신 단가로는 평균{' '}
                  <span className="font-bold text-indigo-700">{getEstimatedApplicants()}</span>
                  의 크리에이터가 지원할 것으로 예상됩니다.
                </p>
                <div className="mt-2 bg-indigo-200 rounded-full h-2 w-full">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{
                      width: formData.package_type === 'basic' ? '90%'
                        : formData.package_type === 'standard' ? '70%'
                        : formData.package_type === 'premium' ? '50%'
                        : formData.package_type === 'professional' ? '30%'
                        : '20%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 모집 인원 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-gray-700">모집 인원 (명)</Label>
                <span className="text-indigo-600 font-bold text-lg">{formData.creator_count}명</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.creator_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, creator_count: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex items-center border rounded-lg bg-white">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, creator_count: Math.max(1, prev.creator_count - 1) }))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
                  >-</button>
                  <input
                    type="number"
                    value={formData.creator_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, creator_count: parseInt(e.target.value) || 1 }))}
                    className="w-14 text-center border-x py-2"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, creator_count: prev.creator_count + 1 }))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 예상 견적서 */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-xl p-6 text-white sticky top-24">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> 예상 견적서
              </h3>

              {/* AI 지원율 카드 */}
              <div className="bg-white/10 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-indigo-300">AI 지원율 예측</span>
                </div>
                <p className="text-sm text-gray-300">
                  선택하신 단가로는<br/>
                  평균 <span className="text-white font-bold">{getEstimatedApplicants()}+</span>의 크리에이터가<br/>
                  지원할 것으로 예상됩니다.
                </p>
              </div>

              {/* 가격 내역 */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">단가 ({selectedPackage?.label})</span>
                  <span>{selectedPackage?.price.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">인원</span>
                  <span>x {formData.creator_count}명</span>
                </div>
                <div className="border-t border-gray-700 my-3"></div>
                <div className="flex justify-between">
                  <span className="text-gray-400">공급가액</span>
                  <span>{supplyPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">부가세 (10%)</span>
                  <span>{vat.toLocaleString()}원</span>
                </div>
                <div className="border-t border-gray-700 my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">총 결제 금액</span>
                  <span className="text-2xl font-bold text-white">{totalPrice.toLocaleString()}<span className="text-sm font-normal ml-1">원</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Step 2: 상품 정보
  const renderStep2 = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">상품 정보 입력</h1>
        <p className="text-gray-500">URL만 입력하면 상품 정보를 자동으로 가져옵니다</p>
      </div>

      {/* URL 입력 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
          🔗 상품 URL
        </Label>
        <div className="flex gap-2">
          <Input
            value={formData.product_url}
            onChange={(e) => setFormData(prev => ({ ...prev, product_url: e.target.value }))}
            placeholder="https://www.oliveyoung.co.kr/store/goods/..."
            className="flex-1"
          />
          <Button variant="outline" className="whitespace-nowrap">
            🔍 정보 가져오기
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 올리브영, 쿠팡, 네이버 스마트스토어, 자사몰 URL 지원
        </p>
      </div>

      {/* 브랜드/상품 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">브랜드명 *</Label>
            <Input
              value={formData.brand_name}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
              placeholder="예: 글로우랩"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">제품 가격</Label>
            <Input
              type="number"
              value={formData.product_price}
              onChange={(e) => setFormData(prev => ({ ...prev, product_price: e.target.value }))}
              placeholder="32000"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">제품명 *</Label>
          <Input
            value={formData.product_name}
            onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
            placeholder="예: 수분폭탄 히알루론 크림 50ml"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">제품 설명</Label>
          <Textarea
            value={formData.product_description}
            onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
            placeholder="상품의 특징, 성분, 사용법 등을 자세히 입력하세요"
            rows={4}
          />
        </div>
      </div>

      {/* 참여 조건 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">참여 조건 *</Label>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'product_sponsored', label: '제품 협찬' },
              { value: 'payment', label: '원고료 지급' },
              { value: 'purchase_required', label: '제품 구매 필요' },
            ].map(option => (
              <label
                key={option.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.participation_conditions.includes(option.value)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.participation_conditions.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, participation_conditions: [...prev.participation_conditions, option.value] }))
                    } else {
                      setFormData(prev => ({ ...prev, participation_conditions: prev.participation_conditions.filter(v => v !== option.value) }))
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">협찬 내용</Label>
          <Input
            value={formData.sponsored_content}
            onChange={(e) => setFormData(prev => ({ ...prev, sponsored_content: e.target.value }))}
            placeholder="예: 수분폭탄 히알루론 크림 본품 1개 (32,000원 상당)"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">모집 채널 *</Label>
          <div className="flex flex-wrap gap-3">
            {CHANNEL_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.channels.includes(option.value)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.channels.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, channels: [...prev.channels, option.value] }))
                    } else {
                      setFormData(prev => ({ ...prev, channels: prev.channels.filter(v => v !== option.value) }))
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm font-medium">{option.emoji} {option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Step 3: 스케줄 설정
  const renderStep3 = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">스케줄 설정</h1>
        <p className="text-gray-500">제품 발송일만 입력하면 나머지 일정을 자동으로 추천해드립니다</p>
      </div>

      {/* 발송일 & 모집 마감일 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">📦 제품 발송 예정일 *</Label>
          <Input
            type="date"
            value={formData.shipping_date}
            onChange={(e) => autoCalculateSchedule(e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-gray-500 mt-1">💡 크리에이터에게 제품이 도착하는 예상 날짜</p>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">📋 모집 마감일 *</Label>
          <Input
            type="date"
            value={formData.recruitment_deadline}
            onChange={(e) => setFormData(prev => ({ ...prev, recruitment_deadline: e.target.value }))}
            className="max-w-xs"
          />
          {formData.shipping_date && (
            <p className="text-xs text-indigo-600 mt-1">💡 발송일 기준 +7일로 자동 설정됨</p>
          )}
        </div>
      </div>

      {/* 자동 추천 일정 */}
      {formData.shipping_date && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>✨</span> AI가 추천하는 일정
            </h3>
            <Button variant="ghost" size="sm" className="text-indigo-600">
              모두 수정
            </Button>
          </div>

          {/* 타임라인 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>{formData.shipping_date?.slice(5).replace('-', '/')}</span>
              <span>{formData.recruitment_deadline?.slice(5).replace('-', '/')}</span>
              <span>{formData.shooting_deadline?.slice(5).replace('-', '/')}</span>
              <span>{formData.upload_date?.slice(5).replace('-', '/')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <div className="flex-1 h-1 bg-indigo-600"></div>
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <div className="flex-1 h-1 bg-indigo-600"></div>
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <div className="flex-1 h-1 bg-indigo-600"></div>
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>발송일</span>
              <span>모집마감</span>
              <span>촬영마감</span>
              <span>업로드</span>
            </div>
          </div>

          {/* 세부 날짜 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">🎬 촬영 마감일</Label>
              <Input
                type="date"
                value={formData.shooting_deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, shooting_deadline: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">모집마감 +14일</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">📱 SNS 업로드일</Label>
              <Input
                type="date"
                value={formData.upload_date}
                onChange={(e) => setFormData(prev => ({ ...prev, upload_date: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">촬영마감 +7일</p>
            </div>
          </div>

          {/* 일정 체크 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">⚠️ 일정 체크</h4>
            <div className="space-y-1 text-sm text-green-700">
              <p>✅ 제품 발송 → 모집 마감: 7일 (충분)</p>
              <p>✅ 모집 마감 → 촬영 마감: 14일 (충분)</p>
              <p>✅ 촬영 마감 → 업로드: 7일 (충분)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Step 4: 가이드 작성
  const renderStep4 = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">크리에이터 가이드 작성</h1>
          <p className="text-gray-500">크리에이터가 영상 제작 시 참고할 가이드입니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            🤖 AI 가이드 생성
          </Button>
          <Button variant="outline" size="sm">
            📂 템플릿
          </Button>
        </div>
      </div>

      {/* 필수 입력 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold">
          <span>🎯</span> 필수 입력
        </div>

        {/* 1초 후킹 포인트 */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            ⚡ 1초 후킹 포인트 *
          </Label>
          <p className="text-xs text-gray-500 mb-2">영상 시작 1초 안에 시청자를 사로잡을 핵심 포인트</p>
          <Input
            value={formData.hooking_point}
            onChange={(e) => setFormData(prev => ({ ...prev, hooking_point: e.target.value.slice(0, 50) }))}
            placeholder="이거 바르고 피부결 미쳤어요"
            maxLength={50}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{formData.hooking_point.length}/50자</p>
          <p className="text-xs text-gray-500 mt-2">
            💡 예시: "3일만에 트러블 잡은 비결", "7일 후 피부가 달라졌다"
          </p>
        </div>

        {/* 핵심 메시지 */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            💬 핵심 메시지 *
          </Label>
          <p className="text-xs text-gray-500 mb-2">이 영상을 통해 전달하고 싶은 핵심 메시지 한 줄</p>
          <Textarea
            value={formData.core_message}
            onChange={(e) => setFormData(prev => ({ ...prev, core_message: e.target.value.slice(0, 100) }))}
            placeholder="수분 부족한 겨울철, 히알루론산 7중 콤플렉스로 속부터 차오르는 깊은 보습을 경험하세요"
            rows={2}
            maxLength={100}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{formData.core_message.length}/100자</p>
        </div>

        {/* 필수 미션 */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            🎬 필수 미션 *
          </Label>
          <p className="text-xs text-gray-500 mb-3">크리에이터가 반드시 수행해야 할 미션을 선택하세요</p>
          <div className="space-y-2">
            {MISSION_OPTIONS.map(option => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.required_missions.includes(option.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.required_missions.includes(option.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, required_missions: [...prev.required_missions, option.id] }))
                    } else {
                      setFormData(prev => ({ ...prev, required_missions: prev.required_missions.filter(v => v !== option.id) }))
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 금지 사항 */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            🚫 금지 사항 *
          </Label>
          <p className="text-xs text-gray-500 mb-3">크리에이터가 절대 하면 안 되는 것들</p>
          <div className="space-y-2">
            {PROHIBITION_OPTIONS.map(option => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.prohibitions.includes(option.id)
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.prohibitions.includes(option.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, prohibitions: [...prev.prohibitions, option.id] }))
                    } else {
                      setFormData(prev => ({ ...prev, prohibitions: prev.prohibitions.filter(v => v !== option.id) }))
                    }
                  }}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 필수 해시태그 */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            # 필수 해시태그 *
          </Label>
          <Input
            placeholder="해시태그를 입력하고 Enter를 누르세요"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                e.preventDefault()
                const tag = e.target.value.trim().replace(/^#/, '')
                if (tag && !formData.required_hashtags.includes(tag) && formData.required_hashtags.length < 10) {
                  setFormData(prev => ({ ...prev, required_hashtags: [...prev.required_hashtags, tag] }))
                  e.target.value = ''
                }
              }
            }}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.required_hashtags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, required_hashtags: prev.required_hashtags.filter((_, i) => i !== idx) }))}
                  className="hover:text-indigo-900"
                >×</button>
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">{formData.required_hashtags.length}/10개</p>
        </div>
      </div>

      {/* 영상 스타일 (접힘) */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="p-6 cursor-pointer font-semibold text-gray-700 flex items-center gap-2">
          <span>🎨</span> 영상 스타일 (선택)
        </summary>
        <div className="px-6 pb-6 space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">⏱️ 영상 길이</Label>
            <div className="flex flex-wrap gap-2">
              {['15s', '30s', '60s', '자유'].map(duration => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, video_duration: duration }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.video_duration === duration
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {duration}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">🎵 영상 템포</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'fast', label: '빠름' },
                { value: 'normal', label: '보통' },
                { value: 'slow', label: '느림' },
              ].map(tempo => (
                <button
                  key={tempo.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, video_tempo: tempo.value }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.video_tempo === tempo.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tempo.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">🎨 톤앤매너</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'bright', label: '밝고 활기찬' },
                { value: 'calm', label: '차분하고 고급스런' },
                { value: 'professional', label: '전문적' },
                { value: 'humorous', label: '유머러스' },
                { value: 'asmr', label: 'ASMR' },
              ].map(tone => (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tone_and_manner: tone.value }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.tone_and_manner === tone.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  )

  // Step 5: 최종 확인
  const renderStep5 = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">최종 확인</h1>
        <p className="text-gray-500">입력하신 내용을 확인하고 캠페인을 등록하세요</p>
      </div>

      {/* 캠페인 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>📋</span> 캠페인 요약
          </h3>
          <button onClick={() => goToStep(1)} className="text-sm text-indigo-600 hover:underline">수정</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">캠페인 타입</span>
            <span className="text-gray-900">{CAMPAIGN_TYPES.find(t => t.id === formData.campaign_type)?.name} · {selectedPackage?.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">브랜드 / 제품</span>
            <span className="text-gray-900">{formData.brand_name || '-'} · {formData.product_name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">모집 채널</span>
            <span className="text-gray-900">
              {formData.channels.map(c => CHANNEL_OPTIONS.find(o => o.value === c)?.label).join(', ') || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">예상 비용</span>
            <span className="text-gray-900 font-semibold">{totalPrice.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 스케줄 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>📅</span> 스케줄
          </h3>
          <button onClick={() => goToStep(3)} className="text-sm text-indigo-600 hover:underline">수정</button>
        </div>
        {formData.shipping_date && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>{formData.shipping_date?.slice(5).replace('-', '/')}</span>
              <span>{formData.recruitment_deadline?.slice(5).replace('-', '/')}</span>
              <span>{formData.shooting_deadline?.slice(5).replace('-', '/')}</span>
              <span>{formData.upload_date?.slice(5).replace('-', '/')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <div className="flex-1 h-1 bg-indigo-600"></div>
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <div className="flex-1 h-1 bg-indigo-600"></div>
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <div className="flex-1 h-1 bg-indigo-600"></div>
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>발송일</span>
              <span>모집마감</span>
              <span>촬영마감</span>
              <span>업로드</span>
            </div>
          </div>
        )}
      </div>

      {/* 가이드 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>🎯</span> 크리에이터 가이드 요약
          </h3>
          <button onClick={() => goToStep(4)} className="text-sm text-indigo-600 hover:underline">수정</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex">
            <span className="text-gray-500 w-24 flex-shrink-0">⚡ 1초 후킹</span>
            <span className="text-gray-900">"{formData.hooking_point || '-'}"</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-24 flex-shrink-0">💬 핵심 메시지</span>
            <span className="text-gray-900">{formData.core_message || '-'}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-24 flex-shrink-0">🎬 필수 미션</span>
            <span className="text-gray-900">
              {formData.required_missions.map(m => MISSION_OPTIONS.find(o => o.id === m)?.label).join(', ') || '-'}
            </span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-24 flex-shrink-0"># 해시태그</span>
            <span className="text-gray-900">
              {formData.required_hashtags.map(t => `#${t}`).join(' ') || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 확인 체크박스 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" />
          <span className="text-sm text-indigo-800">입력한 내용이 정확함을 확인했습니다</span>
        </label>
      </div>
    </div>
  )

  // 현재 단계 렌더링
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 프로그레스 바 */}
      {renderProgressBar()}

      {/* 메인 콘텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {renderCurrentStep()}
      </div>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                <span>저장 중...</span>
              </>
            ) : lastSaved && (
              <>
                <Save className="w-4 h-4" />
                <span>자동 저장됨 ({lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})</span>
              </>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전 단계
              </Button>
            )}
            {currentStep < 5 ? (
              <Button onClick={nextStep} className="bg-indigo-600 hover:bg-indigo-700">
                다음 단계
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-1" />
                캠페인 등록하기
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
