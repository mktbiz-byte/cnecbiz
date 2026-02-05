const { createClient } = require('@supabase/supabase-js')

// BIZ DB
const supabaseBizUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseBizKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseBiz = createClient(supabaseBizUrl, supabaseBizKey)

// Korea DB
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL
const supabaseKoreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
const supabaseKorea = createClient(supabaseKoreaUrl, supabaseKoreaKey)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

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
    const body = JSON.parse(event.body || '{}')
    const { action } = body

    // 미지급 건 조회
    if (action === 'get_unpaid') {
      const unpaidItems = []

      // 5일 전 날짜 계산
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

      // 1. Korea DB에서 승인되었지만 최종 확정되지 않은 영상 조회
      const { data: pendingVideos, error: videoError } = await supabaseKorea
        .from('video_submissions')
        .select(`
          id,
          user_id,
          campaign_id,
          video_url,
          status,
          approved_at,
          final_confirmed_at,
          created_at,
          application_id
        `)
        .eq('status', 'approved')
        .is('final_confirmed_at', null)
        .lt('approved_at', fiveDaysAgo.toISOString())
        .order('approved_at', { ascending: true })
        .limit(500)

      if (videoError) {
        console.error('[check-unpaid-points] Video query error:', videoError)
      }

      if (pendingVideos && pendingVideos.length > 0) {
        console.log(`[check-unpaid-points] Found ${pendingVideos.length} pending videos`)

        // 캠페인 정보 조회
        const campaignIds = [...new Set(pendingVideos.map(v => v.campaign_id).filter(Boolean))]
        let campaignMap = {}

        if (campaignIds.length > 0) {
          // Korea DB에서 먼저 조회
          const { data: koreaCampaigns } = await supabaseKorea
            .from('campaigns')
            .select('id, title, campaign_type, video_count, reward_points, point')
            .in('id', campaignIds)

          if (koreaCampaigns) {
            koreaCampaigns.forEach(c => { campaignMap[c.id] = c })
          }

          // BIZ DB에서도 조회 (Korea에 없는 캠페인)
          const missingIds = campaignIds.filter(id => !campaignMap[id])
          if (missingIds.length > 0) {
            const { data: bizCampaigns } = await supabaseBiz
              .from('campaigns')
              .select('id, title, campaign_type, video_count, reward_points, point')
              .in('id', missingIds)

            if (bizCampaigns) {
              bizCampaigns.forEach(c => { campaignMap[c.id] = c })
            }
          }
        }

        // 크리에이터 정보 조회
        const userIds = [...new Set(pendingVideos.map(v => v.user_id).filter(Boolean))]
        let profileMap = {}

        if (userIds.length > 0) {
          const { data: profiles } = await supabaseKorea
            .from('user_profiles')
            .select('id, name, channel_name, email, phone, points')
            .in('id', userIds)

          if (profiles) {
            profiles.forEach(p => { profileMap[p.id] = p })
          }
        }

        // 멀티비디오 캠페인 체크를 위해 같은 캠페인의 다른 영상 조회
        for (const video of pendingVideos) {
          const campaign = campaignMap[video.campaign_id]
          const profile = profileMap[video.user_id]

          if (!campaign) {
            unpaidItems.push({
              type: 'video',
              id: video.id,
              user_id: video.user_id,
              campaign_id: video.campaign_id,
              creator_name: profile?.channel_name || profile?.name || video.user_id?.substring(0, 8),
              creator_email: profile?.email || '',
              campaign_title: '캠페인 정보 없음',
              reward_points: 0,
              approved_at: video.approved_at,
              days_since_approval: Math.floor((new Date() - new Date(video.approved_at)) / (1000 * 60 * 60 * 24)),
              reason: '캠페인 정보 조회 실패',
              video_url: video.video_url
            })
            continue
          }

          const isMultiVideo = campaign.video_count > 1 ||
            campaign.campaign_type === '4week_challenge' ||
            campaign.campaign_type === 'oliveyoung' ||
            campaign.campaign_type === 'oliveyoung_sale'

          let reason = ''
          let requiredCount = 1
          let completedCount = 1

          if (isMultiVideo) {
            // 필요 영상 수 결정
            if (campaign.campaign_type === '4week_challenge') {
              requiredCount = 4
            } else if (campaign.campaign_type === 'oliveyoung' || campaign.campaign_type === 'oliveyoung_sale') {
              requiredCount = 2
            } else {
              requiredCount = campaign.video_count || 4
            }

            // 같은 캠페인 + 같은 크리에이터의 승인된 영상 수 조회
            const { data: allVideos } = await supabaseKorea
              .from('video_submissions')
              .select('id, status')
              .eq('campaign_id', video.campaign_id)
              .eq('user_id', video.user_id)
              .in('status', ['approved', 'completed', 'final_confirmed'])

            completedCount = allVideos?.length || 1

            if (completedCount < requiredCount) {
              reason = `멀티비디오 미완성 (${completedCount}/${requiredCount}개)`
            }
          }

          // 포인트 금액
          const pointAmount = campaign.reward_points || campaign.point || 0

          if (pointAmount === 0) {
            reason = reason ? `${reason}, 보상 포인트 미설정` : '보상 포인트 미설정'
          }

          if (!profile) {
            reason = reason ? `${reason}, 크리에이터 프로필 없음` : '크리에이터 프로필 없음'
          }

          if (!reason) {
            reason = '원인 불명 - 수동 확인 필요'
          }

          unpaidItems.push({
            type: 'video',
            id: video.id,
            user_id: video.user_id,
            campaign_id: video.campaign_id,
            application_id: video.application_id,
            creator_name: profile?.channel_name || profile?.name || video.user_id?.substring(0, 8),
            creator_email: profile?.email || '',
            creator_phone: profile?.phone || '',
            current_points: profile?.points || 0,
            campaign_title: campaign.title,
            campaign_type: campaign.campaign_type,
            reward_points: pointAmount,
            approved_at: video.approved_at,
            days_since_approval: Math.floor((new Date() - new Date(video.approved_at)) / (1000 * 60 * 60 * 24)),
            reason,
            video_url: video.video_url,
            is_multi_video: isMultiVideo,
            required_count: requiredCount,
            completed_count: completedCount
          })
        }
      }

      // 2. BIZ DB applications에서 completed인데 point_history에 기록 없는 건 조회
      const { data: completedApps, error: appError } = await supabaseBiz
        .from('applications')
        .select(`
          id,
          user_id,
          campaign_id,
          status,
          updated_at,
          created_at
        `)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(200)

      if (appError) {
        console.error('[check-unpaid-points] Applications query error:', appError)
      }

      if (completedApps && completedApps.length > 0) {
        // 캠페인 정보 조회
        const campaignIds = [...new Set(completedApps.map(a => a.campaign_id).filter(Boolean))]
        let campaignMap = {}

        if (campaignIds.length > 0) {
          const { data: campaigns } = await supabaseBiz
            .from('campaigns')
            .select('id, title, reward_points, point')
            .in('id', campaignIds)

          if (campaigns) {
            campaigns.forEach(c => { campaignMap[c.id] = c })
          }
        }

        // point_history에서 이미 지급된 건 확인
        const appIds = completedApps.map(a => a.id)
        let paidAppIds = new Set()

        // Korea DB point_history 체크
        try {
          const { data: paidHistory } = await supabaseKorea
            .from('point_history')
            .select('application_id')
            .in('application_id', appIds)

          if (paidHistory) {
            paidHistory.forEach(h => {
              if (h.application_id) paidAppIds.add(h.application_id)
            })
          }
        } catch (e) {
          // point_history 테이블 없을 수 있음
        }

        // 프로필 정보 조회
        const userIds = [...new Set(completedApps.map(a => a.user_id).filter(Boolean))]
        let profileMap = {}

        if (userIds.length > 0) {
          // Korea DB에서 프로필 조회
          const { data: profiles } = await supabaseKorea
            .from('user_profiles')
            .select('id, name, channel_name, email, phone, points')
            .in('id', userIds)

          if (profiles) {
            profiles.forEach(p => { profileMap[p.id] = p })
          }
        }

        for (const app of completedApps) {
          // 이미 지급된 건은 스킵
          if (paidAppIds.has(app.id)) continue

          // 이미 unpaidItems에 있는지 체크 (video_submissions 기반)
          const alreadyAdded = unpaidItems.some(item =>
            item.campaign_id === app.campaign_id && item.user_id === app.user_id
          )
          if (alreadyAdded) continue

          const campaign = campaignMap[app.campaign_id]
          const profile = profileMap[app.user_id]
          const pointAmount = campaign?.reward_points || campaign?.point || 0

          let reason = 'completed 상태이나 point_history에 기록 없음'

          if (!campaign) {
            reason += ', 캠페인 정보 없음'
          }

          if (pointAmount === 0) {
            reason += ', 보상 포인트 미설정'
          }

          if (!profile) {
            reason += ', 크리에이터 프로필 없음 (Korea DB)'
          }

          unpaidItems.push({
            type: 'application',
            id: app.id,
            user_id: app.user_id,
            campaign_id: app.campaign_id,
            creator_name: profile?.channel_name || profile?.name || app.user_id?.substring(0, 8),
            creator_email: profile?.email || '',
            creator_phone: profile?.phone || '',
            current_points: profile?.points || 0,
            campaign_title: campaign?.title || '캠페인 정보 없음',
            reward_points: pointAmount,
            completed_at: app.updated_at,
            reason
          })
        }
      }

      // 결과 정렬 (승인일 기준 오래된 순)
      unpaidItems.sort((a, b) => {
        const dateA = new Date(a.approved_at || a.completed_at || 0)
        const dateB = new Date(b.approved_at || b.completed_at || 0)
        return dateA - dateB
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          unpaidItems,
          count: unpaidItems.length,
          summary: {
            total: unpaidItems.length,
            multiVideoIncomplete: unpaidItems.filter(i => i.reason?.includes('멀티비디오')).length,
            noRewardPoints: unpaidItems.filter(i => i.reason?.includes('보상 포인트')).length,
            noProfile: unpaidItems.filter(i => i.reason?.includes('프로필')).length,
            noCampaign: unpaidItems.filter(i => i.reason?.includes('캠페인 정보')).length,
            unknown: unpaidItems.filter(i => i.reason?.includes('원인 불명')).length
          }
        })
      }
    }

    // 수동 포인트 지급
    if (action === 'manual_pay') {
      const { videoId, userId, campaignId, amount, reason } = body

      if (!userId || !amount) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'userId와 amount가 필요합니다.' })
        }
      }

      // 크리에이터 프로필 조회
      const { data: profile, error: profileError } = await supabaseKorea
        .from('user_profiles')
        .select('id, points, name, channel_name, email')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '크리에이터 프로필을 찾을 수 없습니다.' })
        }
      }

      // 포인트 업데이트
      const newPoints = (profile.points || 0) + amount

      const { error: updateError } = await supabaseKorea
        .from('user_profiles')
        .update({ points: newPoints })
        .eq('id', userId)

      if (updateError) {
        console.error('[check-unpaid-points] Update error:', updateError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: '포인트 업데이트 실패' })
        }
      }

      // point_history에 기록
      try {
        await supabaseKorea
          .from('point_history')
          .insert({
            user_id: userId,
            amount: amount,
            type: 'manual_pay',
            reason: reason || '수동 포인트 지급 (미지급 건 처리)',
            campaign_id: campaignId || null,
            created_at: new Date().toISOString()
          })
      } catch (e) {
        console.error('[check-unpaid-points] point_history insert error:', e)
      }

      // video_submissions에서 final_confirmed_at 업데이트
      if (videoId) {
        await supabaseKorea
          .from('video_submissions')
          .update({
            final_confirmed_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', videoId)
      }

      console.log(`[check-unpaid-points] Manual pay: user=${userId}, amount=${amount}, new_balance=${newPoints}`)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `${profile.channel_name || profile.name}님에게 ${amount.toLocaleString()}P 지급 완료`,
          newBalance: newPoints
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid action' })
    }

  } catch (error) {
    console.error('[check-unpaid-points] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
