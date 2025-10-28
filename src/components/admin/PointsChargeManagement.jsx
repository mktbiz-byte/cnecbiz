import { useState, useEffect } from 'react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react'

export default function PointsChargeManagement() {
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

  useEffect(() => {
    fetchChargeRequests()
  }, [filter])

  const fetchChargeRequests = async () => {
    setLoading(true)
    try {
      let query = supabaseBiz
        .from('points_charge_requests')
        .select(`
          *,
          companies:company_id (
            company_name,
            email,
            phone,
            contact_person
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setChargeRequests(data || [])
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

  const openConfirmModal = (request) => {
    setSelectedRequest(request)
    setDepositAmount(request.amount.toString())
    setDepositDate(new Date().toISOString().split('T')[0])
    setConfirmModal(true)
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
      rejected: { text: '반려', color: 'bg-red-100 text-red-800', icon: XCircle }
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
    total: chargeRequests.length,
    pending: chargeRequests.filter(r => r.status === 'pending').length,
    completed: chargeRequests.filter(r => r.status === 'completed').length,
    totalAmount: chargeRequests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.amount, 0)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">포인트 충전 관리</h1>
        <Button onClick={fetchChargeRequests} variant="outline">
          새로고침
        </Button>
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
                    <th className="p-4 text-left text-sm font-medium text-gray-700">담당자</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">연락처</th>
                    <th className="p-4 text-right text-sm font-medium text-gray-700">금액</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700">결제방법</th>
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
                      <td className="p-4 text-sm">{request.companies?.contact_person || '-'}</td>
                      <td className="p-4 text-sm">{request.companies?.phone || '-'}</td>
                      <td className="p-4 text-right font-medium">
                        {request.amount.toLocaleString()}원
                      </td>
                      <td className="p-4 text-sm">
                        {request.payment_method === 'bank_transfer' ? '계좌이체' : 'Stripe'}
                      </td>
                      <td className="p-4 text-sm">
                        {request.needs_tax_invoice ? '필요' : '불필요'}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="p-4">
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => openConfirmModal(request)}
                          >
                            입금 확인
                          </Button>
                        )}
                        {request.status === 'completed' && (
                          <div className="text-sm text-gray-500">
                            {request.confirmed_at && new Date(request.confirmed_at).toLocaleDateString('ko-KR')}
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

      {/* 입금 확인 모달 */}
      {confirmModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
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
                  <label className="block text-sm font-medium mb-2">입금일 *</label>
                  <Input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">입금액 *</label>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="실제 입금된 금액"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">입금자명 *</label>
                  <Input
                    type="text"
                    value={depositorName}
                    onChange={(e) => setDepositorName(e.target.value)}
                    placeholder="입금자명 입력"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">메모 (선택)</label>
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
    </div>
  )
}

