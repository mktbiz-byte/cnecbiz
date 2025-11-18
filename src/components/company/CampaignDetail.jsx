import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import CreatorCard from './CreatorCard'
import { sendCampaignSelectionNotification } from '../../services/kakaoAlimtalk'
import { sendCampaignSelectionEmail } from '../../services/emailService'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'
  const supabase = region === 'japan' ? getSupabaseClient('japan') : supabaseKorea
  const [campaign, setCampaign] = useState(null)
  const [participants, setParticipants] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshingViews, setRefreshingViews] = useState({})
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [showAdditionalPayment, setShowAdditionalPayment] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedGuide, setSelectedGuide] = useState(null)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [revisionComment, setRevisionComment] = useState('')

  useEffect(() => {
    checkIfAdmin()
    fetchCampaignDetail()
    fetchParticipants()
    fetchApplications()
  }, [id])

  const checkIfAdmin = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setIsAdmin(!!adminData)
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  const fetchCampaignDetail = async () => {
    try {
      const { data, error } = await supabase
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
      // Japan 캠페인은 campaign_applications, Korea 캠페인은 campaign_participants 사용
      const tableName = region === 'japan' ? 'campaign_applications' : 'campaign_participants'
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setParticipants(data || [])
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // user_id가 있는 경우 user_profiles에서 추가 정보 가져오기
      const enrichedData = await Promise.all(
        (data || []).map(async (app) => {
          console.log('Application data:', app.applicant_name, 'user_id:', app.user_id)
          if (app.user_id) {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('profile_photo_url, profile_image_url, instagram_followers, youtube_subscribers, tiktok_followers')
                .eq('id', app.user_id)
                .maybeSingle()
              
              console.log('Profile data for', app.applicant_name, ':', profile)
              if (profileError) console.error('Profile fetch error:', profileError)
              
              if (profile) {
                const enriched = {
                  ...app,
                  profile_photo_url: profile.profile_photo_url || profile.profile_image_url,
                  instagram_followers: profile.instagram_followers || app.instagram_followers || 0,
                  youtube_subscribers: profile.youtube_subscribers || app.youtube_subscribers || 0,
                  tiktok_followers: profile.tiktok_followers || app.tiktok_followers || 0
                }
                console.log('Enriched data:', enriched.applicant_name, 'YT:', enriched.youtube_subscribers, 'IG:', enriched.instagram_followers)
                return enriched
              }
            } catch (err) {
              console.error('Error fetching profile for user:', app.user_id, err)
            }
          }
          console.log('Returning original app data for:', app.applicant_name)
          return app
        })
      )
      
      setApplications(enrichedData)
    } catch (error) {
      console.error('Error fetching applications:', error)
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

      const { error: updateError } = await supabase
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
      const { error } = await supabase
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

  // 가상 선정 토글
  const handleVirtualSelect = async (applicationId, selected, mainChannel = null) => {
    try {
      const updateData = { virtual_selected: selected }
      if (selected && mainChannel) {
        updateData.main_channel = mainChannel
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      // 지원자 목록 업데이트
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, ...updateData }
            : app
        )
      )

      // UI 업데이트 후 alert 표시
      setTimeout(() => {
        alert(selected ? '가상 선정되었습니다.' : '가상 선정이 취소되었습니다.')
      }, 100)
    } catch (error) {
      console.error('Error updating virtual selection:', error)
      alert('가상 선정 처리에 실패했습니다.')
    }
  }

  // 가상 선정된 크리에이터 한번에 확정
  const handleBulkConfirm = async () => {
    try {
      const virtualSelected = applications.filter(app => app.virtual_selected)
      
      if (virtualSelected.length === 0) {
        alert('가상 선정된 크리에이터가 없습니다.')
        return
      }

      if (!confirm(`${virtualSelected.length}명의 크리에이터를 확정하시겠습니까?`)) {
        return
      }

      // campaign_participants에 추가
      const participantsToAdd = virtualSelected.map(app => ({
        campaign_id: id,
        user_id: app.user_id,
        creator_name: app.applicant_name,
        creator_email: '', // 이메일 정보가 있다면 추가
        creator_platform: '', // 플랫폼 정보 추가
        creator_status: 'guide_confirmation',
        created_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from('campaign_participants')
        .insert(participantsToAdd)

      if (insertError) throw insertError

      // applications의 status를 'selected'로 업데이트
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          status: 'selected',
          virtual_selected: false 
        })
        .in('id', virtualSelected.map(app => app.id))

      if (updateError) throw updateError

      // 목록 새로고침
      await fetchApplications()
      await fetchParticipants()

      alert(`${virtualSelected.length}명의 크리에이터가 확정되었습니다.`)
    } catch (error) {
      console.error('Error bulk confirming:', error)
      alert('확정 처리에 실패했습니다: ' + error.message)
    }
  }

  // 크리에이터별 맞춤 가이드 생성
  const generatePersonalizedGuides = async (participantIds) => {
    try {
      for (const participantId of participantIds) {
        // 참여자 정보 가져오기
        const participant = participants.find(p => p.id === participantId)
        if (!participant || !participant.content_url) {
          console.log(`Skipping participant ${participantId}: no content URL`)
          continue
        }

        // 플랫폼 판별
        let platform = 'unknown'
        let username = ''
        
        if (participant.content_url.includes('youtube.com') || participant.content_url.includes('youtu.be')) {
          platform = 'youtube'
          const channelMatch = participant.content_url.match(/youtube\.com\/channel\/([\w-]+)/)
          const handleMatch = participant.content_url.match(/youtube\.com\/@([\w-]+)/)
          username = channelMatch?.[1] || handleMatch?.[1] || ''
        } else if (participant.content_url.includes('instagram.com')) {
          platform = 'instagram'
          const match = participant.content_url.match(/instagram\.com\/([\w.]+)/)
          username = match?.[1] || ''
        } else if (participant.content_url.includes('tiktok.com')) {
          platform = 'tiktok'
          const match = participant.content_url.match(/tiktok\.com\/@([\w.]+)/)
          username = match?.[1] || ''
        }

        if (!username) {
          console.log(`Skipping participant ${participantId}: could not extract username`)
          continue
        }

        // 플랫폼별 분석 API 호출
        let analysisResponse
        if (platform === 'youtube') {
          analysisResponse = await fetch('/.netlify/functions/analyze-youtube-creator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelUrl: participant.content_url })
          })
        } else if (platform === 'instagram') {
          analysisResponse = await fetch('/.netlify/functions/analyze-instagram-creator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
          })
        } else if (platform === 'tiktok') {
          analysisResponse = await fetch('/.netlify/functions/analyze-tiktok-creator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
          })
        }

        if (!analysisResponse || !analysisResponse.ok) {
          console.error(`Failed to analyze ${platform} creator: ${username}`)
          continue
        }

        const creatorAnalysis = await analysisResponse.json()
        creatorAnalysis.platform = platform

        // 맞춤 가이드 생성
        const guideResponse = await fetch('/.netlify/functions/generate-personalized-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorAnalysis,
            productInfo: {
              brand: campaign.brand,
              product_name: campaign.product_name,
              product_features: campaign.product_features,
              product_key_points: campaign.product_key_points
            },
            baseGuide: campaign.ai_guide || ''
          })
        })

        if (!guideResponse.ok) {
          console.error(`Failed to generate guide for participant ${participantId}`)
          continue
        }

        const { personalizedGuide } = await guideResponse.json()

        // 데이터베이스에 저장
        await supabase
          .from('campaign_participants')
          .update({
            personalized_guide: personalizedGuide,
            creator_analysis: creatorAnalysis
          })
          .eq('id', participantId)

        console.log(`Personalized guide generated for participant ${participantId}`)
      }

      alert('모든 크리에이터의 맞춤 가이드가 생성되었습니다!')
    } catch (error) {
      console.error('Error generating personalized guides:', error)
      alert('맞춤 가이드 생성 중 오류가 발생했습니다.')
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
        await supabase
          .from('campaign_participants')
          .update({
            selection_status: 'selected',
            selected_at: new Date().toISOString()
          })
          .eq('id', participantId)
      }

      // 캠페인의 selected_participants_count 업데이트
      await supabase
        .from('campaigns')
        .update({
          selected_participants_count: selectedParticipants.length
        })
        .eq('id', id)

      alert(`${selectedParticipants.length}명의 크리에이터가 확정되었습니다!`)
      
      // 기획형 캠페인인 경우 맞춤 가이드 생성
      if (campaign.campaign_type === 'regular') {
        alert('크리에이터별 맞춤 가이드를 생성하고 있습니다. 잠시만 기다려주세요...')
        await generatePersonalizedGuides(selectedParticipants)
      }
      
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

  // 크리에이터 테이블 렌더링 함수
  const renderParticipantsTable = (filteredParticipants) => {
    if (filteredParticipants.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          해당 플랫폼의 크리에이터가 없습니다.
        </div>
      )
    }

    return (
      <>
        {filteredParticipants.length > 0 && (
          <div className="flex gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">가이드 확인중:</span>
              <Badge className="bg-purple-100 text-purple-700">
                {filteredParticipants.filter(p => p.creator_status === 'guide_confirmation').length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">촬영중:</span>
              <Badge className="bg-yellow-100 text-yellow-700">
                {filteredParticipants.filter(p => p.creator_status === 'filming').length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">수정중:</span>
              <Badge className="bg-pink-100 text-pink-700">
                {filteredParticipants.filter(p => p.creator_status === 'editing').length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">제출완료:</span>
              <Badge className="bg-blue-100 text-blue-700">
                {filteredParticipants.filter(p => p.creator_status === 'submitted').length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">승인완료:</span>
              <Badge className="bg-green-100 text-green-700">
                {filteredParticipants.filter(p => p.creator_status === 'approved').length}명
              </Badge>
            </div>
          </div>
        )}
        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.length === filteredParticipants.length && filteredParticipants.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParticipants(filteredParticipants.map(p => p.id))
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
              {filteredParticipants.map((participant) => (
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
        {filteredParticipants.length > 0 && (
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
      </>
    )
  }

  const handleUpdateCreatorStatus = async (participantId, newStatus) => {
    try {
      const { error } = await supabase
        .from('campaign_participants')
        .update({ creator_status: newStatus })
        .eq('id', participantId)

      if (error) throw error

      // 참여자 목록 재로드
      const { data, error: fetchError } = await supabase
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
    
    // prompt에서 취소 버튼을 누르면 null이 반환됨
    if (cancelReason === null) {
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      
      // 1. 캠페인 취소
      const { error } = await supabase
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
          const { error: refundTransactionError } = await supabaseBiz
            .from('points_transactions')
            .insert([{
              company_id: companyData.id,
              amount: refundAmount,
              type: 'campaign_cancellation',
              description: `캠페인 취소 환불: ${campaign.title || campaign.campaign_name}`,
              campaign_id: id
            }])
            .select()
          
          if (refundTransactionError) {
            console.error('포인트 환불 기록 오류:', refundTransactionError)
          }

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
      const { error } = await supabase
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
            <Button variant="outline" onClick={() => navigate(isAdmin ? '/admin/campaigns' : '/company/campaigns')}>
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
            {/* 수정 버튼: draft, pending_payment, rejected 상태에서 표시 (취소되지 않은 경우만) */}
            {(campaign.status === 'draft' || ['draft', 'pending_payment', 'rejected'].includes(campaign.approval_status)) && !campaign.is_cancelled && (
              <Button 
                variant="outline"
                onClick={() => {
                  const editPath = region === 'japan' 
                    ? `/company/campaigns/create/japan?id=${id}`
                    : `/company/campaigns/create/korea?edit=${id}`
                  navigate(editPath)
                }}
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
                {(isAdmin || campaign.payment_status !== 'confirmed') ? (
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
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              지원한 크리에이터 ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="virtual" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              가상 선정 ({applications.filter(app => app.virtual_selected).length}명)
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              확정 크리에이터 + 가이드 확인
            </TabsTrigger>
            <TabsTrigger value="editing" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              영상 수정
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              완료
            </TabsTrigger>
          </TabsList>

          {/* 지원한 크리에이터 탭 */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>지원한 크리에이터 ({applications.length}명)</CardTitle>
                <p className="text-sm text-gray-600">캠페인에 지원한 신청자들입니다.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {applications.map(app => (
                    <CreatorCard
                      key={app.id}
                      application={app}
                      onVirtualSelect={handleVirtualSelect}
                      onConfirm={async (app, mainChannel) => {
                        // 개별 확정
                        if (!confirm(`${app.applicant_name}님을 확정하시겠습니까?`)) return
                        
                        try {
                          const { error: insertError } = await supabase
                            .from('campaign_participants')
                            .insert([{
                              campaign_id: id,
                              user_id: app.user_id,
                              creator_name: app.applicant_name,
                              creator_email: '',
                              creator_platform: mainChannel || app.main_channel || '',
                              creator_status: 'guide_confirmation',
                              created_at: new Date().toISOString()
                            }])

                          if (insertError) throw insertError

                          const { error: updateError } = await supabase
                            .from('applications')
                            .update({ 
                              status: 'selected',
                              virtual_selected: false 
                            })
                            .eq('id', app.id)

                          if (updateError) throw updateError

                          await fetchApplications()
                          await fetchParticipants()

                          // 알림톡 및 이메일 발송
                          try {
                            const { data: profile } = await supabase
                              .from('user_profiles')
                              .select('email, phone')
                              .eq('id', app.user_id)
                              .maybeSingle()

                            if (profile) {
                              // 카카오 알림톡
                              if (profile.phone) {
                                const alimtalkResult = await sendCampaignSelectionNotification({
                                  creatorName: app.applicant_name,
                                  phoneNumber: profile.phone,
                                  campaignName: campaign?.title || '캐페인',
                                  cid: `campaign_${id}_user_${app.user_id}`
                                })
                                console.log('Alimtalk:', alimtalkResult)
                              }

                              // 이메일
                              if (profile.email) {
                                const emailResult = await sendCampaignSelectionEmail({
                                  creatorName: app.applicant_name,
                                  creatorEmail: profile.email,
                                  campaignName: campaign?.title || '캐페인'
                                })
                                console.log('Email:', emailResult)
                              }
                            }
                          } catch (notificationError) {
                            console.error('Notification error:', notificationError)
                          }

                          alert('확정되었습니다. 알림톡과 이메일이 발송되었습니다.')
                        } catch (error) {
                          console.error('Error confirming:', error)
                          alert('확정 처리에 실패했습니다.')
                        }
                      }}
                    />
                  ))}
                </div>
                {applications.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    아직 지원자가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 가상 선정 탭 */}
          <TabsContent value="virtual">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>가상 선정한 크리에이터</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    현재 다른 캠페인의 기한 조과 이슈로 인해 신규 캠페인에 지원한 인플루언서들입니다.
                  </p>
                </div>
                <Button 
                  onClick={handleBulkConfirm}
                  disabled={applications.filter(app => app.virtual_selected).length === 0}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  가상 선정한 크리에이터 한번에 선정하기
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {applications.filter(app => app.virtual_selected).map(app => (
                    <CreatorCard
                      key={app.id}
                      application={app}
                      onVirtualSelect={handleVirtualSelect}
                      onConfirm={async (app, mainChannel) => {
                        // 개별 확정
                        if (!confirm(`${app.applicant_name}님을 확정하시겠습니까?`)) return
                        
                        try {
                          const { error: insertError } = await supabase
                            .from('campaign_participants')
                            .insert([{
                              campaign_id: id,
                              user_id: app.user_id,
                              creator_name: app.applicant_name,
                              creator_email: '',
                              creator_platform: mainChannel || app.main_channel || '',
                              creator_status: 'guide_confirmation',
                              created_at: new Date().toISOString()
                            }])

                          if (insertError) throw insertError

                          const { error: updateError } = await supabase
                            .from('applications')
                            .update({ 
                              status: 'selected',
                              virtual_selected: false 
                            })
                            .eq('id', app.id)

                          if (updateError) throw updateError

                          await fetchApplications()
                          await fetchParticipants()

                          // 알림톡 및 이메일 발송
                          try {
                            const { data: profile } = await supabase
                              .from('user_profiles')
                              .select('email, phone')
                              .eq('id', app.user_id)
                              .maybeSingle()

                            if (profile) {
                              // 카카오 알림톡
                              if (profile.phone) {
                                const alimtalkResult = await sendCampaignSelectionNotification({
                                  creatorName: app.applicant_name,
                                  phoneNumber: profile.phone,
                                  campaignName: campaign?.title || '캐페인',
                                  cid: `campaign_${id}_user_${app.user_id}`
                                })
                                console.log('Alimtalk:', alimtalkResult)
                              }

                              // 이메일
                              if (profile.email) {
                                const emailResult = await sendCampaignSelectionEmail({
                                  creatorName: app.applicant_name,
                                  creatorEmail: profile.email,
                                  campaignName: campaign?.title || '캐페인'
                                })
                                console.log('Email:', emailResult)
                              }
                            }
                          } catch (notificationError) {
                            console.error('Notification error:', notificationError)
                          }

                          alert('확정되었습니다. 알림톡과 이메일이 발송되었습니다.')
                        } catch (error) {
                          console.error('Error confirming:', error)
                          alert('확정 처리에 실패했습니다.')
                        }
                      }}
                    />
                  ))}
                </div>
                {applications.filter(app => app.virtual_selected).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    아직 가상 선정한 크리에이터가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 확정 크리에이터 + 가이드 확인 탭 */}
          <TabsContent value="confirmed">
            <Card>
              <CardHeader>
                <CardTitle>참여 크리에이터 리스트</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 플랫폼별 필터 탭 */}
                <Tabs defaultValue="all" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="all">
                      전체 ({participants.length})
                    </TabsTrigger>
                    <TabsTrigger value="youtube">
                      유튜브 ({participants.filter(p => p.creator_platform?.toLowerCase().includes('youtube')).length})
                    </TabsTrigger>
                    <TabsTrigger value="instagram">
                      인스타 ({participants.filter(p => p.creator_platform?.toLowerCase().includes('instagram')).length})
                    </TabsTrigger>
                    <TabsTrigger value="tiktok">
                      틱톡 ({participants.filter(p => p.creator_platform?.toLowerCase().includes('tiktok')).length})
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* 전체 */}
                  <TabsContent value="all">
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
                    {renderParticipantsTable(participants)}
                  </TabsContent>
                  
                  {/* 유튜브 */}
                  <TabsContent value="youtube">
                    {renderParticipantsTable(participants.filter(p => p.creator_platform?.toLowerCase().includes('youtube')))}
                  </TabsContent>
                  
                  {/* 인스타 */}
                  <TabsContent value="instagram">
                    {renderParticipantsTable(participants.filter(p => p.creator_platform?.toLowerCase().includes('instagram')))}
                  </TabsContent>
                  
                  {/* 틱톡 */}
                  <TabsContent value="tiktok">
                    {renderParticipantsTable(participants.filter(p => p.creator_platform?.toLowerCase().includes('tiktok')))}
                  </TabsContent>
                </Tabs>
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
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">맞춤 가이드</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">영상 상태</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">영상 관리</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">스케줄 연장</th>
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
                              {participant.personalized_guide ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGuide(participant)
                                    setShowGuideModal(true)
                                  }}
                                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                >
                                  가이드 보기
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-sm">생성 중...</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {participant.video_status === 'pending' && <Badge className="bg-gray-100 text-gray-800">대기중</Badge>}
                              {participant.video_status === 'uploaded' && <Badge className="bg-blue-100 text-blue-800">업로드 완료</Badge>}
                              {participant.video_status === 'approved' && <Badge className="bg-green-100 text-green-800">승인됨</Badge>}
                              {participant.video_status === 'revision_requested' && <Badge className="bg-yellow-100 text-yellow-800">수정 요청</Badge>}
                            </td>
                            <td className="px-4 py-3">
                              {participant.video_files && participant.video_files.length > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigate(`/company/video-feedback?participantId=${participant.id}`)
                                  }}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  영상 피드백
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-sm">미업로드</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {participant.extension_requested ? (
                                <div className="flex flex-col gap-1">
                                  <Badge className={participant.extension_status === 'approved' ? 'bg-green-100 text-green-800' : participant.extension_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {participant.extension_status === 'approved' ? '승인됨' : participant.extension_status === 'rejected' ? '거부됨' : '대기중'}
                                  </Badge>
                                  {participant.extension_status === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedParticipant(participant)
                                        setShowExtensionModal(true)
                                      }}
                                      className="text-xs"
                                    >
                                      처리
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
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

          {/* 영상 수정 탭 */}
          <TabsContent value="editing">
            <Card>
              <CardHeader>
                <CardTitle>영상 수정 중인 크리에이터</CardTitle>
              </CardHeader>
              <CardContent>
                {participants.filter(p => p.creator_status === 'editing').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    영상 수정 중인 크리에이터가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participants.filter(p => p.creator_status === 'editing').map(participant => (
                      <div key={participant.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{participant.creator_name}</h4>
                            <p className="text-sm text-gray-600">{participant.creator_platform}</p>
                          </div>
                          <Badge className="bg-pink-100 text-pink-700">수정중</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 완료 탭 */}
          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>완료된 크리에이터</CardTitle>
              </CardHeader>
              <CardContent>
                {participants.filter(p => p.creator_status === 'completed').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    아직 완료된 크리에이터가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participants.filter(p => p.creator_status === 'completed').map(participant => (
                      <div key={participant.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{participant.creator_name}</h4>
                            <p className="text-sm text-gray-600">{participant.creator_platform}</p>
                            {participant.content_url && (
                              <a 
                                href={participant.content_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                콘텐츠 보기
                              </a>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-700">완료</Badge>
                        </div>
                      </div>
                    ))}
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

      {/* 맞춤 가이드 모달 */}
      {showGuideModal && selectedGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-purple-900">
                  {selectedGuide.creator_name}님의 맞춤 가이드
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedGuide.creator_platform} · {selectedGuide.creator_email}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGuideModal(false)
                  setSelectedGuide(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* 크리에이터 분석 정보 */}
              {selectedGuide.creator_analysis && (
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3">크리에이터 분석</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedGuide.creator_analysis.followers && (
                      <div>
                        <span className="text-gray-600">팔로워:</span>
                        <span className="ml-2 font-medium">
                          {selectedGuide.creator_analysis.followers.toLocaleString()}명
                        </span>
                      </div>
                    )}
                    {selectedGuide.creator_analysis.contentAnalysis?.engagementRate && (
                      <div>
                        <span className="text-gray-600">참여율:</span>
                        <span className="ml-2 font-medium">
                          {selectedGuide.creator_analysis.contentAnalysis.engagementRate}%
                        </span>
                      </div>
                    )}
                    {selectedGuide.creator_analysis.style?.tone && (
                      <div>
                        <span className="text-gray-600">톤:</span>
                        <span className="ml-2 font-medium">
                          {selectedGuide.creator_analysis.style.tone}
                        </span>
                      </div>
                    )}
                    {selectedGuide.creator_analysis.style?.topics && (
                      <div>
                        <span className="text-gray-600">주요 토픽:</span>
                        <span className="ml-2 font-medium">
                          {selectedGuide.creator_analysis.style.topics.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 맞춤 가이드 컨텐츠 */}
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {selectedGuide.personalized_guide}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGuideModal(false)
                  setSelectedGuide(null)
                }}
              >
                닫기
              </Button>
              <Button
                onClick={() => {
                  // 가이드 복사
                  navigator.clipboard.writeText(selectedGuide.personalized_guide)
                  alert('가이드가 클립보드에 복사되었습니다!')
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                가이드 복사
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 영상 확인 및 수정 요청 모달 */}
      {showVideoModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-2xl font-bold text-white">영상 확인 및 수정 요청</h2>
              <p className="text-blue-100 mt-1">{selectedParticipant.creator_name}</p>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="p-6">
              {/* 업로드된 영상 목록 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">업로드된 영상</h3>
                <div className="space-y-3">
                  {selectedParticipant.video_files?.map((file, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileVideo className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium">{file.name}</span>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          보기
                        </a>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        업로드: {new Date(file.uploaded_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 수정 요청 작성 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">수정 요청 사항</h3>
                <textarea
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  placeholder="수정이 필요한 부분을 상세히 작성해주세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                />
              </div>

              {/* 기존 수정 요청 내역 */}
              {selectedParticipant.revision_requests && selectedParticipant.revision_requests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">이전 수정 요청 내역</h3>
                  <div className="space-y-2">
                    {selectedParticipant.revision_requests.map((request, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">{request.comment}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVideoModal(false)
                  setSelectedParticipant(null)
                  setRevisionComment('')
                }}
              >
                닫기
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('campaign_participants')
                      .update({
                        video_status: 'approved'
                      })
                      .eq('id', selectedParticipant.id)

                    if (error) throw error

                    alert('영상이 승인되었습니다!')
                    setShowVideoModal(false)
                    setSelectedParticipant(null)
                    fetchCampaignDetail()
                  } catch (error) {
                    console.error('Error approving video:', error)
                    alert('승인에 실패했습니다.')
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                승인
              </Button>
              <Button
                onClick={async () => {
                  if (!revisionComment.trim()) {
                    alert('수정 요청 사항을 입력해주세요.')
                    return
                  }

                  try {
                    const existingRequests = selectedParticipant.revision_requests || []
                    const newRequest = {
                      comment: revisionComment,
                      created_at: new Date().toISOString()
                    }

                    const { error } = await supabase
                      .from('campaign_participants')
                      .update({
                        video_status: 'revision_requested',
                        revision_requests: [...existingRequests, newRequest]
                      })
                      .eq('id', selectedParticipant.id)

                    if (error) throw error

                    alert('수정 요청이 전송되었습니다!')
                    setShowVideoModal(false)
                    setSelectedParticipant(null)
                    setRevisionComment('')
                    fetchCampaignDetail()
                  } catch (error) {
                    console.error('Error requesting revision:', error)
                    alert('수정 요청에 실패했습니다.')
                  }
                }}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                수정 요청
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 스케줄 연장 처리 모달 */}
      {showExtensionModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold">스케줄 연장 신청 처리</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedParticipant.creator_name}</p>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">연장 기간</p>
                <p className="text-lg font-semibold">{selectedParticipant.extension_days}일</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">연장 사유</p>
                <p className="text-sm mt-1 bg-gray-50 p-3 rounded-lg">{selectedParticipant.extension_reason}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">신청 시간</p>
                <p className="text-sm">{new Date(selectedParticipant.extension_requested_at).toLocaleString('ko-KR')}</p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExtensionModal(false)
                  setSelectedParticipant(null)
                }}
              >
                취소
              </Button>
              <Button
                onClick={async () => {
                  if (!confirm('연장 신청을 거부하시겠습니까? 거부 시 캠페인 취소 여부를 결정해야 합니다.')) return

                  try {
                    const { error } = await supabase
                      .from('campaign_participants')
                      .update({
                        extension_status: 'rejected',
                        extension_decided_at: new Date().toISOString()
                      })
                      .eq('id', selectedParticipant.id)

                    if (error) throw error

                    const cancelCampaign = confirm('캠페인을 취소하시겠습니까?')
                    if (cancelCampaign) {
                      // 캠페인 취소 로직 추가 가능
                    }

                    alert('연장 신청이 거부되었습니다.')
                    setShowExtensionModal(false)
                    setSelectedParticipant(null)
                    fetchCampaignDetail()
                  } catch (error) {
                    console.error('Error rejecting extension:', error)
                    alert('거부 처리에 실패했습니다.')
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                거부
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('campaign_participants')
                      .update({
                        extension_status: 'approved',
                        extension_decided_at: new Date().toISOString()
                      })
                      .eq('id', selectedParticipant.id)

                    if (error) throw error

                    alert('연장 신청이 승인되었습니다!')
                    setShowExtensionModal(false)
                    setSelectedParticipant(null)
                    fetchCampaignDetail()
                  } catch (error) {
                    console.error('Error approving extension:', error)
                    alert('승인 처리에 실패했습니다.')
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                승인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

