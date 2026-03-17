/**
 * 챗봇 대시보드 통계
 *
 * POST body: {
 *   bot_type?: 'creator' | 'business',
 *   date_from?: string (ISO),
 *   date_to?: string (ISO)
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
    const { bot_type, date_from, date_to } = JSON.parse(event.body || '{}')

    // KST 기준 오늘 00:00을 UTC로 변환
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000
    const kstNow = new Date(Date.now() + KST_OFFSET_MS)
    const kstTodayStart = new Date(kstNow)
    kstTodayStart.setUTCHours(0, 0, 0, 0)
    const todayISO = new Date(kstTodayStart.getTime() - KST_OFFSET_MS).toISOString()

    // 오늘 대화 수
    let todayQuery = supabase
      .from('chatbot_conversations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO)
    if (bot_type) todayQuery = todayQuery.eq('bot_type', bot_type)
    const { count: todayConversations } = await todayQuery

    // 총 대화 수
    let totalQuery = supabase
      .from('chatbot_conversations')
      .select('id', { count: 'exact', head: true })
    if (bot_type) totalQuery = totalQuery.eq('bot_type', bot_type)
    if (date_from) totalQuery = totalQuery.gte('created_at', date_from)
    if (date_to) totalQuery = totalQuery.lte('created_at', date_to)
    const { count: totalConversations } = await totalQuery

    // 미답변 건수
    let unansweredQuery = supabase
      .from('chatbot_unanswered')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (bot_type) unansweredQuery = unansweredQuery.eq('bot_type', bot_type)
    const { count: pendingUnanswered } = await unansweredQuery

    // 총 에스컬레이션
    let escQuery = supabase
      .from('chatbot_unanswered')
      .select('id', { count: 'exact', head: true })
    if (bot_type) escQuery = escQuery.eq('bot_type', bot_type)
    if (date_from) escQuery = escQuery.gte('created_at', date_from)
    if (date_to) escQuery = escQuery.lte('created_at', date_to)
    const { count: totalEscalations } = await escQuery

    // 평균 만족도
    let feedbackQuery = supabase
      .from('chatbot_feedback')
      .select('rating')
    if (bot_type) feedbackQuery = feedbackQuery.eq('bot_type', bot_type)
    if (date_from) feedbackQuery = feedbackQuery.gte('created_at', date_from)
    if (date_to) feedbackQuery = feedbackQuery.lte('created_at', date_to)
    const { data: feedbacks } = await feedbackQuery

    const avgRating = feedbacks && feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
      : null

    // 응답률 (총 대화 - 에스컬레이션) / 총 대화
    const responseRate = totalConversations > 0
      ? (((totalConversations - totalEscalations) / totalConversations) * 100).toFixed(1)
      : 100

    // FAQ 수
    let faqQuery = supabase
      .from('chatbot_faq')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    if (bot_type) faqQuery = faqQuery.eq('bot_type', bot_type)
    const { count: activeFaqs } = await faqQuery

    // 학습 대기
    let learningQuery = supabase
      .from('chatbot_learning_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (bot_type) learningQuery = learningQuery.eq('bot_type', bot_type)
    const { count: pendingLearning } = await learningQuery

    // 최근 7일 일별 대화 수 (KST 기준)
    const kstSevenDaysAgo = new Date(kstTodayStart)
    kstSevenDaysAgo.setUTCDate(kstSevenDaysAgo.getUTCDate() - 7)
    const sevenDaysAgoUTC = new Date(kstSevenDaysAgo.getTime() - KST_OFFSET_MS).toISOString()

    let dailyQuery = supabase
      .from('chatbot_conversations')
      .select('created_at')
      .gte('created_at', sevenDaysAgoUTC)
    if (bot_type) dailyQuery = dailyQuery.eq('bot_type', bot_type)
    const { data: dailyData } = await dailyQuery

    const dailyCounts = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(kstTodayStart)
      d.setUTCDate(d.getUTCDate() - i)
      // KST 날짜로 키 생성
      const key = d.toISOString().split('T')[0]
      dailyCounts[key] = 0
    }
    if (dailyData) {
      dailyData.forEach(item => {
        // created_at(UTC)를 KST 날짜로 변환
        const kstDate = new Date(new Date(item.created_at).getTime() + KST_OFFSET_MS)
        const key = kstDate.toISOString().split('T')[0]
        if (dailyCounts[key] !== undefined) dailyCounts[key]++
      })
    }

    const dailyChart = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          todayConversations: todayConversations || 0,
          totalConversations: totalConversations || 0,
          pendingUnanswered: pendingUnanswered || 0,
          totalEscalations: totalEscalations || 0,
          avgRating: avgRating ? parseFloat(avgRating) : null,
          responseRate: parseFloat(responseRate),
          activeFaqs: activeFaqs || 0,
          pendingLearning: pendingLearning || 0,
          dailyChart
        }
      })
    }
  } catch (error) {
    console.error('[chatbot-stats] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-stats', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
