import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import RegionSelectModal from './RegionSelectModal'
import CompanyNavigation from './CompanyNavigation'

export default function MyCampaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [participants, setParticipants] = useState({})
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

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

    // Korea DB에서 회사 정보 조회 (오류 시 Biz DB로 fallback)
    let companyData = null
    
    try {
      const result = await supabaseKorea
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      companyData = result.data
    } catch (koreaError) {
      console.log('[MyCampaigns] Korea DB query failed, trying Biz DB:', koreaError)
    }

    // Korea DB에 없거나 오류 발생 시 Biz DB에서 조회
    if (!companyData) {
      const result = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      companyData = result.data
    }

    if (companyData) {
      setCompany(companyData)
    }
    
    // 회사 정보가 없어도 캠페인은 조회
    fetchCampaigns(user.email)
  }

  const fetchCampaigns = async (userEmail) => {
    setLoading(true)
    try {
      console.log('[MyCampaigns] Fetching campaigns for email:', userEmail)
      
      // 한국 지역 캠페인 가져오기 (company_email 기준)
      const { data: koreaCampaigns, error: koreaError } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('company_email', userEmail)
        .order('created_at', { ascending: false })
      
      console.log('[MyCampaigns] Korea campaigns result:', { koreaCampaigns, koreaError })

      // 일본 지역 캠페인 가져오기 (company_email 기준)
      const supabaseJapan = getSupabaseClient('japan')
      const { data: japanCampaigns, error: japanError } = await supabaseJapan
        .from('campaigns')
        .select('*')
        .eq('company_email', userEmail)
        .order('created_at', { ascending: false })
      
      console.log('[MyCampaigns] Japan campaigns result:', { japanCampaigns, japanError })

      // 지역 표시를 위해 region 필드 추가
      const koreaCampaignsWithRegion = (koreaCampaigns || []).map(c => ({
        ...c,
        region: 'korea'
      }))

      const japanCampaignsWithRegion = (japanCampaigns || []).map(c => ({
        ...c,
        region: 'japan'
      }))

      // 한국 + 일본 캠페인 합치기
      const campaignsWithRegion = [...koreaCampaignsWithRegion, ...japanCampaignsWithRegion]

      // 취소된 캠페인은 하단으로 정렬
      const sortedCampaigns = campaignsWithRegion.sort((a, b) => {
        // 취소된 캠페인은 하단으로
        if (a.is_cancelled && !b.is_cancelled) return 1
        if (!a.is_cancelled && b.is_cancelled) return -1
        // 나머지는 생성일 기준 내림차순
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setCampaigns(sortedCampaigns)

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

  const handlePayWithPoints = async (campaign) => {
    try {
      // 캠페인 금액 계산
      let packagePrice
      if (campaign.campaign_type === '4week_challenge' || campaign.campaign_type === '4week') {
        packagePrice = 600000 // 4주 챌린지는 60만원 고정
      } else {
        packagePrice = getPackagePrice(campaign.package_type)
      }
      const recruitmentCount = campaign.total_slots || campaign.recruitment_count || 1
      const totalCost = packagePrice * recruitmentCount

      // 회사 포인트 잔액 확인
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      // Korea DB에서 회사 정보 조회 (오류 시 Biz DB로 fallback)
      let companyData = null
      let companyDB = supabaseKorea
      
      try {
        const result = await supabaseKorea
          .from('companies')
          .select('points_balance, id')
          .eq('user_id', user.id)
          .maybeSingle()
        companyData = result.data
      } catch (koreaError) {
        console.log('[MyCampaigns] Korea DB query failed, trying Biz DB:', koreaError)
      }

      // Korea DB에 없거나 오류 발생 시 Biz DB에서 조회
      if (!companyData) {
        const result = await supabaseBiz
          .from('companies')
          .select('points_balance, id')
          .eq('user_id', user.id)
          .maybeSingle()
        companyData = result.data
        companyDB = supabaseBiz
      }

      if (!companyData) {
        alert('회사 정보를 찾을 수 없습니다.')
        return
      }

      // 포인트 부족 체크
      if (companyData.points_balance < totalCost) {
        alert(`포인트가 모자랍니다.\n\n필요 포인트: ${totalCost.toLocaleString()}P\n현재 포인트: ${companyData.points_balance.toLocaleString()}P\n부족 포인트: ${(totalCost - companyData.points_balance).toLocaleString()}P`)
        return
      }

      // 확인 메시지
      const confirmed = window.confirm(
        `포인트를 차감하고 관리자 승인을 요청하시겠습니까?\n\n현재 포인트: ${companyData.points_balance.toLocaleString()}P\n차감 포인트: ${totalCost.toLocaleString()}P\n차감 후 잔여 포인트: ${(companyData.points_balance - totalCost).toLocaleString()}P`
      )

      if (!confirmed) return

      // 포인트 거래 기록 먼저 생성
      const newBalance = companyData.points_balance - totalCost
      const { error: transactionError } = await companyDB
        .from('points_transactions')
        .insert([{
          company_id: user.id,
          campaign_id: campaign.id,
          amount: -totalCost,
          type: 'spend',
          description: `캠페인 결제: ${campaign.title}`,
          balance_after: newBalance
        }])

      if (transactionError) throw transactionError

      // 포인트 차감 (거래 기록 생성 성공 후)
      const { error: pointsError } = await companyDB
        .from('companies')
        .update({ points_balance: newBalance })
        .eq('id', companyData.id)

      if (pointsError) throw pointsError

      // approval_status를 'pending'으로 변경 (캠페인이 있는 DB에서)
      const campaignDB = campaign.region === 'japan' ? getSupabaseClient('japan') : supabaseKorea
      const { error: campaignError } = await campaignDB
        .from('campaigns')
        .update({ 
          approval_status: 'pending',
          payment_status: 'confirmed'
        })
        .eq('id', campaign.id)

      if (campaignError) throw campaignError

      // 네이버 웍스 알림 전송
      try {
        const campaignTypeText = 
          campaign.campaign_type === 'oliveyoung' ? '올영세일' :
          campaign.campaign_type === '4week' ? '4주 챌린지' :
          '기획형'
        
        const message = `🔔 새로운 캠페인 승인 요청\n\n` +
          `캠페인명: ${campaign.title}\n` +
          `기업명: ${companyData.company_name || company?.company_name || ''}\n` +
          `캠페인 타입: ${campaignTypeText}\n` +
          `결제 금액: ${totalCost.toLocaleString()}원 (포인트)\n` +
          `신청 시간: ${new Date().toLocaleString('ko-KR')}\n\n` +
          `승인 페이지: https://cnectotal.netlify.app/admin/approvals`
        
        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            isAdminNotification: true
          })
        })
      } catch (notifError) {
        console.error('네이버 웍스 알림 전송 실패:', notifError)
        // 알림 실패해도 결제는 성공으로 처리
      }

      alert('포인트 차감 및 승인 요청이 완료되었습니다!')
      
      // 페이지 새로고침
      checkAuth()
    } catch (error) {
      console.error('Error paying with points:', error)
      alert('오류가 발생했습니다: ' + error.message)
    }
  }

  const getPackagePrice = (packageType) => {
    const prices = {
      'junior': 200000,
      'intermediate': 300000,
      'senior': 500000,
      'oliveyoung': 200000,
      '올영 20만원': 200000,
      'premium': 300000,
      '프리미엄 30만원': 300000,
      '4week_challenge': 600000,
      '4주챌린지 60만원': 600000
    }
    return prices[packageType?.toLowerCase()] || 200000
  }

  const getPaymentStatusBadge = (status, isCancelled) => {
    // 취소된 캠페인은 "취소됨" 표시
    if (isCancelled) {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          취소됨
        </Badge>
      )
    }
    
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

  const getProgressStatusBadge = (status, isCancelled) => {
    // 취소된 캠페인은 항상 "취소됨" 표시
    if (isCancelled) {
      return (
        <Badge className="bg-red-100 text-red-800">
          취소됨
        </Badge>
      )
    }
    
    const badges = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
      pending_payment: { label: '입금 대기', color: 'bg-yellow-100 text-yellow-700' },
      pending_approval: { label: '승인대기', color: 'bg-orange-100 text-orange-700' },
      pending: { label: '승인대기', color: 'bg-orange-100 text-orange-700' },
      recruiting: { label: '모집중', color: 'bg-blue-100 text-blue-700' },
      guide_confirmation: { label: '가이드 확인중', color: 'bg-purple-100 text-purple-700' },
      filming: { label: '촬영중', color: 'bg-yellow-100 text-yellow-700' },
      editing: { label: '수정중', color: 'bg-pink-100 text-pink-700' },
      approved: { label: '진행중', color: 'bg-green-100 text-green-700' },
      completed: { label: '완료', color: 'bg-green-100 text-green-700' }
    }
    const badge = badges[status] || { label: '작성중', color: 'bg-gray-100 text-gray-700' }
    return (
      <Badge className={badge.color}>
        {badge.label}
      </Badge>
    )
  }

  const getRegionBadge = (region) => {
    const badges = {
      korea: { label: '🇰🇷 한국', color: 'bg-blue-100 text-blue-700' },
      japan: { label: '🇯🇵 일본', color: 'bg-red-100 text-red-700' },
      us: { label: '🇺🇸 미국', color: 'bg-purple-100 text-purple-700' },
      usa: { label: '🇺🇸 미국', color: 'bg-purple-100 text-purple-700' },
      taiwan: { label: '🇹🇼 대만', color: 'bg-green-100 text-green-700' }
    }
    const badge = badges[region] || badges.korea
    return (
      <Badge variant="outline" className={badge.color}>
        {badge.label}
      </Badge>
    )
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              내 캠페인
            </h1>
            <p className="text-gray-600 mt-1">생성한 캠페인을 관리하세요</p>
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
              <div className="text-3xl font-bold">{campaigns.filter(c => !c.is_cancelled).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">승인 대기</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {campaigns.filter(c => !c.is_cancelled && (c.approval_status === 'draft' || c.approval_status === 'pending')).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">진행중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {campaigns.filter(c => !c.is_cancelled && c.approval_status === 'approved' && c.status !== 'completed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">완료</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {campaigns.filter(c => !c.is_cancelled && c.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Country Filter Tabs */}
        <Tabs value={selectedRegion} onValueChange={setSelectedRegion} className="mb-4">
          <TabsList className="grid w-full grid-cols-4 gap-2">
            <TabsTrigger value="all">국가 전체</TabsTrigger>
            <TabsTrigger value="korea">한국</TabsTrigger>
            <TabsTrigger value="us">미국</TabsTrigger>
            <TabsTrigger value="japan">일본</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Status Tabs */}
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="mb-6">
          <TabsList className="grid w-full grid-cols-9 gap-1">
            <TabsTrigger value="all" className="text-xs px-2">전체</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs px-2">작성중</TabsTrigger>
            <TabsTrigger value="pending_payment" className="text-xs px-2">입금확인중</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2">승인요청중</TabsTrigger>
            <TabsTrigger value="recruiting" className="text-xs px-2">모집중</TabsTrigger>
            <TabsTrigger value="guide_review" className="text-xs px-2">가이드검토중</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-2">촬영중</TabsTrigger>
            <TabsTrigger value="revision" className="text-xs px-2">수정중</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2">최종완료</TabsTrigger>
          </TabsList>
        </Tabs>

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
                {campaigns
                  .filter(campaign => {
                    // 나라별 필터링
                    const matchesRegion = selectedRegion === 'all' || campaign.region === selectedRegion
                    
                    // 상태별 필터링
                    let matchesStatus = true
                    if (selectedStatus !== 'all') {
                      switch (selectedStatus) {
                        case 'draft':
                          matchesStatus = campaign.status === 'draft' || campaign.approval_status === 'draft'
                          break
                        case 'pending_payment':
                          matchesStatus = campaign.approval_status === 'pending_payment'
                          break
                        case 'pending':
                          matchesStatus = campaign.approval_status === 'pending'
                          break
                        case 'recruiting':
                          matchesStatus = campaign.approval_status === 'approved' && campaign.status !== 'completed'
                          break
                        case 'guide_review':
                          matchesStatus = campaign.status === 'guide_review' || campaign.progress_status === 'guide_confirmation'
                          break
                        case 'in_progress':
                          matchesStatus = campaign.status === 'in_progress' || campaign.status === 'active' || campaign.progress_status === 'filming'
                          break
                        case 'revision':
                          matchesStatus = campaign.approval_status === 'rejected' || campaign.status === 'revision' || campaign.progress_status === 'editing'
                          break
                        case 'completed':
                          matchesStatus = campaign.status === 'completed'
                          break
                        default:
                          matchesStatus = true
                      }
                    }
                    
                    return matchesRegion && matchesStatus
                  })
                  .map((campaign) => {
                  // 4주 챌린지는 60만원 고정, 나머지는 패키지 가격 사용
                  let packagePrice
                  if (campaign.campaign_type === '4week_challenge' || campaign.campaign_type === '4week') {
                    packagePrice = 600000
                  } else {
                    packagePrice = getPackagePrice(campaign.package_type)
                  }
                  const totalCost = packagePrice * (campaign.total_slots || 0)
                  const participantInfo = participants[campaign.id] || { total: 0, selected: 0, guideConfirmed: 0 }
                  const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline)
                  const submissionDays = getDaysRemaining(campaign.content_submission_deadline)

                  return (
                    <div 
                      key={campaign.id}
                      className="border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getRegionBadge(campaign.region)}
                            {getPaymentStatusBadge(campaign.payment_status, campaign.is_cancelled)}
                            {getProgressStatusBadge(campaign.progress_status || campaign.approval_status, campaign.is_cancelled)}
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
                        <div className="flex gap-2">
                          {(campaign.approval_status === 'draft' || campaign.approval_status === 'pending_payment') && !campaign.is_cancelled && (
                            <Button 
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePayWithPoints(campaign)
                              }}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              포인트 차감 및 승인 요청
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            상세보기
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {showRegionModal && (
          <RegionSelectModal onClose={() => setShowRegionModal(false)} />
        )}
        </div>
      </div>
    </>
  )
}

