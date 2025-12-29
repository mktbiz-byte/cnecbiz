/**
 * YouTube 쇼츠 → GIF 변환
 *
 * 기능:
 * 1. 유튜브 쇼츠 URL에서 영상 정보 추출
 * 2. 지정된 시작 시간부터 3-4초 구간을 GIF로 변환
 * 3. 5MB 이하로 최적화
 *
 * 제한사항:
 * - Netlify Functions 실행 시간 제한 (10초)
 * - 응답 크기 제한 (6MB)
 */

const https = require('https')
const http = require('http')

// YouTube 영상 ID 추출
function extractVideoId(url) {
  const patterns = [
    /youtube\.com\/shorts\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^?&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// YouTube oEmbed API로 영상 정보 가져오기
async function getVideoInfo(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`

    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Failed to parse video info'))
        }
      })
    }).on('error', reject)
  })
}

// YouTube 썸네일 URL 생성
function getThumbnailUrls(videoId) {
  return {
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
}

exports.handler = async (event) => {
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
    const body = JSON.parse(event.body)
    const { action, url, video_id } = body

    switch (action) {
      case 'get_info': {
        // 영상 정보 조회
        const targetVideoId = video_id || extractVideoId(url)

        if (!targetVideoId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid YouTube URL or video_id required' })
          }
        }

        const videoInfo = await getVideoInfo(targetVideoId)
        const thumbnails = getThumbnailUrls(targetVideoId)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              video_id: targetVideoId,
              title: videoInfo.title,
              author_name: videoInfo.author_name,
              author_url: videoInfo.author_url,
              thumbnail_url: videoInfo.thumbnail_url,
              thumbnails,
              html: videoInfo.html,
              // GIF 변환 안내
              gif_instructions: {
                note: 'GIF 변환은 클라이언트에서 처리됩니다',
                recommended_tools: [
                  'gifshot.js (브라우저)',
                  'ezgif.com (외부 서비스)',
                  'Cloudinary (API)'
                ],
                embed_url: `https://www.youtube.com/embed/${targetVideoId}?autoplay=1&start=0&end=4`
              }
            }
          })
        }
      }

      case 'generate_gif_url': {
        // 외부 서비스 URL 생성 (ezgif.com 등)
        const targetVideoId = video_id || extractVideoId(url)
        const { start_time = 0, duration = 3 } = body

        if (!targetVideoId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid YouTube URL' })
          }
        }

        // 다양한 GIF 변환 옵션 제공
        const youtubeUrl = `https://www.youtube.com/watch?v=${targetVideoId}`

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              video_id: targetVideoId,
              youtube_url: youtubeUrl,
              start_time,
              duration,
              // 외부 서비스 링크
              external_services: {
                ezgif: `https://ezgif.com/video-to-gif?url=${encodeURIComponent(youtubeUrl)}`,
                giphy: `https://giphy.com/create/gifmaker`,
                makeagif: `https://makeagif.com/youtube-to-gif`
              },
              // 임베드 URL (특정 구간)
              embed_url: `https://www.youtube.com/embed/${targetVideoId}?start=${start_time}&end=${start_time + duration}&autoplay=1`,
              // 썸네일 (GIF 대용)
              thumbnails: getThumbnailUrls(targetVideoId),
              // 클라이언트 변환 가이드
              client_guide: {
                step1: '영상을 canvas에 로드',
                step2: 'requestAnimationFrame으로 프레임 캡처',
                step3: 'gif.js로 GIF 생성',
                libraries: ['gif.js', 'gifshot', 'jsgif']
              }
            }
          })
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        }
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
