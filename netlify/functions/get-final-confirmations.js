/**
 * 캠페인 최종 확정 관리 - 데이터 조회 API
 * Service Role Key로 RLS 우회하여 조회
 *
 * video_submissions.application_id → applications.id 관계 사용
 */

const { createClient } = require('@supabase/supabase-js')

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
    const { action, region, userId, campaignId } = JSON.parse(event.body || '{}')

    // 지역별 Supabase 설정
    const regionConfigs = {
      korea: {
        url: process.env.VITE_SUPABASE_KOREA_URL,
        key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY
      },
      japan: {
        url: process.env.VITE_SUPABASE_JAPAN_URL,
        key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY
      },
      us: {
        url: process.env.VITE_SUPABASE_US_URL,
        key: process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY
      }
    }

    // 단일 지역 조회 (지급 이력 조회용)
    if (action === 'get_payment_history') {
      const config = regionConfigs[region]
      if (!config || !config.url || !config.key) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid region' })
        }
      }

      const supabase = createClient(config.url, config.key)

      // point_history 조회
      let history = []
      const { data: pointHistory, error: phError } = await supabase
        .from('point_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!phError && pointHistory) {
        history = pointHistory
      }

      // point_transactions 도 조회 (fallback)
      const { data: pointTx } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          history: history,
          transactions: pointTx || []
        })
      }
    }

    // 전체 데이터 조회
    const results = {
      confirmed: [],
      pending: []
    }

    for (const [regionId, config] of Object.entries(regionConfigs)) {
      if (!config.url || !config.key) {
        console.log(`[${regionId}] Supabase config missing`)
        continue
      }

      try {
        const supabase = createClient(config.url, config.key)

        // 1단계: video_submissions 조회
        const { data: submissions, error: subError } = await supabase
          .from('video_submissions')
          .select('id, user_id, campaign_id, application_id, status, final_confirmed_at, created_at')
          .order('created_at', { ascending: false })
          .limit(500)

        if (subError) {
          console.error(`[${regionId}] video_submissions error:`, subError)
          continue
        }

        console.log(`[${regionId}] video_submissions: ${submissions?.length || 0}건`)

        if (!submissions || submissions.length === 0) continue

        // user_id, campaign_id, application_id 목록 수집
        const userIds = [...new Set(submissions.map(s => s.user_id).filter(Boolean))]
        const campaignIds = [...new Set(submissions.map(s => s.campaign_id).filter(Boolean))]
        const applicationIds = [...new Set(submissions.map(s => s.application_id).filter(Boolean))]

        // 2단계: applications 테이블에서 크리에이터 정보 조회
        const applicationsMap = {}
        if (applicationIds.length > 0) {
          const { data: applications, error: appError } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, nickname, email, phone, phone_number')
            .in('id', applicationIds)

          if (!appError && applications) {
            applications.forEach(app => {
              applicationsMap[app.id] = app
            })
          }
          console.log(`[${regionId}] applications: ${Object.keys(applicationsMap).length}건`)
        }

        // user_id + campaign_id 기반으로도 applications 조회 (application_id가 없는 경우 대비)
        if (userIds.length > 0 && campaignIds.length > 0) {
          const { data: appsByUserCampaign } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, nickname, email, phone, phone_number')
            .in('user_id', userIds)
            .in('campaign_id', campaignIds)

          if (appsByUserCampaign) {
            appsByUserCampaign.forEach(app => {
              const key = `${app.user_id}_${app.campaign_id}`
              if (!applicationsMap[key]) {
                applicationsMap[key] = app
              }
            })
          }
        }

        // 3단계: campaigns 테이블에서 캠페인 정보 조회
        const campaignsMap = {}
        if (campaignIds.length > 0) {
          const { data: campaigns, error: campError } = await supabase
            .from('campaigns')
            .select('id, title, brand, campaign_type, point_amount, reward_points, estimated_cost')
            .in('id', campaignIds)

          if (!campError && campaigns) {
            campaigns.forEach(camp => {
              campaignsMap[camp.id] = camp
            })
          }
          console.log(`[${regionId}] campaigns: ${Object.keys(campaignsMap).length}건`)
        }

        // 4단계: user_profiles에서 크리에이터 이름 조회 (applications에 없는 경우)
        const userProfilesMap = {}
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, user_id, name, nickname, email, phone')
            .in('id', userIds)

          if (profiles) {
            profiles.forEach(p => {
              userProfilesMap[p.id] = p
              if (p.user_id) userProfilesMap[p.user_id] = p
            })
          }
        }

        // 5단계: point_history 조회 (캠페인별 포인트 지급 기록)
        const pointHistoryMap = {}
        if (userIds.length > 0) {
          const { data: pointHistory, error: phError } = await supabase
            .from('point_history')
            .select('user_id, campaign_id, amount, type, created_at')
            .in('user_id', userIds)

          if (!phError && pointHistory) {
            pointHistory.forEach(ph => {
              const key = `${ph.user_id}_${ph.campaign_id}`
              pointHistoryMap[key] = ph
            })
          }

          // point_transactions 테이블도 시도
          const { data: pointTx } = await supabase
            .from('point_transactions')
            .select('user_id, campaign_id, related_campaign_id, amount, type, created_at')
            .in('user_id', userIds)

          ;(pointTx || []).forEach(pt => {
            const campId = pt.campaign_id || pt.related_campaign_id
            const key = `${pt.user_id}_${campId}`
            if (!pointHistoryMap[key]) {
              pointHistoryMap[key] = pt
            }
          })

          console.log(`[${regionId}] point records: ${Object.keys(pointHistoryMap).length}건`)
        }

        // 6단계: 데이터 매핑
        for (const sub of submissions) {
          // applications 찾기: application_id 또는 user_id+campaign_id
          let app = sub.application_id ? applicationsMap[sub.application_id] : null
          if (!app) {
            const key = `${sub.user_id}_${sub.campaign_id}`
            app = applicationsMap[key]
          }

          // campaigns 찾기
          const campaign = campaignsMap[sub.campaign_id] || {}

          // user_profiles 찾기
          const profile = userProfilesMap[sub.user_id] || {}

          // point 기록 찾기
          const pointKey = `${sub.user_id}_${sub.campaign_id}`
          const pointRecord = pointHistoryMap[pointKey]

          // 크리에이터 이름: applications → user_profiles 순서로 우선
          const creatorName = app?.applicant_name || app?.nickname ||
                              profile?.name || profile?.nickname || null

          // 연락처
          const phone = app?.phone_number || app?.phone || profile?.phone || null
          const email = app?.email || profile?.email || null

          // 캠페인 정보
          const campaignTitle = campaign.title || null
          const campaignBrand = campaign.brand || null

          // 포인트 금액 결정 (여러 필드 체크)
          const pointAmount = campaign.point_amount || campaign.reward_points ||
            Math.round((campaign.estimated_cost || 0) / 1.1 / 10) || 0

          const item = {
            id: sub.id,
            region: regionId,
            userId: sub.user_id,
            campaignId: sub.campaign_id,
            applicationId: sub.application_id,
            status: sub.status,
            finalConfirmedAt: sub.final_confirmed_at,
            createdAt: sub.created_at,
            // 크리에이터 정보
            creatorName: creatorName,
            phone: phone,
            email: email,
            // 캠페인 정보
            campaignTitle: campaignTitle,
            campaignBrand: campaignBrand,
            campaignType: campaign.campaign_type,
            pointAmount: pointAmount,
            // 포인트 지급 여부
            isPaid: !!pointRecord,
            paidAmount: pointRecord?.amount || 0,
            paidAt: pointRecord?.created_at
          }

          if (sub.final_confirmed_at) {
            results.confirmed.push(item)
          } else {
            results.pending.push(item)
          }
        }

      } catch (err) {
        console.error(`[${regionId}] Error:`, err)
      }
    }

    // 정렬
    results.confirmed.sort((a, b) => new Date(b.finalConfirmedAt) - new Date(a.finalConfirmedAt))
    results.pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    console.log(`Total - confirmed: ${results.confirmed.length}, pending: ${results.pending.length}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        confirmed: results.confirmed,
        pending: results.pending
      })
    }

  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
