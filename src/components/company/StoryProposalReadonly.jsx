import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function StoryProposalReadonly({ campaignId }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!campaignId) return
    const fetch = async () => {
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
    fetch()
  }, [campaignId])

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
      <Card className="border-0 shadow-lg rounded-2xl">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100/50">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-white" />
          </div>
          기획안 현황 ({proposals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {proposals.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">아직 기획안이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {proposals.map(proposal => (
              <div key={proposal.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    크리에이터: {proposal.creator_id?.slice(0, 8)}...
                  </span>
                  {statusBadge(proposal.status)}
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>영상 컨셉:</strong> {proposal.video_concept}</p>
                  {proposal.tone_mood && <p><strong>톤/분위기:</strong> {proposal.tone_mood}</p>}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
