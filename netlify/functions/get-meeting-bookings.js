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
    const { date, from, to, status, search, limit, offset } = params

    let query = supabase
      .from('meeting_bookings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Search filter (name or phone)
    if (search) {
      query = query.or(`creator_name.ilike.%${search}%,creator_phone.ilike.%${search}%`)
    }

    // Pagination
    if (limit) {
      const l = parseInt(limit)
      const o = parseInt(offset || '0')
      query = query.range(o, o + l - 1)
    }

    if (date) {
      // Fetch bookings for a specific date
      // Check preferred_slots JSONB for matching date, or confirmed slot date
      const { data: slotsForDate, error: slotErr } = await supabase
        .from('meeting_slots')
        .select('id')
        .eq('slot_date', date)

      if (slotErr) throw slotErr

      const slotIds = (slotsForDate || []).map(s => s.id)

      if (slotIds.length > 0) {
        // Get bookings linked to these slots (via slot_id or confirmed_slot_id)
        // Also get pending bookings with preferred_slots matching this date
        const { data: linkedBookings, error: linkedErr } = await supabase
          .from('meeting_bookings')
          .select('*')
          .or(`slot_id.in.(${slotIds.join(',')}),confirmed_slot_id.in.(${slotIds.join(',')})`)
          .order('created_at', { ascending: false })

        if (linkedErr) throw linkedErr

        // Also find pending bookings with preferred_slots containing this date
        const { data: allPending, error: pendingErr } = await supabase
          .from('meeting_bookings')
          .select('*')
          .eq('status', 'pending')

        if (pendingErr) throw pendingErr

        const pendingForDate = (allPending || []).filter(b => {
          if (!b.preferred_slots) return false
          return b.preferred_slots.some(ps => ps.date === date)
        })

        // Merge without duplicates
        const mergedMap = new Map()
        for (const b of (linkedBookings || [])) mergedMap.set(b.id, b)
        for (const b of pendingForDate) mergedMap.set(b.id, b)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, bookings: Array.from(mergedMap.values()) })
        }
      } else {
        // No slots for this date, but check pending bookings with preferred_slots
        const { data: allPending, error: pendingErr } = await supabase
          .from('meeting_bookings')
          .select('*')
          .eq('status', 'pending')

        if (pendingErr) throw pendingErr

        const pendingForDate = (allPending || []).filter(b => {
          if (!b.preferred_slots) return false
          return b.preferred_slots.some(ps => ps.date === date)
        })

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, bookings: pendingForDate })
        }
      }
    }

    if (from && to) {
      // Fetch bookings in a date range based on confirmed slots
      const { data: slotsInRange, error: slotErr } = await supabase
        .from('meeting_slots')
        .select('id')
        .gte('slot_date', from)
        .lte('slot_date', to)

      if (slotErr) throw slotErr

      const slotIds = (slotsInRange || []).map(s => s.id)

      if (slotIds.length > 0) {
        const { data: bookings, error: bookErr } = await supabase
          .from('meeting_bookings')
          .select('*')
          .or(`slot_id.in.(${slotIds.join(',')}),confirmed_slot_id.in.(${slotIds.join(',')})`)
          .order('created_at', { ascending: false })

        if (bookErr) throw bookErr

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, bookings: bookings || [] })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, bookings: [] })
      }
    }

    // Default: return all bookings (with filters applied above)
    const { data: bookings, error, count } = await query

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, bookings: bookings || [], total: count })
    }

  } catch (error) {
    console.error('[get-meeting-bookings] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-meeting-bookings',
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
