import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, Plus, 
  Trash2, Edit2, Save, X, BarChart3, PieChart
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function RevenueManagementEnhanced() {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [monthlyData, setMonthlyData] = useState({
    revenue: 0,
    withdrawalCost: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    netProfit: 0
  })
  const [expenses, setExpenses] = useState([])
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [expenseForm, setExpenseForm] = useState({
    expense_type: 'fixed',
    category: '인건비',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_day: ''
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (selectedMonth) {
      fetchMonthlyData()
      fetchExpenses()
    }
  }, [selectedMonth])

  function getCurrentMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

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
      navigate('/admin/dashboard')
    }
  }

  const fetchMonthlyData = async () => {
    try {
      // 1. 매출 (포인트 충전)
      const { data: revenueData } = await supabaseBiz
        .from('points_charge_requests')
        .select('amount')
        .eq('status', 'confirmed')
        .gte('created_at', `${selectedMonth}-01`)
        .lt('created_at', getNextMonth(selectedMonth))

      const revenue = revenueData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

      // 2. 포인트 지급 비용 (크리에이터 출금)
      const { data: withdrawalData } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('final_amount')
        .eq('status', 'completed')
        .gte('completed_at', `${selectedMonth}-01`)
        .lt('completed_at', getNextMonth(selectedMonth))

      const withdrawalCost = withdrawalData?.reduce((sum, w) => sum + (w.final_amount || 0), 0) || 0

      // 3. 고정비
      const { data: fixedData } = await supabaseBiz
        .from('expense_records')
        .select('amount')
        .eq('expense_type', 'fixed')
        .eq('expense_month', selectedMonth)

      const fixedExpenses = fixedData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

      // 4. 변동비
      const { data: variableData } = await supabaseBiz
        .from('expense_records')
        .select('amount')
        .eq('expense_type', 'variable')
        .eq('expense_month', selectedMonth)

      const variableExpenses = variableData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

      // 5. 순이익 계산
      const netProfit = revenue - withdrawalCost - fixedExpenses - variableExpenses

      setMonthlyData({
        revenue,
        withdrawalCost,
        fixedExpenses,
        variableExpenses,
        netProfit
      })
    } catch (error) {
      console.error('월별 데이터 조회 오류:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('expense_records')
        .select('*')
        .eq('expense_month', selectedMonth)
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('비용 조회 오류:', error)
    }
  }

  const getNextMonth = (month) => {
    const [year, monthNum] = month.split('-').map(Number)
    const nextDate = new Date(year, monthNum, 1)
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`
  }

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      alert('필수 항목을 입력해주세요.')
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const expenseData = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        expense_month: selectedMonth,
        created_by: user.id,
        recurring_day: expenseForm.is_recurring ? parseInt(expenseForm.recurring_day) : null
      }

      if (editingExpense) {
        // 수정
        const { error } = await supabaseBiz
          .from('expense_records')
          .update(expenseData)
          .eq('id', editingExpense.id)

        if (error) throw error
        alert('비용이 수정되었습니다.')
      } else {
        // 추가
        const { error } = await supabaseBiz
          .from('expense_records')
          .insert([expenseData])

        if (error) throw error
        alert('비용이 추가되었습니다.')
      }

      setShowAddExpenseModal(false)
      setEditingExpense(null)
      setExpenseForm({
        expense_type: 'fixed',
        category: '인건비',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurring_day: ''
      })

      fetchMonthlyData()
      fetchExpenses()
    } catch (error) {
      console.error('비용 추가/수정 오류:', error)
      alert('비용 추가/수정 중 오류가 발생했습니다.')
    }
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setExpenseForm({
      expense_type: expense.expense_type,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      is_recurring: expense.is_recurring,
      recurring_day: expense.recurring_day?.toString() || ''
    })
    setShowAddExpenseModal(true)
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('expense_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('비용이 삭제되었습니다.')
      fetchMonthlyData()
      fetchExpenses()
    } catch (error) {
      console.error('비용 삭제 오류:', error)
      alert('비용 삭제 중 오류가 발생했습니다.')
    }
  }

  const getMonthOptions = () => {
    const months = []
    for (let i = 0; i < 24; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.push(monthStr)
    }
    return months
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const getCategoryIcon = (category) => {
    const icons = {
      '인건비': '👥',
      '임대료': '🏢',
      '광고비': '📢',
      '서버비용': '💻',
      '기타': '📦'
    }
    return icons[category] || '💰'
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold">매출 관리 (고도화)</h1>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border rounded-lg font-medium"
              >
                {getMonthOptions().map(month => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 손익 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">매출</p>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(monthlyData.revenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">포인트 지급</p>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  -{formatCurrency(monthlyData.withdrawalCost)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">고정비</p>
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  -{formatCurrency(monthlyData.fixedExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">변동비</p>
                  <TrendingDown className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  -{formatCurrency(monthlyData.variableExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card className={monthlyData.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">순이익</p>
                  <DollarSign className={`w-5 h-5 ${monthlyData.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
                </div>
                <p className={`text-2xl font-bold ${monthlyData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(monthlyData.netProfit)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 비용 관리 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>비용 관리</CardTitle>
                <Button onClick={() => {
                  setEditingExpense(null)
                  setShowAddExpenseModal(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  비용 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="fixed">고정비</TabsTrigger>
                  <TabsTrigger value="variable">변동비</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ExpenseList 
                    expenses={expenses} 
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    getCategoryIcon={getCategoryIcon}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                <TabsContent value="fixed">
                  <ExpenseList 
                    expenses={expenses.filter(e => e.expense_type === 'fixed')} 
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    getCategoryIcon={getCategoryIcon}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>

                <TabsContent value="variable">
                  <ExpenseList 
                    expenses={expenses.filter(e => e.expense_type === 'variable')} 
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    getCategoryIcon={getCategoryIcon}
                    formatCurrency={formatCurrency}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 비용 추가/수정 모달 */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingExpense ? '비용 수정' : '비용 추가'}
            </h2>

            <div className="space-y-4">
              <div>
                <Label>비용 유형 *</Label>
                <select
                  value={expenseForm.expense_type}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="fixed">고정비</option>
                  <option value="variable">변동비</option>
                </select>
              </div>

              <div>
                <Label>카테고리 *</Label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="인건비">인건비</option>
                  <option value="임대료">임대료</option>
                  <option value="광고비">광고비</option>
                  <option value="서버비용">서버비용</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <Label>설명 *</Label>
                <Textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="비용 설명"
                  rows={3}
                />
              </div>

              <div>
                <Label>금액 *</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="금액 (원)"
                />
              </div>

              <div>
                <Label>날짜 *</Label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={expenseForm.is_recurring}
                  onChange={(e) => setExpenseForm({ ...expenseForm, is_recurring: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_recurring">매월 반복</Label>
              </div>

              {expenseForm.is_recurring && (
                <div>
                  <Label>매월 발생일</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={expenseForm.recurring_day}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recurring_day: e.target.value })}
                    placeholder="1-31"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleAddExpense} className="flex-1">
                {editingExpense ? '수정' : '추가'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddExpenseModal(false)
                  setEditingExpense(null)
                }}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 비용 목록 컴포넌트
function ExpenseList({ expenses, onEdit, onDelete, getCategoryIcon, formatCurrency }) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        등록된 비용이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3 mt-4">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{expense.description}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    expense.expense_type === 'fixed' 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {expense.expense_type === 'fixed' ? '고정비' : '변동비'}
                  </span>
                  {expense.is_recurring && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      매월 {expense.recurring_day}일
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {expense.category} · {new Date(expense.expense_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-lg font-bold text-red-600">
              -{formatCurrency(expense.amount)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(expense)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(expense.id)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

