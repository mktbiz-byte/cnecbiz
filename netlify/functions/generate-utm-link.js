/**
 * 크넥샵 UTM 링크 생성
 */
const { CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const { product_url, campaign_id, creator_id } = JSON.parse(event.body)

    if (!product_url) {
      return errorResponse(400, 'product_url is required')
    }

    const url = new URL(product_url)
    url.searchParams.set('utm_source', 'instagram')
    url.searchParams.set('utm_medium', 'story')
    if (campaign_id) url.searchParams.set('utm_campaign', campaign_id)
    if (creator_id) url.searchParams.set('utm_content', creator_id)

    return successResponse({
      success: true,
      utm_link: url.toString()
    })
  } catch (error) {
    console.error('[generate-utm-link] Error:', error)
    return errorResponse(500, error.message)
  }
}
