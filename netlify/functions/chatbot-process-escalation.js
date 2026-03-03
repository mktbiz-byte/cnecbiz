/**
 * 챗봇 에스컬레이션 처리
 * GCP 스킬 서버에서 호출 → 미답변 저장 + 네이버웍스 알림
 *
 * POST body: {
 *   kakao_user_key: string,
 *   bot_type: 'creator' | 'business',
 *   question: string,
 *   confidence: number,
 *   user_context: object
 * }
 *
 * Headers: { 'X-Chatbot-API-Key': CHATBOT_API_SECRET }
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CHATBOT_CHANNEL_ID = '75c24874-e370-afd5-9da3-72918ba15a3c'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Chatbot-API-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // API 키 검증
  const apiKey = event.headers['x-chatbot-api-key']
  if (process.env.CHATBOT_API_SECRET && apiKey !== process.env.CHATBOT_API_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  }

  try {
    const { kakao_user_key, bot_type, question, confidence, user_context } = JSON.parse(event.body)

    // 1. 미답변 저장
    const { data: unanswered, error: insertError } = await supabase
      .from('chatbot_unanswered')
      .insert({
        kakao_user_key,
        bot_type,
        question,
        confidence,
        user_context: user_context || {},
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 2. 네이버웍스 알림
    const botLabel = bot_type === 'creator' ? '크리에이터' : '기업'
    const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

    const message = `💬 챗봇 미답변 알림\n\n[유형] ${botLabel} 챗봇\n[시간] ${koreanTime}\n[질문] ${question}\n[확신도] ${(confidence * 100).toFixed(0)}%\n\n관리자 페이지에서 답변해 주세요:\nhttps://cnecbiz.com/admin/chatbot/dashboard`

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    const nwResponse = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        channelId: CHATBOT_CHANNEL_ID,
        message
      })
    })

    const nwResult = await nwResponse.json()

    // 네이버웍스 발송 상태 업데이트
    await supabase
      .from('chatbot_unanswered')
      .update({ naver_works_sent: nwResult.success })
      .eq('id', unanswered.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: { unanswered_id: unanswered.id, naver_works_sent: nwResult.success }
      })
    }
  } catch (error) {
    console.error('[chatbot-process-escalation] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-process-escalation', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
