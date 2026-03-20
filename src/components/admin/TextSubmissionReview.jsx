import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle, XCircle, Clock, Image, ExternalLink, AlertTriangle } from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'

export default function TextSubmissionReview({ campaignId }) {
  const [submissions, setSubmissions] = useState([])
  const [creatorNames, setCreatorNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [processing, setProcessing] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [selectedId, setSelectedId] = useState(null)

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
        .from('text_submissions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])

      const creatorIds = [...new Set((data || []).map(s => s.creator_id).filter(Boolean))]
      if (creatorIds.length) await fetchCreatorNames(creatorIds)
    } catch (err) {
      console.error('Failed to fetch text submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSubmissions() }, [campaignId])

  const handleReview = async (submissionId, action) => {
    setProcessing(true)
    try {
      const response = await fetch('/.netlify/functions/review-text-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          action,
          admin_note: adminNote || null
        })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setAdminNote('')
      setSelectedId(null)
      await fetchSubmissions()
    } catch (err) {
      console.error('Review failed:', err)
      alert(`검수 처리 실패: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full"><Clock className="w-3 h-3" />검수대기</span>
      case 'approved': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"><CheckCircle className="w-3 h-3" />승인</span>
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"><XCircle className="w-3 h-3" />반려</span>
      case 'revision_requested': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"><AlertTriangle className="w-3 h-3" />수정요청</span>
      default: return <span className="text-xs text-gray-500">{status}</span>
    }
  }

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">텍스트 포스트 검수 ({submissions.length}건)</CardTitle>
        <div className="flex gap-2 mt-2">
          {['all', 'pending', 'approved', 'rejected', 'revision_requested'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs rounded-full transition-all ${
                filter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '전체' : s === 'pending' ? '대기' : s === 'approved' ? '승인' : s === 'rejected' ? '반려' : '수정요청'}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">제출물이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((sub) => (
              <div key={sub.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{creatorNames[sub.creator_id] || sub.creator_id?.slice(0, 8)}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{sub.platform === 'threads' ? 'Threads' : 'X'}</span>
                    {getStatusBadge(sub.status)}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(sub.created_at).toLocaleDateString('ko-KR')}</span>
                </div>

                {/* 포스트 URL */}
                {sub.post_url && (
                  <a href={sub.post_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    포스트 확인하기
                  </a>
                )}

                {/* 포스트 텍스트 */}
                {sub.post_text && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.post_text}</p>
                  </div>
                )}

                {/* 스크린샷 */}
                {sub.screenshot_url && (
                  <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                    <Image className="w-3 h-3" />
                    스크린샷 보기
                  </a>
                )}

                {/* 검수 체크리스트 */}
                <div className="flex gap-4 text-xs">
                  <span className={sub.has_product_image ? 'text-green-600' : 'text-gray-400'}>
                    {sub.has_product_image ? '✓' : '✗'} 제품이미지
                  </span>
                  <span className={sub.has_brand_tag ? 'text-green-600' : 'text-gray-400'}>
                    {sub.has_brand_tag ? '✓' : '✗'} 브랜드태그
                  </span>
                  <span className={sub.has_ad_disclosure ? 'text-green-600' : 'text-gray-400'}>
                    {sub.has_ad_disclosure ? '✓' : '✗'} 광고표시
                  </span>
                  <span className={sub.has_profile_link ? 'text-green-600' : 'text-gray-400'}>
                    {sub.has_profile_link ? '✓' : '✗'} 프로필링크
                  </span>
                </div>

                {/* 관리자 메모 */}
                {sub.admin_note && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <p className="text-xs text-yellow-800">관리자 메모: {sub.admin_note}</p>
                  </div>
                )}

                {/* 액션 버튼 (대기 상태일 때만) */}
                {sub.status === 'pending' && (
                  <div className="space-y-2 pt-2 border-t">
                    {selectedId === sub.id ? (
                      <>
                        <Textarea
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="관리자 메모 (선택)"
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReview(sub.id, 'approve')} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
                            {processing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}승인 (20,000P)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReview(sub.id, 'revision_requested')} disabled={processing} className="text-orange-600 border-orange-300">
                            수정요청
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReview(sub.id, 'reject')} disabled={processing} className="text-red-600 border-red-300">
                            반려
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedId(null); setAdminNote('') }}>
                            취소
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(sub.id)}>
                        검수하기
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
