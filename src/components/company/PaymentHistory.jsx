import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Receipt,
  Download,
  FileText,
  Wallet,
  CreditCard,
  TrendingUp,
  Calendar,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles
} from 'lucide-react'
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
      fetchPointUsages(companyData.id)
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

  const fetchPointUsages = async (companyId) => {
    try {
      // spend 타입 조회 (사용 내역 - amount가 음수인 것만)
      const { data, error } = await supabaseBiz
        .from('points_transactions')
        .select('*')
        .eq('company_id', companyId)
        .eq('type', 'spend')
        .lt('amount', 0)
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
    const config = {
      completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: '완료' },
      confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: '완료' },
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: '대기중' },
      failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: '실패' },
      refunded: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: '환불' },
      cancelled: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: '취소' },
      issued: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: '발급완료' }
    }
    const cfg = config[status] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: status }
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
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

  // 수출바우처 잔액 (companies 테이블에서 직접 가져옴)
  // 관리자가 충전하고, 사용 내역은 points_transactions에서 관리
  const currentVoucherBalance = company?.points_balance || 0

  // 사용 내역 합계 (표시용)
  const totalUsed = pointUsages
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

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

  const tabs = [
    { key: 'payments', label: '결제 내역', icon: CreditCard, count: chargeRequests.length },
    { key: 'usages', label: '사용 내역', icon: TrendingUp, count: pointUsages.length },
    { key: 'invoices', label: '세금계산서', icon: FileText, count: chargeRequests.filter(r => r.needs_tax_invoice).length }
  ]

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 lg:ml-64">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/company/dashboard')}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Receipt className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">결제 내역</h1>
                <p className="text-gray-500 mt-1">캠페인 결제 및 세금계산서를 관리하세요</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            {/* 총 결제 금액 */}
            <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">총 결제 금액</span>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {(totalPayments / 10000).toFixed(0)}
                  <span className="text-lg font-medium text-gray-400 ml-1">만원</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">VAT 포함</p>
              </div>
            </div>

            {/* 결제 건수 */}
            <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">총 결제 건수</span>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {totalCount}
                  <span className="text-lg font-medium text-gray-400 ml-1">건</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">완료된 결제</p>
              </div>
            </div>

            {/* 수출바우처 잔액 */}
            <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">수출바우처 승인 금액</span>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {currentVoucherBalance.toLocaleString()}
                  <span className="text-lg font-medium text-gray-400 ml-1">원</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">VAT 별도 기준 | 사용 {totalUsed.toLocaleString()}원</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium text-sm transition-all ${
                      selectedTab === tab.key
                        ? 'text-purple-600 bg-purple-50/50 border-b-2 border-purple-500'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      selectedTab === tab.key
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="p-4 md:p-6">
              {/* Payments Tab */}
              {selectedTab === 'payments' && (
                <>
                  {chargeRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                        <CreditCard className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-600 mb-2">결제 내역이 없습니다</p>
                      <p className="text-sm text-gray-400">캠페인을 등록하고 결제를 진행해보세요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chargeRequests.map((request) => (
                        <div
                          key={request.id}
                          className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200 bg-white hover:bg-gradient-to-r hover:from-white hover:to-purple-50/30"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(request.status)}
                              {request.needs_tax_invoice && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 font-medium">
                                  세금계산서
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 truncate">
                              {request.campaign_name || '캠페인 결제'}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(request.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-gray-900">
                              {formatCurrency(request.amount)}
                            </p>
                            <p className="text-xs text-gray-400">VAT 포함</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Point Usages Tab */}
              {selectedTab === 'usages' && (
                <>
                  {pointUsages.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-600 mb-2">사용 내역이 없습니다</p>
                      <p className="text-sm text-gray-400">수출바우처로 캠페인 결제 시 사용 내역이 표시됩니다</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pointUsages.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200 bg-white hover:bg-gradient-to-r hover:from-white hover:to-purple-50/30"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-6 h-6 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                바우처 사용
                              </span>
                              {transaction.package_type && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600 font-medium">
                                  {getPackageLabel(transaction.package_type)}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 truncate">
                              {transaction.campaign_name || '-'}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-red-600">
                              -{Math.abs(transaction.amount).toLocaleString()}원
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Tax Invoices Tab */}
              {selectedTab === 'invoices' && (
                <>
                  {/* Tip Box */}
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1">세금계산서 안내</p>
                        <p className="text-sm text-blue-100">
                          결제 완료 후 1~2일 이내에 자동 발행됩니다. 발행된 세금계산서는 등록된 이메일로 전송됩니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 발행 예정 */}
                  {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        발행 예정
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-600">
                          {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length}건
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {chargeRequests
                          .filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued)
                          .map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50"
                            >
                              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-6 h-6 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900">
                                  {request.campaign_name || '캠페인 결제'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(request.created_at).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">
                                  {formatCurrency(request.amount)}
                                </p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
                                  <Clock className="w-3 h-3" />
                                  발행 예정
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 발행 완료 */}
                  {chargeRequests.filter(r => r.tax_invoice_issued).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        발행 완료
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-600">
                          {chargeRequests.filter(r => r.tax_invoice_issued).length}건
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {chargeRequests
                          .filter(r => r.tax_invoice_issued)
                          .map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50"
                            >
                              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900">
                                  {request.campaign_name || '캠페인 결제'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(request.created_at).toLocaleDateString('ko-KR')}
                                </p>
                                {request.tax_invoice_nts_confirm_num && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    승인번호: {request.tax_invoice_nts_confirm_num}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">
                                  {formatCurrency(request.amount)}
                                </p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  발행 완료
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {chargeRequests.filter(r => r.needs_tax_invoice).length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                        <FileText className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-600 mb-2">세금계산서 내역이 없습니다</p>
                      <p className="text-sm text-gray-400">결제 시 세금계산서를 요청하시면 여기에 표시됩니다</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
