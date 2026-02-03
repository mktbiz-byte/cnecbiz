import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle, CheckCircle, Loader2, RefreshCw,
  Wallet, ArrowDownCircle, Download, Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

export default function WithdrawalAudit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [auditResults, setAuditResults] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, overpaid, pending, approved
  const [stats, setStats] = useState({
    total: 0,
    overpaid: 0,
    totalOverpaidAmount: 0,
    pending: 0,
    approved: 0,
    completed: 0
  })

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
      // 1. 모든 출금 요청 조회 (rejected 제외)
      const { data: withdrawals, error: wError } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('*')
        .not('status', 'eq', 'rejected')
        .order('created_at', { ascending: false })

      if (wError) throw wError

      if (!withdrawals || withdrawals.length === 0) {
        setAuditResults([])
        setStats({ total: 0, overpaid: 0, totalOverpaidAmount: 0, pending: 0, approved: 0, completed: 0 })
        setLoading(false)
        return
      }

      // 2. 고유 크리에이터 ID 추출
      const creatorIds = [...new Set(withdrawals.map(w => w.creator_id).filter(Boolean))]

      // 3. 각 크리에이터의 포인트 합계 계산
      const balanceMap = {}
      for (const creatorId of creatorIds) {
        const { data: pointsData } = await supabaseBiz
          .from('creator_points')
          .select('amount')
          .eq('creator_id', creatorId)

        const totalBalance = (pointsData || []).reduce((sum, p) => sum + (p.amount || 0), 0)
        balanceMap[creatorId] = totalBalance
      }

      // 4. 각 크리에이터의 featured_creators 정보 조회
      const { data: creatorsData } = await supabaseBiz
        .from('featured_creators')
        .select('id, channel_name, name, email, region, points_balance')
        .in('id', creatorIds)

      const creatorMap = {}
      if (creatorsData) {
        creatorsData.forEach(c => { creatorMap[c.id] = c })
      }

      // 5. 크리에이터별 처리중 출금 합계 계산
      const pendingByCreator = {}
      withdrawals.forEach(w => {
        if (['pending', 'approved', 'processing'].includes(w.status)) {
          pendingByCreator[w.creator_id] = (pendingByCreator[w.creator_id] || 0) + (w.requested_points || 0)
        }
      })

      // 6. 감사 결과 생성
      const results = withdrawals.map(w => {
        const actualBalance = balanceMap[w.creator_id] ?? 0
        const cachedBalance = creatorMap[w.creator_id]?.points_balance ?? 0
        const creatorInfo = creatorMap[w.creator_id]
        const totalPendingForCreator = pendingByCreator[w.creator_id] || 0

        // 이 출금 요청 시점에서 초과 여부 판단
        // 완료된 출금은 이미 처리됨 → 실제 잔액에서 초과 여부만 판단
        const isOverpaid = w.requested_points > actualBalance && ['pending', 'approved', 'processing'].includes(w.status)
        const balanceDiff = actualBalance - w.requested_points

        return {
          ...w,
          creator_name: creatorInfo?.channel_name || creatorInfo?.name || w.creator_name || 'Unknown',
          creator_email: creatorInfo?.email || '',
          creator_region: creatorInfo?.region || '',
          actual_balance: actualBalance,
          cached_balance: cachedBalance,
          balance_diff: balanceDiff,
          total_pending: totalPendingForCreator,
          is_overpaid: isOverpaid,
          balance_mismatch: Math.abs(actualBalance - cachedBalance) > 1
        }
      })

      // 7. 통계 계산
      const overpaidItems = results.filter(r => r.is_overpaid)
      setStats({
        total: results.length,
        overpaid: overpaidItems.length,
        totalOverpaidAmount: overpaidItems.reduce((sum, r) => sum + Math.abs(r.balance_diff), 0),
        pending: results.filter(r => r.status === 'pending').length,
        approved: results.filter(r => r.status === 'approved').length,
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

  const getFilteredResults = () => {
    let filtered = auditResults

    if (filterType === 'overpaid') {
      filtered = filtered.filter(r => r.is_overpaid)
    } else if (filterType === 'pending') {
      filtered = filtered.filter(r => r.status === 'pending')
    } else if (filterType === 'approved') {
      filtered = filtered.filter(r => r.status === 'approved' || r.status === 'processing')
    } else if (filterType === 'mismatch') {
      filtered = filtered.filter(r => r.balance_mismatch)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(r =>
        r.creator_name?.toLowerCase().includes(search) ||
        r.creator_email?.toLowerCase().includes(search) ||
        r.creator_id?.toLowerCase().includes(search)
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

  const handleDownloadExcel = () => {
    const filtered = getFilteredResults()
    if (filtered.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }

    const excelData = filtered.map(r => ({
      '신청일': new Date(r.created_at).toLocaleDateString('ko-KR'),
      '크리에이터': r.creator_name,
      '이메일': r.creator_email,
      '리전': r.creator_region,
      '상태': r.status,
      '신청 포인트': r.requested_points,
      '실제 잔액 (creator_points)': r.actual_balance,
      '캐시 잔액 (featured_creators)': r.cached_balance,
      '잔액 차이': r.balance_diff,
      '처리중 출금 합계': r.total_pending,
      '초과 여부': r.is_overpaid ? 'YES' : 'NO',
      '캐시 불일치': r.balance_mismatch ? 'YES' : 'NO'
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 8 },
      { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
      { wch: 10 }, { wch: 12 }
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
                <p className="text-gray-600">크리에이터 출금 요청의 포인트 잔액 초과 여부를 점검합니다</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                  <p className={`text-sm ${stats.overpaid > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>초과 출금 요청</p>
                </div>
                <p className={`text-2xl font-bold ${stats.overpaid > 0 ? 'text-red-700' : ''}`}>{stats.overpaid}건</p>
                {stats.totalOverpaidAmount > 0 && (
                  <p className="text-sm text-red-600 mt-1">총 초과액: {stats.totalOverpaidAmount.toLocaleString()}P</p>
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
          </div>

          {/* 필터 */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="크리에이터명, 이메일, ID로 검색..."
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
                    variant={filterType === 'mismatch' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('mismatch')}
                    className={filterType !== 'mismatch' ? 'text-orange-600 border-orange-300' : ''}
                  >
                    캐시 불일치
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
                  감사 실행 중...
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {auditResults.length === 0 ? '출금 요청이 없습니다.' : '필터 조건에 맞는 결과가 없습니다.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 테이블 헤더 */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-2 px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                    <div className="col-span-1">신청일</div>
                    <div className="col-span-2">크리에이터</div>
                    <div className="col-span-1">상태</div>
                    <div className="col-span-2 text-right">신청 포인트</div>
                    <div className="col-span-2 text-right">실제 잔액</div>
                    <div className="col-span-2 text-right">캐시 잔액</div>
                    <div className="col-span-2 text-right">초과/부족</div>
                  </div>

                  {filteredResults.map((result) => (
                    <div
                      key={result.id}
                      className={`grid grid-cols-1 lg:grid-cols-12 gap-2 p-4 rounded-lg border-2 transition-colors ${
                        result.is_overpaid
                          ? 'bg-red-50 border-red-300'
                          : result.balance_mismatch
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* 신청일 */}
                      <div className="col-span-1 flex items-center">
                        <span className="text-sm">{new Date(result.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>

                      {/* 크리에이터 */}
                      <div className="col-span-2">
                        <p className="text-sm font-medium truncate">{result.creator_name}</p>
                        <p className="text-xs text-gray-500 truncate">{result.creator_email || result.creator_id?.substring(0, 12)}</p>
                        {result.creator_region && (
                          <Badge className="mt-1 text-[10px] bg-gray-100 text-gray-600">{result.creator_region}</Badge>
                        )}
                      </div>

                      {/* 상태 */}
                      <div className="col-span-1 flex items-center">
                        {getStatusBadge(result.status)}
                      </div>

                      {/* 신청 포인트 */}
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="text-sm font-bold">{result.requested_points?.toLocaleString()}P</span>
                      </div>

                      {/* 실제 잔액 */}
                      <div className="col-span-2 flex items-center justify-end">
                        <span className={`text-sm font-semibold ${result.actual_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {result.actual_balance?.toLocaleString()}P
                        </span>
                      </div>

                      {/* 캐시 잔액 */}
                      <div className="col-span-2 flex flex-col items-end justify-center">
                        <span className="text-sm text-gray-500">{result.cached_balance?.toLocaleString()}P</span>
                        {result.balance_mismatch && (
                          <span className="text-[10px] text-orange-600">불일치</span>
                        )}
                      </div>

                      {/* 초과/부족 */}
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        {result.is_overpaid ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-bold text-red-600">
                              {result.balance_diff?.toLocaleString()}P
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">정상</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
