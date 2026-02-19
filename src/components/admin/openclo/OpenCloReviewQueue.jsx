import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle, XCircle, Eye, Loader2, ExternalLink, RotateCcw
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

export default function OpenCloReviewQueue() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState([])
  const [actionLoading, setActionLoading] = useState(null)

  const fetchReviewQueue = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabaseBiz
        .from('oc_creators')
        .select('*')
        .eq('region', region)
        .eq('status', 'review')
        .order('suspicion_score', { ascending: true })
        .limit(50)
      setCreators(data || [])
    } catch (err) {
      console.error('Fetch review queue error:', err)
    } finally {
      setLoading(false)
    }
  }, [region])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  useEffect(() => { fetchReviewQueue() }, [fetchReviewQueue])

  const handleAction = async (id, newStatus) => {
    setActionLoading(id)
    try {
      await supabaseBiz.from('oc_creators').update({ status: newStatus }).eq('id', id)
      fetchReviewQueue()
    } catch (err) {
      alert('실패: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReAnalyze = async (id) => {
    setActionLoading(id)
    try {
      await fetch('/.netlify/functions/openclo-ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: id })
      })
      fetchReviewQueue()
    } catch (err) {
      alert('AI 분석 실패: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkApprove = async () => {
    if (!confirm(`검토 대기열 ${creators.length}명을 모두 승인하시겠습니까?`)) return
    setActionLoading('bulk')
    try {
      const ids = creators.map(c => c.id)
      await supabaseBiz.from('oc_creators').update({ status: 'approved' }).in('id', ids)
      fetchReviewQueue()
    } catch (err) {
      alert('일괄 승인 실패: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">검토 대기열</h2>
            <p className="text-sm text-gray-500">AI 분석 결과 수동 검토가 필요한 크리에이터 ({creators.length}명)</p>
          </div>
          {creators.length > 0 && (
            <Button onClick={handleBulkApprove} disabled={actionLoading === 'bulk'} size="sm">
              {actionLoading === 'bulk' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
              전체 승인
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
        ) : creators.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-gray-400">검토 대기 중인 크리에이터가 없습니다</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {creators.map(c => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">
                        {c.platform === 'instagram' ? 'IG' : c.platform === 'youtube' ? 'YT' : 'TT'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a href={c.platform_url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                            @{c.username} <ExternalLink className="w-3 h-3" />
                          </a>
                          {c.is_registered && <Badge className="bg-green-100 text-green-700 text-xs">CNEC 가입자</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{c.full_name}</span>
                          <span>{formatFollowers(c.followers)} 팔로워</span>
                          <span>{(c.category || []).join(', ')}</span>
                        </div>
                        {c.ai_summary && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.ai_summary}</p>}
                      </div>
                      <div className="text-center px-4">
                        <span className={`text-2xl font-bold ${
                          c.suspicion_score <= 30 ? 'text-green-600'
                          : c.suspicion_score <= 70 ? 'text-yellow-600'
                          : 'text-red-600'
                        }`}>
                          {c.suspicion_score}
                        </span>
                        <p className="text-xs text-gray-400">의심 점수</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => handleReAnalyze(c.id)}
                        disabled={actionLoading === c.id}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> 재분석
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(c.id, 'approved')}
                        disabled={actionLoading === c.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        승인
                      </Button>
                      <Button
                        size="sm" variant="destructive"
                        onClick={() => handleAction(c.id, 'rejected')}
                        disabled={actionLoading === c.id}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> 제외
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
