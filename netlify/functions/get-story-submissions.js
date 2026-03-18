/**
 * 스토리 숏폼 제출 목록 조회
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const { campaign_id, status } = event.queryStringParameters || {}

    if (!campaign_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'campaign_id is required' })
      }
    }

    let query = supabaseBiz
      .from('story_submissions')
      .select('*')
      .eq('campaign_id', campaign_id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    }
  } catch (error) {
    console.error('[get-story-submissions] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-story-submissions',
          errorMessage: error.message,
          context: { campaign_id: event.queryStringParameters?.campaign_id }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
