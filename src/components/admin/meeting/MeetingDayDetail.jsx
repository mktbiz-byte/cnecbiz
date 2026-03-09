import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Check, X, Ban, Unlock, CheckCircle, Loader2 } from 'lucide-react'

export default function MeetingDayDetail({ date, slots, bookings, onAction, onBlockSlot, onUnblockSlot, onCreatorClick, loading }) {
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [blockingSlotId, setBlockingSlotId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  if (!date) {
    return (
      <div className="flex items-center justify-center h-48 text-[#636E72] text-sm">
        캘린더에서 날짜를 선택하세요
      </div>
    )
  }

  // Filter slots for the selected date
  const daySlots = (slots || []).filter(s => s.date === date)

  // Build time-slot map
  const timeSlotMap = {}
  for (const slot of daySlots) {
    const time = slot.time?.substring(0, 5)
    timeSlotMap[time] = slot
  }

  // Find bookings for this date (pending bookings matched via preferred_slots)
  const dayBookings = (bookings || []).filter(b => {
    if (b.status === 'cancelled' || b.status === 'no_show') return false
    // Check confirmed_slot
    const confirmedSlot = daySlots.find(s => s.id === b.confirmed_slot_id)
    if (confirmedSlot) return true
    // Check slot_id
    const linkedSlot = daySlots.find(s => s.id === b.slot_id)
    if (linkedSlot && b.status === 'pending') return true
    // Check preferred_slots
    if (b.status === 'pending' && b.preferred_slots) {
      return b.preferred_slots.some(ps => ps.date === date)
    }
    return false
  })

  // Map bookings to their time slots
  const getBookingForSlot = (slot) => {
    return dayBookings.find(b => {
      if (b.confirmed_slot_id === slot.id) return true
      if (b.slot_id === slot.id && b.status === 'pending') return true
      return false
    })
  }

  // Get pending bookings for a time (via preferred_slots)
  const getPendingForTime = (time) => {
    return dayBookings.filter(b => {
      if (b.status !== 'pending') return false
      if (b.preferred_slots) {
        return b.preferred_slots.some(ps => ps.date === date && ps.time === time)
      }
      return false
    })
  }

  const handleAction = async (bookingId, action, slotId) => {
    setActionLoading(`${bookingId}-${action}`)
    try {
      await onAction(bookingId, action, slotId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBlockClick = (slotId) => {
    setBlockingSlotId(slotId)
    setBlockReason('')
    setBlockModalOpen(true)
  }

  const handleBlockConfirm = async () => {
    if (blockingSlotId) {
      await onBlockSlot([blockingSlotId], blockReason)
    }
    setBlockModalOpen(false)
    setBlockingSlotId(null)
  }

  // Collect all times to display (from slots or from pending bookings' preferred_slots)
  const allTimes = new Set()
  daySlots.forEach(s => allTimes.add(s.time?.substring(0, 5)))
  dayBookings.forEach(b => {
    if (b.status === 'pending' && b.preferred_slots) {
      b.preferred_slots.forEach(ps => {
        if (ps.date === date) allTimes.add(ps.time)
      })
    }
  })
  const sortedTimes = Array.from(allTimes).sort()

  const isActionLoading = (id, act) => actionLoading === `${id}-${act}`

  return (
    <div>
      <h3 className="text-sm font-bold text-[#1A1A2E] mb-3">
        {date} ({['일','월','화','수','목','금','토'][new Date(date).getDay()]})
      </h3>

      {sortedTimes.length === 0 ? (
        <p className="text-sm text-[#636E72]">이 날짜에 슬롯이 없습니다</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-[#636E72]">
                <th className="py-2 px-2 font-medium">시간</th>
                <th className="py-2 px-2 font-medium">상태</th>
                <th className="py-2 px-2 font-medium">크리에이터</th>
                <th className="py-2 px-2 font-medium">연락처</th>
                <th className="py-2 px-2 font-medium text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedTimes.map(time => {
                const slot = timeSlotMap[time]
                const booking = slot ? getBookingForSlot(slot) : null
                const pendingForTime = getPendingForTime(time)

                // If there's a slot with a direct booking
                if (slot && booking) {
                  return (
                    <tr key={time} className="border-b hover:bg-[#F8F9FA]">
                      <td className="py-2.5 px-2 font-medium">{time}</td>
                      <td className="py-2.5 px-2">
                        {booking.status === 'confirmed' && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">예약확정</Badge>}
                        {booking.status === 'pending' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs">대기중</Badge>}
                        {booking.status === 'completed' && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">완료</Badge>}
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => onCreatorClick(booking)}
                          className="text-[#6C5CE7] hover:underline font-medium"
                        >
                          {booking.creator_name}
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-[#636E72]">{booking.creator_phone}</td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex gap-1 justify-end">
                          {booking.status === 'pending' && (
                            <>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                disabled={!!actionLoading}
                                onClick={() => handleAction(booking.id, 'confirm', slot.id)}
                              >
                                {isActionLoading(booking.id, 'confirm') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                                확정
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                                disabled={!!actionLoading}
                                onClick={() => handleAction(booking.id, 'reject', null)}
                              >
                                {isActionLoading(booking.id, 'reject') ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 mr-1" />}
                                반려
                              </Button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                disabled={!!actionLoading}
                                onClick={() => handleAction(booking.id, 'complete', null)}
                              >
                                {isActionLoading(booking.id, 'complete') ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                                완료
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                                disabled={!!actionLoading}
                                onClick={() => handleAction(booking.id, 'cancel', null)}
                              >
                                {isActionLoading(booking.id, 'cancel') ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 mr-1" />}
                                취소
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }

                // Slot exists but no direct booking — check pending via preferred_slots
                if (slot && !booking && pendingForTime.length > 0) {
                  return pendingForTime.map((pb, i) => (
                    <tr key={`${time}-pending-${i}`} className="border-b hover:bg-[#F8F9FA]">
                      <td className="py-2.5 px-2 font-medium">{i === 0 ? time : ''}</td>
                      <td className="py-2.5 px-2">
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs">대기중</Badge>
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => onCreatorClick(pb)}
                          className="text-[#6C5CE7] hover:underline font-medium"
                        >
                          {pb.creator_name}
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-[#636E72]">{pb.creator_phone}</td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            disabled={!!actionLoading}
                            onClick={() => handleAction(pb.id, 'confirm', slot.id)}
                          >
                            {isActionLoading(pb.id, 'confirm') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                            확정
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                            disabled={!!actionLoading}
                            onClick={() => handleAction(pb.id, 'reject', null)}
                          >
                            {isActionLoading(pb.id, 'reject') ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 mr-1" />}
                            반려
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                }

                // Slot exists, no bookings at all
                if (slot && !booking && pendingForTime.length === 0) {
                  return (
                    <tr key={time} className="border-b hover:bg-[#F8F9FA]">
                      <td className="py-2.5 px-2 font-medium">{time}</td>
                      <td className="py-2.5 px-2">
                        {slot.is_blocked ? (
                          <Badge className="bg-red-100 text-red-600 hover:bg-red-100 text-xs">블락됨</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">가능</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[#B2BEC3]">-</td>
                      <td className="py-2.5 px-2 text-[#B2BEC3]">
                        {slot.is_blocked && slot.block_reason ? `(사유: ${slot.block_reason})` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {slot.is_blocked ? (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => onUnblockSlot([slot.id])}
                          >
                            <Unlock className="w-3 h-3 mr-1" /> 해제
                          </Button>
                        ) : (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleBlockClick(slot.id)}
                          >
                            <Ban className="w-3 h-3 mr-1" /> 블락
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                }

                // No slot exists for this time (only from pending preferred_slots)
                if (!slot && pendingForTime.length > 0) {
                  return pendingForTime.map((pb, i) => (
                    <tr key={`${time}-nosolt-${i}`} className="border-b hover:bg-[#F8F9FA]">
                      <td className="py-2.5 px-2 font-medium">{i === 0 ? time : ''}</td>
                      <td className="py-2.5 px-2">
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs">대기중 (슬롯없음)</Badge>
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => onCreatorClick(pb)}
                          className="text-[#6C5CE7] hover:underline font-medium"
                        >
                          {pb.creator_name}
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-[#636E72]">{pb.creator_phone}</td>
                      <td className="py-2.5 px-2 text-right">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                          disabled={!!actionLoading}
                          onClick={() => handleAction(pb.id, 'reject', null)}
                        >
                          반려
                        </Button>
                      </td>
                    </tr>
                  ))
                }

                return null
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Block reason modal */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>슬롯 블락</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-[#636E72]">블락 사유 (선택)</label>
              <input
                type="text"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="예: 공휴일, 내부 미팅 등"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setBlockModalOpen(false)}>취소</Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={handleBlockConfirm}>블락</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
