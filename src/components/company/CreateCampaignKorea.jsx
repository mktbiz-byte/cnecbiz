import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, storage } from '../../lib/supabaseKorea'
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
    category: 'youtube',  // youtube, instagram
    image_url: '',
    product_name: '',
    product_description: '',
    product_link: '',
    product_detail_file_url: '',
    package_type: 'oliveyoung',  // oliveyoung, premium, 4week_challenge
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
  const [imageFile, setImageFile] = useState(null)

  // 카테고리 옵션
  const categoryOptions = [
    { value: 'youtube', label: '🎬 유튜브 모집', platforms: { youtube: true, instagram: false, tiktok: false } },
    { value: 'instagram', label: '📸 인스타 모집', platforms: { instagram: true, youtube: false, tiktok: false } }
  ]

  // 패키지 옵션
  const packageOptions = [
    { value: 'oliveyoung', label: '올영 패키지', price: 200000 },
    { value: 'premium', label: '프리미엄 패키지', price: 300000 },
    { value: '4week_challenge', label: '4주 챌린지', price: 600000 }
  ]

  // 편집 모드일 때 데이터 로드
  useEffect(() => {
    if (editId) {
      loadCampaignData()
    }
  }, [editId])

  const loadCampaignData = async () => {
    try {
      const { data, error } = await database
        .from('campaigns')
        .select('*')
        .eq('id', editId)
        .single()

      if (error) throw error
      
      if (data) {
        setCampaignForm({
          ...data,
          target_platforms: data.target_platforms || { instagram: true, youtube: false, tiktok: false }
        })
        
        // 질문 개수 계산
        let count = 0
        if (data.question1) count = 1
        if (data.question2) count = 2
        if (data.question3) count = 3
        if (data.question4) count = 4
        setQuestionCount(count || 1)
      }
    } catch (err) {
      console.error('캠페인 데이터 로드 실패:', err)
      setError('캠페인 데이터를 불러오는데 실패했습니다.')
    }
  }

  // 카테고리 변경 시 target_platforms 자동 업데이트
  const handleCategoryChange = (value) => {
    const selected = categoryOptions.find(opt => opt.value === value)
    setCampaignForm(prev => ({
      ...prev,
      category: value,
      target_platforms: selected ? selected.platforms : prev.target_platforms
    }))
  }

  // 패키지 변경 핸들러 (결제 금액 자동 계산)
  const handlePackageChange = (value) => {
    const selectedPackage = packageOptions.find(p => p.value === value)
    if (selectedPackage) {
      const estimatedCost = selectedPackage.price * campaignForm.total_slots
      setCampaignForm(prev => ({
        ...prev,
        package_type: value,
        estimated_cost: estimatedCost
      }))
    }
  }

  // 모집 인원 변경 핸들러 (결제 금액 자동 계산)
  const handleSlotsChange = (value) => {
    const slots = parseInt(value) || 0
    const selectedPackage = packageOptions.find(p => p.value === campaignForm.package_type)
    const estimatedCost = selectedPackage ? selectedPackage.price * slots : 0
    
    setCampaignForm(prev => ({
      ...prev,
      total_slots: slots,
      remaining_slots: slots,
      estimated_cost: estimatedCost
    }))
  }

  // 이미지 업로드
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `campaign-images/${fileName}`

      const { error: uploadError } = await storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      setCampaignForm(prev => ({ ...prev, image_url: publicUrl }))
      setSuccess('이미지가 업로드되었습니다!')
    } catch (err) {
      console.error('이미지 업로드 실패:', err)
      setError('이미지 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // 상품 상세 이미지 업로드
  const handleProductDetailImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
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
      setUploadingImage(false)
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

      const campaignData = {
        ...restForm,
        reward_points: parseInt(campaignForm.reward_points) || 0,
        total_slots: parseInt(campaignForm.total_slots) || 0,
        remaining_slots: parseInt(campaignForm.remaining_slots) || parseInt(campaignForm.total_slots) || 0,
        questions: questions.length > 0 ? questions : null
      }

      if (editId) {
        // 수정
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', editId)

        if (error) throw error
        setSuccess('캠페인이 수정되었습니다!')
      } else {
        // 신규 생성
        const { error } = await supabase
          .from('campaigns')
          .insert([campaignData])

        if (error) throw error
        setSuccess('캠페인이 생성되었습니다!')
      }

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
              {/* 카테고리 선택 */}
              <div>
                <Label htmlFor="category">캠페인 카테고리 *</Label>
                <Select value={campaignForm.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="bg-white hover:bg-gray-100">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 캠페인 제목 */}
              <div>
                <Label htmlFor="title">캠페인 제목 *</Label>
                <Input
                  id="title"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 신제품 립스틱 리뷰 캠페인"
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
                  placeholder="예: 팔로워 1,000명 이상, 뷰티 콘텐츠 제작 경험"
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
                        {opt.label} - ₩{opt.price.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  {packageOptions.find(p => p.value === campaignForm.package_type)?.label} - 1인당 ₩{packageOptions.find(p => p.value === campaignForm.package_type)?.price.toLocaleString()}
                </p>
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
                  <Label htmlFor="estimated_cost">결제 예상 금액</Label>
                  <Input
                    id="estimated_cost"
                    type="text"
                    value={`₩${campaignForm.estimated_cost.toLocaleString()}`}
                    disabled
                    className="bg-gray-100 font-semibold text-blue-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {campaignForm.total_slots}명 × ₩{packageOptions.find(p => p.value === campaignForm.package_type)?.price.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="application_deadline">지원 마감일 *</Label>
                  <Input
                    id="application_deadline"
                    type="date"
                    value={campaignForm.application_deadline}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">캠페인 시작일 *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={campaignForm.start_date}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">캠페인 종료일 *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={campaignForm.end_date}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* 이미지 업로드 */}
              <div>
                <Label htmlFor="image">캠페인 이미지</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage && <p className="text-sm text-gray-500 mt-1">업로드 중...</p>}
                {campaignForm.image_url && (
                  <img src={campaignForm.image_url} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
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
                    <Label htmlFor="product_detail_image">상품 상세 페이지 이미지</Label>
                    <p className="text-sm text-gray-600 mb-2">상품 상세 정보가 담긴 이미지 파일을 업로드하세요 (권장: 10MB 이하)</p>
                    <Input
                      id="product_detail_image"
                      type="file"
                      accept="image/*"
                      onChange={handleProductDetailImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && <p className="text-sm text-gray-500 mt-1">업로드 중...</p>}
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
                  📌 캠페인은 <strong>"임시저장"</strong> 상태로 저장됩니다. 
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
                <Button type="submit" disabled={processing} className="flex-1">
                  {processing ? '저장 중...' : (editId ? '수정하기' : '임시저장')}
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
