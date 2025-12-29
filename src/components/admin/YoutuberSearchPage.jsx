import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search, Youtube, Mail, Send, ExternalLink, Users, Globe,
  ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle,
  Eye, Download, Filter, RefreshCw, Star, Clock, MessageSquare,
  AlertCircle, Info, PlayCircle, Video, Image, Film, Link2
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

// 상태 배지 컬러
const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  interested: 'bg-purple-100 text-purple-800',
  negotiating: 'bg-orange-100 text-orange-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  no_response: 'bg-gray-100 text-gray-800',
  invalid_email: 'bg-red-100 text-red-600',
  blacklisted: 'bg-black text-white'
}

const STATUS_LABELS = {
  new: '신규',
  contacted: '연락함',
  responded: '응답 받음',
  interested: '관심 있음',
  negotiating: '협상 중',
  accepted: '수락 (섭외 성공)',
  declined: '거절',
  no_response: '무응답',
  invalid_email: '이메일 무효',
  blacklisted: '블랙리스트'
}

// 구독자 수 포맷
const formatSubscribers = (count) => {
  if (!count) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toLocaleString()
}

// 날짜 포맷
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export default function YoutuberSearchPage() {
  const navigate = useNavigate()

  // 검색 상태
  const [searchKeyword, setSearchKeyword] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [minSubscribers, setMinSubscribers] = useState('')
  const [maxSubscribers, setMaxSubscribers] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [nextPageToken, setNextPageToken] = useState(null)
  const [searchType, setSearchType] = useState('video') // 'video' 또는 'channel'

  // GIF 변환 상태
  const [shortsUrl, setShortsUrl] = useState('')
  const [startTime, setStartTime] = useState('0')
  const [gifDuration, setGifDuration] = useState('3')
  const [videoInfo, setVideoInfo] = useState(null)
  const [loadingVideo, setLoadingVideo] = useState(false)

  // 목록 상태
  const [activeTab, setActiveTab] = useState('search')
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('all')
  const [emailFilter, setEmailFilter] = useState('all')
  const [listSearchTerm, setListSearchTerm] = useState('')

  // 선택 상태
  const [selectedProspects, setSelectedProspects] = useState([])

  // 모달 상태
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [emailLanguage, setEmailLanguage] = useState('en')
  const [previewHtml, setPreviewHtml] = useState('')
  const [sending, setSending] = useState(false)

  // 통계
  const [stats, setStats] = useState({
    total: 0,
    with_email: 0,
    by_status: {},
    by_country: {}
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (activeTab === 'list') {
      fetchProspects()
      fetchStats()
    }
  }, [activeTab, currentPage, statusFilter, emailFilter])

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
      navigate('/admin/login')
    }
  }

  const getAuthToken = async () => {
    const { data: { session } } = await supabaseBiz.auth.getSession()
    return session?.access_token
  }

  // YouTube 영상/채널 검색
  const handleSearch = async (pageToken = null) => {
    if (!searchKeyword.trim()) {
      alert('검색 키워드를 입력하세요')
      return
    }

    setSearching(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'search',
          keyword: searchKeyword,
          country_code: countryCode,
          max_results: 50,
          min_subscribers: minSubscribers ? parseInt(minSubscribers) : 0,
          max_subscribers: maxSubscribers ? parseInt(maxSubscribers) : undefined,
          page_token: pageToken,
          save_results: true,
          search_type: searchType // 'video' 또는 'channel'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      if (pageToken) {
        setSearchResults(prev => [...prev, ...result.data.channels])
      } else {
        setSearchResults(result.data.channels)
      }

      setNextPageToken(result.data.nextPageToken)

    } catch (error) {
      console.error('Search error:', error)
      alert('검색 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setSearching(false)
    }
  }

  // YouTube 쇼츠 정보 조회
  const handleGetVideoInfo = async () => {
    if (!shortsUrl.trim()) {
      alert('YouTube 쇼츠 URL을 입력하세요')
      return
    }

    setLoadingVideo(true)
    try {
      const response = await fetch('/.netlify/functions/youtube-to-gif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_gif_url',
          url: shortsUrl,
          start_time: parseInt(startTime) || 0,
          duration: parseInt(gifDuration) || 3
        })
      })

      const result = await response.json()
      if (result.success) {
        setVideoInfo(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('영상 정보 조회 실패: ' + error.message)
    } finally {
      setLoadingVideo(false)
    }
  }

  // 저장된 prospects 목록 조회
  const fetchProspects = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'list',
          country_code: countryCode !== 'all' ? countryCode : undefined,
          outreach_status: statusFilter !== 'all' ? statusFilter : undefined,
          has_email: emailFilter === 'with_email' ? true : emailFilter === 'without_email' ? false : undefined,
          search_term: listSearchTerm || undefined,
          page: currentPage,
          limit: 50
        })
      })

      const result = await response.json()

      if (result.success) {
        setProspects(result.data.prospects || [])
        setTotalPages(result.data.totalPages || 1)
        setTotalCount(result.data.total || 0)
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 통계 조회
  const fetchStats = async () => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'stats'
        })
      })

      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Stats error:', error)
    }
  }

  // 이메일 미리보기
  const handlePreviewEmail = async () => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/send-outreach-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'preview',
          language: emailLanguage,
          channel_name: 'Sample Creator'
        })
      })

      const result = await response.json()
      if (result.success) {
        setPreviewHtml(result.html)
        setShowPreviewModal(true)
      }
    } catch (error) {
      console.error('Preview error:', error)
    }
  }

  // 단일 이메일 발송
  const handleSendEmail = async (prospectId) => {
    if (!confirm('이 크리에이터에게 섭외 이메일을 발송하시겠습니까?')) return

    setSending(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/send-outreach-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'send_single',
          prospect_id: prospectId,
          language: emailLanguage
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('이메일이 발송되었습니다!')
        fetchProspects()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('발송 실패: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  // 대량 이메일 발송
  const handleBulkSend = async () => {
    if (selectedProspects.length === 0) {
      alert('발송할 크리에이터를 선택하세요')
      return
    }

    if (!confirm(`선택한 ${selectedProspects.length}명에게 섭외 이메일을 발송하시겠습니까?`)) return

    setSending(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/send-outreach-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'send_bulk',
          prospect_ids: selectedProspects,
          language: emailLanguage
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`발송 완료!\n- 성공: ${result.results.sent}건\n- 스킵: ${result.results.skipped}건\n- 실패: ${result.results.failed}건`)
        setSelectedProspects([])
        fetchProspects()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      alert('발송 실패: ' + error.message)
    } finally {
      setSending(false)
      setShowEmailModal(false)
    }
  }

  // 상태 업데이트
  const handleUpdateStatus = async (prospectId, newStatus) => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/.netlify/functions/search-youtube-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update_status',
          prospect_id: prospectId,
          status: newStatus
        })
      })

      const result = await response.json()
      if (result.success) {
        fetchProspects()
      }
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  // 엑셀 다운로드
  const handleExportExcel = () => {
    const data = prospects.map(p => ({
      '채널명': p.channel_name,
      '채널ID': p.channel_id,
      '핸들': p.channel_handle,
      '국가': p.country_code,
      '구독자': p.subscriber_count,
      '영상수': p.video_count,
      '조회수': p.view_count,
      '이메일': p.extracted_email || '',
      '상태': STATUS_LABELS[p.outreach_status] || p.outreach_status,
      '마지막연락': formatDate(p.last_contacted_at),
      '연락횟수': p.contact_count || 0,
      '등록일': formatDate(p.created_at)
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'YouTubers')
    XLSX.writeFile(wb, `youtuber_prospects_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // 선택 토글
  const toggleSelectAll = () => {
    if (selectedProspects.length === prospects.filter(p => p.extracted_email).length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(prospects.filter(p => p.extracted_email).map(p => p.id))
    }
  }

  const toggleSelect = (id) => {
    setSelectedProspects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Youtube className="h-8 w-8 text-red-600" />
            유튜버 검색 & 섭외
          </h1>
          <p className="mt-2 text-gray-600">
            미국/일본 유튜버를 검색하고 섭외 이메일을 발송합니다. (YouTube Data API 공식 사용)
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">전체 수집</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.with_email}</div>
              <div className="text-sm text-gray-500">이메일 있음</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.by_country?.US || 0}</div>
              <div className="text-sm text-gray-500">미국</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.by_country?.JP || 0}</div>
              <div className="text-sm text-gray-500">일본</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.by_status?.contacted || 0}</div>
              <div className="text-sm text-gray-500">연락함</div>
            </CardContent>
          </Card>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              영상 기반 검색
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              수집 목록 ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="gif" className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              쇼츠 → GIF
            </TabsTrigger>
          </TabsList>

          {/* 검색 탭 */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  영상 콘텐츠 기반 크리에이터 검색
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 검색 타입 선택 */}
                <div className="flex gap-4 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchType"
                      value="video"
                      checked={searchType === 'video'}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">영상 콘텐츠 기반 (추천)</span>
                    <span className="text-xs text-gray-500">- 키워드 관련 영상을 올린 크리에이터 검색</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchType"
                      value="channel"
                      checked={searchType === 'channel'}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">채널명 검색</span>
                    <span className="text-xs text-gray-500">- 채널명에 키워드 포함</span>
                  </label>
                </div>

                {/* 검색 폼 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      검색 키워드
                    </label>
                    <Input
                      placeholder={searchType === 'video' ? "예: beauty tutorial, gaming review, cooking..." : "예: beauty, vlog, tech..."}
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      국가
                    </label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">미국 (US)</SelectItem>
                        <SelectItem value="JP">일본 (JP)</SelectItem>
                        <SelectItem value="KR">한국 (KR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleSearch()}
                      disabled={searching}
                      className="w-full"
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      검색
                    </Button>
                  </div>
                </div>

                {/* 구독자 필터 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최소 구독자
                    </label>
                    <Input
                      type="number"
                      placeholder="예: 10000"
                      value={minSubscribers}
                      onChange={(e) => setMinSubscribers(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      최대 구독자
                    </label>
                    <Input
                      type="number"
                      placeholder="예: 1000000"
                      value={maxSubscribers}
                      onChange={(e) => setMaxSubscribers(e.target.value)}
                    />
                  </div>
                </div>

                {/* 안내 메시지 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">
                        {searchType === 'video' ? '영상 콘텐츠 기반 검색' : '채널명 검색'}
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {searchType === 'video' ? (
                          <>
                            <li>키워드 관련 영상을 올린 크리에이터를 찾습니다</li>
                            <li>예: "beauty tutorial" → 뷰티 튜토리얼 영상을 올린 크리에이터</li>
                            <li>50개 영상 검색 → 중복 제거 → 크리에이터 추출</li>
                          </>
                        ) : (
                          <>
                            <li>채널명에 키워드가 포함된 채널을 검색합니다</li>
                          </>
                        )}
                        <li>채널 설명란에 공개된 이메일만 추출 (합법적 방법)</li>
                        <li>검색 결과는 자동으로 DB에 저장됩니다</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 검색 결과 */}
                {searchResults.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">
                        검색 결과: {searchResults.length}개
                        <span className="ml-2 text-green-600">
                          (이메일 발견: {searchResults.filter(r => r.extracted_email).length}개)
                        </span>
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {searchResults.map((channel) => (
                        <div
                          key={channel.channel_id}
                          className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <img
                            src={channel.thumbnail_url || '/placeholder-avatar.png'}
                            alt={channel.channel_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 truncate">
                                {channel.channel_name}
                              </h4>
                              {channel.extracted_email && (
                                <Badge className="bg-green-100 text-green-800">
                                  <Mail className="h-3 w-3 mr-1" />
                                  이메일 있음
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {channel.channel_handle}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {formatSubscribers(channel.subscriber_count)}
                              </span>
                              <span className="flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                {channel.video_count} 영상
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatSubscribers(channel.view_count)} 조회
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={channel.channel_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-red-600"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>

                    {nextPageToken && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          onClick={() => handleSearch(nextPageToken)}
                          disabled={searching}
                        >
                          더 보기
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 목록 탭 */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    수집된 유튜버 목록
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      엑셀 다운로드
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewEmail}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      템플릿 미리보기
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowEmailModal(true)}
                      disabled={selectedProspects.length === 0}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      선택 발송 ({selectedProspects.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 필터 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Input
                    placeholder="채널명 검색..."
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchProspects()}
                  />
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="국가" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 국가</SelectItem>
                      <SelectItem value="US">미국</SelectItem>
                      <SelectItem value="JP">일본</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="new">신규</SelectItem>
                      <SelectItem value="contacted">연락함</SelectItem>
                      <SelectItem value="responded">응답 받음</SelectItem>
                      <SelectItem value="interested">관심 있음</SelectItem>
                      <SelectItem value="accepted">섭외 성공</SelectItem>
                      <SelectItem value="declined">거절</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={emailFilter} onValueChange={setEmailFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="이메일" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="with_email">이메일 있음</SelectItem>
                      <SelectItem value="without_email">이메일 없음</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchProspects}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    새로고침
                  </Button>
                </div>

                {/* 테이블 */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="p-3 text-left">
                              <Checkbox
                                checked={selectedProspects.length === prospects.filter(p => p.extracted_email).length}
                                onCheckedChange={toggleSelectAll}
                              />
                            </th>
                            <th className="p-3 text-left">채널</th>
                            <th className="p-3 text-left">국가</th>
                            <th className="p-3 text-right">구독자</th>
                            <th className="p-3 text-left">이메일</th>
                            <th className="p-3 text-left">상태</th>
                            <th className="p-3 text-center">연락</th>
                            <th className="p-3 text-center">액션</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prospects.map((prospect) => (
                            <tr key={prospect.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                {prospect.extracted_email && (
                                  <Checkbox
                                    checked={selectedProspects.includes(prospect.id)}
                                    onCheckedChange={() => toggleSelect(prospect.id)}
                                  />
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={prospect.thumbnail_url || '/placeholder-avatar.png'}
                                    alt={prospect.channel_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                  <div>
                                    <a
                                      href={prospect.channel_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-gray-900 hover:text-blue-600"
                                    >
                                      {prospect.channel_name}
                                    </a>
                                    <div className="text-sm text-gray-500">
                                      {prospect.channel_handle}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline">
                                  <Globe className="h-3 w-3 mr-1" />
                                  {prospect.country_code}
                                </Badge>
                              </td>
                              <td className="p-3 text-right font-medium">
                                {formatSubscribers(prospect.subscriber_count)}
                              </td>
                              <td className="p-3">
                                {prospect.extracted_email ? (
                                  <span className="text-sm text-green-600">
                                    {prospect.extracted_email}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">없음</span>
                                )}
                              </td>
                              <td className="p-3">
                                <Select
                                  value={prospect.outreach_status}
                                  onValueChange={(value) => handleUpdateStatus(prospect.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <Badge className={STATUS_COLORS[prospect.outreach_status]}>
                                      {STATUS_LABELS[prospect.outreach_status]}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 text-center">
                                <div className="text-sm">
                                  <div>{prospect.contact_count || 0}회</div>
                                  {prospect.last_contacted_at && (
                                    <div className="text-xs text-gray-500">
                                      {formatDate(prospect.last_contacted_at)}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <a
                                    href={prospect.channel_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-gray-400 hover:text-red-600"
                                  >
                                    <Youtube className="h-4 w-4" />
                                  </a>
                                  {prospect.extracted_email && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSendEmail(prospect.id)}
                                      disabled={sending}
                                    >
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-600">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GIF 변환 탭 */}
          <TabsContent value="gif">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  유튜브 쇼츠 → GIF 변환
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 입력 폼 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        YouTube 쇼츠 URL
                      </label>
                      <Input
                        placeholder="https://youtube.com/shorts/xxxxx"
                        value={shortsUrl}
                        onChange={(e) => setShortsUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시작 시간 (초)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        길이 (초)
                      </label>
                      <Select value={gifDuration} onValueChange={setGifDuration}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2초</SelectItem>
                          <SelectItem value="3">3초</SelectItem>
                          <SelectItem value="4">4초</SelectItem>
                          <SelectItem value="5">5초</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleGetVideoInfo}
                    disabled={loadingVideo || !shortsUrl}
                    className="w-full md:w-auto"
                  >
                    {loadingVideo ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Image className="h-4 w-4 mr-2" />
                    )}
                    GIF 변환 옵션 생성
                  </Button>

                  {/* 결과 */}
                  {videoInfo && (
                    <div className="border rounded-lg p-6 bg-gray-50">
                      <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                        <Youtube className="h-5 w-5 text-red-600" />
                        영상 정보
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 썸네일 */}
                        <div>
                          <p className="text-sm text-gray-600 mb-2">썸네일 (GIF 대용 가능)</p>
                          <img
                            src={videoInfo.thumbnails?.high}
                            alt="Video thumbnail"
                            className="rounded-lg w-full"
                          />
                          <div className="mt-2 flex gap-2">
                            <a
                              href={videoInfo.thumbnails?.maxres}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              고화질 다운로드
                            </a>
                          </div>
                        </div>

                        {/* GIF 변환 옵션 */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">GIF 변환 서비스</p>
                            <p className="text-xs text-gray-500 mb-3">
                              아래 서비스에서 {startTime}초 ~ {parseInt(startTime) + parseInt(gifDuration)}초 구간을 GIF로 변환하세요
                            </p>
                            <div className="space-y-2">
                              <a
                                href={videoInfo.external_services?.ezgif}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-blue-500 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">EZGIF.com</span>
                                <span className="text-xs text-gray-500">- 무료, 5MB 이하 최적화 가능</span>
                              </a>
                              <a
                                href={videoInfo.external_services?.giphy}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-purple-500 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">GIPHY</span>
                                <span className="text-xs text-gray-500">- GIF 생성 및 호스팅</span>
                              </a>
                              <a
                                href={videoInfo.external_services?.makeagif}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-green-500 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4 text-green-600" />
                                <span className="font-medium">MakeAGif</span>
                                <span className="text-xs text-gray-500">- YouTube URL 직접 입력</span>
                              </a>
                            </div>
                          </div>

                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              <strong>5MB 이하로 만들려면:</strong>
                              <br />
                              • 해상도: 480p 이하
                              <br />
                              • 길이: 3-4초
                              <br />
                              • 프레임: 10-15 fps
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 미리보기 임베드 */}
                      <div className="mt-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          영상 미리보기 ({startTime}초 ~ {parseInt(startTime) + parseInt(gifDuration)}초)
                        </p>
                        <div className="aspect-[9/16] max-w-xs bg-black rounded-lg overflow-hidden">
                          <iframe
                            src={videoInfo.embed_url}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 사용 안내 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">GIF 변환 방법</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>YouTube 쇼츠 URL을 입력합니다</li>
                          <li>시작 시간과 길이를 설정합니다</li>
                          <li>"GIF 변환 옵션 생성" 버튼을 클릭합니다</li>
                          <li>외부 서비스(EZGIF 추천)에서 GIF를 생성합니다</li>
                          <li>5MB 이하로 최적화하여 다운로드합니다</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 이메일 발송 모달 */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>섭외 이메일 발송</DialogTitle>
            <DialogDescription>
              선택한 {selectedProspects.length}명의 크리에이터에게 섭외 이메일을 발송합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일 언어
              </label>
              <Select value={emailLanguage} onValueChange={setEmailLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (미국)</SelectItem>
                  <SelectItem value="jp">日本語 (일본)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">발송 전 확인사항</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>신규(new) 상태인 크리에이터만 발송됩니다</li>
                    <li>이미 연락한 크리에이터는 스킵됩니다</li>
                    <li>수신거부(opt-out) 링크가 자동 포함됩니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              취소
            </Button>
            <Button onClick={handleBulkSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              발송하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이메일 미리보기 모달 */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>이메일 템플릿 미리보기</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="mb-4">
              <Select value={emailLanguage} onValueChange={(v) => {
                setEmailLanguage(v)
                handlePreviewEmail()
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="jp">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
