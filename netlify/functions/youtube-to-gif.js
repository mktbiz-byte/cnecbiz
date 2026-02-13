/**
 * YouTube 쇼츠 → GIF 변환
 *
 * 기능:
 * 1. 유튜브 쇼츠 URL에서 영상 정보 추출
 * 2. 영상 다운로드 → Supabase Storage 업로드
 * 3. 클라이언트에서 ffmpeg.wasm으로 GIF 변환
 */

const https = require('https')
const http = require('http')
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

// URL에서 바이너리 데이터 다운로드
function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
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
              embed_url: `https://www.youtube.com/embed/${targetVideoId}?autoplay=1&start=0&end=4`
            }
          })
        }
      }

      case 'download_video': {
        // YouTube 영상 다운로드 → Supabase Storage 업로드
        const targetVideoId = video_id || extractVideoId(url)

        if (!targetVideoId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid YouTube URL' })
          }
        }

        const ytdl = require('@distube/ytdl-core')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        console.log(`[youtube-to-gif] Downloading video: ${targetVideoId}`)

        // 영상 정보 조회
        const info = await ytdl.getInfo(targetVideoId)

        // 가장 작은 MP4 포맷 선택 (비디오+오디오)
        const formats = info.formats.filter(f =>
          f.container === 'mp4' &&
          f.hasVideo &&
          f.contentLength
        ).sort((a, b) => parseInt(a.contentLength) - parseInt(b.contentLength))

        let selectedFormat = formats[0]

        // 비디오만 있는 낮은 화질 포맷도 확인
        if (!selectedFormat) {
          selectedFormat = ytdl.chooseFormat(info.formats, {
            quality: 'lowest',
            filter: 'videoandaudio'
          })
        }

        if (!selectedFormat) {
          selectedFormat = ytdl.chooseFormat(info.formats, {
            quality: 'lowest'
          })
        }

        console.log(`[youtube-to-gif] Selected format: ${selectedFormat.qualityLabel || 'unknown'}, size: ${selectedFormat.contentLength || 'unknown'}`)

        // 영상 다운로드 (Buffer)
        const videoBuffer = await new Promise((resolve, reject) => {
          const chunks = []
          const stream = ytdl.downloadFromInfo(info, { format: selectedFormat })
          stream.on('data', chunk => chunks.push(chunk))
          stream.on('end', () => resolve(Buffer.concat(chunks)))
          stream.on('error', reject)
        })

        console.log(`[youtube-to-gif] Downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`)

        // Supabase Storage에 업로드
        const filename = `temp-gif/${targetVideoId}_${Date.now()}.mp4`
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filename, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true
          })

        if (uploadError) {
          console.error('[youtube-to-gif] Upload error:', uploadError)
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        // 공개 URL 생성
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(filename)

        const videoInfo = await getVideoInfo(targetVideoId)
        const duration = info.videoDetails.lengthSeconds

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              video_id: targetVideoId,
              video_url: urlData.publicUrl,
              storage_path: filename,
              title: videoInfo.title,
              author_name: videoInfo.author_name,
              duration: parseInt(duration),
              file_size: videoBuffer.length,
              thumbnails: getThumbnailUrls(targetVideoId)
            }
          })
        }
      }

      case 'generate_gif_url': {
        // 외부 서비스 URL 생성 (레거시 지원)
        const targetVideoId = video_id || extractVideoId(url)
        const { start_time = 0, duration = 3 } = body

        if (!targetVideoId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid YouTube URL' })
          }
        }

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
              external_services: {
                ezgif: `https://ezgif.com/video-to-gif?url=${encodeURIComponent(youtubeUrl)}`,
                giphy: `https://giphy.com/create/gifmaker`,
                makeagif: `https://makeagif.com/youtube-to-gif`
              },
              embed_url: `https://www.youtube.com/embed/${targetVideoId}?start=${start_time}&end=${start_time + duration}&autoplay=1`,
              thumbnails: getThumbnailUrls(targetVideoId)
            }
          })
        }
      }

      case 'cleanup': {
        // 임시 파일 정리
        const { storage_path } = body
        if (!storage_path) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'storage_path required' })
          }
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase.storage.from('media').remove([storage_path])

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
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
    console.error('[youtube-to-gif] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
