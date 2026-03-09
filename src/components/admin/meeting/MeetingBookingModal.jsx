import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Save, Loader2 } from 'lucide-react'

const STATUS_MAP = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '예약확정', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-500' },
  no_show: { label: '노쇼', color: 'bg-red-100 text-red-700' }
}

export default function MeetingBookingModal({ booking, open, onClose, onUpdateMemo }) {
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (booking) {
      setMemo(booking.admin_memo || '')
    }
  }, [booking])

  if (!booking) return null

  const status = STATUS_MAP[booking.status] || STATUS_MAP.pending

  const handleSaveMemo = async () => {
    setSaving(true)
    try {
      await onUpdateMemo(booking.id, memo)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            예약 상세
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Creator Info */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#636E72]">크리에이터</span>
              <span className="text-sm font-semibold text-[#1A1A2E]">{booking.creator_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#636E72]">연락처</span>
              <span className="text-sm text-[#1A1A2E]">{booking.creator_phone}</span>
            </div>
            {booking.creator_email && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#636E72]">이메일</span>
                <span className="text-sm text-[#1A1A2E]">{booking.creator_email}</span>
              </div>
            )}
          </div>

          {/* Social Links */}
          {(booking.youtube_url || booking.instagram_url) && (
            <div className="border-t pt-3 space-y-2">
              {booking.youtube_url && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#636E72]">유튜브</span>
                  <a href={booking.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-[#6C5CE7] hover:underline flex items-center gap-1">
                    채널 보기 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {booking.instagram_url && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#636E72]">인스타그램</span>
                  <a href={booking.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-[#6C5CE7] hover:underline flex items-center gap-1">
                    프로필 보기 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Preferred Slots */}
          <div className="border-t pt-3">
            <p className="text-sm text-[#636E72] mb-2">희망 슬롯 (3개)</p>
            <div className="space-y-1">
              {(booking.preferred_slots || []).map((ps, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    {i + 1}순위
                  </Badge>
                  <span className="text-sm text-[#1A1A2E]">{ps.date} {ps.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Created At */}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#636E72]">신청일시</span>
              <span className="text-sm text-[#1A1A2E]">
                {new Date(booking.created_at).toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-[#636E72]">경로</span>
              <span className="text-sm text-[#1A1A2E]">{booking.source || '-'}</span>
            </div>
          </div>

          {/* Admin Memo */}
          <div className="border-t pt-3">
            <p className="text-sm text-[#636E72] mb-2">관리자 메모</p>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="메모를 입력하세요..."
              className="w-full border rounded-lg p-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
            />
            <Button
              size="sm"
              onClick={handleSaveMemo}
              disabled={saving || memo === (booking.admin_memo || '')}
              className="mt-2 bg-[#6C5CE7] hover:bg-[#5A4BD1]"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              메모 저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
