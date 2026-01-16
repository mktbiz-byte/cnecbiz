import React, { useState, useEffect } from 'react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, Clock, Search, Filter, CreditCard, Building2, FileText, Coins } from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import BankTransactionsTab from './BankTransactionsTab'
import TaxInvoiceRequestsTab from './TaxInvoiceRequestsTab'
import CreatorPointPaymentsTab from './CreatorPointPaymentsTab'

export default function PointsChargeManagement() {
  const [activeTab, setActiveTab] = useState('requests') // requests, transactions, tax_invoices
  const [chargeRequests, setChargeRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, completed, rejected
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [confirmModal, setConfirmModal] = useState(false)
  
  // 수동 입금 확인 폼
  const [depositDate, setDepositDate] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositorName, setDepositorName] = useState('')
  const [memo, setMemo] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // 미수금 선지급 폼
  const [creditModal, setCreditModal] = useState(false)
  const [creditForm, setCreditForm] = useState({
    companyId: '',
    amount: '',
    quantity: 1,
    packageAmount: '',
    depositorName: '',
    expectedPaymentDate: '',
    creditNotes: '',
    needsTaxInvoice: false,
    taxInvoiceInfo: {
      companyName: '',
      businessNumber: '',
      ceoName: '',
      email: ''
    }
  })
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    fetchChargeRequests()
    fetchCompanies()
  }, [filter])

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('companies')
        .select('user_id, company_name, email')
        .order('company_name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('회사 목록 조회 오류:', error)
    }
  }

  const fetchChargeRequests = async () => {
    setLoading(true)
    try {
      let query = supabaseBiz
        .from('points_charge_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: requests, error } = await query

      if (error) throw error

      // Manually fetch company data for each request
      if (requests && requests.length > 0) {
        const companyIds = [...new Set(requests.map(r => r.company_id).filter(Boolean))]
        const { data: companiesData } = await supabaseBiz
          .from('companies')
          .select('user_id, company_name, email, phone, contact_person')
          .in('user_id', companyIds)

        const companiesMap = {}
        companiesData?.forEach(c => {
          companiesMap[c.user_id] = c
        })

        // 취소된 캠페인의 충전 신청 확인 (is_cancelled 필드가 없으므로 status='cancelled' 사용)
        const campaignIds = requests
          .map(r => r.bank_transfer_info?.campaign_id || r.related_campaign_id)
          .filter(Boolean)
        
        let cancelledCampaignIds = []
        if (campaignIds.length > 0 && supabaseKorea) {
          // campaigns 테이블은 supabaseKorea에 있음
          const { data: campaigns } = await supabaseKorea
            .from('campaigns')
            .select('id, status')
            .in('id', campaignIds)
            .eq('status', 'cancelled')

          cancelledCampaignIds = campaigns?.map(c => c.id) || []
        }

        const enrichedRequests = requests
          .map(req => ({
            ...req,
            companies: companiesMap[req.company_id] || null,
            is_cancelled_campaign: cancelledCampaignIds.includes(req.bank_transfer_info?.campaign_id || req.related_campaign_id)
          }))
          .filter(req => !req.is_cancelled_campaign)  // 취소된 캠페인 제외

        setChargeRequests(enrichedRequests)
      } else {
        setChargeRequests([])
      }
    } catch (error) {
      console.error('충전 신청 조회 오류:', error)
      alert('충전 신청 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!selectedRequest) return

    if (!depositDate || !depositAmount || !depositorName) {
      alert('입금일, 입금액, 입금자명을 모두 입력해주세요.')
      return
    }

    setProcessing(true)

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const response = await fetch('/.netlify/functions/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chargeRequestId: selectedRequest.id,
          adminUserId: user.id,
          depositDate,
          depositAmount: parseInt(depositAmount),
          depositorName,
          memo
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '입금 확인 처리에 실패했습니다.')
      }

      alert(result.message)
      setConfirmModal(false)
      setSelectedRequest(null)
      resetForm()
      fetchChargeRequests()

    } catch (error) {
      console.error('입금 확인 오류:', error)
      alert(error.message)
    } finally {
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setDepositDate('')
    setDepositAmount('')
    setDepositorName('')
    setMemo('')
  }

  const resetCreditForm = () => {
    setCreditForm({
      companyId: '',
      amount: '',
      quantity: 1,
      packageAmount: '',
      depositorName: '',
      expectedPaymentDate: '',
      creditNotes: '',
      needsTaxInvoice: false,
      taxInvoiceInfo: {
        companyName: '',
        businessNumber: '',
        ceoName: '',
        email: ''
      }
    })
  }

  const handleCreateCredit = async () => {
    if (!creditForm.companyId || !creditForm.amount || !creditForm.depositorName || !creditForm.expectedPaymentDate) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    if (creditForm.needsTaxInvoice) {
      const { companyName, businessNumber, ceoName, email } = creditForm.taxInvoiceInfo
      if (!companyName || !businessNumber || !ceoName || !email) {
        alert('세금계산서 필수 정보를 모두 입력해주세요.')
        return
      }
    }

    setProcessing(true)

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const response = await fetch('/.netlify/functions/create-credit-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...creditForm,
          amount: parseInt(creditForm.amount),
          adminUserId: user.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '미수금 선지급에 실패했습니다.')
      }

      alert(result.message)
      setCreditModal(false)
      resetCreditForm()
      fetchChargeRequests()

    } catch (error) {
      console.error('미수금 선지급 오류:', error)
      alert(error.message)
    } finally {
      setProcessing(false)
    }
  }

  const openConfirmModal = (request) => {
    setSelectedRequest(request)
    setDepositAmount(request.amount.toString())
    setDepositDate(new Date().toISOString().split('T')[0])
    setConfirmModal(true)
  }

  const handlePrechargePoints = async (requestId) => {
    if (!confirm('포인트를 선충전하시겠습니까? (입금 전 충전 - 미수금으로 기록됩니다)')) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/.netlify/functions/precharge-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargeRequestId: requestId })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '포인트 선충전 실패')
      }

      alert(`포인트 선충전 완료!\n충전 포인트: ${result.points.toLocaleString()}P\n새 잔액: ${result.newBalance.toLocaleString()}P\n미수금: ${result.receivableAmount.toLocaleString()}원`)
      fetchRequests()
    } catch (error) {
      console.error('포인트 선충전 오류:', error)
      alert('포인트 선충전 실패: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelRequest = async (requestId) => {
    if (!confirm('충전 신청을 취소하시겠습니까?')) {
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabaseBiz
        .from('points_charge_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)

      if (error) throw error

      alert('충전 신청이 취소되었습니다.')
      fetchChargeRequests()
    } catch (error) {
      console.error('취소 오류:', error)
      alert('취소 처리에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const filteredRequests = chargeRequests.filter(req => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      req.companies?.company_name?.toLowerCase().includes(searchLower) ||
      req.companies?.email?.toLowerCase().includes(searchLower) ||
      req.id.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '입금 대기', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { text: '완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { text: '반려', color: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { text: '입금 취소', color: 'bg-gray-100 text-gray-800', icon: XCircle }
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    )
  }

  const stats = {
    total: chargeRequests.filter(r => r.status !== 'cancelled').length,
    pending: chargeRequests.filter(r => r.status === 'pending').length,
    completed: chargeRequests.filter(r => r.status === 'completed' || r.status === 'confirmed').length,
    totalAmount: chargeRequests
      .filter(r => r.status === 'completed' || r.status === 'confirmed')
      .reduce((sum, r) => sum + r.amount, 0)
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="p-6 space-y-6 lg:ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="p-6 space-y-6 lg:ml-64 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">포인트 충전 관리</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreditModal(true)} className="bg-purple-600 hover:bg-purple-700">
            미수금 선지급
          </Button>
          <Button onClick={fetchChargeRequests} variant="outline">
            새로고침
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600">전체 신청</div>
            <div className="text-3xl font-bold mt-2">{stats.total}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-yellow-600">입금 대기</div>
            <div className="text-3xl font-bold mt-2 text-yellow-600">{stats.pending}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-green-600">완료</div>
            <div className="text-3xl font-bold mt-2 text-green-600">{stats.completed}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-blue-600">총 충전액</div>
            <div className="text-3xl font-bold mt-2 text-blue-600">
              {stats.totalAmount.toLocaleString()}원
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 네비게이션 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                충전 신청 관리
              </div>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                계좌 거래 내역
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tax_invoices')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'tax_invoices'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                세금계산서 신청 내역
              </div>
            </button>
            <button
              onClick={() => setActiveTab('creator_payments')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'creator_payments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                크리에이터 포인트 지급
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'transactions' ? (
        <BankTransactionsTab />
      ) : activeTab === 'tax_invoices' ? (
        <TaxInvoiceRequestsTab />
      ) : activeTab === 'creator_payments' ? (
        <CreatorPointPaymentsTab />
      ) : (
        <>
      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                전체
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
              >
                입금 대기
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilter('completed')}
              >
                완료
              </Button>
              <Button
                variant={filter === 'cancelled' ? 'default' : 'outline'}
                onClick={() => setFilter('cancelled')}
              >
                입금 취소
              </Button>
              <Button
                variant={filter === 'confirmed' ? 'default' : 'outline'}
                onClick={() => setFilter('confirmed')}
              >
                입금확인
              </Button>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="회사명, 이메일, ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 충전 신청 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>충전 신청 내역 ({filteredRequests.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">로딩 중...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              충전 신청 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">신청일시</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">회사명</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">입금자명</th>
                    <th className="p-4 text-right text-sm font-medium text-gray-700">금액</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">미수금</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">입금예정일</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">세금계산서</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">상태</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="p-4 text-sm">
                        {new Date(request.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{request.companies?.company_name || '-'}</div>
                        <div className="text-sm text-gray-500">{request.companies?.email}</div>
                      </td>
                      <td className="p-4 text-sm">{request.depositor_name || '-'}</td>
                      <td className="p-4 text-right font-medium">
                        {request.amount.toLocaleString()}원
                      </td>
                      <td className="p-4 text-sm">
                        {request.is_credit ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            미수금
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {request.expected_payment_date ? (
                          <div>
                            <div>{new Date(request.expected_payment_date).toLocaleDateString('ko-KR')}</div>
                            {request.is_credit && request.status === 'pending' && 
                             new Date(request.expected_payment_date) < new Date() && (
                              <span className="text-xs text-red-600 font-medium">미입금</span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-sm">
                        {request.needs_tax_invoice ? '필요' : '불필요'}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openConfirmModal(request)}
                              >
                                입금 확인
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handlePrechargePoints(request.id)}
                              >
                                포인트 선충전
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleCancelRequest(request.id)}
                              >
                                취소
                              </Button>
                            </>
                          )}
                          {request.status === 'completed' && (
                            <div className="text-sm text-gray-500">
                              {request.confirmed_at && new Date(request.confirmed_at).toLocaleDateString('ko-KR')}
                            </div>
                          )}
                          {request.status === 'cancelled' && (
                            <div className="text-sm text-gray-500">
                              취소됨
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 입금 확인 모달 */}
      {confirmModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl bg-white">
            <CardHeader>
              <CardTitle>입금 확인 처리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">회사명:</span>
                  <span className="font-medium">{selectedRequest.companies?.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">신청 금액:</span>
                  <span className="font-medium">{selectedRequest.amount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">신청일시:</span>
                  <span className="font-medium">
                    {new Date(selectedRequest.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">입금일 *</label>
                  <Input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">입금액 *</label>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="실제 입금된 금액"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">입금자명 *</label>
                  <Input
                    type="text"
                    value={depositorName}
                    onChange={(e) => setDepositorName(e.target.value)}
                    placeholder="입금자명 입력"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">메모 (선택)</label>
                  <textarea
                    className="w-full p-3 border rounded-lg"
                    rows="3"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="관리자 메모 (선택사항)"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleConfirmPayment}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? '처리 중...' : '입금 확인 완료'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmModal(false)
                    setSelectedRequest(null)
                    resetForm()
                  }}
                  disabled={processing}
                >
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 미수금 선지급 모달 */}
      {creditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <CardTitle>미수금 선지급</CardTitle>
              <p className="text-sm text-gray-600">
                기업에게 포인트를 먼저 지급하고 나중에 입금받는 시스템입니다.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">회사 선택 *</label>
                <select
                  className="w-full p-3 border rounded-lg"
                  value={creditForm.companyId}
                  onChange={(e) => setCreditForm({ ...creditForm, companyId: e.target.value })}
                  required
                >
                  <option value="">회사를 선택하세요</option>
                  {companies.map((company) => (
                    <option key={company.user_id} value={company.user_id}>
                      {company.company_name} ({company.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">금액 *</label>
                <Input
                  type="number"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                  placeholder="10000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">수량</label>
                <Input
                  type="number"
                  value={creditForm.quantity}
                  onChange={(e) => setCreditForm({ ...creditForm, quantity: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">입금자명 *</label>
                <Input
                  type="text"
                  value={creditForm.depositorName}
                  onChange={(e) => setCreditForm({ ...creditForm, depositorName: e.target.value })}
                  placeholder="입금자명 입력"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">입금 예정일 *</label>
                <Input
                  type="date"
                  value={creditForm.expectedPaymentDate}
                  onChange={(e) => setCreditForm({ ...creditForm, expectedPaymentDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">메모</label>
                <textarea
                  className="w-full p-3 border rounded-lg"
                  rows="3"
                  value={creditForm.creditNotes}
                  onChange={(e) => setCreditForm({ ...creditForm, creditNotes: e.target.value })}
                  placeholder="미수금 관련 메모"
                />
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={creditForm.needsTaxInvoice}
                    onChange={(e) => setCreditForm({ ...creditForm, needsTaxInvoice: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">세금계산서 발행 필요</span>
                </label>

                {creditForm.needsTaxInvoice && (
                  <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">회사명 *</label>
                      <Input
                        type="text"
                        value={creditForm.taxInvoiceInfo.companyName}
                        onChange={(e) => setCreditForm({
                          ...creditForm,
                          taxInvoiceInfo: { ...creditForm.taxInvoiceInfo, companyName: e.target.value }
                        })}
                        placeholder="회사명"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">사업자등록번호 *</label>
                      <Input
                        type="text"
                        value={creditForm.taxInvoiceInfo.businessNumber}
                        onChange={(e) => setCreditForm({
                          ...creditForm,
                          taxInvoiceInfo: { ...creditForm.taxInvoiceInfo, businessNumber: e.target.value }
                        })}
                        placeholder="000-00-00000"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">대표자명 *</label>
                      <Input
                        type="text"
                        value={creditForm.taxInvoiceInfo.ceoName}
                        onChange={(e) => setCreditForm({
                          ...creditForm,
                          taxInvoiceInfo: { ...creditForm.taxInvoiceInfo, ceoName: e.target.value }
                        })}
                        placeholder="대표자명"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">이메일 *</label>
                      <Input
                        type="email"
                        value={creditForm.taxInvoiceInfo.email}
                        onChange={(e) => setCreditForm({
                          ...creditForm,
                          taxInvoiceInfo: { ...creditForm.taxInvoiceInfo, email: e.target.value }
                        })}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreateCredit}
                  disabled={processing}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {processing ? '처리 중...' : '선지급 실행'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreditModal(false)
                    resetCreditForm()
                  }}
                  disabled={processing}
                >
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}
      </div>
    </>
  )
}

