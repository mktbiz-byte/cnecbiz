/**
 * 스토리 숏폼 업로드 제출 (크리에이터 앱에서 호출)
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const {
      campaign_id, creator_id, proposal_id,
      story_url, screenshot_url, clean_video_url,
      has_link, has_tag
    } = JSON.parse(event.body)

    if (!campaign_id || !creator_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'campaign_id and creator_id are required' })
      }
    }

    if (!screenshot_url || !clean_video_url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '스크린샷과 클린본 영상을 모두 업로드해주세요.' })
      }
    }

    const { data, error } = await supabaseBiz
      .from('story_submissions')
      .insert([{
        campaign_id,
        creator_id,
        proposal_id: proposal_id || null,
        story_url: story_url || null,
        screenshot_url,
        clean_video_url,
        has_link: has_link || false,
        has_tag: has_tag || false,
        status: 'pending',
        posted_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    }
  } catch (error) {
    console.error('[submit-story-upload] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'submit-story-upload',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
