import { supabaseBiz } from './supabaseClients'

/**
 * YouTube 채널에서 프로필 이미지 URL 추출
 */
export async function getYouTubeProfileImage(youtubeUrl) {
  try {
    // YouTube 채널 ID 또는 핸들 추출
    let channelId = null
    
    // @handle 형식
    const handleMatch = youtubeUrl.match(/youtube\.com\/@([^\/\?]+)/)
    if (handleMatch) {
      // YouTube oEmbed API 사용 (채널 정보 가져오기)
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
      const response = await fetch(oembedUrl)
      const data = await response.json()
      
      // author_url에서 채널 ID 추출
      if (data.author_url) {
        const channelMatch = data.author_url.match(/channel\/([^\/\?]+)/)
        if (channelMatch) {
          channelId = channelMatch[1]
        }
      }
    }
    
    // channel/ 형식
    const directChannelMatch = youtubeUrl.match(/youtube\.com\/channel\/([^\/\?]+)/)
    if (directChannelMatch) {
      channelId = directChannelMatch[1]
    }
    
    if (!channelId) {
      console.warn('YouTube 채널 ID를 찾을 수 없습니다:', youtubeUrl)
      return null
    }
    
    // YouTube 프로필 이미지는 표준 URL 패턴 사용
    return `https://yt3.googleusercontent.com/ytc/channel/${channelId}`
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
    
    // Instagram Graph API 또는 공개 프로필 이미지 URL 사용
    // 참고: Instagram은 공식 API 없이는 프로필 이미지를 가져오기 어려움
    // 대안: 사용자가 직접 업로드하도록 유도
    
    console.warn('Instagram 프로필 이미지는 수동 업로드가 필요합니다:', username)
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
    if (!imageUrl) return null
    
    // 이미지 다운로드
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    
    // 파일명 생성
    const fileExt = 'jpg' // 기본 확장자
    const fileName = `${creatorId}_${platform}_${Date.now()}.${fileExt}`
    const filePath = `profiles/${fileName}`
    
    // Supabase Storage에 업로드
    const { data, error } = await supabaseBiz.storage
      .from('creator-profiles')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      })
    
    if (error) {
      console.error('Supabase 업로드 실패:', error)
      throw error
    }
    
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
 * 이미지 파일을 직접 Supabase Storage에 업로드
 */
export async function uploadImageFile(file, creatorId) {
  try {
    if (!file) return null
    
    // 파일명 생성
    const fileExt = file.name.split('.').pop()
    const fileName = `${creatorId}_manual_${Date.now()}.${fileExt}`
    const filePath = `profiles/${fileName}`
    
    // Supabase Storage에 업로드
    const { data, error } = await supabaseBiz.storage
      .from('creator-profiles')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      })
    
    if (error) {
      console.error('Supabase 업로드 실패:', error)
      throw error
    }
    
    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabaseBiz.storage
      .from('creator-profiles')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('이미지 파일 업로드 실패:', error)
    return null
  }
}

/**
 * YouTube Shorts 최근 영상 수집
 * 참고: YouTube Data API가 필요합니다
 */
export async function getYouTubeShorts(youtubeUrl, limit = 6) {
  try {
    // YouTube Data API 키가 필요
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
      console.warn('YouTube API 키가 설정되지 않았습니다')
      return []
    }
    
    // 채널 ID 추출
    let channelId = null
    const handleMatch = youtubeUrl.match(/youtube\.com\/@([^\/\?]+)/)
    const channelMatch = youtubeUrl.match(/youtube\.com\/channel\/([^\/\?]+)/)
    
    if (channelMatch) {
      channelId = channelMatch[1]
    } else if (handleMatch) {
      // Handle에서 채널 ID 가져오기 (추가 API 호출 필요)
      const handle = handleMatch[1]
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=@${handle}&type=channel&key=${apiKey}`
      const searchResponse = await fetch(searchUrl)
      const searchData = await searchResponse.json()
      
      if (searchData.items && searchData.items.length > 0) {
        channelId = searchData.items[0].snippet.channelId
      }
    }
    
    if (!channelId) {
      console.warn('YouTube 채널 ID를 찾을 수 없습니다')
      return []
    }
    
    // 채널의 최근 Shorts 영상 가져오기
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&videoDuration=short&order=date&maxResults=${limit}&key=${apiKey}`
    const response = await fetch(searchUrl)
    const data = await response.json()
    
    if (!data.items) {
      return []
    }
    
    return data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high.url,
      url: `https://youtube.com/shorts/${item.id.videoId}`,
      publishedAt: item.snippet.publishedAt,
      platform: 'youtube'
    }))
  } catch (error) {
    console.error('YouTube Shorts 수집 실패:', error)
    return []
  }
}

/**
 * Instagram Reels 최근 영상 수집
 * 참고: Instagram Graph API가 필요하며, 비즈니스 계정만 가능
 */
export async function getInstagramReels(instagramUrl, limit = 6) {
  try {
    // Instagram Graph API는 복잡한 인증이 필요
    // 현재는 수동으로 URL을 입력하도록 유도
    console.warn('Instagram Reels는 수동 입력이 필요합니다')
    return []
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
      videos.push(...shorts)
    }
    
    if (creator.instagram_url) {
      const reels = await getInstagramReels(creator.instagram_url)
      videos.push(...reels)
    }
    
    result.recentVideos = videos.slice(0, 6) // 최대 6개

    return result
  } catch (error) {
    console.error('크리에이터 미디어 수집 실패:', error)
    return result
  }
}
