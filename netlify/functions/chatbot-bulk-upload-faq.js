/**
 * 챗봇 FAQ 일괄 업로드 (JSON 배열)
 *
 * POST body: {
 *   bot_type: 'creator' | 'business',
 *   items: [{ category, question, answer, keywords?, confidence? }],
 *   adminEmail: string
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
    const { bot_type, items, adminEmail } = JSON.parse(event.body)

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '업로드할 항목이 없습니다.' }) }
    }

    if (items.length > 500) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '한 번에 최대 500개까지 업로드 가능합니다.' }) }
    }

    const rows = items.map((item, idx) => ({
      bot_type,
      category: item.category || '미분류',
      question: item.question,
      answer: item.answer,
      keywords: Array.isArray(item.keywords) ? item.keywords : (item.keywords ? item.keywords.split(',').map(k => k.trim()) : []),
      confidence: item.confidence || 1.0,
      sort_order: idx
    })).filter(r => r.question && r.answer)

    const { data, error } = await supabase
      .from('chatbot_faq')
      .insert(rows)
      .select()

    if (error) throw error

    // 감사 로그
    await supabase.from('chatbot_audit_logs').insert({
      admin_email: adminEmail,
      action: 'bulk_upload',
      target_table: 'chatbot_faq',
      details: { bot_type, count: data.length }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: { uploaded: data.length, skipped: items.length - rows.length } })
    }
  } catch (error) {
    console.error('[chatbot-bulk-upload-faq] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-bulk-upload-faq', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
