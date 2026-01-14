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
  AlertCircle,
  Video,
  Edit3,
  Edit2,
  Upload,
  X,
  MapPin,
  Truck,
  Sparkles,
  Loader2,
  MessageSquare,
  Calendar,
  Download,
  RefreshCw,
  Camera,
  Hash,
  Trash2,
  Copy,
  Link,
  ExternalLink,
  Mail,
  XCircle
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'

// US 캠페인 작업을 위한 API 호출 헬퍼 (RLS 우회)
const callUSCampaignAPI = async (action, campaignId, applicationId, data) => {
  const { data: { session } } = await supabaseBiz.auth.getSession()
  if (!session?.access_token) {
    throw new Error('인증이 필요합니다')
  }

  console.log('[US API] Calling:', action, { campaignId, applicationId, data })

  const response = await fetch('/.netlify/functions/us-campaign-operations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action,
      campaign_id: campaignId,
      application_id: applicationId,
      data
    })
  })

  console.log('[US API] Response status:', response.status)

  // 응답 텍스트 먼저 확인
  const responseText = await response.text()
  console.log('[US API] Response body:', responseText.substring(0, 500))

  let result
  try {
    result = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`API 응답 파싱 실패: ${responseText.substring(0, 200)}`)
  }

  if (!result.success) {
    throw new Error(result.error || `API 실패 (상태: ${response.status})`)
  }
  return result
}

import CreatorCard from './CreatorCard'
import { sendCampaignSelectedNotification, sendCampaignCancelledNotification, sendGuideDeliveredNotification } from '../../services/notifications/creatorNotifications'
import { getAIRecommendations, generateAIRecommendations } from '../../services/aiRecommendation'
import OliveYoungGuideModal from './OliveYoungGuideModal'
import FourWeekGuideModal from './FourWeekGuideModal'
import OliveyoungGuideModal from './OliveyoungGuideModal'
import FourWeekGuideManager from './FourWeekGuideManager'

import FourWeekGuideViewer from './FourWeekGuideViewer'
import PersonalizedGuideViewer from './PersonalizedGuideViewer'
import USJapanGuideViewer from './USJapanGuideViewer'
import * as XLSX from 'xlsx'
import CampaignGuideViewer from './CampaignGuideViewer'
import PostSelectionSetupModal from './PostSelectionSetupModal'
import ExternalGuideUploader from '../common/ExternalGuideUploader'

// SNS URL 정규화 (ID만 입력하거나 @가 있는 경우 처리)
const normalizeSnsUrl = (url, platform) => {
  if (!url) return null

  // 이미 완전한 URL인 경우
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // @로 시작하면 제거
  let handle = url.trim()
  if (handle.startsWith('@')) {
    handle = handle.substring(1)
  }

  // 플랫폼별 URL 생성
  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${handle}`
    case 'youtube':
      if (handle.startsWith('UC') || handle.startsWith('channel/')) {
        return `https://www.youtube.com/channel/${handle.replace('channel/', '')}`
      }
      return `https://www.youtube.com/@${handle}`
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`
    default:
      return url
  }
}

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'
  const tabParam = searchParams.get('tab') // URL에서 tab 파라미터 읽기
  const supabase = region === 'japan'
    ? getSupabaseClient('japan')
    : region === 'us'
      ? getSupabaseClient('us')
      : (supabaseKorea || supabaseBiz)
  const [campaign, setCampaign] = useState(null)
  const [applications, setApplications] = useState([])
  const [participants, setParticipants] = useState([])
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [cnecPlusRecommendations, setCnecPlusRecommendations] = useState([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [loadingCnecPlus, setLoadingCnecPlus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshingViews, setRefreshingViews] = useState({})
  const [requestingShippingInfo, setRequestingShippingInfo] = useState(false)
  // URL tab 파라미터가 있으면 해당 탭으로, 없으면 applications
  const [activeTab, setActiveTab] = useState(tabParam === 'applicants' ? 'applications' : (tabParam || 'applications'))
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
  const [uploadDeadline, setUploadDeadline] = useState('승인 완료 후 1일 이내')
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
  const [showAIEditModal, setShowAIEditModal] = useState(false)
  const [aiEditPrompt, setAIEditPrompt] = useState('')
  const [isAIEditing, setIsAIEditing] = useState(false)
  const [isGeneratingAllGuides, setIsGeneratingAllGuides] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(null)
  const [videoSubmissions, setVideoSubmissions] = useState([])
  const [selectedVideoVersions, setSelectedVideoVersions] = useState({}) // {user_id_step: version_index}
  const [selectedVideoSteps, setSelectedVideoSteps] = useState({}) // {user_id: step_number (week or video number)}
  const [signedVideoUrls, setSignedVideoUrls] = useState({}) // {submission_id: signed_url}
  const [showUnifiedGuideModal, setShowUnifiedGuideModal] = useState(false)
  const [unifiedGuideTab, setUnifiedGuideTab] = useState('step1')
  const [isGeneratingUnifiedGuide, setIsGeneratingUnifiedGuide] = useState(false)
  const [unifiedGuideData, setUnifiedGuideData] = useState({
    product_info: '',
    hashtags: [],
    required_dialogues: ['', '', ''],
    required_scenes: ['', '', ''],
    cautions: '',
    reference_urls: ['']
  })
  const [show4WeekGuideModal, setShow4WeekGuideModal] = useState(false)
  const [showOliveyoungGuideModal, setShowOliveyoungGuideModal] = useState(false)
  const [showCampaignGuidePopup, setShowCampaignGuidePopup] = useState(false) // 캠페인 등록 정보 팝업
  const [showDeleteModal, setShowDeleteModal] = useState(false) // 캠페인 삭제 모달
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPostSelectionModal, setShowPostSelectionModal] = useState(false)
  const [creatorForSetup, setCreatorForSetup] = useState(null)
  const [showGuideSelectModal, setShowGuideSelectModal] = useState(false) // 가이드 유형 선택 모달
  const [selectedParticipantForGuide, setSelectedParticipantForGuide] = useState(null) // 가이드 생성 대상 참여자
  const [externalGuideData, setExternalGuideData] = useState({ type: null, url: null, fileUrl: null, fileName: null, title: '' }) // 외부 가이드 데이터
  // Address editing state
  const [editingAddressFor, setEditingAddressFor] = useState(null)
  const [addressFormData, setAddressFormData] = useState({
    phone_number: '',
    postal_code: '',
    address: '',
    detail_address: ''
  })
  const [savingAddress, setSavingAddress] = useState(false)
  // Bulk guide generation state
  const [isGeneratingBulkGuides, setIsGeneratingBulkGuides] = useState(false)
  const [bulkGuideProgress, setBulkGuideProgress] = useState({ current: 0, total: 0 })
  // Bulk guide email sending state
  const [sendingBulkGuideEmail, setSendingBulkGuideEmail] = useState(false)
  const [fourWeekGuideTab, setFourWeekGuideTab] = useState('week1')
  const [isGenerating4WeekGuide, setIsGenerating4WeekGuide] = useState(false)
  // Admin SNS/Ad code edit state
  const [showAdminSnsEditModal, setShowAdminSnsEditModal] = useState(false)
  const [showDeadlineEditModal, setShowDeadlineEditModal] = useState(false)
  const [deadlineEditData, setDeadlineEditData] = useState({})
  const [adminSnsEditData, setAdminSnsEditData] = useState({
    submissionId: null,
    participantId: null,
    snsUrl: '',
    adCode: '',
    isEditMode: false
  })
  const [savingAdminSnsEdit, setSavingAdminSnsEdit] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [singleWeekGuideData, setSingleWeekGuideData] = useState({ required_dialogue: '', required_scenes: '', examples: '', reference_urls: '' })
  const [showSingleWeekModal, setShowSingleWeekModal] = useState(false)
  const [showWeekGuideViewModal, setShowWeekGuideViewModal] = useState(false)
  const [fourWeekGuideData, setFourWeekGuideData] = useState({
    week1: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    },
    week2: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    },
    week3: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    },
    week4: {
      product_info: '',
      mission: '',
      hashtags: [],
      required_dialogues: ['', '', ''],
      required_scenes: ['', '', ''],
      cautions: '',
      reference_urls: ['']
    }
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
      
      // Check permission based on multiple fields for proper transfer support
      let hasPermission = isAdmin

      if (!hasPermission) {
        // Check by company_email (works for Korea, Japan)
        if (campaign.company_email === user.email) {
          hasPermission = true
        }
        // Check by user_id (set during campaign creation or transfer)
        else if (campaign.user_id === user.id) {
          hasPermission = true
        }
        // Check by company_id (US campaigns use this for ownership)
        else if (campaign.company_id === user.id) {
          hasPermission = true
        }
      }
      
      if (!hasPermission) {
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

      // email로 admin 체크 (admin_users 테이블은 email 기준)
      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      setIsAdmin(!!adminData)
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  // 캠페인 삭제 함수
  const handleDeleteCampaign = async () => {
    if (!campaign) return

    setIsDeleting(true)
    try {
      // 관련 applications도 함께 삭제
      const { error: appError } = await supabase
        .from('applications')
        .delete()
        .eq('campaign_id', campaign.id)

      if (appError) {
        console.error('Error deleting applications:', appError)
      }

      // 캠페인 삭제
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id)

      if (error) throw error

      alert('캠페인이 삭제되었습니다.')
      navigate('/company/campaigns')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('캠페인 삭제에 실패했습니다: ' + (error.message || '알 수 없는 오류'))
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
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
      // BIZ DB에서 applications 가져오기 (sns_uploaded: 4주/올영에서 SNS URL 입력 완료 상태)
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('campaign_id', id)
        .in('status', ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed', 'sns_uploaded'])
        .order('created_at', { ascending: false })

      if (error) throw error

      // BIZ DB 결과
      let combinedData = data || []
      console.log('[fetchParticipants] BIZ DB participants:', combinedData.length)
      if (combinedData.length > 0) {
        console.log('[fetchParticipants] Participant statuses:', combinedData.map(p => p.status))
      }

      // BIZ DB에 없으면 Korea DB에서 참가자 가져오기 시도 (올영/4주 캠페인용)
      if (combinedData.length === 0 && supabaseKorea) {
        console.log('[fetchParticipants] BIZ DB empty, trying Korea DB...')

        // 1. 먼저 applications 테이블 (cnec-kr은 여기에 저장)
        try {
          const { data: appData, error: appError } = await supabaseKorea
            .from('applications')
            .select('*')
            .eq('campaign_id', id)

          if (appError) {
            console.log('[fetchParticipants] Korea applications error:', appError.message)
          } else if (appData && appData.length > 0) {
            // 상태 필터링 (sns_uploaded 추가 - 4주/올영에서 SNS URL 입력 완료 상태)
            combinedData = appData.filter(a =>
              ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed', 'sns_uploaded'].includes(a.status)
            )
            console.log('[fetchParticipants] Got from Korea applications:', combinedData.length, 'filtered from', appData.length)
          }
        } catch (e) {
          console.log('[fetchParticipants] applications exception:', e.message)
        }

        // 2. applications에서 못 찾았으면 campaign_participants 테이블
        if (combinedData.length === 0) {
          try {
            const { data: cpData, error: cpError } = await supabaseKorea
              .from('campaign_participants')
              .select('*')
              .eq('campaign_id', id)

            if (cpError) {
              console.log('[fetchParticipants] Korea campaign_participants error:', cpError.message)
            } else if (cpData && cpData.length > 0) {
              combinedData = cpData
              console.log('[fetchParticipants] Got from Korea campaign_participants:', cpData.length)
            }
          } catch (e) {
            console.log('[fetchParticipants] campaign_participants exception:', e.message)
          }
        }
      }

      // 모든 user_profiles를 먼저 가져와서 JavaScript에서 매칭 (400 에러 우회)
      const { data: allProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')

      if (profilesError) {
        console.error('Error fetching all profiles:', profilesError)
      } else {
        console.log('Fetched all profiles count:', allProfiles?.length || 0)
        if (allProfiles && allProfiles.length > 0) {
          console.log('Sample profile columns:', Object.keys(allProfiles[0]))
        }
      }

      // user_id가 있는 경우 user_profiles에서 프로필 사진 가져오기
      const enrichedData = combinedData.map((app) => {
        // 먼저 app에 이미 있는 프로필 사진 확인
        console.log('App fields for', app.applicant_name, ':', {
          user_id: app.user_id,
          email: app.email,
          profile_photo_url: app.profile_photo_url,
          profile_image_url: app.profile_image_url,
          profile_image: app.profile_image,
          creator_profile_image: app.creator_profile_image,
          avatar_url: app.avatar_url
        })

        let profile = null

        if (app.user_id && allProfiles && allProfiles.length > 0) {
          // JavaScript에서 프로필 매칭 (id, user_id, email로 시도)
          profile = allProfiles.find(p =>
            p.id === app.user_id ||
            p.user_id === app.user_id ||
            (app.email && p.email === app.email)
          )

          if (profile) {
            console.log('Found profile for', app.applicant_name, ':', {
              matched_by: p => p.id === app.user_id ? 'id' : (p.user_id === app.user_id ? 'user_id' : 'email'),
              profile_image: profile.profile_image,
              profile_photo_url: profile.profile_photo_url,
              avatar_url: profile.avatar_url
            })
          } else {
            console.log('No profile match found for', app.applicant_name, 'user_id:', app.user_id)
          }
        }

        // user_profiles에서 먼저, 없으면 application에서 프로필 이미지 가져오기
        const profileImage = profile?.profile_image || profile?.profile_photo_url || profile?.profile_image_url ||
                             profile?.avatar_url || profile?.profile_video_url ||
                             app.profile_photo_url || app.profile_image_url || app.profile_image || app.creator_profile_image || app.avatar_url

        // 이메일에서 이름 추출 함수
        const extractNameFromEmail = (email) => {
          if (!email || !email.includes('@')) return null
          const localPart = email.split('@')[0]
          if (/^\d+$/.test(localPart) || localPart.length < 2) return null
          return localPart
            .replace(/[._]/g, ' ')
            .replace(/\d+/g, '')
            .trim()
            .split(' ')
            .filter(part => part.length > 0)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ') || null
        }

        // 이름 결정: 다양한 필드에서 검색
        const resolvedName =
          profile?.name ||
          profile?.display_name ||
          profile?.nickname ||
          profile?.full_name ||
          profile?.username ||
          (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
          profile?.family_name ||
          profile?.given_name ||
          (app.applicant_name && !app.applicant_name.includes('@') ? app.applicant_name : null) ||
          (app.creator_name && !app.creator_name.includes('@') ? app.creator_name : null) ||
          extractNameFromEmail(app.applicant_name) ||
          extractNameFromEmail(app.email) ||
          app.applicant_name

        return {
          ...app,
          applicant_name: resolvedName,
          profile_photo_url: profileImage || null,
          // 이메일 병합 (user_profiles에서 가져온 값 우선, 없으면 application에서)
          email: profile?.email || app.email || app.applicant_email,
          // SNS URL 병합 (user_profiles에서 가져온 값 우선, 없으면 application에서)
          instagram_url: profile?.instagram_url || app.instagram_url,
          youtube_url: profile?.youtube_url || app.youtube_url,
          tiktok_url: profile?.tiktok_url || app.tiktok_url
        }
      })

      // Korea DB에서 SNS URL 데이터 가져오기 (applications 우선 - cnec-kr은 여기에 저장)
      let partnershipData = []
      console.log('[fetchParticipants] supabaseKorea available:', !!supabaseKorea)
      console.log('[fetchParticipants] Campaign ID:', id)

      if (supabaseKorea) {
        // 1. 먼저 applications 테이블에서 시도 (cnec-kr은 여기에 저장)
        console.log('[fetchParticipants] Trying Korea DB applications table first...')
        const { data: appData, error: appError } = await supabaseKorea
          .from('applications')
          .select(`
            user_id, partnership_code, sns_upload_url,
            step1_url, step2_url, step3_url,
            step1_2_partnership_code, step3_partnership_code,
            week1_url, week2_url, week3_url, week4_url,
            week1_partnership_code, week2_partnership_code, week3_partnership_code, week4_partnership_code
          `)
          .eq('campaign_id', id)

        if (appError) {
          console.log('[fetchParticipants] Korea applications error:', appError.message)
        } else if (appData && appData.length > 0) {
          partnershipData = appData
          console.log('[fetchParticipants] Korea applications records:', appData.length)
        }

        // 2. applications에서 못 찾았으면 campaign_participants 테이블에서 시도
        if (partnershipData.length === 0) {
          console.log('[fetchParticipants] Trying Korea DB campaign_participants table...')
          const { data: cpData, error: cpError } = await supabaseKorea
            .from('campaign_participants')
            .select(`
              user_id, partnership_code, sns_upload_url,
              step1_url, step2_url, step3_url,
              step1_2_partnership_code, step3_partnership_code,
              week1_url, week2_url, week3_url, week4_url,
              week1_partnership_code, week2_partnership_code, week3_partnership_code, week4_partnership_code
            `)
            .eq('campaign_id', id)

          if (cpError) {
            console.log('[fetchParticipants] campaign_participants error:', cpError.message)
          } else if (cpData && cpData.length > 0) {
            partnershipData = cpData
            console.log('[fetchParticipants] campaign_participants records:', cpData.length)
          }
        }

        // 결과 로깅
        if (partnershipData.length > 0) {
          console.log('[fetchParticipants] First record SNS URLs:', {
            step1: partnershipData[0].step1_url,
            step2: partnershipData[0].step2_url,
            step3: partnershipData[0].step3_url,
            week1: partnershipData[0].week1_url,
            week2: partnershipData[0].week2_url
          })
        } else {
          console.warn('[fetchParticipants] No partnership data found in Korea DB')
        }
      } else {
        console.warn('[fetchParticipants] supabaseKorea not available')
      }

      // partnership_code 및 올영/4주챌린지 필드 병합
      console.log('[fetchParticipants] BIZ DB participants:', enrichedData.length)
      console.log('[fetchParticipants] Korea DB partnership data:', partnershipData.length)

      const finalData = enrichedData.map(app => {
        const partnerInfo = partnershipData.find(p => p.user_id === app.user_id)
        if (partnerInfo) {
          console.log('[fetchParticipants] Matched user_id:', app.user_id, '- has step1_url:', !!partnerInfo.step1_url, 'week1_url:', !!partnerInfo.week1_url)
        }
        return {
          ...app,
          partnership_code: partnerInfo?.partnership_code || app.partnership_code,
          sns_upload_url: partnerInfo?.sns_upload_url || app.sns_upload_url,
          // 올리브영 필드
          step1_url: partnerInfo?.step1_url || app.step1_url,
          step2_url: partnerInfo?.step2_url || app.step2_url,
          step3_url: partnerInfo?.step3_url || app.step3_url,
          step1_2_partnership_code: partnerInfo?.step1_2_partnership_code || app.step1_2_partnership_code,
          step3_partnership_code: partnerInfo?.step3_partnership_code || app.step3_partnership_code,
          // 4주 챌린지 필드
          week1_url: partnerInfo?.week1_url || app.week1_url,
          week2_url: partnerInfo?.week2_url || app.week2_url,
          week3_url: partnerInfo?.week3_url || app.week3_url,
          week4_url: partnerInfo?.week4_url || app.week4_url,
          week1_partnership_code: partnerInfo?.week1_partnership_code || app.week1_partnership_code,
          week2_partnership_code: partnerInfo?.week2_partnership_code || app.week2_partnership_code,
          week3_partnership_code: partnerInfo?.week3_partnership_code || app.week3_partnership_code,
          week4_partnership_code: partnerInfo?.week4_partnership_code || app.week4_partnership_code
        }
      })

      console.log('Fetched participants:', finalData)
      console.log('Participants count:', finalData?.length || 0)
      setParticipants(finalData || [])
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

      // US 지역 디버깅: applications 테이블의 실제 필드 구조 확인
      if (data && data.length > 0) {
        console.log('[DEBUG US] applications 테이블 필드 목록:', Object.keys(data[0]))
        console.log('[DEBUG US] 첫 번째 application 전체 데이터:', JSON.stringify(data[0], null, 2))
        console.log('[DEBUG US] 주소/연락처 관련 필드 확인:', {
          phone: data[0].phone,
          phone_number: data[0].phone_number,
          creator_phone: data[0].creator_phone,
          shipping_phone: data[0].shipping_phone,
          address: data[0].address,
          shipping_address: data[0].shipping_address,
          postal_code: data[0].postal_code,
          detail_address: data[0].detail_address
        })
      }

      // 모든 user_profiles를 먼저 가져와서 JavaScript에서 매칭 (400 에러 우회)
      const { data: allProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')

      if (profilesError) {
        console.error('Error fetching all profiles for applications:', profilesError)
      } else {
        console.log('Fetched all profiles for applications count:', allProfiles?.length || 0)
        if (allProfiles && allProfiles.length > 0) {
          console.log('Profile columns available:', Object.keys(allProfiles[0]))
        }
      }

      // user_id가 있는 경우 user_profiles에서 추가 정보 가져오기
      const enrichedData = (data || []).map((app) => {
        console.log('Application data:', app.applicant_name, 'user_id:', app.user_id)

        let profile = null

        if (app.user_id && allProfiles && allProfiles.length > 0) {
          // JavaScript에서 프로필 매칭 (id, user_id, email로 시도)
          profile = allProfiles.find(p =>
            p.id === app.user_id ||
            p.user_id === app.user_id ||
            (app.email && p.email === app.email)
          )
        }

        console.log('Profile for', app.applicant_name, ':', profile ? 'found' : 'not found', 'profile_image:', profile?.profile_image)

        // 이메일에서 이름 추출 함수
        const extractNameFromEmail = (email) => {
          if (!email || !email.includes('@')) return null
          const localPart = email.split('@')[0]
          // 숫자만 있거나 너무 짧으면 사용하지 않음
          if (/^\d+$/.test(localPart) || localPart.length < 2) return null
          // .과 _를 공백으로 변환하고 첫글자 대문자화
          return localPart
            .replace(/[._]/g, ' ')
            .replace(/\d+/g, '')
            .trim()
            .split(' ')
            .filter(part => part.length > 0)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ') || null
        }

        // 이름 결정: 다양한 필드에서 검색
        const resolvedName =
          profile?.name ||
          profile?.display_name ||
          profile?.nickname ||
          profile?.full_name ||
          profile?.username ||
          (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
          profile?.family_name ||
          profile?.given_name ||
          (app.applicant_name && !app.applicant_name.includes('@') ? app.applicant_name : null) ||
          (app.creator_name && !app.creator_name.includes('@') ? app.creator_name : null) ||
          extractNameFromEmail(app.applicant_name) ||
          extractNameFromEmail(app.email) ||
          app.applicant_name

        if (profile) {
          const profileImage = profile.profile_image || profile.profile_photo_url || profile.profile_image_url || profile.avatar_url
          const enriched = {
            ...app,
            applicant_name: resolvedName,
            profile_photo_url: profileImage,
            instagram_followers: profile.instagram_followers || app.instagram_followers || 0,
            youtube_subscribers: profile.youtube_subscribers || app.youtube_subscribers || 0,
            tiktok_followers: profile.tiktok_followers || app.tiktok_followers || 0,
            // SNS URL도 병합
            instagram_url: profile.instagram_url || app.instagram_url,
            youtube_url: profile.youtube_url || app.youtube_url,
            tiktok_url: profile.tiktok_url || app.tiktok_url,
            // 연락처/주소 정보 병합 (US 등 해외 지역용)
            phone: profile.phone || profile.phone_number || app.phone || app.phone_number || '',
            phone_number: profile.phone_number || profile.phone || app.phone_number || app.phone || '',
            shipping_phone: profile.phone || profile.phone_number || app.shipping_phone || app.phone || '',
            creator_phone: profile.phone || profile.phone_number || app.creator_phone || '',
            address: profile.address || profile.shipping_address || app.address || app.shipping_address || '',
            shipping_address: profile.shipping_address || profile.address || app.shipping_address || app.address || '',
            postal_code: profile.postal_code || app.postal_code || '',
            detail_address: profile.detail_address || profile.address_detail || app.detail_address || ''
          }
          console.log('Enriched:', enriched.applicant_name, 'Photo:', enriched.profile_photo_url, 'Phone:', enriched.phone, 'Address:', enriched.address)
          return enriched
        }

        console.log('Returning original app data for:', app.applicant_name)
        return {
          ...app,
          applicant_name: resolvedName
        }
      })

      console.log('Fetched applications with status:', enrichedData.map(app => ({ name: app.applicant_name, status: app.status, virtual_selected: app.virtual_selected })))
      setApplications(enrichedData)
    } catch (error) {
      console.error('Error fetching applications:', error)
    }
  }

  const fetchVideoSubmissions = async () => {
    try {
      // video_submissions는 항상 supabaseKorea에 저장됨 (supabaseKorea가 없으면 supabaseBiz fallback)
      const videoClient = supabaseKorea || supabaseBiz
      if (!videoClient) {
        console.error('No supabase client available for video submissions')
        return
      }

      console.log('Fetching video submissions for campaign_id:', id)
      const { data, error } = await videoClient
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
              // Extract path from full URL - support both 'videos' and 'campaign-videos' buckets
              const url = new URL(submission.video_file_url)

              // Try 'videos' bucket first (for video_submissions)
              let pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/videos\/(.+)$/)
              let bucketName = 'videos'

              // If not found, try 'campaign-videos' bucket
              if (!pathMatch) {
                pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/campaign-videos\/(.+)$/)
                bucketName = 'campaign-videos'
              }

              if (pathMatch) {
                const filePath = pathMatch[1]
                const { data: signedData, error: signedError } = await videoClient.storage
                  .from(bucketName)
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

  // 주소 편집 시작
  const handleStartEditAddress = (participant) => {
    setEditingAddressFor(participant.id)
    setAddressFormData({
      phone_number: participant.phone_number || participant.phone || '',
      postal_code: participant.postal_code || '',
      address: participant.address || '',
      detail_address: participant.detail_address || ''
    })
  }

  // 주소 저장
  const handleSaveAddress = async () => {
    if (!editingAddressFor) return

    setSavingAddress(true)
    try {
      const updateData = {
        phone_number: addressFormData.phone_number,
        phone: addressFormData.phone_number, // 호환성 위해 phone 필드도 업데이트
        postal_code: addressFormData.postal_code,
        address: addressFormData.address,
        detail_address: addressFormData.detail_address
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', editingAddressFor)

      if (error) throw error

      // 로컬 상태 업데이트
      setParticipants(prev => prev.map(p =>
        p.id === editingAddressFor
          ? { ...p, ...updateData }
          : p
      ))

      setEditingAddressFor(null)
      alert('주소가 저장되었습니다.')
    } catch (error) {
      console.error('Error saving address:', error)
      alert('주소 저장에 실패했습니다: ' + error.message)
    } finally {
      setSavingAddress(false)
    }
  }

  // US/Japan 캠페인: 선택된 크리에이터 전체 가이드 생성
  const handleBulkGuideGeneration = async () => {
    if (selectedParticipants.length === 0) {
      alert('가이드를 생성할 크리에이터를 선택해주세요.')
      return
    }

    if (!confirm(`${selectedParticipants.length}명의 크리에이터에게 AI 가이드를 생성하시겠습니까?`)) {
      return
    }

    setIsGeneratingBulkGuides(true)
    setBulkGuideProgress({ current: 0, total: selectedParticipants.length })

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      alert('API 키가 설정되지 않았습니다.')
      setIsGeneratingBulkGuides(false)
      return
    }

    const isJapan = region === 'japan'
    const regionContext = isJapan
      ? `[일본 시장 특성]
- 일본 소비자의 라이프스타일에 맞게 작성
- 정중하고 세련된 표현 사용
- 제품의 섬세한 디테일과 품질 강조
- 미니멀하고 깔끔한 촬영 스타일`
      : `[미국 시장 특성]
- 미국 소비자의 라이프스타일에 맞게 작성
- 직접적이고 자신감 있는 표현 사용
- 실용적인 효과와 결과 강조
- 역동적이고 밝은 촬영 스타일`

    const productName = campaign?.product_name || campaign?.title || '제품'
    const brandName = campaign?.brand_name || campaign?.brand || '브랜드'
    const productInfo = campaign?.product_info || campaign?.description || campaign?.product_description || ''
    const category = campaign?.category || ''
    const guidelines = campaign?.guidelines || ''
    const dialogueSource = campaign?.required_dialogues || campaign?.required_dialogue || ''
    const reqDialogues = Array.isArray(dialogueSource) ? dialogueSource.join('\n- ') : dialogueSource
    const scenesSource = campaign?.required_scenes || ''
    const reqScenes = Array.isArray(scenesSource) ? scenesSource.join('\n- ') : scenesSource

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < selectedParticipants.length; i++) {
      const participantId = selectedParticipants[i]
      const participant = participants.find(p => p.id === participantId)

      if (!participant) continue

      setBulkGuideProgress({ current: i + 1, total: selectedParticipants.length })

      try {
        const prompt = `당신은 UGC 영상 촬영 가이드 전문가입니다.
${isJapan ? '일본' : '미국'} 시장을 타겟으로 10개의 촬영 씬 가이드를 작성해주세요.

⚠️ 중요: 모든 내용(scene_description, dialogue, shooting_tip)은 반드시 한국어로 작성!
대사(dialogue)도 한국어로 작성하세요. 번역은 별도로 진행됩니다.

[캠페인 정보]
- 제품명: ${productName}
- 브랜드: ${brandName}
- 카테고리: ${category}
- 제품 설명: ${productInfo}
${guidelines ? `- 가이드라인: ${guidelines}` : ''}

${regionContext}

${reqDialogues ? `[필수 대사 - 반드시 포함]\n- ${reqDialogues}` : ''}
${reqScenes ? `[필수 촬영장면 - 반드시 포함]\n- ${reqScenes}` : ''}

[핵심 요청사항]
1. ⚡ 첫 번째 씬은 반드시 "훅(Hook)" - 3초 내 시청자 관심 집중
2. 🔄 B&A(Before & After) 중심 구성
3. 📍 ${isJapan ? '일본' : '미국'} 라이프스타일 반영
4. 필수 대사/촬영장면 반드시 포함
5. 마지막 씬은 CTA로 마무리
6. ⚠️ 모든 텍스트는 한국어로 작성 (영어/일본어 X)

응답 형식 (JSON만):
{"scenes": [{"order": 1, "scene_type": "훅", "scene_description": "장면 설명 (한국어)", "dialogue": "대사 (한국어)", "shooting_tip": "촬영 팁 (한국어)"}]}
JSON만 출력.`

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
            })
          }
        )

        if (!response.ok) throw new Error(`API 오류: ${response.status}`)

        const data = await response.json()
        const responseText = data.candidates[0]?.content?.parts[0]?.text || ''
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)

        if (!jsonMatch) {
          console.error('[Bulk Guide] JSON 파싱 실패 - responseText:', responseText.substring(0, 500))
          throw new Error('JSON 파싱 실패')
        }

        const result = JSON.parse(jsonMatch[0])

        if (!result.scenes || !Array.isArray(result.scenes)) {
          console.error('[Bulk Guide] scenes 배열 없음 - result:', result)
          throw new Error('AI 응답에 scenes 배열이 없습니다')
        }

        // 자동 번역 - 영어(US) 또는 일본어(Japan)
        const targetLang = isJapan ? '일본어' : '영어'
        const translatePrompt = `다음 촬영 가이드의 각 항목을 ${targetLang}로 번역해주세요.
자연스럽고 현지화된 표현을 사용하세요.

번역할 내용:
${result.scenes.map((s, i) => `장면 ${i + 1}:
- 장면 설명: ${s.scene_description}
- 대사: ${s.dialogue}
- 촬영 팁: ${s.shooting_tip}`).join('\n\n')}

응답 형식 (JSON만):
{"translations": [{"scene_description": "번역된 장면 설명", "dialogue": "번역된 대사", "shooting_tip": "번역된 촬영 팁"}]}
JSON만 출력.`

        let translations = []
        try {
          const transResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: translatePrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
              })
            }
          )

          if (transResponse.ok) {
            const transData = await transResponse.json()
            const transText = transData.candidates[0]?.content?.parts[0]?.text || ''
            const transMatch = transText.match(/\{[\s\S]*\}/)
            if (transMatch) {
              const transResult = JSON.parse(transMatch[0])
              translations = transResult.translations || []
            }
          }
          console.log('[Bulk Guide] 번역 완료 - translations:', translations.length)
        } catch (transErr) {
          console.error('[Bulk Guide] 번역 실패:', transErr)
        }

        const guideData = {
          scenes: result.scenes.map((scene, idx) => ({
            order: idx + 1,
            scene_type: scene.scene_type || '',
            scene_description: scene.scene_description || '',
            scene_description_translated: translations[idx]?.scene_description || '',
            dialogue: scene.dialogue || '',
            dialogue_translated: translations[idx]?.dialogue || '',
            shooting_tip: scene.shooting_tip || '',
            shooting_tip_translated: translations[idx]?.shooting_tip || ''
          })),
          dialogue_style: 'natural',
          tempo: 'normal',
          mood: 'bright',
          target_language: isJapan ? 'japanese' : 'english',
          updated_at: new Date().toISOString()
        }

        console.log('[Bulk Guide] 저장 시작 - region:', region, 'participantId:', participantId)

        // US/Japan 캠페인은 API 사용 (RLS 우회)
        if (region === 'us' || region === 'japan') {
          const saveResponse = await fetch('/.netlify/functions/save-personalized-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              region: region,
              applicationId: participantId,
              guide: guideData
            })
          })

          const saveResult = await saveResponse.json()
          console.log('[Bulk Guide] 저장 결과:', saveResponse.ok, saveResult)

          if (!saveResponse.ok) {
            throw new Error(saveResult.error || saveResult.details || 'Failed to save guide')
          }
        } else {
          const { error } = await supabase
            .from('applications')
            .update({ personalized_guide: guideData })
            .eq('id', participantId)

          if (error) throw error
        }
        successCount++
        console.log('[Bulk Guide] 성공 - participant:', participant.applicant_name || participant.creator_name)
      } catch (err) {
        console.error(`[Bulk Guide] 실패 - ${participant.applicant_name || participant.creator_name}:`, err.message, err)
        failCount++
      }

      // Rate limiting - 2초 대기 (생성 + 번역으로 API 2회 호출)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setIsGeneratingBulkGuides(false)
    setBulkGuideProgress({ current: 0, total: 0 })
    setSelectedParticipants([])

    // Refresh data
    await fetchParticipants()

    alert(`가이드 생성 완료!\n성공: ${successCount}명\n실패: ${failCount}명`)
  }

  // US/Japan 캠페인: 선택된 크리에이터에게 가이드 이메일 일괄 발송
  const handleBulkGuideEmailSend = async () => {
    if (selectedParticipants.length === 0) {
      alert('가이드를 발송할 크리에이터를 선택해주세요.')
      return
    }

    // 선택된 크리에이터 중 가이드가 있는 크리에이터만 필터링
    const participantsWithGuide = participants.filter(p =>
      selectedParticipants.includes(p.id) && p.personalized_guide
    )

    if (participantsWithGuide.length === 0) {
      alert('선택된 크리에이터 중 가이드가 생성된 크리에이터가 없습니다.\n먼저 가이드를 생성해주세요.')
      return
    }

    // 이메일이 없는 크리에이터 확인
    const creatorsWithoutEmail = participantsWithGuide.filter(p => !p.email)
    if (creatorsWithoutEmail.length > 0) {
      const skipCount = creatorsWithoutEmail.length
      if (!confirm(`${participantsWithGuide.length}명 중 ${skipCount}명은 이메일이 없어 발송되지 않습니다.\n${participantsWithGuide.length - skipCount}명에게 가이드 이메일을 발송하시겠습니까?`)) {
        return
      }
    } else {
      if (!confirm(`${participantsWithGuide.length}명의 크리에이터에게 가이드 이메일을 발송하시겠습니까?`)) {
        return
      }
    }

    setSendingBulkGuideEmail(true)
    let successCount = 0
    let failCount = 0

    try {
      const isJapan = region === 'japan'
      const targetLanguageKey = isJapan ? 'labelJa' : 'labelEn'

      for (const participant of participantsWithGuide) {
        if (!participant.email) {
          failCount++
          continue
        }

        try {
          // personalized_guide 파싱
          const guide = typeof participant.personalized_guide === 'string'
            ? JSON.parse(participant.personalized_guide)
            : participant.personalized_guide

          // 가이드 내용 준비
          const guideContent = {
            campaign_title: campaign?.title || campaign?.product_name,
            brand_name: campaign?.brand_name || campaign?.brand,
            dialogue_style: guide.dialogue_style,
            tempo: guide.tempo,
            mood: guide.mood,
            scenes: (guide.scenes || []).map(scene => ({
              order: scene.order,
              scene_type: scene.scene_type,
              scene_description: scene.scene_description_translated || scene.scene_description,
              dialogue: scene.dialogue_translated || scene.dialogue,
              shooting_tip: scene.shooting_tip_translated || scene.shooting_tip
            })),
            required_dialogues: guide.required_dialogues || [],
            required_scenes: guide.required_scenes || []
          }

          const response = await fetch('/.netlify/functions/send-scene-guide-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: id,
              region,
              guide_content: guideContent,
              creators: [{
                id: participant.id,
                name: participant.applicant_name || participant.creator_name,
                email: participant.email
              }]
            })
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
            console.error(`Email failed for ${participant.email}:`, await response.text())
          }
        } catch (err) {
          failCount++
          console.error(`Error sending email to ${participant.email}:`, err)
        }
      }

      if (successCount > 0) {
        alert(`가이드 이메일 발송 완료!\n성공: ${successCount}명\n실패: ${failCount}명`)
      } else {
        alert('가이드 이메일 발송에 실패했습니다.')
      }
    } catch (error) {
      console.error('Bulk email error:', error)
      alert('이메일 발송 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setSendingBulkGuideEmail(false)
    }
  }

  // US 캠페인: 배송정보 요청 이메일 발송
  const handleRequestShippingInfo = async () => {
    if (participants.length === 0) {
      alert('선정된 크리에이터가 없습니다.')
      return
    }

    // 체크박스로 선택한 크리에이터가 없으면 알림
    if (selectedParticipants.length === 0) {
      alert('배송정보 요청을 보낼 크리에이터를 체크박스로 선택해주세요.')
      return
    }

    // 선택한 크리에이터 중 주소/연락처가 없는 크리에이터만 필터링
    const selectedCreators = participants.filter(p => selectedParticipants.includes(p.id))
    const creatorsWithoutShipping = selectedCreators.filter(p =>
      !p.phone_number || !p.address
    )

    if (creatorsWithoutShipping.length === 0) {
      alert('선택한 크리에이터가 모두 이미 배송정보를 입력했습니다.')
      return
    }

    if (!confirm(`${creatorsWithoutShipping.length}명의 크리에이터에게 배송정보 입력 요청 이메일을 발송하시겠습니까?`)) {
      return
    }

    setRequestingShippingInfo(true)
    try {
      const { data: { session } } = await supabaseBiz.auth.getSession()
      if (!session?.access_token) {
        throw new Error('로그인이 필요합니다')
      }

      const response = await fetch('/.netlify/functions/request-us-shipping-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          application_ids: creatorsWithoutShipping.map(p => p.id),
          campaign_id: id
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(result.message)
      } else {
        throw new Error(result.error || 'Failed to send emails')
      }
    } catch (error) {
      console.error('Error requesting shipping info:', error)
      alert('이메일 발송에 실패했습니다: ' + error.message)
    } finally {
      setRequestingShippingInfo(false)
    }
  }

  // 배송 정보 엑셀 다운로드 (지역별 현지화)
  const exportShippingInfo = () => {
    // 지역별 헤더 설정
    const headers = {
      korea: {
        name: '크리에이터명',
        platform: '플랫폼',
        phone: '연락처',
        postal: '우편번호',
        address: '주소',
        detail: '상세주소',
        notes: '배송시 요청사항',
        courier: '택배사',
        tracking: '송장번호',
        status: '상태',
        deadline: '마감일'
      },
      japan: {
        name: 'クリエイター名',
        platform: 'プラットフォーム',
        phone: '電話番号',
        postal: '郵便番号',
        address: '住所',
        detail: '建物名・部屋番号',
        notes: '配送備考',
        courier: '配送業者',
        tracking: '送り状番号',
        status: 'ステータス',
        deadline: '締切日'
      },
      usa: {
        name: 'Creator Name',
        platform: 'Platform',
        phone: 'Phone',
        postal: 'ZIP Code',
        address: 'Address',
        detail: 'Apt/Suite',
        notes: 'Delivery Notes',
        courier: 'Carrier',
        tracking: 'Tracking Number',
        status: 'Status',
        deadline: 'Deadline'
      }
    }

    const h = headers[region] || headers.korea

    const data = participants.map(p => ({
      [h.name]: p.creator_name || p.applicant_name || '',
      [h.platform]: p.creator_platform || p.main_channel || p.platform || '',
      [h.phone]: p.phone_number || p.creator_phone || p.phone || '',
      [h.postal]: p.postal_code || '',
      [h.address]: p.address || p.shipping_address || '',
      [h.detail]: p.detail_address || '',
      [h.notes]: p.delivery_notes || p.delivery_request || '',
      [h.courier]: p.shipping_company || '',
      [h.tracking]: p.tracking_number || '',
      [h.status]: getStatusLabel(p.status || 'selected'),
      [h.deadline]: p.submission_deadline || campaign.content_submission_deadline || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 18 }, // 크리에이터명
      { wch: 12 }, // 플랫폼
      { wch: 15 }, // 연락처
      { wch: 10 }, // 우편번호
      { wch: 45 }, // 주소
      { wch: 20 }, // 상세주소
      { wch: 25 }, // 배송시 요청사항
      { wch: 15 }, // 택배사
      { wch: 20 }, // 송장번호
      { wch: 12 }, // 상태
      { wch: 12 }  // 마감일
    ]

    const sheetName = region === 'japan' ? '配送情報' : region === 'usa' ? 'Shipping_Info' : '크리에이터_배송정보'
    const fileName = region === 'japan'
      ? `${campaign.title}_配送情報.xlsx`
      : region === 'usa'
        ? `${campaign.title}_Shipping_Info.xlsx`
        : `${campaign.title}_크리에이터_배송정보.xlsx`

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, fileName)
  }

  // 상태 레이블 헬퍼
  const getStatusLabel = (status) => {
    const labels = {
      selected: '가이드 확인중',
      guide_confirmation: '가이드 확인중',
      filming: '촬영중',
      revision_requested: '수정 요청',
      video_submitted: '영상 제출',
      approved: '승인 완료',
      completed: '완료',
      rejected: '거부'
    }
    return labels[status] || status
  }

  // 송장번호 템플릿 다운로드 (지역별 현지화)
  const downloadTrackingTemplate = () => {
    const headers = {
      korea: { name: '크리에이터명', tracking: '송장번호', courier: '택배사' },
      japan: { name: 'クリエイター名', tracking: '送り状番号', courier: '配送業者' },
      usa: { name: 'Creator Name', tracking: 'Tracking Number', courier: 'Carrier' }
    }

    const h = headers[region] || headers.korea

    const data = participants.map(p => ({
      [h.name]: p.creator_name || p.applicant_name || (region === 'japan' ? '名前なし' : region === 'usa' ? 'No Name' : '이름 없음'),
      [h.courier]: p.shipping_company || '',
      [h.tracking]: p.tracking_number || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 25 }]

    const sheetName = region === 'japan' ? '送り状番号' : region === 'usa' ? 'Tracking' : '송장번호'
    const fileName = region === 'japan'
      ? `${campaign.title}_送り状番号_テンプレート.xlsx`
      : region === 'usa'
        ? `${campaign.title}_Tracking_Template.xlsx`
        : `${campaign.title}_송장번호_템플릿.xlsx`

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, fileName)
  }

  // 송장번호 엑셀 업로드 (지역별 현지화 지원)
  const uploadTrackingNumbers = async (file) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      console.log('[DEBUG] Uploaded tracking data:', jsonData)
      console.log('[DEBUG] Current participants:', participants.map(p => ({
        id: p.id,
        creator_name: p.creator_name,
        applicant_name: p.applicant_name
      })))

      // 지역별 컬럼명 매핑 (여러 언어 지원)
      const nameKeys = ['크리에이터명', 'クリエイター名', 'Creator Name', 'Name', 'name']
      const trackingKeys = ['송장번호', '送り状番号', 'Tracking Number', 'Tracking', 'tracking']
      const courierKeys = ['택배사', '配送業者', 'Carrier', 'courier']

      let successCount = 0
      let failCount = 0

      for (const row of jsonData) {
        // 여러 가능한 키로 값 찾기
        const creatorName = nameKeys.reduce((val, key) => val || row[key], null)
        const trackingNumber = trackingKeys.reduce((val, key) => val || row[key], null)
        const courier = courierKeys.reduce((val, key) => val || row[key], null)

        console.log('[DEBUG] Processing row:', { creatorName, trackingNumber, courier })

        if (!creatorName || !trackingNumber) {
          console.log('[DEBUG] Skipping row - missing name or tracking number')
          continue
        }

        const participant = participants.find(p =>
          p.creator_name === creatorName || p.applicant_name === creatorName
        )
        console.log('[DEBUG] Found participant:', participant)

        if (!participant) {
          console.log('[DEBUG] No matching participant found for:', creatorName)
          failCount++
          continue
        }

        try {
          const updateData = { tracking_number: trackingNumber }
          if (courier) {
            updateData.shipping_company = courier
          }

          const { error } = await supabase
            .from('applications')
            .update(updateData)
            .eq('id', participant.id)

          if (error) {
            console.error(`[ERROR] Failed to update tracking for ${creatorName}:`, error)
            failCount++
          } else {
            console.log(`[SUCCESS] Updated tracking for ${creatorName}`)
            successCount++
          }
        } catch (error) {
          console.error(`[ERROR] Exception updating ${creatorName}:`, error)
          failCount++
        }
      }

      await fetchParticipants()

      // 지역별 메시지
      const messages = {
        korea: `송장번호 업로드 완료!\n성공: ${successCount}건\n실패: ${failCount}건`,
        japan: `送り状番号アップロード完了!\n成功: ${successCount}件\n失敗: ${failCount}件`,
        usa: `Tracking upload complete!\nSuccess: ${successCount}\nFailed: ${failCount}`
      }
      alert(messages[region] || messages.korea)
    } catch (error) {
      console.error('Error uploading tracking numbers:', error)
      const errorMessages = {
        korea: '송장번호 업로드에 실패했습니다: ',
        japan: '送り状番号のアップロードに失敗しました: ',
        usa: 'Failed to upload tracking numbers: '
      }
      alert((errorMessages[region] || errorMessages.korea) + error.message)
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

      // US 캠페인은 API 사용 (RLS 우회)
      if (region === 'us') {
        await callUSCampaignAPI('virtual_select', id, applicationId, updateData)
      } else {
        const { error } = await supabase
          .from('applications')
          .update(updateData)
          .eq('id', applicationId)

        if (error) throw error
      }

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
      alert('가상 선정 처리에 실패했습니다: ' + error.message)
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

      // US 캠페인은 API 사용 (RLS 우회)
      if (region === 'us') {
        await callUSCampaignAPI('confirm_selection', id, null, {
          application_ids: toAdd.map(app => app.id)
        })
      } else {
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
      }

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
      // applications 상태를 pending으로 변경 (삭제하지 않고 상태만 변경)
      // US 캠페인은 API 사용 (RLS 우회)
      if (region === 'us') {
        await callUSCampaignAPI('cancel_selection', id, cancellingApp.id, {})
      } else {
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            status: 'pending',
            virtual_selected: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', cancellingApp.id)

        if (updateError) throw updateError
      }

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
              updated_at: new Date().toISOString()
            })
            .eq('id', participant.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          // 크리에이터에게 알림 발송
          // user_id와 phone, email 정보 가져오기
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('phone, email')
            .eq('id', participant.user_id)
            .maybeSingle()

          const creatorName = participant.creator_name || participant.applicant_name || '크리에이터'

          // 주차별 마감일 처리
          let deadlineText = ''
          if (campaign.campaign_type === '4week_challenge') {
            const weekDeadlineField = `week${weekNumber}_deadline`
            const weekDeadline = campaign[weekDeadlineField]
            deadlineText = weekDeadline ? new Date(weekDeadline).toLocaleDateString('ko-KR') : '미정'
          } else if (campaign.campaign_type === 'oliveyoung_sale' || campaign.campaign_type === 'oliveyoung') {
            deadlineText = campaign.step1_deadline ? new Date(campaign.step1_deadline).toLocaleDateString('ko-KR') : '미정'
          } else {
            // 기획형: content_submission_deadline → start_date fallback
            const regularDeadline = campaign.content_submission_deadline || campaign.start_date
            deadlineText = regularDeadline ? new Date(regularDeadline).toLocaleDateString('ko-KR') : '미정'
          }

          // 팝빌 알림톡 발송
          if (profile?.phone) {
            try {
              await fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: profile.phone,
                  receiverName: creatorName,
                  templateCode: '025100001012',
                  variables: {
                    '크리에이터명': creatorName,
                    '캠페인명': campaign.title,
                    '제출기한': deadlineText
                  }
                })
              })
            } catch (alimtalkError) {
              console.error('Alimtalk error:', alimtalkError)
            }
          }

          // 이메일 발송 (가이드 전달)
          if (profile?.email) {
            try {
              await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: profile.email,
                  subject: `[CNEC] 캠페인 가이드가 전달되었습니다 - ${campaign.title}`,
                  html: `
                    <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #3B82F6;">캠페인 가이드가 전달되었습니다!</h2>
                      <p>안녕하세요, <strong>${creatorName}</strong>님!</p>
                      <p>참여하신 캠페인의 촬영 가이드가 전달되었습니다.</p>
                      <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                        <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign.title}</p>
                        <p style="margin: 5px 0;"><strong>제출 기한:</strong> ${deadlineText}</p>
                      </div>
                      <p>가이드를 확인하시고 기한 내에 콘텐츠를 제출해 주세요.</p>
                      <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀</p>
                    </div>
                  `
                })
              })
            } catch (emailError) {
              console.error('가이드 전달 이메일 발송 실패:', emailError)
            }
          }

          successCount++
        } catch (error) {
          console.error(`Error delivering guide to ${creatorName}:`, error)
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

  // 4주 챌린지 개별 주차 가이드 전달 함수
  const handleDeliver4WeekGuideByWeek = async (weekNumber) => {
    if (!campaign.challenge_weekly_guides_ai) {
      alert('먼저 가이드를 생성해주세요.')
      return
    }

    const participantCount = participants.length
    if (participantCount === 0) {
      alert('참여 크리에이터가 없습니다.')
      return
    }

    // 개별 메시지 입력 (선택사항)
    const individualMessage = prompt(`${weekNumber}주차 가이드와 함께 전달할 메시지를 입력하세요 (선택사항):`)

    if (!confirm(`모든 참여 크리에이터(${participantCount}명)에게 ${weekNumber}주차 가이드를 전달하시겠습니까?`)) {
      return
    }

    try {
      let successCount = 0
      let errorCount = 0

      for (const participant of participants) {
        try {
          // 재전달 여부 확인 (personalized_guide가 있으면 재전달)
          const isRedelivery = !!participant.personalized_guide
          const creatorName = participant.creator_name || participant.applicant_name || '크리에이터'

          // 가이드 전달 상태 업데이트
          const updateData = {
            status: 'filming',
            updated_at: new Date().toISOString()
          }

          // 개별 메시지가 있으면 추가
          let message = `${weekNumber}주차 가이드`
          if (individualMessage && individualMessage.trim()) {
            message += `\n\n${individualMessage.trim()}`
          }
          updateData.additional_message = message

          const { error: updateError } = await supabase
            .from('applications')
            .update(updateData)
            .eq('id', participant.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          // 크리에이터에게 알림 발송
          // user_id와 phone 정보 가져오기
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('phone')
            .eq('id', participant.user_id)
            .maybeSingle()

          // 주차별 마감일 처리
          let deadlineText = ''
          if (campaign.campaign_type === '4week_challenge') {
            const weekDeadlineField = `week${weekNumber}_deadline`
            const weekDeadline = campaign[weekDeadlineField]
            deadlineText = weekDeadline ? new Date(weekDeadline).toLocaleDateString('ko-KR') : '미정'
          } else if (campaign.campaign_type === 'oliveyoung_sale' || campaign.campaign_type === 'oliveyoung') {
            deadlineText = campaign.step1_deadline ? new Date(campaign.step1_deadline).toLocaleDateString('ko-KR') : '미정'
          } else {
            const regularDeadline = campaign.content_submission_deadline || campaign.start_date
            deadlineText = regularDeadline ? new Date(regularDeadline).toLocaleDateString('ko-KR') : '미정'
          }

          // 알림톡용 캠페인명 (재전달 표시 포함)
          const campaignNameForNotification = isRedelivery
            ? `[재전달] ${campaign.title} ${weekNumber}주차`
            : `${campaign.title} ${weekNumber}주차`

          // 팝빌 알림톡 발송
          if (profile?.phone) {
            try {
              await fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: profile.phone,
                  receiverName: creatorName,
                  templateCode: '025100001012',
                  variables: {
                    '크리에이터명': creatorName,
                    '캠페인명': campaignNameForNotification,
                    '제출기한': deadlineText
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
                subject: isRedelivery
                  ? `[CNEC] ${campaign.title} ${weekNumber}주차 가이드 재전달`
                  : `[CNEC] ${campaign.title} ${weekNumber}주차 가이드 전달`,
                html: `
                  <h2>${creatorName}님, ${weekNumber}주차 촬영 가이드가 ${isRedelivery ? '재전달' : '전달'}되었습니다.</h2>
                  ${isRedelivery ? '<p style="color: #EF4444; font-weight: bold;">※ 이전 가이드가 수정되었습니다. 새 가이드를 반드시 확인해 주세요.</p>' : ''}
                  <p><strong>캠페인:</strong> ${campaign.title}</p>
                  <p><strong>주차:</strong> ${weekNumber}주차</p>
                  <p><strong>영상 제출 기한:</strong> ${deadlineText}</p>
                  <p>크리에이터 대시보드에서 ${weekNumber}주차 가이드를 확인하시고, 가이드에 따라 촬영을 진행해 주세요.</p>
                  ${individualMessage && individualMessage.trim() ? `<p><strong>추가 메시지:</strong> ${individualMessage.trim()}</p>` : ''}
                  <p>기한 내 미제출 시 패널티가 부과될 수 있습니다.</p>
                  <p>문의: 1833-6025</p>
                `
              })
            })
          } catch (emailError) {
            console.error('Email error:', emailError)
          }

          successCount++
        } catch (error) {
          console.error(`Error delivering guide to ${(participant.creator_name || participant.applicant_name || '크리에이터')}:`, error)
          errorCount++
        }
      }

      if (errorCount === 0) {
        alert(`${successCount}명의 크리에이터에게 ${weekNumber}주차 가이드가 성공적으로 전달되었습니다!`)
      } else {
        alert(`${successCount}명 성공, ${errorCount}명 실패했습니다.`)
      }

      // 데이터 새로고침
      await fetchParticipants()
    } catch (error) {
      console.error('Error in handleDeliver4WeekGuideByWeek:', error)
      alert('가이드 전달에 실패했습니다: ' + error.message)
    }
  }

  // 올리브영 / 4주 챌린지 가이드 전달 함수
  const handleDeliverOliveYoung4WeekGuide = async () => {
    const hasGuide = campaign.campaign_type === 'oliveyoung_sale' 
      ? (campaign.oliveyoung_step1_guide_ai || campaign.oliveyoung_step2_guide_ai || campaign.oliveyoung_step3_guide_ai)
      : campaign.challenge_weekly_guides_ai

    if (!hasGuide) {
      alert('먼저 가이드를 생성해주세요.')
      return
    }

    const participantCount = participants.length
    if (participantCount === 0) {
      alert('참여 크리에이터가 없습니다.')
      return
    }

    // 개별 메시지 입력 (선택사항)
    const individualMessage = prompt('모든 크리에이터에게 전달할 개별 메시지를 입력하세요 (선택사항):')

    if (!confirm(`모든 참여 크리에이터(${participantCount}명)에게 가이드를 전달하시겠습니까?`)) {
      return
    }

    try {
      let successCount = 0
      let errorCount = 0

      for (const participant of participants) {
        try {
          // 가이드 전달 상태 업데이트
          const updateData = { 
            status: 'filming',
            updated_at: new Date().toISOString()
          }
          
          // 개별 메시지가 있으면 추가
          if (individualMessage && individualMessage.trim()) {
            updateData.additional_message = individualMessage.trim()
          }

          const { error: updateError } = await supabase
            .from('applications')
            .update(updateData)
            .eq('id', participant.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          // 크리에이터에게 알림 발송
          // user_id와 phone, email 정보 가져오기
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('phone, email')
            .eq('id', participant.user_id)
            .maybeSingle()

          const creatorName = participant.creator_name || participant.applicant_name || '크리에이터'

          // 주차별 마감일 처리
          let deadlineText = ''
          if (campaign.campaign_type === '4week_challenge') {
            const weekDeadlineField = `week${weekNumber}_deadline`
            const weekDeadline = campaign[weekDeadlineField]
            deadlineText = weekDeadline ? new Date(weekDeadline).toLocaleDateString('ko-KR') : '미정'
          } else if (campaign.campaign_type === 'oliveyoung_sale' || campaign.campaign_type === 'oliveyoung') {
            deadlineText = campaign.step1_deadline ? new Date(campaign.step1_deadline).toLocaleDateString('ko-KR') : '미정'
          } else {
            // 기획형: content_submission_deadline → start_date fallback
            const regularDeadline = campaign.content_submission_deadline || campaign.start_date
            deadlineText = regularDeadline ? new Date(regularDeadline).toLocaleDateString('ko-KR') : '미정'
          }

          // 팝빌 알림톡 발송
          if (profile?.phone) {
            try {
              await fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: profile.phone,
                  receiverName: creatorName,
                  templateCode: '025100001012',
                  variables: {
                    '크리에이터명': creatorName,
                    '캠페인명': campaign.title,
                    '제출기한': deadlineText
                  }
                })
              })
            } catch (alimtalkError) {
              console.error('Alimtalk error:', alimtalkError)
            }
          }

          // 이메일 발송 (가이드 전달)
          if (profile?.email) {
            try {
              await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: profile.email,
                  subject: `[CNEC] 캠페인 가이드가 전달되었습니다 - ${campaign.title}`,
                  html: `
                    <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #3B82F6;">캠페인 가이드가 전달되었습니다!</h2>
                      <p>안녕하세요, <strong>${creatorName}</strong>님!</p>
                      <p>참여하신 캠페인의 촬영 가이드가 전달되었습니다.</p>
                      <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                        <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign.title}</p>
                        <p style="margin: 5px 0;"><strong>제출 기한:</strong> ${deadlineText}</p>
                      </div>
                      <p>가이드를 확인하시고 기한 내에 콘텐츠를 제출해 주세요.</p>
                      <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀</p>
                    </div>
                  `
                })
              })
            } catch (emailError) {
              console.error('가이드 전달 이메일 발송 실패:', emailError)
            }
          }

          successCount++
        } catch (error) {
          console.error(`Error delivering guide to ${creatorName}:`, error)
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
      console.error('Error in handleDeliverOliveYoung4WeekGuide:', error)
      alert('가이드 전달에 실패했습니다: ' + error.message)
    }
  }

  // 올영 가이드 개별 전달 함수
  const handleDeliverOliveYoungGuide = async () => {
    const hasGuide = campaign.oliveyoung_step1_guide_ai ||
                     campaign.step1_external_url ||
                     campaign.step1_external_file_url

    if (!hasGuide) {
      alert('먼저 가이드를 생성해주세요.')
      return
    }

    try {
      // Netlify 함수 호출로 가이드 전달 + 알림톡 발송
      const response = await fetch('/.netlify/functions/deliver-oliveyoung-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          region: region
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '가이드 전달에 실패했습니다.')
      }

      if (result.errorCount === 0) {
        alert(`${result.successCount}명의 크리에이터에게 올영 가이드가 성공적으로 전달되었습니다!`)
      } else {
        alert(`${result.successCount}명 성공, ${result.errorCount}명 실패했습니다.`)
      }

      // 데이터 새로고침
      await fetchParticipants()
    } catch (error) {
      console.error('Error in handleDeliverOliveYoungGuide:', error)
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

    setIsGeneratingAllGuides(true)
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
                product_key_points: campaign.product_key_points || campaign.key_message || '',
                video_duration: campaign.video_duration
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
    } finally {
      setIsGeneratingAllGuides(false)
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

          // 이미 영상 제출 이후 단계인 경우 건너뛰기 (재전달은 허용)
          if (['video_submitted', 'revision_requested', 'approved', 'completed'].includes(participant.status)) {
            console.log(`Participant ${(participant.creator_name || participant.applicant_name || '크리에이터')} already in ${participant.status} status, skipping guide delivery`)
            errorCount++
            continue
          }
          
          // 가이드 재전달 로그
          if (participant.personalized_guide) {
            console.log(`[RE-DELIVERY] Sending guide again to ${(participant.creator_name || participant.applicant_name || '크리에이터')}`)
          }

          // 가이드 전달 상태 업데이트 및 촬영중으로 변경
          console.log('[DEBUG] Updating application status to filming:', participantId)

          // 재전달인 경우 상태를 변경하지 않음
          const updatePayload = {
            updated_at: new Date().toISOString()
          }
          if (participant.status !== 'filming') {
            updatePayload.status = 'filming'
          }
          
          const { data: updateData, error: updateError } = await supabase
            .from('applications')
            .update(updatePayload)
            .eq('id', participantId)
            .select()
          
          if (updateError) {
            console.error('[ERROR] Failed to update application status:')
            console.error('Error code:', updateError.code)
            console.error('Error message:', updateError.message)
            console.error('Error details:', updateError.details)
            console.error('Error hint:', updateError.hint)
            console.error('Full error:', JSON.stringify(updateError, null, 2))
            throw updateError
          }
          console.log('[DEBUG] Successfully updated application status:', updateData)

          // user_id와 phone, email 정보 가져오기
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('phone, email')
            .eq('id', participant.user_id)
            .maybeSingle()

          const creatorName = participant.creator_name || participant.applicant_name || '크리에이터'

          // 캠페인 타입별 마감일 처리
          let deadlineText = '미정'
          if (campaign.campaign_type === '4week_challenge') {
            // 4주 챌린지: 각 주차별 마감일
            const deadlines = [
              campaign.week1_deadline ? `1주: ${new Date(campaign.week1_deadline).toLocaleDateString('ko-KR')}` : null,
              campaign.week2_deadline ? `2주: ${new Date(campaign.week2_deadline).toLocaleDateString('ko-KR')}` : null,
              campaign.week3_deadline ? `3주: ${new Date(campaign.week3_deadline).toLocaleDateString('ko-KR')}` : null,
              campaign.week4_deadline ? `4주: ${new Date(campaign.week4_deadline).toLocaleDateString('ko-KR')}` : null
            ].filter(Boolean)
            deadlineText = deadlines.length > 0 ? deadlines.join(', ') : '미정'
          } else if (campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale') {
            // 올영: STEP별 마감일
            const deadlines = [
              campaign.step1_deadline ? `1차: ${new Date(campaign.step1_deadline).toLocaleDateString('ko-KR')}` : null,
              campaign.step2_deadline ? `2차: ${new Date(campaign.step2_deadline).toLocaleDateString('ko-KR')}` : null
            ].filter(Boolean)
            deadlineText = deadlines.length > 0 ? deadlines.join(', ') : '미정'
          } else {
            // 기획형: content_submission_deadline → start_date fallback
            const regularDeadline = campaign.content_submission_deadline || campaign.start_date
            deadlineText = regularDeadline ? new Date(regularDeadline).toLocaleDateString('ko-KR') : '미정'
          }

          // 재전달 여부 확인 (이미 filming 상태인 경우 = 이전에 가이드를 전달받은 적 있음)
          const isRedelivery = participant.status === 'filming'
          const campaignNameForNotification = isRedelivery ? `[재전달] ${campaign.title}` : campaign.title

          // 팝빌 알림톡 발송
          if (profile?.phone) {
              try {
                await fetch('/.netlify/functions/send-kakao-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    receiverNum: profile.phone,
                    receiverName: creatorName,
                    templateCode: '025100001012',
                    variables: {
                      '크리에이터명': creatorName,
                      '캠페인명': campaignNameForNotification,
                      '제출기한': deadlineText
                    }
                  })
                })
              } catch (alimtalkError) {
                console.error('Alimtalk error:', alimtalkError)
              }
          }

          // 이메일 발송
          const emailTo = profile?.email || participant.creator_email
          if (emailTo) {
            try {
              await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: emailTo,
                  subject: isRedelivery
                    ? `[CNEC] 캠페인 가이드가 재전달되었습니다 - ${campaign.title}`
                    : `[CNEC] 캠페인 가이드가 전달되었습니다 - ${campaign.title}`,
                  html: `
                    <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #3B82F6;">캠페인 가이드가 ${isRedelivery ? '재전달' : '전달'}되었습니다!</h2>
                      <p>안녕하세요, <strong>${creatorName}</strong>님!</p>
                      <p>참여하신 캠페인의 촬영 가이드가 ${isRedelivery ? '재전달' : '전달'}되었습니다.</p>
                      ${isRedelivery ? '<p style="color: #EF4444; font-weight: bold;">※ 이전 가이드가 수정되었습니다. 새 가이드를 반드시 확인해 주세요.</p>' : ''}
                      <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                        <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign.title}</p>
                        <p style="margin: 5px 0;"><strong>제출 기한:</strong> ${deadlineText}</p>
                      </div>
                      <p>가이드를 확인하시고 기한 내에 콘텐츠를 제출해 주세요.</p>
                      <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀</p>
                    </div>
                  `
                })
              })
            } catch (emailError) {
              console.error('Email error:', emailError)
            }
          }

          successCount++
        } catch (error) {
          console.error(`Error approving guide for participant ${participantId}:`)
          console.error('Error type:', typeof error)
          console.error('Error message:', error?.message)
          console.error('Error code:', error?.code)
          console.error('Full error object:', JSON.stringify(error, null, 2))
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
  
  // 영상 검수 완료 (포인트 지급 없음 - 최종 확정 시 지급)
  const handleVideoApproval = async (submission, customUploadDeadline = null) => {
    try {
      const videoClient = supabaseKorea || supabaseBiz

      // 업로드 기한 입력받기 (customUploadDeadline이 없으면 prompt)
      const inputDeadline = customUploadDeadline || prompt(
        '업로드 기한을 입력해주세요.\n(예: 2024년 1월 15일, 승인 후 3일 이내)',
        '승인 완료 후 1일 이내'
      )

      if (!inputDeadline) {
        alert('업로드 기한을 입력해주세요.')
        return
      }

      // 1. video_submissions 상태 업데이트 (approved로 변경)
      const { error: videoError } = await supabase
        .from('video_submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submission.id)

      if (videoError) throw videoError

      // 다중 영상 캠페인 타입 체크
      const is4WeekChallenge = campaign.campaign_type === '4week_challenge'
      const isOliveyoung = campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale'
      const isMultiVideoChallenge = is4WeekChallenge || isOliveyoung
      const requiredVideos = is4WeekChallenge ? [1, 2, 3, 4] : isOliveyoung ? [1, 2] : [1]

      let allVideosApproved = false
      let currentWeek = submission.week_number || 1

      if (isMultiVideoChallenge) {
        const { data: allSubmissions } = await videoClient
          .from('video_submissions')
          .select('week_number, status')
          .eq('application_id', submission.application_id)
          .eq('campaign_id', campaign.id)

        if (allSubmissions) {
          const weekStatuses = {}
          allSubmissions.forEach(sub => {
            if (sub.week_number === currentWeek) {
              weekStatuses[sub.week_number] = 'approved'
            } else {
              weekStatuses[sub.week_number] = sub.status
            }
          })
          allVideosApproved = requiredVideos.every(week => weekStatuses[week] === 'approved')
        }
      }

      // 2. applications 상태를 approved로 (completed가 아닌 approved - 최종 확정 대기)
      if (!isMultiVideoChallenge || allVideosApproved) {
        await supabase
          .from('applications')
          .update({
            status: 'approved',
            upload_deadline: inputDeadline
          })
          .eq('id', submission.application_id)
      }

      // 3. 크리에이터에게 영상 승인 완료 알림톡 발송
      const participant = participants.find(p => p.user_id === submission.user_id)
      if (participant) {
        // 먼저 applications 테이블에서 직접 phone_number 확인 (한국 캠페인용)
        let phone = participant.phone_number || participant.phone
        let email = participant.email
        let creatorName = participant.creator_name || participant.applicant_name || '크리에이터'

        // applications에 전화번호가 없으면 user_profiles에서 조회
        if (!phone && participant.user_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('phone, email, full_name')
            .eq('id', participant.user_id)
            .single()

          if (profile) {
            phone = profile.phone
            email = email || profile.email
            creatorName = profile.full_name || creatorName
          }
        }

        console.log('알림톡 발송 정보:', { phone, email, creatorName, source: participant.phone_number ? 'applications' : 'user_profiles' })

        if (phone) {
          try {
            console.log('알림톡 발송 시도:', { phone, creatorName, campaign: campaign?.title, deadline: inputDeadline })
            const kakaoResponse = await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: phone.replace(/-/g, ''),
                receiverName: creatorName,
                templateCode: '025100001017',
                variables: {
                  '크리에이터명': creatorName,
                  '캠페인명': campaign?.title || '캠페인',
                  '업로드기한': inputDeadline
                }
              })
            })
            const kakaoResult = await kakaoResponse.json()
            console.log('✓ 영상 승인 완료 알림톡 응답:', kakaoResult)
            if (!kakaoResponse.ok || !kakaoResult.success) {
              console.error('알림톡 발송 실패 응답:', kakaoResult)
              // 상세 오류 표시
              const errorMsg = kakaoResult.errorDescription || kakaoResult.error || '알 수 없는 오류'
              console.error(`알림톡 오류: ${errorMsg}`, kakaoResult.debug || {})
            }
          } catch (kakaoError) {
            console.error('알림톡 발송 실패:', kakaoError)
          }
        } else {
          console.log('알림톡 발송 스킵 - 전화번호 없음:', { user_id: participant?.user_id, phone_number: participant?.phone_number, phone: participant?.phone })
        }

        // 이메일 발송
        if (email) {
          try {
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: email,
                subject: `[CNEC] 영상 검수 완료 - ${campaign?.title || '캠페인'}`,
                html: `
                  <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10B981;">영상이 최종 승인되었습니다!</h2>
                    <p>안녕하세요, <strong>${creatorName}</strong>님!</p>
                    <p>참여하신 캠페인의 영상이 최종 승인되었습니다. 이제 SNS에 영상을 업로드해 주세요.</p>
                    <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                      <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign?.title || '캠페인'}</p>
                      <p style="margin: 5px 0;"><strong>업로드 기한:</strong> ${inputDeadline}</p>
                    </div>
                    <p>업로드 완료 후, 크리에이터 대시보드에서 업로드 링크를 등록해 주세요.</p>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀</p>
                  </div>
                `
              })
            })
            console.log('✓ 영상 승인 완료 이메일 발송 성공')
          } catch (emailError) {
            console.error('영상 승인 이메일 발송 실패:', emailError)
          }
        }

        // 네이버 웍스 알림 (검수 완료)
        try {
          await fetch('/.netlify/functions/send-naver-works-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
              message: `[영상 검수 완료]\n\n캠페인: ${campaign?.title || '캠페인'}\n크리에이터: ${creatorName}\n업로드 기한: ${inputDeadline}\n\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
            })
          })
          console.log('✓ 검수 완료 네이버 웍스 알림 발송 성공')
        } catch (worksError) {
          console.error('네이버 웍스 알림 발송 실패:', worksError)
        }
      } else {
        console.log('알림톡 발송 스킵 - 참가자 없음:', submission.user_id)
      }

      await fetchVideoSubmissions()
      await fetchParticipants()

      // 알림 메시지 (포인트 금액 표시 안함)
      if (isMultiVideoChallenge) {
        const videoLabel = is4WeekChallenge ? `${currentWeek}주차` : `${currentWeek}번째`
        const totalVideos = is4WeekChallenge ? 4 : 2
        if (allVideosApproved) {
          alert(`${videoLabel} 영상이 승인되었습니다.\n\n크리에이터에게 알림톡이 발송되었습니다.\n업로드 기한: ${inputDeadline}\n\nSNS 업로드를 확인한 후 '최종 확정' 버튼을 눌러주세요.`)
        } else {
          alert(`${videoLabel} 영상이 승인되었습니다.\n\n크리에이터에게 알림톡이 발송되었습니다.\n업로드 기한: ${inputDeadline}\n\n(${totalVideos}개 영상 모두 승인 후 최종 확정이 가능합니다)`)
        }
      } else {
        alert(`영상이 승인되었습니다.\n\n크리에이터에게 알림톡이 발송되었습니다.\n업로드 기한: ${inputDeadline}\n\nSNS 업로드를 확인한 후 '최종 확정' 버튼을 눌러주세요.`)
      }
    } catch (error) {
      console.error('Error approving video:', error)
      alert('영상 승인에 실패했습니다: ' + error.message)
    }
  }

  // 최종 확정 및 포인트 지급 (SNS 업로드 확인 후)
  // skipPointPayment: 멀티비디오 캠페인에서 마지막 영상이 아닌 경우 true
  const handleFinalConfirmation = async (submission, skipPointPayment = false) => {
    try {
      const videoClient = supabaseKorea || supabaseBiz
      const pointAmount = campaign.reward_points || campaign.point || 0

      // 1. video_submissions를 completed로 업데이트
      await videoClient
        .from('video_submissions')
        .update({
          status: 'completed',
          final_confirmed_at: new Date().toISOString()
        })
        .eq('id', submission.id)

      // 2. application 정보 가져오기 (user_id 포함)
      const { data: applicationData } = await supabase
        .from('applications')
        .select('id, user_id, creator_name, applicant_name')
        .eq('id', submission.application_id)
        .single()

      // 3. applications를 completed로 업데이트
      await supabase
        .from('applications')
        .update({ status: 'completed' })
        .eq('id', submission.application_id)

      // 4. 포인트 지급 (skipPointPayment가 false일 때만)
      const userId = applicationData?.user_id || submission.user_id
      if (pointAmount > 0 && userId && !skipPointPayment) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('points, phone, email')
          .eq('id', userId)
          .single()

        if (profile) {
          const newPoints = (profile.points || 0) + pointAmount
          await supabase
            .from('user_profiles')
            .update({ points: newPoints, updated_at: new Date().toISOString() })
            .eq('id', userId)

          // 포인트 이력 저장 (point_history 또는 point_transactions)
          try {
            await supabase
              .from('point_history')
              .insert([{
                user_id: userId,
                campaign_id: campaign.id,
                amount: pointAmount,
                type: 'campaign_complete',
                reason: `캠페인 완료: ${campaign.title}`,
                balance_after: newPoints,
                created_at: new Date().toISOString()
              }])
          } catch (historyError) {
            console.log('point_history 저장 실패, point_transactions 시도:', historyError)
            try {
              await supabase
                .from('point_transactions')
                .insert([{
                  user_id: userId,
                  amount: pointAmount,
                  type: 'earn',
                  description: `캠페인 완료: ${campaign.title}`,
                  created_at: new Date().toISOString()
                }])
            } catch (txError) {
              console.log('point_transactions 저장도 실패 (무시):', txError)
            }
          }

          const creatorName = applicationData?.creator_name || applicationData?.applicant_name || '크리에이터'

          // 크리에이터에게 알림톡 발송 (캠페인 완료 포인트 지급 - 025100001018)
          if (profile.phone) {
            try {
              const completedDate = new Date().toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul'
              })
              await fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: profile.phone,
                  receiverName: creatorName,
                  templateCode: '025100001018',
                  variables: {
                    '크리에이터명': creatorName,
                    '캠페인명': campaign.title,
                    '완료일': completedDate
                  }
                })
              })
            } catch (e) {
              console.error('알림톡 발송 실패:', e)
            }
          }

          // 크리에이터에게 이메일 발송
          if (profile.email) {
            try {
              await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: profile.email,
                  subject: `[CNEC] 캠페인 완료 - ${campaign.title}`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #10B981;">캠페인이 완료되었습니다!</h2>
                      <p>${creatorName}님, 참여하신 캠페인이 완료되어 포인트가 지급되었습니다.</p>
                      <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>캠페인:</strong> ${campaign.title}</p>
                        <p><strong>지급 포인트:</strong> ${pointAmount.toLocaleString()}P</p>
                      </div>
                    </div>
                  `
                })
              })
            } catch (e) {
              console.error('이메일 발송 실패:', e)
            }
          }

          // 네이버 웍스 알림
          try {
            await fetch('/.netlify/functions/send-naver-works-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                isAdminNotification: true,
                channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
                message: `[포인트 지급 완료]\n\n캠페인: ${campaign.title}\n크리에이터: ${creatorName}\n지급 포인트: ${pointAmount.toLocaleString()}P\n\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
              })
            })
          } catch (e) {
            console.error('네이버 웍스 알림 실패:', e)
          }
        }
      }

      await fetchVideoSubmissions()
      await fetchParticipants()

      // 기업에게는 포인트 금액 안 보여줌
      alert('최종 확정되었습니다. 크리에이터에게 포인트가 지급되었습니다.')
    } catch (error) {
      console.error('Error in final confirmation:', error)
      alert('최종 확정에 실패했습니다: ' + error.message)
    }
  }

  // 멀티비디오 캠페인 최종 확정 (videoSubmissions가 없는 경우 - 올영/4주 applications에서 직접 처리)
  const handleMultiVideoFinalConfirmationWithoutSubmissions = async (participant, videoCount) => {
    try {
      const pointAmount = campaign.reward_points || campaign.point || 0
      const userId = participant.user_id

      // 1. Korea DB의 applications 상태 업데이트
      if (supabaseKorea) {
        await supabaseKorea
          .from('applications')
          .update({
            status: 'completed',
            final_confirmed_at: new Date().toISOString()
          })
          .eq('id', participant.id)
      }

      // 2. BIZ DB의 applications 상태 업데이트 (있으면)
      await supabase
        .from('applications')
        .update({
          status: 'completed',
          final_confirmed_at: new Date().toISOString()
        })
        .eq('id', participant.id)

      // 3. 포인트 지급
      if (pointAmount > 0 && userId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('points, phone, email')
          .eq('id', userId)
          .single()

        if (profile) {
          const newPoints = (profile.points || 0) + pointAmount
          await supabase
            .from('user_profiles')
            .update({ points: newPoints, updated_at: new Date().toISOString() })
            .eq('id', userId)

          // 포인트 이력 저장 (point_history 또는 point_transactions)
          try {
            await supabase
              .from('point_history')
              .insert([{
                user_id: userId,
                campaign_id: campaign.id,
                amount: pointAmount,
                type: 'campaign_complete',
                reason: `캠페인 완료: ${campaign.title}`,
                balance_after: newPoints,
                created_at: new Date().toISOString()
              }])
          } catch (historyError) {
            console.log('point_history 저장 실패, point_transactions 시도:', historyError)
            try {
              await supabase
                .from('point_transactions')
                .insert([{
                  user_id: userId,
                  amount: pointAmount,
                  type: 'earn',
                  description: `캠페인 완료: ${campaign.title}`,
                  created_at: new Date().toISOString()
                }])
            } catch (txError) {
              console.log('point_transactions 저장도 실패 (무시):', txError)
            }
          }

          const creatorName = participant.creator_name || participant.applicant_name || '크리에이터'

          // 크리에이터에게 알림톡 발송 (캠페인 완료 포인트 지급 - 025100001018)
          if (profile.phone) {
            try {
              const completedDate = new Date().toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul'
              })
              await fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: profile.phone,
                  receiverName: creatorName,
                  templateCode: '025100001018',
                  variables: {
                    '크리에이터명': creatorName,
                    '캠페인명': campaign.title,
                    '완료일': completedDate
                  }
                })
              })
            } catch (e) {
              console.error('알림톡 발송 실패:', e)
            }
          }

          // 크리에이터에게 이메일 발송
          if (profile.email) {
            try {
              await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: profile.email,
                  subject: `[CNEC] 캠페인 완료 - ${campaign.title}`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #10B981;">캠페인이 완료되었습니다!</h2>
                      <p>${creatorName}님, 참여하신 캠페인이 완료되어 포인트가 지급되었습니다.</p>
                      <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>캠페인:</strong> ${campaign.title}</p>
                        <p><strong>지급 포인트:</strong> ${pointAmount.toLocaleString()}P</p>
                      </div>
                    </div>
                  `
                })
              })
            } catch (e) {
              console.error('이메일 발송 실패:', e)
            }
          }

          // 네이버 웍스 알림
          try {
            await fetch('/.netlify/functions/send-naver-works-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                isAdminNotification: true,
                channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
                message: `[포인트 지급 완료]\n\n캠페인: ${campaign.title}\n크리에이터: ${creatorName}\n지급 포인트: ${pointAmount.toLocaleString()}P\n\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
              })
            })
          } catch (e) {
            console.error('네이버 웍스 알림 실패:', e)
          }
        }
      }

      await fetchParticipants()
      alert('최종 확정되었습니다. 크리에이터에게 포인트가 지급되었습니다.')
    } catch (error) {
      console.error('Error in multi-video final confirmation:', error)
      alert('최종 확정에 실패했습니다: ' + error.message)
    }
  }

  // 관리자용: SNS URL 및 광고코드 수정 후 최종 확정
  const handleAdminSnsEdit = async () => {
    // 멀티비디오 캠페인 편집 (올리브영/4주 챌린지)
    if (adminSnsEditData.isMultiVideoEdit) {
      if (!confirm('SNS 정보를 저장하시겠습니까?')) return

      setSavingAdminSnsEdit(true)
      try {
        const updateData = {}
        const campaignType = adminSnsEditData.campaignType

        if (campaignType === '4week_challenge') {
          // 4주 챌린지
          if (adminSnsEditData.week1_url) updateData.week1_url = adminSnsEditData.week1_url.trim()
          if (adminSnsEditData.week2_url) updateData.week2_url = adminSnsEditData.week2_url.trim()
          if (adminSnsEditData.week3_url) updateData.week3_url = adminSnsEditData.week3_url.trim()
          if (adminSnsEditData.week4_url) updateData.week4_url = adminSnsEditData.week4_url.trim()
          if (adminSnsEditData.week1_partnership_code) updateData.week1_partnership_code = adminSnsEditData.week1_partnership_code.trim()
          if (adminSnsEditData.week2_partnership_code) updateData.week2_partnership_code = adminSnsEditData.week2_partnership_code.trim()
          if (adminSnsEditData.week3_partnership_code) updateData.week3_partnership_code = adminSnsEditData.week3_partnership_code.trim()
          if (adminSnsEditData.week4_partnership_code) updateData.week4_partnership_code = adminSnsEditData.week4_partnership_code.trim()
        } else if (campaignType === 'oliveyoung' || campaignType === 'oliveyoung_sale') {
          // 올리브영
          if (adminSnsEditData.step1_url) updateData.step1_url = adminSnsEditData.step1_url.trim()
          if (adminSnsEditData.step2_url) updateData.step2_url = adminSnsEditData.step2_url.trim()
          if (adminSnsEditData.step3_url) updateData.step3_url = adminSnsEditData.step3_url.trim()
          if (adminSnsEditData.step1_2_partnership_code) updateData.step1_2_partnership_code = adminSnsEditData.step1_2_partnership_code.trim()
          if (adminSnsEditData.step3_partnership_code) updateData.step3_partnership_code = adminSnsEditData.step3_partnership_code.trim()
        }

        if (Object.keys(updateData).length > 0) {
          // BIZ DB applications 테이블 업데이트
          await supabase
            .from('applications')
            .update(updateData)
            .eq('id', adminSnsEditData.participantId)

          // Korea DB campaign_participants 테이블에도 업데이트 (user_id로 매칭)
          if (supabaseKorea && adminSnsEditData.userId) {
            const { error: koreaError } = await supabaseKorea
              .from('campaign_participants')
              .update(updateData)
              .eq('campaign_id', id)
              .eq('user_id', adminSnsEditData.userId)

            if (koreaError) {
              console.error('Korea DB update error:', koreaError)
            }
          }
        }

        setShowAdminSnsEditModal(false)
        setAdminSnsEditData({})
        await fetchParticipants()

        // 기업에게 SNS 업로드 완료 알림 발송
        try {
          const participant = participants.find(p => p.id === adminSnsEditData.participantId)
          const creatorName = participant?.creator_name || participant?.applicant_name || '크리에이터'

          // 기업 정보 조회
          const { data: companyData } = await supabase
            .from('companies')
            .select('contact_email, contact_phone, company_name')
            .eq('id', campaign.company_id)
            .single()

          if (companyData?.contact_phone) {
            // 카카오톡 알림
            await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: companyData.contact_phone.replace(/-/g, ''),
                receiverName: companyData.company_name || '담당자',
                templateCode: '025100001009',
                variables: {
                  '회사명': companyData.company_name || '담당자',
                  '캠페인명': campaign?.title || '캠페인'
                }
              })
            })
            console.log('✓ SNS 업로드 완료 기업 카카오톡 알림 발송 성공')
          }

          if (companyData?.contact_email) {
            // 이메일 알림
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: companyData.contact_email,
                subject: `[CNEC] ${campaign?.title || '캠페인'} - SNS 업로드 완료`,
                html: `
                  <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10B981;">SNS 업로드가 완료되었습니다!</h2>
                    <p>안녕하세요, <strong>${companyData.company_name || '담당자'}</strong>님!</p>
                    <p>신청하신 캠페인의 크리에이터가 최종 영상 수정을 완료하고 SNS에 업로드했습니다.</p>
                    <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                      <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign?.title || '캠페인'}</p>
                      <p style="margin: 5px 0;"><strong>크리에이터:</strong> ${creatorName}</p>
                    </div>
                    <p>관리자 페이지에서 최종 보고서와 성과 지표를 확인해 주세요.</p>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀<br/>문의: 1833-6025</p>
                  </div>
                `
              })
            })
            console.log('✓ SNS 업로드 완료 기업 이메일 발송 성공')
          }

          // 네이버 웍스 알림
          await fetch('/.netlify/functions/send-naver-works-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
              message: `[SNS 업로드 완료 - 멀티비디오]\n\n캠페인: ${campaign?.title || '캠페인'}\n크리에이터: ${creatorName}\n기업: ${companyData?.company_name || '-'}\n\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
            })
          })
        } catch (notifyError) {
          console.error('기업 알림 발송 실패:', notifyError)
        }

        alert('저장되었습니다.')
      } catch (error) {
        console.error('Error saving multi-video SNS edit:', error)
        alert('저장에 실패했습니다: ' + error.message)
      } finally {
        setSavingAdminSnsEdit(false)
      }
      return
    }

    // 기존 단일 영상 캠페인 편집
    if (!adminSnsEditData.snsUrl?.trim()) {
      alert('SNS URL을 입력해주세요.')
      return
    }

    // 수정 모드일 때는 확인 없이 저장만
    if (!adminSnsEditData.isEditMode) {
      if (!confirm('SNS 정보를 저장하고 최종 확정하시겠습니까?\n\n최종 확정 시 크리에이터에게 포인트가 지급됩니다.')) {
        return
      }
    }

    setSavingAdminSnsEdit(true)
    try {
      const videoClient = supabaseKorea || supabaseBiz

      // video_submissions 테이블에 SNS URL 및 광고코드 업데이트
      if (adminSnsEditData.submissionId) {
        const updateData = { sns_upload_url: adminSnsEditData.snsUrl.trim() }
        if (adminSnsEditData.adCode?.trim()) {
          updateData.ad_code = adminSnsEditData.adCode.trim()
          updateData.partnership_code = adminSnsEditData.adCode.trim() // 호환성
        }
        await videoClient
          .from('video_submissions')
          .update(updateData)
          .eq('id', adminSnsEditData.submissionId)
      }

      // applications 테이블에도 SNS URL 및 광고코드 업데이트 (단일 영상용 호환성)
      if (adminSnsEditData.participantId) {
        const updateData = { sns_upload_url: adminSnsEditData.snsUrl.trim() }
        if (adminSnsEditData.adCode?.trim()) {
          updateData.partnership_code = adminSnsEditData.adCode.trim()
        }
        await supabase
          .from('applications')
          .update(updateData)
          .eq('id', adminSnsEditData.participantId)
      }

      setShowAdminSnsEditModal(false)

      // 수정 모드일 때는 저장만 하고 종료
      if (adminSnsEditData.isEditMode) {
        setAdminSnsEditData({ submissionId: null, participantId: null, snsUrl: '', adCode: '', isEditMode: false })
        await fetchVideoSubmissions()
        await fetchParticipants()

        // 기업에게 SNS 업로드 완료 알림 발송
        try {
          const participant = participants.find(p => p.id === adminSnsEditData.participantId)
          const creatorName = participant?.creator_name || participant?.applicant_name || '크리에이터'

          // 기업 정보 조회
          const { data: companyData } = await supabase
            .from('companies')
            .select('contact_email, contact_phone, company_name')
            .eq('id', campaign.company_id)
            .single()

          if (companyData?.contact_phone) {
            // 카카오톡 알림
            await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: companyData.contact_phone.replace(/-/g, ''),
                receiverName: companyData.company_name || '담당자',
                templateCode: '025100001009',
                variables: {
                  '회사명': companyData.company_name || '담당자',
                  '캠페인명': campaign?.title || '캠페인'
                }
              })
            })
            console.log('✓ SNS 업로드 완료 기업 카카오톡 알림 발송 성공')
          }

          if (companyData?.contact_email) {
            // 이메일 알림
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: companyData.contact_email,
                subject: `[CNEC] ${campaign?.title || '캠페인'} - SNS 업로드 완료`,
                html: `
                  <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10B981;">SNS 업로드가 완료되었습니다!</h2>
                    <p>안녕하세요, <strong>${companyData.company_name || '담당자'}</strong>님!</p>
                    <p>신청하신 캠페인의 크리에이터가 최종 영상 수정을 완료하고 SNS에 업로드했습니다.</p>
                    <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                      <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign?.title || '캠페인'}</p>
                      <p style="margin: 5px 0;"><strong>크리에이터:</strong> ${creatorName}</p>
                    </div>
                    <p>관리자 페이지에서 최종 보고서와 성과 지표를 확인해 주세요.</p>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀<br/>문의: 1833-6025</p>
                  </div>
                `
              })
            })
            console.log('✓ SNS 업로드 완료 기업 이메일 발송 성공')
          }

          // 네이버 웍스 알림
          await fetch('/.netlify/functions/send-naver-works-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
              message: `[SNS 업로드 완료]\n\n캠페인: ${campaign?.title || '캠페인'}\n크리에이터: ${creatorName}\n기업: ${companyData?.company_name || '-'}\n\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
            })
          })
        } catch (notifyError) {
          console.error('기업 알림 발송 실패:', notifyError)
        }

        alert('저장되었습니다.')
        return
      }

      // 신규 등록 모드일 때는 최종 확정 진행
      const submissionId = adminSnsEditData.submissionId
      const { data: submission } = await videoClient
        .from('video_submissions')
        .select('*')
        .eq('id', submissionId)
        .single()

      setAdminSnsEditData({ submissionId: null, participantId: null, snsUrl: '', adCode: '', isEditMode: false })

      if (submission) {
        await handleFinalConfirmation(submission)
      } else {
        await fetchVideoSubmissions()
        await fetchParticipants()
        alert('SNS 정보가 저장되었습니다.')
      }
    } catch (error) {
      console.error('Error saving admin SNS edit:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSavingAdminSnsEdit(false)
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
              product_key_points: campaign.product_key_points,
              video_duration: campaign.video_duration
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

  // 단일 크리에이터 가이드 생성 (PostSelectionSetupModal에서 호출)
  const generateSingleCreatorGuide = async (creator) => {
    try {
      const contentUrl = creator.content_url || ''

      // 플랫폼 판별
      let platform = 'unknown'
      let username = ''

      if (contentUrl.includes('youtube.com') || contentUrl.includes('youtu.be')) {
        platform = 'youtube'
        const channelMatch = contentUrl.match(/youtube\.com\/channel\/([\w-]+)/)
        const handleMatch = contentUrl.match(/youtube\.com\/@([\w-]+)/)
        username = channelMatch?.[1] || handleMatch?.[1] || ''
      } else if (contentUrl.includes('instagram.com')) {
        platform = 'instagram'
        const match = contentUrl.match(/instagram\.com\/([\w.]+)/)
        username = match?.[1] || ''
      } else if (contentUrl.includes('tiktok.com')) {
        platform = 'tiktok'
        const match = contentUrl.match(/tiktok\.com\/@([\w.]+)/)
        username = match?.[1] || ''
      }

      let creatorAnalysis = { platform, channelName: creator.applicant_name || creator.creator_name }

      // 플랫폼별 분석 API 호출 (username이 있는 경우에만)
      if (username) {
        let analysisResponse
        if (platform === 'youtube') {
          analysisResponse = await fetch('/.netlify/functions/analyze-youtube-creator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelUrl: contentUrl })
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

        if (analysisResponse?.ok) {
          creatorAnalysis = await analysisResponse.json()
          creatorAnalysis.platform = platform
        }
      }

      // 맞춤 가이드 생성
      const guideResponse = await fetch('/.netlify/functions/generate-personalized-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAnalysis,
          productInfo: {
            brand: campaign?.brand,
            product_name: campaign?.product_name,
            product_features: campaign?.product_features,
            product_key_points: campaign?.product_key_points,
            video_duration: campaign?.video_duration
          },
          baseGuide: campaign?.ai_guide || ''
        })
      })

      if (!guideResponse.ok) {
        throw new Error('가이드 생성 실패')
      }

      const { personalizedGuide } = await guideResponse.json()
      return personalizedGuide
    } catch (error) {
      console.error('Single guide generation error:', error)
      throw error
    }
  }

  // PostSelectionSetupModal 완료 핸들러
  const handlePostSelectionComplete = async (updatedCreator) => {
    try {
      // 상태를 가이드 확인 대기로 변경
      await supabase
        .from('applications')
        .update({
          status: 'guide_confirmation',
          guide_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedCreator.id)

      // 알림톡 발송
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email, phone')
          .eq('id', updatedCreator.user_id)
          .maybeSingle()

        if (profile?.phone) {
          await sendGuideDeliveredNotification(
            profile.phone,
            updatedCreator.applicant_name || updatedCreator.creator_name,
            {
              campaignName: campaign?.title || '캠페인',
              deliveryInfo: `${updatedCreator.shipping_company} ${updatedCreator.tracking_number}`
            }
          )
        }
      } catch (notifError) {
        console.error('Notification error:', notifError)
      }

      // 데이터 새로고침
      await fetchApplications()
      await fetchParticipants()

      alert('가이드가 전달되었습니다.')
    } catch (error) {
      console.error('Complete handler error:', error)
      alert('처리 중 오류가 발생했습니다.')
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

      // 일본 크리에이터 선정 알림 발송 (LINE + SMS + Email + LINE 초대)
      if (region === 'japan') {
        alert('일본 크리에이터에게 선정 알림을 발송합니다...')
        for (const participantId of selectedParticipants) {
          const participant = participants.find(p => p.id === participantId) ||
                             applications.find(a => a.id === participantId)
          if (participant) {
            try {
              // 1. 선정 알림 발송 (LINE → SMS → Email)
              await fetch('/.netlify/functions/send-japan-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'campaign_selected',
                  creatorEmail: participant.creator_email || participant.user_email,
                  data: {
                    creatorName: participant.creator_name || participant.applicant_name,
                    campaignName: campaign.title,
                    brandName: campaign.brand_name || campaign.company_name,
                    reward: campaign.reward_text || campaign.compensation,
                    deadline: campaign.content_submission_deadline,
                    guideUrl: `https://cnec.jp/creator/campaigns/${id}`
                  }
                })
              })

              // 2. LINE 초대장 발송 (SMS + Email)
              await fetch('/.netlify/functions/send-line-invitation-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: participant.creator_name || participant.applicant_name,
                  email: participant.creator_email || participant.user_email,
                  phone: participant.phone || participant.creator_phone,
                  language: 'ja'
                })
              })

              console.log(`[Japan] Notification sent to: ${participant.creator_name}`)
            } catch (notifError) {
              console.error(`[Japan] Notification error for ${participant.creator_name}:`, notifError)
            }
          }
        }
        alert('일본 크리에이터 알림 발송 완료!')
      }

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
    const packagePrice = getPackagePrice(campaign.package_type, campaign.campaign_type)
    const additionalCost = packagePrice * additionalCount
    if (confirm(`추가 ${additionalCount}명에 대한 입금 요청을 하시겠습니까?\n\n추가 금액: ${additionalCost.toLocaleString()}원`)) {
      // 견적서 페이지로 이동 (추가 인원 정보 포함, region 파라미터 유지)
      navigate(`/company/campaigns/${id}/invoice?additional=${additionalCount}&region=${region}`)
    }
  }

  // 크리에이터 테이블 렌더링 함수
  const renderParticipantsTable = (filteredParticipants) => {
    if (filteredParticipants.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-xl font-semibold text-gray-500 mb-2">선정된 크리에이터가 없습니다</p>
          <p className="text-sm text-gray-400">지원 크리에이터 탭에서 크리에이터를 선정해주세요</p>
        </div>
      )
    }

    // 상태별 카운트 (sns_uploaded: 4주/올영 SNS 업로드 완료 상태 포함)
    const statusCounts = {
      guideWaiting: filteredParticipants.filter(p => ['selected', 'guide_confirmation'].includes(p.status)).length,
      filming: filteredParticipants.filter(p => p.status === 'filming').length,
      revision: filteredParticipants.filter(p => p.status === 'revision_requested').length,
      submitted: filteredParticipants.filter(p => p.status === 'video_submitted').length,
      approved: filteredParticipants.filter(p => ['approved', 'completed', 'sns_uploaded'].includes(p.status)).length
    }

    // 상태 설정
    const getStatusConfig = (status) => {
      const configs = {
        selected: {
          label: '가이드 확인중',
          icon: Clock,
          bgClass: 'bg-gradient-to-r from-purple-500 to-purple-600',
          textClass: 'text-white',
          dotClass: 'bg-purple-300 animate-pulse'
        },
        guide_confirmation: {
          label: '가이드 확인중',
          icon: Clock,
          bgClass: 'bg-gradient-to-r from-purple-500 to-purple-600',
          textClass: 'text-white',
          dotClass: 'bg-purple-300 animate-pulse'
        },
        filming: {
          label: '촬영중',
          icon: Video,
          bgClass: 'bg-gradient-to-r from-amber-400 to-orange-500',
          textClass: 'text-white',
          dotClass: 'bg-yellow-200'
        },
        revision_requested: {
          label: '수정 요청',
          icon: Edit3,
          bgClass: 'bg-gradient-to-r from-pink-500 to-rose-500',
          textClass: 'text-white',
          dotClass: 'bg-pink-300'
        },
        video_submitted: {
          label: '영상 제출',
          icon: Upload,
          bgClass: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          textClass: 'text-white',
          dotClass: 'bg-blue-300'
        },
        approved: {
          label: '승인 완료',
          icon: CheckCircle,
          bgClass: 'bg-gradient-to-r from-emerald-500 to-green-600',
          textClass: 'text-white',
          dotClass: 'bg-green-300'
        },
        completed: {
          label: '완료',
          icon: CheckCircle,
          bgClass: 'bg-gradient-to-r from-emerald-500 to-green-600',
          textClass: 'text-white',
          dotClass: 'bg-green-300'
        },
        sns_uploaded: {
          label: 'SNS 업로드',
          icon: CheckCircle,
          bgClass: 'bg-gradient-to-r from-emerald-500 to-green-600',
          textClass: 'text-white',
          dotClass: 'bg-green-300'
        },
        rejected: {
          label: '거부',
          icon: X,
          bgClass: 'bg-gradient-to-r from-red-500 to-red-600',
          textClass: 'text-white',
          dotClass: 'bg-red-300'
        }
      }
      return configs[status] || configs.selected
    }

    // 플랫폼 아이콘/색상
    const getPlatformConfig = (platform) => {
      const p = (platform || '').toLowerCase()
      if (p.includes('youtube')) return { icon: '📺', color: 'text-red-600', bg: 'bg-red-50' }
      if (p.includes('instagram')) return { icon: '📸', color: 'text-pink-600', bg: 'bg-pink-50' }
      if (p.includes('tiktok')) return { icon: '🎵', color: 'text-gray-800', bg: 'bg-gray-100' }
      if (p.includes('blog') || p.includes('naver')) return { icon: '📝', color: 'text-green-600', bg: 'bg-green-50' }
      return { icon: '🌐', color: 'text-blue-600', bg: 'bg-blue-50' }
    }

    return (
      <>
        {/* 진행 상태 파이프라인 - 개선된 디자인 */}
        <div className="grid grid-cols-5 gap-4 mt-6 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-purple-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-purple-300 animate-pulse shadow-lg shadow-purple-400/50"></div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{statusCounts.guideWaiting}</div>
              <span className="text-sm font-medium text-purple-200">가이드 확인중</span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <Video className="w-5 h-5 text-amber-100" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-200"></div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{statusCounts.filming}</div>
              <span className="text-sm font-medium text-amber-100">촬영중</span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <Edit3 className="w-5 h-5 text-pink-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-pink-300"></div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{statusCounts.revision}</div>
              <span className="text-sm font-medium text-pink-200">수정 요청</span>
            </div>
          </div>
          <div
            className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
            onClick={() => setActiveTab('editing')}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <Upload className="w-5 h-5 text-blue-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-blue-300"></div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{statusCounts.submitted}</div>
              <span className="text-sm font-medium text-blue-200">영상 제출</span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-300"></div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{statusCounts.approved}</div>
              <span className="text-sm font-medium text-emerald-200">승인 완료</span>
            </div>
          </div>
        </div>

        {/* 전체 선택 헤더 */}
        <div className="flex items-center justify-between mb-4 px-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
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
                className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-2 transition-all"
              />
            </div>
            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
              전체 선택 ({filteredParticipants.length}명)
            </span>
          </label>
          {selectedParticipants.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {selectedParticipants.length}명 선택됨
              </span>
              {/* US/Japan 캠페인: 가이드 전체 생성 버튼 */}
              {(region === 'us' || region === 'japan') && (
                <>
                  <Button
                    onClick={handleBulkGuideGeneration}
                    disabled={isGeneratingBulkGuides}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                    size="sm"
                  >
                    {isGeneratingBulkGuides ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        생성 중 ({bulkGuideProgress.current}/{bulkGuideProgress.total})
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-1" />
                        가이드 전체 생성
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleBulkGuideEmailSend}
                    disabled={sendingBulkGuideEmail}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    size="sm"
                  >
                    {sendingBulkGuideEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        발송 중...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-1" />
                        가이드 이메일 발송
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 크리에이터 카드 리스트 */}
        <div className="space-y-3">
          {filteredParticipants.map((participant) => {
            const statusConfig = getStatusConfig(participant.status || 'selected')
            const StatusIcon = statusConfig.icon
            const platformConfig = getPlatformConfig(participant.creator_platform || participant.main_channel || participant.platform)
            const isSelected = selectedParticipants.includes(participant.id)
            const creatorName = participant.creator_name || participant.applicant_name || '크리에이터'
            // 프로필 이미지 - profile_photo_url (user_profiles에서 가져온 것) 우선
            const profileImage = participant.profile_photo_url || participant.profile_image_url || participant.creator_profile_image || participant.profile_image || participant.avatar_url
            // SNS URL 가져오기
            const platform = (participant.creator_platform || participant.main_channel || participant.platform || '').toLowerCase()
            const snsUrl = platform.includes('instagram') ? participant.instagram_url :
                          platform.includes('youtube') ? participant.youtube_url :
                          platform.includes('tiktok') ? participant.tiktok_url :
                          participant.instagram_url || participant.youtube_url || participant.tiktok_url
            const shippingAddress = participant.shipping_address || participant.address || ''
            const shippingPhone = participant.shipping_phone || participant.phone || participant.phone_number || participant.creator_phone || ''
            const courierCompany = trackingChanges[participant.id]?.shipping_company ?? participant.shipping_company ?? ''
            const trackingNum = trackingChanges[participant.id]?.tracking_number ?? participant.tracking_number ?? ''

            return (
              <div
                key={participant.id}
                className={`relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${
                  isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-200'
                } overflow-hidden`}
              >
                {/* 왼쪽 상태 바 */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.bgClass}`}></div>

                <div className="pl-5 pr-4 py-4">
                  <div className="flex items-start gap-4">
                    {/* 체크박스 + 프로필 */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants([...selectedParticipants, participant.id])
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id))
                          }
                        }}
                        className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={creatorName}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xl font-bold text-white shadow-md">
                          {creatorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* 크리에이터 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 truncate">{creatorName}</h3>
                        {snsUrl ? (
                          <a
                            href={snsUrl.startsWith('http') ? snsUrl : `https://${snsUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${platformConfig.bg} ${platformConfig.color} flex items-center gap-1 hover:opacity-80 cursor-pointer transition-opacity`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{platformConfig.icon}</span>
                            {participant.creator_platform || participant.main_channel || participant.platform || '플랫폼'}
                          </a>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${platformConfig.bg} ${platformConfig.color} flex items-center gap-1`}>
                            <span>{platformConfig.icon}</span>
                            {participant.creator_platform || participant.main_channel || participant.platform || '플랫폼'}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig.bgClass} ${statusConfig.textClass} ${participant.status === 'video_submitted' ? 'cursor-pointer hover:opacity-80' : ''}`}
                          onClick={() => {
                            if (participant.status === 'video_submitted') {
                              setActiveTab('editing')
                            }
                          }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* 배송 정보 + 택배 + 가이드 - 한 줄 컴팩트 레이아웃 */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* 연락처 */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{shippingPhone || '연락처 미입력'}</span>
                        </div>

                        {/* 배송 주소 - 전체 표시 + 수정 버튼 */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg min-w-0 flex-shrink">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="break-all">{shippingAddress || '주소 미입력'}</span>
                          <button
                            onClick={() => handleStartEditAddress(participant)}
                            className="ml-1 p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded"
                            title="주소 수정"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* 주소 수정 폼 (인라인) */}
                        {editingAddressFor === participant.id && (
                          <div className="w-full mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-600">연락처</label>
                                <input
                                  type="text"
                                  value={addressFormData.phone_number}
                                  onChange={(e) => setAddressFormData({...addressFormData, phone_number: e.target.value})}
                                  placeholder="+1 123 456 7890"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">우편번호</label>
                                <input
                                  type="text"
                                  value={addressFormData.postal_code}
                                  onChange={(e) => setAddressFormData({...addressFormData, postal_code: e.target.value})}
                                  placeholder="92081"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-gray-600">주소</label>
                                <input
                                  type="text"
                                  value={addressFormData.address}
                                  onChange={(e) => setAddressFormData({...addressFormData, address: e.target.value})}
                                  placeholder="2027 Jewell Ridge, Vista, CA"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-gray-600">상세주소</label>
                                <input
                                  type="text"
                                  value={addressFormData.detail_address}
                                  onChange={(e) => setAddressFormData({...addressFormData, detail_address: e.target.value})}
                                  placeholder="Apt 4B"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingAddressFor(null)}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                취소
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveAddress}
                                disabled={savingAddress}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-auto"
                              >
                                {savingAddress ? '저장 중...' : '저장'}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* 택배사 + 송장번호 인라인 */}
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                          <Truck className="w-3 h-3 text-gray-400" />
                          <select
                            value={courierCompany}
                            onChange={(e) => handleTrackingNumberChange(participant.id, 'shipping_company', e.target.value)}
                            className="px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="">택배사</option>
                            <option value="우체국">우체국</option>
                            <option value="CJ대한통운">CJ대한통운</option>
                            <option value="로젠택배">로젠택배</option>
                            <option value="한진택배">한진택배</option>
                            <option value="GS포스트박스">GS포스트박스</option>
                          </select>
                          <input
                            type="text"
                            value={trackingNum}
                            onChange={(e) => handleTrackingNumberChange(participant.id, 'tracking_number', e.target.value)}
                            placeholder="송장번호"
                            className="w-24 px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          {trackingChanges[participant.id] && (
                            <Button
                              onClick={() => saveTrackingNumber(participant.id)}
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-2 py-0.5 h-auto"
                            >
                              저장
                            </Button>
                          )}
                        </div>

                        {/* AI 가이드 섹션 (planned 캠페인) - 인라인 버튼 */}
                        {campaign.campaign_type === 'planned' && (
                          <div className="flex items-center gap-1.5">
                            {participant.personalized_guide ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGuide(participant)
                                    setShowGuideModal(true)
                                  }}
                                  className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs px-3 py-1 h-auto"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  가이드 보기
                                </Button>
                                {participant.status === 'selected' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (!confirm(`${creatorName}님에게 가이드를 전달하시겠습니까?`)) return
                                        await handleGuideApproval([participant.id])
                                      }}
                                      className="text-green-600 border-green-500 hover:bg-green-50 text-xs px-3 py-1 h-auto"
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      전달하기
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelGuideDelivery(participant.id, creatorName)}
                                      className="text-red-500 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      재설정
                                    </Button>
                                  </>
                                ) : participant.status === 'filming' ? (
                                  <>
                                    <span className="flex items-center gap-1 text-green-600 text-xs font-medium px-2">
                                      <CheckCircle className="w-3 h-3" />
                                      전달완료
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelGuideDelivery(participant.id, creatorName)}
                                      className="text-red-500 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      취소
                                    </Button>
                                  </>
                                ) : (
                                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium px-2">
                                    <CheckCircle className="w-3 h-3" />
                                    전달완료
                                  </span>
                                )}
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedParticipantForGuide(participant)
                                  setExternalGuideData({ type: null, url: null, fileUrl: null, fileName: null, title: '' })
                                  setShowGuideSelectModal(true)
                                }}
                                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs px-3 py-1 h-auto"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                가이드 전달
                              </Button>
                            )}
                          </div>
                        )}

                        {/* US/Japan 캠페인: 씬 가이드 작성 버튼 */}
                        {(region === 'us' || region === 'japan') && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/company/campaigns/scene-guide?id=${id}&applicationId=${participant.id}&region=${region}`)}
                              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs px-3 py-1 h-auto"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              씬 가이드 작성
                            </Button>
                            {participant.personalized_guide && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedGuide(participant)
                                  setShowGuideModal(true)
                                }}
                                className="text-purple-600 border-purple-500 hover:bg-purple-50 text-xs px-3 py-1 h-auto"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                가이드 보기
                              </Button>
                            )}
                          </div>
                        )}

                        {/* 4주 챌린지 가이드 섹션 - 인라인 버튼 */}
                        {campaign.campaign_type === '4week_challenge' && (
                          <div className="flex items-center gap-1.5">
                            {participant.personalized_guide ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // 가이드 타입 확인
                                    let guideData = participant.personalized_guide
                                    if (typeof guideData === 'string') {
                                      try { guideData = JSON.parse(guideData) } catch { guideData = {} }
                                    }
                                    // 4week_ai 타입이면 캠페인 가이드 모달 열기
                                    if (guideData?.type === '4week_ai') {
                                      setShow4WeekGuideModal(true)
                                    } else {
                                      setSelectedGuide(participant)
                                      setShowGuideModal(true)
                                    }
                                  }}
                                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-xs px-3 py-1 h-auto"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  가이드 보기
                                </Button>
                                {participant.status === 'selected' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (!confirm(`${creatorName}님에게 가이드를 전달하시겠습니까?`)) return
                                        await handleGuideApproval([participant.id])
                                      }}
                                      className="text-green-600 border-green-500 hover:bg-green-50 text-xs px-3 py-1 h-auto"
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      전달하기
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelGuideDelivery(participant.id, creatorName)}
                                      className="text-red-500 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      재설정
                                    </Button>
                                  </>
                                ) : participant.status === 'filming' ? (
                                  <>
                                    <span className="flex items-center gap-1 text-green-600 text-xs font-medium px-2">
                                      <CheckCircle className="w-3 h-3" />
                                      전달완료
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelGuideDelivery(participant.id, creatorName)}
                                      className="text-red-500 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      취소
                                    </Button>
                                  </>
                                ) : (
                                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium px-2">
                                    <CheckCircle className="w-3 h-3" />
                                    전달완료
                                  </span>
                                )}
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedParticipantForGuide(participant)
                                  setExternalGuideData({ type: null, url: null, fileUrl: null, fileName: null, title: '' })
                                  setShowGuideSelectModal(true)
                                }}
                                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs px-3 py-1 h-auto"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                가이드 전달
                              </Button>
                            )}
                          </div>
                        )}

                        {/* 올영 가이드 섹션 - 인라인 버튼 */}
                        {(campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale') && (
                          <div className="flex items-center gap-1.5">
                            {participant.personalized_guide ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // 가이드 타입 확인
                                    let guideData = participant.personalized_guide
                                    if (typeof guideData === 'string') {
                                      try { guideData = JSON.parse(guideData) } catch { guideData = {} }
                                    }
                                    // oliveyoung_ai 타입이면 캠페인 가이드 모달 열기
                                    if (guideData?.type === 'oliveyoung_ai') {
                                      setShowOliveyoungGuideModal(true)
                                    } else {
                                      setSelectedGuide(participant)
                                      setShowGuideModal(true)
                                    }
                                  }}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs px-3 py-1 h-auto"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  가이드 보기
                                </Button>
                                {participant.status === 'selected' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (!confirm(`${creatorName}님에게 가이드를 전달하시겠습니까?`)) return
                                        await handleGuideApproval([participant.id])
                                      }}
                                      className="text-green-600 border-green-500 hover:bg-green-50 text-xs px-3 py-1 h-auto"
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      전달하기
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelGuideDelivery(participant.id, creatorName)}
                                      className="text-red-500 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      재설정
                                    </Button>
                                  </>
                                ) : participant.status === 'filming' ? (
                                  <>
                                    <span className="flex items-center gap-1 text-green-600 text-xs font-medium px-2">
                                      <CheckCircle className="w-3 h-3" />
                                      전달완료
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelGuideDelivery(participant.id, creatorName)}
                                      className="text-red-500 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      취소
                                    </Button>
                                  </>
                                ) : (
                                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium px-2">
                                    <CheckCircle className="w-3 h-3" />
                                    전달완료
                                  </span>
                                )}
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedParticipantForGuide(participant)
                                  setExternalGuideData({ type: null, url: null, fileUrl: null, fileName: null, title: '' })
                                  setShowGuideSelectModal(true)
                                }}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs px-3 py-1 h-auto"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                가이드 전달
                              </Button>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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

  // 가이드 전달 취소 함수
  const handleCancelGuideDelivery = async (participantId, creatorName) => {
    if (!confirm(`${creatorName}님의 가이드 전달을 취소하시겠습니까?\n\n취소 후 다시 전달할 수 있습니다.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          personalized_guide: null, // 가이드 초기화
          updated_at: new Date().toISOString(),
          status: 'selected' // 선정됨 상태로 되돌림
        })
        .eq('id', participantId)

      if (error) throw error

      // 참여자 목록 재로드
      await fetchParticipants()
      alert(`${creatorName}님의 가이드 전달이 취소되었습니다. 다시 전달할 수 있습니다.`)
    } catch (error) {
      console.error('Error cancelling guide delivery:', error)
      alert('가이드 전달 취소에 실패했습니다: ' + error.message)
    }
  }

  const getPackagePrice = (packageType, campaignType) => {
    // 올리브영 패키지 가격
    const oliveyoungPrices = {
      'standard': 400000,
      'premium': 500000,
      'professional': 600000
    }

    // 4주 챌린지 패키지 가격
    const fourWeekPrices = {
      'standard': 600000,
      'premium': 700000,
      'professional': 800000,
      'enterprise': 1000000
    }

    // 기획형 패키지 가격
    const generalPrices = {
      'junior': 200000,
      'intermediate': 300000,
      'senior': 400000,
      'basic': 200000,
      'standard': 300000,
      'premium': 400000,
      'professional': 600000,
      'enterprise': 1000000
    }

    // 레거시 패키지
    const legacyPrices = {
      'oliveyoung': 200000,
      '올영 20만원': 200000,
      '프리미엄 30만원': 300000,
      '4week_challenge': 600000,
      '4주챌린지 60만원': 600000
    }

    const packageKey = packageType?.toLowerCase()

    // 레거시 패키지 먼저 확인
    if (legacyPrices[packageKey]) {
      return legacyPrices[packageKey]
    }

    // 올리브영 패키지
    if (campaignType === 'oliveyoung' && oliveyoungPrices[packageKey]) {
      return oliveyoungPrices[packageKey]
    }

    // 4주 챌린지 패키지
    if (campaignType === '4week_challenge' && fourWeekPrices[packageKey]) {
      return fourWeekPrices[packageKey]
    }

    // 기획형 패키지
    return generalPrices[packageKey] || 200000
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
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    let editPath
                    if (region === 'japan') {
                      editPath = `/company/campaigns/create/japan?id=${id}`
                    } else if (region === 'us') {
                      editPath = `/company/campaigns/create/us?id=${id}`
                    } else {
                      editPath = `/company/campaigns/create/korea?edit=${id}`
                    }
                    navigate(editPath)
                  }}
                >
                  수정
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              </>
            )}
            {/* 결제 요청 버튼: draft 또는 pending_payment 상태에서만 표시 */}
            {(campaign.approval_status === 'draft' || campaign.approval_status === 'pending_payment') && !campaign.is_cancelled && (
              <Button onClick={() => {
                // 캠페인 타입에 따라 Invoice 페이지로 이동 (region 파라미터 유지)
                if (campaign.campaign_type === 'oliveyoung') {
                  navigate(`/company/campaigns/${id}/invoice/oliveyoung?region=${region}`)
                } else if (campaign.campaign_type === '4week' || campaign.campaign_type === '4week_challenge') {
                  navigate(`/company/campaigns/${id}/invoice/4week?region=${region}`)
                } else {
                  navigate(`/company/campaigns/${id}/invoice?region=${region}`)
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
                    {campaign.package_type === 'junior' ? '초급' :
                     campaign.package_type === 'standard' ? '스탠다드' :
                     campaign.package_type === 'intermediate' ? '스탠다드' :
                     campaign.package_type === 'premium' ? '프리미엄' :
                     campaign.package_type === 'professional' ? '프로페셔널' :
                     campaign.package_type === 'enterprise' ? '엔터프라이즈' :
                     campaign.package_type === 'senior' ? '프리미엄' :
                     campaign.package_type === 'oliveyoung' ? '올영 패키지' :
                     campaign.package_type === '4week_challenge' ? '4주 챌린지' :
                     campaign.package_type || '-'}
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
                  <p className="text-sm text-gray-600">결제 예상 금액 <span className="text-xs text-gray-500">(VAT 포함)</span></p>
                  <p className="text-2xl font-bold mt-2">
                    {campaign.package_type && campaign.total_slots ?
                      `₩${(getPackagePrice(campaign.package_type, campaign.campaign_type) * campaign.total_slots * 1.1).toLocaleString()}`
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - 개선된 디자인 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg shadow-gray-200/50 p-1.5 rounded-2xl inline-flex">
            <TabsTrigger
              value="applications"
              className="flex items-center gap-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-200 rounded-xl px-5 py-2.5 text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium"
            >
              <Users className="w-4 h-4" />
              <span>지원 크리에이터</span>
              <span className="bg-white/20 data-[state=active]:bg-white/30 px-2 py-0.5 rounded-full text-xs font-bold">{applications.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="virtual"
              className="flex items-center gap-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-200 rounded-xl px-5 py-2.5 text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              <span>가상 선정</span>
              <span className="bg-white/20 data-[state=active]:bg-white/30 px-2 py-0.5 rounded-full text-xs font-bold">{applications.filter(app => app.virtual_selected).length}명</span>
            </TabsTrigger>
            <TabsTrigger
              value="confirmed"
              className="flex items-center gap-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-green-200 rounded-xl px-5 py-2.5 text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              <span>선정 크리에이터</span>
              <span className="bg-white/20 data-[state=active]:bg-white/30 px-2 py-0.5 rounded-full text-xs font-bold">{participants.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="editing"
              className="flex items-center gap-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-200 rounded-xl px-5 py-2.5 text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium"
            >
              <FileText className="w-4 h-4" />
              <span>영상 확인</span>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex items-center gap-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-teal-200 rounded-xl px-5 py-2.5 text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              <span>완료</span>
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
                              onClick={async () => {
                                // user_profiles에서 크리에이터 정보 가져오기
                                try {
                                  const { data: profile } = await supabase
                                    .from('user_profiles')
                                    .select('*')
                                    .eq('id', rec.user_id)
                                    .maybeSingle()
                                  
                                  // applications 데이터 + user_profiles 데이터 병합
                                  setSelectedParticipant({
                                    ...rec,
                                    ...profile
                                  })
                                  setShowProfileModal(true)
                                } catch (error) {
                                  console.error('Error fetching profile:', error)
                                  alert('프로필 정보를 불러오는데 실패했습니다.')
                                }
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
                <div className="space-y-4">
                  {applications.map(app => {
                    // 이미 participants에 있는지 확인 (user_id로 비교)
                    const isAlreadyParticipant = participants.some(p =>
                      p.user_id && app.user_id && p.user_id === app.user_id
                    )

                    return (
                      <CreatorCard
                        key={app.id}
                        application={app}
                        campaignQuestions={[
                          campaign?.questions?.[0]?.question || campaign?.question1 || '',
                          campaign?.questions?.[1]?.question || campaign?.question2 || '',
                          campaign?.questions?.[2]?.question || campaign?.question3 || '',
                          campaign?.questions?.[3]?.question || campaign?.question4 || ''
                        ]}
                        onVirtualSelect={handleVirtualSelect}
                        isConfirmed={app.status === 'selected'}
                        isAlreadyParticipant={isAlreadyParticipant}
                        onCancel={(app) => {
                          setCancellingApp(app)
                          setCancelModalOpen(true)
                        }}
                        onViewProfile={async (app) => {
                          // user_profiles에서 크리에이터 정보 가져오기
                          try {
                            const { data: profile } = await supabase
                              .from('user_profiles')
                              .select('*')
                              .eq('id', app.user_id)
                              .maybeSingle()
                            
                            // applications 데이터 + user_profiles 데이터 병합
                            setSelectedParticipant({
                              ...app,
                              ...profile
                            })
                            setShowProfileModal(true)
                          } catch (error) {
                            console.error('Error fetching profile:', error)
                            alert('프로필 정보를 불러오는데 실패했습니다.')
                          }
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
                              virtual_selected: false,
                              main_channel: mainChannel || app.main_channel
                            })
                            .eq('id', app.id)

                          if (updateError) throw updateError

                          await fetchApplications()
                          await fetchParticipants()

                          // 선정 알림톡 발송
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
                                  campaignName: campaign?.title || '캠페인'
                                }
                              )
                            }
                          } catch (notificationError) {
                            console.error('Notification error:', notificationError)
                          }

                          // 선정 후 배송/가이드 세팅 모달 열기
                          setCreatorForSetup({
                            ...app,
                            main_channel: mainChannel || app.main_channel
                          })
                          setShowPostSelectionModal(true)

                          // 선정 크리에이터 탭으로 자동 이동
                          setActiveTab('confirmed')
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
                <div className="space-y-4">
                  {applications.filter(app => app.virtual_selected).map(app => {
                    // 이미 participants에 있는지 확인
                    const isAlreadyParticipant = participants.some(p =>
                      (p.creator_name || p.applicant_name) === app.applicant_name
                    )

                    return (
                      <CreatorCard
                        key={app.id}
                        application={app}
                        campaignQuestions={[
                          campaign?.questions?.[0]?.question || campaign?.question1 || '',
                          campaign?.questions?.[1]?.question || campaign?.question2 || '',
                          campaign?.questions?.[2]?.question || campaign?.question3 || '',
                          campaign?.questions?.[3]?.question || campaign?.question4 || ''
                        ]}
                        onVirtualSelect={handleVirtualSelect}
                        isConfirmed={app.status === 'selected'}
                        isAlreadyParticipant={isAlreadyParticipant}
                        onCancel={(app) => {
                          setCancellingApp(app)
                          setCancelModalOpen(true)
                        }}
                        onViewProfile={async (app) => {
                          // user_profiles에서 크리에이터 정보 가져오기
                          try {
                            const { data: profile } = await supabase
                              .from('user_profiles')
                              .select('*')
                              .eq('id', app.user_id)
                              .maybeSingle()
                            
                            // applications 데이터 + user_profiles 데이터 병합
                            setSelectedParticipant({
                              ...app,
                              ...profile
                            })
                            setShowProfileModal(true)
                          } catch (error) {
                            console.error('Error fetching profile:', error)
                            alert('프로필 정보를 불러오는데 실패했습니다.')
                          }
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
                              virtual_selected: false,
                              main_channel: mainChannel || app.main_channel
                            })
                            .eq('id', app.id)

                          if (updateError) throw updateError

                          await fetchApplications()
                          await fetchParticipants()

                          // 선정 알림톡 발송
                          try {
                            const { data: profile } = await supabase
                              .from('user_profiles')
                              .select('email, phone')
                              .eq('id', app.user_id)
                              .maybeSingle()

                            if (profile?.phone) {
                              await sendCampaignSelectedNotification(
                                profile.phone,
                                app.applicant_name,
                                {
                                  campaignName: campaign?.title || '캠페인'
                                }
                              )
                            }
                          } catch (notificationError) {
                            console.error('Notification error:', notificationError)
                          }

                          // 선정 후 배송/가이드 세팅 모달 열기
                          setCreatorForSetup({
                            ...app,
                            main_channel: mainChannel || app.main_channel
                          })
                          setShowPostSelectionModal(true)

                          // 선정 크리에이터 탭으로 자동 이동
                          setActiveTab('confirmed')
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

          {/* 선정 크리에이터 탭 */}
          <TabsContent value="confirmed">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      선정 크리에이터 관리
                    </CardTitle>
                    <p className="text-sm text-green-600 mt-1">선정된 크리에이터의 배송, 가이드, 진행 상태를 관리하세요</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* US 캠페인: 배송정보 요청 이메일 발송 */}
                    {region === 'us' && (
                      <Button
                        variant="outline"
                        onClick={handleRequestShippingInfo}
                        className="bg-white border-orange-200 hover:bg-orange-50 text-orange-700"
                        disabled={participants.length === 0 || requestingShippingInfo}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {requestingShippingInfo ? 'Sending...' : 'Request Shipping Info'}
                      </Button>
                    )}

                    {/* 배송정보 엑셀 다운로드 */}
                    <Button
                      variant="outline"
                      onClick={exportShippingInfo}
                      className="bg-white border-green-200 hover:bg-green-50 text-green-700"
                      disabled={participants.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {region === 'japan' ? '配送情報' : region === 'usa' ? 'Shipping Info' : '배송정보'} Excel
                    </Button>

                    {/* 송장번호 템플릿 다운로드 */}
                    <Button
                      variant="outline"
                      onClick={downloadTrackingTemplate}
                      className="bg-white border-blue-200 hover:bg-blue-50 text-blue-700"
                      disabled={participants.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {region === 'japan' ? '送り状番号' : region === 'usa' ? 'Tracking #' : '송장번호'} 템플릿
                    </Button>

                    {/* 송장번호 엑셀 업로드 */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            uploadTrackingNumbers(e.target.files[0])
                            e.target.value = ''
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        className="bg-white border-purple-200 hover:bg-purple-50 text-purple-700"
                        disabled={participants.length === 0}
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {region === 'japan' ? '送り状番号' : region === 'usa' ? 'Tracking #' : '송장번호'} 업로드
                        </span>
                      </Button>
                    </label>

                    <Button
                      variant="outline"
                      onClick={() => setShowCampaignGuidePopup(true)}
                      className="bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      캠페인 정보 보기
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 플랫폼별 필터 탭 - 개선된 디자인 */}
                <Tabs defaultValue="all" className="mt-6">
                  <TabsList className="bg-gray-100/80 p-1 rounded-xl inline-flex gap-1">
                    <TabsTrigger
                      value="all"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 transition-all"
                    >
                      전체 <span className="ml-1 text-xs bg-gray-200 data-[state=active]:bg-gray-100 px-2 py-0.5 rounded-full">{participants.length}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="youtube"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:text-red-600 transition-all flex items-center gap-1.5"
                    >
                      <span>📺</span> 유튜브 <span className="ml-1 text-xs bg-gray-200 data-[state=active]:bg-red-100 px-2 py-0.5 rounded-full">{participants.filter(p => {
                        const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                        return platform.includes('youtube') || platform.includes('유튜브')
                      }).length}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="instagram"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:text-pink-600 transition-all flex items-center gap-1.5"
                    >
                      <span>📸</span> 인스타 <span className="ml-1 text-xs bg-gray-200 data-[state=active]:bg-pink-100 px-2 py-0.5 rounded-full">{participants.filter(p => {
                        const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                        return platform.includes('instagram') || platform.includes('인스타그램')
                      }).length}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="tiktok"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 transition-all flex items-center gap-1.5"
                    >
                      <span>🎵</span> 틱톡 <span className="ml-1 text-xs bg-gray-200 data-[state=active]:bg-gray-100 px-2 py-0.5 rounded-full">{participants.filter(p => {
                        const platform = (p.creator_platform || p.main_channel || '').toLowerCase()
                        return platform.includes('tiktok') || platform.includes('틱톡')
                      }).length}</span>
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
                  // Group video submissions by user_id only
                  console.log('All video submissions:', videoSubmissions)
                  console.log('Video submission statuses:', videoSubmissions.map(v => ({ id: v.id, status: v.status })))

                  // 캠페인 타입 확인
                  const is4WeekChallenge = campaign.campaign_type === '4week_challenge'
                  const isOliveyoung = campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale'
                  const isMultiStepCampaign = is4WeekChallenge || isOliveyoung

                  // 검수완료(approved) 상태도 포함해서 보여주기 (rejected, completed만 제외)
                  // 멀티스텝 캠페인에서는 다른 주차/영상도 확인해야 하므로 유지
                  const filteredSubmissions = videoSubmissions.filter(v => !['completed', 'rejected'].includes(v.status))

                  // user_id로만 그룹화
                  const groupedByUser = filteredSubmissions.reduce((acc, submission) => {
                    if (!acc[submission.user_id]) {
                      acc[submission.user_id] = []
                    }
                    acc[submission.user_id].push(submission)
                    return acc
                  }, {})

                  if (Object.keys(groupedByUser).length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        제출된 영상이 없습니다.
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-6">
                      {Object.entries(groupedByUser).map(([userId, userSubmissions]) => {
                        // 멀티스텝 캠페인인 경우 주차/영상번호별로 다시 그룹화
                        const submissionsByStep = {}
                        if (is4WeekChallenge) {
                          userSubmissions.forEach(sub => {
                            const step = sub.week_number || 1
                            if (!submissionsByStep[step]) submissionsByStep[step] = []
                            submissionsByStep[step].push(sub)
                          })
                        } else if (isOliveyoung) {
                          userSubmissions.forEach(sub => {
                            const step = sub.video_number || 1
                            if (!submissionsByStep[step]) submissionsByStep[step] = []
                            submissionsByStep[step].push(sub)
                          })
                        } else {
                          submissionsByStep[1] = userSubmissions
                        }

                        // 각 스텝 내에서 submitted_at으로 정렬 (최신 먼저)
                        Object.keys(submissionsByStep).forEach(step => {
                          submissionsByStep[step].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                        })

                        const availableSteps = Object.keys(submissionsByStep).map(Number).sort((a, b) => a - b)
                        const selectedStep = selectedVideoSteps[userId] || availableSteps[0]
                        const stepSubmissions = submissionsByStep[selectedStep] || []
                        const versionKey = `${userId}_${selectedStep}`
                        const selectedVersion = selectedVideoVersions[versionKey] || 0
                        const submission = stepSubmissions[selectedVersion]

                        if (!submission) return null

                        return (
                      <div key={userId} className="border rounded-lg p-6 bg-white shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* 왼쪽: 영상 플레이어 */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{participants.find(p => p.user_id === submission.user_id)?.applicant_name || '크리에이터'}</h4>
                              </div>
                            </div>

                            {/* 주차/영상번호 탭 (4주 챌린지, 올리브영) */}
                            {isMultiStepCampaign && availableSteps.length > 0 && (
                              <div className="flex gap-2 mb-3">
                                {availableSteps.map(step => (
                                  <button
                                    key={step}
                                    onClick={() => setSelectedVideoSteps(prev => ({ ...prev, [userId]: step }))}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                      selectedStep === step
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    }`}
                                  >
                                    {is4WeekChallenge ? `${step}주차` : `영상 ${step}`}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 버전 탭 */}
                            {stepSubmissions.length > 1 && (
                              <div className="flex gap-2 mb-3">
                                {stepSubmissions.map((sub, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setSelectedVideoVersions(prev => ({ ...prev, [versionKey]: index }))}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                      selectedVersion === index
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    v{sub.version || (stepSubmissions.length - index)}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 현재 선택된 주차/버전 표시 */}
                            <div className="flex gap-2 mb-3">
                              {isMultiStepCampaign && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                  {is4WeekChallenge ? `${selectedStep}주차` : `영상 ${selectedStep}`}
                                </span>
                              )}
                              {submission.version && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                                  V{submission.version}
                                </span>
                              )}
                            </div>

                            {submission.video_file_url && (
                              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                <video
                                  key={`${userId}-${selectedStep}-${selectedVersion}-${submission.id}`}
                                  controls
                                  autoPlay
                                  muted
                                  playsInline
                                  preload="auto"
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
                              {submission.status === 'approved' ? (
                                <Badge className="bg-green-100 text-green-700">검수 완료</Badge>
                              ) : submission.status === 'submitted' ? (
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
                              
                              {(() => {
                                const participant = participants.find(p => p.user_id === submission.user_id)
                                const partnershipCode = participant?.partnership_code || submission.partnership_code
                                return partnershipCode ? (
                                  <div>
                                    <p className="text-gray-500">파트너십 광고 코드</p>
                                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{partnershipCode}</p>
                                  </div>
                                ) : null
                              })()}
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                                onClick={async () => {
                                  try {
                                    // Cross-origin 다운로드를 위해 blob으로 fetch
                                    const response = await fetch(submission.video_file_url)
                                    const blob = await response.blob()
                                    const blobUrl = window.URL.createObjectURL(blob)

                                    const link = document.createElement('a')
                                    link.href = blobUrl
                                    link.download = `${submission.applications?.creator_name || 'video'}_${new Date(submission.submitted_at).toISOString().split('T')[0]}.mp4`
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)

                                    // blob URL 해제
                                    window.URL.revokeObjectURL(blobUrl)
                                  } catch (error) {
                                    console.error('Download failed:', error)
                                    // fallback: 새 탭에서 열기
                                    window.open(submission.video_file_url, '_blank')
                                  }
                                }}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                영상 다운로드
                              </Button>
                              {submission.status !== 'approved' && (
                                <>
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
                                      if (!confirm('이 영상을 검수 완료하시겠습니까?\n\nSNS 업로드 확인 후 "최종 확정" 버튼을 눌러주세요.')) return
                                      await handleVideoApproval(submission)
                                    }}
                                  >
                                    검수 완료
                                  </Button>
                                </>
                              )}
                              {submission.status === 'approved' && (
                                <div className="text-center text-sm text-green-600 font-medium py-2 bg-green-50 rounded">
                                  ✓ 이 영상은 검수 완료되었습니다
                                </div>
                              )}
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
                {(() => {
                  // 멀티비디오 캠페인 여부 체크
                  const is4WeekChallenge = campaign.campaign_type === '4week_challenge'
                  const isOliveyoung = campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale'
                  const isMultiVideoCampaign = is4WeekChallenge || isOliveyoung

                  // 완료 섹션에 표시할 참가자 필터
                  // - 일반 캠페인: approved/completed 상태
                  // - 멀티비디오 캠페인: approved/completed/sns_uploaded 상태 OR SNS URL이 하나라도 입력된 경우
                  // - campaign_type과 관계없이 멀티비디오 SNS URL이 있으면 표시 (데이터 직접 입력 대응)
                  // - video_submissions에 approved된 영상이 있는 경우도 포함
                  const completedSectionParticipants = participants.filter(p => {
                    if (['approved', 'completed', 'sns_uploaded'].includes(p.status)) return true
                    // 4주 챌린지 URL이 있으면 표시
                    if (p.week1_url || p.week2_url || p.week3_url || p.week4_url) return true
                    // 올리브영 URL이 있으면 표시
                    if (p.step1_url || p.step2_url || p.step3_url) return true
                    // video_submissions에 approved/completed된 영상이 있으면 표시
                    const hasApprovedVideo = videoSubmissions.some(
                      v => v.user_id === p.user_id && ['approved', 'completed', 'sns_uploaded', 'final_confirmed'].includes(v.status)
                    )
                    if (hasApprovedVideo) return true
                    return false
                  })

                  return (
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    완료된 크리에이터
                    <Badge className="bg-green-100 text-green-700 ml-2">
                      {completedSectionParticipants.length}명
                    </Badge>
                  </CardTitle>
                  {completedSectionParticipants.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                      onClick={async () => {
                        const completedParticipants = participants.filter(p => ['approved', 'completed', 'sns_uploaded'].includes(p.status))
                        const completedSubmissions = videoSubmissions.filter(sub =>
                          ['approved', 'completed', 'sns_uploaded', 'final_confirmed'].includes(sub.status) &&
                          completedParticipants.some(p => p.user_id === sub.user_id)
                        )

                        if (completedSubmissions.length === 0) {
                          alert('다운로드할 영상이 없습니다.')
                          return
                        }

                        alert(`총 ${completedSubmissions.length}개의 영상을 다운로드합니다. 순차적으로 다운로드됩니다.`)

                        for (const sub of completedSubmissions) {
                          try {
                            const response = await fetch(signedVideoUrls[sub.id] || sub.video_file_url)
                            const blob = await response.blob()
                            const blobUrl = window.URL.createObjectURL(blob)
                            const participant = completedParticipants.find(p => p.user_id === sub.user_id)
                            const creatorName = participant?.creator_name || participant?.applicant_name || 'creator'
                            const weekLabel = sub.week_number ? `_week${sub.week_number}` : (sub.video_number ? `_v${sub.video_number}` : '')

                            const link = document.createElement('a')
                            link.href = blobUrl
                            link.download = `${creatorName}${weekLabel}_${new Date(sub.submitted_at).toISOString().split('T')[0]}.mp4`
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            window.URL.revokeObjectURL(blobUrl)

                            await new Promise(resolve => setTimeout(resolve, 500))
                          } catch (error) {
                            console.error('Download failed:', error)
                          }
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      전체 영상 다운로드
                    </Button>
                  )}
                </div>
                  )
                })()}
              </CardHeader>
              <CardContent>
                {(() => {
                  // 멀티비디오 캠페인 여부 체크 (CardContent용)
                  const is4WeekChallenge = campaign.campaign_type === '4week_challenge'
                  const isOliveyoung = campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale'
                  const isMultiVideoCampaign = is4WeekChallenge || isOliveyoung

                  // 완료 섹션에 표시할 참가자 필터
                  // campaign_type과 관계없이 멀티비디오 SNS URL이 있으면 표시
                  // video_submissions에 approved된 영상이 있는 경우도 포함
                  const completedSectionParticipants = participants.filter(p => {
                    if (['approved', 'completed', 'sns_uploaded'].includes(p.status)) return true
                    // 4주 챌린지 URL이 있으면 표시
                    if (p.week1_url || p.week2_url || p.week3_url || p.week4_url) return true
                    // 올리브영 URL이 있으면 표시
                    if (p.step1_url || p.step2_url || p.step3_url) return true
                    // video_submissions에 approved/completed된 영상이 있으면 표시
                    const hasApprovedVideo = videoSubmissions.some(
                      v => v.user_id === p.user_id && ['approved', 'completed', 'sns_uploaded', 'final_confirmed'].includes(v.status)
                    )
                    if (hasApprovedVideo) return true
                    return false
                  })

                  if (completedSectionParticipants.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>아직 완료된 크리에이터가 없습니다.</p>
                      </div>
                    )
                  }

                  return (
                  <div className="space-y-6">
                    {completedSectionParticipants.map(participant => {
                      // 해당 크리에이터의 승인된 영상들
                      const creatorSubmissions = videoSubmissions.filter(
                        sub => sub.user_id === participant.user_id && ['approved', 'completed', 'sns_uploaded', 'final_confirmed'].includes(sub.status)
                      ).sort((a, b) => (a.week_number || a.video_number || 0) - (b.week_number || b.video_number || 0))

                      // 멀티비디오 캠페인 체크 (올영: 2개, 4주챌린지: 4개)
                      const is4WeekChallenge = campaign.campaign_type === '4week_challenge'
                      const isOliveyoung = campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale'
                      const isMultiVideoCampaign = is4WeekChallenge || isOliveyoung
                      const requiredVideoCount = is4WeekChallenge ? 4 : isOliveyoung ? 2 : 1

                      // 멀티비디오 캠페인의 SNS URL/광고코드 체크 (campaign_participants 테이블 컬럼 사용)
                      let allVideosHaveSnsUrl = false
                      let allVideosHaveAdCode = false
                      let multiVideoStatus = []

                      if (is4WeekChallenge) {
                        // 4주 챌린지: week1_url ~ week4_url, week1_partnership_code ~ week4_partnership_code
                        multiVideoStatus = [
                          { week: 1, url: participant.week1_url, code: participant.week1_partnership_code },
                          { week: 2, url: participant.week2_url, code: participant.week2_partnership_code },
                          { week: 3, url: participant.week3_url, code: participant.week3_partnership_code },
                          { week: 4, url: participant.week4_url, code: participant.week4_partnership_code }
                        ]
                        allVideosHaveSnsUrl = multiVideoStatus.every(s => s.url)
                        allVideosHaveAdCode = multiVideoStatus.every(s => s.code)
                      } else if (isOliveyoung) {
                        // 올리브영: step1_url, step2_url, step3_url (3개), step1_2_partnership_code, step3_partnership_code (2개)
                        multiVideoStatus = [
                          { step: 1, url: participant.step1_url, code: participant.step1_2_partnership_code },
                          { step: 2, url: participant.step2_url, code: participant.step1_2_partnership_code },
                          { step: 3, url: participant.step3_url, code: participant.step3_partnership_code }
                        ]
                        allVideosHaveSnsUrl = multiVideoStatus.every(s => s.url)
                        allVideosHaveAdCode = participant.step1_2_partnership_code && participant.step3_partnership_code
                      } else {
                        // 일반/기획형: sns_upload_url, partnership_code
                        allVideosHaveSnsUrl = !!participant.sns_upload_url || creatorSubmissions.every(sub => sub.sns_upload_url)
                        allVideosHaveAdCode = !!participant.partnership_code || creatorSubmissions.every(sub => sub.ad_code || sub.partnership_code)
                      }

                      // 이미 최종 확정된 영상이 있는지 체크
                      const hasConfirmedVideo = creatorSubmissions.some(sub => sub.final_confirmed_at)
                      const allVideosConfirmed = creatorSubmissions.length > 0 &&
                        creatorSubmissions.every(sub => sub.final_confirmed_at)

                      return (
                        <div key={participant.id} className="border rounded-xl p-5 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
                          {/* 크리에이터 헤더 */}
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-green-200">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {(participant.creator_name || participant.applicant_name || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-gray-900">{participant.creator_name || participant.applicant_name || '크리에이터'}</h4>
                                <p className="text-sm text-gray-600">{participant.creator_platform || '플랫폼 미지정'}</p>
                              </div>
                            </div>
                            <Badge className="bg-green-600 text-white px-3 py-1">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              완료
                            </Badge>
                          </div>

                          {/* 영상 목록 */}
                          {creatorSubmissions.length > 0 ? (
                            <div className="space-y-4">
                              {creatorSubmissions.map((submission, idx) => (
                                <div key={submission.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                  <div className="flex items-start justify-between gap-4">
                                    {/* 영상 정보 */}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Video className="w-4 h-4 text-purple-600" />
                                        <span className="font-semibold text-gray-800">
                                          {submission.week_number ? `${submission.week_number}주차 영상` :
                                           submission.video_number ? `영상 ${submission.video_number}` :
                                           `영상 ${idx + 1}`}
                                        </span>
                                        {submission.version && submission.version > 1 && (
                                          <Badge variant="outline" className="text-xs">v{submission.version}</Badge>
                                        )}
                                      </div>

                                      {/* SNS 업로드 URL (video_submissions 또는 campaign_participants에서) */}
                                      {(() => {
                                        // 4주 챌린지/올리브영의 경우 주차/영상번호에 맞는 URL 가져오기
                                        let snsUrl = submission.sns_upload_url
                                        if (!snsUrl && is4WeekChallenge && submission.week_number) {
                                          snsUrl = participant[`week${submission.week_number}_url`]
                                        } else if (!snsUrl && isOliveyoung && submission.video_number) {
                                          snsUrl = participant[`step${submission.video_number}_url`]
                                        }
                                        if (!snsUrl) snsUrl = participant.sns_upload_url
                                        return snsUrl ? (
                                          <div className="flex items-center gap-2 mb-2">
                                            <Link className="w-4 h-4 text-blue-500" />
                                            <a
                                              href={snsUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm text-blue-600 hover:underline truncate max-w-md"
                                            >
                                              {snsUrl}
                                            </a>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-blue-600 hover:bg-blue-50"
                                              onClick={() => {
                                                navigator.clipboard.writeText(snsUrl)
                                                alert('SNS 링크가 복사되었습니다!')
                                              }}
                                            >
                                              <Copy className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-gray-500 hover:bg-gray-100"
                                              onClick={() => {
                                                setAdminSnsEditData({
                                                  submissionId: submission.id,
                                                  participantId: participant.id,
                                                  snsUrl: snsUrl,
                                                  adCode: submission.ad_code || submission.partnership_code || participant.partnership_code || '',
                                                  isEditMode: true
                                                })
                                                setShowAdminSnsEditModal(true)
                                              }}
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 mb-2">
                                            <Link className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-400">SNS URL 미등록</span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-blue-600 hover:bg-blue-50"
                                              onClick={() => {
                                                setAdminSnsEditData({
                                                  submissionId: submission.id,
                                                  participantId: participant.id,
                                                  snsUrl: '',
                                                  adCode: submission.ad_code || submission.partnership_code || '',
                                                  isEditMode: false
                                                })
                                                setShowAdminSnsEditModal(true)
                                              }}
                                            >
                                              <Edit2 className="w-3 h-3 mr-1" />
                                              입력
                                            </Button>
                                          </div>
                                        )
                                      })()}

                                      {/* 파트너십 광고 코드 (영상별 또는 참가자별) */}
                                      {(() => {
                                        // 4주 챌린지/올리브영의 경우 주차/영상번호에 맞는 광고코드 가져오기
                                        let adCode = submission.ad_code || submission.partnership_code
                                        if (!adCode && is4WeekChallenge && submission.week_number) {
                                          adCode = participant[`week${submission.week_number}_partnership_code`]
                                        } else if (!adCode && isOliveyoung && submission.video_number) {
                                          // 올리브영: step1,2는 step1_2_partnership_code, step3는 step3_partnership_code
                                          adCode = submission.video_number === 3
                                            ? participant.step3_partnership_code
                                            : participant.step1_2_partnership_code
                                        }
                                        if (!adCode) adCode = participant.partnership_code
                                        return adCode ? (
                                          <div className="flex items-center gap-2 mb-2">
                                            <Hash className="w-4 h-4 text-orange-500" />
                                            <span className="text-sm text-gray-600">광고코드:</span>
                                            <code className="text-sm bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-mono">
                                              {adCode}
                                            </code>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-orange-600 hover:bg-orange-50"
                                              onClick={() => {
                                                navigator.clipboard.writeText(adCode)
                                                alert('광고코드가 복사되었습니다!')
                                              }}
                                            >
                                              <Copy className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 mb-2">
                                            <Hash className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-400">광고코드 미등록</span>
                                          </div>
                                        )
                                      })()}

                                      {/* 제출일/승인일 */}
                                      <div className="text-xs text-gray-500 mt-2">
                                        제출: {new Date(submission.submitted_at).toLocaleDateString('ko-KR')}
                                        {submission.approved_at && (
                                          <span className="ml-2">
                                            · 승인: {new Date(submission.approved_at).toLocaleDateString('ko-KR')}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* 버튼 그룹 */}
                                    <div className="flex flex-col gap-2">
                                      {/* 클린본 다운로드 */}
                                      {submission.clean_video_url && (
                                        <Button
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(submission.clean_video_url)
                                              const blob = await response.blob()
                                              const blobUrl = window.URL.createObjectURL(blob)
                                              const creatorName = participant.creator_name || participant.applicant_name || 'creator'
                                              const weekLabel = submission.week_number ? `_week${submission.week_number}` : (submission.video_number ? `_v${submission.video_number}` : '')

                                              const link = document.createElement('a')
                                              link.href = blobUrl
                                              link.download = `${creatorName}${weekLabel}_클린본_${new Date(submission.submitted_at).toISOString().split('T')[0]}.mp4`
                                              document.body.appendChild(link)
                                              link.click()
                                              document.body.removeChild(link)
                                              window.URL.revokeObjectURL(blobUrl)
                                            } catch (error) {
                                              console.error('Download failed:', error)
                                              window.open(submission.clean_video_url, '_blank')
                                            }
                                          }}
                                        >
                                          <Download className="w-4 h-4 mr-1" />
                                          클린본
                                        </Button>
                                      )}

                                      {/* 편집본 다운로드 */}
                                      {submission.video_file_url && (
                                        <Button
                                          size="sm"
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(signedVideoUrls[submission.id] || submission.video_file_url)
                                              const blob = await response.blob()
                                              const blobUrl = window.URL.createObjectURL(blob)
                                              const creatorName = participant.creator_name || participant.applicant_name || 'creator'
                                              const weekLabel = submission.week_number ? `_week${submission.week_number}` : (submission.video_number ? `_v${submission.video_number}` : '')

                                              const link = document.createElement('a')
                                              link.href = blobUrl
                                              link.download = `${creatorName}${weekLabel}_편집본_${new Date(submission.submitted_at).toISOString().split('T')[0]}.mp4`
                                              document.body.appendChild(link)
                                              link.click()
                                              document.body.removeChild(link)
                                              window.URL.revokeObjectURL(blobUrl)
                                            } catch (error) {
                                              console.error('Download failed:', error)
                                              window.open(signedVideoUrls[submission.id] || submission.video_file_url, '_blank')
                                            }
                                          }}
                                        >
                                          <Download className="w-4 h-4 mr-1" />
                                          편집본
                                        </Button>
                                      )}

                                      {/* SNS 링크 열기 */}
                                      {(submission.sns_upload_url || participant.sns_upload_url) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                          onClick={() => window.open(submission.sns_upload_url || participant.sns_upload_url, '_blank')}
                                        >
                                          <ExternalLink className="w-4 h-4 mr-1" />
                                          SNS 보기
                                        </Button>
                                      )}

                                      {/* 최종 확정 버튼 - 단일 영상 캠페인만 개별 표시 */}
                                      {!isMultiVideoCampaign && submission.status === 'approved' && !submission.final_confirmed_at && (
                                        <Button
                                          size="sm"
                                          className="bg-purple-600 hover:bg-purple-700 text-white"
                                          onClick={async () => {
                                            const snsUrl = submission.sns_upload_url || participant.sns_upload_url
                                            if (!snsUrl) {
                                              // SNS URL이 없으면 관리자가 직접 입력할 수 있는 모달 표시
                                              setAdminSnsEditData({
                                                submissionId: submission.id,
                                                participantId: participant.id,
                                                snsUrl: '',
                                                adCode: submission.ad_code || submission.partnership_code || '',
                                                isEditMode: false
                                              })
                                              setShowAdminSnsEditModal(true)
                                              return
                                            }
                                            if (!confirm('SNS 업로드를 확인하셨나요?\n\n최종 확정 시 크리에이터에게 포인트가 지급됩니다.')) return
                                            await handleFinalConfirmation(submission)
                                          }}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          최종 확정
                                        </Button>
                                      )}

                                      {/* 최종 확정 완료 표시 */}
                                      {submission.final_confirmed_at && (
                                        <Badge className="bg-purple-100 text-purple-700 px-3 py-1">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          확정 완료
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* 멀티비디오 캠페인 전체 최종 확정 버튼 */}
                              {isMultiVideoCampaign && !allVideosConfirmed && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  {/* 영상별 상태 요약 - 멀티비디오 캠페인용 */}
                                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                      {is4WeekChallenge ? '4주 챌린지' : '올리브영'} SNS 업로드 현황
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {multiVideoStatus.map((status, i) => {
                                        const label = is4WeekChallenge ? `${status.week}주차` : `STEP${status.step}`
                                        return (
                                          <div key={i} className="flex items-center gap-1">
                                            <span className={status.url ? 'text-green-600' : 'text-gray-400'}>
                                              {status.url ? <CheckCircle className="w-3 h-3 inline" /> : <Clock className="w-3 h-3 inline" />}
                                              <span className="ml-1">{label}</span>
                                            </span>
                                            <span className={`ml-1 ${status.url ? 'text-green-600' : 'text-orange-500'}`}>
                                              {status.url ? '✓URL' : '⚠URL없음'}
                                            </span>
                                            <span className={`ml-1 ${status.code ? 'text-green-600' : 'text-orange-500'}`}>
                                              {status.code ? '✓코드' : '⚠코드없음'}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                    {/* 광고코드 요약 */}
                                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                                      {is4WeekChallenge ? (
                                        <div className="space-y-1">
                                          <p className={participant.week1_partnership_code ? 'text-green-600' : 'text-orange-500'}>
                                            1주차 광고코드: {participant.week1_partnership_code || '미등록'}
                                          </p>
                                          <p className={participant.week2_partnership_code ? 'text-green-600' : 'text-orange-500'}>
                                            2주차 광고코드: {participant.week2_partnership_code || '미등록'}
                                          </p>
                                          <p className={participant.week3_partnership_code ? 'text-green-600' : 'text-orange-500'}>
                                            3주차 광고코드: {participant.week3_partnership_code || '미등록'}
                                          </p>
                                          <p className={participant.week4_partnership_code ? 'text-green-600' : 'text-orange-500'}>
                                            4주차 광고코드: {participant.week4_partnership_code || '미등록'}
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <p className={participant.step1_2_partnership_code ? 'text-green-600' : 'text-orange-500'}>
                                            STEP1~2 광고코드: {participant.step1_2_partnership_code || '미등록'}
                                          </p>
                                          <p className={participant.step3_partnership_code ? 'text-green-600' : 'text-orange-500'}>
                                            STEP3 광고코드: {participant.step3_partnership_code || '미등록'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* 전체 최종 확정 버튼 */}
                                  {allVideosHaveSnsUrl ? (
                                    <Button
                                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                      onClick={async () => {
                                        // 광고코드 체크 (campaign_participants 기준)
                                        if (!allVideosHaveAdCode) {
                                          const adCodeWarning = is4WeekChallenge
                                            ? '일부 주차에 광고코드가 없습니다.'
                                            : '일부 STEP에 광고코드가 없습니다.'
                                          if (!confirm(`${adCodeWarning}\n\n광고코드 없이 최종 확정하시겠습니까?`)) return
                                        }
                                        const videoCount = is4WeekChallenge ? 4 : isOliveyoung ? 3 : creatorSubmissions.length
                                        if (!confirm(`전체 최종 확정하시겠습니까?\n\n크리에이터에게 포인트가 지급됩니다.`)) return

                                        // 모든 영상 한 번에 최종 확정 (마지막 영상에서만 포인트 지급)
                                        for (let i = 0; i < creatorSubmissions.length; i++) {
                                          const isLastVideo = i === creatorSubmissions.length - 1
                                          await handleFinalConfirmation(creatorSubmissions[i], !isLastVideo)
                                        }
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      전체 최종 확정
                                    </Button>
                                  ) : (
                                    <div className="text-center text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                                      ⚠️ 모든 {is4WeekChallenge ? '주차' : 'STEP'}에 SNS URL이 등록되어야 최종 확정이 가능합니다.
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-2 text-blue-600 border-blue-300"
                                        onClick={() => {
                                          // 기존 값들을 미리 채워서 모달 열기
                                          const editData = {
                                            participantId: participant.id,
                                            userId: participant.user_id,
                                            campaignType: campaign.campaign_type,
                                            isMultiVideoEdit: true
                                          }
                                          if (campaign.campaign_type === '4week_challenge') {
                                            editData.week1_url = participant.week1_url || ''
                                            editData.week2_url = participant.week2_url || ''
                                            editData.week3_url = participant.week3_url || ''
                                            editData.week4_url = participant.week4_url || ''
                                            editData.week1_partnership_code = participant.week1_partnership_code || ''
                                            editData.week2_partnership_code = participant.week2_partnership_code || ''
                                            editData.week3_partnership_code = participant.week3_partnership_code || ''
                                            editData.week4_partnership_code = participant.week4_partnership_code || ''
                                          } else {
                                            editData.step1_url = participant.step1_url || ''
                                            editData.step2_url = participant.step2_url || ''
                                            editData.step3_url = participant.step3_url || ''
                                            editData.step1_2_partnership_code = participant.step1_2_partnership_code || ''
                                            editData.step3_partnership_code = participant.step3_partnership_code || ''
                                          }
                                          setAdminSnsEditData(editData)
                                          setShowAdminSnsEditModal(true)
                                        }}
                                      >
                                        <Edit2 className="w-3 h-3 mr-1" />
                                        관리자 입력
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 멀티비디오 전체 확정 완료 표시 */}
                              {isMultiVideoCampaign && allVideosConfirmed && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <Badge className="w-full justify-center bg-purple-100 text-purple-700 py-2">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    전체 영상 최종 확정 완료 ({requiredVideoCount}개)
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg">
                              {/* 멀티비디오 캠페인: 컴팩트 UI */}
                              {isMultiVideoCampaign && multiVideoStatus.length > 0 ? (
                                <div className="space-y-3">
                                  {/* 컴팩트 테이블 형식 */}
                                  <div className="overflow-hidden rounded-lg border border-gray-200">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">{is4WeekChallenge ? '주차' : 'STEP'}</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">영상</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">SNS URL</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">광고코드</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {(() => {
                                          const participantVideos = videoSubmissions.filter(sub => sub.user_id === participant.user_id)
                                          const items = is4WeekChallenge ? [1, 2, 3, 4] : [1, 2, 3]

                                          return items.map(num => {
                                            const label = is4WeekChallenge ? `${num}주차` : `STEP${num}`
                                            const url = is4WeekChallenge ? participant[`week${num}_url`] : participant[`step${num}_url`]
                                            const code = is4WeekChallenge
                                              ? participant[`week${num}_partnership_code`]
                                              : (num <= 2 ? participant.step1_2_partnership_code : participant.step3_partnership_code)

                                            // 최신 영상 찾기
                                            const videos = participantVideos
                                              .filter(v => is4WeekChallenge ? v.week_number === num : v.video_number === num)
                                              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                            const latestVideo = videos[0]

                                            return (
                                              <tr key={num} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 font-medium text-gray-700">{label}</td>
                                                <td className="px-3 py-2">
                                                  {latestVideo ? (
                                                    <div className="flex gap-1">
                                                      {latestVideo.clean_video_url && (
                                                        <button
                                                          onClick={async () => {
                                                            try {
                                                              const response = await fetch(latestVideo.clean_video_url)
                                                              const blob = await response.blob()
                                                              const blobUrl = window.URL.createObjectURL(blob)
                                                              const creatorName = participant.creator_name || participant.applicant_name || 'creator'
                                                              const link = document.createElement('a')
                                                              link.href = blobUrl
                                                              link.download = `${creatorName}_${label}_클린본.mp4`
                                                              document.body.appendChild(link)
                                                              link.click()
                                                              document.body.removeChild(link)
                                                              window.URL.revokeObjectURL(blobUrl)
                                                            } catch (e) { window.open(latestVideo.clean_video_url, '_blank') }
                                                          }}
                                                          className="px-2 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
                                                        >
                                                          클린
                                                        </button>
                                                      )}
                                                      {latestVideo.video_file_url && (
                                                        <button
                                                          onClick={async () => {
                                                            try {
                                                              const videoUrl = signedVideoUrls[latestVideo.id] || latestVideo.video_file_url
                                                              const response = await fetch(videoUrl)
                                                              const blob = await response.blob()
                                                              const blobUrl = window.URL.createObjectURL(blob)
                                                              const creatorName = participant.creator_name || participant.applicant_name || 'creator'
                                                              const link = document.createElement('a')
                                                              link.href = blobUrl
                                                              link.download = `${creatorName}_${label}_편집본.mp4`
                                                              document.body.appendChild(link)
                                                              link.click()
                                                              document.body.removeChild(link)
                                                              window.URL.revokeObjectURL(blobUrl)
                                                            } catch (e) { window.open(signedVideoUrls[latestVideo.id] || latestVideo.video_file_url, '_blank') }
                                                          }}
                                                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                                        >
                                                          편집
                                                        </button>
                                                      )}
                                                      {!latestVideo.clean_video_url && !latestVideo.video_file_url && (
                                                        <span className="text-gray-400">-</span>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400">-</span>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {url ? (
                                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                                       className="text-blue-600 hover:underline flex items-center gap-1">
                                                      <ExternalLink className="w-3 h-3" />
                                                      <span className="truncate max-w-[120px]">링크</span>
                                                    </a>
                                                  ) : (
                                                    <span className="text-orange-500">미등록</span>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {code ? (
                                                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{code}</code>
                                                  ) : (
                                                    <span className="text-orange-500">미등록</span>
                                                  )}
                                                </td>
                                              </tr>
                                            )
                                          })
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* 액션 버튼 */}
                                  <div className="flex gap-2">
                                    {allVideosHaveSnsUrl ? (
                                      <Button
                                        size="sm"
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={async () => {
                                          if (!allVideosHaveAdCode) {
                                            if (!confirm('일부 광고코드가 없습니다. 계속하시겠습니까?')) return
                                          }
                                          if (!confirm('전체 최종 확정하시겠습니까?\n크리에이터에게 포인트가 지급됩니다.')) return
                                          await handleMultiVideoFinalConfirmationWithoutSubmissions(participant, is4WeekChallenge ? 4 : 3)
                                        }}
                                      >
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        최종 확정
                                      </Button>
                                    ) : (
                                      <div className="flex-1 text-center text-xs text-orange-600 bg-orange-50 py-2 px-3 rounded-lg">
                                        모든 SNS URL 등록 필요
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-gray-600"
                                      onClick={() => {
                                        const editData = {
                                          participantId: participant.id,
                                          userId: participant.user_id,
                                          campaignType: campaign.campaign_type,
                                          isMultiVideoEdit: true
                                        }
                                        if (campaign.campaign_type === '4week_challenge') {
                                          editData.week1_url = participant.week1_url || ''
                                          editData.week2_url = participant.week2_url || ''
                                          editData.week3_url = participant.week3_url || ''
                                          editData.week4_url = participant.week4_url || ''
                                          editData.week1_partnership_code = participant.week1_partnership_code || ''
                                          editData.week2_partnership_code = participant.week2_partnership_code || ''
                                          editData.week3_partnership_code = participant.week3_partnership_code || ''
                                          editData.week4_partnership_code = participant.week4_partnership_code || ''
                                        } else {
                                          editData.step1_url = participant.step1_url || ''
                                          editData.step2_url = participant.step2_url || ''
                                          editData.step3_url = participant.step3_url || ''
                                          editData.step1_2_partnership_code = participant.step1_2_partnership_code || ''
                                          editData.step3_partnership_code = participant.step3_partnership_code || ''
                                        }
                                        setAdminSnsEditData(editData)
                                        setShowAdminSnsEditModal(true)
                                      }}
                                    >
                                      <Edit2 className="w-3 h-3 mr-1" />
                                      수정
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-3 text-gray-500 text-sm">
                                  제출된 영상이 없습니다.
                                  {participant.content_url && (
                                    <a href={participant.content_url} target="_blank" rel="noopener noreferrer"
                                       className="inline-flex items-center gap-1 text-blue-600 hover:underline ml-2">
                                      <ExternalLink className="w-3 h-3" /> 콘텐츠 보기
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  )
                })()}
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
                <p className="font-medium">
                  {campaign.application_deadline
                    ? new Date(campaign.application_deadline).toLocaleDateString()
                    : <span className="text-red-500">미설정</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">캠페인 기간</p>
                <p className="font-medium">
                  {campaign.start_date && campaign.end_date
                    ? `${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`
                    : <span className="text-red-500">미설정</span>}
                </p>
              </div>
            </div>

            {/* 영상 제출 마감일 */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600 font-medium">영상 제출 마감일</p>
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => setShowDeadlineEditModal(true)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    수정
                  </Button>
                ) : (
                  <a
                    href="http://pf.kakao.com/_FxhqTG/chat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-blue-500"
                  >
                    수정 요청 →
                  </a>
                )}
              </div>
              {campaign.campaign_type === '4week_challenge' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <p className="text-xs text-purple-600">1주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week1_deadline
                        ? new Date(campaign.week1_deadline).toLocaleDateString()
                        : <span className="text-red-500">미설정</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <p className="text-xs text-purple-600">2주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week2_deadline
                        ? new Date(campaign.week2_deadline).toLocaleDateString()
                        : <span className="text-red-500">미설정</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <p className="text-xs text-purple-600">3주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week3_deadline
                        ? new Date(campaign.week3_deadline).toLocaleDateString()
                        : <span className="text-red-500">미설정</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <p className="text-xs text-purple-600">4주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week4_deadline
                        ? new Date(campaign.week4_deadline).toLocaleDateString()
                        : <span className="text-red-500">미설정</span>}
                    </p>
                  </div>
                </div>
              ) : (campaign.campaign_type === 'oliveyoung' || campaign.is_oliveyoung_sale) ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-600">1차 영상</p>
                    <p className="font-medium text-sm">
                      {campaign.step1_deadline
                        ? new Date(campaign.step1_deadline).toLocaleDateString()
                        : <span className="text-red-500">미설정</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-600">2차 영상</p>
                    <p className="font-medium text-sm">
                      {campaign.step2_deadline
                        ? new Date(campaign.step2_deadline).toLocaleDateString()
                        : <span className="text-red-500">미설정</span>}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-blue-50 rounded-lg text-center w-fit">
                  <p className="text-xs text-blue-600">영상 제출 마감</p>
                  <p className="font-medium text-sm">
                    {(campaign.content_submission_deadline || campaign.start_date)
                      ? new Date(campaign.content_submission_deadline || campaign.start_date).toLocaleDateString()
                      : <span className="text-red-500">미설정</span>}
                  </p>
                </div>
              )}
            </div>

            {/* SNS 업로드 예정일 */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600 font-medium">SNS 업로드 예정일</p>
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => setShowDeadlineEditModal(true)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    수정
                  </Button>
                ) : (
                  <a
                    href="http://pf.kakao.com/_FxhqTG/chat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-blue-500"
                  >
                    수정 요청 →
                  </a>
                )}
              </div>
              {campaign.campaign_type === '4week_challenge' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2 bg-pink-50 rounded-lg text-center">
                    <p className="text-xs text-pink-600">1주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week1_sns_deadline
                        ? new Date(campaign.week1_sns_deadline).toLocaleDateString()
                        : <span className="text-gray-400">-</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-pink-50 rounded-lg text-center">
                    <p className="text-xs text-pink-600">2주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week2_sns_deadline
                        ? new Date(campaign.week2_sns_deadline).toLocaleDateString()
                        : <span className="text-gray-400">-</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-pink-50 rounded-lg text-center">
                    <p className="text-xs text-pink-600">3주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week3_sns_deadline
                        ? new Date(campaign.week3_sns_deadline).toLocaleDateString()
                        : <span className="text-gray-400">-</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-pink-50 rounded-lg text-center">
                    <p className="text-xs text-pink-600">4주차</p>
                    <p className="font-medium text-sm">
                      {campaign.week4_sns_deadline
                        ? new Date(campaign.week4_sns_deadline).toLocaleDateString()
                        : <span className="text-gray-400">-</span>}
                    </p>
                  </div>
                </div>
              ) : (campaign.campaign_type === 'oliveyoung' || campaign.is_oliveyoung_sale) ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-pink-50 rounded-lg text-center">
                    <p className="text-xs text-pink-600">1차 SNS</p>
                    <p className="font-medium text-sm">
                      {campaign.step1_sns_deadline
                        ? new Date(campaign.step1_sns_deadline).toLocaleDateString()
                        : <span className="text-gray-400">-</span>}
                    </p>
                  </div>
                  <div className="p-2 bg-pink-50 rounded-lg text-center">
                    <p className="text-xs text-pink-600">2차 SNS</p>
                    <p className="font-medium text-sm">
                      {campaign.step2_sns_deadline
                        ? new Date(campaign.step2_sns_deadline).toLocaleDateString()
                        : <span className="text-gray-400">-</span>}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-pink-50 rounded-lg text-center w-fit">
                  <p className="text-xs text-pink-600">SNS 업로드</p>
                  <p className="font-medium text-sm">
                    {(campaign.sns_upload_deadline || campaign.end_date)
                      ? new Date(campaign.sns_upload_deadline || campaign.end_date).toLocaleDateString()
                      : <span className="text-gray-400">-</span>}
                  </p>
                </div>
              )}
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

                            {/* 촬영 씬 - Support both shooting_scenes and scenes format */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold mb-3">
                                촬영 씬 ({(guideData.scenes || guideData.shooting_scenes)?.length || 0}개)
                                {(region === 'us' || region === 'japan') && (
                                  <span className="ml-2 text-sm font-normal text-blue-600">
                                    ({region === 'japan' ? '일본어' : '영어'} 번역 포함)
                                  </span>
                                )}
                              </h4>
                              <div className="space-y-4">
                                {(guideData.scenes || guideData.shooting_scenes || []).map((scene, idx) => {
                                  const scenesKey = guideData.scenes ? 'scenes' : 'shooting_scenes';
                                  const isUSJapan = region === 'us' || region === 'japan';
                                  const targetLang = region === 'japan' ? '일본어' : '영어';

                                  return (
                                    <div key={idx} className="bg-white p-4 rounded border">
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                          {scene.order || idx + 1}
                                        </span>
                                        <input
                                          type="text"
                                          value={scene.scene_type || ''}
                                          onChange={(e) => {
                                            const updated = { ...guideData };
                                            updated[scenesKey][idx].scene_type = e.target.value;
                                            setEditedGuideContent(JSON.stringify(updated, null, 2));
                                          }}
                                          className="px-3 py-1.5 border rounded-lg text-sm flex-1"
                                          placeholder="씬 타입 (예: 훅, 제품 소개)"
                                        />
                                      </div>

                                      {/* Scene Description - Side by side for US/Japan */}
                                      <div className={`space-y-2 text-sm ${isUSJapan ? 'grid grid-cols-2 gap-4' : ''}`}>
                                        <div>
                                          <label className="block text-gray-600 font-medium mb-1">장면 설명 (한국어)</label>
                                          <textarea
                                            value={scene.scene_description || ''}
                                            onChange={(e) => {
                                              const updated = { ...guideData };
                                              updated[scenesKey][idx].scene_description = e.target.value;
                                              setEditedGuideContent(JSON.stringify(updated, null, 2));
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg resize-none"
                                            rows={3}
                                            placeholder="촬영해야 할 장면 설명"
                                          />
                                        </div>
                                        {isUSJapan && (
                                          <div>
                                            <label className="block text-blue-600 font-medium mb-1">장면 설명 ({targetLang})</label>
                                            <textarea
                                              value={scene.scene_description_translated || ''}
                                              onChange={(e) => {
                                                const updated = { ...guideData };
                                                updated[scenesKey][idx].scene_description_translated = e.target.value;
                                                setEditedGuideContent(JSON.stringify(updated, null, 2));
                                              }}
                                              className="w-full px-3 py-2 border border-blue-200 rounded-lg resize-none bg-blue-50"
                                              rows={3}
                                              placeholder={`${targetLang} 번역`}
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Dialogue - Side by side for US/Japan */}
                                      <div className={`space-y-2 text-sm mt-3 ${isUSJapan ? 'grid grid-cols-2 gap-4' : ''}`}>
                                        <div>
                                          <label className="block text-gray-600 font-medium mb-1">대사 (한국어)</label>
                                          <textarea
                                            value={scene.dialogue || ''}
                                            onChange={(e) => {
                                              const updated = { ...guideData };
                                              updated[scenesKey][idx].dialogue = e.target.value;
                                              setEditedGuideContent(JSON.stringify(updated, null, 2));
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg resize-none"
                                            rows={3}
                                            placeholder="크리에이터가 말할 대사"
                                          />
                                        </div>
                                        {isUSJapan && (
                                          <div>
                                            <label className="block text-green-600 font-medium mb-1">대사 ({targetLang})</label>
                                            <textarea
                                              value={scene.dialogue_translated || ''}
                                              onChange={(e) => {
                                                const updated = { ...guideData };
                                                updated[scenesKey][idx].dialogue_translated = e.target.value;
                                                setEditedGuideContent(JSON.stringify(updated, null, 2));
                                              }}
                                              className="w-full px-3 py-2 border border-green-200 rounded-lg resize-none bg-green-50"
                                              rows={3}
                                              placeholder={`${targetLang} 번역`}
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Shooting Tip - Side by side for US/Japan */}
                                      <div className={`space-y-2 text-sm mt-3 ${isUSJapan ? 'grid grid-cols-2 gap-4' : ''}`}>
                                        <div>
                                          <label className="block text-gray-600 font-medium mb-1">촬영 팁 (한국어)</label>
                                          <input
                                            type="text"
                                            value={scene.shooting_tip || ''}
                                            onChange={(e) => {
                                              const updated = { ...guideData };
                                              updated[scenesKey][idx].shooting_tip = e.target.value;
                                              setEditedGuideContent(JSON.stringify(updated, null, 2));
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            placeholder="촬영 팁 (선택)"
                                          />
                                        </div>
                                        {isUSJapan && (
                                          <div>
                                            <label className="block text-amber-600 font-medium mb-1">촬영 팁 ({targetLang})</label>
                                            <input
                                              type="text"
                                              value={scene.shooting_tip_translated || ''}
                                              onChange={(e) => {
                                                const updated = { ...guideData };
                                                updated[scenesKey][idx].shooting_tip_translated = e.target.value;
                                                setEditedGuideContent(JSON.stringify(updated, null, 2));
                                              }}
                                              className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-amber-50"
                                              placeholder={`${targetLang} 번역`}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
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
                  /* Use different viewer based on region */
                  (region === 'us' || region === 'japan') ? (
                    <USJapanGuideViewer
                      guide={selectedGuide.personalized_guide}
                      creator={selectedGuide}
                      region={region}
                      onSave={async (updatedGuide) => {
                        // US/Japan use API to bypass RLS
                        try {
                          const saveResponse = await fetch('/.netlify/functions/save-personalized-guide', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              region: region,
                              applicationId: selectedGuide.id,
                              guide: updatedGuide
                            })
                          })

                          if (!saveResponse.ok) {
                            const errorData = await saveResponse.json()
                            throw new Error(errorData.error || 'Failed to save guide')
                          }

                          // Update local state
                          setSelectedGuide({ ...selectedGuide, personalized_guide: updatedGuide })
                          const updatedParticipants = participants.map(p =>
                            p.id === selectedGuide.id ? { ...p, personalized_guide: updatedGuide } : p
                          )
                          setParticipants(updatedParticipants)

                          // Refresh participants to ensure data consistency
                          await fetchParticipants()
                        } catch (error) {
                          console.error('가이드 저장 실패:', error)
                          throw new Error('데이터베이스 저장 실패: ' + error.message)
                        }
                      }}
                    />
                  ) : (
                    <PersonalizedGuideViewer
                      guide={selectedGuide.personalized_guide}
                      creator={selectedGuide}
                      onSave={async (updatedGuide) => {
                        const { error } = await supabase
                          .from('applications')
                          .update({
                            personalized_guide: updatedGuide
                          })
                          .eq('id', selectedGuide.id)

                        if (error) {
                          console.error('가이드 저장 실패:', error)
                          throw new Error('데이터베이스 저장 실패: ' + error.message)
                        }

                        // Update local state
                        setSelectedGuide({ ...selectedGuide, personalized_guide: updatedGuide })
                        const updatedParticipants = participants.map(p =>
                          p.id === selectedGuide.id ? { ...p, personalized_guide: updatedGuide } : p
                        )
                        setParticipants(updatedParticipants)

                        // Refresh participants to ensure data consistency
                        await fetchParticipants()
                      }}
                    />
                  )
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
                          // Parse the content to ensure it's valid JSON if it's a string
                          let guideToSave = editedGuideContent
                          if (typeof editedGuideContent === 'string') {
                            try {
                              guideToSave = JSON.parse(editedGuideContent)
                            } catch (e) {
                              // If parse fails, keep as string
                            }
                          }

                          // US/Japan use API to bypass RLS
                          if (region === 'us' || region === 'japan') {
                            const saveResponse = await fetch('/.netlify/functions/save-personalized-guide', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                region: region,
                                applicationId: selectedGuide.id,
                                guide: guideToSave
                              })
                            })

                            if (!saveResponse.ok) {
                              const errorData = await saveResponse.json()
                              throw new Error(errorData.error || 'Failed to save guide')
                            }
                          } else {
                            await supabase
                              .from('applications')
                              .update({
                                personalized_guide: guideToSave
                              })
                              .eq('id', selectedGuide.id)
                          }

                          alert('가이드가 저장되었습니다.')
                          setEditingGuide(false)
                          await fetchParticipants()
                          setShowGuideModal(false)
                          setSelectedGuide(null)
                        } catch (error) {
                          console.error('Error saving guide:', error)
                          alert('저장에 실패했습니다: ' + error.message)
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
                        // Properly convert object to JSON string if needed
                        const guide = selectedGuide.personalized_guide
                        if (typeof guide === 'object' && guide !== null) {
                          setEditedGuideContent(JSON.stringify(guide, null, 2))
                        } else {
                          setEditedGuideContent(guide || '')
                        }
                      }}
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      직접 수정
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAIEditModal(true)
                        setAIEditPrompt('')
                      }}
                      className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      AI로 수정
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

      {/* AI 가이드 수정 모달 */}
      {showAIEditModal && selectedGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI로 가이드 수정하기
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedGuide.creator_name || selectedGuide.applicant_name}님의 가이드를 AI가 수정합니다
              </p>
            </div>

            <div className="px-6 py-4">
              {/* 빠른 선택 프롬프트 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  빠른 선택
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    '더 친근한 말투로 변경해줘',
                    '제품 장점을 더 강조해줘',
                    '촬영 가이드를 더 상세하게 해줘',
                    '문장을 더 짧고 간결하게 해줘',
                    '해시태그를 추가해줘',
                    '주의사항을 더 명확하게 해줘'
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAIEditPrompt(prompt)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        aiEditPrompt === prompt
                          ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 커스텀 프롬프트 입력 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수정 요청사항 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={aiEditPrompt}
                  onChange={(e) => setAIEditPrompt(e.target.value)}
                  className="w-full h-28 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="예: 더 친근한 톤으로 변경하고, 제품의 보습 효과를 강조해줘"
                  disabled={isAIEditing}
                />
              </div>

              {/* 현재 가이드 미리보기 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 가이드 (참고용)
                </label>
                <div className="max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg border text-sm text-gray-600">
                  {selectedGuide.personalized_guide?.substring(0, 500)}
                  {selectedGuide.personalized_guide?.length > 500 && '...'}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAIEditModal(false)
                  setAIEditPrompt('')
                }}
                disabled={isAIEditing}
              >
                취소
              </Button>
              <Button
                onClick={async () => {
                  if (!aiEditPrompt.trim()) {
                    alert('수정 요청사항을 입력해주세요.')
                    return
                  }

                  setIsAIEditing(true)

                  try {
                    // AI로 가이드 재생성
                    const regenerateResponse = await fetch('/.netlify/functions/regenerate-personalized-guide', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        existingGuide: selectedGuide.personalized_guide,
                        regenerateRequest: aiEditPrompt,
                        creatorAnalysis: selectedGuide.creator_analysis,
                        productInfo: {
                          brand: campaign.brand,
                          product_name: campaign.product_name,
                          title: campaign.title
                        }
                      })
                    })

                    if (!regenerateResponse.ok) {
                      throw new Error('AI 수정에 실패했습니다.')
                    }

                    const { regeneratedGuide } = await regenerateResponse.json()

                    // 데이터베이스에 업데이트
                    const { error } = await supabase
                      .from('applications')
                      .update({
                        personalized_guide: regeneratedGuide
                      })
                      .eq('id', selectedGuide.id)

                    if (error) throw error

                    // 로컬 상태 업데이트
                    setSelectedGuide({ ...selectedGuide, personalized_guide: regeneratedGuide })
                    const updatedParticipants = participants.map(p =>
                      p.id === selectedGuide.id ? { ...p, personalized_guide: regeneratedGuide } : p
                    )
                    setParticipants(updatedParticipants)

                    alert('가이드가 AI로 수정되었습니다!')
                    setShowAIEditModal(false)
                    setAIEditPrompt('')
                    await fetchParticipants()
                  } catch (error) {
                    console.error('Error AI editing guide:', error)
                    alert('AI 수정에 실패했습니다: ' + error.message)
                  } finally {
                    setIsAIEditing(false)
                  }
                }}
                disabled={isAIEditing || !aiEditPrompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isAIEditing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    수정 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI로 수정하기
                  </>
                )}
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
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold mr-2">
                            V{file.version || index + 1}
                          </span>
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

            {/* 업로드 기한 설정 */}
            <div className="px-6 py-3 border-t bg-blue-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업로드 기한 설정 (승인 시 크리에이터에게 전달됨)
              </label>
              <input
                type="text"
                value={uploadDeadline}
                onChange={(e) => setUploadDeadline(e.target.value)}
                placeholder="예: 2024년 1월 15일, 승인 후 3일 이내"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVideoModal(false)
                  setSelectedParticipant(null)
                  setRevisionComment('')
                  setUploadDeadline('승인 완료 후 1일 이내')
                }}
              >
                닫기
              </Button>
              <Button
                onClick={async () => {
                  if (!uploadDeadline.trim()) {
                    alert('업로드 기한을 입력해주세요.')
                    return
                  }

                  try {
                    const { error } = await supabase
                      .from('applications')
                      .update({
                        video_status: 'approved',
                        upload_deadline: uploadDeadline
                      })
                      .eq('id', selectedParticipant.id)

                    if (error) throw error

                    // 크리에이터에게 영상 승인 완료 알림톡 발송
                    // 먼저 applications 테이블에서 직접 phone_number 확인 (한국 캠페인용)
                    let phone = selectedParticipant.phone_number || selectedParticipant.phone
                    let email = selectedParticipant.email
                    let creatorName = selectedParticipant.creator_name || selectedParticipant.applicant_name || '크리에이터'

                    // applications에 전화번호가 없으면 user_profiles에서 조회
                    if (!phone && selectedParticipant.user_id) {
                      const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('phone, email, full_name')
                        .eq('id', selectedParticipant.user_id)
                        .single()

                      if (profile) {
                        phone = profile.phone
                        email = email || profile.email
                        creatorName = profile.full_name || creatorName
                      }
                    }

                    console.log('알림톡 발송 정보:', { phone, email, creatorName, source: selectedParticipant.phone_number ? 'applications' : 'user_profiles' })

                    if (phone) {
                      try {
                        await fetch('/.netlify/functions/send-kakao-notification', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            receiverNum: phone.replace(/-/g, ''),
                            receiverName: creatorName,
                            templateCode: '025100001017',
                            variables: {
                              '크리에이터명': creatorName,
                              '캠페인명': campaign?.title || '캠페인',
                              '업로드기한': uploadDeadline
                            }
                          })
                        })
                        const kakaoResult = await kakaoResponse.json()
                        console.log('✓ 영상 승인 완료 알림톡 응답:', kakaoResult)
                        if (!kakaoResponse.ok || !kakaoResult.success) {
                          console.error('알림톡 발송 실패 응답:', kakaoResult)
                          const errorMsg = kakaoResult.errorDescription || kakaoResult.error || '알 수 없는 오류'
                          console.error(`알림톡 오류: ${errorMsg}`, kakaoResult.debug || {})
                        }
                      } catch (kakaoError) {
                        console.error('알림톡 발송 실패:', kakaoError)
                      }
                    } else {
                      console.log('알림톡 발송 스킵 - 전화번호 없음:', { user_id: selectedParticipant?.user_id, phone_number: selectedParticipant?.phone_number, phone: selectedParticipant?.phone })
                    }

                    // 이메일 발송
                    if (email) {
                      try {
                        await fetch('/.netlify/functions/send-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: email,
                            subject: `[CNEC] 영상 검수 완료 - ${campaign?.title || '캠페인'}`,
                            html: `
                              <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #10B981;">영상이 최종 승인되었습니다!</h2>
                                <p>안녕하세요, <strong>${creatorName}</strong>님!</p>
                                <p>참여하신 캠페인의 영상이 최종 승인되었습니다. 이제 SNS에 영상을 업로드해 주세요.</p>
                                <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                                  <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign?.title || '캠페인'}</p>
                                  <p style="margin: 5px 0;"><strong>업로드 기한:</strong> ${uploadDeadline}</p>
                                </div>
                                <p>업로드 완료 후, 크리에이터 대시보드에서 업로드 링크를 등록해 주세요.</p>
                                <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀</p>
                              </div>
                            `
                          })
                        })
                        console.log('✓ 영상 승인 완료 이메일 발송 성공')
                      } catch (emailError) {
                        console.error('영상 승인 이메일 발송 실패:', emailError)
                      }
                    }

                    alert('영상이 승인되었습니다!')
                    setShowVideoModal(false)
                    setSelectedParticipant(null)
                    setUploadDeadline('승인 완료 후 1일 이내')
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

                    // 팝빌 알림톡 및 이메일 발송 (수정 요청)
                    if (selectedParticipant.user_id) {
                      const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('phone, email')
                        .eq('id', selectedParticipant.user_id)
                        .maybeSingle()

                      const creatorName = selectedParticipant.creator_name || selectedParticipant.applicant_name || '크리에이터'

                      // 알림톡 발송
                      if (profile?.phone) {
                        try {
                          // 재제출 기한: 오늘 + 2일
                          const resubmitDate = new Date()
                          resubmitDate.setDate(resubmitDate.getDate() + 2)
                          const resubmitDeadline = resubmitDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

                          await fetch('/.netlify/functions/send-kakao-notification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              receiverNum: profile.phone,
                              receiverName: creatorName,
                              templateCode: '025100001016',  // 영상 수정 요청 템플릿
                              variables: {
                                '크리에이터명': creatorName,
                                '캠페인명': campaign.title,
                                '요청일': new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
                                '재제출기한': resubmitDeadline
                              }
                            })
                          })
                          console.log('수정 요청 알림톡 발송 성공')
                        } catch (alimtalkError) {
                          console.error('수정 요청 알림톡 발송 실패:', alimtalkError)
                        }
                      }

                      // 이메일 발송
                      if (profile?.email) {
                        try {
                          await fetch('/.netlify/functions/send-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              to: profile.email,
                              subject: `[CNEC] 영상 수정 요청 - ${campaign.title}`,
                              html: `
                                <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                  <h2 style="color: #F59E0B;">영상 수정이 요청되었습니다</h2>
                                  <p>안녕하세요, <strong>${creatorName}</strong>님!</p>
                                  <p>참여하신 캠페인의 영상에 대해 수정이 요청되었습니다.</p>
                                  <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                                    <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaign.title}</p>
                                    <p style="margin: 10px 0 5px 0;"><strong>수정 요청 내용:</strong></p>
                                    <p style="margin: 5px 0; white-space: pre-wrap;">${revisionComment}</p>
                                  </div>
                                  <p>수정 후 다시 제출해 주세요.</p>
                                  <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀</p>
                                </div>
                              `
                            })
                          })
                          console.log('수정 요청 이메일 발송 성공')
                        } catch (emailError) {
                          console.error('수정 요청 이메일 발송 실패:', emailError)
                        }
                      }
                    }

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
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* 고정 헤더 */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
              <h2 className="text-xl font-bold text-gray-900">지원서 보기</h2>
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  setSelectedParticipant(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 스크롤 가능한 컨텐츠 */}
            <div className="overflow-y-auto flex-1">
              {/* 프로필 상단 */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-center">
                <img
                  src={selectedParticipant.profile_photo_url || '/default-avatar.png'}
                  alt={selectedParticipant.name}
                  className="w-32 h-32 rounded-full mx-auto border-4 border-white shadow-lg object-cover"
                />
                <h2 className="text-2xl font-bold text-white mt-4">{selectedParticipant.name || selectedParticipant.applicant_name}</h2>
                {selectedParticipant.age && (
                  <p className="text-blue-100 mt-1">{selectedParticipant.age}세</p>
                )}
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
                      href={normalizeSnsUrl(selectedParticipant.youtube_url, 'youtube')}
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
                      href={normalizeSnsUrl(selectedParticipant.instagram_url, 'instagram')}
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
                      href={normalizeSnsUrl(selectedParticipant.tiktok_url, 'tiktok')}
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

              {/* 지원서 답변 */}
              {(selectedParticipant.answer_1 || selectedParticipant.answer_2 || selectedParticipant.answer_3 || selectedParticipant.answer_4) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">지원서 질문 & 답변</h3>
                  <div className="space-y-4">
                    {selectedParticipant.answer_1 && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-600 mb-2">Q. {campaign?.question1 || campaign?.questions?.[0]?.question || '질문 1'}</div>
                        <div className="text-gray-800 pl-4 border-l-2 border-blue-200">{selectedParticipant.answer_1}</div>
                      </div>
                    )}
                    {selectedParticipant.answer_2 && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-600 mb-2">Q. {campaign?.question2 || campaign?.questions?.[1]?.question || '질문 2'}</div>
                        <div className="text-gray-800 pl-4 border-l-2 border-blue-200">{selectedParticipant.answer_2}</div>
                      </div>
                    )}
                    {selectedParticipant.answer_3 && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-600 mb-2">Q. {campaign?.question3 || campaign?.questions?.[2]?.question || '질문 3'}</div>
                        <div className="text-gray-800 pl-4 border-l-2 border-blue-200">{selectedParticipant.answer_3}</div>
                      </div>
                    )}
                    {selectedParticipant.answer_4 && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-600 mb-2">Q. {campaign?.question4 || campaign?.questions?.[3]?.question || '질문 4'}</div>
                        <div className="text-gray-800 pl-4 border-l-2 border-blue-200">{selectedParticipant.answer_4}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 지원자 한마디 */}
              {selectedParticipant.additional_info && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">지원자 한마디</h3>
                  <div className="p-4 bg-blue-50 rounded-lg text-gray-800 whitespace-pre-wrap">
                    {selectedParticipant.additional_info}
                  </div>
                </div>
              )}
            </div>
            </div>{/* 스크롤 컨테이너 닫기 */}
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

      {/* Olive Young Guide Modal */}
      {showUnifiedGuideModal && campaign.campaign_type === 'oliveyoung' && (
        <OliveYoungGuideModal
          campaign={campaign}
          onClose={() => setShowUnifiedGuideModal(false)}
          onSave={fetchCampaignDetail}
          supabase={supabase}
        />
      )}

      {/* 4-Week Challenge Guide Modal */}
      {show4WeekGuideModal && campaign.campaign_type === '4week_challenge' && (
        <FourWeekGuideViewer
          campaign={campaign}
          onClose={() => setShow4WeekGuideModal(false)}
        />
      )}

      {/* Oliveyoung Guide Modal */}
      {showOliveyoungGuideModal && campaign.campaign_type === 'oliveyoung' && (
        <OliveyoungGuideModal
          campaign={campaign}
          onClose={() => setShowOliveyoungGuideModal(false)}
          onUpdate={fetchCampaignDetail}
          supabase={supabase}
        />
      )}

      {/* 선정 후 프로세스 안내 튜토리얼 모달 */}
      <PostSelectionSetupModal
        isOpen={showPostSelectionModal}
        onClose={() => {
          setShowPostSelectionModal(false)
          setCreatorForSetup(null)
        }}
        creator={creatorForSetup}
        campaign={campaign}
      />

      {/* 가이드 유형 선택 모달 (AI vs 파일/URL) */}
      {showGuideSelectModal && selectedParticipantForGuide && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-5 text-white relative sticky top-0">
              <button
                onClick={() => {
                  setShowGuideSelectModal(false)
                  setSelectedParticipantForGuide(null)
                  setExternalGuideData({ type: null, url: null, fileUrl: null, fileName: null, title: '' })
                }}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">가이드 전달 방식 선택</h2>
                  <p className="text-sm opacity-90">{selectedParticipantForGuide.creator_name || selectedParticipantForGuide.applicant_name}님</p>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 space-y-4">
              {/* 기획형: AI 가이드 생성 / 올영,4주: 기존 AI 가이드 사용 */}
              {(() => {
                const is4Week = campaign?.campaign_type === '4week_challenge'
                const isOliveyoung = campaign?.campaign_type === 'oliveyoung' || campaign?.campaign_type === 'oliveyoung_sale'

                // 올영/4주는 캠페인 레벨의 기존 AI 가이드 사용
                if (is4Week || isOliveyoung) {
                  // 기존 AI 가이드가 있는지 확인
                  const hasAiGuide = is4Week
                    ? campaign?.challenge_weekly_guides_ai || campaign?.challenge_weekly_guides
                    : campaign?.oliveyoung_step1_guide_ai || campaign?.oliveyoung_step2_guide_ai

                  return (
                    <button
                      onClick={async () => {
                        if (!hasAiGuide) {
                          alert(is4Week
                            ? '4주 챌린지 AI 가이드가 생성되지 않았습니다. 캠페인 설정에서 먼저 가이드를 생성해주세요.'
                            : '올영 AI 가이드가 생성되지 않았습니다. 캠페인 설정에서 먼저 가이드를 생성해주세요.')
                          return
                        }
                        const creatorName = selectedParticipantForGuide.creator_name || selectedParticipantForGuide.applicant_name || '크리에이터'
                        if (!confirm(`${creatorName}님에게 기존 AI 가이드를 전달하시겠습니까?`)) return

                        try {
                          // 캠페인 레벨 AI 가이드를 참조하는 타입으로 저장
                          const guidePayload = {
                            type: is4Week ? '4week_ai' : 'oliveyoung_ai',
                            campaignId: campaign.id
                          }

                          const { error } = await supabase
                            .from('applications')
                            .update({
                              personalized_guide: JSON.stringify(guidePayload),
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', selectedParticipantForGuide.id)

                          if (error) throw error

                          alert(`${creatorName}님에게 AI 가이드가 설정되었습니다. 전달하기 버튼으로 알림톡을 발송하세요.`)
                          setShowGuideSelectModal(false)
                          setSelectedParticipantForGuide(null)
                          await fetchParticipants()
                        } catch (error) {
                          console.error('Error saving AI guide reference:', error)
                          alert('가이드 설정에 실패했습니다: ' + error.message)
                        }
                      }}
                      disabled={!hasAiGuide}
                      className={`w-full p-4 border-2 rounded-xl transition-all text-left group ${
                        hasAiGuide
                          ? 'border-purple-200 hover:border-purple-500 hover:bg-purple-50'
                          : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          hasAiGuide ? 'bg-purple-100 group-hover:bg-purple-200' : 'bg-gray-100'
                        }`}>
                          <Sparkles className={`w-6 h-6 ${hasAiGuide ? 'text-purple-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className={`font-bold ${hasAiGuide ? 'text-gray-900' : 'text-gray-500'}`}>
                            기존 AI 가이드 사용
                          </h3>
                          <p className="text-sm text-gray-500">
                            {is4Week ? '4주 챌린지 캠페인 가이드' : '올영 캠페인 가이드'}
                            {!hasAiGuide && ' (미생성)'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                }

                // 기획형: AI 가이드 새로 생성
                return (
                  <button
                    onClick={async () => {
                      const creatorName = selectedParticipantForGuide.creator_name || selectedParticipantForGuide.applicant_name || '크리에이터'
                      if (!confirm(`${creatorName}님의 AI 맞춤 가이드를 생성하시겠습니까?`)) return
                      setShowGuideSelectModal(false)
                      await handleGeneratePersonalizedGuides([selectedParticipantForGuide])
                      setSelectedParticipantForGuide(null)
                    }}
                    className="w-full p-4 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">AI 가이드 생성</h3>
                        <p className="text-sm text-gray-500">크리에이터 맞춤형 가이드를 AI가 자동 생성</p>
                      </div>
                    </div>
                  </button>
                )
              })()}

              {/* 파일/URL 전달 옵션 */}
              <div className="border-2 border-blue-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 p-4 bg-blue-50">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Link className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">파일/URL 전달</h3>
                    <p className="text-sm text-gray-500">구글 슬라이드, PDF 파일 등 직접 전달</p>
                  </div>
                </div>

                {/* ExternalGuideUploader 사용 */}
                <div className="p-4 pt-0">
                  <ExternalGuideUploader
                    value={externalGuideData}
                    onChange={setExternalGuideData}
                    campaignId={campaign?.id}
                    prefix={`guide_${selectedParticipantForGuide.id}_`}
                    className="border-0 p-0"
                    supabaseClient={supabase}
                  />

                  {/* 전달 버튼 */}
                  <Button
                    onClick={async () => {
                      // URL 또는 파일이 있는지 확인
                      if (!externalGuideData.url && !externalGuideData.fileUrl) {
                        alert('URL을 입력하거나 PDF 파일을 업로드해주세요.')
                        return
                      }
                      const creatorName = selectedParticipantForGuide.creator_name || selectedParticipantForGuide.applicant_name || '크리에이터'
                      if (!confirm(`${creatorName}님에게 가이드를 전달하시겠습니까?`)) return

                      try {
                        // 외부 가이드 데이터를 personalized_guide에 저장
                        const guidePayload = {
                          type: externalGuideData.fileUrl ? 'external_pdf' : 'external_url',
                          url: externalGuideData.url || null,
                          fileUrl: externalGuideData.fileUrl || null,
                          fileName: externalGuideData.fileName || null,
                          title: externalGuideData.title || ''
                        }

                        const { error } = await supabase
                          .from('applications')
                          .update({
                            personalized_guide: JSON.stringify(guidePayload),
                            updated_at: new Date().toISOString(),
                            status: 'filming'
                          })
                          .eq('id', selectedParticipantForGuide.id)

                        if (error) throw error

                        // 알림톡 발송
                        try {
                          const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('phone')
                            .eq('id', selectedParticipantForGuide.user_id)
                            .maybeSingle()

                          if (profile?.phone) {
                            await sendGuideDeliveredNotification(
                              profile.phone,
                              creatorName,
                              {
                                campaignName: campaign?.title || '캠페인',
                                deadline: campaign?.content_deadline
                                  ? new Date(campaign.content_deadline).toLocaleDateString('ko-KR')
                                  : '확인 필요'
                              }
                            )
                          }
                        } catch (notifError) {
                          console.error('알림톡 발송 실패:', notifError)
                        }

                        alert(`${creatorName}님에게 가이드가 전달되었습니다.`)
                        setShowGuideSelectModal(false)
                        setSelectedParticipantForGuide(null)
                        setExternalGuideData({ type: null, url: null, fileUrl: null, fileName: null, title: '' })
                        await fetchParticipants()
                      } catch (error) {
                        console.error('Error saving external guide:', error)
                        alert('가이드 저장에 실패했습니다: ' + error.message)
                      }
                    }}
                    disabled={!externalGuideData.url && !externalGuideData.fileUrl}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    가이드 전달하기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 캠페인 정보 팝업 */}
      {showCampaignGuidePopup && campaign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 text-white relative">
              <button
                onClick={() => setShowCampaignGuidePopup(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">캠페인 정보</h2>
                  <p className="text-sm opacity-90">{campaign.title}</p>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* 캠페인 요구사항 */}
              {(campaign.requirements || campaign.description) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-800">캠페인 요구사항</h3>
                  <p className="text-gray-700">{campaign.requirements || campaign.description}</p>
                </div>
              )}

              {/* 상품 정보 */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800">상품 정보</h3>
                {(campaign.product_name || campaign.title) && (
                  <div>
                    <span className="text-sm text-gray-500">상품명: </span>
                    <span className="text-gray-800">{campaign.product_name || campaign.title}</span>
                  </div>
                )}
                {(campaign.product_url || campaign.product_link) && (
                  <div>
                    <span className="text-sm text-gray-500">상품 링크: </span>
                    <a
                      href={(campaign.product_url || campaign.product_link).startsWith('http') ? (campaign.product_url || campaign.product_link) : `https://${campaign.product_url || campaign.product_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {campaign.product_url || campaign.product_link}
                    </a>
                  </div>
                )}
              </div>

              {/* 일정 정보 */}
              <div className="grid grid-cols-2 gap-6">
                {campaign.recruitment_deadline && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-1">모집 마감일</h3>
                    <p className="text-gray-700">{new Date(campaign.recruitment_deadline).toLocaleDateString('ko-KR')}</p>
                  </div>
                )}
                {(campaign.campaign_start_date || campaign.campaign_end_date) && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-1">캠페인 기간</h3>
                    <p className="text-gray-700">
                      {campaign.campaign_start_date && new Date(campaign.campaign_start_date).toLocaleDateString('ko-KR')}
                      {campaign.campaign_start_date && campaign.campaign_end_date && ' - '}
                      {campaign.campaign_end_date && new Date(campaign.campaign_end_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                )}
              </div>

              {/* 필수 장면 */}
              {campaign.guide_content && (() => {
                try {
                  const guideData = typeof campaign.guide_content === 'string'
                    ? JSON.parse(campaign.guide_content)
                    : campaign.guide_content

                  if (guideData?.shooting_scenes && Array.isArray(guideData.shooting_scenes)) {
                    return (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-purple-500" />
                          필수로 들어가야 하는 장면
                        </h3>
                        <div className="space-y-3">
                          {guideData.shooting_scenes.map((scene, index) => (
                            <div key={index} className="flex gap-4 bg-gray-50 rounded-xl p-4">
                              {scene.reference_image && (
                                <img
                                  src={scene.reference_image}
                                  alt={scene.scene_type}
                                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900">{scene.scene_type || `장면 ${index + 1}`}</h4>
                                <p className="text-sm text-gray-600 mt-1">{scene.instructions || scene.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                } catch (e) {
                  return null
                }
              })()}

              {/* 참고 영상/URL */}
              {campaign.sample_video_url && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-800">참고 영상</h3>
                  <a
                    href={campaign.sample_video_url.startsWith('http') ? campaign.sample_video_url : `https://${campaign.sample_video_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {campaign.sample_video_url}
                  </a>
                </div>
              )}

              {/* 해시태그 */}
              {campaign.hashtags && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-800">필수 해시태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(campaign.hashtags) ? campaign.hashtags : campaign.hashtags.split(/[,\s]+/)).map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 추가 안내사항 */}
              {campaign.additional_notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-800">추가 안내사항</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.additional_notes}</p>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCampaignGuidePopup(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 캠페인 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                캠페인 삭제 확인
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                정말로 <span className="font-bold text-gray-900">{campaign?.title}</span> 캠페인을 삭제하시겠습니까?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm font-medium">⚠️ 주의사항</p>
                <ul className="text-red-600 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>삭제된 캠페인은 복구할 수 없습니다</li>
                  <li>관련된 신청자 데이터도 함께 삭제됩니다</li>
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteCampaign}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 관리자용 SNS URL/광고코드 편집 모달 */}
      {showAdminSnsEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">
                {adminSnsEditData.isMultiVideoEdit
                  ? (adminSnsEditData.campaignType === '4week_challenge' ? '4주 챌린지' : '올리브영') + ' SNS 정보 입력'
                  : `SNS 정보 ${adminSnsEditData.isEditMode ? '수정' : '입력'}`}
              </h3>
              <button
                onClick={() => {
                  setShowAdminSnsEditModal(false)
                  setAdminSnsEditData({})
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* 멀티비디오 캠페인용 입력 폼 */}
              {adminSnsEditData.isMultiVideoEdit ? (
                <>
                  {adminSnsEditData.campaignType === '4week_challenge' ? (
                    // 4주 챌린지 입력 폼
                    <>
                      {[1, 2, 3, 4].map(week => (
                        <div key={week} className="border rounded-lg p-4 space-y-3">
                          <h4 className="font-medium text-gray-800">{week}주차</h4>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">SNS URL</label>
                            <input
                              type="url"
                              value={adminSnsEditData[`week${week}_url`] || ''}
                              onChange={(e) => setAdminSnsEditData(prev => ({ ...prev, [`week${week}_url`]: e.target.value }))}
                              placeholder={`https://www.instagram.com/reel/...`}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">광고코드</label>
                            <input
                              type="text"
                              value={adminSnsEditData[`week${week}_partnership_code`] || ''}
                              onChange={(e) => setAdminSnsEditData(prev => ({ ...prev, [`week${week}_partnership_code`]: e.target.value }))}
                              placeholder="광고코드 입력"
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    // 올리브영 입력 폼
                    <>
                      {[1, 2, 3].map(step => (
                        <div key={step} className="border rounded-lg p-4 space-y-3">
                          <h4 className="font-medium text-gray-800">STEP {step} {step === 3 ? '(스토리)' : '(영상)'}</h4>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">SNS URL</label>
                            <input
                              type="url"
                              value={adminSnsEditData[`step${step}_url`] || ''}
                              onChange={(e) => setAdminSnsEditData(prev => ({ ...prev, [`step${step}_url`]: e.target.value }))}
                              placeholder={`https://www.instagram.com/reel/...`}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="border rounded-lg p-4 space-y-3 bg-orange-50">
                        <h4 className="font-medium text-gray-800">광고코드</h4>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">STEP 1~2 광고코드</label>
                          <input
                            type="text"
                            value={adminSnsEditData.step1_2_partnership_code || ''}
                            onChange={(e) => setAdminSnsEditData(prev => ({ ...prev, step1_2_partnership_code: e.target.value }))}
                            placeholder="STEP 1~2 공통 광고코드"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">STEP 3 광고코드</label>
                          <input
                            type="text"
                            value={adminSnsEditData.step3_partnership_code || ''}
                            onChange={(e) => setAdminSnsEditData(prev => ({ ...prev, step3_partnership_code: e.target.value }))}
                            placeholder="STEP 3 광고코드"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                // 기존 단일 영상 캠페인 입력 폼
                <>
                  {!adminSnsEditData.isEditMode && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      <p className="font-medium mb-1">📌 SNS URL이 등록되지 않았습니다</p>
                      <p>크리에이터가 등록하지 않은 경우 관리자가 직접 입력할 수 있습니다.</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SNS 업로드 URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={adminSnsEditData.snsUrl || ''}
                      onChange={(e) => setAdminSnsEditData(prev => ({ ...prev, snsUrl: e.target.value }))}
                      placeholder="https://www.instagram.com/reel/..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      광고코드 (선택)
                    </label>
                    <input
                      type="text"
                      value={adminSnsEditData.adCode || ''}
                      onChange={(e) => setAdminSnsEditData(prev => ({ ...prev, adCode: e.target.value }))}
                      placeholder="광고코드 입력"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 sticky bottom-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdminSnsEditModal(false)
                  setAdminSnsEditData({})
                }}
                disabled={savingAdminSnsEdit}
              >
                취소
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleAdminSnsEdit}
                disabled={savingAdminSnsEdit || (!adminSnsEditData.isMultiVideoEdit && !adminSnsEditData.snsUrl?.trim())}
              >
                {savingAdminSnsEdit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    저장 중...
                  </>
                ) : adminSnsEditData.isMultiVideoEdit ? (
                  '저장'
                ) : adminSnsEditData.isEditMode ? (
                  '저장'
                ) : (
                  '저장 후 최종 확정'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 관리자용 마감일 수정 모달 */}
      {showDeadlineEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">마감일 수정 (관리자 전용)</h3>
              <p className="text-sm text-gray-500 mt-1">영상 제출 마감일 및 SNS 업로드 예정일을 수정합니다.</p>
            </div>
            <div className="p-6 space-y-6">
              {/* 4주 챌린지 */}
              {campaign.campaign_type === '4week_challenge' && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">영상 제출 마감일</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(week => (
                        <div key={week}>
                          <label className="text-xs text-gray-500">{week}주차</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            defaultValue={campaign[`week${week}_deadline`]?.split('T')[0] || ''}
                            onChange={(e) => setDeadlineEditData(prev => ({
                              ...prev,
                              [`week${week}_deadline`]: e.target.value
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">SNS 업로드 예정일</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(week => (
                        <div key={week}>
                          <label className="text-xs text-gray-500">{week}주차</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            defaultValue={campaign[`week${week}_sns_deadline`]?.split('T')[0] || ''}
                            onChange={(e) => setDeadlineEditData(prev => ({
                              ...prev,
                              [`week${week}_sns_deadline`]: e.target.value
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 올리브영 */}
              {(campaign.campaign_type === 'oliveyoung' || campaign.is_oliveyoung_sale) && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">영상 제출 마감일</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">1차 영상</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          defaultValue={campaign.step1_deadline?.split('T')[0] || ''}
                          onChange={(e) => setDeadlineEditData(prev => ({
                            ...prev,
                            step1_deadline: e.target.value
                          }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">2차 영상</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          defaultValue={campaign.step2_deadline?.split('T')[0] || ''}
                          onChange={(e) => setDeadlineEditData(prev => ({
                            ...prev,
                            step2_deadline: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">SNS 업로드 예정일</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">1차 SNS</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          defaultValue={campaign.step1_sns_deadline?.split('T')[0] || ''}
                          onChange={(e) => setDeadlineEditData(prev => ({
                            ...prev,
                            step1_sns_deadline: e.target.value
                          }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">2차 SNS</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          defaultValue={campaign.step2_sns_deadline?.split('T')[0] || ''}
                          onChange={(e) => setDeadlineEditData(prev => ({
                            ...prev,
                            step2_sns_deadline: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 기획형 (일반) */}
              {campaign.campaign_type !== '4week_challenge' && campaign.campaign_type !== 'oliveyoung' && !campaign.is_oliveyoung_sale && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">영상 제출 마감일</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg"
                      defaultValue={(campaign.content_submission_deadline || campaign.start_date)?.split('T')[0] || ''}
                      onChange={(e) => setDeadlineEditData(prev => ({
                        ...prev,
                        content_submission_deadline: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">SNS 업로드 예정일</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg"
                      defaultValue={(campaign.sns_upload_deadline || campaign.end_date)?.split('T')[0] || ''}
                      onChange={(e) => setDeadlineEditData(prev => ({
                        ...prev,
                        sns_upload_deadline: e.target.value
                      }))}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeadlineEditModal(false)
                  setDeadlineEditData({})
                }}
              >
                취소
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  try {
                    if (Object.keys(deadlineEditData).length === 0) {
                      alert('수정할 내용이 없습니다.')
                      return
                    }

                    const client = getSupabaseClient(region)
                    const { error } = await client
                      .from('campaigns')
                      .update(deadlineEditData)
                      .eq('id', campaign.id)

                    if (error) throw error

                    alert('마감일이 수정되었습니다.')
                    setShowDeadlineEditModal(false)
                    setDeadlineEditData({})
                    // 캠페인 데이터 새로고침
                    window.location.reload()
                  } catch (error) {
                    console.error('Error updating deadlines:', error)
                    alert('마감일 수정에 실패했습니다: ' + error.message)
                  }
                }}
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
