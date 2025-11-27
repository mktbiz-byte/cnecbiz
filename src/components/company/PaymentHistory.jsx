import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Receipt, Download, FileText } from 'lucide-react'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
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
        
        // bank_transfer_info.campaign_title 사용 (이미 저장되어 있음)
        const requestsWithCampaigns = data.map(request => ({
          ...request,
          campaign_name: request.bank_transfer_info?.campaign_title || null
        }))
        
        setChargeRequests(requestsWithCampaigns)
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
        
        // campaign_id가 있는 경우 Korea DB에서 캠페인 정보 로드
        const usagesWithCampaigns = await Promise.all(data.map(async (transaction) => {
          if (transaction.campaign_id) {
            try {
              const supabaseKorea = getSupabaseClient('korea')
              const { data: campaign } = await supabaseKorea
                .from('campaigns')
                .select('title, package_type')
                .eq('id', transaction.campaign_id)
                .single()
              
              if (campaign) {
                return {
                  ...transaction,
                  campaign_name: campaign.title,
                  package_type: campaign.package_type
                }
              }
            } catch (err) {
              console.error('Error loading campaign:', err)
            }
          }
          
          // description에서 캠페인명 추출 (fallback)
          const campaignName = transaction.description?.replace('캠페인 결제: ', '') || transaction.description
          return {
            ...transaction,
            campaign_name: campaignName,
            package_type: null
          }
        }))
        
        setPointUsages(usagesWithCampaigns)
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

  const getPackageLabel = (packageType) => {
    const labels = {
      basic: '베이직',
      standard: '스탠다드',
      intermediate: '인터미디어트',
      premium: '프리미엄',
      enterprise: '엔터프라이즈'
    }
    return labels[packageType] || packageType || '-'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/company/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Receipt className="w-8 h-8 text-green-600" />
            결제 내역
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">총 결제 금액</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(totalPayments)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">결제 건수</div>
              <div className="text-3xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          <button
            onClick={() => setSelectedTab('payments')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === 'payments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            결제 내역
          </button>
          <button
            onClick={() => setSelectedTab('usages')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === 'usages'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            캠페인 진행 내역
          </button>
          <button
            onClick={() => setSelectedTab('invoices')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === 'invoices'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            세금계산서
          </button>
        </div>

        {/* Payments Tab */}
        {selectedTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>결제 내역 ({chargeRequests.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              {chargeRequests.length === 0 ? (
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
                              {request.campaign_name || '-'}
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
                            {transaction.campaign_name || '-'}
                          </td>
                          <td className="p-4 text-sm">
                            {getPackageLabel(transaction.package_type)}
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
                          <th className="text-left p-4">날짜</th>
                          <th className="text-left p-4">금액</th>
                          <th className="text-left p-4">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chargeRequests
                          .filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued)
                          .map((request) => (
                            <tr key={request.id} className="border-b hover:bg-gray-50">
                              <td className="p-4 text-sm">
                                {new Date(request.created_at).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="p-4 font-bold">
                                {formatCurrency(request.amount)}
                              </td>
                              <td className="p-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  발행 예정
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 발행 완료 건 */}
              {chargeRequests.filter(r => r.tax_invoice_issued).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">발행 완료 ({chargeRequests.filter(r => r.tax_invoice_issued).length}건)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">날짜</th>
                          <th className="text-left p-4">금액</th>
                          <th className="text-left p-4">국세청 승인번호</th>
                          <th className="text-left p-4">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chargeRequests
                          .filter(r => r.tax_invoice_issued)
                          .map((request) => (
                            <tr key={request.id} className="border-b hover:bg-gray-50">
                              <td className="p-4 text-sm">
                                {new Date(request.created_at).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="p-4 font-bold">
                                {formatCurrency(request.amount)}
                              </td>
                              <td className="p-4 text-sm">
                                {request.tax_invoice_nts_confirm_num || '-'}
                              </td>
                              <td className="p-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  발행 완료
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {chargeRequests.filter(r => r.needs_tax_invoice).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  세금계산서 내역이 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
