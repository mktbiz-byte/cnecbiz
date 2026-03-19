/**
 * 캠페인 최종 확정 관리 - 데이터 조회 API
 * Service Role Key로 RLS 우회하여 조회
 *
 * video_submissions.application_id → applications.id 관계 사용
 */

const { createClient } = require('@supabase/supabase-js')

// 크리에이터 포인트 계산 함수 (1인당)
// 한국: reward_points는 이미 1인당 금액 (캠페인 생성 시 packagePrice * 0.6으로 저장됨)
const calculateCreatorPoints = (campaign) => {
  if (!campaign) return 0
  if (campaign.creator_points_override) return campaign.creator_points_override

  const region = campaign.region || 'korea'

  // 일본/미국은 reward_amount 사용
  if (region === 'japan' || region === 'us') {
    return campaign.reward_amount || 0
  }

  // 한국: reward_points가 이미 1인당 금액
  return campaign.reward_points || 0
}

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

      // 네이버 웍스 알림 발송
      try {
        // 크리에이터 이름 조회 (user_profiles → applications 순서로 시도)
        let creatorName = ''
        const { data: creatorProfile } = await supabase
          .from('user_profiles')
          .select('name, full_name, nickname, channel_name')
          .eq('id', userId)
          .maybeSingle()
        if (creatorProfile) {
          creatorName = creatorProfile.nickname || creatorProfile.channel_name || creatorProfile.name || creatorProfile.full_name || ''
        }
        if (!creatorName) {
          const { data: appData } = await supabase
            .from('applications')
            .select('creator_name, applicant_name')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (appData) {
            creatorName = appData.creator_name || appData.applicant_name || ''
          }
        }
        if (!creatorName) creatorName = '크리에이터'

        const regionLabel = { korea: '한국', kr: '한국', japan: '일본', jp: '일본', us: '미국', usa: '미국' }[region] || region || '한국'
        const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

        await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
            message: `✅ 캠페인 포인트 지급 완료 (수동)\n\n• 크리에이터: ${creatorName}\n• 캠페인: ${campaignTitle || ''}\n• 지급 금액: ${(amount || 0).toLocaleString()}P\n• 리전: ${regionLabel}\n• 시간: ${koreanTime}`
          })
        })
        console.log('[mark_as_paid] 네이버 웍스 알림 발송 완료')
      } catch (worksError) {
        console.error('[mark_as_paid] 네이버 웍스 알림 오류:', worksError)
      }

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

      // 1) point_transactions 조회
      const { data: pointTx } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      // 2) video_submissions에서 캠페인 지급 기록 복원
      //    (기존에 point_history에 기록하다 실패한 건들 = point_transactions에 없는 건)
      let reconstructedPayments = []
      const { data: confirmedVideos } = await supabase
        .from('video_submissions')
        .select('id, campaign_id, final_confirmed_at, auto_confirmed, created_at')
        .eq('user_id', userId)
        .not('final_confirmed_at', 'is', null)
        .order('final_confirmed_at', { ascending: false })

      if (confirmedVideos && confirmedVideos.length > 0) {
        // 캠페인 정보 조회
        const cIds = [...new Set(confirmedVideos.map(v => v.campaign_id).filter(Boolean))]
        let cMap = {}
        if (cIds.length > 0) {
          const { data: camps } = await supabase
            .from('campaigns')
            .select('id, title, reward_points, creator_points_override, campaign_type, total_slots, max_participants, reward_amount, region, week1_reward, week2_reward, week3_reward, week4_reward, step1_reward, step2_reward, step3_reward')
            .in('id', cIds)
          if (camps) camps.forEach(c => { cMap[c.id] = c })
        }

        // point_transactions에 이미 있는 캠페인 ID
        const existingCampaignIds = new Set(
          (pointTx || [])
            .filter(t => t.related_campaign_id)
            .map(t => t.related_campaign_id)
        )

        // 중복 제거 (같은 캠페인 여러 영상이면 한 번만)
        const seenCampaigns = new Set()
        for (const v of confirmedVideos) {
          if (!v.campaign_id || seenCampaigns.has(v.campaign_id)) continue
          if (existingCampaignIds.has(v.campaign_id)) continue
          seenCampaigns.add(v.campaign_id)

          const camp = cMap[v.campaign_id]
          const amount = calculateCreatorPoints(camp)
          if (amount > 0) {
            reconstructedPayments.push({
              id: `vs_${v.id}`,
              user_id: userId,
              amount: amount,
              transaction_type: 'campaign_payment',
              description: `캠페인 완료: ${camp?.title || ''}`,
              related_campaign_id: v.campaign_id,
              created_at: v.final_confirmed_at,
              source: 'reconstructed_from_video_submissions'
            })
          }
        }
      }

      // 합쳐서 반환
      const allTransactions = [...(pointTx || []), ...reconstructedPayments]
      allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          history: [],
          transactions: allTransactions
        })
      }
    }

    // ===== 전체 데이터 조회 (point_transactions 기반 재설계) =====
    // confirmed: point_transactions에 기록이 있는 건 (실제 지급 확인)
    // unpaid: 최종확정/완료 되었지만 point_transactions 기록이 없는 건 (진짜 미지급)
    // pendingConfirmation: 영상 승인 완료(approved)이지만 최종확정이 안 된 건 (확정 대기)
    const results = {
      confirmed: [],
      unpaid: [],
      pendingConfirmation: []
    }

    for (const [regionId, config] of Object.entries(regionConfigs)) {
      if (!config.url || !config.key) {
        console.log(`[${regionId}] Supabase config missing`)
        continue
      }

      try {
        const supabase = createClient(config.url, config.key)

        // ── Step 1: point_transactions에서 캠페인 지급 기록 전부 조회 (Source of Truth) ──
        const { data: campaignPayments, error: cpError } = await supabase
          .from('point_transactions')
          .select('user_id, related_campaign_id, amount, transaction_type, description, created_at')
          .not('related_campaign_id', 'is', null)
          .order('created_at', { ascending: false })

        if (cpError) {
          console.error(`[${regionId}] point_transactions error:`, cpError.message)
        }

        // 지급 맵 구축
        const paidKeys = new Set()
        const paymentMap = {}
        for (const p of (campaignPayments || [])) {
          const key = `${p.user_id}_${p.related_campaign_id}`
          paidKeys.add(key)
          if (!paymentMap[key]) paymentMap[key] = p
        }
        console.log(`[${regionId}] point_transactions 캠페인 지급 기록: ${paidKeys.size}건`)

        // ── Step 2: video_submissions 조회 (미지급 건 탐지 + 보충 데이터용) ──
        const { data: submissions, error: subError } = await supabase
          .from('video_submissions')
          .select('id, user_id, campaign_id, application_id, status, final_confirmed_at, auto_confirmed, sns_upload_url, created_at')
          .order('created_at', { ascending: false })
          .limit(500)

        if (subError) {
          console.error(`[${regionId}] video_submissions error:`, subError)
        }

        // ── Step 3: ID 목록 수집 ──
        const paidUserIds = (campaignPayments || []).map(p => p.user_id).filter(Boolean)
        const paidCampaignIds = (campaignPayments || []).map(p => p.related_campaign_id).filter(Boolean)
        const subUserIds = (submissions || []).map(s => s.user_id).filter(Boolean)
        const subCampaignIds = (submissions || []).map(s => s.campaign_id).filter(Boolean)
        const applicationIds = [...new Set((submissions || []).map(s => s.application_id).filter(Boolean))]

        const allUserIds = [...new Set([...paidUserIds, ...subUserIds])]
        const allCampaignIds = [...new Set([...paidCampaignIds, ...subCampaignIds])]

        // ── Step 4: 보충 데이터 조회 (applications, campaigns, user_profiles) ──
        const applicationsMap = {}
        if (applicationIds.length > 0) {
          const { data: apps } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, phone_number')
            .in('id', applicationIds)
          if (apps) apps.forEach(a => { applicationsMap[a.id] = a })
        }
        // user_id + campaign_id 기반 추가 조회
        if (allUserIds.length > 0 && allCampaignIds.length > 0) {
          const { data: apps2 } = await supabase
            .from('applications')
            .select('id, user_id, campaign_id, applicant_name, phone_number')
            .in('user_id', allUserIds)
            .in('campaign_id', allCampaignIds)
          if (apps2) {
            apps2.forEach(a => {
              if (!applicationsMap[a.id]) applicationsMap[a.id] = a
              const key = `${a.user_id}_${a.campaign_id}`
              if (!applicationsMap[key]) applicationsMap[key] = a
            })
          }
        }

        const campaignsMap = {}
        if (allCampaignIds.length > 0) {
          const { data: camps } = await supabase
            .from('campaigns')
            .select('id, title, brand, campaign_type, creator_points_override, reward_points, estimated_cost, total_slots, max_participants, reward_amount, region, week1_reward, week2_reward, week3_reward, week4_reward, step1_reward, step2_reward, step3_reward')
            .in('id', allCampaignIds)
          if (camps) camps.forEach(c => { campaignsMap[c.id] = c })
        }

        const userProfilesMap = {}
        if (allUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, name, email, phone')
            .in('id', allUserIds)
          if (profiles) profiles.forEach(p => { userProfilesMap[p.id] = p })
        }

        // ── Step 5: confirmed 목록 구축 (point_transactions 기준 = Source of Truth) ──
        const seenConfirmed = new Set()

        // video_submissions를 user+campaign으로 인덱싱
        const subByUserCampaign = {}
        for (const sub of (submissions || [])) {
          const key = `${sub.user_id}_${sub.campaign_id}`
          if (!subByUserCampaign[key]) subByUserCampaign[key] = sub
        }

        for (const payment of (campaignPayments || [])) {
          const dedupeKey = `${payment.user_id}_${payment.related_campaign_id}_${regionId}`
          if (seenConfirmed.has(dedupeKey)) continue
          seenConfirmed.add(dedupeKey)

          const matchingSub = subByUserCampaign[`${payment.user_id}_${payment.related_campaign_id}`]
          const appKey = `${payment.user_id}_${payment.related_campaign_id}`
          let app = applicationsMap[appKey]
          if (!app && matchingSub?.application_id) app = applicationsMap[matchingSub.application_id]

          const campaign = campaignsMap[payment.related_campaign_id] || {}
          const profile = userProfilesMap[payment.user_id] || {}
          const pointAmount = calculateCreatorPoints(campaign)

          results.confirmed.push({
            id: matchingSub?.id || `pt_${payment.user_id}_${payment.related_campaign_id}`,
            region: regionId,
            userId: payment.user_id,
            campaignId: payment.related_campaign_id,
            applicationId: matchingSub?.application_id || app?.id || null,
            status: matchingSub?.status || 'completed',
            finalConfirmedAt: matchingSub?.final_confirmed_at || payment.created_at,
            createdAt: matchingSub?.created_at || payment.created_at,
            creatorName: app?.applicant_name || profile?.name || null,
            phone: app?.phone_number || profile?.phone || null,
            email: profile?.email || null,
            campaignTitle: campaign.title || null,
            campaignBrand: campaign.brand || null,
            campaignType: campaign.campaign_type,
            pointAmount: pointAmount,
            isPaid: true,
            paidAmount: payment.amount,
            paidAt: payment.created_at
          })
        }

        // ── Step 6: unpaid 목록 구축 (확정/완료 되었지만 point_transactions에 없는 건) ──
        const seenUnpaid = new Set()
        for (const sub of (submissions || [])) {
          const payKey = `${sub.user_id}_${sub.campaign_id}`
          const dedupeKey = `${sub.user_id}_${sub.campaign_id}_${regionId}`

          // 이미 point_transactions에 있으면 skip (지급 확인됨)
          if (paidKeys.has(payKey)) continue

          // 미지급 대상: final_confirmed_at 설정됨 OR status=completed OR auto_confirmed
          if (!sub.final_confirmed_at && sub.status !== 'completed' && !sub.auto_confirmed) continue

          if (seenUnpaid.has(dedupeKey)) continue
          seenUnpaid.add(dedupeKey)

          let app = sub.application_id ? applicationsMap[sub.application_id] : null
          if (!app) app = applicationsMap[payKey]

          const campaign = campaignsMap[sub.campaign_id] || {}
          const profile = userProfilesMap[sub.user_id] || {}
          const pointAmount = calculateCreatorPoints(campaign)

          results.unpaid.push({
            id: sub.id,
            region: regionId,
            userId: sub.user_id,
            campaignId: sub.campaign_id,
            applicationId: sub.application_id,
            status: sub.status,
            finalConfirmedAt: sub.final_confirmed_at,
            createdAt: sub.created_at,
            creatorName: app?.applicant_name || profile?.name || null,
            phone: app?.phone_number || profile?.phone || null,
            email: profile?.email || null,
            campaignTitle: campaign.title || null,
            campaignBrand: campaign.brand || null,
            campaignType: campaign.campaign_type,
            pointAmount: pointAmount,
            isPaid: false,
            paidAmount: 0,
            paidAt: null
          })
        }

        // ── Step 7: pendingConfirmation 목록 (영상 승인 완료 but 최종확정 안 된 건) ──
        const seenPending = new Set()
        for (const sub of (submissions || [])) {
          const payKey = `${sub.user_id}_${sub.campaign_id}`
          const dedupeKey = `${sub.user_id}_${sub.campaign_id}_${regionId}`

          // 이미 point_transactions에 있으면 skip (지급 완료)
          if (paidKeys.has(payKey)) continue

          // 이미 최종확정 됐으면 skip (unpaid에서 처리됨)
          if (sub.final_confirmed_at) continue

          // status가 approved인 건만 (영상 승인 완료 = 최종확정 버튼 활성화 상태)
          if (sub.status !== 'approved') continue

          if (seenPending.has(dedupeKey)) continue
          seenPending.add(dedupeKey)

          let app = sub.application_id ? applicationsMap[sub.application_id] : null
          if (!app) app = applicationsMap[payKey]

          const campaign = campaignsMap[sub.campaign_id] || {}
          const profile = userProfilesMap[sub.user_id] || {}
          const pointAmount = calculateCreatorPoints(campaign)

          results.pendingConfirmation.push({
            id: sub.id,
            region: regionId,
            userId: sub.user_id,
            campaignId: sub.campaign_id,
            applicationId: sub.application_id,
            status: sub.status,
            snsUploadUrl: sub.sns_upload_url,
            finalConfirmedAt: null,
            createdAt: sub.created_at,
            creatorName: app?.applicant_name || profile?.name || null,
            phone: app?.phone_number || profile?.phone || null,
            email: profile?.email || null,
            campaignTitle: campaign.title || null,
            campaignBrand: campaign.brand || null,
            campaignType: campaign.campaign_type,
            pointAmount: pointAmount,
            isPaid: false,
            paidAmount: 0,
            paidAt: null
          })
        }

        console.log(`[${regionId}] 결과: confirmed=${results.confirmed.length}, unpaid=${results.unpaid.length}, pendingConfirmation=${results.pendingConfirmation.length}`)

      } catch (err) {
        console.error(`[${regionId}] Error:`, err)
      }
    }

    // 정렬
    results.confirmed.sort((a, b) => new Date(b.paidAt || b.finalConfirmedAt) - new Date(a.paidAt || a.finalConfirmedAt))
    results.unpaid.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    results.pendingConfirmation.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    console.log(`Total - confirmed: ${results.confirmed.length}, unpaid: ${results.unpaid.length}, pendingConfirmation: ${results.pendingConfirmation.length}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        confirmed: results.confirmed,
        unpaid: results.unpaid,
        pendingConfirmation: results.pendingConfirmation
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
