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

    // 디버그: 데이터 관계 확인
    if (action === 'debug_relationships') {
      const config = regionConfigs[region || 'korea']
      if (!config || !config.url || !config.key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid region' }) }
      }

      const supabase = createClient(config.url, config.key)

      // 최근 video_submissions 5개 샘플
      const { data: sampleSubs } = await supabase
        .from('video_submissions')
        .select('id, user_id, campaign_id, application_id, status, final_confirmed_at')
        .not('final_confirmed_at', 'is', null)
        .order('final_confirmed_at', { ascending: false })
        .limit(5)

      const debugResults = []
      for (const sub of sampleSubs || []) {
        const result = {
          submission: sub,
          applicationById: null,
          applicationByUserCampaign: null,
          userProfile: null,
          campaign: null
        }

        // application_id로 조회
        if (sub.application_id) {
          const { data: app1, error: e1 } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, phone_number')
            .eq('id', sub.application_id)
            .maybeSingle()
          result.applicationById = app1 || { error: e1?.message }
        }

        // user_id + campaign_id로 조회
        if (sub.user_id && sub.campaign_id) {
          const { data: app2, error: e2 } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, phone_number')
            .eq('user_id', sub.user_id)
            .eq('campaign_id', sub.campaign_id)
            .maybeSingle()
          result.applicationByUserCampaign = app2 || { error: e2?.message }
        }

        // user_profiles 조회
        if (sub.user_id) {
          const { data: prof1 } = await supabase.from('user_profiles')
            .select('id, user_id, name, nickname, phone').eq('id', sub.user_id).maybeSingle()
          if (prof1) {
            result.userProfile = prof1
          } else {
            const { data: prof2 } = await supabase.from('user_profiles')
              .select('id, user_id, name, nickname, phone').eq('user_id', sub.user_id).maybeSingle()
            result.userProfile = prof2
          }
        }

        // campaign 조회
        if (sub.campaign_id) {
          const { data: camp } = await supabase.from('campaigns')
            .select('id, title, brand, creator_points_override, reward_points')
            .eq('id', sub.campaign_id).maybeSingle()
          result.campaign = camp
        }

        debugResults.push(result)
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, debug: debugResults })
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
        // ★ phone 컬럼 없음 - phone_number만 사용
        const applicationsMap = {}
        if (applicationIds.length > 0) {
          const { data: applications, error: appError } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, email, phone_number')
            .in('id', applicationIds)

          if (appError) {
            console.error(`[${regionId}] applications (by id) error:`, appError.message)
          }
          if (applications) {
            applications.forEach(app => {
              applicationsMap[app.id] = app
            })
          }
          console.log(`[${regionId}] applications (by id): ${Object.keys(applicationsMap).length}건`)
        }

        // user_id + campaign_id 기반으로도 applications 조회 (application_id가 없는 경우 대비)
        if (userIds.length > 0 && campaignIds.length > 0) {
          const { data: appsByUserCampaign, error: appError2 } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, email, phone_number')
            .in('user_id', userIds)
            .in('campaign_id', campaignIds)

          if (appError2) {
            console.error(`[${regionId}] applications (by user+campaign) error:`, appError2.message)
          }
          if (appsByUserCampaign) {
            appsByUserCampaign.forEach(app => {
              // id로도 저장하고 user_id+campaign_id 조합으로도 저장
              if (!applicationsMap[app.id]) {
                applicationsMap[app.id] = app
              }
              const key = `${app.user_id}_${app.campaign_id}`
              if (!applicationsMap[key]) {
                applicationsMap[key] = app
              }
            })
            console.log(`[${regionId}] applications (by user+campaign): ${appsByUserCampaign.length}건 추가`)
          }
        }

        // 3단계: campaigns 테이블에서 캠페인 정보 조회
        // ★ point_amount 컬럼 없음 - creator_points_override, reward_points 사용
        const campaignsMap = {}
        if (campaignIds.length > 0) {
          const { data: campaigns, error: campError } = await supabase
            .from('campaigns')
            .select('id, title, brand, campaign_type, creator_points_override, reward_points, estimated_cost')
            .in('id', campaignIds)

          if (campError) {
            console.error(`[${regionId}] campaigns error:`, campError.message)
          }
          if (campaigns) {
            campaigns.forEach(camp => {
              campaignsMap[camp.id] = camp
            })
          }
          console.log(`[${regionId}] campaigns: ${Object.keys(campaignsMap).length}건`)
        }

        // 4단계: user_profiles에서 크리에이터 이름 조회 (applications에 없는 경우)
        // ★ user_id로도 조회하고 id로도 조회 (관계가 다를 수 있음)
        const userProfilesMap = {}
        if (userIds.length > 0) {
          // id로 조회
          const { data: profilesById, error: profError1 } = await supabase
            .from('user_profiles')
            .select('id, user_id, name, nickname, email, phone')
            .in('id', userIds)

          if (profError1) {
            console.error(`[${regionId}] user_profiles (by id) error:`, profError1.message)
          }
          if (profilesById) {
            profilesById.forEach(p => {
              userProfilesMap[p.id] = p
              if (p.user_id) userProfilesMap[p.user_id] = p
            })
          }

          // user_id 컬럼으로도 조회 (관계가 다를 수 있음)
          const { data: profilesByUserId, error: profError2 } = await supabase
            .from('user_profiles')
            .select('id, user_id, name, nickname, email, phone')
            .in('user_id', userIds)

          if (profError2) {
            console.error(`[${regionId}] user_profiles (by user_id) error:`, profError2.message)
          }
          if (profilesByUserId) {
            profilesByUserId.forEach(p => {
              if (!userProfilesMap[p.id]) userProfilesMap[p.id] = p
              if (p.user_id && !userProfilesMap[p.user_id]) userProfilesMap[p.user_id] = p
            })
          }
          console.log(`[${regionId}] user_profiles: ${Object.keys(userProfilesMap).length}건`)
        }

        // 5단계: point_transactions 조회 (포인트 지급 기록)
        // ★ related_campaign_id가 null인 경우가 많음 (수동 지급) → description으로 매칭 필요
        const pointHistoryMap = {}
        const userPointTxMap = {} // user_id별 모든 트랜잭션 저장

        if (userIds.length > 0) {
          // point_transactions 조회 (description 포함)
          const { data: pointTx, error: ptError } = await supabase
            .from('point_transactions')
            .select('user_id, related_campaign_id, amount, transaction_type, description, created_at')
            .in('user_id', userIds)
            .gt('amount', 0) // 지급 내역만 (양수)

          if (ptError) {
            console.error(`[${regionId}] point_transactions error:`, ptError.message)
          }

          // user_id별로 모든 트랜잭션 저장
          ;(pointTx || []).forEach(pt => {
            if (!userPointTxMap[pt.user_id]) {
              userPointTxMap[pt.user_id] = []
            }
            userPointTxMap[pt.user_id].push(pt)

            // related_campaign_id가 있으면 직접 매핑
            if (pt.related_campaign_id) {
              const key = `${pt.user_id}_${pt.related_campaign_id}`
              if (!pointHistoryMap[key]) {
                pointHistoryMap[key] = pt
              }
            }
          })

          console.log(`[${regionId}] point_transactions: ${(pointTx || []).length}건, users: ${Object.keys(userPointTxMap).length}명`)
        }

        // 6단계: 데이터 매핑
        let debugStats = { foundApp: 0, foundCampaign: 0, foundProfile: 0, total: 0 }
        for (const sub of submissions) {
          debugStats.total++

          // applications 찾기: application_id 또는 user_id+campaign_id
          let app = sub.application_id ? applicationsMap[sub.application_id] : null
          if (!app) {
            const key = `${sub.user_id}_${sub.campaign_id}`
            app = applicationsMap[key]
          }
          if (app) debugStats.foundApp++

          // campaigns 찾기
          const campaign = campaignsMap[sub.campaign_id] || {}
          if (campaign.id) debugStats.foundCampaign++

          // user_profiles 찾기
          const profile = userProfilesMap[sub.user_id] || {}
          if (profile.id) debugStats.foundProfile++

          // point 기록 찾기
          // 1순위: related_campaign_id로 직접 매칭
          const pointKey = `${sub.user_id}_${sub.campaign_id}`
          let pointRecord = pointHistoryMap[pointKey]

          // 2순위: description에서 캠페인 제목/브랜드로 매칭 (related_campaign_id가 null인 경우)
          // ★ 공백/대소문자 무시하여 유연하게 매칭
          if (!pointRecord && (campaign.title || campaign.brand)) {
            const userTxList = userPointTxMap[sub.user_id] || []
            const normalize = (str) => (str || '').toLowerCase().replace(/\s+/g, '')
            const matchedTx = userTxList.find(tx => {
              if (!tx.description) return false
              const desc = normalize(tx.description)
              const title = normalize(campaign.title)
              const brand = normalize(campaign.brand)
              // 제목 또는 브랜드가 description에 포함되어 있으면 매칭
              // 또는 브랜드 첫 단어(주요 키워드)로도 매칭 시도
              const brandFirstWord = brand.split(/[^a-z가-힣0-9]/)[0]
              return (title && desc.includes(title)) ||
                     (brand && desc.includes(brand)) ||
                     (brandFirstWord && brandFirstWord.length >= 2 && desc.includes(brandFirstWord))
            })
            if (matchedTx) {
              pointRecord = matchedTx
            }
          }

          // 크리에이터 이름: applications → user_profiles 순서로 우선
          // ★ applications에는 nickname 컬럼 없음 - applicant_name만 사용
          const creatorName = app?.applicant_name ||
                              profile?.name || profile?.nickname || null

          // 연락처 (applications에는 phone_number만 있음, user_profiles에는 phone)
          const phone = app?.phone_number || profile?.phone || null
          const email = app?.email || profile?.email || null

          // 캠페인 정보
          const campaignTitle = campaign.title || null
          const campaignBrand = campaign.brand || null

          // 포인트 금액 결정 (creator_points_override > reward_points > estimated_cost 계산)
          const pointAmount = campaign.creator_points_override || campaign.reward_points ||
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

        // 디버그: 매핑 성공률 로그
        console.log(`[${regionId}] 매핑 결과: total=${debugStats.total}, app=${debugStats.foundApp}, campaign=${debugStats.foundCampaign}, profile=${debugStats.foundProfile}`)

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
