import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function StoryProposalReview({ campaignId }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('story_proposals')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProposals(data || [])
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (campaignId) fetchProposals()
  }, [campaignId])

  const handleReview = async (proposalId, action, reason) => {
    setProcessing(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      const response = await fetch('/.netlify/functions/review-story-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          action,
          reject_reason: reason || null,
          reviewed_by: user?.id
        })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setRejectModal(null)
      setRejectReason('')
      await fetchProposals()
    } catch (err) {
      alert(`처리 실패: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const filtered = filter === 'all' ? proposals : proposals.filter(p => p.status === filter)

  const statusBadge = (status) => {
    const map = {
      submitted: { label: '검토중', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: '승인', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: '반려', className: 'bg-red-100 text-red-800', icon: XCircle }
    }
    const s = map[status] || map.submitted
    const Icon = s.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${s.className}`}>
        <Icon className="w-3 h-3" />
        {s.label}
      </span>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-500" />
          기획안 관리 ({proposals.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 필터 */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all', label: '전체' },
            { value: 'submitted', label: '검토중' },
            { value: 'approved', label: '승인' },
            { value: 'rejected', label: '반려' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label} ({f.value === 'all' ? proposals.length : proposals.filter(p => p.status === f.value).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'all' ? '아직 기획안이 없습니다.' : `${filter} 상태의 기획안이 없습니다.`}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(proposal => (
              <div key={proposal.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        크리에이터: {proposal.creator_id?.slice(0, 8)}...
                      </span>
                      {statusBadge(proposal.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>영상 컨셉:</strong> {proposal.video_concept}</p>
                      {proposal.tone_mood && <p><strong>톤/분위기:</strong> {proposal.tone_mood}</p>}
                      {proposal.description && <p><strong>설명:</strong> {proposal.description}</p>}
                      <p><strong>2차 활용 동의:</strong> {proposal.secondary_use_agreed ? '동의함' : '미동의'}</p>
                    </div>
                    {proposal.reject_reason && (
                      <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                        반려 사유: {proposal.reject_reason}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(proposal.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>

                  {proposal.status === 'submitted' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleReview(proposal.id, 'approve')}
                        disabled={processing}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : '승인'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectModal(proposal.id)}
                        disabled={processing}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        반려
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 반려 사유 모달 */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">반려 사유 입력</h3>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="반려 사유를 입력해주세요."
                rows={3}
                className="mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason('') }}>
                  취소
                </Button>
                <Button
                  onClick={() => handleReview(rejectModal, 'reject', rejectReason)}
                  disabled={!rejectReason.trim() || processing}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : '반려하기'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
