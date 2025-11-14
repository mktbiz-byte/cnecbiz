import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseKorea } from '../../lib/supabase'
import { Upload, FileVideo, Link as LinkIcon, Calendar, AlertCircle, CheckCircle, Clock, Eye, Download, MessageSquare } from 'lucide-react'

const CreatorMyPage = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showExtensionModal, setShowExtensionModal] = useState(false)

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

        uploadedFiles.push({
          name: file.name,
          path: fileName,
          url: publicUrl,
          uploaded_at: new Date().toISOString()
        })
      }

      // 업로드된 파일 정보를 DB에 저장
      const { error: updateError } = await supabaseKorea
        .from('campaign_participants')
        .update({
          video_files: uploadedFiles,
          video_status: 'uploaded'
        })
        .eq('id', participantId)

      if (updateError) throw updateError

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
      return campaign.personalized_guide || campaignData.ai_guide || '가이드가 아직 생성되지 않았습니다.'
    } else if (campaignData.campaign_type === 'oliveyoung') {
      return {
        step1: campaignData.step1_guide,
        step2: campaignData.step2_guide,
        step3: campaignData.step3_guide
      }
    } else if (campaignData.campaign_type === '4week_challenge') {
      return {
        week1: campaignData.week1_guide,
        week2: campaignData.week2_guide,
        week3: campaignData.week3_guide,
        week4: campaignData.week4_guide
      }
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">내 캠페인</h1>

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

                {/* 가이드 섹션 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <FileVideo className="w-5 h-5 mr-2" />
                    촬영 가이드
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      const guide = getCampaignGuide(campaign)
                      if (typeof guide === 'string') {
                        return <p className="text-sm text-gray-700 whitespace-pre-wrap">{guide}</p>
                      } else if (guide && typeof guide === 'object') {
                        return (
                          <div className="space-y-4">
                            {Object.entries(guide).map(([key, value]) => (
                              <div key={key}>
                                <h4 className="font-medium text-gray-900 mb-2">
                                  {key.toUpperCase().replace('WEEK', 'Week ').replace('STEP', 'Step ')}
                                </h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
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
                    <div className="space-y-2">
                      {campaign.video_files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
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
