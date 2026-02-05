import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Loader2, DollarSign, Users, ChevronDown, ChevronUp,
  Phone, Mail, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock,
  Search, Check, X, CreditCard
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 지역 설정
const REGIONS = [
  { id: 'korea', label: '한국', flag: '🇰🇷', color: 'bg-blue-50 text-blue-700' },
  { id: 'japan', label: '일본', flag: '🇯🇵', color: 'bg-red-50 text-red-600' },
  { id: 'us', label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700' }
]

export default function UnpaidCampaignsManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('confirmed') // confirmed = 최종확정 완료, pending = 미완료
  const [searchQuery, setSearchQuery] = useState('')

  // 데이터
  const [confirmedList, setConfirmedList] = useState([]) // 최종 확정 완료
  const [pendingList, setPendingList] = useState([]) // 최종 확정 대기

  // 수동 지급 모달
  const [paymentModal, setPaymentModal] = useState(null)
  const [processing, setProcessing] = useState(false)

  // 데이터 로드
  const fetchData = async () => {
    setRefreshing(true)

    try {
      const confirmed = []
      const pending = []

      for (const region of REGIONS) {
        try {
          const supabase = getSupabaseClient(region.id)
          if (!supabase) continue

          // video_submissions 조회 (조인 없이 개별 조회)
          const { data: submissions, error } = await supabase
            .from('video_submissions')
            .select('id, user_id, campaign_id, status, final_confirmed_at, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(500)

          if (error) {
            console.error(`[${region.id}] video_submissions 조회 오류:`, error)
            continue
          }

          console.log(`[${region.id}] video_submissions 조회: ${submissions?.length || 0}건`)

          // 캠페인 ID 목록 추출
          const campaignIds = [...new Set((submissions || []).map(s => s.campaign_id).filter(Boolean))]

          // campaigns 별도 조회
          let campaignMap = {}
          if (campaignIds.length > 0) {
            const { data: campaigns, error: campError } = await supabase
              .from('campaigns')
              .select('id, title, brand, campaign_type, point_amount')
              .in('id', campaignIds)

            if (!campError && campaigns) {
              campaigns.forEach(c => {
                campaignMap[c.id] = c
              })
            }
          }

          // user_profiles 조회
          const userIds = [...new Set((submissions || []).map(s => s.user_id).filter(Boolean))]
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

          // point_history 조회 (캠페인 완료 포인트 지급 기록)
          let pointHistoryMap = {}
          if (userIds.length > 0) {
            try {
              const { data: pointHistory } = await supabase
                .from('point_history')
                .select('user_id, campaign_id, amount, created_at')
                .eq('type', 'campaign_complete')
                .in('user_id', userIds)

              ;(pointHistory || []).forEach(ph => {
                const key = `${ph.user_id}_${ph.campaign_id}`
                pointHistoryMap[key] = ph
              })
            } catch (e) {
              console.log(`[${region.id}] point_history 조회 실패, point_transactions 시도`)
              // fallback to point_transactions
              try {
                const { data: pointTx } = await supabase
                  .from('point_transactions')
                  .select('user_id, related_campaign_id, amount, created_at')
                  .eq('type', 'campaign_reward')
                  .in('user_id', userIds)

                ;(pointTx || []).forEach(pt => {
                  const key = `${pt.user_id}_${pt.related_campaign_id}`
                  pointHistoryMap[key] = pt
                })
              } catch (e2) {
                console.log(`[${region.id}] point_transactions도 실패`)
              }
            }
          }

          // 데이터 분류
          for (const sub of (submissions || [])) {
            const profile = profileMap[sub.user_id]
            const campaign = campaignMap[sub.campaign_id]
            const pointKey = `${sub.user_id}_${sub.campaign_id}`
            const pointRecord = pointHistoryMap[pointKey]

            const item = {
              id: sub.id,
              region: region.id,
              regionInfo: region,
              userId: sub.user_id,
              campaignId: sub.campaign_id,
              status: sub.status,
              finalConfirmedAt: sub.final_confirmed_at,
              createdAt: sub.created_at,
              updatedAt: sub.updated_at,
              creatorName: profile?.channel_name || profile?.name || '이름 없음',
              phone: profile?.phone || profile?.phone_number,
              email: profile?.email,
              campaignTitle: campaign?.title || '캠페인 정보 없음',
              campaignBrand: campaign?.brand,
              campaignType: campaign?.campaign_type,
              pointAmount: campaign?.point_amount || 0,
              // 포인트 지급 여부
              isPaid: !!pointRecord,
              paidAmount: pointRecord?.amount || 0,
              paidAt: pointRecord?.created_at
            }

            if (sub.final_confirmed_at) {
              confirmed.push(item)
            } else {
              pending.push(item)
            }
          }

        } catch (err) {
          console.error(`${region.id} 데이터 조회 오류:`, err)
        }
      }

      // 정렬: 최신순
      confirmed.sort((a, b) => new Date(b.finalConfirmedAt) - new Date(a.finalConfirmedAt))
      pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      console.log(`최종 확정 완료: ${confirmed.length}건, 대기: ${pending.length}건`)

      setConfirmedList(confirmed)
      setPendingList(pending)

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

  // 검색 필터
  const filterBySearch = (list) => {
    if (!searchQuery.trim()) return list
    const query = searchQuery.toLowerCase()
    return list.filter(item =>
      item.creatorName.toLowerCase().includes(query) ||
      item.campaignTitle.toLowerCase().includes(query) ||
      item.campaignBrand?.toLowerCase().includes(query)
    )
  }

  // 통계 계산
  const getStats = () => {
    const totalConfirmed = confirmedList.length
    const paidCount = confirmedList.filter(c => c.isPaid).length
    const unpaidCount = totalConfirmed - paidCount
    const pendingCount = pendingList.length

    return { totalConfirmed, paidCount, unpaidCount, pendingCount }
  }

  const stats = getStats()

  // 수동 포인트 지급
  const handleManualPayment = async (item) => {
    setProcessing(true)
    try {
      const response = await fetch('/.netlify/functions/check-unpaid-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_pay',
          region: item.region,
          submissionId: item.id,
          userId: item.userId,
          campaignId: item.campaignId,
          amount: item.pointAmount
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('포인트가 지급되었습니다.')
        setPaymentModal(null)
        fetchData()
      } else {
        throw new Error(result.error || '지급 실패')
      }
    } catch (error) {
      console.error('수동 지급 오류:', error)
      alert(`지급 실패: ${error.message}`)
    } finally {
      setProcessing(false)
    }
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
            <h1 className="text-2xl font-bold text-gray-900">캠페인 최종 확정 관리</h1>
            <p className="text-gray-600 mt-1">최종 확정 여부 및 포인트 지급 현황 확인</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600">최종 확정 완료</p>
                  <p className="text-2xl font-bold text-green-700">{stats.totalConfirmed}건</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600">포인트 지급 완료</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.paidCount}건</p>
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
                  <p className="text-sm text-red-600">지급 미완료</p>
                  <p className="text-2xl font-bold text-red-700">{stats.unpaidCount}건</p>
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
                  <p className="text-sm text-yellow-600">확정 대기</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.pendingCount}건</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 검색 */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="크리에이터 이름, 캠페인명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="confirmed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              최종 확정 완료 ({stats.totalConfirmed})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              확정 대기 ({stats.pendingCount})
            </TabsTrigger>
          </TabsList>

          {/* 최종 확정 완료 탭 */}
          <TabsContent value="confirmed">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">최종 확정 완료 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {filterBySearch(confirmedList).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>데이터가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filterBySearch(confirmedList).map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.isPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={item.regionInfo.color}>
                            {item.regionInfo.flag}
                          </Badge>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.creatorName}</p>
                              {item.isPaid ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <Check className="w-3 h-3 mr-1" />
                                  지급완료
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <X className="w-3 h-3 mr-1" />
                                  미지급
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{item.campaignTitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {item.isPaid ? (
                                <span className="text-green-600">{item.paidAmount?.toLocaleString()}P 지급</span>
                              ) : (
                                <span className="text-red-600">{item.pointAmount?.toLocaleString()}P 미지급</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              확정: {new Date(item.finalConfirmedAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>

                          {!item.isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPaymentModal(item)}
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              지급
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/campaigns/${item.campaignId}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 확정 대기 탭 */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">최종 확정 대기 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {filterBySearch(pendingList).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>대기 중인 건이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filterBySearch(pendingList).map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 border-yellow-200"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={item.regionInfo.color}>
                            {item.regionInfo.flag}
                          </Badge>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.creatorName}</p>
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Clock className="w-3 h-3 mr-1" />
                                확정 대기
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{item.campaignTitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-600">
                              {item.pointAmount?.toLocaleString()}P (예정)
                            </p>
                            <p className="text-xs text-gray-400">
                              상태: {item.status}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/campaigns/${item.campaignId}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 수동 지급 모달 */}
      <Dialog open={!!paymentModal} onOpenChange={() => setPaymentModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>포인트 수동 지급</DialogTitle>
          </DialogHeader>
          {paymentModal && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{paymentModal.creatorName}</p>
                <p className="text-sm text-gray-500">{paymentModal.campaignTitle}</p>
                <p className="text-lg font-bold text-blue-600 mt-2">
                  {paymentModal.pointAmount?.toLocaleString()}P
                </p>
              </div>
              <p className="text-sm text-gray-600">
                위 크리에이터에게 포인트를 지급하시겠습니까?
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(null)}>
              취소
            </Button>
            <Button
              onClick={() => handleManualPayment(paymentModal)}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              지급하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
