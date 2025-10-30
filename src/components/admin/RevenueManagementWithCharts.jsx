import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, DollarSign, Upload, Plus, Trash2, 
  BarChart3, PieChart, Calendar, Download 
} from 'lucide-react'
import { 
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import Papa from 'papaparse'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function RevenueManagementWithCharts() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  
  // 매출 데이터
  const [revenueData, setRevenueData] = useState([])
  const [expenses, setExpenses] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  
  // 통계
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalCreatorCost: 0,
    netProfit: 0,
    totalReceivable: 0,
    // 기간별 통계
    thisMonthRevenue: 0,
    thisMonthExpenses: 0,
    thisQuarterRevenue: 0,
    thisQuarterExpenses: 0,
    thisYearRevenue: 0,
    thisYearExpenses: 0
  })
  
  // 새 데이터 입력
  const [newRevenue, setNewRevenue] = useState({
    month: '',
    amount: '',
    source: 'campaign',
    description: ''
  })
  
  const [newExpense, setNewExpense] = useState({
    month: '',
    amount: '',
    type: 'fixed',
    category: 'office',
    description: '',
    is_recurring: false
  })
  
  // 필터 및 페이지네이션
  const [revenueFilter, setRevenueFilter] = useState('all')
  const [revenueLimit, setRevenueLimit] = useState(50)
  const [expenseFilter, setExpenseFilter] = useState('all')
  const [expenseLimit, setExpenseLimit] = useState(50)
  
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  
  // 편집 모달
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchAllData()
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
      .maybeSingle()

    if (!adminData) {
      navigate('/login')
    }
  }

  const fetchAllData = async () => {
    await Promise.all([
      fetchRevenueData(),
      fetchExpenses(),
      fetchWithdrawals()
    ])
  }

  const fetchRevenueData = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('financial_records')
        .select('*')
        .order('record_date', { ascending: false })

      if (error) throw error
      setRevenueData(data || [])
    } catch (error) {
      console.error('매출 데이터 조회 오류:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      // financial_records에서 비용 데이터 조회
      const { data, error } = await supabaseBiz
        .from('financial_records')
        .select('*')
        .in('type', ['fixed_cost', 'creator_cost', 'variable_cost'])
        .order('record_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('비용 데이터 조회 오류:', error)
    }
  }

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('amount, created_at, status')
        .eq('status', 'completed')

      if (error) throw error
      setWithdrawals(data || [])
    } catch (error) {
      console.error('크리에이터 출금 데이터 조회 오류:', error)
    }
  }

  // 통계 계산
  useEffect(() => {
    // financial_records에서 type별로 분리
    const totalRevenue = revenueData
      .filter(r => r.type === 'revenue')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const totalFixedCost = revenueData
      .filter(r => r.type === 'fixed_cost')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const totalCreatorCost = revenueData
      .filter(r => r.type === 'creator_cost')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const totalVariableCost = revenueData
      .filter(r => r.type === 'variable_cost')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    // expense_records에서 추가 비용
    const expenseTotal = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    
    // creator_withdrawal_requests에서 추가 크리에이터 비용
    const withdrawalTotal = withdrawals.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0)
    
    const totalExpenses = totalFixedCost + totalVariableCost + expenseTotal
    const totalCreatorCostFinal = totalCreatorCost + withdrawalTotal
    const netProfit = totalRevenue - totalExpenses - totalCreatorCostFinal
    
    // 미수금 계산
    const totalReceivable = revenueData
      .filter(r => r.type === 'revenue' && r.is_receivable === true)
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    // 현재 날짜 기준
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12
    const currentQuarter = Math.ceil(currentMonth / 3) // 1-4
    
    // 이번 달 통계
    const thisMonthRevenue = revenueData
      .filter(r => r.type === 'revenue' && r.record_date && 
        r.record_date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`))
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const thisMonthExpenses = revenueData
      .filter(r => (r.type === 'fixed_cost' || r.type === 'variable_cost' || r.type === 'creator_cost') && 
        r.record_date && r.record_date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`))
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    // 이번 분기 통계
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1
    const quarterEndMonth = currentQuarter * 3
    const thisQuarterRevenue = revenueData
      .filter(r => r.type === 'revenue' && r.record_date) 
      .filter(r => {
        const month = parseInt(r.record_date.substring(5, 7))
        const year = parseInt(r.record_date.substring(0, 4))
        return year === currentYear && month >= quarterStartMonth && month <= quarterEndMonth
      })
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const thisQuarterExpenses = revenueData
      .filter(r => (r.type === 'fixed_cost' || r.type === 'variable_cost' || r.type === 'creator_cost') && r.record_date)
      .filter(r => {
        const month = parseInt(r.record_date.substring(5, 7))
        const year = parseInt(r.record_date.substring(0, 4))
        return year === currentYear && month >= quarterStartMonth && month <= quarterEndMonth
      })
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    // 올해 통계
    const thisYearRevenue = revenueData
      .filter(r => r.type === 'revenue' && r.record_date && r.record_date.startsWith(`${currentYear}`))
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    
    const thisYearExpenses = revenueData
      .filter(r => (r.type === 'fixed_cost' || r.type === 'variable_cost' || r.type === 'creator_cost') && 
        r.record_date && r.record_date.startsWith(`${currentYear}`))
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

    setStats({
      totalRevenue,
      totalExpenses,
      totalCreatorCost: totalCreatorCostFinal,
      netProfit,
      totalReceivable,
      thisMonthRevenue,
      thisMonthExpenses,
      thisQuarterRevenue,
      thisQuarterExpenses,
      thisYearRevenue,
      thisYearExpenses
    })
  }, [revenueData, expenses, withdrawals])
  
  // 엑셀 업로드 처리
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    setUploading(true)
    setUploadResult(null)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(), // BOM 제거
      complete: async (results) => {
        try {
          const records = results.data.map(row => ({
            record_date: row.date || row['날짜'] || row['일자'],
            type: row.type || row['유형'],
            amount: parseFloat(row.amount || row['금액'] || 0),
            description: row.description || row['설명'] || '',
            category: row.category || row['카테고리'] || null
          })).filter(r => r.record_date && r.type && r.amount)
          
          if (records.length === 0) {
            setUploadResult({ success: false, message: '유효한 데이터가 없습니다.' })
            setUploading(false)
            return
          }
          
          const { error } = await supabaseBiz
            .from('financial_records')
            .insert(records)
          
          if (error) throw error
          
          setUploadResult({ 
            success: true, 
            message: `${records.length}건의 데이터가 성공적으로 업로드되었습니다.` 
          })
          fetchAllData()
        } catch (error) {
          console.error('엑셀 업로드 오류:', error)
          setUploadResult({ 
            success: false, 
            message: '업로드 중 오류가 발생했습니다: ' + error.message 
          })
        } finally {
          setUploading(false)
        }
      },
      error: (error) => {
        console.error('파일 파싱 오류:', error)
        setUploadResult({ 
          success: false, 
          message: '파일을 읽는 중 오류가 발생했습니다.' 
        })
        setUploading(false)
      }
    })
  }

  // 월별 데이터 집계
  const getMonthlyData = () => {
    const monthlyMap = {}

    // financial_records에서 type별로 분리하여 집계
    revenueData.forEach(r => {
      const month = r.record_date ? r.record_date.substring(0, 7) : null // YYYY-MM
      if (!month) return
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, revenue: 0, expenses: 0, creatorCost: 0 }
      }
      
      // type에 따라 분류
      if (r.type === 'revenue') {
        monthlyMap[month].revenue += parseFloat(r.amount) || 0
      } else if (r.type === 'fixed_cost' || r.type === 'variable_cost') {
        monthlyMap[month].expenses += parseFloat(r.amount) || 0
      } else if (r.type === 'creator_cost') {
        monthlyMap[month].creatorCost += parseFloat(r.amount) || 0
      }
    })

    // expense_records에서 추가 비용
    expenses.forEach(e => {
      const month = e.expense_month || (e.expense_date ? e.expense_date.substring(0, 7) : null)
      if (!month) return
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, revenue: 0, expenses: 0, creatorCost: 0 }
      }
      monthlyMap[month].expenses += parseFloat(e.amount) || 0
    })

    // 크리에이터 비용 (월별로 집계)
    withdrawals.forEach(w => {
      const month = w.created_at.substring(0, 7) // YYYY-MM
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, revenue: 0, expenses: 0, creatorCost: 0 }
      }
      monthlyMap[month].creatorCost += parseFloat(w.amount) || 0
    })

    return Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        ...m,
        profit: m.revenue - m.expenses - m.creatorCost
      }))
  }

  // 매출 추가
  const handleAddRevenue = async () => {
    if (!newRevenue.month || !newRevenue.amount) {
      alert('월과 금액을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('financial_records')
        .insert([newRevenue])

      if (error) throw error

      alert('매출이 추가되었습니다.')
      setNewRevenue({ month: '', amount: '', source: 'campaign', description: '' })
      fetchRevenueData()
    } catch (error) {
      console.error('매출 추가 오류:', error)
      alert('매출 추가에 실패했습니다.')
    }
  }

  // 비용 추가
  const handleAddExpense = async () => {
    if (!newExpense.month || !newExpense.amount) {
      alert('월과 금액을 입력해주세요.')
      return
    }

    try {
      // financial_records에 삽입
      const { error } = await supabaseBiz
        .from('financial_records')
        .insert([{
          record_date: `${newExpense.month}-01`,
          type: newExpense.type === 'fixed' ? 'fixed_cost' : 'variable_cost',
          amount: parseFloat(newExpense.amount),
          description: newExpense.description,
          category: newExpense.category,
          is_receivable: false
        }])

      if (error) throw error

      alert('비용이 추가되었습니다.')
      setNewExpense({ 
        month: '', 
        amount: '', 
        type: 'fixed', 
        category: 'office', 
        description: '',
        is_recurring: false 
      })
      fetchAllData()
    } catch (error) {
      console.error('비용 추가 오류:', error)
      alert('비용 추가에 실패했습니다.')
    }
  }

  // 엑셀 다운로드 (템플릿)
  const downloadTemplate = () => {
    const csv = 'date,type,amount,description,category\n2024-01-15,revenue,10000000,1월 캠페인 매출,campaign\n2024-01-20,fixed_cost,2000000,사무실 임대료,office\n2024-01-25,creator_cost,3000000,크리에이터 지급,payment'
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'revenue_template.csv'
    link.click()
  }

  const monthlyData = getMonthlyData()

  // 파이 차트 데이터 - 매출 대비 비율 (미수금 반영)
  const totalCost = stats.totalExpenses + stats.totalCreatorCost
  const totalAccountsReceivable = revenueData.filter(r => r.is_accounts_receivable).reduce((sum, r) => sum + r.amount, 0)
  const netProfit = stats.totalRevenue - totalCost - totalAccountsReceivable
  
  // 매출 대비 비율 계산
  const totalRevenue = stats.totalRevenue || 1 // 0으로 나누기 방지
  const pieData = [
    { 
      name: '순이익', 
      value: (netProfit > 0 ? netProfit : 0) / totalRevenue * 100, 
      actualValue: netProfit > 0 ? netProfit : 0,
      color: '#10b981' 
    },
    { 
      name: '고정비', 
      value: stats.totalExpenses / totalRevenue * 100, 
      actualValue: stats.totalExpenses,
      color: '#ef4444' 
    },
    { 
      name: '크리에이터비', 
      value: stats.totalCreatorCost / totalRevenue * 100, 
      actualValue: stats.totalCreatorCost,
      color: '#f59e0b' 
    },
    { 
      name: '미수금', 
      value: totalAccountsReceivable / totalRevenue * 100, 
      actualValue: totalAccountsReceivable,
      color: '#6366f1' 
    }
  ]

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1']

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              매출 관리 (그래프)
            </h1>
            <p className="text-gray-600 mt-1">매출, 비용, 순이익을 시각화하여 관리하세요</p>
          </div>

          {/* 기간별 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 이번 달 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{new Date().getMonth() + 1}월 매출 (이번 달)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₩{stats.thisMonthRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            {/* 이번 분기 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{Math.ceil((new Date().getMonth() + 1) / 3)}분기 매출 (이번 분기)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₩{stats.thisQuarterRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            {/* 올해 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{new Date().getFullYear()}년 매출 (올해)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₩{stats.thisYearRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 이번 달 매입 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{new Date().getMonth() + 1}월 매입 (이번 달)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₩{stats.thisMonthExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            {/* 이번 분기 매입 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{Math.ceil((new Date().getMonth() + 1) / 3)}분기 매입 (이번 분기)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₩{stats.thisQuarterExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            {/* 올해 매입 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{new Date().getFullYear()}년 매입 (올해)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₩{stats.thisYearExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 순이익 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 이번 달 순이익 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{new Date().getMonth() + 1}월 순이익 (이번 달)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₩{(stats.thisMonthRevenue - stats.thisMonthExpenses).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            {/* 이번 분기 순이익 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{Math.ceil((new Date().getMonth() + 1) / 3)}분기 순이익 (이번 분기)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₩{(stats.thisQuarterRevenue - stats.thisQuarterExpenses).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            {/* 올해 순이익 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{new Date().getFullYear()}년 순이익 (올해)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₩{(stats.thisYearRevenue - stats.thisYearExpenses).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
              <TabsTrigger value="overview">
                <BarChart3 className="w-4 h-4 mr-2" />
                개요
              </TabsTrigger>
              <TabsTrigger value="revenue">
                <DollarSign className="w-4 h-4 mr-2" />
                매출 관리
              </TabsTrigger>
              <TabsTrigger value="expenses">
                <TrendingUp className="w-4 h-4 mr-2" />
                비용 관리
              </TabsTrigger>
              <TabsTrigger value="receivable">
                <Calendar className="w-4 h-4 mr-2" />
                미수금
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="w-4 h-4 mr-2" />
                엑셀 업로드
              </TabsTrigger>
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-6">
              {/* 월별 추이 그래프 */}
              <Card>
                <CardHeader>
                  <CardTitle>월별 매출/비용 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={450}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip 
                        formatter={(value) => `₩${value.toLocaleString()}`}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="매출" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="고정비" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="creatorCost" stroke="#f59e0b" name="크리에이터비" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" name="순이익" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 막대 그래프 */}
                <Card>
                  <CardHeader>
                    <CardTitle>월별 비교</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip 
                          formatter={(value) => `₩${value.toLocaleString()}`}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="revenue" fill="#3b82f6" name="매출" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="expenses" fill="#ef4444" name="고정비" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="creatorCost" fill="#f59e0b" name="크리에이터비" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 파이 차트 */}
                <Card>
                  <CardHeader>
                    <CardTitle>비용 구성</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 매출 관리 탭 */}
            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>새 매출 추가</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">월 (YYYY-MM) *</label>
                      <Input
                        type="month"
                        value={newRevenue.month}
                        onChange={(e) => setNewRevenue({ ...newRevenue, month: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">금액 *</label>
                      <Input
                        type="number"
                        placeholder="10000000"
                        value={newRevenue.amount}
                        onChange={(e) => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">출처</label>
                    <select
                      className="w-full p-3 border rounded-lg"
                      value={newRevenue.source}
                      onChange={(e) => setNewRevenue({ ...newRevenue, source: e.target.value })}
                    >
                      <option value="campaign">캠페인</option>
                      <option value="subscription">구독</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">설명</label>
                    <Input
                      type="text"
                      placeholder="매출 설명"
                      value={newRevenue.description}
                      onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddRevenue} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    매출 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>매출 내역 ({revenueData.filter(r => r.type === 'revenue').length}건)</CardTitle>
                    <select 
                      value={revenueFilter}
                      onChange={(e) => { setRevenueFilter(e.target.value); setRevenueLimit(50); }}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value="all">전체 기간</option>
                      {Array.from(new Set(revenueData.map(r => r.record_date?.substring(0, 7)))).sort().reverse().map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">분류</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {revenueData
                          .filter(r => r.type === 'revenue')
                          .filter(r => revenueFilter === 'all' || r.record_date?.startsWith(revenueFilter))
                          .slice(0, revenueLimit)
                          .map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {new Date(record.record_date).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {record.description || record.category}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                              +₩{parseFloat(record.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setEditingRecord(record)
                                    setEditModalOpen(true)
                                  }}
                                >
                                  수정
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className={record.is_receivable ? 'bg-yellow-50 text-yellow-600' : ''}
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabaseBiz
                                        .from('financial_records')
                                        .update({ is_receivable: !record.is_receivable })
                                        .eq('id', record.id)
                                      
                                      if (error) throw error
                                      fetchAllData()
                                    } catch (error) {
                                      console.error('미수금 설정 오류:', error)
                                      alert('미수금 설정에 실패했습니다.')
                                    }
                                  }}
                                >
                                  {record.is_receivable ? '미수금 해제' : '미수금'}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={async () => {
                                    if (!confirm('정말 삭제하시겠습니까?')) return
                                    try {
                                      const { error } = await supabaseBiz
                                        .from('financial_records')
                                        .delete()
                                        .eq('id', record.id)
                                      
                                      if (error) throw error
                                      alert('삭제되었습니다.')
                                      fetchAllData()
                                    } catch (error) {
                                      console.error('삭제 오류:', error)
                                      alert('삭제에 실패했습니다.')
                                    }
                                  }}
                                >
                                  삭제
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {revenueData.filter(r => r.type === 'revenue').filter(r => revenueFilter === 'all' || r.record_date?.startsWith(revenueFilter)).length > revenueLimit && (
                      <div className="mt-4 text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => setRevenueLimit(prev => prev + 50)}
                        >
                          더보기 ({revenueLimit} / {revenueData.filter(r => r.type === 'revenue').filter(r => revenueFilter === 'all' || r.record_date?.startsWith(revenueFilter)).length})
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 비용 관리 탭 */}
            <TabsContent value="expenses" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>새 비용 추가</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">월 (YYYY-MM) *</label>
                      <Input
                        type="month"
                        value={newExpense.month}
                        onChange={(e) => setNewExpense({ ...newExpense, month: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">금액 *</label>
                      <Input
                        type="number"
                        placeholder="1000000"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">유형</label>
                      <select
                        className="w-full p-3 border rounded-lg"
                        value={newExpense.type}
                        onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value })}
                      >
                        <option value="fixed_cost">고정비</option>
                        <option value="creator_cost">크리에이터비</option>
                        <option value="variable_cost">변동비</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">카테고리</label>
                      <select
                        className="w-full p-3 border rounded-lg"
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      >
                        <option value="office">사무실</option>
                        <option value="salary">급여</option>
                        <option value="marketing">마케팅</option>
                        <option value="software">소프트웨어</option>
                        <option value="other">기타</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">설명</label>
                    <Input
                      type="text"
                      placeholder="비용 설명"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newExpense.is_recurring}
                      onChange={(e) => setNewExpense({ ...newExpense, is_recurring: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">반복 비용 (매월 자동 추가)</span>
                  </label>
                  <Button onClick={handleAddExpense} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    비용 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>비용 내역 ({revenueData.filter(r => r.type !== 'revenue').length}건)</CardTitle>
                    <select 
                      value={expenseFilter}
                      onChange={(e) => { setExpenseFilter(e.target.value); setExpenseLimit(50); }}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value="all">전체 기간</option>
                      {Array.from(new Set(revenueData.filter(r => r.type !== 'revenue').map(r => r.record_date?.substring(0, 7)))).sort().reverse().map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {revenueData
                          .filter(r => r.type !== 'revenue')
                          .filter(r => expenseFilter === 'all' || r.record_date?.startsWith(expenseFilter))
                          .slice(0, expenseLimit)
                          .map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {new Date(expense.record_date).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                expense.type === 'fixed_cost' ? 'bg-red-100 text-red-800' :
                                expense.type === 'creator_cost' ? 'bg-orange-100 text-orange-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {expense.type === 'fixed_cost' ? '고정비' :
                                 expense.type === 'creator_cost' ? '크리에이터비' : '변동비'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {expense.description}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                              -₩{parseFloat(expense.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={async () => {
                                  if (!confirm('정말 삭제하시겠습니까?')) return
                                  try {
                                    const { error } = await supabaseBiz
                                      .from('financial_records')
                                      .delete()
                                      .eq('id', expense.id)
                                    
                                    if (error) throw error
                                    alert('삭제되었습니다.')
                                    fetchAllData()
                                  } catch (error) {
                                    console.error('삭제 오류:', error)
                                    alert('삭제에 실패했습니다.')
                                  }
                                }}
                              >
                                삭제
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {revenueData.filter(r => r.type !== 'revenue').filter(r => expenseFilter === 'all' || r.record_date?.startsWith(expenseFilter)).length > expenseLimit && (
                      <div className="mt-4 text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => setExpenseLimit(prev => prev + 50)}
                        >
                          더보기 ({expenseLimit} / {revenueData.filter(r => r.type !== 'revenue').filter(r => expenseFilter === 'all' || r.record_date?.startsWith(expenseFilter)).length})
                        </Button>
                      </div>
                    )}
                    {revenueData.filter(r => r.type !== 'revenue').length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        비용 내역이 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 엑셀 업로드 탭 */}
            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>과거 매출 데이터 업로드</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    CSV 파일로 과거 매출 데이터를 일괄 업로드할 수 있습니다.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-4">
                      CSV 파일을 선택하거나 드래그하여 업로드하세요
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 ${
                        uploading ? 'opacity-50 pointer-events-none' : ''
                      }`}>
                        {uploading ? '업로드 중...' : '파일 선택'}
                      </span>
                    </label>
                  </div>

                  {uploadResult && (
                    <div className={`border rounded-lg p-4 ${
                      uploadResult.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <p className={`text-sm ${
                        uploadResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {uploadResult.message}
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">CSV 파일 형식</h4>
                    <p className="text-sm text-gray-700 mb-2">다음 형식으로 작성해주세요:</p>
                    <code className="block bg-white p-3 rounded text-xs font-mono">
                      date,type,amount,description,category<br />
                      2024-01-15,revenue,10000000,1월 캠페인 매출,campaign<br />
                      2024-01-20,fixed_cost,2000000,사무실 임대료,office<br />
                      2024-01-25,creator_cost,3000000,크리에이터 지급,payment
                    </code>
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>type:</strong> revenue (매출), fixed_cost (고정비), creator_cost (크리에이터비), variable_cost (변동비)
                    </p>
                  </div>

                  <Button onClick={downloadTemplate} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    템플릿 다운로드
                  </Button>
                </CardContent>
              </Card>

              {/* 상세 내역 테이블 */}
              <Card>
                <CardHeader>
                  <CardTitle>상세 내역</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 필터 */}
                    <div className="flex gap-2">
                      <select 
                        className="border rounded px-3 py-2 text-sm"
                        onChange={(e) => {
                          const filtered = revenueData.filter(r => 
                            e.target.value === 'all' || r.type === e.target.value
                          )
                          // 필터링 로직 추가 필요
                        }}
                      >
                        <option value="all">전체</option>
                        <option value="revenue">매출</option>
                        <option value="fixed_cost">고정비</option>
                        <option value="creator_cost">크리에이터비</option>
                        <option value="variable_cost">변동비</option>
                      </select>
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {revenueData.slice(0, 50).map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                {new Date(record.record_date).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                  record.type === 'revenue' ? 'bg-blue-100 text-blue-800' :
                                  record.type === 'fixed_cost' ? 'bg-red-100 text-red-800' :
                                  record.type === 'creator_cost' ? 'bg-orange-100 text-orange-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {record.type === 'revenue' ? '매출' :
                                   record.type === 'fixed_cost' ? '고정비' :
                                   record.type === 'creator_cost' ? '크리에이터비' : '변동비'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {record.category || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {record.description}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                <span className={record.type === 'revenue' ? 'text-blue-600' : 'text-red-600'}>
                                  {record.type === 'revenue' ? '+' : '-'}₩{parseFloat(record.amount).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {record.type === 'revenue' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className={record.is_receivable ? 'bg-yellow-50 text-yellow-600' : ''}
                                      onClick={async () => {
                                        try {
                                          const { error } = await supabaseBiz
                                            .from('financial_records')
                                            .update({ is_receivable: !record.is_receivable })
                                            .eq('id', record.id)
                                          
                                          if (error) throw error
                                          fetchAllData()
                                        } catch (error) {
                                          console.error('미수금 설정 오류:', error)
                                          alert('미수금 설정에 실패했습니다.')
                                        }
                                      }}
                                    >
                                      {record.is_receivable ? '미수금 해제' : '미수금'}
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={async () => {
                                      if (!confirm('정말 삭제하시겠습니까?')) return
                                      try {
                                        const { error } = await supabaseBiz
                                          .from('financial_records')
                                          .delete()
                                          .eq('id', record.id)
                                        
                                        if (error) throw error
                                        alert('삭제되었습니다.')
                                        fetchAllData()
                                      } catch (error) {
                                        console.error('삭제 오류:', error)
                                        alert('삭제에 실패했습니다.')
                                      }
                                    }}
                                  >
                                    삭제
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {revenueData.length > 50 && (
                      <p className="text-sm text-gray-500 text-center">최근 50개 항목만 표시됩니다.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* 미수금 탭 */}
            <TabsContent value="receivable">
              <Card>
                <CardHeader>
                  <CardTitle>미수금 관리</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 미수금 통계 */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-sm text-gray-600">총 미수금</div>
                      <div className="text-3xl font-bold text-yellow-600">
                        ₩{stats.totalReceivable.toLocaleString()}
                      </div>
                    </div>
                    
                    {/* 미수금 목록 */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">분류</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {revenueData
                            .filter(r => r.type === 'revenue' && r.is_receivable === true)
                            .map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                {new Date(record.record_date).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {record.description || record.category}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-yellow-600">
                                ₩{parseFloat(record.amount).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabaseBiz
                                        .from('financial_records')
                                        .update({ is_receivable: false })
                                        .eq('id', record.id)
                                      
                                      if (error) throw error
                                      fetchAllData()
                                    } catch (error) {
                                      console.error('미수금 해제 오류:', error)
                                      alert('미수금 해제에 실패했습니다.')
                                    }
                                  }}
                                >
                                  미수금 해제
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {revenueData.filter(r => r.type === 'revenue' && r.is_receivable === true).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">미수금이 없습니다.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 편집 모달 */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditModalOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">내역 수정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">날짜</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border rounded-md"
                  defaultValue={editingRecord.record_date}
                  onChange={(e) => setEditingRecord({...editingRecord, record_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">분류 (설명)</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  defaultValue={editingRecord.description || editingRecord.category}
                  onChange={(e) => setEditingRecord({...editingRecord, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">금액</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md"
                  defaultValue={editingRecord.amount}
                  onChange={(e) => setEditingRecord({...editingRecord, amount: parseFloat(e.target.value)})}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>취소</Button>
                <Button 
                  onClick={async () => {
                    try {
                      const { error } = await supabaseBiz
                        .from('financial_records')
                        .update({
                          record_date: editingRecord.record_date,
                          description: editingRecord.description,
                          amount: editingRecord.amount
                        })
                        .eq('id', editingRecord.id)
                      
                      if (error) throw error
                      alert('수정되었습니다.')
                      setEditModalOpen(false)
                      fetchAllData()
                    } catch (error) {
                      console.error('수정 오류:', error)
                      alert('수정에 실패했습니다.')
                    }
                  }}
                >
                  저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

