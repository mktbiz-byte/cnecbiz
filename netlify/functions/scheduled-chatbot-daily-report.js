/**
 * 챗봇 일일 리포트 → 네이버웍스 발송 (스케줄: 매일 00:00 UTC = 09:00 KST)
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CHATBOT_CHANNEL_ID = '75c24874-e370-afd5-9da3-72918ba15a3c'

exports.handler = async (event) => {
  try {
    // 어제 날짜 범위 (KST 기준: UTC+9)
    // 이 함수는 00:00 UTC (= 09:00 KST)에 실행됨
    // KST 어제 00:00 ~ 오늘 00:00 범위를 UTC로 변환
    const now = new Date()
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000

    // KST 기준 오늘 00:00
    const kstNow = new Date(now.getTime() + KST_OFFSET_MS)
    const kstTodayStart = new Date(kstNow)
    kstTodayStart.setUTCHours(0, 0, 0, 0)

    // KST 기준 어제 00:00
    const kstYesterdayStart = new Date(kstTodayStart)
    kstYesterdayStart.setUTCDate(kstYesterdayStart.getUTCDate() - 1)

    // UTC로 변환 (KST - 9시간)
    const from = new Date(kstYesterdayStart.getTime() - KST_OFFSET_MS).toISOString()
    const to = new Date(kstTodayStart.getTime() - KST_OFFSET_MS).toISOString()

    console.log(`[scheduled-chatbot-daily-report] Date range (UTC): ${from} ~ ${to}`)

    // 통계 수집
    const [convResult, escResult, fbResult, learnResult] = await Promise.all([
      supabase.from('chatbot_conversations').select('bot_type', { count: 'exact' }).gte('created_at', from).lt('created_at', to),
      supabase.from('chatbot_unanswered').select('bot_type, status', { count: 'exact' }).gte('created_at', from).lt('created_at', to),
      supabase.from('chatbot_feedback').select('rating').gte('created_at', from).lt('created_at', to),
      supabase.from('chatbot_learning_queue').select('id', { count: 'exact' }).eq('status', 'pending')
    ])

    // 에러 로깅
    if (convResult.error) console.error('[daily-report] conversations query error:', convResult.error)
    if (escResult.error) console.error('[daily-report] unanswered query error:', escResult.error)
    if (fbResult.error) console.error('[daily-report] feedback query error:', fbResult.error)
    if (learnResult.error) console.error('[daily-report] learning queue query error:', learnResult.error)

    const totalConversations = convResult.count || 0
    const creatorConvs = (convResult.data || []).filter(c => c.bot_type === 'creator').length
    const businessConvs = (convResult.data || []).filter(c => c.bot_type === 'business').length

    const totalEscalations = escResult.count || 0
    const pendingEscalations = (escResult.data || []).filter(e => e.status === 'pending').length
    const answeredEscalations = (escResult.data || []).filter(e => e.status === 'answered').length

    const feedbacks = fbResult.data || []
    const avgRating = feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
      : '-'

    const responseRate = totalConversations > 0
      ? (((totalConversations - totalEscalations) / totalConversations) * 100).toFixed(1)
      : '100'

    const pendingLearning = learnResult.count || 0

    // KST 어제 날짜 문자열
    const dateStr = kstYesterdayStart.toLocaleDateString('ko-KR')

    const message = `📊 챗봇 일일 리포트 (${dateStr})

[대화]
• 총 대화: ${totalConversations}건
• 크리에이터: ${creatorConvs}건 | 기업: ${businessConvs}건
• 응답률: ${responseRate}%

[에스컬레이션]
• 총 미답변: ${totalEscalations}건
• 대기 중: ${pendingEscalations}건 | 답변 완료: ${answeredEscalations}건

[만족도]
• 평균 평점: ${avgRating}/5.0 (${feedbacks.length}건)

[학습]
• 승인 대기: ${pendingLearning}건

관리 페이지: https://cnecbiz.com/admin/chatbot/dashboard`

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        channelId: CHATBOT_CHANNEL_ID,
        message
      })
    })

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (error) {
    console.error('[scheduled-chatbot-daily-report] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'scheduled-chatbot-daily-report', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
