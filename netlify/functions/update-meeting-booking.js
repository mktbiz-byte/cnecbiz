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

    // 미팅 확정 시 네이버웍스 알림 발송
    if (action === 'confirm' && confirmed_slot_id) {
      try {
        const { data: confirmedSlot } = await supabase
          .from('meeting_slots')
          .select('slot_date, slot_time, duration_minutes')
          .eq('id', confirmed_slot_id)
          .single()

        if (confirmedSlot) {
          const slotDate = confirmedSlot.slot_date // YYYY-MM-DD
          const slotTime = confirmedSlot.slot_time?.substring(0, 5) // HH:MM
          const duration = confirmedSlot.duration_minutes || 30

          const message = [
            '📅 미팅 스케줄 확정',
            '',
            `• 크리에이터: ${updated.creator_name || '(이름 없음)'}`,
            updated.creator_email ? `• 이메일: ${updated.creator_email}` : null,
            updated.creator_phone ? `• 연락처: ${updated.creator_phone}` : null,
            `• 일시: ${slotDate} ${slotTime} (${duration}분)`,
            updated.youtube_url ? `• YouTube: ${updated.youtube_url}` : null,
            updated.instagram_url ? `• Instagram: ${updated.instagram_url}` : null,
            updated.admin_memo ? `• 메모: ${updated.admin_memo}` : null
          ].filter(Boolean).join('\n')

          const baseUrl = process.env.URL || 'https://cnecbiz.com'
          await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              message,
              channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
            })
          })
        }
      } catch (notifyErr) {
        console.error('[update-meeting-booking] Naver Works notification failed:', notifyErr.message)
      }
    }

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
