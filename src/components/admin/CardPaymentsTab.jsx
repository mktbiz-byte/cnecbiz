import React, { useState, useEffect } from 'react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, Search, Loader2, CreditCard, AlertTriangle } from 'lucide-react'

export default function CardPaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // all, completed, refunded
  const [cancelModal, setCancelModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchCardPayments()
  }, [])

  const fetchCardPayments = async () => {
    setLoading(true)
    try {
      if (!supabaseBiz) {
        console.error('[CardPaymentsTab] supabaseBiz가 없습니다.')
        setLoading(false)
        return
      }

      // payments 테이블에서 toss_card 결제만 조회 (payments 테이블은 supabaseBiz에 있음)
      const { data: paymentsData, error } = await supabaseBiz
        .from('payments')
        .select('*')
        .eq('payment_method', 'toss_card')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([])
        setLoading(false)
        return
      }

      // 캠페인 정보 조회 (supabaseBiz + supabaseKorea 모두 확인)
      // campaign_id가 없는 경우 bank_transfer_info.campaignId에서 가져옴
      const campaignIds = [...new Set(paymentsData.map(p => p.campaign_id || p.bank_transfer_info?.campaignId).filter(Boolean))]
      let campaignsMap = {}
      if (campaignIds.length > 0) {
        // supabaseBiz에서 먼저 조회
        const { data: bizCampaigns } = await supabaseBiz
          .from('campaigns')
          .select('id, title, company_email, brand, campaign_type')
          .in('id', campaignIds)
        bizCampaigns?.forEach(c => { campaignsMap[c.id] = c })

        // supabaseKorea에서 나머지 조회
        const remainingIds = campaignIds.filter(id => !campaignsMap[id])
        if (remainingIds.length > 0 && supabaseKorea) {
          const { data: koreaCampaigns } = await supabaseKorea
            .from('campaigns')
            .select('id, title, company_email, brand, campaign_type')
            .in('id', remainingIds)
          koreaCampaigns?.forEach(c => { campaignsMap[c.id] = c })
        }
      }

      // 회사 정보 조회 (company_email 기반)
      const companyEmails = [...new Set(
        Object.values(campaignsMap).map(c => c.company_email).filter(Boolean)
      )]
      let companiesMap = {}
      if (companyEmails.length > 0 && supabaseBiz) {
        const { data: companies } = await supabaseBiz
          .from('companies')
          .select('email, company_name')
          .in('email', companyEmails)

        companies?.forEach(c => { companiesMap[c.email] = c })
      }

      // 데이터 조합 (campaign_id 또는 bank_transfer_info.campaignId 사용)
      const enriched = paymentsData.map(p => {
        const effectiveCampaignId = p.campaign_id || p.bank_transfer_info?.campaignId
        const campaign = campaignsMap[effectiveCampaignId] || null
        const company = campaign?.company_email ? companiesMap[campaign.company_email] : null
        return {
          ...p,
          campaign,
          companyName: company?.company_name || campaign?.brand || '-'
        }
      })

      setPayments(enriched)
    } catch (error) {
      console.error('[CardPaymentsTab] 조회 오류:', error)
      alert('카드결제 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const openCancelModal = (payment) => {
    setSelectedPayment(payment)
    setCancelReason('')
    setCancelModal(true)
  }

  const handleCancelPayment = async () => {
    if (!selectedPayment || !cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.')
      return
    }

    const paymentKey = selectedPayment.bank_transfer_info?.paymentKey
    if (!paymentKey) {
      alert('결제 키 정보가 없어 취소할 수 없습니다.')
      return
    }

    if (!confirm(`정말 결제를 취소하시겠습니까?\n\n캠페인: ${selectedPayment.campaign?.title || '-'}\n금액: ${selectedPayment.amount?.toLocaleString()}원\n사유: ${cancelReason}`)) {
      return
    }

    setProcessing(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const response = await fetch('/.netlify/functions/cancel-toss-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          paymentKey,
          cancelReason,
          adminUserId: user?.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '결제 취소에 실패했습니다.')
      }

      alert('결제가 취소되었습니다.')
      setCancelModal(false)
      setSelectedPayment(null)
      setCancelReason('')
      fetchCardPayments()
    } catch (error) {
      console.error('[CardPaymentsTab] 취소 오류:', error)
      alert('결제 취소 실패: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      completed: { text: '결제 완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      refunded: { text: '취소/환불', color: 'bg-red-100 text-red-800', icon: XCircle },
      pending: { text: '대기', color: 'bg-yellow-100 text-yellow-800', icon: null }
    }
    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-800', icon: null }
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {Icon && <Icon className="w-4 h-4" />}
        {badge.text}
      </span>
    )
  }

  const getCardInfo = (bankTransferInfo) => {
    if (!bankTransferInfo?.card) return '-'
    const card = bankTransferInfo.card
    return `${card.number || ''} (${card.cardType === 'CREDIT' ? '신용' : '체크'})`
  }

  const filteredPayments = payments.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (
      p.companyName?.toLowerCase().includes(s) ||
      p.campaign?.title?.toLowerCase().includes(s) ||
      p.campaign?.company_email?.toLowerCase().includes(s) ||
      p.bank_transfer_info?.paymentKey?.toLowerCase().includes(s)
    )
  })

  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    refunded: payments.filter(p => p.status === 'refunded').length,
    totalAmount: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">카드결제 내역 로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">전체 카드결제</div>
            <div className="text-2xl font-bold mt-1">{stats.total}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-green-600">결제 완료</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{stats.completed}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-red-600">취소/환불</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{stats.refunded}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-blue-600">결제 총액</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{stats.totalAmount.toLocaleString()}원</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 & 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>전체</Button>
              <Button variant={filter === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('completed')}>결제 완료</Button>
              <Button variant={filter === 'refunded' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('refunded')}>취소/환불</Button>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="회사명, 캠페인명, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCardPayments}>새로고침</Button>
          </div>
        </CardContent>
      </Card>

      {/* 결제 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            카드결제 내역 ({filteredPayments.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              카드결제 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">결제일시</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">회사명</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">캠페인</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">카드정보</th>
                    <th className="p-3 text-right text-sm font-medium text-gray-700">금액</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">상태</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        {payment.paid_at
                          ? new Date(payment.paid_at).toLocaleString('ko-KR')
                          : new Date(payment.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-sm">{payment.companyName}</div>
                        <div className="text-xs text-gray-500">{payment.campaign?.company_email || ''}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">{payment.campaign?.title || '-'}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {getCardInfo(payment.bank_transfer_info)}
                      </td>
                      <td className="p-3 text-right font-medium text-sm">
                        {(payment.amount || 0).toLocaleString()}원
                      </td>
                      <td className="p-3">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="p-3">
                        {payment.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openCancelModal(payment)}
                          >
                            결제 취소
                          </Button>
                        )}
                        {payment.status === 'refunded' && (
                          <div className="text-xs text-gray-500">
                            {payment.bank_transfer_info?.cancelReason || '취소됨'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결제 취소 모달 */}
      {cancelModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                카드결제 취소
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">캠페인:</span>
                  <span className="font-medium">{selectedPayment.campaign?.title || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">회사:</span>
                  <span className="font-medium">{selectedPayment.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">결제 금액:</span>
                  <span className="font-bold text-red-600">{(selectedPayment.amount || 0).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">결제일:</span>
                  <span className="font-medium">
                    {selectedPayment.paid_at
                      ? new Date(selectedPayment.paid_at).toLocaleString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">카드:</span>
                  <span className="font-medium">{getCardInfo(selectedPayment.bank_transfer_info)}</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">
                  결제 취소 시 고객에게 전액 환불됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">취소 사유 *</label>
                <textarea
                  className="w-full p-3 border rounded-lg"
                  rows="3"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="결제 취소 사유를 입력해주세요"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleCancelPayment}
                  disabled={processing || !cancelReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      취소 처리 중...
                    </>
                  ) : (
                    '결제 취소 확인'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelModal(false)
                    setSelectedPayment(null)
                    setCancelReason('')
                  }}
                  disabled={processing}
                >
                  닫기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
