import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle, XCircle, Clock, Image, Download, Film, AlertTriangle } from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'

export default function StorySubmissionReview({ campaignId }) {
  const [submissions, setSubmissions] = useState([])
  const [creatorNames, setCreatorNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [processing, setProcessing] = useState(false)
  const [revisionModal, setRevisionModal] = useState(null)
  const [adminNote, setAdminNote] = useState('')

  const fetchCreatorNames = async (creatorIds) => {
    if (!creatorIds.length || !supabaseKorea) return
    try {
      const { data } = await supabaseKorea
        .from('user_profiles')
        .select('id, nickname, instagram_id')
        .in('id', creatorIds)
      if (data) {
        const nameMap = {}
        data.forEach(p => { nameMap[p.id] = p.nickname || p.instagram_id || p.id?.slice(0, 8) })
        setCreatorNames(nameMap)
      }
    } catch (err) {
      console.error('Failed to fetch creator names:', err)
    }
  }

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('story_submissions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])

      // 크리에이터 이름 조회
      const creatorIds = [...new Set((data || []).map(s => s.creator_id).filter(Boolean))]
      if (creatorIds.length) await fetchCreatorNames(creatorIds)
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (campaignId) fetchSubmissions()
  }, [campaignId])

  const handleReview = async (submissionId, action) => {
    setProcessing(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      const response = await fetch('/.netlify/functions/review-story-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          action,
          reviewed_by: user?.id
        })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      await fetchSubmissions()
    } catch (err) {
      alert(`처리 실패: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleRevisionRequest = async (submissionId) => {
    if (!confirm('수정 요청 시 기업에 20,000원이 추가 과금됩니다. 진행하시겠습니까?')) return
    setProcessing(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      const response = await fetch('/.netlify/functions/request-story-revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          admin_note: adminNote || null,
          reviewed_by: user?.id
        })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      setRevisionModal(null)
      setAdminNote('')
      await fetchSubmissions()
    } catch (err) {
      alert(`처리 실패: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter)

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
          <Film className="w-5 h-5 text-teal-500" />
          스토리 검수 ({submissions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 필터 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'all', label: '전체' },
            { value: 'pending', label: '검수대기' },
            { value: 'approved', label: '승인' },
            { value: 'rejected', label: '반려' },
            { value: 'revision_requested', label: '수정요청' }
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
              {f.label} ({f.value === 'all' ? submissions.length : submissions.filter(s => s.status === f.value).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'all' ? '아직 제출된 스토리가 없습니다.' : `${filter} 상태의 스토리가 없습니다.`}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(sub => (
              <div key={sub.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-900">
                        크리에이터: {creatorNames[sub.creator_id] || sub.creator_id?.slice(0, 8)}
                      </span>
                      {statusBadge(sub.status)}
                      {sub.revision_count > 0 && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                          수정 {sub.revision_count}회
                        </span>
                      )}
                    </div>

                    {/* 미리보기 */}
                    <div className="flex gap-3 mb-3">
                      {sub.screenshot_url && (
                        <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg">
                          <Image className="w-4 h-4" />
                          스크린샷 보기
                        </a>
                      )}
                      {sub.clean_video_url && (
                        <a href={sub.clean_video_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg">
                          <Download className="w-4 h-4" />
                          클린본 다운로드
                        </a>
                      )}
                    </div>

                    {/* 체크 항목 */}
                    <div className="flex gap-4 text-sm mb-2">
                      <span className={sub.has_link ? 'text-green-600' : 'text-red-500'}>
                        {sub.has_link ? '✓' : '✗'} 링크 포함
                      </span>
                      <span className={sub.has_tag ? 'text-green-600' : 'text-red-500'}>
                        {sub.has_tag ? '✓' : '✗'} 태그 포함
                      </span>
                    </div>

                    {sub.admin_note && (
                      <p className="text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg mt-2">
                        관리자 메모: {sub.admin_note}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      제출: {new Date(sub.created_at).toLocaleString('ko-KR')}
                      {sub.reviewed_at && ` | 검수: ${new Date(sub.reviewed_at).toLocaleString('ko-KR')}`}
                    </p>
                  </div>

                  {sub.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleReview(sub.id, 'approve')}
                        disabled={processing}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : '승인 (30,000P)'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(sub.id, 'reject')}
                        disabled={processing}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        반려
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevisionModal(sub.id)}
                        disabled={processing}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        수정요청 (+2만원)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 수정 요청 모달 */}
        {revisionModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">수정 요청</h3>
              <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg mb-4">
                수정 요청 시 기업에 20,000원이 추가 과금됩니다.
              </p>
              <Textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="수정 요청 내용을 입력해주세요. (선택)"
                rows={3}
                className="mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRevisionModal(null); setAdminNote('') }}>
                  취소
                </Button>
                <Button
                  onClick={() => handleRevisionRequest(revisionModal)}
                  disabled={processing}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : '수정 요청하기'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
