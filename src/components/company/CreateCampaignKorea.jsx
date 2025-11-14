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
    question4: ''
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

  // 패키지 옵션
  const packageOptions = [
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
    },
    { 
      value: '4week_challenge', 
      label: '4주 챌린지 프로그램', 
      price: 600000,
      priceWithVat: 660000,
      description: '4주간 지속적인 콘텐츠 제작',
      expectedApplicants: { youtube: 8, instagram: 15, tiktok: 12 }
    }
  ]

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

      const campaignData = {
        ...restForm,
        title: autoTitle,
        reward_points: parseInt(campaignForm.reward_points) || 0,
        total_slots: parseInt(campaignForm.total_slots) || 0,
        remaining_slots: parseInt(campaignForm.remaining_slots) || parseInt(campaignForm.total_slots) || 0,
        questions: questions.length > 0 ? questions : null,
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            ← 캠페인 목록으로
          </Button>
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
              {/* 카테고리 선택 (체크박스) */}
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


              {/* 브랜드명 */}
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

              {/* 참여 조건 */}
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

              {/* 패키지 선택 */}
              <div>
                <Label htmlFor="package_type">패키지 선택 *</Label>
                <Select value={campaignForm.package_type} onValueChange={handlePackageChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="패키지 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {packageOptions.map(opt => (
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
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-red-600">🎥</span>
                      <span className="text-gray-700">유튜브:</span>
                      <span className="font-semibold">{packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.youtube}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-pink-600">📸</span>
                      <span className="text-gray-700">인스타:</span>
                      <span className="font-semibold">{packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.instagram}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-black">🎵</span>
                      <span className="text-gray-700">틱톡:</span>
                      <span className="font-semibold">{packageOptions.find(p => p.value === campaignForm.package_type)?.expectedApplicants.tiktok}명</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    * 금액대에 따라 지원율이 다소 차이가 납니다. 위 수치는 평균 예상치입니다.
                  </p>
                </div>
              </div>

              {/* 모집 인원 및 결제 예상 금액 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_slots">모집 인원 *</Label>
                  <Input
                    id="total_slots"
                    type="number"
                    value={campaignForm.total_slots}
                    onChange={(e) => handleSlotsChange(e.target.value)}
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
                  {(() => {
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

              {/* 날짜 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="application_deadline">모집 마감일 *</Label>
                  <Input
                    id="application_deadline"
                    type="date"
                    value={campaignForm.application_deadline}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                    required
                  />
                </div>
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

              {/* 썸네일 업로드 */}
              <div>
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
