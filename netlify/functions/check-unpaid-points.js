const { createClient } = require('@supabase/supabase-js')

// BIZ DB
const supabaseBizUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseBizKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseBiz = createClient(supabaseBizUrl, supabaseBizKey)

// Korea DB
const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL
const supabaseKoreaKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
const supabaseKorea = createClient(supabaseKoreaUrl, supabaseKoreaKey)

// Japan DB
const supabaseJapanUrl = process.env.VITE_SUPABASE_JAPAN_URL
const supabaseJapanKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
const supabaseJapan = supabaseJapanUrl && supabaseJapanKey ? createClient(supabaseJapanUrl, supabaseJapanKey) : null

// US DB
const supabaseUSUrl = process.env.VITE_SUPABASE_US_URL
const supabaseUSKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
const supabaseUS = supabaseUSUrl && supabaseUSKey ? createClient(supabaseUSUrl, supabaseUSKey) : null

// 리전별 DB 클라이언트
const regionDBs = {
  korea: { db: supabaseKorea, name: '한국' },
  japan: { db: supabaseJapan, name: '일본' },
  us: { db: supabaseUS, name: '미국' }
}

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
      const regionSummary = {}

      // 3일 전 날짜 계산 (5일에서 3일로 완화)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      // 각 리전별로 미지급 건 조회
      for (const [regionKey, regionInfo] of Object.entries(regionDBs)) {
        const regionDB = regionInfo.db
        if (!regionDB) {
          console.log(`[check-unpaid-points] ${regionInfo.name} DB not configured, skipping`)
          continue
        }

        console.log(`[check-unpaid-points] Checking ${regionInfo.name} region...`)
        regionSummary[regionKey] = { name: regionInfo.name, videos: 0, applications: 0 }

        try {
          // 1. video_submissions에서 승인되었지만 최종 확정되지 않은 영상 조회
          const { data: pendingVideos, error: videoError } = await regionDB
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
            .order('approved_at', { ascending: true })
            .limit(500)

          if (videoError) {
            console.error(`[check-unpaid-points] ${regionInfo.name} video query error:`, videoError)
          }

          if (pendingVideos && pendingVideos.length > 0) {
            console.log(`[check-unpaid-points] ${regionInfo.name}: Found ${pendingVideos.length} pending videos`)
            regionSummary[regionKey].videos = pendingVideos.length

            // 캠페인 정보 조회
            const campaignIds = [...new Set(pendingVideos.map(v => v.campaign_id).filter(Boolean))]
            let campaignMap = {}

            if (campaignIds.length > 0) {
              // 해당 리전 DB에서 먼저 조회
              const { data: regionCampaigns } = await regionDB
                .from('campaigns')
                .select('id, title, campaign_type, reward_points, creator_points_override')
                .in('id', campaignIds)

              if (regionCampaigns) {
                regionCampaigns.forEach(c => { campaignMap[c.id] = c })
              }

              // BIZ DB에서도 조회 (리전에 없는 캠페인)
              const missingIds = campaignIds.filter(id => !campaignMap[id])
              if (missingIds.length > 0) {
                const { data: bizCampaigns } = await supabaseBiz
                  .from('campaigns')
                  .select('id, title, campaign_type, reward_points, creator_points_override')
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
              const { data: profiles } = await regionDB
                .from('user_profiles')
                .select('id, name, channel_name, email, phone, points')
                .in('id', userIds)

              if (profiles) {
                profiles.forEach(p => { profileMap[p.id] = p })
              }
            }

            // 각 영상 분석 (같은 user+campaign 중복 방지)
            const seenUserCampaign = new Set()
            for (const video of pendingVideos) {
              // 멀티비디오 캠페인: 같은 user+campaign은 1건만 표시
              const ucKey = `${video.user_id}_${video.campaign_id}_${regionKey}`
              if (seenUserCampaign.has(ucKey)) continue
              seenUserCampaign.add(ucKey)

              const campaign = campaignMap[video.campaign_id]
              const profile = profileMap[video.user_id]

              // 승인 후 경과일 계산
              const daysSinceApproval = video.approved_at
                ? Math.floor((new Date() - new Date(video.approved_at)) / (1000 * 60 * 60 * 24))
                : 0

              if (!campaign) {
                unpaidItems.push({
                  type: 'video',
                  region: regionKey,
                  regionName: regionInfo.name,
                  id: video.id,
                  user_id: video.user_id,
                  campaign_id: video.campaign_id,
                  creator_name: profile?.channel_name || profile?.name || video.user_id?.substring(0, 8),
                  creator_email: profile?.email || '',
                  campaign_title: '캠페인 정보 없음',
                  reward_points: 0,
                  approved_at: video.approved_at,
                  days_since_approval: daysSinceApproval,
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
                const { data: allVideos } = await regionDB
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
              const pointAmount = campaign.creator_points_override || campaign.reward_points || 0

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
                region: regionKey,
                regionName: regionInfo.name,
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
                days_since_approval: daysSinceApproval,
                reason,
                video_url: video.video_url,
                is_multi_video: isMultiVideo,
                required_count: requiredCount,
                completed_count: completedCount
              })
            }
          }

          // 2. applications에서 completed인데 포인트가 지급되지 않은 건 조회
          try {
            const { data: completedApps, error: appError } = await regionDB
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
              console.log(`[check-unpaid-points] ${regionInfo.name} applications query skipped:`, appError.message)
            }

            if (completedApps && completedApps.length > 0) {
              console.log(`[check-unpaid-points] ${regionInfo.name}: Found ${completedApps.length} completed applications`)

              // 캠페인 정보 조회
              const campaignIds = [...new Set(completedApps.map(a => a.campaign_id).filter(Boolean))]
              let campaignMap = {}

              if (campaignIds.length > 0) {
                const { data: campaigns } = await regionDB
                  .from('campaigns')
                  .select('id, title, reward_points, creator_points_override')
                  .in('id', campaignIds)

                if (campaigns) {
                  campaigns.forEach(c => { campaignMap[c.id] = c })
                }

                // BIZ DB에서도 조회
                const missingIds = campaignIds.filter(id => !campaignMap[id])
                if (missingIds.length > 0) {
                  const { data: bizCampaigns } = await supabaseBiz
                    .from('campaigns')
                    .select('id, title, reward_points, creator_points_override')
                    .in('id', missingIds)

                  if (bizCampaigns) {
                    bizCampaigns.forEach(c => { campaignMap[c.id] = c })
                  }
                }
              }

              // point_transactions에서 이미 지급된 건 확인 (related_campaign_id 기반)
              const appUserIds = [...new Set(completedApps.map(a => a.user_id).filter(Boolean))]
              const paidCampaignKeys = new Set()

              if (appUserIds.length > 0) {
                try {
                  const { data: paidRecords } = await regionDB
                    .from('point_transactions')
                    .select('user_id, related_campaign_id')
                    .in('user_id', appUserIds)
                    .not('related_campaign_id', 'is', null)

                  if (paidRecords) {
                    paidRecords.forEach(r => {
                      paidCampaignKeys.add(`${r.user_id}_${r.related_campaign_id}`)
                    })
                  }
                } catch (e) {
                  console.error(`[check-unpaid-points] point_transactions query error:`, e)
                }
              }

              // 프로필 정보 조회
              let profileMap = {}

              if (appUserIds.length > 0) {
                const { data: profiles } = await regionDB
                  .from('user_profiles')
                  .select('id, name, channel_name, email, phone, points')
                  .in('id', appUserIds)

                if (profiles) {
                  profiles.forEach(p => { profileMap[p.id] = p })
                }
              }

              for (const app of completedApps) {
                // point_transactions에 캠페인 지급 기록이 있으면 스킵
                const paidKey = `${app.user_id}_${app.campaign_id}`
                if (paidCampaignKeys.has(paidKey)) continue

                // 이미 unpaidItems에 있는지 체크
                const alreadyAdded = unpaidItems.some(item =>
                  item.campaign_id === app.campaign_id && item.user_id === app.user_id && item.region === regionKey
                )
                if (alreadyAdded) continue

                const campaign = campaignMap[app.campaign_id]
                const profile = profileMap[app.user_id]
                const pointAmount = campaign?.creator_points_override || campaign?.reward_points || 0

                let reason = 'completed 상태이나 point_transactions에 캠페인 지급 기록 없음'

                if (!campaign) {
                  reason += ', 캠페인 정보 없음'
                }

                if (pointAmount === 0) {
                  reason += ', 보상 포인트 미설정'
                }

                if (!profile) {
                  reason += ', 크리에이터 프로필 없음'
                }

                regionSummary[regionKey].applications++

                unpaidItems.push({
                  type: 'application',
                  region: regionKey,
                  regionName: regionInfo.name,
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
          } catch (appQueryError) {
            console.log(`[check-unpaid-points] ${regionInfo.name} applications table not available`)
          }

        } catch (regionError) {
          console.error(`[check-unpaid-points] ${regionInfo.name} region error:`, regionError)
        }
      }

      // 결과 정렬 (승인일 기준 오래된 순)
      unpaidItems.sort((a, b) => {
        const dateA = new Date(a.approved_at || a.completed_at || 0)
        const dateB = new Date(b.approved_at || b.completed_at || 0)
        return dateA - dateB
      })

      console.log(`[check-unpaid-points] Total unpaid items: ${unpaidItems.length}`)
      console.log(`[check-unpaid-points] Region summary:`, regionSummary)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          unpaidItems,
          count: unpaidItems.length,
          regionSummary,
          summary: {
            total: unpaidItems.length,
            multiVideoIncomplete: unpaidItems.filter(i => i.reason?.includes('멀티비디오')).length,
            noRewardPoints: unpaidItems.filter(i => i.reason?.includes('보상 포인트')).length,
            noProfile: unpaidItems.filter(i => i.reason?.includes('프로필')).length,
            noCampaign: unpaidItems.filter(i => i.reason?.includes('캠페인 정보')).length,
            unknown: unpaidItems.filter(i => i.reason?.includes('원인 불명')).length,
            byRegion: {
              korea: unpaidItems.filter(i => i.region === 'korea').length,
              japan: unpaidItems.filter(i => i.region === 'japan').length,
              us: unpaidItems.filter(i => i.region === 'us').length
            }
          }
        })
      }
    }

    // 수동 포인트 지급
    if (action === 'manual_pay') {
      const { videoId, userId, campaignId, amount, reason, region = 'korea' } = body

      if (!userId || !amount) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'userId와 amount가 필요합니다.' })
        }
      }

      // 리전별 DB 선택
      const regionInfo = regionDBs[region]
      const regionDB = regionInfo?.db

      if (!regionDB) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `${region} 리전 DB를 찾을 수 없습니다.` })
        }
      }

      // 크리에이터 프로필 조회
      const { data: profile, error: profileError } = await regionDB
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

      const { error: updateError } = await regionDB
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

      // point_transactions에 캠페인 연결 기록 추가 (지급 추적용)
      try {
        await regionDB
          .from('point_transactions')
          .insert({
            user_id: userId,
            amount: amount,
            transaction_type: 'campaign_payment',
            description: reason || '수동 포인트 지급 (미지급 건 처리)',
            related_campaign_id: campaignId || null,
            created_at: new Date().toISOString()
          })
      } catch (e) {
        console.error('[check-unpaid-points] point_transactions insert error:', e)
      }

      // video_submissions에서 final_confirmed_at 업데이트
      if (videoId) {
        await regionDB
          .from('video_submissions')
          .update({
            final_confirmed_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', videoId)
      }

      console.log(`[check-unpaid-points] Manual pay (${regionInfo.name}): user=${userId}, amount=${amount}, new_balance=${newPoints}`)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `${profile.channel_name || profile.name}님에게 ${amount.toLocaleString()}P 지급 완료 (${regionInfo.name})`,
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
