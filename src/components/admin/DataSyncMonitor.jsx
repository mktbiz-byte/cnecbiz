import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Database, AlertTriangle, CheckCircle, XCircle,
  Download, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Filter, Search
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import * as XLSX from 'xlsx'

const TABLE_OPTIONS = [
  { key: 'campaigns', label: '캠페인', icon: '📋' },
  { key: 'applications', label: '신청', icon: '📝' },
  { key: 'video_submissions', label: '영상 제출', icon: '🎬' },
  { key: 'companies', label: '기업', icon: '🏢' },
  { key: 'contracts', label: '계약서', icon: '📄' },
  { key: 'payments', label: '결제', icon: '💳' }
]

const REGION_LABELS = { korea: '🇰🇷 한국', japan: '🇯🇵 일본', us: '🇺🇸 미국', biz: '💼 BIZ' }
const REGION_COLORS = { korea: '#6C5CE7', japan: '#FF6B6B', us: '#00B894', biz: '#74B9FF' }

const STATUS_CONFIG = {
  synced: { label: '정상', color: '#00B894', bg: 'rgba(0,184,148,0.1)' },
  mismatch: { label: '불일치', color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)' },
  missing: { label: '누락', color: '#FDCB6E', bg: 'rgba(253,203,110,0.15)' }
}

export default function DataSyncMonitor() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedTables, setSelectedTables] = useState(['campaigns', 'applications', 'video_submissions'])
  const [compareMode, setCompareMode] = useState('all_fields')
  const [expandedTable, setExpandedTable] = useState(null)
  const [expandedRecord, setExpandedRecord] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchId, setSearchId] = useState('')

  // 관리자 인증 체크
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz.from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
      if (!admin) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  const runCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/.netlify/functions/check-data-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: selectedTables, compareMode })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setData(result)
      setExpandedTable(null)
      setExpandedRecord(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 엑셀 다운로드 — 나라별 시트
  const exportToExcel = () => {
    if (!data?.results) return
    const wb = XLSX.utils.book_new()

    // 1. 요약 시트
    const summaryRows = []
    for (const [tableName, tableData] of Object.entries(data.results)) {
      summaryRows.push({
        '테이블': tableData.label,
        '전체 레코드': tableData.totalIds,
        '오류 건수': tableData.issueCount,
        ...Object.fromEntries(tableData.regions.map(r => [`${REGION_LABELS[r]} 건수`, tableData.regionMeta[r]?.count || 0])),
        ...Object.fromEntries(tableData.regions.map(r => [`${REGION_LABELS[r]} 상태`, tableData.regionMeta[r]?.exists ? '정상' : (tableData.regionMeta[r]?.error || '테이블 없음')]))
      })
    }
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
    summarySheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 10 }, ...Array(8).fill({ wch: 18 })]
    XLSX.utils.book_append_sheet(wb, summarySheet, '요약')

    // 2. 테이블별 오류 시트
    for (const [tableName, tableData] of Object.entries(data.results)) {
      if (tableData.issues.length === 0) continue

      const rows = []
      for (const issue of tableData.issues) {
        // 기본 정보
        const baseRow = {
          'ID': issue.id,
          '상태': STATUS_CONFIG[issue.status]?.label || issue.status,
          '오류 유형': issue.issues.map(i => i.type === 'missing' ? i.message : '필드 불일치').join(', ')
        }

        // 리전별 존재 여부
        for (const region of tableData.regions) {
          baseRow[`${REGION_LABELS[region]} 존재`] = issue.regions[region] ? 'O' : 'X'
        }

        // 불일치 필드 상세
        const fieldDiffs = issue.issues.filter(i => i.type === 'field_mismatch')
        if (fieldDiffs.length > 0) {
          for (const diff of fieldDiffs) {
            for (const d of diff.diffs) {
              const row = { ...baseRow, '불일치 필드': d.field }
              for (const region of diff.regions) {
                const val = d[region]
                row[`${REGION_LABELS[region]} 값`] = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
              }
              rows.push(row)
            }
          }
        } else {
          rows.push(baseRow)
        }
      }

      if (rows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [{ wch: 38 }, { wch: 10 }, { wch: 30 }, ...Array(10).fill({ wch: 22 })]
        XLSX.utils.book_append_sheet(wb, ws, tableData.label)
      }
    }

    // 3. 나라별 전체 데이터 시트 (오류 레코드의 각 리전 데이터)
    const regionSheets = {}
    for (const [tableName, tableData] of Object.entries(data.results)) {
      for (const issue of tableData.issues) {
        if (!issue.data) continue
        for (const [region, record] of Object.entries(issue.data)) {
          const sheetName = `${REGION_LABELS[region]}_${tableData.label}`
          if (!regionSheets[sheetName]) regionSheets[sheetName] = []
          regionSheets[sheetName].push({
            '테이블': tableData.label,
            '오류상태': STATUS_CONFIG[issue.status]?.label || issue.status,
            ...record
          })
        }
      }
    }

    for (const [sheetName, rows] of Object.entries(regionSheets)) {
      if (rows.length === 0) continue
      // 시트 이름 31자 제한
      const safeName = sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = Array(20).fill({ wch: 20 })
      XLSX.utils.book_append_sheet(wb, ws, safeName)
    }

    const now = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `크넥_데이터싱크_${now}.xlsx`)
  }

  // 필터링된 이슈
  const getFilteredIssues = (issues) => {
    let filtered = issues
    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => i.status === filterStatus)
    }
    if (searchId.trim()) {
      filtered = filtered.filter(i => i.id.toLowerCase().includes(searchId.toLowerCase()))
    }
    return filtered
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'Pretendard' }}>
              통합 관제센터
            </h1>
            <p className="text-sm text-[#636E72] mt-1">4개 Supabase DB 데이터 정합성 비교</p>
          </div>
          <div className="flex gap-2">
            {data && (
              <Button
                onClick={exportToExcel}
                className="bg-[#00B894] hover:bg-[#00A383] text-white rounded-xl"
              >
                <Download className="w-4 h-4 mr-1" />
                엑셀 다운로드
              </Button>
            )}
            <Button
              onClick={runCheck}
              disabled={loading || selectedTables.length === 0}
              className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {loading ? '검사 중...' : '데이터 검사'}
            </Button>
          </div>
        </div>

        {/* 설정 카드 */}
        <Card className="border border-[#DFE6E9] rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="space-y-4">
              {/* 테이블 선택 */}
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E] mb-2">검사 대상 테이블</p>
                <div className="flex flex-wrap gap-2">
                  {TABLE_OPTIONS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setSelectedTables(prev =>
                        prev.includes(t.key) ? prev.filter(x => x !== t.key) : [...prev, t.key]
                      )}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedTables.includes(t.key)
                          ? 'bg-[#6C5CE7] text-white'
                          : 'bg-[#F0EDFF] text-[#6C5CE7]'
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedTables(
                      selectedTables.length === TABLE_OPTIONS.length ? [] : TABLE_OPTIONS.map(t => t.key)
                    )}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-[#636E72] hover:bg-gray-200"
                  >
                    {selectedTables.length === TABLE_OPTIONS.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
              </div>
              {/* 비교 모드 */}
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E] mb-2">비교 방식</p>
                <div className="flex gap-2">
                  {[
                    { key: 'existence', label: '존재 여부만', desc: '빠름' },
                    { key: 'key_fields', label: '주요 필드', desc: '보통' },
                    { key: 'all_fields', label: '전체 필드', desc: '상세' }
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => setCompareMode(m.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        compareMode === m.key
                          ? 'bg-[#6C5CE7] text-white'
                          : 'bg-[#F0EDFF] text-[#6C5CE7]'
                      }`}
                    >
                      {m.label} <span className="opacity-60 text-xs">({m.desc})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 에러 표시 */}
        {error && (
          <div className="p-4 rounded-xl bg-[rgba(255,107,107,0.1)] border border-[#FF6B6B]/30 text-[#FF6B6B] text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}

        {/* 요약 카드 */}
        {data?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '전체 레코드', value: data.summary.total_records, icon: Database, color: '#6C5CE7' },
              { label: '정상', value: data.summary.synced, icon: CheckCircle, color: '#00B894' },
              { label: '필드 불일치', value: data.summary.mismatches, icon: XCircle, color: '#FF6B6B' },
              { label: 'DB 누락', value: data.summary.missing, icon: AlertTriangle, color: '#FDCB6E' }
            ].map((s, i) => (
              <Card key={i} className="border border-[#DFE6E9] rounded-2xl shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center">
                    <s.icon className="w-5 h-5" style={{ color: '#6C5CE7' }} />
                  </div>
                  <div>
                    <p className="text-xs text-[#636E72]">{s.label}</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'Outfit', color: s.color }}>
                      {s.value.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 필터 */}
        {data?.results && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-[#636E72]" />
              <span className="text-sm text-[#636E72]">필터:</span>
            </div>
            {['all', 'mismatch', 'missing'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === s ? 'bg-[#6C5CE7] text-white' : 'bg-gray-100 text-[#636E72]'
                }`}
              >
                {s === 'all' ? '전체' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
            <div className="relative ml-auto">
              <Search className="w-4 h-4 absolute left-2.5 top-2 text-[#B2BEC3]" />
              <input
                type="text"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="ID 검색..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[#DFE6E9] text-sm w-64 focus:outline-none focus:border-[#6C5CE7]"
              />
            </div>
          </div>
        )}

        {/* 테이블별 결과 */}
        {data?.results && Object.entries(data.results).map(([tableName, tableData]) => {
          const isExpanded = expandedTable === tableName
          const filtered = getFilteredIssues(tableData.issues)

          return (
            <Card key={tableName} className="border border-[#DFE6E9] rounded-2xl shadow-sm overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors p-4"
                onClick={() => setExpandedTable(isExpanded ? null : tableName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base font-semibold text-[#1A1A2E]">
                      {TABLE_OPTIONS.find(t => t.key === tableName)?.icon} {tableData.label}
                      <span className="text-sm font-normal text-[#636E72] ml-2">({tableName})</span>
                    </CardTitle>
                    {/* 리전별 레코드 수 */}
                    <div className="flex gap-2">
                      {tableData.regions.map(r => (
                        <span
                          key={r}
                          className="text-xs px-2 py-0.5 rounded-md"
                          style={{
                            background: tableData.regionMeta[r]?.exists ? `${REGION_COLORS[r]}15` : 'rgba(255,107,107,0.1)',
                            color: tableData.regionMeta[r]?.exists ? REGION_COLORS[r] : '#FF6B6B'
                          }}
                        >
                          {REGION_LABELS[r]} {tableData.regionMeta[r]?.exists ? tableData.regionMeta[r].count : '없음'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tableData.issueCount > 0 ? (
                      <span className="text-sm font-bold" style={{ color: '#FF6B6B', fontFamily: 'Outfit' }}>
                        {tableData.issueCount}건 오류
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-[#00B894]">✓ 정상</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#636E72]" /> : <ChevronDown className="w-4 h-4 text-[#636E72]" />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <div className="p-6 text-center text-[#636E72] text-sm">
                      {tableData.issueCount === 0 ? '모든 레코드가 정상입니다' : '필터 조건에 맞는 오류가 없습니다'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F8F9FA] border-y border-[#DFE6E9]">
                            <th className="text-left p-3 font-semibold text-[#636E72] w-10">#</th>
                            <th className="text-left p-3 font-semibold text-[#636E72]">ID</th>
                            <th className="text-left p-3 font-semibold text-[#636E72]">상태</th>
                            {tableData.regions.map(r => (
                              <th key={r} className="text-center p-3 font-semibold text-[#636E72]">{REGION_LABELS[r]}</th>
                            ))}
                            <th className="text-left p-3 font-semibold text-[#636E72]">오류 내용</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.slice(0, 200).map((issue, idx) => {
                            const isRecordExpanded = expandedRecord === `${tableName}_${issue.id}`
                            return (
                              <>
                                <tr
                                  key={issue.id}
                                  className="border-b border-[#DFE6E9] hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => setExpandedRecord(isRecordExpanded ? null : `${tableName}_${issue.id}`)}
                                >
                                  <td className="p-3 text-[#B2BEC3]">{idx + 1}</td>
                                  <td className="p-3 font-mono text-xs text-[#1A1A2E]">{issue.id.slice(0, 8)}...</td>
                                  <td className="p-3">
                                    <span
                                      className="px-2 py-0.5 rounded text-xs font-medium"
                                      style={{
                                        background: STATUS_CONFIG[issue.status]?.bg,
                                        color: STATUS_CONFIG[issue.status]?.color
                                      }}
                                    >
                                      {STATUS_CONFIG[issue.status]?.label}
                                    </span>
                                  </td>
                                  {tableData.regions.map(r => (
                                    <td key={r} className="p-3 text-center">
                                      {issue.regions[r] === true && <span className="text-[#00B894]">●</span>}
                                      {issue.regions[r] === false && <span className="text-[#FF6B6B]">✕</span>}
                                      {issue.regions[r] === undefined && <span className="text-[#B2BEC3]">-</span>}
                                    </td>
                                  ))}
                                  <td className="p-3 text-xs text-[#636E72] max-w-xs truncate">
                                    {issue.issues.map(i => i.type === 'missing' ? i.message : `필드 불일치 ${i.diffs?.length || 0}건`).join(', ')}
                                  </td>
                                </tr>
                                {/* 상세 펼침 */}
                                {isRecordExpanded && (
                                  <tr key={`${issue.id}_detail`}>
                                    <td colSpan={4 + tableData.regions.length} className="p-0">
                                      <div className="bg-[#F8F9FA] p-4 border-b border-[#DFE6E9]">
                                        <p className="text-xs font-semibold text-[#1A1A2E] mb-2">ID: {issue.id}</p>
                                        {issue.issues.map((iss, iIdx) => (
                                          <div key={iIdx} className="mb-3">
                                            {iss.type === 'missing' && (
                                              <p className="text-xs text-[#FDCB6E]">
                                                ⚠ 누락: {iss.missing?.join(', ')}에 없음 (존재: {iss.present?.join(', ')})
                                              </p>
                                            )}
                                            {iss.type === 'field_mismatch' && (
                                              <div className="overflow-x-auto">
                                                <table className="text-xs border border-[#DFE6E9] rounded-lg overflow-hidden w-full">
                                                  <thead>
                                                    <tr className="bg-white">
                                                      <th className="p-2 text-left text-[#636E72] border-b border-[#DFE6E9]">필드</th>
                                                      {iss.regions.map(r => (
                                                        <th key={r} className="p-2 text-left border-b border-[#DFE6E9]" style={{ color: REGION_COLORS[r] }}>
                                                          {REGION_LABELS[r]}
                                                        </th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {iss.diffs?.map((d, dIdx) => (
                                                      <tr key={dIdx} className="border-b border-[#DFE6E9] last:border-0">
                                                        <td className="p-2 font-mono font-medium text-[#1A1A2E]">{d.field}</td>
                                                        {iss.regions.map(r => (
                                                          <td key={r} className="p-2 font-mono text-[#636E72] max-w-[200px] truncate">
                                                            {typeof d[r] === 'object' ? JSON.stringify(d[r]) : String(d[r] ?? 'null')}
                                                          </td>
                                                        ))}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })}
                        </tbody>
                      </table>
                      {filtered.length > 200 && (
                        <div className="p-3 text-center text-xs text-[#636E72] bg-[#F8F9FA] border-t border-[#DFE6E9]">
                          상위 200건만 표시됩니다. 전체 데이터는 엑셀 다운로드를 이용해주세요.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}

        {/* 검사 시간 */}
        {data?.checkedAt && (
          <p className="text-xs text-[#B2BEC3] text-center">
            마지막 검사: {new Date(data.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </p>
        )}

        {/* 초기 안내 */}
        {!data && !loading && !error && (
          <Card className="border border-[#DFE6E9] rounded-2xl shadow-sm">
            <CardContent className="p-12 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-[#B2BEC3]" />
              <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">데이터 정합성 검사</h3>
              <p className="text-sm text-[#636E72] mb-6">
                Korea, Japan, US, BIZ 4개 Supabase DB의 데이터를 비교합니다.<br />
                위에서 테이블과 비교 방식을 선택한 후 "데이터 검사" 버튼을 클릭하세요.
              </p>
              <p className="text-xs text-[#B2BEC3]">
                검사 결과는 엑셀로 다운로드하여 나라별로 확인할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
