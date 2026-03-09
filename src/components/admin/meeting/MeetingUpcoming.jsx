import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, Calendar } from 'lucide-react'

export default function MeetingUpcoming({ slots, onAction }) {
  const [actionLoading, setActionLoading] = useState(null)

  // Get today's date
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Get date 7 days from now
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  // Filter confirmed bookings in the next 7 days
  const upcomingSlots = (slots || [])
    .filter(s => s.date >= todayStr && s.date <= nextWeekStr && !s.is_blocked)
    .filter(s => s.bookings?.some(b => b.status === 'confirmed'))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.time.localeCompare(b.time)
    })

  const handleComplete = async (bookingId) => {
    setActionLoading(bookingId)
    try {
      await onAction(bookingId, 'complete', null)
    } finally {
      setActionLoading(null)
    }
  }

  if (upcomingSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-[#636E72]">
        <Calendar className="w-10 h-10 mb-2 text-[#B2BEC3]" />
        <p className="text-sm">향후 7일간 확정된 미팅이 없습니다</p>
      </div>
    )
  }

  // Group by date
  const grouped = {}
  for (const slot of upcomingSlots) {
    if (!grouped[slot.date]) grouped[slot.date] = []
    for (const booking of (slot.bookings || [])) {
      if (booking.status === 'confirmed') {
        grouped[slot.date].push({ ...booking, time: slot.time?.substring(0, 5) })
      }
    }
  }

  const weekdays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, items]) => {
        const dayOfWeek = weekdays[new Date(date).getDay()]
        const isToday = date === todayStr

        return (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-[#1A1A2E]">{date} ({dayOfWeek})</span>
              {isToday && <Badge className="bg-[#F0EDFF] text-[#6C5CE7] hover:bg-[#F0EDFF] text-xs">오늘</Badge>}
            </div>
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F8F9FA] hover:bg-[#F0EDFF]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#6C5CE7] w-12">{item.time}</span>
                    <span className="text-sm font-medium text-[#1A1A2E]">{item.creator_name}</span>
                    <span className="text-xs text-[#636E72]">{item.creator_phone}</span>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                    disabled={actionLoading === item.booking_id}
                    onClick={() => handleComplete(item.booking_id)}
                  >
                    {actionLoading === item.booking_id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <CheckCircle className="w-3 h-3 mr-1" />
                    }
                    완료
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
