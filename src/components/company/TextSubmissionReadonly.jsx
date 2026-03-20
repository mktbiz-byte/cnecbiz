import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, AlertTriangle } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function TextSubmissionReadonly({ campaignId }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabaseBiz
          .from('text_submissions')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })
        if (error) throw error
        setSubmissions(data || [])
      } catch (err) {
        console.error('Failed to fetch text submissions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [campaignId])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full"><Clock className="w-3 h-3" />검수대기</span>
      case 'approved': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"><CheckCircle className="w-3 h-3" />승인</span>
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"><XCircle className="w-3 h-3" />반려</span>
      case 'revision_requested': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"><AlertTriangle className="w-3 h-3" />수정요청</span>
      default: return null
    }
  }

  if (loading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>
  }

  if (submissions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">텍스트 포스트 제출 현황 ({submissions.length}건)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{sub.platform === 'threads' ? 'Threads' : 'X'}</span>
                {sub.post_url && (
                  <a href={sub.post_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />포스트
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(sub.status)}
                <span className="text-xs text-gray-400">{new Date(sub.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
