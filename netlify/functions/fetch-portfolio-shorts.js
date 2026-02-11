/**
 * 포트폴리오 채널별 최근 숏폼 영상 가져오기 (캐싱 포함)
 * - 공개 API (인증 불필요)
 * - 6시간 캐시
 */
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CHANNELS = [
  { key: 'korea', handle: 'bizcnec' },
  { key: 'japan', handle: 'CNEC_JP' },
  { key: 'usa', handle: 'CNEC_USA' }
]

const CACHE_HOURS = 6

async function fetchChannelShorts(handle, apiKey) {
  const fetch = (await import('node-fetch')).default

  // 1. 채널 ID 조회
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${handle}&key=${apiKey}`
  )
  const channelData = await channelRes.json()

  if (!channelData.items || channelData.items.length === 0) {
    console.log(`Channel not found: @${handle}`)
    return []
  }

  const channelId = channelData.items[0].id
  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

  // 2. 최근 업로드 영상 가져오기 (15개 가져와서 Shorts만 필터)
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=15&key=${apiKey}`
  )
  const playlistData = await playlistRes.json()

  if (!playlistData.items || playlistData.items.length === 0) return []

  const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',')

  // 3. 영상 상세 정보 (duration으로 Shorts 판별)
  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`
  )
  const videosData = await videosRes.json()

  if (!videosData.items) return []

  // Shorts 필터: 60초 이하
  const shorts = videosData.items.filter(video => {
    const duration = video.contentDetails.duration // PT1M30S 형식
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return false
    const totalSeconds = (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0)
    return totalSeconds <= 60
  })

  return shorts.slice(0, 5).map(video => ({
    video_id: video.id,
    title: video.snippet.title,
    thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
    view_count: parseInt(video.statistics.viewCount) || 0,
    published_at: video.snippet.publishedAt
  }))
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // 캐시 확인
    const { data: cache } = await supabase
      .from('site_settings')
      .select('value, updated_at')
      .eq('key', 'portfolio_shorts_cache')
      .single()

    if (cache && cache.value) {
      const updatedAt = new Date(cache.updated_at)
      const hoursSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
      if (hoursSince < CACHE_HOURS) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: cache.value, cached: true })
        }
      }
    }

    // API 키
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_1 || process.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
      // 캐시가 있으면 만료되어도 반환
      if (cache && cache.value) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: cache.value, cached: true, stale: true })
        }
      }
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'YouTube API key not configured' })
      }
    }

    // 각 채널에서 최근 Shorts 가져오기
    const result = {}
    for (const channel of CHANNELS) {
      try {
        result[channel.key] = await fetchChannelShorts(channel.handle, apiKey)
      } catch (err) {
        console.error(`[fetch-portfolio-shorts] ${channel.key} error:`, err.message)
        result[channel.key] = []
      }
    }

    // 캐시 저장 (upsert)
    await supabase
      .from('site_settings')
      .upsert({
        key: 'portfolio_shorts_cache',
        value: result,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result, cached: false })
    }
  } catch (error) {
    console.error('[fetch-portfolio-shorts] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
