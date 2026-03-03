/**
 * 챗봇 학습 큐 조회 + 승인/거부 처리
 *
 * POST body: {
 *   action: 'list' | 'approve' | 'reject',
 *   bot_type?: 'creator' | 'business',
 *   id?: uuid,
 *   faq_data?: { category, question, answer, keywords },
 *   adminEmail?: string
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
    const { action = 'list', bot_type, id, faq_data, adminEmail, page = 1, limit = 30 } = JSON.parse(event.body)

    if (action === 'list') {
      let query = supabase
        .from('chatbot_learning_queue')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (bot_type) query = query.eq('bot_type', bot_type)

      const from = (page - 1) * limit
      query = query.range(from, from + limit - 1)

      const { data, error, count } = await query
      if (error) throw error

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { items: data, total: count } }) }
    }

    if (action === 'approve') {
      // 학습 항목 조회
      const { data: item, error: fetchErr } = await supabase
        .from('chatbot_learning_queue')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      // FAQ에 추가 (관리자가 수정한 데이터 또는 원본)
      const faq = faq_data || item.source_data
      const { data: newFaq, error: faqErr } = await supabase
        .from('chatbot_faq')
        .insert({
          bot_type: item.bot_type,
          category: faq.category || '학습',
          question: faq.question,
          answer: faq.answer,
          keywords: faq.keywords || []
        })
        .select()
        .single()

      if (faqErr) throw faqErr

      // 학습 상태 업데이트
      await supabase
        .from('chatbot_learning_queue')
        .update({
          status: 'approved',
          reviewed_by: adminEmail,
          reviewed_at: new Date().toISOString(),
          result: { faq_id: newFaq.id }
        })
        .eq('id', id)

      // 감사 로그
      await supabase.from('chatbot_audit_logs').insert({
        admin_email: adminEmail,
        action: 'approve_learning',
        target_table: 'chatbot_learning_queue',
        target_id: id,
        details: { new_faq_id: newFaq.id, question: faq.question }
      })

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { approved: true, faq: newFaq } }) }
    }

    if (action === 'reject') {
      await supabase
        .from('chatbot_learning_queue')
        .update({
          status: 'rejected',
          reviewed_by: adminEmail,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { rejected: true } }) }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Unknown action: ${action}` }) }
  } catch (error) {
    console.error('[chatbot-learning-review] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-learning-review', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
