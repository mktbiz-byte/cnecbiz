const { createClient } = require('@supabase/supabase-js')

/**
 * Twilio WhatsApp Status Callback Webhook
 *
 * Twilio sends form-urlencoded POST requests when WhatsApp message status changes.
 * Updates whatsapp_logs and notification_send_logs with delivery status.
 *
 * Status flow: queued → sent → delivered → read (or failed/undelivered)
 */

const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    // Twilio sends form-urlencoded data
    const params = new URLSearchParams(event.body)
    const messageSid = params.get('MessageSid')
    const messageStatus = params.get('MessageStatus')
    const to = params.get('To')
    const errorCode = params.get('ErrorCode')
    const errorMessage = params.get('ErrorMessage')

    if (!messageSid || !messageStatus) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing MessageSid or MessageStatus' })
      }
    }

    console.log(`[whatsapp-status-callback] ${messageSid}: ${messageStatus}`, {
      to, errorCode, errorMessage
    })

    const supabase = getSupabase()

    // whatsapp_logs 테이블 업데이트
    const updateData = {
      status: messageStatus,
      updated_at: new Date().toISOString()
    }
    if (errorCode) updateData.error_code = errorCode
    if (errorMessage) updateData.error_message = errorMessage

    const { error: logError } = await supabase
      .from('whatsapp_logs')
      .update(updateData)
      .eq('twilio_sid', messageSid)

    if (logError) {
      console.warn('[whatsapp-status-callback] whatsapp_logs update failed:', logError.message)
    }

    // notification_send_logs 업데이트 (최종 상태만 반영)
    if (['delivered', 'read', 'failed', 'undelivered'].includes(messageStatus)) {
      const finalStatus = ['delivered', 'read'].includes(messageStatus) ? 'success' : 'failed'
      try {
        // metadata에 twilio_sid가 있는 로그를 찾아 업데이트
        const { data: logs } = await supabase
          .from('notification_send_logs')
          .select('id')
          .eq('channel', 'whatsapp')
          .contains('metadata', { twilio_sid: messageSid })
          .limit(1)

        if (logs && logs.length > 0) {
          await supabase
            .from('notification_send_logs')
            .update({
              status: finalStatus,
              error_message: errorMessage || null,
              metadata: {
                twilio_sid: messageSid,
                final_status: messageStatus,
                error_code: errorCode || null
              }
            })
            .eq('id', logs[0].id)
        }
      } catch (e) {
        console.warn('[whatsapp-status-callback] notification_send_logs update failed:', e.message)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, messageSid, status: messageStatus })
    }

  } catch (error) {
    console.error('[whatsapp-status-callback] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'whatsapp-status-callback',
          errorMessage: error.message,
          context: { body: event.body?.substring(0, 500) }
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
