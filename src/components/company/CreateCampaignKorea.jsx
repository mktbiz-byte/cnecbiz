import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { History, X, Loader2, Package } from 'lucide-react'

const CampaignCreationKorea = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') || searchParams.get('id')
  const isAdmin = searchParams.get('admin') === 'true'
  const thumbnailInputRef = useRef(null)
  const detailImageInputRef = useRef(null)
  const brandInfoRef = useRef(null)

  const [campaignForm, setCampaignForm] = useState({
    campaign_type: 'planned',  // 'planned', 'oliveyoung', '4week_challenge'
    package_type: 'standard',  // 기본값: 스탠다드
    brand: '',
    product_name: '',
    product_price: '',
    product_description: '',
    product_link: '',
    category: [],
    total_slots: 1,
    remaining_slots: 10,
    application_deadline: '',
    shipping_date: '',
    start_date: '',
    end_date: '',
    reward_points: 0,
    estimated_cost: 0,
    requirements: '',
    image_url: '',
    product_detail_file_url: '',
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    is_oliveyoung_sale: false,
    target_platforms: [],
    oliveyoung_subtype: 'pick',
    oliveyoung_logo_url: '',
    provide_logo: false,
    sale_season: '',
    content_type: 'store_visit',
    emblem_required: false,
    step1_deadline: '',
    step2_deadline: '',
    step3_deadline: '',
    week1_deadline: '',
    week2_deadline: '',
    week3_deadline: '',
    week4_deadline: '',
    bonus_amount: 0  // 지원율 높이기 추가 금액
  })

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingDetailImage, setUploadingDetailImage] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)

  // 세금계산서 정보 체크
  const [companyInfo, setCompanyInfo] = useState(null)
  const [taxInvoiceComplete, setTaxInvoiceComplete] = useState(true)
  const [showTaxInvoiceWarning, setShowTaxInvoiceWarning] = useState(false)

  // 이전 캠페인 불러오기 상태
  const [previousCampaigns, setPreviousCampaigns] = useState([])
  const [showPreviousCampaigns, setShowPreviousCampaigns] = useState(false)
  const [loadingPrevious, setLoadingPrevious] = useState(false)

  // URL 크롤링 상태
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlError, setCrawlError] = useState(null)

  // 자동 저장 상태
  const [lastSaved, setLastSaved] = useState(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const autoSaveTimeoutRef = useRef(null)

  // 현재 단계 (step) 상태
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3 // 총 3단계

  // 이전 캠페인 목록 불러오기
  const loadPreviousCampaigns = async () => {
    setLoadingPrevious(true)
    try {
      // 현재 사용자 이메일 가져오기
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        console.error('User not logged in')
        return
      }

      // campaigns는 supabaseKorea에 저장됨
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
        .from('campaigns')
        .select('id, brand, product_name, image_url, created_at')
        .eq('company_email', user.email)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setPreviousCampaigns(data || [])
    } catch (error) {
      console.error('Failed to load previous campaigns:', error)
    } finally {
      setLoadingPrevious(false)
    }
  }

  // 이전 캠페인에서 정보 불러오기
  const loadFromPreviousCampaign = async (campaignId) => {
    try {
      // campaigns는 supabaseKorea에 저장됨
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignForm(prev => ({
          ...prev,
          brand: data.brand || prev.brand,
          product_name: data.product_name || prev.product_name,
          product_description: data.product_description || prev.product_description,
          image_url: data.image_url || prev.image_url,
          requirements: data.requirements || prev.requirements,
        }))
        setShowPreviousCampaigns(false)
      }
    } catch (error) {
      console.error('Failed to load campaign:', error)
    }
  }

  // 스케줄 자동 계산 함수
  const autoCalculateSchedule = (recruitmentDeadline) => {
    if (!recruitmentDeadline) return

    const addDays = (dateString, days) => {
      const date = new Date(dateString)
      date.setDate(date.getDate() + days)
      return date.toISOString().split('T')[0]
    }

    // 모집 마감일 기준으로 계산
    const shippingDate = addDays(recruitmentDeadline, 2)      // 제품 발송 예정일: 모집마감 + 2일
    const filmingDeadline = addDays(shippingDate, 10)         // 촬영 마감일: 발송 + 10일
    const uploadDate = addDays(filmingDeadline, 2)            // SNS 업로드일: 촬영마감 + 2일

    setCampaignForm(prev => ({
      ...prev,
      application_deadline: recruitmentDeadline,
      shipping_date: shippingDate,
      start_date: filmingDeadline,
      end_date: uploadDate
    }))
  }

  // URL 크롤링 함수
  const crawlProductUrl = async () => {
    if (!campaignForm.product_link) return

    setIsCrawling(true)
    setCrawlError(null)

    try {
      const response = await fetch('/.netlify/functions/crawl-product-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: campaignForm.product_link })
      })

      const result = await response.json()

      // 성공하고 데이터가 있으면 적용
      if (result.success && result.data) {
        setCampaignForm(prev => ({
          ...prev,
          product_name: result.data.product_name || prev.product_name,
          brand: result.data.brand_name || prev.brand,
          product_price: result.data.product_price || prev.product_price,
          image_url: result.data.thumbnail_url || prev.image_url,
          product_description: result.data.product_description || prev.product_description,
        }))
      }

      // 메시지나 에러가 있으면 표시
      if (result.message) {
        setCrawlError(result.message)
      } else if (!result.success) {
        setCrawlError(result.error || '상품 정보를 가져올 수 없습니다. 수동으로 입력해주세요.')
      }
    } catch (error) {
      console.error('Crawl error:', error)
      setCrawlError('네트워크 오류가 발생했습니다. 상품 정보를 수동으로 입력해주세요.')
    } finally {
      setIsCrawling(false)
    }
  }

  // 자동 저장 함수
  const autoSave = async () => {
    if (!campaignForm.brand && !campaignForm.product_name) return // 아무것도 입력하지 않으면 저장 안함

    setAutoSaving(true)
    try {
      const saveData = {
        ...campaignForm,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem('campaign_draft_korea', JSON.stringify(saveData))
      setLastSaved(new Date())
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  // 폼 변경 시 자동 저장 트리거
  useEffect(() => {
    if (editId) return // 수정 모드에서는 자동 저장 안함

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 3000) // 3초 후 자동 저장

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [campaignForm])

  // 컴포넌트 마운트 시 저장된 드래프트 불러오기
  useEffect(() => {
    if (editId) return // 수정 모드에서는 불러오지 않음

    const savedDraft = localStorage.getItem('campaign_draft_korea')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        const savedTime = new Date(parsed.savedAt)
        const now = new Date()
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60)

        // 24시간 이내 저장본만 복원
        if (hoursDiff < 24) {
          delete parsed.savedAt
          setCampaignForm(prev => ({ ...prev, ...parsed }))
          setLastSaved(savedTime)
        } else {
          localStorage.removeItem('campaign_draft_korea')
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
      }
    }
  }, [editId])

  // 저장 완료 후 드래프트 삭제
  useEffect(() => {
    if (success) {
      localStorage.removeItem('campaign_draft_korea')
    }
  }, [success])

  // 세금계산서 발행 정보 체크
  useEffect(() => {
    const checkTaxInvoiceInfo = async () => {
      try {
        const { data: { user } } = await supabaseBiz.auth.getUser()
        if (!user) return

        const { data: company, error } = await supabaseBiz
          .from('companies')
          .select('ceo_name, business_type, business_category, company_postal_code, company_address')
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching company info:', error)
          return
        }

        setCompanyInfo(company)

        // 세금계산서 필수 필드 체크 (대표자명, 업태, 종목, 우편번호, 주소)
        const isComplete = !!(
          company?.ceo_name?.trim() &&
          company?.business_type?.trim() &&
          company?.business_category?.trim() &&
          company?.company_postal_code?.trim() &&
          company?.company_address?.trim()
        )
        setTaxInvoiceComplete(isComplete)
        if (!isComplete) {
          setShowTaxInvoiceWarning(true)
        }
      } catch (err) {
        console.error('Tax invoice info check error:', err)
      }
    }

    checkTaxInvoiceInfo()
  }, [])

  // 시간 포맷
  const formatTime = (date) => {
    if (!date) return ''
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const period = hours >= 12 ? '오후' : '오전'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    return `${period} ${displayHours.toString().padStart(2, '0')}:${minutes}`
  }

  // 이전/다음 단계 이동
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const categoryOptions = [
    {
      value: 'instagram',
      label: '릴스',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    {
      value: 'youtube',
      label: '쇼츠',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    {
      value: 'tiktok',
      label: '틱톡',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      )
    }
  ]

  // 4주 챌린지 패키지
  const fourWeekPackageOptions = [
    { value: 'standard', label: '스탠다드', price: 600000, description: '4주 기본 프로그램' },
    { value: 'premium', label: '프리미엄', price: 700000, description: '4주 고급 프로그램' },
    { value: 'professional', label: '프로페셔널', price: 800000, description: '4주 전문가 프로그램' },
    { value: 'enterprise', label: '엔터프라이즈', price: 1000000, description: '4주 프리미엄 프로그램' }
  ]

  // 올리브영 패키지
  const oliveyoungPackageOptions = [
    { value: 'standard', label: '스탠다드', price: 400000, description: '올리브영 기본' },
    { value: 'premium', label: '프리미엄', price: 500000, description: '올리브영 고급' },
    { value: 'professional', label: '프로페셔널', price: 600000, description: '올리브영 전문가' }
  ]

  // 올리브영 지원율 높이기 금액별 크리에이터 특성
  const getOliveyoungCreatorLevel = (bonusAmount) => {
    const bonus = bonusAmount || 0
    if (bonus >= 300000) {
      return {
        followerRange: '10만~30만',
        qualityLevel: 5,
        characteristics: ['탑티어 뷰티 크리에이터', '강력한 구매 전환'],
        expectedApplicants: '25~45'
      }
    } else if (bonus >= 200000) {
      return {
        followerRange: '7만~15만',
        qualityLevel: 4,
        characteristics: ['인기 뷰티 크리에이터', '높은 영향력'],
        expectedApplicants: '20~35'
      }
    } else if (bonus >= 100000) {
      return {
        followerRange: '3만~10만',
        qualityLevel: 3,
        characteristics: ['중견 뷰티 크리에이터', '안정적 노출'],
        expectedApplicants: '15~30'
      }
    } else {
      return {
        followerRange: '1만~5만',
        qualityLevel: 2,
        characteristics: ['뷰티 전문 크리에이터', '인기 상품 추천'],
        expectedApplicants: '10~20'
      }
    }
  }

  const packageOptions = [
    {
      value: 'basic',
      label: '베이직',
      price: 200000,
      description: '인스타그램 기준: 1만명 이하',
      expectedApplicants: { instagram: '10~15', youtube: '5~8', tiktok: '5~8' },
      followerRange: '1만 이하',
      creatorLevel: '신규 크리에이터',
      qualityLevel: 1,
      characteristics: ['성장 중인 크리에이터', '가성비 좋은 노출']
    },
    {
      value: 'standard',
      label: '스탠다드',
      price: 300000,
      description: '인스타그램 기준: 1만~3만명',
      expectedApplicants: { instagram: '15~20', youtube: '8~12', tiktok: '8~12' },
      followerRange: '1만~3만',
      creatorLevel: '중급 크리에이터',
      qualityLevel: 2,
      characteristics: ['안정적인 팔로워층', '기획형 숏폼 제작']
    },
    {
      value: 'premium',
      label: '프리미엄',
      price: 400000,
      description: '인스타그램 기준: 3만~10만명',
      expectedApplicants: { instagram: '20~40', youtube: '10~20', tiktok: '10~20' },
      followerRange: '3만~10만',
      creatorLevel: '인기 크리에이터',
      qualityLevel: 3,
      characteristics: ['높은 영향력', '구매 전환 유도']
    },
    {
      value: 'professional',
      label: '프로페셔널',
      price: 600000,
      description: '인스타그램 기준: 10만~30만명',
      expectedApplicants: { instagram: '40~60', youtube: '20~30', tiktok: '20~30' },
      followerRange: '10만~30만',
      creatorLevel: '탑티어 크리에이터',
      qualityLevel: 4,
      characteristics: ['프리미엄 영상미', '높은 팬 충성도']
    },
    {
      value: 'enterprise',
      label: '엔터프라이즈',
      price: 1000000,
      description: '인스타그램 기준: 30만명 이상',
      expectedApplicants: { instagram: '60~100', youtube: '30~50', tiktok: '30~50' },
      followerRange: '30만 이상',
      creatorLevel: '메가 인플루언서',
      qualityLevel: 5,
      characteristics: ['TVC급 영상미', '강력한 바이럴 효과']
    }
  ]

  // 할인율 계산
  const calculateDiscount = (subtotal) => {
    if (subtotal >= 10000000) return 5  // 1000만원 이상 5%
    return 0  // 그 외 할인 없음
  }

  // 최종 결제 금액 계산 (할인 + VAT 포함)
  const calculateFinalCost = (packagePrice, slots, applyDiscount = true) => {
    const subtotal = packagePrice * slots
    const discountRate = applyDiscount ? calculateDiscount(subtotal) : 0
    const discountAmount = Math.floor(subtotal * (discountRate / 100))
    const finalBeforeVat = subtotal - discountAmount
    const vat = Math.round(finalBeforeVat * 0.1)
    return finalBeforeVat + vat
  }

  // 초기 로드 시 금액 계산
  useEffect(() => {
    if (!editId) {
      // 신규 생성 시 초기 금액 계산
      const initialCost = calculateFinalCost(300000, 10) // 스탠다드 패키지 × 10명
      setCampaignForm(prev => ({ ...prev, estimated_cost: initialCost }))
    }
  }, [])

  // 수정 모드일 경우 기존 데이터 불러오기
  useEffect(() => {
    if (editId) {
      loadCampaign()
    }
  }, [editId])

  // 캠페인 타입 변경 시 금액 재계산
  useEffect(() => {
    if (campaignForm.campaign_type === '4week_challenge') {
      // 4주 챌린지: 패키지 × 인원수
      const pkg = fourWeekPackageOptions.find(p => p.value === campaignForm.package_type) || fourWeekPackageOptions[0]
      const finalCost = calculateFinalCost(pkg.price, campaignForm.total_slots, false)
      const rewardPoints = Math.floor(pkg.price * 0.6)  // 1명당 포인트
      setCampaignForm(prev => ({ ...prev, estimated_cost: finalCost, reward_points: rewardPoints }))
    } else if (campaignForm.campaign_type === 'oliveyoung') {
      // 올리브영: 패키지 × 인원수
      const pkg = oliveyoungPackageOptions.find(p => p.value === campaignForm.package_type) || oliveyoungPackageOptions[0]
      const finalCost = calculateFinalCost(pkg.price, campaignForm.total_slots)
      const rewardPoints = Math.floor(pkg.price * 0.6)  // 1명당 포인트
      setCampaignForm(prev => ({ ...prev, estimated_cost: finalCost, reward_points: rewardPoints }))
    } else {
      // 일반: 패키지 × 인원수
      const pkg = packageOptions.find(p => p.value === campaignForm.package_type)
      if (pkg) {
        const finalCost = calculateFinalCost(pkg.price, campaignForm.total_slots)
        const rewardPoints = Math.floor(pkg.price * 0.6)  // 1명당 포인트
        setCampaignForm(prev => ({ ...prev, estimated_cost: finalCost, reward_points: rewardPoints }))
      }
    }
  }, [campaignForm.campaign_type])

  const loadCampaign = async () => {
    try {
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', editId)
        .single()

      if (error) throw error

      if (data) {
        // questions JSONB 배열을 question1-4로 분리
        const questions = data.questions || []
        const question1 = questions[0]?.question || ''
        const question2 = questions[1]?.question || ''
        const question3 = questions[2]?.question || ''
        const question4 = questions[3]?.question || ''

        // 질문 개수 설정
        const qCount = [question1, question2, question3, question4].filter(q => q.trim() !== '').length
        setQuestionCount(qCount)

        // 카테고리 처리
        let categoryArray = []
        if (Array.isArray(data.category)) {
          categoryArray = data.category
        } else if (typeof data.category === 'string') {
          categoryArray = data.category.split(',').map(c => c.trim()).filter(Boolean)
        }

        // 날짜 필드 포맷 변환 함수 (ISO -> YYYY-MM-DD)
        const formatDate = (dateString) => {
          if (!dateString) return ''
          try {
            return new Date(dateString).toISOString().split('T')[0]
          } catch {
            return ''
          }
        }

        // target_platforms 처리 - 객체 형태로 변환
        let targetPlatformsObj = {}
        if (Array.isArray(data.target_platforms)) {
          // 배열 형태일 경우 객체로 변환
          targetPlatformsObj = {
            youtube: data.target_platforms.includes('youtube'),
            instagram: data.target_platforms.includes('instagram'),
            tiktok: data.target_platforms.includes('tiktok')
          }
        } else if (typeof data.target_platforms === 'object' && data.target_platforms !== null) {
          // 이미 객체 형태일 경우
          targetPlatformsObj = data.target_platforms
        } else {
          // category로부터 생성
          targetPlatformsObj = {
            youtube: categoryArray.includes('youtube'),
            instagram: categoryArray.includes('instagram'),
            tiktok: categoryArray.includes('tiktok')
          }
        }

        setCampaignForm({
          ...data,
          target_platforms: targetPlatformsObj,
          question1,
          question2,
          question3,
          question4,
          category: categoryArray,
          // 날짜 필드 포맷 변환
          application_deadline: formatDate(data.application_deadline),
          start_date: formatDate(data.start_date),
          end_date: formatDate(data.end_date),
          step1_deadline: formatDate(data.step1_deadline),
          step2_deadline: formatDate(data.step2_deadline),
          step3_deadline: formatDate(data.step3_deadline),
          week1_deadline: formatDate(data.week1_deadline),
          week2_deadline: formatDate(data.week2_deadline),
          week3_deadline: formatDate(data.week3_deadline),
          week4_deadline: formatDate(data.week4_deadline)
        })

        // 수정 모드일 때 브랜드 정보 섹션으로 스크롤
        setTimeout(() => {
          if (brandInfoRef.current) {
            brandInfoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 300)
      }
    } catch (err) {
      console.error('캠페인 불러오기 실패:', err)
      setError('캠페인 정보를 불러오는데 실패했습니다: ' + err.message)
    }
  }

  // 카테고리 토글 핸들러 (체크박스)
  const handleCategoryToggle = (value) => {
    setCampaignForm(prev => {
      const newCategory = prev.category.includes(value)
        ? prev.category.filter(c => c !== value)
        : [...prev.category, value]
      
      // target_platforms도 함께 업데이트
      const newTargetPlatforms = {
        youtube: newCategory.includes('youtube'),
        instagram: newCategory.includes('instagram'),
        tiktok: newCategory.includes('tiktok')
      }
      
      return {
        ...prev,
        category: newCategory,
        target_platforms: newTargetPlatforms
      }
    })
  }

  // 패키지 변경 핸들러 (결제 금액 자동 계산)
  const handlePackageChange = (value) => {
    let selectedPackage
    let finalCost = 0
    
    if (campaignForm.campaign_type === '4week_challenge') {
      selectedPackage = fourWeekPackageOptions.find(p => p.value === value)
      finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, campaignForm.total_slots, false) : 0
    } else if (campaignForm.campaign_type === 'oliveyoung') {
      selectedPackage = oliveyoungPackageOptions.find(p => p.value === value)
      finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, campaignForm.total_slots) : 0
    } else {
      selectedPackage = packageOptions.find(p => p.value === value)
      finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, campaignForm.total_slots) : 0
    }
    
    if (selectedPackage) {
      const rewardPoints = Math.floor(selectedPackage.price * 0.6)  // 1명당 포인트
      setCampaignForm(prev => ({
        ...prev,
        package_type: value,
        estimated_cost: finalCost,
        reward_points: rewardPoints
      }))
    }
  }

  // 모집 인원 변경 핸들러 (결제 금액 자동 계산)
  const handleSlotsChange = (value) => {
    const slots = parseInt(value) || 0
    let finalCost = 0
    let packagePrice = 0
    
    if (campaignForm.campaign_type === '4week_challenge') {
      // 4주 챌린지: 패키지 가격
      const pkg = fourWeekPackageOptions.find(p => p.value === campaignForm.package_type) || fourWeekPackageOptions[0]
      packagePrice = pkg.price
      finalCost = calculateFinalCost(pkg.price, slots, false)
    } else if (campaignForm.campaign_type === 'oliveyoung') {
      // 올리브영: 패키지 가격
      const selectedPackage = oliveyoungPackageOptions.find(p => p.value === campaignForm.package_type)
      packagePrice = selectedPackage ? selectedPackage.price : 0
      finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, slots) : 0
    } else {
      // 일반: 패키지 가격
      const selectedPackage = packageOptions.find(p => p.value === campaignForm.package_type)
      packagePrice = selectedPackage ? selectedPackage.price : 0
      finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, slots) : 0
    }
    
    const rewardPoints = Math.floor(packagePrice * 0.6)  // 1명당 포인트
    setCampaignForm(prev => ({
      ...prev,
      total_slots: slots,
      remaining_slots: slots,
      estimated_cost: finalCost,
      reward_points: rewardPoints
    }))
  }

  // 로고 파일 업로드
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `campaign-logos/${fileName}`

      const client = supabaseKorea || supabaseBiz
      const { error: uploadError } = await client.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = client.storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      setCampaignForm(prev => ({ ...prev, oliveyoung_logo_url: publicUrl }))
      setSuccess('로고 파일이 업로드되었습니다!')
    } catch (err) {
      console.error('로고 업로드 실패:', err)
      setError('로고 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // 썸네일 이미지 업로드
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

      setCampaignForm(prev => ({ ...prev, image_url: publicUrl }))
      setSuccess('썸네일이 업로드되었습니다!')
    } catch (err) {
      console.error('썸네일 업로드 실패:', err)
      setError('썸네일 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // 상품 상세 이미지 업로드
  const handleProductDetailImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDetailImage(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `product-detail-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `campaign-images/${fileName}`

      const client = supabaseKorea || supabaseBiz
      const { error: uploadError } = await client.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = client.storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      setCampaignForm(prev => ({ ...prev, product_detail_file_url: publicUrl }))
      setSuccess('상품 상세 이미지가 업로드되었습니다!')
    } catch (err) {
      console.error('상품 상세 이미지 업로드 실패:', err)
      setError('상품 상세 이미지 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingDetailImage(false)
    }
  }

  // 캠페인 저장
  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      // 세금계산서 발행 정보 필수 체크
      if (!taxInvoiceComplete) {
        setError('캠페인 생성을 위해 세금계산서 발행 정보를 먼저 입력해주세요. 프로필 수정 페이지에서 입력할 수 있습니다.')
        setShowTaxInvoiceWarning(true)
        setProcessing(false)
        return
      }

      // 필수 필드 검증
      if (!campaignForm.brand || !campaignForm.brand.trim()) {
        setError('브랜드명을 입력해주세요.')
        setProcessing(false)
        return
      }
      if (!campaignForm.product_name || !campaignForm.product_name.trim()) {
        setError('상품명을 입력해주세요.')
        setProcessing(false)
        return
      }
      if (!campaignForm.category || campaignForm.category.length === 0) {
        setError('모집 채널을 1개 이상 선택해주세요.')
        setProcessing(false)
        return
      }
      if (!campaignForm.application_deadline) {
        setError('모집 마감일을 입력해주세요.')
        setProcessing(false)
        return
      }

      // question1-4를 questions JSONB 배열로 변환
      const questions = [
        campaignForm.question1,
        campaignForm.question2,
        campaignForm.question3,
        campaignForm.question4
      ].filter(q => q && q.trim() !== '').map(q => ({ question: q }))

      // DB에 저장할 필드만 명시적으로 선택 (화이트리스트 방식)
      const allowedFields = {
        campaign_type: campaignForm.campaign_type,
        package_type: campaignForm.package_type,
        brand: campaignForm.brand,
        product_name: campaignForm.product_name,
        product_description: campaignForm.product_description,
        product_link: campaignForm.product_link,
        product_detail_file_url: campaignForm.product_detail_file_url,
        category: campaignForm.category,
        total_slots: campaignForm.total_slots,
        remaining_slots: campaignForm.remaining_slots,
        application_deadline: campaignForm.application_deadline || null,
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
        reward_points: campaignForm.reward_points,
        estimated_cost: campaignForm.estimated_cost,
        requirements: campaignForm.requirements,
        image_url: campaignForm.image_url,
        is_oliveyoung_sale: campaignForm.is_oliveyoung_sale,
        oliveyoung_subtype: campaignForm.oliveyoung_subtype,
        step1_deadline: campaignForm.step1_deadline || null,
        step2_deadline: campaignForm.step2_deadline || null,
        step3_deadline: campaignForm.step3_deadline || null,
        week1_deadline: campaignForm.week1_deadline || null,
        week2_deadline: campaignForm.week2_deadline || null,
        week3_deadline: campaignForm.week3_deadline || null,
        week4_deadline: campaignForm.week4_deadline || null
      }

      // 카테고리명 가져오기 (이모지 제거, 배열 처리)
      const categoryNames = campaignForm.category
        .map(cat => {
          const label = categoryOptions.find(opt => opt.value === cat)?.label || ''
          return label.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()
        })
        .join('/')
      
      // 제목 자동 생성
      const autoTitle = `${campaignForm.brand} ${campaignForm.product_name} ${categoryNames}`.trim()

      // 로그인한 사용자 정보 가져오기 (supabaseBiz에서)
      let userEmail = null
      try {
        const { data: { user } } = await supabaseBiz.auth.getUser()
        if (user) {
          userEmail = user.email
        }
      } catch (authError) {
        console.warn('로그인 정보를 가져올 수 없습니다:', authError)
      }

      // 올리브영 캠페인 검증
      if (campaignForm.campaign_type === 'oliveyoung') {
        const hasSelectedPlatform = Object.values(campaignForm.target_platforms || {}).some(v => v === true)
        if (!hasSelectedPlatform) {
          setError('타겟 채널을 1개 이상 선택해주세요.')
          setProcessing(false)
          return
        }
      }

      // Get user ID for company_id
      const { data: { user: currentUser } } = await supabaseBiz.auth.getUser()
      if (!currentUser) throw new Error('로그인이 필요합니다')
      
      // 패키지 라벨 생성
      let packageLabel = ''
      if (campaignForm.campaign_type === '4week_challenge') {
        const pkg = fourWeekPackageOptions.find(p => p.value === campaignForm.package_type)
        if (pkg) packageLabel = `${pkg.label} - ₩${pkg.price.toLocaleString()}`
      } else if (campaignForm.campaign_type === 'oliveyoung') {
        const pkg = oliveyoungPackageOptions.find(p => p.value === campaignForm.package_type)
        if (pkg) packageLabel = `${pkg.label} - ₩${pkg.price.toLocaleString()}`
      } else {
        const pkg = packageOptions.find(p => p.value === campaignForm.package_type)
        if (pkg) packageLabel = `${pkg.label} - ₩${pkg.price.toLocaleString()} (VAT 별도)`
      }

      const campaignData = {
        ...allowedFields,
        title: autoTitle,
        reward_points: parseInt(campaignForm.reward_points) || 0,
        total_slots: parseInt(campaignForm.total_slots) || 0,
        remaining_slots: parseInt(campaignForm.remaining_slots) || parseInt(campaignForm.total_slots) || 0,
        questions: questions.length > 0 ? questions : null,
        target_platforms: Array.isArray(campaignForm.target_platforms) && campaignForm.target_platforms.length > 0 ? campaignForm.target_platforms : null,
        company_id: currentUser.id,
        company_email: userEmail
      }

      const client = supabaseKorea || supabaseBiz
      if (editId) {
        // 수정 모드: 포인트 차감 없이 수정만 진행
        const { error: updateError } = await client
          .from('campaigns')
          .update(campaignData)
          .eq('id', editId)

        if (updateError) throw updateError

        setSuccess('캠페인이 수정되었습니다!')
      } else {
        // 신규 생성 모드
        const { data: insertData, error: insertError } = await client
          .from('campaigns')
          .insert([{
            ...campaignData,
            status: 'draft'
          }])
          .select()
          .single()

        if (insertError) throw insertError

        const campaignId = insertData.id
        console.log('[CreateCampaign] Campaign created with ID:', campaignId)

        // 포인트 시스템 제거: 모든 결제는 계좌이체로 진행
        // 입금 확인 요청은 InvoicePage에서 세금계산서 신청 시에만 생성
        setSuccess(`캐페인이 생성되었습니다! 크리에이터 가이드를 작성해주세요.`)
        
        // 캐페인 타입에 따라 적절한 가이드 페이지로 이동
        setTimeout(() => {
          if (campaignForm.campaign_type === 'oliveyoung') {
            navigate(`/company/campaigns/guide/oliveyoung?id=${campaignId}`)
          } else if (campaignForm.campaign_type === '4week_challenge') {
            navigate(`/company/campaigns/guide/4week?id=${campaignId}`)
          } else {
            navigate(`/company/campaigns/guide?id=${campaignId}`)
          }
        }, 1500)
        return
      }

      // 수정 모드일 경우 가이드 수정 페이지로 이동
      setSuccess('캠페인이 수정되었습니다! 가이드를 확인해주세요.')
      setTimeout(() => {
        if (campaignForm.campaign_type === 'oliveyoung') {
          navigate(`/company/campaigns/guide/oliveyoung?id=${editId}`)
        } else if (campaignForm.campaign_type === '4week_challenge') {
          navigate(`/company/campaigns/guide/4week?id=${editId}`)
        } else {
          navigate(`/company/campaigns/guide?id=${editId}`)
        }
      }, 1500)
    } catch (err) {
      console.error('캠페인 저장 실패:', err)
      // Supabase 에러 객체 처리
      const errorMessage = err?.message || err?.error?.message || err?.details || JSON.stringify(err)
      setError('캠페인 저장에 실패했습니다: ' + errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 세금계산서 정보 미완료 경고 배너 */}
      {showTaxInvoiceWarning && !taxInvoiceComplete && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-amber-800 font-semibold">세금계산서 발행 정보를 입력해주세요</h3>
                <p className="text-amber-700 text-sm mt-1">
                  캠페인을 생성하려면 먼저 세금계산서 발행 정보(대표자명, 업태, 종목, 사업장 주소)를 입력해야 합니다.
                </p>
                <Button
                  onClick={() => navigate('/company/profile/edit')}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white"
                  size="sm"
                >
                  프로필 수정하기 →
                </Button>
              </div>
              <button
                onClick={() => setShowTaxInvoiceWarning(false)}
                className="flex-shrink-0 text-amber-500 hover:text-amber-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 캠페인 타입 선택 */}
      <div className="bg-gray-50 py-8 lg:py-12">
        {/* 뒤로가기 */}
        <div className="max-w-6xl mx-auto px-4 lg:px-8 mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (editId) {
                // 수정 모드일 때는 해당 캠페인 상세 페이지로 이동
                navigate(`/company/campaigns/${editId}`)
              } else {
                navigate('/company/campaigns')
              }
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            ← {editId ? '캠페인으로 돌아가기' : '캠페인 목록으로'}
          </Button>
        </div>

        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">뷰티 브랜드를 위한 3가지 캠페인</h1>
          <p className="text-gray-500 text-sm lg:text-base">데이터 기반 AI 매칭으로 성과를 만들어드립니다.</p>
        </div>

        {/* 캠페인 타입 카드들 */}
        <div className="px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-6xl mx-auto">
            {/* 올영세일 캠페인 - 왼쪽 */}
            <div
              className={`relative bg-white rounded-xl border-2 p-5 lg:p-6 transition-all cursor-pointer flex flex-col ${
                campaignForm.campaign_type === 'oliveyoung'
                  ? 'border-pink-500 shadow-lg ring-2 ring-pink-100'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'oliveyoung', is_oliveyoung_sale: true }))}
            >
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900 mb-1">올영세일 패키지</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl lg:text-3xl font-bold text-gray-900">₩400,000</span>
                  <span className="text-gray-500 text-sm">/건</span>
                </div>
                <p className="text-gray-500 text-xs mt-2 leading-relaxed">세일 기간 집중 트래픽과 구매 전환을 유도하는 실속형 패키지</p>
              </div>

              <button
                type="button"
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all mb-4 ${
                  campaignForm.campaign_type === 'oliveyoung'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                선택하기
              </button>

              <ul className="space-y-2 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>3단계 콘텐츠 (리뷰→홍보→당일)</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>구매 전환 유도형 기획</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>SNS 업로드 URL 3개</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>원본 영상 파일 제공</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>2차 활용 및 파트너코드</span>
                </li>
              </ul>
            </div>

            {/* 기획형 캠페인 - 가운데 인기 */}
            <div
              className={`relative bg-white rounded-xl border-2 p-5 lg:p-6 transition-all cursor-pointer flex flex-col ${
                campaignForm.campaign_type === 'planned'
                  ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-100'
                  : 'border-indigo-600 hover:shadow-md'
              }`}
              onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'planned', is_oliveyoung_sale: false }))}
            >
              {/* 인기 배지 */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <span>✨</span> 인기
                </span>
              </div>

              <div className="mb-4 pt-2">
                <h3 className="text-base font-bold text-indigo-600 mb-1">기획형 캠페인</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl lg:text-3xl font-bold text-gray-900">₩200,000</span>
                  <span className="text-gray-500 text-sm">/건</span>
                </div>
                <p className="text-gray-500 text-xs mt-2 leading-relaxed">합리적인 비용으로 전문적인 숏폼 기획을 시작하고 싶은 브랜드</p>
              </div>

              <button
                type="button"
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all mb-4 ${
                  campaignForm.campaign_type === 'planned'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                선택하기
              </button>

              <ul className="space-y-2 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>브랜드 맞춤 시나리오 기획</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>촬영 가이드라인 제공</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>AI 크리에이터 매칭</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>SNS 업로드 URL 1개</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>2차 활용 및 파트너코드</span>
                </li>
              </ul>
            </div>

            {/* 4주 챌린지 */}
            <div
              className={`relative bg-white rounded-xl border-2 p-5 lg:p-6 transition-all cursor-pointer flex flex-col ${
                campaignForm.campaign_type === '4week_challenge'
                  ? 'border-purple-500 shadow-lg ring-2 ring-purple-100'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: '4week_challenge', is_oliveyoung_sale: false }))}
            >
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900 mb-1">4주 챌린지</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl lg:text-3xl font-bold text-gray-900">₩600,000</span>
                  <span className="text-gray-500 text-sm">/건</span>
                </div>
                <p className="text-gray-500 text-xs mt-2 leading-relaxed">진정성 있는 리뷰와 장기적인 바이럴 효과를 위한 프리미엄 플랜</p>
              </div>

              <button
                type="button"
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all mb-4 ${
                  campaignForm.campaign_type === '4week_challenge'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                선택하기
              </button>

              <ul className="space-y-2 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>주차별 미션 (총 4편 제작)</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>Before & After 변화 기록</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>SNS 업로드 URL 4개</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>2차 활용 및 파트너코드</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 캠페인 상세 설정 폼 - 전체 너비 */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-12">
          <form id="campaign-form" onSubmit={handleSubmit}>
            {/* 이전 캠페인 선택 모달 - 모든 캠페인 타입에서 공통 사용 */}
            {showPreviousCampaigns && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[70vh] overflow-hidden shadow-xl">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">이전 캠페인에서 불러오기</h3>
                    <button type="button" onClick={() => setShowPreviousCampaigns(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[50vh]">
                    {loadingPrevious ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      </div>
                    ) : previousCampaigns.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">이전 캠페인이 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {previousCampaigns.map(campaign => (
                          <button
                            type="button"
                            key={campaign.id}
                            onClick={() => loadFromPreviousCampaign(campaign.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                          >
                            {campaign.image_url ? (
                              <img src={campaign.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{campaign.product_name || '제품명 없음'}</p>
                              <p className="text-sm text-gray-500 truncate">{campaign.brand || '브랜드 없음'}</p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(campaign.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 기획형 캠페인 - 2컬럼 레이아웃 (폼 + 견적서) */}
            {campaignForm.campaign_type === 'planned' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 왼쪽: 모든 폼 필드 */}
                <div className="lg:col-span-2 space-y-8">
                  {/* 패키지 선택 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">캠페인 옵션 선택</h2>
                    <p className="text-gray-500 mb-6">예산에 따라 지원하는 크리에이터의 퀄리티와 지원율이 달라집니다.</p>

                    {/* 크리에이터 등급 (단가) */}
                    <div className="mb-8">
                      <Label className="text-sm font-semibold text-gray-700 mb-4 block">크리에이터 등급 (단가)</Label>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {packageOptions.map((pkg) => (
                          <div
                            key={pkg.value}
                            onClick={() => handlePackageChange(pkg.value)}
                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              campaignForm.package_type === pkg.value
                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            {pkg.value === 'standard' && (
                              <span className="absolute -top-2.5 right-3 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded">BEST</span>
                            )}
                            <div className={`text-sm font-medium mb-1 ${campaignForm.package_type === pkg.value ? 'text-indigo-600' : 'text-gray-600'}`}>
                              {pkg.label}
                            </div>
                            <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                              {pkg.price.toLocaleString()}원
                            </div>
                            <div className="space-y-1 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                <span>팔로워 {pkg.description.replace('인스타그램 기준: ', '')}</span>
                              </div>
                              {pkg.value === 'standard' && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                  <span>기획형 숏폼</span>
                                </div>
                              )}
                              {pkg.value === 'premium' && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                  <span>구매 전환 유도</span>
                                </div>
                              )}
                              {(pkg.value === 'professional' || pkg.value === 'enterprise') && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                  <span>{pkg.value === 'enterprise' ? 'TVC급 영상미' : '팔로워 30만+'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* 모집 인원 슬라이더 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold text-gray-700">모집 인원 (명)</Label>
                        <span className="text-indigo-600 font-bold text-lg">{campaignForm.total_slots}명</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={campaignForm.total_slots}
                          onChange={(e) => handleSlotsChange(parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex items-center border rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => handleSlotsChange(Math.max(1, campaignForm.total_slots - 1))}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg text-lg"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={campaignForm.total_slots}
                            onChange={(e) => handleSlotsChange(parseInt(e.target.value) || 1)}
                            className="w-16 text-center border-x py-2"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() => handleSlotsChange(campaignForm.total_slots + 1)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg text-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* AI 예상 지원자 수 배너 */}
                      <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-indigo-600">AI 예측:</span>{' '}
                            현재 설정하신 단가와 인원이라면, 약{' '}
                            <span className="font-bold text-indigo-700">
                              {campaignForm.package_type === 'basic' && '5~10명'}
                              {campaignForm.package_type === 'standard' && '15~25명'}
                              {campaignForm.package_type === 'premium' && '25~40명'}
                              {campaignForm.package_type === 'professional' && '40~60명'}
                              {campaignForm.package_type === 'enterprise' && '60~100명'}
                              {!campaignForm.package_type && '10~20명'}
                              {' '}이상의 크리에이터
                            </span>
                            가 지원할 것으로 예상됩니다.
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            (지원율 매우 높음)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 브랜드/참여조건 섹션 */}
                  <div ref={brandInfoRef} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </span>
                        브랜드 정보
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPreviousCampaigns(true)
                          loadPreviousCampaigns()
                        }}
                        className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <History className="w-4 h-4" />
                        이전 캠페인에서 불러오기
                      </Button>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="brand" className="text-sm font-medium text-gray-700 mb-2 block">브랜드명 <span className="text-red-500">*</span></Label>
                        <Input
                          id="brand"
                          value={campaignForm.brand}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="예: 에이블씨엔씨"
                          required
                          className="h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="requirements" className="text-sm font-medium text-gray-700 mb-2 block">참여 조건</Label>
                        <Textarea
                          id="requirements"
                          value={campaignForm.requirements}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, requirements: e.target.value }))}
                          placeholder="예: 피부 트러블이 있으신분, 아이와 같이 출연 가능하신분, 속건조가 심하신분"
                          rows={3}
                          className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 resize-none"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">모집 채널 <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(여러 개 선택 가능)</span></Label>
                        <div className="flex flex-wrap gap-3">
                          {categoryOptions.map(opt => (
                            <label
                              key={opt.value}
                              className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                campaignForm.category.includes(opt.value)
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={campaignForm.category.includes(opt.value)}
                                onChange={() => handleCategoryToggle(opt.value)}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                              <span className={campaignForm.category.includes(opt.value) ? 'text-indigo-600' : 'text-gray-500'}>
                                {opt.icon}
                              </span>
                              <span className="font-medium">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {campaignForm.category.length === 0 && (
                          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            최소 1개 이상 선택해주세요
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 스케줄 설정 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </span>
                      스케줄 설정
                    </h3>

                    {/* 자동 추천 안내 배너 */}
                    <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-700 flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span><strong>스케줄 자동 추천:</strong> 모집 마감일만 입력하면 나머지 일정이 자동으로 계산됩니다. (수정 가능)</span>
                      </p>
                    </div>

                    <div className="space-y-5">
                      {/* 모집 마감일 */}
                      <div>
                        <Label htmlFor="application_deadline" className="text-sm font-medium text-gray-700 mb-2 block">모집 마감일 <span className="text-red-500">*</span></Label>
                        <Input
                          id="application_deadline"
                          type="date"
                          value={campaignForm.application_deadline}
                          onChange={(e) => autoCalculateSchedule(e.target.value)}
                          required
                          className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>

                      {/* 제품 발송 예정일 */}
                      <div>
                        <Label htmlFor="shipping_date" className="text-sm font-medium text-gray-700 mb-2 block">
                          제품 발송 예정일
                          {campaignForm.application_deadline && (
                            <span className="ml-2 text-xs text-emerald-600 font-normal">(모집 마감일 +2일)</span>
                          )}
                        </Label>
                        <Input
                          id="shipping_date"
                          type="date"
                          value={campaignForm.shipping_date}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, shipping_date: e.target.value }))}
                          className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 촬영&업로드 마감일 */}
                        <div>
                          <Label htmlFor="start_date" className="text-sm font-medium text-gray-700 mb-2 block">
                            촬영&업로드 마감일 <span className="text-red-500">*</span>
                            {campaignForm.shipping_date && (
                              <span className="ml-2 text-xs text-emerald-600 font-normal">(발송일 +10일)</span>
                            )}
                          </Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={campaignForm.start_date}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, start_date: e.target.value }))}
                            required
                            className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                        {/* SNS 업로드일 */}
                        <div>
                          <Label htmlFor="end_date" className="text-sm font-medium text-gray-700 mb-2 block">
                            SNS 업로드일 <span className="text-red-500">*</span>
                            {campaignForm.start_date && (
                              <span className="ml-2 text-xs text-emerald-600 font-normal">(촬영마감 +2일)</span>
                            )}
                          </Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={campaignForm.end_date}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, end_date: e.target.value }))}
                            required
                            className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* 자동 계산된 일정 요약 */}
                      {campaignForm.application_deadline && campaignForm.shipping_date && campaignForm.start_date && campaignForm.end_date && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">📅 일정 요약</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              모집 마감: {campaignForm.application_deadline}
                            </span>
                            <span className="text-gray-300">→</span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              제품 발송: {campaignForm.shipping_date}
                            </span>
                            <span className="text-gray-300">→</span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              촬영 마감: {campaignForm.start_date}
                            </span>
                            <span className="text-gray-300">→</span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              SNS 업로드: {campaignForm.end_date}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 캠페인 썸네일 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </span>
                      캠페인 썸네일
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 ml-10">캠페인 목록에 표시될 대표 이미지</p>

                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => thumbnailInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-pink-400 hover:bg-pink-50/50 ${
                        campaignForm.image_url ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-500">업로드 중...</span>
                        </div>
                      ) : campaignForm.image_url ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={campaignForm.image_url} alt="썸네일" className="max-h-40 rounded-lg shadow-sm" />
                          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            클릭하여 이미지 변경
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </div>
                          <span className="text-sm text-gray-500">클릭하여 이미지 업로드</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 상품 상세 정보 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </span>
                      상품 정보 입력
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 ml-10">URL만 입력하면 상품 정보를 자동으로 가져옵니다</p>

                    <div className="space-y-5">
                      {/* URL 입력 및 크롤링 */}
                      <div>
                        <Label htmlFor="product_link" className="text-sm font-medium text-gray-700 mb-2 block">상품 URL</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <Input
                              id="product_link"
                              type="url"
                              value={campaignForm.product_link}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_link: e.target.value }))}
                              placeholder="https://www.oliveyoung.co.kr/store/goods/..."
                              className="h-12 pl-10 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={crawlProductUrl}
                            disabled={isCrawling || !campaignForm.product_link}
                            className="h-12 px-4 whitespace-nowrap border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            {isCrawling ? (
                              <>
                                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                가져오는 중...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                정보 가져오기
                              </>
                            )}
                          </Button>
                        </div>
                        {crawlError && (
                          <p className={`text-xs mt-2 ${crawlError.includes('수동으로') ? 'text-amber-600' : 'text-red-500'}`}>
                            {crawlError.includes('수동으로') ? '⚠️' : '❌'} {crawlError}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">💡 자사몰 url만 가능합니다.</p>
                      </div>

                      {/* 크롤링된 정보 표시 또는 수동 입력 */}
                      {(campaignForm.product_name || campaignForm.image_url) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex gap-4">
                            {/* 상품 이미지 */}
                            {campaignForm.image_url && (
                              <div className="flex-shrink-0">
                                <img
                                  src={campaignForm.image_url}
                                  alt="상품 이미지"
                                  className="w-24 h-24 rounded-lg object-cover border border-amber-200"
                                />
                              </div>
                            )}
                            {/* 상품 정보 */}
                            <div className="flex-1 space-y-1">
                              {campaignForm.product_name && (
                                <p className="font-semibold text-gray-900">{campaignForm.product_name}</p>
                              )}
                              {campaignForm.product_price && (
                                <p className="text-lg font-bold text-amber-700">{Number(campaignForm.product_price).toLocaleString()}원</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 제품명 & 제품가격 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="product_name" className="text-sm font-medium text-gray-700 mb-2 block">제품명</Label>
                          <Input
                            id="product_name"
                            value={campaignForm.product_name}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, product_name: e.target.value }))}
                            placeholder="예: 에이블씨엔씨 립스틱 #01 코랄핑크"
                            className="h-12 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="product_price" className="text-sm font-medium text-gray-700 mb-2 block">제품 가격</Label>
                          <div className="relative">
                            <Input
                              id="product_price"
                              type="number"
                              value={campaignForm.product_price}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_price: e.target.value }))}
                              placeholder="29000"
                              className="h-12 border-gray-200 focus:border-amber-500 focus:ring-amber-500 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                          </div>
                        </div>
                      </div>

                      {/* 상품 상세 페이지 이미지 */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">상품 상세 페이지 이미지</Label>
                        <p className="text-xs text-gray-500 mb-3">상품 상세 정보가 담긴 이미지 파일을 업로드하세요 (권장: 10MB 이하)</p>
                        <input
                          ref={detailImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProductDetailImageUpload}
                          className="hidden"
                        />
                        <div
                          onClick={() => detailImageInputRef.current?.click()}
                          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/50 ${
                            campaignForm.product_detail_file_url ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                        >
                          {uploadingDetailImage ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-gray-500">업로드 중...</span>
                            </div>
                          ) : campaignForm.product_detail_file_url ? (
                            <div className="flex flex-col items-center gap-3">
                              <img
                                src={campaignForm.product_detail_file_url}
                                alt="상품 상세"
                                className="max-h-48 rounded-lg shadow-sm"
                              />
                              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                클릭하여 이미지 변경
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="text-sm text-gray-500">클릭하여 이미지 업로드</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 상태 안내 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    </span>
                    <p className="text-sm text-blue-800">
                      캠페인은 "<strong className="text-blue-900">임시저장</strong>" 상태로 저장됩니다.
                      저장 후 캠페인 목록에서 <strong className="text-blue-900">"승인 요청하기"</strong>를 누르면 관리자가 검토합니다.
                    </p>
                  </div>

                  {/* 질문 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                        지원자 질문
                        <span className="text-sm font-normal text-gray-400">(선택사항)</span>
                      </h3>
                      {questionCount < 4 && (
                        <Button
                          type="button"
                          className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-md"
                          onClick={() => setQuestionCount(prev => Math.min(prev + 1, 4))}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          질문 추가
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-5 ml-10">지원자에게 물어볼 질문을 최대 4개까지 추가할 수 있습니다.</p>

                    <div className="space-y-4">
                      {questionCount >= 1 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Label htmlFor="question1" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                            <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">1</span>
                            질문 1
                          </Label>
                          <Textarea
                            id="question1"
                            value={campaignForm.question1}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, question1: e.target.value }))}
                            placeholder="예: 본인의 피부 타입과 주요 피부 고민을 알려주세요."
                            rows={2}
                            className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                          />
                        </div>
                      )}
                      {questionCount >= 2 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Label htmlFor="question2" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                            <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">2</span>
                            질문 2
                          </Label>
                          <Textarea
                            id="question2"
                            value={campaignForm.question2}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, question2: e.target.value }))}
                            placeholder="예: 평소 사용하는 스킨케어 제품을 알려주세요."
                            rows={2}
                            className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                          />
                        </div>
                      )}
                      {questionCount >= 3 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Label htmlFor="question3" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                            <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">3</span>
                            질문 3
                          </Label>
                          <Textarea
                            id="question3"
                            value={campaignForm.question3}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, question3: e.target.value }))}
                            placeholder="예: 이 캠페인에 지원한 이유를 알려주세요."
                            rows={2}
                            className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                          />
                        </div>
                      )}
                      {questionCount >= 4 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Label htmlFor="question4" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                            <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">4</span>
                            질문 4
                          </Label>
                          <Textarea
                            id="question4"
                            value={campaignForm.question4}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, question4: e.target.value }))}
                            placeholder="예: 콘텐츠 제작 시 중점적으로 다루고 싶은 부분이 있나요?"
                            rows={2}
                            className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 에러/성공 메시지 */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                      {success}
                    </div>
                  )}

                  {/* 버튼 - 모바일에서만 표시 */}
                  <div className="flex gap-4 lg:hidden">
                    <Button
                      type="submit"
                      disabled={processing || campaignForm.category.length === 0}
                      className="flex-1 py-6 text-lg bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
                    >
                      {processing ? '저장 중...' : (editId ? '수정하기' : '다음단계')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/company/campaigns')} className="py-6">
                      취소
                    </Button>
                  </div>
                </div>

                {/* 오른쪽: 예상 견적서 (Sticky) */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="text-xl">📋</span> 예상 견적서
                      </h3>

                      {/* AI 지원율 예측 */}
                      <div className="bg-slate-800 rounded-xl p-4 mb-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                            ✨
                          </div>
                          <div className="flex-1">
                            <div className="text-indigo-300 text-xs font-medium mb-1">AI 지원율 예측</div>
                            <div className="text-sm leading-relaxed">
                              선택하신 단가로는
                              <br />
                              평균 <span className="text-indigo-400 font-bold text-lg">{packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.instagram || '15~20'}명+</span>의 크리에이터가
                              <br />
                              지원할 것으로 예상됩니다.
                            </div>
                          </div>
                        </div>

                        {/* 크리에이터 특성 표시 */}
                        {(() => {
                          const selectedPkg = packageOptions.find(p => p.value === campaignForm.package_type)
                          if (!selectedPkg) return null
                          return (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-400">예상 크리에이터 수준</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                      key={level}
                                      className={`w-2 h-2 rounded-full ${
                                        level <= selectedPkg.qualityLevel
                                          ? 'bg-gradient-to-r from-indigo-400 to-purple-400'
                                          : 'bg-slate-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                                  팔로워 {selectedPkg.followerRange}
                                </span>
                                {selectedPkg.characteristics.map((char, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                                    {char}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (packageOptions.findIndex(p => p.value === campaignForm.package_type) + 1) * 20)}%` }}
                          />
                        </div>
                      </div>

                      {/* 견적 상세 */}
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">단가 ({packageOptions.find(p => p.value === campaignForm.package_type)?.label})</span>
                          <span>{(packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">인원</span>
                          <span>x {campaignForm.total_slots}명</span>
                        </div>
                        <div className="border-t border-slate-700 pt-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">공급가액</span>
                            <span>{((packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0) * campaignForm.total_slots).toLocaleString()}원</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">부가세 (10%)</span>
                          <span>{Math.round((packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0) * campaignForm.total_slots * 0.1).toLocaleString()}원</span>
                        </div>
                      </div>

                      {/* 총 결제 금액 */}
                      <div className="mt-5 pt-4 border-t border-slate-700">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-gray-400">총 결제 금액</span>
                        </div>
                        <div className="text-right">
                          <span className="text-4xl font-bold">{campaignForm.estimated_cost.toLocaleString()}</span>
                          <span className="text-xl ml-1">원</span>
                        </div>
                      </div>

                      {/* 버튼 - 데스크탑에서만 표시 */}
                      <div className="hidden lg:block mt-6 space-y-3">
                        <Button
                          type="submit"
                          disabled={processing || campaignForm.category.length === 0}
                          className="w-full py-6 text-lg bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold"
                        >
                          {processing ? '저장 중...' : (editId ? '수정하기' : '캠페인 시작하기')}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/company/campaigns')} className="w-full py-4 bg-transparent border-slate-600 text-gray-300 hover:bg-slate-800">
                          취소
                        </Button>
                      </div>

                      {/* 안내 문구 */}
                      <p className="text-xs text-gray-500 mt-4 text-center">
                        * 세금계산서 발행 가능 / 카드 결제 지원
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 올리브영 캠페인 - 2컬럼 레이아웃 (기획형과 동일한 스타일) */}
            {campaignForm.campaign_type === 'oliveyoung' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 왼쪽: 모든 폼 필드 */}
                <div className="lg:col-span-2 space-y-8">
                  {/* 패키지 선택 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">캠페인 옵션 선택</h2>
                    <p className="text-gray-500 mb-6">올리브영 캠페인 타입과 모집 인원을 선택하세요.</p>

                    {/* 올리브영 패키지 타입 선택 */}
                    <div className="mb-8">
                      <Label className="text-sm font-semibold text-gray-700 mb-4 block">패키지 타입 선택</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 올영픽 */}
                        <div
                          onClick={() => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: 'pick' }))}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            campaignForm.oliveyoung_subtype === 'pick'
                              ? 'border-amber-500 bg-amber-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className={`text-sm font-medium mb-1 ${campaignForm.oliveyoung_subtype === 'pick' ? 'text-amber-600' : 'text-gray-600'}`}>
                            올영픽
                          </div>
                          <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                            400,000원
                          </div>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              <span>인기 상품 추천</span>
                            </div>
                          </div>
                        </div>

                        {/* 올영세일 */}
                        <div
                          onClick={() => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: 'sale' }))}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            campaignForm.oliveyoung_subtype === 'sale'
                              ? 'border-pink-500 bg-pink-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <span className="absolute -top-2.5 right-3 bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded">BEST</span>
                          <div className={`text-sm font-medium mb-1 ${campaignForm.oliveyoung_subtype === 'sale' ? 'text-pink-600' : 'text-gray-600'}`}>
                            올영세일
                          </div>
                          <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                            400,000원
                          </div>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              <span>세일 기간 집중</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              <span>3단계 콘텐츠</span>
                            </div>
                          </div>
                        </div>

                        {/* 오특 */}
                        <div
                          onClick={() => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: 'special' }))}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            campaignForm.oliveyoung_subtype === 'special'
                              ? 'border-orange-500 bg-orange-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className={`text-sm font-medium mb-1 ${campaignForm.oliveyoung_subtype === 'special' ? 'text-orange-600' : 'text-gray-600'}`}>
                            오특
                          </div>
                          <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                            400,000원
                          </div>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              <span>핫딜 프로모션</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 모집 인원 슬라이더 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold text-gray-700">모집 인원 (명)</Label>
                        <span className="text-pink-600 font-bold text-lg">{campaignForm.oliveyoung_recruit_count || 1}명</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={campaignForm.oliveyoung_recruit_count || 1}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, oliveyoung_recruit_count: parseInt(e.target.value), total_slots: parseInt(e.target.value), remaining_slots: parseInt(e.target.value) }))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                        />
                        <div className="flex items-center border rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              const newVal = Math.max(1, (campaignForm.oliveyoung_recruit_count || 1) - 1)
                              setCampaignForm(prev => ({ ...prev, oliveyoung_recruit_count: newVal, total_slots: newVal, remaining_slots: newVal }))
                            }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg text-lg"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={campaignForm.oliveyoung_recruit_count || 1}
                            onChange={(e) => {
                              const newVal = parseInt(e.target.value) || 1
                              setCampaignForm(prev => ({ ...prev, oliveyoung_recruit_count: newVal, total_slots: newVal, remaining_slots: newVal }))
                            }}
                            className="w-16 text-center border-x py-2"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newVal = (campaignForm.oliveyoung_recruit_count || 1) + 1
                              setCampaignForm(prev => ({ ...prev, oliveyoung_recruit_count: newVal, total_slots: newVal, remaining_slots: newVal }))
                            }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg text-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {/* AI 예측 */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">⚡</span>
                          <span className="text-sm">
                            <span className="font-semibold text-indigo-600">AI 지원율 예측:</span>{' '}
                            이 캠페인은 평균{' '}
                            <span className="font-bold text-indigo-600">
                              {10 + Math.floor((campaignForm.bonus_amount || 0) / 100000) * 5}-{20 + Math.floor((campaignForm.bonus_amount || 0) / 100000) * 10}명
                            </span>
                            의 크리에이터가 지원합니다.
                          </span>
                        </div>

                        {/* 지원율 높이기 옵션 */}
                        <div className="bg-white/70 rounded-lg p-3 mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">지원율 높이기</span>
                            {campaignForm.bonus_amount > 0 && (
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                +{((campaignForm.bonus_amount / 100000) * 5)}-{((campaignForm.bonus_amount / 100000) * 10)}명 증가 예상
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCampaignForm(prev => ({ ...prev, bonus_amount: Math.max(0, (prev.bonus_amount || 0) - 100000) }))}
                              className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
                              disabled={campaignForm.bonus_amount <= 0}
                            >
                              -
                            </button>
                            <div className="flex-1 text-center">
                              <span className="text-lg font-bold text-indigo-600">
                                +{(campaignForm.bonus_amount || 0).toLocaleString()}원
                              </span>
                              <p className="text-xs text-gray-500">10만원 단위</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCampaignForm(prev => ({ ...prev, bonus_amount: (prev.bonus_amount || 0) + 100000 }))}
                              className="w-10 h-10 flex items-center justify-center border border-indigo-400 rounded-lg text-indigo-600 hover:bg-indigo-50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 스케줄 설정 - 3단계 콘텐츠 업로드 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">📅</span>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">스케줄 설정</h2>
                    </div>

                    {/* 자동 추천 안내 */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6">
                      <p className="text-sm text-emerald-700">
                        <span className="font-semibold">ℹ️ 스케줄 자동 추천:</span> 제품 발송 예정일을 입력하면 3단계 콘텐츠 업로드 일정이 자동으로 계산됩니다. (수정 가능)
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* 모집 마감일 */}
                      <div>
                        <Label className="font-semibold text-gray-700">모집 마감일 *</Label>
                        <Input
                          type="date"
                          value={campaignForm.application_deadline}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                          className="mt-1"
                          required
                        />
                      </div>

                      {/* 제품 발송 예정일 */}
                      <div>
                        <Label className="font-semibold text-gray-700">제품 발송 예정일 *</Label>
                        <Input
                          type="date"
                          value={campaignForm.shipping_date}
                          onChange={(e) => {
                            const shippingDate = new Date(e.target.value)
                            // STEP 1: 제품 발송 후 7일 (상품 리뷰 영상)
                            const step1 = new Date(shippingDate)
                            step1.setDate(step1.getDate() + 7)
                            // STEP 2: STEP 1 후 5일 (프로모션 홍보 영상)
                            const step2 = new Date(step1)
                            step2.setDate(step2.getDate() + 5)
                            // STEP 3: STEP 2 후 3일 (프로모션 당일 스토리)
                            const step3 = new Date(step2)
                            step3.setDate(step3.getDate() + 3)

                            setCampaignForm(prev => ({
                              ...prev,
                              shipping_date: e.target.value,
                              step1_deadline: step1.toISOString().split('T')[0],
                              step2_deadline: step2.toISOString().split('T')[0],
                              step3_deadline: step3.toISOString().split('T')[0]
                            }))
                          }}
                          className="mt-1"
                          required
                        />
                      </div>

                      {/* 3단계 콘텐츠 업로드 스케줄 */}
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg">🎬</span>
                          <span className="font-semibold text-gray-700">3단계 콘텐츠 업로드 스케줄</span>
                        </div>

                        <div className="space-y-4">
                          {/* STEP 1 */}
                          <div className="border border-pink-200 rounded-xl p-4 bg-pink-50/50">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-pink-500 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                                1
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-800">상품 리뷰 영상</span>
                                  <span className="text-xs text-pink-600 bg-pink-100 px-2 py-0.5 rounded">발송일 +7일</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">제품을 받고 사용 후 솔직한 리뷰 영상 업로드 (1회)</p>
                                <Input
                                  type="date"
                                  value={campaignForm.step1_deadline}
                                  onChange={(e) => setCampaignForm(prev => ({ ...prev, step1_deadline: e.target.value }))}
                                  className="mt-1 bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* STEP 2 */}
                          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-purple-500 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                                2
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-800">세일 구매 유도 영상</span>
                                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">STEP1 +5일</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">"진짜 좋아서 올영세일/할인행사에 산다"는 구매 유도 영상 (1회)</p>
                                <Input
                                  type="date"
                                  value={campaignForm.step2_deadline}
                                  onChange={(e) => setCampaignForm(prev => ({ ...prev, step2_deadline: e.target.value }))}
                                  className="mt-1 bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* STEP 3 */}
                          <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                                3
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-800">프로모션 당일 스토리</span>
                                  <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">프로모션 당일</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">인스타그램 스토리 + 프로모션 링크 URL 홍보 (1회)</p>
                                <Input
                                  type="date"
                                  value={campaignForm.step3_deadline}
                                  onChange={(e) => setCampaignForm(prev => ({ ...prev, step3_deadline: e.target.value }))}
                                  className="mt-1 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 일정 요약 */}
                      {campaignForm.application_deadline && campaignForm.shipping_date && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm">📋</span>
                            <span className="font-semibold text-gray-700">일정 요약</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              <span className="text-gray-600">모집 마감:</span>
                              <span className="font-medium">{campaignForm.application_deadline}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              <span className="text-gray-600">제품 발송:</span>
                              <span className="font-medium">{campaignForm.shipping_date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                              <span className="text-gray-600">STEP 1 (상품 리뷰 영상):</span>
                              <span className="font-medium">{campaignForm.step1_deadline}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              <span className="text-gray-600">STEP 2 (세일 구매 유도):</span>
                              <span className="font-medium">{campaignForm.step2_deadline}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="text-gray-600">STEP 3 (프로모션 스토리):</span>
                              <span className="font-medium">{campaignForm.step3_deadline}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 브랜드 정보 - 기획형과 동일한 스타일 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </span>
                        브랜드 정보
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPreviousCampaigns(true)
                          loadPreviousCampaigns()
                        }}
                        className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <History className="w-4 h-4" />
                        이전 캠페인에서 불러오기
                      </Button>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="brand_oly" className="text-sm font-medium text-gray-700 mb-2 block">브랜드명 <span className="text-red-500">*</span></Label>
                        <Input
                          id="brand_oly"
                          value={campaignForm.brand}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="예: 에이블씨엔씨"
                          required
                          className="h-12 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="requirements_oly" className="text-sm font-medium text-gray-700 mb-2 block">참여 조건</Label>
                        <Textarea
                          id="requirements_oly"
                          value={campaignForm.requirements}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, requirements: e.target.value }))}
                          placeholder="예: 피부 트러블이 있으신분, 아이와 같이 출연 가능하신분, 속건조가 심하신분"
                          rows={3}
                          className="border-gray-200 focus:border-pink-500 focus:ring-pink-500 resize-none"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">모집 채널 <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(여러 개 선택 가능)</span></Label>
                        <div className="flex flex-wrap gap-3">
                          {categoryOptions.map(opt => (
                            <label
                              key={opt.value}
                              className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                campaignForm.category.includes(opt.value)
                                  ? 'border-pink-500 bg-pink-50 text-pink-700'
                                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={campaignForm.category.includes(opt.value)}
                                onChange={() => handleCategoryToggle(opt.value)}
                                className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500"
                              />
                              <span className={campaignForm.category.includes(opt.value) ? 'text-pink-600' : 'text-gray-500'}>
                                {opt.icon}
                              </span>
                              <span className="font-medium">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {campaignForm.category.length === 0 && (
                          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            최소 1개 이상 선택해주세요
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 캠페인 썸네일 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </span>
                      캠페인 썸네일
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 ml-10">캠페인 목록에 표시될 대표 이미지</p>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      id="oliveyoung-thumbnail-input"
                    />
                    <div
                      onClick={() => document.getElementById('oliveyoung-thumbnail-input')?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-pink-400 hover:bg-pink-50/50 ${
                        campaignForm.image_url ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-500">업로드 중...</span>
                        </div>
                      ) : campaignForm.image_url ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={campaignForm.image_url} alt="썸네일" className="max-h-40 rounded-lg shadow-sm" />
                          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            클릭하여 이미지 변경
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </div>
                          <span className="text-sm text-gray-500">클릭하여 이미지 업로드</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 상품 정보 입력 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </span>
                      상품 정보 입력
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 ml-10">URL만 입력하면 상품 정보를 자동으로 가져옵니다</p>

                    <div className="space-y-5">
                      {/* URL 입력 및 크롤링 */}
                      <div>
                        <Label htmlFor="product_link_oly" className="text-sm font-medium text-gray-700 mb-2 block">상품 URL</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <Input
                              id="product_link_oly"
                              type="url"
                              value={campaignForm.product_link}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_link: e.target.value }))}
                              placeholder="https://www.oliveyoung.co.kr/store/goods/..."
                              className="h-12 pl-10 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={crawlProductUrl}
                            disabled={isCrawling || !campaignForm.product_link}
                            className="h-12 px-4 whitespace-nowrap border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            {isCrawling ? (
                              <>
                                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                가져오는 중...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                정보 가져오기
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">💡 자사몰 url만 가능합니다.</p>
                      </div>

                      {/* 제품명 & 제품가격 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="product_name_oly" className="text-sm font-medium text-gray-700 mb-2 block">제품명</Label>
                          <Input
                            id="product_name_oly"
                            value={campaignForm.product_name}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, product_name: e.target.value }))}
                            placeholder="예: 에이블씨엔씨 립스틱 #01 코랄핑크"
                            className="h-12 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="product_price_oly" className="text-sm font-medium text-gray-700 mb-2 block">제품 가격</Label>
                          <div className="relative">
                            <Input
                              id="product_price_oly"
                              type="number"
                              value={campaignForm.product_price}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_price: e.target.value }))}
                              placeholder="29000"
                              className="h-12 border-gray-200 focus:border-amber-500 focus:ring-amber-500 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                          </div>
                        </div>
                      </div>

                      {/* 상품 상세 페이지 이미지 */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">상품 상세 페이지 이미지</Label>
                        <p className="text-xs text-gray-500 mb-3">상품 상세 정보가 담긴 이미지 파일을 업로드하세요 (권장: 10MB 이하)</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProductDetailImageUpload}
                          className="hidden"
                          id="oliveyoung-detail-input"
                        />
                        <div
                          onClick={() => document.getElementById('oliveyoung-detail-input')?.click()}
                          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/50 ${
                            campaignForm.product_detail_file_url ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                        >
                          {uploadingDetailImage ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-gray-500">업로드 중...</span>
                            </div>
                          ) : campaignForm.product_detail_file_url ? (
                            <div className="flex flex-col items-center gap-3">
                              <img src={campaignForm.product_detail_file_url} alt="상품 상세" className="max-h-48 rounded-lg shadow-sm" />
                              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                클릭하여 이미지 변경
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="text-sm text-gray-500">클릭하여 이미지 업로드</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 예상 견적서 (Sticky) - 다크 테마 */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="text-xl">📋</span> 예상 견적서
                      </h3>

                      {/* AI 지원율 예측 */}
                      <div className="bg-slate-800 rounded-xl p-4 mb-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                            ✨
                          </div>
                          <div className="flex-1">
                            <div className="text-pink-300 text-xs font-medium mb-1">AI 지원율 예측</div>
                            <div className="text-sm leading-relaxed">
                              이 캠페인은 평균{' '}
                              <span className="text-pink-400 font-bold text-lg">
                                {10 + Math.floor((campaignForm.bonus_amount || 0) / 100000) * 5}-{20 + Math.floor((campaignForm.bonus_amount || 0) / 100000) * 10}명
                              </span>
                              의 크리에이터가 지원합니다.
                            </div>
                          </div>
                        </div>

                        {/* 크리에이터 특성 표시 - 지원율 높이기 금액 기반 */}
                        {(() => {
                          const creatorLevel = getOliveyoungCreatorLevel(campaignForm.bonus_amount)
                          return (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-400">예상 크리에이터 수준</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                      key={level}
                                      className={`w-2 h-2 rounded-full ${
                                        level <= creatorLevel.qualityLevel
                                          ? 'bg-gradient-to-r from-pink-400 to-rose-400'
                                          : 'bg-slate-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded">
                                  팔로워 {creatorLevel.followerRange}
                                </span>
                                {creatorLevel.characteristics.map((char, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded">
                                    {char}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, 50 + ((campaignForm.bonus_amount || 0) / 100000) * 10)}%` }}
                          />
                        </div>
                        {campaignForm.bonus_amount > 0 && (
                          <div className="mt-2 text-xs text-green-400">
                            +{((campaignForm.bonus_amount / 100000) * 5)}-{((campaignForm.bonus_amount / 100000) * 10)}명 지원율 증가 중
                          </div>
                        )}
                      </div>

                      {/* 견적 상세 */}
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">단가 ({campaignForm.oliveyoung_subtype === 'pick' ? '올영픽' : campaignForm.oliveyoung_subtype === 'sale' ? '올영세일' : '오특'})</span>
                          <span>400,000원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">인원</span>
                          <span>x {campaignForm.oliveyoung_recruit_count || 1}명</span>
                        </div>
                        {campaignForm.bonus_amount > 0 && (
                          <div className="flex justify-between text-green-400">
                            <span>지원율 높이기</span>
                            <span>+{(campaignForm.bonus_amount).toLocaleString()}원</span>
                          </div>
                        )}
                        <div className="border-t border-slate-700 pt-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">공급가액</span>
                            <span>{(400000 * (campaignForm.oliveyoung_recruit_count || 1) + (campaignForm.bonus_amount || 0)).toLocaleString()}원</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">부가세 (10%)</span>
                          <span>{Math.round((400000 * (campaignForm.oliveyoung_recruit_count || 1) + (campaignForm.bonus_amount || 0)) * 0.1).toLocaleString()}원</span>
                        </div>
                      </div>

                      {/* 총 결제 금액 */}
                      <div className="mt-5 pt-4 border-t border-slate-700">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-gray-400">총 결제 금액</span>
                        </div>
                        <div className="text-right">
                          <span className="text-4xl font-bold">{Math.round((400000 * (campaignForm.oliveyoung_recruit_count || 1) + (campaignForm.bonus_amount || 0)) * 1.1).toLocaleString()}</span>
                          <span className="text-xl ml-1">원</span>
                        </div>
                      </div>

                      {/* 버튼 */}
                      <div className="hidden lg:block mt-6 space-y-3">
                        <Button
                          type="submit"
                          disabled={processing || campaignForm.category.length === 0}
                          className="w-full py-6 text-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold"
                        >
                          {processing ? '저장 중...' : (editId ? '수정하기' : '캠페인 시작하기')}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/company/campaigns')} className="w-full py-4 bg-transparent border-slate-600 text-gray-300 hover:bg-slate-800">
                          취소
                        </Button>
                      </div>

                      <p className="text-xs text-gray-500 mt-4 text-center">
                        * 세금계산서 발행 가능 / 카드 결제 지원
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4주 챌린지 - 2컬럼 레이아웃 (기획형/올영세일과 동일) */}
            {campaignForm.campaign_type === '4week_challenge' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 왼쪽: 모든 폼 필드 */}
                <div className="lg:col-span-2 space-y-8">
                  {/* 캠페인 옵션 선택 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">4주 챌린지 캠페인 옵션</h2>
                    <p className="text-gray-500 mb-6">4주간 크리에이터가 매주 1회씩 콘텐츠를 업로드합니다.</p>

                    {/* 모집 인원 슬라이더 */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold text-gray-700">모집 인원 (명)</Label>
                        <span className="text-purple-600 font-bold text-lg">{campaignForm.total_slots}명</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={campaignForm.total_slots}
                          onChange={(e) => handleSlotsChange(parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex items-center border rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => handleSlotsChange(Math.max(1, campaignForm.total_slots - 1))}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg text-lg"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={campaignForm.total_slots}
                            onChange={(e) => handleSlotsChange(parseInt(e.target.value) || 1)}
                            className="w-16 text-center border-x py-2"
                            min="1"
                            max="50"
                          />
                          <button
                            type="button"
                            onClick={() => handleSlotsChange(Math.min(50, campaignForm.total_slots + 1))}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg text-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 인센티브 옵션 */}
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-4 block">인센티브 옵션 (지원율 높이기)</Label>
                      <p className="text-xs text-gray-500 mb-3">더 높은 인센티브로 우수 크리에이터의 지원을 유도하세요</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { value: 0, label: '기본', description: '기본 지원율' },
                          { value: 100000, label: '+10만원', description: '지원율 UP', tag: '인기' },
                          { value: 200000, label: '+20만원', description: '지원율 2배', tag: '추천' },
                          { value: 300000, label: '+30만원', description: '탑티어 매칭', tag: 'BEST' }
                        ].map((option) => (
                          <div
                            key={option.value}
                            onClick={() => setCampaignForm(prev => ({ ...prev, bonus_amount: option.value }))}
                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              campaignForm.bonus_amount === option.value
                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            {option.tag && (
                              <span className={`absolute -top-2.5 right-2 text-white text-xs font-bold px-2 py-0.5 rounded ${
                                option.tag === 'BEST' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                option.tag === '추천' ? 'bg-purple-500' : 'bg-indigo-500'
                              }`}>
                                {option.tag}
                              </span>
                            )}
                            <div className={`text-lg font-bold mb-1 ${
                              campaignForm.bonus_amount === option.value ? 'text-purple-600' : 'text-gray-900'
                            }`}>
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-500">{option.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 브랜드/참여조건 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </span>
                        브랜드 정보
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPreviousCampaigns(true)
                          loadPreviousCampaigns()
                        }}
                        className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <History className="w-4 h-4" />
                        이전 캠페인에서 불러오기
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="brand">브랜드명 *</Label>
                        <Input
                          id="brand"
                          value={campaignForm.brand}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="예: 에이블씨엔씨"
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="requirements">참여 조건</Label>
                        <Textarea
                          id="requirements"
                          value={campaignForm.requirements}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, requirements: e.target.value }))}
                          placeholder="예: 피부 트러블이 있으신분, 아이와 같이 출연 가능하신분"
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 스케줄 설정 - 브랜드 정보 다음 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </span>
                      4주 챌린지 스케줄
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">Week 1 마감일을 설정하면 Week 2~4가 자동으로 +7일씩 계산됩니다</p>

                    <div className="space-y-4">
                      {/* 모집 마감일 */}
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <Label htmlFor="application_deadline" className="text-purple-700 font-semibold">모집 마감일 *</Label>
                        <Input
                          id="application_deadline"
                          type="date"
                          value={campaignForm.application_deadline}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                          className="mt-2 bg-white"
                          required
                        />
                      </div>

                      {/* Week 1 마감일 (입력) */}
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                          <Label htmlFor="week1_deadline" className="text-purple-700 font-semibold">Week 1 콘텐츠 마감일 *</Label>
                        </div>
                        <Input
                          id="week1_deadline"
                          type="date"
                          value={campaignForm.week1_deadline}
                          onChange={(e) => {
                            const week1 = e.target.value
                            if (week1) {
                              const week1Date = new Date(week1)
                              const week2Date = new Date(week1Date)
                              week2Date.setDate(week2Date.getDate() + 7)
                              const week3Date = new Date(week1Date)
                              week3Date.setDate(week3Date.getDate() + 14)
                              const week4Date = new Date(week1Date)
                              week4Date.setDate(week4Date.getDate() + 21)

                              setCampaignForm(prev => ({
                                ...prev,
                                week1_deadline: week1,
                                week2_deadline: week2Date.toISOString().split('T')[0],
                                week3_deadline: week3Date.toISOString().split('T')[0],
                                week4_deadline: week4Date.toISOString().split('T')[0]
                              }))
                            } else {
                              setCampaignForm(prev => ({
                                ...prev,
                                week1_deadline: '',
                                week2_deadline: '',
                                week3_deadline: '',
                                week4_deadline: ''
                              }))
                            }
                          }}
                          className="bg-white"
                          required
                        />
                        <p className="text-xs text-purple-600 mt-2">첫 번째 콘텐츠 업로드 마감</p>
                      </div>

                      {/* Week 2~4 수정 가능 */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 bg-purple-400 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span className="text-xs font-medium text-gray-600">Week 2</span>
                          </div>
                          <Input
                            type="date"
                            value={campaignForm.week2_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, week2_deadline: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 bg-purple-400 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span className="text-xs font-medium text-gray-600">Week 3</span>
                          </div>
                          <Input
                            type="date"
                            value={campaignForm.week3_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, week3_deadline: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-5 h-5 bg-purple-400 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                            <span className="text-xs font-medium text-gray-600">Week 4</span>
                          </div>
                          <Input
                            type="date"
                            value={campaignForm.week4_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, week4_deadline: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 캠페인 썸네일 - 기획형과 동일한 스타일 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </span>
                      캠페인 썸네일
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 ml-10">캠페인 목록에 표시될 대표 이미지</p>

                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => thumbnailInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-pink-400 hover:bg-pink-50/50 ${
                        campaignForm.image_url ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                      }`}
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-500">업로드 중...</span>
                        </div>
                      ) : campaignForm.image_url ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={campaignForm.image_url} alt="썸네일" className="max-h-40 rounded-lg shadow-sm" />
                          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            클릭하여 이미지 변경
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </div>
                          <span className="text-sm text-gray-500">클릭하여 이미지 업로드</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 상품 정보 입력 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </span>
                      상품 정보 입력
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="product_name">상품명 *</Label>
                        <Input
                          id="product_name"
                          value={campaignForm.product_name}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, product_name: e.target.value }))}
                          placeholder="예: 4주 스킨케어 세트"
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="product_description">상품 설명</Label>
                        <Textarea
                          id="product_description"
                          value={campaignForm.product_description}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, product_description: e.target.value }))}
                          placeholder="상품의 특징, 사용법, 챌린지 가이드 등을 입력하세요"
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      {/* 상품 링크 + 정보 가져오기 버튼 */}
                      <div>
                        <Label htmlFor="product_link">상품 링크 (URL)</Label>
                        <div className="flex gap-2 mt-1">
                          <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <Input
                              id="product_link"
                              type="url"
                              value={campaignForm.product_link}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_link: e.target.value }))}
                              placeholder="https://example.com/product"
                              className="h-12 pl-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={crawlProductUrl}
                            disabled={isCrawling || !campaignForm.product_link}
                            className="h-12 px-4 whitespace-nowrap border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            {isCrawling ? (
                              <>
                                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                가져오는 중...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                정보 가져오기
                              </>
                            )}
                          </Button>
                        </div>
                        {crawlError && (
                          <p className={`text-xs mt-2 ${crawlError.includes('수동으로') ? 'text-purple-600' : 'text-red-500'}`}>
                            {crawlError.includes('수동으로') ? '⚠️' : '❌'} {crawlError}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">💡 자사몰 url을 입력하면 상품 정보를 자동으로 가져올 수 있습니다.</p>
                      </div>

                      {/* 크롤링된 정보 표시 프리뷰 */}
                      {(campaignForm.product_name || campaignForm.image_url) && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <div className="flex gap-4">
                            {/* 상품 이미지 */}
                            {campaignForm.image_url && (
                              <div className="flex-shrink-0">
                                <img
                                  src={campaignForm.image_url}
                                  alt="상품 이미지"
                                  className="w-24 h-24 rounded-lg object-cover border border-purple-200"
                                />
                              </div>
                            )}
                            {/* 상품 정보 */}
                            <div className="flex-1 space-y-1">
                              {campaignForm.product_name && (
                                <p className="font-semibold text-gray-900">{campaignForm.product_name}</p>
                              )}
                              {campaignForm.product_price && (
                                <p className="text-lg font-bold text-purple-700">{Number(campaignForm.product_price).toLocaleString()}원</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 상품 상세 페이지 이미지 */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">상품 상세 페이지 이미지</Label>
                        <p className="text-xs text-gray-500 mb-3">상품 상세 정보가 담긴 이미지 파일을 업로드하세요 (권장: 10MB 이하)</p>
                        <input
                          ref={detailImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProductDetailImageUpload}
                          className="hidden"
                        />
                        <div
                          onClick={() => detailImageInputRef.current?.click()}
                          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/50 ${
                            campaignForm.product_detail_file_url ? 'border-green-300 bg-green-50/30' : 'border-gray-300'
                          }`}
                        >
                          {uploadingDetailImage ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-gray-500">업로드 중...</span>
                            </div>
                          ) : campaignForm.product_detail_file_url ? (
                            <div className="flex flex-col items-center gap-3">
                              <img
                                src={campaignForm.product_detail_file_url}
                                alt="상품 상세"
                                className="max-h-48 rounded-lg shadow-sm"
                              />
                              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                클릭하여 이미지 변경
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="text-sm text-gray-500">클릭하여 이미지 업로드</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 모집 채널 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4m10-4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4M3 20h18" /></svg>
                      </span>
                      모집 채널
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">여러 개 선택 가능합니다</p>
                    <div className="grid grid-cols-3 gap-3">
                      {categoryOptions.map(opt => (
                        <div
                          key={opt.value}
                          onClick={() => handleCategoryToggle(opt.value)}
                          className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            campaignForm.category.includes(opt.value)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <span className={`font-medium ${
                            campaignForm.category.includes(opt.value) ? 'text-purple-600' : 'text-gray-700'
                          }`}>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                    {campaignForm.category.length === 0 && (
                      <p className="text-sm text-red-500 mt-2">최소 1개 이상 선택해주세요</p>
                    )}
                  </div>

                  {/* 에러/성공 메시지 */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                      {success}
                    </div>
                  )}

                  {/* 모바일용 버튼 */}
                  <div className="lg:hidden space-y-3">
                    <Button
                      type="submit"
                      disabled={processing || campaignForm.category.length === 0}
                      className="w-full py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
                    >
                      {processing ? '저장 중...' : (editId ? '수정하기' : '캠페인 시작하기')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/company/campaigns')} className="w-full py-4">
                      취소
                    </Button>
                  </div>
                </div>

                {/* 오른쪽: 예상 견적서 (Sticky) - 다크 테마 */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="text-xl">📋</span> 예상 견적서
                      </h3>

                      {/* AI 지원율 예측 */}
                      <div className="bg-slate-800 rounded-xl p-4 mb-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                            🏆
                          </div>
                          <div className="flex-1">
                            <div className="text-purple-300 text-xs font-medium mb-1">AI 지원율 예측</div>
                            <div className="text-sm leading-relaxed">
                              4주 챌린지는 평균{' '}
                              <span className="text-purple-400 font-bold text-lg">
                                {(() => {
                                  const bonus = campaignForm.bonus_amount || 0
                                  if (bonus >= 300000) return '25~40명'
                                  if (bonus >= 200000) return '18~30명'
                                  if (bonus >= 100000) return '12~22명'
                                  return '8~15명'
                                })()}
                              </span>
                              의 크리에이터가 지원합니다.
                            </div>
                          </div>
                        </div>

                        {/* 크리에이터 특성 표시 */}
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400">예상 크리에이터 수준</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4].map((level) => {
                                const currentLevel = campaignForm.bonus_amount >= 300000 ? 4 :
                                                    campaignForm.bonus_amount >= 200000 ? 3 :
                                                    campaignForm.bonus_amount >= 100000 ? 2 : 1
                                return (
                                  <div
                                    key={level}
                                    className={`w-2 h-2 rounded-full ${
                                      level <= currentLevel
                                        ? 'bg-gradient-to-r from-purple-400 to-pink-400'
                                        : 'bg-slate-600'
                                    }`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                              4주 연속 콘텐츠
                            </span>
                            {campaignForm.bonus_amount >= 100000 && (
                              <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded">
                                우수 크리에이터
                              </span>
                            )}
                            {campaignForm.bonus_amount >= 200000 && (
                              <span className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded">
                                높은 완주율
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, 40 + ((campaignForm.bonus_amount || 0) / 100000) * 15)}%` }}
                          />
                        </div>
                        {campaignForm.bonus_amount > 0 && (
                          <div className="mt-2 text-xs text-green-400">
                            +{Math.floor((campaignForm.bonus_amount / 100000) * 5)}-{Math.floor((campaignForm.bonus_amount / 100000) * 8)}명 지원율 증가 예상
                          </div>
                        )}
                      </div>

                      {/* 견적 상세 */}
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-gray-400">기본 단가</span>
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded">영상 4회</span>
                          </div>
                          <span>600,000원</span>
                        </div>
                        <div className="text-xs text-gray-500 -mt-1 pl-1">
                          → 회당 150,000원 (4주간 매주 1회 업로드)
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">모집 인원</span>
                          <span>x {campaignForm.total_slots || 1}명</span>
                        </div>
                        {campaignForm.bonus_amount > 0 && (
                          <div className="flex justify-between text-green-400">
                            <span>인센티브 옵션</span>
                            <span>+{(campaignForm.bonus_amount).toLocaleString()}원</span>
                          </div>
                        )}
                        <div className="border-t border-slate-700 pt-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">공급가액</span>
                            <span>{(600000 * (campaignForm.total_slots || 1) + (campaignForm.bonus_amount || 0)).toLocaleString()}원</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">부가세 (10%)</span>
                          <span>{Math.round((600000 * (campaignForm.total_slots || 1) + (campaignForm.bonus_amount || 0)) * 0.1).toLocaleString()}원</span>
                        </div>
                      </div>

                      {/* 총 결제 금액 */}
                      <div className="mt-5 pt-4 border-t border-slate-700">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-gray-400">총 결제 금액</span>
                        </div>
                        <div className="text-right">
                          <span className="text-4xl font-bold">{Math.round((600000 * (campaignForm.total_slots || 1) + (campaignForm.bonus_amount || 0)) * 1.1).toLocaleString()}</span>
                          <span className="text-xl ml-1">원</span>
                        </div>
                      </div>

                      {/* 버튼 */}
                      <div className="hidden lg:block mt-6 space-y-3">
                        <Button
                          type="submit"
                          disabled={processing || campaignForm.category.length === 0}
                          className="w-full py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
                        >
                          {processing ? '저장 중...' : (editId ? '수정하기' : '캠페인 시작하기')}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/company/campaigns')} className="w-full py-4 bg-transparent border-slate-600 text-gray-300 hover:bg-slate-800">
                          취소
                        </Button>
                      </div>

                      <p className="text-xs text-gray-500 mt-4 text-center">
                        * 세금계산서 발행 가능 / 카드 결제 지원
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 하단 고정 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 왼쪽: 자동 저장 상태 */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {autoSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>저장 중...</span>
                </>
              ) : lastSaved ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>자동 저장됨 ({formatTime(lastSaved)})</span>
                </>
              ) : (
                <span className="text-gray-400">입력 내용이 자동 저장됩니다</span>
              )}
            </div>

            {/* 오른쪽: 버튼들 */}
            <div className="flex items-center gap-3">
              {/* 이전 단계 버튼 */}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/company/campaigns')}
                className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                이전 단계
              </Button>

              {/* 임시저장 버튼 */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  localStorage.setItem('campaign_draft', JSON.stringify(campaignForm))
                  alert('임시저장 되었습니다.')
                }}
                className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                임시저장
              </Button>

              {/* 다음 단계 버튼 */}
              <Button
                type="submit"
                form="campaign-form"
                disabled={processing || campaignForm.category.length === 0}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {processing ? '저장 중...' : (editId ? '수정하기' : '다음 단계')}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 바 공간 확보 */}
      <div className="h-20"></div>
    </div>
  )
}

export default CampaignCreationKorea
