/**
 * 챗봇 사용자 본인 확인 (카카오 user_key ↔ 크넥 계정 연동)
 * 멀티-리전 DB 순회하여 크리에이터/기업 매칭
 *
 * POST body: {
 *   kakao_user_key: string,
 *   name: string,
 *   email: string,
 *   user_type: 'creator' | 'company'
 * }
 *
 * Headers: { 'X-Chatbot-API-Key': CHATBOT_API_SECRET }
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Chatbot-API-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function createRegionalClient(url, key) {
  if (!url || !key) return null
  return createClient(url, key)
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // API 키 검증
  const apiKey = event.headers['x-chatbot-api-key']
  if (process.env.CHATBOT_API_SECRET && apiKey !== process.env.CHATBOT_API_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  }

  try {
    const { kakao_user_key, name, email, user_type = 'creator' } = JSON.parse(event.body)

    if (!kakao_user_key || !name || !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '이름과 이메일을 모두 입력해 주세요.' }) }
    }

    // 이미 연동된 계정 확인
    const { data: existing } = await supabaseBiz
      .from('chatbot_user_links')
      .select('*')
      .eq('kakao_user_key', kakao_user_key)
      .single()

    if (existing) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: { already_linked: true, link: existing } })
      }
    }

    // 기업 계정 매칭 (BIZ DB only)
    if (user_type === 'company') {
      const { data: company } = await supabaseBiz
        .from('companies')
        .select('id, company_name, email')
        .ilike('email', email)
        .single()

      if (company) {
        const { data: link, error } = await supabaseBiz
          .from('chatbot_user_links')
          .insert({
            kakao_user_key,
            user_type: 'company',
            user_id: company.id,
            region: 'biz',
            display_name: company.company_name
          })
          .select()
          .single()

        if (error) throw error
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { verified: true, link } }) }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '일치하는 기업 계정을 찾을 수 없습니다. 이름과 이메일을 확인해 주세요.' }) }
    }

    // 크리에이터 매칭 (멀티-리전 순회)
    const regionalClients = [
      { name: 'korea', client: createRegionalClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY) },
      { name: 'japan', client: createRegionalClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY) },
      { name: 'us', client: createRegionalClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY) },
      { name: 'biz', client: supabaseBiz }
    ].filter(r => r.client)

    for (const region of regionalClients) {
      const { data: creator } = await region.client
        .from('creators')
        .select('id, name, email')
        .ilike('email', email)
        .single()

      if (creator && creator.name && creator.name.trim().toLowerCase() === name.trim().toLowerCase()) {
        const { data: link, error } = await supabaseBiz
          .from('chatbot_user_links')
          .insert({
            kakao_user_key,
            user_type: 'creator',
            user_id: creator.id,
            region: region.name,
            display_name: creator.name
          })
          .select()
          .single()

        if (error) throw error
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { verified: true, link } }) }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, error: '일치하는 크리에이터 계정을 찾을 수 없습니다. 크넥에 가입하신 이름과 이메일을 정확히 입력해 주세요.' })
    }
  } catch (error) {
    console.error('[chatbot-verify-user] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-verify-user', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
