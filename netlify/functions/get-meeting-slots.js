const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const params = event.queryStringParameters || {}
    const month = params.month // e.g. '2026-03'

    if (!month) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'month parameter required (e.g. 2026-03)' })
      }
    }

    // Calculate date range for the month
    const [year, mon] = month.split('-').map(Number)
    const startDate = `${month}-01`
    const endDate = new Date(year, mon, 0).toISOString().split('T')[0] // last day of month

    // Fetch slots for the month
    const { data: slots, error: slotsError } = await supabase
      .from('meeting_slots')
      .select('*')
      .gte('slot_date', startDate)
      .lte('slot_date', endDate)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true })

    if (slotsError) throw slotsError

    // Fetch bookings that reference these slots (via slot_id or confirmed_slot_id)
    const slotIds = slots.map(s => s.id)

    let bookings = []
    if (slotIds.length > 0) {
      // Get bookings where slot_id or confirmed_slot_id matches
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('meeting_bookings')
        .select('id, slot_id, confirmed_slot_id, creator_name, creator_phone, creator_email, status, preferred_slots, created_at')
        .or(`slot_id.in.(${slotIds.join(',')}),confirmed_slot_id.in.(${slotIds.join(',')})`)
        .in('status', ['pending', 'confirmed', 'completed'])

      if (bookingsError) throw bookingsError
      bookings = bookingsData || []
    }

    // Also fetch pending bookings that have preferred_slots referencing dates in this month
    const { data: pendingBookings, error: pendingError } = await supabase
      .from('meeting_bookings')
      .select('id, slot_id, confirmed_slot_id, creator_name, creator_phone, creator_email, status, preferred_slots, created_at')
      .eq('status', 'pending')

    if (pendingError) throw pendingError

    // Filter pending bookings that have preferred_slots with dates in this month
    const pendingInMonth = (pendingBookings || []).filter(b => {
      if (!b.preferred_slots) return false
      return b.preferred_slots.some(ps => {
        const psDate = ps.date
        return psDate >= startDate && psDate <= endDate
      })
    })

    // Merge bookings, avoiding duplicates
    const allBookingIds = new Set(bookings.map(b => b.id))
    for (const pb of pendingInMonth) {
      if (!allBookingIds.has(pb.id)) {
        bookings.push(pb)
        allBookingIds.add(pb.id)
      }
    }

    // Map bookings to slots
    const slotBookingsMap = {}
    for (const slot of slots) {
      slotBookingsMap[slot.id] = []
    }

    for (const booking of bookings) {
      // Confirmed bookings go to their confirmed_slot_id
      if (booking.status === 'confirmed' || booking.status === 'completed') {
        const targetSlotId = booking.confirmed_slot_id || booking.slot_id
        if (targetSlotId && slotBookingsMap[targetSlotId]) {
          slotBookingsMap[targetSlotId].push({
            booking_id: booking.id,
            creator_name: booking.creator_name,
            creator_phone: booking.creator_phone,
            creator_email: booking.creator_email,
            status: booking.status,
            created_at: booking.created_at
          })
        }
      }

      // Pending bookings: map to their first preferred slot
      if (booking.status === 'pending' && booking.slot_id) {
        if (slotBookingsMap[booking.slot_id]) {
          slotBookingsMap[booking.slot_id].push({
            booking_id: booking.id,
            creator_name: booking.creator_name,
            creator_phone: booking.creator_phone,
            creator_email: booking.creator_email,
            status: booking.status,
            created_at: booking.created_at
          })
        }
      }
    }

    // Build response
    const result = slots.map(slot => ({
      id: slot.id,
      date: slot.slot_date,
      time: slot.slot_time,
      duration_minutes: slot.duration_minutes,
      is_blocked: slot.is_blocked,
      block_reason: slot.block_reason,
      current_bookings: slot.current_bookings,
      max_bookings: slot.max_bookings,
      bookings: slotBookingsMap[slot.id] || []
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, slots: result, pendingBookings: pendingInMonth })
    }

  } catch (error) {
    console.error('[get-meeting-slots] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-meeting-slots',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
