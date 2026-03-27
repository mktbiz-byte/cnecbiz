import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Download, Search, Database, Mail, CalendarPlus, ShieldAlert, Instagram, Youtube, Twitter } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

const PLATFORMS = [
  { value: 'all', label: '전체', icon: null },
  { value: 'instagram', label: 'IG', icon: Instagram },
  { value: 'youtube', label: 'YT', icon: Youtube },
  { value: 'tiktok', label: 'TT', icon: null, emoji: '♪' },
  { value: 'x', label: 'X', icon: Twitter },
  { value: 'threads', label: 'Threads', icon: null, emoji: '@' },
]

const TIER_COLORS = {
  S: 'bg-yellow-100 text-yellow-800',
  A: 'bg-purple-100 text-purple-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-gray-100 text-gray-600',
  D: 'bg-red-100 text-red-600',
}

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  threads: 'Threads',
}

const formatNumber = (n) => {
  if (n == null) return '-'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
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

export default function OpenCloV104Page() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total: 0, hasEmail: 0, today: 0, fake: 0 })

  // Filters
  const [platform, setPlatform] = useState('all')
  const [tier, setTier] = useState('all')
  const [hasEmail, setHasEmail] = useState('all')
  const [isFake, setIsFake] = useState('clean')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef(null)

  // List
  const [creators, setCreators] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50

  // Distributions
  const [tierDist, setTierDist] = useState({})
  const [platformDist, setPlatformDist] = useState({})

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  // Load stats + distributions on mount
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [statsRes, distRes] = await Promise.all([
          api({ mode: 'stats' }),
          api({ mode: 'distributions' }),
        ])
        setStats(statsRes)
        setTierDist(distRes.tierDist || {})
        setPlatformDist(distRes.platformDist || {})
      } catch (err) {
        console.error('Initial load error:', err)
      }
    }
    loadInitial()
  }, [])

  // Load list when filters change
  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api({
        mode: 'list',
        platform,
        tier,
        hasEmail,
        isFake,
        search: debouncedSearch,
        page,
        limit,
      })
      setCreators(res.data || [])
      setTotal(res.total || 0)
    } catch (err) {
      console.error('List load error:', err)
    } finally {
      setLoading(false)
    }
  }, [platform, tier, hasEmail, isFake, debouncedSearch, page])

  useEffect(() => { loadList() }, [loadList])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [platform, tier, hasEmail, isFake])

  // Export CSV
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api({
        mode: 'export',
        platform,
        tier,
        hasEmail,
        isFake,
        search: debouncedSearch,
      })
      const rows = res.data || []
      if (rows.length === 0) { alert('내보낼 데이터가 없습니다.'); return }

      const headers = ['플랫폼', 'username', '이름', '이메일', '이메일검증', '팔로워', 'Tier', 'bio', '웹사이트', '프로필URL']
      const csvRows = rows.map(r => [
        r.platform,
        r.username,
        r.full_name || r.display_name || '',
        r.email || '',
        r.email_verified ? 'Y' : 'N',
        r.followers || 0,
        r.tier || '',
        (r.bio || '').replace(/[\n\r,]/g, ' ').substring(0, 200),
        r.website || '',
        r.platform_url || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

      const csv = '\uFEFF' + [headers.join(','), ...csvRows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `openclo_creators_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('내보내기 실패: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const getPaginationRange = () => {
    const range = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    if (start > 1) { range.push(1); if (start > 2) range.push('...') }
    for (let i = start; i <= end; i++) range.push(i)
    if (end < totalPages) { if (end < totalPages - 1) range.push('...'); range.push(totalPages) }
    return range
  }

  const PlatformIcon = ({ platform: p, size = 14 }) => {
    const entry = PLATFORMS.find(x => x.value === p)
    if (entry?.icon) { const Icon = entry.icon; return <Icon size={size} /> }
    if (entry?.emoji) return <span style={{ fontSize: size }}>{entry.emoji}</span>
    return <span style={{ fontSize: size }}>{p?.[0]?.toUpperCase()}</span>
  }

  // ── Distribution bar helper ──
  const BarChart = ({ data, labels, colors }) => {
    const max = Math.max(...Object.values(data), 1)
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="w-8 text-right font-medium text-gray-700">{labels?.[key] || key}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors?.[key] || 'bg-[#6C5CE7]'}`}
                style={{ width: `${Math.max((val / max) * 100, 2)}%` }}
              />
            </div>
            <span className="w-16 text-right text-xs text-gray-500">{val.toLocaleString()}</span>
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
          <h1 className="text-xl font-bold text-gray-900">오픈클로 V104 크리에이터 발굴</h1>
          <p className="text-sm text-gray-500 mt-0.5">한국 리전 크리에이터 데이터베이스</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-50 transition-colors"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          엑셀 다운로드
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '전체 DB', value: stats.total, icon: Database, color: 'text-[#6C5CE7]', bg: 'bg-[#F0EDFF]' },
          { label: '이메일 확보', value: stats.hasEmail, icon: Mail, color: 'text-[#6C5CE7]', bg: 'bg-[#F0EDFF]' },
          { label: '오늘 수집', value: stats.today, icon: CalendarPlus, color: 'text-[#6C5CE7]', bg: 'bg-[#F0EDFF]' },
          { label: '가계정', value: stats.fake, icon: ShieldAlert, color: 'text-[#6C5CE7]', bg: 'bg-[#F0EDFF]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 font-['Outfit']">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {PLATFORMS.map(p => (
          <button
            key={p.value}
            onClick={() => setPlatform(p.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              platform === p.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PlatformIcon platform={p.value} size={14} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={tier} onChange={e => setTier(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Tier 전체</option>
          {['S', 'A', 'B', 'C', 'D'].map(t => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        <select value={hasEmail} onChange={e => setHasEmail(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">이메일 전체</option>
          <option value="yes">있음</option>
          <option value="no">없음</option>
          <option value="verified">검증완료</option>
        </select>
        <select value={isFake} onChange={e => setIsFake(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="clean">정상만</option>
          <option value="fake">가계정만</option>
          <option value="all">전체</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="username 또는 이름 검색"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">플랫폼</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">username</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500">팔로워</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">Tier</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">이메일</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">검증</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">bio</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : creators.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-gray-400">검색 결과가 없습니다</td>
                </tr>
              ) : creators.map((c, i) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5 text-gray-400 text-xs">{(page - 1) * limit + i + 1}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-gray-600"><PlatformIcon platform={c.platform} /></span>
                  </td>
                  <td className="px-3 py-2.5">
                    {c.platform_url ? (
                      <a href={c.platform_url} target="_blank" rel="noopener noreferrer" className="text-[#6C5CE7] hover:underline font-medium">
                        {c.username}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-900">{c.username}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 max-w-[120px] truncate">{c.full_name || c.display_name || '-'}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-900 font-['Outfit']">{formatNumber(c.followers)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {c.tier && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${TIER_COLORS[c.tier] || 'bg-gray-100 text-gray-600'}`}>
                        {c.tier}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {c.has_email ? <span className="text-green-600">&#10003;</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {c.email_verified ? <span className="text-green-600">&#10003;</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[200px] truncate">{c.bio ? c.bio.substring(0, 100) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              총 <span className="font-medium text-gray-700">{total.toLocaleString()}</span>건
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                &lt;
              </button>
              {getPaginationRange().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border ${
                      p === page ? 'bg-[#6C5CE7] text-white border-[#6C5CE7]' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Tier 분포</h3>
          <BarChart
            data={tierDist}
            colors={{ S: 'bg-yellow-400', A: 'bg-purple-400', B: 'bg-blue-400', C: 'bg-gray-400', D: 'bg-red-400' }}
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">플랫폼별 수집량</h3>
          <BarChart
            data={platformDist}
            labels={PLATFORM_LABELS}
            colors={{
              instagram: 'bg-pink-400',
              youtube: 'bg-red-500',
              tiktok: 'bg-gray-800',
              x: 'bg-gray-600',
              threads: 'bg-gray-500',
            }}
          />
        </div>
      </div>
    </div>
  )
}
