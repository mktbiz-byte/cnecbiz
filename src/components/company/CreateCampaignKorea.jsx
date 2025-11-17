import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'

const supabaseKorea = getSupabaseClient('korea')
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const CampaignCreationKorea = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const thumbnailInputRef = useRef(null)
  const detailImageInputRef = useRef(null)

  const [campaignForm, setCampaignForm] = useState({
    campaign_type: 'regular',  // 'regular', 'oliveyoung', '4week_challenge'
    package_type: 'intermediate',  // 기본값: 스탠다드 패키지
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

  const packageOptions = [
    { 
      value: 'beginner', 
      label: '초급 패키지', 
      price: 200000, 
      description: '인스타그램 기준: 1만~3만명',
      expectedApplicants: { instagram: 30 }
    },
    { 
      value: 'intermediate', 
      label: '스탠다드 패키지', 
      price: 300000, 
      description: '인스타그램 기준: 3만~10만명',
      expectedApplicants: { instagram: 25 }
    },
    { 
      value: 'advanced', 
      label: '프리미엄 패키지', 
      price: 400000, 
      description: '인스타그램 기준: 10만~30만명',
      expectedApplicants: { instagram: 15 }
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
      // 4주 챌린지: 1명당 600,000원 × 인원수 (할인 없음)
      const finalCost = calculateFinalCost(600000, campaignForm.total_slots, false)
      setCampaignForm(prev => ({ ...prev, estimated_cost: finalCost }))
    } else {
      // 일반/올영세일: 패키지 × 인원수
      const pkg = packageOptions.find(p => p.value === campaignForm.package_type)
      if (pkg) {
        const finalCost = calculateFinalCost(pkg.price, campaignForm.total_slots)
        setCampaignForm(prev => ({ ...prev, estimated_cost: finalCost }))
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

        // 날짜 필드를 YYYY-MM-DD 형식으로 변환
        const formatDateForInput = (dateValue) => {
          if (!dateValue) return ''
          const date = new Date(dateValue)
          if (isNaN(date.getTime())) return ''
          return date.toISOString().split('T')[0]
        }

        setCampaignForm({
          ...data,
          target_platforms: Array.isArray(data.target_platforms) ? data.target_platforms : [],
          question1,
          question2,
          question3,
          question4,
          category: categoryArray,
          // 날짜 필드 형식 변환
          application_deadline: formatDateForInput(data.application_deadline),
          start_date: formatDateForInput(data.start_date),
          end_date: formatDateForInput(data.end_date),
          week1_deadline: formatDateForInput(data.week1_deadline),
          week2_deadline: formatDateForInput(data.week2_deadline),
          week3_deadline: formatDateForInput(data.week3_deadline),
          week4_deadline: formatDateForInput(data.week4_deadline),
          step1_deadline: formatDateForInput(data.step1_deadline),
          step2_deadline: formatDateForInput(data.step2_deadline),
          step3_deadline: formatDateForInput(data.step3_deadline)
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
    const selectedPackage = packageOptions.find(p => p.value === value)
    if (selectedPackage) {
      const finalCost = calculateFinalCost(selectedPackage.price, campaignForm.total_slots)
      setCampaignForm(prev => ({
        ...prev,
        package_type: value,
        estimated_cost: finalCost
      }))
    }
  }

  // 모집 인원 변경 핸들러 (결제 금액 자동 계산)
  const handleSlotsChange = (value) => {
    const slots = parseInt(value) || 0
    let finalCost = 0
    
    if (campaignForm.campaign_type === '4week_challenge') {
      // 4주 챌린지: 1명당 600,000원 (할인 없음)
      finalCost = calculateFinalCost(600000, slots, false)
    } else {
      // 일반/올영세일: 패키지 가격
      const selectedPackage = packageOptions.find(p => p.value === campaignForm.package_type)
      finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, slots) : 0
    }
    
    setCampaignForm(prev => ({
      ...prev,
      total_slots: slots,
      remaining_slots: slots,
      estimated_cost: finalCost
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

      console.log('[DEBUG] Product detail image uploaded:', publicUrl)
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

      const { question1, question2, question3, question4, target_platforms, additional_details_ja, ...restForm } = campaignForm

      // 카테고리명 가져오기 (이모지 제거, 배열 처리)
      const categoryNames = campaignForm.category
        .map(cat => {
          const label = categoryOptions.find(opt => opt.value === cat)?.label || ''
          return label.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()
        })
        .join('/')
      
      // 제목 자동 생성
      const autoTitle = `${campaignForm.brand} ${campaignForm.product_name} ${categoryNames}`.trim()

      // 로그인한 사용자 정보 가져오기
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
        if (campaignForm.target_platforms.length === 0) {
          setError('타겟 채널을 1개 이상 선택해주세요.')
          setProcessing(false)
          return
        }
      }

      // 날짜 필드를 null로 변환 (빈 문자열은 PostgreSQL date 타입에서 오류 발생)
      const convertEmptyToNull = (value) => value === '' ? null : value

      const campaignData = {
        ...restForm,
        title: autoTitle,
        reward_points: parseInt(campaignForm.reward_points) || 0,
        total_slots: parseInt(campaignForm.total_slots) || 0,
        remaining_slots: parseInt(campaignForm.remaining_slots) || parseInt(campaignForm.total_slots) || 0,
        questions: questions.length > 0 ? questions : null,
        target_platforms: campaignForm.target_platforms.length > 0 ? campaignForm.target_platforms : null,
        company_email: userEmail,  // 회사 이메일 저장
        // 날짜 필드 변환
        application_deadline: convertEmptyToNull(campaignForm.application_deadline),
        start_date: convertEmptyToNull(campaignForm.start_date),
        end_date: convertEmptyToNull(campaignForm.end_date),
        week1_deadline: convertEmptyToNull(campaignForm.week1_deadline),
        week2_deadline: convertEmptyToNull(campaignForm.week2_deadline),
        week3_deadline: convertEmptyToNull(campaignForm.week3_deadline),
        week4_deadline: convertEmptyToNull(campaignForm.week4_deadline),
        step1_deadline: convertEmptyToNull(campaignForm.step1_deadline),
        step2_deadline: convertEmptyToNull(campaignForm.step2_deadline),
        step3_deadline: convertEmptyToNull(campaignForm.step3_deadline)
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
        // 신규 생성 모드 - supabaseKorea에 저장
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

        setSuccess(`캠페인이 생성되었습니다! 크리에이터 가이드를 작성해주세요.`)
        
        // 캠페인 타입에 따라 적절한 가이드 페이지로 이동
        setTimeout(() => {
          if (campaignForm.campaign_type === 'oliveyoung') {
            navigate(`/company/campaigns/guide/oliveyoung?id=${campaignId}`)
          } else if (campaignForm.campaign_type === '4week_challenge') {
            navigate(`/company/campaigns/guide/4week?id=${campaignId}`)
          } else {
            navigate(`/company/campaigns/guide?id=${campaignId}`)
          }
        }, 1500)
      }

      // 수정 모드일 경우 가이드 페이지로 이동
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            ← 캠페인 목록으로
          </Button>
        </div>

        {/* 캠페인 타입 소개 배너 */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-center mb-6">한국 캠페인 타입</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* 기획형 캠페인 */}
            <div 
              className="bg-white p-4 rounded-lg border-2 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => window.open('/campaigns/intro/regular', '_blank')}
            >
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-bold text-lg mb-2">기획형 캠페인</h3>
              <p className="text-sm text-gray-600 mb-2">초급 20만원 / 스탠다드 30만원 / 프리미엄 40만원</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• 대사 + 촬영장면 개별 제공</li>
                <li>• SNS URL 1개 제출</li>
                <li>• 인스타그램 1만~30만명</li>
              </ul>
              <div className="mt-3 text-blue-600 text-sm font-medium hover:underline">
                자세히 보기 →
              </div>
            </div>
            {/* 올영세일 캠페인 */}
            <div 
              className="bg-white p-4 rounded-lg border-2 border-pink-200 hover:border-pink-400 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => window.open('/campaigns/intro/oliveyoung', '_blank')}
            >
              <div className="text-3xl mb-2">🌸</div>
              <h3 className="font-bold text-lg mb-2">올영세일 캠페인</h3>
              <p className="text-sm text-gray-600 mb-2">스탠다드 30만원 / 프리미엄 40만원</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• 3단계 콘텐츠 (릴스 2 + 스토리 1)</li>
                <li>• URL 3개 + 영상 폴더 2개</li>
                <li>• 통합 가이드 제공</li>
              </ul>
              <div className="mt-3 text-pink-600 text-sm font-medium hover:underline">
                자세히 보기 →
              </div>
            </div>
            {/* 4주 챌린지 */}
            <div 
              className="bg-white p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => window.open('/campaigns/intro/4week', '_blank')}
            >
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-bold text-lg mb-2">4주 챌린지</h3>
              <p className="text-sm text-gray-600 mb-2">60만원 (고정)</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• 주차별 통합 가이드 4개</li>
                <li>• 4주 연속 콘텐츠</li>
                <li>• URL 4개 + 영상 4개 제출</li>
              </ul>
              <div className="mt-3 text-purple-600 text-sm font-medium hover:underline">
                자세히 보기 →
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              🇰🇷 {editId ? '캠페인 수정' : '한국 캠페인 생성'}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">cnec-kr 데이터베이스에 캠페인이 생성됩니다</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 1. 캠페인 타입 선택 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">🎯 캠페인 타입 선택 *</h3>
                <div className="space-y-3">
                  {/* 기획형 캠페인 */}
                  <div className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'regular', is_oliveyoung_sale: false }))}>
                    <input
                      type="radio"
                      id="campaign_type_regular"
                      name="campaign_type"
                      value="regular"
                      checked={campaignForm.campaign_type === 'regular'}
                      onChange={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'regular', is_oliveyoung_sale: false }))}
                      className="w-5 h-5 mt-1 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="campaign_type_regular" className="text-base font-semibold cursor-pointer">
                          📝 기획형 캠페인
                        </Label>
                        <a 
                          href="/campaigns/intro/regular" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          자세히 보기
                        </a>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">가격: 초급 20만원 / 스탠다드 30만원 / 프리미엄 40만원</p>
                      <p className="text-xs text-gray-500 mt-1">대사 + 촬영장면 개별 제공, SNS URL 1개 제출</p>
                    </div>
                  </div>

                  {/* 올영세일 캠페인 */}
                  <div className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-pink-50" onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'oliveyoung', is_oliveyoung_sale: true }))}>
                    <input
                      type="radio"
                      id="campaign_type_oliveyoung"
                      name="campaign_type"
                      value="oliveyoung"
                      checked={campaignForm.campaign_type === 'oliveyoung'}
                      onChange={() => setCampaignForm(prev => ({ ...prev, campaign_type: 'oliveyoung', is_oliveyoung_sale: true }))}
                      className="w-5 h-5 mt-1 text-pink-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="campaign_type_oliveyoung" className="text-base font-semibold cursor-pointer">
                          🌸 올영세일 캠페인
                        </Label>
                        <a 
                          href="/campaigns/intro/oliveyoung" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-pink-600 hover:text-pink-800 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          자세히 보기
                        </a>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">가격: 스탠다드 30만원 / 프리미엄 40만원 (2단계만)</p>
                      <p className="text-xs text-gray-500 mt-1">통합 가이드, 3단계 콘텐츠 (릴스 2건 + 스토리 1건), URL 3개 + 영상 폴더 2개 제출</p>
                    </div>
                  </div>

                  {/* 4주 챌린지 */}
                  <div className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-purple-50" onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: '4week_challenge', is_oliveyoung_sale: false }))}>
                    <input
                      type="radio"
                      id="campaign_type_4week"
                      name="campaign_type"
                      value="4week_challenge"
                      checked={campaignForm.campaign_type === '4week_challenge'}
                      onChange={() => setCampaignForm(prev => ({ ...prev, campaign_type: '4week_challenge', is_oliveyoung_sale: false }))}
                      className="w-5 h-5 mt-1 text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="campaign_type_4week" className="text-base font-semibold cursor-pointer">
                          🏆 4주 챌린지
                        </Label>
                        <a 
                          href="/campaigns/intro/4week" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:text-purple-800 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          자세히 보기
                        </a>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">가격: 60만원 (고정)</p>
                      <p className="text-xs text-gray-500 mt-1">주차별 통합 가이드 4개, 4주 연속 콘텐츠, URL 4개 + 영상 4개 제출</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 패키지 선택 */}
              <div className="border-t pt-6 mt-6">
                <Label htmlFor="package_type">패키지 선택 *</Label>
                {campaignForm.campaign_type === '4week_challenge' ? (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 mt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-purple-900">4주 챌린지 프로그램 - ₩600,000 <span className="text-sm text-gray-500">(VAT 별도)</span></p>
                        <p className="text-sm text-gray-600 mt-1">4주간 지속적인 콘텐츠 제작</p>
                      </div>
                      <span className="text-purple-600 font-semibold">고정 금액</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Select value={campaignForm.package_type} onValueChange={handlePackageChange}>
                      <SelectTrigger className="bg-white mt-2">
                        <SelectValue placeholder="패키지 선택" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {packageOptions
                          .filter(opt => {
                            // 올영세일 캠페인일 경우 초급 패키지 제외
                            if (campaignForm.campaign_type === 'oliveyoung') {
                              return opt.value !== 'beginner'
                            }
                            return true
                          })
                          .map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="bg-white hover:bg-gray-100">
                            <div className="flex flex-col">
                              <span className="font-semibold">{opt.label} - ₩{opt.price.toLocaleString()} <span className="text-sm text-gray-500">(VAT 별도)</span></span>
                              <span className="text-xs text-gray-500">{opt.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        예상 지원 크리에이터 (플랫폼별)
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-pink-600">📸</span>
                        <span className="text-gray-700">인스타:</span>
                        <span className="font-semibold">{packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.instagram}명</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        * 금액대에 따라 지원율이 다소 차이가 납니다. 위 수치는 평균 예상치입니다.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* 3. 모집 인원 및 결제 예상 금액 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_slots">모집 인원 *</Label>
                  <Input
                    id="total_slots"
                    type="number"
                    value={campaignForm.total_slots || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      // 빈 문자열이거나 숫자인 경우만 처리
                      if (value === '' || !isNaN(value)) {
                        handleSlotsChange(value === '' ? '' : parseInt(value))
                      }
                    }}
                    placeholder="10"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="estimated_cost">결제 예상 금액 (VAT 포함)</Label>
                  <Input
                    id="estimated_cost"
                    type="text"
                    value={`₩${campaignForm.estimated_cost.toLocaleString()}`}
                    disabled
                    className="bg-gray-100 font-semibold text-blue-600"
                  />
                  {campaignForm.campaign_type === '4week_challenge' ? (() => {
                    const pricePerPerson = 600000
                    const subtotal = pricePerPerson * campaignForm.total_slots
                    const vat = Math.round(subtotal * 0.1)
                    const totalWithVat = subtotal + vat
                    
                    return (
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        <div className="text-purple-600 font-medium">4주 챌린지: {campaignForm.total_slots}명 × ₩{pricePerPerson.toLocaleString()} = ₩{subtotal.toLocaleString()}</div>
                        <div className="border-t pt-1 mt-1">
                          <div>부가세(10%): ₩{vat.toLocaleString()}</div>
                          <div className="font-semibold text-blue-600">총 결제액: ₩{totalWithVat.toLocaleString()}</div>
                        </div>
                      </div>
                    )
                  })() : (() => {
                    const pkg = packageOptions.find(p => p.value === campaignForm.package_type)
                    const packagePrice = pkg?.price || 0
                    const subtotal = packagePrice * campaignForm.total_slots
                    const discountRate = calculateDiscount(subtotal)
                    const discountAmount = Math.floor(subtotal * (discountRate / 100))
                    const finalBeforeVat = subtotal - discountAmount
                    const vat = Math.round(finalBeforeVat * 0.1)
                    const totalWithVat = finalBeforeVat + vat
                    
                    return (
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        <div>패키지 금액: {campaignForm.total_slots}명 × ₩{packagePrice.toLocaleString()} = ₩{subtotal.toLocaleString()}</div>
                        {discountRate > 0 && (
                          <div className="text-green-600 font-medium">
                            할인 ({discountRate}%): -₩{discountAmount.toLocaleString()}
                          </div>
                        )}
                        <div className="border-t pt-1 mt-1">
                          <div>부가세(10%): ₩{vat.toLocaleString()}</div>
                          <div className="font-semibold text-blue-600">총 결제액: ₩{totalWithVat.toLocaleString()}</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 4. 브랜드명 */}
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

              {/* 7. 업로드 스케줄 */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">📅 업로드 스케줄</h3>
                
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
                {campaignForm.campaign_type === 'regular' && (
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
                          onError={(e) => {
                            console.error('[ERROR] Image load failed:', campaignForm.product_detail_file_url)
                            e.target.style.display = 'none'
                          }}
                          onLoad={() => console.log('[DEBUG] Image loaded successfully')}
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
                      variant="outline"
                      size="sm"
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CampaignCreationKorea
