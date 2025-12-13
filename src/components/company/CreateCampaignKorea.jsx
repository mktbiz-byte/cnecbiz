import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseKorea, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const CampaignCreationKorea = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') || searchParams.get('id')
  const thumbnailInputRef = useRef(null)
  const detailImageInputRef = useRef(null)

  const [campaignForm, setCampaignForm] = useState({
    campaign_type: 'planned',  // 'planned', 'oliveyoung', '4week_challenge'
    package_type: 'standard',  // 기본값: 스탠다드
    brand: '',
    product_name: '',
    product_description: '',
    product_link: '',
    category: [],
    total_slots: 10,
    remaining_slots: 10,
    application_deadline: '',
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
    week4_deadline: ''
  })

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingDetailImage, setUploadingDetailImage] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)

  const categoryOptions = [
    { value: 'youtube', label: '🎥 유튜브' },
    { value: 'instagram', label: '📸 인스타그램' },
    { value: 'tiktok', label: '🎵 틱톡' }
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

  const packageOptions = [
    { 
      value: 'basic', 
      label: '베이직', 
      price: 200000, 
      description: '인스타그램 기준: 1만~3만명',
      expectedApplicants: { instagram: '10~15', youtube: '5~8', tiktok: '5~8' }
    },
    { 
      value: 'standard', 
      label: '스탠다드', 
      price: 300000, 
      description: '인스타그램 기준: 3만~10만명',
      expectedApplicants: { instagram: '15~20', youtube: '8~12', tiktok: '8~12' }
    },
    { 
      value: 'premium', 
      label: '프리미엄', 
      price: 400000, 
      description: '인스타그램 기준: 10만~30만명',
      expectedApplicants: { instagram: '20~40', youtube: '10~20', tiktok: '10~20' }
    },
    { 
      value: 'professional', 
      label: '프로페셔널', 
      price: 600000, 
      description: '인스타그램 기준: 30만~50만명',
      expectedApplicants: { instagram: '40~60', youtube: '20~30', tiktok: '20~30' }
    },
    { 
      value: 'enterprise', 
      label: '엔터프라이즈', 
      price: 1000000, 
      description: '인스타그램 기준: 50만명 이상',
      expectedApplicants: { instagram: '60~100', youtube: '30~50', tiktok: '30~50' }
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
      const { data, error } = await supabaseKorea
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

      const { error: uploadError } = await supabaseKorea.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabaseKorea.storage
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

      const { error: uploadError } = await supabaseKorea.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabaseKorea.storage
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

      const { error: uploadError } = await supabaseKorea.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabaseKorea.storage
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
      // question1-4를 questions JSONB 배열로 변환
      const questions = [
        campaignForm.question1,
        campaignForm.question2,
        campaignForm.question3,
        campaignForm.question4
      ].filter(q => q && q.trim() !== '').map(q => ({ question: q }))

      const { question1, question2, question3, question4, target_platforms, ...restForm } = campaignForm

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
        ...restForm,
        title: autoTitle,
        reward_points: parseInt(campaignForm.reward_points) || 0,
        total_slots: parseInt(campaignForm.total_slots) || 0,
        remaining_slots: parseInt(campaignForm.remaining_slots) || parseInt(campaignForm.total_slots) || 0,
        questions: questions.length > 0 ? questions : null,
        target_platforms: campaignForm.target_platforms.length > 0 ? campaignForm.target_platforms : null,
        company_id: currentUser.id,  // user_id 저장
        company_email: userEmail,  // 회사 이메일 저장
        // 빈 문자열인 날짜 필드를 null로 변환
        application_deadline: campaignForm.application_deadline || null,
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
        step1_deadline: campaignForm.step1_deadline || null,
        step2_deadline: campaignForm.step2_deadline || null,
        step3_deadline: campaignForm.step3_deadline || null,
        week1_deadline: campaignForm.week1_deadline || null,
        week2_deadline: campaignForm.week2_deadline || null,
        week3_deadline: campaignForm.week3_deadline || null,
        week4_deadline: campaignForm.week4_deadline || null
      }

      if (editId) {
        // 수정 모드: 포인트 차감 없이 수정만 진행
        const { error: updateError } = await supabaseKorea
          .from('campaigns')
          .update(campaignData)
          .eq('id', editId)

        if (updateError) throw updateError

        setSuccess('캠페인이 수정되었습니다!')
      } else {
        // 신규 생성 모드
        const { data: insertData, error: insertError } = await supabaseKorea
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
      setError('캠페인 저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 캠페인 타입 선택 */}
      <div className="bg-gray-50 py-8 lg:py-12">
        {/* 뒤로가기 */}
        <div className="max-w-6xl mx-auto px-4 lg:px-8 mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')} className="text-gray-500 hover:text-gray-700">
            ← 캠페인 목록으로
          </Button>
        </div>

        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">가장 합리적인 캠페인을 선택하세요</h1>
          <p className="text-gray-500 text-sm lg:text-base">복잡한 옵션은 빼고, 꼭 필요한 기능만 담았습니다.</p>
        </div>

        {/* 캠페인 타입 카드들 */}
        <div className="px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-6xl mx-auto">
            {/* 기획형 캠페인 */}
            <div
              className={`relative bg-white rounded-xl border-2 p-5 lg:p-6 transition-all cursor-pointer flex flex-col ${
                campaignForm.campaign_type === 'planned'
                  ? 'border-blue-500 shadow-lg ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'planned', is_oliveyoung_sale: false }))}
            >
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900 mb-1">기획형 캠페인</h3>
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
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                선택하기
              </button>

              <ul className="space-y-2 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>브랜드 맞춤 시나리오 기획</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>촬영 가이드라인 제공</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>SNS 업로드 URL 1개</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                  <span>2차 활용 라이선스</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                  <span>심층 성과 분석 리포트</span>
                </li>
              </ul>
            </div>

            {/* 올영세일 캠페인 - MOST POPULAR */}
            <div
              className={`relative bg-white rounded-xl border-2 p-5 lg:p-6 transition-all cursor-pointer flex flex-col ${
                campaignForm.campaign_type === 'oliveyoung'
                  ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-100'
                  : 'border-indigo-600 hover:shadow-md'
              }`}
              onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'oliveyoung', is_oliveyoung_sale: true }))}
            >
              {/* MOST POPULAR 배지 */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <span>✨</span> MOST POPULAR
                </span>
              </div>

              <div className="mb-4 pt-2">
                <h3 className="text-base font-bold text-indigo-600 mb-1">올영세일 패키지</h3>
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
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                선택하기
              </button>

              <ul className="space-y-2 text-sm flex-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>티징 + 본편 (2단계 구성)</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>구매 전환 유도형 기획</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>SNS 업로드 URL 3개</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>원본 영상 파일 제공</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>기본 성과 리포트</span>
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
                  <span>SNS 업로드 URL 무제한</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>2차 활용 라이선스 포함</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>심층 성과 분석 리포트</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 캠페인 상세 설정 폼 - 전체 너비 */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-12">
          <form onSubmit={handleSubmit}>
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
                    </div>
                  </div>

                  {/* 브랜드/참여조건 섹션 */}
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                      <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </span>
                      브랜드 정보
                    </h3>

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
                              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
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
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                      <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </span>
                      스케줄 설정
                    </h3>

                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="application_deadline" className="text-sm font-medium text-gray-700 mb-2 block">모집 마감일 <span className="text-red-500">*</span></Label>
                        <Input
                          id="application_deadline"
                          type="date"
                          value={campaignForm.application_deadline}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                          required
                          className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start_date" className="text-sm font-medium text-gray-700 mb-2 block">촬영 마감일 <span className="text-red-500">*</span></Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={campaignForm.start_date}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, start_date: e.target.value }))}
                            required
                            className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="end_date" className="text-sm font-medium text-gray-700 mb-2 block">SNS 업로드일 <span className="text-red-500">*</span></Label>
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
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                      <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </span>
                      상품 상세 정보
                    </h3>

                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="product_name" className="text-sm font-medium text-gray-700 mb-2 block">상품명</Label>
                        <Input
                          id="product_name"
                          value={campaignForm.product_name}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, product_name: e.target.value }))}
                          placeholder="예: 에이블씨엔씨 립스틱 #01 코랄핑크"
                          className="h-12 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="product_description" className="text-sm font-medium text-gray-700 mb-2 block">상품 설명</Label>
                        <Textarea
                          id="product_description"
                          value={campaignForm.product_description}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, product_description: e.target.value }))}
                          placeholder="상품의 특징, 성분, 사용법 등을 자세히 입력하세요"
                          rows={4}
                          className="border-gray-200 focus:border-amber-500 focus:ring-amber-500 resize-none"
                        />
                      </div>

                      <div>
                        <Label htmlFor="product_link" className="text-sm font-medium text-gray-700 mb-2 block">상품 링크 (URL)</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          </div>
                          <Input
                            id="product_link"
                            type="url"
                            value={campaignForm.product_link}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, product_link: e.target.value }))}
                            placeholder="https://example.com/product"
                            className="h-12 pl-10 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">크리에이터가 참고할 수 있는 상품 페이지 링크</p>
                      </div>

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
                          <div>
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

            {/* 4주 챌린지 및 올리브영 캠페인은 기존 레이아웃 유지 */}
            {(campaignForm.campaign_type === '4week_challenge' || campaignForm.campaign_type === 'oliveyoung') && (
              <Card className="shadow-lg max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle>{editId ? '캠페인 수정' : '캠페인 상세 설정'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
              <div>
                <Label htmlFor="brand">브랜드명 *</Label>
                <Input
                  id="brand"
                  value={campaignForm.brand}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="예: 에이블씨엔씨"
                  required
                />
              </div>

              {/* 5. 참여 조건 */}
              <div>
                <Label htmlFor="requirements">참여 조건</Label>
                <Textarea
                  id="requirements"
                  value={campaignForm.requirements}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="예: 피부 트러블이 있으신분, 아이와 같이 출연 가능하신분, 속건조가 심하신분"
                  rows={3}
                />
              </div>

              {/* 6. 모집 채널 (카테고리) */}
              <div>
                <Label>모집 채널 * (여러 개 선택 가능)</Label>
                <div className="flex gap-4 mt-2">
                  {categoryOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campaignForm.category.includes(opt.value)}
                        onChange={() => handleCategoryToggle(opt.value)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {campaignForm.category.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">최소 1개 이상 선택해주세요</p>
                )}
              </div>

              {/* 7. 스케줄 설정 */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">📅 스케줄 설정</h3>
                
                {/* 모집 마감일 */}
                <div className="mb-4">
                  <Label htmlFor="application_deadline">모집 마감일 *</Label>
                  <Input
                    id="application_deadline"
                    type="date"
                    value={campaignForm.application_deadline}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                    required
                  />
                </div>

                {/* 기획형 캠페인 스케줄 */}
                {campaignForm.campaign_type === 'planned' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">촬영 마감일 *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={campaignForm.start_date}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">SNS 업로드일 *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={campaignForm.end_date}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, end_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 올영세일 캠페인 상세 설정 */}
              {campaignForm.campaign_type === 'oliveyoung' && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">🌸 올리브영 캠페인 상세 설정</h3>
                  <div className="space-y-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
                    {/* 올영 패키지 타입 선택 */}
                    <div>
                      <Label className="block mb-3">올리브영 패키지 타입 *</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="subtype_pick"
                            name="oliveyoung_subtype"
                            value="pick"
                            checked={campaignForm.oliveyoung_subtype === 'pick'}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: e.target.value }))}
                            className="w-4 h-4 text-pink-600"
                          />
                          <Label htmlFor="subtype_pick" className="cursor-pointer">
                            🌟 올영픽 (Olive Young Pick)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="subtype_sale"
                            name="oliveyoung_subtype"
                            value="sale"
                            checked={campaignForm.oliveyoung_subtype === 'sale'}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: e.target.value }))}
                            className="w-4 h-4 text-pink-600"
                          />
                          <Label htmlFor="subtype_sale" className="cursor-pointer">
                            🌸 올영세일 (Olive Young Sale)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="subtype_special"
                            name="oliveyoung_subtype"
                            value="special"
                            checked={campaignForm.oliveyoung_subtype === 'special'}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: e.target.value }))}
                            className="w-4 h-4 text-pink-600"
                          />
                          <Label htmlFor="subtype_special" className="cursor-pointer">
                            🔥 오특 (오늘의 특가)
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* 세일 시즌 선택 (올영세일일 경우만) */}
                    {campaignForm.oliveyoung_subtype === 'sale' && (
                      <div>
                        <Label htmlFor="sale_season">세일 시즌 *</Label>
                      <Select 
                        value={campaignForm.sale_season} 
                        onValueChange={(value) => setCampaignForm(prev => ({ ...prev, sale_season: value }))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="세일 시즌 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="spring" className="bg-white hover:bg-gray-100">🌸 봄 세일 (3월 1~7일)</SelectItem>
                          <SelectItem value="summer" className="bg-white hover:bg-gray-100">☀️ 여름 세일 (5월 31일~6월 6일)</SelectItem>
                          <SelectItem value="fall" className="bg-white hover:bg-gray-100">🍂 가을 세일 (8월 30일~9월 5일)</SelectItem>
                          <SelectItem value="winter" className="bg-white hover:bg-gray-100">❄️ 겨울 세일 (12월 초)</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                    )}

                    {/* 콘텐츠 타입 선택 */}
                    <div>
                      <Label htmlFor="content_type">콘텐츠 타입 *</Label>
                      <Select 
                        value={campaignForm.content_type} 
                        onValueChange={(value) => setCampaignForm(prev => ({ ...prev, content_type: value }))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="콘텐츠 타입 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="store_visit" className="bg-white hover:bg-gray-100">🏪 매장 방문형 (진정성 강조)</SelectItem>
                          <SelectItem value="product_only" className="bg-white hover:bg-gray-100">📦 제품 소개형 (빠른 제작)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 앰블럼 삽입 여부 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="emblem_required"
                        checked={campaignForm.emblem_required}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, emblem_required: e.target.checked }))}
                        className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                      />
                      <Label htmlFor="emblem_required" className="cursor-pointer">
                        올영세일 앰블럼 삽입
                      </Label>
                    </div>

                    {/* 3단계 스케줄 */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-3">📅 3단계 콘텐츠 업로드 스케줄</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="step1_deadline">STEP 1: 상품 리뷰 마감일 *</Label>
                          <Input
                            id="step1_deadline"
                            type="date"
                            value={campaignForm.step1_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, step1_deadline: e.target.value }))}
                            required={campaignForm.is_oliveyoung_sale}
                            className="bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">상품 리뷰 콘텐츠 제작 및 업로드</p>
                        </div>
                        <div>
                          <Label htmlFor="step2_deadline">STEP 2: 세일 홍보 마감일 *</Label>
                          <Input
                            id="step2_deadline"
                            type="date"
                            value={campaignForm.step2_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, step2_deadline: e.target.value }))}
                            required={campaignForm.is_oliveyoung_sale}
                            className="bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">세일 홍보 콘텐츠 제작 및 업로드</p>
                        </div>
                        <div>
                          <Label htmlFor="step3_deadline">STEP 3: 세일 당일 스토리 마감일 *</Label>
                          <Input
                            id="step3_deadline"
                            type="date"
                            value={campaignForm.step3_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, step3_deadline: e.target.value }))}
                            required={campaignForm.is_oliveyoung_sale}
                            className="bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">본 영상은 STEP 2의 영상이 업로드 + URL이 삽입됩니다</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4주 챌린지 상세 설정 */}
              {campaignForm.campaign_type === '4week_challenge' && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">🏆 4주 챌린지 상세 설정</h3>
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    {/* 4주 마감일 */}
                    <div>
                      <h4 className="font-semibold mb-3">📅 4주 콘텐츠 스케줄</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="week1_deadline">Week 1 마감일 *</Label>
                          <Input
                            id="week1_deadline"
                            type="date"
                            value={campaignForm.week1_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, week1_deadline: e.target.value }))}
                            required={campaignForm.campaign_type === '4week_challenge'}
                            className="bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">첫 주차 콘텐츠 제출 마감</p>
                        </div>
                        <div>
                          <Label htmlFor="week2_deadline">Week 2 마감일 *</Label>
                          <Input
                            id="week2_deadline"
                            type="date"
                            value={campaignForm.week2_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, week2_deadline: e.target.value }))}
                            required={campaignForm.campaign_type === '4week_challenge'}
                            className="bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">2주차 콘텐츠 제출 마감</p>
                        </div>
                        <div>
                          <Label htmlFor="week3_deadline">Week 3 마감일 *</Label>
                          <Input
                            id="week3_deadline"
                            type="date"
                            value={campaignForm.week3_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, week3_deadline: e.target.value }))}
                            required={campaignForm.campaign_type === '4week_challenge'}
                            className="bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">3주차 콘텐츠 제출 마감</p>
                        </div>
                        <div>
                          <Label htmlFor="week4_deadline">Week 4 마감일 *</Label>
                          <Input
                            id="week4_deadline"
                            type="date"
                            value={campaignForm.week4_deadline}
                            onChange={(e) => setCampaignForm(prev => ({ ...prev, week4_deadline: e.target.value }))}
                            required={campaignForm.campaign_type === '4week_challenge'}
                            className="bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">최종 주차 콘텐츠 제출 마감</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 캠페인 썸네일 */}
              <div className="border-t pt-6 mt-6">
                <Label>캠페인 썸네일</Label>
                <p className="text-sm text-gray-600 mb-2">캠페인 목록에 표시될 썸네일 이미지를 업로드하세요</p>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full"
                >
                  {uploadingImage ? '업로드 중...' : campaignForm.image_url ? '썸네일 변경' : '썸네일 업로드'}
                </Button>
                {campaignForm.image_url && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 mb-2">✓ 썸네일이 업로드되었습니다</p>
                    <img src={campaignForm.image_url} alt="썸네일" className="w-full max-w-md rounded border" />
                  </div>
                )}
              </div>

              {/* 상품 상세 정보 */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">📦 상품 상세 정보</h3>
                
                <div className="space-y-4">
                  {/* 상품명 */}
                  <div>
                    <Label htmlFor="product_name">상품명</Label>
                    <Input
                      id="product_name"
                      value={campaignForm.product_name}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, product_name: e.target.value }))}
                      placeholder="예: 에이블씨엔씨 립스틱 #01 코랄핑크"
                    />
                  </div>

                  {/* 상품 설명 */}
                  <div>
                    <Label htmlFor="product_description">상품 설명</Label>
                    <Textarea
                      id="product_description"
                      value={campaignForm.product_description}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, product_description: e.target.value }))}
                      placeholder="상품의 특징, 성분, 사용법 등을 자세히 입력하세요"
                      rows={4}
                    />
                  </div>

                  {/* 상품 링크 */}
                  <div>
                    <Label htmlFor="product_link">상품 링크 (URL)</Label>
                    <Input
                      id="product_link"
                      type="url"
                      value={campaignForm.product_link}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, product_link: e.target.value }))}
                      placeholder="https://example.com/product"
                    />
                    <p className="text-sm text-gray-500 mt-1">크리에이터가 참고할 수 있는 상품 페이지 링크</p>
                  </div>

                  {/* 상품 상세 페이지 이미지 */}
                  <div className="border-t pt-4 mt-4">
                    <Label>상품 상세 페이지 이미지</Label>
                    <p className="text-sm text-gray-600 mb-2">상품 상세 정보가 담긴 이미지 파일을 업로드하세요 (권장: 10MB 이하)</p>
                    <input
                      ref={detailImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProductDetailImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => detailImageInputRef.current?.click()}
                      disabled={uploadingDetailImage}
                      className="w-full"
                    >
                      {uploadingDetailImage ? '업로드 중...' : campaignForm.product_detail_file_url ? '이미지 변경' : '이미지 업로드'}
                    </Button>
                    {campaignForm.product_detail_file_url && (
                      <div className="mt-4">
                        <p className="text-sm text-green-600 mb-2">✓ 상품 상세 이미지가 업로드되었습니다</p>
                        <img 
                          src={campaignForm.product_detail_file_url} 
                          alt="상품 상세" 
                          className="max-w-full h-auto rounded border"
                          style={{ maxHeight: '500px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 상태 안내 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📌 캠페인은 "<strong>임시저장</strong>" 상태로 저장됩니다. 
                  저장 후 캠페인 목록에서 <strong>"승인 요청하기"</strong>를 누르면 관리자가 검토합니다.
                </p>
              </div>

              {/* 질문 섹션 */}
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">지원자 질문 (선택사항)</Label>
                  {questionCount < 4 && (
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                      size="default"
                      onClick={() => setQuestionCount(prev => Math.min(prev + 1, 4))}
                    >
                      + 질문 추가
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4">지원자에게 물어볼 질문을 최대 4개까지 추가할 수 있습니다.</p>
                
                <div className="space-y-4">
                  {/* 질문 1 */}
                  {questionCount >= 1 && (
                    <div>
                      <Label htmlFor="question1">질문 1</Label>
                      <Textarea
                        id="question1"
                        value={campaignForm.question1}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, question1: e.target.value }))}
                        placeholder="예: 본인의 피부 타입과 주요 피부 고민을 알려주세요."
                        rows={2}
                      />
                    </div>
                  )}

                  {/* 질문 2 */}
                  {questionCount >= 2 && (
                    <div>
                      <Label htmlFor="question2">질문 2</Label>
                      <Textarea
                        id="question2"
                        value={campaignForm.question2}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, question2: e.target.value }))}
                        placeholder="예: 평소 사용하는 스킨케어 제품을 알려주세요."
                        rows={2}
                      />
                    </div>
                  )}

                  {/* 질문 3 */}
                  {questionCount >= 3 && (
                    <div>
                      <Label htmlFor="question3">질문 3</Label>
                      <Textarea
                        id="question3"
                        value={campaignForm.question3}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, question3: e.target.value }))}
                        placeholder="예: 이 캠페인에 지원한 이유를 알려주세요."
                        rows={2}
                      />
                    </div>
                  )}

                  {/* 질문 4 */}
                  {questionCount >= 4 && (
                    <div>
                      <Label htmlFor="question4">질문 4</Label>
                      <Textarea
                        id="question4"
                        value={campaignForm.question4}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, question4: e.target.value }))}
                        placeholder="예: 콘텐츠 제작 시 중점적으로 다루고 싶은 부분이 있나요?"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 에러/성공 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={processing || campaignForm.category.length === 0} 
                  className="flex-1"
                >
                  {processing ? '저장 중...' : (editId ? '수정하기' : '다음단계')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/company/campaigns')}>
                  취소
                </Button>
              </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default CampaignCreationKorea
