// ============================================
// Supabase Edge Function: 채널 모니터링
// 매일 오전 10시 실행 (Cron: 0 10 * * *)
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Channel {
  id: string
  channel_name: string
  channel_id: string
  channel_url: string
  youtube_api_key: string
  channel_type: 'affiliated_creator' | 'our_channel'
}

interface Alert {
  channel_id: string
  channel_name: string
  alert_type: 'no_upload_3days' | 'views_drop' | 'subscriber_surge' | 'video_viral'
  severity: 'low' | 'medium' | 'high'
  title: string
  message: string
  details: any
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. 네이버 웍스 설정 로드
    const { data: config } = await supabase
      .from('naver_works_config')
      .select('*')
      .eq('config_name', 'default')
      .single()

    if (!config || !config.enabled) {
      return new Response(JSON.stringify({ message: '모니터링이 비활성화되어 있습니다.' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. 모든 채널 로드
    const { data: affiliatedCreators } = await supabase
      .from('affiliated_creators')
      .select('id, creator_name as channel_name, platform_id as channel_id, platform_url as channel_url')
      .eq('platform', 'youtube')

    const { data: ourChannels } = await supabase
      .from('our_channels')
      .select('id, channel_name, channel_id, channel_url, youtube_api_key')

    const channels: Channel[] = [
      ...(affiliatedCreators || []).map(c => ({ ...c, channel_type: 'affiliated_creator' as const, youtube_api_key: config.youtube_api_key || '' })),
      ...(ourChannels || []).map(c => ({ ...c, channel_type: 'our_channel' as const }))
    ]

    console.log(`총 ${channels.length}개 채널 모니터링 시작`)

    const alerts: Alert[] = []

    // 3. 각 채널 분석
    for (const channel of channels) {
      try {
        const channelAlerts = await analyzeChannel(channel, config, supabase)
        alerts.push(...channelAlerts)
      } catch (error) {
        console.error(`채널 ${channel.channel_name} 분석 실패:`, error)
      }
    }

    // 4. 알림 저장
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('channel_alerts')
        .insert(alerts)

      if (error) {
        console.error('알림 저장 실패:', error)
      }
    }

    // 5. 네이버 웍스로 알림 전송
    if (alerts.length > 0) {
      await sendNaverWorksNotification(alerts, config)

      // 전송 상태 업데이트
      const alertIds = alerts.map(a => (a as any).id)
      await supabase
        .from('channel_alerts')
        .update({ sent_to_naver_works: true, sent_at: new Date().toISOString() })
        .in('id', alertIds)
    }

    return new Response(
      JSON.stringify({
        success: true,
        channels_checked: channels.length,
        alerts_generated: alerts.length,
        message: `${channels.length}개 채널 체크 완료, ${alerts.length}개 알림 생성`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('모니터링 실패:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function analyzeChannel(channel: Channel, config: any, supabase: any): Promise<Alert[]> {
  const alerts: Alert[] = []

  // YouTube Data API로 채널 정보 가져오기
  const apiKey = channel.youtube_api_key || config.youtube_api_key
  
  // 채널 통계
  const channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel.channel_id}&key=${apiKey}`
  )
  const channelData = await channelResponse.json()
  
  if (!channelData.items || channelData.items.length === 0) {
    console.log(`채널 ${channel.channel_name} 데이터 없음`)
    return alerts
  }

  const stats = channelData.items[0].statistics
  const currentSubscribers = parseInt(stats.subscriberCount || 0)
  const currentVideoCount = parseInt(stats.videoCount || 0)
  const currentTotalViews = parseInt(stats.viewCount || 0)

  // 최근 영상 가져오기
  const videosResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.channel_id}&order=date&type=video&maxResults=10&key=${apiKey}`
  )
  const videosData = await videosResponse.json()

  const videoIds = videosData.items?.map((item: any) => item.id.videoId).join(',') || ''
  
  let videos = []
  if (videoIds) {
    const videoStatsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
    )
    const videoStatsData = await videoStatsResponse.json()
    videos = videoStatsData.items || []
  }

  // 이전 스냅샷 가져오기
  const { data: previousSnapshot } = await supabase
    .from('channel_monitoring_snapshots')
    .select('*')
    .eq('channel_id', channel.id)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .single()

  // 현재 스냅샷 저장
  const avgViews = videos.length > 0 
    ? Math.round(videos.reduce((sum: number, v: any) => sum + parseInt(v.statistics.viewCount || 0), 0) / videos.length)
    : 0

  const currentSnapshot = {
    channel_id: channel.id,
    channel_name: channel.channel_name,
    channel_type: channel.channel_type,
    subscriber_count: currentSubscribers,
    video_count: currentVideoCount,
    total_view_count: currentTotalViews,
    latest_video_id: videos[0]?.id,
    latest_video_title: videos[0]?.snippet?.title,
    latest_video_published_at: videos[0]?.snippet?.publishedAt,
    latest_video_views: videos[0] ? parseInt(videos[0].statistics.viewCount || 0) : 0,
    avg_views_last_10: avgViews
  }

  await supabase
    .from('channel_monitoring_snapshots')
    .insert([currentSnapshot])

  // 알림 체크
  if (previousSnapshot) {
    // 1. 3일 이상 업로드 없음
    if (videos.length > 0) {
      const latestVideoDate = new Date(videos[0].snippet.publishedAt)
      const daysSinceUpload = Math.floor((Date.now() - latestVideoDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceUpload >= config.no_upload_days) {
        alerts.push({
          channel_id: channel.id,
          channel_name: channel.channel_name,
          alert_type: 'no_upload_3days',
          severity: 'high',
          title: `⚠️ ${channel.channel_name} - 업로드 중단`,
          message: `${daysSinceUpload}일 동안 새 영상이 업로드되지 않았습니다.`,
          details: {
            days_since_upload: daysSinceUpload,
            latest_video: videos[0].snippet.title,
            latest_video_date: latestVideoDate.toISOString()
          }
        })
      }
    }

    // 2. 평균 조회수 급락
    if (previousSnapshot.avg_views_last_10 > 0 && avgViews > 0) {
      const viewsDropRate = (previousSnapshot.avg_views_last_10 - avgViews) / previousSnapshot.avg_views_last_10
      
      if (viewsDropRate >= config.views_drop_threshold) {
        alerts.push({
          channel_id: channel.id,
          channel_name: channel.channel_name,
          alert_type: 'views_drop',
          severity: 'high',
          title: `📉 ${channel.channel_name} - 조회수 급락`,
          message: `평균 조회수가 ${(viewsDropRate * 100).toFixed(1)}% 하락했습니다. (${previousSnapshot.avg_views_last_10.toLocaleString()} → ${avgViews.toLocaleString()})`,
          details: {
            previous_avg: previousSnapshot.avg_views_last_10,
            current_avg: avgViews,
            drop_rate: viewsDropRate
          }
        })
      }
    }

    // 3. 구독자 급증
    if (previousSnapshot.subscriber_count > 0) {
      const newSubscribers = currentSubscribers - previousSnapshot.subscriber_count
      
      if (newSubscribers >= config.subscriber_surge_count) {
        const subscriberGrowthRate = newSubscribers / previousSnapshot.subscriber_count
        alerts.push({
          channel_id: channel.id,
          channel_name: channel.channel_name,
          alert_type: 'subscriber_surge',
          severity: 'medium',
          title: `🚀 ${channel.channel_name} - 구독자 급증`,
          message: `구독자가 ${newSubscribers.toLocaleString()}명 증가했습니다! (${previousSnapshot.subscriber_count.toLocaleString()} → ${currentSubscribers.toLocaleString()}, +${(subscriberGrowthRate * 100).toFixed(1)}%)`,
          details: {
            previous_subscribers: previousSnapshot.subscriber_count,
            current_subscribers: currentSubscribers,
            growth_rate: subscriberGrowthRate,
            new_subscribers: newSubscribers
          }
        })
      }
    }

    // 4. 신규 영상 바이럴
    if (videos.length > 0 && avgViews > 0) {
      const latestVideoViews = parseInt(videos[0].statistics.viewCount || 0)
      const viralMultiplier = latestVideoViews / avgViews
      
      if (viralMultiplier >= config.viral_video_multiplier) {
        const latestVideoDate = new Date(videos[0].snippet.publishedAt)
        const hoursSinceUpload = Math.floor((Date.now() - latestVideoDate.getTime()) / (1000 * 60 * 60))
        
        // 24시간 이내 업로드된 영상만
        if (hoursSinceUpload <= 24) {
          alerts.push({
            channel_id: channel.id,
            channel_name: channel.channel_name,
            alert_type: 'video_viral',
            severity: 'low',
            title: `🔥 ${channel.channel_name} - 영상 바이럴`,
            message: `신규 영상이 평균 대비 ${viralMultiplier.toFixed(1)}배 조회수를 기록 중입니다! "${videos[0].snippet.title}" (${latestVideoViews.toLocaleString()}회)`,
            details: {
              video_title: videos[0].snippet.title,
              video_views: latestVideoViews,
              avg_views: avgViews,
              multiplier: viralMultiplier,
              hours_since_upload: hoursSinceUpload
            }
          })}
      }
    }
  }

  return alerts
}

async function sendNaverWorksNotification(alerts: Alert[], config: any) {
  try {
    // 네이버 웍스 Bot API 인증
    const authResponse = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.bot_id,
        client_secret: config.bot_secret,
        scope: 'bot'
      })
    })

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    // 알림 메시지 생성
    let message = `📊 **채널 모니터링 알림** (${new Date().toLocaleString('ko-KR')})\n\n`
    message += `총 ${alerts.length}개의 알림이 발생했습니다.\n\n`

    // 심각도별 그룹화
    const highAlerts = alerts.filter(a => a.severity === 'high')
    const mediumAlerts = alerts.filter(a => a.severity === 'medium')
    const lowAlerts = alerts.filter(a => a.severity === 'low')

    if (highAlerts.length > 0) {
      message += `🚨 **긴급 (${highAlerts.length}건)**\n`
      highAlerts.forEach(a => {
        message += `• ${a.title}\n  ${a.message}\n\n`
      })
    }

    if (mediumAlerts.length > 0) {
      message += `⚠️ **주의 (${mediumAlerts.length}건)**\n`
      mediumAlerts.forEach(a => {
        message += `• ${a.title}\n  ${a.message}\n\n`
      })
    }

    if (lowAlerts.length > 0) {
      message += `ℹ️ **정보 (${lowAlerts.length}건)**\n`
      lowAlerts.forEach(a => {
        message += `• ${a.title}\n  ${a.message}\n\n`
      })
    }

    message += `\n자세한 내용은 관리자 페이지에서 확인하세요.`

    // 메시지 전송
    await fetch(`https://www.worksapis.com/v1.0/bots/${config.bot_id}/channels/${config.channel_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          type: 'text',
          text: message
        }
      })
    })

    console.log('네이버 웍스 알림 전송 완료')
  } catch (error) {
    console.error('네이버 웍스 알림 전송 실패:', error)
  }
}
