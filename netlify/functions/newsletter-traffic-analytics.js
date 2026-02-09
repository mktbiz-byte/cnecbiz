/**
 * 뉴스레터 트래픽 분석 API
 * 유입경로별 통계, UTM 캠페인 성과, 뉴스레터별 트래픽 데이터 제공
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const {
      action = 'overview',
      newsletterId,
      dateFrom,
      dateTo,
      limit = 50
    } = JSON.parse(event.body || '{}')

    // 날짜 범위 기본값: 최근 30일
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const from = dateFrom || defaultFrom
    const to = dateTo || now.toISOString()

    let result

    switch (action) {
      case 'overview':
        result = await getOverview(from, to)
        break
      case 'traffic_sources':
        result = await getTrafficSources(from, to, newsletterId)
        break
      case 'utm_campaigns':
        result = await getUtmCampaigns(from, to)
        break
      case 'newsletter_stats':
        result = await getNewsletterStats(from, to, limit)
        break
      case 'daily_trend':
        result = await getDailyTrend(from, to, newsletterId)
        break
      case 'top_referrers':
        result = await getTopReferrers(from, to, newsletterId)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result })
    }
  } catch (error) {
    console.error('[newsletter-traffic-analytics] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}

// 전체 개요
async function getOverview(from, to) {
  // 전체 조회수/순유입
  const { data: views, error } = await supabase
    .from('newsletter_views')
    .select('id, is_unique, traffic_source, viewed_at')
    .gte('viewed_at', from)
    .lte('viewed_at', to)

  if (error) throw error

  const totalViews = views?.length || 0
  const uniqueViews = views?.filter(v => v.is_unique)?.length || 0

  // 유입경로별 집계
  const sourceMap = {}
  views?.forEach(v => {
    const src = v.traffic_source || 'unknown'
    if (!sourceMap[src]) sourceMap[src] = { total: 0, unique: 0 }
    sourceMap[src].total++
    if (v.is_unique) sourceMap[src].unique++
  })

  const sources = Object.entries(sourceMap)
    .map(([source, counts]) => ({ source, ...counts }))
    .sort((a, b) => b.total - a.total)

  // 뉴스레터별 총 조회수 (newsletters 테이블에서)
  const { data: newsletters } = await supabase
    .from('newsletters')
    .select('id, title, view_count, unique_view_count, published_at')
    .eq('is_active', true)
    .order('view_count', { ascending: false })
    .limit(10)

  return {
    totalViews,
    uniqueViews,
    sources,
    topNewsletters: newsletters || [],
    period: { from, to }
  }
}

// 유입경로별 상세
async function getTrafficSources(from, to, newsletterId) {
  let query = supabase
    .from('newsletter_views')
    .select('traffic_source, referrer, is_unique, viewed_at')
    .gte('viewed_at', from)
    .lte('viewed_at', to)

  if (newsletterId) {
    query = query.eq('newsletter_id', newsletterId)
  }

  const { data: views, error } = await query

  if (error) throw error

  // traffic_source별 집계
  const sourceMap = {}
  views?.forEach(v => {
    const src = v.traffic_source || 'unknown'
    if (!sourceMap[src]) sourceMap[src] = { total: 0, unique: 0, referrers: {} }
    sourceMap[src].total++
    if (v.is_unique) sourceMap[src].unique++

    // referrer 도메인별 집계
    if (v.referrer) {
      try {
        const domain = new URL(v.referrer).hostname
        sourceMap[src].referrers[domain] = (sourceMap[src].referrers[domain] || 0) + 1
      } catch {
        // ignore invalid URLs
      }
    }
  })

  const sources = Object.entries(sourceMap)
    .map(([source, data]) => ({
      source,
      total: data.total,
      unique: data.unique,
      topReferrers: Object.entries(data.referrers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count }))
    }))
    .sort((a, b) => b.total - a.total)

  return { sources }
}

// UTM 캠페인별 성과
async function getUtmCampaigns(from, to) {
  const { data: views, error } = await supabase
    .from('newsletter_views')
    .select('utm_source, utm_medium, utm_campaign, utm_content, is_unique, viewed_at')
    .gte('viewed_at', from)
    .lte('viewed_at', to)
    .not('utm_source', 'is', null)

  if (error) throw error

  // utm_campaign 기준 집계
  const campaignMap = {}
  views?.forEach(v => {
    const key = v.utm_campaign || '(no campaign)'
    if (!campaignMap[key]) {
      campaignMap[key] = {
        campaign: v.utm_campaign,
        sources: {},
        total: 0,
        unique: 0
      }
    }
    campaignMap[key].total++
    if (v.is_unique) campaignMap[key].unique++

    const srcKey = `${v.utm_source || ''}/${v.utm_medium || ''}`
    campaignMap[key].sources[srcKey] = (campaignMap[key].sources[srcKey] || 0) + 1
  })

  const campaigns = Object.values(campaignMap)
    .map(c => ({
      ...c,
      sources: Object.entries(c.sources)
        .map(([key, count]) => {
          const [source, medium] = key.split('/')
          return { source, medium, count }
        })
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.total - a.total)

  return { campaigns }
}

// 뉴스레터별 트래픽 통계
async function getNewsletterStats(from, to, limit) {
  const { data: views, error } = await supabase
    .from('newsletter_views')
    .select('newsletter_id, is_unique, traffic_source, viewed_at')
    .gte('viewed_at', from)
    .lte('viewed_at', to)

  if (error) throw error

  // 뉴스레터별 집계
  const nlMap = {}
  views?.forEach(v => {
    const nlId = v.newsletter_id
    if (!nlMap[nlId]) nlMap[nlId] = { id: nlId, total: 0, unique: 0, sources: {} }
    nlMap[nlId].total++
    if (v.is_unique) nlMap[nlId].unique++

    const src = v.traffic_source || 'unknown'
    nlMap[nlId].sources[src] = (nlMap[nlId].sources[src] || 0) + 1
  })

  // 뉴스레터 정보 조회
  const nlIds = Object.keys(nlMap)
  const { data: newsletters } = await supabase
    .from('newsletters')
    .select('id, title, published_at, category')
    .in('id', nlIds)

  const nlInfoMap = {}
  newsletters?.forEach(nl => { nlInfoMap[nl.id] = nl })

  const stats = Object.values(nlMap)
    .map(nl => ({
      ...nl,
      title: nlInfoMap[nl.id]?.title || '(삭제됨)',
      published_at: nlInfoMap[nl.id]?.published_at,
      category: nlInfoMap[nl.id]?.category,
      sources: Object.entries(nl.sources)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  return { newsletters: stats }
}

// 일별 추이
async function getDailyTrend(from, to, newsletterId) {
  let query = supabase
    .from('newsletter_views')
    .select('is_unique, traffic_source, viewed_at')
    .gte('viewed_at', from)
    .lte('viewed_at', to)

  if (newsletterId) {
    query = query.eq('newsletter_id', newsletterId)
  }

  const { data: views, error } = await query
  if (error) throw error

  // 일별 집계
  const dailyMap = {}
  views?.forEach(v => {
    const date = v.viewed_at?.substring(0, 10)
    if (!date) return
    if (!dailyMap[date]) dailyMap[date] = { date, total: 0, unique: 0, sources: {} }
    dailyMap[date].total++
    if (v.is_unique) dailyMap[date].unique++

    const src = v.traffic_source || 'unknown'
    dailyMap[date].sources[src] = (dailyMap[date].sources[src] || 0) + 1
  })

  const trend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

  return { trend }
}

// 상위 리퍼러
async function getTopReferrers(from, to, newsletterId) {
  let query = supabase
    .from('newsletter_views')
    .select('referrer, is_unique, viewed_at')
    .gte('viewed_at', from)
    .lte('viewed_at', to)
    .not('referrer', 'is', null)

  if (newsletterId) {
    query = query.eq('newsletter_id', newsletterId)
  }

  const { data: views, error } = await query
  if (error) throw error

  const refMap = {}
  views?.forEach(v => {
    if (!v.referrer) return
    try {
      const domain = new URL(v.referrer).hostname
      if (!refMap[domain]) refMap[domain] = { domain, total: 0, unique: 0, urls: {} }
      refMap[domain].total++
      if (v.is_unique) refMap[domain].unique++
      refMap[domain].urls[v.referrer] = (refMap[domain].urls[v.referrer] || 0) + 1
    } catch {
      // ignore invalid URLs
    }
  })

  const referrers = Object.values(refMap)
    .map(r => ({
      ...r,
      topUrls: Object.entries(r.urls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([url, count]) => ({ url, count }))
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 30)

  // urls 프로퍼티 제거 (topUrls만 반환)
  referrers.forEach(r => delete r.urls)

  return { referrers }
}
