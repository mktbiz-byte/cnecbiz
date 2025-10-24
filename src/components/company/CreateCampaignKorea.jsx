import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { createClient } from '@supabase/supabase-js'

export default function CreateCampaignKorea() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'

  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    description: '',
    requirements: '',
    category: 'youtube',
    image_url: '',
    reward_points: '',
    total_slots: '',
    remaining_slots: '',
    application_deadline: '',
    start_date: '',
    end_date: '',
    status: 'pending',
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

  // 카테고리 옵션
  const categoryOptions = [
    { value: 'youtube', label: '🎬 유튜브 모집', platforms: { youtube: true, instagram: false, tiktok: false } },
    { value: 'instagram', label: '📸 인스타 모집', platforms: { instagram: true, youtube: false, tiktok: false } },
    { value: '4week_challenge', label: '🏆 4주 챌린지', platforms: { instagram: true, youtube: true, tiktok: true } }
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
    }
  }

  // 카테고리 변경 시 target_platforms 자동 업데이트
  const handleCategoryChange = (value) => {
    const selected = categoryOptions.find(opt => opt.value === value)
    setFormData(prev => ({
      ...prev,
      category: value,
      target_platforms: selected ? selected.platforms : prev.target_platforms
    }))
  }

  // 이미지 업로드 (cnec-kr Supabase 사용)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // cnec-kr Supabase 클라이언트 생성
      const cnecKrUrl = 'https://psfwmzlnaboattocyupu.supabase.co'
      const cnecKrKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZndtemxuYWJvYXR0b2N5dXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTU2NzgsImV4cCI6MjA3NDE5MTY3OH0.59A4QPRwv8YjfasHu_NTTv0fH6YhG8L_mBkOZypfgwg'
      const cnecKrSupabase = createClient(cnecKrUrl, cnecKrKey)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `campaign-images/${fileName}`

      const { error: uploadError } = await cnecKrSupabase.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = cnecKrSupabase.storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
      alert('이미지가 업로드되었습니다!')
    } catch (err) {
      console.error('이미지 업로드 실패:', err)
      alert('이미지 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // 캠페인 저장
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!company) {
        alert('회사 정보를 찾을 수 없습니다.')
        return
      }

      // cnec-kr Supabase 클라이언트 생성
      const cnecKrUrl = 'https://psfwmzlnaboattocyupu.supabase.co'
      const cnecKrKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZndtemxuYWJvYXR0b2N5dXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTU2NzgsImV4cCI6MjA3NDE5MTY3OH0.59A4QPRwv8YjfasHu_NTTv0fH6YhG8L_mBkOZypfgwg'
      const cnecKrSupabase = createClient(cnecKrUrl, cnecKrKey)

      // questions 배열 생성
      const questions = [
        formData.question1,
        formData.question2,
        formData.question3,
        formData.question4
      ].filter(q => q && q.trim() !== '').map(q => ({ question: q }))

      const campaignData = {
        title: formData.title,
        brand: formData.brand,
        description: formData.description,
        requirements: formData.requirements,
        category: formData.category,
        image_url: formData.image_url,
        reward_points: parseInt(formData.reward_points) || 0,
        total_slots: parseInt(formData.total_slots) || 0,
        remaining_slots: parseInt(formData.remaining_slots) || parseInt(formData.total_slots) || 0,
        application_deadline: formData.application_deadline,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'pending',
        questions: questions.length > 0 ? questions : null,
        company_id: company.id,
        company_name: company.company_name,
        region: 'korea'
      }

      const { data, error } = await cnecKrSupabase
        .from('campaigns')
        .insert([campaignData])
        .select()

      if (error) throw error

      alert('캠페인이 생성되었습니다! 관리자 승인 후 활성화됩니다.')
      navigate('/company/campaigns')
    } catch (err) {
      console.error('캠페인 저장 실패:', err)
      alert('캠페인 저장에 실패했습니다: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            캠페인 목록으로
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              🇰🇷 한국 캠페인 생성
            </CardTitle>
            <p className="text-sm text-gray-600">cnec-kr 데이터베이스에 캠페인이 생성됩니다</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 카테고리 선택 */}
              <div>
                <Label htmlFor="category">캠페인 카테고리 *</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
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
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 신제품 립스틱 리뷰 캠페인"
                  required
                />
              </div>

              {/* 브랜드명 */}
              <div>
                <Label htmlFor="brand">브랜드명 *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="예: 에이블씨엔씨"
                  required
                />
              </div>

              {/* 캠페인 설명 */}
              <div>
                <Label htmlFor="description">캠페인 설명 *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="캠페인에 대한 자세한 설명을 입력하세요"
                  rows={4}
                  required
                />
              </div>

              {/* 참여 요구사항 */}
              <div>
                <Label htmlFor="requirements">참여 요구사항</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="크리에이터가 충족해야 할 조건을 입력하세요"
                  rows={3}
                />
              </div>

              {/* 이미지 업로드 */}
              <div>
                <Label htmlFor="image">캠페인 이미지</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <p className="text-sm text-gray-600 mt-2">업로드 중...</p>}
                {formData.image_url && (
                  <div className="mt-4">
                    <img src={formData.image_url} alt="Preview" className="max-w-xs rounded-lg" />
                  </div>
                )}
              </div>

              {/* 리워드 포인트 */}
              <div>
                <Label htmlFor="reward_points">리워드 포인트 *</Label>
                <Input
                  id="reward_points"
                  type="number"
                  value={formData.reward_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, reward_points: e.target.value }))}
                  placeholder="예: 50000"
                  required
                />
              </div>

              {/* 모집 인원 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_slots">총 모집 인원 *</Label>
                  <Input
                    id="total_slots"
                    type="number"
                    value={formData.total_slots}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      total_slots: e.target.value,
                      remaining_slots: e.target.value
                    }))}
                    placeholder="예: 10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="remaining_slots">남은 인원</Label>
                  <Input
                    id="remaining_slots"
                    type="number"
                    value={formData.remaining_slots}
                    onChange={(e) => setFormData(prev => ({ ...prev, remaining_slots: e.target.value }))}
                    placeholder="자동 설정됨"
                  />
                </div>
              </div>

              {/* 날짜 설정 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="application_deadline">신청 마감일 *</Label>
                  <Input
                    id="application_deadline"
                    type="date"
                    value={formData.application_deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, application_deadline: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">시작일</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">종료일</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* 추가 질문 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>추가 질문 (선택)</Label>
                  <Select value={questionCount.toString()} onValueChange={(val) => setQuestionCount(parseInt(val))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">질문 없음</SelectItem>
                      <SelectItem value="1">1개</SelectItem>
                      <SelectItem value="2">2개</SelectItem>
                      <SelectItem value="3">3개</SelectItem>
                      <SelectItem value="4">4개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {questionCount >= 1 && (
                  <div className="mb-3">
                    <Input
                      placeholder="질문 1"
                      value={formData.question1}
                      onChange={(e) => setFormData(prev => ({ ...prev, question1: e.target.value }))}
                    />
                  </div>
                )}
                {questionCount >= 2 && (
                  <div className="mb-3">
                    <Input
                      placeholder="질문 2"
                      value={formData.question2}
                      onChange={(e) => setFormData(prev => ({ ...prev, question2: e.target.value }))}
                    />
                  </div>
                )}
                {questionCount >= 3 && (
                  <div className="mb-3">
                    <Input
                      placeholder="질문 3"
                      value={formData.question3}
                      onChange={(e) => setFormData(prev => ({ ...prev, question3: e.target.value }))}
                    />
                  </div>
                )}
                {questionCount >= 4 && (
                  <div className="mb-3">
                    <Input
                      placeholder="질문 4"
                      value={formData.question4}
                      onChange={(e) => setFormData(prev => ({ ...prev, question4: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/company/campaigns')}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      캠페인 생성
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

