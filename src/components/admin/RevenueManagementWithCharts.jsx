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
    netProfit: 0
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
  
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

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
        .from('revenue_records')
        .select('*')
        .order('month', { ascending: true })

      if (error) throw error
      setRevenueData(data || [])
    } catch (error) {
      console.error('매출 데이터 조회 오류:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('expense_records')
        .select('*')
        .order('month', { ascending: true })

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
    const totalRevenue = revenueData.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    const totalCreatorCost = withdrawals.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0)
    const netProfit = totalRevenue - totalExpenses - totalCreatorCost

    setStats({
      totalRevenue,
      totalExpenses,
      totalCreatorCost,
      netProfit
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
            .from('revenue_records')
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

    // 매출
    revenueData.forEach(r => {
      if (!monthlyMap[r.month]) {
        monthlyMap[r.month] = { month: r.month, revenue: 0, expenses: 0, creatorCost: 0 }
      }
      monthlyMap[r.month].revenue += parseFloat(r.amount) || 0
    })

    // 비용
    expenses.forEach(e => {
      if (!monthlyMap[e.month]) {
        monthlyMap[e.month] = { month: e.month, revenue: 0, expenses: 0, creatorCost: 0 }
      }
      monthlyMap[e.month].expenses += parseFloat(e.amount) || 0
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
        .from('revenue_records')
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
      const { error } = await supabaseBiz
        .from('expense_records')
        .insert([newExpense])

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
      fetchExpenses()
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

  // 파이 차트 데이터
  const pieData = [
    { name: '매출', value: stats.totalRevenue, color: '#3b82f6' },
    { name: '고정비', value: stats.totalExpenses, color: '#ef4444' },
    { name: '크리에이터비', value: stats.totalCreatorCost, color: '#f59e0b' }
  ]

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b']

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

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">총 매출</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  ₩{stats.totalRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">고정비</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  ₩{stats.totalExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">크리에이터비</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  ₩{stats.totalCreatorCost.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">순이익</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₩{stats.netProfit.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
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
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="매출" strokeWidth={2} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="고정비" strokeWidth={2} />
                      <Line type="monotone" dataKey="creatorCost" stroke="#f59e0b" name="크리에이터비" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" name="순이익" strokeWidth={2} />
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
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#3b82f6" name="매출" />
                        <Bar dataKey="expenses" fill="#ef4444" name="고정비" />
                        <Bar dataKey="creatorCost" fill="#f59e0b" name="크리에이터비" />
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
                  <CardTitle>매출 내역 ({revenueData.length}건)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueData.map((revenue) => (
                      <div key={revenue.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-semibold">{revenue.month}</div>
                          <div className="text-sm text-gray-600">{revenue.description}</div>
                          <div className="text-xs text-gray-500">{revenue.source}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            ₩{parseFloat(revenue.amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
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
                        <option value="fixed">고정비</option>
                        <option value="variable">변동비</option>
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
                  <CardTitle>비용 내역 ({expenses.length}건)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-semibold">{expense.month}</div>
                          <div className="text-sm text-gray-600">{expense.description}</div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {expense.type === 'fixed' ? '고정비' : '변동비'}
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-100 rounded">
                              {expense.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">
                            ₩{parseFloat(expense.amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

