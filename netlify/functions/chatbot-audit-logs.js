/**
 * 챗봇 감사 로그 조회
 *
 * POST body: {
 *   target_table?: string,
 *   admin_email?: string,
 *   page?: number,
 *   limit?: number
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
    const { target_table, admin_email, page = 1, limit = 50 } = JSON.parse(event.body)

    let query = supabase
      .from('chatbot_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (target_table) query = query.eq('target_table', target_table)
    if (admin_email) query = query.eq('admin_email', admin_email)

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: { items: data, total: count } })
    }
  } catch (error) {
    console.error('[chatbot-audit-logs] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
