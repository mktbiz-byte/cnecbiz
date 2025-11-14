import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, storage } from '../../lib/supabaseKorea'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const CampaignCreationKorea = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const [campaignForm, setCampaignForm] = useState({
    title: '',
    brand: '',
    requirements: '',
    category: [],  // ['youtube', 'instagram', 'tiktok']
    image_url: '',
    product_name: '',
    product_description: '',
    product_link: '',
    product_detail_file_url: '',
    package_type: 'junior',  // junior, intermediate, senior, 4week_challenge
    total_slots: 10,
    remaining_slots: 10,
    estimated_cost: 2000000,  // 자동 계산
    application_deadline: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    creator_guide: '',  // 크리에이터 가이드
    target_platforms: {
      instagram: false,
      youtube: true,
      tiktok: false
    },
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    campaign_type: 'regular',  // regular, oliveyoung, 4week_challenge
    is_oliveyoung_sale: false,  // 하위 호환성 유지
    oliveyoung_subtype: 'sale',  // pick, sale, special
    oliveyoung_logo_url: '',
    provide_logo: false,  // 로고 제공 여부
    target_platforms: [],  // ['youtube', 'instagram', 'tiktok']
    sale_season: '',
    content_type: '',
    emblem_required: false,
    step1_deadline: '',
    step2_deadline: '',
    step3_deadline: '',
    week1_deadline: '',
    week2_deadline: '',
    week3_deadline: '',
    week4_deadline: ''
  })

  const [questionCount, setQuestionCount] = useState(1)

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingDetailImage, setUploadingDetailImage] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const thumbnailInputRef = useRef(null)
  const detailImageInputRef = useRef(null)

  // 카테고리 옵션 (체크박스용)
  const categoryOptions = [
    { value: 'youtube', label: '🎬 유튜브' },
    { value: 'instagram', label: '📸 인스타그램' },
    { value: 'tiktok', label: '🎵 틱톡' }
  ]

  // 패키지 옵션 - 캠페인 타입별
  const getPackageOptions = (campaignType) => {
    if (campaignType === 'regular') {
      return [
        { 
          value: 'junior', 
          label: '초급 크리에이터 패키지', 
          price: 200000,
          priceWithVat: 220000,
          description: '팔로워 1만~5만 (인스타 기준)',
          expectedApplicants: { youtube: 5, instagram: 8, tiktok: 10 }
        },
        { 
          value: 'intermediate', 
          label: '중급 크리에이터 패키지', 
          price: 300000,
          priceWithVat: 330000,
          description: '팔로워 5만~20만 (인스타 기준)',
          expectedApplicants: { youtube: 10, instagram: 15, tiktok: 15 }
        },
        { 
          value: 'senior', 
          label: '상급 크리에이터 패키지', 
          price: 400000,
          priceWithVat: 440000,
          description: '팔로워 20만 이상 (인스타 기준)',
          expectedApplicants: { youtube: 15, instagram: 25, tiktok: 20 }
        }
      ]
    } else if (campaignType === 'oliveyoung') {
      return [
        { 
          value: 'intermediate', 
          label: '중급 크리에이터 패키지', 
          price: 300000,
          priceWithVat: 330000,
          description: '팔로워 5만~20만 (인스타 기준)',
          expectedApplicants: { youtube: 10, instagram: 15, tiktok: 15 }
        },
        { 
          value: 'senior', 
          label: '상급 크리에이터 패키지', 
          price: 400000,
          priceWithVat: 440000,
          description: '팔로워 20만 이상 (인스타 기준)',
          expectedApplicants: { youtube: 15, instagram: 25, tiktok: 20 }
        }
      ]
    } else if (campaignType === '4week_challenge') {
      return [
        { 
          value: '4week_challenge', 
          label: '4주 챌린지 프로그램', 
          price: 600000,
          priceWithVat: 660000,
          description: '4주간 지속적인 콘텐츠 제작',
          expectedApplicants: { youtube: 8, instagram: 15, tiktok: 12 }
        }
      ]
    }
    return []
  }

  const packageOptions = getPackageOptions(campaignForm.campaign_type)

  // 입금 금액에 따른 할인율 계산 (1천만원 이상 5% 할인)
  const calculateDiscount = (amount) => {
    if (amount >= 10000000) return 5 // 1천만원 이상: 5% 할인
    return 0 // 할인 없음
  }

  // 최종 결제 금액 계산 (부가세 10% + 할인 적용)
  const calculateFinalCost = (packagePrice, slots) => {
    const originalCost = packagePrice * slots
    const vat = Math.floor(originalCost * 0.1) // 부가세 10%
    const discountRate = calculateDiscount(originalCost)
    const discountAmount = Math.floor(originalCost * (discountRate / 100))
    return originalCost + vat - discountAmount
  }

  // campaign_type 변경 시 package_type 자동 설정
  useEffect(() => {
    if (campaignForm.campaign_type === '4week_challenge') {
      setCampaignForm(prev => ({
        ...prev,
        package_type: '4week_challenge'
      }))
    } else if (campaignForm.campaign_type === 'regular' || campaignForm.campaign_type === 'oliveyoung') {
      // 일반 및 올영 캐페인은 중급 패키지를 기본으로 설정
      setCampaignForm(prev => ({
        ...prev,
        package_type: 'intermediate'
      }))
    }
  }, [campaignForm.campaign_type])

  // 초기 로드 시 할인가 계산
  useEffect(() => {
    if (!editId) {
      const selectedPackage = packageOptions.find(p => p.value === campaignForm.package_type)
      if (selectedPackage) {
        const finalCost = calculateFinalCost(selectedPackage.price, campaignForm.total_slots)
        setCampaignForm(prev => ({
          ...prev,
          estimated_cost: finalCost
        }))
      }
    }
  }, [])

  // 편집 모드일 때 데이터 로드
  useEffect(() => {
    if (editId) {
      loadCampaignData()
    }
  }, [editId])

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', editId)
        .single()

      if (error) throw error
      
      if (data) {
        // questions JSONB 배열을 question1-4로 복원
        let question1 = ''
        let question2 = ''
        let question3 = ''
        let question4 = ''
        
        if (data.questions && Array.isArray(data.questions)) {
          question1 = data.questions[0]?.question || ''
          question2 = data.questions[1]?.question || ''
          question3 = data.questions[2]?.question || ''
          question4 = data.questions[3]?.question || ''
        }

        setCampaignForm({
          ...data,
          target_platforms: data.target_platforms || { instagram: true, youtube: false, tiktok: false },
          question1,
          question2,
          question3,
          question4
        })
        
        // 질문 개수 계산
        let count = 0
        if (question1) count = 1
        if (question2) count = 2
        if (question3) count = 3
        if (question4) count = 4
        setQuestionCount(count || 1)
      }
    } catch (err) {
      console.error('캠페인 데이터 로드 실패:', err)
      setError('캠페인 데이터를 불러오는데 실패했습니다.')
    }
  }

  // 카테고리 체크박스 변경 핸들러
  const handleCategoryToggle = (value) => {
    setCampaignForm(prev => {
      const newCategory = prev.category.includes(value)
        ? prev.category.filter(c => c !== value)
        : [...prev.category, value]
      
      // target_platforms 자동 업데이트
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
    const selectedPackage = packageOptions.find(p => p.value === campaignForm.package_type)
    const finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, slots) : 0
    
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

      const { error: uploadError } = await storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = storage
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

      const { error: uploadError } = await storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = storage
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

      const { error: uploadError } = await storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = storage
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

      const campaignData = {
        ...restForm,
        title: autoTitle,
        reward_points: parseInt(campaignForm.reward_points) || 0,
        total_slots: parseInt(campaignForm.total_slots) || 0,
        remaining_slots: parseInt(campaignForm.remaining_slots) || parseInt(campaignForm.total_slots) || 0,
        questions: questions.length > 0 ? questions : null,
        target_platforms: campaignForm.target_platforms.length > 0 ? campaignForm.target_platforms : null,
        company_email: userEmail  // 회사 이메일 저장
      }

      if (editId) {
        // 수정 모드: 포인트 차감 없이 수정만 진행
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', editId)

        if (error) throw error
        setSuccess('캠페인이 수정되었습니다!')
        
        // 크리에이터 가이드 페이지로 이동
        setTimeout(() => {
          navigate(`/company/campaigns/guide?id=${editId}`)
        }, 1500)
        return
      } else {
        // 신규 생성: 포인트 차감 또는 견적서 발행
        const finalCost = campaignForm.estimated_cost
        
        // 1. 회사 포인트 잔액 확인
        const { data: { user } } = await supabaseBiz.auth.getUser()
        if (!user) throw new Error('로그인이 필요합니다')

        const { data: companyData } = await supabaseBiz
          .from('companies')
          .select('id, points_balance')
          .eq('user_id', user.id)
          .single()

        if (!companyData) throw new Error('회사 정보를 찾을 수 없습니다')

        const currentPoints = companyData.points_balance || 0

        if (currentPoints >= finalCost) {
          // 2-A. 포인트 충분: 캠페인 생성 + 포인트 차감
          const { data, error } = await supabase
            .from('campaigns')
            .insert([campaignData])
            .select()

          if (error) throw error

          // 포인트 차감
          const { error: pointsError } = await supabaseBiz
            .from('companies')
            .update({ points_balance: currentPoints - finalCost })
            .eq('id', companyData.id)

          if (pointsError) throw pointsError

          // 포인트 거래 기록
          const { error: transactionError } = await supabaseBiz
            .from('points_transactions')
            .insert([{
              company_id: companyData.id,
              amount: -finalCost,
              type: 'campaign_creation',
              description: `캠페인 생성: ${autoTitle}`,
              campaign_id: data[0].id
            }])
            .select()
          
          if (transactionError) {
            console.error('포인트 거래 기록 오류:', transactionError)
            // 거래 기록 실패해도 캠페인은 생성되었으므로 계속 진행
          }

          setSuccess(`캠페인이 생성되었습니다! ${finalCost.toLocaleString()}포인트가 차감되었습니다.`)
          
          // 크리에이터 가이드 페이지로 이동
          setTimeout(() => {
            if (data && data[0]) {
              navigate(`/company/campaigns/guide?id=${data[0].id}`)
            } else {
              navigate('/company/campaigns')
            }
          }, 1500)
          return
        } else {
          // 2-B. 포인트 부족: 캠페인 생성 + 견적서 발행
          const neededPoints = finalCost - currentPoints
          
          // 캠페인 먼저 생성 (draft 상태)
          const { data, error } = await supabase
            .from('campaigns')
            .insert([{
              ...campaignData,
              status: 'draft',
              approval_status: 'pending_payment'  // 입금 대기 상태
            }])
            .select()

          if (error) throw error

          const campaignId = data[0].id
          
          // 견적서 데이터 저장
          console.log('[CreateCampaign] Inserting charge request:', {
            company_id: companyData.id,
            amount: finalCost
          })

          const { data: quoteData, error: quoteError } = await supabaseBiz
            .from('points_charge_requests')
            .insert({
              company_id: user.id,
              amount: finalCost,
              original_amount: finalCost,
              discount_rate: 0,
              payment_method: 'bank_transfer',
              status: 'pending',
              bank_transfer_info: {
                campaign_id: campaignId,
                campaign_title: autoTitle,
                campaign_cost: finalCost,
                current_points: currentPoints,
                needed_points: neededPoints,
                reason: 'campaign_creation'
              }
            })
            .select()
            .single()

          if (quoteError) {
            console.error('[CreateCampaign] Charge request error:', quoteError)
            throw quoteError
          }

          setSuccess(`캠페인이 생성되었습니다! 크리에이터 가이드를 작성해주세요.`)
          
          // 크리에이터 가이드 페이지로 이동
          setTimeout(() => {
            navigate(`/company/campaigns/guide?id=${campaignId}`)
          }, 1500)
          return
        }
      }

      // 수정 모드일 경우만 여기로 도달
      setTimeout(() => {
        navigate('/company/campaigns')
      }, 1500)
    } catch (err) {
      console.error('캠페인 저장 실패:', err)
      setError('캠페인 저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">한국 캠페인 생성</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/company/campaigns')}
        >
          목록으로
        </Button>
      </div>

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

      {/* ========================================
          SECTION 1: 캠페인 기본 정보
          ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>📋 캠페인 기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 캠페인 타입 선택 */}
          <div>
            <Label className="text-lg font-semibold mb-4 block">🎯 캠페인 타입 선택 *</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 일반 캠페인 */}
              <label
                className={`relative flex flex-col p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  campaignForm.campaign_type === 'regular'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="campaign_type"
                  value="regular"
                  checked={campaignForm.campaign_type === 'regular'}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, campaign_type: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📝</span>
                  <span className="font-semibold text-lg">일반 캠페인</span>
                </div>
                <p className="text-sm text-gray-600">
                  가격: 20만원 / 30만원 / 40만원<br />
                  대사 + 촬영장면 개별 제공, SNS URL 1개 제출
                </p>
              </label>

              {/* 올영세일 캠페인 */}
              <label
                className={`relative flex flex-col p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  campaignForm.campaign_type === 'oliveyoung'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <input
                  type="radio"
                  name="campaign_type"
                  value="oliveyoung"
                  checked={campaignForm.campaign_type === 'oliveyoung'}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, campaign_type: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🌸</span>
                  <span className="font-semibold text-lg">올영세일 캠페인</span>
                </div>
                <p className="text-sm text-gray-600">
                  가격: 30만원 / 40만원 (2단계만)<br />
                  통합 가이드, 3단계 콘텐츠 (릴스 2개 + 스토리 1개), URL 3개 제출
                </p>
              </label>

              {/* 4주 챌린지 */}
              <label
                className={`relative flex flex-col p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  campaignForm.campaign_type === '4week_challenge'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="campaign_type"
                  value="4week_challenge"
                  checked={campaignForm.campaign_type === '4week_challenge'}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, campaign_type: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🏆</span>
                  <span className="font-semibold text-lg">4주 챌린지</span>
                </div>
                <p className="text-sm text-gray-600">
                  가격: 60만원 (고정)<br />
                  주차별 통합 가이드 4개, 4주 연속 콘텐츠 제작, URL 4개 + 영상 4개 제출
                </p>
              </label>
            </div>
          </div>

          {/* 패키지 선택 */}
          <div>
            <Label htmlFor="package_type" className="text-lg font-semibold">💎 패키지 선택 *</Label>
            <Select 
              value={campaignForm.package_type} 
              onValueChange={handlePackageChange}
              disabled={campaignForm.campaign_type === '4week_challenge'}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="패키지 선택" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {packageOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="bg-white hover:bg-gray-100">
                    <div className="flex flex-col">
                      <span className="font-semibold">{opt.label}</span>
                      <span className="text-sm text-gray-500">{opt.description}</span>
                      <span className="text-sm font-medium text-blue-600">
                        {opt.price.toLocaleString()}원 (VAT 포함: {opt.priceWithVat.toLocaleString()}원)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {campaignForm.campaign_type === '4week_challenge' && (
              <p className="text-sm text-gray-500 mt-2">
                4주 챌린지는 60만원 고정 패키지입니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          SECTION 2: 모집 설정
          ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>👥 모집 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 모집 인원 */}
          <div>
            <Label htmlFor="total_slots">모집 인원 *</Label>
            <Input
              id="total_slots"
              type="number"
              min="1"
              value={campaignForm.total_slots}
              onChange={(e) => handleSlotsChange(e.target.value)}
              className="bg-white"
              required
            />
          </div>

          {/* 예상 크리에이터 정보 (자동 계산) */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">예상 지원 크리에이터 (플랫폼별)</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">🎬</div>
                <div className="text-sm text-gray-600">유튜브</div>
                <div className="text-xl font-bold text-blue-600">
                  {packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.youtube || 0}명
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">📸</div>
                <div className="text-sm text-gray-600">인스타</div>
                <div className="text-xl font-bold text-pink-600">
                  {packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.instagram || 0}명
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">🎵</div>
                <div className="text-sm text-gray-600">틱톡</div>
                <div className="text-xl font-bold text-purple-600">
                  {packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.tiktok || 0}명
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">패키지 금액: <span className="font-semibold">{campaignForm.total_slots}명 × {packageOptions.find(p => p.value === campaignForm.package_type)?.price.toLocaleString() || 0}원</span></span>
                <span className="text-gray-700">= {(campaignForm.total_slots * (packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0)).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-700">부가세(10%): </span>
                <span className="text-gray-700">+ {Math.floor((campaignForm.total_slots * (packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0)) * 0.1).toLocaleString()}원</span>
              </div>
              {calculateDiscount(campaignForm.total_slots * (packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0)) > 0 && (
                <div className="flex justify-between items-center mt-2 text-green-600">
                  <span>할인({calculateDiscount(campaignForm.total_slots * (packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0))}%): </span>
                  <span>- {Math.floor((campaignForm.total_slots * (packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0)) * (calculateDiscount(campaignForm.total_slots * (packageOptions.find(p => p.value === campaignForm.package_type)?.price || 0)) / 100)).toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-200">
                <span className="text-lg font-bold">총 결제액:</span>
                <span className="text-2xl font-bold text-blue-600">₩{campaignForm.estimated_cost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          SECTION 3: 일정 관리
          ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>📅 일정 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 모집 마감일 - 모든 타입 공통 */}
          <div>
            <Label htmlFor="application_deadline">모집 마감일 *</Label>
            <Input
              id="application_deadline"
              type="date"
              value={campaignForm.application_deadline}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
              className="bg-white"
              required
            />
          </div>

          {/* 일반 캠페인 전용 마감일 */}
          {campaignForm.campaign_type === 'regular' && (
            <>
              <div>
                <Label htmlFor="start_date">촬영 마감일 *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={campaignForm.start_date}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="bg-white"
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
                  className="bg-white"
                  required
                />
              </div>
            </>
          )}

          {/* 올영세일 캠페인 전용 - 3단계 콘텐츠 업로드 스케줄 */}
          {campaignForm.campaign_type === 'oliveyoung' && (
            <div className="bg-pink-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span>📅</span>
                <span>3단계 콘텐츠 업로드 스케줄</span>
              </h3>
              <p className="text-sm text-gray-600">
                올영세일 전용 3단계 콘텐츠 전략으로 진행됩니다 (릴스 2건 + 스토리 1건)
              </p>

              <div>
                <Label htmlFor="step1_deadline">STEP 1: 상품 리뷰 마감일 *</Label>
                <Input
                  id="step1_deadline"
                  type="date"
                  value={campaignForm.step1_deadline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, step1_deadline: e.target.value }))}
                  className="bg-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">기대감 형성 - 후리뷰형 방문형 콘텐츠</p>
              </div>

              <div>
                <Label htmlFor="step2_deadline">STEP 2: 세일 홍보 마감일 *</Label>
                <Input
                  id="step2_deadline"
                  type="date"
                  value={campaignForm.step2_deadline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, step2_deadline: e.target.value }))}
                  className="bg-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">구매 전환 유도 - 추천형 콘텐츠</p>
              </div>

              <div>
                <Label htmlFor="step3_deadline">STEP 3: 세일 당일 스토리 마감일 *</Label>
                <Input
                  id="step3_deadline"
                  type="date"
                  value={campaignForm.step3_deadline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, step3_deadline: e.target.value }))}
                  className="bg-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">즉시 구매 유도 - 스토리 릴업 상업</p>
                <p className="text-xs text-blue-600 mt-1">
                  ※ 본 영상은 STEP 2의 영상이 업로드 + URL이 삽입됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 4주 챌린지 전용 - 주차별 마감일 */}
          {campaignForm.campaign_type === '4week_challenge' && (
            <div className="bg-purple-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span>🗓️</span>
                <span>4주 챌린지 스케줄</span>
              </h3>
              <p className="text-sm text-gray-600">
                주차별 통합 가이드 4개, 4주 연속 콘텐츠 제작
              </p>

              <div>
                <Label htmlFor="week1_deadline">Week 1 마감일 *</Label>
                <Input
                  id="week1_deadline"
                  type="date"
                  value={campaignForm.week1_deadline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, week1_deadline: e.target.value }))}
                  className="bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="week2_deadline">Week 2 마감일 *</Label>
                <Input
                  id="week2_deadline"
                  type="date"
                  value={campaignForm.week2_deadline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, week2_deadline: e.target.value }))}
                  className="bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="week3_deadline">Week 3 마감일 *</Label>
                <Input
                  id="week3_deadline"
                  type="date"
                  value={campaignForm.week3_deadline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, week3_deadline: e.target.value }))}
                  className="bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="week4_deadline">Week 4 마감일 *</Label>
                <Input
                  id="week4_deadline"
                  type="date"
                  value={campaignForm.week4_deadline}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, week4_deadline: e.target.value }))}
                  className="bg-white"
                  required
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================
          SECTION 4: 타입별 상세 설정 (올영세일 전용)
          ======================================== */}
      {campaignForm.campaign_type === 'oliveyoung' && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 올리브영 캠페인 상세 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 올리브영 패키지 타입 */}
            <div>
              <Label className="block mb-3">올리브영 패키지 타입 *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label
                  htmlFor="subtype_pick"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    campaignForm.oliveyoung_subtype === 'pick'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <input
                    type="radio"
                    id="subtype_pick"
                    name="oliveyoung_subtype"
                    value="pick"
                    checked={campaignForm.oliveyoung_subtype === 'pick'}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: e.target.value }))}
                    className="sr-only"
                  />
                  <span className="text-2xl">🌟</span>
                  <Label htmlFor="subtype_pick" className="cursor-pointer">
                    올영픽 (Olive Young Pick)
                  </Label>
                </label>

                <label
                  htmlFor="subtype_sale"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    campaignForm.oliveyoung_subtype === 'sale'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <input
                    type="radio"
                    id="subtype_sale"
                    name="oliveyoung_subtype"
                    value="sale"
                    checked={campaignForm.oliveyoung_subtype === 'sale'}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: e.target.value }))}
                    className="sr-only"
                  />
                  <span className="text-2xl">🌸</span>
                  <Label htmlFor="subtype_sale" className="cursor-pointer">
                    올영세일 (Olive Young Sale)
                  </Label>
                </label>

                <label
                  htmlFor="subtype_special"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    campaignForm.oliveyoung_subtype === 'special'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <input
                    type="radio"
                    id="subtype_special"
                    name="oliveyoung_subtype"
                    value="special"
                    checked={campaignForm.oliveyoung_subtype === 'special'}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, oliveyoung_subtype: e.target.value }))}
                    className="sr-only"
                  />
                  <span className="text-2xl">🔥</span>
                  <Label htmlFor="subtype_special" className="cursor-pointer">
                    오특 (오늘의 특가)
                  </Label>
                </label>
              </div>
            </div>

            {/* 타겟 채널 선택 */}
            <div>
              <Label className="block mb-3">타겟 채널 * (1개 이상 선택)</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label
                  htmlFor="platform_youtube"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    campaignForm.target_platforms.includes('youtube')
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="platform_youtube"
                    checked={campaignForm.target_platforms.includes('youtube')}
                    onChange={(e) => {
                      const newPlatforms = e.target.checked
                        ? [...campaignForm.target_platforms, 'youtube']
                        : campaignForm.target_platforms.filter(p => p !== 'youtube')
                      setCampaignForm(prev => ({ ...prev, target_platforms: newPlatforms }))
                    }}
                    className="w-5 h-5"
                  />
                  <span className="text-2xl">🎬</span>
                  <Label htmlFor="platform_youtube" className="cursor-pointer">
                    유튜브 (YouTube)
                  </Label>
                </label>

                <label
                  htmlFor="platform_instagram"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    campaignForm.target_platforms.includes('instagram')
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="platform_instagram"
                    checked={campaignForm.target_platforms.includes('instagram')}
                    onChange={(e) => {
                      const newPlatforms = e.target.checked
                        ? [...campaignForm.target_platforms, 'instagram']
                        : campaignForm.target_platforms.filter(p => p !== 'instagram')
                      setCampaignForm(prev => ({ ...prev, target_platforms: newPlatforms }))
                    }}
                    className="w-5 h-5"
                  />
                  <span className="text-2xl">📸</span>
                  <Label htmlFor="platform_instagram" className="cursor-pointer">
                    인스타그램 (Instagram)
                  </Label>
                </label>

                <label
                  htmlFor="platform_tiktok"
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    campaignForm.target_platforms.includes('tiktok')
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="platform_tiktok"
                    checked={campaignForm.target_platforms.includes('tiktok')}
                    onChange={(e) => {
                      const newPlatforms = e.target.checked
                        ? [...campaignForm.target_platforms, 'tiktok']
                        : campaignForm.target_platforms.filter(p => p !== 'tiktok')
                      setCampaignForm(prev => ({ ...prev, target_platforms: newPlatforms }))
                    }}
                    className="w-5 h-5"
                  />
                  <span className="text-2xl">🎵</span>
                  <Label htmlFor="platform_tiktok" className="cursor-pointer">
                    틱톡 (TikTok)
                  </Label>
                </label>
              </div>
            </div>

            {/* 기업 브랜드 로고 파일 제공 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="provide_logo"
                checked={campaignForm.provide_logo}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, provide_logo: e.target.checked }))}
                className="w-5 h-5"
              />
              <Label htmlFor="provide_logo" className="cursor-pointer">
                크리에이터에게 기업 브랜드 로고 파일 제공 (PNG)
              </Label>
            </div>

            {/* 로고 파일 업로드 */}
            {campaignForm.provide_logo && (
              <div>
                <Label>로고 파일 (PNG) *</Label>
                <Input
                  type="file"
                  accept=".png"
                  onChange={handleLogoUpload}
                  className="bg-white"
                />
                {campaignForm.oliveyoung_logo_url && (
                  <div className="mt-2">
                    <img 
                      src={campaignForm.oliveyoung_logo_url} 
                      alt="로고 미리보기" 
                      className="w-32 h-32 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 세일 시즌 선택 - 올영세일 타입만 */}
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

            {/* 콘텐츠 타입 */}
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

            {/* 올영세일 엠블럼 삽입 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="emblem_required"
                checked={campaignForm.emblem_required}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, emblem_required: e.target.checked }))}
                className="w-5 h-5"
              />
              <Label htmlFor="emblem_required" className="cursor-pointer">
                올영세일 엠블럼 삽입
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================
          SECTION 5: 상품 정보
          ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>📦 상품 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="product_name">상품명</Label>
            <Input
              id="product_name"
              value={campaignForm.product_name}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_name: e.target.value }))}
              placeholder="예: 올리브영 베스트셀러 제품"
              className="bg-white"
            />
          </div>

          <div>
            <Label htmlFor="product_description">상품 설명</Label>
            <Textarea
              id="product_description"
              value={campaignForm.product_description}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_description: e.target.value }))}
              placeholder="상품의 주요 특징과 장점을 입력하세요"
              className="bg-white min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="product_link">상품 링크 (URL)</Label>
            <Input
              id="product_link"
              type="url"
              value={campaignForm.product_link}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, product_link: e.target.value }))}
              placeholder="https://www.oliveyoung.co.kr/..."
              className="bg-white"
            />
          </div>

          <div>
            <Label>상품 상세 페이지 이미지</Label>
            <input
              type="file"
              ref={detailImageInputRef}
              accept="image/*"
              onChange={handleDetailImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => detailImageInputRef.current?.click()}
              disabled={uploadingDetailImage}
              className="w-full"
            >
              {uploadingDetailImage ? '업로드 중...' : '이미지 선택'}
            </Button>
            {campaignForm.product_detail_file_url && (
              <div className="mt-4">
                <img 
                  src={campaignForm.product_detail_file_url} 
                  alt="상품 상세 이미지" 
                  className="max-w-full h-auto rounded border"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          SECTION 6: 캠페인 상세
          ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>📝 캠페인 상세</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 캠페인 썸네일 */}
          <div>
            <Label>캠페인 썸네일</Label>
            <input
              type="file"
              ref={thumbnailInputRef}
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
              {uploadingImage ? '업로드 중...' : '썸네일 선택'}
            </Button>
            {campaignForm.image_url && (
              <div className="mt-4">
                <img 
                  src={campaignForm.image_url} 
                  alt="캠페인 썸네일" 
                  className="max-w-full h-auto rounded border"
                />
              </div>
            )}
          </div>

          {/* 캠페인 제목 */}
          <div>
            <Label htmlFor="title">캠페인 제목 *</Label>
            <Input
              id="title"
              value={campaignForm.title}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="예: 올리브영 봄 세일 캠페인"
              className="bg-white"
              required
            />
          </div>

          {/* 브랜드명 */}
          <div>
            <Label htmlFor="brand">브랜드명 *</Label>
            <Input
              id="brand"
              value={campaignForm.brand}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="예: 올리브영"
              className="bg-white"
              required
            />
          </div>

          {/* 캠페인 설명 */}
          <div>
            <Label htmlFor="requirements">캠페인 설명 *</Label>
            <Textarea
              id="requirements"
              value={campaignForm.requirements}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="캠페인 목표, 요구사항, 주의사항 등을 입력하세요"
              className="bg-white min-h-[150px]"
              required
            />
          </div>

          {/* 카테고리 (플랫폼) 선택 */}
          <div>
            <Label className="block mb-3">모집 플랫폼 * (1개 이상 선택)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categoryOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    campaignForm.category.includes(option.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={campaignForm.category.includes(option.value)}
                    onChange={() => handleCategoryToggle(option.value)}
                    className="w-5 h-5"
                  />
                  <span className="text-lg">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          SECTION 7: 지원자 질문 (선택사항)
          ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>❓ 지원자 질문 (선택사항)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600">
            크리에이터에게 추가로 물어볼 질문을 입력하세요 (최대 4개)
          </p>

          {questionCount >= 1 && (
            <div>
              <Label htmlFor="question1">질문 1</Label>
              <Input
                id="question1"
                value={campaignForm.question1}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, question1: e.target.value }))}
                placeholder="예: 이전에 뷰티 제품 리뷰 경험이 있나요?"
                className="bg-white"
              />
            </div>
          )}

          {questionCount >= 2 && (
            <div>
              <Label htmlFor="question2">질문 2</Label>
              <Input
                id="question2"
                value={campaignForm.question2}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, question2: e.target.value }))}
                placeholder="예: 선호하는 콘텐츠 스타일은 무엇인가요?"
                className="bg-white"
              />
            </div>
          )}

          {questionCount >= 3 && (
            <div>
              <Label htmlFor="question3">질문 3</Label>
              <Input
                id="question3"
                value={campaignForm.question3}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, question3: e.target.value }))}
                placeholder="추가 질문을 입력하세요"
                className="bg-white"
              />
            </div>
          )}

          {questionCount >= 4 && (
            <div>
              <Label htmlFor="question4">질문 4</Label>
              <Input
                id="question4"
                value={campaignForm.question4}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, question4: e.target.value }))}
                placeholder="추가 질문을 입력하세요"
                className="bg-white"
              />
            </div>
          )}

          <div className="flex gap-2">
            {questionCount < 4 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestionCount(prev => prev + 1)}
              >
                + 질문 추가
              </Button>
            )}
            {questionCount > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuestionCount(prev => prev - 1)
                  // 마지막 질문 초기화
                  if (questionCount === 4) {
                    setCampaignForm(prev => ({ ...prev, question4: '' }))
                  } else if (questionCount === 3) {
                    setCampaignForm(prev => ({ ...prev, question3: '' }))
                  } else if (questionCount === 2) {
                    setCampaignForm(prev => ({ ...prev, question2: '' }))
                  }
                }}
              >
                - 질문 제거
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={processing}
          className="flex-1"
        >
          {processing ? '처리 중...' : (editId ? '캠페인 수정' : '캠페인 생성')}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/company/campaigns')}
          disabled={processing}
        >
          취소
        </Button>
      </div>
    </div>
  )
}

export default CampaignCreationKorea
