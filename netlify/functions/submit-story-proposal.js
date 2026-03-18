/**
 * 스토리 숏폼 기획안 제출 (크리에이터 앱에서 호출)
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const { campaign_id, creator_id, video_concept, tone_mood, description, secondary_use_agreed } = JSON.parse(event.body)

    if (!campaign_id || !creator_id || !video_concept) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'campaign_id, creator_id, video_concept are required' })
      }
    }

    if (!secondary_use_agreed) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '2차 활용 동의가 필요합니다.' })
      }
    }

    const { data, error } = await supabaseBiz
      .from('story_proposals')
      .insert([{
        campaign_id,
        creator_id,
        video_concept,
        tone_mood: tone_mood || null,
        description: description || null,
        secondary_use_agreed,
        status: 'submitted'
      }])
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    }
  } catch (error) {
    console.error('[submit-story-proposal] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'submit-story-proposal',
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
