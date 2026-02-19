/**
 * Meta 광고 성과 데이터 조회/동기화
 * - 개별 광고 성과 조회
 * - 전체 계정 성과 동기화
 * - 기간별 성과 분석
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

const INSIGHT_FIELDS = [
  'impressions', 'reach', 'clicks', 'spend', 'ctr', 'cpc', 'cpm',
  'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions',
  'actions', 'cost_per_action_type'
].join(',')

// 영상 조회수 추출 헬퍼
function extractVideoViews(actions) {
  if (!Array.isArray(actions)) return 0
  const videoView = actions.find(a => a.action_type === 'video_view')
  return videoView ? parseInt(videoView.value) : 0
}

function extractVideoMetric(data, field) {
  const arr = data[field]
  if (!Array.isArray(arr)) return 0
  const item = arr.find(a => a.action_type === 'video_view')
  return item ? parseInt(item.value) : 0
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }

  try {
    const { action } = JSON.parse(event.body)

    // ============================================
    // 1. 전체 광고 성과 동기화
    // ============================================
    if (action === 'sync_all') {
      const { dateFrom, dateTo } = JSON.parse(event.body)

      // 활성 광고 계정 조회
      const { data: accounts, error: accErr } = await supabaseBiz
        .from('meta_ad_accounts')
        .select('*')
        .eq('is_active', true)

      if (accErr) throw accErr
      if (!accounts?.length) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { synced: 0 } }) }
      }

      // 모든 활성 광고 조회
      const { data: adCampaigns, error: adErr } = await supabaseBiz
        .from('meta_ad_campaigns')
        .select('*')
        .in('status', ['ACTIVE', 'PAUSED'])

      if (adErr) throw adErr

      let synced = 0
      const today = new Date().toISOString().split('T')[0]
      const fromDate = dateFrom || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const toDate = dateTo || today

      for (const ad of (adCampaigns || [])) {
        try {
          const account = accounts.find(a => a.id === ad.ad_account_id)
          if (!account) continue

          // Meta Insights API 호출
          const url = `${META_API_BASE}/${ad.meta_ad_id}/insights?fields=${INSIGHT_FIELDS}&time_range={"since":"${fromDate}","until":"${toDate}"}&time_increment=1&access_token=${account.access_token}`
          const res = await fetch(url)
          const insightsData = await res.json()

          if (insightsData.error) {
            console.error(`[meta-ads-insights] Error for ad ${ad.meta_ad_id}:`, insightsData.error.message)
            continue
          }

          const dailyData = insightsData.data || []

          // 일별 데이터 저장
          for (const day of dailyData) {
            const dateStr = day.date_start

            await supabaseBiz
              .from('meta_ad_performance_daily')
              .upsert({
                meta_ad_campaign_id: ad.id,
                ad_account_id: ad.ad_account_id,
                date: dateStr,
                impressions: parseInt(day.impressions || 0),
                reach: parseInt(day.reach || 0),
                clicks: parseInt(day.clicks || 0),
                spend: parseFloat(day.spend || 0),
                ctr: parseFloat(day.ctr || 0),
                cpc: parseFloat(day.cpc || 0),
                cpm: parseFloat(day.cpm || 0),
                video_views: extractVideoViews(day.actions),
                video_p25: extractVideoMetric(day, 'video_p25_watched_actions'),
                video_p50: extractVideoMetric(day, 'video_p50_watched_actions'),
                video_p75: extractVideoMetric(day, 'video_p75_watched_actions'),
                video_p100: extractVideoMetric(day, 'video_p100_watched_actions'),
                actions: day.actions || []
              }, { onConflict: 'meta_ad_campaign_id,date' })
          }

          // 총합 성과 업데이트 (최근 7일 기준)
          const totalUrl = `${META_API_BASE}/${ad.meta_ad_id}/insights?fields=${INSIGHT_FIELDS}&date_preset=last_7d&access_token=${account.access_token}`
          const totalRes = await fetch(totalUrl)
          const totalData = await totalRes.json()
          const summary = totalData.data?.[0]

          if (summary) {
            await supabaseBiz
              .from('meta_ad_campaigns')
              .update({
                performance: {
                  impressions: parseInt(summary.impressions || 0),
                  reach: parseInt(summary.reach || 0),
                  clicks: parseInt(summary.clicks || 0),
                  spend: parseFloat(summary.spend || 0),
                  ctr: parseFloat(summary.ctr || 0),
                  cpc: parseFloat(summary.cpc || 0),
                  cpm: parseFloat(summary.cpm || 0),
                  video_views: extractVideoViews(summary.actions),
                  period: 'last_7d'
                },
                last_synced_at: new Date().toISOString()
              })
              .eq('id', ad.id)
          }

          synced++
        } catch (err) {
          console.error(`[meta-ads-insights] Sync error for ad ${ad.id}:`, err.message)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: { synced, total: adCampaigns?.length || 0 } })
      }
    }

    // ============================================
    // 2. 개별 광고 상세 성과 조회
    // ============================================
    if (action === 'get_insights') {
      const { adCampaignId, dateFrom, dateTo } = JSON.parse(event.body)

      // DB에서 일별 데이터 조회
      let query = supabaseBiz
        .from('meta_ad_performance_daily')
        .select('*')
        .eq('meta_ad_campaign_id', adCampaignId)
        .order('date', { ascending: true })

      if (dateFrom) query = query.gte('date', dateFrom)
      if (dateTo) query = query.lte('date', dateTo)

      const { data, error } = await query

      if (error) throw error

      // 합산 데이터 계산
      const totals = (data || []).reduce((acc, d) => {
        acc.impressions += d.impressions || 0
        acc.reach += d.reach || 0
        acc.clicks += d.clicks || 0
        acc.spend += parseFloat(d.spend || 0)
        acc.video_views += d.video_views || 0
        acc.video_p25 += d.video_p25 || 0
        acc.video_p50 += d.video_p50 || 0
        acc.video_p75 += d.video_p75 || 0
        acc.video_p100 += d.video_p100 || 0
        return acc
      }, { impressions: 0, reach: 0, clicks: 0, spend: 0, video_views: 0, video_p25: 0, video_p50: 0, video_p75: 0, video_p100: 0 })

      totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0
      totals.cpc = totals.clicks > 0 ? (totals.spend / totals.clicks) : 0
      totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000) : 0

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            daily: data || [],
            totals
          }
        })
      }
    }

    // ============================================
    // 3. 계정별 전체 요약 (대시보드용)
    // ============================================
    if (action === 'get_summary') {
      const { adAccountId, datePreset } = JSON.parse(event.body)

      const { data: account, error: accErr } = await supabaseBiz
        .from('meta_ad_accounts')
        .select('*')
        .eq('id', adAccountId)
        .single()

      if (accErr || !account) throw new Error('계정을 찾을 수 없습니다.')

      const url = `${META_API_BASE}/${account.ad_account_id}/insights?fields=${INSIGHT_FIELDS}&date_preset=${datePreset || 'last_7d'}&access_token=${account.access_token}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.error) throw new Error(data.error.message)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data.data?.[0] || {} })
      }
    }

    // ============================================
    // 4. Facebook Pages 목록 조회 (크리에이티브 생성에 필요)
    // ============================================
    if (action === 'get_pages') {
      const { adAccountDbId } = JSON.parse(event.body)

      const { data: account, error: accErr } = await supabaseBiz
        .from('meta_ad_accounts')
        .select('*')
        .eq('id', adAccountDbId)
        .single()

      if (accErr || !account) throw new Error('계정을 찾을 수 없습니다.')

      const url = `${META_API_BASE}/me/accounts?fields=id,name,category,picture&access_token=${account.access_token}&limit=50`
      const res = await fetch(url)
      const data = await res.json()

      if (data.error) throw new Error(data.error.message)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data.data || [] })
      }
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('[meta-ads-insights] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
