import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Calendar, Loader2, Search, ExternalLink, Save, MessageSquare, Settings, Star,
  ChevronLeft, ChevronRight, X, FileSpreadsheet
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import MeetingCalendar from '../meeting/MeetingCalendar'
import MeetingDayDetail from '../meeting/MeetingDayDetail'
import MeetingSlotManager from '../meeting/MeetingSlotManager'
import MeetingSettings from '../meeting/MeetingSettings'
import ConsultationReviews from './ConsultationReviews'
import ConsultationSpreadsheet from './ConsultationSpreadsheet'

const STATUS_CONFIG = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-gray-500' },
  no_show: { label: '노쇼', color: 'bg-red-100 text-red-700' }
}

const PAGE_SIZE = 20

export default function ProgramConsultationPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeMainTab = searchParams.get('tab') || 'bookings'

  const [loading, setLoading] = useState(true)

  // Bookings tab state
  const [bookings, setBookings] = useState([])
  const [bookingsTotal, setBookingsTotal] = useState(0)
  const [bookingsPage, setBookingsPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [memo, setMemo] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)

  // Schedule tab state
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [pendingBookings, setPendingBookings] = useState([])
  const [dayBookings, setDayBookings] = useState([])
  const [settings, setSettings] = useState(null)

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabaseBiz) { navigate('/login'); return }
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: adminData } = await supabaseBiz
        .from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!adminData) { navigate('/login'); return }
      setLoading(false)
    }
    checkAuth()
  }, [])

  // Fetch bookings when filter changes
  useEffect(() => {
    if (!loading && activeMainTab === 'bookings') {
      fetchBookings()
    }
  }, [loading, activeMainTab, statusFilter, bookingsPage])

  // Fetch schedule data
  useEffect(() => {
    if (!loading && activeMainTab === 'schedule') {
      fetchSlots()
      fetchSettings()
    }
  }, [loading, activeMainTab, year, month])

  // Fetch settings for settings tab
  useEffect(() => {
    if (!loading && activeMainTab === 'settings') {
      fetchSettings()
    }
  }, [loading, activeMainTab])

  // Fetch day bookings when date selected
  useEffect(() => {
    if (selectedDate && activeMainTab === 'schedule') {
      fetchDayBookings(selectedDate)
    }
  }, [selectedDate])

  const fetchBookings = async () => {
    setBookingsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      params.set('limit', PAGE_SIZE.toString())
      params.set('offset', (bookingsPage * PAGE_SIZE).toString())

      const res = await fetch(`/.netlify/functions/get-meeting-bookings?${params}`)
      const data = await res.json()
      if (data.success) {
        setBookings(data.bookings || [])
        setBookingsTotal(data.total || 0)
      }
    } catch (err) {
      console.error('상담 목록 조회 오류:', err)
    } finally {
      setBookingsLoading(false)
    }
  }

  const fetchSlots = async () => {
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      const res = await fetch(`/.netlify/functions/get-meeting-slots?month=${monthStr}`)
      const data = await res.json()
      if (data.success) {
        setSlots(data.slots || [])
        setPendingBookings(data.pendingBookings || [])
      }
    } catch (err) {
      console.error('슬롯 조회 오류:', err)
    }
  }

  const fetchDayBookings = async (date) => {
    try {
      const res = await fetch(`/.netlify/functions/get-meeting-bookings?date=${date}`)
      const data = await res.json()
      if (data.success) {
        setDayBookings(data.bookings || [])
      }
    } catch (err) {
      console.error('예약 조회 오류:', err)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/.netlify/functions/meeting-settings')
      const data = await res.json()
      if (data.success) setSettings(data.settings)
    } catch (err) {
      console.error('설정 조회 오류:', err)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setBookingsPage(0)
    fetchBookings()
  }

  const handleStatusChange = async (bookingId, newStatus, slotId) => {
    setStatusChanging(true)
    try {
      const actionMap = {
        confirmed: 'confirm',
        completed: 'complete',
        cancelled: 'cancel',
        no_show: 'no_show'
      }
      const res = await fetch('/.netlify/functions/update-meeting-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          action: actionMap[newStatus] || newStatus,
          confirmed_slot_id: slotId || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        fetchBookings()
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking({ ...selectedBooking, status: newStatus, confirmed_slot_id: slotId || selectedBooking.confirmed_slot_id })
        }
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (err) {
      alert(`오류: ${err.message}`)
    } finally {
      setStatusChanging(false)
    }
  }

  const handleScheduleAction = async (bookingId, action, slotId) => {
    try {
      const res = await fetch('/.netlify/functions/update-meeting-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, action, confirmed_slot_id: slotId || undefined })
      })
      const data = await res.json()
      if (data.success) {
        fetchSlots()
        if (selectedDate) fetchDayBookings(selectedDate)
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (err) {
      alert(`오류: ${err.message}`)
    }
  }

  const handleBlockSlot = async (slotIds, reason) => {
    try {
      const res = await fetch('/.netlify/functions/manage-meeting-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', slot_ids: slotIds, reason })
      })
      const data = await res.json()
      if (data.success) {
        fetchSlots()
        if (selectedDate) fetchDayBookings(selectedDate)
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (err) {
      alert(`오류: ${err.message}`)
    }
  }

  const handleUnblockSlot = async (slotIds) => {
    try {
      const res = await fetch('/.netlify/functions/manage-meeting-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock', slot_ids: slotIds })
      })
      const data = await res.json()
      if (data.success) {
        fetchSlots()
        if (selectedDate) fetchDayBookings(selectedDate)
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (err) {
      alert(`오류: ${err.message}`)
    }
  }

  const handleSaveMemo = async () => {
    if (!selectedBooking) return
    setMemoSaving(true)
    try {
      const { error } = await supabaseBiz
        .from('meeting_bookings')
        .update({ admin_memo: memo, updated_at: new Date().toISOString() })
        .eq('id', selectedBooking.id)
      if (error) throw error
      setSelectedBooking({ ...selectedBooking, admin_memo: memo })
      fetchBookings()
    } catch (err) {
      alert(`메모 저장 오류: ${err.message}`)
    } finally {
      setMemoSaving(false)
    }
  }

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch('/.netlify/functions/meeting-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings })
      })
      const data = await res.json()
      if (data.success) fetchSettings()
      else alert(`오류: ${data.error}`)
    } catch (err) {
      alert(`오류: ${err.message}`)
    }
  }

  const openBookingDetail = (booking) => {
    setSelectedBooking(booking)
    setMemo(booking.admin_memo || '')
    setDetailOpen(true)
  }

  const getFirstPreferredDate = (booking) => {
    if (!booking.preferred_slots || booking.preferred_slots.length === 0) return '-'
    const first = booking.preferred_slots[0]
    return `${first.date} ${first.time || ''}`
  }

  const setTab = (tab) => {
    setSearchParams({ tab })
  }

  const totalPages = Math.ceil(bookingsTotal / PAGE_SIZE)

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white lg:ml-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7]" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white lg:ml-64">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#F0EDFF] rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#6C5CE7]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A2E]">크리에이터 프로그램 상담</h1>
              <p className="text-xs text-[#636E72]">상담 신청 관리 및 스케줄 운영</p>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeMainTab} onValueChange={setTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="bookings" className="text-sm">상담 목록</TabsTrigger>
              <TabsTrigger value="spreadsheet" className="text-sm flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                스프레드시트
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-sm">스케줄 관리</TabsTrigger>
              <TabsTrigger value="reviews" className="text-sm">후기 관리</TabsTrigger>
              <TabsTrigger value="settings" className="text-sm">설정</TabsTrigger>
            </TabsList>

            {/* 상담 목록 탭 */}
            <TabsContent value="bookings">
              {/* Filters */}
              <Card className="border-[#E8E8E8] mb-4">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Status filter */}
                    <div>
                      <label className="text-xs text-[#636E72] block mb-1">상태</label>
                      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setBookingsPage(0) }}>
                        <SelectTrigger className="w-[130px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="pending">대기중</SelectItem>
                          <SelectItem value="confirmed">확정</SelectItem>
                          <SelectItem value="completed">완료</SelectItem>
                          <SelectItem value="cancelled">취소</SelectItem>
                          <SelectItem value="no_show">노쇼</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date range */}
                    <div>
                      <label className="text-xs text-[#636E72] block mb-1">기간</label>
                      <div className="flex items-center gap-1">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                          className="border rounded-lg px-2 py-1.5 text-sm h-9 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]" />
                        <span className="text-[#B2BEC3]">~</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                          className="border rounded-lg px-2 py-1.5 text-sm h-9 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]" />
                      </div>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex gap-1">
                      <div>
                        <label className="text-xs text-[#636E72] block mb-1">검색</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="이름 또는 연락처"
                            className="border rounded-lg px-3 py-1.5 text-sm h-9 w-48 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                          />
                          <Button type="submit" size="sm" className="h-9 bg-[#6C5CE7] hover:bg-[#5A4BD1]">
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </CardContent>
              </Card>

              {/* Bookings Table */}
              <Card className="border-[#E8E8E8]">
                <CardContent className="p-0">
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-[#636E72] text-sm">
                      상담 신청 내역이 없습니다
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-[#F8F9FA]">
                              <th className="text-left py-3 px-4 font-medium text-[#636E72]">이름</th>
                              <th className="text-left py-3 px-4 font-medium text-[#636E72]">연락처</th>
                              <th className="text-left py-3 px-4 font-medium text-[#636E72]">신청일</th>
                              <th className="text-left py-3 px-4 font-medium text-[#636E72]">1순위 희망일</th>
                              <th className="text-left py-3 px-4 font-medium text-[#636E72]">상태</th>
                              <th className="text-left py-3 px-4 font-medium text-[#636E72]">메모</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookings.map(b => {
                              const st = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
                              return (
                                <tr
                                  key={b.id}
                                  onClick={() => openBookingDetail(b)}
                                  className="border-b hover:bg-[#F8F9FA] cursor-pointer transition-colors"
                                >
                                  <td className="py-3 px-4 font-medium text-[#1A1A2E]">{b.creator_name}</td>
                                  <td className="py-3 px-4 text-[#636E72]">{b.creator_phone}</td>
                                  <td className="py-3 px-4 text-[#636E72]">
                                    {new Date(b.created_at).toLocaleDateString('ko-KR')}
                                  </td>
                                  <td className="py-3 px-4 text-[#636E72]">{getFirstPreferredDate(b)}</td>
                                  <td className="py-3 px-4">
                                    <Badge className={`${st.color} hover:${st.color} text-xs`}>{st.label}</Badge>
                                  </td>
                                  <td className="py-3 px-4 text-[#636E72] max-w-[200px] truncate">
                                    {b.admin_memo || '-'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                          <span className="text-xs text-[#636E72]">
                            총 {bookingsTotal}건 중 {bookingsPage * PAGE_SIZE + 1}-{Math.min((bookingsPage + 1) * PAGE_SIZE, bookingsTotal)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline" size="sm"
                              disabled={bookingsPage === 0}
                              onClick={() => setBookingsPage(p => p - 1)}
                              className="h-8"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              disabled={bookingsPage >= totalPages - 1}
                              onClick={() => setBookingsPage(p => p + 1)}
                              className="h-8"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 스프레드시트 탭 */}
            <TabsContent value="spreadsheet">
              <ConsultationSpreadsheet />
            </TabsContent>

            {/* 스케줄 관리 탭 */}
            <TabsContent value="schedule">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <div className="lg:col-span-3">
                  <MeetingCalendar
                    year={year}
                    month={month}
                    slots={slots}
                    pendingBookings={pendingBookings}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Card className="border-[#E8E8E8]">
                    <CardContent className="p-4">
                      <MeetingDayDetail
                        date={selectedDate}
                        slots={slots}
                        bookings={dayBookings}
                        onAction={handleScheduleAction}
                        onBlockSlot={handleBlockSlot}
                        onUnblockSlot={handleUnblockSlot}
                        onCreatorClick={openBookingDetail}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MeetingSlotManager settings={settings} onRefresh={fetchSlots} />
              </div>
            </TabsContent>

            {/* 후기 관리 탭 */}
            <TabsContent value="reviews">
              <ConsultationReviews />
            </TabsContent>

            {/* 설정 탭 */}
            <TabsContent value="settings">
              <div className="max-w-lg">
                <MeetingSettings settings={settings} onSave={handleSaveSettings} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Booking Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              상담 상세
              {selectedBooking && (
                <Badge className={`${STATUS_CONFIG[selectedBooking.status]?.color} text-xs`}>
                  {STATUS_CONFIG[selectedBooking.status]?.label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* Creator Info */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#636E72]">이름</span>
                  <span className="text-sm font-semibold text-[#1A1A2E]">{selectedBooking.creator_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#636E72]">연락처</span>
                  <span className="text-sm text-[#1A1A2E]">{selectedBooking.creator_phone}</span>
                </div>
                {selectedBooking.creator_email && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#636E72]">이메일</span>
                    <span className="text-sm text-[#1A1A2E]">{selectedBooking.creator_email}</span>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {(selectedBooking.youtube_url || selectedBooking.instagram_url) && (
                <div className="border-t pt-3 space-y-2">
                  {selectedBooking.youtube_url && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#636E72]">유튜브</span>
                      <a href={selectedBooking.youtube_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-[#6C5CE7] hover:underline flex items-center gap-1">
                        채널 보기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {selectedBooking.instagram_url && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#636E72]">인스타그램</span>
                      <a href={selectedBooking.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-[#6C5CE7] hover:underline flex items-center gap-1">
                        프로필 보기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Preferred Slots */}
              <div className="border-t pt-3">
                <p className="text-sm text-[#636E72] mb-2">희망 상담 일정</p>
                <div className="space-y-1.5">
                  {(selectedBooking.preferred_slots || []).map((ps, i) => {
                    const isConfirmedSlot = selectedBooking.status === 'pending'
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-normal">{i + 1}순위</Badge>
                        <span className="text-sm text-[#1A1A2E]">{ps.date} {ps.time}</span>
                        {selectedBooking.status === 'pending' && (
                          <Button
                            size="sm" variant="outline"
                            className="h-6 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 ml-auto"
                            disabled={statusChanging}
                            onClick={async () => {
                              // Find slot for this date/time
                              const { data: matchSlots } = await supabaseBiz
                                .from('meeting_slots')
                                .select('id')
                                .eq('slot_date', ps.date)
                                .eq('slot_time', ps.time)
                                .maybeSingle()
                              if (matchSlots) {
                                handleStatusChange(selectedBooking.id, 'confirmed', matchSlots.id)
                              } else {
                                alert('해당 시간의 슬롯이 없습니다. 스케줄 관리에서 슬롯을 먼저 생성하세요.')
                              }
                            }}
                          >
                            {statusChanging ? <Loader2 className="w-3 h-3 animate-spin" /> : '확정'}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Status Change */}
              <div className="border-t pt-3">
                <p className="text-sm text-[#636E72] mb-2">상태 변경</p>
                <Select
                  value={selectedBooking.status}
                  onValueChange={(newStatus) => {
                    if (newStatus === 'confirmed') {
                      alert('확정으로 변경하려면 위의 희망 일정에서 슬롯을 선택하세요.')
                      return
                    }
                    if (confirm(`상태를 "${STATUS_CONFIG[newStatus]?.label}"(으)로 변경하시겠습니까?`)) {
                      handleStatusChange(selectedBooking.id, newStatus)
                    }
                  }}
                  disabled={statusChanging}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="confirmed">확정</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                    <SelectItem value="no_show">노쇼</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Created At */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#636E72]">신청일시</span>
                  <span className="text-sm text-[#1A1A2E]">
                    {new Date(selectedBooking.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                {selectedBooking.source && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-[#636E72]">경로</span>
                    <span className="text-sm text-[#1A1A2E]">{selectedBooking.source}</span>
                  </div>
                )}
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
                  disabled={memoSaving || memo === (selectedBooking.admin_memo || '')}
                  className="mt-2 bg-[#6C5CE7] hover:bg-[#5A4BD1]"
                >
                  {memoSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                  메모 저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
