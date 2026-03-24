const { getBizClient, handleOptions, successResponse, errorResponse } = require('./lib/supabase')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions()

  try {
    const supabase = getBizClient()
    const { action, bot_type, page = 1, search, filter, id, reply_text } = JSON.parse(event.body || '{}')
    const limit = 20
    const offset = (page - 1) * limit

    if (action === 'list') {
      let query = supabase.from('kakao_bot_processed')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (bot_type) query = query.eq('bot_type', bot_type)
      if (filter === 'replied') query = query.eq('replied', true).eq('escalated', false)
      if (filter === 'escalated') query = query.eq('escalated', true)
      if (search) query = query.or(`chat_name.ilike.%${search}%,last_message.ilike.%${search}%`)

      const { data, count, error } = await query
      if (error) throw error
      return successResponse({ items: data || [], total: count || 0 })
    }

    if (action === 'update') {
      const { data, error } = await supabase.from('kakao_bot_processed')
        .update({ reply_text, replied: true, escalated: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return successResponse({ item: data })
    }

    return errorResponse(400, 'Unknown action')
  } catch (err) {
    console.error('[chatbot-reply-history] Error:', err)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatbot-reply-history',
          errorMessage: err.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return errorResponse(500, err.message)
  }
}
