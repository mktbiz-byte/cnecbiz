import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Plus, 
  Eye, 
  TrendingUp, 
  Users, 
  UserCheck, 
  Clock, 
  AlertCircle,
  CreditCard,
  CheckCircle,
  DollarSign
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { supabase as supabaseKorea } from '../../lib/supabaseKorea'
import RegionSelectModal from './RegionSelectModal'

export default function MyCampaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [participants, setParticipants] = useState({})
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRegionModal, setShowRegionModal] = useState(false)

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
      fetchCampaigns(user.email)
    }
  }

  const fetchCampaigns = async (userEmail) => {
    setLoading(true)
    try {
      // 한국 지역 캠페인 가져오기 (company_email 기준)
      const { data: koreaCampaigns } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('company_email', userEmail)
        .order('created_at', { ascending: false })

      // 지역 표시를 위해 region 필드 추가
      const campaignsWithRegion = (koreaCampaigns || []).map(c => ({
        ...c,
        region: 'korea'
      }))

      setCampaigns(campaignsWithRegion)

      // 각 캠페인의 참여자 정보 가져오기
      const participantsData = {}
      for (const campaign of campaignsWithRegion) {
        const { data } = await supabaseKorea
          .from('campaign_participants')
          .select('*')
          .eq('campaign_id', campaign.id)
        
        participantsData[campaign.id] = {
          total: data?.length || 0,
          selected: data?.filter(p => p.selection_status === 'selected').length || 0,
          guideConfirmed: data?.filter(p => p.guide_confirmed).length || 0
        }
      }
      setParticipants(participantsData)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPackagePrice = (packageType) => {
    const prices = {
      'oliveyoung': 200000,
      '올영 20만원': 200000,
      'premium': 300000,
      '프리미엄 30만원': 300000,
      '4week_challenge': 600000,
      '4주챌린지 60만원': 600000
    }
    return prices[packageType] || 0
  }

  const getPaymentStatusBadge = (status) => {
    const badges = {
      pending: { label: '입금 대기', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: '입금 완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { label: '입금 실패', color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }
    const badge = badges[status] || { label: '예산 미연동', color: 'bg-gray-100 text-gray-800', icon: CreditCard }
    const Icon = badge.icon
    return (
      <Badge className={`${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </Badge>
    )
  }

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getProgressStatusBadge = (status) => {
    const badges = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
      pending_approval: { label: '승인대기', color: 'bg-orange-100 text-orange-700' },
      pending: { label: '승인대기', color: 'bg-orange-100 text-orange-700' },
      recruiting: { label: '모집중', color: 'bg-blue-100 text-blue-700' },
      guide_confirmation: { label: '가이드 확인중', color: 'bg-purple-100 text-purple-700' },
      filming: { label: '촬영중', color: 'bg-yellow-100 text-yellow-700' },
      editing: { label: '수정중', color: 'bg-pink-100 text-pink-700' },
      approved: { label: '진행중', color: 'bg-green-100 text-green-700' },
      completed: { label: '완료', color: 'bg-green-100 text-green-700' }
    }
    const badge = badges[status] || badges.draft
    return (
      <Badge className={badge.color}>
        {badge.label}
      </Badge>
    )
  }

  const getRegionBadge = (region) => {{
    const badges = {
      korea: { label: 'KR 한국', color: 'bg-blue-100 text-blue-700' },
      japan: { label: 'JP 일본', color: 'bg-red-100 text-red-700' },
      usa: { label: 'US 미국', color: 'bg-purple-100 text-purple-700' },
      taiwan: { label: 'TW 대만', color: 'bg-green-100 text-green-700' }
    }
    const badge = badges[region] || badges.korea
    return (
      <Badge variant="outline" className={badge.color}>
        {badge.label}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/company/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                내 캠페인
              </h1>
              <p className="text-gray-600 mt-1">생성한 캠페인을 관리하세요</p>
            </div>
          </div>
          <Button onClick={() => setShowRegionModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            새 캠페인 만들기
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">전체 캠페인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{campaigns.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">승인 대기</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {campaigns.filter(c => c.approval_status === 'draft' || c.approval_status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">진행중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {campaigns.filter(c => c.approval_status === 'approved' && c.status !== 'completed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">완료</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {campaigns.filter(c => c.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>캠페인 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>아직 생성된 캠페인이 없습니다.</p>
                <Button 
                  className="mt-4"
                  onClick={() => setShowRegionModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 캠페인 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const packagePrice = getPackagePrice(campaign.package_type)
                  const totalCost = packagePrice * (campaign.total_slots || 0)
                  const participantInfo = participants[campaign.id] || { total: 0, selected: 0, guideConfirmed: 0 }
                  const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline)
                  const submissionDays = getDaysRemaining(campaign.content_submission_deadline)

                  return (
                    <div 
                      key={campaign.id}
                      className="border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/company/campaigns/${campaign.id}`)}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getRegionBadge(campaign.region)}
                            {getPaymentStatusBadge(campaign.payment_status)}
                            {getProgressStatusBadge(campaign.progress_status || campaign.approval_status)}
                          </div>
                          <h3 className="font-bold text-xl mb-1">{campaign.title}</h3>
                          <p className="text-sm text-gray-600">
                            {campaign.brand} • {campaign.product_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600 mb-1">결제 예상 금액</div>
                          <div className="text-2xl font-bold text-blue-600">
                            ₩{totalCost.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {campaign.package_type}
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-gray-600">모집 인원</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {campaign.total_slots || 0}명
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <UserCheck className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-gray-600">지원 크리에이터</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {participantInfo.total}명
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-gray-600">확정 크리에이터</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            {participantInfo.selected}명
                          </div>
                        </div>
                      </div>

                      {/* Deadlines */}
                      <div className="flex items-center justify-between text-sm border-t pt-3">
                        <div className="flex items-center gap-6">
                          {recruitmentDays !== null && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">모집 마감일:</span>
                              <span className={`font-semibold ${recruitmentDays < 7 ? 'text-red-600' : 'text-gray-900'}`}>
                                {recruitmentDays > 0 ? `D-${recruitmentDays}` : '마감'}
                              </span>
                            </div>
                          )}
                          {submissionDays !== null && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">영상 제출 마감일:</span>
                              <span className={`font-semibold ${submissionDays < 7 ? 'text-red-600' : 'text-gray-900'}`}>
                                {submissionDays > 0 ? `D-${submissionDays}` : '마감'}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/company/campaigns/${campaign.id}`)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showRegionModal && (
        <RegionSelectModal onClose={() => setShowRegionModal(false)} />
      )}
    </div>
  )
}

