// TikTok 크리에이터 프로필 분석 함수
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { username } = JSON.parse(event.body)
    
    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' })
      }
    }

    // TikTok 공개 API 엔드포인트
    const apiUrl = `https://www.tiktok.com/@${username}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch TikTok profile')
    }

    const html = await response.text()
    
    // HTML에서 JSON 데이터 추출
    const jsonMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/)
    
    if (!jsonMatch) {
      throw new Error('Failed to parse TikTok data')
    }

    const data = JSON.parse(jsonMatch[1])
    const userDetail = data['__DEFAULT_SCOPE__']['webapp.user-detail']?.userInfo
    
    if (!userDetail) {
      throw new Error('User not found')
    }

    const user = userDetail.user
    const stats = userDetail.stats

    // 최근 비디오 분석
    const videos = userDetail.itemList || []
    const recentVideos = videos.slice(0, 12).map(video => ({
      desc: video.desc || '',
      likes: video.stats?.diggCount || 0,
      comments: video.stats?.commentCount || 0,
      shares: video.stats?.shareCount || 0,
      views: video.stats?.playCount || 0,
      duration: video.video?.duration || 0,
      createTime: video.createTime
    }))

    // 해시태그 추출
    const allDescs = recentVideos.map(v => v.desc).join(' ')
    const hashtags = allDescs.match(/#[\w가-힣]+/g) || []
    const topHashtags = [...new Set(hashtags)].slice(0, 10)

    // 평균 참여율 계산
    const avgLikes = recentVideos.reduce((sum, v) => sum + v.likes, 0) / recentVideos.length
    const avgComments = recentVideos.reduce((sum, v) => sum + v.comments, 0) / recentVideos.length
    const avgViews = recentVideos.reduce((sum, v) => sum + v.views, 0) / recentVideos.length
    const engagementRate = ((avgLikes + avgComments) / avgViews) * 100

    // 평균 영상 길이
    const avgDuration = recentVideos.reduce((sum, v) => sum + v.duration, 0) / recentVideos.length

    // 분석 결과 반환
    const analysis = {
      username: user.uniqueId,
      nickname: user.nickname,
      bio: user.signature,
      followers: stats.followerCount,
      following: stats.followingCount,
      likes: stats.heartCount,
      videosCount: stats.videoCount,
      avatarUrl: user.avatarLarger,
      isVerified: user.verified,
      
      // 콘텐츠 분석
      contentAnalysis: {
        topHashtags,
        avgLikes: Math.round(avgLikes),
        avgComments: Math.round(avgComments),
        avgViews: Math.round(avgViews),
        engagementRate: engagementRate.toFixed(2),
        avgDuration: Math.round(avgDuration),
        recentVideos: recentVideos.slice(0, 5) // 최근 5개만
      },
      
      // 스타일 분석
      style: {
        tone: analyzeTone(allDescs),
        topics: extractTopics(allDescs),
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
    console.error('TikTok analysis error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to analyze TikTok profile',
        message: error.message 
      })
    }
  }
}

// 톤앤매너 분석
function analyzeTone(text) {
  const casual = /ㅋㅋ|ㅎㅎ|~|!!|😊|😍|💕|❤️|🔥/g
  const trendy = /챌린지|트렌드|핫|대박|인싸/g
  const friendly = /여러분|친구들|언니|오빠/g
  
  const casualCount = (text.match(casual) || []).length
  const trendyCount = (text.match(trendy) || []).length
  const friendlyCount = (text.match(friendly) || []).length
  
  if (trendyCount > 5) return 'trendy'
  if (casualCount > 10) return 'casual'
  if (friendlyCount > 5) return 'friendly'
  return 'neutral'
}

// 주요 토픽 추출
function extractTopics(text) {
  const topics = []
  
  if (/뷰티|화장품|메이크업|스킨케어/i.test(text)) topics.push('beauty')
  if (/패션|옷|코디|OOTD/i.test(text)) topics.push('fashion')
  if (/음식|먹방|레시피|쿡방/i.test(text)) topics.push('food')
  if (/댄스|춤|안무|챌린지/i.test(text)) topics.push('dance')
  if (/일상|브이로그|데일리/i.test(text)) topics.push('daily')
  if (/운동|다이어트|헬스|요가/i.test(text)) topics.push('fitness')
  if (/코미디|웃긴|개그|유머/i.test(text)) topics.push('comedy')
  
  return topics.length > 0 ? topics : ['entertainment']
}

// 영상 스타일 분석
function analyzeVideoStyle(videos) {
  const avgDuration = videos.reduce((sum, v) => sum + v.duration, 0) / videos.length
  
  if (avgDuration < 15) return 'short_snappy'  // 짧고 임팩트 있는
  if (avgDuration < 30) return 'quick_story'   // 빠른 스토리텔링
  if (avgDuration < 60) return 'detailed'      // 상세한 설명
  return 'long_form'                            // 긴 형식
}
