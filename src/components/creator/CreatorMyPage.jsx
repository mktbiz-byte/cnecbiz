import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseKorea } from '../../lib/supabaseClients'
import { Upload, FileVideo, Link as LinkIcon, Calendar, AlertCircle, CheckCircle, Clock, Eye, Download, MessageSquare, Key, Shield, EyeOff, Loader2 } from 'lucide-react'
import ExternalGuideViewer from '../common/ExternalGuideViewer'

const CreatorMyPage = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // 비밀번호 변경 상태
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadMyCampaigns()
    }
  }, [user])

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabaseKorea.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        navigate('/login')
      }
    } catch (error) {
      console.error('Error loading user:', error)
      navigate('/login')
    }
  }

  const loadMyCampaigns = async () => {
    try {
      setLoading(true)
      
      // 내가 참여 중인 캠페인 목록 가져오기
      const { data: participants, error: participantsError } = await supabaseKorea
        .from('campaign_participants')
        .select(`
          *,
          campaigns (*)
        `)
        .eq('creator_email', user.email)
        .eq('selection_status', 'selected')

      if (participantsError) throw participantsError

      setCampaigns(participants || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVideoUpload = async (participantId, files) => {
    try {
      setUploading(true)

      // 기존 video_files 조회하여 버전 계산
      const { data: existingData } = await supabaseKorea
        .from('campaign_participants')
        .select('video_files')
        .eq('id', participantId)
        .single()

      const existingFiles = existingData?.video_files || []

      // 현재 최대 버전 번호 계산
      let maxVersion = 0
      if (existingFiles.length > 0) {
        existingFiles.forEach(file => {
          if (file.version && file.version > maxVersion) {
            maxVersion = file.version
          }
        })
      }

      const uploadedFiles = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${participantId}/${Date.now()}.${fileExt}`

        const { data, error } = await supabaseKorea.storage
          .from('campaign-videos')
          .upload(fileName, file)

        if (error) throw error

        const { data: { publicUrl } } = supabaseKorea.storage
          .from('campaign-videos')
          .getPublicUrl(fileName)

        // 새 버전 번호 할당
        maxVersion++
        uploadedFiles.push({
          name: file.name,
          path: fileName,
          url: publicUrl,
          uploaded_at: new Date().toISOString(),
          version: maxVersion  // 버전 번호 추가
        })
      }

      // 기존 파일 + 새 파일을 합쳐서 저장 (버전 히스토리 유지)
      const allFiles = [...existingFiles, ...uploadedFiles]

      // 업로드된 파일 정보를 DB에 저장
      const { error: updateError } = await supabaseKorea
        .from('campaign_participants')
        .update({
          video_files: allFiles,
          video_status: 'uploaded'
        })
        .eq('id', participantId)

      if (updateError) throw updateError

      // 기업에게 알림톡 및 네이버 웍스 알림 발송
      try {
        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        const campaign = selectedCampaign?.campaigns || selectedCampaign
        const campaignTitle = campaign?.title || '캠페인'
        const creatorName = user?.email || '크리에이터'

        // 디버그 로그
        console.log('=== 영상 업로드 알림 발송 시작 ===')
        console.log('selectedCampaign:', selectedCampaign)
        console.log('campaign:', campaign)
        console.log('company_id:', campaign?.company_id)

        // 기업 정보 조회 (네이버 웍스 알림용 회사명)
        let companyName = campaign?.brand || '기업'

        if (campaign?.company_id) {
          const { data: company } = await supabaseKorea
            .from('companies')
            .select('company_name')
            .eq('user_id', campaign.company_id)
            .single()

          if (company?.company_name) {
            companyName = company.company_name
          }
        }

        // 카카오 알림톡은 DB webhook (webhook-video-upload/webhook-video-submission)에서 자동 발송
        // 프론트엔드에서 중복 발송하지 않음

        // 네이버 웍스 알림 발송 (관리자용)
        try {
          const naverWorksMessage = `[영상 업로드 완료]\n\n캠페인: ${campaignTitle}\n크리에이터: ${creatorName}\n기업: ${companyName}\n파일 수: ${uploadedFiles.length}개\n\n${koreanDate}`

          const naverWorksResponse = await fetch('/.netlify/functions/send-naver-works-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              message: naverWorksMessage,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
            })
          })

          const naverWorksResult = await naverWorksResponse.json()
          if (naverWorksResponse.ok && naverWorksResult.success) {
            console.log('영상 업로드 네이버 웍스 알림 발송 성공')
          } else {
            console.error('영상 업로드 네이버 웍스 알림 발송 실패:', naverWorksResult.error || naverWorksResult.details)
          }
        } catch (naverWorksError) {
          console.error('영상 업로드 네이버 웍스 알림 발송 오류:', naverWorksError)
        }
      } catch (notificationError) {
        console.error('영상 업로드 알림 발송 실패:', notificationError)
      }

      alert('영상이 성공적으로 업로드되었습니다!')
      setShowUploadModal(false)
      loadMyCampaigns()
    } catch (error) {
      console.error('Error uploading video:', error)
      alert('영상 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handlePartnershipCodeSubmit = async (participantId, code) => {
    try {
      const { error } = await supabaseKorea
        .from('campaign_participants')
        .update({ partnership_code: code })
        .eq('id', participantId)

      if (error) throw error

      // 네이버 웍스 알림 발송
      try {
        const campaign = campaigns.find(c => c.id === participantId)
        const campaignTitle = campaign?.campaigns?.title || '캠페인'
        const creatorName = user?.user_metadata?.full_name || user?.email || '크리에이터'

        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
            message: `[광고코드 등록 완료]\n\n캠페인: ${campaignTitle}\n크리에이터: ${creatorName}\n광고코드: ${code}\n\n${koreanDate}`
          })
        })
        console.log('✓ 광고코드 등록 네이버 웍스 알림 발송 성공')
      } catch (notifyError) {
        console.error('네이버 웍스 알림 발송 실패:', notifyError)
      }

      alert('파트너십 광고코드가 저장되었습니다!')
      loadMyCampaigns()
    } catch (error) {
      console.error('Error saving partnership code:', error)
      alert('광고코드 저장에 실패했습니다.')
    }
  }

  const handleExtensionRequest = async (participantId, reason, days) => {
    try {
      const { error } = await supabaseKorea
        .from('campaign_participants')
        .update({
          extension_requested: true,
          extension_reason: reason,
          extension_days: days,
          extension_status: 'pending',
          extension_requested_at: new Date().toISOString()
        })
        .eq('id', participantId)

      if (error) throw error

      alert('스케줄 연장 신청이 완료되었습니다!')
      setShowExtensionModal(false)
      loadMyCampaigns()
    } catch (error) {
      console.error('Error requesting extension:', error)
      alert('연장 신청에 실패했습니다.')
    }
  }

  // 비밀번호 변경 처리
  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    // 유효성 검사
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    // 복잡성 검사
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword)
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword)
    const hasNumbers = /\d/.test(passwordData.newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)

    if (!(hasUpperCase && hasLowerCase && hasNumbers) && !hasSpecialChar) {
      setPasswordError('비밀번호는 대문자, 소문자, 숫자를 포함하거나 특수문자를 포함해야 합니다.')
      return
    }

    setPasswordLoading(true)

    try {
      // 현재 비밀번호로 재인증
      const { error: signInError } = await supabaseKorea.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      })

      if (signInError) {
        setPasswordError('현재 비밀번호가 올바르지 않습니다.')
        setPasswordLoading(false)
        return
      }

      // 비밀번호 업데이트
      const { error: updateError } = await supabaseKorea.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) throw updateError

      setPasswordSuccess(true)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })

      // 3초 후 모달 닫기
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess(false)
      }, 2000)
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordError('비밀번호 변경에 실패했습니다: ' + error.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: '대기중', color: 'bg-gray-100 text-gray-800' },
      uploaded: { text: '업로드 완료', color: 'bg-blue-100 text-blue-800' },
      approved: { text: '승인됨', color: 'bg-green-100 text-green-800' },
      revision_requested: { text: '수정 요청', color: 'bg-yellow-100 text-yellow-800' }
    }
    const config = statusConfig[status] || statusConfig.pending
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.text}</span>
  }

  const getCampaignGuide = (campaign) => {
    if (!campaign.campaigns) return null
    
    const campaignData = campaign.campaigns
    
    // 캠페인 타입별 가이드 반환
    if (campaignData.campaign_type === 'regular') {
      return campaign.personalized_guide || campaignData.ai_generated_guide || campaignData.ai_guide || '가이드가 아직 생성되지 않았습니다.'
    } else if (campaignData.campaign_type === 'oliveyoung') {
      return {
        step1: campaignData.oliveyoung_step1_guide || campaignData.oliveyoung_step1_guide_ai,
        step2: campaignData.oliveyoung_step2_guide || campaignData.oliveyoung_step2_guide_ai,
        step3: campaignData.oliveyoung_step3_guide || campaignData.oliveyoung_step3_guide_ai
      }
    } else if (campaignData.campaign_type === '4week_challenge') {
      const weeklyGuides = campaignData.challenge_weekly_guides_ai || campaignData.challenge_weekly_guides
      if (weeklyGuides && typeof weeklyGuides === 'object') {
        return weeklyGuides
      }
      return {
        week1: campaignData.week1_guide,
        week2: campaignData.week2_guide,
        week3: campaignData.week3_guide,
        week4: campaignData.week4_guide
      }
    }
    
    // 기획형 캠페인 (package_type 존재)
    if (campaignData.package_type) {
      return campaign.personalized_guide || campaignData.ai_generated_guide || '가이드가 아직 생성되지 않았습니다.'
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">내 캠페인</h1>
        <button
          onClick={() => {
            setShowPasswordModal(true)
            setPasswordError('')
            setPasswordSuccess(false)
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <Shield className="w-4 h-4" />
          비밀번호 변경
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">참여 중인 캠페인이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">캠페인에 지원하고 선정되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{campaign.campaigns?.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      캠페인 타입: {campaign.campaigns?.campaign_type === 'regular' ? '기획형' : 
                                   campaign.campaigns?.campaign_type === 'oliveyoung' ? '올영세일' : '4주 챌린지'}
                    </p>
                  </div>
                  {getStatusBadge(campaign.video_status)}
                </div>

                {/* 마감일 섹션 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    영상 촬영 마감일
                  </h3>
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                    {campaign.campaigns?.campaign_type === 'regular' ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📹 영상 촬영 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.start_date ? new Date(campaign.campaigns.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📱 SNS 업로드 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.end_date ? new Date(campaign.campaigns.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                      </div>
                    ) : campaign.campaigns?.campaign_type === 'oliveyoung' ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📹 1차 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.step1_deadline ? new Date(campaign.campaigns.step1_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📱 2차 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.step2_deadline ? new Date(campaign.campaigns.step2_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📱 3차 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.step3_deadline ? new Date(campaign.campaigns.step3_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                      </div>
                    ) : campaign.campaigns?.campaign_type === '4week_challenge' ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📹 1주차 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.week1_deadline ? new Date(campaign.campaigns.week1_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📹 2주차 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.week2_deadline ? new Date(campaign.campaigns.week2_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📹 3주차 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.week3_deadline ? new Date(campaign.campaigns.week3_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-red-600 font-semibold mr-2">📹 4주차 마감:</span>
                          <span className="text-gray-900 font-bold">
                            {campaign.campaigns?.week4_deadline ? new Date(campaign.campaigns.week4_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\./g, '.') : '미정'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">마감일 정보가 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* 가이드 섹션 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <FileVideo className="w-5 h-5 mr-2" />
                    촬영 가이드
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      // 외부 가이드 모드 체크
                      const campaignData = campaign.campaigns || {}
                      if (campaignData.guide_delivery_mode === 'external') {
                        return (
                          <ExternalGuideViewer
                            type={campaignData.external_guide_type}
                            url={campaignData.external_guide_url}
                            fileUrl={campaignData.external_guide_file_url}
                            title={campaignData.external_guide_title}
                            fileName={campaignData.external_guide_file_name}
                          />
                        )
                      }

                      // PDF/Google Slides 가이드 체크 (guide_type=pdf인 경우)
                      if (campaignData.guide_type === 'pdf' && campaignData.guide_pdf_url) {
                        const pdfUrl = campaignData.guide_pdf_url
                        const guideUrlType = pdfUrl.includes('docs.google.com/presentation') ? 'google_slides'
                          : pdfUrl.includes('docs.google.com/spreadsheets') ? 'google_sheets'
                          : pdfUrl.includes('docs.google.com/document') ? 'google_docs'
                          : pdfUrl.includes('drive.google.com') ? 'google_drive'
                          : 'pdf'
                        return (
                          <ExternalGuideViewer
                            type={guideUrlType}
                            url={pdfUrl}
                            fileUrl={pdfUrl}
                            title={campaignData.title ? `${campaignData.title} 촬영 가이드` : '촬영 가이드'}
                          />
                        )
                      }

                      // 기존 AI 가이드 로직
                      const guide = getCampaignGuide(campaign)
                      
                      // Try to parse as JSON for structured guide
                      if (typeof guide === 'string') {
                        try {
                          const parsed = JSON.parse(guide)
                          if (parsed && typeof parsed === 'object') {
                            return (
                              <div className="space-y-6">
                                {/* Additional Message at Top */}
                                {campaign.individual_message && (
                                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                    <h4 className="font-bold text-gray-900 mb-2">📢 특별 전달사항</h4>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.individual_message}</p>
                                  </div>
                                )}
                                
                                {/* Campaign Info */}
                                {parsed.campaign_title && (
                                  <div className="bg-white rounded-lg p-4 border">
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-600 mb-1">캐페인 제목</p>
                                        <p className="font-semibold">{parsed.campaign_title}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 mb-1">플랫폼</p>
                                        <p className="font-semibold uppercase">{parsed.target_platform}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600 mb-1">영상 길이</p>
                                        <p className="font-semibold">{parsed.video_duration}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Shooting Scenes */}
                                {parsed.shooting_scenes && Array.isArray(parsed.shooting_scenes) && (
                                  <div className="bg-white rounded-lg border p-4">
                                    <h4 className="font-bold text-lg mb-4">🎥 촬영 장면 구성 ({parsed.shooting_scenes.length}개)</h4>
                                    <div className="space-y-4">
                                      {parsed.shooting_scenes.map((scene, index) => (
                                        <div key={index} className="border-l-4 border-purple-500 pl-4 py-2 bg-gray-50 rounded-r">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                              장면 {scene.order}
                                            </span>
                                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                                              {scene.scene_type}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700 mb-2">
                                            <span className="font-semibold">장면:</span> {scene.scene_description}
                                          </p>
                                          <p className="text-sm text-gray-700 mb-2">
                                            <span className="font-semibold">💬 대사:</span> "{scene.dialogue}"
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            <span className="font-semibold">💡 촬영 팁:</span> {scene.shooting_tip}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Required Hashtags */}
                                {parsed.required_hashtags && (
                                  <div className="bg-white rounded-lg border p-4">
                                    <h4 className="font-bold text-lg mb-4">🏷️ 필수 해시태그</h4>
                                    <div className="space-y-3">
                                      {parsed.required_hashtags.real && parsed.required_hashtags.real.length > 0 && (
                                        <div>
                                          <p className="text-sm text-gray-600 mb-2">리얼 해시태그</p>
                                          <div className="flex flex-wrap gap-2">
                                            {parsed.required_hashtags.real.map((tag, index) => (
                                              <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                                #{tag}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {parsed.required_hashtags.product && parsed.required_hashtags.product.length > 0 && (
                                        <div>
                                          <p className="text-sm text-gray-600 mb-2">제품 해시태그</p>
                                          <div className="flex flex-wrap gap-2">
                                            {parsed.required_hashtags.product.map((tag, index) => (
                                              <span key={index} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                                                #{tag}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          }
                        } catch (e) {
                          // If parsing fails, show as plain text
                        }
                        return <p className="text-sm text-gray-700 whitespace-pre-wrap">{guide}</p>
                      } else if (guide && typeof guide === 'object') {
                        // 4주 챌린지 주차별 외부 가이드 지원
                        const campaignType = campaignData.campaign_type

                        if (campaignType === '4week_challenge') {
                          return (
                            <div className="space-y-6">
                              {['week1', 'week2', 'week3', 'week4'].map((weekKey) => {
                                const weekNum = weekKey.replace('week', '')
                                const modeKey = `${weekKey}_guide_mode`
                                const isExternal = campaignData[modeKey] === 'external'

                                if (isExternal) {
                                  // 외부 가이드 표시
                                  return (
                                    <div key={weekKey} className="border rounded-lg p-4">
                                      <h4 className="font-semibold text-purple-700 mb-3 text-lg">
                                        Week {weekNum} 가이드
                                      </h4>
                                      <ExternalGuideViewer
                                        type={campaignData[`${weekKey}_external_type`]}
                                        url={campaignData[`${weekKey}_external_url`]}
                                        fileUrl={campaignData[`${weekKey}_external_file_url`]}
                                        title={campaignData[`${weekKey}_external_title`]}
                                        fileName={campaignData[`${weekKey}_external_file_name`]}
                                      />
                                    </div>
                                  )
                                } else {
                                  // AI 가이드 표시
                                  const weekGuide = guide[weekKey]
                                  if (!weekGuide) return null

                                  // JSON 형태의 AI 가이드인지 체크
                                  if (typeof weekGuide === 'object') {
                                    return (
                                      <div key={weekKey} className="border rounded-lg p-4 bg-white">
                                        <h4 className="font-semibold text-purple-700 mb-3 text-lg">
                                          Week {weekNum} 가이드
                                        </h4>
                                        <div className="space-y-3">
                                          {weekGuide.product_info && (
                                            <div>
                                              <p className="text-sm font-medium text-gray-600">제품 정보</p>
                                              <p className="text-sm text-gray-900">{weekGuide.product_info}</p>
                                            </div>
                                          )}
                                          {weekGuide.required_dialogues && weekGuide.required_dialogues.length > 0 && (
                                            <div>
                                              <p className="text-sm font-medium text-gray-600 mb-1">필수 대사</p>
                                              <ul className="list-disc list-inside text-sm text-gray-900">
                                                {weekGuide.required_dialogues.map((d, i) => <li key={i}>{d}</li>)}
                                              </ul>
                                            </div>
                                          )}
                                          {weekGuide.required_scenes && weekGuide.required_scenes.length > 0 && (
                                            <div>
                                              <p className="text-sm font-medium text-gray-600 mb-1">필수 장면</p>
                                              <ul className="list-disc list-inside text-sm text-gray-900">
                                                {weekGuide.required_scenes.map((s, i) => <li key={i}>{s}</li>)}
                                              </ul>
                                            </div>
                                          )}
                                          {weekGuide.hashtags && weekGuide.hashtags.length > 0 && (
                                            <div>
                                              <p className="text-sm font-medium text-gray-600 mb-1">해시태그</p>
                                              <div className="flex flex-wrap gap-2">
                                                {weekGuide.hashtags.map((h, i) => (
                                                  <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">{h}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {weekGuide.reference_urls && weekGuide.reference_urls.length > 0 && (
                                            <div>
                                              <p className="text-sm font-medium text-gray-600 mb-1">참고 영상</p>
                                              {weekGuide.reference_urls.map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">{url}</a>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  } else {
                                    return (
                                      <div key={weekKey}>
                                        <h4 className="font-medium text-gray-900 mb-2">Week {weekNum}</h4>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{weekGuide}</p>
                                      </div>
                                    )
                                  }
                                }
                              })}
                            </div>
                          )
                        }

                        // 올리브영 STEP별 외부 가이드 지원
                        if (campaignType === 'oliveyoung') {
                          return (
                            <div className="space-y-6">
                              {['step1', 'step2', 'step3'].map((stepKey) => {
                                const stepNum = stepKey.replace('step', '')
                                const modeKey = `${stepKey}_guide_mode`
                                const isExternal = campaignData[modeKey] === 'external'

                                if (isExternal) {
                                  // 외부 가이드 표시
                                  return (
                                    <div key={stepKey} className="border rounded-lg p-4">
                                      <h4 className="font-semibold text-pink-700 mb-3 text-lg">
                                        STEP {stepNum} 가이드
                                      </h4>
                                      <ExternalGuideViewer
                                        type={campaignData[`${stepKey}_external_type`]}
                                        url={campaignData[`${stepKey}_external_url`]}
                                        fileUrl={campaignData[`${stepKey}_external_file_url`]}
                                        title={campaignData[`${stepKey}_external_title`]}
                                        fileName={campaignData[`${stepKey}_external_file_name`]}
                                      />
                                    </div>
                                  )
                                } else {
                                  // AI 가이드 표시
                                  const stepGuide = guide[stepKey]
                                  if (!stepGuide) return null

                                  return (
                                    <div key={stepKey} className="border rounded-lg p-4 bg-white">
                                      <h4 className="font-semibold text-pink-700 mb-3 text-lg">
                                        STEP {stepNum} 가이드
                                      </h4>
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{typeof stepGuide === 'object' ? JSON.stringify(stepGuide, null, 2) : stepGuide}</p>
                                    </div>
                                  )
                                }
                              })}
                            </div>
                          )
                        }

                        // 기본 오브젝트 가이드 렌더링
                        return (
                          <div className="space-y-4">
                            {Object.entries(guide).map(([key, value]) => (
                              <div key={key}>
                                <h4 className="font-medium text-gray-900 mb-2">
                                  {key.toUpperCase().replace('WEEK', 'Week ').replace('STEP', 'Step ')}
                                </h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</p>
                              </div>
                            ))}
                          </div>
                        )
                      }
                      return <p className="text-sm text-gray-500">가이드가 없습니다.</p>
                    })()}
                  </div>
                </div>

                {/* 파트너십 광고코드 */}
                {campaign.campaigns?.partnership_ad_code_required && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <LinkIcon className="w-5 h-5 mr-2" />
                      파트너십 광고코드
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={campaign.partnership_code || ''}
                        placeholder="광고코드를 입력하세요"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        onBlur={(e) => {
                          if (e.target.value !== campaign.partnership_code) {
                            handlePartnershipCodeSubmit(campaign.id, e.target.value)
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 영상 업로드 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Upload className="w-5 h-5 mr-2" />
                      영상 업로드
                    </h3>
                    {campaign.video_files && campaign.video_files.length > 0 && (
                      <button
                        onClick={() => navigate(`/creator/video-feedback?participantId=${campaign.id}`)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        피드백 확인
                      </button>
                    )}
                  </div>
                  {campaign.video_files && campaign.video_files.length > 0 ? (
                    <div className="space-y-3">
                      {/* 버전별 영상 목록 (최신 버전부터 표시) */}
                      {[...campaign.video_files].sort((a, b) => (b.version || 0) - (a.version || 0)).map((file, index) => (
                        <div key={file.version || index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold mr-2">
                              V{file.version || index + 1}
                            </span>
                            <FileVideo className="w-5 h-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700">{file.name}</span>
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
                      ))}
                      {/* 수정본 업로드 버튼 */}
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign)
                          setShowUploadModal(true)
                        }}
                        className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        수정본 업로드 (V{(campaign.video_files.reduce((max, f) => Math.max(max, f.version || 0), 0) || campaign.video_files.length) + 1})
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedCampaign(campaign)
                        setShowUploadModal(true)
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      영상 업로드
                    </button>
                  )}
                </div>

                {/* 수정 요청 */}
                {campaign.revision_requests && campaign.revision_requests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center text-yellow-600">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      수정 요청 사항
                    </h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      {campaign.revision_requests.map((request, index) => (
                        <div key={index} className="mb-2 last:mb-0">
                          <p className="text-sm text-gray-700">{request.comment}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(request.created_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 스케줄 연장 */}
                <div className="flex gap-2">
                  {campaign.extension_requested ? (
                    <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            스케줄 연장 신청: {campaign.extension_days}일
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{campaign.extension_reason}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.extension_status === 'approved' ? 'bg-green-100 text-green-800' :
                          campaign.extension_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {campaign.extension_status === 'approved' ? '승인됨' :
                           campaign.extension_status === 'rejected' ? '거부됨' : '대기중'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedCampaign(campaign)
                        setShowExtensionModal(true)
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      <Calendar className="w-4 h-4 inline mr-2" />
                      스케줄 연장 신청
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 영상 업로드 모달 */}
      {showUploadModal && (
        <VideoUploadModal
          campaign={selectedCampaign}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleVideoUpload}
          uploading={uploading}
        />
      )}

      {/* 스케줄 연장 모달 */}
      {showExtensionModal && (
        <ExtensionRequestModal
          campaign={selectedCampaign}
          onClose={() => setShowExtensionModal(false)}
          onSubmit={handleExtensionRequest}
        />
      )}

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">비밀번호 변경</h2>
                  <p className="text-sm opacity-90">계정 보안을 위해 비밀번호를 변경하세요</p>
                </div>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 space-y-5">
              {/* 성공 메시지 */}
              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">비밀번호가 성공적으로 변경되었습니다!</p>
                </div>
              )}

              {/* 에러 메시지 */}
              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{passwordError}</p>
                </div>
              )}

              {!passwordSuccess && (
                <>
                  {/* 현재 비밀번호 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">현재 비밀번호</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="현재 비밀번호 입력"
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* 새 비밀번호 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">새 비밀번호</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="8자 이상, 대소문자/숫자/특수문자 조합"
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      대문자, 소문자, 숫자를 포함하거나 특수문자를 포함해야 합니다
                    </p>
                  </div>

                  {/* 새 비밀번호 확인 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">새 비밀번호 확인</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="새 비밀번호 재입력"
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        비밀번호가 일치합니다
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 bg-slate-50 border-t flex gap-2">
              {!passwordSuccess && (
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      변경 중...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      비밀번호 변경
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowPasswordModal(false)}
                className={`${passwordSuccess ? 'flex-1' : ''} px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium`}
              >
                {passwordSuccess ? '완료' : '취소'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 영상 업로드 모달 컴포넌트
const VideoUploadModal = ({ campaign, onClose, onUpload, uploading }) => {
  const [files, setFiles] = useState([])

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files))
  }

  const handleSubmit = () => {
    if (files.length === 0) {
      alert('업로드할 파일을 선택해주세요.')
      return
    }
    onUpload(campaign.id, files)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">영상 업로드</h2>
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileChange}
          className="w-full mb-4"
        />
        {files.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">선택된 파일: {files.length}개</p>
            {files.map((file, index) => (
              <p key={index} className="text-xs text-gray-500">{file.name}</p>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 스케줄 연장 모달 컴포넌트
const ExtensionRequestModal = ({ campaign, onClose, onSubmit }) => {
  const [reason, setReason] = useState('')
  const [days, setDays] = useState(7)

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('연장 사유를 입력해주세요.')
      return
    }
    onSubmit(campaign.id, reason, days)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">스케줄 연장 신청</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            연장 기간
          </label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={3}>3일</option>
            <option value={7}>7일</option>
            <option value={14}>14일</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            연장 사유
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="연장이 필요한 사유를 입력해주세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            신청
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreatorMyPage
