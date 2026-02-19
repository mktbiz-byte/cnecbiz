const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 매일 오후 6시 KST
exports.handler = async (event) => {
  console.log('[scheduled-openclo-report] Starting...')

  try {
    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = new Date().getDay()
    const isMonday = dayOfWeek === 1

    // 리전별 KPI 조회
    const regions = ['korea', 'japan', 'us']
    const regionLabels = { korea: '🇰🇷 한국', japan: '🇯🇵 일본', us: '🇺🇸 미국' }
    let totalKPI = {}
    let regionKPIs = {}

    for (const region of regions) {
      const { data: kpi } = await supabase
        .from('oc_daily_kpi')
        .select('*')
        .eq('date', today)
        .eq('region', region)
        .maybeSingle()

      regionKPIs[region] = kpi || {}

      // 총합 계산
      for (const key of ['profiles_visited', 'new_creators', 'duplicates_skipped', 'approved', 'review', 'rejected', 'emails_collected', 'emails_sent', 'emails_opened', 'replies_received', 'new_registrations', 'errors_count', 'captcha_count']) {
        totalKPI[key] = (totalKPI[key] || 0) + (kpi?.[key] || 0)
      }
    }

    // 누적 통계
    const { count: totalCreators } = await supabase.from('oc_creators').select('*', { count: 'exact', head: true })
    const { count: totalRegistered } = await supabase.from('oc_creators').select('*', { count: 'exact', head: true }).eq('is_registered', true)
    const conversionRate = totalCreators > 0 ? ((totalRegistered / totalCreators) * 100).toFixed(1) : '0'

    // 일일 리포트 메시지
    let message = `📊 오픈클로 일일 리포트 (${today})\n━━━━━━━━━━━━━━━━━\n\n`

    message += `🤖 봇 활동\n`
    message += `• 프로필 탐색: ${totalKPI.profiles_visited || 0}개\n`
    message += `• 신규 발견: ${totalKPI.new_creators || 0}개 (중복 ${totalKPI.duplicates_skipped || 0}개 스킵)\n`
    message += `• 에러: ${totalKPI.errors_count || 0}건\n\n`

    message += `🧠 AI 분석\n`
    message += `• 승인: ${totalKPI.approved || 0}개 / 검토: ${totalKPI.review || 0}개 / 제외: ${totalKPI.rejected || 0}개\n\n`

    message += `📧 이메일\n`
    message += `• 발송: ${totalKPI.emails_sent || 0}건 / 오픈: ${totalKPI.emails_opened || 0}건 / 회신: ${totalKPI.replies_received || 0}건\n\n`

    message += `⭐ 가입 전환\n`
    message += `• 오늘 신규 가입: ${totalKPI.new_registrations || 0}명\n`
    message += `• 누적 전환율: ${conversionRate}%\n\n`

    message += `📈 리전별\n`
    for (const region of regions) {
      const k = regionKPIs[region]
      message += `${regionLabels[region]}: 탐색 ${k.profiles_visited || 0} → 신규 ${k.new_creators || 0} / 발송 ${k.emails_sent || 0}\n`
    }

    message += `\n━━━━━━━━━━━━━━━━━\n🔗 https://cnecbiz.com/admin/openclo`

    // 주간 리포트 추가 (월요일)
    if (isMonday) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: weeklyKPI } = await supabase
        .from('oc_daily_kpi')
        .select('*')
        .gte('date', weekAgo)
        .lte('date', today)

      if (weeklyKPI && weeklyKPI.length > 0) {
        const weekTotal = {}
        for (const day of weeklyKPI) {
          for (const key of ['profiles_visited', 'new_creators', 'emails_sent', 'new_registrations']) {
            weekTotal[key] = (weekTotal[key] || 0) + (day[key] || 0)
          }
        }

        message += `\n\n📅 주간 요약 (${weekAgo} ~ ${today})\n`
        message += `• 총 탐색: ${weekTotal.profiles_visited || 0}개\n`
        message += `• 신규 발견: ${weekTotal.new_creators || 0}개\n`
        message += `• 이메일 발송: ${weekTotal.emails_sent || 0}건\n`
        message += `• 가입 전환: ${weekTotal.new_registrations || 0}명\n`
      }

      // TOP 5 크리에이터
      const { data: topCreators } = await supabase
        .from('oc_creators')
        .select('username, platform, followers, region')
        .gte('created_at', weekAgo)
        .order('followers', { ascending: false })
        .limit(5)

      if (topCreators && topCreators.length > 0) {
        message += `\n🏆 TOP 5 신규 발견\n`
        topCreators.forEach((c, i) => {
          message += `${i + 1}. @${c.username} (${c.platform}/${c.region}) - ${formatNumber(c.followers)} 팔로워\n`
        })
      }
    }

    // 네이버웍스 발송
    await sendNaverWorksMessage(message)

    console.log('[scheduled-openclo-report] Report sent successfully')

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Report sent' })
    }
  } catch (error) {
    console.error('[scheduled-openclo-report] Error:', error)

    // 에러 시에도 에러 내용 포함하여 리포트 시도
    try {
      await sendNaverWorksMessage(`⚠️ 오픈클로 리포트 에러\n${error.message}`)
    } catch {}

    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }
  }
}

async function sendNaverWorksMessage(text) {
  // 기존 send-naver-works-message 함수를 호출하여 네이버웍스 발송
  const siteUrl = process.env.URL || 'https://cnecbiz.com'

  try {
    const res = await fetch(`${siteUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        message: text
      })
    })

    const result = await res.json()
    if (!result.success) {
      console.error('[scheduled-openclo-report] Naver Works send failed:', result.error)
    } else {
      console.log('[scheduled-openclo-report] Naver Works message sent successfully')
    }
  } catch (err) {
    console.error('[scheduled-openclo-report] Naver Works send error:', err.message)
  }
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

module.exports.config = { schedule: '0 9 * * *' }
