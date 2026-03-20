/**
 * 텍스트 포스트 검수 승인/반려 (관리자용)
 * 승인 시 크리에이터 포인트 적립 (20,000P)
 */
const { getBizClient, CORS_HEADERS, handleOptions, successResponse, errorResponse } = require('./lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const { submission_id, action, admin_note, reviewed_by } = JSON.parse(event.body)

    if (!submission_id || !action) {
      return errorResponse(400, 'submission_id and action are required')
    }

    if (!['approve', 'reject', 'revision_requested'].includes(action)) {
      return errorResponse(400, 'action must be approve, reject, or revision_requested')
    }

    const supabase = getBizClient()

    // 제출 정보 조회
    const { data: submission, error: fetchError } = await supabase
      .from('text_submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (fetchError) throw fetchError
    if (!submission) throw new Error('제출 정보를 찾을 수 없습니다.')

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      revision_requested: 'revision_requested'
    }

    const updateData = {
      status: statusMap[action],
      admin_note: admin_note || null,
      reviewed_by: reviewed_by || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('text_submissions')
      .update(updateData)
      .eq('id', submission_id)
      .select()
      .single()

    if (error) throw error

    // 승인 시 포인트 적립 (20,000P)
    if (action === 'approve') {
      try {
        await supabase
          .from('points')
          .insert([{
            user_id: submission.creator_id,
            amount: 20000,
            type: 'earn',
            description: '텍스트 포스트 검수 승인',
            reference_type: 'text_submission',
            reference_id: submission_id,
            campaign_id: submission.campaign_id
          }])
      } catch (pointError) {
        console.error('[review-text-submission] Point insertion failed:', pointError)
      }
    }

    return successResponse({ success: true, data })
  } catch (error) {
    console.error('[review-text-submission] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'review-text-submission',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return errorResponse(500, error.message)
  }
}
