/**
 * 스케줄된 SNS 업로드 처리
 * 예약된 업로드를 실행하고, 업로드된 영상의 성과를 수집
 *
 * Netlify Scheduled Functions 설정:
 * netlify.toml에 추가:
 * [functions."scheduled-sns-upload"]
 * schedule = "*/30 * * * *"  # 30분마다 실행
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 업로드 함수 호출
async function triggerUpload(upload) {
  const functionName = `upload-to-${upload.platform}`

  try {
    const response = await fetch(
      `${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/${functionName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: upload.id })
      }
    )

    const result = await response.json()
    return result
  } catch (error) {
    console.error(`Upload failed for ${upload.id}:`, error)
    return { success: false, error: error.message }
  }
}

// YouTube 성과 데이터 수집
async function fetchYouTubeStats(videoId, accessToken) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )
    const data = await response.json()
    const stats = data.items?.[0]?.statistics

    return {
      views: parseInt(stats?.viewCount || 0),
      likes: parseInt(stats?.likeCount || 0),
      comments: parseInt(stats?.commentCount || 0)
    }
  } catch (error) {
    console.error('YouTube stats fetch failed:', error)
    return null
  }
}

// Instagram 성과 데이터 수집
async function fetchInstagramStats(mediaId, accessToken) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}?fields=like_count,comments_count,plays&access_token=${accessToken}`
    )
    const data = await response.json()

    return {
      views: parseInt(data.plays || 0),
      likes: parseInt(data.like_count || 0),
      comments: parseInt(data.comments_count || 0)
    }
  } catch (error) {
    console.error('Instagram stats fetch failed:', error)
    return null
  }
}

// TikTok 성과 데이터 수집
async function fetchTikTokStats(videoId, accessToken) {
  try {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/video/query/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters: { video_ids: [videoId] },
          fields: ['view_count', 'like_count', 'comment_count', 'share_count']
        })
      }
    )
    const data = await response.json()
    const video = data.data?.videos?.[0]

    return {
      views: parseInt(video?.view_count || 0),
      likes: parseInt(video?.like_count || 0),
      comments: parseInt(video?.comment_count || 0),
      shares: parseInt(video?.share_count || 0)
    }
  } catch (error) {
    console.error('TikTok stats fetch failed:', error)
    return null
  }
}

exports.handler = async (event) => {
  console.log('[scheduled-sns-upload] Starting...')

  try {
    const now = new Date()

    // 1. 예약된 업로드 처리 (scheduled_at이 현재 시간 이전인 것)
    const { data: scheduledUploads, error: scheduleError } = await supabaseBiz
      .from('sns_uploads')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString())
      .limit(10)

    if (scheduleError) {
      console.error('Schedule query error:', scheduleError)
    }

    console.log(`[scheduled-sns-upload] Found ${scheduledUploads?.length || 0} scheduled uploads`)

    for (const upload of (scheduledUploads || [])) {
      console.log(`[scheduled-sns-upload] Processing upload ${upload.id}`)

      // 상태를 pending으로 변경
      await supabaseBiz
        .from('sns_uploads')
        .update({ status: 'pending' })
        .eq('id', upload.id)

      // 업로드 실행
      await triggerUpload(upload)
    }

    // 2. 완료된 업로드의 성과 데이터 수집 (24시간 이내 완료된 것)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { data: completedUploads, error: completedError } = await supabaseBiz
      .from('sns_uploads')
      .select('*, sns_upload_accounts(*)')
      .eq('status', 'completed')
      .gte('upload_completed_at', oneDayAgo.toISOString())
      .limit(20)

    if (completedError) {
      console.error('Completed query error:', completedError)
    }

    console.log(`[scheduled-sns-upload] Collecting stats for ${completedUploads?.length || 0} uploads`)

    for (const upload of (completedUploads || [])) {
      if (!upload.platform_video_id || !upload.sns_upload_accounts?.access_token) {
        continue
      }

      let stats = null
      const accessToken = upload.sns_upload_accounts.access_token

      switch (upload.platform) {
        case 'youtube':
          stats = await fetchYouTubeStats(upload.platform_video_id, accessToken)
          break
        case 'instagram':
          stats = await fetchInstagramStats(upload.platform_video_id, accessToken)
          break
        case 'tiktok':
          stats = await fetchTikTokStats(upload.platform_video_id, accessToken)
          break
      }

      if (stats) {
        // 성과 데이터 저장
        await supabaseBiz
          .from('sns_uploads')
          .update({
            performance_data: {
              ...stats,
              collected_at: now.toISOString()
            },
            updated_at: now.toISOString()
          })
          .eq('id', upload.id)

        console.log(`[scheduled-sns-upload] Stats updated for ${upload.id}:`, stats)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: {
          scheduled: scheduledUploads?.length || 0,
          statsCollected: completedUploads?.length || 0
        }
      })
    }
  } catch (error) {
    console.error('[scheduled-sns-upload] Error:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
