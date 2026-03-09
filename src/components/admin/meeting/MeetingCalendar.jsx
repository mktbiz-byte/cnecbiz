import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function MeetingCalendar({ year, month, slots, pendingBookings, selectedDate, onDateSelect, onMonthChange }) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const prevMonthDays = new Date(year, month - 1, 0).getDate()

  // Build date status map from slots data
  const dateStatusMap = {}
  for (const slot of (slots || [])) {
    const date = slot.date
    if (!dateStatusMap[date]) {
      dateStatusMap[date] = { hasConfirmed: false, hasPending: false, hasBlocked: false, hasAvailable: false }
    }
    if (slot.is_blocked) {
      dateStatusMap[date].hasBlocked = true
    } else if (slot.bookings?.some(b => b.status === 'confirmed')) {
      dateStatusMap[date].hasConfirmed = true
    } else if (slot.bookings?.some(b => b.status === 'pending')) {
      dateStatusMap[date].hasPending = true
    } else if (slot.current_bookings < slot.max_bookings) {
      dateStatusMap[date].hasAvailable = true
    }
  }

  // Also mark dates with pending bookings from preferred_slots
  for (const booking of (pendingBookings || [])) {
    if (booking.preferred_slots) {
      for (const ps of booking.preferred_slots) {
        if (ps.date) {
          if (!dateStatusMap[ps.date]) {
            dateStatusMap[ps.date] = { hasConfirmed: false, hasPending: false, hasBlocked: false, hasAvailable: false }
          }
          dateStatusMap[ps.date].hasPending = true
        }
      }
    }
  }

  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12)
    else onMonthChange(year, month - 1)
  }

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1)
    else onMonthChange(year, month + 1)
  }

  const handleToday = () => {
    const now = new Date()
    onMonthChange(now.getFullYear(), now.getMonth() + 1)
    onDateSelect(todayStr)
  }

  const renderDots = (dateStr) => {
    const status = dateStatusMap[dateStr]
    if (!status) return null

    const dots = []
    if (status.hasConfirmed) dots.push('#3B82F6')  // blue
    if (status.hasPending) dots.push('#F59E0B')     // yellow
    if (status.hasBlocked) dots.push('#EF4444')     // red
    if (status.hasAvailable) dots.push('#10B981')   // green

    return (
      <div className="flex gap-0.5 justify-center mt-0.5">
        {dots.map((color, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </div>
    )
  }

  // Build calendar grid
  const cells = []

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    cells.push({ day, type: 'prev', dateStr: null })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, type: 'current', dateStr })
  }

  // Next month leading days
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: 'next', dateStr: null })
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {year}. {String(month).padStart(2, '0')}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs h-7">
            오늘
          </Button>
          <div className="flex items-center gap-3 text-xs text-[#636E72]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6] inline-block" /> 예약확정</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block" /> 대기중</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444] inline-block" /> 블락</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" /> 가능</span>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day, i) => (
          <div key={day} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#636E72]'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr
          const isSelected = cell.dateStr === selectedDate
          const isOtherMonth = cell.type !== 'current'

          return (
            <button
              key={idx}
              disabled={isOtherMonth}
              onClick={() => cell.dateStr && onDateSelect(cell.dateStr)}
              className={`
                relative py-2 px-1 min-h-[52px] text-sm transition-all rounded-lg
                ${isOtherMonth ? 'text-gray-300 cursor-default' : 'hover:bg-[#F8F9FA] cursor-pointer'}
                ${isSelected ? 'bg-[#F0EDFF] ring-1 ring-[#6C5CE7]' : ''}
                ${isToday && !isSelected ? 'bg-blue-50' : ''}
              `}
            >
              <span className={`
                ${isToday ? 'bg-[#6C5CE7] text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold' : ''}
                ${isSelected && !isToday ? 'font-bold text-[#6C5CE7]' : ''}
              `}>
                {cell.day}
              </span>
              {cell.dateStr && renderDots(cell.dateStr)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
