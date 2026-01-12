/**
 * SNS 업로드 완료 영상 통합 관리 페이지
 * 한국/미국/일본 국가별로 SNS 업로드 완료된 영상을 관리
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download, ExternalLink, Search, RefreshCw,
  Video, Globe, User, Building2, Eye
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function SnsUploadManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [completedVideos, setCompletedVideos] = useState([])
  const [filteredVideos, setFilteredVideos] = useState([])
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchCompletedVideos()
  }, [])

  useEffect(() => {
    filterVideos()
  }, [completedVideos, selectedCountry, searchTerm])

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

      // 1. BIZ DB에서 applications 조회 (완료 상태: approved, completed, sns_uploaded)
      const { data: bizApplications, error: bizAppError } = await supabaseBiz
        .from('applications')
        .select(`
          *,
          campaigns:campaign_id (
            id,
            title,
            company_id,
            campaign_type,
            target_country,
            companies:company_id (
              company_name,
              contact_email
            )
          )
        `)
        .in('status', ['approved', 'completed', 'sns_uploaded'])
        .order('created_at', { ascending: false })

      if (!bizAppError && bizApplications) {
        console.log('[SnsUploadManagement] BIZ applications (approved/completed/sns_uploaded):', bizApplications.length)
        bizApplications.forEach(app => {
          // SNS URL이 있는 경우 또는 완료 상태인 경우 추가
          const hasSnsUrl = app.sns_upload_url || app.week1_url || app.week2_url ||
                           app.week3_url || app.week4_url || app.step1_url ||
                           app.step2_url || app.step3_url

          if (hasSnsUrl || ['approved', 'completed', 'sns_uploaded'].includes(app.status)) {
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
              country: app.campaigns?.target_country || 'kr',
              campaignTitle: app.campaigns?.title,
              companyName: app.campaigns?.companies?.company_name,
              campaignType: app.campaigns?.campaign_type,
              creatorName: app.creator_name || app.applicant_name,
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

      // 2. BIZ DB에서 video_submissions 조회 (approved, completed 상태)
      const { data: bizSubmissions, error: bizSubError } = await supabaseBiz
        .from('video_submissions')
        .select(`
          *,
          campaigns:campaign_id (
            id,
            title,
            company_id,
            campaign_type,
            target_country,
            companies:company_id (
              company_name,
              contact_email
            )
          )
        `)
        .in('status', ['approved', 'completed'])
        .order('created_at', { ascending: false })

      if (!bizSubError && bizSubmissions) {
        console.log('[SnsUploadManagement] BIZ video_submissions:', bizSubmissions.length)
        bizSubmissions.forEach(sub => {
          // 중복 체크
          const isDuplicate = allVideos.some(v =>
            v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
          )
          if (!isDuplicate) {
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
              country: sub.campaigns?.target_country || 'kr',
              campaignTitle: sub.campaigns?.title,
              companyName: sub.campaigns?.companies?.company_name,
              campaignType: sub.campaigns?.campaign_type,
              creatorName: sub.creator_name,
              week_number: sub.week_number,
            })
          }
        })
      }

      // 3. Korea DB에서 campaign_participants 조회
      if (supabaseKorea) {
        const { data: koreaParticipants, error: koreaError } = await supabaseKorea
          .from('campaign_participants')
          .select(`
            *,
            campaigns:campaign_id (
              id,
              title,
              campaign_type
            )
          `)
          .in('status', ['approved', 'completed', 'sns_uploaded'])
          .order('created_at', { ascending: false })

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

            if (!isDuplicate && (hasSnsUrl || ['approved', 'completed', 'sns_uploaded'].includes(p.status))) {
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
                campaignTitle: p.campaigns?.title,
                campaignType: p.campaigns?.campaign_type,
                creatorName: p.creator_name,
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

        // 4. Korea DB에서 video_submissions 조회
        const { data: koreaSubmissions, error: koreaSubError } = await supabaseKorea
          .from('video_submissions')
          .select(`
            *,
            campaigns:campaign_id (
              id,
              title,
              campaign_type
            )
          `)
          .in('status', ['approved', 'completed'])
          .order('created_at', { ascending: false })

        if (!koreaSubError && koreaSubmissions) {
          console.log('[SnsUploadManagement] Korea video_submissions:', koreaSubmissions.length)
          koreaSubmissions.forEach(sub => {
            // 중복 체크
            const isDuplicate = allVideos.some(v =>
              v.campaign_id === sub.campaign_id && v.user_id === sub.user_id
            )
            if (!isDuplicate) {
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
                campaignTitle: sub.campaigns?.title,
                campaignType: sub.campaigns?.campaign_type,
                creatorName: sub.creator_name,
                week_number: sub.week_number,
              })
            }
          })
        }
      }

      // 날짜 기준 정렬
      allVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      console.log('[SnsUploadManagement] Total completed videos:', allVideos.length)
      setCompletedVideos(allVideos)
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

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(v =>
        v.campaignTitle?.toLowerCase().includes(term) ||
        v.companyName?.toLowerCase().includes(term) ||
        v.creatorName?.toLowerCase().includes(term) ||
        v.sns_upload_url?.toLowerCase().includes(term)
      )
    }

    setFilteredVideos(filtered)
  }

  const handleDownloadVideo = async (video) => {
    if (!video.video_file_url) {
      alert('다운로드 가능한 영상 파일이 없습니다.')
      return
    }

    setDownloading(video.id)
    try {
      const response = await fetch(video.video_file_url)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${video.campaignTitle || 'video'}_${video.creatorName || 'creator'}_${new Date().toISOString().split('T')[0]}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      window.open(video.video_file_url, '_blank')
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

  const getAllSnsUrls = (video) => {
    const urls = []
    if (video.sns_upload_url) urls.push({ label: 'SNS', url: video.sns_upload_url })
    if (video.week1_url) urls.push({ label: '1주차', url: video.week1_url })
    if (video.week2_url) urls.push({ label: '2주차', url: video.week2_url })
    if (video.week3_url) urls.push({ label: '3주차', url: video.week3_url })
    if (video.week4_url) urls.push({ label: '4주차', url: video.week4_url })
    if (video.step1_url) urls.push({ label: 'STEP1', url: video.step1_url })
    if (video.step2_url) urls.push({ label: 'STEP2', url: video.step2_url })
    if (video.step3_url) urls.push({ label: 'STEP3', url: video.step3_url })
    return urls
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
                    placeholder="캠페인명, 기업명, 크리에이터명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
                      <TableHead className="w-[60px]">국가</TableHead>
                      <TableHead>캠페인</TableHead>
                      <TableHead>기업</TableHead>
                      <TableHead>크리에이터</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>SNS URL</TableHead>
                      <TableHead>광고코드</TableHead>
                      <TableHead>완료일</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVideos.map((video) => {
                      const { flag } = getCountryLabel(video.country)
                      const snsUrls = getAllSnsUrls(video)
                      const statusConfig = getStatusLabel(video.status)

                      return (
                        <TableRow key={video.id}>
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
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <span className="text-sm">{video.companyName || '-'}</span>
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
                              {snsUrls.length > 0 ? (
                                snsUrls.slice(0, 2).map((item, idx) => (
                                  <a
                                    key={idx}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {item.label}
                                  </a>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs">미등록</span>
                              )}
                              {snsUrls.length > 2 && (
                                <span className="text-xs text-gray-400">+{snsUrls.length - 2}개</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {video.partnership_code ? (
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {video.partnership_code}
                              </code>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
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
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
