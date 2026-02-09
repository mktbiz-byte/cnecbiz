/**
 * 뉴스레터 트래픽 분석 대시보드
 * 유입경로별 통계, UTM 캠페인 성과, 뉴스레터별 트래픽 분석
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3, TrendingUp, Eye, Users, Globe, Mail, Youtube,
  ArrowLeft, RefreshCw, Loader2, ExternalLink, Search,
  Calendar, Filter, Download
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 유입경로 아이콘/색상 매핑
const SOURCE_CONFIG = {
  direct: { label: '직접 방문', color: 'bg-gray-100 text-gray-700', icon: Globe },
  google: { label: 'Google 검색', color: 'bg-blue-100 text-blue-700', icon: Search },
  youtube: { label: 'YouTube', color: 'bg-red-100 text-red-700', icon: Youtube },
  instagram: { label: 'Instagram', color: 'bg-pink-100 text-pink-700', icon: Globe },
  tiktok: { label: 'TikTok', color: 'bg-gray-100 text-gray-900', icon: Globe },
  facebook: { label: 'Facebook', color: 'bg-blue-100 text-blue-800', icon: Globe },
  twitter: { label: 'X (Twitter)', color: 'bg-gray-100 text-gray-700', icon: Globe },
  naver: { label: '네이버', color: 'bg-green-100 text-green-700', icon: Search },
  kakao: { label: '카카오', color: 'bg-yellow-100 text-yellow-800', icon: Globe },
  line: { label: 'LINE', color: 'bg-green-100 text-green-800', icon: Globe },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-700', icon: Globe },
  newsletter: { label: '뉴스레터 (이메일)', color: 'bg-purple-100 text-purple-700', icon: Mail },
  internal: { label: '내부 이동', color: 'bg-gray-100 text-gray-500', icon: Globe },
  unknown: { label: '알 수 없음', color: 'bg-gray-100 text-gray-400', icon: Globe },
  other: { label: '기타', color: 'bg-gray-100 text-gray-500', icon: Globe },
}

function getSourceConfig(source) {
  if (SOURCE_CONFIG[source]) return SOURCE_CONFIG[source]
  if (source?.startsWith('utm:')) {
    return { label: `UTM: ${source.replace('utm:', '')}`, color: 'bg-indigo-100 text-indigo-700', icon: Globe }
  }
  if (source?.startsWith('referral:')) {
    return { label: source.replace('referral:', ''), color: 'bg-cyan-100 text-cyan-700', icon: ExternalLink }
  }
  return SOURCE_CONFIG.other
}

export default function NewsletterTrafficAnalytics() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // 날짜 필터
  const [dateRange, setDateRange] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // 데이터
  const [overview, setOverview] = useState(null)
  const [trafficSources, setTrafficSources] = useState(null)
  const [utmCampaigns, setUtmCampaigns] = useState(null)
  const [newsletterStats, setNewsletterStats] = useState(null)
  const [dailyTrend, setDailyTrend] = useState(null)
  const [topReferrers, setTopReferrers] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!loading) {
      fetchData(activeTab)
    }
  }, [activeTab, dateRange, customFrom, customTo])

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
    fetchData('overview')
  }

  const getDateRange = () => {
    const now = new Date()
    let from, to

    switch (dateRange) {
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        break
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        break
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
        break
      case 'custom':
        from = customFrom ? new Date(customFrom).toISOString() : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        to = customTo ? new Date(customTo + 'T23:59:59').toISOString() : now.toISOString()
        return { from, to }
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    return { from, to: now.toISOString() }
  }

  const fetchData = async (tab) => {
    const { from, to } = getDateRange()

    try {
      switch (tab) {
        case 'overview':
          await fetchOverview(from, to)
          break
        case 'sources':
          await fetchTrafficSources(from, to)
          break
        case 'utm':
          await fetchUtmCampaigns(from, to)
          break
        case 'newsletters':
          await fetchNewsletterStats(from, to)
          break
        case 'referrers':
          await fetchTopReferrers(from, to)
          break
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    }
  }

  const callApi = async (action, extra = {}) => {
    const { from, to } = getDateRange()
    const response = await fetch('/.netlify/functions/newsletter-traffic-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, dateFrom: from, dateTo: to, ...extra })
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error)
    return result.data
  }

  const fetchOverview = async (from, to) => {
    const data = await callApi('overview')
    setOverview(data)
    // 일별 추이도 함께 로드
    const trend = await callApi('daily_trend')
    setDailyTrend(trend)
  }

  const fetchTrafficSources = async () => {
    const data = await callApi('traffic_sources')
    setTrafficSources(data)
  }

  const fetchUtmCampaigns = async () => {
    const data = await callApi('utm_campaigns')
    setUtmCampaigns(data)
  }

  const fetchNewsletterStats = async () => {
    const data = await callApi('newsletter_stats', { limit: 50 })
    setNewsletterStats(data)
  }

  const fetchTopReferrers = async () => {
    const data = await callApi('top_referrers')
    setTopReferrers(data)
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    return num.toLocaleString()
  }

  const formatPercent = (part, total) => {
    if (!total || !part) return '0%'
    return `${((part / total) * 100).toFixed(1)}%`
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
            <div className="flex items-center gap-3 mb-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/newsletters')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                뉴스레터 관리
              </Button>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              뉴스레터 트래픽 분석
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              유입경로, UTM 캠페인, 뉴스레터별 트래픽을 분석합니다
            </p>
          </div>

          {/* 날짜 필터 */}
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">최근 7일</SelectItem>
                <SelectItem value="30d">최근 30일</SelectItem>
                <SelectItem value="90d">최근 90일</SelectItem>
                <SelectItem value="custom">직접 설정</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-[140px]"
                />
                <span className="text-gray-400">~</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => fetchData(activeTab)}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              개요
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              유입경로
            </TabsTrigger>
            <TabsTrigger value="utm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              UTM 캠페인
            </TabsTrigger>
            <TabsTrigger value="newsletters" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              뉴스레터별
            </TabsTrigger>
            <TabsTrigger value="referrers" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              리퍼러
            </TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview">
            {!overview ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* 요약 카드 */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-50">
                          <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">총 조회수</p>
                          <p className="text-2xl font-bold">{formatNumber(overview.totalViews)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-50">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">순 방문자</p>
                          <p className="text-2xl font-bold">{formatNumber(overview.uniqueViews)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-purple-50">
                          <Mail className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">뉴스레터 유입</p>
                          <p className="text-2xl font-bold">
                            {formatNumber(overview.sources?.find(s => s.source === 'newsletter')?.total || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-50">
                          <Youtube className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">YouTube 유입</p>
                          <p className="text-2xl font-bold">
                            {formatNumber(overview.sources?.find(s => s.source === 'youtube')?.total || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 유입경로 분포 + 일별 추이 */}
                <div className="grid grid-cols-2 gap-6">
                  {/* 유입경로 분포 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">유입경로 분포</CardTitle>
                      <CardDescription>어디서 방문자가 오는지 확인하세요</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {overview.sources?.slice(0, 10).map((source, i) => {
                          const config = getSourceConfig(source.source)
                          const percentage = overview.totalViews > 0
                            ? (source.total / overview.totalViews * 100)
                            : 0

                          return (
                            <div key={i} className="flex items-center gap-3">
                              <Badge className={`${config.color} min-w-[120px] justify-center`}>
                                {config.label}
                              </Badge>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-16 text-right">
                                    {formatNumber(source.total)}
                                  </span>
                                  <span className="text-xs text-gray-400 w-12 text-right">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {(!overview.sources || overview.sources.length === 0) && (
                          <p className="text-center text-gray-400 py-8">아직 데이터가 없습니다</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 일별 추이 (텍스트 기반) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">일별 추이</CardTitle>
                      <CardDescription>일별 방문자 수 변화</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {dailyTrend?.trend?.slice(-14).reverse().map((day, i) => {
                          const maxTotal = Math.max(...(dailyTrend.trend || []).map(d => d.total))
                          const barWidth = maxTotal > 0 ? (day.total / maxTotal * 100) : 0

                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-20 shrink-0">
                                {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                              </span>
                              <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded flex items-center justify-end pr-1"
                                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                                >
                                  {barWidth > 15 && (
                                    <span className="text-[10px] text-white font-medium">
                                      {day.total}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {barWidth <= 15 && (
                                <span className="text-xs text-gray-500 w-8">{day.total}</span>
                              )}
                            </div>
                          )
                        })}
                        {(!dailyTrend?.trend || dailyTrend.trend.length === 0) && (
                          <p className="text-center text-gray-400 py-8">아직 데이터가 없습니다</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 인기 뉴스레터 TOP 10 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">인기 뉴스레터 TOP 10</CardTitle>
                    <CardDescription>조회수 기준 상위 뉴스레터</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>제목</TableHead>
                          <TableHead className="text-right">총 조회수</TableHead>
                          <TableHead className="text-right">순 방문자</TableHead>
                          <TableHead className="text-right">발행일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overview.topNewsletters?.map((nl, i) => (
                          <TableRow key={nl.id}>
                            <TableCell className="font-medium text-gray-400">{i + 1}</TableCell>
                            <TableCell className="font-medium max-w-[300px] truncate">
                              {nl.title}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatNumber(nl.view_count)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(nl.unique_view_count)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-gray-500">
                              {nl.published_at
                                ? new Date(nl.published_at).toLocaleDateString('ko-KR')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* 유입경로 탭 */}
          <TabsContent value="sources">
            {!trafficSources ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>유입경로 상세</CardTitle>
                  <CardDescription>각 유입경로별 방문 수와 주요 리퍼러 URL</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>유입경로</TableHead>
                        <TableHead className="text-right">총 조회</TableHead>
                        <TableHead className="text-right">순 방문</TableHead>
                        <TableHead className="text-right">비율</TableHead>
                        <TableHead>주요 리퍼러</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trafficSources.sources?.map((source, i) => {
                        const config = getSourceConfig(source.source)
                        const totalAll = trafficSources.sources.reduce((sum, s) => sum + s.total, 0)

                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <Badge className={config.color}>{config.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatNumber(source.total)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(source.unique)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatPercent(source.total, totalAll)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {source.topReferrers?.slice(0, 3).map((ref, j) => (
                                <span key={j} className="mr-2">
                                  {ref.domain} ({ref.count})
                                </span>
                              )) || '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {(!trafficSources.sources || trafficSources.sources.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                            아직 데이터가 없습니다
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* UTM 캠페인 탭 */}
          <TabsContent value="utm">
            {!utmCampaigns ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* UTM 사용 가이드 */}
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-blue-800 mb-2">UTM 파라미터 사용 가이드</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      뉴스레터 링크에 UTM 파라미터를 추가하면 각 채널별 유입 효과를 정확히 측정할 수 있습니다.
                    </p>
                    <div className="bg-white rounded-lg p-3 text-xs font-mono text-gray-700 space-y-1">
                      <p className="font-semibold text-gray-900">예시:</p>
                      <p>cnecbiz.com/newsletter/abc<span className="text-blue-600">?utm_source=youtube&utm_medium=description&utm_campaign=jan_2026</span></p>
                      <p>cnecbiz.com/newsletter/abc<span className="text-blue-600">?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_digest</span></p>
                      <p>cnecbiz.com/newsletter/abc<span className="text-blue-600">?utm_source=instagram&utm_medium=bio&utm_campaign=profile_link</span></p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>UTM 캠페인 성과</CardTitle>
                    <CardDescription>UTM 파라미터가 붙은 링크를 통한 유입 통계</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {utmCampaigns.campaigns?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>캠페인</TableHead>
                            <TableHead className="text-right">총 유입</TableHead>
                            <TableHead className="text-right">순 방문</TableHead>
                            <TableHead>소스/매체</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {utmCampaigns.campaigns.map((campaign, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">
                                {campaign.campaign || '(미지정)'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatNumber(campaign.total)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(campaign.unique)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {campaign.sources?.slice(0, 3).map((src, j) => (
                                    <Badge key={j} variant="outline" className="text-xs">
                                      {src.source}/{src.medium} ({src.count})
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <Filter className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>UTM 파라미터가 포함된 유입이 아직 없습니다</p>
                        <p className="text-sm mt-1">위 가이드를 참고하여 UTM 링크를 사용해보세요</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* 뉴스레터별 탭 */}
          <TabsContent value="newsletters">
            {!newsletterStats ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>뉴스레터별 트래픽</CardTitle>
                  <CardDescription>각 뉴스레터의 유입경로 분석 (선택 기간 내)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>뉴스레터</TableHead>
                        <TableHead className="text-right">총 조회</TableHead>
                        <TableHead className="text-right">순 방문</TableHead>
                        <TableHead>주요 유입경로</TableHead>
                        <TableHead>발행일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newsletterStats.newsletters?.map((nl, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium max-w-[250px] truncate">
                            {nl.title}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(nl.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(nl.unique)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {nl.sources?.slice(0, 3).map((src, j) => {
                                const config = getSourceConfig(src.source)
                                return (
                                  <Badge key={j} className={`text-xs ${config.color}`}>
                                    {config.label} ({src.count})
                                  </Badge>
                                )
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {nl.published_at
                              ? new Date(nl.published_at).toLocaleDateString('ko-KR')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!newsletterStats.newsletters || newsletterStats.newsletters.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                            아직 데이터가 없습니다
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 리퍼러 탭 */}
          <TabsContent value="referrers">
            {!topReferrers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>상위 리퍼러</CardTitle>
                  <CardDescription>방문자가 어떤 사이트에서 왔는지 도메인별 분석</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>도메인</TableHead>
                        <TableHead className="text-right">총 조회</TableHead>
                        <TableHead className="text-right">순 방문</TableHead>
                        <TableHead>주요 URL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topReferrers.referrers?.map((ref, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-gray-400">{i + 1}</TableCell>
                          <TableCell className="font-medium">{ref.domain}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(ref.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(ref.unique)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-[300px]">
                            {ref.topUrls?.slice(0, 2).map((url, j) => (
                              <div key={j} className="truncate">
                                <a
                                  href={url.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  {url.url.length > 60 ? url.url.substring(0, 60) + '...' : url.url}
                                </a>
                                <span className="text-gray-400 ml-1">({url.count})</span>
                              </div>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!topReferrers.referrers || topReferrers.referrers.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                            아직 리퍼러 데이터가 없습니다
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
