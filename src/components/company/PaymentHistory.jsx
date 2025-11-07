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
  const [selectedTab, setSelectedTab] = useState('payments')
  const [loading, setLoading] = useState(false)

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
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
      issued: 'bg-blue-100 text-blue-700'
    }
    const labels = {
      completed: '완료',
      pending: '대기중',
      failed: '실패',
      refunded: '환불',
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

  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

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
              <div className="text-3xl font-bold">{payments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">세금계산서</div>
              <div className="text-3xl font-bold text-blue-600">{taxInvoices.length}</div>
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
            variant={selectedTab === 'invoices' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('invoices')}
          >
            세금계산서
          </Button>
        </div>

        {/* Payments Tab */}
        {selectedTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>결제 내역 ({payments.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">로딩 중...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  결제 내역이 없습니다
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">날짜</th>
                        <th className="text-left p-4">내용</th>
                        <th className="text-left p-4">금액</th>
                        <th className="text-left p-4">결제수단</th>
                        <th className="text-left p-4">상태</th>
                        <th className="text-left p-4">세금계산서</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 text-sm">
                            {new Date(payment.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-4">
                            <div className="font-medium">포인트 충전</div>
                            <div className="text-sm text-gray-500">
                              결제 ID: {payment.id.slice(0, 8)}...
                            </div>
                          </td>
                          <td className="p-4 font-bold">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="p-4 text-sm">
                            {payment.payment_method || '신용카드'}
                          </td>
                          <td className="p-4">{getStatusBadge(payment.status)}</td>
                          <td className="p-4">
                            {payment.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestInvoice(payment.id)}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                발급 요청
                              </Button>
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
        )}

        {/* Tax Invoices Tab */}
        {selectedTab === 'invoices' && (
          <Card>
            <CardHeader>
              <CardTitle>세금계산서 ({taxInvoices.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              {taxInvoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  세금계산서 내역이 없습니다
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        )}

        {/* 포인트 충전 신청 내역 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>포인트 충전 신청 내역 ({chargeRequests.length}건)</CardTitle>
          </CardHeader>
          <CardContent>
            {chargeRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                충전 신청 내역이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">신청일시</th>
                      <th className="text-left p-4">회사명</th>
                      <th className="text-left p-4">입금자명</th>
                      <th className="text-right p-4">금액</th>
                      <th className="text-center p-4">세금계산서</th>
                      <th className="text-center p-4">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargeRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-sm">
                          {new Date(request.created_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="p-4 text-sm">
                          {request.tax_invoice_info?.companyName || '-'}<br />
                          <span className="text-xs text-gray-500">{request.tax_invoice_info?.email || '-'}</span>
                        </td>
                        <td className="p-4 text-sm">
                          {request.depositor_name || '-'}
                        </td>
                        <td className="p-4 text-sm text-right font-medium">
                          {request.amount?.toLocaleString()}원
                        </td>
                        <td className="p-4 text-sm text-center">
                          {request.needs_tax_invoice ? (
                            <span className="text-blue-600">필요함</span>
                          ) : (
                            <span className="text-gray-400">불필요</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {request.status === 'pending' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <span className="mr-1">⏱</span> 입금 대기
                            </span>
                          )}
                          {(request.status === 'confirmed' || request.status === 'completed') && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              입금 확인
                            </span>
                          )}
                          {request.status === 'cancelled' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              취소됨
                            </span>
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
        </div>
      </div>
    </>
  )
}

