/**
 * 스토리 숏폼 검수 승인/반려 (관리자용)
 * 승인 시 크리에이터 포인트 적립 (30,000P)
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const { submission_id, action, admin_note, reviewed_by } = JSON.parse(event.body)

    if (!submission_id || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'submission_id and action are required' })
      }
    }

    if (!['approve', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'action must be approve or reject' })
      }
    }

    // 제출 정보 조회
    const { data: submission, error: fetchError } = await supabaseBiz
      .from('story_submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (fetchError) throw fetchError
    if (!submission) throw new Error('제출 정보를 찾을 수 없습니다.')

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      admin_note: admin_note || null,
      reviewed_by: reviewed_by || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseBiz
      .from('story_submissions')
      .update(updateData)
      .eq('id', submission_id)
      .select()
      .single()

    if (error) throw error

    // 승인 시 포인트 적립 (30,000P)
    if (action === 'approve') {
      try {
        // points 테이블에 적립 기록 추가 (BIZ DB)
        await supabaseBiz
          .from('points')
          .insert([{
            user_id: submission.creator_id,
            amount: 30000,
            type: 'earn',
            description: '스토리 숏폼 검수 승인',
            reference_type: 'story_submission',
            reference_id: submission_id,
            campaign_id: submission.campaign_id
          }])
      } catch (pointError) {
        console.error('[review-story-submission] Point insertion failed:', pointError)
        // 포인트 적립 실패해도 승인은 유지
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    }
  } catch (error) {
    console.error('[review-story-submission] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'review-story-submission',
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
