import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, CheckCircle } from 'lucide-react'
import { supabaseBiz, createCampaignInRegions } from '../../lib/supabaseClients'

export default function CreateCampaign() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: 0,
    creator_count: 1,
    start_date: '',
    end_date: '',
    target_audience: '',
    product_category: 'beauty',
    regions: []
  })

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
    setUser(user)

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
    }
  }

  const handleRegionToggle = (region) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.description || formData.regions.length === 0) {
      alert('필수 항목을 모두 입력해주세요')
      return
    }

    if (formData.budget <= 0) {
      alert('예산을 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const campaignData = {
        company_id: company.id,
        title: formData.title,
        description: formData.description,
        budget: formData.budget,
        creator_count: formData.creator_count,
        start_date: formData.start_date,
        end_date: formData.end_date,
        target_audience: formData.target_audience,
        product_category: formData.product_category,
        status: 'pending'
      }

      const results = await createCampaignInRegions(campaignData, formData.regions)

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        alert(`캠페인이 생성되었습니다!\n성공: ${successCount}개 지역\n실패: ${failCount}개 지역`)
        navigate('/company/campaigns')
      } else {
        alert('캠페인 생성에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('캠페인 생성 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">새 캠페인 만들기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium mb-2">캠페인 제목 *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 신제품 글로벌 론칭 캠페인"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">캠페인 설명 *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="캠페인의 목표와 내용을 자세히 설명해주세요"
                  className="w-full px-4 py-2 border rounded-lg min-h-32"
                  required
                />
              </div>

              {/* Target Regions */}
              <div>
                <label className="block text-sm font-medium mb-2">타겟 지역 * (복수 선택 가능)</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'japan', label: '🇯🇵 일본', color: 'red' },
                    { id: 'us', label: '🇺🇸 미국', color: 'blue' },
                    { id: 'taiwan', label: '🇹🇼 대만', color: 'green' }
                  ].map(region => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => handleRegionToggle(region.id)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.regions.includes(region.id)
                          ? `border-${region.color}-600 bg-${region.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{region.label}</span>
                        {formData.regions.includes(region.id) && (
                          <CheckCircle className={`w-5 h-5 text-${region.color}-600`} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget & Creators */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">예산 (원) *</label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                    placeholder="2000000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">크리에이터 수</label>
                  <Input
                    type="number"
                    value={formData.creator_count}
                    onChange={(e) => setFormData({ ...formData, creator_count: parseInt(e.target.value) })}
                    placeholder="5"
                    min="1"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">시작일</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">종료일</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">제품 카테고리</label>
                <select
                  value={formData.product_category}
                  onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="beauty">뷰티</option>
                  <option value="fashion">패션</option>
                  <option value="food">식품</option>
                  <option value="lifestyle">라이프스타일</option>
                  <option value="tech">테크</option>
                  <option value="other">기타</option>
                </select>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium mb-2">타겟 고객</label>
                <Input
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  placeholder="예: 20-30대 여성"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {loading ? '생성 중...' : '캠페인 생성'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/company/dashboard')}
                >
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

