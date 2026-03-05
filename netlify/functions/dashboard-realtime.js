const { createClient } = require('@supabase/supabase-js')

/**
 * 실시간 현황판 데이터 API
 * GET /.netlify/functions/dashboard-realtime
 *
 * 모든 리전 DB에서 영상 제출, SNS 완료, 캠페인 현황을 실시간으로 제공
 */

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = process.env.VITE_SUPABASE_KOREA_URL
  ? createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

const supabaseJapan = (process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY)
  ? createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY)
  : null

const supabaseUS = (process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY)
  ? createClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY)
  : null

// 리전 클라이언트 목록
const regionalClients = [
  { name: 'korea', code: 'kr', client: supabaseKorea },
  { name: 'japan', code: 'jp', client: supabaseJapan },
  { name: 'us', code: 'us', client: supabaseUS }
].filter(r => r.client)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // 한국시간 기준 오늘 00:00 (UTC)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const kstTodayStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - kstOffset)
    const todayISO = kstTodayStart.toISOString()

    // ===== 리전별 병렬 쿼리 =====
    const regionPromises = regionalClients.map(async (region) => {
      try {
        const [videoRes, appRes, campaignRes, recentVideoRes] = await Promise.allSettled([
          // 오늘 영상 제출 (존재하는 컬럼만 select)
          region.client
            .from('video_submissions')
            .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at')
            .gte('created_at', todayISO)
            .order('created_at', { ascending: false })
            .limit(200),

          // 오늘 applications 상태 변경
          region.client
            .from('applications')
            .select('id, status, campaign_id, user_id, updated_at')
            .gte('updated_at', todayISO)
            .in('status', ['video_submitted', 'sns_uploaded', 'completed', 'approved', 'revision_requested'])
            .order('updated_at', { ascending: false })
            .limit(200),

          // 활성 캠페인
          region.client
            .from('campaigns')
            .select('id, title, campaign_type, status')
            .eq('status', 'active')
            .limit(200),

          // 최근 영상 활동 (피드용, 24시간)
          region.client
            .from('video_submissions')
            .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at')
            .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(30)
        ])

        const videos = videoRes.status === 'fulfilled' ? (videoRes.value?.data || []) : []
        const apps = appRes.status === 'fulfilled' ? (appRes.value?.data || []) : []
        const campaigns = campaignRes.status === 'fulfilled' ? (campaignRes.value?.data || []) : []
        const recentVideos = recentVideoRes.status === 'fulfilled' ? (recentVideoRes.value?.data || []) : []

        // 캠페인 ID → 타이틀/타입 맵 생성
        const campaignMap = {}
        campaigns.forEach(c => {
          campaignMap[c.id] = { title: c.title, type: c.campaign_type }
        })

        return {
          region: region.name,
          code: region.code,
          videos,
          apps,
          campaigns,
          recentVideos,
          campaignMap
        }
      } catch (err) {
        console.error(`[dashboard-realtime] ${region.name} error:`, err.message)
        return { region: region.name, code: region.code, videos: [], apps: [], campaigns: [], recentVideos: [], campaignMap: {} }
      }
    })

    // WhatsApp 로그 (BIZ DB에서)
    const waPromise = supabaseBiz
      .from('whatsapp_logs')
      .select('id, template_name, status, creator_name, campaign_name, created_at')
      .gte('created_at', todayISO)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(res => res.data || [])
      .catch(() => [])

    const [regionResults, waLogs] = await Promise.all([
      Promise.all(regionPromises),
      waPromise
    ])

    // ===== 통계 집계 =====
    let totalVideos = 0
    let videosByStatus = { submitted: 0, approved: 0, revision: 0 }
    let videosByRegion = {}
    let totalApps = { videoSubmitted: 0, snsUploaded: 0, completed: 0, approved: 0, revisionRequested: 0 }
    let allCampaigns = []
    let campaignsByType = {}
    const allFeed = []
    const globalCampaignMap = {}

    for (const r of regionResults) {
      // 영상 통계
      videosByRegion[r.code] = r.videos.length
      totalVideos += r.videos.length
      r.videos.forEach(v => {
        if (v.status === 'submitted' || v.status === 'pending') videosByStatus.submitted++
        else if (v.status === 'approved') videosByStatus.approved++
        else if (v.status === 'revision_requested') videosByStatus.revision++
      })

      // Application 통계
      r.apps.forEach(a => {
        if (a.status === 'video_submitted') totalApps.videoSubmitted++
        else if (a.status === 'sns_uploaded') totalApps.snsUploaded++
        else if (a.status === 'completed') totalApps.completed++
        else if (a.status === 'approved') totalApps.approved++
        else if (a.status === 'revision_requested') totalApps.revisionRequested++
      })

      // 캠페인
      allCampaigns = allCampaigns.concat(r.campaigns.map(c => ({ ...c, country: r.code })))
      r.campaigns.forEach(c => {
        const type = c.campaign_type || 'planned'
        campaignsByType[type] = (campaignsByType[type] || 0) + 1
        globalCampaignMap[c.id] = { title: c.title, type: c.campaign_type }
      })

      // 피드 생성 (영상)
      r.recentVideos.forEach(v => {
        const cInfo = r.campaignMap[v.campaign_id] || globalCampaignMap[v.campaign_id]
        allFeed.push({
          type: 'video_upload',
          time: v.created_at,
          creator: v.user_id?.substring(0, 8) || '?',
          campaign: cInfo?.title || '',
          campaignType: cInfo?.type || 'planned',
          version: v.version,
          weekNumber: v.week_number,
          videoNumber: v.video_number,
          region: r.code
        })
      })

      // 피드 생성 (SNS 업로드)
      r.apps.filter(a => a.status === 'sns_uploaded').forEach(a => {
        const cInfo = r.campaignMap[a.campaign_id] || globalCampaignMap[a.campaign_id]
        allFeed.push({
          type: 'sns_upload',
          time: a.updated_at,
          creator: a.user_id?.substring(0, 8) || '?',
          campaign: cInfo?.title || '',
          campaignId: a.campaign_id,
          region: r.code
        })
      })
    }

    // WhatsApp 피드
    waLogs.forEach(w => {
      allFeed.push({
        type: 'whatsapp',
        time: w.created_at,
        creator: w.creator_name || '',
        template: w.template_name,
        campaign: w.campaign_name || '',
        status: w.status
      })
    })

    // 피드 정렬 (최신순)
    allFeed.sort((a, b) => new Date(b.time) - new Date(a.time))

    // 캠페인 타입 정규화
    const normalizedTypes = {
      planned: (campaignsByType['planned'] || 0) + (campaignsByType['regular'] || 0),
      olive_young: (campaignsByType['olive_young'] || 0) + (campaignsByType['oliveyoung'] || 0) + (campaignsByType['oliveyoung_sale'] || 0),
      '4week': (campaignsByType['4week_challenge'] || 0) + (campaignsByType['4week'] || 0),
      megawari: (campaignsByType['megawari'] || 0) + (campaignsByType['mega-warri'] || 0)
    }

    const stats = {
      videoSubmissions: {
        total: totalVideos,
        korea: videosByRegion['kr'] || 0,
        japan: videosByRegion['jp'] || 0,
        us: videosByRegion['us'] || 0,
        byStatus: videosByStatus
      },
      applicationStatus: totalApps,
      activeCampaigns: {
        total: allCampaigns.length,
        byCountry: {
          kr: allCampaigns.filter(c => c.country === 'kr').length,
          jp: allCampaigns.filter(c => c.country === 'jp').length,
          us: allCampaigns.filter(c => c.country === 'us').length
        },
        byType: normalizedTypes
      },
      whatsapp: {
        total: waLogs.length,
        success: waLogs.filter(w => w.status === 'queued' || w.status === 'sent' || w.status === 'delivered').length,
        failed: waLogs.filter(w => w.status === 'failed').length
      }
    }

    // 크리에이터 이름 매핑 (user_id → 이름)
    // 피드의 user_id들을 수집해서 일괄 조회
    const userIds = [...new Set(allFeed.filter(f => f.creator?.length === 8).map(f => f.creator))]
    if (userIds.length > 0) {
      // user_id 앞 8자로는 정확한 조회 불가 → 그대로 표시
      // 대신 user_profiles에서 최근 video_submissions의 user_id로 조회
      const fullUserIds = [...new Set([
        ...regionResults.flatMap(r => r.recentVideos.map(v => v.user_id)),
        ...regionResults.flatMap(r => r.apps.filter(a => a.status === 'sns_uploaded').map(a => a.user_id))
      ].filter(Boolean))]

      if (fullUserIds.length > 0) {
        // 각 리전에서 user_profiles 또는 creators 조회
        const nameMap = {}
        for (const region of regionalClients) {
          try {
            const { data } = await region.client
              .from('user_profiles')
              .select('id, display_name, full_name')
              .in('id', fullUserIds)
              .limit(100)
            if (data) {
              data.forEach(u => {
                nameMap[u.id] = u.display_name || u.full_name || u.id.substring(0, 8)
              })
            }
          } catch (e) { /* skip */ }
        }

        // 피드에 이름 매핑
        allFeed.forEach(f => {
          if (f.creator?.length === 8) {
            // user_id 앞 8자와 매칭
            const matched = Object.entries(nameMap).find(([uid]) => uid.startsWith(f.creator))
            if (matched) f.creator = matched[1]
          }
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        todayRange: todayISO,
        stats,
        feed: allFeed.slice(0, 50),
        activeCampaigns: allCampaigns.slice(0, 30).map(c => ({
          id: c.id,
          title: c.title,
          type: c.campaign_type,
          country: c.country
        })),
        regions: regionResults.map(r => ({
          name: r.region,
          code: r.code,
          videoCount: r.videos.length,
          appCount: r.apps.length,
          campaignCount: r.campaigns.length
        }))
      })
    }

  } catch (error) {
    console.error('[dashboard-realtime] Error:', error)

    // 에러 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'dashboard-realtime',
          errorMessage: error.message,
          context: { timestamp: new Date().toISOString() }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
