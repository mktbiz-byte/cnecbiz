// Instagram 크리에이터 프로필 분석 함수
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

    // Instagram 프로필 URL
    const profileUrl = `https://www.instagram.com/${username}/`
    
    // Instagram 공개 API 엔드포인트 (로그인 불필요)
    const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram profile')
    }

    const data = await response.json()
    const user = data.data?.user

    if (!user) {
      throw new Error('User not found')
    }

    // 최근 게시물 분석
    const posts = user.edge_owner_to_timeline_media?.edges || []
    const recentPosts = posts.slice(0, 12).map(edge => ({
      caption: edge.node.edge_media_to_caption?.edges[0]?.node?.text || '',
      likes: edge.node.edge_liked_by?.count || 0,
      comments: edge.node.edge_media_to_comment?.count || 0,
      isVideo: edge.node.is_video,
      timestamp: edge.node.taken_at_timestamp
    }))

    // 캡션에서 주요 키워드 추출
    const allCaptions = recentPosts.map(p => p.caption).join(' ')
    const hashtags = allCaptions.match(/#[\w가-힣]+/g) || []
    const topHashtags = [...new Set(hashtags)].slice(0, 10)

    // 평균 참여율 계산
    const avgLikes = recentPosts.reduce((sum, p) => sum + p.likes, 0) / recentPosts.length
    const avgComments = recentPosts.reduce((sum, p) => sum + p.comments, 0) / recentPosts.length
    const engagementRate = ((avgLikes + avgComments) / user.edge_followed_by.count) * 100

    // 콘텐츠 타입 분석
    const videoCount = recentPosts.filter(p => p.isVideo).length
    const photoCount = recentPosts.length - videoCount
    const contentType = videoCount > photoCount ? 'video' : 'photo'

    // 분석 결과 반환
    const analysis = {
      username: user.username,
      fullName: user.full_name,
      bio: user.biography,
      followers: user.edge_followed_by.count,
      following: user.edge_follow.count,
      postsCount: user.edge_owner_to_timeline_media.count,
      profilePicUrl: user.profile_pic_url_hd,
      isVerified: user.is_verified,
      
      // 콘텐츠 분석
      contentAnalysis: {
        topHashtags,
        avgLikes: Math.round(avgLikes),
        avgComments: Math.round(avgComments),
        engagementRate: engagementRate.toFixed(2),
        contentType,
        videoRatio: ((videoCount / recentPosts.length) * 100).toFixed(1),
        recentPosts: recentPosts.slice(0, 5) // 최근 5개만
      },
      
      // 스타일 분석
      style: {
        tone: analyzeTone(allCaptions),
        topics: extractTopics(allCaptions),
        postingFrequency: calculatePostingFrequency(recentPosts)
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
    console.error('Instagram analysis error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to analyze Instagram profile',
        message: error.message 
      })
    }
  }
}

// 톤앤매너 분석
function analyzeTone(text) {
  const casual = /ㅋㅋ|ㅎㅎ|~|!!|😊|😍|💕|❤️/g
  const formal = /입니다|습니다|해요|드립니다/g
  const friendly = /여러분|친구|언니|오빠/g
  
  const casualCount = (text.match(casual) || []).length
  const formalCount = (text.match(formal) || []).length
  const friendlyCount = (text.match(friendly) || []).length
  
  if (casualCount > formalCount * 2) return 'casual'
  if (formalCount > casualCount * 2) return 'formal'
  if (friendlyCount > 5) return 'friendly'
  return 'neutral'
}

// 주요 토픽 추출
function extractTopics(text) {
  const topics = []
  
  if (/뷰티|화장품|스킨케어|메이크업|피부/i.test(text)) topics.push('beauty')
  if (/패션|옷|코디|스타일/i.test(text)) topics.push('fashion')
  if (/음식|맛집|요리|레시피/i.test(text)) topics.push('food')
  if (/여행|관광|호텔|여행지/i.test(text)) topics.push('travel')
  if (/일상|데일리|브이로그|vlog/i.test(text)) topics.push('daily')
  if (/운동|헬스|다이어트|요가/i.test(text)) topics.push('fitness')
  
  return topics.length > 0 ? topics : ['lifestyle']
}

// 포스팅 빈도 계산
function calculatePostingFrequency(posts) {
  if (posts.length < 2) return 'unknown'
  
  const timestamps = posts.map(p => p.timestamp).sort((a, b) => b - a)
  const intervals = []
  
  for (let i = 0; i < timestamps.length - 1; i++) {
    intervals.push(timestamps[i] - timestamps[i + 1])
  }
  
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
  const daysInterval = avgInterval / (24 * 60 * 60)
  
  if (daysInterval < 1) return 'daily'
  if (daysInterval < 3) return 'frequent'
  if (daysInterval < 7) return 'weekly'
  return 'occasional'
}
