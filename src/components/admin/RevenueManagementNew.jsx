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
  DollarSign, TrendingUp, TrendingDown, Calendar, Plus,
  Trash2, Edit2, Save, X, Building2, FileSpreadsheet,
  Receipt, CreditCard, RefreshCw, Download, Upload, ExternalLink, Database,
  Zap, Users
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 비용 카테고리 (이미지 기준)
const EXPENSE_CATEGORIES = [
  '광고비(메타)', '광고비(네이버)', '크리에이터지급', '서버비', 'AI 사용',
  '이메일 스티비', '크리에이터(자사)', '파트타임', '퀵비(후다닥)', '자사 크리에이터',
  '프릭스(래티스)', '이미지블', 'HEEPS', '팝빌', '마누스', '슈퍼베이스',
  '클로드', '볼트', '제미나이', '러버불', '넷틀리파이', 'GPT', '캡컷',
  '렌더', '달리', '메이크', '기타'
]

// 2025년 초기 데이터 (이미지 기준)
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

// 2025년 매출 초기 데이터
const INITIAL_REVENUE_DATA = {
  haupapa: [14261742, 26435500, 43690000, 27346000, 38500000, 28248000, 57090000, 44055500, 36020130, 24255000, 44140200, 0],
  haulab: [13640000, 12596970, 6589000, 5500000, -1320000, 0, 0, 0, 0, 3300000, 74250000, 0]
}

// 월 목록 생성
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
  const [activeTab, setActiveTab] = useState('summary')
  const [loading, setLoading] = useState(true)

  // 데이터 상태
  const [revenueData, setRevenueData] = useState([])
  const [expenseData, setExpenseData] = useState([])
  const [receivables, setReceivables] = useState([])

  // 모달 상태
  const [showRevenueModal, setShowRevenueModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showReceivableModal, setShowReceivableModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // 폼 상태
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
    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()
    if (!adminData) {
      navigate('/admin/dashboard')
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
    } catch (error) {
      console.error('데이터 조회 오류:', error)
    }
    setLoading(false)
  }

  // 초기 데이터 입력 함수
  const initializeData = async () => {
    if (!confirm('2025년 초기 데이터를 입력하시겠습니까?\n기존 2025년 데이터가 있다면 중복될 수 있습니다.')) return

    setLoading(true)
    try {
      // 매입 데이터 입력
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

      // 매출 데이터 입력
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

  // 데이터 초기화 (삭제)
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

    return months.map(month => {
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
    EXPENSE_CATEGORIES.forEach(cat => {
      summary[cat] = Array.from({ length: 12 }, () => 0)
    })

    expenseData.forEach(exp => {
      const monthIndex = parseInt(exp.year_month.split('-')[1]) - 1
      if (summary[exp.category] !== undefined) {
        summary[exp.category][monthIndex] += exp.amount || 0
      }
    })

    return summary
  }, [expenseData])

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

  // 저장 함수들
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
      alert('저장되었습니다.')
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
      alert('저장되었습니다.')
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
      alert('저장되었습니다.')
    } catch (error) {
      alert('저장 실패: ' + error.message)
    }
  }

  // 삭제 함수
  const handleDelete = async (table, id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await supabaseBiz.from(table).delete().eq('id', id)
      fetchAllData()
    } catch (error) {
      alert('삭제 실패: ' + error.message)
    }
  }

  // 미수금 → 매출 전환
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

  // 폼 초기화
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

  // 세금계산서 발행 건 → 매출 자동 동기화
  const syncTaxInvoicesToRevenue = async () => {
    if (!confirm('세금계산서 발행 건을 매출에 동기화하시겠습니까?')) return

    setLoading(true)
    try {
      // 세금계산서가 발행된 포인트 충전 요청 조회
      const { data: chargeRequests, error: fetchError } = await supabaseBiz
        .from('points_charge_requests')
        .select('id, amount, tax_invoice_issued, tax_invoice_info, created_at, company_id')
        .eq('tax_invoice_issued', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // 이미 매출에 반영된 항목 확인
      const { data: existingRevenues } = await supabaseBiz
        .from('revenue_records')
        .select('source_id')
        .eq('source_type', 'tax_invoice')

      const existingIds = new Set((existingRevenues || []).map(r => r.source_id))

      let syncCount = 0
      for (const request of (chargeRequests || [])) {
        // 이미 동기화된 건은 스킵
        if (existingIds.has(request.id)) continue

        const createdDate = new Date(request.created_at)
        const yearMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`

        // 세금계산서 정보에서 회사명 가져오기
        const taxInfo = request.tax_invoice_info || {}
        const companyName = taxInfo.companyName || taxInfo.company_name || '포인트 충전'

        await supabaseBiz.from('revenue_records').insert({
          corporation_id: 'haupapa', // 세금계산서는 하우파파 법인
          year_month: yearMonth,
          amount: request.amount,
          source_type: 'tax_invoice',
          source_id: request.id,
          tax_invoice_number: taxInfo.nts_confirm_num || taxInfo.mgt_key || '',
          description: `세금계산서 발행: ${companyName}`
        })

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

  // 크리에이터 출금 완료 건 → 매입 자동 동기화
  const syncWithdrawalsToExpense = async () => {
    if (!confirm('출금 완료 건을 매입(크리에이터지급)에 동기화하시겠습니까?')) return

    setLoading(true)
    try {
      // 출금 완료된 요청 조회 (creator_withdrawal_requests)
      const { data: withdrawals, error: fetchError } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('id, requested_amount, amount, creator_name, account_holder, status, completed_at, created_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (fetchError) throw fetchError

      // 이미 매입에 반영된 항목 확인
      const { data: existingExpenses } = await supabaseBiz
        .from('expense_records')
        .select('source_id')
        .eq('source_type', 'withdrawal')

      const existingIds = new Set((existingExpenses || []).map(e => e.source_id))

      let syncCount = 0
      for (const withdrawal of (withdrawals || [])) {
        // 이미 동기화된 건은 스킵
        if (existingIds.has(withdrawal.id)) continue

        const completedDate = new Date(withdrawal.completed_at || withdrawal.created_at)
        const yearMonth = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`

        const amount = withdrawal.requested_amount || withdrawal.amount || 0
        const creatorName = withdrawal.creator_name || withdrawal.account_holder || '크리에이터'

        await supabaseBiz.from('expense_records').insert({
          corporation_id: 'haupapa',
          year_month: yearMonth,
          category: '크리에이터지급',
          amount: amount,
          source_type: 'withdrawal',
          source_id: withdrawal.id,
          description: `출금 완료: ${creatorName}`
        })

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

  // 숫자 포맷
  const formatNumber = (num) => {
    if (num === 0) return '-'
    const prefix = num < 0 ? '-₩' : '₩'
    return `${prefix}${Math.abs(num).toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">매출 관리</h1>
            <p className="text-sm text-gray-500">하우파파 / 하우랩 법인별 매출 및 매입 관리</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={syncTaxInvoicesToRevenue} className="text-blue-600">
              <Zap className="w-4 h-4 mr-1" />
              세금계산서 → 매출
            </Button>

            <Button variant="outline" size="sm" onClick={syncWithdrawalsToExpense} className="text-green-600">
              <Users className="w-4 h-4 mr-1" />
              출금완료 → 매입
            </Button>

            <Button variant="outline" size="sm" onClick={initializeData}>
              <Database className="w-4 h-4 mr-1" />
              초기 데이터 입력
            </Button>

            <Button variant="outline" size="sm" className="text-red-600" onClick={clearAllData}>
              <Trash2 className="w-4 h-4 mr-1" />
              전체 초기화
            </Button>
          </div>
        </div>

        {/* 연간 요약 카드 */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-600 font-medium">하우파파 매출</div>
              <div className="text-xl font-bold text-blue-700">{formatNumber(yearlyTotals.haupapaRevenue)}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="text-sm text-green-600 font-medium">하우랩 매출</div>
              <div className="text-xl font-bold text-green-700">{formatNumber(yearlyTotals.haulabRevenue)}</div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4">
              <div className="text-sm text-purple-600 font-medium">총 매출</div>
              <div className="text-xl font-bold text-purple-700">{formatNumber(yearlyTotals.totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="text-sm text-red-600 font-medium">총 매입</div>
              <div className="text-xl font-bold text-red-700">{formatNumber(yearlyTotals.totalExpense)}</div>
            </CardContent>
          </Card>

          <Card className={yearlyTotals.netProfit >= 0 ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"}>
            <CardContent className="pt-4">
              <div className={`text-sm font-medium ${yearlyTotals.netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>순이익</div>
              <div className={`text-xl font-bold ${yearlyTotals.netProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                {formatNumber(yearlyTotals.netProfit)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="summary">통합 요약</TabsTrigger>
            <TabsTrigger value="expense">매입 상세</TabsTrigger>
            <TabsTrigger value="revenue">매출 내역</TabsTrigger>
            <TabsTrigger value="receivables">미수금</TabsTrigger>
          </TabsList>

          {/* 통합 요약 탭 */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>{selectedYear}년 통합 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-2 py-2 text-left font-medium w-32">구분</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="px-2 py-2 text-right font-medium">{i + 1}월</th>
                        ))}
                        <th className="px-2 py-2 text-right font-medium bg-gray-100">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b bg-blue-50">
                        <td className="px-2 py-2 font-medium text-blue-700">매출(하우파파)</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-2 py-2 text-right text-blue-600 text-xs">
                            {formatNumber(m.haupapaRevenue)}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right font-bold text-blue-700 bg-blue-100 text-xs">
                          {formatNumber(yearlyTotals.haupapaRevenue)}
                        </td>
                      </tr>
                      <tr className="border-b bg-green-50">
                        <td className="px-2 py-2 font-medium text-green-700">매출(하우랩)</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-2 py-2 text-right text-green-600 text-xs">
                            {formatNumber(m.haulabRevenue)}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right font-bold text-green-700 bg-green-100 text-xs">
                          {formatNumber(yearlyTotals.haulabRevenue)}
                        </td>
                      </tr>
                      <tr className="border-b bg-red-50">
                        <td className="px-2 py-2 font-medium text-red-700">매입</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-2 py-2 text-right text-red-600 text-xs">
                            {formatNumber(m.totalExpense)}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right font-bold text-red-700 bg-red-100 text-xs">
                          {formatNumber(yearlyTotals.totalExpense)}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-2 py-2">합계</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className={`px-2 py-2 text-right text-xs ${m.netProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                            {formatNumber(m.netProfit)}
                          </td>
                        ))}
                        <td className={`px-2 py-2 text-right text-xs ${yearlyTotals.netProfit >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-orange-700 bg-orange-100'}`}>
                          {formatNumber(yearlyTotals.netProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 매입 상세 탭 */}
          <TabsContent value="expense">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>매입 상세</span>
                  <Button size="sm" onClick={() => { resetExpenseForm(); setShowExpenseModal(true) }}>
                    <Plus className="w-4 h-4 mr-1" /> 매입 추가
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-2 py-2 text-left font-medium sticky left-0 bg-gray-50 w-28">카테고리</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="px-2 py-2 text-right font-medium">{i + 1}월</th>
                        ))}
                        <th className="px-2 py-2 text-right font-medium bg-gray-100">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EXPENSE_CATEGORIES.map(category => {
                        const monthlyAmounts = expenseByCategory[category] || Array(12).fill(0)
                        const total = monthlyAmounts.reduce((a, b) => a + b, 0)
                        if (total === 0) return null

                        return (
                          <tr key={category} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-1 font-medium sticky left-0 bg-white text-xs">{category}</td>
                            {monthlyAmounts.map((amount, i) => (
                              <td key={i} className="px-2 py-1 text-right">{formatNumber(amount)}</td>
                            ))}
                            <td className="px-2 py-1 text-right font-bold bg-gray-50">{formatNumber(total)}</td>
                          </tr>
                        )
                      })}
                      <tr className="bg-red-50 font-bold">
                        <td className="px-2 py-2 sticky left-0 bg-red-50">월별 합계</td>
                        {monthlySummary.map((m, i) => (
                          <td key={i} className="px-2 py-2 text-right text-red-700">{formatNumber(m.totalExpense)}</td>
                        ))}
                        <td className="px-2 py-2 text-right text-red-700 bg-red-100">{formatNumber(yearlyTotals.totalExpense)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 매출 내역 탭 */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>매출 내역</span>
                  <Button size="sm" onClick={() => { resetRevenueForm(); setShowRevenueModal(true) }}>
                    <Plus className="w-4 h-4 mr-1" /> 매출 추가
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {revenueData.map(revenue => (
                    <div key={revenue.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${revenue.corporation_id === 'haupapa' ? 'bg-blue-500' : 'bg-green-500'}`} />
                        <div>
                          <div className="font-medium text-sm">
                            {revenue.corporation_id === 'haupapa' ? '하우파파' : '하우랩'} | {revenue.year_month}
                          </div>
                          <div className="text-xs text-gray-500">{revenue.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">{formatNumber(revenue.amount)}</span>
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
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete('revenue_records', revenue.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {revenueData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">매출 데이터가 없습니다.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 미수금 탭 */}
          <TabsContent value="receivables">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>미수금 관리</span>
                  <Button size="sm" onClick={() => { resetReceivableForm(); setShowReceivableModal(true) }}>
                    <Plus className="w-4 h-4 mr-1" /> 미수금 추가
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {receivables.map(recv => (
                    <div key={recv.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <div className="font-medium">{recv.company_name}</div>
                        <div className="text-sm text-gray-500">{recv.description}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          recv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          recv.status === 'invoiced' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {recv.status === 'pending' ? '대기' : recv.status === 'invoiced' ? '발행완료' : '입금완료'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-600">{formatNumber(recv.amount)}</span>
                        {recv.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => convertReceivableToRevenue(recv)}>
                            <Receipt className="w-4 h-4 mr-1" /> 매출 전환
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete('receivables', recv.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {receivables.length === 0 && (
                    <div className="text-center py-8 text-gray-500">미수금 데이터가 없습니다.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Google Sheets 안내 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Google Sheets 연동 방법
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">설정 단계:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Google Cloud Console에서 프로젝트 생성</li>
                <li>Google Sheets API 활성화</li>
                <li>서비스 계정 생성 후 JSON 키 다운로드</li>
                <li>Netlify 환경변수에 GOOGLE_SHEETS_CREDENTIALS 추가</li>
                <li>Google Sheet 공유 설정에서 서비스 계정 이메일 추가</li>
              </ol>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open('https://console.cloud.google.com/apis/library/sheets.googleapis.com', '_blank')}>
                <ExternalLink className="w-4 h-4 mr-1" /> Google Cloud Console
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 매출 모달 */}
      <Dialog open={showRevenueModal} onOpenChange={setShowRevenueModal}>
        <DialogContent>
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
            <Button onClick={handleSaveRevenue}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 매입 모달 */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? '매입 수정' : '매입 추가'}</DialogTitle>
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
            <Button onClick={handleSaveExpense}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 미수금 모달 */}
      <Dialog open={showReceivableModal} onOpenChange={setShowReceivableModal}>
        <DialogContent>
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
            <Button onClick={handleSaveReceivable}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
