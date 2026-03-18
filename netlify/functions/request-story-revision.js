/**
 * 스토리 숏폼 수정 요청 + 자동 과금 (+20,000원)
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const REVISION_FEE = 20000

exports.handler = async (event) => {
  try {
    const { submission_id, admin_note, reviewed_by } = JSON.parse(event.body)

    if (!submission_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'submission_id is required' })
      }
    }

    // 제출 정보 조회
    const { data: submission, error: fetchError } = await supabaseBiz
      .from('story_submissions')
      .select('*, campaigns:campaign_id(company_id, company_biz_id, company_email)')
      .eq('id', submission_id)
      .single()

    if (fetchError) throw fetchError
    if (!submission) throw new Error('제출 정보를 찾을 수 없습니다.')

    // 수정 요청으로 상태 변경 + 수정 횟수 증가
    const { data, error } = await supabaseBiz
      .from('story_submissions')
      .update({
        status: 'revision_requested',
        admin_note: admin_note || null,
        reviewed_by: reviewed_by || null,
        reviewed_at: new Date().toISOString(),
        revision_count: (submission.revision_count || 0) + 1,
        revision_fee_charged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', submission_id)
      .select()
      .single()

    if (error) throw error

    // 기업에 수정 비용 차감 기록 (포인트 차감)
    try {
      const companyId = submission.campaigns?.company_id || submission.campaigns?.company_biz_id
      if (companyId) {
        await supabaseBiz
          .from('points')
          .insert([{
            user_id: companyId,
            amount: -REVISION_FEE,
            type: 'deduct',
            description: `스토리 숏폼 수정 요청 과금 (+${REVISION_FEE.toLocaleString()}원)`,
            reference_type: 'story_revision',
            reference_id: submission_id,
            campaign_id: submission.campaign_id
          }])
      }
    } catch (pointError) {
      console.error('[request-story-revision] Point deduction failed:', pointError)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data,
        revision_fee: REVISION_FEE,
        message: `수정 요청이 접수되었습니다. ${REVISION_FEE.toLocaleString()}원이 추가 과금됩니다.`
      })
    }
  } catch (error) {
    console.error('[request-story-revision] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'request-story-revision',
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
