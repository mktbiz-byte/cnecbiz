// YouTube 크리에이터 분석 함수 (YouTube Data API v3 사용)
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { channelId, channelUrl } = JSON.parse(event.body)
    
    if (!channelId && !channelUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Channel ID or URL is required' })
      }
    }

    const API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY
    
    if (!API_KEY) {
      throw new Error('YouTube API key not configured')
    }

    let finalChannelId = channelId

    // URL에서 채널 ID 추출
    if (!finalChannelId && channelUrl) {
      const urlMatch = channelUrl.match(/youtube\.com\/channel\/([\w-]+)/)
      const handleMatch = channelUrl.match(/youtube\.com\/@([\w-]+)/)
      
      if (urlMatch) {
        finalChannelId = urlMatch[1]
      } else if (handleMatch) {
        // Handle을 사용하는 경우 검색으로 채널 ID 찾기
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handleMatch[1]}&key=${API_KEY}`
        )
        const searchData = await searchResponse.json()
        finalChannelId = searchData.items?.[0]?.id?.channelId
      }
    }

    if (!finalChannelId) {
      throw new Error('Could not extract channel ID from URL')
    }

    // 채널 정보 가져오기
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${finalChannelId}&key=${API_KEY}`
    )

    if (!channelResponse.ok) {
      throw new Error('Failed to fetch YouTube channel data')
    }

    const channelData = await channelResponse.json()
    const channel = channelData.items?.[0]

    if (!channel) {
      throw new Error('Channel not found')
    }

    // 최근 업로드 영상 가져오기
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    
    let recentVideos = []
    if (uploadsPlaylistId) {
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${API_KEY}`
      )
      const playlistData = await playlistResponse.json()
      
      // 비디오 ID 추출
      const videoIds = playlistData.items?.map(item => item.snippet.resourceId.videoId).join(',')
      
      if (videoIds) {
        // 비디오 상세 정보 가져오기
        const videosResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${API_KEY}`
        )
        const videosData = await videosResponse.json()
        
        recentVideos = videosData.items?.map(video => ({
          title: video.snippet.title,
          description: video.snippet.description,
          views: parseInt(video.statistics.viewCount) || 0,
          likes: parseInt(video.statistics.likeCount) || 0,
          comments: parseInt(video.statistics.commentCount) || 0,
          duration: video.contentDetails.duration,
          publishedAt: video.snippet.publishedAt,
          tags: video.snippet.tags || []
        })) || []
      }
    }

    // 모든 설명과 태그 합치기
    const allText = recentVideos.map(v => `${v.title} ${v.description}`).join(' ')
    const allTags = recentVideos.flatMap(v => v.tags)
    const topTags = [...new Set(allTags)].slice(0, 10)

    // 평균 참여율 계산
    const avgViews = recentVideos.reduce((sum, v) => sum + v.views, 0) / recentVideos.length
    const avgLikes = recentVideos.reduce((sum, v) => sum + v.likes, 0) / recentVideos.length
    const avgComments = recentVideos.reduce((sum, v) => sum + v.comments, 0) / recentVideos.length
    const engagementRate = ((avgLikes + avgComments) / avgViews) * 100

    // 분석 결과 반환
    const analysis = {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      description: channel.snippet.description,
      customUrl: channel.snippet.customUrl,
      subscribers: parseInt(channel.statistics.subscriberCount) || 0,
      totalViews: parseInt(channel.statistics.viewCount) || 0,
      videoCount: parseInt(channel.statistics.videoCount) || 0,
      thumbnailUrl: channel.snippet.thumbnails.high.url,
      
      // 콘텐츠 분석
      contentAnalysis: {
        topTags,
        avgViews: Math.round(avgViews),
        avgLikes: Math.round(avgLikes),
        avgComments: Math.round(avgComments),
        engagementRate: engagementRate.toFixed(2),
        recentVideos: recentVideos.slice(0, 5).map(v => ({
          title: v.title,
          views: v.views,
          likes: v.likes,
          publishedAt: v.publishedAt
        }))
      },
      
      // 스타일 분석
      style: {
        tone: analyzeTone(allText),
        topics: extractTopics(allText),
        videoStyle: analyzeVideoStyle(recentVideos)
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analysis)
    }

  } catch (error) {
    console.error('YouTube analysis error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to analyze YouTube channel',
        message: error.message 
      })
    }
  }
}

// 톤앤매너 분석
function analyzeTone(text) {
  const casual = /ㅋㅋ|ㅎㅎ|~|!!|여러분|친구/g
  const professional = /안녕하세요|소개|리뷰|추천|정보/g
  const educational = /방법|팁|가이드|설명|알려|배우/g
  
  const casualCount = (text.match(casual) || []).length
  const professionalCount = (text.match(professional) || []).length
  const educationalCount = (text.match(educational) || []).length
  
  if (educationalCount > professionalCount && educationalCount > casualCount) return 'educational'
  if (professionalCount > casualCount * 2) return 'professional'
  if (casualCount > professionalCount) return 'casual'
  return 'balanced'
}

// 주요 토픽 추출
function extractTopics(text) {
  const topics = []
  
  if (/뷰티|화장품|메이크업|스킨케어|코스메틱/i.test(text)) topics.push('beauty')
  if (/패션|옷|스타일|코디|OOTD/i.test(text)) topics.push('fashion')
  if (/음식|요리|레시피|먹방|맛집/i.test(text)) topics.push('food')
  if (/여행|관광|여행지|호텔/i.test(text)) topics.push('travel')
  if (/브이로그|일상|데일리|루틴/i.test(text)) topics.push('vlog')
  if (/리뷰|언박싱|제품|추천/i.test(text)) topics.push('review')
  if (/게임|게이밍|플레이/i.test(text)) topics.push('gaming')
  if (/운동|헬스|다이어트|피트니스/i.test(text)) topics.push('fitness')
  
  return topics.length > 0 ? topics : ['general']
}

// 영상 스타일 분석
function analyzeVideoStyle(videos) {
  if (videos.length === 0) return 'unknown'
  
  // 평균 영상 길이 계산 (ISO 8601 duration 파싱)
  const durations = videos.map(v => {
    const match = v.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const hours = parseInt(match[1]) || 0
    const minutes = parseInt(match[2]) || 0
    const seconds = parseInt(match[3]) || 0
    return hours * 3600 + minutes * 60 + seconds
  })
  
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
  
  if (avgDuration < 180) return 'short_form'      // 3분 미만
  if (avgDuration < 600) return 'medium_form'     // 10분 미만
  if (avgDuration < 1200) return 'standard'       // 20분 미만
  return 'long_form'                               // 20분 이상
}
