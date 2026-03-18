/**
 * 스토리 숏폼 기획안 승인/반려 (관리자용)
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const { proposal_id, action, reject_reason, reviewed_by } = JSON.parse(event.body)

    if (!proposal_id || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'proposal_id and action are required' })
      }
    }

    if (!['approve', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'action must be approve or reject' })
      }
    }

    if (action === 'reject' && !reject_reason) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: '반려 사유를 입력해주세요.' })
      }
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: reviewed_by || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (action === 'reject') {
      updateData.reject_reason = reject_reason
    }

    const { data, error } = await supabaseBiz
      .from('story_proposals')
      .update(updateData)
      .eq('id', proposal_id)
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    }
  } catch (error) {
    console.error('[review-story-proposal] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'review-story-proposal',
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
