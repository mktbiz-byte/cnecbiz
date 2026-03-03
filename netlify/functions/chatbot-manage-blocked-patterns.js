/**
 * 챗봇 차단 패턴 관리 (프롬프트 인젝션 방어)
 *
 * POST body: {
 *   action: 'list' | 'create' | 'update' | 'delete' | 'toggle',
 *   ...params
 * }
 */

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

  try {
    const { action, adminEmail, ...params } = JSON.parse(event.body)
    let result

    switch (action) {
      case 'list': {
        let query = supabase.from('chatbot_blocked_patterns').select('*').order('created_at', { ascending: false })
        if (params.bot_type) query = query.eq('bot_type', params.bot_type)
        const { data, error } = await query
        if (error) throw error
        result = data
        break
      }
      case 'create': {
        const { data, error } = await supabase
          .from('chatbot_blocked_patterns')
          .insert({
            pattern: params.pattern,
            pattern_type: params.pattern_type || 'keyword',
            bot_type: params.bot_type || null,
            reason: params.reason
          })
          .select()
          .single()
        if (error) throw error
        await supabase.from('chatbot_audit_logs').insert({
          admin_email: adminEmail, action: 'create', target_table: 'chatbot_blocked_patterns',
          target_id: data.id, details: { pattern: params.pattern }
        })
        result = data
        break
      }
      case 'update': {
        const { id, ...updates } = params
        const { data, error } = await supabase
          .from('chatbot_blocked_patterns')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        result = data
        break
      }
      case 'delete': {
        const { error } = await supabase.from('chatbot_blocked_patterns').delete().eq('id', params.id)
        if (error) throw error
        result = { deleted: true }
        break
      }
      case 'toggle': {
        const { data: current, error: fetchErr } = await supabase
          .from('chatbot_blocked_patterns')
          .select('is_active')
          .eq('id', params.id)
          .single()
        if (fetchErr) throw fetchErr
        const { data, error } = await supabase
          .from('chatbot_blocked_patterns')
          .update({ is_active: !current.is_active })
          .eq('id', params.id)
          .select()
          .single()
        if (error) throw error
        result = data
        break
      }
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Unknown action: ${action}` }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: result }) }
  } catch (error) {
    console.error('[chatbot-manage-blocked-patterns] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-manage-blocked-patterns', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
