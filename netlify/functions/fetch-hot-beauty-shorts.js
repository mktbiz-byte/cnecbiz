/**
 * 한국에서 핫한 뷰티 숏폼 영상 10개 가져오기
 * - YouTube Data API v3 search 사용
 * - 한국 뷰티 관련 인기 YouTube Shorts 검색
 * - 1시간 캐시
 */
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CACHE_KEY = 'hot_beauty_shorts_cache'
const CACHE_HOURS = 1

function parseCache(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return null }
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
      .eq('key', CACHE_KEY)
      .maybeSingle()

    if (cache && cache.value) {
      const parsed = parseCache(cache.value)
      if (parsed) {
        const updatedAt = new Date(cache.updated_at)
        const hoursSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
        if (hoursSince < CACHE_HOURS) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: parsed, cached: true })
          }
        }
      }
    }

    const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_1 || process.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
      const staleData = cache && cache.value ? parseCache(cache.value) : null
      if (staleData) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: staleData, cached: true, stale: true })
        }
      }
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'YouTube API key not configured' })
      }
    }

    const fetch = (await import('node-fetch')).default

    // 여러 뷰티 관련 검색어로 검색하여 다양한 결과 확보
    const searchQueries = [
      '뷰티 숏폼 추천',
      '화장품 리뷰 shorts',
      'K-beauty shorts',
      '메이크업 튜토리얼 shorts',
      '스킨케어 루틴 shorts'
    ]

    const allVideoIds = new Set()
    const videoIdList = []

    // 각 검색어로 검색 (2개 쿼리 사용하여 API 쿼터 절약)
    const queriesToUse = searchQueries.slice(0, 2)

    for (const query of queriesToUse) {
      try {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&type=video&videoDuration=short&maxResults=15` +
          `&q=${encodeURIComponent(query)}` +
          `&regionCode=KR&relevanceLanguage=ko` +
          `&order=viewCount` +
          `&publishedAfter=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}` +
          `&key=${apiKey}`
        )
        const searchData = await searchRes.json()

        if (searchData.items) {
          for (const item of searchData.items) {
            const vid = item.id.videoId
            if (vid && !allVideoIds.has(vid)) {
              allVideoIds.add(vid)
              videoIdList.push(vid)
            }
          }
        }
      } catch (err) {
        console.error(`[fetch-hot-beauty-shorts] Search error for "${query}":`, err.message)
      }
    }

    if (videoIdList.length === 0) {
      const staleData = cache && cache.value ? parseCache(cache.value) : null
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: staleData || [], cached: !!staleData })
      }
    }

    // 비디오 상세 정보 가져오기
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      `part=snippet,statistics,contentDetails` +
      `&id=${videoIdList.join(',')}` +
      `&key=${apiKey}`
    )
    const videosData = await videosRes.json()

    if (!videosData.items) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: [], cached: false })
      }
    }

    // Shorts 필터 (60초 이하) + 조회수 기준 정렬
    const shorts = videosData.items
      .filter(video => {
        const duration = video.contentDetails.duration
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        if (!match) return false
        const totalSeconds = (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0)
        return totalSeconds <= 60 && totalSeconds > 0
      })
      .map(video => ({
        video_id: video.id,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
        channel_title: video.snippet.channelTitle,
        view_count: parseInt(video.statistics.viewCount) || 0,
        like_count: parseInt(video.statistics.likeCount) || 0,
        published_at: video.snippet.publishedAt,
        url: `https://youtube.com/shorts/${video.id}`
      }))
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 10)

    // 캐시 저장
    await supabase
      .from('site_settings')
      .upsert({
        key: CACHE_KEY,
        value: JSON.stringify(shorts),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: shorts, cached: false })
    }
  } catch (error) {
    console.error('[fetch-hot-beauty-shorts] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
