const { createClient } = require('@supabase/supabase-js')

/**
 * 실시간 현황판 데이터 API
 * GET /.netlify/functions/dashboard-realtime
 *
 * 최근 영상 업로드, SNS 완료, 알림 발송 현황을 실시간으로 제공
 */

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = (process.env.VITE_SUPABASE_KOREA_URL)
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
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // 병렬 쿼리 실행
    const [
      // 오늘 영상 제출 (각 리전)
      koreaVideoSubmissions,
      japanVideoSubmissions,
      usVideoSubmissions,
      bizVideoSubmissions,
      // 오늘 application 상태별 카운트 (BIZ)
      todayApplicationStats,
      // 최근 영상 제출 활동 (최근 20건)
      recentVideoActivity,
      // 오늘 SNS 업로드 완료
      todaySnsUploads,
      // 캠페인별 현황
      activeCampaigns,
      // 알림 로그 (WhatsApp)
      whatsappLogs
    ] = await Promise.allSettled([
      // 한국 영상 제출
      supabaseKorea ? supabaseKorea
        .from('video_submissions')
        .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at, campaign_type')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(100)
      : Promise.resolve({ data: [] }),

      // 일본 영상 제출
      supabaseJapan ? supabaseJapan
        .from('video_submissions')
        .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at, campaign_type')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(50)
      : Promise.resolve({ data: [] }),

      // 미국 영상 제출
      supabaseUS ? supabaseUS
        .from('video_submissions')
        .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at, campaign_type')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(50)
      : Promise.resolve({ data: [] }),

      // BIZ 영상 제출
      supabaseBiz
        .from('video_submissions')
        .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at, campaign_type')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(50),

      // 오늘 application 상태 변경
      supabaseBiz
        .from('applications')
        .select('id, status, campaign_id, creator_name, updated_at')
        .gte('updated_at', today)
        .in('status', ['video_submitted', 'sns_uploaded', 'completed', 'approved', 'revision_requested'])
        .order('updated_at', { ascending: false })
        .limit(200),

      // 최근 영상 활동 (BIZ + Korea 합산)
      supabaseKorea ? supabaseKorea
        .from('video_submissions')
        .select('id, campaign_id, user_id, creator_name, version, video_number, week_number, status, created_at, campaign_type, is_clean_video')
        .gte('created_at', last24h)
        .order('created_at', { ascending: false })
        .limit(20)
      : Promise.resolve({ data: [] }),

      // SNS 업로드 완료 (오늘)
      supabaseBiz
        .from('applications')
        .select('id, status, campaign_id, creator_name, updated_at')
        .eq('status', 'sns_uploaded')
        .gte('updated_at', today)
        .order('updated_at', { ascending: false })
        .limit(50),

      // 활성 캠페인
      supabaseBiz
        .from('campaigns')
        .select('id, title, campaign_type, target_country, status')
        .in('status', ['active', 'in_progress', 'recruiting'])
        .limit(100),

      // WhatsApp 로그 (오늘)
      supabaseBiz
        .from('whatsapp_logs')
        .select('id, template_name, status, creator_name, campaign_name, created_at')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    // 결과 정리
    const kr = koreaVideoSubmissions.status === 'fulfilled' ? (koreaVideoSubmissions.value?.data || []) : []
    const jp = japanVideoSubmissions.status === 'fulfilled' ? (japanVideoSubmissions.value?.data || []) : []
    const us = usVideoSubmissions.status === 'fulfilled' ? (usVideoSubmissions.value?.data || []) : []
    const biz = bizVideoSubmissions.status === 'fulfilled' ? (bizVideoSubmissions.value?.data || []) : []

    const appStats = todayApplicationStats.status === 'fulfilled' ? (todayApplicationStats.value?.data || []) : []
    const recentVideos = recentVideoActivity.status === 'fulfilled' ? (recentVideoActivity.value?.data || []) : []
    const snsUploads = todaySnsUploads.status === 'fulfilled' ? (todaySnsUploads.value?.data || []) : []
    const campaigns = activeCampaigns.status === 'fulfilled' ? (activeCampaigns.value?.data || []) : []
    const waLogs = whatsappLogs.status === 'fulfilled' ? (whatsappLogs.value?.data || []) : []

    // 통계 계산
    const allVideoSubmissions = [...kr, ...jp, ...us, ...biz]
    // 중복 제거 (같은 id)
    const uniqueVideos = [...new Map(allVideoSubmissions.map(v => [v.id, v])).values()]

    const stats = {
      videoSubmissions: {
        total: uniqueVideos.length,
        korea: kr.length,
        japan: jp.length,
        us: us.length,
        byStatus: {
          submitted: uniqueVideos.filter(v => v.status === 'submitted' || v.status === 'pending').length,
          approved: uniqueVideos.filter(v => v.status === 'approved').length,
          revision: uniqueVideos.filter(v => v.status === 'revision_requested').length
        }
      },
      applicationStatus: {
        videoSubmitted: appStats.filter(a => a.status === 'video_submitted').length,
        snsUploaded: snsUploads.length,
        completed: appStats.filter(a => a.status === 'completed').length,
        approved: appStats.filter(a => a.status === 'approved').length,
        revisionRequested: appStats.filter(a => a.status === 'revision_requested').length
      },
      activeCampaigns: {
        total: campaigns.length,
        byCountry: {
          kr: campaigns.filter(c => c.target_country === 'kr').length,
          jp: campaigns.filter(c => c.target_country === 'jp').length,
          us: campaigns.filter(c => c.target_country === 'us').length,
          tw: campaigns.filter(c => c.target_country === 'tw').length
        },
        byType: {
          planned: campaigns.filter(c => c.campaign_type === 'planned').length,
          olive_young: campaigns.filter(c => c.campaign_type === 'olive_young').length,
          '4week': campaigns.filter(c => c.campaign_type === '4week_challenge' || c.campaign_type === '4week').length,
          megawari: campaigns.filter(c => c.campaign_type === 'megawari' || c.campaign_type === 'mega-warri').length
        }
      },
      whatsapp: {
        total: waLogs.length,
        success: waLogs.filter(w => w.status === 'queued' || w.status === 'sent' || w.status === 'delivered').length,
        failed: waLogs.filter(w => w.status === 'failed').length
      }
    }

    // 최근 활동 피드 (시간순)
    const feed = [
      ...recentVideos.map(v => ({
        type: 'video_upload',
        time: v.created_at,
        creator: v.creator_name || '크리에이터',
        campaignType: v.campaign_type || 'planned',
        version: v.version,
        weekNumber: v.week_number,
        videoNumber: v.video_number,
        isCleanVideo: v.is_clean_video,
        region: 'korea'
      })),
      ...snsUploads.map(a => ({
        type: 'sns_upload',
        time: a.updated_at,
        creator: a.creator_name || '크리에이터',
        campaignId: a.campaign_id
      })),
      ...waLogs.map(w => ({
        type: 'whatsapp',
        time: w.created_at,
        creator: w.creator_name,
        template: w.template_name,
        campaign: w.campaign_name,
        status: w.status
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 50)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        stats,
        feed,
        activeCampaigns: campaigns.slice(0, 20).map(c => ({
          id: c.id,
          title: c.title,
          type: c.campaign_type,
          country: c.target_country
        }))
      })
    }

  } catch (error) {
    console.error('[dashboard-realtime] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
