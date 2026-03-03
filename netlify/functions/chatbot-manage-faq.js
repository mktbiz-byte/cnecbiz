/**
 * 챗봇 FAQ 관리 (CRUD + 토글)
 *
 * POST body: {
 *   action: 'list' | 'create' | 'update' | 'delete' | 'toggle',
 *   bot_type: 'creator' | 'business',
 *   // list: { category?, search?, page?, limit? }
 *   // create/update: { id?, category, question, answer, keywords, confidence, sort_order }
 *   // delete/toggle: { id }
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

async function logAudit(adminEmail, action, targetId, details) {
  try {
    await supabase.from('chatbot_audit_logs').insert({
      admin_email: adminEmail,
      action,
      target_table: 'chatbot_faq',
      target_id: targetId,
      details
    })
  } catch (e) {
    console.error('[chatbot-manage-faq] Audit log failed:', e.message)
  }
}

async function listFaqs({ bot_type, category, search, page = 1, limit = 50 }) {
  let query = supabase
    .from('chatbot_faq')
    .select('*', { count: 'exact' })
    .eq('bot_type', bot_type)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }
  if (search) {
    query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`)
  }

  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query
  if (error) throw error

  // 카테고리 목록도 함께 반환
  const { data: categories } = await supabase
    .from('chatbot_faq')
    .select('category')
    .eq('bot_type', bot_type)

  const uniqueCategories = [...new Set((categories || []).map(c => c.category))].sort()

  return { items: data, total: count, categories: uniqueCategories }
}

async function createFaq({ bot_type, category, question, answer, keywords, confidence, sort_order }, adminEmail) {
  const { data, error } = await supabase
    .from('chatbot_faq')
    .insert({
      bot_type,
      category,
      question,
      answer,
      keywords: keywords || [],
      confidence: confidence || 1.0,
      sort_order: sort_order || 0
    })
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'create', data.id, { question, category })
  return data
}

async function updateFaq({ id, ...updates }, adminEmail) {
  const { data, error } = await supabase
    .from('chatbot_faq')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'update', id, updates)
  return data
}

async function deleteFaq({ id }, adminEmail) {
  const { error } = await supabase
    .from('chatbot_faq')
    .delete()
    .eq('id', id)

  if (error) throw error
  await logAudit(adminEmail, 'delete', id, {})
  return { deleted: true }
}

async function toggleFaq({ id }, adminEmail) {
  const { data: current, error: fetchError } = await supabase
    .from('chatbot_faq')
    .select('is_active')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('chatbot_faq')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'update', id, { is_active: !current.is_active })
  return data
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { action, adminEmail, ...params } = JSON.parse(event.body)

    let result
    switch (action) {
      case 'list':
        result = await listFaqs(params)
        break
      case 'create':
        result = await createFaq(params, adminEmail)
        break
      case 'update':
        result = await updateFaq(params, adminEmail)
        break
      case 'delete':
        result = await deleteFaq(params, adminEmail)
        break
      case 'toggle':
        result = await toggleFaq(params, adminEmail)
        break
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
        }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result })
    }
  } catch (error) {
    console.error('[chatbot-manage-faq] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatbot-manage-faq',
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
