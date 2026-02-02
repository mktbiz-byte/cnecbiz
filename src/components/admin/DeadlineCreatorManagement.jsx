import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Calendar, AlertTriangle, Clock, Users, ChevronDown, ChevronUp,
  Phone, Mail, ExternalLink, RefreshCw
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

// 마감 단계 설정
const DEADLINE_STAGES = [
  { id: 'overdue', label: '마감 지연', color: 'bg-red-500 text-white', days: -999 },
  { id: 'today', label: '오늘 마감', color: 'bg-red-100 text-red-700', days: 0 },
  { id: '1day', label: '1일 전', color: 'bg-orange-100 text-orange-700', days: 1 },
  { id: '2day', label: '2일 전', color: 'bg-amber-100 text-amber-700', days: 2 },
  { id: '3day', label: '3일 전', color: 'bg-yellow-100 text-yellow-700', days: 3 }
]

// 날짜 부분만 추출
const getDatePart = (dateValue) => {
  if (!dateValue) return null
  if (typeof dateValue === 'string') {
    return dateValue.substring(0, 10)
  }
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0]
  }
  return null
}

// 캠페인 타입별 마감일 필드명 가져오기
const getDeadlineFields = (campaignType) => {
  const type = (campaignType || '').toLowerCase()
  if (type.includes('4week') || type.includes('challenge')) {
    return ['week1_deadline', 'week2_deadline', 'week3_deadline', 'week4_deadline']
  } else if (type.includes('olive')) {
    return ['step1_deadline', 'step2_deadline']
  } else {
    return ['content_submission_deadline']
  }
}

export default function DeadlineCreatorManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState({}) // region -> stage -> campaigns
  const [expandedCampaigns, setExpandedCampaigns] = useState({})
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [pendingCreators, setPendingCreators] = useState([])
  const [loadingCreators, setLoadingCreators] = useState(false)

  // 데이터 로드
  const fetchData = async () => {
    setRefreshing(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      // 날짜 범위 계산 (3일 전부터 7일 후까지)
      const startDate = new Date(today)
      startDate.setDate(today.getDate() - 7) // 7일 지연까지 표시
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 3)

      const result = {}

      for (const region of REGIONS) {
        result[region.id] = {}
        DEADLINE_STAGES.forEach(stage => {
          result[region.id][stage.id] = []
        })

        try {
          const supabase = region.id === 'biz'
            ? supabaseBiz
            : getSupabaseClient(region.id)

          // 활성 캠페인 조회
          const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select(`
              id, title, campaign_type, company_id, region,
              content_submission_deadline, step1_deadline, step2_deadline,
              week1_deadline, week2_deadline, week3_deadline, week4_deadline
            `)
            .in('status', ['active', 'recruiting', 'approved'])

          if (error) {
            console.error(`${region.id} 캠페인 조회 오류:`, error)
            continue
          }

          // 각 캠페인의 신청자 수 조회
          for (const campaign of campaigns || []) {
            const deadlineFields = getDeadlineFields(campaign.campaign_type)

            for (const field of deadlineFields) {
              const deadline = getDatePart(campaign[field])
              if (!deadline) continue

              const deadlineDate = new Date(deadline)
              const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))

              // 해당 마감일의 미제출자 수 조회
              let query = supabase
                .from('applications')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campaign.id)
                .in('status', ['filming', 'selected', 'guide_approved'])

              const { count, error: countError } = await query

              if (countError) continue
              if (!count || count === 0) continue

              // 영상 제출 확인 (video_submissions)
              let videoQuery = supabase
                .from('video_submissions')
                .select('user_id')
                .eq('campaign_id', campaign.id)

              // 캠페인 타입별 영상 번호 필터
              const type = (campaign.campaign_type || '').toLowerCase()
              if (type.includes('4week') || type.includes('challenge')) {
                const weekNum = parseInt(field.replace('week', '').replace('_deadline', ''))
                videoQuery = videoQuery.eq('week_number', weekNum)
              } else if (type.includes('olive')) {
                const stepNum = parseInt(field.replace('step', '').replace('_deadline', ''))
                videoQuery = videoQuery.eq('video_number', stepNum)
              }

              const { data: submissions } = await videoQuery
              const submittedUserIds = (submissions || []).map(s => s.user_id)

              // 미제출자 수 계산
              const { count: pendingCount } = await supabase
                .from('applications')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campaign.id)
                .in('status', ['filming', 'selected', 'guide_approved'])
                .not('user_id', 'in', `(${submittedUserIds.length > 0 ? submittedUserIds.join(',') : 'null'})`)

              const actualPendingCount = submittedUserIds.length > 0 ? pendingCount : count

              if (!actualPendingCount || actualPendingCount === 0) continue

              // 단계별 분류
              let stageId = null
              if (diffDays < 0) stageId = 'overdue'
              else if (diffDays === 0) stageId = 'today'
              else if (diffDays === 1) stageId = '1day'
              else if (diffDays === 2) stageId = '2day'
              else if (diffDays === 3) stageId = '3day'

              if (stageId) {
                const stepLabel = field.includes('week')
                  ? `${field.replace('week', '').replace('_deadline', '')}주차`
                  : field.includes('step')
                    ? `${field.replace('step', '').replace('_deadline', '')}단계`
                    : ''

                result[region.id][stageId].push({
                  ...campaign,
                  deadlineField: field,
                  deadline,
                  diffDays,
                  pendingCount: actualPendingCount,
                  stepLabel,
                  region: region.id
                })
              }
            }
          }
        } catch (err) {
          console.error(`${region.id} 데이터 조회 오류:`, err)
        }
      }

      setData(result)
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 캠페인 클릭 시 미제출 크리에이터 목록 조회
  const handleCampaignClick = async (campaign) => {
    setSelectedCampaign(campaign)
    setLoadingCreators(true)
    setPendingCreators([])

    try {
      const supabase = campaign.region === 'biz'
        ? supabaseBiz
        : getSupabaseClient(campaign.region)

      // 해당 캠페인의 신청자 조회
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('id, user_id, status, applicant_name, creator_name, email')
        .eq('campaign_id', campaign.id)
        .in('status', ['filming', 'selected', 'guide_approved'])

      if (appError) throw appError

      // 영상 제출 확인
      let videoQuery = supabase
        .from('video_submissions')
        .select('user_id')
        .eq('campaign_id', campaign.id)

      const type = (campaign.campaign_type || '').toLowerCase()
      if (type.includes('4week') || type.includes('challenge')) {
        const weekNum = parseInt(campaign.deadlineField.replace('week', '').replace('_deadline', ''))
        videoQuery = videoQuery.eq('week_number', weekNum)
      } else if (type.includes('olive')) {
        const stepNum = parseInt(campaign.deadlineField.replace('step', '').replace('_deadline', ''))
        videoQuery = videoQuery.eq('video_number', stepNum)
      }

      const { data: submissions } = await videoQuery
      const submittedUserIds = new Set((submissions || []).map(s => s.user_id))

      // 미제출자 필터링
      const pending = (applications || []).filter(app => !submittedUserIds.has(app.user_id))

      // user_profiles에서 추가 정보 조회
      const userIds = pending.map(p => p.user_id).filter(Boolean)
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, user_id, name, channel_name, phone, phone_number, email')
          .in('id', userIds)

        const profileMap = {}
        ;(profiles || []).forEach(p => {
          profileMap[p.id] = p
          if (p.user_id) profileMap[p.user_id] = p
        })

        pending.forEach(p => {
          const profile = profileMap[p.user_id]
          if (profile) {
            p.creatorName = profile.channel_name || profile.name || p.applicant_name || p.creator_name
            p.phone = profile.phone || profile.phone_number
            p.email = profile.email || p.email
          } else {
            p.creatorName = p.applicant_name || p.creator_name || '이름 없음'
          }
        })
      }

      setPendingCreators(pending)
    } catch (error) {
      console.error('미제출 크리에이터 조회 오류:', error)
    } finally {
      setLoadingCreators(false)
    }
  }

  // 전체 통계 계산
  const getTotalStats = () => {
    let total = 0
    const byStage = {}
    DEADLINE_STAGES.forEach(stage => {
      byStage[stage.id] = 0
    })

    Object.values(data).forEach(regionData => {
      Object.entries(regionData).forEach(([stageId, campaigns]) => {
        const stageTotal = campaigns.reduce((sum, c) => sum + (c.pendingCount || 0), 0)
        byStage[stageId] += stageTotal
        total += stageTotal
      })
    })

    return { total, byStage }
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
          <p className="text-gray-600 mt-1">마감일 크리에이터 관리</p>
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
            variant="default"
            size="sm"
            className="whitespace-nowrap"
          >
            ⏰ 마감일 관리
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => navigate('/admin/campaigns/unpaid')}
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">전체 미제출</div>
              </div>
            </CardContent>
          </Card>
          {DEADLINE_STAGES.map(stage => (
            <Card key={stage.id}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${stage.id === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                    {stats.byStage[stage.id]}
                  </div>
                  <div className="text-xs text-gray-500">{stage.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 지역별 데이터 */}
        {REGIONS.map(region => {
          const regionData = data[region.id] || {}
          const hasData = Object.values(regionData).some(campaigns => campaigns.length > 0)

          if (!hasData) return null

          return (
            <div key={region.id} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>{region.flag}</span>
                <span>{region.label}</span>
              </h2>

              <div className="space-y-4">
                {DEADLINE_STAGES.map(stage => {
                  const campaigns = regionData[stage.id] || []
                  if (campaigns.length === 0) return null

                  const isExpanded = expandedCampaigns[`${region.id}-${stage.id}`]
                  const totalPending = campaigns.reduce((sum, c) => sum + (c.pendingCount || 0), 0)

                  return (
                    <Card key={stage.id}>
                      <CardHeader
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedCampaigns(prev => ({
                          ...prev,
                          [`${region.id}-${stage.id}`]: !prev[`${region.id}-${stage.id}`]
                        }))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={stage.color}>
                              {stage.label}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {campaigns.length}개 캠페인 · <span className="font-semibold">{totalPending}명</span> 미제출
                            </span>
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
                            {campaigns.map((campaign, idx) => (
                              <div
                                key={`${campaign.id}-${campaign.deadlineField}-${idx}`}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                onClick={() => handleCampaignClick(campaign)}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {campaign.title}
                                    {campaign.stepLabel && (
                                      <span className="ml-2 text-sm text-gray-500">
                                        ({campaign.stepLabel})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    마감일: {campaign.deadline}
                                    {campaign.diffDays < 0 && (
                                      <span className="ml-2 text-red-600 font-medium">
                                        ({Math.abs(campaign.diffDays)}일 지연)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-white">
                                    <Users className="w-3 h-3 mr-1" />
                                    {campaign.pendingCount}명
                                  </Badge>
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* 데이터가 없는 경우 */}
        {!Object.values(data).some(regionData =>
          Object.values(regionData).some(campaigns => campaigns.length > 0)
        ) && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">마감일이 임박한 캠페인이 없습니다.</p>
            </CardContent>
          </Card>
        )}

        {/* 미제출 크리에이터 상세 다이얼로그 */}
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                미제출 크리에이터 목록
              </DialogTitle>
            </DialogHeader>

            {selectedCampaign && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-900">{selectedCampaign.title}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedCampaign.stepLabel && `${selectedCampaign.stepLabel} · `}
                    마감일: {selectedCampaign.deadline}
                    {selectedCampaign.diffDays < 0 && (
                      <span className="ml-2 text-red-600 font-medium">
                        ({Math.abs(selectedCampaign.diffDays)}일 지연)
                      </span>
                    )}
                  </div>
                </div>

                {loadingCreators ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : pendingCreators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    미제출 크리에이터가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingCreators.map((creator, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {creator.creatorName || '이름 없음'}
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
                        <Badge variant="outline" className={
                          creator.status === 'filming' ? 'bg-blue-50 text-blue-700' :
                          creator.status === 'selected' ? 'bg-green-50 text-green-700' :
                          'bg-gray-50 text-gray-700'
                        }>
                          {creator.status === 'filming' ? '촬영중' :
                           creator.status === 'selected' ? '선정됨' :
                           creator.status === 'guide_approved' ? '가이드승인' :
                           creator.status}
                        </Badge>
                      </div>
                    ))}
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
