import { supabaseBiz } from './supabaseClients'

/**
 * YouTube 채널에서 프로필 이미지 URL 추출
 */
export async function getYouTubeProfileImage(youtubeUrl) {
  try {
    // YouTube URL에서 채널 ID 또는 핸들 추출
    const channelMatch = youtubeUrl.match(/(?:youtube\.com\/(?:@|channel\/|c\/))([^\/\?]+)/)
    if (!channelMatch) return null

    const channelIdentifier = channelMatch[1]
    
    // YouTube 페이지 HTML 가져오기
    const response = await fetch(`https://www.youtube.com/${channelMatch[0]}`)
    const html = await response.text()
    
    // 프로필 이미지 URL 추출 (og:image 메타 태그)
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (imageMatch) {
      return imageMatch[1]
    }
    
    return null
  } catch (error) {
    console.error('YouTube 프로필 이미지 추출 실패:', error)
    return null
  }
}

/**
 * Instagram 프로필 이미지 URL 추출
 */
export async function getInstagramProfileImage(instagramUrl) {
  try {
    // Instagram URL에서 사용자명 추출
    const usernameMatch = instagramUrl.match(/instagram\.com\/([^\/\?]+)/)
    if (!usernameMatch) return null

    const username = usernameMatch[1]
    
    // Instagram 페이지 HTML 가져오기
    const response = await fetch(`https://www.instagram.com/${username}/`)
    const html = await response.text()
    
    // 프로필 이미지 URL 추출 (og:image 메타 태그)
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (imageMatch) {
      return imageMatch[1]
    }
    
    return null
  } catch (error) {
    console.error('Instagram 프로필 이미지 추출 실패:', error)
    return null
  }
}

/**
 * 이미지 URL을 Supabase Storage에 업로드
 */
export async function uploadImageToStorage(imageUrl, creatorId, platform) {
  try {
    // 이미지 다운로드
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    
    // 파일명 생성
    const fileExt = imageUrl.split('.').pop().split('?')[0] || 'jpg'
    const fileName = `${creatorId}_${platform}_${Date.now()}.${fileExt}`
    const filePath = `profiles/${fileName}`
    
    // Supabase Storage에 업로드
    const { data, error } = await supabaseBiz.storage
      .from('creator-profiles')
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: true
      })
    
    if (error) throw error
    
    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabaseBiz.storage
      .from('creator-profiles')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('이미지 업로드 실패:', error)
    return null
  }
}

/**
 * YouTube Shorts 최근 영상 수집
 */
export async function getYouTubeShorts(youtubeUrl, limit = 6) {
  try {
    const channelMatch = youtubeUrl.match(/(?:youtube\.com\/(?:@|channel\/|c\/))([^\/\?]+)/)
    if (!channelMatch) return []

    // YouTube Data API를 사용하거나 웹 스크래핑
    // 여기서는 간단한 구조로 반환
    // 실제로는 YouTube Data API 또는 RSS 피드 사용 권장
    
    return [
      // 예시 데이터 구조
      // {
      //   id: 'video_id',
      //   title: '영상 제목',
      //   thumbnail: 'thumbnail_url',
      //   url: 'https://youtube.com/shorts/video_id',
      //   publishedAt: '2025-01-01'
      // }
    ]
  } catch (error) {
    console.error('YouTube Shorts 수집 실패:', error)
    return []
  }
}

/**
 * Instagram Reels 최근 영상 수집
 */
export async function getInstagramReels(instagramUrl, limit = 6) {
  try {
    const usernameMatch = instagramUrl.match(/instagram\.com\/([^\/\?]+)/)
    if (!usernameMatch) return []

    // Instagram Graph API 또는 웹 스크래핑 필요
    // 공식 API 사용 권장
    
    return [
      // 예시 데이터 구조
      // {
      //   id: 'reel_id',
      //   caption: '설명',
      //   thumbnail: 'thumbnail_url',
      //   url: 'https://instagram.com/reel/reel_id',
      //   timestamp: '2025-01-01'
      // }
    ]
  } catch (error) {
    console.error('Instagram Reels 수집 실패:', error)
    return []
  }
}

/**
 * 크리에이터의 모든 미디어 수집 및 업로드
 */
export async function collectCreatorMedia(creator) {
  const result = {
    profileImageUrl: null,
    recentVideos: []
  }

  try {
    // 프로필 이미지 수집
    let profileImageUrl = null
    
    if (creator.youtube_url) {
      const youtubeImage = await getYouTubeProfileImage(creator.youtube_url)
      if (youtubeImage) {
        profileImageUrl = await uploadImageToStorage(youtubeImage, creator.id, 'youtube')
      }
    }
    
    if (!profileImageUrl && creator.instagram_url) {
      const instagramImage = await getInstagramProfileImage(creator.instagram_url)
      if (instagramImage) {
        profileImageUrl = await uploadImageToStorage(instagramImage, creator.id, 'instagram')
      }
    }
    
    result.profileImageUrl = profileImageUrl

    // 최근 숏폼 영상 수집
    const videos = []
    
    if (creator.youtube_url) {
      const shorts = await getYouTubeShorts(creator.youtube_url)
      videos.push(...shorts.map(v => ({ ...v, platform: 'youtube' })))
    }
    
    if (creator.instagram_url) {
      const reels = await getInstagramReels(creator.instagram_url)
      videos.push(...reels.map(v => ({ ...v, platform: 'instagram' })))
    }
    
    result.recentVideos = videos.slice(0, 6) // 최대 6개

    return result
  } catch (error) {
    console.error('크리에이터 미디어 수집 실패:', error)
    return result
  }
}
