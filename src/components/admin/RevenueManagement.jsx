import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, CreditCard, FileText, ArrowLeft, Calendar } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { getRevenueFromAllRegions, getMonthlyRevenueStats, getPointCharges, getAccountsReceivable } from '../../lib/revenueHelper'

export default function RevenueManagement() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalPayments: 0,
    totalPointsCharged: 0
  })
  const [payments, setPayments] = useState([])
  const [pointCharges, setPointCharges] = useState([])
  const [taxInvoices, setTaxInvoices] = useState([])
  const [selectedTab, setSelectedTab] = useState('overview')

  useEffect(() => {
    checkAuth()
    fetchData()
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

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchData = async () => {
    try {
      // 모든 지역의 매출 데이터 가져오기
      const [revenueData, monthlyStats, pointChargesData, receivablesData] = await Promise.all([
        getRevenueFromAllRegions(),
        getMonthlyRevenueStats(),
        getPointCharges(),
        getAccountsReceivable()
      ])

      // 현재 월 매출 계산
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const monthlyRevenue = monthlyStats[currentMonth]?.total || 0

      // 통계 설정
      setStats({
        totalRevenue: revenueData.total,
        monthlyRevenue: monthlyRevenue,
        totalPayments: revenueData.campaigns.length,
        totalPointsCharged: pointChargesData.reduce((sum, charge) => sum + (charge.amount || 0), 0)
      })

      // 결제 내역 (캠페인 매출)
      setPayments(revenueData.campaigns)

      // 포인트 충전 내역
      setPointCharges(pointChargesData)

      // 세금계산서 내역 (미수금)
      setTaxInvoices(receivablesData)
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      issued: 'bg-green-100 text-green-700'
    }
    const labels = {
      completed: '완료',
      pending: '대기중',
      failed: '실패',
      approved: '승인',
      rejected: '거부',
      issued: '발급완료'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <DollarSign className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold">매출 관리</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 매출</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">이번 달 매출</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 결제 건수</p>
                  <p className="text-2xl font-bold mt-2">{stats.totalPayments}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">충전 포인트</p>
                  <p className="text-2xl font-bold mt-2">{stats.totalPointsCharged.toLocaleString()}P</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('overview')}
          >
            개요
          </Button>
          <Button
            variant={selectedTab === 'payments' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('payments')}
          >
            결제 내역
          </Button>
          <Button
            variant={selectedTab === 'points' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('points')}
          >
            포인트 충전
          </Button>
          <Button
            variant={selectedTab === 'invoices' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('invoices')}
          >
            미수금
          </Button>
        </div>

        {/* Content */}
        {selectedTab === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>매출 개요</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">총 매출액</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">이번 달 매출</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(stats.monthlyRevenue)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">평균 결제 금액</span>
                  <span className="text-xl font-bold text-purple-600">
                    {stats.totalPayments > 0 ? formatCurrency(stats.totalRevenue / stats.totalPayments) : formatCurrency(0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>결제 내역 ({payments.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">날짜</th>
                      <th className="text-left p-4">지역</th>
                      <th className="text-left p-4">캠페인명</th>
                      <th className="text-left p-4">기업 이메일</th>
                      <th className="text-left p-4">금액</th>
                      <th className="text-left p-4">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-sm">{formatDate(payment.created_at)}</td>
                        <td className="p-4">
                          {payment.region === 'korea' && '🇺🇷 한국'}
                          {payment.region === 'japan' && '🇯🇵 일본'}
                          {payment.region === 'us' && '🇺🇸 미국'}
                          {payment.region === 'taiwan' && '🇹🇼 대만'}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{payment.title}</div>
                        </td>
                        <td className="p-4 text-sm text-gray-500">{payment.company_email}</td>
                        <td className="p-4 font-bold">{formatCurrency(payment.estimated_cost)}</td>
                        <td className="p-4">{getStatusBadge(payment.payment_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    결제 내역이 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === 'points' && (
          <Card>
            <CardHeader>
              <CardTitle>포인트 충전 내역 ({pointCharges.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">날짜</th>
                      <th className="text-left p-4">기업명</th>
                      <th className="text-left p-4">충전 포인트</th>
                      <th className="text-left p-4">금액</th>
                      <th className="text-left p-4">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointCharges.map((charge) => (
                      <tr key={charge.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-sm">{formatDate(charge.created_at)}</td>
                        <td className="p-4">
                          <div className="font-medium">{charge.company_email}</div>
                          <div className="text-sm text-gray-500">{charge.payment_type === 'prepaid' ? '선불' : '후불'}</div>
                        </td>
                        <td className="p-4 font-bold text-blue-600">{charge.amount?.toLocaleString()}P</td>
                        <td className="p-4 font-bold">{formatCurrency(charge.amount)}</td>
                        <td className="p-4">{getStatusBadge(charge.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pointCharges.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    포인트 충전 내역이 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === 'invoices' && (
          <Card>
            <CardHeader>
              <CardTitle>미수금 내역 ({taxInvoices.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">생성일</th>
                      <th className="text-left p-4">기업 이메일</th>
                      <th className="text-left p-4">미수금액</th>
                      <th className="text-left p-4">마감일</th>
                      <th className="text-left p-4">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-sm">{formatDate(invoice.created_at)}</td>
                        <td className="p-4">
                          <div className="font-medium">{invoice.company_email}</div>
                        </td>
                        <td className="p-4 font-bold">{formatCurrency(invoice.amount)}</td>
                        <td className="p-4 text-sm">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ko-KR') : 'N/A'}</td>
                        <td className="p-4">{getStatusBadge(invoice.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {taxInvoices.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    세금계산서 내역이 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

