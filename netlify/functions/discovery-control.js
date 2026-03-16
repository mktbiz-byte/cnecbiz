const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { action, ...params } = JSON.parse(event.body)

    switch (action) {
      case 'add_blocklist': {
        const { identifier, identifier_type, reason } = params
        if (!identifier) throw new Error('identifier는 필수입니다.')

        const { data, error } = await supabase
          .from('oc_global_blocklist')
          .upsert({
            identifier: identifier.toLowerCase().trim(),
            identifier_type: identifier_type || 'username',
            reason: reason || 'manual_block',
            source: 'admin_dashboard',
          }, { onConflict: 'identifier' })

        if (error) throw error
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '블랙리스트에 추가되었습니다.' }) }
      }

      case 'remove_blocklist': {
        const { id } = params
        if (!id) throw new Error('id는 필수입니다.')

        const { error } = await supabase
          .from('oc_global_blocklist')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '블랙리스트에서 제거되었습니다.' }) }
      }

      case 'toggle_special_target': {
        const { creator_id, is_special_target } = params
        if (!creator_id) throw new Error('creator_id는 필수입니다.')

        const { error } = await supabase
          .from('oc_creators')
          .update({ is_special_target: !!is_special_target })
          .eq('id', creator_id)

        if (error) throw error
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '특별 타겟 상태가 변경되었습니다.' }) }
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `알 수 없는 action: ${action}` }) }
    }

  } catch (error) {
    console.error('[discovery-control] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'discovery-control',
          errorMessage: error.message,
          context: { body: event.body }
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
