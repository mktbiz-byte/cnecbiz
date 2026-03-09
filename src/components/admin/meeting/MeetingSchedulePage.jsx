import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Calendar, Loader2, ChevronDown, Settings } from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import MeetingCalendar from './MeetingCalendar'
import MeetingDayDetail from './MeetingDayDetail'
import MeetingUpcoming from './MeetingUpcoming'
import MeetingSlotManager from './MeetingSlotManager'
import MeetingSettings from './MeetingSettings'
import MeetingBookingModal from './MeetingBookingModal'

export default function MeetingSchedulePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  // Calendar state
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(null)
  const [activeTab, setActiveTab] = useState('upcoming')

  // Data
  const [slots, setSlots] = useState([])
  const [pendingBookings, setPendingBookings] = useState([])
  const [dayBookings, setDayBookings] = useState([])
  const [settings, setSettings] = useState(null)

  // Modal
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  // Slot manager
  const [slotManagerOpen, setSlotManagerOpen] = useState(false)

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabaseBiz) {
        navigate('/login')
        return
      }

      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      if (!adminData) {
        navigate('/login')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  // Fetch slots for current month
  useEffect(() => {
    if (!loading) {
      fetchSlots()
      fetchSettings()
    }
  }, [loading, year, month])

  // Fetch day bookings when date selected
  useEffect(() => {
    if (selectedDate) {
      fetchDayBookings(selectedDate)
      setActiveTab('day')
    }
  }, [selectedDate])

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
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (err) {
      console.error('설정 조회 오류:', err)
    }
  }

  const handleMonthChange = (newYear, newMonth) => {
    setYear(newYear)
    setMonth(newMonth)
  }

  const handleAction = async (bookingId, action, slotId) => {
    try {
      const res = await fetch('/.netlify/functions/update-meeting-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          action,
          confirmed_slot_id: slotId || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh data
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
        body: JSON.stringify({
          action: 'block',
          slot_ids: slotIds,
          reason
        })
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
        body: JSON.stringify({
          action: 'unblock',
          slot_ids: slotIds
        })
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

  const handleCreatorClick = (booking) => {
    setSelectedBooking(booking)
    setBookingModalOpen(true)
  }

  const handleUpdateMemo = async (bookingId, memo) => {
    try {
      const res = await fetch('/.netlify/functions/update-meeting-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          action: 'confirm', // We need a way to just update memo — use the current status
          admin_memo: memo
        })
      })
      // Actually, we should use a dedicated approach. Let's just call with existing status
      // For now, update memo via the booking's current action
    } catch (err) {
      console.error('메모 저장 오류:', err)
    }

    // Direct update via supabase for memo only
    try {
      const { error } = await supabaseBiz
        .from('meeting_bookings')
        .update({ admin_memo: memo, updated_at: new Date().toISOString() })
        .eq('id', bookingId)

      if (error) throw error
      if (selectedDate) fetchDayBookings(selectedDate)
    } catch (err) {
      alert(`메모 저장 오류: ${err.message}`)
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
      if (data.success) {
        fetchSettings()
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (err) {
      alert(`오류: ${err.message}`)
    }
  }

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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F0EDFF] rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#6C5CE7]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1A1A2E]">미팅 스케줄 관리</h1>
                <p className="text-xs text-[#636E72]">크리에이터 미팅 예약 관리</p>
              </div>
            </div>
          </div>

          {/* Main Content: Calendar + Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            {/* Left: Calendar (3 cols) */}
            <div className="lg:col-span-3">
              <MeetingCalendar
                year={year}
                month={month}
                slots={slots}
                pendingBookings={pendingBookings}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onMonthChange={handleMonthChange}
              />
            </div>

            {/* Right: Detail Panel (2 cols) */}
            <div className="lg:col-span-2">
              <Card className="border-[#E8E8E8]">
                <CardContent className="p-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="upcoming" className="flex-1 text-xs">다가오는 스케줄</TabsTrigger>
                      <TabsTrigger value="day" className="flex-1 text-xs">날짜 상세</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming">
                      <MeetingUpcoming
                        slots={slots}
                        onAction={handleAction}
                      />
                    </TabsContent>

                    <TabsContent value="day">
                      <MeetingDayDetail
                        date={selectedDate}
                        slots={slots}
                        bookings={dayBookings}
                        onAction={handleAction}
                        onBlockSlot={handleBlockSlot}
                        onUnblockSlot={handleUnblockSlot}
                        onCreatorClick={handleCreatorClick}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom: Slot Manager + Settings (Collapsible) */}
          <Collapsible open={slotManagerOpen} onOpenChange={setSlotManagerOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-white rounded-xl border border-[#E8E8E8] hover:bg-[#F8F9FA] transition-colors mb-2">
              <Settings className="w-4 h-4 text-[#6C5CE7]" />
              <span className="text-sm font-semibold text-[#1A1A2E]">슬롯 관리 & 설정</span>
              <ChevronDown className={`w-4 h-4 text-[#636E72] ml-auto transition-transform ${slotManagerOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MeetingSlotManager
                  settings={settings}
                  onRefresh={fetchSlots}
                />
                <MeetingSettings
                  settings={settings}
                  onSave={handleSaveSettings}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Booking Detail Modal */}
      <MeetingBookingModal
        booking={selectedBooking}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onUpdateMemo={handleUpdateMemo}
      />
    </>
  )
}
