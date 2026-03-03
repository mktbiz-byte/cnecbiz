/**
 * 챗봇 대화 로그 검색/조회
 *
 * POST body: {
 *   action: 'list' | 'detail',
 *   bot_type?: 'creator' | 'business',
 *   search?: string,
 *   date_from?: string,
 *   date_to?: string,
 *   page?: number,
 *   limit?: number,
 *   id?: string (detail용)
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
    const { action = 'list', bot_type, search, date_from, date_to, page = 1, limit = 30, id } = JSON.parse(event.body)

    if (action === 'detail' && id) {
      const { data, error } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data }) }
    }

    // 목록 조회
    let query = supabase
      .from('chatbot_conversations')
      .select('id, kakao_user_key, bot_type, session_id, total_messages, satisfaction_rating, started_at, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (bot_type) query = query.eq('bot_type', bot_type)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to)

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
    console.error('[chatbot-conversation-logs] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
