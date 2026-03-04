import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Calendar, AlertTriangle, Clock, Users, ChevronDown, ChevronUp,
  Phone, Mail, ExternalLink, RefreshCw, Edit2, Save, X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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

// 캠페인 타입 판별
const getCampaignTypeInfo = (campaignType) => {
  const type = (campaignType || '').toLowerCase()
  if (type.includes('4week') || type.includes('challenge')) {
    return {
      isMulti: true,
      is4Week: true,
      isOlive: false,
      requiredCount: 4,
      deadlineFields: ['week1_deadline', 'week2_deadline', 'week3_deadline', 'week4_deadline'],
      label: '4주 챌린지'
    }
  }
  if (type.includes('olive') || type.includes('megawari')) {
    return {
      isMulti: true,
      is4Week: false,
      isOlive: true,
      requiredCount: 2,
      deadlineFields: ['step1_deadline', 'step2_deadline'],
      label: type.includes('megawari') ? '메가와리' : '올영세일'
    }
  }
  return {
    isMulti: false,
    is4Week: false,
    isOlive: false,
    requiredCount: 1,
    deadlineFields: ['content_submission_deadline', 'video_deadline', 'start_date'],
    label: '일반'
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
  const [debugInfo, setDebugInfo] = useState('')
  const [editingCreator, setEditingCreator] = useState(null) // 마감일 수정 중인 크리에이터
  const [newDeadline, setNewDeadline] = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)

  // 데이터 로드 - 최적화된 버전
  const fetchData = async () => {
    setRefreshing(true)
    let debugLog = []

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      debugLog.push(`오늘 날짜: ${todayStr}`)

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

          if (!supabase) {
            debugLog.push(`[${region.id}] Supabase 클라이언트 없음`)
            continue
          }

          // 1. 활성 캠페인 한번에 조회
          const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .in('status', ['active', 'recruiting', 'approved', 'filming', 'ongoing'])

          if (error) {
            debugLog.push(`[${region.id}] 캠페인 조회 오류: ${error.message}`)
            continue
          }

          if (!campaigns || campaigns.length === 0) {
            debugLog.push(`[${region.id}] 활성 캠페인 없음`)
            continue
          }

          debugLog.push(`[${region.id}] 활성 캠페인 ${campaigns.length}개`)

          // 2. 모든 캠페인 ID
          const campaignIds = campaigns.map(c => c.id)

          // 3. applications 한번에 조회
          const { data: applications } = await supabase
            .from('applications')
            .select('*')
            .in('campaign_id', campaignIds)
            .in('status', ['filming', 'selected', 'guide_approved', 'approved', 'virtual_selected'])

          debugLog.push(`[${region.id}] applications ${(applications || []).length}개`)

          // 4. video_submissions 한번에 조회 (Korea/BIZ만 - Japan/US는 테이블 없음)
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

          // 5. applications를 캠페인별로 그룹화
          const appsByCampaign = {}
          ;(applications || []).forEach(app => {
            if (!appsByCampaign[app.campaign_id]) {
              appsByCampaign[app.campaign_id] = []
            }
            appsByCampaign[app.campaign_id].push(app)
          })

          // 6. submissions를 캠페인별, 유저별로 그룹화
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

          // 7. 각 캠페인의 마감일 확인
          for (const campaign of campaigns) {
            const typeInfo = getCampaignTypeInfo(campaign.campaign_type)
            const campaignApps = appsByCampaign[campaign.id] || []
            const campaignSubs = submissionsByCampaign[campaign.id] || {}

            if (campaignApps.length === 0) continue

            // 멀티비디오 캠페인: 각 스텝/주차별 마감일 확인
            if (typeInfo.isMulti) {
              for (let idx = 0; idx < typeInfo.deadlineFields.length; idx++) {
                const field = typeInfo.deadlineFields[idx]
                const deadline = getDatePart(campaign[field])
                if (!deadline) continue

                const deadlineDate = new Date(deadline + 'T00:00:00')
                const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))

                // 3일 전 ~ 지연(7일까지) 범위만 표시
                if (diffDays > 3 || diffDays < -7) continue

                const stepOrWeek = idx + 1 // 1부터 시작

                // 이 스텝/주차에서 미제출자 계산
                let pendingCount = 0
                for (const app of campaignApps) {
                  const userSubs = campaignSubs[app.user_id] || []

                  // 해당 스텝/주차의 제출물 찾기
                  // week 컬럼은 존재하지 않음 - week_number, video_number만 사용
                  const stepSub = userSubs.find(s => {
                    // week_number 또는 video_number 중 유효한 값 사용
                    const weekNum = s.week_number != null ? Number(s.week_number) : null
                    const videoNum = s.video_number != null ? Number(s.video_number) : null
                    const stepNum = s.step != null ? Number(s.step) : null

                    if (typeInfo.is4Week) {
                      // 4주 챌린지: week_number 또는 video_number 사용
                      return weekNum === stepOrWeek || videoNum === stepOrWeek
                    } else {
                      // 올영/메가와리: step 또는 video_number 사용
                      return stepNum === stepOrWeek || videoNum === stepOrWeek
                    }
                  })

                  // 제출물이 없거나 제출되지 않은 경우만 미제출로 처리
                  // submitted, resubmitted = 제출됨 (검토 대기)
                  // approved, completed, uploaded = 승인/완료됨
                  const submittedStatuses = ['submitted', 'resubmitted', 'approved', 'completed', 'uploaded']
                  if (!stepSub || !submittedStatuses.includes(stepSub.status)) {
                    pendingCount++
                  }
                }

                if (pendingCount === 0) continue

                // 단계별 분류
                let stageId = null
                if (diffDays < 0) stageId = 'overdue'
                else if (diffDays === 0) stageId = 'today'
                else if (diffDays === 1) stageId = '1day'
                else if (diffDays === 2) stageId = '2day'
                else if (diffDays === 3) stageId = '3day'

                if (stageId) {
                  const stepLabel = typeInfo.is4Week ? `${stepOrWeek}주차` : `${stepOrWeek}단계`

                  debugLog.push(`[${region.id}] ${campaign.title} (${stepLabel}, ${deadline}, ${stageId}): ${pendingCount}/${campaignApps.length}명 미제출`)

                  result[region.id][stageId].push({
                    ...campaign,
                    deadlineField: field,
                    deadline,
                    diffDays,
                    pendingCount,
                    totalCount: campaignApps.length,
                    stepOrWeek,
                    stepLabel,
                    typeInfo,
                    region: region.id
                  })
                }
              }
            } else {
              // 일반 캠페인: 첫 번째 유효한 마감일만 사용
              let deadline = null
              let field = null
              for (const f of typeInfo.deadlineFields) {
                const d = getDatePart(campaign[f])
                if (d) {
                  deadline = d
                  field = f
                  break
                }
              }

              if (!deadline) {
                debugLog.push(`[${region.id}] ${campaign.title}: 마감일 없음`)
                continue
              }

              const deadlineDate = new Date(deadline + 'T00:00:00')
              const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))

              // 3일 전 ~ 지연(7일까지) 범위만 표시
              if (diffDays > 3 || diffDays < -7) continue

              // 미제출자 계산
              let pendingCount = 0
              for (const app of campaignApps) {
                const userSubs = campaignSubs[app.user_id] || []

                // 완료된 제출물이 있는지 확인
                const completedSub = userSubs.find(s =>
                  s.status === 'completed' || s.final_confirmed_at
                )

                // 완료된 것이 없으면 미제출
                if (!completedSub) {
                  // 승인된 것도 없는지 확인 (승인 대기중은 제출 완료로 봄)
                  const approvedSub = userSubs.find(s =>
                    ['approved', 'submitted', 'resubmitted'].includes(s.status)
                  )
                  if (!approvedSub) {
                    // applications의 video_url도 체크
                    if (!app.video_url && !app.clean_video_url) {
                      pendingCount++
                    }
                  }
                }
              }

              if (pendingCount === 0) continue

              // 단계별 분류
              let stageId = null
              if (diffDays < 0) stageId = 'overdue'
              else if (diffDays === 0) stageId = 'today'
              else if (diffDays === 1) stageId = '1day'
              else if (diffDays === 2) stageId = '2day'
              else if (diffDays === 3) stageId = '3day'

              if (stageId) {
                debugLog.push(`[${region.id}] ${campaign.title} (${deadline}, ${stageId}): ${pendingCount}/${campaignApps.length}명 미제출`)

                result[region.id][stageId].push({
                  ...campaign,
                  deadlineField: field,
                  deadline,
                  diffDays,
                  pendingCount,
                  totalCount: campaignApps.length,
                  stepLabel: '',
                  typeInfo,
                  region: region.id
                })
              }
            }
          }
        } catch (err) {
          debugLog.push(`[${region.id}] 오류: ${err.message}`)
          console.error(`${region.id} 데이터 조회 오류:`, err)
        }
      }

      setData(result)
      setDebugInfo(debugLog.join('\n'))
      console.log('마감일 관리 디버그:\n', debugLog.join('\n'))
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
        .select('*')
        .eq('campaign_id', campaign.id)
        .in('status', ['filming', 'selected', 'guide_approved', 'approved', 'virtual_selected'])

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
      } else {
        console.log(`${campaign.region}는 video_submissions 테이블 없음 - 스킵`)
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

      // submissions를 유저별로 그룹화
      const subsByUser = {}
      submissions.forEach(sub => {
        if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = []
        subsByUser[sub.user_id].push(sub)
      })

      const typeInfo = campaign.typeInfo || getCampaignTypeInfo(campaign.campaign_type)

      // 미제출 크리에이터 필터링
      const pending = []

      for (const app of applications || []) {
        const profile = profileMap[app.user_id]
        const userSubs = subsByUser[app.user_id] || []

        let isPending = false
        let submissionStatus = ''

        if (typeInfo.isMulti && campaign.stepOrWeek) {
          // 멀티비디오 캠페인: 특정 스텝/주차 확인
          const stepSub = userSubs.find(s => {
            const weekNum = s.week_number != null ? Number(s.week_number) : null
            const videoNum = s.video_number != null ? Number(s.video_number) : null
            const stepNum = s.step != null ? Number(s.step) : null

            if (typeInfo.is4Week) {
              // 4주 챌린지: week_number 또는 video_number 사용
              return weekNum === campaign.stepOrWeek || videoNum === campaign.stepOrWeek
            } else {
              // 올영/메가와리: step 또는 video_number 사용
              return stepNum === campaign.stepOrWeek || videoNum === campaign.stepOrWeek
            }
          })

          // submitted, resubmitted = 제출됨 (검토 대기 중이지만 미제출 아님)
          // approved, completed, uploaded = 승인/완료됨
          const submittedStatuses = ['submitted', 'resubmitted', 'approved', 'completed', 'uploaded']

          if (!stepSub) {
            isPending = true
            submissionStatus = '미제출'
          } else if (!submittedStatuses.includes(stepSub.status)) {
            // pending, rejected, revision_requested 등만 미제출로 처리
            isPending = true
            submissionStatus = stepSub.status === 'rejected' ? '반려됨' :
                               stepSub.status === 'revision_requested' ? '수정 요청' :
                               stepSub.status === 'pending' ? '대기중' :
                               stepSub.status
          }
          // 제출된 경우 isPending = false 유지
        } else {
          // 일반 캠페인
          const completedSub = userSubs.find(s =>
            s.status === 'completed' || s.final_confirmed_at
          )
          const approvedSub = userSubs.find(s =>
            ['approved', 'submitted', 'resubmitted'].includes(s.status)
          )

          if (!completedSub && !approvedSub) {
            if (!app.video_url && !app.clean_video_url) {
              isPending = true
              submissionStatus = '미제출'
            }
          }
        }

        if (isPending) {
          pending.push({
            ...app,
            creatorName: profile?.channel_name || profile?.name || app.applicant_name || app.creator_name || '이름 없음',
            phone: profile?.phone || profile?.phone_number,
            email: profile?.email || app.email,
            submissionStatus
          })
        }
      }

      setPendingCreators(pending)
    } catch (error) {
      console.error('미제출 크리에이터 조회 오류:', error)
    } finally {
      setLoadingCreators(false)
    }
  }

  // 크리에이터 개별 마감일 수정
  const handleEditDeadline = (creator) => {
    setEditingCreator(creator)
    // 캠페인 기본 마감일을 초기값으로 설정
    setNewDeadline(selectedCampaign?.deadline || '')
  }

  const handleSaveDeadline = async () => {
    if (!editingCreator || !newDeadline || !selectedCampaign) return

    setSavingDeadline(true)
    try {
      const response = await fetch('/.netlify/functions/update-creator-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: editingCreator.id,
          campaignId: selectedCampaign.id,
          region: selectedCampaign.region,
          newDeadline: newDeadline,
          deadlineType: selectedCampaign.stepLabel || 'content_submission',
          stepOrWeek: selectedCampaign.stepOrWeek || null
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`마감일이 ${newDeadline}로 변경되었습니다.`)
        // 크리에이터 목록에서 마감일 업데이트
        setPendingCreators(prev => prev.map(c =>
          c.id === editingCreator.id
            ? { ...c, customDeadline: newDeadline }
            : c
        ))
        setEditingCreator(null)
        setNewDeadline('')
      } else {
        alert(`마감일 변경 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('마감일 변경 오류:', error)
      alert('마감일 변경 중 오류가 발생했습니다.')
    } finally {
      setSavingDeadline(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingCreator(null)
    setNewDeadline('')
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
          <p className="text-gray-600 mt-1">마감일 크리에이터 관리 (주차/단계별 미제출 확인)</p>
        </div>

        {/* 서브 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => navigate('/admin/campaigns')}
          >
            대시보드
          </Button>
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
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => navigate('/admin/campaigns/dummy')}
          >
            🧪 더미 캠페인
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

                  const isExpanded = expandedCampaigns[`${region.id}-${stage.id}`] !== false
                  const totalPending = campaigns.reduce((sum, c) => sum + (c.pendingCount || 0), 0)

                  return (
                    <Card key={stage.id}>
                      <CardHeader
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedCampaigns(prev => ({
                          ...prev,
                          [`${region.id}-${stage.id}`]: !isExpanded
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
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {campaign.title}
                                    </span>
                                    {campaign.stepLabel && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                        {campaign.stepLabel}
                                      </Badge>
                                    )}
                                    {campaign.typeInfo?.label && campaign.typeInfo.isMulti && (
                                      <Badge variant="outline" className="text-xs">
                                        {campaign.typeInfo.label}
                                      </Badge>
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
              <p className="text-sm text-gray-400 mt-2">
                3일 이내 마감 예정이거나 마감이 지난 캠페인이 표시됩니다.
              </p>
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{selectedCampaign.title}</span>
                    {selectedCampaign.stepLabel && (
                      <Badge className="bg-blue-100 text-blue-700">
                        {selectedCampaign.stepLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
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
                      <div key={idx} className="p-3 bg-white border rounded-lg">
                        <div className="flex items-center justify-between">
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
                          <div className="flex items-center gap-2">
                            {creator.submissionStatus && (
                              <Badge variant="outline" className={
                                creator.submissionStatus === '미제출' ? 'bg-red-50 text-red-700' :
                                creator.submissionStatus === '반려됨' ? 'bg-orange-50 text-orange-700' :
                                creator.submissionStatus === '수정 요청' ? 'bg-yellow-50 text-yellow-700' :
                                'bg-gray-50 text-gray-700'
                              }>
                                {creator.submissionStatus}
                              </Badge>
                            )}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDeadline(creator)}
                              className="ml-2"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 마감일 수정 UI */}
                        {editingCreator?.id === creator.id && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-2">
                            <span className="text-sm text-gray-600">마감일 연장:</span>
                            <Input
                              type="date"
                              value={newDeadline}
                              onChange={(e) => setNewDeadline(e.target.value)}
                              className="w-40"
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveDeadline}
                              disabled={savingDeadline || !newDeadline}
                            >
                              {savingDeadline ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* 커스텀 마감일 표시 */}
                        {creator.customDeadline && (
                          <div className="mt-2 text-sm text-blue-600">
                            📅 개별 마감일: {creator.customDeadline}
                          </div>
                        )}
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
