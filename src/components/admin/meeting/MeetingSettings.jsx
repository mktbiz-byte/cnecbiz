import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings, Save, Loader2, X, Plus } from 'lucide-react'

const WEEKDAY_LABELS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
]

export default function MeetingSettings({ settings, onSave }) {
  const [slotDuration, setSlotDuration] = useState(30)
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30)
  const [minAdvanceHours, setMinAdvanceHours] = useState(24)
  const [bookingLimit, setBookingLimit] = useState(1)
  const [blockedWeekdays, setBlockedWeekdays] = useState([0, 6])
  const [availableTimes, setAvailableTimes] = useState(['10:00', '11:00', '14:00', '15:00', '16:00'])
  const [newTime, setNewTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      if (settings.slot_duration !== undefined) setSlotDuration(settings.slot_duration)
      if (settings.max_advance_days !== undefined) setMaxAdvanceDays(settings.max_advance_days)
      if (settings.min_advance_hours !== undefined) setMinAdvanceHours(settings.min_advance_hours)
      if (settings.booking_limit_per_creator !== undefined) setBookingLimit(settings.booking_limit_per_creator)
      if (settings.blocked_weekdays !== undefined) setBlockedWeekdays(settings.blocked_weekdays)
      if (settings.available_times !== undefined) setAvailableTimes(settings.available_times)
    }
  }, [settings])

  const toggleBlockedWeekday = (day) => {
    setBlockedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const addTime = () => {
    if (!newTime) return
    const timeStr = newTime.length === 5 ? newTime : newTime + ':00'
    if (!availableTimes.includes(timeStr)) {
      setAvailableTimes(prev => [...prev, timeStr].sort())
    }
    setNewTime('')
  }

  const removeTime = (time) => {
    setAvailableTimes(prev => prev.filter(t => t !== time))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await onSave({
        slot_duration: slotDuration,
        max_advance_days: maxAdvanceDays,
        min_advance_hours: minAdvanceHours,
        booking_limit_per_creator: bookingLimit,
        blocked_weekdays: blockedWeekdays,
        available_times: availableTimes
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-[#E8E8E8]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#6C5CE7]" />
          미팅 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duration */}
        <div>
          <label className="text-xs text-[#636E72] block mb-1">기본 미팅 시간</label>
          <select
            value={slotDuration}
            onChange={e => setSlotDuration(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
          >
            <option value={30}>30분</option>
            <option value={60}>60분</option>
          </select>
        </div>

        {/* Max Advance Days */}
        <div>
          <label className="text-xs text-[#636E72] block mb-1">최대 예약 가능 기간</label>
          <select
            value={maxAdvanceDays}
            onChange={e => setMaxAdvanceDays(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
          >
            <option value={30}>30일</option>
            <option value={60}>60일</option>
          </select>
        </div>

        {/* Min Advance Hours */}
        <div>
          <label className="text-xs text-[#636E72] block mb-1">최소 사전 예약 시간</label>
          <select
            value={minAdvanceHours}
            onChange={e => setMinAdvanceHours(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
          >
            <option value={24}>24시간</option>
            <option value={48}>48시간</option>
          </select>
        </div>

        {/* Booking Limit */}
        <div>
          <label className="text-xs text-[#636E72] block mb-1">크리에이터당 동시 예약 제한</label>
          <select
            value={bookingLimit}
            onChange={e => setBookingLimit(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
          >
            <option value={1}>1건</option>
            <option value={2}>2건</option>
          </select>
        </div>

        {/* Blocked Weekdays */}
        <div>
          <label className="text-xs text-[#636E72] block mb-2">기본 블락 요일</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={blockedWeekdays.includes(value)}
                  onCheckedChange={() => toggleBlockedWeekday(value)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Available Times */}
        <div>
          <label className="text-xs text-[#636E72] block mb-2">가능 시간대</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {availableTimes.map(time => (
              <span key={time} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F0EDFF] text-[#6C5CE7] rounded-md text-xs font-medium">
                {time}
                <button onClick={() => removeTime(time)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
            />
            <Button size="sm" variant="outline" onClick={addTime} className="h-8">
              <Plus className="w-3 h-3 mr-1" /> 추가
            </Button>
          </div>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#6C5CE7] hover:bg-[#5A4BD1] w-full"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? '저장 완료!' : '설정 저장'}
        </Button>
      </CardContent>
    </Card>
  )
}
