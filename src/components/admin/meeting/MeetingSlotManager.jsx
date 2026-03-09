import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Plus, Ban, Loader2, AlertTriangle } from 'lucide-react'

const WEEKDAY_LABELS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
]

export default function MeetingSlotManager({ settings, onRefresh }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTimes, setSelectedTimes] = useState([])
  const [selectedWeekdays, setSelectedWeekdays] = useState([1, 2, 3, 4, 5]) // Mon-Fri
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)

  // Block section
  const [blockDate, setBlockDate] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [blocking, setBlocking] = useState(false)
  const [blockWarning, setBlockWarning] = useState(null)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)

  const availableTimes = settings?.available_times || ['10:00', '11:00', '14:00', '15:00', '16:00']

  useEffect(() => {
    // Default: select all available times
    setSelectedTimes(availableTimes)
  }, [JSON.stringify(availableTimes)])

  const toggleTime = (time) => {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    )
  }

  const toggleWeekday = (day) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) {
      alert('시작일과 종료일을 선택하세요')
      return
    }
    if (selectedTimes.length === 0) {
      alert('시간대를 선택하세요')
      return
    }
    if (selectedWeekdays.length === 0) {
      alert('요일을 선택하세요')
      return
    }

    setGenerating(true)
    setResult(null)
    try {
      const res = await fetch('/.netlify/functions/manage-meeting-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          date_from: dateFrom,
          date_to: dateTo,
          times: selectedTimes,
          weekdays: selectedWeekdays
        })
      })
      const data = await res.json()
      if (data.success) {
        setResult({ type: 'success', message: data.message })
        onRefresh()
      } else {
        setResult({ type: 'error', message: data.error })
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message })
    } finally {
      setGenerating(false)
    }
  }

  const handleBlockDate = async (confirmed = false) => {
    if (!blockDate) {
      alert('날짜를 선택하세요')
      return
    }

    if (!confirmed) {
      // First check for existing bookings
      setBlocking(true)
      try {
        const res = await fetch('/.netlify/functions/manage-meeting-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'block',
            dates: [blockDate],
            reason: blockReason
          })
        })
        const data = await res.json()
        if (data.success) {
          if (data.active_bookings > 0) {
            setBlockWarning(data.active_bookings)
            setBlockConfirmOpen(true)
          } else {
            setResult({ type: 'success', message: data.message })
            setBlockDate('')
            setBlockReason('')
            onRefresh()
          }
        } else {
          setResult({ type: 'error', message: data.error })
        }
      } catch (err) {
        setResult({ type: 'error', message: err.message })
      } finally {
        setBlocking(false)
      }
      return
    }

    // Confirmed block (already done above, just close modal)
    setBlockConfirmOpen(false)
    setBlockDate('')
    setBlockReason('')
    setResult({ type: 'success', message: `${blockDate} 블락 완료 (예약 ${blockWarning}건 있음)` })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {/* Slot Generation */}
      <Card className="border-[#E8E8E8]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#6C5CE7]" />
            슬롯 일괄 생성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="text-xs text-[#636E72] block mb-1">시작일</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>
            <span className="text-[#B2BEC3] mt-5">~</span>
            <div className="flex-1">
              <label className="text-xs text-[#636E72] block mb-1">종료일</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <label className="text-xs text-[#636E72] block mb-2">시간대</label>
            <div className="flex flex-wrap gap-2">
              {availableTimes.map(time => (
                <label key={time} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedTimes.includes(time)}
                    onCheckedChange={() => toggleTime(time)}
                  />
                  <span className="text-sm">{time}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Weekday Selection */}
          <div>
            <label className="text-xs text-[#636E72] block mb-2">요일</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedWeekdays.includes(value)}
                    onCheckedChange={() => toggleWeekday(value)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-[#6C5CE7] hover:bg-[#5A4BD1] w-full"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
            슬롯 생성
          </Button>
        </CardContent>
      </Card>

      {/* Date Block */}
      <Card className="border-[#E8E8E8]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500" />
            날짜 전체 블락
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-[#636E72] block mb-1">날짜</label>
            <input
              type="date"
              value={blockDate}
              onChange={e => setBlockDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
            />
          </div>
          <div>
            <label className="text-xs text-[#636E72] block mb-1">사유 (선택)</label>
            <input
              type="text"
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="예: 공휴일"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
            />
          </div>
          <Button
            onClick={() => handleBlockDate(false)}
            disabled={blocking}
            variant="outline"
            className="w-full text-red-500 border-red-200 hover:bg-red-50"
          >
            {blocking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
            블락 처리
          </Button>
        </CardContent>
      </Card>

      {/* Result Toast */}
      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.message}
        </div>
      )}

      {/* Block Confirm Dialog */}
      <Dialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              예약 존재 경고
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#636E72]">
            해당 날짜에 활성 예약 <strong className="text-[#1A1A2E]">{blockWarning}건</strong>이 있습니다.
            블락하시겠습니까?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setBlockConfirmOpen(false)}>취소</Button>
            <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => handleBlockDate(true)}>
              블락 진행
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
