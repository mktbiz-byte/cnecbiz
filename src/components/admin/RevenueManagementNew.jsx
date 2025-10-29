import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, 
  Plus, Edit, Trash2, Save, Calendar 
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function RevenueManagementNew() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  
  // 통계
  const [stats, setStats] = useState({
    totalRevenue: 0,        // 총 매출 (포인트 충전금)
    totalFixedCosts: 0,     // 고정비
    totalCreatorCosts: 0,   // 크리에이터 비용
    netProfit: 0            // 순이익
  })
  
  // 포인트 충전 내역
  const [pointCharges, setPointCharges] = useState([])
  
  // 크리에이터 출금 내역
  const [withdrawals, setWithdrawals] = useState([])
  
  // 고정비
  const [fixedCosts, setFixedCosts] = useState([])
  const [newFixedCost, setNewFixedCost] = useState({
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  
  // 날짜 필터
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    checkAuth()
    fetchAllData()
  }, [dateRange])

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
      .maybeSingle()

    if (!adminData) {
      navigate('/login')
    }
  }

  const fetchAllData = async () => {
    await Promise.all([
      fetchPointCharges(),
      fetchWithdrawals(),
      fetchFixedCosts()
    ])
  }

  // 포인트 충전 내역 조회 (총 매출)
  const fetchPointCharges = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('point_charge_requests')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setPointCharges(data || [])
      
      const total = data?.reduce((sum, charge) => sum + (charge.amount || 0), 0) || 0
      setStats(prev => ({ ...prev, totalRevenue: total }))
    } catch (error) {
      console.error('포인트 충전 조회 오류:', error)
    }
  }

  // 크리에이터 출금 내역 조회 (크리에이터 비용)
  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('withdrawal_requests')
        .select('*')
        .in('status', ['approved', 'completed'])
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setWithdrawals(data || [])
      
      const total = data?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0
      setStats(prev => ({ 
        ...prev, 
        totalCreatorCosts: total,
        netProfit: prev.totalRevenue - prev.totalFixedCosts - total
      }))
    } catch (error) {
      console.error('출금 내역 조회 오류:', error)
    }
  }

  // 고정비 조회
  const fetchFixedCosts = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('fixed_costs')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })

      if (error) throw error
      
      setFixedCosts(data || [])
      
      const total = data?.reduce((sum, cost) => sum + (cost.amount || 0), 0) || 0
      setStats(prev => ({ 
        ...prev, 
        totalFixedCosts: total,
        netProfit: prev.totalRevenue - total - prev.totalCreatorCosts
      }))
    } catch (error) {
      console.error('고정비 조회 오류:', error)
    }
  }

  // 고정비 추가
  const handleAddFixedCost = async () => {
    if (!newFixedCost.category || !newFixedCost.amount) {
      alert('카테고리와 금액을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('fixed_costs')
        .insert([newFixedCost])

      if (error) throw error

      alert('고정비가 추가되었습니다.')
      setNewFixedCost({
        category: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
      fetchFixedCosts()
    } catch (error) {
      console.error('고정비 추가 오류:', error)
      alert('고정비 추가에 실패했습니다.')
    }
  }

  // 고정비 삭제
  const handleDeleteFixedCost = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('fixed_costs')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('고정비가 삭제되었습니다.')
      fetchFixedCosts()
    } catch (error) {
      console.error('고정비 삭제 오류:', error)
      alert('고정비 삭제에 실패했습니다.')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              매출 관리
            </h1>
            <p className="text-gray-600 mt-1">포인트 충전 기반 매출 및 비용 관리</p>
          </div>

          {/* 날짜 필터 */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <label className="text-sm font-medium">기간 선택:</label>
                </div>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-40"
                />
                <span>~</span>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-40"
                />
              </div>
            </CardContent>
          </Card>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 매출</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-gray-500 mt-1">포인트 충전금</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">고정비</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalFixedCosts)}</div>
                <p className="text-xs text-gray-500 mt-1">인건비, 운영비 등</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">크리에이터 비용</CardTitle>
                <Wallet className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalCreatorCosts)}</div>
                <p className="text-xs text-gray-500 mt-1">출금 승인 금액</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">순이익</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.netProfit)}</div>
                <p className="text-xs text-gray-500 mt-1">매출 - 비용</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="revenue">총 매출</TabsTrigger>
              <TabsTrigger value="costs">비용 관리</TabsTrigger>
              <TabsTrigger value="creators">크리에이터 비용</TabsTrigger>
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>매출 및 비용 요약</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <span className="font-medium">총 매출 (포인트 충전)</span>
                      <span className="text-xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">고정비</span>
                      <span className="text-xl font-bold text-orange-600">- {formatCurrency(stats.totalFixedCosts)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">크리에이터 비용</span>
                      <span className="text-xl font-bold text-red-600">- {formatCurrency(stats.totalCreatorCosts)}</span>
                    </div>
                    <div className="border-t-2 border-gray-300 pt-4"></div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span className="font-bold text-lg">순이익</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(stats.netProfit)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 총 매출 탭 */}
            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>포인트 충전 내역 ({pointCharges.length}건)</CardTitle>
                </CardHeader>
                <CardContent>
                  {pointCharges.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">포인트 충전 내역이 없습니다.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">날짜</th>
                            <th className="text-left p-3">회사명</th>
                            <th className="text-right p-3">금액</th>
                            <th className="text-left p-3">결제방법</th>
                            <th className="text-center p-3">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pointCharges.map((charge) => (
                            <tr key={charge.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{formatDate(charge.created_at)}</td>
                              <td className="p-3">{charge.company_name || '-'}</td>
                              <td className="p-3 text-right font-bold text-blue-600">
                                {formatCurrency(charge.amount)}
                              </td>
                              <td className="p-3">{charge.payment_method || '-'}</td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                  승인완료
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
            </TabsContent>

            {/* 비용 관리 탭 (고정비) */}
            <TabsContent value="costs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    고정비 추가
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">카테고리 *</label>
                      <select
                        value={newFixedCost.category}
                        onChange={(e) => setNewFixedCost({ ...newFixedCost, category: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="">선택하세요</option>
                        <option value="인건비">인건비</option>
                        <option value="임대료">임대료</option>
                        <option value="운영비">운영비</option>
                        <option value="마케팅비">마케팅비</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">금액 *</label>
                      <Input
                        type="number"
                        placeholder="금액 입력"
                        value={newFixedCost.amount}
                        onChange={(e) => setNewFixedCost({ ...newFixedCost, amount: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">날짜 *</label>
                      <Input
                        type="date"
                        value={newFixedCost.date}
                        onChange={(e) => setNewFixedCost({ ...newFixedCost, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">설명</label>
                      <Input
                        type="text"
                        placeholder="설명 (선택사항)"
                        value={newFixedCost.description}
                        onChange={(e) => setNewFixedCost({ ...newFixedCost, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddFixedCost} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    고정비 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>고정비 내역 ({fixedCosts.length}건)</CardTitle>
                </CardHeader>
                <CardContent>
                  {fixedCosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">등록된 고정비가 없습니다.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">날짜</th>
                            <th className="text-left p-3">카테고리</th>
                            <th className="text-right p-3">금액</th>
                            <th className="text-left p-3">설명</th>
                            <th className="text-center p-3">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fixedCosts.map((cost) => (
                            <tr key={cost.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{formatDate(cost.date)}</td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                  {cost.category}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-orange-600">
                                {formatCurrency(cost.amount)}
                              </td>
                              <td className="p-3 text-gray-600">{cost.description || '-'}</td>
                              <td className="p-3 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteFixedCost(cost.id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 크리에이터 비용 탭 */}
            <TabsContent value="creators" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>크리에이터 출금 내역 ({withdrawals.length}건)</CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawals.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">출금 내역이 없습니다.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">날짜</th>
                            <th className="text-left p-3">크리에이터</th>
                            <th className="text-left p-3">국가</th>
                            <th className="text-right p-3">금액</th>
                            <th className="text-center p-3">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdrawals.map((withdrawal) => (
                            <tr key={withdrawal.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{formatDate(withdrawal.created_at)}</td>
                              <td className="p-3">{withdrawal.creator_name || '-'}</td>
                              <td className="p-3">{withdrawal.country || '-'}</td>
                              <td className="p-3 text-right font-bold text-red-600">
                                {formatCurrency(withdrawal.amount)}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  withdrawal.status === 'completed' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {withdrawal.status === 'completed' ? '지급완료' : '승인됨'}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

