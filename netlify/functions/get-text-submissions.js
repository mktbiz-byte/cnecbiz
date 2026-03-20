/**
 * 텍스트 포스트 제출물 조회 (스레드/X)
 */
const { getBizClient, CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const { campaign_id, status } = event.queryStringParameters || {}

    if (!campaign_id) {
      return errorResponse(400, 'campaign_id is required')
    }

    const supabase = getBizClient()

    let query = supabase
      .from('text_submissions')
      .select('*')
      .eq('campaign_id', campaign_id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return successResponse({ success: true, data })
  } catch (error) {
    console.error('[get-text-submissions] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-text-submissions',
          errorMessage: error.message,
          context: { campaign_id: event.queryStringParameters?.campaign_id }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return errorResponse(500, error.message)
  }
}
