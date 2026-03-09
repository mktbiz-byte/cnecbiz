const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { booking_id, action, confirmed_slot_id, admin_memo } = JSON.parse(event.body)

    if (!booking_id || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'booking_id and action are required' })
      }
    }

    const validActions = ['confirm', 'reject', 'complete', 'cancel', 'no_show']
    if (!validActions.includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` })
      }
    }

    // Fetch current booking
    const { data: booking, error: fetchErr } = await supabase
      .from('meeting_bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (fetchErr || !booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '예약을 찾을 수 없습니다' })
      }
    }

    const updateData = { updated_at: new Date().toISOString() }
    if (admin_memo !== undefined) {
      updateData.admin_memo = admin_memo
    }

    switch (action) {
      case 'confirm': {
        if (!confirmed_slot_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'confirmed_slot_id is required for confirm action' })
          }
        }

        updateData.status = 'confirmed'
        updateData.confirmed_slot_id = confirmed_slot_id

        // Increment current_bookings on the slot
        const { data: slot, error: slotErr } = await supabase
          .from('meeting_slots')
          .select('current_bookings, max_bookings')
          .eq('id', confirmed_slot_id)
          .single()

        if (slotErr || !slot) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: '슬롯을 찾을 수 없습니다' })
          }
        }

        if (slot.current_bookings >= slot.max_bookings) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '해당 슬롯의 최대 예약 수를 초과했습니다' })
          }
        }

        const { error: slotUpdateErr } = await supabase
          .from('meeting_slots')
          .update({ current_bookings: slot.current_bookings + 1, updated_at: new Date().toISOString() })
          .eq('id', confirmed_slot_id)

        if (slotUpdateErr) throw slotUpdateErr
        break
      }

      case 'reject': {
        updateData.status = 'cancelled'
        break
      }

      case 'complete': {
        updateData.status = 'completed'
        break
      }

      case 'cancel': {
        updateData.status = 'cancelled'

        // Decrement current_bookings if there was a confirmed slot
        if (booking.confirmed_slot_id) {
          const { data: slot, error: slotErr } = await supabase
            .from('meeting_slots')
            .select('current_bookings')
            .eq('id', booking.confirmed_slot_id)
            .single()

          if (!slotErr && slot && slot.current_bookings > 0) {
            await supabase
              .from('meeting_slots')
              .update({ current_bookings: slot.current_bookings - 1, updated_at: new Date().toISOString() })
              .eq('id', booking.confirmed_slot_id)
          }
        }

        updateData.confirmed_slot_id = null
        break
      }

      case 'no_show': {
        updateData.status = 'no_show'
        break
      }
    }

    // Update booking
    const { data: updated, error: updateErr } = await supabase
      .from('meeting_bookings')
      .update(updateData)
      .eq('id', booking_id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, booking: updated })
    }

  } catch (error) {
    console.error('[update-meeting-booking] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'update-meeting-booking',
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
