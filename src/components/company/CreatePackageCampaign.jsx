import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Loader2, ArrowLeft, Check, Package, Download } from 'lucide-react'

export default function CreatePackageCampaign() {
  const navigate = useNavigate()
  const thumbnailInputRef = useRef(null)

  // 단계: 1=동의서, 2=상품정보 입력 & 결제
  const [step, setStep] = useState(1)

  // 동의 체크
  const [consentRefundPolicy, setConsentRefundPolicy] = useState(false)
  const [consentNoDirectContact, setConsentNoDirectContact] = useState(false)

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
  const [isCrawling, setIsCrawling] = useState(false)

  // 세금계산서/회사 정보
  const [companyInfo, setCompanyInfo] = useState(null)
  const [taxInvoiceComplete, setTaxInvoiceComplete] = useState(true)

  // 패키지 세팅 (DB에서 가져온 값)
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

  // 패키지 세팅 로드
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

  // 패키지 가격 계산
  const getPackagePricing = () => {
    if (!packageSettings) return null

    const price = packageSettings.per_creator_price
    const slots = packageSettings.total_creators
    const discountRate = packageSettings.discount_rate || 0
    const subtotal = price * slots
    const discountAmount = Math.floor(subtotal * (discountRate / 100))
    const totalBeforeVat = subtotal - discountAmount
    const vat = Math.round(totalBeforeVat * 0.1)
    const totalWithVat = totalBeforeVat + vat

    return { price, slots, discountRate, subtotal, discountAmount, totalBeforeVat, vat, totalWithVat }
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

  // Step 1 → Step 2
  const goToStep2 = () => {
    if (!consentRefundPolicy || !consentNoDirectContact) {
      setError('모든 약관에 동의해주세요.')
      return
    }
    setError('')
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 약관 다운로드
  const handleDownloadContract = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>캠페인 등록 동의서</title><style>body{font-family:'Pretendard',sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;color:#1a1a2e}h1{text-align:center;margin-bottom:40px}h2{margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:8px}.warning{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;margin:12px 0}</style></head><body><h1>캠페인 등록 동의서</h1><h2>1. 환불 규정</h2><p><strong>캠페인 진행 전</strong>: 크리에이터 선정 완료 이전 → 전액 환불</p><p><strong>캠페인 진행 후</strong>: 크리에이터 선정 완료 이후 ~ 콘텐츠 제작 중 → 50% 환불 (실비 공제)</p><p><strong>콘텐츠 제출 후</strong>: 크리에이터가 콘텐츠를 제출한 이후 → 환불 불가</p><p>※ "캠페인 진행"의 기준: 크리에이터 선정을 완료하고, 선정된 크리에이터에게 가이드 및 제품 배송이 시작된 시점</p><p>※ 부분 환불 시 이미 집행된 크리에이터 보상금, 제품 배송비 등 실비용은 공제 후 환불됩니다.</p><h2>2. 크리에이터 개별 연락 금지</h2><p>플랫폼을 통해 매칭된 크리에이터에게 회사의 사전 서면 동의 없이 직접 연락(DM, 이메일, 전화, SNS 댓글 등)하여 별도 거래를 제안하거나 유인하는 행위를 해서는 안 됩니다.</p><p>크리에이터와의 모든 커뮤니케이션은 크넥(CNEC) 플랫폼을 통해 이루어져야 합니다.</p><p>본 조항은 캠페인 종료 후 6개월간 유효합니다.</p><div class="warning">⚠ 위반 시 해당 캠페인 결제 금액의 200%에 해당하는 위약금이 청구될 수 있습니다.</div><h2>3. 콘텐츠 저작권 및 2차 활용</h2><p>크리에이터가 제작한 콘텐츠의 1차 저작권은 크리에이터에게 귀속됩니다.</p><p>캠페인 계약 범위를 초과하는 2차 활용은 별도 동의가 필요합니다.</p><p>2차 활용 기간은 크리에이터의 SNS 업로드일로부터 1년입니다.</p><div class="warning">⚠ 2차 활용 기간 만료 후 Meta 광고 사용 불가: 2차 활용 기간(SNS 업로드일로부터 1년)이 만료된 후에는 크리에이터 콘텐츠를 Meta(Facebook/Instagram) 광고 소재로 사용할 수 없습니다.</div></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '캠페인_등록_동의서.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  // 캠페인 제출
  const handleSubmit = async () => {
    if (!form.brand.trim()) {
      setError('브랜드명을 입력해주세요.')
      return
    }
    if (!form.product_name.trim()) {
      setError('제품명을 입력해주세요.')
      return
    }
    if (!taxInvoiceComplete) {
      setError('캠페인 생성을 위해 세금계산서 발행 정보를 먼저 입력해주세요.')
      return
    }

    const pricing = getPackagePricing()
    if (!pricing) {
      setError('패키지 정보를 불러올 수 없습니다.')
      return
    }

    setProcessing(true)
    setError('')

    try {
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
        campaign_type: 'planned',
        package_type: 'standard',
        brand: form.brand,
        product_name: form.product_name,
        product_link: form.product_link,
        product_description: '',
        product_detail_file_url: '',
        category: ['instagram'],
        total_slots: pricing.slots,
        remaining_slots: pricing.slots,
        application_deadline: applicationDeadline,
        shipping_date: shippingDate,
        start_date: startDate,
        end_date: endDate,
        reward_points: Math.round(pricing.price * 0.6),
        estimated_cost: pricing.totalWithVat,
        bonus_amount: 0,
        requirements: '',
        image_url: form.image_url,
        is_oliveyoung_sale: false,
        is_private: true,
        title: `${form.brand} ${form.product_name}`.trim(),
        status: 'draft',
        company_id: user.id,
        company_email: user.email,
      }

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
        const naverWorksMessage = `[패키지 캠페인 생성]\n\n캠페인: ${campaignData.title}\n브랜드: ${form.brand}\n상품: ${form.product_name}\n인원: ${pricing.slots}명\n금액: ${pricing.totalWithVat.toLocaleString()}원 (VAT 포함)\n\n기업 이메일: ${user.email}\n\n${koreanDate}`

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

      // 결제 페이지로 이동
      navigate(`/company/campaigns/payment?id=${campaignId}&region=korea`)
    } catch (err) {
      console.error('캠페인 저장 실패:', err)
      const errorMessage = err?.message || JSON.stringify(err)
      setError('캠페인 저장에 실패했습니다: ' + errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  const pricing = getPackagePricing()

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
              { num: 1, label: '캠페인 등록 동의' },
              { num: 2, label: '상품 정보 & 결제' },
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
                {i < 1 && (
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

        {/* Step 1: 캠페인 등록 동의 */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-[#1A1A2E]">캠페인 등록 동의</h2>
              <p className="text-sm text-[#636E72]">캠페인 등록 전 아래 내용을 확인해주세요</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#DFE6E9] overflow-hidden">
              <div className="p-5 lg:p-8 space-y-6">
                {/* 1. 환불 규정 */}
                <div>
                  <h3 className="font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#F0EDFF] rounded-full flex items-center justify-center text-[#6C5CE7] text-xs font-bold">1</span>
                    환불 규정
                  </h3>
                  <div className="bg-[#F8F9FA] rounded-xl p-4 text-sm text-[#636E72] space-y-3">
                    <div className="grid grid-cols-1 gap-2">
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
                          <p className="text-xs text-[#636E72]">크리에이터 선정 완료 이후 ~ 콘텐츠 제작 중 → 50% 환불 (실비 공제)</p>
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
                    <p className="text-xs text-[#B2BEC3] mt-2">※ "캠페인 진행"의 기준: 크리에이터 선정을 완료하고, 선정된 크리에이터에게 가이드 및 제품 배송이 시작된 시점</p>
                    <p className="text-xs text-[#B2BEC3]">※ 부분 환불 시 이미 집행된 크리에이터 보상금, 제품 배송비 등 실비용은 공제 후 환불됩니다.</p>
                    <p className="text-xs text-[#B2BEC3]">※ 광고주의 귀책사유(허위 정보 등록, 약관 위반 등)로 인한 캠페인 중단 시 환불이 제한될 수 있습니다.</p>
                  </div>
                </div>

                {/* 2. 크리에이터 개별 연락 금지 */}
                <div>
                  <h3 className="font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#F0EDFF] rounded-full flex items-center justify-center text-[#6C5CE7] text-xs font-bold">2</span>
                    크리에이터 개별 연락 금지
                  </h3>
                  <div className="bg-red-50 rounded-xl p-4 text-sm text-[#636E72] space-y-2 border border-red-100">
                    <p>플랫폼을 통해 매칭된 크리에이터에게 회사의 사전 서면 동의 없이 <strong className="text-red-700">직접 연락(DM, 이메일, 전화, SNS 댓글 등)하여 별도 거래를 제안하거나 유인하는 행위</strong>를 해서는 안 됩니다.</p>
                    <p>크리에이터와의 모든 커뮤니케이션은 크넥(CNEC) 플랫폼을 통해 이루어져야 합니다.</p>
                    <p>본 조항은 <strong>캠페인 종료 후 6개월간</strong> 유효합니다.</p>
                    <p className="text-red-600 font-semibold">⚠ 위반 시 해당 캠페인 결제 금액의 200%에 해당하는 위약금이 청구될 수 있습니다.</p>
                  </div>
                </div>

                {/* 3. 콘텐츠 저작권 및 2차 활용 */}
                <div>
                  <h3 className="font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#F0EDFF] rounded-full flex items-center justify-center text-[#6C5CE7] text-xs font-bold">3</span>
                    콘텐츠 저작권 및 2차 활용
                  </h3>
                  <div className="bg-[#F8F9FA] rounded-xl p-4 text-sm text-[#636E72] space-y-2">
                    <p>크리에이터가 제작한 콘텐츠의 1차 저작권은 크리에이터에게 귀속됩니다.</p>
                    <p>캠페인 계약 범위를 초과하는 2차 활용은 별도 동의가 필요합니다.</p>
                    <p>2차 활용 기간은 크리에이터의 <strong className="text-[#1A1A2E]">SNS 업로드일로부터 1년</strong>입니다.</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mt-2">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">⚠ 2차 활용 기간 만료 후 Meta 광고 사용 불가</p>
                    <p>2차 활용 기간(SNS 업로드일로부터 1년)이 만료된 후에는 크리에이터 콘텐츠를 <strong>Meta(Facebook/Instagram) 광고 소재로 사용할 수 없습니다.</strong> 기간 만료 후 Meta 광고에 활용하려면 별도의 2차 활용 계약이 필요합니다.</p>
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
                      <strong className="text-[#1A1A2E]">환불 규정</strong>에 대해 충분히 이해하였으며, 이에 동의합니다.
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
                      <strong className="text-[#1A1A2E]">크리에이터 개별 연락 금지 조항 및 콘텐츠 저작권 규정</strong>에 대해 충분히 이해하였으며, 이에 동의합니다.
                    </span>
                  </label>
                </div>
              </div>

              {/* 하단 버튼 영역 */}
              <div className="border-t border-[#DFE6E9] px-5 lg:px-8 py-4 flex items-center justify-between">
                <button onClick={handleDownloadContract} className="flex items-center gap-2 text-sm text-[#6C5CE7] hover:text-[#5A4BD5] font-medium">
                  <Download className="w-4 h-4" />
                  동의서 다운로드
                </button>
                <Button
                  onClick={goToStep2}
                  disabled={!consentRefundPolicy || !consentNoDirectContact}
                  className="h-12 px-8 bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white rounded-xl font-semibold text-base disabled:opacity-40"
                >
                  동의 후 다음 단계
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 상품 정보 & 결제 */}
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

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* 왼쪽: 상품 정보 폼 */}
              <div className="lg:col-span-3">
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
              </div>

              {/* 오른쪽: 패키지 견적서 */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-6">
                  {!pricing ? (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#DFE6E9] flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
                      <span className="ml-2 text-sm text-[#636E72]">패키지 정보 로딩 중...</span>
                    </div>
                  ) : (
                    <div className="bg-[#1A1A2E] rounded-2xl p-5 lg:p-6 text-white">
                      {/* 패키지 타이틀 */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 bg-[#6C5CE7] rounded-xl flex items-center justify-center">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">{packageSettings?.title || '패키지 캠페인'}</h3>
                          {packageSettings?.subtitle && (
                            <p className="text-xs text-gray-400">{packageSettings.subtitle}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">크리에이터 단가</span>
                          <span style={{ fontFamily: 'Outfit, sans-serif' }}>{pricing.price.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">인원</span>
                          <span style={{ fontFamily: 'Outfit, sans-serif' }}>x {pricing.slots}명</span>
                        </div>
                        <div className="border-t border-gray-700 pt-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">소계</span>
                            <span style={{ fontFamily: 'Outfit, sans-serif' }}>{pricing.subtotal.toLocaleString()}원</span>
                          </div>
                        </div>
                        {pricing.discountRate > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[#FF6B6B]">할인 ({pricing.discountRate}%)</span>
                            <span className="text-[#FF6B6B]" style={{ fontFamily: 'Outfit, sans-serif' }}>-{pricing.discountAmount.toLocaleString()}원</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">공급가액</span>
                          <span style={{ fontFamily: 'Outfit, sans-serif' }}>{pricing.totalBeforeVat.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">부가세 (10%)</span>
                          <span style={{ fontFamily: 'Outfit, sans-serif' }}>{pricing.vat.toLocaleString()}원</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-gray-700">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-gray-400">총 결제 금액</span>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {pricing.totalWithVat.toLocaleString()}
                          </span>
                          <span className="text-lg ml-1">원</span>
                        </div>
                      </div>

                      <Button
                        onClick={handleSubmit}
                        disabled={processing || !form.brand.trim() || !form.product_name.trim()}
                        className="w-full mt-6 py-6 text-lg bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] hover:from-[#5A4BD5] hover:to-[#8B7CF5] text-white font-bold rounded-xl disabled:opacity-40"
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
                  )}
                </div>
              </div>
            </div>

            {/* 이전 단계 */}
            <div className="mt-6">
              <Button variant="outline" onClick={() => { setStep(1); setError('') }} className="h-12 px-6 rounded-xl border-[#DFE6E9]">
                이전 단계
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
