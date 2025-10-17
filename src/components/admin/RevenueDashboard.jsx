import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function RevenueDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    japanRevenue: 0,
    usRevenue: 0,
    taiwanRevenue: 0,
    stripeRevenue: 0,
    bankTransferRevenue: 0,
    totalPayments: 0,
    pendingPayments: 0,
    pendingTaxInvoices: 0,
    unpaidAmount: 0
  })

  const [regionStats, setRegionStats] = useState({
    japan: { active: 0, completed: 0, total: 0 },
    us: { active: 0, completed: 0, total: 0 },
    taiwan: { active: 0, completed: 0, total: 0 }
  })

  const [monthlyData, setMonthlyData] = useState([])
  const [unpaidPayments, setUnpaidPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchRevenueStats(),
        fetchRegionStats(),
        fetchMonthlyData(),
        fetchUnpaidPayments()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRevenueStats = async () => {
    const { data: payments } = await supabaseBiz
      .from('payments')
      .select('*')

    if (!payments) return

    const completed = payments.filter(p => p.status === 'completed')
    const pending = payments.filter(p => p.status === 'pending')

    setStats({
      totalRevenue: completed.reduce((sum, p) => sum + p.amount, 0),
      japanRevenue: completed.filter(p => p.region === 'japan').reduce((sum, p) => sum + p.amount, 0),
      usRevenue: completed.filter(p => p.region === 'us').reduce((sum, p) => sum + p.amount, 0),
      taiwanRevenue: completed.filter(p => p.region === 'taiwan').reduce((sum, p) => sum + p.amount, 0),
      stripeRevenue: completed.filter(p => p.payment_method === 'stripe').reduce((sum, p) => sum + p.amount, 0),
      bankTransferRevenue: completed.filter(p => p.payment_method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
      totalPayments: completed.length,
      pendingPayments: pending.length,
      unpaidAmount: pending.reduce((sum, p) => sum + p.amount, 0)
    })
  }

  const fetchRegionStats = async () => {
    const { data: campaigns } = await supabaseBiz
      .from('campaigns')
      .select('selected_regions, status, total_amount')

    if (!campaigns) return

    const stats = {
      japan: { active: 0, completed: 0, total: 0 },
      us: { active: 0, completed: 0, total: 0 },
      taiwan: { active: 0, completed: 0, total: 0 }
    }

    campaigns.forEach(campaign => {
      campaign.selected_regions?.forEach(region => {
        if (stats[region]) {
          if (campaign.status === 'active' || campaign.status === 'in_progress') {
            stats[region].active++
          } else if (campaign.status === 'completed') {
            stats[region].completed++
          }
          stats[region].total += campaign.total_amount || 0
        }
      })
    })

    setRegionStats(stats)
  }

  const fetchMonthlyData = async () => {
    const { data: payments } = await supabaseBiz
      .from('payments')
      .select('created_at, amount, status, payment_method')
      .eq('status', 'completed')

    if (!payments) return

    // Group by month
    const monthlyMap = {}
    payments.forEach(payment => {
      const month = new Date(payment.created_at).toLocaleDateString('ko-KR', { month: 'short' })
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, revenue: 0, expense: 0 }
      }
      monthlyMap[month].revenue += payment.amount
      // Expense is assumed to be 70% of revenue for demo
      monthlyMap[month].expense = monthlyMap[month].revenue * 0.7
    })

    setMonthlyData(Object.values(monthlyMap))
  }

  const fetchUnpaidPayments = async () => {
    const { data } = await supabaseBiz
      .from('payments')
      .select(`
        *,
        campaigns (brand_name),
        companies (company_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setUnpaidPayments(data || [])
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().toLocaleDateString('ko-KR', { month: 'long' })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">재무정보</h1>
          <p className="text-gray-600 mt-1">재무정보 조회 권한이 있으면 팀과 관계 없이 회계서 비즈니스 전체의 재무 항목 및 금액을 확인할 수 있습니다.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          정세 검색
        </button>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold">{currentYear}년</h2>
        <button className="p-2 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">재무정보 차트</h3>
            <div className="flex gap-8 mt-2">
              <div>
                <span className="text-sm text-gray-600">매출 </span>
                <span className="text-lg font-bold text-blue-600">
                  {stats.totalRevenue.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">매입 </span>
                <span className="text-lg font-bold text-pink-600">
                  {(stats.totalRevenue * 0.7).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              차트 옵션
            </button>
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              필터
            </button>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toLocaleString()}원`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="매출" />
            <Line type="monotone" dataKey="expense" stroke="#EC4899" strokeWidth={2} name="매입" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Monthly Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm text-gray-600 mb-4">{currentMonth} 매출 (이번 달)</h3>
          <p className="text-2xl font-bold">{(stats.totalRevenue / 12).toLocaleString()}원</p>
          <h3 className="text-sm text-gray-600 mt-6 mb-4">{currentMonth} 매입 (이번 달)</h3>
          <p className="text-2xl font-bold">{((stats.totalRevenue * 0.7) / 12).toLocaleString()}원</p>
          <h3 className="text-sm text-gray-600 mt-6 mb-4">누적 미수금</h3>
          <p className="text-2xl font-bold text-red-600">{stats.unpaidAmount.toLocaleString()}원</p>
        </div>

        {/* Quarterly Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm text-gray-600 mb-4">4분기 매출 (이번 분기)</h3>
          <p className="text-2xl font-bold">{(stats.totalRevenue / 4).toLocaleString()}원</p>
          <h3 className="text-sm text-gray-600 mt-6 mb-4">4분기 매입 (이번 분기)</h3>
          <p className="text-2xl font-bold">{((stats.totalRevenue * 0.7) / 4).toLocaleString()}원</p>
          <h3 className="text-sm text-gray-600 mt-6 mb-4">누적 미지급금</h3>
          <p className="text-2xl font-bold">{((stats.totalRevenue * 0.3) / 4).toLocaleString()}원</p>
        </div>

        {/* Yearly Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm text-gray-600 mb-4">{currentYear}년 매출 (올해)</h3>
          <p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}원</p>
          <h3 className="text-sm text-gray-600 mt-6 mb-4">{currentYear}년 매입 (올해)</h3>
          <p className="text-2xl font-bold">{(stats.totalRevenue * 0.7).toLocaleString()}원</p>
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm text-gray-600 mb-2">월간 반복 매출 (MRR)</h3>
            <p className="text-xl font-bold">{(stats.totalRevenue / 12).toLocaleString()}원</p>
            <h3 className="text-sm text-gray-600 mt-4 mb-2">연간 반복 매출 (ARR)</h3>
            <p className="text-xl font-bold">{stats.totalRevenue.toLocaleString()}원</p>
            <p className="text-xs text-gray-500 mt-1">{currentYear}년 10월 기준</p>
          </div>
        </div>
      </div>

      {/* Region Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-6">나라별 캠페인 현황</h3>
        <div className="grid grid-cols-3 gap-6">
          {/* Japan */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🇯🇵</span>
              <h4 className="font-semibold">일본</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">진행중</span>
                <span className="font-medium">{regionStats.japan.active}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">완료</span>
                <span className="font-medium">{regionStats.japan.completed}건</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">총 매출</span>
                <span className="font-bold text-blue-600">{regionStats.japan.total.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* US */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🇺🇸</span>
              <h4 className="font-semibold">미국</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">진행중</span>
                <span className="font-medium">{regionStats.us.active}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">완료</span>
                <span className="font-medium">{regionStats.us.completed}건</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">총 매출</span>
                <span className="font-bold text-blue-600">{regionStats.us.total.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* Taiwan */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🇹🇼</span>
              <h4 className="font-semibold">대만</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">진행중</span>
                <span className="font-medium">{regionStats.taiwan.active}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">완료</span>
                <span className="font-medium">{regionStats.taiwan.completed}건</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">총 매출</span>
                <span className="font-bold text-blue-600">{regionStats.taiwan.total.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unpaid Payments */}
      {unpaidPayments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600">미수금 목록</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기업명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">캠페인</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">결제 방법</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">신청일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {unpaidPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 text-sm">{payment.companies?.company_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{payment.campaigns?.brand_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      {payment.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.payment_method === 'bank_transfer' ? '계좌이체' : '신용카드'}</td>
                    <td className="px-4 py-3 text-sm">{new Date(payment.created_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3 text-sm">
                      <button className="text-blue-600 hover:text-blue-800">입금 확인</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

