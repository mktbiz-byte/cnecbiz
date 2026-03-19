const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const body = JSON.parse(event.body)
    const { action } = body

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'action is required' })
      }
    }

    switch (action) {
      case 'generate': {
        const { date_from, date_to, times, weekdays } = body

        if (!date_from || !date_to || !times || !weekdays) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'date_from, date_to, times, weekdays are required' })
          }
        }

        // Generate slot records for each date × time × weekday combination
        const slotsToInsert = []
        const start = new Date(date_from)
        const end = new Date(date_to)

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay() // 0=Sun, 6=Sat
          if (!weekdays.includes(dayOfWeek)) continue

          const dateStr = d.toISOString().split('T')[0]
          for (const time of times) {
            slotsToInsert.push({
              slot_date: dateStr,
              slot_time: time
            })
          }
        }

        if (slotsToInsert.length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, created: 0, message: '생성할 슬롯이 없습니다' })
          }
        }

        // Upsert with ON CONFLICT DO NOTHING
        const { data: inserted, error: insertErr } = await supabase
          .from('meeting_slots')
          .upsert(slotsToInsert, { onConflict: 'slot_date,slot_time', ignoreDuplicates: true })
          .select()

        if (insertErr) throw insertErr

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            created: (inserted || []).length,
            message: `${(inserted || []).length}개 슬롯이 생성되었습니다`
          })
        }
      }

      case 'block': {
        const { slot_ids, dates, reason } = body

        if (!slot_ids && !dates) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'slot_ids or dates required' })
          }
        }

        let targetSlotIds = slot_ids || []

        // If dates provided, find all slots for those dates
        if (dates && dates.length > 0) {
          const { data: slotsForDates, error: fetchErr } = await supabase
            .from('meeting_slots')
            .select('id')
            .in('slot_date', dates)

          if (fetchErr) throw fetchErr
          targetSlotIds = [...targetSlotIds, ...(slotsForDates || []).map(s => s.id)]
        }

        if (targetSlotIds.length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, blocked: 0, message: '블락할 슬롯이 없습니다' })
          }
        }

        // Check for existing bookings on these slots
        const { data: existingBookings, error: bookErr } = await supabase
          .from('meeting_bookings')
          .select('id, slot_id, confirmed_slot_id, status')
          .or(`slot_id.in.(${targetSlotIds.join(',')}),confirmed_slot_id.in.(${targetSlotIds.join(',')})`)
          .in('status', ['pending', 'confirmed'])

        const activeBookingCount = (existingBookings || []).length

        // Block the slots
        const { error: blockErr } = await supabase
          .from('meeting_slots')
          .update({
            is_blocked: true,
            block_reason: reason || null,
            updated_at: new Date().toISOString()
          })
          .in('id', targetSlotIds)

        if (blockErr) throw blockErr

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            blocked: targetSlotIds.length,
            active_bookings: activeBookingCount,
            message: `${targetSlotIds.length}개 슬롯이 블락되었습니다${activeBookingCount > 0 ? ` (활성 예약 ${activeBookingCount}건 있음)` : ''}`
          })
        }
      }

      case 'unblock': {
        const { slot_ids } = body

        if (!slot_ids || slot_ids.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'slot_ids required' })
          }
        }

        const { error: unblockErr } = await supabase
          .from('meeting_slots')
          .update({
            is_blocked: false,
            block_reason: null,
            updated_at: new Date().toISOString()
          })
          .in('id', slot_ids)

        if (unblockErr) throw unblockErr

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            unblocked: slot_ids.length,
            message: `${slot_ids.length}개 슬롯이 해제되었습니다`
          })
        }
      }

      case 'delete': {
        const { slot_ids } = body

        if (!slot_ids || slot_ids.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'slot_ids required' })
          }
        }

        // Check for active bookings
        const { data: activeBookings, error: checkErr } = await supabase
          .from('meeting_bookings')
          .select('id')
          .or(`confirmed_slot_id.in.(${slot_ids.join(',')}),slot_id.in.(${slot_ids.join(',')})`)
          .in('status', ['pending', 'confirmed'])

        if (checkErr) throw checkErr

        if ((activeBookings || []).length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: `예약이 있는 슬롯은 삭제할 수 없습니다 (${activeBookings.length}건)` })
          }
        }

        const { error: deleteErr } = await supabase
          .from('meeting_slots')
          .delete()
          .in('id', slot_ids)

        if (deleteErr) throw deleteErr

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            deleted: slot_ids.length,
            message: `${slot_ids.length}개 슬롯이 삭제되었습니다`
          })
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
        }
    }

  } catch (error) {
    console.error('[manage-meeting-slots] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'manage-meeting-slots',
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
