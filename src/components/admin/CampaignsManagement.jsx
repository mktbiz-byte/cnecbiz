import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Search, Eye, CheckCircle, XCircle, Clock, DollarSign, Edit, Trash2, PlayCircle, Pause } from 'lucide-react'
import { supabaseBiz, getCampaignsFromAllRegions, getCampaignsWithStats, getSupabaseClient } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 크리에이터 포인트 계산 함수 (1인당)
const calculateCreatorPoints = (campaign) => {
  if (!campaign) return 0
  
  // 수동 설정값이 있으면 우선 사용
  if (campaign.creator_points_override) {
    return campaign.creator_points_override
  }
  
  const campaignType = campaign.campaign_type
  const totalSlots = campaign.total_slots || 1 // 0으로 나누기 방지
  
  // 4주 챌린지: reward_points 또는 주차별 합계 xd7 70% xf7 인원
  if (campaignType === '4week_challenge') {
    const weeklyTotal = (campaign.week1_reward || 0) + (campaign.week2_reward || 0) + 
                       (campaign.week3_reward || 0) + (campaign.week4_reward || 0)
    const totalReward = weeklyTotal > 0 ? weeklyTotal : (campaign.reward_points || 0)
    return Math.round((totalReward * 0.7) / totalSlots)
  }
  
  // 기획형: 단계별 합계 xd7 60% xf7 인원
  if (campaignType === 'planned') {
    const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) + 
                     (campaign.step3_reward || 0)
    const totalReward = stepTotal > 0 ? stepTotal : (campaign.reward_points || 0)
    return Math.round((totalReward * 0.6) / totalSlots)
  }
  
  // 올영세일: 단계별 합계 xd7 70% xf7 인원
  if (campaignType === 'oliveyoung') {
    const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) + 
                     (campaign.step3_reward || 0)
    const totalReward = stepTotal > 0 ? stepTotal : (campaign.reward_points || 0)
    return Math.round((totalReward * 0.7) / totalSlots)
  }
  
  // 기본: reward_points xd7 60% xf7 인원
  return Math.round(((campaign.reward_points || 0) * 0.6) / totalSlots)
}

export default function CampaignsManagement() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [editingPoints, setEditingPoints] = useState(null) // {campaignId, value}
  const [savingPoints, setSavingPoints] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCampaigns()
  }, [])

  const checkAuth = async () => {
    console.log('[CampaignsManagement] checkAuth started')
    try {
      if (!supabaseBiz) {
        console.log('[CampaignsManagement] No supabaseBiz client')
        navigate('/login')
        return
      }

      console.log('[CampaignsManagement] Getting user...')
      const { data: { user }, error: userError } = await supabaseBiz.auth.getUser()
      if (userError) {
        console.error('[CampaignsManagement] User error:', userError)
        navigate('/login')
        return
      }
      if (!user) {
        console.log('[CampaignsManagement] No user found')
        navigate('/login')
        return
      }

      console.log('[CampaignsManagement] User email:', user.email)
      console.log('[CampaignsManagement] Fetching admin data...')
      const { data: adminData, error: adminError } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (adminError) {
        console.error('[CampaignsManagement] Admin data error:', adminError)
      }

      if (!adminData) {
        console.log('[CampaignsManagement] No admin data found')
        // 일반 관리자도 접근 가능하도록 변경
        setIsSuperAdmin(false)
        return
      }

      console.log('[CampaignsManagement] Admin role:', adminData.role)
      const isSuperAdminValue = adminData.role === 'super_admin'
      console.log('[CampaignsManagement] isSuperAdmin:', isSuperAdminValue)
      setIsSuperAdmin(isSuperAdminValue)
    } catch (error) {
      console.error('[CampaignsManagement] checkAuth error:', error)
      setIsSuperAdmin(false)
    }
  }

  const fetchCampaigns = async () => {
    console.log('[CampaignsManagement] Starting to fetch campaigns...')
    setLoading(true)
    try {
      const allCampaigns = await getCampaignsWithStats()
      console.log('[CampaignsManagement] Fetched campaigns:', allCampaigns.length)
      setCampaigns(allCampaigns)
    } catch (error) {
      console.error('[CampaignsManagement] Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveCampaign = async (campaign) => {
    if (!confirm(`캠페인을 승인하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}\n\n승인 시 기업에게 알림톡과 메일이 전송됩니다.`)) {
      return
    }

    setConfirming(true)
    try {
      // approve-campaign Netlify Function 호출 (알림톡 + 메일 전송)
      const response = await fetch('/.netlify/functions/approve-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          region: campaign.region || 'korea'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '캠페인 승인에 실패했습니다.')
      }

      alert('캠페인이 승인되었습니다! 기업에게 알림이 전송되었습니다.')
      fetchCampaigns()

    } catch (error) {
      console.error('승인 오류:', error)
      alert('승인에 실패했습니다: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmPayment = async (campaign) => {
    if (!confirm(`입금을 확인하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}\n금액: ${(campaign.estimated_cost || 0).toLocaleString()}원`)) {
      return
    }

    setConfirming(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const response = await fetch('/.netlify/functions/confirm-campaign-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          adminUserId: user.id,
          depositAmount: campaign.estimated_cost
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '입금 확인 처리에 실패했습니다.')
      }

      alert('입금이 확인되었습니다. 캠페인이 승인 대기 상태로 변경되었습니다.')
      fetchCampaigns()

    } catch (error) {
      console.error('입금 확인 오류:', error)
      alert(error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleSaveCreatorPoints = async (campaignId) => {
    if (!editingPoints || editingPoints.campaignId !== campaignId) return
    
    setSavingPoints(true)
    try {
      const campaign = campaigns.find(c => c.id === campaignId)
      const region = campaign?.region || 'biz'
      const supabaseClient = getSupabaseClient(region)
      
      const { error } = await supabaseClient
        .from('campaigns')
        .update({ 
          creator_points_override: parseInt(editingPoints.value) || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
      
      if (error) throw error
      
      setEditingPoints(null)
      fetchCampaigns()
    } catch (error) {
      console.error('크리에이터 포인트 저장 오류:', error)
      alert('포인트 저장에 실패했습니다: ' + error.message)
    } finally {
      setSavingPoints(false)
    }
  }

  const handleStatusChange = async (campaign, newStatus) => {
    const statusLabels = {
      draft: '임시',
      active: '활성',
      paused: '중단',
      completed: '완료'
    }

    if (!confirm(`캠페인 상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}`)) {
      return
    }

    setConfirming(true)
    try {
      const region = campaign.region || 'biz'
      const supabaseClient = getSupabaseClient(region)

      const { error } = await supabaseClient
        .from('campaigns')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)

      if (error) throw error

      alert(`캠페인 상태가 "${statusLabels[newStatus]}"로 변경되었습니다!`)
      
      // 활성화 시 알림 전송 (confirm-campaign-payment 방식 사용)
      if (newStatus === 'active' && campaign.company_id) {
        try {
          // 회사 정보 조회
          const { data: company } = await supabaseBiz
            .from('companies')
            .select('company_name, email, phone, notification_phone, notification_email')
            .eq('id', campaign.company_id)
            .single()

          if (company) {
            const formatDate = (dateString) => {
              if (!dateString) return '미정'
              return new Date(dateString).toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            }

            const startDate = formatDate(campaign.recruitment_start_date || campaign.start_date)
            const endDate = formatDate(campaign.recruitment_deadline || campaign.end_date)
            const campaignTitle = campaign.campaign_name || campaign.title || '캠페인'

            // 카카오 알림톡 발송
            if (company.notification_phone || company.phone) {
              fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: company.notification_phone || company.phone,
                  receiverName: company.company_name || '회사',
                  templateCode: '025100001005',
                  variables: {
                    '회사명': company.company_name || '회사',
                    '캠페인명': campaignTitle,
                    '시작일': startDate,
                    '마감일': endDate,
                    '모집인원': String(campaign.total_slots || campaign.target_creators || 0)
                  }
                })
              }).catch(err => console.error('알림톡 전송 실패:', err))
            }

            // 이메일 발송
            if (company.notification_email || company.email) {
              fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: company.notification_email || company.email,
                  subject: '[CNEC] 캠페인 승인 완료',
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #333;">[CNEC] 캠페인 승인 완료</h2>
                      <p><strong>${company.company_name || '회사'}</strong>님, 신청하신 캠페인이 승인되어 크리에이터 모집이 시작되었습니다.</p>
                      
                      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 10px 0;"><strong>캠페인:</strong> ${campaignTitle}</p>
                        <p style="margin: 10px 0;"><strong>모집 기간:</strong> ${startDate} ~ ${endDate}</p>
                        <p style="margin: 10px 0;"><strong>모집 인원:</strong> ${campaign.total_slots || campaign.target_creators || 0}명</p>
                      </div>
                      
                      <p style="color: #666;">관리자 페이지에서 진행 상황을 확인하실 수 있습니다.</p>
                      <p style="color: #666;">문의: <strong>1833-6025</strong></p>
                      
                      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                      <p style="font-size: 12px; color: #999; text-align: center;">
                        본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                      </p>
                    </div>
                  `
                })
              }).catch(err => console.error('이메일 전송 실패:', err))
            }

            console.log('활성화 알림 전송 완료')
          }
        } catch (notifError) {
          console.error('알림 전송 오류:', notifError)
        }
      }
      
      fetchCampaigns()
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경에 실패했습니다: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleDelete = async (campaign) => {
    if (!confirm(`⚠️ 정말로 이 캠페인을 삭제하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    if (!confirm('⚠️ 최종 확인: 캠페인과 관련된 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    setConfirming(true)
    try {
      const region = campaign.region || 'biz'
      const supabaseClient = getSupabaseClient(region)

      const { error } = await supabaseClient
        .from('campaigns')
        .delete()
        .eq('id', campaign.id)

      if (error) throw error

      alert('캠페인이 삭제되었습니다.')
      fetchCampaigns()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = searchTerm === '' ||
      campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRegion = selectedRegion === 'all' || campaign.region === selectedRegion
    
    // 상태별 필터링 로직 개선
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
          matchesStatus = campaign.approval_status === 'pending' || campaign.approval_status === 'pending_approval'
          break
        case 'recruiting':
          matchesStatus = campaign.approval_status === 'approved' && campaign.status !== 'completed'
          break
        case 'guide_review':
          matchesStatus = campaign.status === 'guide_review'
          break
        case 'in_progress':
          // active 상태이지만 approval_status가 pending_approval이 아닌 경우만 촬영중으로 분류
          matchesStatus = (campaign.status === 'in_progress') || 
                         (campaign.status === 'active' && campaign.approval_status !== 'pending_approval')
          break
        case 'revision':
          matchesStatus = campaign.approval_status === 'rejected' || campaign.status === 'revision'
          break
        case 'completed':
          matchesStatus = campaign.status === 'completed'
          break
        case 'cancelled':
          matchesStatus = campaign.approval_status === 'cancelled' || campaign.status === 'cancelled'
          break
        default:
          matchesStatus = true
      }
    }

    return matchesSearch && matchesRegion && matchesStatus
  })

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      pending_payment: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-gray-100 text-gray-700'
    }
    const labels = {
      pending: '대기중',
      pending_payment: '입금확인중',
      approved: '승인',
      rejected: '거부',
      cancelled: '취소됨',
      active: '진행중',
      completed: '완료'
    }
    const icons = {
      pending: Clock,
      pending_payment: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      cancelled: XCircle,
      active: TrendingUp,
      completed: CheckCircle
    }
    const Icon = icons[status] || Clock

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        <Icon className="w-3 h-3" />
        {labels[status] || status}
      </span>
    )
  }

  const getCampaignTypeBadge = (campaignType) => {
    const badges = {
      planned: 'bg-purple-100 text-purple-700',
      oliveyoung: 'bg-pink-100 text-pink-700',
      '4week_challenge': 'bg-orange-100 text-orange-700'
    }
    const labels = {
      planned: '기획형',
      oliveyoung: '올영세일',
      '4week_challenge': '4주 챌린지'
    }
    
    if (!campaignType || !badges[campaignType]) return null
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badges[campaignType]}`}>
        {labels[campaignType]}
      </span>
    )
  }

  const getRegionBadge = (region) => {
    const badges = {
      korea: 'bg-blue-100 text-blue-700',
      japan: 'bg-red-100 text-red-700',
      us: 'bg-purple-100 text-purple-700',
      usa: 'bg-purple-100 text-purple-700',
      taiwan: 'bg-green-100 text-green-700'
    }
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국',
      usa: '🇺🇸 미국',
      taiwan: '🇹🇼 대만'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[region] || 'bg-gray-100 text-gray-700'}`}>
        {labels[region] || region}
      </span>
    )
  }

  const stats = {
    total: campaigns.length,
    pending: campaigns.filter(c => c.status === 'pending' || c.approval_status === 'pending').length,
    active: campaigns.filter(c => c.status === 'active' || c.approval_status === 'approved').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">캠페인 관리</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">전체 캠페인</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">대기중</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">진행중</div>
              <div className="text-3xl font-bold text-blue-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">완료</div>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Region Tabs */}
        <Tabs value={selectedRegion} onValueChange={setSelectedRegion} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="korea">한국 🇰🇷</TabsTrigger>
            <TabsTrigger value="japan">일본 🇯🇵</TabsTrigger>
            <TabsTrigger value="us">미국 🇺🇸</TabsTrigger>
            <TabsTrigger value="taiwan">대만 🇹🇼</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Status Tabs */}
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="mb-6">
          <TabsList className="grid w-full grid-cols-10 gap-1">
            <TabsTrigger value="all" className="text-xs px-2">전체</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs px-2">작성중</TabsTrigger>
            <TabsTrigger value="pending_payment" className="text-xs px-2">입금확인중</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2">승인요청중</TabsTrigger>
            <TabsTrigger value="recruiting" className="text-xs px-2">모집중</TabsTrigger>
            <TabsTrigger value="guide_review" className="text-xs px-2">가이드검토중</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-2">촬영중</TabsTrigger>
            <TabsTrigger value="revision" className="text-xs px-2">수정중</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2">최종완료</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs px-2">취소됨</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="캠페인 제목, 설명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>캠페인 목록 ({filteredCampaigns.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                {filteredCampaigns.map((campaign) => (
                  <div
                    key={`${campaign.region}-${campaign.id}`}
                    className="p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{campaign.campaign_name || campaign.title || campaign.product_name || '제목 없음'}</h3>
                          {getCampaignTypeBadge(campaign.campaign_type)}
                          {getRegionBadge(campaign.region)}
                          {getStatusBadge(campaign.approval_status || campaign.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {campaign.description || '설명 없음'}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">예산</div>
                            <div className="font-semibold text-gray-900">{campaign.currency || '₩'}{campaign.budget?.toLocaleString()}</div>
                          </div>
                          {campaign.region === 'korea' && (
                            <div className="bg-purple-50 p-3 rounded-lg relative group">
                              <div className="text-purple-600 text-xs mb-1">크리에이터 P</div>
                              {editingPoints?.campaignId === campaign.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editingPoints.value}
                                    onChange={(e) => setEditingPoints({ campaignId: campaign.id, value: e.target.value })}
                                    className="w-24 px-2 py-1 text-sm border rounded"
                                    disabled={savingPoints}
                                  />
                                  <button
                                    onClick={() => handleSaveCreatorPoints(campaign.id)}
                                    disabled={savingPoints}
                                    className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => setEditingPoints(null)}
                                    disabled={savingPoints}
                                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="font-semibold text-purple-900">₩{calculateCreatorPoints(campaign).toLocaleString()}</div>
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => setEditingPoints({ campaignId: campaign.id, value: calculateCreatorPoints(campaign) })}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 hover:text-purple-800"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">모집 인원</div>
                            <div className="font-semibold text-gray-900">{campaign.max_participants || campaign.total_slots || 0}명</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">지원자</div>
                            <div className="font-semibold text-blue-600">{campaign.application_stats?.total || 0}명</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">선정 완료</div>
                            <div className="font-semibold text-green-600">{campaign.application_stats?.selected || 0}명</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">모집 마감일</div>
                            <div className="font-medium text-gray-900">{campaign.application_deadline ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ') : '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-gray-500 text-xs mb-1">캐페인 기간</div>
                            <div className="font-medium text-gray-900 text-xs">
                              {(() => {
                                const formatDate = (date) => date ? new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).replace(/\. /g, '. ') : null
                                
                                // 4주 챌린지: 주차별 마감일
                                if (campaign.campaign_type === '4week_challenge') {
                                  const weeks = [
                                    campaign.week1_deadline,
                                    campaign.week2_deadline,
                                    campaign.week3_deadline,
                                    campaign.week4_deadline
                                  ].filter(Boolean)
                                  if (weeks.length > 0) {
                                    return `1주차: ${formatDate(weeks[0])}${weeks.length > 1 ? ` ~ 4주차: ${formatDate(weeks[weeks.length-1])}` : ''}`
                                  }
                                }
                                
                                // 올영세일: 단계별 마감일
                                if (campaign.campaign_type === 'oliveyoung') {
                                  const steps = [
                                    campaign.step1_deadline,
                                    campaign.step2_deadline,
                                    campaign.step3_deadline
                                  ].filter(Boolean)
                                  if (steps.length > 0) {
                                    return `1단계: ${formatDate(steps[0])}${steps.length > 1 ? ` ~ ${steps.length}단계: ${formatDate(steps[steps.length-1])}` : ''}`
                                  }
                                }
                                
                                // 기획형/일반: start_date ~ end_date
                                if (campaign.start_date && campaign.end_date) {
                                  return `${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`
                                }
                                
                                return '-'
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {campaign.payment_status === 'pending' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConfirmPayment(campaign)}
                            disabled={confirming}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            입금 확인
                          </Button>
                        )}
                        {campaign.approval_status === 'pending' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveCampaign(campaign)}
                            disabled={confirming}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            승인
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(campaign, 'active')}
                              disabled={confirming || campaign.status === 'active'}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              활성화
                            </Button>
                            {(campaign.status === 'active' || campaign.status === 'in_progress') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(campaign, 'paused')}
                                disabled={confirming}
                                className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                중단
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(campaign)}
                              disabled={confirming}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit?region=${campaign.region}`)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/campaigns/${campaign.id}?region=${campaign.region}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredCampaigns.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm || selectedRegion !== 'all' || selectedStatus !== 'all'
                      ? '검색 결과가 없습니다'
                      : '등록된 캠페인이 없습니다'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  )
}

