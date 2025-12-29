// 캠페인 지원자 통계 조회 - 서비스 롤 키 사용 (RLS 우회)
const { createClient } = require('@supabase/supabase-js')

// 지역별 Supabase 클라이언트 생성 (서비스 롤 키 사용)
const getSupabaseClient = (region) => {
  let url, key

  switch (region) {
    case 'korea':
    case 'kr':
      url = process.env.VITE_SUPABASE_KOREA_URL || process.env.SUPABASE_KOREA_URL
      key = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      break
    case 'japan':
    case 'jp':
      url = process.env.VITE_SUPABASE_JAPAN_URL || process.env.SUPABASE_JAPAN_URL
      key = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
    case 'usa':
      url = process.env.VITE_SUPABASE_US_URL || process.env.SUPABASE_US_URL
      key = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      break
    case 'taiwan':
    case 'tw':
      url = process.env.VITE_SUPABASE_TAIWAN_URL || process.env.SUPABASE_TAIWAN_URL
      key = process.env.SUPABASE_TAIWAN_SERVICE_ROLE_KEY
      break
    case 'biz':
    default:
      url = process.env.VITE_SUPABASE_BIZ_URL || process.env.SUPABASE_URL
      key = process.env.SUPABASE_SERVICE_ROLE_KEY
      break
  }

  if (!url || !key) {
    console.error(`Missing Supabase credentials for region: ${region}`)
    return null
  }

  return createClient(url, key)
}

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const { campaignsByRegion } = JSON.parse(event.body || '{}')

    // 환경 변수 확인 로그
    console.log('Environment check:', {
      hasKoreaUrl: !!process.env.VITE_SUPABASE_KOREA_URL,
      hasKoreaKey: !!process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY,
      hasUsUrl: !!process.env.VITE_SUPABASE_US_URL,
      hasUsKey: !!process.env.SUPABASE_US_SERVICE_ROLE_KEY,
      hasJapanUrl: !!process.env.VITE_SUPABASE_JAPAN_URL,
      hasJapanKey: !!process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY,
      hasBizUrl: !!(process.env.VITE_SUPABASE_BIZ_URL || process.env.SUPABASE_URL),
      hasBizKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    if (!campaignsByRegion || typeof campaignsByRegion !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'campaignsByRegion is required' })
      }
    }

    console.log('Request campaignsByRegion:', JSON.stringify(campaignsByRegion))

    // 모든 캠페인 ID 수집
    const allCampaignIds = []
    Object.values(campaignsByRegion).forEach(ids => {
      allCampaignIds.push(...ids)
    })

    // 선정 완료 상태 목록
    const selectedStatuses = ['selected', 'virtual_selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'completed']

    // 모든 지역 DB에서 applications 조회 (캠페인이 어느 DB에 있든 applications는 다른 DB에 있을 수 있음)
    const allRegions = ['korea', 'japan', 'us', 'biz']

    const statsPromises = allRegions.map(async (region) => {
      const client = getSupabaseClient(region)
      if (!client) {
        console.log(`No client for region: ${region}`)
        return { region, data: [] }
      }

      try {
        const { data, error } = await client
          .from('applications')
          .select('campaign_id, status, guide_confirmed')
          .in('campaign_id', allCampaignIds)

        if (error) {
          console.error(`Error fetching applications from ${region}:`, error.message)
          return { region, data: [] }
        }

        console.log(`${region}: ${data?.length || 0} applications found`)
        return { region, data: data || [] }
      } catch (err) {
        console.error(`Exception fetching from ${region}:`, err.message)
        return { region, data: [] }
      }
    })

    const results = await Promise.all(statsPromises)

    // 모든 지역의 결과를 합쳐서 캠페인별 통계 집계
    const allStats = {}

    results.forEach(({ region, data }) => {
      data.forEach(app => {
        if (!allStats[app.campaign_id]) {
          allStats[app.campaign_id] = {
            total: 0,
            selected: 0,
            guideConfirmed: 0,
            completed: 0
          }
        }

        allStats[app.campaign_id].total++

        if (selectedStatuses.includes(app.status)) {
          allStats[app.campaign_id].selected++
        }

        if (app.status === 'completed') {
          allStats[app.campaign_id].completed++
        }

        if (app.guide_confirmed) {
          allStats[app.campaign_id].guideConfirmed++
        }
      })
    })

    console.log('Total campaigns with stats:', Object.keys(allStats).length)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats: allStats,
        debug: results.map(r => ({ region: r.region, count: Object.keys(r.stats).length }))
      })
    }
  } catch (error) {
    console.error('Error in get-application-stats:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
