/**
 * YouTube Data API를 사용하여 채널 정보 및 영상 데이터 수집
 */

const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

const supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// YouTube 채널 ID 추출
function extractChannelId(url) {
  // URL 패턴: https://www.youtube.com/@channelname 또는 https://www.youtube.com/channel/UCxxxxx
  const patterns = [
    /youtube\.com\/channel\/([^\/\?]+)/,
    /youtube\.com\/@([^\/\?]+)/,
    /youtube\.com\/c\/([^\/\?]+)/,
    /youtube\.com\/user\/([^\/\?]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// YouTube Data API로 채널 정보 가져오기
async function getChannelInfo(channelId, apiKey) {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: channelId,
        key: apiKey
      }
    })

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Channel not found')
    }

    const channel = response.data.items[0]
    return {
      channel_id: channel.id,
      channel_name: channel.snippet.title,
      thumbnail_url: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
      description: channel.snippet.description,
      subscriber_count: parseInt(channel.statistics.subscriberCount) || 0,
      video_count: parseInt(channel.statistics.videoCount) || 0,
      view_count: parseInt(channel.statistics.viewCount) || 0
    }
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message)
    throw error
  }
}

// YouTube Data API로 최근 영상 가져오기
async function getRecentVideos(channelId, apiKey, maxResults = 10) {
  try {
    // 1. 채널의 업로드 플레이리스트 ID 가져오기
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: apiKey
      }
    })

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('Channel not found')
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads

    // 2. 업로드 플레이리스트에서 최근 영상 가져오기
    const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults,
        key: apiKey
      }
    })

    const videoIds = playlistResponse.data.items.map(item => item.contentDetails.videoId).join(',')

    // 3. 영상 상세 정보 가져오기
    const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoIds,
        key: apiKey
      }
    })

    return videosResponse.data.items.map(video => ({
      video_id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
      published_at: video.snippet.publishedAt,
      view_count: parseInt(video.statistics.viewCount) || 0,
      like_count: parseInt(video.statistics.likeCount) || 0,
      comment_count: parseInt(video.statistics.commentCount) || 0,
      duration: video.contentDetails.duration,
      tags: video.snippet.tags || []
    }))
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message)
    throw error
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header required' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const { channel_url, channel_type, record_id, youtube_api_key } = JSON.parse(event.body)

    if (!channel_url || !channel_type || !record_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'channel_url, channel_type, and record_id are required' })
      }
    }

    // API 키 확인 (레코드에서 가져오거나 요청에서 받음)
    let apiKey = youtube_api_key
    if (!apiKey) {
      const table = channel_type === 'our_channel' ? 'our_channels' : 'affiliated_creators'
      const { data: record } = await supabase
        .from(table)
        .select('youtube_api_key')
        .eq('id', record_id)
        .eq('company_id', user.id)
        .single()

      apiKey = record?.youtube_api_key
    }

    if (!apiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'YouTube API key is required' })
      }
    }

    // 채널 ID 추출
    const channelId = extractChannelId(channel_url)
    if (!channelId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid YouTube channel URL' })
      }
    }

    // 채널 정보 가져오기
    const channelInfo = await getChannelInfo(channelId, apiKey)

    // 채널 통계 저장
    await supabase
      .from('channel_statistics')
      .insert([{
        channel_id: channelId,
        channel_type,
        company_id: user.id,
        subscriber_count: channelInfo.subscriber_count,
        video_count: channelInfo.video_count,
        view_count: channelInfo.view_count,
        data_source: 'api'
      }])

    // 최근 영상 가져오기
    const videos = await getRecentVideos(channelId, apiKey, 10)

    // 영상 데이터 저장 (upsert)
    for (const video of videos) {
      await supabase
        .from('channel_videos')
        .upsert({
          channel_id: channelId,
          company_id: user.id,
          ...video
        }, {
          onConflict: 'channel_id,video_id'
        })
    }

    // 레코드 업데이트 (썸네일, 채널 ID 등)
    const table = channel_type === 'our_channel' ? 'our_channels' : 'affiliated_creators'
    await supabase
      .from(table)
      .update({
        channel_id: channelId,
        thumbnail_url: channelInfo.thumbnail_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', record_id)
      .eq('company_id', user.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          channel: channelInfo,
          videos: videos.length
        }
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

