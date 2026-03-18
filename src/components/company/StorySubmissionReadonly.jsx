import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Clock, Film, Image, Download, AlertTriangle } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function StorySubmissionReadonly({ campaignId }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!campaignId) return
    const fetch = async () => {
      try {
        const { data, error } = await supabaseBiz
          .from('story_submissions')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setSubmissions(data || [])
      } catch (err) {
        console.error('Failed to fetch submissions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [campaignId])

  const statusBadge = (status) => {
    const map = {
      pending: { label: '검수대기', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: '승인', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: '반려', className: 'bg-red-100 text-red-800', icon: XCircle },
      revision_requested: { label: '수정요청', className: 'bg-orange-100 text-orange-800', icon: AlertTriangle }
    }
    const s = map[status] || map.pending
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
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100/50">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
            <Film className="w-4 h-4 text-white" />
          </div>
          스토리 제출 현황 ({submissions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {submissions.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">아직 제출된 스토리가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => (
              <div key={sub.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-900">
                    크리에이터: {sub.creator_id?.slice(0, 8)}...
                  </span>
                  {statusBadge(sub.status)}
                  {sub.revision_count > 0 && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      수정 {sub.revision_count}회
                    </span>
                  )}
                </div>

                <div className="flex gap-3 mb-2">
                  {sub.screenshot_url && (
                    <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg">
                      <Image className="w-4 h-4" />
                      스크린샷
                    </a>
                  )}
                  {sub.clean_video_url && (
                    <a href={sub.clean_video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg">
                      <Download className="w-4 h-4" />
                      클린본
                    </a>
                  )}
                </div>

                <div className="flex gap-4 text-sm">
                  <span className={sub.has_link ? 'text-green-600' : 'text-red-500'}>
                    {sub.has_link ? '✓' : '✗'} 링크 포함
                  </span>
                  <span className={sub.has_tag ? 'text-green-600' : 'text-red-500'}>
                    {sub.has_tag ? '✓' : '✗'} 태그 포함
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  제출: {new Date(sub.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
