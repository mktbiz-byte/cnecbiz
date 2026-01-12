/**
 * SNS 업로드 완료 영상 통합 관리 페이지
 * 한국/미국/일본 국가별로 SNS 업로드 완료된 영상을 관리
 * - 멀티비디오 캠페인 그룹화 (4주 챌린지: 4개, 올리브영: 2개)
 * - 영상 미리보기 확장 기능
 * - 캠페인별 필터링
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
} from '@/components/ui/dialog'
import {
  Download, ExternalLink, Search, RefreshCw,
  Video, Globe, User, Eye, ChevronDown, ChevronUp, Play, X
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function SnsUploadManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('all')
  const [completedVideos, setCompletedVideos] = useState([])
  const [filteredVideos, setFilteredVideos] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [downloading, setDownloading] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})
  const [previewVideo, setPreviewVideo] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchCompletedVideos()
  }, [])

  useEffect(() => {
    filterVideos()
  }, [completedVideos, selectedCountry, searchTerm, selectedCampaign])

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

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchCompletedVideos = async () => {
    setLoading(true)
    try {
      const allVideos = []
      const campaignSet = new Map()

      // 이메일에서 이름 추출 함수
      const extractNameFromEmail = (email) => {
        if (!email || !email.includes('@')) return null
        const localPart = email.split('@')[0]
        // 숫자만 있는 경우 제외
        if (/^\d+$/.test(localPart)) return null
        // 언더스코어나 점으로 구분된 경우 처리
        const nameParts = localPart.split(/[._]/)
        if (nameParts.length > 1) {
          return nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        }
        return localPart.charAt(0).toUpperCase() + localPart.slice(1)
      }

      // 1. BIZ DB에서 applications 조회 (JOIN 없이 단순 조회)
      const { data: bizApplications, error: bizAppError } = await supabaseBiz
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (bizAppError) {
        console.error('[SnsUploadManagement] BIZ applications error:', bizAppError)
      }

      // 캠페인 정보 별도 조회 (BIZ DB에는 campaigns 테이블이 없을 수 있음)
      let campaignMap = new Map()
      try {
        const { data: bizCampaigns, error: bizCampError } = await supabaseBiz
          .from('campaigns')
          .select('*')

        if (!bizCampError && bizCampaigns) {
          bizCampaigns.forEach(c => campaignMap.set(c.id, c))
        }
      } catch (e) {
        console.log('[SnsUploadManagement] BIZ campaigns query failed, skipping')
      }

      // 크리에이터 이름 결정 함수 (user_profiles 없이 application 데이터에서 직접 추출)
      const resolveCreatorName = (app) => {
        // applicant_name이나 creator_name이 이메일이 아닌 경우 사용
        if (app.applicant_name && !app.applicant_name.includes('@')) {
          return app.applicant_name
        }
        if (app.creator_name && !app.creator_name.includes('@')) {
          return app.creator_name
        }
        if (app.name && !app.name.includes('@')) {
          return app.name
        }
        // 이메일에서 이름 추출
        const emailName = extractNameFromEmail(app.applicant_name) ||
                         extractNameFromEmail(app.creator_name) ||
                         extractNameFromEmail(app.email)
        if (emailName) {
          return emailName
        }
        // 최종 fallback
        return app.applicant_name || app.creator_name || '-'
      }

      if (!bizAppError && bizApplications) {
        console.log('[SnsUploadManagement] BIZ applications:', bizApplications.length)
        bizApplications.forEach(app => {
          // SNS URL이 있거나 영상 관련 상태인 경우 추가
          const hasSnsUrl = app.sns_upload_url || app.week1_url || app.week2_url ||
                           app.week3_url || app.week4_url || app.step1_url ||
                           app.step2_url || app.step3_url
          const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted'].includes(app.status)

          if (hasSnsUrl || hasVideoStatus) {
            const campaign = campaignMap.get(app.campaign_id)

            // 캠페인 목록에 추가
            if (campaign) {
              campaignSet.set(campaign.id, {
                id: campaign.id,
                title: campaign.title,
                type: campaign.campaign_type
              })
            }

            allVideos.push({
              id: `biz_app_${app.id}`,
              application_id: app.id,
              campaign_id: app.campaign_id,
              user_id: app.user_id,
              sns_upload_url: app.sns_upload_url,
              partnership_code: app.partnership_code,
              video_file_url: app.video_file_url,
              created_at: app.updated_at || app.created_at,
              status: app.status,
              source: 'biz',
              country: campaign?.target_country || 'kr',
              campaignTitle: campaign?.title || '-',
              campaignType: campaign?.campaign_type,
              creatorName: resolveCreatorName(app),
              creatorEmail: app.email,
              // 멀티비디오 URL
              week1_url: app.week1_url,
              week2_url: app.week2_url,
              week3_url: app.week3_url,
              week4_url: app.week4_url,
              step1_url: app.step1_url,
              step2_url: app.step2_url,
              step3_url: app.step3_url,
              // 광고코드
              week1_partnership_code: app.week1_partnership_code,
              week2_partnership_code: app.week2_partnership_code,
              week3_partnership_code: app.week3_partnership_code,
              week4_partnership_code: app.week4_partnership_code,
              step1_2_partnership_code: app.step1_2_partnership_code,
              step3_partnership_code: app.step3_partnership_code,
            })
          }
        })
      }

      // 2. BIZ DB에서 video_submissions 조회 (JOIN 없이 단순 조회)
      const { data: bizSubmissions, error: bizSubError } = await supabaseBiz
        .from('video_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (bizSubError) {
        console.error('[SnsUploadManagement] BIZ video_submissions error:', bizSubError)
      }

      if (!bizSubError && bizSubmissions) {
        console.log('[SnsUploadManagement] BIZ video_submissions:', bizSubmissions.length)
        bizSubmissions.forEach(sub => {
          // 영상 관련 상태인 경우만 추가
          const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted', 'pending'].includes(sub.status)
          if (!hasVideoStatus && !sub.sns_upload_url) return

          // 중복 체크
          const isDuplicate = allVideos.some(v =>
            v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
          )
          if (!isDuplicate) {
            const campaign = campaignMap.get(sub.campaign_id)

            // 캠페인 목록에 추가
            if (campaign) {
              campaignSet.set(campaign.id, {
                id: campaign.id,
                title: campaign.title,
                type: campaign.campaign_type
              })
            }

            allVideos.push({
              id: `biz_sub_${sub.id}`,
              submission_id: sub.id,
              application_id: sub.application_id,
              campaign_id: sub.campaign_id,
              user_id: sub.user_id,
              sns_upload_url: sub.sns_upload_url,
              partnership_code: sub.partnership_code || sub.ad_code,
              video_file_url: sub.video_file_url,
              created_at: sub.approved_at || sub.updated_at || sub.created_at,
              status: sub.status,
              source: 'biz_submission',
              country: campaign?.target_country || 'kr',
              campaignTitle: campaign?.title || '-',
              campaignType: campaign?.campaign_type,
              creatorName: resolveCreatorName(sub),
              creatorEmail: sub.email,
              week_number: sub.week_number,
            })
          }
        })
      }

      // 3. Korea DB에서 campaign_participants 조회 (JOIN 없이 단순 조회)
      if (supabaseKorea) {
        // 캠페인 정보 별도 조회
        const { data: koreaCampaigns } = await supabaseKorea
          .from('campaigns')
          .select('id, title, campaign_type')

        const koreaCampaignMap = new Map()
        koreaCampaigns?.forEach(c => koreaCampaignMap.set(c.id, c))

        const { data: koreaParticipants, error: koreaError } = await supabaseKorea
          .from('campaign_participants')
          .select('*')
          .order('created_at', { ascending: false })

        if (koreaError) {
          console.error('[SnsUploadManagement] Korea campaign_participants error:', koreaError)
        }

        if (!koreaError && koreaParticipants) {
          console.log('[SnsUploadManagement] Korea campaign_participants:', koreaParticipants.length)
          koreaParticipants.forEach(p => {
            // 중복 체크
            const isDuplicate = allVideos.some(v =>
              v.campaign_id === p.campaign_id && v.user_id === p.user_id
            )

            const hasSnsUrl = p.sns_upload_url || p.week1_url || p.week2_url ||
                             p.week3_url || p.week4_url || p.step1_url ||
                             p.step2_url || p.step3_url
            const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted'].includes(p.status)

            if (!isDuplicate && (hasSnsUrl || hasVideoStatus)) {
              const campaign = koreaCampaignMap.get(p.campaign_id)

              // 캠페인 목록에 추가
              if (campaign) {
                campaignSet.set(campaign.id, {
                  id: campaign.id,
                  title: campaign.title,
                  type: campaign.campaign_type
                })
              }

              allVideos.push({
                id: `korea_${p.id}`,
                application_id: p.id,
                campaign_id: p.campaign_id,
                user_id: p.user_id,
                sns_upload_url: p.sns_upload_url,
                partnership_code: p.partnership_code,
                video_file_url: p.video_file_url,
                created_at: p.updated_at || p.created_at,
                status: p.status,
                source: 'korea',
                country: 'kr',
                campaignTitle: campaign?.title || '-',
                campaignType: campaign?.campaign_type,
                creatorName: resolveCreatorName(p),
                creatorEmail: p.email,
                // 멀티비디오 URL
                week1_url: p.week1_url,
                week2_url: p.week2_url,
                week3_url: p.week3_url,
                week4_url: p.week4_url,
                step1_url: p.step1_url,
                step2_url: p.step2_url,
                step3_url: p.step3_url,
                // 광고코드
                week1_partnership_code: p.week1_partnership_code,
                week2_partnership_code: p.week2_partnership_code,
                week3_partnership_code: p.week3_partnership_code,
                week4_partnership_code: p.week4_partnership_code,
                step1_2_partnership_code: p.step1_2_partnership_code,
                step3_partnership_code: p.step3_partnership_code,
              })
            }
          })
        }

        // 4. Korea DB에서 video_submissions 조회 (JOIN 없이 단순 조회)
        const { data: koreaSubmissions, error: koreaSubError } = await supabaseKorea
          .from('video_submissions')
          .select('*')
          .order('created_at', { ascending: false })

        if (koreaSubError) {
          console.error('[SnsUploadManagement] Korea video_submissions error:', koreaSubError)
        }

        if (!koreaSubError && koreaSubmissions) {
          console.log('[SnsUploadManagement] Korea video_submissions:', koreaSubmissions.length)
          koreaSubmissions.forEach(sub => {
            // 영상 관련 상태인 경우만 추가
            const hasVideoStatus = ['approved', 'completed', 'sns_uploaded', 'video_submitted', 'pending'].includes(sub.status)
            if (!hasVideoStatus && !sub.sns_upload_url) return

            // 중복 체크
            const isDuplicate = allVideos.some(v =>
              v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
            )
            if (!isDuplicate) {
              const campaign = koreaCampaignMap.get(sub.campaign_id)

              // 캠페인 목록에 추가
              if (campaign) {
                campaignSet.set(campaign.id, {
                  id: campaign.id,
                  title: campaign.title,
                  type: campaign.campaign_type
                })
              }

              allVideos.push({
                id: `korea_sub_${sub.id}`,
                submission_id: sub.id,
                application_id: sub.application_id,
                campaign_id: sub.campaign_id,
                user_id: sub.user_id,
                sns_upload_url: sub.sns_upload_url,
                partnership_code: sub.partnership_code || sub.ad_code,
                video_file_url: sub.video_file_url,
                created_at: sub.approved_at || sub.updated_at || sub.created_at,
                status: sub.status,
                source: 'korea_submission',
                country: 'kr',
                campaignTitle: campaign?.title || '-',
                campaignType: campaign?.campaign_type,
                creatorName: resolveCreatorName(sub),
                creatorEmail: sub.email,
                week_number: sub.week_number,
              })
            }
          })
        }
      }

      // 멀티비디오 캠페인 그룹화 (4주 챌린지, 올리브영)
      // 동일한 campaign_id + user_id를 가진 항목들을 하나로 병합
      const videoMap = new Map()

      allVideos.forEach(video => {
        const key = `${video.campaign_id}_${video.user_id}`

        if (!videoMap.has(key)) {
          videoMap.set(key, { ...video })
        } else {
          const existing = videoMap.get(key)

          // week URL 병합
          if (video.week_number) {
            const weekKey = `week${video.week_number}_url`
            const weekCodeKey = `week${video.week_number}_partnership_code`
            if (video.sns_upload_url && !existing[weekKey]) {
              existing[weekKey] = video.sns_upload_url
            }
            if (video.partnership_code && !existing[weekCodeKey]) {
              existing[weekCodeKey] = video.partnership_code
            }
          }

          // 개별 week URL 병합
          ['week1_url', 'week2_url', 'week3_url', 'week4_url',
           'step1_url', 'step2_url', 'step3_url'].forEach(urlKey => {
            if (video[urlKey] && !existing[urlKey]) {
              existing[urlKey] = video[urlKey]
            }
          })

          // 광고코드 병합
          ['week1_partnership_code', 'week2_partnership_code', 'week3_partnership_code',
           'week4_partnership_code', 'step1_2_partnership_code', 'step3_partnership_code'].forEach(codeKey => {
            if (video[codeKey] && !existing[codeKey]) {
              existing[codeKey] = video[codeKey]
            }
          })

          // SNS URL 병합
          if (video.sns_upload_url && !existing.sns_upload_url) {
            existing.sns_upload_url = video.sns_upload_url
          }

          // video_file_url 병합
          if (video.video_file_url && !existing.video_file_url) {
            existing.video_file_url = video.video_file_url
          }

          // 최신 날짜로 업데이트
          if (video.created_at && existing.created_at &&
              new Date(video.created_at) > new Date(existing.created_at)) {
            existing.created_at = video.created_at
          }

          // 더 진행된 상태로 업데이트
          const statusPriority = ['pending', 'video_submitted', 'approved', 'sns_uploaded', 'completed']
          const existingPriority = statusPriority.indexOf(existing.status)
          const videoPriority = statusPriority.indexOf(video.status)
          if (videoPriority > existingPriority) {
            existing.status = video.status
          }
        }
      })

      const mergedVideos = Array.from(videoMap.values())

      // 날짜 기준 정렬
      mergedVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      console.log('[SnsUploadManagement] Total completed videos (before merge):', allVideos.length)
      console.log('[SnsUploadManagement] Total completed videos (after merge):', mergedVideos.length)
      setCompletedVideos(mergedVideos)
      setCampaigns(Array.from(campaignSet.values()))
    } catch (error) {
      console.error('Error fetching completed videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterVideos = () => {
    let filtered = [...completedVideos]

    // 국가 필터
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(v => {
        if (selectedCountry === 'kr') return v.country === 'kr' || v.country === 'korea' || !v.country
        if (selectedCountry === 'us') return v.country === 'us' || v.country === 'usa'
        if (selectedCountry === 'jp') return v.country === 'jp' || v.country === 'japan'
        return true
      })
    }

    // 캠페인 필터
    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(v => v.campaign_id === selectedCampaign)
    }

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(v =>
        v.campaignTitle?.toLowerCase().includes(term) ||
        v.creatorName?.toLowerCase().includes(term) ||
        v.sns_upload_url?.toLowerCase().includes(term)
      )
    }

    setFilteredVideos(filtered)
  }

  const handleDownloadVideo = async (video, url = null) => {
    const downloadUrl = url || video.video_file_url
    if (!downloadUrl) {
      alert('다운로드 가능한 영상 파일이 없습니다.')
      return
    }

    setDownloading(video.id)
    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()

      const urlObj = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = urlObj
      a.download = `${video.campaignTitle || 'video'}_${video.creatorName || 'creator'}_${new Date().toISOString().split('T')[0]}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(urlObj)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      window.open(downloadUrl, '_blank')
    } finally {
      setDownloading(null)
    }
  }

  const getCountryLabel = (country) => {
    if (!country || country === 'kr' || country === 'korea') return { flag: '🇰🇷', label: '한국' }
    if (country === 'us' || country === 'usa') return { flag: '🇺🇸', label: '미국' }
    if (country === 'jp' || country === 'japan') return { flag: '🇯🇵', label: '일본' }
    return { flag: '🌍', label: country }
  }

  const getCampaignTypeLabel = (type) => {
    switch (type) {
      case 'planned': return '기획형'
      case 'oliveyoung':
      case 'oliveyoung_sale': return '올리브영'
      case '4week_challenge': return '4주 챌린지'
      default: return type || '일반'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return { label: '승인완료', color: 'bg-green-100 text-green-700' }
      case 'completed': return { label: '완료', color: 'bg-blue-100 text-blue-700' }
      case 'sns_uploaded': return { label: 'SNS업로드', color: 'bg-purple-100 text-purple-700' }
      default: return { label: status, color: 'bg-gray-100 text-gray-700' }
    }
  }

  // 멀티비디오 URL 구조화 (4주 챌린지, 올리브영)
  const getMultiVideoUrls = (video) => {
    const urls = []

    // 4주 챌린지
    if (video.campaignType === '4week_challenge') {
      if (video.week1_url) urls.push({ label: '1주차', url: video.week1_url, code: video.week1_partnership_code })
      if (video.week2_url) urls.push({ label: '2주차', url: video.week2_url, code: video.week2_partnership_code })
      if (video.week3_url) urls.push({ label: '3주차', url: video.week3_url, code: video.week3_partnership_code })
      if (video.week4_url) urls.push({ label: '4주차', url: video.week4_url, code: video.week4_partnership_code })
    }
    // 올리브영
    else if (video.campaignType === 'oliveyoung' || video.campaignType === 'oliveyoung_sale') {
      if (video.step1_url) urls.push({ label: 'STEP1', url: video.step1_url, code: video.step1_2_partnership_code })
      if (video.step2_url) urls.push({ label: 'STEP2', url: video.step2_url, code: video.step1_2_partnership_code })
      if (video.step3_url) urls.push({ label: 'STEP3', url: video.step3_url, code: video.step3_partnership_code })
    }
    // 일반
    else if (video.sns_upload_url) {
      urls.push({ label: 'SNS', url: video.sns_upload_url, code: video.partnership_code })
    }

    return urls
  }

  const toggleRowExpand = (videoId) => {
    setExpandedRows(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }))
  }

  const countByCountry = (country) => {
    if (country === 'all') return completedVideos.length
    return completedVideos.filter(v => {
      if (country === 'kr') return v.country === 'kr' || v.country === 'korea' || !v.country
      if (country === 'us') return v.country === 'us' || v.country === 'usa'
      if (country === 'jp') return v.country === 'jp' || v.country === 'japan'
      return false
    }).length
  }

  const isVideoUrl = (url) => {
    if (!url) return false
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv']
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ||
           url.includes('video') || url.includes('storage')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 네비게이션 */}
      <AdminNavigation />

      {/* 메인 콘텐츠 */}
      <div className="ml-56 p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-green-500" />
              SNS 업로드 완료 영상 관리
            </h1>
            <p className="text-sm text-gray-500 mt-1">크리에이터가 SNS에 업로드 완료한 영상을 관리합니다</p>
          </div>
          <Button onClick={fetchCompletedVideos} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'all' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('all')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">전체</p>
                  <p className="text-2xl font-bold">{countByCountry('all')}</p>
                </div>
                <Globe className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'kr' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('kr')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">🇰🇷 한국</p>
                  <p className="text-2xl font-bold">{countByCountry('kr')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'us' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('us')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">🇺🇸 미국</p>
                  <p className="text-2xl font-bold">{countByCountry('us')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCountry === 'jp' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSelectedCountry('jp')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">🇯🇵 일본</p>
                  <p className="text-2xl font-bold">{countByCountry('jp')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 & 검색 */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="캠페인명, 크리에이터명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {/* 캠페인 필터 */}
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="캠페인 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 캠페인</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title?.length > 30 ? campaign.title.slice(0, 30) + '...' : campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs value={selectedCountry} onValueChange={setSelectedCountry}>
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="kr">🇰🇷 한국</TabsTrigger>
                  <TabsTrigger value="us">🇺🇸 미국</TabsTrigger>
                  <TabsTrigger value="jp">🇯🇵 일본</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              SNS 업로드 완료 목록 ({filteredVideos.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>SNS 업로드 완료된 영상이 없습니다.</p>
                <p className="text-sm text-gray-400 mt-2">캠페인 관리 → 완료 탭에서 데이터를 확인하세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[60px]">국가</TableHead>
                      <TableHead>캠페인</TableHead>
                      <TableHead>크리에이터</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>SNS URL</TableHead>
                      <TableHead>완료일</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVideos.map((video) => {
                      const { flag } = getCountryLabel(video.country)
                      const multiUrls = getMultiVideoUrls(video)
                      const statusConfig = getStatusLabel(video.status)
                      const isExpanded = expandedRows[video.id]
                      const hasMultipleUrls = multiUrls.length > 1

                      return (
                        <>
                          <TableRow key={video.id} className={hasMultipleUrls ? 'cursor-pointer hover:bg-gray-50' : ''}>
                            <TableCell>
                              {hasMultipleUrls && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6"
                                  onClick={() => toggleRowExpand(video.id)}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-lg">{flag}</span>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[180px]">
                                <p className="font-medium truncate" title={video.campaignTitle}>
                                  {video.campaignTitle || '-'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" />
                                <span className="text-sm">{video.creatorName || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getCampaignTypeLabel(video.campaignType)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${statusConfig.color}`}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {multiUrls.length > 0 ? (
                                  <>
                                    <a
                                      href={multiUrls[0].url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {multiUrls[0].label}
                                    </a>
                                    {multiUrls.length > 1 && (
                                      <span className="text-xs text-gray-500">
                                        +{multiUrls.length - 1}개 더보기
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">미등록</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {video.created_at
                                  ? new Date(video.created_at).toLocaleDateString('ko-KR')
                                  : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {video.video_file_url && isVideoUrl(video.video_file_url) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPreviewVideo({ ...video, currentUrl: video.video_file_url })}
                                    title="영상 미리보기"
                                  >
                                    <Play className="w-4 h-4" />
                                  </Button>
                                )}
                                {video.video_file_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadVideo(video)}
                                    disabled={downloading === video.id}
                                    title="영상 다운로드"
                                  >
                                    {downloading === video.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/campaigns/${video.campaign_id}`)}
                                  title="캠페인 상세"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* 확장된 멀티비디오 URL 행 */}
                          {isExpanded && hasMultipleUrls && (
                            <TableRow className="bg-gray-50">
                              <TableCell colSpan={10}>
                                <div className="py-3 px-4">
                                  <p className="text-sm font-medium text-gray-700 mb-3">
                                    {video.campaignType === '4week_challenge' ? '4주 챌린지 영상' : '올리브영 STEP 영상'}
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {multiUrls.map((item, idx) => (
                                      <div key={idx} className="p-3 bg-white rounded-lg border">
                                        <div className="flex items-center justify-between mb-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {item.label}
                                          </Badge>
                                          <div className="flex gap-1">
                                            <a
                                              href={item.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800"
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          </div>
                                        </div>
                                        {item.code && (
                                          <div className="mt-2">
                                            <span className="text-xs text-gray-500">광고코드: </span>
                                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                              {item.code}
                                            </code>
                                          </div>
                                        )}
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-gray-500 hover:text-blue-600 truncate block mt-1"
                                        >
                                          {item.url.length > 40 ? item.url.slice(0, 40) + '...' : item.url}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 영상 미리보기 모달 */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              영상 미리보기
              {previewVideo && (
                <span className="text-sm font-normal text-gray-500">
                  - {previewVideo.creatorName} / {previewVideo.campaignTitle}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={previewVideo.currentUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {previewVideo.video_file_url && (
                    <a href={previewVideo.video_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      원본 영상 링크
                    </a>
                  )}
                </div>
                <Button
                  onClick={() => handleDownloadVideo(previewVideo, previewVideo.currentUrl)}
                  disabled={downloading === previewVideo.id}
                >
                  {downloading === previewVideo.id ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  다운로드
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
