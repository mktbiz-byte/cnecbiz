import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users, Search, ChevronLeft, ChevronRight, Loader2,
  ExternalLink, RotateCcw, Trash2, Mail, CheckCircle2, X, Plus, Link
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'approved', label: '승인' },
  { value: 'review', label: '검토' },
  { value: 'rejected', label: '제외' },
  { value: 'pending', label: '미분석' }
]

const CONTACT_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'none', label: '미발송' },
  { value: 'email_1', label: '1차발송' },
  { value: 'email_2', label: '2차발송' },
  { value: 'email_3', label: '3차발송' },
  { value: 'replied', label: '회신' },
  { value: 'registered', label: '가입완료' },
  { value: 'collab', label: '협업중' }
]

const PLATFORM_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' }
]

export default function OpenCloCreatorList() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [contactFilter, setContactFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [registeredFilter, setRegisteredFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [detailCreator, setDetailCreator] = useState(null)
  const [analysisLogs, setAnalysisLogs] = useState([])
  const [contactLogs, setContactLogs] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  // 수동 등록
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ platform_url: '', platform: '', username: '', full_name: '', email: '', followers: '', bio: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [urlParseLoading, setUrlParseLoading] = useState(false)

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabaseBiz.from('oc_creators').select('*', { count: 'exact' }).eq('region', region)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (contactFilter !== 'all') query = query.eq('contact_status', contactFilter)
      if (platformFilter !== 'all') query = query.eq('platform', platformFilter)
      if (registeredFilter === 'registered') query = query.eq('is_registered', true)
      if (registeredFilter === 'unregistered') query = query.eq('is_registered', false)
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)

      query = query.order(sortBy, { ascending: sortAsc }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, count, error } = await query
      if (error) throw error
      setCreators(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Fetch creators error:', err)
    } finally {
      setLoading(false)
    }
  }, [region, statusFilter, contactFilter, platformFilter, registeredFilter, search, sortBy, sortAsc, page])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  useEffect(() => {
    setPage(0)
    setSelected(new Set())
  }, [region, statusFilter, contactFilter, platformFilter, registeredFilter, search])

  useEffect(() => { fetchCreators() }, [fetchCreators])

  const openDetail = async (creator) => {
    setDetailCreator(creator)
    const { data: aLogs } = await supabaseBiz
      .from('oc_ai_analysis_logs')
      .select('*')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
    setAnalysisLogs(aLogs || [])

    const { data: cLogs } = await supabaseBiz
      .from('oc_contact_logs')
      .select('*')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
    setContactLogs(cLogs || [])
  }

  const handleBulkAction = async (action) => {
    if (selected.size === 0) return
    setActionLoading(true)
    try {
      const ids = [...selected]
      if (action === 'approve') {
        await supabaseBiz.from('oc_creators').update({ status: 'approved' }).in('id', ids)
      } else if (action === 'reject') {
        await supabaseBiz.from('oc_creators').update({ status: 'rejected' }).in('id', ids)
      } else if (action === 'analyze') {
        await fetch('/.netlify/functions/openclo-ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creator_ids: ids })
        })
      }
      setSelected(new Set())
      fetchCreators()
    } catch (err) {
      alert('작업 실패: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabaseBiz.from('oc_creators').delete().eq('id', id)
    fetchCreators()
    setDetailCreator(null)
  }

  const handleReAnalyze = async (id) => {
    setActionLoading(true)
    try {
      await fetch('/.netlify/functions/openclo-ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: id })
      })
      fetchCreators()
      if (detailCreator?.id === id) {
        const { data } = await supabaseBiz.from('oc_creators').select('*').eq('id', id).single()
        setDetailCreator(data)
        const { data: aLogs } = await supabaseBiz.from('oc_ai_analysis_logs').select('*').eq('creator_id', id).order('created_at', { ascending: false })
        setAnalysisLogs(aLogs || [])
      }
    } catch (err) {
      alert('AI 분석 실패: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // URL 입력 시 플랫폼/유저네임 자동 파싱
  const parseUrl = (url) => {
    const trimmed = url.trim()
    let platform = ''
    let username = ''

    if (trimmed.includes('instagram.com')) {
      platform = 'instagram'
      const match = trimmed.match(/instagram\.com\/([^/?#]+)/)
      if (match) username = match[1].replace('@', '')
    } else if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      platform = 'youtube'
      const match = trimmed.match(/youtube\.com\/(?:@|channel\/|c\/)?([^/?#]+)/)
      if (match) username = match[1].replace('@', '')
    } else if (trimmed.includes('tiktok.com')) {
      platform = 'tiktok'
      const match = trimmed.match(/tiktok\.com\/@?([^/?#]+)/)
      if (match) username = match[1].replace('@', '')
    }

    setAddForm(prev => ({
      ...prev,
      platform_url: trimmed,
      platform: platform || prev.platform,
      username: username || prev.username
    }))
  }

  // 수동 등록 저장
  const handleAddCreator = async () => {
    if (!addForm.platform || !addForm.username) {
      alert('플랫폼과 유저네임은 필수입니다')
      return
    }

    setAddLoading(true)
    try {
      // 중복 체크
      const { data: existing } = await supabaseBiz
        .from('oc_creators')
        .select('id')
        .eq('platform', addForm.platform)
        .eq('username', addForm.username)
        .eq('region', region)
        .maybeSingle()

      if (existing) {
        alert('이미 등록된 크리에이터입니다')
        setAddLoading(false)
        return
      }

      // 플랫폼 URL 자동 생성 (없으면)
      let platformUrl = addForm.platform_url
      if (!platformUrl) {
        if (addForm.platform === 'instagram') platformUrl = `https://instagram.com/${addForm.username}`
        else if (addForm.platform === 'youtube') platformUrl = `https://youtube.com/@${addForm.username}`
        else if (addForm.platform === 'tiktok') platformUrl = `https://tiktok.com/@${addForm.username}`
      }

      const { error } = await supabaseBiz.from('oc_creators').insert({
        region,
        platform: addForm.platform,
        platform_url: platformUrl,
        username: addForm.username,
        full_name: addForm.full_name || null,
        email: addForm.email || null,
        followers: parseInt(addForm.followers) || 0,
        bio: addForm.bio || null,
        discovered_by: 'manual',
        status: 'pending'
      })

      if (error) throw error

      alert('크리에이터가 등록되었습니다. AI 분석을 실행하시겠습니까?')
      setShowAddModal(false)
      setAddForm({ platform_url: '', platform: '', username: '', full_name: '', email: '', followers: '', bio: '' })
      fetchCreators()
    } catch (err) {
      alert('등록 실패: ' + err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const toggleAll = () => {
    if (selected.size === creators.length) setSelected(new Set())
    else setSelected(new Set(creators.map(c => c.id)))
  }

  const toggleOne = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        {/* 상단 액션 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">크리에이터 목록</h2>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> 크리에이터 수동 등록
          </Button>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {STATUS_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setStatusFilter(o.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === o.value ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setRegisteredFilter('all')} className={`px-3 py-1 rounded-md text-xs font-medium ${registeredFilter === 'all' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>전체</button>
            <button onClick={() => setRegisteredFilter('registered')} className={`px-3 py-1 rounded-md text-xs font-medium ${registeredFilter === 'registered' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500'}`}>가입</button>
            <button onClick={() => setRegisteredFilter('unregistered')} className={`px-3 py-1 rounded-md text-xs font-medium ${registeredFilter === 'unregistered' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>미가입</button>
          </div>
          <select value={contactFilter} onChange={e => setContactFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1">
            {CONTACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1">
            {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-7 h-7 text-xs w-40"
            />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border rounded-lg px-2 py-1">
            <option value="created_at">최신순</option>
            <option value="suspicion_score">점수순</option>
            <option value="followers">팔로워순</option>
          </select>
        </div>

        {/* 일괄 액션 */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-violet-50 rounded-lg">
            <span className="text-sm text-violet-700 font-medium">{selected.size}개 선택</span>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')} disabled={actionLoading}>일괄 승인</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')} disabled={actionLoading}>일괄 제외</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('analyze')} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
              AI 재분석
            </Button>
          </div>
        )}

        {/* 테이블 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 w-8"><input type="checkbox" checked={selected.size === creators.length && creators.length > 0} onChange={toggleAll} /></th>
                    <th className="p-3 text-left">플랫폼</th>
                    <th className="p-3 text-left">유저네임</th>
                    <th className="p-3 text-left">이름</th>
                    <th className="p-3 text-right">팔로워</th>
                    <th className="p-3 text-center">점수</th>
                    <th className="p-3 text-center">상태</th>
                    <th className="p-3 text-center">가입</th>
                    <th className="p-3 text-center">컨택</th>
                    <th className="p-3 text-center">이메일</th>
                    <th className="p-3 text-left">발견일</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={12} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
                  ) : creators.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-10 text-gray-400">크리에이터가 없습니다</td></tr>
                  ) : creators.map(c => (
                    <tr
                      key={c.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${c.is_registered ? 'bg-green-50/50' : ''}`}
                      onClick={() => openDetail(c)}
                    >
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} />
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {c.platform === 'instagram' ? 'IG' : c.platform === 'youtube' ? 'YT' : 'TT'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <a href={c.platform_url} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-blue-600 hover:underline flex items-center gap-1">
                          @{c.username} <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="p-3 text-gray-600">{c.full_name || '-'}</td>
                      <td className="p-3 text-right font-medium">{formatFollowers(c.followers)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          c.suspicion_score <= 30 ? 'bg-green-100 text-green-700'
                          : c.suspicion_score <= 70 ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          {c.suspicion_score}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={c.status === 'approved' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'}
                          className="text-xs">
                          {c.status === 'approved' ? '승인' : c.status === 'rejected' ? '제외' : c.status === 'review' ? '검토' : '대기'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {c.is_registered ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">CNEC</Badge>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-xs text-gray-500">{c.contact_status === 'none' ? '-' : c.contact_status}</td>
                      <td className="p-3 text-center">{c.email ? <Mail className="w-3.5 h-3.5 text-blue-400 mx-auto" /> : <span className="text-gray-300">-</span>}</td>
                      <td className="p-3 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleReAnalyze(c.id)} title="AI 재분석">
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600" title="삭제">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">총 {totalCount}명</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages || 1}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 상세 모달 */}
        {detailCreator && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailCreator(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold">@{detailCreator.username}</h2>
                    {detailCreator.is_registered && <Badge className="bg-green-100 text-green-700">CNEC 가입자</Badge>}
                    {detailCreator.discovered_by === 'manual' && <Badge variant="outline" className="text-xs">수동 등록</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDetailCreator(null)}><X className="w-4 h-4" /></Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                  <div><span className="text-gray-400">플랫폼</span><p className="font-medium">{detailCreator.platform}</p></div>
                  <div><span className="text-gray-400">리전</span><p className="font-medium">{detailCreator.region}</p></div>
                  <div><span className="text-gray-400">팔로워</span><p className="font-medium">{formatFollowers(detailCreator.followers)}</p></div>
                  <div><span className="text-gray-400">팔로잉</span><p className="font-medium">{formatFollowers(detailCreator.following)}</p></div>
                  <div><span className="text-gray-400">게시물</span><p className="font-medium">{detailCreator.post_count}</p></div>
                  <div><span className="text-gray-400">의심 점수</span><p className="font-medium">{detailCreator.suspicion_score}</p></div>
                  <div className="col-span-2"><span className="text-gray-400">바이오</span><p>{detailCreator.bio || '-'}</p></div>
                  <div className="col-span-2"><span className="text-gray-400">이메일</span><p>{detailCreator.email || '-'}</p></div>
                  <div className="col-span-2"><span className="text-gray-400">AI 요약</span><p>{detailCreator.ai_summary || '-'}</p></div>
                  <div className="col-span-2"><span className="text-gray-400">카테고리</span><p>{(detailCreator.category || []).join(', ') || '-'}</p></div>
                </div>

                {/* AI 분석 이력 */}
                {analysisLogs.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">AI 분석 이력</h3>
                    <div className="space-y-2">
                      {analysisLogs.map(log => (
                        <div key={log.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">점수: {log.score}</span>
                            <span className="text-gray-400">{new Date(log.created_at).toLocaleString('ko-KR')}</span>
                          </div>
                          <p className="text-gray-600">{log.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 컨택 이력 */}
                {contactLogs.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">컨택 이력</h3>
                    <div className="space-y-2">
                      {contactLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-32">{new Date(log.created_at).toLocaleString('ko-KR')}</span>
                          <Badge variant="outline">{log.type}</Badge>
                          <Badge variant="outline">{log.result}</Badge>
                          <span className="text-gray-600 truncate">{log.subject || log.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReAnalyze(detailCreator.id)} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    AI 재분석
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(detailCreator.id)}>삭제</Button>
                  <a href={detailCreator.platform_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" /> 프로필 보기</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 수동 등록 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold">크리에이터 수동 등록</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}><X className="w-4 h-4" /></Button>
                </div>

                <div className="space-y-4">
                  {/* URL 입력 → 자동 파싱 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      프로필 URL <span className="text-xs text-gray-400">(붙여넣으면 자동 파싱)</span>
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="https://instagram.com/username 또는 youtube.com/@channel"
                        value={addForm.platform_url}
                        onChange={e => parseUrl(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {addForm.platform && addForm.username && (
                      <p className="text-xs text-green-600 mt-1">
                        {addForm.platform} / @{addForm.username} 자동 감지됨
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">플랫폼 *</label>
                      <select
                        value={addForm.platform}
                        onChange={e => setAddForm(prev => ({ ...prev, platform: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">선택</option>
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">유저네임 *</label>
                      <Input
                        placeholder="@없이 입력"
                        value={addForm.username}
                        onChange={e => setAddForm(prev => ({ ...prev, username: e.target.value.replace('@', '') }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">이름</label>
                      <Input
                        placeholder="크리에이터 이름"
                        value={addForm.full_name}
                        onChange={e => setAddForm(prev => ({ ...prev, full_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">팔로워 수</label>
                      <Input
                        type="number"
                        placeholder="예: 50000"
                        value={addForm.followers}
                        onChange={e => setAddForm(prev => ({ ...prev, followers: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">이메일</label>
                    <Input
                      type="email"
                      placeholder="creator@example.com"
                      value={addForm.email}
                      onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">바이오 / 메모</label>
                    <textarea
                      placeholder="크리에이터 소개나 메모"
                      value={addForm.bio}
                      onChange={e => setAddForm(prev => ({ ...prev, bio: e.target.value }))}
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                    />
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                    <p>현재 리전: <strong>{region === 'korea' ? '한국' : region === 'japan' ? '일본' : '미국'}</strong></p>
                    <p>등록 후 AI 분석을 실행하면 자동으로 의심 점수와 카테고리가 설정됩니다.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>취소</Button>
                  <Button onClick={handleAddCreator} disabled={addLoading || !addForm.platform || !addForm.username}>
                    {addLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    등록
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatFollowers(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
