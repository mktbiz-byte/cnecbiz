import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Building2 } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function HowlabDepositsTab() {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('1') // 1: 입금만, 2: 출금만, all: 전체
  const [stats, setStats] = useState({ total: 0, deposits: 0, withdrawals: 0, depositAmount: 0, withdrawalAmount: 0 })

  useEffect(() => {
    fetchDeposits()
  }, [startDate, endDate, filterType])

  const fetchDeposits = async () => {
    setLoading(true)
    try {
      let query = supabaseBiz
        .from('bankda_deposits')
        .select('*')
        .gte('inoutdate', startDate)
        .lte('inoutdate', endDate)
        .order('inoutdate', { ascending: false })
        .order('inouttime', { ascending: false })

      if (filterType !== 'all') {
        query = query.eq('inouttype', filterType)
      }

      const { data, error } = await query

      if (error) throw error

      setDeposits(data || [])

      // 통계 계산
      const depositItems = (data || []).filter(d => d.inouttype === '1')
      const withdrawalItems = (data || []).filter(d => d.inouttype === '2')
      setStats({
        total: data?.length || 0,
        deposits: depositItems.length,
        withdrawals: withdrawalItems.length,
        depositAmount: depositItems.reduce((sum, d) => sum + (d.inoutamount || 0), 0),
        withdrawalAmount: withdrawalItems.reduce((sum, d) => sum + (d.inoutamount || 0), 0)
      })
    } catch (error) {
      console.error('입출금 내역 조회 오류:', error)
      alert('입출금 내역을 불러오는데 실패했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeposits = deposits.filter(d => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (d.briefs && d.briefs.toLowerCase().includes(search)) ||
      (d.memo && d.memo.toLowerCase().includes(search)) ||
      (d.inoutamount && d.inoutamount.toString().includes(search))
    )
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR')
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    // HH:MM:SS 형식
    return timeStr.slice(0, 5)
  }

  const formatAmount = (amount) => {
    return (amount || 0).toLocaleString('ko-KR')
  }

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">전체 건수</div>
            <div className="text-2xl font-bold">{stats.total}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">입금 건수</div>
            <div className="text-2xl font-bold text-green-600">{stats.deposits}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">입금 합계</div>
            <div className="text-2xl font-bold text-green-600">{formatAmount(stats.depositAmount)}원</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">출금 건수</div>
            <div className="text-2xl font-bold text-red-600">{stats.withdrawals}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">출금 합계</div>
            <div className="text-2xl font-bold text-red-600">{formatAmount(stats.withdrawalAmount)}원</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            하우랩 입출금 내역 (뱅크다)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm text-gray-500">시작일</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">종료일</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">유형</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-32 h-10 px-3 border rounded-md"
              >
                <option value="1">입금만</option>
                <option value="2">출금만</option>
                <option value="all">전체</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-500">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="입금자명, 금액 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={fetchDeposits} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 목록 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">로딩 중...</span>
            </div>
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              입출금 내역이 없습니다.
              <br />
              <span className="text-sm">뱅크다에서 데이터 전송이 시작되면 여기에 표시됩니다.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">일시</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">유형</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">입금자명</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">금액</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">잔액</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">매칭</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">메모</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDeposits.map((deposit) => (
                    <tr key={deposit.bkcode} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {formatDate(deposit.inoutdate)}
                        {deposit.inouttime && (
                          <span className="text-gray-400 ml-1">{formatTime(deposit.inouttime)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          deposit.inouttype === '1'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {deposit.inouttype === '1' ? '입금' : '출금'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {deposit.briefs || '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        deposit.inouttype === '1' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {deposit.inouttype === '1' ? '+' : '-'}{formatAmount(deposit.inoutamount)}원
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {formatAmount(deposit.balance)}원
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deposit.is_matched ? (
                          <CheckCircle className="w-5 h-5 text-green-500 inline" />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {deposit.memo || deposit.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
