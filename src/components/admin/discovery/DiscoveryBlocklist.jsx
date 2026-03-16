import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Shield, Plus, Trash2, Loader2
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { DiscoveryNav } from './DiscoveryDashboard'

export default function DiscoveryBlocklist() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState(true)
  const [blocklist, setBlocklist] = useState([])
  const [newIdentifier, setNewIdentifier] = useState('')
  const [newType, setNewType] = useState('username')
  const [newReason, setNewReason] = useState('')
  const [adding, setAdding] = useState(false)

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

  const fetchBlocklist = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/discovery-stats?type=blocklist')
      const data = await res.json()
      if (data.success) setBlocklist(data.data || [])
    } catch (err) {
      console.error('Fetch blocklist error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBlocklist() }, [fetchBlocklist])

  const handleAdd = async () => {
    if (!newIdentifier.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/.netlify/functions/discovery-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_blocklist',
          identifier: newIdentifier.trim(),
          identifier_type: newType,
          reason: newReason || 'manual_block',
        })
      })
      const result = await res.json()
      if (result.success) {
        setNewIdentifier('')
        setNewReason('')
        fetchBlocklist()
      } else {
        alert('추가 실패: ' + result.error)
      }
    } catch (err) {
      alert('추가 실패: ' + err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('이 항목을 블랙리스트에서 제거하시겠습니까?')) return
    try {
      const res = await fetch('/.netlify/functions/discovery-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_blocklist', id })
      })
      const result = await res.json()
      if (result.success) fetchBlocklist()
      else alert('제거 실패: ' + result.error)
    } catch (err) {
      alert('제거 실패: ' + err.message)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <DiscoveryNav currentRegion={region} onRegionChange={setRegion} />

        {/* 수동 추가 */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              블랙리스트 추가
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-500 mb-1 block">이메일 또는 유저네임</label>
                <Input
                  placeholder="user@email.com 또는 @username"
                  value={newIdentifier}
                  onChange={e => setNewIdentifier(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">유형</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="h-9 border rounded-md px-3 text-sm"
                >
                  <option value="username">유저네임</option>
                  <option value="email">이메일</option>
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="text-xs text-gray-500 mb-1 block">사유</label>
                <Input
                  placeholder="차단 사유 (선택)"
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button onClick={handleAdd} disabled={adding || !newIdentifier.trim()} className="h-9">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                추가
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 블랙리스트 테이블 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              차단 목록 ({blocklist.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">식별자</th>
                      <th className="px-4 py-3 font-medium">유형</th>
                      <th className="px-4 py-3 font-medium">사유</th>
                      <th className="px-4 py-3 font-medium">출처</th>
                      <th className="px-4 py-3 font-medium">등록일</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocklist.map(b => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{b.identifier}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{b.identifier_type || '-'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{b.reason || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{b.source || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {b.created_at ? new Date(b.created_at).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleRemove(b.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {blocklist.length === 0 && (
                      <tr><td colSpan="6" className="py-12 text-center text-gray-400">차단 목록이 비어있습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
