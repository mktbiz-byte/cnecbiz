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
      // points_transactions.company_id는 user.id를 참조
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
      completed: { bg: 'bg-[rgba(0,184,148,0.1)]', text: 'text-[#00B894]', dot: 'bg-[#00B894]', label: '완료' },
      confirmed: { bg: 'bg-[rgba(0,184,148,0.1)]', text: 'text-[#00B894]', dot: 'bg-[#00B894]', label: '완료' },
      pending: { bg: 'bg-[rgba(253,203,110,0.15)]', text: 'text-[#E17055]', dot: 'bg-[#E17055]', label: '대기중' },
      failed: { bg: 'bg-[rgba(255,107,107,0.1)]', text: 'text-[#FF6B6B]', dot: 'bg-[#FF6B6B]', label: '실패' },
      refunded: { bg: 'bg-[#F8F9FA]', text: 'text-[#636E72]', dot: 'bg-[#B2BEC3]', label: '환불' },
      cancelled: { bg: 'bg-[#F8F9FA]', text: 'text-[#636E72]', dot: 'bg-[#B2BEC3]', label: '취소' },
      issued: { bg: 'bg-[rgba(0,184,148,0.1)]', text: 'text-[#00B894]', dot: 'bg-[#00B894]', label: '발급완료' }
    }
    const cfg = config[status] || { bg: 'bg-[#F8F9FA]', text: 'text-[#636E72]', dot: 'bg-[#B2BEC3]', label: status }
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
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
      <div className="min-h-screen bg-[#F8F9FA] lg:ml-64 pt-14 pb-20 lg:pt-0 lg:pb-0">
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
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 lg:w-7 lg:h-7 text-gray-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg lg:text-2xl md:text-3xl font-bold text-[#1A1A2E]">결제 내역</h1>
                <p className="text-sm lg:text-base text-[#636E72] mt-1">캠페인 결제 및 세금계산서를 관리하세요</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 lg:mb-8">
            {/* 총 결제 금액 */}
            <div className="bg-white rounded-2xl p-4 lg:p-6 border border-[#DFE6E9]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#636E72]">총 결제 금액</span>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-gray-900 font-['Outfit']">
                {(totalPayments / 10000).toFixed(0)}
                <span className="text-base lg:text-lg font-medium text-[#B2BEC3] ml-1">만원</span>
              </div>
              <p className="text-xs text-[#B2BEC3] mt-2">VAT 포함</p>
            </div>

            {/* 결제 건수 */}
            <div className="bg-white rounded-2xl p-4 lg:p-6 border border-[#DFE6E9]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#636E72]">총 결제 건수</span>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-[#1A1A2E] font-['Outfit']">
                {totalCount}
                <span className="text-base lg:text-lg font-medium text-[#B2BEC3] ml-1">건</span>
              </div>
              <p className="text-xs text-[#B2BEC3] mt-2">완료된 결제</p>
            </div>

            {/* 수출바우처 잔액 */}
            <div className="bg-white rounded-2xl p-4 lg:p-6 border border-[#DFE6E9]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#636E72]">수출바우처 승인 금액</span>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-gray-900 font-['Outfit']">
                {currentVoucherBalance.toLocaleString()}
                <span className="text-base lg:text-lg font-medium text-[#B2BEC3] ml-1">원</span>
              </div>
              <p className="text-xs text-[#B2BEC3] mt-2">VAT 별도 기준 | 사용 {totalUsed.toLocaleString()}원</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-[#DFE6E9] overflow-hidden">
            <div className="flex border-b border-[#DFE6E9]">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1 lg:gap-2 px-2 lg:px-4 py-3 lg:py-4 font-medium text-xs lg:text-sm transition-all ${
                      selectedTab === tab.key
                        ? 'text-gray-900 bg-gray-50 border-b-2 border-gray-900'
                        : 'text-[#636E72] hover:text-[#1A1A2E] hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <Icon className="w-4 h-4 hidden sm:block" />
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-md text-xs ${
                      selectedTab === tab.key
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-[#F8F9FA] text-[#636E72]'
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
                      <div className="w-20 h-20 mx-auto mb-6 bg-[#F8F9FA] rounded-2xl flex items-center justify-center">
                        <CreditCard className="w-10 h-10 text-[#B2BEC3]" />
                      </div>
                      <p className="text-lg font-medium text-[#636E72] mb-2">결제 내역이 없습니다</p>
                      <p className="text-sm text-[#B2BEC3]">캠페인을 등록하고 결제를 진행해보세요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chargeRequests.map((request) => (
                        <div
                          key={request.id}
                          className="group flex items-center gap-4 p-4 rounded-xl border border-[#DFE6E9] hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white overflow-hidden"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {getStatusBadge(request.status)}
                              {request.needs_tax_invoice && (
                                <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700 font-medium">
                                  세금계산서
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-[#1A1A2E] text-sm lg:text-base truncate">
                              {request.campaign_name || '캠페인 결제'}
                            </p>
                            <p className="text-xs lg:text-sm text-[#636E72] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              {new Date(request.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base lg:text-xl font-bold text-gray-900 font-['Outfit']">
                              {formatCurrency(request.amount)}
                            </p>
                            <p className="text-xs text-[#B2BEC3]">VAT 포함</p>
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
                      <div className="w-20 h-20 mx-auto mb-6 bg-[#F8F9FA] rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-10 h-10 text-[#B2BEC3]" />
                      </div>
                      <p className="text-lg font-medium text-[#636E72] mb-2">사용 내역이 없습니다</p>
                      <p className="text-sm text-[#B2BEC3]">수출바우처로 캠페인 결제 시 사용 내역이 표시됩니다</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pointUsages.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="group flex items-center gap-4 p-4 rounded-xl border border-[#DFE6E9] hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white overflow-hidden"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                바우처 사용
                              </span>
                              {transaction.package_type && (
                                <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700 font-medium">
                                  {getPackageLabel(transaction.package_type)}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-[#1A1A2E] text-sm lg:text-base truncate">
                              {transaction.campaign_name || '-'}
                            </p>
                            <p className="text-xs lg:text-sm text-[#636E72] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base lg:text-xl font-bold text-gray-900 font-['Outfit']">
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
                  <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1 text-[#1A1A2E]">세금계산서 안내</p>
                        <p className="text-sm text-[#636E72]">
                          결제 완료 후 1~2일 이내에 자동 발행됩니다. 발행된 세금계산서는 등록된 이메일로 전송됩니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 발행 예정 */}
                  {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#E17055]" />
                        발행 예정
                        <span className="px-2 py-0.5 rounded-md text-xs bg-[rgba(253,203,110,0.15)] text-[#E17055]">
                          {chargeRequests.filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued).length}건
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {chargeRequests
                          .filter(r => (r.status === 'completed' || r.status === 'confirmed') && r.needs_tax_invoice && !r.tax_invoice_issued)
                          .map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center gap-4 p-4 rounded-xl border border-[#DFE6E9] bg-white overflow-hidden"
                            >
                              <div className="w-12 h-12 rounded-xl bg-[rgba(253,203,110,0.15)] flex items-center justify-center flex-shrink-0">
                                <Clock className="w-6 h-6 text-[#E17055]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#1A1A2E] text-sm lg:text-base truncate">
                                  {request.campaign_name || '캠페인 결제'}
                                </p>
                                <p className="text-xs lg:text-sm text-[#636E72]">
                                  {new Date(request.created_at).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-[#6C5CE7] font-['Outfit']">
                                  {formatCurrency(request.amount)}
                                </p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-[rgba(253,203,110,0.15)] text-[#E17055] font-medium">
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
                      <h3 className="text-lg font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[#00B894]" />
                        발행 완료
                        <span className="px-2 py-0.5 rounded-md text-xs bg-[rgba(0,184,148,0.1)] text-[#00B894]">
                          {chargeRequests.filter(r => r.tax_invoice_issued).length}건
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {chargeRequests
                          .filter(r => r.tax_invoice_issued)
                          .map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center gap-4 p-4 rounded-xl border border-[#DFE6E9] bg-white overflow-hidden"
                            >
                              <div className="w-12 h-12 rounded-xl bg-[rgba(0,184,148,0.1)] flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-6 h-6 text-[#00B894]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#1A1A2E] text-sm lg:text-base truncate">
                                  {request.campaign_name || '캠페인 결제'}
                                </p>
                                <p className="text-xs lg:text-sm text-[#636E72]">
                                  {new Date(request.created_at).toLocaleDateString('ko-KR')}
                                </p>
                                {request.tax_invoice_nts_confirm_num && (
                                  <p className="text-xs text-[#B2BEC3] mt-1">
                                    승인번호: {request.tax_invoice_nts_confirm_num}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-[#6C5CE7] font-['Outfit']">
                                  {formatCurrency(request.amount)}
                                </p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-[rgba(0,184,148,0.1)] text-[#00B894] font-medium">
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
                      <div className="w-20 h-20 mx-auto mb-6 bg-[#F8F9FA] rounded-2xl flex items-center justify-center">
                        <FileText className="w-10 h-10 text-[#B2BEC3]" />
                      </div>
                      <p className="text-lg font-medium text-[#636E72] mb-2">세금계산서 내역이 없습니다</p>
                      <p className="text-sm text-[#B2BEC3]">결제 시 세금계산서를 요청하시면 여기에 표시됩니다</p>
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
