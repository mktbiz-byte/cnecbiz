const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 매 30분마다 실행
exports.handler = async (event) => {
  const startTime = Date.now()
  console.log('[scheduled-openclo-crawl] Starting...')

  try {
    const regions = ['korea', 'japan', 'us']
    const results = []

    for (const region of regions) {
      // 활성화된 플랫폼 조회
      const { data: configs } = await supabase
        .from('oc_bot_config')
        .select('platform, is_active')
        .eq('region', region)
        .eq('is_active', true)

      if (!configs || configs.length === 0) continue

      // 현재 시간(KST)에 따라 플랫폼 선택
      const kstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours()
      let targetPlatform
      if (kstHour >= 6 && kstHour < 12) targetPlatform = 'instagram'
      else if (kstHour >= 12 && kstHour < 18) targetPlatform = 'tiktok'
      else targetPlatform = 'youtube'

      // 해당 플랫폼이 활성화되어 있지 않으면 다른 활성 플랫폼 선택
      const activePlatforms = configs.map(c => c.platform)
      if (!activePlatforms.includes(targetPlatform)) {
        targetPlatform = activePlatforms[0]
      }

      try {
        // 해당 플랫폼의 봇 함수 호출
        const functionName = `openclo-bot-${targetPlatform}`
        const baseUrl = process.env.URL || 'https://cnecbiz.com'

        const response = await fetch(`${baseUrl}/.netlify/functions/${functionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ region })
        })

        const result = await response.json()
        results.push({ region, platform: targetPlatform, ...result })

        // AI 분석 트리거 (미분석 크리에이터)
        const { data: pendingCreators } = await supabase
          .from('oc_creators')
          .select('id')
          .eq('region', region)
          .eq('status', 'pending')
          .is('ai_summary', null)
          .limit(5)

        if (pendingCreators && pendingCreators.length > 0) {
          await fetch(`${baseUrl}/.netlify/functions/openclo-ai-analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creator_ids: pendingCreators.map(c => c.id) })
          })
        }
      } catch (err) {
        console.error(`[scheduled-openclo-crawl] ${region}/${targetPlatform} error:`, err.message)
        results.push({ region, platform: targetPlatform, error: err.message })

        await supabase.from('oc_bot_activity_logs').insert({
          region, platform: targetPlatform, action: 'error', success: false,
          error_message: err.message, duration_ms: Date.now() - startTime
        })
      }
    }

    // 에러가 있으면 네이버웍스 알림
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      await sendNaverWorksAlert(`⚠️ 오픈클로 크롤링 에러 알림\n━━━━━━━━━━━━━━━━━\n${errors.map(e => `• ${e.region}/${e.platform}: ${e.error}`).join('\n')}\n\n🔗 https://cnecbiz.com/admin/openclo/bot-status`)
    }

    console.log('[scheduled-openclo-crawl] Complete:', JSON.stringify(results))

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, results, duration_ms: Date.now() - startTime })
    }
  } catch (error) {
    console.error('[scheduled-openclo-crawl] Fatal error:', error)
    await sendNaverWorksAlert(`🚨 오픈클로 크롤링 치명적 에러\n${error.message}`)
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}

async function sendNaverWorksAlert(text) {
  const siteUrl = process.env.URL || 'https://cnecbiz.com'
  try {
    await fetch(`${siteUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdminNotification: true, message: text })
    })
  } catch (err) {
    console.error('[scheduled-openclo-crawl] Naver Works alert failed:', err.message)
  }
}

module.exports.config = { schedule: '*/30 * * * *' }
