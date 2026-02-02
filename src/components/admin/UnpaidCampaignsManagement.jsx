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

// 경과일 기준 그룹
const ELAPSED_GROUPS = [
  { id: '7plus', label: '7일 이상', color: 'bg-red-100 text-red-700', minDays: 7 },
  { id: '5to6', label: '5-6일', color: 'bg-orange-100 text-orange-700', minDays: 5, maxDays: 6 },
  { id: '3to4', label: '3-4일', color: 'bg-yellow-100 text-yellow-700', minDays: 3, maxDays: 4 },
  { id: 'under3', label: '3일 미만', color: 'bg-green-100 text-green-700', minDays: 0, maxDays: 2 }
]

// 경과일 계산
const calcDaysElapsed = (dateStr) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  return diff
}

// 경과일 그룹 찾기
const getElapsedGroup = (days) => {
  if (days === null) return null
  if (days >= 7) return '7plus'
  if (days >= 5) return '5to6'
  if (days >= 3) return '3to4'
  return 'under3'
}

// 캠페인 타입 판별
const getCampaignTypeInfo = (campaignType) => {
  const type = (campaignType || '').toLowerCase()
  if (type.includes('4week') || type.includes('challenge')) {
    return { label: '4주챌린지', required: 4, color: 'bg-purple-100 text-purple-700' }
  }
  if (type.includes('olive') || type.includes('megawari')) {
    return { label: type.includes('megawari') ? '메가와리' : '올영세일', required: 2, color: 'bg-green-100 text-green-700' }
  }
  return { label: '기획', required: 1, color: 'bg-blue-100 text-blue-700' }
}

export default function UnpaidCampaignsManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState({}) // region -> elapsedGroup -> creators
  const [expandedGroups, setExpandedGroups] = useState({ '7plus': true, '5to6': true, '3to4': true })
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')

  // 데이터 로드
  const fetchData = async () => {
    setRefreshing(true)
    const debugLog = []

    try {
      const result = {}

      for (const region of REGIONS) {
        result[region.id] = {
          '7plus': [],
          '5to6': [],
          '3to4': [],
          'under3': []
        }

        try {
          const supabase = region.id === 'biz'
            ? supabaseBiz
            : getSupabaseClient(region.id)

          if (!supabase) {
            debugLog.push(`[${region.id}] Supabase 클라이언트 없음`)
            continue
          }

          // SNS 업로드 완료된 applications 조회 (최종 확정 안 된 것들)
          // sns_uploaded 상태이거나, video_submitted/completed 상태지만 아직 포인트 지급 안 된 것
          // 참고: 각 DB마다 컬럼이 다를 수 있으므로 공통 컬럼만 조회
          const { data: applications, error } = await supabase
            .from('applications')
            .select(`
              id, campaign_id, user_id, status,
              updated_at, created_at,
              applicant_name,
              campaigns (id, title, brand, campaign_type)
            `)
            .in('status', ['sns_uploaded', 'video_submitted', 'completed'])
            .order('updated_at', { ascending: true })

          if (error) {
            debugLog.push(`[${region.id}] 조회 오류: ${error.message}`)
            continue
          }

          debugLog.push(`[${region.id}] SNS 업로드 applications ${(applications || []).length}개`)

          // video_submissions로 최종 확정 여부 및 제출 현황 확인 (Korea/BIZ만)
          let confirmedUserCampaigns = new Set()
          let submissionCounts = {} // { `${user_id}_${campaign_id}`: { videoCount, snsCount } }
          if ((region.id === 'korea' || region.id === 'biz') && applications?.length > 0) {
            try {
              const campaignIds = [...new Set(applications.map(a => a.campaign_id))]
              const response = await fetch('/.netlify/functions/get-video-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ region: region.id, campaignIds })
              })
              const subResult = await response.json()
              if (subResult.success) {
                // 제출물 카운트 및 확정 여부 확인
                (subResult.submissions || []).forEach(sub => {
                  const key = `${sub.user_id}_${sub.campaign_id}`

                  // 카운트 초기화
                  if (!submissionCounts[key]) {
                    submissionCounts[key] = { videoCount: 0, snsCount: 0, confirmedCount: 0 }
                  }

                  // 영상 제출 카운트 (status가 submitted, approved, completed 등)
                  const videoStatuses = ['submitted', 'resubmitted', 'approved', 'completed', 'uploaded']
                  if (videoStatuses.includes(sub.status)) {
                    submissionCounts[key].videoCount++
                  }

                  // SNS 업로드 확인 (status가 uploaded 또는 completed)
                  if (sub.status === 'uploaded' || sub.status === 'completed' || sub.status === 'sns_uploaded') {
                    submissionCounts[key].snsCount++
                  }

                  // 최종 확정 카운트
                  if (sub.final_confirmed_at) {
                    submissionCounts[key].confirmedCount++
                  }
                })

                // 모든 영상이 확정된 경우만 제외
                Object.entries(submissionCounts).forEach(([key, counts]) => {
                  const app = applications.find(a => `${a.user_id}_${a.campaign_id}` === key)
                  if (app) {
                    const typeInfo = getCampaignTypeInfo(app.campaigns?.campaign_type)
                    if (counts.confirmedCount >= typeInfo.required) {
                      confirmedUserCampaigns.add(key)
                    }
                  }
                })

                debugLog.push(`[${region.id}] 확정된 submissions ${confirmedUserCampaigns.size}개`)
              }
            } catch (e) {
              debugLog.push(`[${region.id}] video_submissions 조회 실패: ${e.message}`)
            }
          }

          // user_profiles 조회
          const userIds = [...new Set((applications || []).map(a => a.user_id).filter(Boolean))]
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

          // 그룹화
          for (const app of (applications || [])) {
            // 이미 확정된 건 제외
            const key = `${app.user_id}_${app.campaign_id}`
            if (confirmedUserCampaigns.has(key)) continue

            const campaign = app.campaigns
            const typeInfo = getCampaignTypeInfo(campaign?.campaign_type)
            const counts = submissionCounts[key] || { videoCount: 0, snsCount: 0, confirmedCount: 0 }

            // ★ 지급 조건: SNS 업로드 완료 기준 (영상 제출은 체크 안함)
            // 최종 확정을 안 누른 기업을 찾기 위함
            if (counts.snsCount < typeInfo.required) {
              continue // SNS 업로드 미완료 = 아직 지급 대상 아님
            }

            // SNS 업로드 날짜 기준 경과일 계산 (sns_uploaded_at 컬럼 없으면 updated_at 사용)
            const uploadDate = app.updated_at || app.created_at
            const daysElapsed = calcDaysElapsed(uploadDate)
            const groupId = getElapsedGroup(daysElapsed)

            if (!groupId) continue

            const profile = profileMap[app.user_id]

            result[region.id][groupId].push({
              ...app,
              creatorName: profile?.channel_name || profile?.name || app.applicant_name || '이름 없음',
              phone: profile?.phone || profile?.phone_number,
              email: profile?.email,
              campaignTitle: campaign?.title || '캠페인 정보 없음',
              campaignBrand: campaign?.brand,
              campaignType: campaign?.campaign_type,
              typeInfo,
              videoCount: counts.videoCount,
              snsCount: counts.snsCount,
              confirmedCount: counts.confirmedCount,
              uploadDate,
              daysElapsed,
              region: region.id
            })
          }

          // 각 그룹 로그
          Object.entries(result[region.id]).forEach(([groupId, creators]) => {
            if (creators.length > 0) {
              debugLog.push(`[${region.id}] ${groupId}: ${creators.length}명`)
            }
          })

        } catch (err) {
          debugLog.push(`[${region.id}] 오류: ${err.message}`)
          console.error(`${region.id} 데이터 조회 오류:`, err)
        }
      }

      setData(result)
      setDebugInfo(debugLog.join('\n'))
      console.log('미지급 관리 디버그:\n', debugLog.join('\n'))
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

  // 전체 통계 계산
  const getTotalStats = () => {
    let total = 0
    let urgent = 0 // 7일 이상
    let warning = 0 // 3-6일

    Object.values(data).forEach(regionData => {
      total += (regionData['7plus']?.length || 0) + (regionData['5to6']?.length || 0) +
               (regionData['3to4']?.length || 0) + (regionData['under3']?.length || 0)
      urgent += regionData['7plus']?.length || 0
      warning += (regionData['5to6']?.length || 0) + (regionData['3to4']?.length || 0)
    })

    return { total, urgent, warning }
  }

  const stats = getTotalStats()

  // 그룹 토글
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">포인트 미지급 관리</h1>
            <p className="text-gray-600 mt-1">SNS 업로드 후 최종 확정 대기 중인 크리에이터</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">전체 대기</p>
                  <p className="text-2xl font-bold">{stats.total}명</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600">7일 이상 지연</p>
                  <p className="text-2xl font-bold text-red-700">{stats.urgent}명</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-yellow-600">3-6일 경과</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.warning}명</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
        </div>

        {/* 경과일 그룹별 표시 */}
        <div className="space-y-4">
          {ELAPSED_GROUPS.map(group => {
            // 모든 지역의 해당 그룹 크리에이터 합치기
            const allCreators = []
            REGIONS.forEach(region => {
              const creators = data[region.id]?.[group.id] || []
              creators.forEach(c => {
                allCreators.push({ ...c, regionInfo: region })
              })
            })

            // 경과일 많은 순으로 정렬
            allCreators.sort((a, b) => (b.daysElapsed || 0) - (a.daysElapsed || 0))

            if (allCreators.length === 0) return null

            return (
              <Card key={group.id} className="bg-white">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={group.color}>
                        {group.label}
                      </Badge>
                      <span className="text-lg font-semibold">
                        {allCreators.length}명
                      </span>
                    </div>
                    {expandedGroups[group.id] ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>

                {expandedGroups[group.id] && (
                  <CardContent>
                    <div className="space-y-2">
                      {allCreators.map((creator, idx) => (
                        <div
                          key={`${creator.id}-${idx}`}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                          onClick={() => navigate(`/admin/campaigns/${creator.campaign_id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={creator.regionInfo.color}>
                              {creator.regionInfo.flag}
                            </Badge>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{creator.creatorName}</p>
                                {creator.typeInfo && (
                                  <Badge className={`text-xs ${creator.typeInfo.color}`}>
                                    {creator.typeInfo.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{creator.campaignTitle}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* 영상/SNS 제출 현황 */}
                            <div className="text-center">
                              <div className="flex items-center gap-2 text-sm">
                                <span className={`font-medium ${creator.videoCount >= (creator.typeInfo?.required || 1) ? 'text-green-600' : 'text-orange-600'}`}>
                                  🎬 {creator.videoCount}/{creator.typeInfo?.required || 1}
                                </span>
                                <span className={`font-medium ${creator.snsCount >= (creator.typeInfo?.required || 1) ? 'text-green-600' : 'text-orange-600'}`}>
                                  📱 {creator.snsCount}/{creator.typeInfo?.required || 1}
                                </span>
                                <span className={`font-medium ${creator.confirmedCount >= (creator.typeInfo?.required || 1) ? 'text-green-600' : 'text-red-600'}`}>
                                  ✅ {creator.confirmedCount}/{creator.typeInfo?.required || 1}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">영상/SNS/확정</p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700">
                                {creator.daysElapsed}일 경과
                              </p>
                              <p className="text-xs text-gray-400">
                                {creator.uploadDate ? new Date(creator.uploadDate).toLocaleDateString('ko-KR') : '-'}
                              </p>
                            </div>

                            <div className="flex gap-1">
                              {creator.phone && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); window.open(`tel:${creator.phone}`) }}
                                >
                                  <Phone className="w-4 h-4" />
                                </Button>
                              )}
                              {creator.email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); window.open(`mailto:${creator.email}`) }}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              )}
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* 데이터 없음 */}
          {stats.total === 0 && (
            <Card className="bg-white">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">모든 포인트가 지급되었습니다</p>
                <p className="text-sm text-gray-500 mt-1">대기 중인 크리에이터가 없습니다</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
