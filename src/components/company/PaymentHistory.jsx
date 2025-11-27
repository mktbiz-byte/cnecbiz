import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Receipt, Download, FileText } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import CompanyNavigation from './CompanyNavigation'

export default function PaymentHistory() {
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [payments, setPayments] = useState([])
  const [chargeRequests, setChargeRequests] = useState([])  // 포인트 충전 신청
  const [taxInvoices, setTaxInvoices] = useState([])
  const [pointUsages, setPointUsages] = useState([])  // 캠페인 진행 내역
  const [selectedTab, setSelectedTab] = useState('payments')
  const [loading, setLoading] = useState(false)
  const [selectedTaxInfo, setSelectedTaxInfo] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
      fetchPayments(companyData.id)
      fetchTaxInvoices(companyData.id)
      fetchChargeRequests(user.id)
      fetchPointUsages(user.id)
    }
  }

  const fetchPayments = async (companyId) => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setPayments(data)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChargeRequests = async (userId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('points_charge_requests')
        .select('*')
        .eq('company_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        console.log('[PaymentHistory] 충전 신청 내역:', data)
        setChargeRequests(data)
      }
    } catch (error) {
      console.error('Error fetching charge requests:', error)
    }
  }

  const fetchTaxInvoices = async (companyId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('tax_invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTaxInvoices(data)
      }
    } catch (error) {
      console.error('Error fetching tax invoices:', error)
    }
  }

  const fetchPointUsages = async (userId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('points_transactions')
        .select('*')
        .eq('company_id', userId)
        .eq('type', 'spend')
        .order('created_at', { ascending: false })

      if (!error && data) {
        console.log('[PaymentHistory] 캠페인 진행 내역:', data)
        setPointUsages(data)
      }
    } catch (error) {
      console.error('Error fetching point usages:', error)
    }
  }

  const handleRequestInvoice = async (paymentId) => {
    try {
      const payment = payments.find(p => p.id === paymentId)
      if (!payment) return

      const supplyAmount = Math.floor(payment.amount / 1.1)
      const taxAmount = payment.amount - supplyAmount

      const { error } = await supabaseBiz
        .from('tax_invoices')
        .insert({
          company_id: company.id,
          payment_id: paymentId,
          supply_amount: supplyAmount,
          tax_amount: taxAmount,
          total_amount: payment.amount,
          status: 'pending'
        })

      if (error) throw error

      alert('세금계산서 발급 요청이 완료되었습니다')
      fetchTaxInvoices(company.id)
    } catch (error) {
      console.error('Error requesting invoice:', error)
      alert('발급 요청 실패: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-700',
      confirmed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-gray-100 text-gray-700',
      issued: 'bg-blue-100 text-blue-700'
    }
    const labels = {
      completed: '완료',
      confirmed: '완료',
      pending: '대기중',
      failed: '실패',
      refunded: '환불',
      cancelled: '취소',
      issued: '발급완료'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  // 총 결제 금액 계산 (payments + completed chargeRequests)
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0) +
    chargeRequests.filter(r => r.status === 'completed' || r.status === 'confirmed').reduce((sum, r) => sum + (r.amount || 0), 0)
  
  // 총 결제 건수
  const totalCount = payments.length + chargeRequests.filter(r => r.status === 'completed' || r.status === 'confirmed').length
  
  // 현재 포인트 계산 (충전 완료 건 합계 - 사용 포인트)
  // 충전 포인트 = 금액 / 1.1 (부가세 제외)
  const totalCharged = chargeRequests
    .filter(r => r.status === 'completed' || r.status === 'confirmed')
    .reduce((sum, r) => sum + Math.round((r.amount || 0) / 1.1), 0)
  
  const totalUsed = pointUsages
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
  
  const currentPoints = totalCharged - totalUsed

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-6xl mx-auto p-6">


        <div className="flex items-center gap-3 mb-8">
          <Receipt className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold">결제 내역</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">총 결제 금액</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(totalPayments)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">결제 건수</div>
              <div className="text-3xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>

        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedTab === 'payments' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('payments')}
          >
            결제 내역
          </Button>
          <Button
            variant={selectedTab === 'usages' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('usages')}
          >
            캠페인 진행 내역
          </Button>
          <Button
            variant={selectedTab === 'invoices' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('invoices')}
          >
            세금계산서
          </Button>
        </div>

        {/* Payments Tab - 포인트 충전 신청 내역으로 통합 */}
        {selectedTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>결제 내역 ({chargeRequests.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">로딩 중...</div>
              ) : chargeRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  결제 내역이 없습니다
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">날짜</th>
                        <th className="text-left p-4">캠페인</th>
                        <th className="text-left p-4">금액</th>
                        <th className="text-left p-4">상태</th>
                        <th className="text-left p-4">세금계산서</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chargeRequests.map((request) => {
                        return (
                          <tr key={request.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm">
                              {new Date(request.created_at).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="p-4">
                              {request.bank_transfer_info?.campaign_name || '-'}
                            </td>
                            <td className="p-4 font-bold">
                              {formatCurrency(request.amount)}
                            </td>
                            <td className="p-4">{getStatusBadge(request.status)}</td>
                            <td className="p-4 text-sm">
                              {request.needs_tax_invoice ? (
                                <span className="text-blue-600">필요함</span>
                              ) : (
                                <span className="text-gray-400">불필요</span>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Point Usages Tab */}
        {selectedTab === 'usages' && (
          <Card>
            <CardHeader>
              <CardTitle>캠페인 진행 내역 ({pointUsages.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              {pointUsages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  캠페인 진행 내역이 없습니다
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">날짜</th>
                        <th className="text-left p-4">캠페인명</th>
                        <th className="text-left p-4">패키지</th>
                        <th className="text-left p-4">차감 포인트</th>
                        <th className="text-left p-4">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointUsages.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 text-sm">
                            {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="p-4">
                            {transaction.description}
                          </td>
                          <td className="p-4 text-sm">
                            -
                          </td>
                          <td className="p-4 font-bold text-red-600">
                            {Math.abs(transaction.amount).toLocaleString()}P
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              사용
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tax Invoices Tab */}
        {selectedTab === 'invoices' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>세금계산서 ({taxInvoices.length}건)</CardTitle>
                <p className="text-sm text-gray-500">세금계산서는 1~2일 이내 발행 됩니다.</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* 발행 예정 건 (입금 완료된 충전 신청 중 세금계산서 필요 건) */}
              {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">발행 예정 ({chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length}건)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">신청일</th>
                          <th className="text-left p-4">회사명</th>
                          <th className="text-left p-4">금액</th>
                          <th className="text-left p-4">상태</th>
                          <th className="text-left p-4">신청 정보</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).map((request) => (
                          <tr key={request.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm">
                              {new Date(request.created_at).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="p-4 text-sm">
                              {request.tax_invoice_info?.companyName || '-'}
                            </td>
                            <td className="p-4 font-medium">
                              {formatCurrency(request.amount)}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                발행 대기
                              </span>
                            </td>
                            <td className="p-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTaxInfo(request.tax_invoice_info)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                신청 정보 보기
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 발행 완료 건 */}
              {taxInvoices.length === 0 ? (
                chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    세금계산서 내역이 없습니다
                  </div>
                )
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-4">발행 완료 ({taxInvoices.length}건)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">발급일</th>
                          <th className="text-left p-4">공급가액</th>
                          <th className="text-left p-4">부가세</th>
                          <th className="text-left p-4">합계</th>
                          <th className="text-left p-4">상태</th>
                          <th className="text-left p-4">다운로드</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm">
                              {invoice.issue_date
                                ? new Date(invoice.issue_date).toLocaleDateString('ko-KR')
                                : new Date(invoice.created_at).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="p-4">{formatCurrency(invoice.supply_amount)}</td>
                            <td className="p-4">{formatCurrency(invoice.tax_amount)}</td>
                            <td className="p-4 font-bold">
                              {formatCurrency(invoice.total_amount)}
                            </td>
                            <td className="p-4">{getStatusBadge(invoice.status)}</td>
                            <td className="p-4">
                              {invoice.status === 'issued' && (
                                <Button size="sm" variant="outline">
                                  <Download className="w-4 h-4 mr-2" />
                                  다운로드
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
      
      {/* 세금계산서 정보 모달 */}
      {selectedTaxInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedTaxInfo(null)}>
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">세금계산서 신청 정보</h3>
              <button onClick={() => setSelectedTaxInfo(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">회사명</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedTaxInfo.companyName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">사업자번호</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedTaxInfo.businessNumber || '-'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">대표자</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedTaxInfo.ceoName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">이메일</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedTaxInfo.email || '-'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">주소</label>
                <p className="mt-1 text-lg text-gray-900">{selectedTaxInfo.address || '-'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">업태</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedTaxInfo.businessType || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">종목</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedTaxInfo.businessItem || '-'}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedTaxInfo(null)}>
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

