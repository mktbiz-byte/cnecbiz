import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Loader2, X, Download, ArrowLeft, Check, Package } from 'lucide-react'

// 패키지 캠페인 타입 정의 (가격/인원은 package_settings에서 가져옴)
const PACKAGE_TYPES = [
  {
    id: 'planned',
    label: '기획형 캠페인',
    color: 'indigo',
    description: '합리적인 비용으로 전문적인 숏폼 기획',
    features: [
      '브랜드 맞춤 시나리오 기획',
      '촬영 가이드라인 제공',
      'AI 크리에이터 매칭',
      'SNS 업로드 URL 1개',
      '2차 활용 및 파트너코드',
    ],
    badge: '인기',
  },
  {
    id: 'oliveyoung',
    label: '올영세일 패키지',
    color: 'pink',
    description: '세일 기간 집중 트래픽과 구매 전환 유도',
    features: [
      '3단계 콘텐츠 (리뷰→홍보→당일)',
      '구매 전환 유도형 기획',
      'SNS 업로드 URL 3개',
      '원본 영상 파일 제공',
      '2차 활용 및 파트너코드',
    ],
    badge: null,
  },
  {
    id: '4week_challenge',
    label: '4주 챌린지',
    color: 'purple',
    description: '진정성 있는 리뷰와 장기적 바이럴 효과',
    features: [
      '주차별 미션 (총 4편 제작)',
      'Before & After 변화 기록',
      'SNS 업로드 URL 4개',
      '원본 영상 파일 제공',
      '2차 활용 및 파트너코드',
    ],
    badge: null,
  },
]

const COLOR_MAP = {
  indigo: {
    border: 'border-[#6C5CE7]',
    ring: 'ring-[#F0EDFF]',
    bg: 'bg-[#F0EDFF]',
    text: 'text-[#6C5CE7]',
    button: 'bg-[#6C5CE7] text-white',
    buttonHover: 'hover:bg-[#5A4BD5]',
    check: 'text-[#6C5CE7]',
    badge: 'bg-[#6C5CE7]',
  },
  pink: {
    border: 'border-pink-500',
    ring: 'ring-pink-100',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    button: 'bg-pink-600 text-white',
    buttonHover: 'hover:bg-pink-700',
    check: 'text-pink-500',
    badge: 'bg-pink-500',
  },
  purple: {
    border: 'border-purple-500',
    ring: 'ring-purple-100',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    button: 'bg-purple-600 text-white',
    buttonHover: 'hover:bg-purple-700',
    check: 'text-purple-500',
    badge: 'bg-purple-500',
  },
}

export default function CreatePackageCampaign() {
  const navigate = useNavigate()
  const thumbnailInputRef = useRef(null)

  // 단계 관리: 1=타입선택, 2=상품정보, 3=확인&결제
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState(null)

  // 상품 정보
  const [form, setForm] = useState({
    brand: '',
    product_name: '',
    product_link: '',
    image_url: '',
  })

  // 상태
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // 세금계산서/회사 정보
  const [companyInfo, setCompanyInfo] = useState(null)
  const [taxInvoiceComplete, setTaxInvoiceComplete] = useState(true)

  // 동의 모달
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [consentRefundPolicy, setConsentRefundPolicy] = useState(false)
  const [consentNoDirectContact, setConsentNoDirectContact] = useState(false)

  // URL 크롤링
  const [isCrawling, setIsCrawling] = useState(false)

  // 패키지 세팅 (DB에서 가져온 고정값)
  const [packageSettings, setPackageSettings] = useState(null)

  // 세금계산서 정보 체크
  useEffect(() => {
    const checkTaxInvoiceInfo = async () => {
      try {
        const { data: { user } } = await supabaseBiz.auth.getUser()
        if (!user) return

        const { data: company, error } = await supabaseBiz
          .from('companies')
          .select('id, phone, notification_phone, ceo_name, business_type, business_category, company_postal_code, company_address')
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching company info:', error)
          return
        }

        const companyWithPhone = {
          ...company,
          phone: company?.phone || company?.notification_phone
        }
        setCompanyInfo(companyWithPhone)

        const isComplete = !!(
          company?.ceo_name?.trim() &&
          company?.business_type?.trim() &&
          company?.business_category?.trim() &&
          company?.company_postal_code?.trim() &&
          company?.company_address?.trim()
        )
        setTaxInvoiceComplete(isComplete)
      } catch (err) {
        console.error('Tax invoice info check error:', err)
      }
    }

    checkTaxInvoiceInfo()
  }, [])

  // 패키지 세팅 로드 (관리자가 세팅한 인원/금액)
  useEffect(() => {
    const loadPackageSettings = async () => {
      try {
        const { data, error } = await supabaseBiz
          .from('package_settings')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          setPackageSettings(data)
        }
      } catch (err) {
        console.error('Failed to load package settings:', err)
      }
    }

    loadPackageSettings()
  }, [])

  // 선택된 패키지 정보 (가격/인원/할인율 모두 package_settings에서)
  const getSelectedPackage = () => {
    if (!selectedType || !packageSettings) return null
    const pkg = PACKAGE_TYPES.find(p => p.id === selectedType)
    if (!pkg) return null

    const price = packageSettings.per_creator_price
    const slots = packageSettings.total_creators
    const discountRate = packageSettings.discount_rate || 0
    const subtotal = price * slots
    const discountAmount = Math.floor(subtotal * (discountRate / 100))
    const totalBeforeVat = subtotal - discountAmount
    const vat = Math.round(totalBeforeVat * 0.1)
    const totalWithVat = totalBeforeVat + vat

    return { ...pkg, price, slots, discountRate, subtotal, discountAmount, totalBeforeVat, vat, totalWithVat }
  }

  // 썸네일 업로드
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `thumbnail-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `campaign-images/${fileName}`

      const client = supabaseKorea || supabaseBiz
      const { error: uploadError } = await client.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = client.storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      setForm(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err) {
      console.error('썸네일 업로드 실패:', err)
      setError('썸네일 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // URL 크롤링
  const crawlProductUrl = async () => {
    if (!form.product_link) return

    setIsCrawling(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/crawl-product-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.product_link })
      })

      const result = await response.json()

      if (result.success && result.data) {
        setForm(prev => ({
          ...prev,
          product_name: result.data.product_name || prev.product_name,
          brand: result.data.brand_name || prev.brand,
          image_url: result.data.thumbnail_url || prev.image_url,
        }))
      }
    } catch (err) {
      console.error('URL 크롤링 실패:', err)
    } finally {
      setIsCrawling(false)
    }
  }

  // 다음 단계로 진행
  const goToStep2 = () => {
    if (!selectedType) {
      setError('캠페인 타입을 선택해주세요.')
      return
    }
    setError('')
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToStep3 = () => {
    if (!form.brand.trim()) {
      setError('브랜드명을 입력해주세요.')
      return
    }
    if (!form.product_name.trim()) {
      setError('제품명을 입력해주세요.')
      return
    }
    setError('')
    setStep(3)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 캠페인 제출 (동의 후)
  const handleSubmit = () => {
    if (!taxInvoiceComplete) {
      setError('캠페인 생성을 위해 세금계산서 발행 정보를 먼저 입력해주세요.')
      return
    }
    setConsentRefundPolicy(false)
    setConsentNoDirectContact(false)
    setShowConsentModal(true)
  }

  const executeSubmit = async () => {
    setShowConsentModal(false)
    setProcessing(true)
    setError('')

    try {
      const pkg = getSelectedPackage()
      if (!pkg) throw new Error('패키지 정보를 찾을 수 없습니다.')

      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      // 스케줄 자동 계산 (오늘 기준)
      const addDays = (days) => {
        const date = new Date()
        date.setDate(date.getDate() + days)
        return date.toISOString().split('T')[0]
      }

      const applicationDeadline = addDays(7)
      const shippingDate = addDays(9)
      const startDate = addDays(19)
      const endDate = addDays(21)

      const campaignData = {
        campaign_type: pkg.id,
        package_type: 'standard',
        brand: form.brand,
        product_name: form.product_name,
        product_link: form.product_link,
        product_description: '',
        product_detail_file_url: '',
        category: ['instagram'],
        total_slots: pkg.slots,
        remaining_slots: pkg.slots,
        application_deadline: applicationDeadline,
        shipping_date: shippingDate,
        start_date: startDate,
        end_date: endDate,
        reward_points: Math.round(pkg.price * 0.6),
        estimated_cost: pkg.totalWithVat,
        bonus_amount: 0,
        requirements: '',
        image_url: form.image_url,
        is_oliveyoung_sale: pkg.id === 'oliveyoung',
        is_private: true,
        title: `${form.brand} ${form.product_name}`.trim(),
        status: 'draft',
        company_id: user.id,
        company_email: user.email,
      }

      // company_biz_id, company_phone 추가
      if (companyInfo?.id) {
        campaignData.company_biz_id = companyInfo.id
      }
      if (companyInfo?.phone) {
        campaignData.company_phone = companyInfo.phone
      }

      const client = supabaseKorea || supabaseBiz
      const { data: insertData, error: insertError } = await client
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single()

      if (insertError) throw insertError

      const campaignId = insertData.id

      // 네이버 웍스 알림
      try {
        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        const typeLabel = pkg.id === 'oliveyoung' ? '올영세일'
          : pkg.id === '4week_challenge' ? '4주 챌린지'
          : '기획형'
        const naverWorksMessage = `[패키지 캠페인 생성]\n\n캠페인: ${campaignData.title}\n타입: ${typeLabel}\n브랜드: ${form.brand}\n상품: ${form.product_name}\n인원: ${pkg.slots}명\n금액: ${pkg.totalWithVat.toLocaleString()}원 (VAT 포함)\n\n기업 이메일: ${user.email}\n\n${koreanDate}`

        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            message: naverWorksMessage,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
          })
        })
      } catch (naverWorksError) {
        console.error('네이버 웍스 알림 발송 실패:', naverWorksError)
      }

      // 결제 페이지로 바로 이동
      navigate(`/company/campaigns/payment?id=${campaignId}&region=korea`)
    } catch (err) {
      console.error('캠페인 저장 실패:', err)
      const errorMessage = err?.message || JSON.stringify(err)
      setError('캠페인 저장에 실패했습니다: ' + errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  // 약관 다운로드
  const handleDownloadContract = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>캠페인 이용약관</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8}h1{text-align:center}h2{margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:8px}</style></head><body><h1>캠페인 이용약관 및 환불 규정</h1><h2>환불 규정</h2><p>캠페인 진행 전: 전액 환불</p><p>캠페인 진행 후: 50% 환불 (실비 공제)</p><p>콘텐츠 제출 후: 환불 불가</p><h2>크리에이터 개별 연락 금지</h2><p>위반 시 캠페인 결제 금액의 200%에 해당하는 위약금이 청구될 수 있습니다.</p></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '캠페인_이용약관.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedPkg = getSelectedPackage()

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* 세금계산서 미완료 경고 */}
      {!taxInvoiceComplete && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-amber-800 font-semibold">세금계산서 발행 정보를 입력해주세요</h3>
                <p className="text-amber-700 text-sm mt-1">캠페인 생성 전 세금계산서 발행 정보를 먼저 입력해야 합니다.</p>
                <Button onClick={() => navigate('/company/profile/edit')} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white" size="sm">
                  프로필 수정하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-white border-b border-[#DFE6E9]">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4 lg:py-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')} className="text-[#636E72] hover:text-[#1A1A2E] mb-3 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> 캠페인 목록으로
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F0EDFF] rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#6C5CE7]" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'Pretendard, sans-serif' }}>패키지 캠페인 개설</h1>
              <p className="text-sm text-[#636E72]">간편하게 캠페인을 개설하고 바로 결제하세요</p>
            </div>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 mt-6">
            {[
              { num: 1, label: '캠페인 선택' },
              { num: 2, label: '상품 정보' },
              { num: 3, label: '확인 & 결제' },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s.num ? 'bg-[#6C5CE7] text-white' : 'bg-[#DFE6E9] text-[#B2BEC3]'
                  }`}>
                    {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${step >= s.num ? 'text-[#1A1A2E]' : 'text-[#B2BEC3]'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 rounded ${step > s.num ? 'bg-[#6C5CE7]' : 'bg-[#DFE6E9]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        {/* Step 1: 캠페인 타입 선택 */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">캠페인 타입을 선택하세요</h2>
            <p className="text-sm text-[#636E72] mb-6">원하는 캠페인 타입을 선택해주세요.</p>

            {/* 패키지 세팅 요약 */}
            {packageSettings && (() => {
              const price = packageSettings.per_creator_price
              const slots = packageSettings.total_creators
              const discountRate = packageSettings.discount_rate || 0
              const originalTotal = price * slots
              const discountedTotal = originalTotal - Math.floor(originalTotal * (discountRate / 100))

              return (
                <div className="bg-[#F0EDFF] rounded-2xl p-4 lg:p-5 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#6C5CE7] rounded-xl flex items-center justify-center">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1A1A2E]">{packageSettings.title || '패키지 캠페인'}</p>
                        {packageSettings.subtitle && (
                          <p className="text-xs text-[#636E72]">{packageSettings.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {discountRate > 0 && (
                          <span className="text-sm text-[#636E72] line-through" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {originalTotal.toLocaleString()}원
                          </span>
                        )}
                        <span className="text-xl font-bold text-[#6C5CE7]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {discountedTotal.toLocaleString()}원
                        </span>
                        {discountRate > 0 && (
                          <span className="text-xs font-bold text-[#FF6B6B] bg-red-50 px-1.5 py-0.5 rounded">
                            {discountRate}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#636E72] mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {price.toLocaleString()}원 x {slots}인 (VAT 별도)
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {!packageSettings && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
                <span className="ml-2 text-sm text-[#636E72]">패키지 정보를 불러오는 중...</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
              {PACKAGE_TYPES.map((pkg) => {
                const colors = COLOR_MAP[pkg.color]
                const isSelected = selectedType === pkg.id

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedType(pkg.id)}
                    className={`relative bg-white rounded-2xl border-2 p-5 lg:p-6 transition-all cursor-pointer flex flex-col ${
                      isSelected
                        ? `${colors.border} shadow-lg ring-2 ${colors.ring}`
                        : 'border-[#DFE6E9] hover:border-[#B2BEC3] hover:shadow-md'
                    }`}
                  >
                    {pkg.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className={`${colors.badge} text-white text-xs font-bold px-3 py-1 rounded-full shadow-md`}>
                          {pkg.badge}
                        </span>
                      </div>
                    )}

                    <div className={`mb-4 ${pkg.badge ? 'pt-2' : ''}`}>
                      <h3 className={`text-lg font-bold mb-1 ${isSelected ? colors.text : 'text-[#1A1A2E]'}`}>
                        {pkg.label}
                      </h3>
                      <p className="text-[#636E72] text-sm mt-1 leading-relaxed">{pkg.description}</p>
                    </div>

                    <button
                      type="button"
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all mb-4 ${
                        isSelected
                          ? `${colors.button} shadow-md`
                          : 'bg-[#F8F9FA] text-[#636E72] hover:bg-[#DFE6E9]'
                      }`}
                    >
                      {isSelected ? '선택됨' : '선택하기'}
                    </button>

                    <ul className="space-y-2 text-sm flex-1">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <svg className={`w-4 h-4 flex-shrink-0 ${isSelected ? colors.check : 'text-[#00B894]'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-[#1A1A2E]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>

            {/* 다음 버튼 */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={goToStep2}
                disabled={!selectedType || !packageSettings}
                className="h-12 px-8 bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white rounded-xl font-semibold text-base disabled:opacity-40"
              >
                다음 단계
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 상품 정보 입력 */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setStep(1); setError('') }} className="text-[#636E72] hover:text-[#1A1A2E]">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-[#1A1A2E]">상품 정보를 입력하세요</h2>
                <p className="text-sm text-[#636E72]">최소한의 정보만 입력하면 됩니다.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 lg:p-8 shadow-sm border border-[#DFE6E9]">
              <div className="space-y-5">
                {/* 브랜드명 */}
                <div>
                  <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                    브랜드명 <span className="text-[#FF6B6B]">*</span>
                  </Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="예: 에이블씨엔씨"
                    className="h-12 border-[#DFE6E9] focus:border-[#6C5CE7] focus:ring-[#6C5CE7] rounded-xl"
                  />
                </div>

                {/* 제품명 */}
                <div>
                  <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">
                    제품명 <span className="text-[#FF6B6B]">*</span>
                  </Label>
                  <Input
                    value={form.product_name}
                    onChange={(e) => setForm(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="예: 미샤 타임 레볼루션 에센스"
                    className="h-12 border-[#DFE6E9] focus:border-[#6C5CE7] focus:ring-[#6C5CE7] rounded-xl"
                  />
                </div>

                {/* 상품 URL */}
                <div>
                  <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">상품 URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={form.product_link}
                      onChange={(e) => setForm(prev => ({ ...prev, product_link: e.target.value }))}
                      placeholder="https://www.oliveyoung.co.kr/store/goods/..."
                      className="h-12 border-[#DFE6E9] focus:border-[#6C5CE7] focus:ring-[#6C5CE7] rounded-xl flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={crawlProductUrl}
                      disabled={isCrawling || !form.product_link}
                      className="h-12 px-4 whitespace-nowrap border-[#DFE6E9] text-[#636E72] hover:bg-[#F0EDFF] hover:text-[#6C5CE7] rounded-xl"
                    >
                      {isCrawling ? <Loader2 className="w-4 h-4 animate-spin" /> : '정보 가져오기'}
                    </Button>
                  </div>
                </div>

                {/* 썸네일 이미지 */}
                <div>
                  <Label className="text-sm font-semibold text-[#1A1A2E] mb-2 block">대표 이미지</Label>
                  <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:border-[#6C5CE7] hover:bg-[#F0EDFF]/30 ${
                      form.image_url ? 'border-[#00B894] bg-green-50/30' : 'border-[#DFE6E9]'
                    }`}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7]" />
                        <span className="text-sm text-[#636E72]">업로드 중...</span>
                      </div>
                    ) : form.image_url ? (
                      <div className="flex flex-col items-center gap-3">
                        <img src={form.image_url} alt="썸네일" className="max-h-36 rounded-xl shadow-sm" />
                        <span className="text-sm text-[#00B894] font-medium">클릭하여 이미지 변경</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-[#F0EDFF] rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-[#6C5CE7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <span className="text-sm text-[#636E72]">클릭하여 이미지 업로드</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 다음/이전 버튼 */}
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => { setStep(1); setError('') }} className="h-12 px-6 rounded-xl border-[#DFE6E9]">
                이전 단계
              </Button>
              <Button
                onClick={goToStep3}
                className="h-12 px-8 bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white rounded-xl font-semibold text-base"
              >
                다음 단계
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 확인 & 결제 */}
        {step === 3 && selectedPkg && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setStep(2); setError('') }} className="text-[#636E72] hover:text-[#1A1A2E]">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-[#1A1A2E]">주문 확인</h2>
                <p className="text-sm text-[#636E72]">내용을 확인하고 결제를 진행하세요.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* 왼쪽: 요약 */}
              <div className="lg:col-span-3 space-y-5">
                {/* 캠페인 정보 */}
                <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-[#DFE6E9]">
                  <h3 className="text-base font-bold text-[#1A1A2E] mb-4">캠페인 정보</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#636E72]">캠페인 타입</span>
                      <span className="font-medium text-[#1A1A2E]">{selectedPkg.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#636E72]">브랜드</span>
                      <span className="font-medium text-[#1A1A2E]">{form.brand}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#636E72]">제품명</span>
                      <span className="font-medium text-[#1A1A2E]">{form.product_name}</span>
                    </div>
                    {form.product_link && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#636E72]">상품 URL</span>
                        <a href={form.product_link} target="_blank" rel="noopener noreferrer" className="font-medium text-[#6C5CE7] hover:underline truncate max-w-[200px]">
                          {form.product_link}
                        </a>
                      </div>
                    )}
                    {form.image_url && (
                      <div className="pt-3 border-t border-[#DFE6E9]">
                        <img src={form.image_url} alt="대표 이미지" className="max-h-28 rounded-xl" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 포함 사항 */}
                <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-[#DFE6E9]">
                  <h3 className="text-base font-bold text-[#1A1A2E] mb-4">포함 사항</h3>
                  <ul className="space-y-2">
                    {selectedPkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-[#00B894] flex-shrink-0" />
                        <span className="text-[#1A1A2E]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 오른쪽: 견적서 */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-6">
                  <div className="bg-[#1A1A2E] rounded-2xl p-5 lg:p-6 text-white">
                    <h3 className="text-lg font-bold mb-5">결제 금액</h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">크리에이터 단가</span>
                        <span style={{ fontFamily: 'Outfit, sans-serif' }}>{selectedPkg.price.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">인원</span>
                        <span style={{ fontFamily: 'Outfit, sans-serif' }}>x {selectedPkg.slots}명</span>
                      </div>
                      <div className="border-t border-gray-700 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">소계</span>
                          <span style={{ fontFamily: 'Outfit, sans-serif' }}>{selectedPkg.subtotal.toLocaleString()}원</span>
                        </div>
                      </div>
                      {selectedPkg.discountRate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#FF6B6B]">할인 ({selectedPkg.discountRate}%)</span>
                          <span className="text-[#FF6B6B]" style={{ fontFamily: 'Outfit, sans-serif' }}>-{selectedPkg.discountAmount.toLocaleString()}원</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">공급가액</span>
                        <span style={{ fontFamily: 'Outfit, sans-serif' }}>{selectedPkg.totalBeforeVat.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">부가세 (10%)</span>
                        <span style={{ fontFamily: 'Outfit, sans-serif' }}>{selectedPkg.vat.toLocaleString()}원</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-700">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-gray-400">총 결제 금액</span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {selectedPkg.totalWithVat.toLocaleString()}
                        </span>
                        <span className="text-lg ml-1">원</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={processing}
                      className="w-full mt-6 py-6 text-lg bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] hover:from-[#5A4BD5] hover:to-[#8B7CF5] text-white font-bold rounded-xl"
                    >
                      {processing ? (
                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> 처리 중...</>
                      ) : (
                        '결제하기'
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 mt-4 text-center">
                      * 세금계산서 발행 가능 / 카드 결제 지원
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 이전 단계 */}
            <div className="mt-6">
              <Button variant="outline" onClick={() => { setStep(2); setError('') }} className="h-12 px-6 rounded-xl border-[#DFE6E9]">
                이전 단계
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 동의 모달 */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1A1A2E]">캠페인 이용약관 동의</h2>
              <button onClick={() => setShowConsentModal(false)} className="text-[#B2BEC3] hover:text-[#636E72]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* 환불 규정 */}
              <div>
                <h3 className="font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#F0EDFF] rounded-full flex items-center justify-center text-[#6C5CE7] text-xs font-bold">1</span>
                  환불 규정
                </h3>
                <div className="bg-[#F8F9FA] rounded-xl p-4 text-sm text-[#636E72] space-y-2">
                  <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-[#DFE6E9]">
                    <div className="flex-shrink-0 w-12 h-8 bg-green-100 rounded flex items-center justify-center">
                      <span className="text-green-700 font-bold text-xs">100%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A2E]">캠페인 진행 전</p>
                      <p className="text-xs text-[#636E72]">크리에이터 선정 완료 이전 → 전액 환불</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-[#DFE6E9]">
                    <div className="flex-shrink-0 w-12 h-8 bg-amber-100 rounded flex items-center justify-center">
                      <span className="text-amber-700 font-bold text-xs">50%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A2E]">캠페인 진행 후</p>
                      <p className="text-xs text-[#636E72]">크리에이터 선정 후 ~ 콘텐츠 제작 중 → 50% 환불</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-[#DFE6E9]">
                    <div className="flex-shrink-0 w-12 h-8 bg-red-100 rounded flex items-center justify-center">
                      <span className="text-red-700 font-bold text-xs">0%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A2E]">콘텐츠 제출 후</p>
                      <p className="text-xs text-[#636E72]">크리에이터가 콘텐츠를 제출한 이후 → 환불 불가</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 개별 연락 금지 */}
              <div>
                <h3 className="font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#F0EDFF] rounded-full flex items-center justify-center text-[#6C5CE7] text-xs font-bold">2</span>
                  크리에이터 개별 연락 금지
                </h3>
                <div className="bg-red-50 rounded-xl p-4 text-sm text-[#636E72] space-y-2 border border-red-100">
                  <p>플랫폼을 통해 매칭된 크리에이터에게 <strong className="text-red-700">직접 연락하여 별도 거래를 제안하는 행위</strong>를 해서는 안 됩니다.</p>
                  <p className="text-red-600 font-semibold">위반 시 캠페인 결제 금액의 200% 위약금이 청구될 수 있습니다.</p>
                </div>
              </div>

              {/* 체크박스 */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-[#DFE6E9] hover:bg-[#F8F9FA] transition-colors">
                  <input
                    type="checkbox"
                    checked={consentRefundPolicy}
                    onChange={(e) => setConsentRefundPolicy(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-[#DFE6E9] text-[#6C5CE7] focus:ring-[#6C5CE7]"
                  />
                  <span className="text-sm text-[#636E72]">
                    <strong className="text-[#1A1A2E]">환불 규정</strong>에 동의합니다.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-[#DFE6E9] hover:bg-[#F8F9FA] transition-colors">
                  <input
                    type="checkbox"
                    checked={consentNoDirectContact}
                    onChange={(e) => setConsentNoDirectContact(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-[#DFE6E9] text-[#6C5CE7] focus:ring-[#6C5CE7]"
                  />
                  <span className="text-sm text-[#636E72]">
                    <strong className="text-[#1A1A2E]">크리에이터 개별 연락 금지 조항</strong>에 동의합니다.
                  </span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-2xl flex items-center justify-between">
              <button onClick={handleDownloadContract} className="flex items-center gap-2 text-sm text-[#6C5CE7] hover:text-[#5A4BD5] font-medium">
                <Download className="w-4 h-4" />
                약관 다운로드
              </button>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowConsentModal(false)} className="rounded-xl">
                  취소
                </Button>
                <Button
                  disabled={!consentRefundPolicy || !consentNoDirectContact || processing}
                  onClick={executeSubmit}
                  className="bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white px-6 rounded-xl"
                >
                  {processing ? '처리 중...' : '동의 후 결제 진행'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
