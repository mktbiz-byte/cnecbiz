import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check, MessageSquare, Play, ChevronDown, ChevronUp,
  Loader2, Clock, CheckCircle
} from 'lucide-react'

const STATUS_MAP = {
  video_submitted: { label: '리뷰 대기', color: 'bg-blue-500/20 text-blue-400' },
  revision_requested: { label: '수정 요청됨', color: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: '승인됨', color: 'bg-green-500/20 text-green-400' },
  uploaded: { label: '업로드 완료', color: 'bg-[#C084FC]/20 text-[#C084FC]' },
}

export default function PackageVideoReview({
  campaignCreators = [],
  creators = [],
  onApprove,
  onRequestRevision,
  loading = false,
}) {
  const [revisionTarget, setRevisionTarget] = useState(null)
  const [revisionMessage, setRevisionMessage] = useState('')
  const [expandedHistory, setExpandedHistory] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Filter to only show creators with video-related statuses
  const reviewableCreators = campaignCreators.filter(cc =>
    ['video_submitted', 'revision_requested', 'approved', 'uploaded'].includes(cc.status)
  )

  const getCreatorInfo = (packageCreatorId) => {
    return creators.find(c => c.id === packageCreatorId) || {}
  }

  const handleApprove = async (cc) => {
    setActionLoading(cc.id)
    try {
      await onApprove(cc.id, cc.video_url)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmitRevision = async () => {
    if (!revisionMessage.trim()) {
      alert('수정 요청 내용을 입력해주세요.')
      return
    }
    setActionLoading(revisionTarget)
    try {
      await onRequestRevision(revisionTarget, revisionMessage)
      setRevisionTarget(null)
      setRevisionMessage('')
    } finally {
      setActionLoading(null)
    }
  }

  const approvedCount = campaignCreators.filter(cc =>
    ['approved', 'uploaded'].includes(cc.status)
  ).length
  const totalCount = campaignCreators.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">영상 리뷰</h3>
          <p className="text-sm text-[#A0A0B0]">제출된 영상을 확인하고 승인 또는 수정 요청을 해주세요</p>
        </div>
        <Badge className="bg-[#C084FC]/20 text-[#C084FC] text-sm px-3 py-1">
          <CheckCircle className="w-4 h-4 mr-1" />
          {approvedCount}/{totalCount} 승인됨
        </Badge>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviewableCreators.map((cc) => {
          const creator = getCreatorInfo(cc.package_creator_id)
          const videoId = cc.video_url?.match(/(?:v=|\/)([\w-]{11})/)?.[1]
          const statusInfo = STATUS_MAP[cc.status] || { label: cc.status, color: 'bg-white/10 text-white' }
          const isExpanded = expandedHistory === cc.id

          return (
            <div key={cc.id} className="bg-[#1A1A2E] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Video Thumbnail */}
                  <div className="w-48 flex-shrink-0">
                    {videoId ? (
                      <a
                        href={cc.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block aspect-video rounded-xl overflow-hidden group"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt="영상"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </a>
                    ) : (
                      <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center text-[#636E72] text-sm">
                        영상 없음
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-semibold">
                        {creator.display_name || creator.creator_name || '크리에이터'}
                      </span>
                      <Badge className={statusInfo.color + ' text-xs'}>{statusInfo.label}</Badge>
                      {cc.revision_count > 0 && (
                        <Badge className="bg-yellow-500/10 text-yellow-400 text-xs">
                          수정 {cc.revision_count}회
                        </Badge>
                      )}
                    </div>

                    {creator.category && (
                      <span className="text-xs text-[#A0A0B0]">{creator.category}</span>
                    )}

                    {cc.video_submitted_at && (
                      <p className="text-xs text-[#636E72] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        제출: {new Date(cc.video_submitted_at).toLocaleString('ko-KR')}
                      </p>
                    )}

                    {cc.video_url && (
                      <p className="text-xs text-[#636E72] mt-1 truncate">
                        URL: {cc.video_url}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(cc.status === 'video_submitted' || cc.status === 'revision_requested') && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(cc)}
                          disabled={actionLoading === cc.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {actionLoading === cc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <><Check className="w-3.5 h-3.5 mr-1" /> 승인</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRevisionTarget(revisionTarget === cc.id ? null : cc.id)}
                          className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" /> 수정 요청
                        </Button>
                      </>
                    )}
                    {cc.status === 'approved' && (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> 승인 완료
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Revision Request Form */}
                {revisionTarget === cc.id && (
                  <div className="mt-4 bg-white/5 rounded-xl p-4">
                    <textarea
                      value={revisionMessage}
                      onChange={(e) => setRevisionMessage(e.target.value)}
                      placeholder="수정 요청 내용을 상세히 작성해주세요..."
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-[#636E72] rounded-lg p-3 text-sm min-h-[80px] resize-y"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRevisionTarget(null); setRevisionMessage('') }}
                        className="border-white/10 text-[#A0A0B0]"
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitRevision}
                        disabled={actionLoading === cc.id}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        {actionLoading === cc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : null}
                        수정 요청 보내기
                      </Button>
                    </div>
                  </div>
                )}

                {/* Revision History */}
                {cc.revision_requests && cc.revision_requests.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedHistory(isExpanded ? null : cc.id)}
                      className="flex items-center gap-1 text-xs text-[#A0A0B0] hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      수정 요청 이력 ({cc.revision_requests.length})
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {cc.revision_requests.map((rev, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 text-sm">
                            <p className="text-white">{rev.request}</p>
                            <p className="text-xs text-[#636E72] mt-1">
                              {new Date(rev.requested_at).toLocaleString('ko-KR')}
                              {rev.resolved_at && ` → 해결: ${new Date(rev.resolved_at).toLocaleString('ko-KR')}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {reviewableCreators.length === 0 && (
          <div className="text-center py-12 text-[#636E72]">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>아직 제출된 영상이 없습니다.</p>
            <p className="text-sm mt-1">크리에이터가 영상을 제출하면 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
