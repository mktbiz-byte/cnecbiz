/**
 * 챗봇 데이터 정리 (스케줄: 매일 03:00 UTC = 12:00 KST)
 * - 90일 이상 된 대화 이력 삭제
 * - 처리 완료된 학습 큐 180일 이후 삭제
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const now = new Date()

    // 90일 전
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // 180일 전
    const oneEightyDaysAgo = new Date(now)
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180)

    // 1. 90일 이상 대화 삭제
    const { count: deletedConversations } = await supabase
      .from('chatbot_conversations')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo.toISOString())

    // 2. 90일 이상 선택지 로그 삭제
    const { count: deletedChoices } = await supabase
      .from('chatbot_choices_log')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo.toISOString())

    // 3. 180일 이상 처리 완료 학습 큐 삭제
    const { count: deletedLearning } = await supabase
      .from('chatbot_learning_queue')
      .delete({ count: 'exact' })
      .in('status', ['approved', 'rejected', 'processed'])
      .lt('created_at', oneEightyDaysAgo.toISOString())

    // 4. 90일 이상 피드백 삭제
    const { count: deletedFeedback } = await supabase
      .from('chatbot_feedback')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo.toISOString())

    const summary = {
      conversations: deletedConversations || 0,
      choices: deletedChoices || 0,
      learning: deletedLearning || 0,
      feedback: deletedFeedback || 0
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0)

    if (total > 0) {
      console.log(`[scheduled-chatbot-cleanup] Cleaned up ${total} records:`, summary)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: summary })
    }
  } catch (error) {
    console.error('[scheduled-chatbot-cleanup] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'scheduled-chatbot-cleanup', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
