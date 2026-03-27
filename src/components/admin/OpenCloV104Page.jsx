import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Download, Search, Database, Mail, CalendarPlus, ShieldAlert, Users, Activity, Instagram, Youtube, Music2, Twitter, AtSign, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

const PLATFORMS = [
  { value: 'all', label: '전체', icon: null },
  { value: 'instagram', label: 'IG', icon: Instagram, color: 'text-pink-500' },
  { value: 'youtube', label: 'YT', icon: Youtube, color: 'text-red-500' },
  { value: 'tiktok', label: 'TT', icon: Music2, color: 'text-gray-800' },
  { value: 'x', label: 'X', icon: Twitter, color: 'text-gray-600' },
  { value: 'threads', label: 'Threads', icon: AtSign, color: 'text-gray-800' },
]

const TIER_COLORS = {
  S: 'bg-yellow-100 text-yellow-800',
  A: 'bg-purple-100 text-purple-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-gray-100 text-gray-600',
  D: 'bg-red-100 text-red-600',
}

const PLATFORM_LABELS = { instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', x: 'X', threads: 'Threads' }

const formatNum = (n) => {
  if (n == null || n === 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

const api = async (body) => {
  const res = await fetch('/.netlify/functions/discovery-v104', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await res.json()
  if (result.error) throw new Error(result.error)
  return result
}

const PlatformIcon = ({ platform: p, size = 14 }) => {
  const entry = PLATFORMS.find(x => x.value === p)
  if (!entry) return <span style={{ fontSize: size }}>{p?.[0]?.toUpperCase() || '?'}</span>
  if (entry.icon) {
    const Icon = entry.icon
    return <Icon size={size} className={entry.color || ''} />
  }
  return <span style={{ fontSize: size }}>{entry.label}</span>
}

export default function OpenCloV104Page() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [stats, setStats] = useState({ total: 0, hasEmail: 0, today: 0, fake: 0, korean: 0, enriched: 0 })
  const [platform, setPlatform] = useState('all')
  const [tier, setTier] = useState('all')
  const [hasEmail, setHasEmail] = useState('all')
  const [isFake, setIsFake] = useState('clean')
  const [isKorean, setIsKorean] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef(null)

  const [creators, setCreators] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50

  const [tierDist, setTierDist] = useState({})
  const [platformDist, setPlatformDist] = useState({})

  const [expandedId, setExpandedId] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  useEffect(() => {
    const load = async () => {
      try {
        const [s, d] = await Promise.all([api({ mode: 'stats' }), api({ mode: 'distributions' })])
        setStats(s)
        setTierDist(d.tierDist || {})
        setPlatformDist(d.platformDist || {})
      } catch (e) { console.error('Init error:', e) }
    }
    load()
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api({ mode: 'list', platform, tier, hasEmail, isFake, isKorean, search: debouncedSearch, page, limit })
      setCreators(res.data || [])
      setTotal(res.total || 0)
    } catch (e) { console.error('List error:', e) }
    finally { setLoading(false) }
  }, [platform, tier, hasEmail, isFake, isKorean, debouncedSearch, page])

  useEffect(() => { loadList() }, [loadList])
  useEffect(() => { setPage(1) }, [platform, tier, hasEmail, isFake, isKorean])

  const handleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    setDetailData(null)
    setDetailLoading(true)
    try {
      const res = await api({ mode: 'detail', creatorId: id })
      setDetailData(res.profile)
    } catch (e) { console.error('Detail error:', e) }
    finally { setDetailLoading(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api({ mode: 'export', platform, tier, hasEmail, isFake, isKorean, search: debouncedSearch })
      const rows = res.data || []
      if (!rows.length) { alert('내보낼 데이터가 없습니다.'); return }

      const headers = ['플랫폼','username','이름','이메일','이메일검증','팔로워','팔로잉','게시물수','릴스수','평균조회수','평균댓글','업로드주기(일)','광고건수','광고비율(%)','참여율(%)','Tier','Tier점수','한국인','한국인점수','바이오','웹사이트','프로필URL','수집일']
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/[\n\r]/g, ' ')}"`
      const csvRows = rows.map(r => [
        r.platform, r.username, r.full_name || r.display_name || '',
        r.email || '', r.email_verified ? 'Y' : 'N',
        r.followers || 0, r.following || 0,
        r.post_count || 0, r.reels_count || 0,
        r.avg_views || 0, r.avg_comments || 0,
        r.upload_frequency_days ?? '',
        r.ad_post_count || 0, r.ad_ratio || 0, r.engagement_rate || 0,
        r.tier || '', r.tier_score || 0,
        r.is_korean ? 'Y' : 'N', r.korean_score || 0,
        (r.bio || '').substring(0, 200),
        r.website || '', r.platform_url || '',
        r.created_at ? r.created_at.split('T')[0] : ''
      ].map(esc).join(','))

      const csv = '\uFEFF' + [headers.map(esc).join(','), ...csvRows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `openclo_creators_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('내보내기 실패: ' + e.message) }
    finally { setExporting(false) }
  }

  const totalPages = Math.ceil(total / limit)
  const pageRange = () => {
    const r = []
    const s = Math.max(1, page - 2), e = Math.min(totalPages, page + 2)
    if (s > 1) { r.push(1); if (s > 2) r.push('...') }
    for (let i = s; i <= e; i++) r.push(i)
    if (e < totalPages) { if (e < totalPages - 1) r.push('...'); r.push(totalPages) }
    return r
  }

  const BarChart = ({ data, labels, colors }) => {
    if (!data || Object.keys(data).length === 0) return <p className="text-sm text-gray-400">데이터 없음</p>
    const max = Math.max(...Object.values(data).map(v => v || 0), 1)
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="w-12 text-right font-medium text-gray-700">{labels?.[key] || key}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div className={`h-full rounded-full ${colors?.[key] || 'bg-[#6C5CE7]'}`} style={{ width: `${Math.max(((val || 0) / max) * 100, 2)}%` }} />
            </div>
            <span className="w-16 text-right text-xs text-gray-500">{(val || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">오픈클로 V104</h1>
          <p className="text-sm text-gray-500 mt-0.5">크리에이터 발굴 데이터베이스</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-50 transition-colors">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          CSV 다운로드
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: '전체 DB', value: stats.total, icon: Database, bg: 'bg-gray-100', color: 'text-gray-700' },
          { label: '이메일 확보', value: stats.hasEmail, icon: Mail, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: '한국인', value: stats.korean, icon: Users, bg: 'bg-green-50', color: 'text-green-600' },
          { label: '프로필 조회', value: stats.enriched, icon: Activity, bg: 'bg-[#F0EDFF]', color: 'text-[#6C5CE7]' },
          { label: '오늘 수집', value: stats.today, icon: CalendarPlus, bg: 'bg-teal-50', color: 'text-teal-600' },
          { label: '가계정', value: stats.fake, icon: ShieldAlert, bg: 'bg-red-50', color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-6 h-6 ${bg} rounded-md flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <span className="text-[11px] text-gray-500">{label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 font-['Outfit']">{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {PLATFORMS.map(p => (
          <button key={p.value} onClick={() => setPlatform(p.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${platform === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <PlatformIcon platform={p.value} size={14} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={tier} onChange={e => setTier(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Tier 전체</option>
          {['S','A','B','C','D'].map(t => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        <select value={hasEmail} onChange={e => setHasEmail(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">이메일 전체</option>
          <option value="yes">있음</option>
          <option value="no">없음</option>
          <option value="verified">검증완료</option>
        </select>
        <select value={isKorean} onChange={e => setIsKorean(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">한국인 전체</option>
          <option value="yes">한국인만</option>
          <option value="no">외국인만</option>
        </select>
        <select value={isFake} onChange={e => setIsFake(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="clean">정상만</option>
          <option value="fake">가계정만</option>
          <option value="all">전체</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="username 또는 이름 검색" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-8"></th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">username</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">이름</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">팔로워</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">게시물</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">릴스</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">평균조회</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">평균댓글</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">주기(일)</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">정보</th>
                <th className="px-3 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : creators.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-gray-400">검색 결과가 없습니다</td></tr>
              ) : creators.map((c) => (
                <>
                  <tr key={c.id} onClick={() => handleExpand(c.id)}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors ${expandedId === c.id ? 'bg-gray-50/80' : ''}`}>
                    {/* Platform icon */}
                    <td className="px-3 py-2"><PlatformIcon platform={c.platform} size={16} /></td>
                    {/* Username with link */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          {c.platform_url ? (
                            <a href={c.platform_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#6C5CE7] hover:underline font-medium text-sm">
                              {c.username}
                            </a>
                          ) : <span className="font-medium text-gray-900 text-sm">{c.username}</span>}
                          {c.has_verified_badge && <span title="인증 배지" className="text-blue-500">&#10003;</span>}
                        </div>
                        {/* 2nd row: badges */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {c.ad_post_count > 0 && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">광고 {c.ad_post_count}건</span>}
                          {c.tier && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TIER_COLORS[c.tier] || 'bg-gray-100 text-gray-600'}`}>{c.tier}</span>}
                          {c.is_korean && <span title="한국인" className="text-xs">🇰🇷</span>}
                          {c.has_email && <span title={c.email || '이메일 있음'} className={`text-xs ${c.email_verified ? 'text-green-600' : 'text-gray-400'}`}>✉</span>}
                          {c.engagement_rate > 0 && <span className="text-[10px] text-gray-400">{Number(c.engagement_rate).toFixed(1)}%</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-sm max-w-[100px] truncate">{c.full_name || c.display_name || '-'}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900 font-['Outfit'] text-sm">{formatNum(c.followers)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 text-sm">{formatNum(c.post_count)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 text-sm">{formatNum(c.reels_count)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 text-sm">{formatNum(c.avg_views)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 text-sm">{formatNum(c.avg_comments)}</td>
                    <td className="px-3 py-2 text-right text-gray-600 text-sm">{c.upload_frequency_days ? Number(c.upload_frequency_days).toFixed(1) : '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] text-gray-400">{c.created_at ? c.created_at.split('T')[0].slice(5) : ''}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {expandedId === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                  </tr>
                  {/* Expanded detail */}
                  {expandedId === c.id && (
                    <tr key={`detail-${c.id}`}>
                      <td colSpan={11} className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                        {detailLoading ? (
                          <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> 상세 정보 로딩 중...</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {/* Left: Profile */}
                            <div className="space-y-2">
                              {detailData?.profile_pic_url && (
                                <img src={detailData.profile_pic_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                              )}
                              <p className="text-gray-700 text-xs whitespace-pre-wrap">{detailData?.biography || c.bio || '-'}</p>
                              {(c.website || detailData?.external_url) && (
                                <a href={c.website || detailData?.external_url} target="_blank" rel="noopener noreferrer" className="text-[#6C5CE7] text-xs flex items-center gap-1 hover:underline">
                                  <ExternalLink size={12} />{c.website || detailData?.external_url}
                                </a>
                              )}
                              {detailData?.business_category && <p className="text-xs text-gray-500">카테고리: {detailData.business_category}</p>}
                              {detailData?.business_email && <p className="text-xs text-gray-500">비즈 이메일: {detailData.business_email}</p>}
                              {detailData?.business_phone && <p className="text-xs text-gray-500">비즈 전화: {detailData.business_phone}</p>}
                            </div>
                            {/* Center: Stats */}
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white rounded-lg p-2 border border-gray-100">
                                  <span className="text-[10px] text-gray-500">Tier 점수</span>
                                  <p className="font-bold text-gray-900">{c.tier_score ?? '-'}<span className="text-xs text-gray-400">/100</span></p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-gray-100">
                                  <span className="text-[10px] text-gray-500">한국인 점수</span>
                                  <p className="font-bold text-gray-900">{c.korean_score ?? '-'}<span className="text-xs text-gray-400">/100</span></p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-gray-100">
                                  <span className="text-[10px] text-gray-500">참여율</span>
                                  <p className="font-bold text-gray-900">{c.engagement_rate ? Number(c.engagement_rate).toFixed(2) : '-'}%</p>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-gray-100">
                                  <span className="text-[10px] text-gray-500">광고 비율</span>
                                  <p className="font-bold text-gray-900">{c.ad_ratio ? Number(c.ad_ratio).toFixed(1) : '-'}%</p>
                                </div>
                              </div>
                              {c.email && <p className="text-xs"><span className="text-gray-500">이메일:</span> {c.email} {c.email_verified ? <span className="text-green-600">(검증됨)</span> : <span className="text-gray-400">(미검증)</span>}</p>}
                              {c.email_source && <p className="text-xs text-gray-400">이메일 출처: {c.email_source}</p>}
                              {c.contact_status && <p className="text-xs text-gray-400">연락 상태: {c.contact_status}</p>}
                            </div>
                            {/* Right: Korean signals + hashtags */}
                            <div className="space-y-2">
                              {detailData?.korean_signals && detailData.korean_signals.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-gray-500 block mb-1">한국인 판별 근거</span>
                                  <div className="flex flex-wrap gap-1">
                                    {detailData.korean_signals.map((s, i) => (
                                      <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {detailData?.top_hashtags && detailData.top_hashtags.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-gray-500 block mb-1">Top 해시태그</span>
                                  <div className="flex flex-wrap gap-1">
                                    {detailData.top_hashtags.slice(0, 15).map((h, i) => (
                                      <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                        #{typeof h === 'string' ? h : h.tag}{typeof h === 'object' && h.count ? ` (${h.count})` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">총 <span className="font-medium text-gray-700">{total.toLocaleString()}</span>건</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">&lt;</button>
              {pageRange().map((p, i) => p === '...'
                ? <span key={`d${i}`} className="px-1 text-gray-400">...</span>
                : <button key={p} onClick={() => setPage(p)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border ${p === page ? 'bg-[#6C5CE7] text-white border-[#6C5CE7]' : 'border-gray-200 hover:bg-gray-50'}`}>{p}</button>
              )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">&gt;</button>
            </div>
          </div>
        )}
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Tier 분포</h3>
          <BarChart data={tierDist} colors={{ S: 'bg-yellow-400', A: 'bg-purple-400', B: 'bg-blue-400', C: 'bg-gray-400', D: 'bg-red-400' }} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">플랫폼별 수집량</h3>
          <BarChart data={platformDist} labels={PLATFORM_LABELS} colors={{ instagram: 'bg-pink-400', youtube: 'bg-red-500', tiktok: 'bg-gray-800', x: 'bg-gray-600', threads: 'bg-gray-500' }} />
        </div>
      </div>
    </div>
  )
}
