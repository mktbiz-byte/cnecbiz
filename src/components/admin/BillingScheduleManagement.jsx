import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CalendarDays, Plus, Trash2, Loader2, ArrowLeft, Check, X,
  Search, Building2, ChevronLeft, ChevronRight, Download,
  FileText, CreditCard, Bell, Calendar, ExternalLink, Edit3, Clock
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

const SCHEDULE_TYPES = [
  { value: 'tax_invoice', label: '세금계산서 발행', color: '#6C5CE7', bg: '#F0EDFF' },
  { value: 'payment_due', label: '입금 예정일', color: '#E17055', bg: '#FFF0ED' },
  { value: 'reminder', label: '알림/메모', color: '#00B894', bg: '#E6FFF9' }
]

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기', color: '#F59E0B' },
  { value: 'completed', label: '완료', color: '#10B981' },
  { value: 'cancelled', label: '취소', color: '#EF4444' }
]

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, current: false, date: new Date(year, month - 1, prevDays - i) })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true, date: new Date(year, month, i) })
  }
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, current: false, date: new Date(year, month + 1, i) })
  }
  return cells
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateICS(schedule) {
  const dt = new Date(schedule.scheduled_date)
  const dtStr = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
  const typeLabel = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type)?.label || ''
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}00`

  const hasTime = !!schedule.scheduled_time
  let dtStartLine, dtEndLine
  if (hasTime) {
    const [hours, minutes] = schedule.scheduled_time.split(':')
    const timeStr = `${hours}${minutes}00`
    dtStartLine = `DTSTART;TZID=Asia/Seoul:${dtStr}T${timeStr}`
    const endHour = String(Math.min(parseInt(hours) + 1, 23)).padStart(2, '0')
    dtEndLine = `DTEND;TZID=Asia/Seoul:${dtStr}T${endHour}${minutes}00`
  } else {
    dtStartLine = `DTSTART;VALUE=DATE:${dtStr}`
    dtEndLine = `DTEND;VALUE=DATE:${dtStr}`
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CNEC//BillingSchedule//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  if (hasTime) {
    lines.push(
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Seoul',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0900',
      'TZOFFSETTO:+0900',
      'TZNAME:KST',
      'END:STANDARD',
      'END:VTIMEZONE'
    )
  }

  lines.push(
    'BEGIN:VEVENT',
    dtStartLine,
    dtEndLine,
    `DTSTAMP:${stamp}`,
    `UID:${schedule.id}@cnecbiz.com`,
    `SUMMARY:[${typeLabel}] ${schedule.title}`,
    `DESCRIPTION:${schedule.company_name || ''}${schedule.amount ? ' / ' + Number(schedule.amount).toLocaleString() + '원' : ''}${schedule.description ? '\\n' + schedule.description : ''}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:[${typeLabel}] ${schedule.title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  )

  return lines.join('\r\n')
}

function downloadICS(schedule) {
  const ics = generateICS(schedule)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${schedule.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BillingScheduleManagement() {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])

  // Calendar state
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    schedule_type: 'tax_invoice',
    title: '',
    description: '',
    scheduled_date: formatDate(today),
    scheduled_time: '',
    amount: '',
    company_name: '',
    company_id: null,
    campaign_title: '',
    status: 'pending'
  })
  const [companySearch, setCompanySearch] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifying, setNotifying] = useState(false)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
    const endDate = viewMonth === 11
      ? `${viewYear + 1}-01-31`
      : `${viewYear}-${String(viewMonth + 2).padStart(2, '0')}-28`

    const { data, error } = await supabaseBiz
      .from('billing_schedules')
      .select('*')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date')

    if (data && !error) setSchedules(data)
    setLoading(false)
  }, [viewYear, viewMonth])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabaseBiz
        .from('companies')
        .select('id, company_name, email, notification_email')
        .order('company_name')
        .limit(500)
      if (data) setCompanies(data)
    }
    fetchCompanies()
  }, [])

  const filteredCompanies = companySearch.length > 0
    ? companies.filter(c => (c.company_name || '').toLowerCase().includes(companySearch.toLowerCase()))
    : companies

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }

  const openNewForm = (date) => {
    setEditingId(null)
    setForm({
      schedule_type: 'tax_invoice',
      title: '',
      description: '',
      scheduled_date: date ? formatDate(date) : formatDate(today),
      scheduled_time: '',
      amount: '',
      company_name: '',
      company_id: null,
      campaign_title: '',
      status: 'pending'
    })
    setCompanySearch('')
    setShowForm(true)
  }

  const openEditForm = (schedule) => {
    setEditingId(schedule.id)
    setForm({
      schedule_type: schedule.schedule_type,
      title: schedule.title,
      description: schedule.description || '',
      scheduled_date: schedule.scheduled_date,
      scheduled_time: schedule.scheduled_time || '',
      amount: schedule.amount ? String(schedule.amount) : '',
      company_name: schedule.company_name || '',
      company_id: schedule.company_id,
      campaign_title: schedule.campaign_title || '',
      status: schedule.status
    })
    setCompanySearch(schedule.company_name || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.scheduled_date) {
      alert('제목과 날짜는 필수입니다.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        schedule_type: form.schedule_type,
        title: form.title,
        description: form.description || null,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time || null,
        amount: form.amount ? Number(form.amount) : null,
        company_name: form.company_name || '미지정',
        company_id: form.company_id,
        campaign_title: form.campaign_title || null,
        status: form.status,
        updated_at: new Date().toISOString()
      }

      if (editingId) {
        await supabaseBiz.from('billing_schedules').update(payload).eq('id', editingId)
      } else {
        await supabaseBiz.from('billing_schedules').insert(payload)
      }

      // 네이버웍스 알림 (fire-and-forget)
      const typeLabel = SCHEDULE_TYPES.find(t => t.value === payload.schedule_type)?.label || ''
      const action = editingId ? '수정' : '등록'
      const timeStr = payload.scheduled_time ? ` ${payload.scheduled_time}` : ''
      const nwMessage = [
        `📅 스케줄 ${action} 알림`,
        '',
        `[${typeLabel}] ${payload.title}`,
        `예정일: ${payload.scheduled_date}${timeStr}`,
        payload.company_name && payload.company_name !== '미지정' ? `기업: ${payload.company_name}` : null,
        payload.amount ? `금액: ${Number(payload.amount).toLocaleString()}원` : null,
        payload.campaign_title ? `캠페인: ${payload.campaign_title}` : null,
        payload.description ? `메모: ${payload.description}` : null,
      ].filter(Boolean).join('\n')

      fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          message: nwMessage,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
        })
      }).catch(err => console.error('네이버웍스 알림 실패:', err))

      setShowForm(false)
      setEditingId(null)
      fetchSchedules()
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('이 스케줄을 삭제하시겠습니까?')) return
    await supabaseBiz.from('billing_schedules').delete().eq('id', id)
    fetchSchedules()
  }

  const handleStatusToggle = async (schedule) => {
    const nextStatus = schedule.status === 'pending' ? 'completed' : 'pending'
    await supabaseBiz.from('billing_schedules').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', schedule.id)
    fetchSchedules()
  }

  // 이메일 알림 발송 (mkt@cnecbiz.com)
  const handleNotify = async (schedule) => {
    if (!confirm(`이 스케줄을 mkt@cnecbiz.com로 알림 발송하시겠습니까?`)) return
    setNotifying(true)
    try {
      const typeLabel = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type)?.label || ''
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'mkt@cnecbiz.com',
          subject: `[스케줄 알림] ${typeLabel} - ${schedule.title} (${schedule.scheduled_date})`,
          html: `
            <div style="font-family: Pretendard, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #6C5CE7; margin-bottom: 16px;">${typeLabel} 스케줄 알림</h2>
              <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
                <tr style="background: #f8f9fa;">
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold; width: 120px;">스케줄 유형</td>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${typeLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold;">제목</td>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${schedule.title}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold;">예정일</td>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; color: #E17055; font-weight: bold;">${schedule.scheduled_date}${schedule.scheduled_time ? ` ${schedule.scheduled_time}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold;">기업명</td>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${schedule.company_name || '-'}</td>
                </tr>
                ${schedule.amount ? `<tr style="background: #f8f9fa;">
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold;">금액</td>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold; color: #6C5CE7;">${Number(schedule.amount).toLocaleString()}원</td>
                </tr>` : ''}
                ${schedule.campaign_title ? `<tr>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold;">캠페인</td>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${schedule.campaign_title}</td>
                </tr>` : ''}
                ${schedule.description ? `<tr style="background: #f8f9fa;">
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6; font-weight: bold;">메모</td>
                  <td style="padding: 10px 14px; border: 1px solid #dee2e6;">${schedule.description}</td>
                </tr>` : ''}
              </table>
              <p style="color: #999; font-size: 12px; margin-top: 16px;">CNEC 스케줄 관리 시스템에서 발송되었습니다.</p>
            </div>
          `
        })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      await supabaseBiz.from('billing_schedules').update({
        email_notified: true,
        email_notified_at: new Date().toISOString()
      }).eq('id', schedule.id)

      alert('알림 이메일이 발송되었습니다.')
      fetchSchedules()
    } catch (err) {
      alert(`알림 발송 실패: ${err.message}`)
    } finally {
      setNotifying(false)
    }
  }

  // Calendar data
  const cells = getMonthDays(viewYear, viewMonth)
  const schedulesByDate = {}
  schedules.forEach(s => {
    const key = s.scheduled_date
    if (!schedulesByDate[key]) schedulesByDate[key] = []
    schedulesByDate[key].push(s)
  })

  const todayStr = formatDate(today)
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : null
  const selectedSchedules = selectedDateStr ? (schedulesByDate[selectedDateStr] || []) : []

  // Month summary
  const monthSchedules = schedules.filter(s => {
    const d = new Date(s.scheduled_date)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })
  const pendingCount = monthSchedules.filter(s => s.status === 'pending').length
  const completedCount = monthSchedules.filter(s => s.status === 'completed').length
  const taxCount = monthSchedules.filter(s => s.schedule_type === 'tax_invoice').length
  const paymentCount = monthSchedules.filter(s => s.schedule_type === 'payment_due').length

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-[#6C5CE7]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Pretendard, sans-serif' }}>스케줄 관리</h1>
              <p className="text-sm text-gray-500">세금계산서 발행일 / 입금 예정일 관리</p>
            </div>
          </div>
          <Button onClick={() => openNewForm(selectedDate || today)} className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl gap-2">
            <Plus className="w-4 h-4" /> 새 스케줄
          </Button>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <SummaryCard label="이번 달 전체" value={monthSchedules.length} icon={<CalendarDays className="w-4 h-4" />} />
          <SummaryCard label="세금계산서" value={taxCount} icon={<FileText className="w-4 h-4" />} color="#6C5CE7" />
          <SummaryCard label="입금 예정" value={paymentCount} icon={<CreditCard className="w-4 h-4" />} color="#E17055" />
          <SummaryCard label="대기 / 완료" value={`${pendingCount} / ${completedCount}`} icon={<Check className="w-4 h-4" />} color="#00B894" />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="col-span-2">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="w-8 h-8">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Outfit, Pretendard, sans-serif' }}>
                      {viewYear}. {String(viewMonth + 1).padStart(2, '0')}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="w-8 h-8">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToday} className="text-xs text-[#6C5CE7] hover:bg-[#F0EDFF]">
                      오늘
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    {SCHEDULE_TYPES.map(t => (
                      <span key={t.value} className="flex items-center gap-1 text-[11px] text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS.map((d, i) => (
                    <div key={d} className={`text-center text-xs font-bold py-1.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                      {d}
                    </div>
                  ))}
                </div>
                {/* Cells */}
                <div className="grid grid-cols-7 border-t border-l border-gray-100">
                  {cells.map((cell, idx) => {
                    const dateStr = formatDate(cell.date)
                    const daySchedules = schedulesByDate[dateStr] || []
                    const isToday = dateStr === todayStr
                    const isSelected = dateStr === selectedDateStr
                    const dayIdx = idx % 7

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(cell.date)}
                        className={`border-b border-r border-gray-100 min-h-[80px] p-1 cursor-pointer transition-colors ${
                          !cell.current ? 'bg-gray-50/50' : isSelected ? 'bg-[#F0EDFF]' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`text-xs font-medium mb-0.5 flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday ? 'bg-[#6C5CE7] text-white font-bold' :
                          !cell.current ? 'text-gray-300' :
                          dayIdx === 0 ? 'text-red-400' : dayIdx === 6 ? 'text-blue-400' : 'text-gray-700'
                        }`} style={{ fontFamily: 'Outfit' }}>
                          {cell.day}
                        </div>
                        <div className="space-y-0.5">
                          {daySchedules.slice(0, 3).map(s => {
                            const typeInfo = SCHEDULE_TYPES.find(t => t.value === s.schedule_type) || SCHEDULE_TYPES[0]
                            return (
                              <div
                                key={s.id}
                                className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${s.status === 'completed' ? 'line-through opacity-50' : ''}`}
                                style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}
                                title={`${s.title} - ${s.company_name}`}
                              >
                                {s.scheduled_time ? `${s.scheduled_time} ` : ''}{s.title}
                              </div>
                            )
                          })}
                          {daySchedules.length > 3 && (
                            <div className="text-[9px] text-gray-400 px-1">+{daySchedules.length - 3}건</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: selected date or form */}
          <div className="col-span-1 space-y-4">
            {showForm ? (
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-700">
                      {editingId ? '스케줄 수정' : '새 스케줄'}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingId(null) }} className="w-7 h-7">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Type */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">유형</label>
                    <div className="flex gap-2">
                      {SCHEDULE_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setForm(f => ({ ...f, schedule_type: t.value }))}
                          className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                            form.schedule_type === t.value
                              ? 'border-current'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={form.schedule_type === t.value ? { backgroundColor: t.bg, color: t.color, borderColor: t.color } : {}}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">제목 *</label>
                    <Input
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="예: 12월 세금계산서 발행"
                      className="rounded-xl"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">예정일 *</label>
                    <Input
                      type="date"
                      value={form.scheduled_date}
                      onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">시간 (선택)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={form.scheduled_time}
                        onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                        className="rounded-xl flex-1"
                      />
                      {form.scheduled_time && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setForm(f => ({ ...f, scheduled_time: '' }))}
                          className="w-8 h-8 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">기업명</label>
                    <div className="relative">
                      <Input
                        value={companySearch}
                        onChange={e => { setCompanySearch(e.target.value); setShowCompanyDropdown(true); setForm(f => ({ ...f, company_name: e.target.value, company_id: null })) }}
                        onFocus={() => setShowCompanyDropdown(true)}
                        placeholder="기업명 검색 또는 직접 입력"
                        className="rounded-xl"
                      />
                      {showCompanyDropdown && filteredCompanies.length > 0 && companySearch.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg max-h-[150px] overflow-y-auto">
                          {filteredCompanies.slice(0, 10).map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setForm(f => ({ ...f, company_name: c.company_name, company_id: c.id }))
                                setCompanySearch(c.company_name)
                                setShowCompanyDropdown(false)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-[#F0EDFF] text-sm"
                            >
                              {c.company_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">금액 (원)</label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>

                  {/* Campaign */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">캠페인명</label>
                    <Input
                      value={form.campaign_title}
                      onChange={e => setForm(f => ({ ...f, campaign_title: e.target.value }))}
                      placeholder="관련 캠페인 (선택)"
                      className="rounded-xl"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">메모</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="추가 메모..."
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 resize-none"
                    />
                  </div>

                  {/* Status (edit only) */}
                  {editingId && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">상태</label>
                      <div className="flex gap-2">
                        {STATUS_OPTIONS.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setForm(f => ({ ...f, status: s.value }))}
                            className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors ${
                              form.status === s.value ? 'text-white' : 'border-gray-200 text-gray-500'
                            }`}
                            style={form.status === s.value ? { backgroundColor: s.color, borderColor: s.color } : {}}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingId ? '수정' : '등록'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Selected date info */}
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#6C5CE7]" />
                        {selectedDate
                          ? `${selectedDate.getFullYear()}. ${selectedDate.getMonth() + 1}. ${selectedDate.getDate()} (${DAYS[selectedDate.getDay()]})`
                          : '날짜를 선택하세요'
                        }
                      </CardTitle>
                      {selectedDate && (
                        <Button variant="ghost" size="sm" onClick={() => openNewForm(selectedDate)} className="text-[#6C5CE7] hover:bg-[#F0EDFF] gap-1 text-xs">
                          <Plus className="w-3 h-3" /> 추가
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!selectedDate ? (
                      <p className="text-sm text-gray-400 text-center py-4">캘린더에서 날짜를 클릭하세요</p>
                    ) : selectedSchedules.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">등록된 스케줄이 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedSchedules.map(s => (
                          <ScheduleItem
                            key={s.id}
                            schedule={s}
                            onEdit={() => openEditForm(s)}
                            onDelete={() => handleDelete(s.id)}
                            onToggle={() => handleStatusToggle(s)}
                            onNotify={() => handleNotify(s)}
                            onCalendar={() => downloadICS(s)}
                            notifying={notifying}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming schedules */}
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#E17055]" />
                      다가오는 스케줄
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthSchedules.filter(s => s.status === 'pending' && s.scheduled_date >= todayStr).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">예정된 스케줄이 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {monthSchedules
                          .filter(s => s.status === 'pending' && s.scheduled_date >= todayStr)
                          .slice(0, 8)
                          .map(s => {
                            const typeInfo = SCHEDULE_TYPES.find(t => t.value === s.schedule_type) || SCHEDULE_TYPES[0]
                            const d = new Date(s.scheduled_date)
                            const daysLeft = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                            return (
                              <div
                                key={s.id}
                                onClick={() => { setSelectedDate(new Date(s.scheduled_date)); openEditForm(s) }}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
                              >
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: typeInfo.color }} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-800 truncate">{s.title}</div>
                                  <div className="text-[10px] text-gray-400">{s.company_name} {s.amount ? `/ ${Number(s.amount).toLocaleString()}원` : ''}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-[11px] font-bold" style={{ fontFamily: 'Outfit', color: daysLeft <= 3 ? '#E17055' : '#6C5CE7' }}>
                                    {daysLeft === 0 ? 'D-DAY' : `D-${daysLeft}`}
                                  </div>
                                  <div className="text-[10px] text-gray-400">{s.scheduled_date.slice(5)}{s.scheduled_time ? ` ${s.scheduled_time}` : ''}</div>
                                </div>
                              </div>
                            )
                          })
                        }
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon, color = '#6C5CE7' }) {
  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F0EDFF', color }}>
          {icon}
        </div>
        <div>
          <div className="text-[11px] text-gray-500">{label}</div>
          <div className="text-xl font-extrabold text-gray-900" style={{ fontFamily: 'Outfit' }}>{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleItem({ schedule, onEdit, onDelete, onToggle, onNotify, onCalendar, notifying }) {
  const typeInfo = SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type) || SCHEDULE_TYPES[0]
  const statusInfo = STATUS_OPTIONS.find(s => s.value === schedule.status) || STATUS_OPTIONS[0]
  const isCompleted = schedule.status === 'completed'

  return (
    <div className={`p-3 rounded-xl border ${isCompleted ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}>
            {typeInfo.label}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: statusInfo.color + '15', color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded" title={isCompleted ? '대기로 변경' : '완료로 변경'}>
            <Check className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-500' : 'text-gray-300'}`} />
          </button>
          <button onClick={onEdit} className="p-1 hover:bg-gray-100 rounded" title="수정">
            <Edit3 className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded" title="삭제">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
      <div className={`text-sm font-bold mb-1 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{schedule.title}</div>
      {schedule.scheduled_time && (
        <div className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
          <Clock className="w-3 h-3" /> {schedule.scheduled_time}
        </div>
      )}
      {schedule.company_name && (
        <div className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
          <Building2 className="w-3 h-3" /> {schedule.company_name}
        </div>
      )}
      {schedule.amount && (
        <div className="text-xs font-bold mb-0.5" style={{ fontFamily: 'Outfit', color: '#6C5CE7' }}>
          {Number(schedule.amount).toLocaleString()}원
        </div>
      )}
      {schedule.description && (
        <div className="text-[11px] text-gray-400 mt-1">{schedule.description}</div>
      )}
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNotify}
          disabled={notifying}
          className="text-[11px] text-gray-500 hover:text-[#6C5CE7] hover:bg-[#F0EDFF] h-7 px-2 gap-1"
        >
          <Bell className="w-3 h-3" />
          {schedule.email_notified ? '재알림' : '이메일 알림'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCalendar}
          className="text-[11px] text-gray-500 hover:text-[#6C5CE7] hover:bg-[#F0EDFF] h-7 px-2 gap-1"
        >
          <Download className="w-3 h-3" />
          캘린더 추가 (.ics)
        </Button>
      </div>
    </div>
  )
}
