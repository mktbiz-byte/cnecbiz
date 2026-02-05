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

        // 핵심: video_submissions + applications + campaigns 조인 쿼리
        // Supabase의 관계형 쿼리 사용 (application_id → applications.id)
        const { data: submissions, error: subError } = await supabase
          .from('video_submissions')
          .select(`
            id,
            user_id,
            campaign_id,
            application_id,
            status,
            final_confirmed_at,
            created_at,
            applications (
              id,
              applicant_name,
              channel_name,
              nickname,
              email,
              phone_number,
              phone,
              campaign_id,
              campaigns (
                id,
                title,
                brand,
                campaign_type,
                point_amount,
                reward_points,
                estimated_cost
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(500)

        if (subError) {
          console.error(`[${regionId}] video_submissions error:`, subError)
          continue
        }

        console.log(`[${regionId}] video_submissions: ${submissions?.length || 0}건`)

        if (!submissions || submissions.length === 0) continue

        // user_id 목록 수집 (point_history 조회용)
        const userIds = [...new Set(submissions.map(s => s.user_id).filter(Boolean))]
        const campaignIds = [...new Set(submissions.map(s => s.campaign_id).filter(Boolean))]

        // point_history 조회 (캠페인별 포인트 지급 기록)
        const pointHistoryMap = {}

        if (userIds.length > 0) {
          // point_history 테이블 시도
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

        // 데이터 매핑
        for (const sub of submissions) {
          const app = sub.applications || {}
          const campaign = app.campaigns || {}
          const pointKey = `${sub.user_id}_${sub.campaign_id}`
          const pointRecord = pointHistoryMap[pointKey]

          // 크리에이터 이름: applications의 다양한 필드에서 가져오기
          const creatorName = app.channel_name || app.nickname || app.applicant_name || null

          // 연락처
          const phone = app.phone_number || app.phone || null
          const email = app.email || null

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
            // 크리에이터 정보 (applications에서)
            creatorName: creatorName,
            phone: phone,
            email: email,
            // 캠페인 정보 (campaigns에서)
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
