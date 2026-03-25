import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Link as LinkIcon, AlertTriangle, FileText, FileCheck, FileMinus, Zap } from 'lucide-react'

export default function BankTransactionsTab() {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [dataSource, setDataSource] = useState('') // 'popbill' or 'db'
  const [popbillError, setPopbillError] = useState(null)

  // 자동 매칭
  const [autoMatching, setAutoMatching] = useState(false)
  const [autoMatchResults, setAutoMatchResults] = useState(null) // 미리보기 결과
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 14)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, matched, unmatched
  const [filterTaxInvoice, setFilterTaxInvoice] = useState('all') // all, issued, pending, none
  const [filterAccount, setFilterAccount] = useState('all')

  // 세금계산서 상태 변경 모달
  const [taxModalTx, setTaxModalTx] = useState(null)
  const [taxModalStatus, setTaxModalStatus] = useState('none')
  const [taxModalNtsNum, setTaxModalNtsNum] = useState('')
  const [taxUpdating, setTaxUpdating] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [])

  // 팝빌 데이터를 DB에 자동 동기화
  const syncToDb = async (popbillTransactions) => {
    if (!popbillTransactions || popbillTransactions.length === 0) return

    try {
      setSyncing(true)
      const response = await fetch('/.netlify/functions/sync-deposits-to-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: popbillTransactions,
          accountLabel: '하우파파'
        })
      })
      const result = await response.json()
      if (result.success && result.savedCount > 0) {
        console.log(`[하우파파] DB 동기화 완료: ${result.savedCount}건 새로 저장`)
      }
    } catch (error) {
      console.warn('[하우파파] DB 동기화 실패 (무시):', error.message)
    } finally {
      setSyncing(false)
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)
    setPopbillError(null)

    try {
      // 1차: 팝빌 실시간 API 조회 시도
      console.log('[하우파파] 팝빌 실시간 조회 시도...')
      const popbillUrl = `/.netlify/functions/get-howpapa-deposits?startDate=${startDate.replace(/-/g, '')}&endDate=${endDate.replace(/-/g, '')}&filterType=input`
      const popbillResponse = await fetch(popbillUrl)
      const popbillData = await popbillResponse.json()

      if (popbillData.success && popbillData.data && popbillData.data.length > 0) {
        console.log(`[하우파파] 팝빌 실시간 조회 성공: ${popbillData.data.length}건`)

        // 팝빌 데이터를 DB에 자동 동기화 (비동기로 실행)
        syncToDb(popbillData.data)

        // DB에서 매칭 + 세금계산서 정보 조회
        const dbUrl = `/.netlify/functions/get-bank-transactions?startDate=${startDate.replace(/-/g, '')}&endDate=${endDate.replace(/-/g, '')}`
        let dbMap = new Map()
        try {
          const dbResponse = await fetch(dbUrl)
          const dbData = await dbResponse.json()
          if (dbData.success && dbData.transactions) {
            dbData.transactions.forEach(tx => {
              if (tx.tid) dbMap.set(tx.tid, tx)
            })
          }
        } catch (dbError) {
          console.warn('[하우파파] DB 매칭 정보 보완 실패 (무시):', dbError.message)
        }

        // 팝빌 데이터에 DB 매칭 + 세금계산서 정보 합침
        const formattedTransactions = popbillData.data.map(tx => {
          const dbTx = dbMap.get(tx.tid)
          return {
            id: dbTx?.id || null,
            tid: tx.tid,
            tradeDate: tx.tradeDate + (tx.tradeTime || ''),
            tradeType: tx.tradeType || 'I',
            tradeBalance: String(tx.tradeBalance),
            briefs: tx.briefs,
            isMatched: dbTx?.isMatched || false,
            matchedRequest: dbTx?.matchedRequest || null,
            accountLabel: '하우파파',
            source: 'popbill',
            taxInvoiceStatus: dbTx?.taxInvoiceStatus || 'none',
            taxInvoiceNtsConfirmNum: dbTx?.taxInvoiceNtsConfirmNum || null,
            chargeRequestId: dbTx?.chargeRequestId || null
          }
        })

        setTransactions(formattedTransactions)
        updateStats(formattedTransactions)
        setDataSource('popbill')
        return
      }

      // 팝빌 실패 시
      if (!popbillData.success) {
        console.warn('[하우파파] 팝빌 조회 실패:', popbillData.error)
        setPopbillError(popbillData.error || '팝빌 API 오류')
      }

      // 2차: DB 폴백
      console.log('[하우파파] DB 폴백 조회...')
      const dbUrl = `/.netlify/functions/get-bank-transactions?startDate=${startDate.replace(/-/g, '')}&endDate=${endDate.replace(/-/g, '')}`
      const response = await fetch(dbUrl)
      const data = await response.json()

      if (data.success) {
        setTransactions([...data.transactions])
        setStats({...data.stats})
        setDataSource('db')
      } else {
        console.error('[하우파파] DB 조회도 실패:', data)
        alert(`거래 내역 조회 실패\n\n오류: ${data.error}`)
      }
    } catch (error) {
      console.error('[하우파파] 예외 발생:', error)
      alert(`거래 내역을 불러오는데 실패했습니다.\n\n오류: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const updateStats = (txList) => {
    setStats({
      total: txList.length,
      matched: txList.filter(tx => tx.isMatched).length,
      unmatched: txList.filter(tx => !tx.isMatched).length,
      totalAmount: txList.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0),
      taxInvoiceIssued: txList.filter(tx => tx.taxInvoiceStatus === 'issued').length,
      taxInvoicePending: txList.filter(tx => tx.taxInvoiceStatus === 'pending').length,
      taxInvoiceNone: txList.filter(tx => !tx.taxInvoiceStatus || tx.taxInvoiceStatus === 'none').length
    })
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
        fetchTransactions()
      } else {
        alert('매칭 실패: ' + data.error)
      }
    } catch (error) {
      console.error('매칭 오류:', error)
      alert('매칭 처리 중 오류가 발생했습니다.')
    }
  }

  // 세금계산서 자동 매칭 (미리보기)
  const handleAutoMatchPreview = async () => {
    setAutoMatching(true)
    try {
      const response = await fetch('/.netlify/functions/auto-match-tax-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      })
      const result = await response.json()
      if (result.success) {
        setAutoMatchResults(result)
      } else {
        alert('자동 매칭 조회 실패: ' + result.error)
      }
    } catch (error) {
      console.error('자동 매칭 미리보기 오류:', error)
      alert('자동 매칭 조회 중 오류가 발생했습니다.')
    } finally {
      setAutoMatching(false)
    }
  }

  // 세금계산서 자동 매칭 실행
  const handleAutoMatchApply = async () => {
    if (!confirm(`${autoMatchResults?.matched || 0}건의 입금 내역에 세금계산서를 자동 매칭하시겠습니까?`)) return

    setAutoMatching(true)
    try {
      const response = await fetch('/.netlify/functions/auto-match-tax-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      })
      const result = await response.json()
      if (result.success) {
        alert(`${result.matched}건 자동 매칭 완료!`)
        setAutoMatchResults(null)
        fetchTransactions()
      } else {
        alert('자동 매칭 실패: ' + result.error)
      }
    } catch (error) {
      console.error('자동 매칭 오류:', error)
      alert('자동 매칭 중 오류가 발생했습니다.')
    } finally {
      setAutoMatching(false)
    }
  }

  // 세금계산서 상태 업데이트
  const handleTaxStatusUpdate = async () => {
    if (!taxModalTx) return
    setTaxUpdating(true)

    try {
      const response = await fetch('/.netlify/functions/update-deposit-tax-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: taxModalTx.id || null,
          chargeRequestId: taxModalTx.chargeRequestId || null,
          taxInvoiceStatus: taxModalStatus,
          ntsConfirmNum: taxModalNtsNum || null
        })
      })

      const result = await response.json()
      if (result.success) {
        // 로컬 상태 업데이트
        setTransactions(prev => prev.map(tx =>
          tx.tid === taxModalTx.tid
            ? { ...tx, taxInvoiceStatus: taxModalStatus, taxInvoiceNtsConfirmNum: taxModalNtsNum || tx.taxInvoiceNtsConfirmNum }
            : tx
        ))
        setTaxModalTx(null)
        alert('세금계산서 상태가 업데이트되었습니다.')
      } else {
        alert('업데이트 실패: ' + result.error)
      }
    } catch (error) {
      console.error('세금계산서 상태 업데이트 오류:', error)
      alert('업데이트 중 오류가 발생했습니다.')
    } finally {
      setTaxUpdating(false)
    }
  }

  const openTaxModal = (tx) => {
    setTaxModalTx(tx)
    setTaxModalStatus(tx.taxInvoiceStatus || 'none')
    setTaxModalNtsNum(tx.taxInvoiceNtsConfirmNum || '')
  }

  const getTaxInvoiceBadge = (status, ntsNum) => {
    switch (status) {
      case 'issued':
        return (
          <div className="flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs text-green-700 font-medium">발행완료</span>
            {ntsNum && <span className="text-xs text-gray-400 ml-1" title={ntsNum}>#{ntsNum.slice(-6)}</span>}
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs text-yellow-700 font-medium">발행대기</span>
          </div>
        )
      case 'not_needed':
        return (
          <div className="flex items-center gap-1">
            <FileMinus className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">불필요</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-500 font-medium">미발행</span>
          </div>
        )
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (!tx.briefs?.toLowerCase().includes(search) &&
          !tx.tradeBalance?.toString().includes(search) &&
          !tx.matchedRequest?.company_name?.toLowerCase().includes(search)) {
        return false
      }
    }

    if (filterStatus === 'matched' && !tx.isMatched) return false
    if (filterStatus === 'unmatched' && tx.isMatched) return false

    if (filterTaxInvoice === 'issued' && tx.taxInvoiceStatus !== 'issued') return false
    if (filterTaxInvoice === 'pending' && tx.taxInvoiceStatus !== 'pending') return false
    if (filterTaxInvoice === 'none' && tx.taxInvoiceStatus !== 'none' && tx.taxInvoiceStatus !== undefined) return false

    if (filterAccount !== 'all' && tx.accountLabel !== filterAccount) return false

    return true
  })

  return (
    <div className="space-y-6">
      {/* 팝빌 에러 알림 */}
      {popbillError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">팝빌 실시간 조회 실패</p>
              <p className="text-sm text-red-600 mt-1">{popbillError}</p>
              <p className="text-xs text-red-500 mt-2">
                {dataSource === 'db' ? 'DB 저장 데이터로 표시 중입니다.' : '거래내역을 가져올 수 없습니다.'}
                {' '}팝빌 계정 설정을 확인해주세요. (사업자번호: 575-81-02253, 기업은행 047-122753-04-011)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 동기화 알림 */}
      {syncing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            새 입금 내역을 DB에 저장 중...
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total || 0}건</div>
            <p className="text-sm text-gray-500">전체 입금</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{(stats.totalAmount || 0).toLocaleString()}원</div>
            <p className="text-sm text-gray-500">총 입금액</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.taxInvoiceIssued || 0}건</div>
            <p className="text-sm text-gray-500">세금계산서 발행</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.taxInvoicePending || 0}건</div>
            <p className="text-sm text-gray-500">세금계산서 대기</p>
          </CardContent>
        </Card>
        <Card className={stats.taxInvoiceNone > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.taxInvoiceNone > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {stats.taxInvoiceNone || 0}건
            </div>
            <p className="text-sm text-gray-500">세금계산서 미발행</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>하우파파 입금 내역</CardTitle>
            <div className="flex items-center gap-2">
              {dataSource && (
                <span className={`text-xs px-2 py-1 rounded-full ${dataSource === 'popbill' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {dataSource === 'popbill' ? '팝빌 실시간 + DB 동기화' : 'DB 저장 데이터'}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            {/* 날짜 & 조회 */}
            <div className="flex flex-wrap gap-2 items-center">
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
              <Button onClick={fetchTransactions} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                조회
              </Button>
              <Button
                onClick={async () => {
                  if (!confirm('은행 API에서 최신 거래 내역을 수집하시겠습니까?')) return
                  setLoading(true)
                  try {
                    const response = await fetch('/.netlify/functions/scheduled-collect-transactions')
                    const data = await response.json()
                    if (data.success) {
                      alert(`수집 완료!\n\n저장: ${data.savedCount || 0}건\n자동 매칭: ${data.matchedCount || 0}건\n\n조회 버튼을 눌러 최신 데이터를 확인하세요.`)
                      fetchTransactions()
                    } else {
                      alert('수집 실패: ' + (data.error || '알 수 없는 오류'))
                    }
                  } catch (error) {
                    alert('수집 실패: ' + error.message)
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                수동 수집
              </Button>
              <Button
                onClick={handleAutoMatchPreview}
                disabled={loading || autoMatching}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Zap className={`w-4 h-4 mr-2 ${autoMatching ? 'animate-pulse' : ''}`} />
                {autoMatching ? '매칭 중...' : '세금계산서 자동 매칭'}
              </Button>
            </div>

            {/* 필터 */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-500 mr-1">매칭:</span>
                <Button variant={filterStatus === 'all' ? 'default' : 'outline'} onClick={() => setFilterStatus('all')} size="sm">전체</Button>
                <Button variant={filterStatus === 'matched' ? 'default' : 'outline'} onClick={() => setFilterStatus('matched')} size="sm">매칭완료</Button>
                <Button variant={filterStatus === 'unmatched' ? 'default' : 'outline'} onClick={() => setFilterStatus('unmatched')} size="sm">미매칭</Button>
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-500 mr-1">세금계산서:</span>
                <Button variant={filterTaxInvoice === 'all' ? 'default' : 'outline'} onClick={() => setFilterTaxInvoice('all')} size="sm">전체</Button>
                <Button variant={filterTaxInvoice === 'issued' ? 'default' : 'outline'} onClick={() => setFilterTaxInvoice('issued')} size="sm">
                  발행완료
                </Button>
                <Button variant={filterTaxInvoice === 'pending' ? 'default' : 'outline'} onClick={() => setFilterTaxInvoice('pending')} size="sm">
                  발행대기
                </Button>
                <Button
                  variant={filterTaxInvoice === 'none' ? 'default' : 'outline'}
                  onClick={() => setFilterTaxInvoice('none')}
                  size="sm"
                  className={filterTaxInvoice === 'none' ? '' : stats.taxInvoiceNone > 0 ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
                >
                  미발행
                </Button>
              </div>
              <div className="flex-1" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="입금자명, 금액, 회사명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          {/* 거래 내역 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-700">거래일시</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">입금자명</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">입금액</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">매칭 상태</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">매칭 정보</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">세금계산서</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      거래 내역을 불러오는 중...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-gray-500">
                      거래 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, index) => (
                    <tr key={tx.tid || index} className={`border-b hover:bg-gray-50 ${
                      (!tx.taxInvoiceStatus || tx.taxInvoiceStatus === 'none') ? 'bg-red-50/30' : ''
                    }`}>
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
                              신청액: {tx.matchedRequest.amount?.toLocaleString()}원
                            </div>
                            <div className="text-xs text-gray-500">
                              상태: {tx.matchedRequest.status === 'confirmed' ? '승인완료' : tx.matchedRequest.status === 'completed' ? '완료' : '대기중'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => openTaxModal(tx)}
                          className="hover:bg-gray-100 rounded p-1 transition-colors cursor-pointer"
                          title="세금계산서 상태 변경"
                        >
                          {getTaxInvoiceBadge(tx.taxInvoiceStatus, tx.taxInvoiceNtsConfirmNum)}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        {tx.isMatched && (tx.matchedRequest?.status === 'completed' || tx.matchedRequest?.status === 'confirmed') ? (
                          <span className="text-xs text-gray-500">처리완료</span>
                        ) : tx.matchedRequest && tx.matchedRequest.status === 'pending' ? (
                          <Button
                            size="sm"
                            onClick={() => handleManualMatch(tx, tx.matchedRequest)}
                            className="text-xs"
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            승인
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
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

      {/* 세금계산서 상태 변경 모달 */}
      {taxModalTx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle className="text-lg">세금계산서 상태 변경</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">입금자:</span>
                  <span className="font-medium">{taxModalTx.briefs || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">입금액:</span>
                  <span className="font-medium">{parseInt(taxModalTx.tradeBalance || 0).toLocaleString()}원</span>
                </div>
                {taxModalTx.matchedRequest && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">매칭 회사:</span>
                    <span className="font-medium">{taxModalTx.matchedRequest.company_name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">세금계산서 상태</label>
                <select
                  className="w-full p-2.5 border rounded-lg text-sm"
                  value={taxModalStatus}
                  onChange={(e) => setTaxModalStatus(e.target.value)}
                >
                  <option value="none">미발행</option>
                  <option value="pending">발행 대기</option>
                  <option value="issued">발행 완료</option>
                  <option value="not_needed">불필요 (세금계산서 대상 아님)</option>
                </select>
              </div>

              {taxModalStatus === 'issued' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">국세청 승인번호 (선택)</label>
                  <Input
                    type="text"
                    value={taxModalNtsNum}
                    onChange={(e) => setTaxModalNtsNum(e.target.value)}
                    placeholder="예: 20260325-..."
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleTaxStatusUpdate}
                  disabled={taxUpdating}
                  className="flex-1"
                >
                  {taxUpdating ? '처리 중...' : '저장'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTaxModalTx(null)}
                  disabled={taxUpdating}
                >
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 세금계산서 자동 매칭 결과 모달 */}
      {autoMatchResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden bg-white flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    세금계산서 자동 매칭 결과
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    미발행 {autoMatchResults.total}건 중 {autoMatchResults.matched}건 매칭 가능
                    (세금계산서 {autoMatchResults.invoiceCount}건 비교)
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAutoMatchResults(null)}>닫기</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              {autoMatchResults.results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  매칭 가능한 건이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {autoMatchResults.results.map((match, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 ${
                        match.confidence === 'high' ? 'border-green-200 bg-green-50' :
                        match.confidence === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">입금:</span>
                            <span>{match.depositName}</span>
                            <span className="text-gray-500">|</span>
                            <span className="font-bold text-green-700">{match.depositAmount.toLocaleString()}원</span>
                            <span className="text-gray-500">|</span>
                            <span className="text-gray-500 text-xs">
                              {match.depositDate?.slice(0, 4)}-{match.depositDate?.slice(4, 6)}-{match.depositDate?.slice(6, 8)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <span className="font-medium">세금계산서:</span>
                            <span>{match.invoiceCompany}</span>
                            <span className="text-gray-500">|</span>
                            <span className="font-bold">{match.invoiceAmount.toLocaleString()}원</span>
                            {match.invoiceNtsNum && (
                              <>
                                <span className="text-gray-500">|</span>
                                <span className="text-xs text-gray-500">#{match.invoiceNtsNum.slice(-8)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            match.confidence === 'high' ? 'bg-green-200 text-green-800' :
                            match.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-orange-200 text-orange-800'
                          }`}>
                            {match.matchType === 'charge_request_link' ? '충전 연동' :
                             `유사도 ${match.similarity}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {autoMatchResults.results.length > 0 && (
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button
                    onClick={handleAutoMatchApply}
                    disabled={autoMatching}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {autoMatching ? '처리 중...' : `${autoMatchResults.matched}건 자동 매칭 적용`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAutoMatchResults(null)}
                    disabled={autoMatching}
                  >
                    취소
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
