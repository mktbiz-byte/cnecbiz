const { createClient } = require('@supabase/supabase-js')

// YouTube Video ID 추출 함수
function extractYouTubeVideoId(url) {
  if (!url) return null
  
  // 다양한 YouTube URL 형식 지원
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

// Supabase 클라이언트 생성
function getSupabaseClient(region) {
  const configs = {
    japan: {
      url: process.env.VITE_SUPABASE_URL_JAPAN,
      key: process.env.VITE_SUPABASE_ANON_KEY_JAPAN
    },
    us: {
      url: process.env.VITE_SUPABASE_URL_US,
      key: process.env.VITE_SUPABASE_ANON_KEY_US
    }
  }
  
  const config = configs[region]
  if (!config || !config.url || !config.key) {
    return null
  }
  
  return createClient(config.url, config.key)
}

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  
  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }
  
  try {
    const { application_id, region, video_url } = JSON.parse(event.body)
    
    if (!application_id || !region || !video_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }
    
    // YouTube Video ID 추출
    const videoId = extractYouTubeVideoId(video_url)
    if (!videoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid YouTube URL' })
      }
    }
    
    // YouTube API 호출
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
    if (!YOUTUBE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'YouTube API key not configured' })
      }
    }
    
    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    
    const response = await fetch(youtubeApiUrl)
    const data = await response.json()
    
    if (!response.ok || !data.items || data.items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Video not found or API error', details: data })
      }
    }
    
    const video = data.items[0]
    const stats = {
      videoId: videoId,
      title: video.snippet.title,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount) || 0,
      likeCount: parseInt(video.statistics.likeCount) || 0,
      commentCount: parseInt(video.statistics.commentCount) || 0,
      fetchedAt: new Date().toISOString()
    }
    
    // Supabase에 저장
    const supabase = getSupabaseClient(region)
    if (!supabase) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase client configuration error' })
      }
    }
    
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        youtube_stats: stats,
        stats_updated_at: new Date().toISOString()
      })
      .eq('id', application_id)
    
    if (updateError) {
      console.error('Supabase update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update database', details: updateError })
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats: stats
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
