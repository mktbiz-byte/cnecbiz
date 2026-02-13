/**
 * Meta 광고 통합 관리 페이지
 * - 광고 계정 연동 (Meta Business)
 * - 영상 → 광고 자동 라이브
 * - 광고코드(partnership_code) 자동 연결
 * - 성과 측정 (Insights API)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Loader2, Link2, RefreshCw, Play, Pause, Trash2, ExternalLink,
  TrendingUp, Eye, MousePointerClick, DollarSign, Video, Zap,
  CheckCircle2, XCircle, AlertCircle, Plus, BarChart3, Target, Upload
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

const COUNTRY_FLAGS = { kr: '🇰🇷', jp: '🇯🇵', us: '🇺🇸' }

export default function MetaAdsManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ads')

  // 계정
  const [adAccounts, setAdAccounts] = useState([])
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [pendingAccounts, setPendingAccounts] = useState([])
  const [pendingToken, setPendingToken] = useState('')
  const [connectLoading, setConnectLoading] = useState(false)

  // 광고 목록
  const [adCampaigns, setAdCampaigns] = useState([])
  const [adFilter, setAdFilter] = useState('all') // all, ACTIVE, PAUSED
  const [adCountryFilter, setAdCountryFilter] = useState('all')

  // 영상 목록 (광고 생성용)
  const [videos, setVideos] = useState([])
  const [selectedVideos, setSelectedVideos] = useState([])
  const [videoCountryFilter, setVideoCountryFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [pages, setPages] = useState([])
  const [createForm, setCreateForm] = useState({
    adAccountId: '',
    pageId: '',
    objective: 'OUTCOME_AWARENESS',
    dailyBudget: '10000'
  })

  // 성과
  const [syncLoading, setSyncLoading] = useState(false)
  const [insightsAd, setInsightsAd] = useState(null)
  const [insightsData, setInsightsData] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      await Promise.all([fetchAdAccounts(), fetchAdCampaigns(), fetchVideos()])
    } catch (err) {
      console.error('Auth error:', err)
      navigate('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  // ========== 계정 관리 ==========
  const fetchAdAccounts = async () => {
    const { data } = await supabaseBiz
      .from('meta_ad_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setAdAccounts(data || [])
  }

  const handleConnectMeta = () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID
    if (!appId) { alert('Facebook App ID가 설정되지 않았습니다.'); return }
    const redirectUri = `${window.location.origin}/admin/meta-ads/callback`
    const scopes = 'ads_management,ads_read,pages_show_list,pages_read_engagement,business_management'
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`
    window.location.href = authUrl
  }

  // OAuth 콜백 처리 (URL에 code가 있을 때)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      handleOAuthCallback(code)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleOAuthCallback = async (code) => {
    setConnectLoading(true)
    try {
      const redirectUri = `${window.location.origin}/admin/meta-ads/callback`
      const res = await fetch('/.netlify/functions/meta-ads-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange_token', code, redirectUri })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setPendingToken(result.data.accessToken)
      setPendingAccounts(result.data.adAccounts)
      setConnectDialogOpen(true)
    } catch (err) {
      alert('계정 연동 실패: ' + err.message)
    } finally {
      setConnectLoading(false)
    }
  }

  const handleSaveAccounts = async (selectedIds) => {
    setConnectLoading(true)
    try {
      const selected = pendingAccounts.filter(a => selectedIds.includes(a.id))
      const res = await fetch('/.netlify/functions/meta-ads-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_accounts', accessToken: pendingToken, selectedAccounts: selected })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setConnectDialogOpen(false)
      setPendingAccounts([])
      setPendingToken('')
      fetchAdAccounts()
    } catch (err) {
      alert('계정 저장 실패: ' + err.message)
    } finally {
      setConnectLoading(false)
    }
  }

  // ========== 광고 목록 ==========
  const fetchAdCampaigns = async () => {
    const { data } = await supabaseBiz
      .from('meta_ad_campaigns')
      .select('*, meta_ad_accounts(ad_account_name)')
      .order('created_at', { ascending: false })
    setAdCampaigns(data || [])
  }

  const handleStatusChange = async (adId, newStatus) => {
    if (newStatus === 'ACTIVE' && !confirm('이 광고를 라이브(활성화)하시겠습니까?\n광고비가 발생할 수 있습니다.')) return
    if (newStatus === 'DELETED' && !confirm('이 광고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      const res = await fetch('/.netlify/functions/meta-ads-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', adCampaignId: adId, newStatus })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      fetchAdCampaigns()
    } catch (err) {
      alert('상태 변경 실패: ' + err.message)
    }
  }

  // ========== 영상 목록 (광고 생성용) ==========
  const fetchVideos = async () => {
    try {
      const allVideos = []

      // BIZ DB
      let bizCampaignMap = new Map()
      try {
        const { data: camps } = await supabaseBiz.from('campaigns').select('id, title, campaign_type, target_country')
        camps?.forEach(c => bizCampaignMap.set(c.id, c))
      } catch {}

      try {
        const { data: apps } = await supabaseBiz
          .from('applications')
          .select('id, campaign_id, user_id, applicant_name, creator_name, channel_name, video_file_url, partnership_code, status')
          .in('status', ['approved', 'completed', 'video_submitted', 'sns_uploaded'])
          .not('video_file_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(200)

        apps?.forEach(app => {
          if (!app.video_file_url) return
          const campaign = bizCampaignMap.get(app.campaign_id)
          allVideos.push({
            id: app.id,
            source: 'biz_app',
            videoUrl: app.video_file_url,
            campaignId: app.campaign_id,
            campaignName: campaign?.title || '-',
            creatorName: app.channel_name || app.applicant_name || app.creator_name || '-',
            partnershipCode: app.partnership_code || '',
            country: campaign?.target_country || 'kr'
          })
        })
      } catch {}

      // BIZ DB - video_submissions
      try {
        const { data: subs } = await supabaseBiz
          .from('video_submissions')
          .select('id, campaign_id, user_id, video_file_url, clean_video_url, partnership_code, ad_code, status')
          .in('status', ['approved', 'completed', 'video_submitted'])
          .order('created_at', { ascending: false })
          .limit(200)

        subs?.forEach(sub => {
          const url = sub.clean_video_url || sub.video_file_url
          if (!url) return
          const campaign = bizCampaignMap.get(sub.campaign_id)
          const exists = allVideos.some(v => v.campaignId === sub.campaign_id && v.videoUrl === url)
          if (!exists) {
            allVideos.push({
              id: sub.id,
              source: 'biz_sub',
              videoUrl: url,
              campaignId: sub.campaign_id,
              campaignName: campaign?.title || '-',
              creatorName: '-',
              partnershipCode: sub.partnership_code || sub.ad_code || '',
              country: campaign?.target_country || 'kr'
            })
          }
        })
      } catch {}

      // Korea DB
      if (supabaseKorea) {
        let koreaCampaignMap = new Map()
        try {
          const { data: camps } = await supabaseKorea.from('campaigns').select('id, title, campaign_type, target_country')
          camps?.forEach(c => koreaCampaignMap.set(c.id, c))
        } catch {}

        try {
          const { data: parts } = await supabaseKorea
            .from('campaign_participants')
            .select('id, campaign_id, user_id, applicant_name, creator_name, channel_name, video_file_url, partnership_code, status')
            .in('status', ['approved', 'completed', 'video_submitted', 'sns_uploaded'])
            .not('video_file_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200)

          parts?.forEach(p => {
            if (!p.video_file_url) return
            const campaign = koreaCampaignMap.get(p.campaign_id)
            allVideos.push({
              id: p.id,
              source: 'korea_part',
              videoUrl: p.video_file_url,
              campaignId: p.campaign_id,
              campaignName: campaign?.title || '-',
              creatorName: p.channel_name || p.applicant_name || p.creator_name || '-',
              partnershipCode: p.partnership_code || '',
              country: campaign?.target_country || 'kr'
            })
          })
        } catch {}
      }

      setVideos(allVideos)
    } catch (err) {
      console.error('fetchVideos error:', err)
    }
  }

  // ========== 광고 생성 ==========
  const handleOpenCreateDialog = async () => {
    if (selectedVideos.length === 0) { alert('광고를 생성할 영상을 선택해주세요.'); return }
    if (adAccounts.length === 0) { alert('먼저 Meta 광고 계정을 연동해주세요.'); return }

    setCreateForm(f => ({ ...f, adAccountId: adAccounts[0]?.id || '' }))
    setCreateDialogOpen(true)

    // Facebook Pages 조회
    if (adAccounts[0]) {
      try {
        const res = await fetch('/.netlify/functions/meta-ads-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_pages', adAccountDbId: adAccounts[0].id })
        })
        const result = await res.json()
        if (result.success) setPages(result.data || [])
      } catch {}
    }
  }

  const handleCreateAds = async () => {
    if (!createForm.adAccountId || !createForm.pageId) {
      alert('광고 계정과 페이지를 선택해주세요.')
      return
    }

    setCreateLoading(true)
    try {
      const videosData = selectedVideos.map(v => ({
        videoUrl: v.videoUrl,
        adName: `${v.creatorName} - ${v.campaignName}`,
        campaignName: v.campaignName,
        creatorName: v.creatorName,
        partnershipCode: v.partnershipCode,
        campaignId: v.campaignId,
        targetCountry: v.country
      }))

      const res = await fetch('/.netlify/functions/meta-ads-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_create',
          adAccountDbId: createForm.adAccountId,
          videos: videosData,
          pageId: createForm.pageId,
          objective: createForm.objective,
          dailyBudget: parseInt(createForm.dailyBudget) || 10000
        })
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      alert(`광고 생성 완료: ${result.data.succeeded}/${result.data.total}건 성공`)
      setCreateDialogOpen(false)
      setSelectedVideos([])
      fetchAdCampaigns()
    } catch (err) {
      alert('광고 생성 실패: ' + err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  // ========== 성과 동기화 ==========
  const handleSyncInsights = async () => {
    setSyncLoading(true)
    try {
      const res = await fetch('/.netlify/functions/meta-ads-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      alert(`성과 동기화 완료: ${result.data.synced}/${result.data.total}건`)
      fetchAdCampaigns()
    } catch (err) {
      alert('동기화 실패: ' + err.message)
    } finally {
      setSyncLoading(false)
    }
  }

  // ========== 필터링 ==========
  const filteredAds = adCampaigns.filter(ad => {
    if (adFilter !== 'all' && ad.status !== adFilter) return false
    if (adCountryFilter !== 'all') {
      if (adCountryFilter === 'kr' && ad.target_country !== 'kr') return false
      if (adCountryFilter === 'jp' && ad.target_country !== 'jp') return false
      if (adCountryFilter === 'us' && ad.target_country !== 'us') return false
    }
    return true
  })

  const filteredVideos = videos.filter(v => {
    if (videoCountryFilter === 'all') return true
    return v.country === videoCountryFilter
  })

  // 성과 요약 계산
  const totalSpend = adCampaigns.reduce((sum, a) => sum + (a.performance?.spend || 0), 0)
  const totalImpressions = adCampaigns.reduce((sum, a) => sum + (a.performance?.impressions || 0), 0)
  const totalClicks = adCampaigns.reduce((sum, a) => sum + (a.performance?.clicks || 0), 0)
  const totalVideoViews = adCampaigns.reduce((sum, a) => sum + (a.performance?.video_views || 0), 0)

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  const formatCurrency = (n) => {
    return '₩' + Math.round(n).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1400px] mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Meta 광고 관리
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                영상을 Meta(Facebook/Instagram) 광고로 자동 라이브하고 성과를 측정합니다
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSyncInsights} disabled={syncLoading}>
                {syncLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                성과 동기화
              </Button>
              <Button onClick={handleConnectMeta} disabled={connectLoading}>
                {connectLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                계정 연동
              </Button>
            </div>
          </div>

          {/* 성과 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">총 광고비 (7일)</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">노출수</p>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(totalImpressions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <MousePointerClick className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">클릭수</p>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(totalClicks)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                    <Video className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">영상 조회수</p>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(totalVideoViews)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 연동 계정 */}
          {adAccounts.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {adAccounts.map(acc => (
                <Badge key={acc.id} variant="outline" className="px-3 py-1.5 text-sm bg-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mr-1.5" />
                  {acc.ad_account_name || acc.ad_account_id}
                  <span className="text-gray-400 ml-1.5 text-xs">{acc.currency}</span>
                </Badge>
              ))}
            </div>
          )}

          {/* 메인 탭 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="ads">
                <Zap className="w-4 h-4 mr-1.5" />
                광고 관리 ({adCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="create">
                <Upload className="w-4 h-4 mr-1.5" />
                광고 생성 ({videos.length})
              </TabsTrigger>
              <TabsTrigger value="insights">
                <BarChart3 className="w-4 h-4 mr-1.5" />
                성과 분석
              </TabsTrigger>
            </TabsList>

            {/* ===== 광고 관리 탭 ===== */}
            <TabsContent value="ads">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>광고 목록</CardTitle>
                    <CardDescription>생성된 Meta 광고의 상태를 관리합니다</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={adCountryFilter} onValueChange={setAdCountryFilter}>
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 국가</SelectItem>
                        <SelectItem value="kr">🇰🇷 한국</SelectItem>
                        <SelectItem value="jp">🇯🇵 일본</SelectItem>
                        <SelectItem value="us">🇺🇸 미국</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={adFilter} onValueChange={setAdFilter}>
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 상태</SelectItem>
                        <SelectItem value="ACTIVE">활성</SelectItem>
                        <SelectItem value="PAUSED">일시정지</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredAds.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">등록된 광고가 없습니다</p>
                      <p className="text-sm mt-1">"광고 생성" 탭에서 영상을 선택하여 광고를 만드세요</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>국가</TableHead>
                          <TableHead>광고명</TableHead>
                          <TableHead>크리에이터</TableHead>
                          <TableHead>광고코드</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">노출</TableHead>
                          <TableHead className="text-right">클릭</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">비용</TableHead>
                          <TableHead className="text-right">액션</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAds.map(ad => (
                          <TableRow key={ad.id}>
                            <TableCell>{COUNTRY_FLAGS[ad.target_country] || '🌍'}</TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <p className="font-medium text-sm truncate">{ad.ad_name}</p>
                                <p className="text-xs text-gray-400 truncate">{ad.campaign_name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{ad.creator_name || '-'}</TableCell>
                            <TableCell>
                              {ad.partnership_code ? (
                                <Badge variant="outline" className="text-xs font-mono bg-amber-50 text-amber-700 border-amber-200">
                                  {ad.partnership_code}
                                </Badge>
                              ) : <span className="text-gray-300">-</span>}
                            </TableCell>
                            <TableCell>
                              {ad.status === 'ACTIVE' && (
                                <Badge className="bg-green-50 text-green-700 border border-green-200">라이브</Badge>
                              )}
                              {ad.status === 'PAUSED' && (
                                <Badge variant="outline" className="text-gray-500">일시정지</Badge>
                              )}
                              {ad.status === 'DELETED' && (
                                <Badge variant="outline" className="text-red-400">삭제됨</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {formatNumber(ad.performance?.impressions || 0)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {formatNumber(ad.performance?.clicks || 0)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {(ad.performance?.ctr || 0).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {formatCurrency(ad.performance?.spend || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {ad.status === 'PAUSED' && (
                                  <Button
                                    variant="ghost" size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleStatusChange(ad.id, 'ACTIVE')}
                                    title="라이브"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {ad.status === 'ACTIVE' && (
                                  <Button
                                    variant="ghost" size="sm"
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    onClick={() => handleStatusChange(ad.id, 'PAUSED')}
                                    title="일시정지"
                                  >
                                    <Pause className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-blue-500 hover:text-blue-700"
                                  onClick={() => { setInsightsAd(ad); setActiveTab('insights') }}
                                  title="성과 상세"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleStatusChange(ad.id, 'DELETED')}
                                  title="삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== 광고 생성 탭 ===== */}
            <TabsContent value="create">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>영상 선택 → 광고 생성</CardTitle>
                    <CardDescription>
                      영상을 선택하면 Meta 광고를 자동 생성하고 광고코드를 UTM으로 연결합니다
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      {[
                        { key: 'all', label: '전체', flag: '🌍' },
                        { key: 'kr', label: '한국', flag: '🇰🇷' },
                        { key: 'jp', label: '일본', flag: '🇯🇵' },
                        { key: 'us', label: '미국', flag: '🇺🇸' }
                      ].map(({ key, flag }) => (
                        <button
                          key={key}
                          onClick={() => setVideoCountryFilter(key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            videoCountryFilter === key
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {flag} {videos.filter(v => key === 'all' ? true : v.country === key).length}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleOpenCreateDialog}
                      disabled={selectedVideos.length === 0}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      선택 광고 생성 ({selectedVideos.length})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>광고 가능한 영상이 없습니다</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              checked={selectedVideos.length === filteredVideos.length && filteredVideos.length > 0}
                              onChange={(e) => {
                                setSelectedVideos(e.target.checked ? [...filteredVideos] : [])
                              }}
                            />
                          </TableHead>
                          <TableHead>국가</TableHead>
                          <TableHead>크리에이터</TableHead>
                          <TableHead>캠페인</TableHead>
                          <TableHead>광고코드</TableHead>
                          <TableHead>미리보기</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVideos.map(video => (
                          <TableRow key={`${video.source}_${video.id}`}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedVideos.some(v => v.id === video.id && v.source === video.source)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVideos([...selectedVideos, video])
                                  } else {
                                    setSelectedVideos(selectedVideos.filter(v => !(v.id === video.id && v.source === video.source)))
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>{COUNTRY_FLAGS[video.country] || '🌍'}</TableCell>
                            <TableCell className="font-medium text-sm">{video.creatorName}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{video.campaignName}</TableCell>
                            <TableCell>
                              {video.partnershipCode ? (
                                <Badge variant="outline" className="text-xs font-mono bg-amber-50 text-amber-700 border-amber-200">
                                  {video.partnershipCode}
                                </Badge>
                              ) : <span className="text-gray-300 text-xs">미지정</span>}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => window.open(video.videoUrl, '_blank')}
                              >
                                <Play className="w-3.5 h-3.5" />
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

            {/* ===== 성과 분석 탭 ===== */}
            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>성과 분석</CardTitle>
                  <CardDescription>
                    {insightsAd
                      ? `${insightsAd.ad_name} 광고의 상세 성과`
                      : '광고 목록에서 차트 아이콘을 클릭하여 상세 성과를 확인하세요'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!insightsAd ? (
                    <div className="text-center py-16 text-gray-400">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">광고를 선택하면 상세 성과를 확인할 수 있습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* 선택된 광고 정보 */}
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-semibold">{insightsAd.ad_name}</p>
                          <p className="text-sm text-gray-500">
                            {COUNTRY_FLAGS[insightsAd.target_country]} {insightsAd.campaign_name} · {insightsAd.creator_name}
                          </p>
                        </div>
                        {insightsAd.partnership_code && (
                          <Badge variant="outline" className="font-mono text-xs bg-amber-50 text-amber-700">
                            {insightsAd.partnership_code}
                          </Badge>
                        )}
                        <Badge className={insightsAd.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                          {insightsAd.status === 'ACTIVE' ? '라이브' : '일시정지'}
                        </Badge>
                      </div>

                      {/* 성과 카드 */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { label: '노출수', value: formatNumber(insightsAd.performance?.impressions || 0), color: 'text-blue-600' },
                          { label: '도달', value: formatNumber(insightsAd.performance?.reach || 0), color: 'text-violet-600' },
                          { label: '클릭수', value: formatNumber(insightsAd.performance?.clicks || 0), color: 'text-emerald-600' },
                          { label: 'CTR', value: `${(insightsAd.performance?.ctr || 0).toFixed(2)}%`, color: 'text-amber-600' },
                          { label: '비용', value: formatCurrency(insightsAd.performance?.spend || 0), color: 'text-rose-600' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">{label}</p>
                            <p className={`text-xl font-bold ${color}`}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* 영상 시청 퍼널 */}
                      {(insightsAd.performance?.video_views > 0) && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">영상 시청 퍼널</h3>
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              { label: '25% 시청', key: 'video_p25' },
                              { label: '50% 시청', key: 'video_p50' },
                              { label: '75% 시청', key: 'video_p75' },
                              { label: '완료 시청', key: 'video_p100' },
                            ].map(({ label, key }) => (
                              <div key={key} className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                                <p className="text-xs text-violet-500 mb-1">{label}</p>
                                <p className="text-lg font-bold text-violet-700">
                                  {formatNumber(insightsAd.performance?.[key] || 0)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ===== 계정 선택 다이얼로그 ===== */}
      <AccountSelectDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        accounts={pendingAccounts}
        loading={connectLoading}
        onSave={handleSaveAccounts}
      />

      {/* ===== 광고 생성 다이얼로그 ===== */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Meta 광고 일괄 생성
            </DialogTitle>
            <DialogDescription>
              {selectedVideos.length}개 영상으로 광고를 생성합니다. 광고코드가 UTM으로 자동 연결됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">광고 계정</Label>
              <Select value={createForm.adAccountId} onValueChange={v => setCreateForm(f => ({ ...f, adAccountId: v }))}>
                <SelectTrigger><SelectValue placeholder="계정 선택" /></SelectTrigger>
                <SelectContent>
                  {adAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.ad_account_name || acc.ad_account_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Facebook 페이지</Label>
              <Select value={createForm.pageId} onValueChange={v => setCreateForm(f => ({ ...f, pageId: v }))}>
                <SelectTrigger><SelectValue placeholder="페이지 선택" /></SelectTrigger>
                <SelectContent>
                  {pages.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">광고 목적</Label>
              <Select value={createForm.objective} onValueChange={v => setCreateForm(f => ({ ...f, objective: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTCOME_AWARENESS">인지도 (도달)</SelectItem>
                  <SelectItem value="OUTCOME_TRAFFIC">트래픽 (클릭)</SelectItem>
                  <SelectItem value="OUTCOME_ENGAGEMENT">참여 (영상 조회)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">일일 예산 (원)</Label>
              <Input
                type="number"
                value={createForm.dailyBudget}
                onChange={e => setCreateForm(f => ({ ...f, dailyBudget: e.target.value }))}
                placeholder="10000"
              />
              <p className="text-xs text-gray-400 mt-1">광고는 일시정지 상태로 생성됩니다. 활성화 후 과금 시작.</p>
            </div>

            {/* 선택 영상 요약 */}
            <div className="bg-gray-50 rounded-xl p-3 max-h-[160px] overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 mb-2">선택 영상 ({selectedVideos.length}건)</p>
              {selectedVideos.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-100 last:border-0">
                  <span>{COUNTRY_FLAGS[v.country] || '🌍'}</span>
                  <span className="font-medium truncate flex-1">{v.creatorName}</span>
                  {v.partnershipCode && (
                    <span className="text-amber-600 font-mono">{v.partnershipCode}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>취소</Button>
            <Button onClick={handleCreateAds} disabled={createLoading}>
              {createLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {createLoading ? '생성 중...' : `${selectedVideos.length}개 광고 생성`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===== 계정 선택 다이얼로그 서브 컴포넌트 =====
function AccountSelectDialog({ open, onOpenChange, accounts, loading, onSave }) {
  const [selected, setSelected] = useState([])

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>광고 계정 선택</DialogTitle>
          <DialogDescription>연동할 Meta 광고 계정을 선택하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto py-2">
          {accounts.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">접근 가능한 광고 계정이 없습니다.</p>
          ) : (
            accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => toggle(acc.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selected.includes(acc.id)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{acc.name}</p>
                    <p className="text-xs text-gray-500">{acc.id} · {acc.currency}</p>
                    {acc.businessName && (
                      <p className="text-xs text-gray-400">비즈니스: {acc.businessName}</p>
                    )}
                  </div>
                  {acc.status === 1 ? (
                    <Badge className="bg-green-50 text-green-600 border border-green-200 text-xs">활성</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-400">비활성</Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            onClick={() => onSave(selected)}
            disabled={selected.length === 0 || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {selected.length}개 계정 연동
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
