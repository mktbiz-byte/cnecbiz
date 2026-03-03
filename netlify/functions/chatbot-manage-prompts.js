/**
 * 챗봇 AI 프롬프트 관리 (CRUD + 버전 관리)
 *
 * POST body: {
 *   action: 'list' | 'get_active' | 'create' | 'update' | 'activate' | 'versions',
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
      target_table: 'chatbot_prompts',
      target_id: targetId,
      details
    })
  } catch (e) {
    console.error('[chatbot-manage-prompts] Audit log failed:', e.message)
  }
}

async function listPrompts({ bot_type }) {
  const { data, error } = await supabase
    .from('chatbot_prompts')
    .select('*')
    .eq('bot_type', bot_type)
    .order('version', { ascending: false })

  if (error) throw error
  return data
}

async function getActivePrompt({ bot_type }) {
  const { data, error } = await supabase
    .from('chatbot_prompts')
    .select('*')
    .eq('bot_type', bot_type)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

async function createPrompt({ bot_type, system_prompt, tone_config, guardrails }, adminEmail) {
  // 현재 최대 버전 조회
  const { data: existing } = await supabase
    .from('chatbot_prompts')
    .select('version')
    .eq('bot_type', bot_type)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = (existing && existing.length > 0) ? existing[0].version + 1 : 1

  // 기존 활성 프롬프트 비활성화
  await supabase
    .from('chatbot_prompts')
    .update({ is_active: false })
    .eq('bot_type', bot_type)
    .eq('is_active', true)

  const { data, error } = await supabase
    .from('chatbot_prompts')
    .insert({
      bot_type,
      system_prompt,
      tone_config: tone_config || {},
      guardrails: guardrails || [],
      version: nextVersion,
      is_active: true
    })
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'create', data.id, { version: nextVersion })
  return data
}

async function updatePrompt({ id, system_prompt, tone_config, guardrails }, adminEmail) {
  const updates = {}
  if (system_prompt !== undefined) updates.system_prompt = system_prompt
  if (tone_config !== undefined) updates.tone_config = tone_config
  if (guardrails !== undefined) updates.guardrails = guardrails

  const { data, error } = await supabase
    .from('chatbot_prompts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'update', id, updates)
  return data
}

async function activatePrompt({ id, bot_type }, adminEmail) {
  // 기존 활성 프롬프트 비활성화
  await supabase
    .from('chatbot_prompts')
    .update({ is_active: false })
    .eq('bot_type', bot_type)
    .eq('is_active', true)

  // 선택한 프롬프트 활성화
  const { data, error } = await supabase
    .from('chatbot_prompts')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await logAudit(adminEmail, 'activate', id, { bot_type })
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
      case 'list': result = await listPrompts(params); break
      case 'get_active': result = await getActivePrompt(params); break
      case 'create': result = await createPrompt(params, adminEmail); break
      case 'update': result = await updatePrompt(params, adminEmail); break
      case 'activate': result = await activatePrompt(params, adminEmail); break
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Unknown action: ${action}` }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: result }) }
  } catch (error) {
    console.error('[chatbot-manage-prompts] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-manage-prompts', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
