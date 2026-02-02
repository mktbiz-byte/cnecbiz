import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, DollarSign, Users, ChevronDown, ChevronUp,
  Phone, Mail, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 지역 설정
const REGIONS = [
  { id: 'korea', label: '한국', flag: '🇰🇷', color: 'bg-blue-50 text-blue-700' },
  { id: 'japan', label: '일본', flag: '🇯🇵', color: 'bg-red-50 text-red-600' },
  { id: 'us', label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700' },
  { id: 'biz', label: '비즈', flag: '💼', color: 'bg-gray-50 text-gray-600' }
]

// 캠페인 타입 설정
const campaignTypeConfig = {
  planned: { label: '기획형', color: 'bg-violet-100 text-violet-700' },
  regular: { label: '기획형', color: 'bg-violet-100 text-violet-700' },
  oliveyoung: { label: '올영세일', color: 'bg-pink-100 text-pink-700' },
  oliveyoung_sale: { label: '올영세일', color: 'bg-pink-100 text-pink-700' },
  '4week_challenge': { label: '4주 챌린지', color: 'bg-orange-100 text-orange-700' },
  '4week': { label: '4주 챌린지', color: 'bg-orange-100 text-orange-700' },
  megawari: { label: '메가와리', color: 'bg-amber-100 text-amber-700' }
}

export default function UnpaidCampaignsManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState({}) // region -> campaigns
  const [expandedCampaigns, setExpandedCampaigns] = useState({})
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [unpaidCreators, setUnpaidCreators] = useState([])
  const [loadingCreators, setLoadingCreators] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  // 데이터 로드
  const fetchData = async () => {
    setRefreshing(true)
    const debugLog = []

    try {
      const result = {}

      for (const region of REGIONS) {
        result[region.id] = []

        try {
          const supabase = region.id === 'biz'
            ? supabaseBiz
            : getSupabaseClient(region.id)

          if (!supabase) {
            debugLog.push(`[${region.id}] Supabase 클라이언트 없음`)
            continue
          }

          // 완료된 캠페인 조회 (리전별로 다른 컬럼 존재 가능)
          // 기본 컬럼만 조회 (존재하지 않는 컬럼은 무시됨)
          const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .in('status', ['completed', 'active', 'ongoing', 'filming'])
            .order('created_at', { ascending: false })
            .limit(100)

          if (error) {
            debugLog.push(`[${region.id}] 캠페인 조회 오류: ${error.message}`)
            console.error(`${region.id} 캠페인 조회 오류:`, error)
            continue
          }

          debugLog.push(`[${region.id}] 캠페인 ${(campaigns || []).length}개`)

          // 각 캠페인의 포인트 미지급 크리에이터 확인
          for (const campaign of campaigns || []) {
            // SNS 업로드 완료된 신청자 수 조회 (더 넓은 상태 범위, 리전별 컬럼 차이 대응)
            const { data: completedApps, error: appError } = await supabase
              .from('applications')
              .select('*')
              .eq('campaign_id', campaign.id)
              .in('status', ['sns_uploaded', 'completed', 'video_submitted', 'approved'])

            if (appError) {
              debugLog.push(`[${region.id}] ${campaign.title} 신청 조회 오류: ${appError.message}`)
              continue
            }

            if (!completedApps || completedApps.length === 0) continue

            // 포인트 미지급자 수 계산 (여러 가능한 필드명 체크)
            const unpaidApps = (completedApps || []).filter(app => {
              // points_paid, reward_paid, point_paid 중 하나라도 true면 지급 완료
              const isPaid = app.points_paid || app.reward_paid || app.point_paid
              return !isPaid
            })
            const unpaidCount = unpaidApps.length
            const completedCount = completedApps.length

            // 지급 완료자 수
            const paidCount = completedCount - unpaidCount

            if (unpaidCount > 0) {
              debugLog.push(`[${region.id}] ${campaign.title}: ${unpaidCount}/${completedCount}명 미지급`)
              result[region.id].push({
                ...campaign,
                totalCompleted: completedCount,
                unpaidCount,
                paidCount,
                region: region.id
              })
            }
          }
        } catch (err) {
          debugLog.push(`[${region.id}] 오류: ${err.message}`)
          console.error(`${region.id} 데이터 조회 오류:`, err)
        }
      }

      setData(result)
      setDebugInfo(debugLog.join('\n'))
      console.log('포인트 미지급 디버그:\n', debugLog.join('\n'))
    } catch (error) {
      debugLog.push(`전체 오류: ${error.message}`)
      console.error('데이터 로드 오류:', error)
      setDebugInfo(debugLog.join('\n'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 캠페인 클릭 시 미지급 크리에이터 목록 조회
  const handleCampaignClick = async (campaign) => {
    setSelectedCampaign(campaign)
    setLoadingCreators(true)
    setUnpaidCreators([])

    try {
      const supabase = campaign.region === 'biz'
        ? supabaseBiz
        : getSupabaseClient(campaign.region)

      // 해당 캠페인의 SNS 업로드 완료된 신청자 조회 (리전별 컬럼 차이 대응 - select * 사용)
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('campaign_id', campaign.id)
        .in('status', ['sns_uploaded', 'completed', 'video_submitted', 'approved'])

      if (appError) throw appError

      // user_profiles에서 추가 정보 조회
      const userIds = (applications || []).map(a => a.user_id).filter(Boolean)
      let profileMap = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, user_id, name, channel_name, phone, phone_number, email')
          .in('id', userIds)

        ;(profiles || []).forEach(p => {
          profileMap[p.id] = p
          if (p.user_id) profileMap[p.user_id] = p
        })
      }

      // 크리에이터 정보 매핑
      const creators = (applications || []).map(app => {
        const profile = profileMap[app.user_id]
        // points_paid, reward_paid, point_paid 중 하나라도 true면 지급 완료
        const isPaid = !!(app.points_paid || app.reward_paid || app.point_paid)
        const paidAt = app.points_paid_at || app.reward_paid_at || null
        return {
          ...app,
          creatorName: profile?.channel_name || profile?.name || app.applicant_name || app.creator_name || '이름 없음',
          phone: profile?.phone || profile?.phone_number,
          email: profile?.email || app.email,
          isPaid,
          paidAt
        }
      })

      // 미지급자를 먼저, 지급 완료자를 나중에 표시
      creators.sort((a, b) => {
        if (a.isPaid === b.isPaid) return 0
        return a.isPaid ? 1 : -1
      })

      setUnpaidCreators(creators)
    } catch (error) {
      console.error('미지급 크리에이터 조회 오류:', error)
    } finally {
      setLoadingCreators(false)
    }
  }

  // 전체 통계 계산
  const getTotalStats = () => {
    let totalCampaigns = 0
    let totalUnpaid = 0
    let totalPaid = 0

    Object.values(data).forEach(campaigns => {
      totalCampaigns += campaigns.length
      campaigns.forEach(c => {
        totalUnpaid += c.unpaidCount || 0
        totalPaid += c.paidCount || 0
      })
    })

    return { totalCampaigns, totalUnpaid, totalPaid }
  }

  const stats = getTotalStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">캠페인 관리</h1>
          <p className="text-gray-600 mt-1">포인트 미지급 캠페인</p>
        </div>

        {/* 서브 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => navigate('/admin/campaigns')}
          >
            📋 전체 캠페인
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => navigate('/admin/campaigns/deadlines')}
          >
            ⏰ 마감일 관리
          </Button>
          <Button
            variant="default"
            size="sm"
            className="whitespace-nowrap"
          >
            💰 포인트 미지급
          </Button>
          <div className="flex-1" />
          <Button
            onClick={fetchData}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {/* 전체 통계 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.totalCampaigns}</div>
                <div className="text-sm text-gray-500">미지급 캠페인</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.totalUnpaid}</div>
                <div className="text-sm text-gray-500">미지급 크리에이터</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.totalPaid}</div>
                <div className="text-sm text-gray-500">지급 완료</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 지역별 데이터 */}
        {REGIONS.map(region => {
          const campaigns = data[region.id] || []
          if (campaigns.length === 0) return null

          const isExpanded = expandedCampaigns[region.id] !== false // 기본 펼침
          const totalUnpaid = campaigns.reduce((sum, c) => sum + (c.unpaidCount || 0), 0)

          return (
            <Card key={region.id} className="mb-4">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedCampaigns(prev => ({
                  ...prev,
                  [region.id]: prev[region.id] === false ? true : false
                }))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{region.flag}</span>
                    <span className="font-semibold text-gray-900">{region.label}</span>
                    <Badge variant="outline">
                      {campaigns.length}개 캠페인
                    </Badge>
                    <Badge className="bg-red-100 text-red-700">
                      미지급 {totalUnpaid}명
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {campaigns.map((campaign, idx) => {
                      const typeConfig = campaignTypeConfig[campaign.campaign_type] || { label: '일반', color: 'bg-gray-100 text-gray-700' }

                      return (
                        <div
                          key={`${campaign.id}-${idx}`}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => handleCampaignClick(campaign)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{campaign.title}</span>
                              <Badge className={typeConfig.color} variant="outline">
                                {typeConfig.label}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {campaign.end_date && `종료일: ${campaign.end_date.substring(0, 10)}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-100 text-red-700">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  미지급 {campaign.unpaidCount}명
                                </Badge>
                                {campaign.paidCount > 0 && (
                                  <Badge className="bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    지급 {campaign.paidCount}명
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}

        {/* 데이터가 없는 경우 */}
        {!Object.values(data).some(campaigns => campaigns.length > 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">포인트 미지급 캠페인이 없습니다.</p>
              <p className="text-sm text-gray-400 mt-1">모든 크리에이터에게 포인트가 지급되었거나 완료된 캠페인이 없습니다.</p>
              {debugInfo && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-gray-400 cursor-pointer">디버그 정보</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {debugInfo}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        )}

        {/* 미지급 크리에이터 상세 다이얼로그 */}
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                포인트 지급 현황
              </DialogTitle>
            </DialogHeader>

            {selectedCampaign && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-900">{selectedCampaign.title}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    SNS 업로드 완료: {selectedCampaign.totalCompleted}명 ·
                    미지급: <span className="text-red-600 font-medium">{selectedCampaign.unpaidCount}명</span> ·
                    지급완료: <span className="text-green-600 font-medium">{selectedCampaign.paidCount}명</span>
                  </div>
                </div>

                {loadingCreators ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : unpaidCreators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    크리에이터 정보가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 미지급 크리에이터 */}
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      미지급 크리에이터 ({unpaidCreators.filter(c => !c.isPaid).length}명)
                    </div>
                    {unpaidCreators.filter(c => !c.isPaid).map((creator, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {creator.creatorName}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            {creator.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {creator.phone}
                              </span>
                            )}
                            {creator.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {creator.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-red-100 text-red-700">
                          <Clock className="w-3 h-3 mr-1" />
                          미지급
                        </Badge>
                      </div>
                    ))}

                    {/* 지급 완료 크리에이터 */}
                    {unpaidCreators.filter(c => c.isPaid).length > 0 && (
                      <>
                        <div className="text-sm font-medium text-gray-700 mt-4 mb-2">
                          지급 완료 ({unpaidCreators.filter(c => c.isPaid).length}명)
                        </div>
                        {unpaidCreators.filter(c => c.isPaid).map((creator, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {creator.creatorName}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                지급일: {creator.paidAt ? new Date(creator.paidAt).toLocaleDateString('ko-KR') : '-'}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              지급완료
                            </Badge>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
