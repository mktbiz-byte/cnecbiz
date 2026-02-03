import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle, CheckCircle, Loader2, RefreshCw,
  Wallet, Download, Search, User, Eye, X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

export default function WithdrawalAudit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [auditResults, setAuditResults] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [stats, setStats] = useState({
    total: 0,
    overpaid: 0,
    totalOverpaidAmount: 0,
    pending: 0,
    approved: 0,
    completed: 0
  })

  // 크리에이터 상세 모달
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [creatorTransactions, setCreatorTransactions] = useState([])
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
      return
    }

    runAudit()
  }

  const runAudit = async () => {
    setLoading(true)

    try {
      // ========== 1단계: 모든 출금 요청 수집 ==========
      let allWithdrawals = []

      // 1-1. Korea DB withdrawals
      if (supabaseKorea) {
        try {
          const { data: koreaData, error: koreaError } = await supabaseKorea
            .from('withdrawals')
            .select('*')
            .order('created_at', { ascending: false })

          if (!koreaError && koreaData && koreaData.length > 0) {
            // user_profiles 조회
            const userIds = [...new Set(koreaData.map(w => w.user_id).filter(Boolean))]
            let profileMap = {}
            if (userIds.length > 0) {
              let { data: profiles } = await supabaseKorea
                .from('user_profiles')
                .select('id, user_id, name, email, channel_name')
                .in('id', userIds)
              if (!profiles || profiles.length === 0) {
                const { data: profiles2 } = await supabaseKorea
                  .from('user_profiles')
                  .select('id, user_id, name, email, channel_name')
                  .in('user_id', userIds)
                profiles = profiles2
              }
              if (profiles) {
                profiles.forEach(p => {
                  if (p.id) profileMap[p.id] = p
                  if (p.user_id) profileMap[p.user_id] = p
                })
              }
            }

            const koreaWithdrawals = koreaData.map(w => {
              const profile = profileMap[w.user_id]
              return {
                id: w.id,
                user_id: w.user_id,
                creator_name: profile?.channel_name || profile?.name || w.bank_account_holder || 'Unknown',
                creator_email: profile?.email || '',
                requested_points: w.amount || 0,
                status: w.status || 'pending',
                created_at: w.created_at,
                source_db: 'korea',
                region: 'korea',
                bank_name: w.bank_name,
                account_holder: w.bank_account_holder
              }
            })
            allWithdrawals = [...allWithdrawals, ...koreaWithdrawals]
          }
        } catch (e) {
          console.error('Korea withdrawals 조회 오류:', e)
        }

        // 1-2. Korea DB point_transactions (withdraw type)
        try {
          const { data: ptData, error: ptError } = await supabaseKorea
            .from('point_transactions')
            .select('*')
            .eq('transaction_type', 'withdraw')
            .order('created_at', { ascending: false })

          if (!ptError && ptData && ptData.length > 0) {
            // 중복 체크
            const existingKeys = new Set(
              allWithdrawals.map(w => `${w.user_id}_${Math.abs(w.requested_points)}_${new Date(w.created_at).toDateString()}`)
            )

            const ptWithdrawals = ptData
              .filter(pt => {
                if (pt.related_withdrawal_id) return false
                const key = `${pt.user_id}_${Math.abs(pt.amount)}_${new Date(pt.created_at).toDateString()}`
                return !existingKeys.has(key)
              })
              .map(pt => {
                const desc = pt.description || ''
                const bankMatch = desc.match(/\|\s*([^\d]+)\s+(\d+)\s*\(([^)]+)\)/)
                return {
                  id: pt.id,
                  user_id: pt.user_id,
                  creator_name: bankMatch ? bankMatch[3] : 'Unknown',
                  creator_email: '',
                  requested_points: Math.abs(pt.amount),
                  status: 'pending',
                  created_at: pt.created_at,
                  source_db: 'korea_pt',
                  region: 'korea',
                  bank_name: bankMatch ? bankMatch[1]?.trim() : '',
                  account_holder: bankMatch ? bankMatch[3] : ''
                }
              })

            allWithdrawals = [...allWithdrawals, ...ptWithdrawals]
          }
        } catch (e) {
          console.error('Korea point_transactions 조회 오류:', e)
        }
      }

      // 1-3. BIZ DB creator_withdrawal_requests
      try {
        const { data: bizData, error: bizError } = await supabaseBiz
          .from('creator_withdrawal_requests')
          .select('*')
          .order('created_at', { ascending: false })

        if (!bizError && bizData && bizData.length > 0) {
          // featured_creators 조회
          const creatorIds = [...new Set(bizData.map(w => w.creator_id).filter(Boolean))]
          let creatorMap = {}
          if (creatorIds.length > 0) {
            const { data: creators } = await supabaseBiz
              .from('featured_creators')
              .select('id, channel_name, name, email, region, points_balance')
              .in('id', creatorIds)
            if (creators) {
              creators.forEach(c => { creatorMap[c.id] = c })
            }
          }

          const bizWithdrawals = bizData.map(w => {
            const creator = creatorMap[w.creator_id]
            return {
              id: `biz_${w.id}`,
              user_id: w.creator_id,
              creator_name: creator?.channel_name || creator?.name || w.creator_name || 'Unknown',
              creator_email: creator?.email || '',
              requested_points: w.requested_points || w.amount || 0,
              status: w.status || 'pending',
              created_at: w.created_at,
              source_db: 'biz',
              region: w.region || creator?.region || 'korea',
              bank_name: w.bank_name,
              account_holder: w.account_holder,
              cached_balance: creator?.points_balance || 0
            }
          })
          allWithdrawals = [...allWithdrawals, ...bizWithdrawals]
        }
      } catch (e) {
        console.error('BIZ creator_withdrawal_requests 조회 오류:', e)
      }

      // rejected 제외
      allWithdrawals = allWithdrawals.filter(w => w.status !== 'rejected')

      if (allWithdrawals.length === 0) {
        setAuditResults([])
        setStats({ total: 0, overpaid: 0, totalOverpaidAmount: 0, pending: 0, approved: 0, completed: 0 })
        setLoading(false)
        return
      }

      // ========== 2단계: 크리에이터별 실제 포인트 잔액 계산 ==========
      // Korea DB: point_transactions에 출금 시 즉시 -금액이 기록됨
      //   → 잔액 = 전체 합계 (이미 출금 차감 포함)
      //   → 잔액이 음수면 오지급
      // BIZ DB: creator_points에는 출금이 기록되지 않음
      //   → 잔액에서 처리중 출금을 빼서 비교해야 함

      // Korea: 수입만 (출금 제외) + 전체 합계 두 가지 모두 계산
      const koreaEarningsByUser = {} // 출금 제외한 수입 합계
      const koreaFullBalanceByUser = {} // 전체 합계 (출금 차감 포함)
      const bizBalanceByUser = {} // BIZ DB 잔액

      // 2-1. Korea DB point_transactions
      if (supabaseKorea) {
        try {
          const { data: allPt } = await supabaseKorea
            .from('point_transactions')
            .select('user_id, amount, transaction_type, type, description')

          if (allPt) {
            allPt.forEach(pt => {
              if (!pt.user_id) return
              const amt = pt.amount || 0
              // 전체 합계
              if (!koreaFullBalanceByUser[pt.user_id]) koreaFullBalanceByUser[pt.user_id] = 0
              koreaFullBalanceByUser[pt.user_id] += amt
              // 수입만 (출금/차감 제외)
              if (!koreaEarningsByUser[pt.user_id]) koreaEarningsByUser[pt.user_id] = 0
              const isWithdraw = pt.transaction_type === 'withdraw' || pt.type === 'withdraw' ||
                (pt.description && pt.description.includes('출금'))
              if (!isWithdraw && amt > 0) {
                koreaEarningsByUser[pt.user_id] += amt
              }
            })
          }
        } catch (e) {
          console.error('Korea point_transactions 조회 오류:', e)
        }

        // 2-2. Korea DB point_history (캠페인 완료 포인트 - 항상 양수)
        try {
          const { data: allPh } = await supabaseKorea
            .from('point_history')
            .select('user_id, amount')

          if (allPh) {
            allPh.forEach(ph => {
              if (!ph.user_id) return
              const amt = ph.amount || 0
              if (!koreaFullBalanceByUser[ph.user_id]) koreaFullBalanceByUser[ph.user_id] = 0
              koreaFullBalanceByUser[ph.user_id] += amt
              if (!koreaEarningsByUser[ph.user_id]) koreaEarningsByUser[ph.user_id] = 0
              if (amt > 0) koreaEarningsByUser[ph.user_id] += amt
            })
          }
        } catch (e) { /* point_history 테이블 없을 수 있음 */ }

        // 2-3. Korea applications (completed) - 중복 제외
        try {
          const { data: completedApps } = await supabaseKorea
            .from('applications')
            .select('user_id, campaign_id')
            .eq('status', 'completed')

          if (completedApps && completedApps.length > 0) {
            const campaignIds = [...new Set(completedApps.map(a => a.campaign_id).filter(Boolean))]
            let campaignRewards = {}
            if (campaignIds.length > 0) {
              const { data: campaigns } = await supabaseKorea
                .from('campaigns')
                .select('id, reward_points')
                .in('id', campaignIds)
              if (campaigns) campaigns.forEach(c => { campaignRewards[c.id] = c.reward_points || 0 })
            }

            // 이미 기록된 캠페인+유저 키 수집
            const existingPtKeys = new Set()
            try {
              const { data: ptKeys } = await supabaseKorea
                .from('point_transactions')
                .select('user_id, related_campaign_id')
                .not('related_campaign_id', 'is', null)
              if (ptKeys) ptKeys.forEach(pt => {
                if (pt.related_campaign_id && pt.user_id) existingPtKeys.add(`${pt.related_campaign_id}_${pt.user_id}`)
              })
            } catch (e) { /* skip */ }
            try {
              const { data: phKeys } = await supabaseKorea
                .from('point_history')
                .select('user_id, campaign_id')
                .not('campaign_id', 'is', null)
              if (phKeys) phKeys.forEach(ph => {
                if (ph.campaign_id && ph.user_id) existingPtKeys.add(`${ph.campaign_id}_${ph.user_id}`)
              })
            } catch (e) { /* skip */ }

            completedApps.forEach(app => {
              if (!app.user_id || !app.campaign_id) return
              if (existingPtKeys.has(`${app.campaign_id}_${app.user_id}`)) return
              const reward = campaignRewards[app.campaign_id] || 0
              if (reward <= 0) return
              if (!koreaFullBalanceByUser[app.user_id]) koreaFullBalanceByUser[app.user_id] = 0
              koreaFullBalanceByUser[app.user_id] += reward
              if (!koreaEarningsByUser[app.user_id]) koreaEarningsByUser[app.user_id] = 0
              koreaEarningsByUser[app.user_id] += reward
            })
          }
        } catch (e) { /* skip */ }
      }

      // 2-4. BIZ DB creator_points (출금 차감이 포함되지 않음)
      try {
        const { data: bizPts } = await supabaseBiz
          .from('creator_points')
          .select('creator_id, amount')

        if (bizPts) {
          bizPts.forEach(pt => {
            if (!pt.creator_id) return
            if (!bizBalanceByUser[pt.creator_id]) bizBalanceByUser[pt.creator_id] = 0
            bizBalanceByUser[pt.creator_id] += (pt.amount || 0)
          })
        }
      } catch (e) {
        console.error('BIZ creator_points 조회 오류:', e)
      }

      // ========== 3단계: 감사 결과 생성 ==========
      // Korea에서 처리중 출금 합계 (Korea withdrawals)
      const koreaWithdrawalsByUser = {}
      // BIZ에서 처리중 출금 합계
      const bizWithdrawalsByUser = {}
      allWithdrawals.forEach(w => {
        if (['pending', 'approved', 'processing'].includes(w.status)) {
          const uid = w.user_id
          if (!uid) return
          if (w.source_db === 'biz') {
            bizWithdrawalsByUser[uid] = (bizWithdrawalsByUser[uid] || 0) + (w.requested_points || 0)
          } else {
            koreaWithdrawalsByUser[uid] = (koreaWithdrawalsByUser[uid] || 0) + (w.requested_points || 0)
          }
        }
      })

      const results = allWithdrawals.map(w => {
        const uid = w.user_id
        const isKorea = w.source_db !== 'biz'
        let actualBalance, totalEarnings, totalPendingWithdrawals, isOverpaid, balanceDiff

        if (isKorea) {
          // Korea: point_transactions에 출금이 이미 차감되어 있음
          // 전체 합계 = 수입 - 출금 차감 (이미 반영됨)
          const fullBalance = koreaFullBalanceByUser[uid] ?? 0
          totalEarnings = koreaEarningsByUser[uid] ?? 0
          totalPendingWithdrawals = koreaWithdrawalsByUser[uid] || 0

          // 잔액이 음수 = 총 출금이 총 수입을 초과 = 오지급
          actualBalance = fullBalance // 이미 출금 차감 포함
          isOverpaid = fullBalance < 0 && ['pending', 'approved', 'processing'].includes(w.status)
          balanceDiff = fullBalance // 음수면 초과 금액
        } else {
          // BIZ: creator_points에 출금이 미포함
          actualBalance = bizBalanceByUser[uid] ?? 0
          totalEarnings = actualBalance
          totalPendingWithdrawals = bizWithdrawalsByUser[uid] || 0

          // 처리중 출금 합계가 잔액 초과 = 오지급
          isOverpaid = totalPendingWithdrawals > actualBalance && ['pending', 'approved', 'processing'].includes(w.status)
          balanceDiff = actualBalance - totalPendingWithdrawals
        }

        return {
          ...w,
          actual_balance: actualBalance,
          total_earnings: totalEarnings,
          balance_diff: balanceDiff,
          total_pending: totalPendingWithdrawals,
          is_overpaid: isOverpaid
        }
      })

      // 통계
      const overpaidItems = results.filter(r => r.is_overpaid)
      setStats({
        total: results.length,
        overpaid: overpaidItems.length,
        totalOverpaidAmount: overpaidItems.reduce((sum, r) => sum + Math.max(0, Math.abs(r.balance_diff)), 0),
        pending: results.filter(r => r.status === 'pending').length,
        approved: results.filter(r => r.status === 'approved' || r.status === 'processing').length,
        completed: results.filter(r => r.status === 'completed').length
      })

      setAuditResults(results)
    } catch (error) {
      console.error('감사 실행 오류:', error)
      alert('감사 실행 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 크리에이터 상세 보기 - 해당 크리에이터의 포인트 내역 조회 (모든 DB 소스에서)
  const handleViewCreator = async (result) => {
    const uid = result.user_id
    if (!uid) return

    let transactions = []

    // Korea DB - 항상 조회 (source_db와 관계없이)
    if (supabaseKorea) {
      // 1. point_transactions
      try {
        const { data: ptData } = await supabaseKorea
          .from('point_transactions')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (ptData && ptData.length > 0) {
          transactions = [...transactions, ...ptData.map(t => ({
            ...t,
            description: t.description || '',
            source: 'point_transactions'
          }))]
        }
      } catch (e) { /* skip */ }

      // 2. point_history
      try {
        const { data: phData } = await supabaseKorea
          .from('point_history')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (phData && phData.length > 0) {
          transactions = [...transactions, ...phData.map(t => ({
            id: `ph_${t.id}`,
            user_id: t.user_id,
            amount: t.amount,
            description: t.reason || t.description || '캠페인 완료',
            created_at: t.created_at,
            source: 'point_history'
          }))]
        }
      } catch (e) { /* skip */ }

      // 3. completed applications (중복 제외)
      try {
        const { data: completedApps } = await supabaseKorea
          .from('applications')
          .select('id, user_id, campaign_id, status, updated_at, created_at')
          .eq('user_id', uid)
          .eq('status', 'completed')

        if (completedApps && completedApps.length > 0) {
          const campaignIds = [...new Set(completedApps.map(a => a.campaign_id).filter(Boolean))]
          let campaignMap = {}
          if (campaignIds.length > 0) {
            const { data: campaigns } = await supabaseKorea
              .from('campaigns')
              .select('id, title, reward_points')
              .in('id', campaignIds)
            if (campaigns) campaigns.forEach(c => { campaignMap[c.id] = c })
          }

          // 이미 point_transactions/point_history에 있는 campaign+user 조합 확인
          const existingKeys = new Set(
            transactions
              .filter(t => t.related_campaign_id || t.campaign_id)
              .map(t => `${t.related_campaign_id || t.campaign_id}_${t.user_id}`)
          )

          completedApps.forEach(app => {
            const key = `${app.campaign_id}_${app.user_id}`
            if (existingKeys.has(key)) return
            const campaign = campaignMap[app.campaign_id]
            const reward = campaign?.reward_points || 0
            if (reward <= 0) return
            transactions.push({
              id: `app_${app.id}`,
              user_id: app.user_id,
              amount: reward,
              description: `캠페인 완료: ${campaign?.title || ''}`,
              created_at: app.updated_at || app.created_at,
              source: 'applications'
            })
          })
        }
      } catch (e) { /* skip */ }
    }

    // BIZ DB - 항상 조회
    try {
      const { data: cpData } = await supabaseBiz
        .from('creator_points')
        .select('*')
        .eq('creator_id', uid)
        .order('created_at', { ascending: false })

      if (cpData && cpData.length > 0) {
        transactions = [...transactions, ...cpData.map(t => ({
          id: `biz_${t.id}`,
          user_id: t.creator_id,
          amount: t.amount,
          description: t.description || t.reason || '',
          created_at: t.created_at,
          source: 'creator_points'
        }))]
      }
    } catch (e) { /* skip */ }

    transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const totalReceived = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const totalDeducted = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

    setSelectedCreator({
      ...result,
      totalReceived,
      totalDeducted,
      netBalance: totalReceived - totalDeducted,
      transactionCount: transactions.length
    })
    setCreatorTransactions(transactions)
    setShowDetailModal(true)
  }

  const getFilteredResults = () => {
    let filtered = auditResults

    if (filterType === 'overpaid') {
      filtered = filtered.filter(r => r.is_overpaid)
    } else if (filterType === 'pending') {
      filtered = filtered.filter(r => r.status === 'pending')
    } else if (filterType === 'approved') {
      filtered = filtered.filter(r => r.status === 'approved' || r.status === 'processing')
    } else if (filterType === 'completed') {
      filtered = filtered.filter(r => r.status === 'completed')
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(r =>
        r.creator_name?.toLowerCase().includes(search) ||
        r.creator_email?.toLowerCase().includes(search) ||
        r.user_id?.toLowerCase().includes(search) ||
        r.account_holder?.toLowerCase().includes(search)
      )
    }

    return filtered
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: '대기중' },
      approved: { color: 'bg-blue-100 text-blue-700', label: '승인됨' },
      processing: { color: 'bg-purple-100 text-purple-700', label: '처리중' },
      completed: { color: 'bg-green-100 text-green-700', label: '완료' }
    }
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-700', label: status }
    return <Badge className={badge.color}>{badge.label}</Badge>
  }

  const getSourceBadge = (source) => {
    const badges = {
      korea: { color: 'bg-blue-50 text-blue-600', label: 'Korea' },
      korea_pt: { color: 'bg-indigo-50 text-indigo-600', label: 'Korea PT' },
      biz: { color: 'bg-gray-100 text-gray-600', label: 'BIZ' }
    }
    const badge = badges[source] || { color: 'bg-gray-50 text-gray-500', label: source }
    return <Badge className={`text-[10px] ${badge.color}`}>{badge.label}</Badge>
  }

  const handleDownloadExcel = () => {
    const filtered = getFilteredResults()
    if (filtered.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }

    const excelData = filtered.map(r => ({
      '신청일': new Date(r.created_at).toLocaleDateString('ko-KR'),
      '크리에이터': r.creator_name,
      '예금주': r.account_holder || '',
      'DB': r.source_db,
      '상태': r.status,
      '신청 포인트': r.requested_points,
      '총 수입': r.total_earnings,
      '순 잔액': r.actual_balance,
      '잔액 차이': r.balance_diff,
      '초과 여부': r.is_overpaid ? 'YES' : 'NO'
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, '출금감사')

    const today = new Date()
    XLSX.writeFile(wb, `출금감사_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`)
  }

  const filteredResults = getFilteredResults()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">출금 감사</h1>
                <p className="text-gray-600">Korea DB + BIZ DB에서 출금 요청을 조회하고, 실제 포인트 잔액과 비교합니다</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={runAudit} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  감사 실행
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadExcel}
                  className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">전체 출금 요청</p>
                <p className="text-2xl font-bold">{stats.total}건</p>
              </CardContent>
            </Card>

            <Card className={stats.overpaid > 0 ? 'border-red-300 bg-red-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${stats.overpaid > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  <p className={`text-sm ${stats.overpaid > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>초과 출금</p>
                </div>
                <p className={`text-2xl font-bold ${stats.overpaid > 0 ? 'text-red-700' : ''}`}>{stats.overpaid}건</p>
                {stats.totalOverpaidAmount > 0 && (
                  <p className="text-xs text-red-600 mt-1">초과액: {stats.totalOverpaidAmount.toLocaleString()}P</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">대기중</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}건</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">승인/처리중</p>
                <p className="text-2xl font-bold text-blue-600">{stats.approved}건</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">완료</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}건</p>
              </CardContent>
            </Card>
          </div>

          {/* 필터 */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="크리에이터명, 예금주, 이메일, ID로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('all')}
                  >
                    전체 ({stats.total})
                  </Button>
                  <Button
                    variant={filterType === 'overpaid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('overpaid')}
                    className={filterType !== 'overpaid' ? 'text-red-600 border-red-300' : 'bg-red-600'}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    초과 ({stats.overpaid})
                  </Button>
                  <Button
                    variant={filterType === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('pending')}
                    className={filterType !== 'pending' ? 'text-yellow-600 border-yellow-300' : ''}
                  >
                    대기중 ({stats.pending})
                  </Button>
                  <Button
                    variant={filterType === 'approved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('approved')}
                    className={filterType !== 'approved' ? 'text-blue-600 border-blue-300' : ''}
                  >
                    승인/처리중 ({stats.approved})
                  </Button>
                  <Button
                    variant={filterType === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('completed')}
                    className={filterType !== 'completed' ? 'text-green-600 border-green-300' : ''}
                  >
                    완료 ({stats.completed})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결과 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                감사 결과 ({filteredResults.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Korea DB + BIZ DB 감사 실행 중...
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {auditResults.length === 0 ? '출금 요청이 없습니다.' : '필터 조건에 맞는 결과가 없습니다.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 테이블 헤더 */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-2 px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                    <div className="col-span-1">신청일</div>
                    <div className="col-span-2">크리에이터</div>
                    <div className="col-span-1">상태</div>
                    <div className="col-span-1">DB</div>
                    <div className="col-span-2 text-right">신청 포인트</div>
                    <div className="col-span-1 text-right">총 수입</div>
                    <div className="col-span-1 text-right">순 잔액</div>
                    <div className="col-span-2 text-right">결과</div>
                    <div className="col-span-1 text-center">상세</div>
                  </div>

                  {filteredResults.map((result, idx) => (
                    <div
                      key={`${result.source_db}-${result.id}-${idx}`}
                      className={`grid grid-cols-1 lg:grid-cols-12 gap-2 p-3 rounded-lg border-2 transition-colors ${
                        result.is_overpaid
                          ? 'bg-red-50 border-red-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {/* 신청일 */}
                      <div className="col-span-1 flex items-center">
                        <span className="text-sm">{new Date(result.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>

                      {/* 크리에이터 */}
                      <div className="col-span-2">
                        <p className="text-sm font-medium truncate">{result.creator_name}</p>
                        {result.account_holder && result.account_holder !== result.creator_name && (
                          <p className="text-xs text-gray-500 truncate">예금주: {result.account_holder}</p>
                        )}
                        <p className="text-xs text-gray-400 font-mono truncate">{result.user_id?.substring(0, 12)}...</p>
                      </div>

                      {/* 상태 */}
                      <div className="col-span-1 flex items-center">
                        {getStatusBadge(result.status)}
                      </div>

                      {/* DB */}
                      <div className="col-span-1 flex items-center">
                        {getSourceBadge(result.source_db)}
                      </div>

                      {/* 신청 포인트 */}
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="text-sm font-bold">{result.requested_points?.toLocaleString()}P</span>
                      </div>

                      {/* 총 수입 */}
                      <div className="col-span-1 flex items-center justify-end">
                        <span className={`text-sm font-semibold ${result.total_earnings > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {result.total_earnings?.toLocaleString()}P
                        </span>
                      </div>

                      {/* 순 잔액 */}
                      <div className="col-span-1 flex items-center justify-end">
                        <span className={`text-sm font-semibold ${result.actual_balance < 0 ? 'text-red-600' : result.actual_balance > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                          {result.actual_balance?.toLocaleString()}P
                        </span>
                      </div>

                      {/* 초과/부족 */}
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        {result.is_overpaid ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-bold text-red-600">
                              {result.balance_diff?.toLocaleString()}P
                            </span>
                          </div>
                        ) : result.status === 'completed' ? (
                          <span className="text-sm text-gray-400">완료</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">정상</span>
                          </div>
                        )}
                      </div>

                      {/* 상세 */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCreator(result)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 크리에이터 포인트 상세 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              포인트 상세 - {selectedCreator?.creator_name}
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-6">
              {/* 출금 요청 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">출금 요청 정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">크리에이터:</span> <span className="font-medium">{selectedCreator.creator_name}</span></div>
                  <div><span className="text-gray-500">상태:</span> {getStatusBadge(selectedCreator.status)}</div>
                  <div><span className="text-gray-500">신청 포인트:</span> <span className="font-bold">{selectedCreator.requested_points?.toLocaleString()}P</span></div>
                  <div><span className="text-gray-500">신청일:</span> {new Date(selectedCreator.created_at).toLocaleDateString('ko-KR')}</div>
                  <div><span className="text-gray-500">DB:</span> {selectedCreator.source_db}</div>
                  <div><span className="text-gray-500">User ID:</span> <span className="font-mono text-xs">{selectedCreator.user_id}</span></div>
                </div>
              </div>

              {/* 포인트 요약 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600 mb-1">총 받은 포인트</p>
                  <p className="text-xl font-bold text-green-700">
                    +{selectedCreator.totalReceived?.toLocaleString()}P
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-red-600 mb-1">총 차감 포인트</p>
                  <p className="text-xl font-bold text-red-700">
                    -{selectedCreator.totalDeducted?.toLocaleString()}P
                  </p>
                </div>
                <div className={`p-4 rounded-lg text-center ${selectedCreator.netBalance < 0 ? 'bg-red-100' : 'bg-blue-50'}`}>
                  <p className={`text-sm mb-1 ${selectedCreator.netBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>순 지급액</p>
                  <p className={`text-xl font-bold ${selectedCreator.netBalance < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                    {selectedCreator.netBalance?.toLocaleString()}P
                  </p>
                </div>
              </div>

              {/* 초과 여부 알림 */}
              {selectedCreator.is_overpaid && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="font-bold text-red-800">초과 출금 감지</p>
                  </div>
                  <p className="text-sm text-red-700">
                    신청 포인트 ({selectedCreator.requested_points?.toLocaleString()}P)가
                    실제 잔액 ({selectedCreator.actual_balance?.toLocaleString()}P)을 초과합니다.
                    차이: <strong>{selectedCreator.balance_diff?.toLocaleString()}P</strong>
                  </p>
                </div>
              )}

              {/* 거래 내역 */}
              <div>
                <h3 className="font-semibold mb-3">
                  포인트 내역 ({creatorTransactions.length}건)
                </h3>
                {creatorTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">포인트 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {creatorTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-gray-500 text-xs whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                          </div>
                          <Badge className={tx.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {tx.amount > 0 ? '지급' : '차감'}
                          </Badge>
                          <div className="text-gray-700 truncate max-w-[250px]">
                            {tx.description || tx.reason || '-'}
                          </div>
                        </div>
                        <div className={`font-bold whitespace-nowrap ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()}P
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
