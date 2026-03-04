import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Loader2, Users, ChevronDown, ChevronUp,
  Phone, Mail, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock,
  Search, Check, X, CreditCard, History, Eye, User
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 지역 설정
const REGIONS = {
  korea: { label: '한국', flag: '🇰🇷', color: 'bg-blue-50 text-blue-700', shortCode: 'KR' },
  japan: { label: '일본', flag: '🇯🇵', color: 'bg-red-50 text-red-600', shortCode: 'JP' },
  us: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700', shortCode: 'US' }
}

export default function UnpaidCampaignsManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')

  // 데이터: confirmed = 지급 확인, unpaid = 미지급 건, pendingConfirmation = 최종확정 대기
  const [confirmedList, setConfirmedList] = useState([])
  const [unpaidList, setUnpaidList] = useState([])
  const [pendingList, setPendingList] = useState([])

  // 수동 지급 모달
  const [paymentModal, setPaymentModal] = useState(null)
  const [processing, setProcessing] = useState(false)

  // 포인트 지급 이력 모달
  const [historyModal, setHistoryModal] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])

  // 데이터 로드
  const fetchData = async () => {
    setRefreshing(true)

    try {
      const response = await fetch('/.netlify/functions/get-final-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' })
      })

      const result = await response.json()

      if (result.success) {
        setConfirmedList(result.confirmed || [])
        setUnpaidList(result.unpaid || [])
        setPendingList(result.pendingConfirmation || [])
        console.log(`데이터 로드 완료 - 지급확인: ${(result.confirmed || []).length}건, 미지급: ${(result.unpaid || []).length}건, 최종확정대기: ${(result.pendingConfirmation || []).length}건`)
      } else {
        console.error('데이터 로드 실패:', result.error)
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 포인트 지급 이력 조회
  const fetchPaymentHistory = async (item) => {
    setHistoryModal(item)
    setHistoryLoading(true)

    try {
      const response = await fetch('/.netlify/functions/get-final-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_payment_history',
          region: item.region,
          userId: item.userId,
          campaignId: item.campaignId
        })
      })

      const result = await response.json()

      if (result.success) {
        const transactions = (result.transactions || []).map(t => ({
          ...t,
          type: t.transaction_type || t.type || '알 수 없음',
          source: 'point_transactions'
        }))
        transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setPaymentHistory(transactions)
      }
    } catch (error) {
      console.error('이력 조회 오류:', error)
    } finally {
      setHistoryLoading(false)
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
      (item.creatorName || '').toLowerCase().includes(query) ||
      (item.campaignTitle || '').toLowerCase().includes(query) ||
      (item.campaignBrand || '').toLowerCase().includes(query)
    )
  }

  // 통계 계산
  const confirmedCount = confirmedList.length
  const unpaidCount = unpaidList.length
  const pendingCount = pendingList.length
  const totalPaidAmount = confirmedList.reduce((sum, c) => sum + (c.paidAmount || 0), 0)
  const totalUnpaidAmount = unpaidList.reduce((sum, u) => sum + (u.pointAmount || 0), 0)
  const totalPendingAmount = pendingList.reduce((sum, p) => sum + (p.pointAmount || 0), 0)

  // 수동 지급완료 처리 (이미 지급된 건을 기록만 추가)
  const handleMarkAsPaid = async (item) => {
    if (!confirm(`${item.creatorName || '크리에이터'}님의 ${item.campaignTitle || '캠페인'} 건을 지급완료로 처리하시겠습니까?\n\n※ 실제 포인트가 지급되지 않고, 지급 기록만 추가됩니다.`)) {
      return
    }
    setProcessing(true)
    try {
      const response = await fetch('/.netlify/functions/get-final-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_as_paid',
          region: item.region,
          userId: item.userId,
          campaignId: item.campaignId,
          submissionId: item.id,
          amount: item.pointAmount,
          campaignTitle: item.campaignTitle
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('지급완료로 처리되었습니다.')
        fetchData()
      } else {
        throw new Error(result.error || '처리 실패')
      }
    } catch (error) {
      console.error('지급완료 처리 오류:', error)
      alert(`처리 실패: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

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

  // 아이템 렌더링 (type: 'confirmed' | 'unpaid' | 'pending')
  const renderItem = (item, idx, type = 'confirmed') => {
    const regionInfo = REGIONS[item.region] || { label: item.region, flag: '🌐', color: 'bg-gray-100 text-gray-700', shortCode: '??' }
    const hasName = item.creatorName && item.creatorName !== '이름 없음'
    const hasCampaign = item.campaignTitle && item.campaignTitle !== '캠페인 정보 없음'

    const bgClass = type === 'confirmed'
      ? 'bg-green-50 border-green-200'
      : type === 'unpaid'
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'

    return (
      <div
        key={`${item.id}-${idx}`}
        className={`p-4 rounded-lg border ${bgClass}`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* 왼쪽: 크리에이터 & 캠페인 정보 */}
          <div className="flex items-start gap-3 flex-1">
            <Badge className={`${regionInfo.color} shrink-0`}>
              {regionInfo.shortCode}
            </Badge>
            <div className="min-w-0 flex-1">
              {/* 크리에이터 정보 */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className={`font-medium ${hasName ? 'text-gray-900' : 'text-red-500'}`}>
                    {hasName ? item.creatorName : '크리에이터 정보 없음'}
                  </span>
                </div>
                {type === 'confirmed' && (
                  <Badge className="bg-green-100 text-green-700">
                    <Check className="w-3 h-3 mr-1" />
                    지급확인
                  </Badge>
                )}
                {type === 'unpaid' && (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    미지급
                  </Badge>
                )}
                {type === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3 mr-1" />
                    최종확정 대기
                  </Badge>
                )}
              </div>

              {/* 캠페인 정보 */}
              <div className="mt-1 text-sm">
                <span className={hasCampaign ? 'text-gray-600' : 'text-red-400'}>
                  {hasCampaign ? item.campaignTitle : '캠페인 정보 없음'}
                </span>
                {item.campaignBrand && (
                  <span className="text-gray-400 ml-2">({item.campaignBrand})</span>
                )}
              </div>

              {/* SNS URL (pending일 때) */}
              {type === 'pending' && item.snsUploadUrl && (
                <div className="mt-1">
                  <a
                    href={item.snsUploadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    SNS 링크
                  </a>
                </div>
              )}

              {/* 연락처 */}
              {(item.email || item.phone) && (
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                  {item.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {item.email}
                    </span>
                  )}
                  {item.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {item.phone}
                    </span>
                  )}
                </div>
              )}

              {/* ID 정보 */}
              <div className="mt-1 text-xs text-gray-300">
                User: {item.userId?.slice(0, 8)}... | Campaign: {item.campaignId?.slice(0, 8)}...
              </div>
            </div>
          </div>

          {/* 오른쪽: 포인트 & 액션 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              {type === 'confirmed' ? (
                <>
                  <p className="text-sm font-bold text-green-600">
                    {item.paidAmount?.toLocaleString()}P 지급
                  </p>
                  {item.paidAt && (
                    <p className="text-xs text-gray-400">
                      {new Date(item.paidAt).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </>
              ) : type === 'unpaid' ? (
                <>
                  <p className="text-sm font-bold text-red-600">
                    {item.pointAmount?.toLocaleString() || 0}P 미지급
                  </p>
                  {item.finalConfirmedAt && (
                    <p className="text-xs text-gray-400">
                      확정: {new Date(item.finalConfirmedAt).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    상태: {item.status || '없음'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-amber-600">
                    {item.pointAmount?.toLocaleString() || 0}P (예정)
                  </p>
                  <p className="text-xs text-gray-400">
                    영상 승인 완료
                  </p>
                </>
              )}
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-1">
              {/* 포인트 이력 보기 */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchPaymentHistory(item)}
                title="포인트 지급 이력"
              >
                <History className="w-4 h-4" />
              </Button>

              {/* 미지급 건에 대한 액션 */}
              {type === 'unpaid' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsPaid(item)}
                    disabled={processing}
                    title="이미 지급된 건을 지급완료로 표시 (기록만 추가)"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    지급완료 처리
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPaymentModal(item)}
                    title="실제 포인트 지급"
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    포인트 지급
                  </Button>
                </>
              )}

              {/* 캠페인 상세 (최종 확정 하러 가기) */}
              {item.campaignId && (
                <Button
                  size="sm"
                  variant={type === 'pending' ? 'default' : 'ghost'}
                  className={type === 'pending' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                  onClick={() => navigate(`/admin/campaigns/${item.campaignId}?region=${item.region}`)}
                  title={type === 'pending' ? '캠페인으로 이동하여 최종 확정' : '캠페인 상세'}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  {type === 'pending' ? '최종 확정' : ''}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">데이터를 불러오는 중...</p>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900">캠페인 관리</h1>
            <p className="text-gray-600 mt-1">point_transactions 기준으로 실제 포인트 지급 현황을 확인합니다</p>
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

        {/* 서브 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => navigate('/admin/campaigns')}>
            📋 전체 캠페인
          </Button>
          <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => navigate('/admin/campaigns/deadlines')}>
            ⏰ 마감일 관리
          </Button>
          <Button variant="default" size="sm" className="whitespace-nowrap">
            💰 포인트 미지급
          </Button>
          <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => navigate('/admin/campaigns/dummy')}>
            🧪 더미 캠페인
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600">지급 확인</p>
                  <p className="text-2xl font-bold text-green-700">{confirmedCount}건</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-full">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-600">최종확정 대기</p>
                  <p className="text-2xl font-bold text-amber-700">{pendingCount}건</p>
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
                  <p className="text-sm text-red-600">미지급 건</p>
                  <p className="text-2xl font-bold text-red-700">{unpaidCount}건</p>
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
                  <p className="text-sm text-blue-600">지급 총액</p>
                  <p className="text-2xl font-bold text-blue-700">{totalPaidAmount.toLocaleString()}P</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-orange-600">대기+미지급 총액</p>
                  <p className="text-2xl font-bold text-orange-700">{(totalPendingAmount + totalUnpaidAmount).toLocaleString()}P</p>
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
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              최종확정 대기 ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="unpaid" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              미지급 건 ({unpaidCount})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              지급 확인 ({confirmedCount})
            </TabsTrigger>
          </TabsList>

          {/* 최종확정 대기 탭 */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>최종확정 대기 목록</span>
                  <span className="text-sm font-normal text-amber-600">
                    영상 승인 완료, 최종 확정 필요 | {pendingCount}건 ({totalPendingAmount.toLocaleString()}P)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingCount > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <Clock className="w-4 h-4 inline mr-1" />
                    아래 크리에이터들은 영상이 승인되었지만 아직 최종 확정이 되지 않았습니다.
                    캠페인 상세에서 &apos;최종 확정&apos; 버튼을 눌러 포인트를 지급해주세요.
                  </div>
                )}
                {filterBySearch(pendingList).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                    <p>모든 승인 건이 최종확정 되었습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterBySearch(pendingList).map((item, idx) => renderItem(item, idx, 'pending'))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 미지급 건 탭 */}
          <TabsContent value="unpaid">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>미지급 건 목록</span>
                  <span className="text-sm font-normal text-red-500">
                    확정/완료 되었지만 point_transactions 기록 없음 | {unpaidCount}건 ({totalUnpaidAmount.toLocaleString()}P)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unpaidCount > 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    아래 항목은 최종확정/완료 상태이지만 point_transactions에 지급 기록이 없는 건입니다.
                    실제 포인트가 지급되지 않았을 수 있으니 확인 후 처리해주세요.
                  </div>
                )}
                {filterBySearch(unpaidList).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                    <p>미지급 건이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterBySearch(unpaidList).map((item, idx) => renderItem(item, idx, 'unpaid'))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 포인트 지급 확인 탭 */}
          <TabsContent value="confirmed">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>포인트 지급 확인 목록</span>
                  <span className="text-sm font-normal text-gray-500">
                    point_transactions 기록 기준 | {confirmedCount}건 ({totalPaidAmount.toLocaleString()}P)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filterBySearch(confirmedList).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>지급 확인된 건이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterBySearch(confirmedList).map((item, idx) => renderItem(item, idx, 'confirmed'))}
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
                <p className="font-medium">{paymentModal.creatorName || '크리에이터'}</p>
                <p className="text-sm text-gray-500">{paymentModal.campaignTitle || '캠페인'}</p>
                <p className="text-lg font-bold text-blue-600 mt-2">
                  {paymentModal.pointAmount?.toLocaleString() || 0}P
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

      {/* 포인트 지급 이력 모달 */}
      <Dialog open={!!historyModal} onOpenChange={() => setHistoryModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              포인트 지급 이력
            </DialogTitle>
          </DialogHeader>
          {historyModal && (
            <div className="space-y-4">
              {/* 사용자 정보 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{historyModal.creatorName || '크리에이터'}</span>
                  <Badge className={REGIONS[historyModal.region]?.color || 'bg-gray-100'}>
                    {REGIONS[historyModal.region]?.shortCode || historyModal.region}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{historyModal.campaignTitle || '캠페인'}</p>
                <p className="text-xs text-gray-400 mt-1">User ID: {historyModal.userId}</p>
              </div>

              {/* 이력 목록 */}
              {historyLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">이력을 불러오는 중...</p>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>포인트 지급 이력이 없습니다</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {paymentHistory.map((record, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        record.amount > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-bold ${record.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {record.amount > 0 ? '+' : ''}{record.amount?.toLocaleString()}P
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.type || '알 수 없음'}
                            {record.description && ` - ${record.description}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(record.created_at).toLocaleDateString('ko-KR')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(record.created_at).toLocaleTimeString('ko-KR')}
                          </p>
                          <Badge variant="outline" className={`text-xs mt-1 ${
                            record.transaction_type === 'campaign_payment' ? 'bg-green-50 text-green-600' : ''
                          }`}>
                            {record.transaction_type === 'campaign_payment' ? '캠페인지급' : 'tx'}
                          </Badge>
                        </div>
                      </div>
                      {record.related_campaign_id && (
                        <p className="text-xs text-green-500 mt-1">
                          Campaign: {record.related_campaign_id?.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModal(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
