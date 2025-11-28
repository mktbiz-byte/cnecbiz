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
import { sendCampaignSelectedNotification, sendCampaignCancelledNotification, sendGuideDeliveredNotification } from '../../services/notifications/creatorNotifications'
import { getAIRecommendations, generateAIRecommendations } from '../../services/aiRecommendation'
import * as XLSX from 'xlsx'
import CampaignGuideViewer from './CampaignGuideViewer'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'
  const supabase = region === 'japan' ? getSupabaseClient('japan') : supabaseKorea
  const [campaign, setCampaign] = useState(null)
  const [applications, setApplications] = useState([])
  const [participants, setParticipants] = useState([])
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [cnecPlusRecommendations, setCnecPlusRecommendations] = useState([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [loadingCnecPlus, setLoadingCnecPlus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshingViews, setRefreshingViews] = useState({})
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancellingApp, setCancellingApp] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [trackingChanges, setTrackingChanges] = useState({}) // {participantId: {tracking_number, shipping_company}}
  const [bulkCourierCompany, setBulkCourierCompany] = useState('')
  const [showAdditionalPayment, setShowAdditionalPayment] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState(null)
  const [selectedGuide, setSelectedGuide] = useState(null)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [revisionComment, setRevisionComment] = useState('')
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [selectedConfirmedParticipants, setSelectedConfirmedParticipants] = useState([])
  const [editingGuide, setEditingGuide] = useState(false)
  const [editedGuideContent, setEditedGuideContent] = useState('')
  const [showRevisionRequestModal, setShowRevisionRequestModal] = useState(false)
  const [revisionRequestText, setRevisionRequestText] = useState('')
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regenerateRequest, setRegenerateRequest] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(null)
  const [videoSubmissions, setVideoSubmissions] = useState([])
  const [selectedVideoVersions, setSelectedVideoVersions] = useState({}) // {user_id: version_index}
  const [signedVideoUrls, setSignedVideoUrls] = useState({}) // {submission_id: signed_url}
  const [showIndividualMessageModal, setShowIndividualMessageModal] = useState(false)
  const [individualMessage, setIndividualMessage] = useState('')
  const [selectedParticipantForMessage, setSelectedParticipantForMessage] = useState(null)
  const [showUnifiedGuideModal, setShowUnifiedGuideModal] = useState(false)
  const [unifiedGuideTab, setUnifiedGuideTab] = useState('step1')
  const [isGeneratingUnifiedGuide, setIsGeneratingUnifiedGuide] = useState(false)
  const [unifiedGuideData, setUnifiedGuideData] = useState({
    step1: { required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' },
    step2: { required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' },
    step3: { required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' }
  })

  useEffect(() => {
    const initPage = async () => {
      // Get current user from supabaseBiz (where login happens)
      const { data: { user: currentUser } } = await supabaseBiz.auth.getUser()
      setUser(currentUser)
      
      await checkIfAdmin()
      await fetchCampaignDetail()
      fetchParticipants()
      fetchApplications()
      fetchVideoSubmissions()
    }
    initPage()
  }, [id])
  
  // Check authorization after user, isAdmin, and campaign are loaded
  useEffect(() => {
    if (campaign) {
      // Block if not logged in
      if (!user) {
        alert('로그인이 필요합니다.')
        navigate('/login')
        return
      }
      
      // Block if campaign has no owner (data error)
      if (!campaign.company_id) {
        alert('잘못된 캠페인 데이터입니다.')
        navigate('/company/campaigns')
        return
      }
      
      // Check permission: must be campaign owner or admin
      if (campaign.company_id !== user.id && !isAdmin) {
        alert('이 캠페인에 접근할 권한이 없습니다.')
        navigate('/company/campaigns')
      }
    }
  }, [campaign, user, isAdmin])
  
  // AI 추천은 campaign이 로드된 후에 실행
  useEffect(() => {
    if (campaign) {
      fetchAIRecommendations()
      fetchCnecPlusRecommendations()
    }
  }, [campaign])

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
      // 모든 지역에서 applications 테이블 사용, 선정된 크리에이터만 표시
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('campaign_id', id)
        .in('status', ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed'])
        .order('created_at', { ascending: false })

      if (error) throw error
      
      console.log('Fetched participants:', data)
      console.log('Participants count:', data?.length || 0)
      console.log('Participants statuses:', data?.map(p => ({ name: p.applicant_name, status: p.status })))
      setParticipants(data || [])
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  // AI 추천 크리에이터 로드 (featured_creators에서)
  const fetchAIRecommendations = async () => {
    setLoadingRecommendations(true)
    try {
      const { data: recommendations, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .eq('featured_type', 'ai_recommended')
        .eq('is_active', true)
        .order('evaluation_score', { ascending: false })
        .limit(10)

      if (error) throw error
      
      // Transform to match expected format
      const transformed = recommendations?.map(creator => {
        const followers = creator.followers || 0
        let mainChannel = '플랫폼 정보 없음'
        
        if (creator.platform === 'youtube') mainChannel = `유튜브 ${followers.toLocaleString()}`
        else if (creator.platform === 'instagram') mainChannel = `인스타그램 ${followers.toLocaleString()}`
        else if (creator.platform === 'tiktok') mainChannel = `틱톡 ${followers.toLocaleString()}`
        
        return {
          id: creator.id,
          name: creator.channel_name,
          profile_photo_url: creator.profile_image,
          youtube_subscribers: creator.platform === 'youtube' ? followers : 0,
          instagram_followers: creator.platform === 'instagram' ? followers : 0,
          tiktok_followers: creator.platform === 'tiktok' ? followers : 0,
          youtube_url: creator.platform === 'youtube' ? creator.channel_url : null,
          instagram_url: creator.platform === 'instagram' ? creator.channel_url : null,
          tiktok_url: creator.platform === 'tiktok' ? creator.channel_url : null,
          bio: creator.target_audience,
          age: null,
          score: creator.evaluation_score || 0,
          main_channel: mainChannel,
          user_id: creator.user_id  // For matching
        }
      }) || []
      
      setAiRecommendations(transformed)
      console.log('[CampaignDetail] Loaded AI recommendations:', transformed.length)
    } catch (error) {
      console.error('AI 추천 로드 오류:', error)
      setAiRecommendations([])
    } finally {
      setLoadingRecommendations(false)
    }
  }

  // 크넥 플러스 AI 추천 크리에이터 로드 (추가금 필요)
  const fetchCnecPlusRecommendations = async () => {
    setLoadingCnecPlus(true)
    try {
      const { data: creators, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .eq('featured_type', 'cnec_plus')
        .eq('is_active', true)
        .order('evaluation_score', { ascending: false })
        .limit(5)
      
      if (error) throw error
      
      if (!creators || creators.length === 0) {
        console.log('[CampaignDetail] No CNEC Plus creators available')
        setCnecPlusRecommendations([])
        return
      }
      
      // Transform to match expected format
      const transformed = creators.map(creator => {
        const followers = creator.followers || 0
        let mainChannel = '플랫폼 정보 없음'
        
        if (creator.platform === 'youtube') mainChannel = `유튜브 ${followers.toLocaleString()}`
        else if (creator.platform === 'instagram') mainChannel = `인스타그램 ${followers.toLocaleString()}`
        else if (creator.platform === 'tiktok') mainChannel = `틱톡 ${followers.toLocaleString()}`
        
        return {
          id: creator.id,
          name: creator.channel_name,
          profile_photo_url: creator.profile_image,
          youtube_subscribers: creator.platform === 'youtube' ? followers : 0,
          instagram_followers: creator.platform === 'instagram' ? followers : 0,
          tiktok_followers: creator.platform === 'tiktok' ? followers : 0,
          youtube_url: creator.platform === 'youtube' ? creator.channel_url : null,
          instagram_url: creator.platform === 'instagram' ? creator.channel_url : null,
          tiktok_url: creator.platform === 'tiktok' ? creator.channel_url : null,
          bio: creator.target_audience,
          age: null,
          score: creator.evaluation_score || 0,
          main_channel: mainChannel,
          user_id: creator.user_id,
          upgrade_price: creator.upgrade_price || 0  // 추가금
        }
      })
      
      setCnecPlusRecommendations(transformed)
      console.log('[CampaignDetail] Loaded CNEC Plus recommendations:', transformed.length)
    } catch (error) {
      console.error('크넥 플러스 추천 로드 오류:', error)
      setCnecPlusRecommendations([])
    } finally {
      setLoadingCnecPlus(false)
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
              const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('profile_photo_url, profile_image_url, avatar_url, instagram_followers, youtube_subscribers, tiktok_followers')
                .eq('id', app.user_id)
              
              const profile = profiles && profiles.length > 0 ? profiles[0] : null
              
              console.log('Profile data for', app.applicant_name, ':', profile)
              if (profileError) console.error('Profile fetch error:', profileError)
              
              if (profile) {
                const enriched = {
                  ...app,
                  profile_photo_url: profile.profile_photo_url || profile.profile_image_url || profile.avatar_url,
                  instagram_followers: profile.instagram_followers || app.instagram_followers || 0,
                  youtube_subscribers: profile.youtube_subscribers || app.youtube_subscribers || 0,
                  tiktok_followers: profile.tiktok_followers || app.tiktok_followers || 0
                }
                console.log('Enriched data:', enriched.applicant_name, 'YT:', enriched.youtube_subscribers, 'IG:', enriched.instagram_followers, 'Photo:', enriched.profile_photo_url)
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
      
      console.log('Fetched applications with status:', enrichedData.map(app => ({ name: app.applicant_name, status: app.status, virtual_selected: app.virtual_selected })))
      setApplications(enrichedData)
    } catch (error) {
      console.error('Error fetching applications:', error)
    }
  }

  const fetchVideoSubmissions = async () => {
    try {
      console.log('Fetching video submissions for campaign_id:', id)
      const { data, error } = await supabase
        .from('video_submissions')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Video submissions query error:', error)
        throw error
      }
      console.log('Fetched video submissions:', data)
      setVideoSubmissions(data || [])
      
      // Generate signed URLs for all video submissions (5 hours validity)
      if (data && data.length > 0) {
        const urlPromises = data.map(async (submission) => {
          if (submission.video_file_url) {
            try {
              // Extract path from full URL
              const url = new URL(submission.video_file_url)
              const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/campaign-videos\/(.+)$/)
              if (pathMatch) {
                const filePath = pathMatch[1]
                const { data: signedData, error: signedError } = await supabase.storage
                  .from('campaign-videos')
                  .createSignedUrl(filePath, 18000) // 5 hours = 18000 seconds
                
                if (signedError) {
                  console.error('Error creating signed URL:', signedError)
                  return { id: submission.id, url: submission.video_file_url }
                }
                return { id: submission.id, url: signedData.signedUrl }
              }
            } catch (err) {
              console.error('Error parsing video URL:', err)
            }
          }
          return { id: submission.id, url: submission.video_file_url }
        })
        
        const urls = await Promise.all(urlPromises)
        const urlMap = urls.reduce((acc, { id, url }) => {
          acc[id] = url
          return acc
        }, {})
        setSignedVideoUrls(urlMap)
        console.log('Generated signed URLs for', urls.length, 'videos')
      }
    } catch (error) {
      console.error('Error fetching video submissions:', error)
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
        .from('applications')
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

  const handleTrackingNumberChange = (participantId, field, value) => {
    setTrackingChanges(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [field]: value
      }
    }))
  }

  const saveTrackingNumber = async (participantId) => {
    const changes = trackingChanges[participantId]
    if (!changes) {
      alert('변경사항이 없습니다.')
      return
    }

    try {
      const participant = participants.find(p => p.id === participantId)
      if (!participant) throw new Error('참여자를 찾을 수 없습니다.')

      const updateData = {}
      if (changes.tracking_number !== undefined) updateData.tracking_number = changes.tracking_number
      if (changes.shipping_company !== undefined) updateData.shipping_company = changes.shipping_company

      // applications 업데이트
      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', participantId)

      if (error) throw error

      // applications 테이블도 업데이트
      const { error: appError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('campaign_id', participant.campaign_id)
        .eq('applicant_name', (participant.creator_name || participant.applicant_name || '크리에이터'))
        .eq('status', 'selected')

      if (appError) {
        console.error('Error updating applications table:', appError)
      }

      // 저장된 변경사항 제거
      setTrackingChanges(prev => {
        const newChanges = { ...prev }
        delete newChanges[participantId]
        return newChanges
      })

      await fetchParticipants()
      alert('송장번호가 저장되었습니다.')
    } catch (error) {
      console.error('Error updating tracking number:', error)
      alert('송장번호 저장에 실패했습니다.')
    }
  }

  // 배송 정보 엑셀 다운로드
  const exportShippingInfo = () => {
    const data = participants.map(p => ({
      '크리에이터명': p.creator_name || p.applicant_name,
      '연락처': p.phone_number || p.creator_phone || '',
      '우편번호': p.postal_code || '',
      '주소': p.address || '',
      '배송시 요청사항': p.delivery_notes || p.delivery_request || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '배송정보')
    XLSX.writeFile(wb, `${campaign.title}_배송정보.xlsx`)
  }

  // 송장번호 템플릿 다운로드
  const downloadTrackingTemplate = () => {
    const data = participants.map(p => ({
      '크리에이터명': p.creator_name,
      '송장번호': ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '송장번호')
    XLSX.writeFile(wb, `${campaign.title}_송장번호_템플릿.xlsx`)
  }

  // 송장번호 엑셀 업로드
  const uploadTrackingNumbers = async (file) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      let successCount = 0
      let failCount = 0

      for (const row of jsonData) {
        const creatorName = row['크리에이터명']
        const trackingNumber = row['송장번호']

        if (!creatorName || !trackingNumber) continue

        const participant = participants.find(p => p.creator_name === creatorName)
        if (!participant) {
          failCount++
          continue
        }

        try {
          await supabase
            .from('applications')
            .update({ tracking_number: trackingNumber })
            .eq('id', participant.id)

          await supabase
            .from('applications')
            .update({ tracking_number: trackingNumber })
            .eq('campaign_id', participant.campaign_id)
            .eq('applicant_name', (participant.creator_name || participant.applicant_name || '크리에이터'))
            .eq('status', 'selected')

          successCount++
        } catch (error) {
          console.error(`Error updating ${creatorName}:`, error)
          failCount++
        }
      }

      await fetchParticipants()
      alert(`송장번호 업로드 완료!\n성공: ${successCount}건\n실패: ${failCount}건`)
    } catch (error) {
      console.error('Error uploading tracking numbers:', error)
      alert('송장번호 업로드에 실패했습니다: ' + error.message)
    }
  }

  // 택배사 일괄 수정
  const bulkUpdateCourier = async () => {
    if (selectedParticipants.length === 0) {
      alert('크리에이터를 선택해주세요.')
      return
    }

    if (!bulkCourierCompany) {
      alert('택배사를 선택해주세요.')
      return
    }

    try {
      for (const participantId of selectedParticipants) {
        const participant = participants.find(p => p.id === participantId)
        if (!participant) continue

        await supabase
          .from('applications')
          .update({ shipping_company: bulkCourierCompany })
          .eq('id', participantId)

        await supabase
          .from('applications')
          .update({ shipping_company: bulkCourierCompany })
          .eq('campaign_id', participant.campaign_id)
          .eq('applicant_name', (participant.creator_name || participant.applicant_name || '크리에이터'))
          .eq('status', 'selected')
      }

      await fetchParticipants()
      alert(`${selectedParticipants.length}명의 택배사가 변경되었습니다.`)
      setSelectedParticipants([])
      setBulkCourierCompany('')
    } catch (error) {
      console.error('Error bulk updating courier:', error)
      alert('택배사 일괄 수정에 실패했습니다: ' + error.message)
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
      // 가상선택되었고 아직 확정되지 않은 크리에이터만 필터링
      const virtualSelected = applications.filter(app => 
        app.virtual_selected && app.status !== 'selected'
      )
      
      if (virtualSelected.length === 0) {
        alert('확정할 크리에이터가 없습니다. (이미 확정되었거나 가상 선정되지 않음)')
        return
      }

      // 모집인원 제한 체크
      const currentParticipantsCount = participants.length
      const totalSlots = campaign.total_slots || 0
      const availableSlots = totalSlots - currentParticipantsCount
      
      if (availableSlots <= 0) {
        alert(`모집인원(${totalSlots}명)이 이미 충족되었습니다.\n현재 참여 크리에이터: ${currentParticipantsCount}명`)
        return
      }
      
      if (virtualSelected.length > availableSlots) {
        alert(`모집인원을 초과할 수 없습니다.\n\n모집인원: ${totalSlots}명\n현재 참여: ${currentParticipantsCount}명\n남은 자리: ${availableSlots}명\n선택한 인원: ${virtualSelected.length}명\n\n${availableSlots}명만 선택해주세요.`)
        return
      }

      if (!confirm(`${virtualSelected.length}명의 크리에이터를 확정하시겠습니까?`)) {
        return
      }

      // 이미 applications에 존재하는지 확인
      const { data: existingParticipants } = await supabase
        .from('applications')
        .select('creator_name')
        .eq('campaign_id', id)
        .in('creator_name', virtualSelected.map(app => app.applicant_name))
      
      const existingNames = new Set(existingParticipants?.map(p => p.creator_name) || [])
      const toAdd = virtualSelected.filter(app => !existingNames.has(app.applicant_name))
      
      if (toAdd.length === 0) {
        alert('모든 크리에이터가 이미 확정되었습니다.')
        return
      }
      
      if (toAdd.length < virtualSelected.length) {
        const skipped = virtualSelected.filter(app => existingNames.has(app.applicant_name))
        alert(`${skipped.map(a => a.applicant_name).join(', ')}는 이미 확정되어 제외됩니다.`)
      }
      
      // applications의 status를 'selected'로 업데이트 (크리에이터 관리 탭과 동일)
      console.log('Updating applications status to selected for IDs:', toAdd.map(app => app.id))
      const { error: updateError, data: updateData } = await supabase
        .from('applications')
        .update({ 
          status: 'selected',
          virtual_selected: false 
        })
        .in('id', toAdd.map(app => app.id))
        .select()

      console.log('Update result:', updateData, 'Error:', updateError)
      if (updateError) throw updateError

      // 목록 새로고침
      await fetchApplications()
      await fetchParticipants()
      
         // 선정 완료 알림톡 발송
      let successCount = 0
      for (const app of toAdd) {
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('email, phone')
            .eq('id', app.user_id)
            .maybeSingle()
          
          // 알림톡 발송만 수행 (creator_email, creator_platform 필드 없음)
          
          if (profile?.phone) {
            await sendCampaignSelectedNotification(
              profile.phone,
              app.applicant_name,
              {
                campaignName: campaign?.title || '캠페인'
              }
            )
            successCount++
          }
        } catch (notificationError) {
          console.error('Notification error for', app.applicant_name, notificationError)
        }
      }
      
      alert(`${toAdd.length}명의 크리에이터가 확정되었습니다.${successCount > 0 ? ` (알림톡 ${successCount}건 발송)` : ''}`)
    } catch (error) {
      console.error('Error bulk confirming:', error)
      alert('확정 처리에 실패했습니다: ' + error.message)
    }
  }
  
  // 확정 취소 처리
  const handleCancelConfirmation = async () => {
    if (!cancellingApp || !cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.')
      return
    }
    
    try {
      // applications에서 삭제
      const { error: deleteError } = await supabase
        .from('applications')
        .delete()
        .eq('campaign_id', id)
        .eq('creator_name', cancellingApp.applicant_name)
      
      if (deleteError) throw deleteError
      
      // applications 상태를 pending으로 변경
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          status: 'pending',
          virtual_selected: false 
        })
        .eq('id', cancellingApp.id)
      
      if (updateError) throw updateError
      
      // 알림톡 발송
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email, phone')
          .eq('id', cancellingApp.user_id)
          .maybeSingle()
        
        if (profile?.phone) {
          await sendCampaignCancelledNotification(
            profile.phone,
            cancellingApp.applicant_name,
            {
              campaignName: campaign?.title || '캠페인',
              reason: cancelReason
            }
          )
          console.log('Cancellation alimtalk sent successfully')
        }
      } catch (notificationError) {
        console.error('Notification error:', notificationError)
      }
      
      // 목록 새로고침
      await fetchApplications()
      await fetchParticipants()
      
      // 모달 닫기
      setCancelModalOpen(false)
      setCancellingApp(null)
      setCancelReason('')
      
      alert('확정이 취소되었습니다. 알림톡이 발송되었습니다.')
    } catch (error) {
      console.error('Error cancelling confirmation:', error)
      alert('취소 처리에 실패했습니다: ' + error.message)
    }
  }

  // 올영 세일 통합 가이드 생성 함수
  const handleGenerateOliveYoungGuide = async () => {
    if (!confirm('올리브영 세일 통합 가이드를 생성하시겠습니까?')) {
      return
    }

    try {
      // AI 가이드 생성 요청
      const response = await fetch('/.netlify/functions/generate-oliveyoung-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignData: {
            brand: campaign.brand || '',
            product_name: campaign.title || '',
            product_url: campaign.product_url || '',
            category: campaign.category || [],
            reward_points: campaign.reward_points || 0,
            total_slots: campaign.total_slots || 0,
            start_date: campaign.start_date || '',
            end_date: campaign.end_date || '',
            product_description: campaign.description || '',
            additional_details: campaign.additional_details || '',
            must_include: campaign.must_include || '',
            exclusions: campaign.exclusions || '',
            additional_shooting_requests: campaign.additional_shooting_requests || ''
          }
        })
      })

      if (!response.ok) {
        throw new Error('AI 가이드 생성 실패')
      }

      const { guide } = await response.json()

      // 생성된 가이드를 campaigns 테이블에 저장
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: guide })
        .eq('id', campaign.id)

      if (updateError) {
        throw new Error(updateError.message || 'Failed to save guide')
      }

      alert('올리브영 세일 통합 가이드가 성공적으로 생성되었습니다!')
      
      // 캐페인 데이터 새로고침
      await fetchCampaignDetail()
    } catch (error) {
      console.error('Error in handleGenerateOliveYoungGuide:', error)
      alert('가이드 생성에 실패했습니다: ' + error.message)
    }
  }

  // 올영 세일 가이드 전체 전달 함수
  const handleDeliverGuideToAll = async () => {
    if (!campaign.ai_generated_guide) {
      alert('먼저 가이드를 생성해주세요.')
      return
    }

    const participantCount = participants.length
    if (participantCount === 0) {
      alert('참여 크리에이터가 없습니다.')
      return
    }

    if (!confirm(`모든 참여 크리에이터(${participantCount}명)에게 가이드를 전달하시겠습니까?`)) {
      return
    }

    try {
      let successCount = 0
      let errorCount = 0

      for (const participant of participants) {
        try {
          // 가이드 승인 및 전달
          const { error: updateError } = await supabase
            .from('applications')
            .update({ 
              personalized_guide: JSON.stringify(campaign.ai_generated_guide),
              guide_confirmed: true
            })
            .eq('id', participant.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          // 크리에이터에게 알림 발송
          await sendGuideDeliveredNotification(
            participant.user_id,
            campaign.id,
            campaign.title,
            region
          )

          successCount++
        } catch (error) {
          console.error(`Error delivering guide to ${(participant.creator_name || participant.applicant_name || '크리에이터')}:`, error)
          errorCount++
        }
      }

      if (errorCount === 0) {
        alert(`${successCount}명의 크리에이터에게 가이드가 성공적으로 전달되었습니다!`)
      } else {
        alert(`${successCount}명 성공, ${errorCount}명 실패했습니다.`)
      }

      // 데이터 새로고침
      await fetchParticipants()
    } catch (error) {
      console.error('Error in handleDeliverGuideToAll:', error)
      alert('가이드 전달에 실패했습니다: ' + error.message)
    }
  }

  // AI 맞춤 가이드 생성 함수
  const handleGeneratePersonalizedGuides = async (selectedParticipantsList) => {
    if (!selectedParticipantsList || selectedParticipantsList.length === 0) {
      alert('가이드를 생성할 크리에이터를 선택해주세요.')
      return
    }

    if (!confirm(`${selectedParticipantsList.length}명의 크리에이터에 대한 개별 맞춤 가이드를 생성하시겠습니까?`)) {
      return
    }

    try {
      let successCount = 0
      let errorCount = 0

      for (const participant of selectedParticipantsList) {
        try {
          // 크리에이터 프로필 정보 가져오기
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', participant.user_id)
            .maybeSingle()

          // AI 가이드 생성 요청
          const response = await fetch('/.netlify/functions/generate-personalized-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creatorAnalysis: {
                platform: participant.main_channel || participant.platform || 'instagram',
                followers: profile?.instagram_followers || profile?.followers_count || 0,
                skinType: profile?.skin_type || null,
                contentAnalysis: {
                  engagementRate: profile?.engagement_rate || 5,
                  topHashtags: [],
                  contentType: 'mixed',
                  videoRatio: 50
                },
                style: {
                  tone: profile?.content_style || '친근하고 자연스러운',
                  topics: [profile?.bio || '라이프스타일', '뷰티'],
                  videoStyle: 'natural'
                }
              },
              productInfo: {
                brand: campaign.brand || '',
                product_name: campaign.title || '',
                product_features: campaign.product_features || campaign.description || '',
                product_key_points: campaign.product_key_points || campaign.key_message || ''
              },
              baseGuide: campaign.guide_content || campaign.ai_generated_guide || ''
            })
          })

          if (!response.ok) {
            throw new Error('AI 가이드 생성 실패')
          }

          const { guide } = await response.json()

          // 생성된 가이드를 applications 테이블에 저장
          const { error: updateError } = await supabase
            .from('applications')
            .update({ 
              personalized_guide: guide
            })
            .eq('id', participant.id)

          if (updateError) {
            throw new Error(updateError.message || 'Failed to save guide')
          }

          successCount++
        } catch (error) {
          console.error(`Error generating guide for ${(participant.creator_name || participant.applicant_name || '크리에이터')}:`, error)
          errorCount++
        }
      }

      if (errorCount === 0) {
        alert(`${successCount}명의 개별 가이드가 성공적으로 생성되었습니다!`)
      } else {
        alert(`${successCount}명 성공, ${errorCount}명 실패했습니다.`)
      }

      // 데이터 새로고침
      await fetchParticipants()
    } catch (error) {
      console.error('Error in handleGeneratePersonalizedGuides:', error)
      alert('가이드 생성에 실패했습니다: ' + error.message)
    }
  }

  // 가이드 전달 및 알림 발송 함수
  const handleGuideApproval = async (participantIds) => {
    if (!participantIds || participantIds.length === 0) {
      alert('승인할 크리에이터를 선택해주세요.')
      return
    }

    if (!confirm(`${participantIds.length}명의 크리에이터에게 가이드를 전달하시겠습니까?`)) {
      return
    }

    try {
      let successCount = 0
      let errorCount = 0

      for (const participantId of participantIds) {
        try {
          // 참여자 정보 가져오기
          const participant = participants.find(p => p.id === participantId)
          if (!participant) {
            console.error(`Participant ${participantId} not found`)
            errorCount++
            continue
          }

          // 이미 승인된 경우 건너뛰기
          if (participant.guide_confirmed) {
            console.log(`Participant ${(participant.creator_name || participant.applicant_name || '크리에이터')} already approved`)
            continue
          }

          // 이미 영상 제출 이후 단계인 경우 건너뛰기
          if (['video_submitted', 'revision_requested', 'approved', 'completed'].includes(participant.status)) {
            console.log(`Participant ${(participant.creator_name || participant.applicant_name || '크리에이터')} already in ${participant.status} status, skipping guide delivery`)
            errorCount++
            continue
          }

          // 가이드 전달 상태 업데이트 및 촬영중으로 변경
          console.log('[DEBUG] Updating application status to filming:', participantId)
          const { data: updateData, error: updateError } = await supabase
            .from('applications')
            .update({ 
              guide_confirmed: true,
              guide_sent: true,
              guide_sent_at: new Date().toISOString(),
              status: 'filming'
            })
            .eq('id', participantId)
            .select()
          
          if (updateError) {
            console.error('[ERROR] Failed to update application status:', updateError)
            throw updateError
          }
          console.log('[DEBUG] Successfully updated application status:', updateData)

          // user_id와 phone 정보 가져오기
          const { data: app } = await supabase
            .from('applications')
            .select('user_id, applicant_name')
            .eq('campaign_id', id)
            .eq('applicant_name', (participant.creator_name || participant.applicant_name || '크리에이터'))
            .maybeSingle()

          if (app?.user_id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('phone')
              .eq('id', app.user_id)
              .maybeSingle()

            // 팝빌 알림톡 발송
            if (profile?.phone) {
              try {
                await fetch('/.netlify/functions/send-kakao-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    receiverNum: profile.phone,
                    receiverName: (participant.creator_name || participant.applicant_name || '크리에이터'),
                    templateCode: '025100001012',
                    variables: {
                      '크리에이터명': (participant.creator_name || participant.applicant_name || '크리에이터'),
                      '캠페인명': campaign.title,
                      '제출기한': campaign.content_submission_deadline || '미정'
                    }
                  })
                })
              } catch (alimtalkError) {
                console.error('Alimtalk error:', alimtalkError)
              }
            }

            // 이메일 발송
            try {
              await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: participant.creator_email,
                  subject: '[CNEC] 선정되신 캠페인 가이드 전달',
                  html: `
                    <h2>${(participant.creator_name || participant.applicant_name || '크리에이터')}님, 선정되신 캠페인의 촬영 가이드가 전달되었습니다.</h2>
                    <p><strong>캠페인:</strong> ${campaign.title}</p>
                    <p><strong>영상 제출 기한:</strong> ${campaign.content_submission_deadline || '미정'}</p>
                    <p>크리에이터 대시보드에서 가이드를 확인하시고, 가이드에 따라 촬영을 진행해 주세요.</p>
                    <p>기한 내 미제출 시 패널티가 부과될 수 있습니다.</p>
                    <p>문의: 1833-6025</p>
                  `
                })
              })
            } catch (emailError) {
              console.error('Email error:', emailError)
            }
          }

          successCount++
        } catch (error) {
          console.error(`Error approving guide for participant ${participantId}:`, error)
          errorCount++
        }
      }

      // 참여자 목록 새로고침
      await fetchParticipants()

      if (errorCount === 0) {
        alert(`${successCount}명의 크리에이터에게 가이드가 전달되었습니다.`)
      } else {
        alert(`${successCount}명 승인 완료, ${errorCount}명 실패했습니다.`)
      }
    } catch (error) {
      console.error('Error in bulk guide approval:', error)
      alert('가이드 전달에 실패했습니다.')
    }
  }
  
  // 영상 검수 완료 및 포인트 지급
  const handleVideoApproval = async (submission) => {
    try {
      // 1. video_submissions 상태 업데이트
      const { error: videoError } = await supabase
        .from('video_submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submission.id)

      if (videoError) throw videoError

      // 2. applications 상태 업데이트
      const { error: appError } = await supabase
        .from('applications')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', submission.application_id)

      if (appError) throw appError

      // 3. 포인트 지급
      const pointAmount = campaign.point || 0
      if (pointAmount > 0 && submission.applications?.user_id) {
        // user_profiles의 point 업데이트
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('point')
          .eq('id', submission.applications.user_id)
          .single()

        if (!profileError && profile) {
          const newPoint = (profile.point || 0) + pointAmount
          await supabase
            .from('user_profiles')
            .update({ point: newPoint })
            .eq('id', submission.applications.user_id)

          // point_history 기록
          await supabase
            .from('point_history')
            .insert([{
              user_id: submission.applications.user_id,
              campaign_id: campaign.id,
              amount: pointAmount,
              type: 'earn',
              description: `캠페인 영상 승인: ${campaign.title}`,
              created_at: new Date().toISOString()
            }])
        }
      }

      // 4. 데이터 새로고침
      await fetchVideoSubmissions()
      await fetchParticipants()

      alert(`영상이 승인되었습니다. ${pointAmount > 0 ? `${pointAmount.toLocaleString()}포인트가 지급되었습니다.` : ''}`)
    } catch (error) {
      console.error('Error approving video:', error)
      alert('영상 승인에 실패했습니다: ' + error.message)
    }
  }
  
  // 크리에이터별 맞춤 가이드 생성성
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
          .from('applications')
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
          .from('applications')
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
      if (campaign.campaign_type === 'planned') {
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
                {filteredParticipants.filter(p => ['selected', 'guide_confirmation'].includes(p.status)).length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">촬영중:</span>
              <Badge className="bg-yellow-100 text-yellow-700">
                {filteredParticipants.filter(p => p.status === 'filming').length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">수정중:</span>
              <Badge className="bg-pink-100 text-pink-700">
                {filteredParticipants.filter(p => p.status === 'revision_requested').length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">제출완료:</span>
              <Badge className="bg-blue-100 text-blue-700">
                {filteredParticipants.filter(p => p.status === 'video_submitted').length}명
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">승인완료:</span>
              <Badge className="bg-green-100 text-green-700">
                {filteredParticipants.filter(p => ['approved', 'completed'].includes(p.status)).length}명
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">플랫폼</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">배송정보</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">택배사 / 송장번호</th>
                {campaign.campaign_type === 'planned' && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">맞춤 가이드</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">가이드 전달</th>
                  </>
                )}
                {campaign.campaign_type === '4week_challenge' && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">개별 메시지</th>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">진행 상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">마감일</th>
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
                  <td className="px-4 py-3">{participant.creator_name || participant.applicant_name || '크리에이터'}</td>
                  <td className="px-4 py-3">{participant.creator_platform || participant.main_channel || participant.platform || '-'}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedParticipant(participant)
                        setShowShippingModal(true)
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      보기
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <select
                        value={trackingChanges[participant.id]?.shipping_company ?? participant.shipping_company ?? ''}
                        onChange={(e) => handleTrackingNumberChange(participant.id, 'shipping_company', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">택배사 선택</option>
                        <option value="우체국">우체국</option>
                        <option value="CJ대한통운">CJ대한통운</option>
                        <option value="로젠택배">로젠택배</option>
                        <option value="한진택배">한진택배</option>
                        <option value="GS포스트박스">GS포스트박스</option>
                      </select>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={trackingChanges[participant.id]?.tracking_number ?? participant.tracking_number ?? ''}
                          onChange={(e) => handleTrackingNumberChange(participant.id, 'tracking_number', e.target.value)}
                          placeholder="송장번호"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {trackingChanges[participant.id] && (
                          <Button
                            onClick={() => saveTrackingNumber(participant.id)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1"
                          >
                            저장
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                  {campaign.campaign_type === 'planned' && (
                    <>
                      <td className="px-4 py-3">
                        {participant.personalized_guide ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedGuide(participant)
                              setShowGuideModal(true)
                            }}
                            className="bg-pink-500 hover:bg-pink-600 text-white"
                          >
                            가이드 보기
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!confirm(`${(participant.creator_name || participant.applicant_name || '크리에이터')}님의 맞춤 가이드를 생성하시겠습니까?`)) return
                              await handleGeneratePersonalizedGuides([participant])
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            📝 AI 가이드 생성
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {participant.personalized_guide ? (
                          !participant.guide_confirmed ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!confirm(`${(participant.creator_name || participant.applicant_name || '크리에이터')}님에게 가이드를 전달하시겠습니까?`)) return
                                await handleGuideApproval([participant.id])
                              }}
                              disabled={['filming', 'video_submitted', 'revision_requested', 'approved', 'completed'].includes(participant.status)}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              가이드 전달
                            </Button>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">전달완료</Badge>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">가이드 생성 후 사용 가능</span>
                        )}
                      </td>
                    </>
                  )}
                  {campaign.campaign_type === '4week_challenge' && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedParticipantForMessage(participant)
                            setIndividualMessage(participant.personalized_guide || '')
                            setShowIndividualMessageModal(true)
                          }}
                          className="text-purple-600 border-purple-600 hover:bg-purple-50"
                        >
                          {participant.personalized_guide ? '최종 가이드 확인' : '개별 메시지 작성'}
                        </Button>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {(() => {
                      const status = participant.status || 'selected'
                      const statusConfig = {
                        selected: { label: '가이드 확인중', className: 'bg-purple-100 text-purple-700' },
                        guide_confirmation: { label: '가이드 확인중', className: 'bg-purple-100 text-purple-700' },
                        filming: { label: '촬영중', className: 'bg-yellow-100 text-yellow-700' },
                        revision_requested: { label: '수정중', className: 'bg-pink-100 text-pink-700' },
                        video_submitted: { label: '제출완료', className: 'bg-blue-100 text-blue-700' },
                        approved: { label: '승인완료', className: 'bg-green-100 text-green-700' },
                        completed: { label: '승인완료', className: 'bg-green-100 text-green-700' },
                        rejected: { label: '거부', className: 'bg-red-100 text-red-700' }
                      }
                      const config = statusConfig[status] || statusConfig.selected
                      return <Badge className={config.className}>{config.label}</Badge>
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {editingDeadline === participant.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          id={`deadline-${participant.id}`}
                          defaultValue={participant.submission_deadline || campaign.content_submission_deadline || ''}
                          className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById(`deadline-${participant.id}`)
                            const newDeadline = input.value
                            if (newDeadline) {
                              try {
                                const { error } = await supabase
                                  .from('applications')
                                  .update({ submission_deadline: newDeadline })
                                  .eq('id', participant.id)
                                
                                if (error) throw error
                                
                                await fetchParticipants()
                                alert('마감일이 업데이트되었습니다.')
                              } catch (error) {
                                console.error('Error updating deadline:', error)
                                alert('마감일 업데이트에 실패했습니다.')
                              }
                            }
                            setEditingDeadline(null)
                          }}
                          className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingDeadline(null)}
                          className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-xs"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">
                          {(() => {
                            // 올리브영 세일: 2개 마감일
                            if (campaign.campaign_type === 'oliveyoung') {
                              return (
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-500">세일 전: {campaign.deadline_presale || '미정'}</div>
                                  <div className="text-xs text-gray-500">세일 당일: {campaign.deadline_saleday || '미정'}</div>
                                </div>
                              )
                            }
                            // 4주 챌린지: 4개 마감일
                            if (campaign.campaign_type === '4week_challenge') {
                              return (
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-500">1주차: {campaign.deadline_week1 || '미정'}</div>
                                  <div className="text-xs text-gray-500">2주차: {campaign.deadline_week2 || '미정'}</div>
                                  <div className="text-xs text-gray-500">3주차: {campaign.deadline_week3 || '미정'}</div>
                                  <div className="text-xs text-gray-500">4주차: {campaign.deadline_week4 || '미정'}</div>
                                </div>
                              )
                            }
                            // 기본: 단일 마감일
                            return participant.submission_deadline || campaign.content_submission_deadline || '미정'
                          })()}
                        </span>
                        {campaign.campaign_type !== 'oliveyoung' && campaign.campaign_type !== '4week_challenge' && (
                          <button
                            onClick={() => setEditingDeadline(participant.id)}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs"
                          >
                            수정
                          </button>
                        )}
                      </div>
                    )}
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
            <div className="flex items-center gap-3 flex-wrap">
              {campaign.campaign_type === 'oliveyoung' && (
                <>
                  <Button
                    onClick={() => {
                      // Load existing guide data if available
                      if (campaign.oliveyoung_step1_guide || campaign.oliveyoung_step2_guide || campaign.oliveyoung_step3_guide) {
                        try {
                          setUnifiedGuideData({
                            step1: campaign.oliveyoung_step1_guide ? JSON.parse(campaign.oliveyoung_step1_guide) : { required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' },
                            step2: campaign.oliveyoung_step2_guide ? JSON.parse(campaign.oliveyoung_step2_guide) : { required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' },
                            step3: campaign.oliveyoung_step3_guide ? JSON.parse(campaign.oliveyoung_step3_guide) : { required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' }
                          })
                        } catch (e) {
                          console.error('Failed to parse existing guide:', e)
                        }
                      }
                      setShowUnifiedGuideModal(true)
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    🤖 AI 최종 가이드 생성하기
                  </Button>
                  <Button
                    onClick={async () => {
                      if (selectedParticipants.length === 0) {
                        alert('크리에이터를 선택해주세요.')
                        return
                      }
                      
                      if (!confirm(`선택한 ${selectedParticipants.length}명의 크리에이터에게 최종 가이드를 발송하시겠습니까?`)) {
                        return
                      }
                      
                      try {
                        let successCount = 0
                        let errorCount = 0
                        
                        for (const participantId of selectedParticipants) {
                          try {
                            const { error } = await supabase
                              .from('applications')
                              .update({
                                guide_confirmed: true,
                                guide_sent: true,
                                guide_sent_at: new Date().toISOString(),
                                status: 'filming'
                              })
                              .eq('id', participantId)
                            
                            if (error) throw error
                            successCount++
                          } catch (error) {
                            console.error(`Error sending guide to ${participantId}:`, error)
                            errorCount++
                          }
                        }
                        
                        alert(`가이드 발송 완료!\n성공: ${successCount}명\n실패: ${errorCount}명`)
                        await fetchParticipants()
                        setSelectedParticipants([])
                      } catch (error) {
                        console.error('Error sending guides:', error)
                        alert('가이드 발송 실패: ' + error.message)
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    최종 가이드 발송
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={exportShippingInfo}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                배송 정보 다운로드
              </Button>
              <Button
                variant="outline"
                onClick={downloadTrackingTemplate}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                송장번호 템플릿 다운로드
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('tracking-upload').click()}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                송장번호 업로드
              </Button>
              <input
                id="tracking-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    uploadTrackingNumbers(e.target.files[0])
                    e.target.value = ''
                  }
                }}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <select
                  value={bulkCourierCompany}
                  onChange={(e) => setBulkCourierCompany(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">택배사 선택</option>
                  <option value="우체국">우체국</option>
                  <option value="CJ대한통운">CJ대한통운</option>
                  <option value="로젠택배">로젠택배</option>
                  <option value="한진택배">한진택배</option>
                  <option value="GS포스트박스">GS포스트박스</option>
                </select>
                <Button
                  variant="outline"
                  onClick={bulkUpdateCourier}
                  disabled={selectedParticipants.length === 0 || !bulkCourierCompany}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  택배사 일괄 수정 ({selectedParticipants.length}명)
                </Button>
              </div>
                  {campaign.campaign_type === 'planned' && (
                <>
                  <Button
                    onClick={() => handleGeneratePersonalizedGuides(filteredParticipants)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    🚀 전체 AI 가이드 생성 ({filteredParticipants.length}명)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRegenerateModal(true)}
                    disabled={selectedParticipants.length === 0}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    🔄 AI에게 가이드 재생성 요청 ({selectedParticipants.length}명)
                  </Button>
                </>
              )}
              {campaign.campaign_type === 'oliveyoung_sale' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleGenerateOliveYoungGuide}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    올영 세일 통합 가이드 생성
                  </Button>
                  {campaign.ai_generated_guide && (
                    <Button
                      variant="outline"
                      onClick={handleDeliverGuideToAll}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      전체 전달하기 ({filteredParticipants.length}명)
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="outline"
                onClick={() => handleGuideApproval(selectedParticipants)}
                disabled={selectedParticipants.length === 0}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                선택한 크리에이터 가이드 전달 ({selectedParticipants.length}명)
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
            </div>
          </div>
        )}
      </>
    )
  }

  const handleUpdateCreatorStatus = async (participantId, newStatus) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', participantId)

      if (error) throw error

      // 참여자 목록 재로드
      const { data, error: fetchError } = await supabase
        .from('applications')
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

  // 포인트 결제 로직 제거됨 - 이제 캐페인별 직접 입금 방식으로 변경

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
            {/* 결제 요청 버튼: draft 또는 pending_payment 상태에서만 표시 */}
            {(campaign.approval_status === 'draft' || campaign.approval_status === 'pending_payment') && !campaign.is_cancelled && (
              <Button onClick={() => {
                // 캠페인 타입에 따라 Invoice 페이지로 이동
                if (campaign.campaign_type === 'oliveyoung') {
                  navigate(`/company/campaigns/${id}/invoice/oliveyoung`)
                } else if (campaign.campaign_type === '4week' || campaign.campaign_type === '4week_challenge') {
                  navigate(`/company/campaigns/${id}/invoice/4week`)
                } else {
                  navigate(`/company/campaigns/${id}/invoice`)
                }
              }} className="bg-blue-600">
                <Send className="w-4 h-4 mr-2" />
                결제 요청 하기
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
                {(() => {
                  // 승인 완료된 참여자가 있는지 확인
                  const hasApprovedParticipants = participants.some(p => ['approved', 'completed'].includes(p.status))
                  
                  if (hasApprovedParticipants) {
                    return (
                      <Badge className="bg-gray-100 text-gray-600">
                        승인 완료된 크리에이터가 있어 취소할 수 없습니다
                      </Badge>
                    )
                  }
                  
                  if (isAdmin) {
                    return (
                      <Button 
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={handleCancelCampaign}
                      >
                        캠페인 취소하기
                      </Button>
                    )
                  }
                  
                  return (
                    <Badge className="bg-gray-100 text-gray-600">
                      {campaign.approval_status === 'approved' 
                        ? '승인 완료된 캠페인은 취소할 수 없습니다'
                        : '입금 완료 후 취소는 관리자에게 문의하세요'
                      }
                    </Badge>
                  )
                })()}
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
                    {campaign.package_type === 'junior' && '초급'}
                    {campaign.package_type === 'intermediate' && '스탠다드'}
                    {campaign.package_type === 'senior' && '프리미엄'}
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
              크리에이터 관리 ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="virtual" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              가상 선정 ({applications.filter(app => app.virtual_selected).length}명)
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              참여 크리에이터 ({participants.length})
            </TabsTrigger>
            <TabsTrigger value="editing" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              영상 확인
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              완료
            </TabsTrigger>

          </TabsList>

          {/* 크리에이터 관리 탭 (추천 + 지원 통합) */}
          <TabsContent value="applications">
            {/* AI 추천 크리에이터 섹션 */}
            {aiRecommendations.length > 0 && (
              <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-blue-600">✨</span>
                        AI 추천 크리에이터
                        <Badge className="bg-blue-600 text-white">{aiRecommendations.length}명</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        캠페인 특성을 분석하여 AI가 추천하는 최적의 크리에이터
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {aiRecommendations.map((rec, index) => (
                      <div key={rec.id || index} className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow border border-blue-200">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-2">
                            <img 
                              src={rec.profile_photo_url || '/default-avatar.png'} 
                              alt={rec.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                              {rec.recommendation_score}
                            </div>
                          </div>
                          <h4 className="font-semibold text-xs mb-0.5 truncate w-full">{rec.name}</h4>
                          <p className="text-[10px] text-gray-500 mb-1 truncate w-full">{rec.main_channel || '플랫폼 정보 없음'}</p>
                          <div className="flex flex-col gap-1 w-full">
                            <Button 
                              size="sm" 
                              className="w-full text-[10px] h-7 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={async () => {
                                try {
                                  const { data: { user } } = await supabaseBiz.auth.getUser()
                                  if (!user) {
                                    alert('로그인이 필요합니다.')
                                    return
                                  }

                                  if (!confirm(`${rec.name}님에게 캠페인 지원 요청을 보내시겠습니까?`)) {
                                    return
                                  }

                                  const response = await fetch('/.netlify/functions/send-campaign-invitation', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      campaignId: id,
                                      creatorId: rec.id,
                                      invitedBy: user.id
                                    })
                                  })

                                  const result = await response.json()
                                  
                                  if (result.success) {
                                    alert('캠페인 지원 요청을 성공적으로 보냈습니다!')
                                  } else {
                                    alert(result.error || '지원 요청에 실패했습니다.')
                                  }
                                } catch (error) {
                                  console.error('Error sending invitation:', error)
                                  alert('지원 요청 중 오류가 발생했습니다.')
                                }
                              }}
                            >
                              지원 요청
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full text-[10px] h-6"
                              onClick={() => {
                                // SNS 채널 보기
                                const urls = []
                                if (rec.instagram_url) urls.push(rec.instagram_url)
                                if (rec.youtube_url) urls.push(rec.youtube_url)
                                if (rec.tiktok_url) urls.push(rec.tiktok_url)
                                
                                if (urls.length > 0) {
                                  window.open(urls[0], '_blank')
                                } else {
                                  alert('SNS 채널 정보가 없습니다.')
                                }
                              }}
                            >
                              SNS
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="w-full text-[10px] h-6"
                              onClick={() => {
                                // 모달로 상세 프로필 보기
                                setSelectedParticipant(rec)
                                setShowProfileModal(true)
                              }}
                            >
                              상세
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 지원한 크리에이터 섹션 */}
            <Card>
              <CardHeader>
                <CardTitle>지원한 크리에이터 ({applications.length}명)</CardTitle>
                <p className="text-sm text-gray-600">캠페인에 직접 지원한 신청자들입니다.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {applications.map(app => {
                    // 이미 participants에 있는지 확인
                    const isAlreadyParticipant = participants.some(p => 
                      (p.creator_name || p.applicant_name) === app.applicant_name
                    )
                    
                    return (
                      <CreatorCard
                        key={app.id}
                        application={app}
                        onVirtualSelect={handleVirtualSelect}
                        isConfirmed={app.status === 'selected'}
                        isAlreadyParticipant={isAlreadyParticipant}
                        onCancel={(app) => {
                          setCancellingApp(app)
                          setCancelModalOpen(true)
                        }}
                      onConfirm={async (app, mainChannel) => {
                        // 개별 확정
                        if (!confirm(`${app.applicant_name}님을 확정하시겠습니까?`)) return
                        
                        try {
                          // 모집인원 제한 체크
                          const currentParticipantsCount = participants.length
                          const totalSlots = campaign.total_slots || 0
                          const availableSlots = totalSlots - currentParticipantsCount
                          
                          if (availableSlots <= 0) {
                            alert(`모집인원(${totalSlots}명)이 이미 충족되었습니다.\n현재 참여 크리에이터: ${currentParticipantsCount}명`)
                            return
                          }
                          
                          // 중복 확인
                          const { data: existing } = await supabase
                            .from('applications')
                            .select('id')
                            .eq('campaign_id', id)
                            .eq('creator_name', app.applicant_name)
                            .maybeSingle()
                          
                          if (existing) {
                            alert(`${app.applicant_name}님은 이미 확정되었습니다.`)
                            return
                          }
                          
                          // 플랫폼 추출
                          let platform = '-'
                          const channelToCheck = mainChannel || app.main_channel || ''
                          if (channelToCheck.includes('YouTube') || channelToCheck.includes('유튜브')) {
                            platform = 'YouTube'
                          } else if (channelToCheck.includes('Instagram') || channelToCheck.includes('인스타그램')) {
                            platform = 'Instagram'
                          } else if (channelToCheck.includes('TikTok') || channelToCheck.includes('틱톡')) {
                            platform = 'TikTok'
                          }
                          
                          // 기존 application 업데이트 (새로 삽입하지 않음)
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
                          // 알림톡 발송
                          try {
                            const { data: profile } = await supabase
                              .from('user_profiles')
                              .select('email, phone')
                              .eq('id', app.user_id)
                              .maybeSingle()

                            if (profile && profile.phone) {
                              await sendCampaignSelectedNotification(
                                profile.phone,
                                app.applicant_name,
                                {
                                  campaignName: campaign?.title || '캐페인'
                                }
                              )
                              console.log('Alimtalk sent successfully')
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
                    )
                  })}
                </div>
                {applications.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    아직 지원자가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 크넥 플러스 AI 추천 크리에이터 섹션 */}
            {cnecPlusRecommendations.length > 0 && (
              <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-purple-600">🌟</span>
                        크넥 플러스 AI 추천
                        <Badge className="bg-purple-600 text-white">{cnecPlusRecommendations.length}명</Badge>
                        <Badge className="bg-orange-500 text-white">추가금 필요</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        캠페인에 최적화된 프리미엄 크리에이터 (추가 비용이 발생합니다)
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {cnecPlusRecommendations.map((rec, index) => (
                      <div key={rec.id || index} className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border-2 border-purple-200">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-2">
                            <img 
                              src={rec.profile_photo_url || '/default-avatar.png'} 
                              alt={rec.name}
                              className="w-20 h-20 rounded-full object-cover"
                            />
                            <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                              ⭐
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm mb-1 truncate w-full">{rec.name}</h4>
                          <div className="text-xs text-gray-500 mb-2">
                            {rec.instagram_followers > 0 && (
                              <div>📷 {rec.instagram_followers.toLocaleString()}</div>
                            )}
                            {rec.youtube_subscribers > 0 && (
                              <div>🎥 {rec.youtube_subscribers.toLocaleString()}</div>
                            )}
                            {rec.tiktok_followers > 0 && (
                              <div>🎵 {rec.tiktok_followers.toLocaleString()}</div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            <Button 
                              size="sm" 
                              className="w-full text-xs bg-purple-600 hover:bg-purple-700"
                              onClick={async () => {
                                try {
                                  const { data: { user } } = await supabaseBiz.auth.getUser()
                                  if (!user) {
                                    alert('로그인이 필요합니다.')
                                    return
                                  }

                                  if (!confirm(`${rec.name}님에게 캠페인 지원 요청을 보내시겠습니까? (크넥 플러스 크리에이터는 추가 비용이 발생할 수 있습니다)`)) {
                                    return
                                  }

                                  const response = await fetch('/.netlify/functions/send-campaign-invitation', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      campaignId: id,
                                      creatorId: rec.id,
                                      invitedBy: user.id
                                    })
                                  })

                                  const result = await response.json()
                                  
                                  if (result.success) {
                                    alert('캠페인 지원 요청을 성공적으로 보냈습니다!')
                                  } else {
                                    alert(result.error || '지원 요청에 실패했습니다.')
                                  }
                                } catch (error) {
                                  console.error('Error sending invitation:', error)
                                  alert('지원 요청 중 오류가 발생했습니다.')
                                }
                              }}
                            >
                              캠페인 지원 요청하기
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => {
                                const urls = []
                                if (rec.instagram_url) urls.push(rec.instagram_url)
                                if (rec.youtube_url) urls.push(rec.youtube_url)
                                if (rec.tiktok_url) urls.push(rec.tiktok_url)
                                
                                if (urls.length > 0) {
                                  window.open(urls[0], '_blank')
                                } else {
                                  alert('SNS 채널 정보가 없습니다.')
                                }
                              }}
                            >
                              SNS 보기
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="w-full text-xs"
                              onClick={() => {
                                setSelectedParticipant(rec)
                                setShowVideoModal(true)
                              }}
                            >
                              상세보기
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 가상 선정 탭 */}
          <TabsContent value="virtual">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>가상 선정한 크리에이터</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    임시로 기업이 선정한 크리에이터 입니다. 확정 선정이 아니니 자유롭게 최종 선정하여 확정하여 주세요.
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
                  {applications.filter(app => app.virtual_selected).map(app => {
                    // 이미 participants에 있는지 확인
                    const isAlreadyParticipant = participants.some(p => 
                      (p.creator_name || p.applicant_name) === app.applicant_name
                    )
                    
                    return (
                      <CreatorCard
                        key={app.id}
                        application={app}
                        onVirtualSelect={handleVirtualSelect}
                        isConfirmed={app.status === 'selected'}
                        isAlreadyParticipant={isAlreadyParticipant}
                        onCancel={(app) => {
                          setCancellingApp(app)
                          setCancelModalOpen(true)
                        }}
                      onConfirm={async (app, mainChannel) => {
                        // 개별 확정
                        if (!confirm(`${app.applicant_name}님을 확정하시겠습니까?`)) return
                        
                        try {
                          // 모집인원 제한 체크
                          const currentParticipantsCount = participants.length
                          const totalSlots = campaign.total_slots || 0
                          const availableSlots = totalSlots - currentParticipantsCount
                          
                          if (availableSlots <= 0) {
                            alert(`모집인원(${totalSlots}명)이 이미 충족되었습니다.\n현재 참여 크리에이터: ${currentParticipantsCount}명`)
                            return
                          }
                          
                          // 중복 확인
                          const { data: existing } = await supabase
                            .from('applications')
                            .select('id')
                            .eq('campaign_id', id)
                            .eq('creator_name', app.applicant_name)
                            .maybeSingle()
                          
                          if (existing) {
                            alert(`${app.applicant_name}님은 이미 확정되었습니다.`)
                            return
                          }
                          
                          // 플랫폼 추출
                          let platform = '-'
                          const channelToCheck = mainChannel || app.main_channel || ''
                          if (channelToCheck.includes('YouTube') || channelToCheck.includes('유튜브')) {
                            platform = 'YouTube'
                          } else if (channelToCheck.includes('Instagram') || channelToCheck.includes('인스타그램')) {
                            platform = 'Instagram'
                          } else if (channelToCheck.includes('TikTok') || channelToCheck.includes('틱톡')) {
                            platform = 'TikTok'
                          }
                          
                          // 기존 application 업데이트 (새로 삽입하지 않음)
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

                            if (profile && profile.phone) {
                              // 카카오 알림톡
                              if (profile.phone) {
                                await sendCampaignSelectedNotification(
                                  profile.phone,
                                  app.applicant_name,
                                  {
                                    campaignName: campaign?.title || '캠페인'
                                  }
                                )
                                console.log('Alimtalk sent successfully')
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
                    )
                  })}
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
                      유튜브 ({participants.filter(p => {
                        const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                        return platform.includes('youtube') || platform.includes('유튜브')
                      }).length})
                    </TabsTrigger>
                    <TabsTrigger value="instagram">
                      인스타 ({participants.filter(p => {
                        const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                        return platform.includes('instagram') || platform.includes('인스타그램')
                      }).length})
                    </TabsTrigger>
                    <TabsTrigger value="tiktok">
                      틱톡 ({participants.filter(p => {
                        const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                        return platform.includes('tiktok') || platform.includes('틱톡')
                      }).length})
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* 전체 */}
                  <TabsContent value="all">
                    {renderParticipantsTable(participants)}
                  </TabsContent>
                  
                  {/* 유튜브 */}
                  <TabsContent value="youtube">
                    {renderParticipantsTable(participants.filter(p => {
                      const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                      return platform.includes('youtube') || platform.includes('유튜브')
                    }))}
                  </TabsContent>
                  
                  {/* 인스타 */}
                  <TabsContent value="instagram">
                    {renderParticipantsTable(participants.filter(p => {
                      const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                      return platform.includes('instagram') || platform.includes('인스타그램')
                    }))}
                  </TabsContent>
                  
                  {/* 틱톡 */}
                  <TabsContent value="tiktok">
                    {renderParticipantsTable(participants.filter(p => {
                      const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                      return platform.includes('tiktok') || platform.includes('틱톡')
                    }))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 영상 확인 탭 */}
          <TabsContent value="editing">
            <Card>
              <CardHeader>
                <CardTitle>영상 제출 및 검토</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 6개월 보관 정책 안내 */}
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-bold text-yellow-800 text-lg mb-2">⚠️ 영상 보관 정책 안내</h4>
                      <div className="text-yellow-700 space-y-1">
                        <p className="font-semibold">• 제출된 영상은 <span className="text-red-600 font-bold">검수 완료 후 6개월간 보관</span>됩니다.</p>
                        <p className="font-semibold">• 6개월 후 자동으로 삭제되며, <span className="text-red-600 font-bold">복구가 불가능</span>합니다.</p>
                        <p className="font-semibold">• 필요한 경우 <span className="text-blue-600 font-bold">삭제 전에 반드시 다운로드</span>해주세요.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  // Group video submissions by user_id
                  const filteredSubmissions = videoSubmissions.filter(v => ['submitted', 'video_submitted', 'revision_requested'].includes(v.status))
                  const groupedByUser = filteredSubmissions.reduce((acc, submission) => {
                    if (!acc[submission.user_id]) {
                      acc[submission.user_id] = []
                    }
                    acc[submission.user_id].push(submission)
                    return acc
                  }, {})
                  
                  // Sort each group by submitted_at (oldest first)
                  Object.keys(groupedByUser).forEach(userId => {
                    groupedByUser[userId].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
                  })
                  
                  if (Object.keys(groupedByUser).length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        제출된 영상이 없습니다.
                      </div>
                    )
                  }
                  
                  return (
                    <div className="space-y-6">
                      {Object.entries(groupedByUser).map(([userId, submissions]) => {
                        const selectedVersion = selectedVideoVersions[userId] || 0
                        const submission = submissions[selectedVersion]
                        return (
                      <div key={submission.id} className="border rounded-lg p-6 bg-white shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* 왼쪽: 영상 플레이어 */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-lg">{participants.find(p => p.user_id === submission.user_id)?.applicant_name || '크리에이터'}</h4>
                              {submissions.length > 1 && (
                                <div className="flex gap-2">
                                  {submissions.map((_, index) => (
                                    <button
                                      key={index}
                                      onClick={() => setSelectedVideoVersions(prev => ({ ...prev, [userId]: index }))}
                                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                        selectedVersion === index
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      v{index + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {submission.video_file_url && (
                              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                <video 
                                  key={`${userId}-${selectedVersion}-${submission.id}`}
                                  controls 
                                  preload="metadata"
                                  className="w-full h-full"
                                  src={signedVideoUrls[submission.id] || submission.video_file_url}
                                >
                                  브라우저가 비디오를 지원하지 않습니다.
                                </video>
                              </div>
                            )}
                            
                            <div className="mt-4 space-y-2">
                              {submission.sns_title && (
                                <div>
                                  <p className="text-xs text-gray-500">SNS 업로드 제목</p>
                                  <p className="text-sm font-medium">{submission.sns_title}</p>
                                </div>
                              )}
                              {submission.sns_content && (
                                <div>
                                  <p className="text-xs text-gray-500">SNS 업로드 내용</p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.sns_content}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* 오른쪽: 정보 및 버튼 */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              {submission.status === 'submitted' ? (
                                <Badge className="bg-blue-100 text-blue-700">검토 대기</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700">수정 요청됨</Badge>
                              )}
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-gray-500">제출일</p>
                                <p className="font-medium">{new Date(submission.submitted_at).toLocaleString('ko-KR')}</p>
                              </div>
                              
                              {submission.approved_at && (
                                <div className="bg-red-50 border border-red-200 rounded p-3">
                                  <p className="text-red-600 font-semibold text-xs mb-1">⚠️ 삭제 예정일</p>
                                  <p className="text-red-700 font-bold">
                                    {new Date(new Date(submission.approved_at).getTime() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')}
                                  </p>
                                  <p className="text-xs text-red-600 mt-1">검수 완료 후 6개월 후 자동 삭제</p>
                                </div>
                              )}
                              
                              {submission.sns_upload_url && (
                                <div>
                                  <p className="text-gray-500">SNS 업로드 URL</p>
                                  <a 
                                    href={submission.sns_upload_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                  >
                                    {submission.sns_upload_url}
                                  </a>
                                </div>
                              )}
                              
                              {submission.partnership_code && (
                                <div>
                                  <p className="text-gray-500">파트너십 광고 코드</p>
                                  <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{submission.partnership_code}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = submission.video_file_url
                                  link.download = `${submission.applications?.creator_name || 'video'}_${new Date(submission.submitted_at).toISOString().split('T')[0]}.mp4`
                                  link.target = '_blank'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                영상 다운로드
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  navigate(`/video-review/${submission.id}`)
                                }}
                              >
                                영상 수정 요청하기
                              </Button>
                              <Button
                                size="sm"
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={async () => {
                                  if (!confirm('이 영상을 검수 완료하시겠습니까? 포인트가 지급됩니다.')) return
                                  await handleVideoApproval(submission)
                                }}
                              >
                                검수 완료
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                        )
                      })}
                    </div>
                  )
                })()}
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
                    {participants.filter(p => ['approved', 'completed'].includes(p.status)).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    아직 완료된 크리에이터가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participants.filter(p => ['approved', 'completed'].includes(p.status)).map(participant => (
                      <div key={participant.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{(participant.creator_name || participant.applicant_name || '크리에이터')}</h4>
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
                            <td className="px-4 py-3">{(participant.creator_name || participant.applicant_name || '크리에이터')}</td>
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
                  {campaign.campaign_type === '4week_challenge' ? (
                    <>
                      {campaign.week1_deadline && `1주차: ${new Date(campaign.week1_deadline).toLocaleDateString()}`}
                      {campaign.week2_deadline && ` / 2주차: ${new Date(campaign.week2_deadline).toLocaleDateString()}`}
                      {campaign.week3_deadline && ` / 3주차: ${new Date(campaign.week3_deadline).toLocaleDateString()}`}
                      {campaign.week4_deadline && ` / 4주차: ${new Date(campaign.week4_deadline).toLocaleDateString()}`}
                    </>
                  ) : campaign.campaign_type === 'oliveyoung' ? (
                    <>
                      {campaign.step1_deadline && `1차: ${new Date(campaign.step1_deadline).toLocaleDateString()}`}
                      {campaign.step2_deadline && ` / 2차: ${new Date(campaign.step2_deadline).toLocaleDateString()}`}
                      {campaign.step3_deadline && ` / 3차: ${new Date(campaign.step3_deadline).toLocaleDateString()}`}
                    </>
                  ) : (
                    `${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`
                  )}
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
                  맞춤 촬영 가이드
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

              {/* 맞춤 가이드 컸텐츠 */}
              <div className="prose max-w-none">
                {editingGuide ? (
                  <div className="space-y-4">
                    {/* JSON을 파싱하여 구조화된 폼으로 표시 */}
                    {(() => {
                      try {
                        const guideData = typeof editedGuideContent === 'string' 
                          ? JSON.parse(editedGuideContent) 
                          : editedGuideContent;
                        
                        return (
                          <div className="space-y-6">
                            {/* 기본 정보 */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold mb-3">기본 정보</h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 타이틀</label>
                                  <input
                                    type="text"
                                    value={guideData.campaign_title || ''}
                                    onChange={(e) => {
                                      const updated = { ...guideData, campaign_title: e.target.value };
                                      setEditedGuideContent(JSON.stringify(updated, null, 2));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">플랫폼</label>
                                    <select
                                      value={guideData.target_platform || 'youtube'}
                                      onChange={(e) => {
                                        const updated = { ...guideData, target_platform: e.target.value };
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                      <option value="youtube">YouTube</option>
                                      <option value="instagram">Instagram</option>
                                      <option value="tiktok">TikTok</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">영상 길이</label>
                                    <input
                                      type="text"
                                      value={guideData.video_duration || ''}
                                      onChange={(e) => {
                                        const updated = { ...guideData, video_duration: e.target.value };
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="예: 50-60초"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 필수 해시태그 */}
                            {guideData.required_hashtags && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-3">필수 해시태그</h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">리얼 후기</label>
                                    <input
                                      type="text"
                                      value={guideData.required_hashtags.real?.join(', ') || ''}
                                      onChange={(e) => {
                                        const updated = { ...guideData };
                                        updated.required_hashtags.real = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="쉼표로 구분"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">제품 관련</label>
                                    <input
                                      type="text"
                                      value={guideData.required_hashtags.product?.join(', ') || ''}
                                      onChange={(e) => {
                                        const updated = { ...guideData };
                                        updated.required_hashtags.product = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="쉼표로 구분"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">공통</label>
                                    <input
                                      type="text"
                                      value={guideData.required_hashtags.common?.join(', ') || ''}
                                      onChange={(e) => {
                                        const updated = { ...guideData };
                                        updated.required_hashtags.common = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      placeholder="쉼표로 구분"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 촬영 요구사항 */}
                            {guideData.shooting_requirements && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-3">촬영 요구사항</h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">필수 포함 장면</label>
                                    <textarea
                                      value={guideData.shooting_requirements.must_include?.join('\n') || ''}
                                      onChange={(e) => {
                                        const updated = { ...guideData };
                                        updated.shooting_requirements.must_include = e.target.value.split('\n').filter(t => t.trim());
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                      rows={3}
                                      placeholder="한 줄에 하나씩"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">영상 스타일 - 템포</label>
                                    <input
                                      type="text"
                                      value={guideData.shooting_requirements.video_style?.tempo || ''}
                                      onChange={(e) => {
                                        const updated = { ...guideData };
                                        if (!updated.shooting_requirements.video_style) updated.shooting_requirements.video_style = {};
                                        updated.shooting_requirements.video_style.tempo = e.target.value;
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">영상 스타일 - 톤</label>
                                    <input
                                      type="text"
                                      value={guideData.shooting_requirements.video_style?.tone || ''}
                                      onChange={(e) => {
                                        const updated = { ...guideData };
                                        if (!updated.shooting_requirements.video_style) updated.shooting_requirements.video_style = {};
                                        updated.shooting_requirements.video_style.tone = e.target.value;
                                        setEditedGuideContent(JSON.stringify(updated, null, 2));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 촬영 씬 */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold mb-3">촬영 씬 ({guideData.shooting_scenes?.length || 0}개)</h4>
                              <div className="space-y-4">
                                {(guideData.shooting_scenes || []).map((scene, idx) => (
                                  <div key={idx} className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm mb-2">씬 {scene.order}</div>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">타입:</span>
                                        <input
                                          type="text"
                                          value={scene.scene_type || ''}
                                          onChange={(e) => {
                                            const updated = { ...guideData };
                                            updated.shooting_scenes[idx].scene_type = e.target.value;
                                            setEditedGuideContent(JSON.stringify(updated, null, 2));
                                          }}
                                          className="ml-2 px-2 py-1 border rounded w-full mt-1"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-gray-600">장면 설명:</span>
                                        <textarea
                                          value={scene.scene_description || ''}
                                          onChange={(e) => {
                                            const updated = { ...guideData };
                                            updated.shooting_scenes[idx].scene_description = e.target.value;
                                            setEditedGuideContent(JSON.stringify(updated, null, 2));
                                          }}
                                          className="ml-2 px-2 py-1 border rounded w-full mt-1"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <span className="text-gray-600">대사:</span>
                                        <textarea
                                          value={scene.dialogue || ''}
                                          onChange={(e) => {
                                            const updated = { ...guideData };
                                            updated.shooting_scenes[idx].dialogue = e.target.value;
                                            setEditedGuideContent(JSON.stringify(updated, null, 2));
                                          }}
                                          className="ml-2 px-2 py-1 border rounded w-full mt-1"
                                          rows={2}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 크리에이터 팁 */}
                            {guideData.creator_tips && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-3">크리에이터 팁</h4>
                                <textarea
                                  value={guideData.creator_tips?.join('\n') || ''}
                                  onChange={(e) => {
                                    const updated = { ...guideData };
                                    updated.creator_tips = e.target.value.split('\n').filter(t => t.trim());
                                    setEditedGuideContent(JSON.stringify(updated, null, 2));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                  rows={5}
                                  placeholder="한 줄에 하나씩"
                                />
                              </div>
                            )}


                          </div>
                        );
                      } catch (error) {
                        // JSON 파싱 실패 시 기본 textarea
                        return (
                          <textarea
                            value={editedGuideContent}
                            onChange={(e) => setEditedGuideContent(e.target.value)}
                            className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                            placeholder="가이드 내용을 입력하세요..."
                          />
                        );
                      }
                    })()}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {(() => {
                      try {
                        const guideData = typeof selectedGuide.personalized_guide === 'string'
                          ? JSON.parse(selectedGuide.personalized_guide)
                          : selectedGuide.personalized_guide;
                        
                        return (
                          <div className="space-y-6">
                            {/* 기본 정보 */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <div className="space-y-1 text-sm">
                                <div><strong>캠페인:</strong> {guideData.campaign_title}</div>
                                <div><strong>플랫폼:</strong> {guideData.target_platform}</div>
                                <div><strong>영상 길이:</strong> {guideData.video_duration}</div>
                              </div>
                            </div>

                            {/* 필수 해시태그 */}
                            {guideData.required_hashtags && (
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-semibold mb-3">필수 해시태그</h4>
                                <div className="space-y-2">
                                  {guideData.required_hashtags.real && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">리얼 후기:</span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {guideData.required_hashtags.real.map((tag, i) => (
                                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">#{tag}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {guideData.required_hashtags.product && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">제품 관련:</span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {guideData.required_hashtags.product.map((tag, i) => (
                                          <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">#{tag}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {guideData.required_hashtags.common && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">공통:</span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {guideData.required_hashtags.common.map((tag, i) => (
                                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">#{tag}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 촬영 요구사항 */}
                            {guideData.shooting_requirements && (
                              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <h4 className="font-semibold mb-3">촬영 요구사항</h4>
                                <div className="space-y-2">
                                  {guideData.shooting_requirements.must_include && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">필수 포함 장면:</span>
                                      <ul className="list-disc list-inside mt-1 space-y-1">
                                        {guideData.shooting_requirements.must_include.map((item, i) => (
                                          <li key={i} className="text-sm text-gray-700">{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {guideData.shooting_requirements.video_style && (
                                    <div className="mt-2">
                                      <span className="text-sm font-medium text-gray-700">영상 스타일:</span>
                                      <div className="text-sm text-gray-700 mt-1">
                                        <div>템포: {guideData.shooting_requirements.video_style.tempo}</div>
                                        <div>톤: {guideData.shooting_requirements.video_style.tone}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 촬영 씬 */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">촬영 씬 ({guideData.shooting_scenes?.length || 0}개)</h4>
                                <span className="text-sm text-red-600 font-medium">본 대사와 촬영 장면은 크리에이터의 스타일에 맞게 변경하여 촬영해 주세요.</span>
                              </div>
                              <div className="space-y-3">
                                {(guideData.shooting_scenes || []).map((scene, idx) => (
                                  <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <div className="font-semibold text-purple-700">씬 {scene.order}: {scene.scene_type}</div>
                                    <div className="text-sm mt-1 text-gray-700">{scene.scene_description}</div>
                                    {scene.dialogue && (
                                      <div className="text-sm mt-1 italic text-gray-600">""{scene.dialogue}""</div>
                                    )}
                                    {scene.shooting_tip && (
                                      <div className="text-xs mt-1 text-gray-500">팁: {scene.shooting_tip}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 크리에이터 팁 */}
                            {guideData.creator_tips && guideData.creator_tips.length > 0 && (
                              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="font-semibold mb-3">크리에이터 팁</h4>
                                <ul className="list-decimal list-inside space-y-1">
                                  {guideData.creator_tips.filter(tip => tip).map((tip, i) => (
                                    <li key={i} className="text-sm text-gray-700">{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      } catch (error) {
                        return selectedGuide.personalized_guide;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* 추가 메시지 입력 공간 (하단 고정) */}
            {!editingGuide && (
              <div className="px-6 py-3 border-t bg-yellow-50">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  크리에이터에게 전달할 추가 메시지 (선택사항)
                </label>
                <textarea
                  value={selectedGuide.additional_message || ''}
                  onChange={(e) => {
                    setSelectedGuide({ ...selectedGuide, additional_message: e.target.value })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="예: 촬영 시 제품을 먼저 클로즈업해주세요. 배경은 밝게 유지해주시면 감사하겠습니다."
                />
              </div>
            )}

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGuideModal(false)
                    setSelectedGuide(null)
                    setEditingGuide(false)
                  }}
                >
                  닫기
                </Button>
                {editingGuide ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingGuide(false)
                        setEditedGuideContent('')
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          await supabase
                            .from('applications')
                            .update({ 
                              personalized_guide: editedGuideContent,
                              guide_updated_at: new Date().toISOString()
                            })
                            .eq('id', selectedGuide.id)
                          
                          alert('가이드가 저장되었습니다.')
                          setEditingGuide(false)
                          await fetchParticipants()
                          setShowGuideModal(false)
                          setSelectedGuide(null)
                        } catch (error) {
                          console.error('Error saving guide:', error)
                          alert('저장에 실패했습니다.')
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      저장
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingGuide(true)
                        setEditedGuideContent(selectedGuide.personalized_guide || '')
                      }}
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      가이드 수정
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          // 추가 메시지 저장
                          const { error } = await supabase
                            .from('applications')
                            .update({ 
                              additional_message: selectedGuide.additional_message || null
                            })
                            .eq('id', selectedGuide.id)

                          if (error) {
                            console.error('Supabase error:', error)
                            throw new Error(error.message || JSON.stringify(error))
                          }

                          alert('추가 메시지가 저장되었습니다!')
                          await fetchParticipants()
                        } catch (error) {
                          console.error('Error saving additional message:', error)
                          alert('저장에 실패했습니다: ' + (error.message || error))
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      메시지 저장
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가이드 수정요청 모달 */}
      {showRevisionRequestModal && selectedGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">가이드 수정요청</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedGuide.creator_name}님의 가이드 수정을 요청합니다
              </p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수정요청 내용
              </label>
              <textarea
                value={revisionRequestText}
                onChange={(e) => setRevisionRequestText(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="수정이 필요한 부분과 원하시는 내용을 상세히 작성해주세요."
              />
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevisionRequestModal(false)
                  setRevisionRequestText('')
                }}
              >
                취소
              </Button>
              <Button
                onClick={async () => {
                  if (!revisionRequestText.trim()) {
                    alert('수정요청 내용을 입력해주세요.')
                    return
                  }

                  try {
                    // 데이터베이스에 수정요청 저장
                    await supabase
                      .from('applications')
                      .update({
                        guide_revision_request: revisionRequestText,
                        guide_revision_requested_at: new Date().toISOString(),
                        guide_status: 'revision_requested'
                      })
                      .eq('id', selectedGuide.id)

                    // 네이버 웍스로 알림 전송
                    const response = await fetch('/.netlify/functions/send-guide-revision-request', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        campaignTitle: campaign.title,
                        creatorName: selectedGuide.creator_name,
                        companyName: campaign.company_name,
                        revisionRequest: revisionRequestText
                      })
                    })

                    if (!response.ok) {
                      throw new Error('알림 전송에 실패했습니다.')
                    }

                    alert('수정요청이 관리자에게 전달되었습니다.')
                    setShowRevisionRequestModal(false)
                    setRevisionRequestText('')
                    await fetchParticipants()
                  } catch (error) {
                    console.error('Error sending revision request:', error)
                    alert('수정요청 전송에 실패했습니다.')
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                전송
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 배송 정보 모달 */}
      {showShippingModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">배송 정보</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedParticipant.creator_name || selectedParticipant.applicant_name}님
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <div className="text-gray-900">{selectedParticipant.phone_number || selectedParticipant.creator_phone || '미등록'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">우편번호</label>
                <div className="text-gray-900">{selectedParticipant.postal_code || '미등록'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <div className="text-gray-900">{selectedParticipant.address || '미등록'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">배송 요청사항</label>
                <div className="text-gray-900">{selectedParticipant.delivery_notes || selectedParticipant.delivery_request || '없음'}</div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <Button
                onClick={() => {
                  setShowShippingModal(false)
                  setSelectedParticipant(null)
                }}
              >
                닫기
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
                      .from('applications')
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
                      .from('applications')
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

      {/* 크리에이터 프로필 모달 */}
      {showProfileModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* 모달 헤더 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  setSelectedParticipant(null)
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="width" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* 프로필 상단 */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-center">
                <img
                  src={selectedParticipant.profile_photo_url || '/default-avatar.png'}
                  alt={selectedParticipant.name}
                  className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-lg object-cover"
                />
                <h2 className="text-2xl font-bold text-white mt-4">{selectedParticipant.name}</h2>
                {selectedParticipant.age && (
                  <p className="text-blue-100 mt-1">{selectedParticipant.age}세</p>
                )}
              </div>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="p-6 space-y-6">
              {/* Bio */}
              {selectedParticipant.bio && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">크리에이터 소개</h3>
                  <p className="text-gray-600 leading-relaxed">{selectedParticipant.bio}</p>
                </div>
              )}

              {/* 팔로워 통계 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">팔로워 통계</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedParticipant.youtube_subscribers > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <span className="font-semibold text-red-700">YouTube</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{selectedParticipant.youtube_subscribers.toLocaleString()}</p>
                      <p className="text-xs text-red-600 mt-1">구독자</p>
                    </div>
                  )}
                  {selectedParticipant.instagram_followers > 0 && (
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        <span className="font-semibold text-pink-700">Instagram</span>
                      </div>
                      <p className="text-2xl font-bold text-pink-600">{selectedParticipant.instagram_followers.toLocaleString()}</p>
                      <p className="text-xs text-pink-600 mt-1">팔로워</p>
                    </div>
                  )}
                  {selectedParticipant.tiktok_followers > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                        <span className="font-semibold text-gray-700">TikTok</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-800">{selectedParticipant.tiktok_followers.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">팔로워</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SNS 링크 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">SNS 채널</h3>
                <div className="flex gap-3">
                  {selectedParticipant.youtube_url && (
                    <a
                      href={selectedParticipant.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube
                    </a>
                  )}
                  {selectedParticipant.instagram_url && (
                    <a
                      href={selectedParticipant.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Instagram
                    </a>
                  )}
                  {selectedParticipant.tiktok_url && (
                    <a
                      href={selectedParticipant.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-800 hover:bg-gray-900 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                      </svg>
                      TikTok
                    </a>
                  )}
                </div>
              </div>
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
                      .from('applications')
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
                      .from('applications')
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
      
      {/* 확정 취소 모달 */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">확정 취소</h3>
            <p className="text-sm text-gray-600 mb-4">
              {cancellingApp?.applicant_name}님의 확정을 취소하시겠습니까?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                취소 사유 *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="취소 사유를 입력해주세요. (크리에이터에게 전달됩니다)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelModalOpen(false)
                  setCancellingApp(null)
                  setCancelReason('')
                }}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirmation}
              >
                확정 취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI 가이드 재생성 요청 모달 */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">AI에게 가이드 재생성 요청</h3>
              <button
                onClick={() => {
                  setShowRegenerateModal(false)
                  setRegenerateRequest('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                선택된 <strong className="text-purple-600">{selectedParticipants.length}명</strong>의 크리에이터 가이드를 재생성합니다.
              </p>
              <p className="text-sm text-gray-500">
                예: "더 친근한 톤으로 변경해주세요", "제품의 보습 효과를 강조해주세요"
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재생성 요청사항 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={regenerateRequest}
                onChange={(e) => setRegenerateRequest(e.target.value)}
                placeholder="AI에게 어떻게 가이드를 수정해달라고 요청하시겠습니까?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={5}
                disabled={isRegenerating}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRegenerateModal(false)
                  setRegenerateRequest('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isRegenerating}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!regenerateRequest.trim()) {
                    alert('재생성 요청사항을 입력해주세요.')
                    return
                  }

                  if (!confirm(`${selectedParticipants.length}명의 크리에이터 가이드를 재생성하시겠습니까?`)) {
                    return
                  }

                  setIsRegenerating(true)

                  try {
                    let successCount = 0
                    let errorCount = 0

                    for (const participantId of selectedParticipants) {
                      try {
                        const participant = participants.find(p => p.id === participantId)
                        if (!participant || !participant.personalized_guide) {
                          console.log(`Skipping participant ${participantId}: no existing guide`)
                          errorCount++
                          continue
                        }

                        // 기존 가이드 + 요청사항으로 재생성
                        const regenerateResponse = await fetch('/.netlify/functions/regenerate-personalized-guide', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            existingGuide: participant.personalized_guide,
                            regenerateRequest: regenerateRequest,
                            creatorAnalysis: participant.creator_analysis,
                            productInfo: {
                              brand: campaign.brand,
                              product_name: campaign.product_name,
                              product_features: campaign.product_features,
                              product_key_points: campaign.product_key_points
                            }
                          })
                        })

                        if (!regenerateResponse.ok) {
                          console.error(`Failed to regenerate guide for participant ${participantId}`)
                          errorCount++
                          continue
                        }

                        const { regeneratedGuide } = await regenerateResponse.json()

                        // 데이터베이스에 업데이트
                        await supabase
                          .from('applications')
                          .update({
                            personalized_guide: regeneratedGuide
                          })
                          .eq('id', participantId)

                        successCount++
                      } catch (error) {
                        console.error(`Error regenerating guide for participant ${participantId}:`, error)
                        errorCount++
                      }
                    }

                    await fetchParticipants()

                    if (errorCount === 0) {
                      alert(`${successCount}명의 크리에이터 가이드가 재생성되었습니다!`)
                    } else {
                      alert(`${successCount}명 재생성 완료, ${errorCount}명 실패했습니다.`)
                    }

                    setShowRegenerateModal(false)
                    setRegenerateRequest('')
                  } catch (error) {
                    console.error('Error in guide regeneration:', error)
                    alert('가이드 재생성 중 오류가 발생했습니다.')
                  } finally {
                    setIsRegenerating(false)
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={isRegenerating || !regenerateRequest.trim()}
              >
                {isRegenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    재생성 중...
                  </span>
                ) : (
                  '🔄 가이드 재생성'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 개별 메시지 작성 모달 */}
      {showIndividualMessageModal && selectedParticipantForMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">
                {selectedParticipantForMessage.creator_name || selectedParticipantForMessage.applicant_name} - {selectedParticipantForMessage.personalized_guide ? '최종 가이드' : '개별 메시지 작성'}
              </h3>
              <button
                onClick={() => {
                  setShowIndividualMessageModal(false)
                  setSelectedParticipantForMessage(null)
                  setIndividualMessage('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedParticipantForMessage.personalized_guide ? '최종 가이드 (수정 가능)' : '개별 요청사항'}
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  {selectedParticipantForMessage.personalized_guide 
                    ? '크리에이터에게 전달될 최종 가이드를 확인하고 수정할 수 있습니다.'
                    : '이 크리에이터에게만 전달될 추가 요청사항을 작성해주세요. (예: 특정 장면 추가, 특별 연출 요청 등)'}
                </p>
                <textarea
                  value={individualMessage}
                  onChange={(e) => setIndividualMessage(e.target.value)}
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="예:
- 제품을 사용하는 모습을 클로즈업으로 촬영해주세요
- 밝은 분위기의 영상으로 부탁드립니다
- 패키지 언박싱 장면을 포함해주세요"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowIndividualMessageModal(false)
                  setSelectedParticipantForMessage(null)
                  setIndividualMessage('')
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('applications')
                      .update({ 
                        personalized_guide: individualMessage,
                        guide_updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedParticipantForMessage.id)
                    
                    if (error) throw error
                    
                    alert('개별 메시지가 저장되었습니다.')
                    setShowIndividualMessageModal(false)
                    setSelectedParticipantForMessage(null)
                    setIndividualMessage('')
                    await fetchParticipants()
                  } catch (error) {
                    console.error('Error saving individual message:', error)
                    alert('저장에 실패했습니다: ' + error.message)
                  }
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Guide Modal for Olive Young */}
      {showUnifiedGuideModal && campaign.campaign_type === 'oliveyoung' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">🎉 올리브영 세일 최종 가이드 생성</h3>
              <button
                onClick={() => setShowUnifiedGuideModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setUnifiedGuideTab('step1')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    unifiedGuideTab === 'step1'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  1단계: 세일 전 가이드
                </button>
                <button
                  onClick={() => setUnifiedGuideTab('step2')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    unifiedGuideTab === 'step2'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  2단계: 세일 당일 영상 가이드
                </button>
                <button
                  onClick={() => setUnifiedGuideTab('step3')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    unifiedGuideTab === 'step3'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  3단계: 스토리 URL 가이드
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Reference URLs - Always shown first */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🎥 참고 영상 URL <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    크리에이터에게 보여줄 참고 영상 URL을 입력하세요. (여러 개는 줄바꿈으로 구분)
                  </p>
                  <textarea
                    value={unifiedGuideData[unifiedGuideTab].reference_urls}
                    onChange={(e) => setUnifiedGuideData({
                      ...unifiedGuideData,
                      [unifiedGuideTab]: {
                        ...unifiedGuideData[unifiedGuideTab],
                        reference_urls: e.target.value
                      }
                    })}
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="https://www.youtube.com/watch?v=example1
https://www.instagram.com/reel/example2"
                  />
                </div>

                {/* Required Dialogue */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💬 필수 대사
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    크리에이터가 반드시 말해야 하는 대사를 작성하세요. (AI가 자동 생성할 수 있습니다)
                  </p>
                  <textarea
                    value={unifiedGuideData[unifiedGuideTab].required_dialogue}
                    onChange={(e) => setUnifiedGuideData({
                      ...unifiedGuideData,
                      [unifiedGuideTab]: {
                        ...unifiedGuideData[unifiedGuideTab],
                        required_dialogue: e.target.value
                      }
                    })}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="예: '오늘은 올리브영 세일에서 꼭 사야 할 제품을 소개할게요!'"
                  />
                </div>

                {/* Required Scenes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🎥 필수 장면
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    반드시 포함되어야 하는 장면을 설명하세요. (AI가 자동 생성할 수 있습니다)
                  </p>
                  <textarea
                    value={unifiedGuideData[unifiedGuideTab].required_scenes}
                    onChange={(e) => setUnifiedGuideData({
                      ...unifiedGuideData,
                      [unifiedGuideTab]: {
                        ...unifiedGuideData[unifiedGuideTab],
                        required_scenes: e.target.value
                      }
                    })}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="예:
- 제품 패키지 클로즈업
- 사용 전후 비교
- 올리브영 매장 방문 장면"
                  />
                </div>

                {/* Examples */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💡 예시 (3-5개)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    구체적인 예시를 작성하세요. (AI가 자동 생성할 수 있습니다)
                  </p>
                  <textarea
                    value={unifiedGuideData[unifiedGuideTab].examples}
                    onChange={(e) => setUnifiedGuideData({
                      ...unifiedGuideData,
                      [unifiedGuideTab]: {
                        ...unifiedGuideData[unifiedGuideTab],
                        examples: e.target.value
                      }
                    })}
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="예시 1: 제품을 손에 들고 '이거 진짜 추천해요!' 라고 말하기
예시 2: 제품 텍스처를 클로즈업으로 보여주기
예시 3: 사용 후 피부 변화 보여주기"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowUnifiedGuideModal(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={async () => {
                  // Validate reference URLs
                  const hasAllUrls = 
                    unifiedGuideData.step1.reference_urls.trim() &&
                    unifiedGuideData.step2.reference_urls.trim() &&
                    unifiedGuideData.step3.reference_urls.trim()
                  
                  if (!hasAllUrls) {
                    alert('모든 단계의 참고 영상 URL을 입력해주세요.')
                    return
                  }

                  if (!confirm('AI가 입력하신 정보를 기반으로 나머지 가이드를 자동 생성합니다. 계속하시겠습니까?')) {
                    return
                  }

                  setIsGeneratingUnifiedGuide(true)
                  
                  try {
                    const response = await fetch('/.netlify/functions/generate-oliveyoung-guide', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        campaignInfo: {
                          brand: campaign.brand,
                          product_name: campaign.product_name,
                          campaign_description: campaign.campaign_description,
                          key_messages: campaign.key_messages
                        },
                        existingData: unifiedGuideData
                      })
                    })

                    if (!response.ok) {
                      throw new Error('AI 가이드 생성 실패')
                    }

                    const { generatedGuide } = await response.json()
                    setUnifiedGuideData(generatedGuide)
                    
                    alert('🎉 AI 가이드 생성 완료! 내용을 확인하고 수정하세요.')
                  } catch (error) {
                    console.error('Error generating guide:', error)
                    alert('AI 가이드 생성에 실패했습니다: ' + error.message)
                  } finally {
                    setIsGeneratingUnifiedGuide(false)
                  }
                }}
                disabled={isGeneratingUnifiedGuide}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGeneratingUnifiedGuide ? '생성 중...' : '🤖 AI로 나머지 자동 생성'}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    // Save to campaigns table
                    const { error } = await supabaseBiz
                      .from('campaigns')
                      .update({
                        oliveyoung_step1_guide: JSON.stringify(unifiedGuideData.step1),
                        oliveyoung_step2_guide: JSON.stringify(unifiedGuideData.step2),
                        oliveyoung_step3_guide: JSON.stringify(unifiedGuideData.step3),
                        guide_generated_at: new Date().toISOString()
                      })
                      .eq('id', campaign.id)
                    
                    if (error) throw error
                    
                    alert('🎉 가이드가 저장되었습니다!')
                    await fetchCampaignDetail()
                    setShowUnifiedGuideModal(false)
                  } catch (error) {
                    console.error('Error saving guide:', error)
                    alert('가이드 저장에 실패했습니다: ' + error.message)
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                💾 가이드 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
