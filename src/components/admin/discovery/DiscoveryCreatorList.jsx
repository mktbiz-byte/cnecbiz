import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users, Search, Loader2, Star, StarOff
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { DiscoveryNav } from './DiscoveryDashboard'

const PAGE_SIZE = 30

export default function DiscoveryCreatorList() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterEmail, setFilterEmail] = useState('all')
  const [filterScore, setFilterScore] = useState('all')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz
        .from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!admin) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabaseBiz.from('oc_creators')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (region) query = query.eq('region', region)
      if (filterPlatform !== 'all') query = query.eq('platform', filterPlatform)
      if (filterEmail === 'yes') query = query.not('email', 'is', null)
      if (filterEmail === 'no') query = query.is('email', null)
      if (filterScore === 'high') query = query.gte('kbeauty_score', 80)
      if (filterScore === 'mid') query = query.gte('kbeauty_score', 50).lt('kbeauty_score', 80)
      if (filterScore === 'low') query = query.lt('kbeauty_score', 50).gt('kbeauty_score', 0)
      if (search) query = query.ilike('username', `%${search}%`)

      const { data, count, error } = await query
      if (error) throw error
      setCreators(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Fetch creators error:', err)
    } finally {
      setLoading(false)
    }
  }, [region, page, filterPlatform, filterEmail, filterScore, search])

  useEffect(() => { fetchCreators() }, [fetchCreators])

  const toggleSpecialTarget = async (creator) => {
    try {
      const res = await fetch('/.netlify/functions/discovery-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_special_target',
          creator_id: creator.id,
          is_special_target: !creator.is_special_target,
        })
      })
      const result = await res.json()
      if (result.success) fetchCreators()
    } catch (err) {
      alert('변경 실패: ' + err.message)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <DiscoveryNav currentRegion={region} onRegionChange={r => { setRegion(r); setPage(0) }} />

        {/* 필터 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="유저네임 검색..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0) }}
                  className="pl-9 h-9"
                />
              </div>
              <select
                value={filterPlatform}
                onChange={e => { setFilterPlatform(e.target.value); setPage(0) }}
                className="h-9 border rounded-md px-3 text-sm"
              >
                <option value="all">전체 플랫폼</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
              <select
                value={filterEmail}
                onChange={e => { setFilterEmail(e.target.value); setPage(0) }}
                className="h-9 border rounded-md px-3 text-sm"
              >
                <option value="all">이메일 전체</option>
                <option value="yes">이메일 있음</option>
                <option value="no">이메일 없음</option>
              </select>
              <select
                value={filterScore}
                onChange={e => { setFilterScore(e.target.value); setPage(0) }}
                className="h-9 border rounded-md px-3 text-sm"
              >
                <option value="all">점수 전체</option>
                <option value="high">80+ (높음)</option>
                <option value="mid">50-79 (중간)</option>
                <option value="low">1-49 (낮음)</option>
              </select>
              <span className="text-xs text-gray-400">총 {totalCount.toLocaleString()}명</span>
            </div>
          </CardContent>
        </Card>

        {/* 크리에이터 테이블 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-500">
                        <th className="px-4 py-3 font-medium">유저네임</th>
                        <th className="px-4 py-3 font-medium">이름</th>
                        <th className="px-4 py-3 font-medium">플랫폼</th>
                        <th className="px-4 py-3 font-medium">팔로워</th>
                        <th className="px-4 py-3 font-medium">이메일</th>
                        <th className="px-4 py-3 font-medium">K-뷰티</th>
                        <th className="px-4 py-3 font-medium">상태</th>
                        <th className="px-4 py-3 font-medium">컨택</th>
                        <th className="px-4 py-3 font-medium">리전</th>
                        <th className="px-4 py-3 font-medium">VIP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creators.map(c => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">@{c.username}</td>
                          <td className="px-4 py-3 text-gray-600">{c.full_name || '-'}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">{c.platform}</Badge>
                          </td>
                          <td className="px-4 py-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {c.followers ? c.followers.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {c.email ? (
                              <span className="text-xs text-gray-600 truncate max-w-[150px] block">{c.email}</span>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            <span className={c.kbeauty_score >= 80 ? 'text-violet-600 font-bold' : c.kbeauty_score >= 50 ? 'text-amber-600' : 'text-gray-400'}>
                              {c.kbeauty_score || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] ${
                              c.status === 'discovered' ? 'bg-blue-100 text-blue-700' :
                              c.status === 'approved' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] ${
                              c.contact_status === 'contacted' ? 'bg-violet-100 text-violet-700' :
                              c.contact_status === 'pending' ? 'bg-gray-100 text-gray-500' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {c.contact_status || 'pending'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{c.region}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleSpecialTarget(c)} className="text-gray-400 hover:text-amber-500 transition-colors">
                              {c.is_special_target ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <StarOff className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {creators.length === 0 && (
                        <tr><td colSpan="10" className="py-12 text-center text-gray-400">크리에이터가 없습니다.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-xs text-gray-500">페이지 {page + 1} / {totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                        이전
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                        다음
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
