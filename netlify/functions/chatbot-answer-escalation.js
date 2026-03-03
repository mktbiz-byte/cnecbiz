/**
 * 챗봇 에스컬레이션 답변 처리
 * 관리자가 미답변에 답변 → 학습큐 추가
 *
 * POST body: {
 *   id: uuid (chatbot_unanswered.id),
 *   answer: string,
 *   adminEmail: string
 * }
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { id, answer, adminEmail } = JSON.parse(event.body)

    // 1. 미답변 레코드 조회
    const { data: unanswered, error: fetchError } = await supabase
      .from('chatbot_unanswered')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // 2. 답변 저장
    const { error: updateError } = await supabase
      .from('chatbot_unanswered')
      .update({
        answer,
        status: 'answered',
        assigned_to: adminEmail,
        answered_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 3. 학습큐에 추가
    await supabase
      .from('chatbot_learning_queue')
      .insert({
        source_type: 'staff_answer',
        source_id: id,
        source_data: {
          question: unanswered.question,
          answer,
          bot_type: unanswered.bot_type,
          context: unanswered.user_context
        },
        bot_type: unanswered.bot_type,
        status: 'pending'
      })

    // 4. 감사 로그
    await supabase.from('chatbot_audit_logs').insert({
      admin_email: adminEmail,
      action: 'answer_escalation',
      target_table: 'chatbot_unanswered',
      target_id: id,
      details: { question: unanswered.question, answer }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: { answered: true } })
    }
  } catch (error) {
    console.error('[chatbot-answer-escalation] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-answer-escalation', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
