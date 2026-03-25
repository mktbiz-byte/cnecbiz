import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, CheckCircle, XCircle, Clock, Search, Building2, AlertTriangle, FileText, FileCheck, FileMinus, Zap } from 'lucide-react'

export default function HowlabDepositsTab() {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [popbillError, setPopbillError] = useState(null)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTaxInvoice, setFilterTaxInvoice] = useState('all')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 14)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))

  // 자동 매칭
  const [autoMatching, setAutoMatching] = useState(false)
  const [autoMatchResults, setAutoMatchResults] = useState(null)

  // 세금계산서 상태 변경 모달
  const [taxModalTx, setTaxModalTx] = useState(null)
  const [taxModalStatus, setTaxModalStatus] = useState('none')
  const [taxModalNtsNum, setTaxModalNtsNum] = useState('')
  const [taxUpdating, setTaxUpdating] = useState(false)

  useEffect(() => {
    loadFromDb()
    syncFromPopbill(true)
  }, [])

  // DB에서 하우랩 입금 내역 로드 (날짜 필터 적용, 실패 시 팝빌 폴백)
  const loadFromDb = async () => {
    setLoading(true)
    setPopbillError(null)

    const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))

    // 1차: DB 조회
    try {
      const dbUrl = `/.netlify/functions/get-bank-transactions?startDate=${startDate.replace(/-/g, '')}&endDate=${endDate.replace(/-/g, '')}&accountLabel=howlab`
      const response = await fetch(dbUrl)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.transactions && data.transactions.length > 0) {
          setTransactions([...data.transactions])
          setStats({...data.stats})
          setLoading(false)
          // 백그라운드 팝빌 동기화 (1개월 이내만)
          if (diffDays <= 31) syncFromPopbill(true)
          return
        }
      }
    } catch (dbError) {
      console.warn('[하우랩] DB 조회 실패:', dbError.message)
    }

    // 2차: DB 0건 또는 실패 → 팝빌 직접 조회 (1개월 이내만)
    if (diffDays <= 31) {
      try {
        const popbillUrl = `/.netlify/functions/get-howlab-deposits?startDate=${startDate.replace(/-/g, '')}&endDate=${endDate.replace(/-/g, '')}&filterType=input`
        const popbillResponse = await fetch(popbillUrl)
        const popbillData = await popbillResponse.json()

        if (popbillData.success && popbillData.data && popbillData.data.length > 0) {
          const formattedTransactions = popbillData.data.map(d => ({
            id: null, tid: d.bkid,
            tradeDate: d.bkdate + (d.bktime || ''),
            tradeType: d.bkinput > 0 ? 'I' : 'O',
            tradeBalance: String(d.bkinput > 0 ? d.bkinput : d.bkoutput),
            briefs: d.bkjukyo || '',
            isMatched: false, matchedRequest: null,
            accountLabel: '하우랩',
            taxInvoiceStatus: 'none', taxInvoiceNtsConfirmNum: null, chargeRequestId: null
          }))
          setTransactions(formattedTransactions)
          setStats({
            total: formattedTransactions.length,
            matched: 0, unmatched: formattedTransactions.length,
            totalAmount: formattedTransactions.reduce((sum, tx) => sum + parseInt(tx.tradeBalance || 0), 0)
          })
          // 백그라운드 DB 저장
          syncToDb(popbillData.data)
        } else if (!popbillData.success) {
          setPopbillError(popbillData.error || '팝빌 API 오류')
        }
      } catch (popErr) {
        console.error('[하우랩] 팝빌 실패:', popErr.message)
        setPopbillError('팝빌 조회 실패: ' + popErr.message)
      }
    } else {
      setPopbillError('조회 기간이 1개월 초과. DB에 저장된 데이터만 표시됩니다.')
    }

    setLoading(false)
  }

  // 팝빌 데이터를 DB에 백그라운드 저장
  const syncToDb = async (popbillData) => {
    try {
      const txForSync = popbillData.map(d => ({
        tid: d.bkid, tradeDate: d.bkdate, tradeTime: d.bktime || '',
        tradeType: d.bkinput > 0 ? 'I' : 'O',
        tradeBalance: d.bkinput > 0 ? d.bkinput : d.bkoutput,
        briefs: d.bkjukyo || ''
      }))
      await fetch('/.netlify/functions/sync-deposits-to-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: txForSync, accountLabel: '하우랩' })
      })
    } catch (e) {
      console.warn('[하우랩] DB 저장 실패 (무시):', e.message)
    }
  }

  // 팝빌에서 최신 데이터 가져와 DB에 저장
  const syncFromPopbill = async (isBackground = false) => {
    if (!isBackground) setSyncing(true)
    setSyncResult(null)
    setPopbillError(null)

    try {
      // 현재 날짜 범위로 조회 (팝빌 1개월 제한 준수)

      const popbillUrl = `/.netlify/functions/get-howlab-deposits?startDate=${startDate.replace(/-/g, '')}&endDate=${endDate.replace(/-/g, '')}&filterType=input`
      const popbillResponse = await fetch(popbillUrl)
      const popbillData = await popbillResponse.json()

      if (popbillData.success && popbillData.data && popbillData.data.length > 0) {
        // 하우랩 데이터를 bank_transactions 형식으로 변환
        const txForSync = popbillData.data.map(d => ({
          tid: d.bkid,
          tradeDate: d.bkdate,
          tradeTime: d.bktime || '',
          tradeType: d.bkinput > 0 ? 'I' : 'O',
          tradeBalance: d.bkinput > 0 ? d.bkinput : d.bkoutput,
          briefs: d.bkjukyo || ''
        }))

        // DB 저장 시도 (실패해도 무시)
        let newCount = 0
        try {
          const saveResponse = await fetch('/.netlify/functions/sync-deposits-to-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactions: txForSync,
              accountLabel: '하우랩'
            })
          })
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json()
            newCount = saveResult.savedCount || 0
          }
        } catch (syncErr) {
          console.warn('[하우랩] DB 저장 실패 (무시):', syncErr.message)
        }

        setLastSyncTime(new Date().toLocaleString('ko-KR'))
        setSyncResult({ success: true, fetched: popbillData.data.length, saved: newCount })

        if (newCount > 0) {
          await loadFromDb()
        }
      } else {
        if (!popbillData.success) {
          console.warn('[하우랩] 팝빌 조회 실패:', popbillData.error)
          if (!isBackground) setPopbillError(popbillData.error || '팝빌 API 오류')
        }
        setSyncResult({ success: true, fetched: 0, saved: 0 })
      }
    } catch (error) {
      console.error('[하우랩] 팝빌 동기화 실패:', error)
      if (!isBackground) alert('팝빌 동기화 실패: ' + error.message)
      setSyncResult({ success: false, error: error.message })
    } finally {
      setSyncing(false)
    }
  }

  // 세금계산서 자동 매칭 미리보기
  const handleAutoMatchPreview = async () => {
    setAutoMatching(true)
    try {
      const response = await fetch('/.netlify/functions/auto-match-tax-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, accountLabel: 'howlab' })
      })
      const result = await response.json()
      if (result.success) {
        setAutoMatchResults(result)
      } else {
        alert('자동 매칭 조회 실패: ' + result.error)
      }
    } catch (error) {
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
        body: JSON.stringify({ dryRun: false, accountLabel: 'howlab' })
      })
      const result = await response.json()
      if (result.success) {
        alert(`${result.matched}건 자동 매칭 완료!`)
        setAutoMatchResults(null)
        loadFromDb()
      } else {
        alert('자동 매칭 실패: ' + result.error)
      }
    } catch (error) {
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
          tid: taxModalTx.tid || null,
          chargeRequestId: taxModalTx.chargeRequestId || null,
          taxInvoiceStatus: taxModalStatus,
          ntsConfirmNum: taxModalNtsNum || null
        })
      })
      const result = await response.json()
      if (result.success) {
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
    if (filterTaxInvoice === 'issued' && tx.taxInvoiceStatus !== 'issued') return false
    if (filterTaxInvoice === 'pending' && tx.taxInvoiceStatus !== 'pending') return false
    if (filterTaxInvoice === 'none' && tx.taxInvoiceStatus !== 'none' && tx.taxInvoiceStatus !== undefined) return false
    return true
  })

  const taxNoneCount = transactions.filter(tx => !tx.taxInvoiceStatus || tx.taxInvoiceStatus === 'none').length
  const taxIssuedCount = transactions.filter(tx => tx.taxInvoiceStatus === 'issued').length

  return (
    <div className="space-y-6">
      {popbillError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">팝빌 동기화 실패 (DB 저장 데이터 표시 중)</p>
              <p className="text-sm text-yellow-700 mt-1">{popbillError}</p>
            </div>
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
            <div className="text-2xl font-bold text-green-600">{taxIssuedCount}건</div>
            <p className="text-sm text-gray-500">세금계산서 발행</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.taxInvoicePending || 0}건</div>
            <p className="text-sm text-gray-500">세금계산서 대기</p>
          </CardContent>
        </Card>
        <Card className={taxNoneCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${taxNoneCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {taxNoneCount}건
            </div>
            <p className="text-sm text-gray-500">세금계산서 미발행</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              하우랩 입금 내역 (전체)
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastSyncTime && <span className="text-xs text-gray-500">마지막 동기화: {lastSyncTime}</span>}
              {syncing && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> 동기화 중
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            {/* 날짜 & 조회 */}
            <div className="flex flex-wrap gap-2 items-center">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <span className="self-center">~</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
              <Button onClick={loadFromDb} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                조회
              </Button>
              <Button onClick={() => syncFromPopbill(false)} disabled={loading || syncing} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                팝빌 최신 동기화
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
              {syncResult && syncResult.success && syncResult.saved > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  +{syncResult.saved}건 새로 저장됨
                </span>
              )}
            </div>

            {/* 필터 */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-500 mr-1">세금계산서:</span>
                <Button variant={filterTaxInvoice === 'all' ? 'default' : 'outline'} onClick={() => setFilterTaxInvoice('all')} size="sm">전체</Button>
                <Button variant={filterTaxInvoice === 'issued' ? 'default' : 'outline'} onClick={() => setFilterTaxInvoice('issued')} size="sm">발행완료</Button>
                <Button variant={filterTaxInvoice === 'pending' ? 'default' : 'outline'} onClick={() => setFilterTaxInvoice('pending')} size="sm">발행대기</Button>
                <Button
                  variant={filterTaxInvoice === 'none' ? 'default' : 'outline'}
                  onClick={() => setFilterTaxInvoice('none')}
                  size="sm"
                  className={filterTaxInvoice === 'none' ? '' : taxNoneCount > 0 ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
                >
                  미발행
                </Button>
              </div>
              <div className="flex-1" />
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
          </div>

          {/* 거래 내역 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-700">거래일시</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">입금자명</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">입금액</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">매칭 정보</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">세금계산서</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center p-8 text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      거래 내역을 불러오는 중...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center p-8 text-gray-500">
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
                        {tx.matchedRequest ? (
                          <div className="text-sm">
                            <div className="font-medium">{tx.matchedRequest.company_name}</div>
                            <div className="text-xs text-gray-500">
                              {tx.matchedRequest.amount?.toLocaleString()}원
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
                <Button onClick={handleTaxStatusUpdate} disabled={taxUpdating} className="flex-1">
                  {taxUpdating ? '처리 중...' : '저장'}
                </Button>
                <Button variant="outline" onClick={() => setTaxModalTx(null)} disabled={taxUpdating}>취소</Button>
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
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAutoMatchResults(null)}>닫기</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              {autoMatchResults.results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">매칭 가능한 건이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {autoMatchResults.results.map((match, idx) => (
                    <div key={idx} className={`border rounded-lg p-3 ${
                      match.confidence === 'high' ? 'border-green-200 bg-green-50' :
                      match.confidence === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                      'border-orange-200 bg-orange-50'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">입금:</span>
                            <span>{match.depositName}</span>
                            <span className="text-gray-500">|</span>
                            <span className="font-bold text-green-700">{match.depositAmount.toLocaleString()}원</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-medium">세금계산서:</span>
                            <span>{match.invoiceCompany}</span>
                            <span className="text-gray-500">|</span>
                            <span className="font-bold">{match.invoiceAmount.toLocaleString()}원</span>
                            {match.invoiceNtsNum && (
                              <span className="text-xs text-gray-500">#{match.invoiceNtsNum.slice(-8)}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          match.confidence === 'high' ? 'bg-green-200 text-green-800' :
                          match.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-orange-200 text-orange-800'
                        }`}>
                          {match.matchType === 'charge_request_link' ? '충전 연동' : `유사도 ${match.similarity}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {autoMatchResults.results.length > 0 && (
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button onClick={handleAutoMatchApply} disabled={autoMatching} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    {autoMatching ? '처리 중...' : `${autoMatchResults.matched}건 자동 매칭 적용`}
                  </Button>
                  <Button variant="outline" onClick={() => setAutoMatchResults(null)} disabled={autoMatching}>취소</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
