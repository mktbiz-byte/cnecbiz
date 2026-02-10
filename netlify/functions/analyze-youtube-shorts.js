/**
 * YouTube Shorts 영상 분석 → 촬영 가이드 생성
 * Gemini AI로 YouTube 영상의 오디오를 음성인식하여
 * 원본과 동일한 구조의 촬영 가이드를 생성합니다.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai')

exports.config = {
  maxDuration: 60
}

// YouTube 비디오 ID 추출
function extractVideoId(url) {
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// XML 캡션에서 타임스탬프 + 텍스트 추출
function parseCaptionXml(xml) {
  const segments = []
  const textMatches = [...xml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>(.*?)<\/text>/gs)]
  for (const m of textMatches) {
    const startSec = parseFloat(m[1])
    const durSec = parseFloat(m[2])
    const text = m[3]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim()
    if (text) {
      segments.push({ start: startSec, end: startSec + durSec, text })
    }
  }
  return segments
}

// innertube player API 호출 (여러 클라이언트 타입 지원)
async function callPlayerApi(videoId, clientConfig) {
  const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: { client: clientConfig },
      videoId
    })
  })
  if (!response.ok) return null
  return response.json()
}

// YouTube 영상 메타데이터 + 자막 + 오디오 URL 추출
async function fetchYouTubeData(videoId) {
  // YouTube HTML 페이지 가져오기 (쿠키 동의 포함)
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml',
      'Cookie': 'CONSENT=YES+cb.20240101-00-p0.en+FX+999'
    }
  })
  const html = await response.text()
  console.log('[yt-shorts] HTML length:', html.length)

  // 메타데이터 추출 — videoDetails 블록에서 indexOf로 안전하게 추출
  let title = ''
  let description = ''
  let duration = 0

  const vdIdx = html.indexOf('"videoDetails"')
  if (vdIdx !== -1) {
    // videoDetails 이후 1000자 내에서 검색
    const vdChunk = html.substring(vdIdx, vdIdx + 2000)
    const titleM = vdChunk.match(/"title"\s*:\s*"(.*?)"/)
    if (titleM) {
      title = titleM[1]
      try { title = JSON.parse(`"${title}"`) } catch (e) {}
    }
    const descM = vdChunk.match(/"shortDescription"\s*:\s*"(.*?)"/)
    if (descM) {
      try { description = JSON.parse(`"${descM[1]}"`).substring(0, 1500) } catch (e) {
        description = descM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').substring(0, 1500)
      }
    }
    const durM = vdChunk.match(/"lengthSeconds"\s*:\s*"(\d+)"/)
    if (durM) duration = parseInt(durM[1])
  }
  // fallback 제목
  if (!title) {
    const fbTitle = html.match(/<meta name="title" content="(.*?)"/) ||
                    html.match(/<title>(.+?)<\/title>/)
    if (fbTitle) {
      title = fbTitle[1].replace(' - YouTube', '').trim()
      try { title = JSON.parse(`"${title}"`) } catch (e) {}
    }
  }
  // fallback 설명
  if (!description) {
    const descMatch = html.match(/"shortDescription":"(.*?)"/)
    if (descMatch) {
      try { description = JSON.parse(`"${descMatch[1]}"`).substring(0, 1500) } catch (e) {
        description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').substring(0, 1500)
      }
    }
  }
  // fallback 길이
  if (!duration) {
    const durMatch = html.match(/"lengthSeconds":"(\d+)"/)
    if (durMatch) duration = parseInt(durMatch[1])
  }
  console.log('[yt-shorts] Parsed — title:', title?.substring(0, 50), ', duration:', duration, ', desc:', description?.substring(0, 50))

  let transcript = ''
  let timestampedTranscript = []
  let captionLang = ''
  let captionMethod = ''

  // ===== 자막 방법 1: HTML에서 captionTracks 추출 =====
  try {
    const captionStart = html.indexOf('"captionTracks":')
    let captionData = null
    if (captionStart !== -1) {
      const arrStart = html.indexOf('[', captionStart)
      if (arrStart !== -1) {
        let depth = 0, arrEnd = -1, inStr = false
        for (let i = arrStart; i < html.length && i < arrStart + 50000; i++) {
          const ch = html[i]
          if (inStr) { if (ch === '\\') { i++; continue }; if (ch === '"') inStr = false; continue }
          if (ch === '"') { inStr = true; continue }
          if (ch === '[') depth++
          else if (ch === ']') { depth--; if (depth === 0) { arrEnd = i; break } }
        }
        if (arrEnd !== -1) {
          const rawJson = html.substring(arrStart, arrEnd + 1)
          try { captionData = JSON.parse(rawJson) } catch (e1) {
            try { captionData = JSON.parse(rawJson.replace(/\\\\u0026/g, '\\u0026')) } catch (e2) {
              const urlMatches = [...rawJson.matchAll(/"baseUrl"\s*:\s*"(.*?)"/g)]
              const langMatches = [...rawJson.matchAll(/"languageCode"\s*:\s*"(.*?)"/g)]
              if (urlMatches.length > 0) {
                captionData = urlMatches.map((m, i) => ({
                  baseUrl: m[1], languageCode: langMatches[i]?.[1] || 'unknown'
                }))
              }
            }
          }
        }
      }
    }
    if (captionData?.length) {
      const track = captionData.find(t => t.languageCode === 'ko' && !t.kind) ||
                    captionData.find(t => t.languageCode === 'ko') ||
                    captionData.find(t => t.languageCode === 'en' && !t.kind) ||
                    captionData.find(t => t.languageCode === 'en') || captionData[0]
      if (track?.baseUrl) {
        captionLang = track.languageCode || ''
        const captionUrl = track.baseUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&')
        const captionResponse = await fetch(captionUrl)
        const captionXml = await captionResponse.text()
        timestampedTranscript = parseCaptionXml(captionXml)
        transcript = timestampedTranscript.map(t => t.text).join(' ')
        if (timestampedTranscript.length > 0) captionMethod = 'captionTracks'
        console.log('[yt-shorts] Method 1 (HTML captionTracks):', timestampedTranscript.length, 'segments')
      }
    } else {
      console.log('[yt-shorts] No captionTracks in HTML')
    }
  } catch (e) {
    console.log('[yt-shorts] Method 1 error:', e.message)
  }

  // ===== 자막 방법 2 + 오디오 URL: innertube player API (여러 클라이언트 시도) =====
  let audioStreamUrl = null
  let audioMimeType = null

  const clientConfigs = [
    {
      name: 'WEB',
      config: { clientName: 'WEB', clientVersion: '2.20241201.00.00', hl: 'ko', gl: 'KR' }
    },
    {
      name: 'ANDROID',
      config: { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30, hl: 'ko', gl: 'KR' }
    },
    {
      name: 'TV_EMBED',
      config: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0' }
    }
  ]

  for (const { name, config } of clientConfigs) {
    try {
      console.log(`[yt-shorts] Trying player API (${name})...`)
      const playerData = await callPlayerApi(videoId, config)
      if (!playerData) { console.log(`[yt-shorts] ${name}: no response`); continue }

      // 메타데이터 보강
      if (!title && playerData?.videoDetails?.title) title = playerData.videoDetails.title
      if (!description && playerData?.videoDetails?.shortDescription) description = playerData.videoDetails.shortDescription.substring(0, 1500)
      if (!duration && playerData?.videoDetails?.lengthSeconds) duration = parseInt(playerData.videoDetails.lengthSeconds) || 0

      // 자막 추출 (아직 없는 경우)
      if (!transcript) {
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        if (captions?.length) {
          console.log(`[yt-shorts] ${name}: found ${captions.length} caption tracks`)
          const track = captions.find(t => t.languageCode === 'ko' && t.kind !== 'asr') ||
                        captions.find(t => t.languageCode === 'ko') ||
                        captions.find(t => t.languageCode === 'en' && t.kind !== 'asr') ||
                        captions.find(t => t.languageCode === 'en') || captions[0]
          if (track?.baseUrl) {
            captionLang = track.languageCode || ''
            const captionResponse = await fetch(track.baseUrl.replace(/&amp;/g, '&'))
            const captionXml = await captionResponse.text()
            timestampedTranscript = parseCaptionXml(captionXml)
            transcript = timestampedTranscript.map(t => t.text).join(' ')
            if (timestampedTranscript.length > 0) captionMethod = `player_${name}`
            console.log(`[yt-shorts] ${name} captions:`, timestampedTranscript.length, 'segments')
          }
        }
      }

      // 오디오 스트림 URL 추출 (아직 없는 경우)
      if (!audioStreamUrl) {
        const formats = [
          ...(playerData?.streamingData?.adaptiveFormats || []),
          ...(playerData?.streamingData?.formats || [])
        ]
        const allAudio = formats.filter(f => f.mimeType?.startsWith('audio/'))
        const directAudio = allAudio.filter(f => f.url)
        console.log(`[yt-shorts] ${name}: ${allAudio.length} audio formats, ${directAudio.length} with direct URL`)

        if (directAudio.length > 0) {
          directAudio.sort((a, b) => parseInt(a.contentLength || '999999999') - parseInt(b.contentLength || '999999999'))
          audioStreamUrl = directAudio[0].url
          audioMimeType = directAudio[0].mimeType.split(';')[0]
          console.log(`[yt-shorts] ${name}: audio stream found! ${audioMimeType}, ${directAudio[0].contentLength} bytes`)
        }
      }

      // 자막 + 오디오 모두 있으면 더 이상 시도할 필요 없음
      if (transcript && audioStreamUrl) break
    } catch (e) {
      console.log(`[yt-shorts] ${name} error:`, e.message)
    }
  }

  // ===== 자막 방법 3: innertube get_transcript API =====
  if (!transcript) {
    try {
      console.log('[yt-shorts] Trying get_transcript API...')
      const protoBytes = [0x0a, videoId.length, ...Array.from(videoId).map(c => c.charCodeAt(0))]
      const params = Buffer.from(protoBytes).toString('base64')
      const innertubeResponse = await fetch('https://www.youtube.com/youtubei/v1/get_transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20241201.00.00', hl: 'ko', gl: 'KR' } },
          params
        })
      })
      if (innertubeResponse.ok) {
        const data = await innertubeResponse.json()
        const segments = data?.actions?.[0]?.updateEngagementPanelAction?.content
          ?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups
        if (segments?.length) {
          timestampedTranscript = segments.map(seg => {
            const cue = seg.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer
            return {
              start: parseInt(cue?.startOffsetMs || 0) / 1000,
              end: (parseInt(cue?.startOffsetMs || 0) + parseInt(cue?.durationMs || 0)) / 1000,
              text: cue?.cue?.simpleText || ''
            }
          }).filter(t => t.text)
          transcript = timestampedTranscript.map(t => t.text).join(' ')
          if (timestampedTranscript.length > 0) captionMethod = 'get_transcript'
          console.log('[yt-shorts] get_transcript:', timestampedTranscript.length, 'segments')
        }
      }
    } catch (e) {
      console.log('[yt-shorts] get_transcript error:', e.message)
    }
  }

  // ===== 오디오 fallback: Piped + Invidious API (YouTube 프록시) =====
  if (!audioStreamUrl || !transcript) {
    // 프록시 인스턴스 목록 (Piped + Invidious)
    const proxyApis = [
      { type: 'piped', url: 'https://pipedapi.kavin.rocks/streams/' },
      { type: 'piped', url: 'https://pipedapi.r4fo.com/streams/' },
      { type: 'piped', url: 'https://pipedapi.darkness.services/streams/' },
      { type: 'invidious', url: 'https://inv.nadeko.net/api/v1/videos/' },
      { type: 'invidious', url: 'https://invidious.fdn.fr/api/v1/videos/' },
      { type: 'invidious', url: 'https://vid.puffyan.us/api/v1/videos/' }
    ]

    for (const api of proxyApis) {
      try {
        const apiUrl = `${api.url}${videoId}`
        console.log(`[yt-shorts] Trying ${api.type}: ${api.url}...`)
        const proxyResponse = await fetch(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000)
        })
        console.log(`[yt-shorts] ${api.type} response: ${proxyResponse.status}`)
        if (!proxyResponse.ok) continue

        const data = await proxyResponse.json()

        if (api.type === 'piped') {
          // Piped 응답 처리
          if (!title && data.title) title = data.title
          if (!description && data.description) description = data.description.substring(0, 1500)
          if (!duration && data.duration) duration = data.duration

          // 자막
          if (!transcript && data.subtitles?.length) {
            console.log(`[yt-shorts] Piped: ${data.subtitles.length} subtitle tracks`)
            const sub = data.subtitles.find(s => s.code === 'ko') ||
                        data.subtitles.find(s => s.code === 'en') || data.subtitles[0]
            if (sub?.url) {
              try {
                captionLang = sub.code || ''
                const subUrl = sub.url.includes('fmt=') ? sub.url : sub.url + (sub.url.includes('?') ? '&' : '?') + 'fmt=srv3'
                const subResp = await fetch(subUrl, { signal: AbortSignal.timeout(5000) })
                timestampedTranscript = parseCaptionXml(await subResp.text())
                transcript = timestampedTranscript.map(t => t.text).join(' ')
                if (timestampedTranscript.length > 0) captionMethod = 'piped_sub'
              } catch (e) { console.log('[yt-shorts] Piped sub error:', e.message) }
            }
          }

          // 오디오
          if (!audioStreamUrl && data.audioStreams?.length) {
            data.audioStreams.sort((a, b) => (a.contentLength || Infinity) - (b.contentLength || Infinity))
            audioStreamUrl = data.audioStreams[0].url
            audioMimeType = (data.audioStreams[0].mimeType || 'audio/mp4').split(';')[0]
            if (!audioMimeType.startsWith('audio/')) audioMimeType = 'audio/mp4'
            console.log(`[yt-shorts] Piped audio: ${audioMimeType}, ${data.audioStreams[0].contentLength || '?'} bytes`)
          }
        } else {
          // Invidious 응답 처리
          if (!title && data.title) title = data.title
          if (!description && data.description) description = data.description.substring(0, 1500)
          if (!duration && data.lengthSeconds) duration = data.lengthSeconds

          // 자막
          if (!transcript && data.captions?.length) {
            console.log(`[yt-shorts] Invidious: ${data.captions.length} caption tracks`)
            const cap = data.captions.find(c => c.language_code === 'ko') ||
                        data.captions.find(c => c.language_code === 'en') || data.captions[0]
            if (cap?.url) {
              try {
                captionLang = cap.language_code || ''
                const capResp = await fetch(`https://${new URL(api.url).host}${cap.url}`, { signal: AbortSignal.timeout(5000) })
                timestampedTranscript = parseCaptionXml(await capResp.text())
                transcript = timestampedTranscript.map(t => t.text).join(' ')
                if (timestampedTranscript.length > 0) captionMethod = 'invidious_cap'
              } catch (e) { console.log('[yt-shorts] Invidious cap error:', e.message) }
            }
          }

          // 오디오 (Invidious의 adaptiveFormats)
          if (!audioStreamUrl && data.adaptiveFormats?.length) {
            const audioFmts = data.adaptiveFormats.filter(f => f.type?.startsWith('audio/') && f.url)
            if (audioFmts.length > 0) {
              audioFmts.sort((a, b) => (a.clen || Infinity) - (b.clen || Infinity))
              audioStreamUrl = audioFmts[0].url
              audioMimeType = audioFmts[0].type.split(';')[0]
              console.log(`[yt-shorts] Invidious audio: ${audioMimeType}`)
            }
          }
        }

        // 오디오 또는 자막 확보되면 중단
        if (audioStreamUrl || transcript) {
          console.log(`[yt-shorts] ${api.type} success! audio: ${!!audioStreamUrl}, transcript: ${transcript.length} chars`)
          break
        }
      } catch (e) {
        console.log(`[yt-shorts] ${api.type} error:`, e.message)
      }
    }
  }

  console.log('[yt-shorts] Final — title:', title, ', duration:', duration, 's, transcript:', transcript.length, 'chars, method:', captionMethod || 'none', ', audioUrl:', !!audioStreamUrl)

  return { title, description, duration, transcript, timestampedTranscript, videoId, captionLang, captionMethod, audioStreamUrl, audioMimeType }
}

// 타임스탬프 자막을 타임라인 텍스트로 변환
function formatTimeline(timestampedTranscript) {
  if (!timestampedTranscript?.length) return ''
  return timestampedTranscript.map(t => {
    const min = Math.floor(t.start / 60)
    const sec = Math.floor(t.start % 60)
    return `[${min}:${String(sec).padStart(2, '0')}] ${t.text}`
  }).join('\n')
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const {
      youtubeUrl,
      similarityPercent = 80,
      requiredDialogues = [],
      additionalNotes = ''
    } = JSON.parse(event.body || '{}')

    if (!youtubeUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'YouTube URL이 필요합니다.' }) }
    }

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '유효하지 않은 YouTube URL입니다.' }) }
    }

    console.log('[yt-shorts] ===== Analyzing video:', videoId, '=====')

    // 1. YouTube 데이터 추출 (자막 + 오디오 URL)
    const videoData = await fetchYouTubeData(videoId)
    console.log('[yt-shorts] Title:', videoData.title)
    console.log('[yt-shorts] Transcript:', videoData.transcript.length, 'chars, method:', videoData.captionMethod || 'none')
    console.log('[yt-shorts] Audio URL:', !!videoData.audioStreamUrl)

    // 2. Gemini 설정
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // 3. 자막 없으면 → 오디오 다운로드 → Gemini 음성 인식
    if (videoData.transcript.length <= 10 && videoData.audioStreamUrl) {
      try {
        console.log('[yt-shorts] Downloading audio for Gemini speech recognition...')
        const audioResponse = await fetch(videoData.audioStreamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Range': 'bytes=0-5242880'  // 최대 5MB만 다운로드
          }
        })
        if (audioResponse.ok || audioResponse.status === 206) {
          const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
          console.log('[yt-shorts] Audio downloaded:', audioBuffer.length, 'bytes')

          if (audioBuffer.length > 1000 && audioBuffer.length < 10 * 1024 * 1024) {
            const audioBase64 = audioBuffer.toString('base64')
            const audioMime = videoData.audioMimeType || 'audio/mp4'

            const transcribeResult = await model.generateContent({
              contents: [{
                parts: [
                  { text: `이 오디오의 음성을 정확히 받아적어주세요.

형식:
[M:SS] 대사내용

예시:
[0:00] 안녕하세요 여러분
[0:03] 오늘은 이 제품을 리뷰해볼게요

규칙:
- 모든 대사를 빠짐없이 받아적으세요
- 타임스탬프는 [분:초] 형식으로
- 배경음악, 효과음은 무시
- 말하는 내용만 정확히 적어주세요
- 한국어가 아닌 경우 해당 언어로 적어주세요` },
                  { inlineData: { mimeType: audioMime, data: audioBase64 } }
                ]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
            })

            const transcription = transcribeResult?.response?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            console.log('[yt-shorts] Gemini STT result:', transcription.substring(0, 500))

            // 타임스탬프 파싱
            const lines = [...transcription.matchAll(/\[(\d+):(\d+)\]\s*(.+)/g)]
            if (lines.length > 0) {
              videoData.timestampedTranscript = lines.map(m => ({
                start: parseInt(m[1]) * 60 + parseInt(m[2]),
                end: parseInt(m[1]) * 60 + parseInt(m[2]) + 3,
                text: m[3].trim()
              }))
              videoData.transcript = videoData.timestampedTranscript.map(t => t.text).join(' ')
              videoData.captionMethod = 'gemini_stt'
              videoData.captionLang = 'ko'
              console.log('[yt-shorts] Gemini STT: extracted', videoData.timestampedTranscript.length, 'segments')
            } else if (transcription.length > 20) {
              videoData.transcript = transcription.replace(/```/g, '').trim()
              videoData.captionMethod = 'gemini_stt_plain'
              videoData.captionLang = 'ko'
              console.log('[yt-shorts] Gemini STT: plain text,', videoData.transcript.length, 'chars')
            }
          }
        } else {
          console.log('[yt-shorts] Audio download failed:', audioResponse.status, audioResponse.statusText)
        }
      } catch (e) {
        console.log('[yt-shorts] Gemini STT error:', e.message)
      }
    }

    // 4. 자막도 없고 오디오도 없으면 → 로그
    if (videoData.transcript.length <= 10 && !videoData.audioStreamUrl) {
      console.log('[yt-shorts] WARNING: No transcript AND no audio URL. Guide will be based on title/description only.')
    }

    // 타임라인 텍스트 생성 (음성인식 결과 포함)
    const timeline = formatTimeline(videoData.timestampedTranscript)

    // 필수 대사 처리
    const filteredDialogues = requiredDialogues.filter(d => d.trim())
    const requiredDialoguesSection = filteredDialogues.length > 0
      ? `\n## 🔴 반드시 포함할 대사 (아래 대사를 scenes의 dialogue에 반드시 배치할 것)\n${filteredDialogues.map((d, i) => `${i + 1}. "${d}"`).join('\n')}\n위 대사들은 가이드의 적절한 장면에 자연스럽게 배치해주세요. required_dialogues에도 포함해야 합니다.`
      : ''

    const hasTranscript = videoData.transcript.length > 10

    const prompt = `# 미션: YouTube 영상을 분석하고 **거의 동일한 촬영 가이드** 작성

당신은 숏폼 영상 기획 전문가입니다. 아래 YouTube 영상을 분석한 뒤, **이 영상을 따라 찍을 수 있는 촬영 가이드**를 작성하세요.

## ⚠️ 핵심 규칙
- **원본 영상의 대본(스크립트)을 그대로 따라가세요.** 자막에 있는 대사를 기반으로 장면을 구성합니다.
- 장면 순서, 대사 흐름, 카메라 전환을 원본과 **${similarityPercent}% 유사하게** 재현합니다.
- 원본에서 말한 내용을 임의로 바꾸거나 새로 만들지 마세요. 원본 대사를 최대한 유지합니다.
- ${similarityPercent >= 80 ? '장면 구성, 대사, 톤 모두 원본과 거의 동일하게 작성합니다.' : similarityPercent >= 60 ? '핵심 구조와 대사 흐름은 유지하되 일부 조정 가능합니다.' : '전체적인 컨셉과 톤을 참고하되 내용은 유연하게 변경 가능합니다.'}

## 📹 원본 영상 정보
- **제목**: ${videoData.title || '(제목 없음)'}
- **길이**: ${videoData.duration ? `${videoData.duration}초 (약 ${Math.round(videoData.duration / 60 * 10) / 10}분)` : '알 수 없음'}
- **설명**: ${videoData.description || '(없음)'}
${hasTranscript ? `
## 📝 원본 영상 자막 (이것이 영상의 실제 대본입니다)
\`\`\`
${timeline || videoData.transcript}
\`\`\`

위 자막을 **영상의 대본**으로 간주하세요. 각 타임스탬프가 하나의 장면 전환 시점입니다.
자막의 흐름을 따라 장면을 나누고, 각 장면의 대사를 원본에서 가져오세요.
` : `
## ⚠️ 자막 없음
이 영상은 자막이 추출되지 않았습니다.
영상 제목과 설명을 바탕으로 **해당 유형의 숏폼 영상에서 일반적으로 사용되는 구조와 대사**를 추정하여 가이드를 작성하세요.
`}
${requiredDialoguesSection}
${additionalNotes ? `\n## 📝 추가 요청\n${additionalNotes}` : ''}

## 📋 출력 형식 (JSON)
{
  "video_analysis": {
    "summary": "원본 영상의 내용과 흐름 요약 (3-4문장, 구체적으로)",
    "style": "영상 스타일 (GRWM, 리뷰, 언박싱, 튜토리얼, 먹방, 브이로그, 일상, 챌린지 등)",
    "tone": "톤앤매너 (친근, 전문적, 유머러스, 감성적, 에너지틱 등)",
    "structure": "영상 전체 구조 (예: 후킹 → 제품소개 → 사용장면 → 결과 → 추천멘트)",
    "estimated_duration": "${videoData.duration || '60'}초"
  },
  "guide": {
    "title": "촬영 가이드 제목 (원본 영상 스타일 반영)",
    "concept": "이 영상의 핵심 컨셉과 촬영 방향 (2-3문장)",
    "scenes": [
      {
        "order": 1,
        "name": "장면 이름 (예: 오프닝 후킹, 제품 소개, 사용 장면 등)",
        "duration": "이 장면의 예상 시간 (예: 0:00~0:05, 5초)",
        "description": "이 장면에서 무엇을 하는지 구체적으로 설명",
        "camera": "카메라 앵글/움직임 (셀카, 클로즈업, 제품 위주, 전신 등)",
        "dialogue": "이 장면에서 말할 대사 (원본 자막 기반, 큰따옴표로 감싸기)"
      }
    ],
    "required_dialogues": ["필수 대사1", "필수 대사2", "필수 대사3"],
    "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5"],
    "filming_tips": [
      "촬영 팁 1 (조명, 배경, 각도 등 구체적으로)",
      "촬영 팁 2",
      "촬영 팁 3"
    ],
    "cautions": "주의사항 (해상도 FHD 이상, 세로 촬영 9:16, 필터 자제 등)"
  }
}

중요:
- scenes의 각 dialogue는 원본 자막의 실제 대사를 기반으로 작성하세요.
- scenes 개수는 원본 영상의 장면 전환 횟수에 맞추세요 (숏폼은 보통 4~8개 장면).
- JSON만 반환하세요. 마크다운 코드블록 없이 순수 JSON만.`

    console.log('[yt-shorts] Sending to Gemini for guide generation...')

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    })

    // Gemini 응답 안전 체크
    const candidates = result?.response?.candidates
    if (!candidates || candidates.length === 0) {
      const blockReason = result?.response?.promptFeedback?.blockReason
      throw new Error(blockReason ? `Gemini가 요청을 차단했습니다: ${blockReason}` : 'Gemini 응답이 비어있습니다. 다시 시도해주세요.')
    }

    const finishReason = candidates[0].finishReason
    const responseText = candidates[0]?.content?.parts?.[0]?.text || ''
    console.log('[yt-shorts] Guide response:', responseText.length, 'chars, finishReason:', finishReason)

    if (!responseText) {
      throw new Error('Gemini가 빈 응답을 반환했습니다. 다시 시도해주세요.')
    }

    let guideData
    try {
      guideData = JSON.parse(responseText)
    } catch (parseError) {
      let cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      try {
        guideData = JSON.parse(cleaned)
      } catch (parseError2) {
        // 잘린 JSON 복구
        let openBraces = 0, openBrackets = 0, inStr = false
        for (let i = 0; i < cleaned.length; i++) {
          const c = cleaned[i]
          if (inStr) { if (c === '\\') { i++; continue }; if (c === '"') inStr = false; continue }
          if (c === '"') { inStr = true; continue }
          if (c === '{') openBraces++; else if (c === '}') openBraces--
          else if (c === '[') openBrackets++; else if (c === ']') openBrackets--
        }
        if (inStr) cleaned += '"'
        for (let i = 0; i < openBrackets; i++) cleaned += ']'
        for (let i = 0; i < openBraces; i++) cleaned += '}'
        try {
          guideData = JSON.parse(cleaned)
        } catch (parseError3) {
          throw new Error(`AI 응답 JSON 파싱 실패 (finishReason: ${finishReason}). 다시 시도해주세요.`)
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoData: {
          videoId: videoData.videoId,
          title: videoData.title,
          description: videoData.description,
          duration: videoData.duration,
          hasTranscript: hasTranscript,
          transcriptSegments: videoData.timestampedTranscript.length,
          captionLang: videoData.captionLang,
          captionMethod: videoData.captionMethod || '',
          transcript: videoData.transcript,
          timeline: timeline || ''
        },
        guideData
      })
    }
  } catch (error) {
    console.error('[yt-shorts] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '영상 분석에 실패했습니다.'
      })
    }
  }
}
