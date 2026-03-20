/**
 * 캠페인 성과 지표 저장 (UPSERT)
 * 스레드/X + 스토리 + 영상 공용
 */
const { getBizClient, CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const body = JSON.parse(event.body)
    const {
      id,
      submission_type,
      text_submission_id,
      story_submission_id,
      video_submission_id,
      // 공통
      views, likes,
      // 텍스트 전용
      replies, reposts, quotes, impressions, bookmarks,
      // 스토리 전용
      reach, tap_forward_rate, exit_rate, reply_count, sticker_taps,
      // 전환
      link_clicks, cnec_shop_visits, shop_revenue,
      // 메타
      measurement_method, evidence_screenshot_url
    } = body

    if (!submission_type) {
      return errorResponse(400, 'submission_type is required')
    }

    const supabase = getBizClient()

    const metricsData = {
      submission_type,
      text_submission_id: text_submission_id || null,
      story_submission_id: story_submission_id || null,
      video_submission_id: video_submission_id || null,
      views: views || 0,
      likes: likes || 0,
      replies: replies || 0,
      reposts: reposts || 0,
      quotes: quotes || 0,
      impressions: impressions || 0,
      bookmarks: bookmarks || 0,
      reach: reach || 0,
      tap_forward_rate: tap_forward_rate || 0,
      exit_rate: exit_rate || 0,
      reply_count: reply_count || 0,
      sticker_taps: sticker_taps || 0,
      link_clicks: link_clicks || 0,
      cnec_shop_visits: cnec_shop_visits || 0,
      shop_revenue: shop_revenue || 0,
      measurement_method: measurement_method || 'manual',
      evidence_screenshot_url: evidence_screenshot_url || null,
      measured_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let result
    if (id) {
      // UPDATE
      const { data, error } = await supabase
        .from('campaign_post_metrics')
        .update(metricsData)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('campaign_post_metrics')
        .insert([metricsData])
        .select()
        .single()
      if (error) throw error
      result = data
    }

    return successResponse({ success: true, data: result })
  } catch (error) {
    console.error('[save-post-metrics] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'save-post-metrics',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return errorResponse(500, error.message)
  }
}
