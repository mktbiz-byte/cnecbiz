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
  oliveyoung: { label: '올영세일', color: 'bg-pink-100 text-pink-700', steps: 2 },
  oliveyoung_sale: { label: '올영세일', color: 'bg-pink-100 text-pink-700', steps: 2 },
  '4week_challenge': { label: '4주 챌린지', color: 'bg-orange-100 text-orange-700', weeks: 4 },
  '4week': { label: '4주 챌린지', color: 'bg-orange-100 text-orange-700', weeks: 4 },
  megawari: { label: '메가와리', color: 'bg-amber-100 text-amber-700', steps: 2 }
}

// 멀티비디오 캠페인인지 확인
const isMultiVideoCampaign = (campaignType) => {
  const type = (campaignType || '').toLowerCase()
  return type.includes('4week') || type.includes('challenge') ||
         type.includes('olive') || type.includes('megawari')
}

// 필요 영상 수 계산
const getRequiredVideoCount = (campaignType) => {
  const type = (campaignType || '').toLowerCase()
  if (type.includes('4week') || type.includes('challenge')) return 4
  if (type.includes('olive') || type.includes('megawari')) return 2
  return 1
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

  // 데이터 로드 - 최적화된 버전
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

          // 1. 완료된 캠페인 한번에 조회 (최근 100개)
          const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .in('status', ['completed', 'active', 'ongoing', 'filming'])
            .order('created_at', { ascending: false })
            .limit(100)

          if (error) {
            debugLog.push(`[${region.id}] 캠페인 조회 오류: ${error.message}`)
            continue
          }

          if (!campaigns || campaigns.length === 0) {
            debugLog.push(`[${region.id}] 캠페인 없음`)
            continue
          }

          debugLog.push(`[${region.id}] 캠페인 ${campaigns.length}개 조회`)

          // 2. 모든 캠페인의 ID 배열
          const campaignIds = campaigns.map(c => c.id)

          // 3. video_submissions 한번에 조회 (Korea/BIZ만 - Japan/US는 테이블 없음)
          let allSubmissions = []
          if (region.id === 'korea' || region.id === 'biz') {
            try {
              // netlify 함수를 통해 조회 (RLS 우회, URL 길이 제한 없음)
              const response = await fetch('/.netlify/functions/get-video-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  region: region.id,
                  campaignIds: campaignIds
                })
              })
              const result = await response.json()
              if (result.success) {
                allSubmissions = result.submissions || []
                debugLog.push(`[${region.id}] video_submissions ${allSubmissions.length}개 (via API)`)
              } else {
                debugLog.push(`[${region.id}] video_submissions API 오류: ${result.error}`)
              }
            } catch (e) {
              debugLog.push(`[${region.id}] video_submissions 조회 실패: ${e.message}`)
            }
          } else {
            debugLog.push(`[${region.id}] video_submissions 테이블 없음 (스킵)`)
          }

          // 4. applications 한번에 조회 (승인/완료 상태)
          const { data: applications } = await supabase
            .from('applications')
            .select('*')
            .in('campaign_id', campaignIds)
            .in('status', ['sns_uploaded', 'completed', 'video_submitted', 'approved', 'filming', 'selected'])

          debugLog.push(`[${region.id}] applications ${(applications || []).length}개`)

          // 5. submissions를 캠페인별, 유저별로 그룹화
          const submissionsByCampaign = {}
          allSubmissions.forEach(sub => {
            if (!submissionsByCampaign[sub.campaign_id]) {
              submissionsByCampaign[sub.campaign_id] = {}
            }
            if (!submissionsByCampaign[sub.campaign_id][sub.user_id]) {
              submissionsByCampaign[sub.campaign_id][sub.user_id] = []
            }
            submissionsByCampaign[sub.campaign_id][sub.user_id].push(sub)
          })

          // 6. applications를 캠페인별로 그룹화
          const appsByCampaign = {}
          ;(applications || []).forEach(app => {
            if (!appsByCampaign[app.campaign_id]) {
              appsByCampaign[app.campaign_id] = []
            }
            appsByCampaign[app.campaign_id].push(app)
          })

          // 7. 각 캠페인별로 미지급 크리에이터 계산
          for (const campaign of campaigns) {
            const campaignApps = appsByCampaign[campaign.id] || []
            const campaignSubs = submissionsByCampaign[campaign.id] || {}

            if (campaignApps.length === 0) continue

            const isMulti = isMultiVideoCampaign(campaign.campaign_type)
            const requiredCount = getRequiredVideoCount(campaign.campaign_type)

            let unpaidCount = 0
            let paidCount = 0
            let partialCount = 0 // 일부만 완료된 크리에이터

            for (const app of campaignApps) {
              const userSubs = campaignSubs[app.user_id] || []

              // 완료된 영상 수 (status='completed' 또는 final_confirmed_at이 있는 것)
              const completedSubs = userSubs.filter(s =>
                s.status === 'completed' || s.final_confirmed_at
              )
              const completedCount = completedSubs.length

              if (isMulti) {
                // 멀티비디오 캠페인: 각 스텝/주차별로 확인
                if (completedCount >= requiredCount) {
                  paidCount++
                } else if (completedCount > 0) {
                  // 일부만 완료
                  partialCount++
                  unpaidCount++ // 아직 완료되지 않은 스텝이 있으므로 미지급에 포함
                } else if (userSubs.length > 0) {
                  // 제출은 있지만 완료된 것 없음
                  unpaidCount++
                } else {
                  // 제출 자체가 없음 - 촬영중 상태면 아직 미지급 아님
                  if (['sns_uploaded', 'completed', 'video_submitted'].includes(app.status)) {
                    unpaidCount++
                  }
                }
              } else {
                // 단일 영상 캠페인
                if (completedCount > 0) {
                  paidCount++
                } else if (userSubs.length > 0 && userSubs.some(s =>
                  ['approved', 'submitted', 'resubmitted'].includes(s.status)
                )) {
                  // 제출했지만 아직 완료(확정) 안됨
                  unpaidCount++
                } else if (['sns_uploaded', 'completed', 'video_submitted'].includes(app.status)) {
                  unpaidCount++
                }
              }
            }

            // 미지급자가 있는 캠페인만 표시
            if (unpaidCount > 0) {
              debugLog.push(`[${region.id}] ${campaign.title}: 미지급=${unpaidCount}, 지급완료=${paidCount}, 일부완료=${partialCount}`)
              result[region.id].push({
                ...campaign,
                totalCompleted: campaignApps.length,
                unpaidCount,
                paidCount,
                partialCount,
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

  // 캠페인 클릭 시 크리에이터 목록 조회
  const handleCampaignClick = async (campaign) => {
    setSelectedCampaign(campaign)
    setLoadingCreators(true)
    setUnpaidCreators([])

    try {
      const supabase = campaign.region === 'biz'
        ? supabaseBiz
        : getSupabaseClient(campaign.region)

      // 해당 캠페인의 신청자 조회
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('campaign_id', campaign.id)
        .in('status', ['sns_uploaded', 'completed', 'video_submitted', 'approved', 'filming', 'selected'])

      if (appError) throw appError

      // video_submissions 조회 (Korea/BIZ만 - Japan/US는 테이블 없음)
      let submissions = []
      if (campaign.region === 'korea' || campaign.region === 'biz') {
        try {
          // netlify 함수를 통해 조회 (RLS 우회)
          const response = await fetch('/.netlify/functions/get-video-submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              region: campaign.region,
              campaignId: campaign.id
            })
          })
          const result = await response.json()
          if (result.success) {
            submissions = result.submissions || []
          } else {
            console.log('video_submissions API 오류:', result.error)
          }
        } catch (e) {
          console.log('video_submissions 조회 실패:', e)
        }
      }

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

      const isMulti = isMultiVideoCampaign(campaign.campaign_type)
      const requiredCount = getRequiredVideoCount(campaign.campaign_type)
      const is4Week = (campaign.campaign_type || '').toLowerCase().includes('4week') ||
                      (campaign.campaign_type || '').toLowerCase().includes('challenge')

      // submissions를 유저별로 그룹화
      const subsByUser = {}
      submissions.forEach(sub => {
        if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = []
        subsByUser[sub.user_id].push(sub)
      })

      // 크리에이터 정보 매핑
      const creators = (applications || []).map(app => {
        const profile = profileMap[app.user_id]
        const userSubs = subsByUser[app.user_id] || []

        // 완료된 영상 (status='completed' 또는 final_confirmed_at이 있는 것)
        const completedSubs = userSubs.filter(s =>
          s.status === 'completed' || s.final_confirmed_at
        )
        const completedCount = completedSubs.length

        let isPaid = false
        let paymentDetail = ''

        if (isMulti) {
          isPaid = completedCount >= requiredCount

          if (is4Week) {
            // 4주 챌린지: 주차별 상태 표시
            // week 컬럼은 존재하지 않음 - week_number, video_number만 사용
            const weekStatus = [1, 2, 3, 4].map(w => {
              const weekSub = completedSubs.find(s => {
                const weekNum = s.week_number != null ? Number(s.week_number) : null
                const videoNum = s.video_number != null ? Number(s.video_number) : null
                return weekNum === w || videoNum === w
              })
              return weekSub ? '✓' : '✗'
            }).join(' ')
            paymentDetail = `주차: ${weekStatus} (${completedCount}/${requiredCount})`
          } else {
            // 올영/메가와리: 스텝별 상태 표시
            // week 컬럼은 존재하지 않음 - step, video_number만 사용
            const stepStatus = [1, 2].map(st => {
              const stepSub = completedSubs.find(s => {
                const stepNum = s.step != null ? Number(s.step) : null
                const videoNum = s.video_number != null ? Number(s.video_number) : null
                return stepNum === st || videoNum === st
              })
              return stepSub ? '✓' : '✗'
            }).join(' ')
            paymentDetail = `스텝: ${stepStatus} (${completedCount}/${requiredCount})`
          }
        } else {
          isPaid = completedCount > 0
          paymentDetail = isPaid ? '지급완료' : '미지급'
        }

        const paidAt = completedSubs.length > 0
          ? completedSubs.sort((a, b) =>
              new Date(b.final_confirmed_at || b.created_at) - new Date(a.final_confirmed_at || a.created_at)
            )[0]?.final_confirmed_at
          : null

        return {
          ...app,
          creatorName: profile?.channel_name || profile?.name || app.applicant_name || app.creator_name || '이름 없음',
          phone: profile?.phone || profile?.phone_number,
          email: profile?.email || app.email,
          isPaid,
          completedCount,
          requiredCount,
          paymentDetail,
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
      console.error('크리에이터 조회 오류:', error)
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
          <p className="text-gray-600 mt-1">포인트 미지급 캠페인 (영상 확정 기준)</p>
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
                              {(typeConfig.weeks || typeConfig.steps) && (
                                <Badge variant="outline" className="text-xs">
                                  {typeConfig.weeks ? `${typeConfig.weeks}주` : `${typeConfig.steps}스텝`}
                                </Badge>
                              )}
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
              <p className="text-sm text-gray-400 mt-1">모든 영상이 확정되었거나 완료된 캠페인이 없습니다.</p>
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

        {/* 크리에이터 상세 다이얼로그 */}
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
                    {isMultiVideoCampaign(selectedCampaign.campaign_type) && (
                      <span className="mr-2">
                        {(selectedCampaign.campaign_type || '').toLowerCase().includes('4week') ? '4주 챌린지' : '올영/메가와리'}
                      </span>
                    )}
                    총 {selectedCampaign.totalCompleted}명 ·
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
                          {creator.paymentDetail && (
                            <div className="text-xs text-gray-400 mt-1">
                              {creator.paymentDetail}
                            </div>
                          )}
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
                                확정일: {creator.paidAt ? new Date(creator.paidAt).toLocaleDateString('ko-KR') : '-'}
                              </div>
                              {creator.paymentDetail && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {creator.paymentDetail}
                                </div>
                              )}
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
