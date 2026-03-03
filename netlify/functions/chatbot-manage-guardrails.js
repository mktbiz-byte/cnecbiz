/**
 * 챗봇 기준틀(Guardrails) 관리 (CRUD + 변경 이력 자동 기록)
 *
 * POST body: {
 *   action: 'list' | 'create' | 'update' | 'delete' | 'toggle' | 'history' | 'rollback',
 *   bot_type: 'creator' | 'business',
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

async function logAudit(adminEmail, action, targetId, details) {
  try {
    await supabase.from('chatbot_audit_logs').insert({
      admin_email: adminEmail,
      action,
      target_table: 'chatbot_guardrails',
      target_id: targetId,
      details
    })
  } catch (e) {
    console.error('[chatbot-manage-guardrails] Audit log failed:', e.message)
  }
}

async function saveHistory(guardrailId, previousValue, newValue, changedBy) {
  try {
    await supabase.from('chatbot_guardrails_history').insert({
      guardrail_id: guardrailId,
      previous_value: previousValue,
      new_value: newValue,
      changed_by: changedBy
    })
  } catch (e) {
    console.error('[chatbot-manage-guardrails] History save failed:', e.message)
  }
}

async function listGuardrails({ bot_type, rule_type }) {
  let query = supabase
    .from('chatbot_guardrails')
    .select('*')
    .eq('bot_type', bot_type)
    .order('rule_type')
    .order('priority', { ascending: false })

  if (rule_type) {
    query = query.eq('rule_type', rule_type)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

async function createGuardrail({ bot_type, rule_type, rule_value, description, priority }, adminEmail) {
  const { data, error } = await supabase
    .from('chatbot_guardrails')
    .insert({ bot_type, rule_type, rule_value, description, priority: priority || 0 })
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'create', data.id, { rule_type, rule_value })
  return data
}

async function updateGuardrail({ id, ...updates }, adminEmail) {
  // 변경 전 데이터 조회
  const { data: before, error: fetchError } = await supabase
    .from('chatbot_guardrails')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('chatbot_guardrails')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // 변경 이력 저장
  await saveHistory(id, before, data, adminEmail)
  await logAudit(adminEmail, 'update', id, updates)
  return data
}

async function deleteGuardrail({ id }, adminEmail) {
  const { error } = await supabase
    .from('chatbot_guardrails')
    .delete()
    .eq('id', id)

  if (error) throw error
  await logAudit(adminEmail, 'delete', id, {})
  return { deleted: true }
}

async function toggleGuardrail({ id }, adminEmail) {
  const { data: current, error: fetchError } = await supabase
    .from('chatbot_guardrails')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('chatbot_guardrails')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  await saveHistory(id, current, data, adminEmail)
  await logAudit(adminEmail, 'update', id, { is_active: !current.is_active })
  return data
}

async function getHistory({ guardrail_id, limit = 20 }) {
  const { data, error } = await supabase
    .from('chatbot_guardrails_history')
    .select('*')
    .eq('guardrail_id', guardrail_id)
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

async function rollbackGuardrail({ guardrail_id, history_id }, adminEmail) {
  const { data: historyEntry, error: histError } = await supabase
    .from('chatbot_guardrails_history')
    .select('previous_value')
    .eq('id', history_id)
    .single()

  if (histError) throw histError

  const prev = historyEntry.previous_value
  const { data, error } = await supabase
    .from('chatbot_guardrails')
    .update({
      rule_value: prev.rule_value,
      description: prev.description,
      is_active: prev.is_active,
      priority: prev.priority
    })
    .eq('id', guardrail_id)
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'rollback', guardrail_id, { from_history: history_id })
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
      case 'list': result = await listGuardrails(params); break
      case 'create': result = await createGuardrail(params, adminEmail); break
      case 'update': result = await updateGuardrail(params, adminEmail); break
      case 'delete': result = await deleteGuardrail(params, adminEmail); break
      case 'toggle': result = await toggleGuardrail(params, adminEmail); break
      case 'history': result = await getHistory(params); break
      case 'rollback': result = await rollbackGuardrail(params, adminEmail); break
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Unknown action: ${action}` }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: result }) }
  } catch (error) {
    console.error('[chatbot-manage-guardrails] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-manage-guardrails', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
