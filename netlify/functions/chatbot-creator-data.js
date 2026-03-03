/**
 * 챗봇 크리에이터 데이터 조회 (안전한 데이터만)
 * 연동된 크리에이터의 캠페인/포인트/계약 정보 조회
 *
 * POST body: {
 *   kakao_user_key: string,
 *   data_type: 'summary' | 'campaigns' | 'points' | 'contracts'
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

function getRegionalClient(region) {
  const regionMap = {
    korea: { url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY },
    japan: { url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY },
    us: { url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY },
    biz: { url: process.env.VITE_SUPABASE_BIZ_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  }
  const config = regionMap[region]
  if (!config) return supabaseBiz
  return createRegionalClient(config.url, config.key) || supabaseBiz
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const apiKey = event.headers['x-chatbot-api-key']
  if (process.env.CHATBOT_API_SECRET && apiKey !== process.env.CHATBOT_API_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  }

  try {
    const { kakao_user_key, data_type = 'summary' } = JSON.parse(event.body)

    // 연동 확인
    const { data: link, error: linkError } = await supabaseBiz
      .from('chatbot_user_links')
      .select('*')
      .eq('kakao_user_key', kakao_user_key)
      .single()

    if (linkError || !link) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'not_linked', message: '연동된 계정이 없습니다.' }) }
    }

    const regionClient = getRegionalClient(link.region)
    const result = {}

    // 요약 또는 캠페인 조회
    if (data_type === 'summary' || data_type === 'campaigns') {
      const { data: applications } = await regionClient
        .from('applications')
        .select('id, campaign_id, status, created_at')
        .eq('creator_id', link.user_id)
        .order('created_at', { ascending: false })
        .limit(10)

      result.campaigns = (applications || []).map(app => ({
        campaign_id: app.campaign_id,
        status: app.status,
        applied_at: app.created_at
      }))
    }

    // 포인트 잔액
    if (data_type === 'summary' || data_type === 'points') {
      const { data: points } = await supabaseBiz
        .from('points')
        .select('amount, type, description, created_at')
        .eq('creator_id', link.user_id)
        .order('created_at', { ascending: false })
        .limit(20)

      const totalPoints = (points || []).reduce((sum, p) => sum + (p.amount || 0), 0)
      result.points = {
        balance: totalPoints,
        recent_history: (points || []).slice(0, 5).map(p => ({
          amount: p.amount,
          type: p.type,
          description: p.description,
          date: p.created_at
        }))
      }
    }

    // 계약 상태
    if (data_type === 'summary' || data_type === 'contracts') {
      const { data: contracts } = await supabaseBiz
        .from('contracts')
        .select('id, status, created_at')
        .eq('creator_id', link.user_id)
        .order('created_at', { ascending: false })
        .limit(5)

      result.contracts = (contracts || []).map(c => ({
        status: c.status,
        created_at: c.created_at
      }))
    }

    result.display_name = link.display_name
    result.user_type = link.user_type

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result })
    }
  } catch (error) {
    console.error('[chatbot-creator-data] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-creator-data', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
