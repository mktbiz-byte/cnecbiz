/**
 * SNS 자동 업로드 관리 페이지
 * CNEC 공식 YouTube/Instagram/TikTok 계정에 영상 자동 업로드
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Youtube, Instagram, Music2, Upload, Settings, Link2, Unlink,
  RefreshCw, Check, X, AlertCircle, Play, ExternalLink, Loader2,
  FileVideo, Clock, CheckCircle2, XCircle, Trash2, Edit, Plus, Sparkles
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 플랫폼 설정
const PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  tiktok: {
    name: 'TikTok',
    icon: Music2,
    color: 'text-black',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
}

export default function SnsAutoUploadPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('accounts')

  // 계정 상태
  const [accounts, setAccounts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  // 템플릿 상태
  const [templates, setTemplates] = useState([])
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  // 업로드 상태
  const [uploads, setUploads] = useState([])
  const [pendingVideos, setPendingVideos] = useState([])
  const [selectedVideos, setSelectedVideos] = useState([])
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 업로드 설정
  const [uploadSettings, setUploadSettings] = useState({
    platforms: [],
    templateId: null,
    customTitle: '',
    customDescription: '',
    customHashtags: '',
    scheduleAt: null, // 예약 업로드 시간 (null이면 즉시)
    isScheduled: false
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchAccounts()
    } else if (activeTab === 'templates') {
      fetchTemplates()
    } else if (activeTab === 'uploads') {
      fetchUploads()
    } else if (activeTab === 'pending') {
      fetchPendingVideos()
    }
  }, [activeTab])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
      return
    }

    setLoading(false)
    fetchAccounts()
  }

  // 계정 목록 조회
  const fetchAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const { data, error } = await supabaseBiz
        .from('sns_upload_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  // 템플릿 목록 조회
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('sns_upload_templates')
        .select('*')
        .order('is_default', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  // 업로드 기록 조회
  const fetchUploads = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('sns_uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setUploads(data || [])
    } catch (error) {
      console.error('Error fetching uploads:', error)
    }
  }

  // 업로드 대기 영상 조회 (승인/완료된 영상 - video_file_url이 있는 것)
  const fetchPendingVideos = async () => {
    try {
      const allVideos = []

      // 캠페인 정보 조회
      let campaignMap = new Map()
      try {
        const { data: bizCampaigns } = await supabaseBiz.from('campaigns').select('*')
        bizCampaigns?.forEach(c => campaignMap.set(c.id, c))
      } catch (e) {
        console.log('campaigns query failed')
      }

      // 1. BIZ DB - applications에서 video_file_url이 있는 것
      const { data: bizApps } = await supabaseBiz
        .from('applications')
        .select('*')
        .not('video_file_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)

      bizApps?.forEach(app => {
        if (app.video_file_url) {
          const campaign = campaignMap.get(app.campaign_id)
          allVideos.push({
            id: app.id,
            source_type: 'application',
            video_file_url: app.video_file_url,
            campaign_id: app.campaign_id,
            campaign_name: campaign?.title || app.campaign_name || '-',
            creator_name: app.applicant_name || app.creator_name || '-',
            status: app.status,
            created_at: app.updated_at || app.created_at,
            sns_upload_url: app.sns_upload_url
          })
        }
      })

      // 2. BIZ DB - video_submissions
      const { data: bizSubs } = await supabaseBiz
        .from('video_submissions')
        .select('*')
        .not('video_file_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)

      bizSubs?.forEach(sub => {
        if (sub.video_file_url) {
          const campaign = campaignMap.get(sub.campaign_id)
          allVideos.push({
            id: sub.id,
            source_type: 'video_submission',
            video_file_url: sub.video_file_url,
            campaign_id: sub.campaign_id,
            campaign_name: campaign?.title || sub.campaign_name || '-',
            creator_name: sub.creator_name || '-',
            status: sub.status,
            created_at: sub.approved_at || sub.updated_at || sub.created_at,
            sns_upload_url: sub.sns_upload_url
          })
        }
      })

      // 3. Korea DB - campaign_participants
      if (supabaseKorea) {
        const { data: koreaCampaigns } = await supabaseKorea.from('campaigns').select('id, title')
        const koreaCampaignMap = new Map()
        koreaCampaigns?.forEach(c => koreaCampaignMap.set(c.id, c))

        const { data: koreaParticipants } = await supabaseKorea
          .from('campaign_participants')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        koreaParticipants?.forEach(p => {
          // video_files 배열에서 영상 URL 추출
          const videoFiles = p.video_files || []
          const latestVideo = videoFiles[videoFiles.length - 1]

          if (latestVideo?.url || p.video_file_url) {
            const campaign = koreaCampaignMap.get(p.campaign_id)
            allVideos.push({
              id: p.id,
              source_type: 'campaign_participant',
              video_file_url: latestVideo?.url || p.video_file_url,
              campaign_id: p.campaign_id,
              campaign_name: campaign?.title || '-',
              creator_name: p.applicant_name || p.creator_name || '-',
              status: p.status,
              created_at: p.updated_at || p.created_at,
              sns_upload_url: p.sns_upload_url
            })
          }
        })
      }

      // 이미 업로드된 영상 제외
      const { data: existingUploads } = await supabaseBiz
        .from('sns_uploads')
        .select('source_id, source_type')

      const uploadedSet = new Set(
        existingUploads?.map(u => `${u.source_type}_${u.source_id}`) || []
      )

      const pending = allVideos.filter(v =>
        !uploadedSet.has(`${v.source_type}_${v.id}`)
      )

      // 중복 제거 (campaign_id + creator_name 기준)
      const seen = new Set()
      const uniquePending = pending.filter(v => {
        const key = `${v.campaign_id}_${v.creator_name}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      setPendingVideos(uniquePending)
    } catch (error) {
      console.error('Error fetching pending videos:', error)
    }
  }

  // OAuth 연동 시작
  const handleConnectAccount = (platform) => {
    // OAuth 인증 URL로 리다이렉트
    const redirectUri = `${window.location.origin}/admin/sns-uploads/callback/${platform}`
    let authUrl = ''

    switch (platform) {
      case 'youtube':
        const youtubeClientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${youtubeClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube')}&access_type=offline&prompt=consent`
        break
      case 'instagram':
        const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement')}&response_type=code`
        break
      case 'tiktok':
        const tiktokClientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY
        authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokClientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('user.info.basic,video.publish')}&response_type=code`
        break
    }

    if (authUrl) {
      window.location.href = authUrl
    } else {
      alert('환경변수가 설정되지 않았습니다. 관리자에게 문의하세요.')
    }
  }

  // 계정 연동 해제
  const handleDisconnectAccount = async (accountId) => {
    if (!confirm('정말 연동을 해제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('sns_upload_accounts')
        .update({ is_active: false })
        .eq('id', accountId)

      if (error) throw error
      fetchAccounts()
    } catch (error) {
      console.error('Error disconnecting account:', error)
      alert('연동 해제 실패: ' + error.message)
    }
  }

  // 템플릿 저장
  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        name: editingTemplate.name,
        platform: editingTemplate.platform,
        title_template: editingTemplate.title_template,
        description_template: editingTemplate.description_template,
        hashtags: editingTemplate.hashtags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        youtube_settings: editingTemplate.youtube_settings || {},
        instagram_settings: editingTemplate.instagram_settings || {},
        tiktok_settings: editingTemplate.tiktok_settings || {},
        is_default: editingTemplate.is_default || false
      }

      if (editingTemplate.id) {
        // 수정
        const { error } = await supabaseBiz
          .from('sns_upload_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
        if (error) throw error
      } else {
        // 생성
        const { error } = await supabaseBiz
          .from('sns_upload_templates')
          .insert(templateData)
        if (error) throw error
      }

      setTemplateDialogOpen(false)
      setEditingTemplate(null)
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      alert('템플릿 저장 실패: ' + error.message)
    }
  }

  // 영상 업로드 실행
  const handleUpload = async () => {
    if (selectedVideos.length === 0) {
      alert('업로드할 영상을 선택하세요.')
      return
    }
    if (uploadSettings.platforms.length === 0) {
      alert('업로드할 플랫폼을 선택하세요.')
      return
    }

    setUploading(true)

    try {
      for (const video of selectedVideos) {
        for (const platform of uploadSettings.platforms) {
          // 활성 계정 찾기
          const account = accounts.find(a => a.platform === platform && a.is_active)
          if (!account) {
            console.warn(`${platform} 계정이 연동되지 않았습니다.`)
            continue
          }

          // 스케줄링 여부에 따라 status 결정
          const isScheduled = uploadSettings.isScheduled && uploadSettings.scheduleAt
          const status = isScheduled ? 'scheduled' : 'pending'

          // sns_uploads 레코드 생성
          const { data: uploadRecord, error: insertError } = await supabaseBiz
            .from('sns_uploads')
            .insert({
              source_type: video.source_type || 'video_submission',
              source_id: video.id,
              video_url: video.video_file_url,
              platform: platform,
              account_id: account.id,
              template_id: uploadSettings.templateId || null,
              title: uploadSettings.customTitle || null,
              description: uploadSettings.customDescription || null,
              hashtags: uploadSettings.customHashtags?.split(',').map(t => t.trim()).filter(Boolean) || null,
              status: status,
              scheduled_at: isScheduled ? new Date(uploadSettings.scheduleAt).toISOString() : null,
              campaign_id: video.campaign_id,
              campaign_name: video.campaign_name || '',
              creator_name: video.creator_name || ''
            })
            .select()
            .single()

          if (insertError) {
            console.error('Insert error:', insertError)
            continue
          }

          // 즉시 업로드인 경우에만 Function 호출
          if (!isScheduled) {
            const functionName = `upload-to-${platform}`
            const response = await fetch(`/.netlify/functions/${functionName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uploadId: uploadRecord.id })
            })

            const result = await response.json()
            if (!result.success) {
              console.error(`${platform} upload failed:`, result.error)
            }
          }
        }
      }

      const message = uploadSettings.isScheduled && uploadSettings.scheduleAt
        ? `${new Date(uploadSettings.scheduleAt).toLocaleString('ko-KR')}에 업로드가 예약되었습니다.`
        : '업로드가 시작되었습니다. 업로드 현황 탭에서 진행 상태를 확인하세요.'
      alert(message)
      setUploadDialogOpen(false)
      setSelectedVideos([])
      setActiveTab('uploads')
      fetchUploads()
    } catch (error) {
      console.error('Upload error:', error)
      alert('업로드 실패: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 상태 배지 렌더링
  const renderStatusBadge = (status) => {
    const configs = {
      pending: { label: '대기중', color: 'bg-gray-100 text-gray-700', icon: Clock },
      uploading: { label: '업로드중', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
      processing: { label: '처리중', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
      completed: { label: '완료', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      failed: { label: '실패', color: 'bg-red-100 text-red-700', icon: XCircle }
    }
    const config = configs[status] || configs.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className={`w-3 h-3 ${status === 'uploading' || status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="ml-56 p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="w-6 h-6 text-blue-500" />
              SNS 자동 업로드
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              CNEC 공식 계정에 크리에이터 영상을 자동으로 업로드합니다
            </p>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              계정 연동
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <FileVideo className="w-4 h-4" />
              업로드 대기
            </TabsTrigger>
            <TabsTrigger value="uploads" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              업로드 현황
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              템플릿 설정
            </TabsTrigger>
          </TabsList>

          {/* 계정 연동 탭 */}
          <TabsContent value="accounts">
            <div className="grid grid-cols-3 gap-6">
              {Object.entries(PLATFORMS).map(([key, platform]) => {
                const account = accounts.find(a => a.platform === key && a.is_active)
                const Icon = platform.icon

                return (
                  <Card key={key} className={account ? platform.borderColor : 'border-dashed'}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${platform.color}`} />
                        {platform.name}
                      </CardTitle>
                      <CardDescription>
                        {account ? '연동됨' : '연동 필요'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {account ? (
                        <div className="space-y-4">
                          <div className={`p-3 rounded-lg ${platform.bgColor}`}>
                            <p className="font-medium">{account.account_name}</p>
                            <p className="text-sm text-gray-500">
                              {account.account_id || '계정 연동됨'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>토큰 만료</span>
                            <span>
                              {account.token_expires_at
                                ? new Date(account.token_expires_at).toLocaleDateString('ko-KR')
                                : '-'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleConnectAccount(key)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              재연동
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisconnectAccount(account.id)}
                            >
                              <Unlink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-6 text-center text-gray-400">
                            <Icon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>계정을 연동하세요</p>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => handleConnectAccount(key)}
                          >
                            <Link2 className="w-4 h-4 mr-2" />
                            {platform.name} 연동하기
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* 환경변수 안내 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  API 설정 안내
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-red-600 mb-2">YouTube</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>YOUTUBE_CLIENT_ID</li>
                      <li>YOUTUBE_CLIENT_SECRET</li>
                      <li>YOUTUBE_REDIRECT_URI</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-pink-600 mb-2">Instagram</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>FACEBOOK_APP_ID</li>
                      <li>FACEBOOK_APP_SECRET</li>
                      <li>비즈니스 계정 필요</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">TikTok</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>TIKTOK_CLIENT_KEY</li>
                      <li>TIKTOK_CLIENT_SECRET</li>
                      <li>Content Posting API 승인</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 업로드 대기 탭 */}
          <TabsContent value="pending">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>업로드 대기 영상</CardTitle>
                  <CardDescription>
                    승인된 영상 중 아직 SNS에 업로드되지 않은 영상입니다
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  disabled={selectedVideos.length === 0}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  선택 영상 업로드 ({selectedVideos.length})
                </Button>
              </CardHeader>
              <CardContent>
                {pendingVideos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileVideo className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>업로드 대기중인 영상이 없습니다</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedVideos.length === pendingVideos.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVideos(pendingVideos)
                              } else {
                                setSelectedVideos([])
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>크리에이터</TableHead>
                        <TableHead>캠페인</TableHead>
                        <TableHead>승인일</TableHead>
                        <TableHead>미리보기</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingVideos.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedVideos.some(v => v.id === video.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedVideos([...selectedVideos, video])
                                } else {
                                  setSelectedVideos(selectedVideos.filter(v => v.id !== video.id))
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>{video.creator_name || '-'}</TableCell>
                          <TableCell>{video.campaign_name || '-'}</TableCell>
                          <TableCell>
                            {video.approved_at
                              ? new Date(video.approved_at).toLocaleDateString('ko-KR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {video.video_file_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(video.video_file_url, '_blank')}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 업로드 현황 탭 */}
          <TabsContent value="uploads">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>업로드 현황</CardTitle>
                  <CardDescription>최근 100건의 업로드 기록</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchUploads}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </CardHeader>
              <CardContent>
                {uploads.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>업로드 기록이 없습니다</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>플랫폼</TableHead>
                        <TableHead>크리에이터</TableHead>
                        <TableHead>캠페인</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>업로드 일시</TableHead>
                        <TableHead>성과</TableHead>
                        <TableHead>결과</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploads.map((upload) => {
                        const platform = PLATFORMS[upload.platform]
                        const Icon = platform?.icon || Upload
                        const perf = upload.performance_data || {}

                        return (
                          <TableRow key={upload.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${platform?.color || ''}`} />
                                {platform?.name || upload.platform}
                              </div>
                            </TableCell>
                            <TableCell>{upload.creator_name || '-'}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{upload.campaign_name || '-'}</TableCell>
                            <TableCell>{renderStatusBadge(upload.status)}</TableCell>
                            <TableCell>
                              {upload.scheduled_at && upload.status === 'scheduled' ? (
                                <span className="text-orange-600 text-sm">
                                  예약: {new Date(upload.scheduled_at).toLocaleString('ko-KR')}
                                </span>
                              ) : upload.upload_completed_at ? (
                                new Date(upload.upload_completed_at).toLocaleString('ko-KR')
                              ) : upload.upload_started_at ? (
                                new Date(upload.upload_started_at).toLocaleString('ko-KR')
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {upload.status === 'completed' && (perf.views !== undefined) ? (
                                <div className="text-xs space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500">조회</span>
                                    <span className="font-medium">{perf.views?.toLocaleString() || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-pink-500">{perf.likes?.toLocaleString() || 0}</span>
                                    <span className="text-blue-500">{perf.comments?.toLocaleString() || 0}</span>
                                  </div>
                                </div>
                              ) : upload.status === 'completed' ? (
                                <span className="text-xs text-gray-400">수집 대기</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {upload.status === 'completed' && upload.platform_video_url ? (
                                <a
                                  href={upload.platform_video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  보기
                                </a>
                              ) : upload.status === 'failed' ? (
                                <span className="text-red-500 text-sm" title={upload.error_message}>
                                  {upload.error_message?.substring(0, 20)}...
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 템플릿 설정 탭 */}
          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>업로드 템플릿</CardTitle>
                  <CardDescription>
                    제목, 설명, 해시태그 등 업로드 설정 템플릿을 관리합니다
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingTemplate({
                    name: '',
                    platform: 'all',
                    title_template: '',
                    description_template: '',
                    hashtags: '',
                    is_default: false
                  })
                  setTemplateDialogOpen(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  템플릿 추가
                </Button>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>템플릿이 없습니다</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>플랫폼</TableHead>
                        <TableHead>제목 템플릿</TableHead>
                        <TableHead>기본값</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {template.platform === 'all' ? '전체' : PLATFORMS[template.platform]?.name || template.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {template.title_template || '-'}
                          </TableCell>
                          <TableCell>
                            {template.is_default && (
                              <Badge className="bg-green-100 text-green-700">기본값</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate({
                                  ...template,
                                  hashtags: template.hashtags?.join(', ') || ''
                                })
                                setTemplateDialogOpen(true)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>SNS 업로드</DialogTitle>
            <DialogDescription>
              {selectedVideos.length}개의 영상을 선택한 플랫폼에 업로드합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 플랫폼 선택 */}
            <div>
              <Label className="mb-2 block">업로드할 플랫폼</Label>
              <div className="flex gap-2">
                {Object.entries(PLATFORMS).map(([key, platform]) => {
                  const account = accounts.find(a => a.platform === key && a.is_active)
                  const isSelected = uploadSettings.platforms.includes(key)
                  const Icon = platform.icon

                  return (
                    <Button
                      key={key}
                      variant={isSelected ? 'default' : 'outline'}
                      className={!account ? 'opacity-50' : ''}
                      disabled={!account}
                      onClick={() => {
                        if (isSelected) {
                          setUploadSettings({
                            ...uploadSettings,
                            platforms: uploadSettings.platforms.filter(p => p !== key)
                          })
                        } else {
                          setUploadSettings({
                            ...uploadSettings,
                            platforms: [...uploadSettings.platforms, key]
                          })
                        }
                      }}
                    >
                      <Icon className={`w-4 h-4 mr-1 ${isSelected ? '' : platform.color}`} />
                      {platform.name}
                      {!account && ' (미연동)'}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* AI SEO 최적화 생성 */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">AI SEO 최적화</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={async () => {
                    if (selectedVideos.length === 0) {
                      alert('영상을 먼저 선택하세요.')
                      return
                    }
                    if (uploadSettings.platforms.length === 0) {
                      alert('플랫폼을 먼저 선택하세요.')
                      return
                    }

                    setUploading(true)
                    try {
                      const video = selectedVideos[0]
                      const response = await fetch('/.netlify/functions/generate-sns-content', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          platform: uploadSettings.platforms[0],
                          campaignName: video.campaign_name,
                          creatorName: video.creator_name,
                          language: 'ko'
                        })
                      })
                      const result = await response.json()
                      if (result.success) {
                        const data = result.data
                        setUploadSettings({
                          ...uploadSettings,
                          customTitle: data.title || '',
                          customDescription: data.description || '',
                          customHashtags: data.hashtags?.join(', ') || ''
                        })
                        alert('AI가 SEO 최적화 콘텐츠를 생성했습니다!')
                      } else {
                        throw new Error(result.error)
                      }
                    } catch (error) {
                      console.error('AI 생성 오류:', error)
                      alert('AI 생성 실패: ' + error.message)
                    } finally {
                      setUploading(false)
                    }
                  }}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      AI 생성
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                플랫폼별 SEO 최적화된 제목, 설명, 해시태그를 AI가 자동 생성합니다
              </p>
            </div>

            {/* 템플릿 선택 */}
            <div>
              <Label className="mb-2 block">템플릿 (수동 선택)</Label>
              <Select
                value={uploadSettings.templateId || ''}
                onValueChange={(value) => setUploadSettings({ ...uploadSettings, templateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">템플릿 없음</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.is_default && '(기본값)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 커스텀 제목 */}
            <div>
              <Label className="mb-2 block">제목 (선택사항)</Label>
              <Input
                placeholder="템플릿 대신 사용할 제목"
                value={uploadSettings.customTitle}
                onChange={(e) => setUploadSettings({ ...uploadSettings, customTitle: e.target.value })}
              />
            </div>

            {/* 커스텀 설명 */}
            <div>
              <Label className="mb-2 block">설명 (선택사항)</Label>
              <Textarea
                placeholder="템플릿 대신 사용할 설명"
                value={uploadSettings.customDescription}
                onChange={(e) => setUploadSettings({ ...uploadSettings, customDescription: e.target.value })}
                rows={3}
              />
            </div>

            {/* 해시태그 */}
            <div>
              <Label className="mb-2 block">해시태그 (쉼표로 구분)</Label>
              <Input
                placeholder="크넥, CNEC, 리뷰"
                value={uploadSettings.customHashtags}
                onChange={(e) => setUploadSettings({ ...uploadSettings, customHashtags: e.target.value })}
              />
            </div>

            {/* 예약 업로드 */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="scheduleUpload"
                  checked={uploadSettings.isScheduled}
                  onChange={(e) => setUploadSettings({
                    ...uploadSettings,
                    isScheduled: e.target.checked
                  })}
                  className="w-4 h-4"
                />
                <Label htmlFor="scheduleUpload" className="cursor-pointer flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  예약 업로드
                </Label>
              </div>
              {uploadSettings.isScheduled && (
                <Input
                  type="datetime-local"
                  value={uploadSettings.scheduleAt || ''}
                  onChange={(e) => setUploadSettings({
                    ...uploadSettings,
                    scheduleAt: e.target.value
                  })}
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  업로드 시작
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 템플릿 편집 다이얼로그 */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? '템플릿 수정' : '템플릿 추가'}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">템플릿 이름</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="기본 템플릿"
                />
              </div>

              <div>
                <Label className="mb-2 block">플랫폼</Label>
                <Select
                  value={editingTemplate.platform}
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">제목 템플릿</Label>
                <Input
                  value={editingTemplate.title_template}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title_template: e.target.value })}
                  placeholder="{creator_name}님의 {product_name} 리뷰"
                />
                <p className="text-xs text-gray-500 mt-1">
                  변수: {'{creator_name}'}, {'{campaign_name}'}, {'{product_name}'}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">설명 템플릿</Label>
                <Textarea
                  value={editingTemplate.description_template}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description_template: e.target.value })}
                  placeholder="크리에이터가 직접 사용해본 솔직한 리뷰입니다."
                  rows={4}
                />
              </div>

              <div>
                <Label className="mb-2 block">기본 해시태그 (쉼표로 구분)</Label>
                <Input
                  value={editingTemplate.hashtags}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, hashtags: e.target.value })}
                  placeholder="크넥, CNEC, 크리에이터마케팅"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingTemplate.is_default}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_default: checked })}
                />
                <Label>기본 템플릿으로 설정</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setTemplateDialogOpen(false)
              setEditingTemplate(null)
            }}>
              취소
            </Button>
            <Button onClick={handleSaveTemplate}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
