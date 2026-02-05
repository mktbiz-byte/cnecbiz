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

        // user_profiles 조회 (Korea DB는 user_id, nickname 컬럼 없음)
        if (sub.user_id) {
          const { data: prof1 } = await supabase.from('user_profiles')
            .select('id, name, email, phone').eq('id', sub.user_id).maybeSingle()
          result.userProfile = prof1
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

    // 수동 지급완료 처리 (이미 지급된 건을 수동으로 마킹)
    if (action === 'mark_as_paid') {
      const { amount, campaignTitle, submissionId } = JSON.parse(event.body || '{}')
      const config = regionConfigs[region]
      if (!config || !config.url || !config.key) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid region' }) }
      }
      if (!userId || !campaignId) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'userId와 campaignId가 필요합니다.' }) }
      }

      const supabase = createClient(config.url, config.key)

      // point_transactions에 캠페인 연결 기록 추가
      const { error: insertError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          amount: amount || 0,
          transaction_type: 'campaign_payment',
          description: `캠페인 포인트 지급: ${campaignTitle || ''}`,
          related_campaign_id: campaignId,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('[mark_as_paid] insert error:', insertError)
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: insertError.message }) }
      }

      // video_submissions에 final_confirmed_at 설정 (아직 없는 경우)
      if (submissionId) {
        await supabase
          .from('video_submissions')
          .update({ final_confirmed_at: new Date().toISOString() })
          .eq('id', submissionId)
          .is('final_confirmed_at', null)
      }

      console.log(`[mark_as_paid] user=${userId}, campaign=${campaignId}, amount=${amount}`)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '지급완료 처리되었습니다.' })
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

      // point_transactions 조회 (point_history 테이블은 Korea DB에 존재하지 않음)
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
          history: [],
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
        // ★ email, phone 컬럼 없음 - phone_number만 사용, applicant_name만 사용
        const applicationsMap = {}
        if (applicationIds.length > 0) {
          const { data: applications, error: appError } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, phone_number')
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
            .select('id, user_id, campaign_id, applicant_name, phone_number')
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
        // ★ Korea DB: user_id 컬럼 없음, nickname 컬럼 없음
        const userProfilesMap = {}
        if (userIds.length > 0) {
          // Korea는 id = auth user id
          // Korea DB는 user_id, nickname 컬럼 없음 - id, name, email, phone만 사용
          const { data: profilesById, error: profError1 } = await supabase
            .from('user_profiles')
            .select('id, name, email, phone')
            .in('id', userIds)

          if (profError1) {
            console.error(`[${regionId}] user_profiles error:`, profError1.message)
          }
          if (profilesById) {
            profilesById.forEach(p => {
              userProfilesMap[p.id] = p
            })
          }
          console.log(`[${regionId}] user_profiles: ${Object.keys(userProfilesMap).length}건`)
        }

        // 5단계: point_transactions에서 캠페인별 지급 기록 조회
        // ★ related_campaign_id가 있는 건만 = mark_as_paid 또는 manual_pay로 기록된 건
        const paymentMap = {}
        if (userIds.length > 0) {
          const { data: campaignPayments, error: cpError } = await supabase
            .from('point_transactions')
            .select('user_id, related_campaign_id, amount, transaction_type, description, created_at')
            .in('user_id', userIds)
            .not('related_campaign_id', 'is', null)

          if (cpError) {
            console.error(`[${regionId}] campaign payments query error:`, cpError.message)
          }
          if (campaignPayments) {
            campaignPayments.forEach(p => {
              const key = `${p.user_id}_${p.related_campaign_id}`
              if (!paymentMap[key]) {
                paymentMap[key] = p
              }
            })
          }
          console.log(`[${regionId}] campaign payment records: ${Object.keys(paymentMap).length}건`)
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

          // 포인트 지급 여부: point_transactions에 related_campaign_id로 기록된 건 확인
          const paymentKey = `${sub.user_id}_${sub.campaign_id}`
          const paymentRecord = paymentMap[paymentKey]
          const isPaid = !!paymentRecord

          // 크리에이터 이름: applications → user_profiles 순서로 우선
          // ★ applications에는 nickname, email 없음 / user_profiles에는 nickname 없음
          const creatorName = app?.applicant_name || profile?.name || null

          // 연락처: applications에는 phone_number만 있음 (email 없음), user_profiles에는 phone, email 있음
          const phone = app?.phone_number || profile?.phone || null
          const email = profile?.email || null

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
            // 포인트 지급 여부 (point_transactions.related_campaign_id 기준)
            isPaid: isPaid,
            paidAmount: paymentRecord?.amount || 0,
            paidAt: paymentRecord?.created_at || null
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
