const { createClient } = require('@supabase/supabase-js')

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

const regionalClients = [
  { name: 'korea', code: 'kr', client: supabaseKorea },
  { name: 'japan', code: 'jp', client: supabaseJapan },
  { name: 'us', code: 'us', client: supabaseUS }
].filter(r => r.client)

// 캠페인 타입 정규화
function normalizeType(t) {
  if (!t || t === 'planned' || t === 'regular') return 'planned'
  if (t === 'olive_young' || t === 'oliveyoung' || t === 'oliveyoung_sale') return 'oliveyoung'
  if (t === '4week_challenge' || t === '4week') return '4week'
  if (t === 'megawari' || t === 'mega-warri') return 'megawari'
  return t
}

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
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const kstTodayStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - kstOffset)
    const todayISO = kstTodayStart.toISOString()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // ===== 리전별 병렬 쿼리 =====
    const regionPromises = regionalClients.map(async (region) => {
      try {
        const [videoRes, allAppsRes, allCampaignsRes, recentVideoRes, recentAppsRes] = await Promise.allSettled([
          // 오늘 영상 제출
          region.client
            .from('video_submissions')
            .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at')
            .gte('created_at', todayISO)
            .order('created_at', { ascending: false })
            .limit(200),

          // 전체 applications 상태별 (프로세스 현황용)
          region.client
            .from('applications')
            .select('id, status, campaign_id, user_id')
            .limit(5000),

          // 전체 캠페인 (상태별 + 타입별)
          region.client
            .from('campaigns')
            .select('id, title, campaign_type, status')
            .limit(500),

          // 최근 영상 활동 (피드용, 24시간)
          region.client
            .from('video_submissions')
            .select('id, campaign_id, user_id, version, video_number, week_number, status, created_at')
            .gte('created_at', last24h)
            .order('created_at', { ascending: false })
            .limit(30),

          // 최근 application 변경 (피드용) — 모든 상태 포함
          region.client
            .from('applications')
            .select('id, status, campaign_id, user_id, created_at, updated_at')
            .gte('updated_at', last24h)
            .in('status', ['pending', 'selected', 'filming', 'video_submitted', 'approved', 'revision_requested', 'sns_uploaded', 'completed'])
            .order('updated_at', { ascending: false })
            .limit(50)
        ])

        const videos = videoRes.status === 'fulfilled' ? (videoRes.value?.data || []) : []
        const allApps = allAppsRes.status === 'fulfilled' ? (allAppsRes.value?.data || []) : []
        const allCampaigns = allCampaignsRes.status === 'fulfilled' ? (allCampaignsRes.value?.data || []) : []
        const recentVideos = recentVideoRes.status === 'fulfilled' ? (recentVideoRes.value?.data || []) : []
        const recentApps = recentAppsRes.status === 'fulfilled' ? (recentAppsRes.value?.data || []) : []

        const campaignMap = {}
        allCampaigns.forEach(c => {
          campaignMap[c.id] = { title: c.title, type: c.campaign_type, status: c.status }
        })

        return {
          code: region.code,
          videos,
          allApps,
          allCampaigns,
          recentVideos,
          recentApps,
          campaignMap
        }
      } catch (err) {
        console.error(`[dashboard-realtime] ${region.name} error:`, err.message)
        return { code: region.code, videos: [], allApps: [], allCampaigns: [], recentVideos: [], recentApps: [], campaignMap: {} }
      }
    })

    // BIZ DB: 기업/상담 현황 + 결제/입금 + 알림 로그
    const bizPromises = Promise.allSettled([
      supabaseBiz.from('companies').select('id', { count: 'exact', head: true }),
      supabaseBiz.from('whatsapp_logs')
        .select('id, template_name, status, creator_name, campaign_name, created_at')
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false })
        .limit(50),
      // 오늘 기업 가입
      supabaseBiz.from('companies')
        .select('id, company_name, contact_person, created_at')
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false })
        .limit(20),
      // 최근 결제/입금 (24시간)
      supabaseBiz.from('payments')
        .select('id, company_id, amount, payment_method, status, campaign_id, created_at')
        .gte('created_at', last24h)
        .order('created_at', { ascending: false })
        .limit(30),
      // 오늘 알림 발송 로그
      supabaseBiz.from('notification_send_logs')
        .select('id, channel, status, function_name, error_message, created_at')
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false })
        .limit(200)
    ])

    // 리전별 크리에이터 가입자 조회 (오늘)
    const creatorSignupPromises = regionalClients.map(async (region) => {
      try {
        const { data, count } = await region.client
          .from('user_profiles')
          .select('id, name, created_at', { count: 'exact' })
          .gte('created_at', todayISO)
          .order('created_at', { ascending: false })
          .limit(20)
        return { code: region.code, count: count || (data?.length || 0), data: data || [] }
      } catch (e) {
        return { code: region.code, count: 0, data: [] }
      }
    })

    const [regionResults, bizResults, creatorSignupResults] = await Promise.all([
      Promise.all(regionPromises),
      bizPromises,
      Promise.all(creatorSignupPromises)
    ])

    const companyCount = bizResults[0]?.status === 'fulfilled' ? (bizResults[0].value?.count || 0) : 0
    const waLogs = bizResults[1]?.status === 'fulfilled' ? (bizResults[1].value?.data || []) : []
    const todaySignups = bizResults[2]?.status === 'fulfilled' ? (bizResults[2].value?.data || []) : []
    const recentPayments = bizResults[3]?.status === 'fulfilled' ? (bizResults[3].value?.data || []) : []
    const notificationLogs = bizResults[4]?.status === 'fulfilled' ? (bizResults[4].value?.data || []) : []

    // 알림 통계 집계
    const notificationStats = {
      naver_works: { success: 0, failed: 0 },
      kakao: { success: 0, failed: 0 },
      email: { success: 0, failed: 0 },
      line: { success: 0, failed: 0 },
      sms: { success: 0, failed: 0 }
    }
    const recentFailures = []
    notificationLogs.forEach(log => {
      const ch = notificationStats[log.channel]
      if (ch) {
        if (log.status === 'success') ch.success++
        else ch.failed++
      }
      if (log.status === 'failed') {
        recentFailures.push({
          channel: log.channel,
          function_name: log.function_name,
          error: log.error_message,
          time: log.created_at
        })
      }
    })

    // 크리에이터 가입자 통계
    const creatorSignups = {}
    let totalCreatorSignups = 0
    creatorSignupResults.forEach(r => {
      creatorSignups[r.code] = r.count
      totalCreatorSignups += r.count
    })

    // ===== 통계 집계 =====
    const allFeed = []
    const globalCampaignMap = {}

    // 프로세스 현황 (전체) — 캠페인 수 기준
    const process = {
      consulting: companyCount,   // 상담/가입
      campaignCreated: 0,         // 캠페인생성
      pendingPayment: 0,          // 결제대기
      recruiting: 0,              // 모집중
      pendingSelection: 0,        // 선정대기 (캠페인 수)
      filming: 0,                 // 촬영중 (캠페인 수)
      reviewing: 0,               // 수정/검수 (캠페인 수)
      snsWaiting: 0               // 업로드대기 (캠페인 수)
    }

    // 국가별 상세
    const countryStats = {}
    // 관리 포인트 (Action Required) — 캠페인 수 기준
    const actionRequired = {
      approvalPending: 0,         // 승인 요청 대기
      selectionDelayed: 0,        // 크리에이터 선정 지연
      reviewDelayed: 0,           // 영상 검수 지연
      snsDelayed: 0,              // SNS 업로드 지연
      pointDelayed: 0             // 포인트 지급 지연
    }
    // 각 Action Required에 해당하는 캠페인 이름 목록
    const actionCampaigns = {
      approval: [],
      selection: [],
      review: [],
      sns: [],
      point: []
    }

    // 오늘 영상 통계
    let todayVideoTotal = 0
    const todayVideoByRegion = {}

    for (const r of regionResults) {
      // 오늘 영상
      todayVideoByRegion[r.code] = r.videos.length
      todayVideoTotal += r.videos.length

      // 국가별 캠페인 타입별 상세
      const cStats = { total: 0, planned: 0, oliveyoung: 0, '4week': 0, megawari: 0 }
      r.allCampaigns.forEach(c => {
        if (c.status === 'active') {
          cStats.total++
          const nt = normalizeType(c.campaign_type)
          if (cStats[nt] !== undefined) cStats[nt]++
        }
        globalCampaignMap[c.id] = { title: c.title, type: c.campaign_type, status: c.status }
      })
      countryStats[r.code] = cStats

      // 프로세스 현황: 캠페인 상태별
      r.allCampaigns.forEach(c => {
        switch (c.status) {
          case 'draft': process.campaignCreated++; break
          case 'pending_payment': process.pendingPayment++; break
          case 'active': process.recruiting++; break
          case 'paused': break
          case 'completed': break
        }
      })

      // active 캠페인 ID 세트 (선정대기 필터용)
      const activeCampaignIds = new Set(r.allCampaigns.filter(c => c.status === 'active').map(c => c.id))

      // 캠페인별로 selected 여부 추적 (선정이 이미 된 캠페인 제외용)
      const campaignsWithSelected = new Set()
      r.allApps.forEach(a => {
        if (a.status !== 'pending' && a.status !== 'rejected' && activeCampaignIds.has(a.campaign_id)) {
          campaignsWithSelected.add(a.campaign_id)
        }
      })

      // 프로세스 현황: application → 캠페인 수 기준 (Set으로 중복 제거)
      const filmingCampaigns = new Set()
      const reviewingCampaigns = new Set()
      const snsWaitingCampaigns = new Set()
      const snsUploadedCampaigns = new Set()  // 포인트 지급 지연용

      r.allApps.forEach(a => {
        if (!activeCampaignIds.has(a.campaign_id)) return
        switch (a.status) {
          case 'selected': case 'filming': filmingCampaigns.add(a.campaign_id); break
          case 'video_submitted': reviewingCampaigns.add(a.campaign_id); break
          case 'approved': case 'video_approved': snsWaitingCampaigns.add(a.campaign_id); break
          case 'revision_requested': reviewingCampaigns.add(a.campaign_id); break
          case 'sns_uploaded': snsUploadedCampaigns.add(a.campaign_id); break
        }
      })

      // 선정대기: active 캠페인 중 아무도 선정 안 된 + pending 지원자 있는 캠페인 수
      const campaignsNeedSelection = [...activeCampaignIds].filter(id => !campaignsWithSelected.has(id))
      const campaignsWithPendingApplicants = new Set(
        r.allApps.filter(a => a.status === 'pending' && campaignsNeedSelection.includes(a.campaign_id)).map(a => a.campaign_id)
      )

      process.pendingSelection += campaignsWithPendingApplicants.size
      process.filming += filmingCampaigns.size
      process.reviewing += reviewingCampaigns.size
      process.snsWaiting += snsWaitingCampaigns.size

      // 관리 포인트 (캠페인 수 기준)
      // 승인 대기
      const approvalCamps = r.allCampaigns.filter(c => c.status === 'pending' || c.status === 'draft')
      actionRequired.approvalPending += approvalCamps.length
      approvalCamps.forEach(c => actionCampaigns.approval.push({ title: c.title, id: c.id, region: r.code }))

      // 선정 지연
      actionRequired.selectionDelayed += campaignsWithPendingApplicants.size
      campaignsWithPendingApplicants.forEach(id => {
        const info = r.campaignMap[id]
        actionCampaigns.selection.push({ title: info?.title || '', id, region: r.code })
      })

      // 검수 지연 (캠페인 수)
      const reviewCampSet = new Set(r.allApps.filter(a => a.status === 'video_submitted' && activeCampaignIds.has(a.campaign_id)).map(a => a.campaign_id))
      actionRequired.reviewDelayed += reviewCampSet.size
      reviewCampSet.forEach(id => {
        const info = r.campaignMap[id]
        actionCampaigns.review.push({ title: info?.title || '', id, region: r.code })
      })

      // SNS 지연 (캠페인 수)
      const snsCampSet = new Set(r.allApps.filter(a => (a.status === 'approved' || a.status === 'video_approved') && activeCampaignIds.has(a.campaign_id)).map(a => a.campaign_id))
      actionRequired.snsDelayed += snsCampSet.size
      snsCampSet.forEach(id => {
        const info = r.campaignMap[id]
        actionCampaigns.sns.push({ title: info?.title || '', id, region: r.code })
      })

      // 포인트 지급 지연 (SNS 업로드 완료했는데 completed 아닌 캠페인 수)
      actionRequired.pointDelayed += snsUploadedCampaigns.size
      snsUploadedCampaigns.forEach(id => {
        const info = r.campaignMap[id]
        actionCampaigns.point.push({ title: info?.title || '', id, region: r.code })
      })

      // 피드 생성 (영상)
      r.recentVideos.forEach(v => {
        const cInfo = r.campaignMap[v.campaign_id] || globalCampaignMap[v.campaign_id]
        allFeed.push({
          type: 'video_upload',
          time: v.created_at,
          userId: v.user_id,
          creator: '',
          campaign: cInfo?.title || '',
          campaignId: v.campaign_id,
          campaignType: cInfo?.type || 'planned',
          version: v.version,
          weekNumber: v.week_number,
          videoNumber: v.video_number,
          region: r.code
        })
      })

      // 피드 생성 (application 상태 변경 — 모든 상태)
      const appStatusToFeedType = {
        pending: 'application',
        selected: 'selection',
        filming: 'filming_start',
        video_submitted: 'video_submit',
        approved: 'approval',
        revision_requested: 'revision',
        sns_uploaded: 'sns_upload',
        completed: 'completion'
      }
      r.recentApps.forEach(a => {
        const feedType = appStatusToFeedType[a.status]
        if (!feedType) return
        const cInfo = r.campaignMap[a.campaign_id] || globalCampaignMap[a.campaign_id]
        // pending은 created_at 기준, 나머지는 updated_at 기준
        const feedTime = a.status === 'pending' ? (a.created_at || a.updated_at) : a.updated_at
        allFeed.push({
          type: feedType,
          time: feedTime,
          userId: a.user_id,
          creator: '',
          campaign: cInfo?.title || '',
          campaignId: a.campaign_id,
          region: r.code
        })
      })
    }

    // WhatsApp 피드 (campaign_name으로 리전 매핑)
    const campaignTitleToRegion = {}
    for (const r of regionResults) {
      r.allCampaigns.forEach(c => {
        if (c.title) campaignTitleToRegion[c.title] = r.code
      })
    }

    waLogs.forEach(w => {
      const region = w.campaign_name ? campaignTitleToRegion[w.campaign_name] : undefined
      allFeed.push({
        type: 'whatsapp',
        time: w.created_at,
        creator: w.creator_name || '',
        template: w.template_name,
        campaign: w.campaign_name || '',
        status: w.status,
        region: region || undefined
      })
    })

    // 기업 가입 피드
    todaySignups.forEach(s => {
      allFeed.push({
        type: 'company_signup',
        time: s.created_at,
        creator: s.company_name || s.contact_person || '',
        campaign: '',
        important: true
      })
    })

    // 결제/입금 피드
    const companyIdToName = {}
    if (recentPayments.length > 0) {
      const companyIds = [...new Set(recentPayments.map(p => p.company_id).filter(Boolean))]
      if (companyIds.length > 0) {
        try {
          const { data: companyNames } = await supabaseBiz
            .from('companies')
            .select('id, company_name')
            .in('id', companyIds)
          if (companyNames) companyNames.forEach(c => { companyIdToName[c.id] = c.company_name })
        } catch (e) { /* skip */ }
      }
    }

    recentPayments.forEach(p => {
      const cInfo = globalCampaignMap[p.campaign_id]
      allFeed.push({
        type: 'payment',
        time: p.created_at,
        creator: companyIdToName[p.company_id] || '',
        campaign: cInfo?.title || '',
        campaignId: p.campaign_id,
        amount: p.amount,
        paymentMethod: p.payment_method,
        paymentStatus: p.status,
        important: true
      })
    })

    allFeed.sort((a, b) => new Date(b.time) - new Date(a.time))

    // 크리에이터 이름 매핑
    const fullUserIds = [...new Set(allFeed.map(f => f.userId).filter(Boolean))]
    if (fullUserIds.length > 0) {
      const nameMap = {}
      for (const region of regionalClients) {
        try {
          const { data } = await region.client
            .from('user_profiles')
            .select('id, name')
            .in('id', fullUserIds)
            .limit(100)
          if (data) {
            data.forEach(u => { if (u.name) nameMap[u.id] = u.name })
          }
        } catch (e) { /* skip */ }
      }
      allFeed.forEach(f => {
        if (f.userId && nameMap[f.userId]) {
          f.creator = nameMap[f.userId]
        } else if (f.userId) {
          f.creator = f.userId.substring(0, 8)
        }
      })
    }

    // 오늘 application 변경 통계
    const todayApps = { applied: 0, selected: 0, videoSubmitted: 0, approved: 0, revisionRequested: 0, snsUploaded: 0, completed: 0 }
    for (const r of regionResults) {
      r.recentApps.forEach(a => {
        switch (a.status) {
          case 'pending': todayApps.applied++; break
          case 'selected': todayApps.selected++; break
          case 'video_submitted': todayApps.videoSubmitted++; break
          case 'approved': todayApps.approved++; break
          case 'revision_requested': todayApps.revisionRequested++; break
          case 'sns_uploaded': todayApps.snsUploaded++; break
          case 'completed': todayApps.completed++; break
        }
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        // 오늘 KPI
        today: {
          videoTotal: todayVideoTotal,
          videoByRegion: todayVideoByRegion,
          apps: todayApps,
          whatsapp: {
            total: waLogs.length,
            success: waLogs.filter(w => w.status !== 'failed').length,
            failed: waLogs.filter(w => w.status === 'failed').length
          },
          signups: todaySignups.length,
          payments: recentPayments.filter(p => new Date(p.created_at) >= kstTodayStart).length,
          creatorSignups: totalCreatorSignups,
          creatorSignupsByRegion: creatorSignups
        },
        // 관리 포인트 (Action Required)
        actionRequired,
        actionCampaigns,
        // 전체 프로세스 현황
        process,
        // 국가별 상세
        countryStats,
        // 활동 피드
        feed: allFeed.slice(0, 60),
        // 알림 발송 현황
        notifications: notificationStats,
        notificationFailures: recentFailures.slice(0, 10),
        // 활성 캠페인 목록
        activeCampaigns: Object.values(globalCampaignMap)
          .filter(c => c.status === 'active')
          .slice(0, 30)
          .map((c, i) => ({ title: c.title, type: c.type })),
        // 리전 연결
        regions: regionResults.map(r => ({
          code: r.code,
          videos: r.videos.length,
          apps: r.allApps.length,
          campaigns: r.allCampaigns.filter(c => c.status === 'active').length
        }))
      })
    }

  } catch (error) {
    console.error('[dashboard-realtime] Error:', error)
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'dashboard-realtime', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
