import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Link as LinkIcon } from 'lucide-react'

export default function BankTransactionsTab() {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, matched, unmatched

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/.netlify/functions/get-bank-transactions?startDate=${startDate.replace(/-/g, '')}&endDate=${endDate.replace(/-/g, '')}`
      )
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
        setStats(data.stats)
      } else {
        alert('거래 내역 조회 실패: ' + data.error)
      }
    } catch (error) {
      console.error('거래 내역 조회 오류:', error)
      alert('거래 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualMatch = async (transaction, request) => {
    if (!confirm(`${request.company_name}님의 충전 신청과 매칭하시겠습니까?\n\n입금액: ${parseInt(transaction.tradeBalance).toLocaleString()}원\n신청액: ${request.amount.toLocaleString()}원`)) {
      return
    }

    try {
      const response = await fetch('/.netlify/functions/manual-match-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          transaction
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('매칭이 완료되었습니다!')
        fetchTransactions() // 새로고침
      } else {
        alert('매칭 실패: ' + data.error)
      }
    } catch (error) {
      console.error('매칭 오류:', error)
      alert('매칭 처리 중 오류가 발생했습니다.')
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    // 검색어 필터
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (!tx.briefs?.toLowerCase().includes(search) && 
          !tx.tradeBalance?.toString().includes(search)) {
        return false
      }
    }

    // 매칭 상태 필터
    if (filterStatus === 'matched' && !tx.isMatched) return false
    if (filterStatus === 'unmatched' && tx.isMatched) return false

    return true
  })

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total || 0}건</div>
            <p className="text-sm text-gray-500">전체 거래</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.matched || 0}건</div>
            <p className="text-sm text-gray-500">매칭 완료</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.unmatched || 0}건</div>
            <p className="text-sm text-gray-500">미매칭</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{(stats.totalAmount || 0).toLocaleString()}원</div>
            <p className="text-sm text-gray-500">총 입금액</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>계좌 거래 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="self-center">~</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={fetchTransactions} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              조회
            </Button>
            <div className="flex-1" />
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                전체
              </Button>
              <Button
                variant={filterStatus === 'matched' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('matched')}
                size="sm"
              >
                매칭완료
              </Button>
              <Button
                variant={filterStatus === 'unmatched' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('unmatched')}
                size="sm"
              >
                미매칭
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="입금자명, 금액 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          {/* 거래 내역 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">거래일시</th>
                  <th className="text-left p-3">입금자명</th>
                  <th className="text-right p-3">입금액</th>
                  <th className="text-left p-3">매칭 상태</th>
                  <th className="text-left p-3">매칭 정보</th>
                  <th className="text-center p-3">작업</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      거래 내역을 불러오는 중...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-gray-500">
                      거래 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="text-sm">
                          {tx.tradeDate?.slice(0, 4)}-{tx.tradeDate?.slice(4, 6)}-{tx.tradeDate?.slice(6, 8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tx.tradeDate?.slice(8, 10)}:{tx.tradeDate?.slice(10, 12)}:{tx.tradeDate?.slice(12, 14)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{tx.briefs || '-'}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-green-600">
                          {parseInt(tx.tradeBalance || 0).toLocaleString()}원
                        </div>
                      </td>
                      <td className="p-3">
                        {tx.isMatched ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">매칭완료</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">미매칭</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {tx.matchedRequest ? (
                          <div className="text-sm">
                            <div className="font-medium">{tx.matchedRequest.company_name}</div>
                            <div className="text-xs text-gray-500">
                              신청액: {tx.matchedRequest.amount.toLocaleString()}원
                            </div>
                            <div className="text-xs text-gray-500">
                              상태: {tx.matchedRequest.status === 'confirmed' ? '승인완료' : '대기중'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {tx.isMatched && tx.matchedRequest?.status === 'confirmed' ? (
                          <span className="text-xs text-gray-500">처리완료</span>
                        ) : tx.matchedRequest ? (
                          <Button
                            size="sm"
                            onClick={() => handleManualMatch(tx, tx.matchedRequest)}
                            className="text-xs"
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            매칭
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">매칭불가</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
