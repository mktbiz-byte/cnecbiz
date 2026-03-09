const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    if (event.httpMethod === 'GET') {
      const { data: settings, error } = await supabase
        .from('meeting_settings')
        .select('setting_key, setting_value')

      if (error) throw error

      // Convert array to key-value object
      const settingsMap = {}
      for (const s of (settings || [])) {
        settingsMap[s.setting_key] = s.setting_value
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, settings: settingsMap })
      }
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body)
      const { settings } = body

      if (!settings || typeof settings !== 'object') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'settings object is required' })
        }
      }

      // Upsert each setting
      const upsertData = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: typeof value === 'string' ? JSON.parse(value) : value,
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('meeting_settings')
        .upsert(upsertData, { onConflict: 'setting_key' })

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '설정이 저장되었습니다' })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('[meeting-settings] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'meeting-settings',
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
