import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search, ChevronLeft, ChevronRight, Loader2,
  ExternalLink, Trash2, Mail, X, Plus, Link, Send
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

const PAGE_SIZE = 20

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
  const [platformFilter, setPlatformFilter] = useState('all')
  const [registeredFilter, setRegisteredFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [detailCreator, setDetailCreator] = useState(null)
  const [sending, setSending] = useState(false)
  // 수동 등록
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ platform_url: '', platform: '', username: '', full_name: '', email: '', followers: '', bio: '' })
  const [addLoading, setAddLoading] = useState(false)

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabaseBiz.from('oc_creators').select('*', { count: 'exact' }).eq('region', region)

      if (platformFilter !== 'all') query = query.eq('platform', platformFilter)
      if (registeredFilter === 'registered') query = query.eq('is_registered', true)
      if (registeredFilter === 'unregistered') query = query.eq('is_registered', false)
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`)

      query = query.order(sortBy, { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, count, error } = await query
      if (error) throw error
      setCreators(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Fetch creators error:', err)
    } finally {
      setLoading(false)
    }
  }, [region, platformFilter, registeredFilter, search, sortBy, page])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  useEffect(() => {
    setPage(0)
  }, [region, platformFilter, registeredFilter, search])

  useEffect(() => { fetchCreators() }, [fetchCreators])

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabaseBiz.from('oc_creators').delete().eq('id', id)
    fetchCreators()
    setDetailCreator(null)
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
        status: 'approved'
      })

      if (error) throw error

      alert('크리에이터가 등록되었습니다.')
      setShowAddModal(false)
      setAddForm({ platform_url: '', platform: '', username: '', full_name: '', email: '', followers: '', bio: '' })
      fetchCreators()
    } catch (err) {
      alert('등록 실패: ' + err.message)
    } finally {
      setAddLoading(false)
    }
  }

  // 크넥 소개 이메일 발송
  const handleSendIntroEmail = async (email, name) => {
    if (!email) { alert('이메일 주소가 없습니다.'); return }
    if (!confirm(`${email}로 크넥 소개 이메일을 보내시겠습니까?`)) return

    setSending(true)
    try {
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: '크넥(CNEC) - 크리에이터 마케팅 플랫폼을 소개합니다',
          html: buildIntroEmailHtml(name || '크리에이터')
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('크넥 소개 이메일이 발송되었습니다!')
        if (detailCreator?.id) {
          await supabaseBiz.from('oc_creators').update({ contact_status: 'email_1' }).eq('id', detailCreator.id)
        }
      } else {
        alert('발송 실패: ' + (data.error || 'Unknown'))
      }
    } catch (err) {
      alert('발송 실패: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

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
            <button onClick={() => setRegisteredFilter('all')} className={`px-3 py-1 rounded-md text-xs font-medium ${registeredFilter === 'all' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>전체</button>
            <button onClick={() => setRegisteredFilter('registered')} className={`px-3 py-1 rounded-md text-xs font-medium ${registeredFilter === 'registered' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500'}`}>가입</button>
            <button onClick={() => setRegisteredFilter('unregistered')} className={`px-3 py-1 rounded-md text-xs font-medium ${registeredFilter === 'unregistered' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>미가입</button>
          </div>
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
            <option value="followers">팔로워순</option>
          </select>
        </div>

        {/* 테이블 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-left">플랫폼</th>
                    <th className="p-3 text-left">유저네임</th>
                    <th className="p-3 text-left">이름</th>
                    <th className="p-3 text-right">팔로워</th>
                    <th className="p-3 text-center">가입 여부</th>
                    <th className="p-3 text-center">이메일</th>
                    <th className="p-3 text-left">등록일</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
                  ) : creators.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">크리에이터가 없습니다</td></tr>
                  ) : creators.map(c => (
                    <tr
                      key={c.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${c.is_registered ? 'bg-green-50/50' : ''}`}
                      onClick={() => setDetailCreator(c)}
                    >
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
                        {c.is_registered ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">가입</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">미가입</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center">{c.email ? <Mail className="w-3.5 h-3.5 text-blue-400 mx-auto" /> : <span className="text-gray-300">-</span>}</td>
                      <td className="p-3 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('ko-KR')}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600" title="삭제">
                          <Trash2 className="w-3 h-3" />
                        </Button>
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
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold">@{detailCreator.username}</h2>
                    {detailCreator.is_registered && <Badge className="bg-green-100 text-green-700">CNEC 가입</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDetailCreator(null)}><X className="w-4 h-4" /></Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                  <div><span className="text-gray-400">플랫폼</span><p className="font-medium">{detailCreator.platform}</p></div>
                  <div><span className="text-gray-400">리전</span><p className="font-medium">{detailCreator.region}</p></div>
                  <div><span className="text-gray-400">팔로워</span><p className="font-medium">{formatFollowers(detailCreator.followers)}</p></div>
                  <div><span className="text-gray-400">이름</span><p className="font-medium">{detailCreator.full_name || '-'}</p></div>
                  <div className="col-span-2"><span className="text-gray-400">이메일</span><p>{detailCreator.email || '-'}</p></div>
                  <div className="col-span-2"><span className="text-gray-400">바이오</span><p>{detailCreator.bio || '-'}</p></div>
                </div>

                <div className="flex gap-2">
                  {detailCreator.email && !detailCreator.is_registered && (
                    <Button size="sm" onClick={() => handleSendIntroEmail(detailCreator.email, detailCreator.full_name)} disabled={sending} className="bg-violet-600 hover:bg-violet-700">
                      {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                      크넥 소개 이메일 발송
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(detailCreator.id)}>삭제</Button>
                  <a href={detailCreator.platform_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" /> 프로필</Button>
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

                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                    <p>현재 리전: <strong>{region === 'korea' ? '한국' : region === 'japan' ? '일본' : '미국'}</strong></p>
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

function buildIntroEmailHtml(name) {
  return `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">CNEC</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">크리에이터 마케팅 플랫폼</p>
      </div>
      <p style="font-size: 16px; color: #111827; line-height: 1.8;">
        안녕하세요 <strong>${name}</strong>님,<br><br>
        크넥(CNEC)은 크리에이터와 브랜드를 연결하는 마케팅 플랫폼입니다.
      </p>
      <div style="background: #f5f3ff; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #7c3aed; margin-top: 0;">크넥과 함께하면</h3>
        <ul style="color: #374151; line-height: 2; padding-left: 20px;">
          <li>다양한 브랜드의 캠페인에 참여할 수 있습니다</li>
          <li>공정한 보상 시스템으로 수익을 창출할 수 있습니다</li>
          <li>전문적인 크리에이터 프로필을 만들 수 있습니다</li>
          <li>간편한 계약 및 정산 시스템을 이용할 수 있습니다</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://cnecbiz.com/signup"
          style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #9333ea); color: white; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
          크넥 가입하기
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        궁금한 점이 있으시면 언제든 문의해 주세요.<br>감사합니다.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        주식회사 하우파파 (HOWPAPA Inc.) | cnecbiz.com
      </p>
    </div>
  `
}
