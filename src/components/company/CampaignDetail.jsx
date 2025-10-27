import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Send, 
  Users, 
  FileText, 
  Eye,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { supabase as supabaseKorea } from '../../lib/supabaseKorea'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshingViews, setRefreshingViews] = useState({})
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [showAdditionalPayment, setShowAdditionalPayment] = useState(false)

  useEffect(() => {
    fetchCampaignDetail()
    fetchParticipants()
  }, [id])

  const fetchCampaignDetail = async () => {
    try {
      const { data, error } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabaseKorea
        .from('campaign_participants')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setParticipants(data || [])
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  const handleRefreshViews = async (participant) => {
    if (!participant.content_url) {
      alert('콘텐츠 URL이 등록되지 않았습니다.')
      return
    }

    setRefreshingViews(prev => ({ ...prev, [participant.id]: true }))

    try {
      // 플랫폼 판별
      const platform = participant.content_url.includes('youtube.com') || participant.content_url.includes('youtu.be') 
        ? 'youtube' 
        : participant.content_url.includes('instagram.com') 
        ? 'instagram' 
        : null

      if (!platform) {
        alert('지원하지 않는 플랫폼입니다. (YouTube, Instagram만 지원)')
        return
      }

      // Netlify Function 호출
      const apiUrl = platform === 'youtube' 
        ? '/.netlify/functions/youtube-views'
        : '/.netlify/functions/instagram-views'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: participant.content_url })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '뷰수 조회에 실패했습니다.')
      }

      const data = await response.json()
      const views = data.views || data.engagementCount || 0

      // 데이터베이스 업데이트
      const viewHistory = participant.view_history || []
      viewHistory.push({
        views,
        timestamp: new Date().toISOString(),
        platform
      })

      const { error: updateError } = await supabaseKorea
        .from('campaign_participants')
        .update({
          views,
          last_view_check: new Date().toISOString(),
          view_history: viewHistory
        })
        .eq('id', participant.id)

      if (updateError) throw updateError

      // 참여자 목록 새로고침
      await fetchParticipants()
      alert(`조회수가 업데이트되었습니다: ${views.toLocaleString()}회`)
    } catch (error) {
      console.error('Error refreshing views:', error)
      alert('조회수 갱신에 실패했습니다: ' + error.message)
    } finally {
      setRefreshingViews(prev => ({ ...prev, [participant.id]: false }))
    }
  }

  const handleTrackingNumberChange = async (participantId, trackingNumber) => {
    try {
      const { error } = await supabaseKorea
        .from('campaign_participants')
        .update({ tracking_number: trackingNumber })
        .eq('id', participantId)

      if (error) throw error

      // 참여자 목록 업데이트
      setParticipants(prev => 
        prev.map(p => 
          p.id === participantId 
            ? { ...p, tracking_number: trackingNumber }
            : p
        )
      )
    } catch (error) {
      console.error('Error updating tracking number:', error)
      alert('송장번호 저장에 실패했습니다.')
    }
  }

  const handleConfirmSelection = async () => {
    if (selectedParticipants.length === 0) {
      alert('크리에이터를 선택해주세요.')
      return
    }

    try {
      // 선택된 크리에이터들의 상태를 'selected'로 변경
      for (const participantId of selectedParticipants) {
        await supabaseKorea
          .from('campaign_participants')
          .update({
            selection_status: 'selected',
            selected_at: new Date().toISOString()
          })
          .eq('id', participantId)
      }

      // 캠페인의 selected_participants_count 업데이트
      await supabaseKorea
        .from('campaigns')
        .update({
          selected_participants_count: selectedParticipants.length
        })
        .eq('id', id)

      alert(`${selectedParticipants.length}명의 크리에이터가 확정되었습니다!`)
      await fetchParticipants()
      await fetchCampaignDetail()
      setSelectedParticipants([])
    } catch (error) {
      console.error('Error confirming selection:', error)
      alert('선택 확정에 실패했습니다.')
    }
  }

  const handleSendDeadlineReminder = async () => {
    if (participants.length === 0) {
      alert('참여자가 없습니다.')
      return
    }

    // 마감일 선택 모달
    const deadlineType = confirm('어떤 마감일에 대한 독촉 메일을 보내시겠습니까?\n\n확인: 모집 마감\n취소: 영상 제출 마감')
      ? 'recruitment'
      : 'submission'

    const deadline = deadlineType === 'recruitment' 
      ? campaign.recruitment_deadline 
      : campaign.content_submission_deadline

    if (!deadline) {
      alert(`${deadlineType === 'recruitment' ? '모집' : '영상 제출'} 마감일이 설정되지 않았습니다.`)
      return
    }

    try {
      const recipients = participants.map(p => ({
        name: p.creator_name,
        email: p.creator_email
      }))

      const response = await fetch('/.netlify/functions/send-deadline-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignTitle: campaign.title,
          deadline,
          deadlineType,
          recipients
        })
      })

      if (!response.ok) {
        throw new Error('이메일 발송에 실패했습니다.')
      }

      const data = await response.json()
      alert(`${data.recipients}명에게 마감 독촉 이메일이 발송되었습니다!`)
    } catch (error) {
      console.error('Error sending deadline reminder:', error)
      alert('이메일 발송에 실패했습니다: ' + error.message)
    }
  }

  const handleRequestAdditionalPayment = () => {
    const additionalCount = selectedParticipants.length - campaign.total_slots
    const packagePrice = getPackagePrice(campaign.package_type)
    const additionalCost = packagePrice * additionalCount
    if (confirm(`추가 ${additionalCount}명에 대한 입금 요청을 하시겠습니까?\n\n추가 금액: ${additionalCost.toLocaleString()}원`)) {
      // 견적서 페이지로 이동 (추가 인원 정보 포함)
      navigate(`/company/campaigns/${id}/invoice?additional=${additionalCount}`)
    }
  }

  const handleUpdateCreatorStatus = async (participantId, newStatus) => {
    try {
      const { error } = await supabaseKorea
        .from('campaign_participants')
        .update({ creator_status: newStatus })
        .eq('id', participantId)

      if (error) throw error

      // 참여자 목록 재로드
      const { data, error: fetchError } = await supabaseKorea
        .from('campaign_participants')
        .select('*')
        .eq('campaign_id', id)

      if (fetchError) throw fetchError
      setParticipants(data || [])

      alert('크리에이터 상태가 업데이트되었습니다.')
    } catch (error) {
      console.error('Error updating creator status:', error)
      alert('상태 업데이트에 실패했습니다.')
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
    return prices[packageType] || 200000
  }

  const handleCancelCampaign = async () => {
    if (!confirm('캠페인을 취소하시겠습니까? 취소된 캠페인은 복구할 수 없습니다.')) {
      return
    }

    const cancelReason = prompt('취소 사유를 입력해주세요 (선택사항):')

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      
      // 1. 캠페인 취소
      const { error } = await supabaseKorea
        .from('campaigns')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.email || 'unknown',
          cancel_reason: cancelReason || '사유 미기재'
        })
        .eq('id', id)

      if (error) throw error

      // 2. 포인트로 결제한 경우 포인트 반납
      // points_transactions에서 이 캠페인의 결제 기록 확인
      const { data: transactionData } = await supabaseBiz
        .from('points_transactions')
        .select('*')
        .eq('campaign_id', id)
        .eq('type', 'campaign_creation')
        .single()

      if (transactionData) {
        // 포인트로 결제한 경우
        const refundAmount = Math.abs(transactionData.amount)
        
        // 회사 정보 조회
        const { data: companyData } = await supabaseBiz
          .from('companies')
          .select('id, points_balance')
          .eq('user_id', user.id)
          .single()

        if (companyData) {
          // 포인트 반납
          const { error: refundError } = await supabaseBiz
            .from('companies')
            .update({ 
              points_balance: (companyData.points_balance || 0) + refundAmount 
            })
            .eq('id', companyData.id)

          if (refundError) throw refundError

          // 포인트 반납 기록
          await supabaseBiz
            .from('points_transactions')
            .insert([{
              company_id: companyData.id,
              amount: refundAmount,
              type: 'campaign_cancellation',
              description: `캠페인 취소 환불: ${campaign.title || campaign.campaign_name}`,
              campaign_id: id
            }])

          alert(`캠페인이 취소되었습니다. ${refundAmount.toLocaleString()}포인트가 반납되었습니다.`)
        } else {
          alert('캠페인이 취소되었습니다.')
        }
      } else {
        // 입금 대기 중이거나 포인트 결제가 아닌 경우
        alert('캠페인이 취소되었습니다.')
      }

      await fetchCampaignDetail()
    } catch (error) {
      console.error('Error cancelling campaign:', error)
      alert('캠페인 취소에 실패했습니다.')
    }
  }

  const handleRequestApproval = async () => {
    try {
      const { error } = await supabaseKorea
        .from('campaigns')
        .update({
          approval_status: 'pending',
          approval_requested_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      alert('승인 요청이 전송되었습니다!')
      fetchCampaignDetail()
    } catch (error) {
      console.error('Error requesting approval:', error)
      alert('승인 요청에 실패했습니다.')
    }
  }

  const getApprovalStatusBadge = (status) => {
    const badges = {
      draft: { label: '임시저장', color: 'bg-gray-100 text-gray-800', icon: Clock },
      pending: { label: '승인대기', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      approved: { label: '승인완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: '반려', color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }
    const badge = badges[status] || badges.draft
    const Icon = badge.icon
    return (
      <Badge className={`${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </Badge>
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: '대기중', color: 'bg-gray-100 text-gray-800' },
      approved: { label: '승인', color: 'bg-green-100 text-green-800' },
      in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-800' },
      completed: { label: '완료', color: 'bg-purple-100 text-purple-800' },
      rejected: { label: '거절', color: 'bg-red-100 text-red-800' }
    }
    const badge = badges[status] || badges.pending
    return <Badge className={badge.color}>{badge.label}</Badge>
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>
  }

  if (!campaign) {
    return <div className="flex items-center justify-center min-h-screen">캠페인을 찾을 수 없습니다.</div>
  }

  const totalViews = participants.reduce((sum, p) => sum + (p.views || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/company/campaigns')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로가기
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <p className="text-gray-600 mt-1">{campaign.brand} • {campaign.product_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getApprovalStatusBadge(campaign.approval_status)}
            {/* 수정 버튼: draft, pending_payment, rejected 상태에서 표시 */}
            {['draft', 'pending_payment', 'rejected'].includes(campaign.approval_status) && (
              <Button 
                variant="outline"
                onClick={() => navigate(`/company/campaigns/create/korea?edit=${id}`)}
              >
                수정
              </Button>
            )}
            {/* 승인 요청 버튼: draft 상태에서만 표시 */}
            {campaign.approval_status === 'draft' && (
              <Button onClick={handleRequestApproval} className="bg-blue-600">
                <Send className="w-4 h-4 mr-2" />
                승인 요청하기
              </Button>
            )}
            {campaign.approval_status === 'pending' && (
              <Button disabled className="bg-blue-100 text-blue-700 cursor-not-allowed">
                <Clock className="w-4 h-4 mr-2" />
                승인 심사 중
              </Button>
            )}
            {campaign.approval_status === 'approved' && (
              <Button disabled className="bg-green-100 text-green-700 cursor-not-allowed">
                <CheckCircle className="w-4 h-4 mr-2" />
                승인 완료
              </Button>
            )}
            {!campaign.is_cancelled && (
              <div>
                {campaign.payment_status !== 'confirmed' ? (
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={handleCancelCampaign}
                  >
                    캠페인 취소하기
                  </Button>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600">
                    입금 완료 후 취소는 관리자에게 문의하세요
                  </Badge>
                )}
              </div>
            )}
            {campaign.is_cancelled && (
              <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">
                취소된 캠페인
              </Badge>
            )}
          </div>
        </div>

        {/* Campaign Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">패키지</p>
                  <p className="text-2xl font-bold mt-2">
                    {campaign.package_type === 'junior' && 'Junior'}
                    {campaign.package_type === 'intermediate' && 'Intermediate'}
                    {campaign.package_type === 'senior' && 'Senior'}
                    {campaign.package_type === 'oliveyoung' && '올영 패키지'}
                    {campaign.package_type === 'premium' && '프리미엄 패키지'}
                    {campaign.package_type === '4week_challenge' && '4주 챌린지'}
                    {!['junior', 'intermediate', 'senior', 'oliveyoung', 'premium', '4week_challenge'].includes(campaign.package_type) && campaign.package_type}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">모집 인원</p>
                  <p className="text-2xl font-bold mt-2">{campaign.total_slots}명</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">결제 예상 금액</p>
                  <p className="text-2xl font-bold mt-2">₩{campaign.estimated_cost?.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              참여 크리에이터 ({participants.length})
            </TabsTrigger>
            <TabsTrigger value="selected" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              확정 크리에이터 + 가이드
            </TabsTrigger>
            <TabsTrigger value="views" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              뷰수 보고서
            </TabsTrigger>
          </TabsList>

          {/* 참여 크리에이터 탭 */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>참여 크리에이터 리스트</CardTitle>
                {participants.length > 0 && (
                  <div className="flex gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">가이드 확인중:</span>
                      <Badge className="bg-purple-100 text-purple-700">
                        {participants.filter(p => p.creator_status === 'guide_confirmation').length}명
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">촬영중:</span>
                      <Badge className="bg-yellow-100 text-yellow-700">
                        {participants.filter(p => p.creator_status === 'filming').length}명
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">수정중:</span>
                      <Badge className="bg-pink-100 text-pink-700">
                        {participants.filter(p => p.creator_status === 'editing').length}명
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">제출완료:</span>
                      <Badge className="bg-blue-100 text-blue-700">
                        {participants.filter(p => p.creator_status === 'submitted').length}명
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">승인완료:</span>
                      <Badge className="bg-green-100 text-green-700">
                        {participants.filter(p => p.creator_status === 'approved').length}명
                      </Badge>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    아직 참여한 크리에이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedParticipants.length === participants.length && participants.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipants(participants.map(p => p.id))
                                } else {
                                  setSelectedParticipants([])
                                }
                              }}
                              className="w-4 h-4"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이름</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이메일</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">플랫폼</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">선택 상태</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">진행 상태</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">참여일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {participants.map((participant) => (
                          <tr key={participant.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedParticipants.includes(participant.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedParticipants([...selectedParticipants, participant.id])
                                  } else {
                                    setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id))
                                  }
                                }}
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="px-4 py-3">{participant.creator_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{participant.creator_email}</td>
                            <td className="px-4 py-3">{participant.creator_platform}</td>
                            <td className="px-4 py-3">
                              {participant.selection_status === 'selected' ? (
                                <Badge className="bg-green-100 text-green-800">확정</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800">대기</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={participant.creator_status || 'guide_confirmation'}
                                onChange={(e) => handleUpdateCreatorStatus(participant.id, e.target.value)}
                                className="text-sm border rounded px-2 py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="guide_confirmation">가이드 확인중</option>
                                <option value="filming">촬영중</option>
                                <option value="editing">수정중</option>
                                <option value="submitted">제출완료</option>
                                <option value="approved">승인완료</option>
                                <option value="rejected">거부</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(participant.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {participants.length > 0 && (
                  <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-gray-600">
                      선택된 크리에이터: <span className="font-semibold">{selectedParticipants.length}명</span>
                      {campaign.total_slots && selectedParticipants.length > campaign.total_slots && (
                        <span className="ml-2 text-red-600">
                          (추가 {selectedParticipants.length - campaign.total_slots}명)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleSendDeadlineReminder}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        마감 독촉 메일 보내기
                      </Button>
                      {campaign.total_slots && selectedParticipants.length > campaign.total_slots && (
                        <Button
                          variant="outline"
                          onClick={handleRequestAdditionalPayment}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        >
                          추가 입금 요청 ({selectedParticipants.length - campaign.total_slots}명)
                        </Button>
                      )}
                      <Button
                        onClick={handleConfirmSelection}
                        disabled={selectedParticipants.length === 0}
                      >
                        선택 확정
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 확정 크리에이터 + 가이드 탭 */}
          <TabsContent value="selected">
            <Card>
              <CardHeader>
                <CardTitle>확정 크리에이터 및 택배 송장번호</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  선택된 크리에이터: {participants.filter(p => p.selection_status === 'selected').length}명
                </p>
              </CardHeader>
              <CardContent>
                {participants.filter(p => p.selection_status === 'selected').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    아직 확정된 크리에이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">크리에이터</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이메일</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">택배 송장번호</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">가이드 확인</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">콘텐츠 URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {participants.filter(p => p.selection_status === 'selected').map((participant) => (
                          <tr key={participant.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{participant.creator_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{participant.creator_email}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={participant.tracking_number || ''}
                                onChange={(e) => handleTrackingNumberChange(participant.id, e.target.value)}
                                placeholder="송장번호 입력"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              {participant.guide_confirmed ? (
                                <Badge className="bg-green-100 text-green-800">확인완료</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800">미확인</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {participant.content_url ? (
                                <a 
                                  href={participant.content_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  링크 보기
                                </a>
                              ) : (
                                <span className="text-gray-400">미등록</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 뷰수 보고서 탭 */}
          <TabsContent value="views">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>뷰수 보고서</CardTitle>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">총 조회수</p>
                    <p className="text-2xl font-bold text-blue-600">{totalViews.toLocaleString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    아직 참여한 크리에이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">크리에이터</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">플랫폼</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">조회수</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">콘텐츠 URL</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">마지막 확인</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {participants.map((participant) => (
                          <tr key={participant.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{participant.creator_name}</td>
                            <td className="px-4 py-3">{participant.creator_platform}</td>
                            <td className="px-4 py-3">
                              <span className="text-lg font-semibold text-blue-600">
                                {(participant.views || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {participant.content_url ? (
                                <a 
                                  href={participant.content_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  링크 보기
                                </a>
                              ) : (
                                <span className="text-gray-400">미등록</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {participant.last_view_check ? new Date(participant.last_view_check).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRefreshViews(participant)}
                                disabled={refreshingViews[participant.id]}
                              >
                                {refreshingViews[participant.id] ? '조회 중...' : '조회수 갱신'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Campaign Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>캠페인 상세 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">캠페인 요구사항</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{campaign.requirements}</p>
            </div>
            
            {campaign.creator_guide && (
              <div>
                <h3 className="font-medium mb-2">크리에이터 가이드</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{campaign.creator_guide}</p>
              </div>
            )}

            {campaign.product_name && (
              <div>
                <h3 className="font-medium mb-2">상품 정보</h3>
                <p className="text-gray-700">
                  <strong>상품명:</strong> {campaign.product_name}
                </p>
                {campaign.product_description && (
                  <p className="text-gray-700 mt-2">
                    <strong>상품 설명:</strong> {campaign.product_description}
                  </p>
                )}
                {campaign.product_link && (
                  <p className="text-gray-700 mt-2">
                    <strong>상품 링크:</strong>{' '}
                    <a href={campaign.product_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {campaign.product_link}
                    </a>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">모집 마감일</p>
                <p className="font-medium">{new Date(campaign.application_deadline).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">캠페인 기간</p>
                <p className="font-medium">
                  {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

