import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Database, AlertTriangle, CheckCircle, XCircle, Shield,
  Download, RefreshCw, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import * as XLSX from 'xlsx'

const REGION_LABELS = { korea: '🇰🇷 한국', japan: '🇯🇵 일본', us: '🇺🇸 미국', biz: '💼 BIZ' }
const REGION_COLORS = { korea: '#6C5CE7', japan: '#FF6B6B', us: '#00B894', biz: '#74B9FF' }

const TABLE_LABELS = {
  campaigns: '캠페인', applications: '신청', video_submissions: '영상 제출',
  companies: '기업', contracts: '계약서', payments: '결제'
}

const SEVERITY_CONFIG = {
  high: { label: '높음', color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', icon: XCircle },
  medium: { label: '중간', color: '#FDCB6E', bg: 'rgba(253,203,110,0.15)', icon: AlertTriangle },
  low: { label: '낮음', color: '#74B9FF', bg: 'rgba(116,185,255,0.1)', icon: Shield }
}

export default function DataSyncMonitor() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [expandedCheck, setExpandedCheck] = useState(null)

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
        body: JSON.stringify({})
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setData(result)
      setExpandedCheck(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!data) return
    const wb = XLSX.utils.book_new()

    // 1. DB 현황 시트
    if (data.overview) {
      const rows = []
      for (const [table, regions] of Object.entries(data.overview)) {
        const row = { '테이블': TABLE_LABELS[table] || table }
        for (const [region, info] of Object.entries(regions)) {
          row[REGION_LABELS[region] || region] = info.error ? `오류: ${info.error}` : info.count
        }
        rows.push(row)
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{ wch: 15 }, ...Array(4).fill({ wch: 18 })]
      XLSX.utils.book_append_sheet(wb, ws, 'DB 현황')
    }

    // 2. 검사별 이슈 시트
    if (data.checks) {
      for (const check of data.checks) {
        if (check.issues.length === 0) continue
        const rows = check.issues.map(issue => ({
          'ID': issue.id,
          '참조 타입': issue.refType,
          '참조 ID': issue.refId,
          '상세': issue.detail,
          '리전': issue.region || '-',
          '생성일': issue.created || '-'
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [{ wch: 38 }, { wch: 15 }, { wch: 38 }, { wch: 40 }, { wch: 10 }, { wch: 20 }]
        const sheetName = check.label.length > 31 ? check.label.slice(0, 31) : check.label
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }
    }

    const now = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `크넥_무결성검사_${now}.xlsx`)
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
            <p className="text-sm text-[#636E72] mt-1">4개 Supabase DB 데이터 무결성 검사</p>
          </div>
          <div className="flex gap-2">
            {data && (
              <Button onClick={exportToExcel} className="bg-[#00B894] hover:bg-[#00A383] text-white rounded-xl">
                <Download className="w-4 h-4 mr-1" /> 엑셀 다운로드
              </Button>
            )}
            <Button onClick={runCheck} disabled={loading} className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {loading ? '검사 중...' : '무결성 검사'}
            </Button>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-4 rounded-xl bg-[rgba(255,107,107,0.1)] border border-[#FF6B6B]/30 text-[#FF6B6B] text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
          </div>
        )}

        {/* 리전 연결 상태 */}
        {data?.regionStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(data.regionStatus).map(([region, status]) => (
              <div key={region} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#DFE6E9] bg-white">
                <div className={`w-2.5 h-2.5 rounded-full ${status.available ? 'bg-[#00B894]' : 'bg-[#FF6B6B]'}`} />
                <span className="text-sm font-medium text-[#1A1A2E]">{REGION_LABELS[region]}</span>
                <span className="text-xs text-[#B2BEC3] ml-auto">{status.available ? '연결됨' : '불가'}</span>
              </div>
            ))}
          </div>
        )}

        {/* 요약 카드 */}
        {data?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '검사 항목', value: data.summary.totalChecks, icon: Database, color: '#6C5CE7' },
              { label: '정상', value: data.summary.passed, icon: CheckCircle, color: '#00B894' },
              { label: '이슈 발견', value: data.summary.failed, icon: AlertTriangle, color: data.summary.failed > 0 ? '#FF6B6B' : '#00B894' },
              { label: '총 이슈 수', value: data.summary.totalIssues, icon: XCircle, color: data.summary.totalIssues > 0 ? '#FF6B6B' : '#00B894' }
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

        {/* DB 현황 */}
        {data?.overview && (
          <Card className="border border-[#DFE6E9] rounded-2xl shadow-sm">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-base font-semibold text-[#1A1A2E]">
                <Database className="w-4 h-4 inline mr-2" />DB 현황 — 테이블별 레코드 수
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#DFE6E9]">
                      <th className="text-left p-2 font-semibold text-[#636E72]">테이블</th>
                      {['korea', 'japan', 'us', 'biz'].map(r => (
                        <th key={r} className="text-right p-2 font-semibold" style={{ color: REGION_COLORS[r] }}>{REGION_LABELS[r]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.overview).map(([table, regions]) => (
                      <tr key={table} className="border-b border-[#DFE6E9] last:border-0">
                        <td className="p-2 font-medium text-[#1A1A2E]">{TABLE_LABELS[table] || table}</td>
                        {['korea', 'japan', 'us', 'biz'].map(r => {
                          const info = regions[r]
                          return (
                            <td key={r} className="p-2 text-right font-mono" style={{ fontFamily: 'Outfit' }}>
                              {info?.error ? (
                                <span className="text-xs text-[#FF6B6B]">-</span>
                              ) : (
                                <span className={info?.count > 0 ? 'text-[#1A1A2E]' : 'text-[#B2BEC3]'}>
                                  {(info?.count || 0).toLocaleString()}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 무결성 검사 결과 */}
        {data?.checks && data.checks.map((check) => {
          const sev = SEVERITY_CONFIG[check.severity] || SEVERITY_CONFIG.low
          const SevIcon = sev.icon
          const isExpanded = expandedCheck === check.id
          const hasPassed = check.issueCount === 0

          return (
            <Card key={check.id} className="border border-[#DFE6E9] rounded-2xl shadow-sm overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors p-4"
                onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: hasPassed ? 'rgba(0,184,148,0.1)' : sev.bg }}>
                      {hasPassed ? (
                        <CheckCircle className="w-4 h-4 text-[#00B894]" />
                      ) : (
                        <SevIcon className="w-4 h-4" style={{ color: sev.color }} />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-[#1A1A2E]">{check.label}</CardTitle>
                      <p className="text-xs text-[#636E72] mt-0.5">{check.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#B2BEC3]">{check.totalChecked.toLocaleString()}건 검사</span>
                    {hasPassed ? (
                      <span className="text-sm font-medium text-[#00B894]">정상</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: sev.bg, color: sev.color }}>
                        {check.issueCount}건 이슈
                      </span>
                    )}
                    <span className="text-xs text-[#B2BEC3]">{check.elapsed}ms</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#636E72]" /> : <ChevronDown className="w-4 h-4 text-[#636E72]" />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-0">
                  {check.issues.length === 0 ? (
                    <div className="p-6 text-center text-[#636E72] text-sm">모든 레코드가 정상입니다</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F8F9FA] border-y border-[#DFE6E9]">
                            <th className="text-left p-3 font-semibold text-[#636E72] w-10">#</th>
                            <th className="text-left p-3 font-semibold text-[#636E72]">레코드 ID</th>
                            <th className="text-left p-3 font-semibold text-[#636E72]">누락 참조</th>
                            <th className="text-left p-3 font-semibold text-[#636E72]">상세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {check.issues.slice(0, 100).map((issue, idx) => (
                            <tr key={issue.id} className="border-b border-[#DFE6E9] hover:bg-gray-50">
                              <td className="p-3 text-[#B2BEC3]">{idx + 1}</td>
                              <td className="p-3 font-mono text-xs text-[#1A1A2E]">{issue.id?.slice(0, 12)}...</td>
                              <td className="p-3">
                                <span className="text-xs text-[#636E72]">{issue.refType}: </span>
                                <span className="font-mono text-xs text-[#FF6B6B]">{issue.refId?.slice(0, 12)}...</span>
                              </td>
                              <td className="p-3 text-xs text-[#636E72]">{issue.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {check.issues.length > 100 && (
                        <div className="p-3 text-center text-xs text-[#636E72] bg-[#F8F9FA] border-t border-[#DFE6E9]">
                          상위 100건만 표시됩니다. 전체 데이터는 엑셀 다운로드를 이용해주세요.
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
            {data.elapsed && ` (${(data.elapsed / 1000).toFixed(1)}초)`}
          </p>
        )}

        {/* 초기 안내 */}
        {!data && !loading && !error && (
          <Card className="border border-[#DFE6E9] rounded-2xl shadow-sm">
            <CardContent className="p-12 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-[#B2BEC3]" />
              <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">데이터 무결성 검사</h3>
              <p className="text-sm text-[#636E72] mb-4">
                Korea, Japan, US, BIZ 4개 DB의 데이터 연결 관계를 검사합니다.
              </p>
              <div className="text-xs text-[#B2BEC3] space-y-1">
                <p>결제/계약 → 캠페인 연결 | 캠페인 → 기업 연결</p>
                <p>신청 → 캠페인 연결 | 영상제출 → 캠페인 연결</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
