/**
 * 캠페인별 성과 지표 조회
 * text_submissions / story_submissions JOIN으로 크리에이터 정보 포함
 */
const { getBizClient, CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const { campaign_id, submission_type } = event.queryStringParameters || {}

    if (!campaign_id) {
      return errorResponse(400, 'campaign_id is required')
    }

    const supabase = getBizClient()

    // 1. 해당 캠페인의 제출물 ID 목록 조회
    let submissionIds = { text: [], story: [] }

    if (!submission_type || submission_type === 'text') {
      const { data: textSubs } = await supabase
        .from('text_submissions')
        .select('id, creator_id, platform, post_url, status')
        .eq('campaign_id', campaign_id)
      if (textSubs) submissionIds.text = textSubs
    }

    if (!submission_type || submission_type === 'story') {
      const { data: storySubs } = await supabase
        .from('story_submissions')
        .select('id, creator_id, status')
        .eq('campaign_id', campaign_id)
      if (storySubs) submissionIds.story = storySubs
    }

    // 2. 성과 지표 조회
    const textIds = submissionIds.text.map(s => s.id)
    const storyIds = submissionIds.story.map(s => s.id)

    let metrics = []

    if (textIds.length > 0) {
      const { data } = await supabase
        .from('campaign_post_metrics')
        .select('*')
        .in('text_submission_id', textIds)
      if (data) metrics = [...metrics, ...data]
    }

    if (storyIds.length > 0) {
      const { data } = await supabase
        .from('campaign_post_metrics')
        .select('*')
        .in('story_submission_id', storyIds)
      if (data) metrics = [...metrics, ...data]
    }

    // 3. 크리에이터 ID → 제출물 매핑
    const submissionMap = {}
    submissionIds.text.forEach(s => { submissionMap[s.id] = { ...s, type: 'text' } })
    submissionIds.story.forEach(s => { submissionMap[s.id] = { ...s, type: 'story' } })

    // 4. 합계 계산
    const totals = {
      views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0,
      impressions: 0, bookmarks: 0, reach: 0, link_clicks: 0,
      cnec_shop_visits: 0, shop_revenue: 0, sticker_taps: 0, reply_count: 0
    }

    metrics.forEach(m => {
      Object.keys(totals).forEach(key => {
        totals[key] += Number(m[key]) || 0
      })
    })

    return successResponse({
      success: true,
      data: {
        metrics,
        submissions: submissionMap,
        totals
      }
    })
  } catch (error) {
    console.error('[get-post-metrics] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-post-metrics',
          errorMessage: error.message,
          context: { campaign_id: event.queryStringParameters?.campaign_id }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return errorResponse(500, error.message)
  }
}
