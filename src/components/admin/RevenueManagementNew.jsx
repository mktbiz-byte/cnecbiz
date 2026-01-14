import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Plus, Trash2, Edit2, Building2, FileSpreadsheet,
  Receipt, RefreshCw, ExternalLink, Database,
  Zap, Users, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  PieChart, BarChart3, Wallet, CreditCard, DollarSign
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts'

// 비용 카테고리
const EXPENSE_CATEGORIES = [
  '광고비(메타)', '광고비(네이버)', '크리에이터지급', '서버비', 'AI 사용',
  '이메일 스티비', '크리에이터(자사)', '파트타임', '퀵비(후다닥)', '자사 크리에이터',
  '프릭스(래티스)', '이미지블', 'HEEPS', '팝빌', '마누스', '슈퍼베이스',
  '클로드', '볼트', '제미나이', '러버불', '넷틀리파이', 'GPT', '캡컷',
  '렌더', '달리', '메이크', '기타'
]

// 2025년 초기 데이터
const INITIAL_EXPENSE_DATA = {
  '광고비(메타)': [1700026, 3800000, 1657276, 1201617, 2183230, 1397525, 1929745, 2853505, 4653328, 2000000, 0, 0],
  '광고비(네이버)': [0, 0, 0, 93159, 0, 0, 0, 0, 176518, 225280, 587532, 0],
  '크리에이터지급': [10211520, 20028311, 15133158, 25782251, 16506690, 12474300, 21696801, 19739170, 48082122, 44438872, 34345413, 0],
  '서버비': [200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 200000, 0],
  '이메일 스티비': [159000, 517031, 99000, 99000, 430066, 159000, 159000, 357613, 290000, 290000, 290000, 0],
  '파트타임': [721578, 351601, 58600, 205101, 2316708, 597722, 0, 234401, 175801, 546936, 631256, 0],
  '퀵비(후다닥)': [0, 38500, 68200, 70400, 0, 0, 0, 0, 0, 33000, 0, 0],
  '프릭스(래티스)': [0, 0, 0, 0, 0, 133000, 110000, 110000, 110000, 110000, 0, 0],
  '이미지블': [50600, 61600, 61600, 70400, 70400, 70400, 70400, 35200, 35200, 35200, 35200, 0],
  'HEEPS': [0, 0, 0, 0, 0, 0, 0, 0, 0, 129032, 133174, 0],
  '팝빌': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1100000, 0],
  '마누스': [0, 0, 0, 0, 0, 0, 3132060, 1716953, 3627334, 4928260, 0, 0],
  '슈퍼베이스': [0, 0, 0, 0, 0, 0, 0, 35617, 59924, 163632, 0, 0],
  '클로드': [0, 29634, 28878, 27840, 28080, 28267, 0, 0, 0, 354424, 0, 0],
  '볼트': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112229, 0],
  '제미나이': [0, 0, 0, 0, 0, 29904, 29549, 35486, 50486, 55827, 0, 0],
  '러버불': [0, 0, 0, 0, 0, 0, 0, 0, 72748, 37494, 0, 0],
  '넷틀리파이': [0, 0, 0, 0, 0, 0, 0, 0, 0, 184373, 0, 0],
  'GPT': [92104, 91192, 91909, 367680, 173589, 170306, 172805, 172636, 173065, 176896, 119493, 0],
  '캡컷': [10127, 10139, 10154, 0, 51750, 51596, 20182, 32830, 40909, 41284, 0, 0],
  '렌더': [0, 0, 0, 0, 0, 0, 0, 0, 1454, 51628, 0, 0],
  '달리': [0, 0, 0, 0, 0, 0, 0, 41234, 41645, 42278, 0, 0],
  '메이크': [0, 0, 0, 0, 0, 0, 0, 15060, 15207, 15393, 0, 0]
}

const INITIAL_REVENUE_DATA = {
  haupapa: [14261742, 26435500, 43690000, 27346000, 38500000, 28248000, 57090000, 44055500, 36020130, 24255000, 44140200, 0],
  haulab: [13640000, 12596970, 6589000, 5500000, -1320000, 0, 0, 0, 0, 3300000, 74250000, 0]
}

// 차트 색상
const COLORS = {
  haupapa: '#3B82F6',
  haulab: '#10B981',
  expense: '#EF4444',
  profit: '#8B5CF6',
  gradient1: ['#667eea', '#764ba2'],
  gradient2: ['#f093fb', '#f5576c'],
  gradient3: ['#4facfe', '#00f2fe'],
  pie: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
}

const generateMonths = () => {
  const months = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export default function RevenueManagementNew() {
  const navigate = useNavigate()
  const [selectedYear, setSelectedYear] = useState(2025)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  const [revenueData, setRevenueData] = useState([])
  const [expenseData, setExpenseData] = useState([])
  const [receivables, setReceivables] = useState([])
  const [withdrawalData, setWithdrawalData] = useState([])

  const [showRevenueModal, setShowRevenueModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showReceivableModal, setShowReceivableModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [revenueForm, setRevenueForm] = useState({
    corporation: 'haupapa',
    year_month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    amount: '',
    source_type: 'tax_invoice',
    tax_invoice_number: '',
    description: ''
  })

  const [expenseForm, setExpenseForm] = useState({
    corporation: 'haupapa',
    year_month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    category: '광고비(메타)',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  })

  const [receivableForm, setReceivableForm] = useState({
    corporation: 'haupapa',
    company_name: '',
    amount: '',
    description: '',
    due_date: ''
  })

  useEffect(() => {
    checkAuth()
    fetchAllData()
  }, [selectedYear])

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
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const { data: revenue } = await supabaseBiz
        .from('revenue_records')
        .select('*')
        .gte('year_month', `${selectedYear}-01`)
        .lte('year_month', `${selectedYear}-12`)
        .order('year_month', { ascending: true })
      setRevenueData(revenue || [])

      const { data: expenses } = await supabaseBiz
        .from('expense_records')
        .select('*')
        .gte('year_month', `${selectedYear}-01`)
        .lte('year_month', `${selectedYear}-12`)
        .order('year_month', { ascending: true })
      setExpenseData(expenses || [])

      const { data: recv } = await supabaseBiz
        .from('receivables')
        .select('*')
        .order('created_at', { ascending: false })
      setReceivables(recv || [])

      // 크리에이터 출금 데이터 조회 (완료된 출금만)
      const { data: withdrawals, error: withdrawalError } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('id, requested_amount, amount, status, completed_at, created_at')
        .in('status', ['completed', 'approved'])
        .order('created_at', { ascending: true })

      if (withdrawalError) {
        console.error('출금 데이터 조회 오류:', withdrawalError)
      }

      // 선택된 연도에 해당하는 데이터만 필터링
      const filteredWithdrawals = (withdrawals || []).filter(w => {
        const date = new Date(w.completed_at || w.created_at)
        return date.getFullYear() === selectedYear
      })
      console.log(`[출금 데이터] 전체: ${(withdrawals || []).length}건, ${selectedYear}년: ${filteredWithdrawals.length}건`)
      setWithdrawalData(filteredWithdrawals)
    } catch (error) {
      console.error('데이터 조회 오류:', error)
    }
    setLoading(false)
  }

  // 초기 데이터 입력
  const initializeData = async () => {
    if (!confirm('2025년 초기 데이터를 입력하시겠습니까?\n기존 2025년 데이터가 있다면 중복될 수 있습니다.')) return

    setLoading(true)
    try {
      for (const [category, monthlyAmounts] of Object.entries(INITIAL_EXPENSE_DATA)) {
        for (let i = 0; i < 12; i++) {
          if (monthlyAmounts[i] > 0) {
            await supabaseBiz.from('expense_records').insert({
              corporation_id: 'haupapa',
              year_month: `2025-${String(i + 1).padStart(2, '0')}`,
              category: category,
              amount: monthlyAmounts[i],
              source_type: 'initial',
              description: '2025년 초기 데이터'
            })
          }
        }
      }

      for (const [corp, monthlyAmounts] of Object.entries(INITIAL_REVENUE_DATA)) {
        for (let i = 0; i < 12; i++) {
          if (monthlyAmounts[i] !== 0) {
            await supabaseBiz.from('revenue_records').insert({
              corporation_id: corp,
              year_month: `2025-${String(i + 1).padStart(2, '0')}`,
              amount: monthlyAmounts[i],
              source_type: 'initial',
              description: '2025년 초기 데이터'
            })
          }
        }
      }

      await fetchAllData()
      alert('초기 데이터 입력 완료!')
    } catch (error) {
      console.error('초기 데이터 입력 오류:', error)
      alert('초기 데이터 입력 실패: ' + error.message)
    }
    setLoading(false)
  }

  const clearAllData = async () => {
    if (!confirm('정말 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return
    if (!confirm('마지막 확인입니다. 정말 삭제하시겠습니까?')) return

    setLoading(true)
    try {
      await supabaseBiz.from('revenue_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabaseBiz.from('expense_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabaseBiz.from('receivables').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await fetchAllData()
      alert('모든 데이터가 삭제되었습니다.')
    } catch (error) {
      alert('삭제 실패: ' + error.message)
    }
    setLoading(false)
  }

  // 월별 요약 계산
  const monthlySummary = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) =>
      `${selectedYear}-${String(i + 1).padStart(2, '0')}`
    )

    return months.map((month, idx) => {
      const haupapaRevenue = revenueData
        .filter(r => r.year_month === month && r.corporation_id === 'haupapa')
        .reduce((sum, r) => sum + (r.amount || 0), 0)

      const haulabRevenue = revenueData
        .filter(r => r.year_month === month && r.corporation_id === 'haulab')
        .reduce((sum, r) => sum + (r.amount || 0), 0)

      const totalExpense = expenseData
        .filter(e => e.year_month === month)
        .reduce((sum, e) => sum + (e.amount || 0), 0)

      return {
        month,
        name: `${idx + 1}월`,
        haupapaRevenue,
        haulabRevenue,
        totalRevenue: haupapaRevenue + haulabRevenue,
        totalExpense,
        netProfit: haupapaRevenue + haulabRevenue - totalExpense
      }
    })
  }, [revenueData, expenseData, selectedYear])

  // 카테고리별 매입 요약
  const expenseByCategory = useMemo(() => {
    const summary = {}
    expenseData.forEach(exp => {
      if (!summary[exp.category]) {
        summary[exp.category] = 0
      }
      summary[exp.category] += exp.amount || 0
    })
    return Object.entries(summary)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [expenseData])

  // 월별 크리에이터 출금 추이
  const monthlyWithdrawals = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
      name: `${i + 1}월`,
      amount: 0,
      count: 0
    }))

    withdrawalData.forEach(w => {
      const completedDate = new Date(w.completed_at || w.created_at)
      const monthIndex = completedDate.getMonth()
      if (completedDate.getFullYear() === selectedYear && monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex].amount += (w.requested_amount || w.amount || 0)
        months[monthIndex].count += 1
      }
    })

    return months
  }, [withdrawalData, selectedYear])

  // 연간 합계
  const yearlyTotals = useMemo(() => {
    return monthlySummary.reduce((acc, m) => ({
      haupapaRevenue: acc.haupapaRevenue + m.haupapaRevenue,
      haulabRevenue: acc.haulabRevenue + m.haulabRevenue,
      totalRevenue: acc.totalRevenue + m.totalRevenue,
      totalExpense: acc.totalExpense + m.totalExpense,
      netProfit: acc.netProfit + m.netProfit
    }), { haupapaRevenue: 0, haulabRevenue: 0, totalRevenue: 0, totalExpense: 0, netProfit: 0 })
  }, [monthlySummary])

  // 전월 대비 계산
  const currentMonth = new Date().getMonth()
  const currentMonthData = monthlySummary[currentMonth] || {}
  const prevMonthData = monthlySummary[currentMonth - 1] || {}

  const revenueChange = prevMonthData.totalRevenue
    ? ((currentMonthData.totalRevenue - prevMonthData.totalRevenue) / prevMonthData.totalRevenue * 100).toFixed(1)
    : 0

  // 동기화 함수들
  const syncTaxInvoicesToRevenue = async () => {
    if (!confirm('세금계산서 발행 건을 매출에 동기화하시겠습니까?')) return

    setLoading(true)
    try {
      const { data: chargeRequests, error: fetchError } = await supabaseBiz
        .from('points_charge_requests')
        .select('id, amount, tax_invoice_issued, tax_invoice_info, created_at, company_id')
        .eq('tax_invoice_issued', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const { data: existingRevenues } = await supabaseBiz
        .from('revenue_records')
        .select('source_id')
        .eq('source_type', 'tax_invoice')

      const existingIds = new Set((existingRevenues || []).map(r => r.source_id))

      let syncCount = 0
      for (const request of (chargeRequests || [])) {
        if (existingIds.has(request.id)) continue

        const createdDate = new Date(request.created_at)
        const yearMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`
        const taxInfo = request.tax_invoice_info || {}
        const companyName = taxInfo.companyName || taxInfo.company_name || '포인트 충전'

        const recordDate = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`

        const { error: insertError } = await supabaseBiz.from('revenue_records').insert({
          corporation_id: 'haupapa',
          year_month: yearMonth,
          record_date: recordDate,
          type: 'revenue',
          amount: request.amount,
          source_type: 'tax_invoice',
          source_id: request.id,
          tax_invoice_number: taxInfo.nts_confirm_num || taxInfo.mgt_key || '',
          description: `세금계산서 발행: ${companyName}`
        })

        if (insertError) {
          console.error('매출 레코드 삽입 오류:', insertError)
          continue
        }
        syncCount++
      }

      await fetchAllData()
      alert(`동기화 완료: ${syncCount}건의 세금계산서가 매출에 반영되었습니다.`)
    } catch (error) {
      console.error('세금계산서 동기화 오류:', error)
      alert('동기화 실패: ' + error.message)
    }
    setLoading(false)
  }

  const syncWithdrawalsToExpense = async () => {
    if (!confirm('출금 완료 건을 매입(크리에이터지급)에 동기화하시겠습니까?')) return

    setLoading(true)
    try {
      const { data: withdrawals, error: fetchError } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('id, requested_amount, requested_points, final_amount, account_holder, status, completed_at, created_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (fetchError) throw fetchError

      const { data: existingExpenses } = await supabaseBiz
        .from('expense_records')
        .select('source_id')
        .eq('source_type', 'withdrawal')

      const existingIds = new Set((existingExpenses || []).map(e => e.source_id))

      let syncCount = 0
      for (const withdrawal of (withdrawals || [])) {
        if (existingIds.has(withdrawal.id)) continue

        const completedDate = new Date(withdrawal.completed_at || withdrawal.created_at)
        const yearMonth = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`
        const expenseDate = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}-${String(completedDate.getDate()).padStart(2, '0')}`
        const amount = withdrawal.requested_amount || withdrawal.requested_points || withdrawal.final_amount || 0
        const creatorName = withdrawal.account_holder || '크리에이터'

        const { error: insertError } = await supabaseBiz.from('expense_records').insert({
          corporation_id: 'haupapa',
          year_month: yearMonth,
          expense_date: expenseDate,
          expense_month: yearMonth,
          expense_type: 'expense',
          category: '크리에이터지급',
          amount: amount,
          source_type: 'withdrawal',
          source_id: withdrawal.id,
          description: `출금 완료: ${creatorName}`
        })

        if (insertError) {
          console.error('매입 레코드 삽입 오류:', insertError)
          continue
        }
        syncCount++
      }

      await fetchAllData()
      alert(`동기화 완료: ${syncCount}건의 출금이 매입에 반영되었습니다.`)
    } catch (error) {
      console.error('출금 동기화 오류:', error)
      alert('동기화 실패: ' + error.message)
    }
    setLoading(false)
  }

  // 저장/삭제 함수들
  const handleSaveRevenue = async () => {
    try {
      const data = {
        corporation_id: revenueForm.corporation,
        year_month: revenueForm.year_month,
        amount: parseInt(revenueForm.amount) || 0,
        source_type: revenueForm.source_type,
        tax_invoice_number: revenueForm.tax_invoice_number,
        description: revenueForm.description
      }

      if (editingItem) {
        await supabaseBiz.from('revenue_records').update(data).eq('id', editingItem.id)
      } else {
        await supabaseBiz.from('revenue_records').insert(data)
      }

      setShowRevenueModal(false)
      setEditingItem(null)
      resetRevenueForm()
      fetchAllData()
    } catch (error) {
      alert('저장 실패: ' + error.message)
    }
  }

  const handleSaveExpense = async () => {
    try {
      const data = {
        corporation_id: expenseForm.corporation,
        year_month: expenseForm.year_month,
        category: expenseForm.category,
        amount: parseInt(expenseForm.amount) || 0,
        description: expenseForm.description,
        expense_date: expenseForm.expense_date || null
      }

      if (editingItem) {
        await supabaseBiz.from('expense_records').update(data).eq('id', editingItem.id)
      } else {
        await supabaseBiz.from('expense_records').insert(data)
      }

      setShowExpenseModal(false)
      setEditingItem(null)
      resetExpenseForm()
      fetchAllData()
    } catch (error) {
      alert('저장 실패: ' + error.message)
    }
  }

  const handleSaveReceivable = async () => {
    try {
      const data = {
        corporation_id: receivableForm.corporation,
        company_name: receivableForm.company_name,
        amount: parseInt(receivableForm.amount) || 0,
        description: receivableForm.description,
        due_date: receivableForm.due_date || null,
        status: 'pending'
      }

      if (editingItem) {
        await supabaseBiz.from('receivables').update(data).eq('id', editingItem.id)
      } else {
        await supabaseBiz.from('receivables').insert(data)
      }

      setShowReceivableModal(false)
      setEditingItem(null)
      resetReceivableForm()
      fetchAllData()
    } catch (error) {
      alert('저장 실패: ' + error.message)
    }
  }

  const handleDelete = async (table, id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await supabaseBiz.from(table).delete().eq('id', id)
      fetchAllData()
    } catch (error) {
      alert('삭제 실패: ' + error.message)
    }
  }

  const convertReceivableToRevenue = async (receivable) => {
    if (!confirm('미수금을 매출로 전환하시겠습니까?')) return
    const invoiceNumber = prompt('세금계산서 번호:')
    if (!invoiceNumber) return

    try {
      const yearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const { data: revenueRecord } = await supabaseBiz
        .from('revenue_records')
        .insert({
          corporation_id: receivable.corporation_id,
          year_month: yearMonth,
          amount: receivable.amount,
          source_type: 'receivable',
          tax_invoice_number: invoiceNumber,
          description: `미수금 전환: ${receivable.company_name}`
        })
        .select()
        .single()

      await supabaseBiz
        .from('receivables')
        .update({
          status: 'invoiced',
          invoice_date: new Date().toISOString().split('T')[0],
          revenue_record_id: revenueRecord?.id
        })
        .eq('id', receivable.id)

      fetchAllData()
      alert('매출로 전환되었습니다.')
    } catch (error) {
      alert('전환 실패: ' + error.message)
    }
  }

  const resetRevenueForm = () => {
    setRevenueForm({
      corporation: 'haupapa',
      year_month: `${selectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      amount: '',
      source_type: 'tax_invoice',
      tax_invoice_number: '',
      description: ''
    })
  }

  const resetExpenseForm = () => {
    setExpenseForm({
      corporation: 'haupapa',
      year_month: `${selectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      category: '광고비(메타)',
      amount: '',
      description: '',
      expense_date: new Date().toISOString().split('T')[0]
    })
  }

  const resetReceivableForm = () => {
    setReceivableForm({
      corporation: 'haupapa',
      company_name: '',
      amount: '',
      description: '',
      due_date: ''
    })
  }

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-'
    if (num === 0) return '₩0'
    const prefix = num < 0 ? '-' : ''
    return `${prefix}₩${Math.abs(num).toLocaleString()}`
  }

  const formatCompact = (num) => {
    if (!num) return '0'
    if (Math.abs(num) >= 100000000) return `${(num / 100000000).toFixed(1)}억`
    if (Math.abs(num) >= 10000) return `${(num / 10000).toFixed(0)}만`
    return num.toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
              <span className="text-slate-500">데이터를 불러오는 중...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <AdminNavigation />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              매출 관리
            </h1>
            <p className="text-slate-500 mt-1">하우파파 · 하우랩 법인별 매출 및 비용 관리</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28 bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={syncTaxInvoicesToRevenue}
              className="bg-white hover:bg-blue-50 border-blue-200 text-blue-600">
              <Zap className="w-4 h-4 mr-1" />
              세금계산서 동기화
            </Button>

            <Button variant="outline" size="sm" onClick={syncWithdrawalsToExpense}
              className="bg-white hover:bg-green-50 border-green-200 text-green-600">
              <Users className="w-4 h-4 mr-1" />
              출금 동기화
            </Button>

            <Button variant="outline" size="sm" onClick={initializeData}
              className="bg-white hover:bg-slate-50">
              <Database className="w-4 h-4 mr-1" />
              초기 데이터
            </Button>
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {/* 하우파파 매출 */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">하우파파</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCompact(yearlyTotals.haupapaRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-blue-100 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>연간 매출</span>
              </div>
            </CardContent>
          </Card>

          {/* 하우랩 매출 */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">하우랩</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCompact(yearlyTotals.haulabRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-emerald-100 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>연간 매출</span>
              </div>
            </CardContent>
          </Card>

          {/* 총 매출 */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm font-medium">총 매출</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCompact(yearlyTotals.totalRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-violet-100 text-sm">
                {parseFloat(revenueChange) >= 0 ? (
                  <>
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    <span>전월 대비 +{revenueChange}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    <span>전월 대비 {revenueChange}%</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 총 비용 */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-500 to-red-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-sm font-medium">총 비용</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCompact(yearlyTotals.totalExpense)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-rose-100 text-sm">
                <TrendingDown className="w-4 h-4 mr-1" />
                <span>연간 지출</span>
              </div>
            </CardContent>
          </Card>

          {/* 순이익 */}
          <Card className={`relative overflow-hidden border-0 shadow-lg ${
            yearlyTotals.netProfit >= 0
              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
              : 'bg-gradient-to-br from-slate-600 to-slate-700'
          }`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${yearlyTotals.netProfit >= 0 ? 'text-amber-100' : 'text-slate-300'}`}>
                    순이익
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCompact(yearlyTotals.netProfit)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className={`mt-3 flex items-center text-sm ${yearlyTotals.netProfit >= 0 ? 'text-amber-100' : 'text-slate-300'}`}>
                {yearlyTotals.netProfit >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>흑자</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-1" />
                    <span>적자</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur border border-slate-200 p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              대시보드
            </TabsTrigger>
            <TabsTrigger value="expense" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <CreditCard className="w-4 h-4 mr-2" />
              비용 상세
            </TabsTrigger>
            <TabsTrigger value="revenue" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Wallet className="w-4 h-4 mr-2" />
              매출 내역
            </TabsTrigger>
            <TabsTrigger value="receivables" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Receipt className="w-4 h-4 mr-2" />
              미수금
            </TabsTrigger>
          </TabsList>

          {/* 대시보드 탭 */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 월별 매출/비용 차트 */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    월별 매출 · 비용 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySummary} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                        />
                        <Tooltip
                          formatter={(value) => formatNumber(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="haupapaRevenue" name="하우파파" fill={COLORS.haupapa} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="haulabRevenue" name="하우랩" fill={COLORS.haulab} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalExpense" name="비용" fill={COLORS.expense} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 순이익 추이 */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    순이익 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlySummary} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.profit} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLORS.profit} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                        />
                        <Tooltip
                          formatter={(value) => formatNumber(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="netProfit"
                          name="순이익"
                          stroke={COLORS.profit}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorProfit)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 크리에이터 출금 추이 */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    크리에이터 출금 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyWithdrawals} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                        />
                        <Tooltip
                          formatter={(value, name) => [formatNumber(value), name === 'amount' ? '출금액' : '건수']}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="amount" name="출금액" fill="#F97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-center text-sm text-slate-500">
                    연간 총 출금: {formatNumber(monthlyWithdrawals.reduce((sum, m) => sum + m.amount, 0))}
                    ({monthlyWithdrawals.reduce((sum, m) => sum + m.count, 0)}건)
                  </div>
                </CardContent>
              </Card>

              {/* 법인별 매출 비교 */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    법인별 매출 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySummary} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                        />
                        <Tooltip
                          formatter={(value) => formatNumber(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="haupapaRevenue"
                          name="하우파파"
                          stroke={COLORS.haupapa}
                          strokeWidth={3}
                          dot={{ fill: COLORS.haupapa, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="haulabRevenue"
                          name="하우랩"
                          stroke={COLORS.haulab}
                          strokeWidth={3}
                          dot={{ fill: COLORS.haulab, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 월별 상세 테이블 */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-700">
                  {selectedYear}년 월별 상세
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">구분</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="px-3 py-3 text-right text-sm font-semibold text-slate-600">{i + 1}월</th>
                        ))}
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 bg-slate-50">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 bg-blue-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-700">하우파파</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-3 py-3 text-right text-sm text-blue-600">
                            {m.haupapaRevenue > 0 ? formatCompact(m.haupapaRevenue) : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-700 bg-blue-100/50">
                          {formatCompact(yearlyTotals.haupapaRevenue)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-emerald-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-emerald-700">하우랩</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-3 py-3 text-right text-sm text-emerald-600">
                            {m.haulabRevenue !== 0 ? formatCompact(m.haulabRevenue) : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 bg-emerald-100/50">
                          {formatCompact(yearlyTotals.haulabRevenue)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-rose-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-rose-700">비용</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-3 py-3 text-right text-sm text-rose-600">
                            {m.totalExpense > 0 ? formatCompact(m.totalExpense) : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right text-sm font-bold text-rose-700 bg-rose-100/50">
                          {formatCompact(yearlyTotals.totalExpense)}
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">순이익</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className={`px-3 py-3 text-right text-sm font-semibold ${
                            m.netProfit >= 0 ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {m.netProfit !== 0 ? formatCompact(m.netProfit) : '-'}
                          </td>
                        ))}
                        <td className={`px-4 py-3 text-right text-sm font-bold ${
                          yearlyTotals.netProfit >= 0 ? 'text-amber-700 bg-amber-100/50' : 'text-slate-600 bg-slate-100'
                        }`}>
                          {formatCompact(yearlyTotals.netProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 비용 상세 탭 */}
          <TabsContent value="expense">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-700">비용 상세</CardTitle>
                <Button size="sm" onClick={() => { resetExpenseForm(); setShowExpenseModal(true) }}
                  className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600">
                  <Plus className="w-4 h-4 mr-1" /> 비용 추가
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-3 text-left font-semibold text-slate-600 sticky left-0 bg-white">카테고리</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="px-2 py-3 text-right font-semibold text-slate-600">{i + 1}월</th>
                        ))}
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 bg-slate-50">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EXPENSE_CATEGORIES.map(category => {
                        const monthlyAmounts = Array.from({ length: 12 }, (_, i) => {
                          const month = `${selectedYear}-${String(i + 1).padStart(2, '0')}`
                          return expenseData
                            .filter(e => e.year_month === month && e.category === category)
                            .reduce((sum, e) => sum + (e.amount || 0), 0)
                        })
                        const total = monthlyAmounts.reduce((a, b) => a + b, 0)
                        if (total === 0) return null

                        return (
                          <tr key={category} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-white">{category}</td>
                            {monthlyAmounts.map((amount, i) => (
                              <td key={i} className="px-2 py-2 text-right text-slate-600">
                                {amount > 0 ? formatCompact(amount) : '-'}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right font-semibold text-slate-700 bg-slate-50">
                              {formatCompact(total)}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-rose-50 font-bold">
                        <td className="px-3 py-3 text-rose-700 sticky left-0 bg-rose-50">합계</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-2 py-3 text-right text-rose-600">
                            {m.totalExpense > 0 ? formatCompact(m.totalExpense) : '-'}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right text-rose-700 bg-rose-100">
                          {formatCompact(yearlyTotals.totalExpense)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 매출 내역 탭 */}
          <TabsContent value="revenue">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-700">매출 내역</CardTitle>
                <Button size="sm" onClick={() => { resetRevenueForm(); setShowRevenueModal(true) }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                  <Plus className="w-4 h-4 mr-1" /> 매출 추가
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {revenueData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>매출 데이터가 없습니다.</p>
                    </div>
                  ) : (
                    revenueData.map(revenue => (
                      <div key={revenue.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            revenue.corporation_id === 'haupapa' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`} />
                          <div>
                            <div className="font-medium text-slate-700">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs mr-2 ${
                                revenue.corporation_id === 'haupapa'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {revenue.corporation_id === 'haupapa' ? '하우파파' : '하우랩'}
                              </span>
                              {revenue.year_month}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">{revenue.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-slate-700">{formatNumber(revenue.amount)}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingItem(revenue)
                              setRevenueForm({
                                corporation: revenue.corporation_id,
                                year_month: revenue.year_month,
                                amount: String(revenue.amount),
                                source_type: revenue.source_type || 'tax_invoice',
                                tax_invoice_number: revenue.tax_invoice_number || '',
                                description: revenue.description || ''
                              })
                              setShowRevenueModal(true)
                            }}>
                              <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete('revenue_records', revenue.id)}>
                              <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 미수금 탭 */}
          <TabsContent value="receivables">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-700">미수금 관리</CardTitle>
                <Button size="sm" onClick={() => { resetReceivableForm(); setShowReceivableModal(true) }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  <Plus className="w-4 h-4 mr-1" /> 미수금 추가
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {receivables.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>미수금 데이터가 없습니다.</p>
                    </div>
                  ) : (
                    receivables.map(recv => (
                      <div key={recv.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <div className="font-medium text-slate-700">{recv.company_name}</div>
                          <div className="text-sm text-slate-500 mt-1">{recv.description}</div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs mt-2 ${
                            recv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            recv.status === 'invoiced' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {recv.status === 'pending' ? '대기' : recv.status === 'invoiced' ? '발행완료' : '입금완료'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-amber-600">{formatNumber(recv.amount)}</span>
                          {recv.status === 'pending' && (
                            <Button variant="outline" size="sm" onClick={() => convertReceivableToRevenue(recv)}
                              className="border-amber-200 text-amber-600 hover:bg-amber-50">
                              <Receipt className="w-4 h-4 mr-1" /> 매출 전환
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete('receivables', recv.id)}>
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 매출 모달 */}
      <Dialog open={showRevenueModal} onOpenChange={setShowRevenueModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? '매출 수정' : '매출 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>법인</Label>
              <Select value={revenueForm.corporation} onValueChange={(v) => setRevenueForm({...revenueForm, corporation: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="haupapa">하우파파</SelectItem>
                  <SelectItem value="haulab">하우랩</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>월</Label>
              <Select value={revenueForm.year_month} onValueChange={(v) => setRevenueForm({...revenueForm, year_month: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {generateMonths().map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>금액</Label>
              <Input type="number" value={revenueForm.amount} onChange={(e) => setRevenueForm({...revenueForm, amount: e.target.value})} />
            </div>
            <div>
              <Label>세금계산서 번호</Label>
              <Input value={revenueForm.tax_invoice_number} onChange={(e) => setRevenueForm({...revenueForm, tax_invoice_number: e.target.value})} />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={revenueForm.description} onChange={(e) => setRevenueForm({...revenueForm, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevenueModal(false)}>취소</Button>
            <Button onClick={handleSaveRevenue} className="bg-blue-500 hover:bg-blue-600">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비용 모달 */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? '비용 수정' : '비용 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>월</Label>
              <Select value={expenseForm.year_month} onValueChange={(v) => setExpenseForm({...expenseForm, year_month: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {generateMonths().map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>카테고리</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({...expenseForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>금액</Label>
              <Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseModal(false)}>취소</Button>
            <Button onClick={handleSaveExpense} className="bg-rose-500 hover:bg-rose-600">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 미수금 모달 */}
      <Dialog open={showReceivableModal} onOpenChange={setShowReceivableModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? '미수금 수정' : '미수금 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>법인</Label>
              <Select value={receivableForm.corporation} onValueChange={(v) => setReceivableForm({...receivableForm, corporation: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="haupapa">하우파파</SelectItem>
                  <SelectItem value="haulab">하우랩</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>거래처명</Label>
              <Input value={receivableForm.company_name} onChange={(e) => setReceivableForm({...receivableForm, company_name: e.target.value})} />
            </div>
            <div>
              <Label>금액</Label>
              <Input type="number" value={receivableForm.amount} onChange={(e) => setReceivableForm({...receivableForm, amount: e.target.value})} />
            </div>
            <div>
              <Label>만기일</Label>
              <Input type="date" value={receivableForm.due_date} onChange={(e) => setReceivableForm({...receivableForm, due_date: e.target.value})} />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={receivableForm.description} onChange={(e) => setReceivableForm({...receivableForm, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceivableModal(false)}>취소</Button>
            <Button onClick={handleSaveReceivable} className="bg-amber-500 hover:bg-amber-600">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
