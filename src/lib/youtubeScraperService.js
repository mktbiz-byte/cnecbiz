/**
 * YouTube 채널 정보 크롤링 서비스
 * 브라우저 자동화를 통해 실제 구독자 수, 영상 수 등을 수집
 */

export async function scrapeYouTubeChannel(youtubeUrl) {
  try {
    // YouTube URL에서 채널 ID 또는 핸들 추출
    const channelHandle = extractChannelHandle(youtubeUrl)
    if (!channelHandle) {
      throw new Error('유효하지 않은 YouTube URL입니다')
    }

    // 채널 페이지 HTML 가져오기
    const response = await fetch(`https://www.youtube.com/${channelHandle}/about`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error('YouTube 채널을 찾을 수 없습니다')
    }

    const html = await response.text()

    // 구독자 수 추출
    const subscriberCount = extractSubscriberCount(html)
    
    // 영상 수 추출
    const videoCount = extractVideoCount(html)

    // 총 조회수 추출
    const totalViews = extractTotalViews(html)

    // 평균 조회수 계산
    const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0

    // 예상 참여율 계산 (구독자 대비)
    const estimatedEngagement = calculateEngagementRate(subscriberCount, avgViews)

    return {
      subscribers: subscriberCount,
      videoCount: videoCount,
      totalViews: totalViews,
      avgViews: avgViews,
      engagementRate: estimatedEngagement,
      platform: 'youtube'
    }
  } catch (error) {
    console.error('YouTube scraping error:', error)
    // 실패 시 기본값 반환
    return {
      subscribers: 0,
      videoCount: 0,
      totalViews: 0,
      avgViews: 0,
      engagementRate: 0,
      platform: 'youtube',
      error: error.message
    }
  }
}

function extractChannelHandle(url) {
  // @handle 형식
  const handleMatch = url.match(/@([^\/\?]+)/)
  if (handleMatch) return `@${handleMatch[1]}`

  // /c/channel 형식
  const channelMatch = url.match(/\/c\/([^\/\?]+)/)
  if (channelMatch) return `c/${channelMatch[1]}`

  // /channel/ID 형식
  const idMatch = url.match(/\/channel\/([^\/\?]+)/)
  if (idMatch) return `channel/${idMatch[1]}`

  return null
}

function extractSubscriberCount(html) {
  // YouTube 페이지에서 구독자 수 추출
  // 예: "1.2M subscribers" 또는 "50K subscribers"
  const patterns = [
    /"subscriberCountText":\{"simpleText":"([^"]+)"\}/,
    /"subscriberCountText":\{"runs":\[\{"text":"([^"]+)"\}\]\}/,
    /(\d+(?:\.\d+)?[KMB]?)\s*(?:subscribers|명의 구독자)/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      return parseYouTubeNumber(match[1])
    }
  }

  return 0
}

function extractVideoCount(html) {
  // 영상 수 추출
  const patterns = [
    /"videosCountText":\{"runs":\[\{"text":"([^"]+)"\}/,
    /(\d+(?:,\d+)*)\s*(?:videos|개의 동영상)/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      return parseYouTubeNumber(match[1])
    }
  }

  return 0
}

function extractTotalViews(html) {
  // 총 조회수 추출
  const patterns = [
    /"viewCountText":\{"simpleText":"([^"]+)"\}/,
    /(\d+(?:,\d+)*)\s*(?:views|회 조회)/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      return parseYouTubeNumber(match[1])
    }
  }

  return 0
}

function parseYouTubeNumber(str) {
  // "1.2M", "50K", "1,234" 등을 숫자로 변환
  str = str.replace(/,/g, '').trim()
  
  const multipliers = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000,
    '천': 1000,
    '만': 10000,
    '억': 100000000
  }

  for (const [suffix, multiplier] of Object.entries(multipliers)) {
    if (str.toUpperCase().includes(suffix.toUpperCase())) {
      const num = parseFloat(str.replace(/[^0-9.]/g, ''))
      return Math.round(num * multiplier)
    }
  }

  return parseInt(str.replace(/[^0-9]/g, '')) || 0
}

function calculateEngagementRate(subscribers, avgViews) {
  if (subscribers === 0) return 0
  
  // 조회수 / 구독자 수 * 100
  const rate = (avgViews / subscribers) * 100
  
  // 최대 20%로 제한 (비현실적인 값 방지)
  return Math.min(20, Math.round(rate * 10) / 10)
}

/**
 * Instagram 크롤링 (간단한 버전)
 */
export async function scrapeInstagram(instagramUrl) {
  try {
    const username = extractInstagramUsername(instagramUrl)
    if (!username) {
      throw new Error('유효하지 않은 Instagram URL입니다')
    }

    // Instagram은 로그인 없이 크롤링이 어려우므로 추정값 반환
    // 실제 구현 시 Instagram Graph API 사용 권장
    return {
      followers: 0,
      posts: 0,
      avgLikes: 0,
      engagementRate: 0,
      platform: 'instagram',
      error: 'Instagram API 연동 필요'
    }
  } catch (error) {
    return {
      followers: 0,
      posts: 0,
      avgLikes: 0,
      engagementRate: 0,
      platform: 'instagram',
      error: error.message
    }
  }
}

function extractInstagramUsername(url) {
  const match = url.match(/instagram\.com\/([^\/\?]+)/)
  return match ? match[1] : null
}

/**
 * 여러 플랫폼 통합 크롤링
 */
export async function scrapeAllPlatforms({ youtube_url, instagram_url, tiktok_url }) {
  const results = {
    youtube: null,
    instagram: null,
    tiktok: null,
    totalFollowers: 0,
    avgEngagement: 0,
    avgViews: 0
  }

  // YouTube 크롤링
  if (youtube_url) {
    results.youtube = await scrapeYouTubeChannel(youtube_url)
    results.totalFollowers += results.youtube.subscribers
    results.avgViews += results.youtube.avgViews
  }

  // Instagram 크롤링 (추후 구현)
  if (instagram_url) {
    results.instagram = await scrapeInstagram(instagram_url)
    results.totalFollowers += results.instagram.followers
  }

  // TikTok 크롤링 (추후 구현)
  if (tiktok_url) {
    // TikTok API 또는 크롤링 구현
    results.tiktok = {
      followers: 0,
      videos: 0,
      avgViews: 0,
      platform: 'tiktok',
      error: 'TikTok API 연동 필요'
    }
  }

  // 평균 참여율 계산
  const platforms = [results.youtube, results.instagram, results.tiktok].filter(p => p && p.engagementRate > 0)
  if (platforms.length > 0) {
    results.avgEngagement = platforms.reduce((sum, p) => sum + p.engagementRate, 0) / platforms.length
    results.avgEngagement = Math.round(results.avgEngagement * 10) / 10
  }

  return results
}

