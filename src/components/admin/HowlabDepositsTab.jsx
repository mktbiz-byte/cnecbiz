import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, Search, Building2 } from 'lucide-react'
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
  const [filterType, setFilterType] = useState('input') // input: 입금만, output: 출금만, all: 전체
  const [stats, setStats] = useState({ total: 0, deposits: 0, withdrawals: 0, depositAmount: 0, withdrawalAmount: 0 })

  useEffect(() => {
    fetchDeposits()
  }, [startDate, endDate, filterType])

  const fetchDeposits = async () => {
    setLoading(true)
    try {
      // 날짜를 YYYYMMDD 형식으로 변환
      const startDateStr = startDate.replace(/-/g, '')
      const endDateStr = endDate.replace(/-/g, '')

      let query = supabaseBiz
        .from('tblbank')
        .select('*')
        .gte('bkdate', startDateStr)
        .lte('bkdate', endDateStr)
        .order('bkdate', { ascending: false })
        .order('bktime', { ascending: false })

      // 필터 적용
      if (filterType === 'input') {
        query = query.gt('bkinput', 0)
      } else if (filterType === 'output') {
        query = query.gt('bkoutput', 0)
      }

      const { data, error } = await query

      if (error) throw error

      setDeposits(data || [])

      // 통계 계산
      const depositItems = (data || []).filter(d => d.bkinput > 0)
      const withdrawalItems = (data || []).filter(d => d.bkoutput > 0)
      setStats({
        total: data?.length || 0,
        deposits: depositItems.length,
        withdrawals: withdrawalItems.length,
        depositAmount: depositItems.reduce((sum, d) => sum + (d.bkinput || 0), 0),
        withdrawalAmount: withdrawalItems.reduce((sum, d) => sum + (d.bkoutput || 0), 0)
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
      (d.bkjukyo && d.bkjukyo.toLowerCase().includes(search)) ||
      (d.bkcontent && d.bkcontent.toLowerCase().includes(search)) ||
      (d.bkinput && d.bkinput.toString().includes(search)) ||
      (d.bkoutput && d.bkoutput.toString().includes(search))
    )
  })

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return '-'
    // YYYYMMDD -> YYYY.MM.DD
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`
  }

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr.length < 4) return ''
    // HHMMSS -> HH:MM
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`
  }

  const formatAmount = (amount) => {
    return (amount || 0).toLocaleString('ko-KR')
  }

  const isDeposit = (item) => item.bkinput > 0

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
                <option value="input">입금만</option>
                <option value="output">출금만</option>
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">적요(입금자명)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">금액</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">잔액</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">내용</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDeposits.map((item) => (
                    <tr key={item.bkid} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {formatDate(item.bkdate)}
                        {item.bktime && (
                          <span className="text-gray-400 ml-1">{formatTime(item.bktime)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isDeposit(item)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isDeposit(item) ? '입금' : '출금'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {item.bkjukyo || '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        isDeposit(item) ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isDeposit(item) ? '+' : '-'}{formatAmount(isDeposit(item) ? item.bkinput : item.bkoutput)}원
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {formatAmount(item.bkjango)}원
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {item.bkcontent || item.bketc || '-'}
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
