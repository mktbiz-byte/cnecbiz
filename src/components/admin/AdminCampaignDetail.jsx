import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Users,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  X,
  Edit,
  Trash2,
  PlayCircle,
  Upload,
  Video,
  Loader2,
  MessageCircle,
  Send,
  Phone,
  Ban
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AdminCampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const region = searchParams.get('region') || 'korea'
  
  const [campaign, setCampaign] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [selectedGuide, setSelectedGuide] = useState(null)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [editingGuide, setEditingGuide] = useState(false)
  const [editedGuideContent, setEditedGuideContent] = useState('')
  const [generatingGuides, setGeneratingGuides] = useState(new Set())

  // WhatsApp 일괄 발송 상태
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppSending, setWhatsAppSending] = useState(false)
  const [whatsAppResult, setWhatsAppResult] = useState(null)

  // 영상 업로드 관련 상태
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false)
  const [videoUploadTarget, setVideoUploadTarget] = useState(null) // { application, videoSlot, version }
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoSubmissions, setVideoSubmissions] = useState([])

  useEffect(() => {
    const initPage = async () => {
      await checkAuth()
      await fetchCampaignDetail()
      fetchApplications()
    }
    initPage()
  }, [id, region])
  
  // Check authorization after user loads
  useEffect(() => {
    const checkAccess = async () => {
      if (!supabaseBiz) return
      
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        alert('로그인이 필요합니다.')
        navigate('/login')
        return
      }
      
      // Check if user is super admin
      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()
      
      if (!adminData || adminData.role !== 'super_admin') {
        alert('슈퍼 관리자 권한이 필요합니다.')
        navigate('/')
      }
    }
    checkAccess()
  }, [])

  const checkAuth = async () => {
    try {
      if (!supabaseBiz) return

      const { data: { user }, error: userError } = await supabaseBiz.auth.getUser()
      if (userError || !user) return

      const { data: adminData, error: adminError } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      if (adminError || !adminData) return

      setIsSuperAdmin(adminData.role === 'super_admin')
    } catch (error) {
      console.error('Auth check error:', error)
    }
  }

  const fetchCampaignDetail = async () => {
    try {
      const client = getSupabaseClient(region)
      if (!client) {
        console.error('No Supabase client for region:', region)
        return
      }

      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      // 지역별 스키마 차이를 통일된 형식으로 매핑
      const normalizedCampaign = {
        ...data,
        region,
        // 제목 통일
        campaign_name: data.title || data.product_name || data.campaign_name || '제목 없음',
        // 예산 계산
        budget: data.estimated_cost || (data.reward_amount && data.max_participants 
          ? data.reward_amount * data.max_participants 
          : data.budget || 0),
        // 크리에이터 수
        creator_count: data.max_participants || data.total_slots || data.creator_count || 0,
        // 날짜 필드 통일
        application_deadline: data.application_deadline || data.recruitment_deadline,
        // 통화 단위
        currency: {
          'korea': '₩',
          'japan': '¥',
          'us': '$',
          'taiwan': 'NT$',
          'biz': '₩'
        }[region] || '₩'
      }
      
      setCampaign(normalizedCampaign)
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      console.log('[DEBUG] fetchApplications 시작:', { region, campaignId: id })
      const client = getSupabaseClient(region)
      console.log('[DEBUG] Supabase client:', client ? 'OK' : 'NULL')
      if (!client) {
        console.error('[DEBUG] Supabase client가 없습니다!')
        return
      }

      console.log('[DEBUG] applications 테이블 쿼리 시작...')
      const { data: appsData, error } = await client
        .from('applications')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

      console.log('[DEBUG] applications 쿼리 결과:', { 
        dataLength: appsData?.length, 
        error: error?.message,
        data: appsData 
      })
      
      if (error) throw error
      
      // 사용자 프로필 정보 병합
      if (appsData && appsData.length > 0) {
        console.log('[DEBUG] 지원서 데이터 발견:', appsData.length, '개')
        const userIds = [...new Set(appsData.map(app => app.user_id).filter(Boolean))]
        console.log('[DEBUG] user_ids:', userIds)
        let userProfiles = []
        
        if (userIds.length > 0) {
          console.log('[DEBUG] user_profiles 쿼리 시작...')
          const { data: profiles, error: profilesError } = await client
            .from('user_profiles')
            .select('*')
            .in('id', userIds)
          
          console.log('[DEBUG] user_profiles 결과:', { 
            profilesLength: profiles?.length,
            error: profilesError?.message,
            profiles 
          })
          
          if (!profilesError && profiles) {
            userProfiles = profiles
          }
        }
        
        // 데이터 병합
        const enrichedData = appsData.map(application => {
          const userProfile = userProfiles.find(up => up.id === application.user_id)

          return {
            ...application,
            // 닉네임 우선 표시 (일본 등), 없으면 이름
            display_name: userProfile?.nickname || userProfile?.name || application.applicant_name || '-',
            applicant_name: userProfile?.name || application.applicant_name || '-',
            nickname: userProfile?.nickname || '',
            age: userProfile?.age || application.age || '-',
            gender: userProfile?.gender || application.gender || '-',
            bio: userProfile?.bio || '',
            profile_image: userProfile?.profile_image || '',
            phone: userProfile?.phone || application.phone_number || application.phone || '',
            // 피부/뷰티 프로필
            skin_type: userProfile?.skin_type || application.skin_type || '-',
            skin_shade: userProfile?.skin_shade || '',
            personal_color: userProfile?.personal_color || '',
            hair_type: userProfile?.hair_type || '',
            primary_interest: userProfile?.primary_interest || '',
            skin_concerns: userProfile?.skin_concerns || [],
            // SNS
            instagram_url: userProfile?.instagram_url || application.instagram_url || '',
            tiktok_url: userProfile?.tiktok_url || application.tiktok_url || '',
            youtube_url: userProfile?.youtube_url || application.youtube_url || '',
            blog_url: userProfile?.blog_url || '',
            // 팔로워 수
            instagram_followers: userProfile?.instagram_followers || null,
            tiktok_followers: userProfile?.tiktok_followers || null,
            youtube_subscribers: userProfile?.youtube_subscribers || null,
            // 주소 (일본: postcode/prefecture/address/detail_address)
            postcode: userProfile?.postcode || application.postal_code || '',
            prefecture: userProfile?.prefecture || '',
            address: userProfile?.address || application.address || '',
            detail_address: userProfile?.detail_address || application.detail_address || '',
            // 은행 정보 (일본)
            bank_name: userProfile?.bank_name || '',
            branch_code: userProfile?.branch_code || '',
            account_type: userProfile?.account_type || '',
            account_number: userProfile?.account_number || '',
            account_holder: userProfile?.account_holder || '',
            // 콘텐츠 정보
            editing_level: userProfile?.editing_level || '',
            shooting_level: userProfile?.shooting_level || '',
            follower_range: userProfile?.follower_range || '',
            upload_frequency: userProfile?.upload_frequency || '',
            // 전체 프로필 (관리자용)
            user_profiles: userProfile
          }
        })
        
        console.log('[DEBUG] enrichedData 생성 완료:', enrichedData.length, '개')
        console.log('[DEBUG] personalized_guide 확인:', enrichedData.map(app => ({
          name: app.applicant_name,
          hasGuide: !!app.personalized_guide,
          guideLength: app.personalized_guide?.length
        })))
        console.log('[DEBUG] setApplications 호출')
        setApplications(enrichedData)
      } else {
        console.log('[DEBUG] 지원서 데이터 없음, 빈 배열 설정')
        setApplications([])
      }
    } catch (error) {
      console.error('[DEBUG] fetchApplications 오류:', error)
      console.error('Error fetching applications:', error)
    } finally {
      console.log('[DEBUG] fetchApplications 종료')
    }
  }

  // JP/US/KR 영상 제출 데이터 조회
  const fetchVideoSubmissions = async () => {
    if (region !== 'japan' && region !== 'us' && region !== 'korea') return
    try {
      const client = getSupabaseClient(region)
      if (!client) return

      let allSubmissions = []

      // 1. video_submissions 테이블 조회
      const { data, error } = await client
        .from('video_submissions')
        .select('*')
        .eq('campaign_id', id)
        .order('video_number', { ascending: true })
        .order('version', { ascending: false })

      if (!error && data) {
        allSubmissions = [...data]
      }

      // 2. 한국 캠페인: campaign_participants.video_files에서도 병합 (크리에이터 직접 업로드분)
      if (region === 'korea') {
        try {
          const { data: participants } = await client
            .from('campaign_participants')
            .select('id, user_id, video_files, video_status')
            .eq('campaign_id', id)

          if (participants) {
            participants.forEach(p => {
              if (p.video_files && Array.isArray(p.video_files)) {
                p.video_files.forEach(file => {
                  // video_submissions에 같은 user_id + version이 없으면 추가
                  const exists = allSubmissions.some(s =>
                    s.user_id === p.user_id && s.version === file.version
                  )
                  if (!exists) {
                    allSubmissions.push({
                      id: `cp_${p.id}_v${file.version}`,
                      campaign_id: id,
                      user_id: p.user_id,
                      video_number: 1,
                      version: file.version || 1,
                      video_file_url: file.url,
                      video_file_name: file.name,
                      status: p.video_status === 'approved' ? 'approved' : 'submitted',
                      submitted_at: file.uploaded_at || new Date().toISOString(),
                      _from_campaign_participants: true
                    })
                  }
                })
              }
            })
          }
        } catch (cpErr) {
          console.warn('campaign_participants 조회 스킵:', cpErr.message)
        }
      }

      setVideoSubmissions(allSubmissions)
    } catch (err) {
      console.error('Error fetching video submissions:', err)
    }
  }

  // 영상 업로드 시작
  useEffect(() => {
    if (campaign && (region === 'japan' || region === 'us' || region === 'korea')) {
      fetchVideoSubmissions()
    }
  }, [campaign, region])

  // 캠페인 타입별 영상 슬롯 개수
  const getVideoSlots = () => {
    if (!campaign) return []
    const type = campaign.campaign_type || ''
    if (type === '4week_challenge' || type === '4week') {
      return [
        { slot: 1, label: '1주차' },
        { slot: 2, label: '2주차' },
        { slot: 3, label: '3주차' },
        { slot: 4, label: '4주차' }
      ]
    }
    if (type === 'oliveyoung' || type === 'oliveyoung_sale') {
      return [
        { slot: 1, label: 'Step 1' },
        { slot: 2, label: 'Step 2' }
      ]
    }
    if (type === 'megawari' || type === 'mega-warri') {
      return [
        { slot: 1, label: '영상 1' },
        { slot: 2, label: '영상 2' }
      ]
    }
    // 기획형/일반: 1개 영상
    return [{ slot: 1, label: '영상' }]
  }

  // 특정 크리에이터의 특정 슬롯의 영상 버전들 가져오기
  const getVideoVersions = (userId, slot) => {
    return videoSubmissions
      .filter(v => v.user_id === userId && (v.video_number === slot || v.week_number === slot))
      .sort((a, b) => (b.version || 1) - (a.version || 1))
  }

  // 관리자 영상 업로드 핸들러
  const handleAdminVideoUpload = async (file) => {
    if (!videoUploadTarget || !file) return
    setVideoUploading(true)

    try {
      const { application, videoSlot, version } = videoUploadTarget
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      // 파일명 생성
      const ext = file.name.split('.').pop()
      const timestamp = Date.now()
      const filePath = `${id}/${application.user_id}/${videoSlot}_v${version}_${timestamp}.${ext}`

      // 리전별 스토리지 버킷명 (KR: campaign-videos, JP: campaign-videos, US: videos)
      const bucketName = region === 'us' ? 'videos' : 'campaign-videos'

      let videoUrl = ''

      if (region === 'korea') {
        // 한국: Netlify Function으로 signed URL 생성 후 직접 업로드 (RLS 우회, 대용량 지원)
        const signedRes = await fetch('/.netlify/functions/save-video-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_signed_url', fileName: filePath })
        })
        const signedResult = await signedRes.json()
        if (!signedResult.success) throw new Error(signedResult.error || '서명 URL 생성 실패')

        // signed URL로 직접 업로드 (파일 크기 제한 없음)
        const uploadRes = await fetch(signedResult.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'video/mp4' },
          body: file
        })
        if (!uploadRes.ok) throw new Error(`스토리지 업로드 실패: ${uploadRes.status}`)
        videoUrl = signedResult.publicUrl
      } else {
        // 일본/미국: 직접 스토리지 업로드
        const { error: uploadError } = await client.storage
          .from(bucketName)
          .upload(filePath, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError

        const { data: urlData } = client.storage.from(bucketName).getPublicUrl(filePath)
        videoUrl = urlData?.publicUrl
      }

      if (!videoUrl) throw new Error('Failed to get public URL')

      // video_submissions 테이블에 레코드 생성 (Netlify Function으로 RLS 우회 + 없는 컬럼 자동 제거)
      const submissionData = {
        campaign_id: id,
        user_id: application.user_id,
        video_number: videoSlot,
        version: version,
        video_file_url: videoUrl,
        video_file_name: file.name,
        video_file_size: file.size,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        const insertRes = await fetch('/.netlify/functions/save-video-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert_video_submission', region, submissionData, skipNotification: true })
        })
        const insertResult = await insertRes.json()
        if (!insertResult.success) {
          console.warn('video_submissions insert failed:', insertResult.error)
        }
      } catch (e) {
        console.warn('video_submissions insert skipped:', e.message)
      }

      // applications 테이블 업데이트 - 영상 URL + 상태를 video_submitted로 변경
      // ★ 크리에이터가 업로드한 것처럼 보이게 하기 위해 status를 video_submitted로 설정
      const appUpdateData = {
        video_file_url: videoUrl,
        video_file_name: file.name,
        video_file_size: file.size,
        video_uploaded_at: new Date().toISOString(),
        status: 'video_submitted',
        updated_at: new Date().toISOString()
      }

      // 4주 챌린지의 경우 weekN_url도 업데이트
      const campaignType = campaign?.campaign_type || ''
      if (campaignType === '4week_challenge' || campaignType === '4week') {
        if (videoSlot >= 1 && videoSlot <= 4) {
          appUpdateData[`week${videoSlot}_url`] = videoUrl
        }
      }

      // 올리브영의 경우 stepN_url도 업데이트 (영상은 Step 1, 2만 — Step 3은 스토리)
      if (campaignType === 'oliveyoung' || campaignType === 'oliveyoung_sale') {
        if (videoSlot >= 1 && videoSlot <= 2) {
          appUpdateData[`step${videoSlot}_url`] = videoUrl
        }
      }

      if (region === 'korea') {
        // 한국: Netlify Function으로 DB 업데이트 (RLS 우회)
        const appRes = await fetch('/.netlify/functions/save-video-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_application', campaignId: id, userId: application.user_id, updateData: appUpdateData, skipNotification: true })
        })
        const appResult = await appRes.json()
        if (!appResult.success) console.warn('Korea applications 업데이트 실패:', appResult.error)
      } else {
        const { error: appUpdateError } = await client
          .from('applications')
          .update(appUpdateData)
          .eq('id', application.id)
        if (appUpdateError) throw appUpdateError
      }

      // 한국 캠페인: campaign_participants.video_files도 업데이트 (Netlify Function으로 RLS 우회)
      if (region === 'korea') {
        try {
          // 기존 video_files 조회
          const getRes = await fetch('/.netlify/functions/save-video-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_video_files', participantId: application.user_id })
          })
          const getResult = await getRes.json()
          if (getResult.success) {
            const existingFiles = getResult.videoFiles || []
            const newVideoFile = {
              name: file.name,
              path: filePath,
              url: videoUrl,
              uploaded_at: new Date().toISOString(),
              version: version
            }
            await fetch('/.netlify/functions/save-video-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update_participant',
                participantId: application.user_id,
                videoFiles: [...existingFiles, newVideoFile],
                videoStatus: 'uploaded',
                skipNotification: true
              })
            })
            console.log('campaign_participants video_files 업데이트 완료 (v' + version + ')')
          }
        } catch (cpErr) {
          console.warn('campaign_participants 업데이트 스킵:', cpErr.message)
        }
      }

      // 네이버 웍스 알림 발송 (관리자가 이미 알고 있는 데이터로 직접 구성)
      const creatorName = application.display_name || application.applicant_name || application.creator_name || '크리에이터'
      const companyDisplayName = campaign?.company_name || campaign?.brand_name || campaign?.brand || '기업'
      const countryMap = { kr: '한국 🇰🇷', jp: '일본 🇯🇵', us: '미국 🇺🇸', tw: '대만 🇹🇼' }
      const regionToCountry = { korea: 'kr', japan: 'jp', us: 'us' }
      const countryCode = campaign?.target_country || regionToCountry[region] || null
      const countryLabel = countryMap[countryCode] || region?.toUpperCase() || ''
      const siteLabel = { kr: 'cnec.co.kr', jp: 'cnec.jp', us: 'cnec.us' }[countryCode] || 'cnecbiz.com'
      const koreanDate = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

      try {
        // 네이버 웍스 메시지 (영상 제출 알림 전용 채널)
        const VIDEO_ROOM_CHANNEL_ID = '75c24874-e370-afd5-9da3-72918ba15a3c'
        let worksMessage = `📹 영상 제출 알림 (${siteLabel})\n\n`
        worksMessage += `📋 캠페인: ${campaign?.title || '(캠페인명 없음)'}\n`
        worksMessage += `🏢 기업: ${companyDisplayName}\n`
        worksMessage += `👤 크리에이터: ${creatorName}\n`
        worksMessage += `📌 버전: V${version}\n`
        worksMessage += `🌍 국가: ${countryLabel}\n`
        worksMessage += `⏰ 제출 시간: ${koreanDate}`

        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: VIDEO_ROOM_CHANNEL_ID,
            message: worksMessage
          })
        })
        console.log('네이버 웍스 영상 제출 알림 발송 완료:', creatorName)
      } catch (worksErr) {
        console.error('네이버 웍스 알림 발송 실패:', worksErr)
      }

      // 기업에게 알림톡 발송 (영상 제출 알림 — 서버사이드로 RLS 우회)
      try {
        const notifRes = await fetch('/.netlify/functions/notify-video-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: id,
            region: campaign?.target_country === 'jp' ? 'japan' : campaign?.target_country === 'us' ? 'us' : 'korea',
            version: version,
            creatorName: creatorName,
            campaignTitle: campaign?.title || '',
            companyName: companyDisplayName,
            companyBizId: campaign?.company_biz_id,
            companyId: campaign?.company_id,
            companyEmail: campaign?.company_email,
            isResubmission: false,
            videoFileCount: 1
          })
        })
        const notifResult = await notifRes.json()
        console.log('영상 제출 알림 발송 완료 (서버사이드):', notifResult)
      } catch (notifErr) {
        console.error('알림 발송 실패:', notifErr)
      }

      alert(`영상이 업로드되었습니다! (v${version})\n상태가 '영상 제출'로 변경되었습니다.`)
      setShowVideoUploadModal(false)
      setVideoUploadTarget(null)
      fetchVideoSubmissions()
      fetchApplications()
    } catch (error) {
      console.error('Video upload error:', error)
      alert('영상 업로드 실패: ' + error.message)
    } finally {
      setVideoUploading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    const statusLabels = {
      draft: '임시',
      active: '활성',
      paused: '중단',
      completed: '완료'
    }

    if (!confirm(`캠페인 상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?`)) {
      return
    }

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const { error } = await client
        .from('campaigns')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setCampaign({ ...campaign, status: newStatus })
      alert(`캠페인 상태가 "${statusLabels[newStatus]}"로 변경되었습니다!`)
      window.location.reload()
    } catch (error) {
      console.error('Error changing status:', error)
      alert('상태 변경에 실패했습니다: ' + error.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('⚠️ 정말로 이 캠페인을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    if (!confirm('⚠️ 최종 확인: 캠페인과 관련된 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const { error } = await client
        .from('campaigns')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('캠페인이 삭제되었습니다.')
      navigate(`/admin/campaigns?region=${region}`)
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    }
  }

  // AI 개별 맞춤 가이드 생성
  const handleGeneratePersonalizedGuides = async (applications) => {
    if (!confirm(`${applications.length}명의 크리에이터에 대한 개별 맞춤 가이드를 생성하시겠습니까?`)) {
      return
    }

    // 생성 중 상태 추가
    const newGeneratingSet = new Set(generatingGuides)
    applications.forEach(app => newGeneratingSet.add(app.id))
    setGeneratingGuides(newGeneratingSet)

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      let successCount = 0
      let errorCount = 0

      for (const app of applications) {
        try {
          // 크리에이터 프로필 정보 가져오기
          const { data: profile } = await client
            .from('user_profiles')
            .select('*')
            .eq('id', app.user_id)
            .maybeSingle()

          // AI 가이드 생성 요청
          const response = await fetch('/.netlify/functions/generate-personalized-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creatorAnalysis: {
                platform: app.main_channel || 'instagram',
                followers: profile?.instagram_followers || profile?.followers_count || 0,
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
              baseGuide: campaign.guide_content || ''
            })
          })

          if (!response.ok) {
            throw new Error('AI 가이드 생성 실패')
          }

          const { guide } = await response.json()

          // 생성된 가이드를 applications 테이블에 저장 (직접 Supabase 업데이트)
          console.log(`[DEBUG] Saving guide for app:`, {
            id: app.id,
            applicant_name: app.applicant_name,
            guide_length: guide?.length,
            guide_preview: guide?.substring(0, 100)
          })
          
          const { data: updateData, error: updateError } = await client
            .from('applications')
            .update({ personalized_guide: guide })
            .eq('id', app.id)
            .select()

          if (updateError) {
            console.error(`[DEBUG] Save error for ${app.applicant_name}:`, updateError)
            throw new Error(updateError.message || 'Failed to save guide')
          }

          console.log(`[DEBUG] Save successful for ${app.applicant_name}:`, {
            guide_saved: updateData?.[0]?.personalized_guide?.length
          })
          successCount++
        } catch (error) {
          console.error(`Error generating guide for ${app.applicant_name}:`, error)
          errorCount++
        }
      }

      if (errorCount === 0) {
        alert(`${successCount}명의 개별 가이드가 성공적으로 생성되었습니다!`)
      } else {
        alert(`${successCount}명 성공, ${errorCount}명 실패했습니다.`)
      }

      // 데이터 새로고침
      await fetchApplications()
    } catch (error) {
      console.error('Error in handleGeneratePersonalizedGuides:', error)
      alert('가이드 생성에 실패했습니다: ' + error.message)
    } finally {
      // 생성 중 상태 제거
      const newGeneratingSet = new Set(generatingGuides)
      applications.forEach(app => newGeneratingSet.delete(app.id))
      setGeneratingGuides(newGeneratingSet)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved: { label: '선정 완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      virtual_selected: { label: '선정 완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      selected: { label: '선정 완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      filming: { label: '촬영중', color: 'bg-blue-100 text-blue-700', icon: Clock },
      guide_confirmation: { label: '가이드 확인중', color: 'bg-purple-100 text-purple-700', icon: Clock },
      guide_approved: { label: '가이드 승인', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
      video_submitted: { label: '영상 제출', color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle },
      revision_requested: { label: '수정 요청', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
      sns_uploaded: { label: 'SNS 업로드', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-700', icon: XCircle },
      force_cancelled: { label: '강제 취소', color: 'bg-red-200 text-red-800', icon: Ban },
      completed: { label: '완료', color: 'bg-blue-100 text-blue-700', icon: CheckCircle }
    }
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: AlertCircle }
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getRegionLabel = (region) => {
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국',
      taiwan: '🇹🇼 대만',
      biz: '🌐 Biz'
    }
    return labels[region] || region
  }

  // 상태별로 applications 분류
  const pendingApplications = applications.filter(app => app.status === 'pending')
  const selectedApplications = applications.filter(app =>
    ['approved', 'virtual_selected', 'selected', 'video_submitted', 'revision_requested', 'filming', 'guide_confirmation', 'guide_approved', 'sns_uploaded'].includes(app.status)
  )
  const completedApplications = applications.filter(app => app.status === 'completed')
  const rejectedApplications = applications.filter(app => app.status === 'rejected' || app.status === 'force_cancelled')

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </>
    )
  }

  if (!campaign) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-800 mb-2">캠페인을 찾을 수 없습니다</p>
            <Button onClick={() => navigate('/admin/campaigns')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로 돌아가기
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/campaigns')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록으로
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{campaign.campaign_name}</h1>
                <p className="text-gray-600 mt-1">{getRegionLabel(region)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate(`/admin/campaigns/${id}/edit?region=${region}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
              {isSuperAdmin && (
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              )}
            </div>
          </div>

          {/* 상태 변경 버튼 (슈퍼 관리자만) */}
          {isSuperAdmin && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  {campaign.status === 'draft' && <Clock className="w-5 h-5" />}
                  {campaign.status === 'active' && <PlayCircle className="w-5 h-5" />}
                  {campaign.status === 'paused' && <XCircle className="w-5 h-5" />}
                  {campaign.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                  캠페인 상태 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm text-gray-600 mb-2">현재 상태</div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
                      campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {campaign.status === 'draft' && <><Clock className="w-4 h-4" /> 임시</>}
                      {campaign.status === 'active' && <><PlayCircle className="w-4 h-4" /> 활성</>}
                      {campaign.status === 'paused' && <><XCircle className="w-4 h-4" /> 중단</>}
                      {campaign.status === 'completed' && <><CheckCircle className="w-4 h-4" /> 완료</>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleStatusChange('draft')}
                      disabled={campaign.status === 'draft'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-4 h-4" />
                      임시
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('active')}
                      disabled={campaign.status === 'active'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <PlayCircle className="w-4 h-4" />
                      활성
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('paused')}
                      disabled={campaign.status === 'paused'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <XCircle className="w-4 h-4" />
                      중단
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('completed')}
                      disabled={campaign.status === 'completed'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      완료
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 캠페인 기본 정보 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>캠페인 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">브랜드</div>
                  <div className="font-semibold text-lg">{campaign.brand || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">예산</div>
                  <div className="font-semibold text-lg text-blue-600">
                    {campaign.currency}{campaign.budget?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">모집 인원</div>
                  <div className="font-semibold text-lg">{campaign.creator_count}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">상태</div>
                  <div>{getStatusBadge(campaign.approval_status || campaign.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
                <div>
                  <div className="text-sm text-gray-500 mb-1">모집 마감일</div>
                  <div className="font-medium">
                    {campaign.application_deadline 
                      ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR', { 
                          year: 'numeric', month: 'numeric', day: 'numeric' 
                        }).replace(/\. /g, '. ')
                      : '-'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">캠페인 시작일</div>
                  <div className="font-medium">
                    {campaign.start_date 
                      ? new Date(campaign.start_date).toLocaleDateString('ko-KR', { 
                          year: 'numeric', month: 'numeric', day: 'numeric' 
                        }).replace(/\. /g, '. ')
                      : '-'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">캠페인 종료일</div>
                  <div className="font-medium">
                    {campaign.end_date 
                      ? new Date(campaign.end_date).toLocaleDateString('ko-KR', { 
                          year: 'numeric', month: 'numeric', day: 'numeric' 
                        }).replace(/\. /g, '. ')
                      : '-'
                    }
                  </div>
                </div>
              </div>

              {campaign.description && (
                <div className="mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-500 mb-2">캠페인 설명</div>
                  <div className="text-gray-800 whitespace-pre-wrap">{campaign.description}</div>
                </div>
              )}

              {campaign.requirements && (
                <div className="mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-500 mb-2">요구사항</div>
                  <div className="text-gray-800 whitespace-pre-wrap">{campaign.requirements}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">총 지원자</div>
                    <div className="text-3xl font-bold">{applications.length}</div>
                  </div>
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">대기중</div>
                    <div className="text-3xl font-bold text-yellow-600">{pendingApplications.length}</div>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">선정 완료</div>
                    <div className="text-3xl font-bold text-green-600">{selectedApplications.length}</div>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">완료</div>
                    <div className="text-3xl font-bold text-blue-600">{completedApplications.length}</div>
                  </div>
                  <CheckCircle className="w-10 h-10 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 크리에이터 목록 - 상태별 탭 */}
          <Card>
            <CardHeader>
              <CardTitle>크리에이터 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">전체 ({applications.length})</TabsTrigger>
                  <TabsTrigger value="pending">대기중 ({pendingApplications.length})</TabsTrigger>
                  <TabsTrigger value="selected">선정 완료 ({selectedApplications.length})</TabsTrigger>
                  <TabsTrigger value="completed">완료 ({completedApplications.length})</TabsTrigger>
                  <TabsTrigger value="rejected">거절됨 ({rejectedApplications.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <ApplicationList 
                    applications={applications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                  <ApplicationList 
                    applications={pendingApplications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>

                <TabsContent value="selected" className="mt-6">
                  {/* 기획형 캠페인일 경우 AI 가이드 생성 버튼 표시 */}
                  {selectedApplications.length > 0 && campaign?.campaign_type === 'planned' && (
                    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-purple-900 mb-1">전체 AI 가이드 생성</h3>
                          <p className="text-sm text-purple-700">크리에이터 프로필과 캠페인 정보를 기반으로 AI가 개별 가이드를 생성합니다.</p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleGeneratePersonalizedGuides(selectedApplications)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            AI 가이드 생성
                          </Button>
                          <Button
                            onClick={() => navigate(`/admin/campaigns/${id}/guides?region=${region}`)}
                            variant="outline"
                            className="border-purple-600 text-purple-600 hover:bg-purple-50"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            가이드 확인
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* US 캠페인: WhatsApp 일괄 발송 버튼 */}
                  {region === 'us' && selectedApplications.length > 0 && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-green-900 mb-1">WhatsApp 일괄 발송</h3>
                          <p className="text-sm text-green-700">선정된 {selectedApplications.length}명의 크리에이터에게 WhatsApp 템플릿 메시지를 발송합니다.</p>
                        </div>
                        <Button
                          onClick={() => { setWhatsAppResult(null); setShowWhatsAppModal(true) }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          WhatsApp 발송
                        </Button>
                      </div>
                    </div>
                  )}

                  <ApplicationList
                    applications={selectedApplications}
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                    campaign={campaign}
                    region={region}
                    onGenerateGuide={(app) => handleGeneratePersonalizedGuides([app])}
                    generatingGuides={generatingGuides}
                    setSelectedGuide={setSelectedGuide}
                    setShowGuideModal={setShowGuideModal}
                  />

                  {/* JP/US/KR 영상 관리 섹션 */}
                  {(region === 'japan' || region === 'us' || region === 'korea') && (selectedApplications.length > 0 || completedApplications.length > 0) && (
                    <Card className="mt-6 border-blue-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                          <Video className="w-5 h-5" />
                          영상 관리 (관리자 업로드)
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          선정된 크리에이터의 영상을 업로드합니다. 업로드된 영상은 기업과 크리에이터 양쪽에서 확인 가능합니다.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {[...selectedApplications, ...completedApplications].map(app => {
                            const slots = getVideoSlots()
                            // applications 테이블에서 fallback 영상 URL 가져오기
                            const getAppVideoUrl = (slot) => {
                              const type = campaign?.campaign_type || ''
                              if (type === '4week_challenge' || type === '4week') {
                                return app[`week${slot}_url`] || null
                              }
                              return app.video_file_url || null
                            }
                            return (
                              <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-4">
                                  {app.profile_image && (
                                    <img src={app.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  )}
                                  <h4 className="font-semibold text-lg">
                                    {app.display_name || app.applicant_name || '크리에이터'}
                                  </h4>
                                  <Badge className={
                                    app.status === 'video_submitted' ? 'bg-green-100 text-green-700' :
                                    app.status === 'selected' || app.status === 'approved' || app.status === 'virtual_selected' ? 'bg-blue-100 text-blue-700' :
                                    app.status === 'revision_requested' ? 'bg-orange-100 text-orange-700' :
                                    app.status === 'filming' ? 'bg-blue-100 text-blue-700' :
                                    app.status === 'sns_uploaded' ? 'bg-purple-100 text-purple-700' :
                                    app.status === 'guide_confirmation' || app.status === 'guide_approved' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-600'
                                  }>
                                    {app.status === 'video_submitted' ? '영상 제출' :
                                     app.status === 'selected' || app.status === 'approved' || app.status === 'virtual_selected' ? '선정' :
                                     app.status === 'revision_requested' ? '수정 요청' :
                                     app.status === 'filming' ? '촬영중' :
                                     app.status === 'sns_uploaded' ? 'SNS 업로드' :
                                     app.status === 'guide_confirmation' ? '가이드 확인중' :
                                     app.status === 'guide_approved' ? '가이드 승인' :
                                     app.status === 'completed' ? '완료' :
                                     app.status || '-'}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {slots.map(({ slot, label }) => {
                                    const versions = getVideoVersions(app.user_id, slot)
                                    const latestVersion = versions.length > 0 ? (versions[0].version || 1) : 0
                                    const nextVersion = latestVersion + 1
                                    // video_submissions가 없을 때 applications 테이블 fallback
                                    const fallbackUrl = getAppVideoUrl(slot)
                                    const hasVideo = versions.length > 0 || fallbackUrl

                                    return (
                                      <div key={slot} className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-sm">{label}</span>
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              setVideoUploadTarget({ application: app, videoSlot: slot, version: nextVersion || 1 })
                                              setShowVideoUploadModal(true)
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                          >
                                            <Upload className="w-3 h-3 mr-1" />
                                            {latestVersion > 0 ? `v${nextVersion} 업로드` : '업로드'}
                                          </Button>
                                        </div>
                                        {versions.length > 0 ? (
                                          <div className="space-y-1">
                                            {versions.map((v, idx) => (
                                              <div key={v.id || idx} className="flex items-center justify-between text-xs bg-white rounded p-2 border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                  <Badge className={idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                                                    v{v.version || 1}
                                                  </Badge>
                                                  <span className="text-gray-500 truncate max-w-[150px]">{v.video_file_name || 'video'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-400">
                                                    {v.submitted_at ? new Date(v.submitted_at).toLocaleDateString('ko-KR') : ''}
                                                  </span>
                                                  {v.video_file_url && (
                                                    <a
                                                      href={v.video_file_url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 hover:underline"
                                                    >
                                                      보기
                                                    </a>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : fallbackUrl ? (
                                          <div className="flex items-center justify-between text-xs bg-white rounded p-2 border border-green-100">
                                            <div className="flex items-center gap-2">
                                              <Badge className="bg-green-100 text-green-700">v1</Badge>
                                              <span className="text-gray-500 truncate max-w-[150px]">{app.video_file_name || 'video'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400">
                                                {app.video_uploaded_at ? new Date(app.video_uploaded_at).toLocaleDateString('ko-KR') : ''}
                                              </span>
                                              <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">보기</a>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-400">아직 업로드된 영상이 없습니다</p>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  <ApplicationList
                    applications={completedApplications}
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                    campaign={campaign}
                    region={region}
                    setSelectedGuide={setSelectedGuide}
                    setShowGuideModal={setShowGuideModal}
                  />

                  {/* 완료 크리에이터 산출물 (광고코드 / 클린본 / 편집본) */}
                  {completedApplications.length > 0 && (
                    <Card className="mt-6 border-green-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-900">
                          <CheckCircle className="w-5 h-5" />
                          완료 산출물 (광고코드 / 클린본 / 편집본)
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          완료된 크리에이터의 영상 산출물을 확인합니다.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {completedApplications.map(app => {
                            const creatorSubs = videoSubmissions.filter(v => v.user_id === app.user_id)

                            return (
                              <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-4">
                                  {app.profile_image && (
                                    <img src={app.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  )}
                                  <h4 className="font-semibold text-lg">
                                    {app.display_name || app.applicant_name || '크리에이터'}
                                  </h4>
                                  <Badge className="bg-green-100 text-green-700">완료</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* 1. 편집본 */}
                                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <h5 className="font-semibold text-blue-800 mb-2 text-sm flex items-center gap-1">
                                      <Video className="w-4 h-4" /> 편집본
                                    </h5>
                                    {creatorSubs.filter(s => s.video_file_url).length > 0 ? (
                                      <div className="space-y-2">
                                        {creatorSubs.filter(s => s.video_file_url).map((sub, idx) => (
                                          <div key={sub.id} className="bg-white rounded p-2 text-xs border border-blue-100">
                                            <div className="font-medium text-gray-800 mb-1">
                                              {sub.week_number ? `${sub.week_number}주차` :
                                               sub.video_number ? `영상 ${sub.video_number}` :
                                               `영상 ${idx + 1}`}
                                              {sub.version > 1 && <span className="ml-1 text-gray-400">v{sub.version}</span>}
                                            </div>
                                            <a href={sub.video_file_url} target="_blank" rel="noopener noreferrer"
                                               className="text-blue-600 hover:underline truncate block">
                                              {sub.video_file_name || '영상 보기'}
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    ) : app.video_file_url ? (
                                      <a href={app.video_file_url} target="_blank" rel="noopener noreferrer"
                                         className="text-blue-600 hover:underline text-xs">
                                        영상 보기
                                      </a>
                                    ) : (
                                      <p className="text-xs text-gray-400">없음</p>
                                    )}
                                  </div>

                                  {/* 2. 클린본 */}
                                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                    <h5 className="font-semibold text-emerald-800 mb-2 text-sm flex items-center gap-1">
                                      <Video className="w-4 h-4" /> 클린본
                                    </h5>
                                    {(() => {
                                      const cleanUrls = []
                                      // video_submissions의 clean_video_url
                                      creatorSubs.forEach(sub => {
                                        if (sub.clean_video_url) cleanUrls.push({
                                          url: sub.clean_video_url,
                                          label: sub.week_number ? `${sub.week_number}주차` : sub.video_number ? `영상 ${sub.video_number}` : '클린본'
                                        })
                                      })
                                      // applications 테이블의 clean_video_url (중복 제외)
                                      if (app.clean_video_url && !cleanUrls.some(c => c.url === app.clean_video_url)) {
                                        cleanUrls.push({ url: app.clean_video_url, label: '클린본' })
                                      }
                                      // 올리브영 step별 클린본
                                      if (app.step1_clean_video_url && !cleanUrls.some(c => c.url === app.step1_clean_video_url)) {
                                        cleanUrls.push({ url: app.step1_clean_video_url, label: 'Step 1' })
                                      }
                                      if (app.step2_clean_video_url && !cleanUrls.some(c => c.url === app.step2_clean_video_url)) {
                                        cleanUrls.push({ url: app.step2_clean_video_url, label: 'Step 2' })
                                      }
                                      // 4주 챌린지 주차별 클린본
                                      if (app.week1_clean_video_url) cleanUrls.push({ url: app.week1_clean_video_url, label: '1주차' })
                                      if (app.week2_clean_video_url) cleanUrls.push({ url: app.week2_clean_video_url, label: '2주차' })
                                      if (app.week3_clean_video_url) cleanUrls.push({ url: app.week3_clean_video_url, label: '3주차' })
                                      if (app.week4_clean_video_url) cleanUrls.push({ url: app.week4_clean_video_url, label: '4주차' })
                                      // clean_video_file_url (JP/US)
                                      if (app.clean_video_file_url && !cleanUrls.some(c => c.url === app.clean_video_file_url)) {
                                        cleanUrls.push({ url: app.clean_video_file_url, label: '클린본' })
                                      }

                                      return cleanUrls.length > 0 ? (
                                        <div className="space-y-2">
                                          {cleanUrls.map((clean, idx) => (
                                            <div key={idx} className="bg-white rounded p-2 text-xs border border-emerald-100">
                                              <div className="font-medium text-gray-800 mb-1">{clean.label}</div>
                                              <a href={clean.url} target="_blank" rel="noopener noreferrer"
                                                 className="text-emerald-600 hover:underline truncate block">
                                                다운로드
                                              </a>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-400">없음</p>
                                      )
                                    })()}
                                  </div>

                                  {/* 3. 광고코드 & SNS URL */}
                                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                    <h5 className="font-semibold text-orange-800 mb-2 text-sm flex items-center gap-1">
                                      <FileText className="w-4 h-4" /> 광고코드 & SNS
                                    </h5>
                                    {(() => {
                                      const codeItems = []
                                      // 올리브영 step별 광고코드 (우선)
                                      if (app.step1_2_partnership_code) codeItems.push({ code: app.step1_2_partnership_code, label: 'Step 1-2 광고코드' })
                                      // 일반 partnership_code (올영 코드와 다를 때만)
                                      if (app.partnership_code && app.partnership_code !== app.step1_2_partnership_code) {
                                        codeItems.push({ code: app.partnership_code, label: '광고코드' })
                                      }
                                      // 4주 챌린지 주차별
                                      if (app.week1_partnership_code) codeItems.push({ code: app.week1_partnership_code, label: '1주차 코드' })
                                      if (app.week2_partnership_code) codeItems.push({ code: app.week2_partnership_code, label: '2주차 코드' })
                                      if (app.week3_partnership_code) codeItems.push({ code: app.week3_partnership_code, label: '3주차 코드' })
                                      if (app.week4_partnership_code) codeItems.push({ code: app.week4_partnership_code, label: '4주차 코드' })
                                      // ad_code (JP/US)
                                      if (app.ad_code && !codeItems.some(c => c.code === app.ad_code)) {
                                        codeItems.push({ code: app.ad_code, label: '광고코드' })
                                      }

                                      // SNS URLs
                                      const snsItems = []
                                      if (app.step1_url) snsItems.push({ url: app.step1_url, label: 'Step 1 SNS' })
                                      if (app.step2_url) snsItems.push({ url: app.step2_url, label: 'Step 2 SNS' })
                                      if (app.step3_url) snsItems.push({ url: app.step3_url, label: 'Step 3 스토리' })
                                      if (app.sns_upload_url && !snsItems.length) snsItems.push({ url: app.sns_upload_url, label: 'SNS' })
                                      if (app.week1_url) snsItems.push({ url: app.week1_url, label: '1주차 SNS' })
                                      if (app.week2_url) snsItems.push({ url: app.week2_url, label: '2주차 SNS' })
                                      if (app.week3_url) snsItems.push({ url: app.week3_url, label: '3주차 SNS' })
                                      if (app.week4_url) snsItems.push({ url: app.week4_url, label: '4주차 SNS' })

                                      return (codeItems.length > 0 || snsItems.length > 0) ? (
                                        <div className="space-y-2">
                                          {codeItems.map((item, idx) => (
                                            <div key={`code-${idx}`} className="bg-white rounded p-2 text-xs border border-orange-100">
                                              <div className="text-gray-500 mb-0.5">{item.label}</div>
                                              <code className="text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded font-mono text-xs">
                                                {item.code}
                                              </code>
                                            </div>
                                          ))}
                                          {snsItems.map((item, idx) => (
                                            <div key={`sns-${idx}`} className="bg-white rounded p-2 text-xs border border-blue-100">
                                              <div className="text-gray-500 mb-0.5">{item.label}</div>
                                              <a href={item.url} target="_blank" rel="noopener noreferrer"
                                                 className="text-blue-600 hover:underline break-all">
                                                {item.url}
                                              </a>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-400">없음</p>
                                      )
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="rejected" className="mt-6">
                  <ApplicationList 
                    applications={rejectedApplications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 지원서 상세보기 모달 */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          getStatusBadge={getStatusBadge}
          campaign={campaign}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* 가이드 보기/수정 모달 */}
      {showGuideModal && selectedGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedGuide.applicant_name || selectedGuide.creator_name}님의 맞춤 가이드
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {campaign?.title || campaign?.campaign_name || '캠페인'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGuideModal(false)
                  setSelectedGuide(null)
                  setEditingGuide(false)
                  setEditedGuideContent('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {editingGuide ? (
                <textarea
                  value={editedGuideContent}
                  onChange={(e) => setEditedGuideContent(e.target.value)}
                  className="w-full h-full min-h-[500px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
              ) : (
                <GuideDisplay guide={selectedGuide.personalized_guide} />
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
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
                        const client = getSupabaseClient(region)
                        await client
                          .from('applications')
                          .update({ personalized_guide: editedGuideContent })
                          .eq('id', selectedGuide.id)

                        alert('가이드가 저장되었습니다.')
                        setEditingGuide(false)
                        setShowGuideModal(false)
                        fetchApplications()
                      } catch (error) {
                        console.error('Error saving guide:', error)
                        alert('저장에 실패했습니다.')
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
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
                    <Edit className="w-4 h-4 mr-2" />
                    수정
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        // TODO: Implement send to company functionality
                        // For now, just copy to clipboard
                        navigator.clipboard.writeText(selectedGuide.personalized_guide)
                        alert('가이드가 기업에게 전달되었습니다!')
                      } catch (error) {
                        console.error('Error sending guide:', error)
                        alert('전달에 실패했습니다.')
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    기업에게 전달하기
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 영상 업로드 모달 */}
      {showVideoUploadModal && videoUploadTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">영상 업로드</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {videoUploadTarget.application.display_name || videoUploadTarget.application.applicant_name} - v{videoUploadTarget.version}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVideoUploadModal(false)
                  setVideoUploadTarget(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                업로드된 영상은 크리에이터가 업로드한 것으로 표시되어 기업과 크리에이터 양쪽에서 확인 가능합니다.
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      if (file.size > 500 * 1024 * 1024) {
                        alert('파일 크기가 500MB를 초과합니다.')
                        return
                      }
                      handleAdminVideoUpload(file)
                    }
                  }}
                  className="hidden"
                  id="video-file-input"
                  disabled={videoUploading}
                />
                <label
                  htmlFor="video-file-input"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  {videoUploading ? (
                    <>
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      <span className="text-gray-600 font-medium">업로드 중...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400" />
                      <span className="text-gray-600 font-medium">클릭하여 영상 파일을 선택하세요</span>
                      <span className="text-xs text-gray-400">MP4, MOV, AVI 등 (최대 500MB)</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp 일괄 발송 모달 */}
      {showWhatsAppModal && (
        <WhatsAppBulkSendModal
          campaignId={id}
          campaignTitle={campaign?.title || campaign?.campaign_name || ''}
          applications={selectedApplications}
          open={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          sending={whatsAppSending}
          setSending={setWhatsAppSending}
          result={whatsAppResult}
          setResult={setWhatsAppResult}
        />
      )}
    </>
  )
}

// 팔로워 수 포맷
function formatFollowers(count) {
  if (!count) return null
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toLocaleString()
}

// 크리에이터 목록 컴포넌트
function ApplicationList({ applications, getStatusBadge, onViewDetails, campaign, region, onGenerateGuide, generatingGuides, setSelectedGuide, setShowGuideModal }) {
  const navigate = useNavigate()
  const campaignId = campaign?.id

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>지원자가 없습니다</p>
      </div>
    )
  }

  // US/Japan 캠페인 여부
  const isUSorJapan = region === 'us' || region === 'japan'
  const isJapan = region === 'japan'

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <div key={app.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {/* 프로필 이미지 */}
                {app.profile_image && (
                  <img src={app.profile_image} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                )}
                <div>
                  <h4 className="font-semibold text-lg">
                    {app.display_name || app.applicant_name || app.creator_name || app.user_name || '크리에이터'}
                  </h4>
                  {/* 닉네임과 실명이 다를 경우 실명도 표시 */}
                  {app.nickname && app.applicant_name && app.nickname !== app.applicant_name && (
                    <span className="text-xs text-gray-500">({app.applicant_name})</span>
                  )}
                </div>
                {getStatusBadge(app.status)}

                {/* 나이/성별 뱃지 */}
                {(app.age && app.age !== '-') && (
                  <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">{app.age}세</span>
                )}
                {(app.gender && app.gender !== '-') && (
                  <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                    {app.gender === 'male' ? '남성' : app.gender === 'female' ? '여성' : app.gender}
                  </span>
                )}

                {/* US/Japan 캠페인: 씬 가이드 작성 버튼 */}
                {isUSorJapan && (
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/admin/campaigns/${campaignId}/creator-guide?applicationId=${app.id}&region=${region}`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      씬 가이드 작성
                    </Button>
                    {app.personalized_guide && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedGuide(app)
                          setShowGuideModal(true)
                        }}
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        가이드 보기
                      </Button>
                    )}
                  </div>
                )}

                {/* 기획형 캠페인(한국)일 경우 개별 AI 가이드 생성 버튼 */}
                {!isUSorJapan && campaign?.campaign_type === 'planned' && (
                  <div className="flex gap-2 ml-2">
                    {onGenerateGuide && (
                      <Button
                        size="sm"
                        onClick={() => onGenerateGuide(app)}
                        disabled={generatingGuides?.has(app.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingGuides?.has(app.id) ? (
                          <>
                            <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            생성 중...
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 mr-1" />
                            AI 가이드 생성
                          </>
                        )}
                      </Button>
                    )}
                    {app.personalized_guide && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedGuide(app)
                          setShowGuideModal(true)
                        }}
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        가이드 보기
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">지원일:</span>{' '}
                  {app.created_at
                    ? new Date(app.created_at).toLocaleDateString('ko-KR')
                    : '-'
                  }
                </div>
                {/* SNS + 팔로워 수 */}
                {app.instagram_url && (
                  <div>
                    <span className="font-medium">Instagram:</span>{' '}
                    <a href={app.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">링크</a>
                    {app.instagram_followers && (
                      <span className="ml-1 text-xs text-pink-600 font-medium">({formatFollowers(app.instagram_followers)})</span>
                    )}
                  </div>
                )}
                {app.tiktok_url && (
                  <div>
                    <span className="font-medium">TikTok:</span>{' '}
                    <a href={app.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">링크</a>
                    {app.tiktok_followers && (
                      <span className="ml-1 text-xs text-gray-800 font-medium">({formatFollowers(app.tiktok_followers)})</span>
                    )}
                  </div>
                )}
                {app.youtube_url && (
                  <div>
                    <span className="font-medium">YouTube:</span>{' '}
                    <a href={app.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">링크</a>
                    {app.youtube_subscribers && (
                      <span className="ml-1 text-xs text-red-600 font-medium">({formatFollowers(app.youtube_subscribers)})</span>
                    )}
                  </div>
                )}
                {/* 피부 타입 (있으면 표시) */}
                {app.skin_type && app.skin_type !== '-' && (
                  <div>
                    <span className="font-medium">피부:</span>{' '}
                    <span>{app.skin_type}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(app)}
              className="ml-4"
            >
              <Eye className="w-4 h-4 mr-2" />
              상세보기
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// 일본 도도부현 라벨
const PREFECTURE_LABELS = {
  hokkaido: '北海道', aomori: '青森県', iwate: '岩手県',
  miyagi: '宮城県', akita: '秋田県', yamagata: '山形県',
  fukushima: '福島県', ibaraki: '茨城県', tochigi: '栃木県',
  gunma: '群馬県', saitama: '埼玉県', chiba: '千葉県',
  tokyo: '東京都', kanagawa: '神奈川県', niigata: '新潟県',
  toyama: '富山県', ishikawa: '石川県', fukui: '福井県',
  yamanashi: '山梨県', nagano: '長野県', gifu: '岐阜県',
  shizuoka: '静岡県', aichi: '愛知県', mie: '三重県',
  shiga: '滋賀県', kyoto: '京都府', osaka: '大阪府',
  hyogo: '兵庫県', nara: '奈良県', wakayama: '和歌山県',
  tottori: '鳥取県', shimane: '島根県', okayama: '岡山県',
  hiroshima: '広島県', yamaguchi: '山口県', tokushima: '徳島県',
  kagawa: '香川県', ehime: '愛媛県', kochi: '高知県',
  fukuoka: '福岡県', saga: '佐賀県', nagasaki: '長崎県',
  kumamoto: '熊本県', oita: '大分県', miyazaki: '宮崎県',
  kagoshima: '鹿児島県', okinawa: '沖縄県',
}

// 일본 은행 라벨
const JP_BANK_LABELS = {
  yucho: 'ゆうちょ銀行',
  mufg: '三菱UFJ銀行',
  smbc: '三井住友銀行',
  mizuho: 'みずほ銀行',
  resona: 'りそな銀行',
  rakuten: '楽天銀行',
  paypay: 'PayPay銀行',
  sbi: '住信SBIネット銀行',
  aeon: 'イオン銀行',
  sony: 'ソニー銀行',
  au_jibun: 'auじぶん銀行',
  seven: 'セブン銀行',
  other: 'その他',
}

const JP_ACCOUNT_TYPE_LABELS = {
  futsu: '普通',
  touza: '当座',
}

function formatJPAddress(profile) {
  if (!profile?.postcode && !profile?.prefecture) return null
  const pref = PREFECTURE_LABELS[profile.prefecture] || profile.prefecture || ''
  return `〒${profile.postcode || ''} ${pref}${profile.address || ''} ${profile.detail_address || ''}`
}

function formatJPBankInfo(profile) {
  if (!profile?.bank_name) return null
  const bankLabel = JP_BANK_LABELS[profile.bank_name] || profile.bank_name
  const typeLabel = JP_ACCOUNT_TYPE_LABELS[profile.account_type] || profile.account_type || ''
  return `${bankLabel} (支店: ${profile.branch_code || '-'}) ${typeLabel} ${profile.account_number || '-'} ${profile.account_holder || '-'}`
}

// 지원서 상세보기 모달
function ApplicationDetailModal({ application, onClose, getStatusBadge, campaign, isSuperAdmin }) {
  const searchParams = new URLSearchParams(window.location.search)
  const region = searchParams.get('region') || 'korea'
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fetchingStats, setFetchingStats] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [formData, setFormData] = useState({
    tracking_number: application.tracking_number || '',
    shipping_date: application.shipping_date ? new Date(application.shipping_date).toISOString().split('T')[0] : '',
    guide_url: application.guide_url || '',
    // Creator address fields
    phone_number: application.phone_number || application.phone || '',
    postal_code: application.postal_code || application.postcode || '',
    address: application.address || '',
    detail_address: application.detail_address || ''
  })
  const [editingAddress, setEditingAddress] = useState(false)

  const isSelected = ['approved', 'virtual_selected', 'selected'].includes(application.status)

  const handleSave = async () => {
    try {
      setSaving(true)
      const client = getSupabaseClient(region)

      const updateData = {
        tracking_number: formData.tracking_number || null,
        shipping_date: formData.shipping_date ? new Date(formData.shipping_date).toISOString() : null,
        guide_url: formData.guide_url || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await client
        .from('applications')
        .update(updateData)
        .eq('id', application.id)

      if (error) throw error

      alert('저장되었습니다')
      setEditing(false)
      window.location.reload() // 데이터 새로고침
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAddress = async () => {
    try {
      setSaving(true)
      const client = getSupabaseClient(region)

      const updateData = {
        phone_number: formData.phone_number || null,
        postal_code: formData.postal_code || null,
        address: formData.address || null,
        detail_address: formData.detail_address || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await client
        .from('applications')
        .update(updateData)
        .eq('id', application.id)

      if (error) throw error

      alert('주소 정보가 저장되었습니다')
      setEditingAddress(false)
      window.location.reload() // 데이터 새로고침
    } catch (error) {
      console.error('Error saving address:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleForceCancel = async () => {
    if (!cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.')
      return
    }
    if (!confirm(`⚠️ "${application.display_name || application.applicant_name || '크리에이터'}"를 강제 취소하시겠습니까?\n\n사유: ${cancelReason}`)) return

    setCancelling(true)
    try {
      // 현재 관리자 이메일 조회
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const res = await fetch('/.netlify/functions/force-cancel-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          campaignId: application.campaign_id,
          region,
          reason: cancelReason.trim(),
          cancelledByEmail: user?.email || null,
          campaignTitle: campaign?.title || campaign?.campaign_name || null,
          creatorName: application.display_name || application.applicant_name || application.creator_name || null,
          creatorEmail: application.email || null,
          companyName: campaign?.company_name || null
        })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      alert('크리에이터가 강제 취소되었습니다.')
      setShowCancelDialog(false)
      setCancelReason('')
      window.location.reload()
    } catch (error) {
      console.error('Force cancel error:', error)
      alert('강제 취소 실패: ' + error.message)
    } finally {
      setCancelling(false)
    }
  }

  const canForceCancel = isSuperAdmin && !['rejected', 'force_cancelled', 'completed'].includes(application.status)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {application.profile_image && (
              <img src={application.profile_image} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {application.display_name || application.applicant_name || application.creator_name || '크리에이터'}
              </h2>
              {application.nickname && application.applicant_name && application.nickname !== application.applicant_name && (
                <p className="text-sm text-gray-500">({application.applicant_name})</p>
              )}
              <div className="mt-1">{getStatusBadge(application.status)}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">기본 정보</h3>
              {!editingAddress ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAddress(true)}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  주소 입력/수정
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingAddress(false)
                      setFormData({
                        ...formData,
                        phone_number: application.phone_number || application.phone || '',
                        postal_code: application.postal_code || application.postcode || '',
                        address: application.address || '',
                        detail_address: application.detail_address || ''
                      })
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAddress}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* 닉네임 (일본) */}
              {application.nickname && (
                <div>
                  <span className="text-gray-500">닉네임:</span>
                  <span className="ml-2 font-medium">{application.nickname}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">{region === 'japan' ? '実名:' : '이름:'}</span>
                <span className="ml-2 font-medium">
                  {application.applicant_name || application.creator_name || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{region === 'japan' ? '年齢:' : '나이:'}</span>
                <span className="ml-2 font-medium">{application.age || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">{region === 'japan' ? '性別:' : '성별:'}</span>
                <span className="ml-2 font-medium">
                  {application.gender === 'male' ? (region === 'japan' ? '男性' : '남성') :
                   application.gender === 'female' ? (region === 'japan' ? '女性' : '여성') :
                   application.gender || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{region === 'japan' ? '電話番号:' : '전화번호:'}</span>
                {editingAddress ? (
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    placeholder={region === 'japan' ? '電話番号 (例: 090-1234-5678)' : '전화번호 입력'}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
                ) : (
                  <span className="ml-2 font-medium">{application.phone || application.phone_number || '-'}</span>
                )}
              </div>
              {(application.skin_type && application.skin_type !== '-') && (
                <div>
                  <span className="text-gray-500">{region === 'japan' ? '肌タイプ:' : '피부 타입:'}</span>
                  <span className="ml-2 font-medium">{application.skin_type}</span>
                </div>
              )}
              {/* 주소 - 일본 형식 */}
              {region === 'japan' ? (
                <>
                  <div className="col-span-2">
                    <span className="text-gray-500">住所:</span>
                    {editingAddress ? (
                      <div className="ml-2 mt-1 space-y-2">
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-400 w-12">〒</span>
                          <input
                            type="text"
                            value={formData.postal_code}
                            onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                            placeholder="郵便番号 (例: 1500001)"
                            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                          />
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-400 w-12">住所</span>
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="市区町村・番地"
                            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                          />
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-400 w-12">建物</span>
                          <input
                            type="text"
                            value={formData.detail_address}
                            onChange={(e) => setFormData({...formData, detail_address: e.target.value})}
                            placeholder="建物名・部屋番号"
                            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="ml-2 font-medium">
                        {formatJPAddress(application) || formatJPAddress(application.user_profiles) || '-'}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-2">
                    <span className="text-gray-500">우편번호:</span>
                    {editingAddress ? (
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                        placeholder="우편번호 입력 (예: 92081)"
                        className="ml-2 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                      />
                    ) : (
                      <span className="ml-2 font-medium">{application.postal_code || application.postcode || '-'}</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">주소:</span>
                    {editingAddress ? (
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="주소 입력"
                        className="ml-2 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                      />
                    ) : (
                      <span className="ml-2 font-medium">{application.address || '-'}</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">상세주소:</span>
                    {editingAddress ? (
                      <input
                        type="text"
                        value={formData.detail_address}
                        onChange={(e) => setFormData({...formData, detail_address: e.target.value})}
                        placeholder="상세주소 입력 (예: Apt 4B)"
                        className="ml-2 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                      />
                    ) : (
                      <span className="ml-2 font-medium">{application.detail_address || '-'}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 뷰티 프로필 (일본 캠페인, user_profiles에 데이터가 있는 경우) */}
          {region === 'japan' && application.user_profiles && (
            <div>
              <h3 className="text-lg font-semibold mb-3">ビューティープロフィール</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {application.skin_type && application.skin_type !== '-' && (
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <span className="text-gray-500 text-xs">肌タイプ</span>
                    <div className="font-medium">{application.skin_type}</div>
                  </div>
                )}
                {application.skin_shade && (
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <span className="text-gray-500 text-xs">肌の明るさ</span>
                    <div className="font-medium">{application.skin_shade}</div>
                  </div>
                )}
                {application.personal_color && (
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <span className="text-gray-500 text-xs">パーソナルカラー</span>
                    <div className="font-medium">{application.personal_color}</div>
                  </div>
                )}
                {application.hair_type && (
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <span className="text-gray-500 text-xs">髪タイプ</span>
                    <div className="font-medium">{application.hair_type}</div>
                  </div>
                )}
                {application.primary_interest && (
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <span className="text-gray-500 text-xs">主要コンテンツ</span>
                    <div className="font-medium">{application.primary_interest}</div>
                  </div>
                )}
                {application.follower_range && (
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <span className="text-gray-500 text-xs">フォロワー規模</span>
                    <div className="font-medium">{application.follower_range}</div>
                  </div>
                )}
                {application.editing_level && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 text-xs">編集レベル</span>
                    <div className="font-medium">{application.editing_level}</div>
                  </div>
                )}
                {application.shooting_level && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 text-xs">撮影レベル</span>
                    <div className="font-medium">{application.shooting_level}</div>
                  </div>
                )}
                {Array.isArray(application.skin_concerns) && application.skin_concerns.length > 0 && (
                  <div className="p-2 bg-pink-50 rounded-lg col-span-2">
                    <span className="text-gray-500 text-xs">肌悩み</span>
                    <div className="font-medium">{application.skin_concerns.join(', ')}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 은행 정보 (일본, 선정 완료된 크리에이터만) */}
          {region === 'japan' && isSelected && application.bank_name && (
            <div>
              <h3 className="text-lg font-semibold mb-3">口座情報</h3>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                <div className="font-medium text-green-800">
                  {formatJPBankInfo(application) || formatJPBankInfo(application.user_profiles) || '未登録'}
                </div>
              </div>
            </div>
          )}

          {/* SNS 정보 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">SNS 정보</h3>
            <div className="space-y-2 text-sm">
              {application.instagram_url && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Instagram:</span>
                  <a
                    href={application.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {application.instagram_url}
                  </a>
                  {application.instagram_followers && (
                    <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                      {formatFollowers(application.instagram_followers)} followers
                    </span>
                  )}
                </div>
              )}
              {application.youtube_url && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">YouTube:</span>
                  <a
                    href={application.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {application.youtube_url}
                  </a>
                  {application.youtube_subscribers && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                      {formatFollowers(application.youtube_subscribers)} subscribers
                    </span>
                  )}
                </div>
              )}
              {application.tiktok_url && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">TikTok:</span>
                  <a
                    href={application.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {application.tiktok_url}
                  </a>
                  {application.tiktok_followers && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                      {formatFollowers(application.tiktok_followers)} followers
                    </span>
                  )}
                </div>
              )}
              {application.blog_url && (
                <div>
                  <span className="text-gray-500">{region === 'japan' ? 'その他SNS:' : '기타 SNS:'}</span>
                  <a
                    href={application.blog_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    {application.blog_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 지원서 답변 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">지원서 답변</h3>
            <div className="space-y-4">
              {application.answer_1 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 1</div>
                  <div className="text-gray-800">{application.answer_1}</div>
                </div>
              )}
              {application.answer_2 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 2</div>
                  <div className="text-gray-800">{application.answer_2}</div>
                </div>
              )}
              {application.answer_3 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 3</div>
                  <div className="text-gray-800">{application.answer_3}</div>
                </div>
              )}
              {application.answer_4 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 4</div>
                  <div className="text-gray-800">{application.answer_4}</div>
                </div>
              )}
            </div>
          </div>

          {/* 추가 정보 */}
          {application.additional_info && (
            <div>
              <h3 className="text-lg font-semibold mb-3">추가 정보</h3>
              <div className="p-4 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap">
                {application.additional_info}
              </div>
            </div>
          )}

          {/* 오프라인 방문 */}
          {application.offline_visit_available !== null && (
            <div>
              <h3 className="text-lg font-semibold mb-3">오프라인 방문</h3>
              <div className="text-sm">
                <span className="text-gray-500">가능 여부:</span>
                <span className="ml-2 font-medium">
                  {application.offline_visit_available ? '가능' : '불가능'}
                </span>
                {application.offline_visit_notes && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg text-gray-800">
                    {application.offline_visit_notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 배송 및 가이드 정보 (선정 완료된 크리에이터만) */}
          {isSelected && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">배송 및 가이드 정보</h3>
                {!editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    편집
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(false)
                        setFormData({
                          tracking_number: application.tracking_number || '',
                          shipping_date: application.shipping_date ? new Date(application.shipping_date).toISOString().split('T')[0] : '',
                          guide_url: application.guide_url || ''
                        })
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    송장번호
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.tracking_number}
                      onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
                      placeholder="송장번호를 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {application.tracking_number || '-'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    발송일
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={formData.shipping_date}
                      onChange={(e) => setFormData({...formData, shipping_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {application.shipping_date 
                        ? new Date(application.shipping_date).toLocaleDateString('ko-KR')
                        : '-'
                      }
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가이드 URL
                  </label>
                  {editing ? (
                    <input
                      type="url"
                      value={formData.guide_url}
                      onChange={(e) => setFormData({...formData, guide_url: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {application.guide_url ? (
                        <a
                          href={application.guide_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {application.guide_url}
                        </a>
                      ) : '-'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 업로드된 영상 */}
          {application.video_links && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">업로드된 영상</h3>
                {(typeof application.video_links === 'string' && (application.video_links.includes('youtube.com') || application.video_links.includes('youtu.be'))) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setFetchingStats(true)
                      try {
                        const response = await fetch('/.netlify/functions/fetch-youtube-stats', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            application_id: application.id,
                            region: region,
                            video_url: application.video_links
                          })
                        })
                        
                        const data = await response.json()
                        
                        if (response.ok) {
                          alert('통계가 업데이트되었습니다')
                          window.location.reload()
                        } else {
                          alert('오류: ' + (data.error || 'Unknown error'))
                        }
                      } catch (error) {
                        console.error('Error fetching stats:', error)
                        alert('통계 업데이트 실패: ' + error.message)
                      } finally {
                        setFetchingStats(false)
                      }
                    }}
                    disabled={fetchingStats}
                  >
                    {fetchingStats ? '업데이트 중...' : '통계 업데이트'}
                  </Button>
                ) : null}
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <a
                  href={application.video_links}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {application.video_links}
                </a>
              </div>
              
              {/* YouTube 통계 */}
              {application.youtube_stats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">조회수</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {application.youtube_stats.viewCount?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">좋아요</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {application.youtube_stats.likeCount?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">댓글</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {application.youtube_stats.commentCount?.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              
              {application.stats_updated_at && (
                <div className="mt-2 text-xs text-gray-500">
                  마지막 업데이트: {new Date(application.stats_updated_at).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
          )}

          {/* 산출물 정보 (광고코드 / 클린본 / SNS URL) */}
          {(application.partnership_code || application.step1_2_partnership_code || application.ad_code ||
            application.clean_video_url || application.clean_video_file_url || application.step1_clean_video_url || application.step2_clean_video_url ||
            application.sns_upload_url || application.step1_url || application.step2_url || application.step3_url) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">산출물 정보</h3>
              <div className="space-y-3">
                {/* 광고코드 */}
                {(application.partnership_code || application.step1_2_partnership_code || application.ad_code) && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm font-medium text-orange-800 mb-2">광고코드</div>
                    <div className="space-y-1">
                      {application.step1_2_partnership_code && (
                        <div className="text-sm">
                          <span className="text-gray-500">Step 1-2:</span>
                          <code className="ml-2 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-mono">{application.step1_2_partnership_code}</code>
                        </div>
                      )}
                      {application.partnership_code && application.partnership_code !== application.step1_2_partnership_code && (
                        <div className="text-sm">
                          <span className="text-gray-500">코드:</span>
                          <code className="ml-2 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-mono">{application.partnership_code}</code>
                        </div>
                      )}
                      {application.ad_code && application.ad_code !== application.partnership_code && application.ad_code !== application.step1_2_partnership_code && (
                        <div className="text-sm">
                          <span className="text-gray-500">코드:</span>
                          <code className="ml-2 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-mono">{application.ad_code}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 클린본 */}
                {(application.clean_video_url || application.clean_video_file_url || application.step1_clean_video_url || application.step2_clean_video_url) && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-sm font-medium text-emerald-800 mb-2">클린본</div>
                    <div className="space-y-1">
                      {application.step1_clean_video_url && (
                        <div className="text-sm">
                          <span className="text-gray-500">Step 1:</span>
                          <a href={application.step1_clean_video_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-emerald-600 hover:underline">다운로드</a>
                        </div>
                      )}
                      {application.step2_clean_video_url && (
                        <div className="text-sm">
                          <span className="text-gray-500">Step 2:</span>
                          <a href={application.step2_clean_video_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-emerald-600 hover:underline">다운로드</a>
                        </div>
                      )}
                      {application.clean_video_url && !application.step1_clean_video_url && (
                        <div className="text-sm">
                          <a href={application.clean_video_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">클린본 다운로드</a>
                        </div>
                      )}
                      {application.clean_video_file_url && application.clean_video_file_url !== application.clean_video_url && (
                        <div className="text-sm">
                          <a href={application.clean_video_file_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">클린본 파일</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SNS 업로드 URL */}
                {(application.sns_upload_url || application.step1_url || application.step2_url || application.step3_url) && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">SNS 업로드</div>
                    <div className="space-y-1">
                      {application.step1_url && (
                        <div className="text-sm">
                          <span className="text-gray-500">Step 1:</span>
                          <a href={application.step1_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline break-all">{application.step1_url}</a>
                        </div>
                      )}
                      {application.step2_url && (
                        <div className="text-sm">
                          <span className="text-gray-500">Step 2:</span>
                          <a href={application.step2_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline break-all">{application.step2_url}</a>
                        </div>
                      )}
                      {application.step3_url && (
                        <div className="text-sm">
                          <span className="text-gray-500">Step 3 스토리:</span>
                          <a href={application.step3_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline break-all">{application.step3_url}</a>
                        </div>
                      )}
                      {application.sns_upload_url && !application.step1_url && (
                        <div className="text-sm">
                          <a href={application.sns_upload_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{application.sns_upload_url}</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          {canForceCancel && !showCancelDialog && (
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
            >
              <Ban className="w-4 h-4 mr-1.5" />
              강제 취소
            </Button>
          )}
          <Button onClick={onClose} className="flex-1">
            닫기
          </Button>
        </div>

        {/* 강제 취소 사유 입력 다이얼로그 */}
        {showCancelDialog && (
          <div className="sticky bottom-0 bg-red-50 border-t-2 border-red-300 px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Ban className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-red-800">크리에이터 강제 취소</h4>
            </div>
            <p className="text-sm text-red-700 mb-3">
              취소 사유를 반드시 입력해주세요. 이 기록은 내부 관리 로그에 영구 저장됩니다.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="예: 스케줄 미준수 - 영상 제출 기한 2회 초과"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowCancelDialog(false); setCancelReason('') }}
                disabled={cancelling}
              >
                돌아가기
              </Button>
              <Button
                size="sm"
                onClick={handleForceCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    처리 중...
                  </>
                ) : '강제 취소 확인'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Guide Display Component with Card Layout
function GuideDisplay({ guide }) {
  if (!guide) {
    return <div className="text-gray-500">가이드가 없습니다.</div>
  }

  let guideData
  try {
    guideData = typeof guide === 'string' ? JSON.parse(guide) : guide
  } catch (e) {
    // If not JSON, display as text
    return (
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm">{guide}</pre>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Campaign Title */}
      {guideData.campaign_title && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-purple-900">{guideData.campaign_title}</h3>
          <div className="flex gap-4 mt-2 text-sm text-gray-700">
            {guideData.target_platform && (
              <span className="bg-white px-3 py-1 rounded-full">플랫폼: {guideData.target_platform}</span>
            )}
            {guideData.video_duration && (
              <span className="bg-white px-3 py-1 rounded-full">영상 길이: {guideData.video_duration}</span>
            )}
          </div>
        </div>
      )}

      {/* Shooting Scenes */}
      {guideData.shooting_scenes && guideData.shooting_scenes.length > 0 && (
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-3">촬영 장면 구성 ({guideData.shooting_scenes.length}개)</h4>
          <div className="grid grid-cols-1 gap-3">
            {guideData.shooting_scenes.map((scene, index) => (
              <div 
                key={index}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {scene.order}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                        {scene.scene_type}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">촬영 장면</p>
                        <p className="text-sm text-gray-900">{scene.scene_description}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">대사 및 자막</p>
                        <p className="text-sm text-gray-900 italic">"{scene.dialogue}"</p>
                      </div>
                      {scene.shooting_tip && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">촬영 팁</p>
                          <p className="text-xs text-gray-600">{scene.shooting_tip}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Hashtags */}
      {guideData.required_hashtags && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h4 className="text-base font-bold text-blue-900 mb-3">필수 해시태그</h4>
          <div className="space-y-2">
            {guideData.required_hashtags.real && (
              <div>
                <p className="text-xs text-blue-700 font-medium mb-1">리얼 후기</p>
                <div className="flex flex-wrap gap-2">
                  {guideData.required_hashtags.real.map((tag, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-full text-sm text-blue-800">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {guideData.required_hashtags.product && (
              <div>
                <p className="text-xs text-blue-700 font-medium mb-1">제품 관련</p>
                <div className="flex flex-wrap gap-2">
                  {guideData.required_hashtags.product.map((tag, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-full text-sm text-blue-800">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {guideData.required_hashtags.common && (
              <div>
                <p className="text-xs text-blue-700 font-medium mb-1">공통</p>
                <div className="flex flex-wrap gap-2">
                  {guideData.required_hashtags.common.map((tag, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-full text-sm text-blue-800">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shooting Requirements */}
      {guideData.shooting_requirements && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <h4 className="text-base font-bold text-yellow-900 mb-3">촬영 요구사항</h4>
          {guideData.shooting_requirements.must_include && (
            <div className="mb-3">
              <p className="text-xs text-yellow-700 font-medium mb-2">필수 포함 장면</p>
              <ul className="space-y-1">
                {guideData.shooting_requirements.must_include.map((item, i) => (
                  <li key={i} className="text-sm text-gray-900 flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guideData.shooting_requirements.video_style && (
            <div>
              <p className="text-xs text-yellow-700 font-medium mb-2">영상 스타일</p>
              <div className="grid grid-cols-2 gap-2">
                {guideData.shooting_requirements.video_style.tempo && (
                  <div className="bg-white px-3 py-2 rounded text-sm">
                    <span className="text-gray-500">템포:</span> {guideData.shooting_requirements.video_style.tempo}
                  </div>
                )}
                {guideData.shooting_requirements.video_style.tone && (
                  <div className="bg-white px-3 py-2 rounded text-sm">
                    <span className="text-gray-500">톤:</span> {guideData.shooting_requirements.video_style.tone}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creator Tips */}
      {guideData.creator_tips && guideData.creator_tips.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <h4 className="text-base font-bold text-green-900 mb-3">크리에이터 팁</h4>
          <ul className="space-y-2">
            {guideData.creator_tips.filter(tip => tip).map((tip, i) => (
              <li key={i} className="text-sm text-gray-900 flex items-start">
                <span className="text-green-600 mr-2 font-bold">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// WhatsApp 템플릿 정보
const WHATSAPP_TEMPLATES = [
  { name: 'creator_selected_v2', label: '크리에이터 선정', variables: ['이름', '대시보드링크'] },
  { name: 'selection_guide_delivery_v2', label: '선정 + 가이드 전달', variables: ['이름', '가이드링크'] },
  { name: 'verification_complete_v2', label: '검증 완료', variables: ['이름', '콘텐츠제목', '날짜', '링크'] },
  { name: 'modification_request_v2', label: '수정 요청', variables: ['이름', '콘텐츠제목', '수정내용', '마감일', '링크'] },
  { name: 'points_awarded_v2', label: '포인트 지급', variables: ['이름', '포인트', '이유', '날짜', '총포인트', '링크'] },
  { name: 'payment_received_v2', label: '결제 확인', variables: ['이름', '금액', '통화', '거래ID', '날짜', '영수증링크'] },
  { name: 'account_registration_v2', label: '계정 등록 완료', variables: ['이름', '이메일', '날짜', '링크'] },
  { name: 'account_deactivation_v2', label: '계정 비활성화', variables: ['이름', '날짜', '링크'] }
]

function WhatsAppBulkSendModal({ campaignId, campaignTitle, applications, open, onClose, sending, setSending, result, setResult }) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [variables, setVariables] = useState({})

  const template = WHATSAPP_TEMPLATES.find(t => t.name === selectedTemplate)

  const handleTemplateChange = (templateName) => {
    setSelectedTemplate(templateName)
    setResult(null)
    const tmpl = WHATSAPP_TEMPLATES.find(t => t.name === templateName)
    if (tmpl) {
      const defaults = {}
      tmpl.variables.forEach((v, i) => {
        if (v === '이름') defaults[String(i + 1)] = '(자동: 크리에이터명)'
        else if (v === '대시보드링크' || v === '가이드링크' || v === '링크') defaults[String(i + 1)] = 'https://cnec.us/creator/mypage'
        else if (v === '날짜') defaults[String(i + 1)] = new Date().toLocaleDateString('en-US')
        else defaults[String(i + 1)] = ''
      })
      setVariables(defaults)
    }
  }

  const handleSend = async () => {
    if (!selectedTemplate) { alert('템플릿을 선택하세요.'); return }

    const varsToSend = { ...variables }
    // '이름' 자동 채우기는 서버에서 처리하므로 placeholder 제거
    Object.keys(varsToSend).forEach(k => {
      if (varsToSend[k] === '(자동: 크리에이터명)') delete varsToSend[k]
    })

    if (!confirm(`${applications.length}명에게 "${template.label}" WhatsApp 메시지를 발송합니다. 계속하시겠습니까?`)) return

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/.netlify/functions/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'campaign',
          campaignId,
          templateName: selectedTemplate,
          variableDefaults: varsToSend,
          sentBy: 'admin'
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setResult({ success: false, error: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            WhatsApp 일괄 발송
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p className="font-medium text-green-900">캠페인: {campaignTitle}</p>
            <p className="text-green-700">대상: 선정된 크리에이터 {applications.length}명</p>
          </div>

          {/* 템플릿 선택 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">템플릿 선택</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">-- 템플릿을 선택하세요 --</option>
              {WHATSAPP_TEMPLATES.map(t => (
                <option key={t.name} value={t.name}>{t.label} ({t.name})</option>
              ))}
            </select>
          </div>

          {/* 변수 입력 */}
          {template && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">변수 입력</label>
              {template.variables.map((varLabel, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">{`{{${i + 1}}} ${varLabel}`}</span>
                  <Input
                    value={variables[String(i + 1)] || ''}
                    onChange={(e) => setVariables(prev => ({ ...prev, [String(i + 1)]: e.target.value }))}
                    placeholder={varLabel}
                    disabled={varLabel === '이름'}
                    className="text-sm"
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">이름은 각 크리에이터 이름으로 자동 대체됩니다.</p>
            </div>
          )}

          {/* 발송 결과 */}
          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <>
                  <p className="font-medium text-blue-900">{result.message}</p>
                  {result.results && (
                    <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                      {result.results.map((r, i) => (
                        <div key={i} className={`text-xs flex items-center gap-1 ${r.success ? 'text-green-700' : 'text-red-700'}`}>
                          {r.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {r.creatorName}: {r.success ? '발송 성공' : r.error}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-red-900">{result.error || '발송 실패'}</p>
              )}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              닫기
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !selectedTemplate}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 발송 중...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> {applications.length}명에게 발송</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
