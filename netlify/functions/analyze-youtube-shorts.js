/**
 * YouTube Shorts 영상 분석 → 촬영 가이드 생성
 * Gemini AI로 YouTube 영상의 자막/오디오를 분석하여
 * 원본과 동일한 구조의 촬영 가이드를 생성합니다.
 *
 * 자막 추출 우선순위:
 * 1. 사용자 직접 입력 (manualTranscript)
 * 2. YouTube timedtext API 직접 호출
 * 3. HTML 페이지에서 captionTracks 추출
 * 4. innertube player API (WEB/ANDROID)
 * 5. innertube get_transcript API
 * 6. Cobalt API → Gemini 음성인식 (STT)
 * 7. 메타데이터 기반 가이드 생성 (fallback)
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

// JSON3 자막 파싱 (timedtext API fmt=json3 응답)
function parseCaptionJson3(json3) {
  const segments = []
  try {
    const data = typeof json3 === 'string' ? JSON.parse(json3) : json3
    const events = data.events || []
    for (const event of events) {
      if (!event.segs) continue
      const text = event.segs.map(s => s.utf8 || '').join('').trim()
      if (!text || text === '\n') continue
      const startSec = (event.tStartMs || 0) / 1000
      const durSec = (event.dDurationMs || 0) / 1000
      segments.push({ start: startSec, end: startSec + durSec, text })
    }
  } catch (e) {
    console.log('[yt-shorts] json3 parse error:', e.message)
  }
  return segments
}

// 수동 입력 텍스트를 타임스탬프 배열로 파싱
function parseManualTranscript(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const timestamped = []
  let hasTimestamp = false

  for (const line of lines) {
    // [M:SS] 또는 [MM:SS] 또는 (M:SS) 형식 타임스탬프 감지
    const tsMatch = line.match(/[\[\(](\d{1,2}):(\d{2})[\]\)]\s*(.+)/)
    if (tsMatch) {
      hasTimestamp = true
      const start = parseInt(tsMatch[1]) * 60 + parseInt(tsMatch[2])
      timestamped.push({ start, end: start + 3, text: tsMatch[3].trim() })
    } else if (line.trim()) {
      // 타임스탬프 없는 텍스트
      timestamped.push({ start: timestamped.length * 3, end: (timestamped.length + 1) * 3, text: line.trim() })
    }
  }
  return { segments: timestamped, hasTimestamp }
}

// YouTube timedtext API 직접 호출 (captionTracks 없이도 가능)
async function fetchTimedText(videoId) {
  // 시도할 언어 목록 (한국어 우선)
  const langAttempts = [
    { lang: 'ko', kind: '' },
    { lang: 'ko', kind: 'asr' },
    { lang: 'en', kind: '' },
    { lang: 'en', kind: 'asr' },
    { lang: 'ja', kind: '' },
    { lang: 'ja', kind: 'asr' },
  ]

  for (const { lang, kind } of langAttempts) {
    try {
      const kindParam = kind ? `&kind=${kind}` : ''
      // json3 형식으로 요청 (더 정확한 파싱)
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${kindParam}&fmt=json3`
      console.log(`[yt-shorts] timedtext API: lang=${lang}, kind=${kind || 'manual'}`)
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQxMjE2LjA1X3AxGgJrbSADGgYIgOmyvAY'
        },
        signal: AbortSignal.timeout(8000)
      })
      console.log(`[yt-shorts] timedtext ${lang}${kind ? '/asr' : ''}: status=${resp.status}`)
      if (!resp.ok) continue
      const text = await resp.text()
      if (!text || text.length < 10) continue

      // json3 형식 파싱
      const segments = parseCaptionJson3(text)
      if (segments.length > 0) {
        console.log(`[yt-shorts] timedtext success: ${lang}${kind ? '(asr)' : ''}, ${segments.length} segments`)
        return { segments, lang, method: `timedtext_${lang}${kind ? '_asr' : ''}` }
      }

      // json3 실패 시 XML로 재시도
      const xmlUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${kindParam}&fmt=srv3`
      const xmlResp = await fetch(xmlUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000)
      })
      if (!xmlResp.ok) continue
      const xmlText = await xmlResp.text()
      if (!xmlText || xmlText.length < 10) continue
      const xmlSegments = parseCaptionXml(xmlText)
      if (xmlSegments.length > 0) {
        console.log(`[yt-shorts] timedtext XML success: ${lang}${kind ? '(asr)' : ''}, ${xmlSegments.length} segments`)
        return { segments: xmlSegments, lang, method: `timedtext_xml_${lang}${kind ? '_asr' : ''}` }
      }
    } catch (e) {
      // timeout이나 기타 에러 — 다음 시도
    }
  }
  return null
}

// innertube player API 호출
async function callPlayerApi(videoId, clientConfig) {
  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client: clientConfig },
        videoId
      }),
      signal: AbortSignal.timeout(10000)
    })
    if (!response.ok) return null
    return response.json()
  } catch (e) {
    return null
  }
}

// YouTube 영상 메타데이터 + 자막 + 오디오 URL 추출
async function fetchYouTubeData(videoId) {
  let title = ''
  let description = ''
  let duration = 0
  let transcript = ''
  let timestampedTranscript = []
  let captionLang = ''
  let captionMethod = ''
  let audioStreamUrl = null
  let audioMimeType = null

  // ===== 1단계: oEmbed API로 기본 메타데이터 확보 (가장 안정적) =====
  try {
    const oembedResp = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (oembedResp.ok) {
      const oembed = await oembedResp.json()
      title = oembed.title || ''
      console.log('[yt-shorts] oEmbed title:', title)
    }
  } catch (e) {
    console.log('[yt-shorts] oEmbed error:', e.message)
  }

  // ===== 2단계: YouTube timedtext API 직접 호출 (captionTracks 불필요) =====
  const timedTextResult = await fetchTimedText(videoId)
  if (timedTextResult) {
    timestampedTranscript = timedTextResult.segments
    transcript = timestampedTranscript.map(t => t.text).join(' ')
    captionLang = timedTextResult.lang
    captionMethod = timedTextResult.method
  }

  // ===== 3단계: YouTube HTML 페이지 파싱 (메타데이터 + 자막 보강) =====
  let html = ''
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko&gl=KR&has_verified=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQxMjE2LjA1X3AxGgJrbSADGgYIgOmyvAY; CONSENT=PENDING+999; GPS=1'
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    })
    html = await response.text()
    const hasVD = html.includes('videoDetails')
    const hasPlayerResp = html.includes('ytInitialPlayerResponse')
    const hasCaptionTracks = html.includes('captionTracks')
    const hasConsentForm = html.includes('consent.youtube.com') || html.includes('CONSENT')
    console.log('[yt-shorts] HTML length:', html.length, ', videoDetails:', hasVD, ', playerResponse:', hasPlayerResp, ', captions:', hasCaptionTracks, ', consentPage:', hasConsentForm)

    // videoDetails에서 메타데이터 추출
    const vdIdx = html.indexOf('"videoDetails"')
    if (vdIdx !== -1) {
      const vdChunk = html.substring(vdIdx, vdIdx + 3000)
      if (!title) {
        const titleM = vdChunk.match(/"title"\s*:\s*"(.*?)"/)
        if (titleM) { try { title = JSON.parse(`"${titleM[1]}"`) } catch (e) { title = titleM[1] } }
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

    // fallback 제목/설명/길이 from HTML tags
    if (!title) {
      const fbTitle = html.match(/<meta name="title" content="(.*?)"/) || html.match(/<title>(.+?)<\/title>/)
      if (fbTitle) { title = fbTitle[1].replace(' - YouTube', '').trim() }
    }
    if (!description) {
      const descMatch = html.match(/"shortDescription":"(.*?)"/)
      if (descMatch) { try { description = JSON.parse(`"${descMatch[1]}"`).substring(0, 1500) } catch (e) {} }
    }
    if (!duration) {
      const durMatch = html.match(/"lengthSeconds":"(\d+)"/)
      if (durMatch) duration = parseInt(durMatch[1])
    }

    // HTML에서 captionTracks 추출 (timedtext API가 실패한 경우에만)
    if (!transcript) {
      const captionStart = html.indexOf('"captionTracks":')
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
            let captionData = null
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
            if (captionData?.length) {
              const track = captionData.find(t => t.languageCode === 'ko' && !t.kind) ||
                            captionData.find(t => t.languageCode === 'ko') ||
                            captionData.find(t => t.languageCode === 'en' && !t.kind) ||
                            captionData.find(t => t.languageCode === 'en') || captionData[0]
              if (track?.baseUrl) {
                captionLang = track.languageCode || ''
                const captionUrl = track.baseUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&')
                const captionResponse = await fetch(captionUrl, { signal: AbortSignal.timeout(5000) })
                const captionXml = await captionResponse.text()
                timestampedTranscript = parseCaptionXml(captionXml)
                transcript = timestampedTranscript.map(t => t.text).join(' ')
                if (timestampedTranscript.length > 0) captionMethod = 'captionTracks'
                console.log('[yt-shorts] HTML captionTracks:', timestampedTranscript.length, 'segments')
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('[yt-shorts] HTML fetch error:', e.message)
  }

  // ===== 3.5단계: YouTube embed 페이지에서 추가 데이터 추출 =====
  if (!title || !duration) {
    try {
      const embedResp = await fetch(`https://www.youtube.com/embed/${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(8000)
      })
      const embedHtml = await embedResp.text()
      if (!title) {
        const embedTitle = embedHtml.match(/"title":"(.*?)"/) || embedHtml.match(/<title>(.*?)<\/title>/)
        if (embedTitle) {
          try { title = JSON.parse(`"${embedTitle[1]}"`) } catch (e) { title = embedTitle[1].replace(' - YouTube', '').trim() }
        }
      }
      if (!duration) {
        const embedDur = embedHtml.match(/"lengthSeconds":"(\d+)"/) || embedHtml.match(/"length_seconds":\s*"?(\d+)"?/)
        if (embedDur) duration = parseInt(embedDur[1])
      }
      // embed 페이지에도 captionTracks가 있을 수 있음
      if (!transcript && embedHtml.includes('captionTracks')) {
        console.log('[yt-shorts] Embed page has captionTracks! Extracting...')
        const cStart = embedHtml.indexOf('"captionTracks":')
        const cArrStart = embedHtml.indexOf('[', cStart)
        if (cArrStart !== -1) {
          let depth = 0, cArrEnd = -1, inStr = false
          for (let i = cArrStart; i < embedHtml.length && i < cArrStart + 50000; i++) {
            const ch = embedHtml[i]
            if (inStr) { if (ch === '\\') { i++; continue }; if (ch === '"') inStr = false; continue }
            if (ch === '"') { inStr = true; continue }
            if (ch === '[') depth++
            else if (ch === ']') { depth--; if (depth === 0) { cArrEnd = i; break } }
          }
          if (cArrEnd !== -1) {
            try {
              const rawJson = embedHtml.substring(cArrStart, cArrEnd + 1)
              const captionData = JSON.parse(rawJson.replace(/\\u0026/g, '&'))
              const track = captionData.find(t => t.languageCode === 'ko') || captionData.find(t => t.languageCode === 'en') || captionData[0]
              if (track?.baseUrl) {
                const captionResp = await fetch(track.baseUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&'), { signal: AbortSignal.timeout(5000) })
                timestampedTranscript = parseCaptionXml(await captionResp.text())
                transcript = timestampedTranscript.map(t => t.text).join(' ')
                captionLang = track.languageCode || ''
                if (timestampedTranscript.length > 0) captionMethod = 'embed_captionTracks'
                console.log('[yt-shorts] Embed captions:', timestampedTranscript.length, 'segments')
              }
            } catch (e) {
              console.log('[yt-shorts] Embed caption parse error:', e.message)
            }
          }
        }
      }
      console.log('[yt-shorts] Embed — title:', title?.substring(0, 50), ', duration:', duration)
    } catch (e) {
      console.log('[yt-shorts] Embed fetch error:', e.message)
    }
  }

  // noembed fallback for metadata
  if (!title) {
    try {
      const noembedResp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, { signal: AbortSignal.timeout(5000) })
      if (noembedResp.ok) {
        const noembedData = await noembedResp.json()
        if (noembedData.title) title = noembedData.title
        console.log('[yt-shorts] noembed title:', title)
      }
    } catch (e) {}
  }

  console.log('[yt-shorts] After HTML — title:', title?.substring(0, 50), ', duration:', duration, ', desc:', !!description, ', transcript:', transcript.length, 'chars')

  // ===== 4단계: innertube player API (자막 + 오디오) =====
  if (!transcript || !audioStreamUrl) {
    const clientConfigs = [
      { name: 'WEB', config: { clientName: 'WEB', clientVersion: '2.20241201.00.00', hl: 'ko', gl: 'KR' } },
      { name: 'ANDROID', config: { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30, hl: 'ko', gl: 'KR' } },
    ]

    for (const { name, config } of clientConfigs) {
      try {
        const playerData = await callPlayerApi(videoId, config)
        if (!playerData) { console.log(`[yt-shorts] ${name}: no response`); continue }

        const playStatus = playerData?.playabilityStatus?.status
        const captionCount = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0
        const audioFormats = [...(playerData?.streamingData?.adaptiveFormats || []), ...(playerData?.streamingData?.formats || [])].filter(f => f.mimeType?.startsWith('audio/')).length
        console.log(`[yt-shorts] ${name}: status=${playStatus}, captions=${captionCount}, audioFormats=${audioFormats}, title=${playerData?.videoDetails?.title?.substring(0, 30)}`)

        if (!title && playerData?.videoDetails?.title) title = playerData.videoDetails.title
        if (!description && playerData?.videoDetails?.shortDescription) description = playerData.videoDetails.shortDescription.substring(0, 1500)
        if (!duration && playerData?.videoDetails?.lengthSeconds) duration = parseInt(playerData.videoDetails.lengthSeconds) || 0

        // 자막
        if (!transcript) {
          const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
          if (captions?.length) {
            const track = captions.find(t => t.languageCode === 'ko' && t.kind !== 'asr') ||
                          captions.find(t => t.languageCode === 'ko') ||
                          captions.find(t => t.languageCode === 'en' && t.kind !== 'asr') ||
                          captions.find(t => t.languageCode === 'en') || captions[0]
            if (track?.baseUrl) {
              captionLang = track.languageCode || ''
              const captionResponse = await fetch(track.baseUrl.replace(/&amp;/g, '&'), { signal: AbortSignal.timeout(5000) })
              timestampedTranscript = parseCaptionXml(await captionResponse.text())
              transcript = timestampedTranscript.map(t => t.text).join(' ')
              if (timestampedTranscript.length > 0) captionMethod = `player_${name}`
              console.log(`[yt-shorts] ${name} captions:`, timestampedTranscript.length, 'segments')
            }
          }
        }

        // 오디오 스트림 URL
        if (!audioStreamUrl) {
          const formats = [...(playerData?.streamingData?.adaptiveFormats || []), ...(playerData?.streamingData?.formats || [])]
          const directAudio = formats.filter(f => f.mimeType?.startsWith('audio/') && f.url)
          if (directAudio.length > 0) {
            directAudio.sort((a, b) => parseInt(a.contentLength || '999999999') - parseInt(b.contentLength || '999999999'))
            audioStreamUrl = directAudio[0].url
            audioMimeType = directAudio[0].mimeType.split(';')[0]
            console.log(`[yt-shorts] ${name}: audio found! ${audioMimeType}`)
          }
        }

        if (transcript && audioStreamUrl) break
      } catch (e) {
        console.log(`[yt-shorts] ${name} error:`, e.message)
      }
    }
  }

  // ===== 5단계: innertube get_transcript API (올바른 protobuf 인코딩) =====
  if (!transcript) {
    try {
      console.log('[yt-shorts] Trying get_transcript API...')
      // 올바른 protobuf: 바깥 field1(inner message) > 안쪽 field1(videoId)
      const innerMsg = [0x0a, videoId.length, ...Array.from(videoId).map(c => c.charCodeAt(0))]
      const outerMsg = [0x0a, innerMsg.length, ...innerMsg]
      const params = Buffer.from(outerMsg).toString('base64')
      const innertubeResponse = await fetch('https://www.youtube.com/youtubei/v1/get_transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20241201.00.00', hl: 'ko', gl: 'KR' } },
          params
        }),
        signal: AbortSignal.timeout(10000)
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
        } else {
          console.log('[yt-shorts] get_transcript: no cueGroups in response')
        }
      }
    } catch (e) {
      console.log('[yt-shorts] get_transcript error:', e.message)
    }
  }

  // ===== 6단계: Cobalt API (오디오 다운로드 → STT용) =====
  if (!audioStreamUrl && !transcript) {
    const cobaltInstances = [
      'https://api.cobalt.tools',
      'https://cobalt-api.kwiatekmiki.com',
    ]
    for (const instance of cobaltInstances) {
      try {
        console.log(`[yt-shorts] Trying Cobalt: ${instance}`)
        const cobaltResp = await fetch(`${instance}/`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            downloadMode: 'audio',
            audioFormat: 'mp3'
          }),
          signal: AbortSignal.timeout(15000)
        })
        console.log(`[yt-shorts] Cobalt response: ${cobaltResp.status}`)
        if (!cobaltResp.ok) continue
        const cobaltData = await cobaltResp.json()
        if (cobaltData.url) {
          audioStreamUrl = cobaltData.url
          audioMimeType = 'audio/mpeg'
          console.log('[yt-shorts] Cobalt audio URL obtained!')
          break
        } else if (cobaltData.status === 'error') {
          console.log('[yt-shorts] Cobalt error:', cobaltData.error?.code || cobaltData.text)
        }
      } catch (e) {
        console.log(`[yt-shorts] Cobalt error:`, e.message)
      }
    }
  }

  console.log('[yt-shorts] Final — title:', title?.substring(0, 50), ', duration:', duration, 's, transcript:', transcript.length, 'chars, method:', captionMethod || 'none', ', audioUrl:', !!audioStreamUrl)

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
      additionalNotes = '',
      manualTranscript = ''
    } = JSON.parse(event.body || '{}')

    if (!youtubeUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'YouTube URL이 필요합니다.' }) }
    }

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '유효하지 않은 YouTube URL입니다.' }) }
    }

    console.log('[yt-shorts] ===== Analyzing video:', videoId, '=====')
    console.log('[yt-shorts] Manual transcript provided:', manualTranscript.length, 'chars')

    // 1. YouTube 데이터 추출
    const videoData = await fetchYouTubeData(videoId)

    // 2. 수동 입력 자막이 있으면 우선 사용
    if (manualTranscript.trim().length > 10) {
      console.log('[yt-shorts] Using manual transcript input')
      const parsed = parseManualTranscript(manualTranscript.trim())
      videoData.timestampedTranscript = parsed.segments
      videoData.transcript = parsed.segments.map(t => t.text).join(' ')
      videoData.captionMethod = parsed.hasTimestamp ? 'manual_timestamped' : 'manual_plain'
      videoData.captionLang = 'manual'
    }

    console.log('[yt-shorts] Title:', videoData.title)
    console.log('[yt-shorts] Transcript:', videoData.transcript.length, 'chars, method:', videoData.captionMethod || 'none')
    console.log('[yt-shorts] Audio URL:', !!videoData.audioStreamUrl)

    // 3. Gemini 설정
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // 4. 자막 없고 오디오 URL 있으면 → Gemini 음성 인식
    if (videoData.transcript.length <= 10 && videoData.audioStreamUrl) {
      try {
        console.log('[yt-shorts] Downloading audio for Gemini STT...')
        const audioResponse = await fetch(videoData.audioStreamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Range': 'bytes=0-5242880'
          },
          signal: AbortSignal.timeout(15000)
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

규칙:
- 모든 대사를 빠짐없이 받아적으세요
- 타임스탬프는 [분:초] 형식으로
- 배경음악, 효과음은 무시
- 말하는 내용만 정확히 적어주세요` },
                  { inlineData: { mimeType: audioMime, data: audioBase64 } }
                ]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
            })

            const transcription = transcribeResult?.response?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            console.log('[yt-shorts] Gemini STT:', transcription.substring(0, 300))

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
            } else if (transcription.length > 20) {
              videoData.transcript = transcription.replace(/```/g, '').trim()
              videoData.captionMethod = 'gemini_stt_plain'
              videoData.captionLang = 'ko'
            }
          }
        }
      } catch (e) {
        console.log('[yt-shorts] Gemini STT error:', e.message)
      }
    }

    // 타임라인 텍스트 생성
    const timeline = formatTimeline(videoData.timestampedTranscript)

    // 필수 대사 처리
    const filteredDialogues = requiredDialogues.filter(d => d.trim())
    const requiredDialoguesSection = filteredDialogues.length > 0
      ? `\n## 반드시 포함할 대사\n${filteredDialogues.map((d, i) => `${i + 1}. "${d}"`).join('\n')}\n위 대사들은 가이드의 적절한 장면에 자연스럽게 배치해주세요.`
      : ''

    const hasTranscript = videoData.transcript.length > 10

    const prompt = `# 미션: YouTube 영상을 분석하고 **거의 동일한 촬영 가이드** 작성

당신은 숏폼 영상 기획 전문가입니다. 아래 YouTube 영상을 분석한 뒤, **이 영상을 따라 찍을 수 있는 촬영 가이드**를 작성하세요.

## 핵심 규칙
- **원본 영상의 대본(스크립트)을 그대로 따라가세요.** 자막에 있는 대사를 기반으로 장면을 구성합니다.
- 장면 순서, 대사 흐름, 카메라 전환을 원본과 **${similarityPercent}% 유사하게** 재현합니다.
- 원본에서 말한 내용을 임의로 바꾸거나 새로 만들지 마세요.
- ${similarityPercent >= 80 ? '장면 구성, 대사, 톤 모두 원본과 거의 동일하게 작성합니다.' : similarityPercent >= 60 ? '핵심 구조와 대사 흐름은 유지하되 일부 조정 가능합니다.' : '전체적인 컨셉과 톤을 참고하되 내용은 유연하게 변경 가능합니다.'}

## 원본 영상 정보
- **제목**: ${videoData.title || '(제목 없음)'}
- **길이**: ${videoData.duration ? `${videoData.duration}초 (약 ${Math.round(videoData.duration / 60 * 10) / 10}분)` : '알 수 없음'}
- **설명**: ${videoData.description || '(없음)'}
${hasTranscript ? `
## 원본 영상 자막 (이것이 영상의 실제 대본입니다)
\`\`\`
${timeline || videoData.transcript}
\`\`\`

위 자막을 **영상의 대본**으로 간주하세요. 각 타임스탬프가 하나의 장면 전환 시점입니다.
자막의 흐름을 따라 장면을 나누고, 각 장면의 대사를 원본에서 가져오세요.
` : `
## 자막 없음
이 영상은 자막이 추출되지 않았습니다.
영상 제목과 설명을 바탕으로 이 유형의 숏폼 영상에서 사용되는 일반적인 구조와 대사를 추정하여 가이드를 작성하세요.
제목에서 영상의 주제, 제품, 스타일을 파악하고 해당 카테고리의 전형적인 숏폼 흐름을 따르세요.
`}
${requiredDialoguesSection}
${additionalNotes ? `\n## 추가 요청\n${additionalNotes}` : ''}

## 출력 형식 (JSON)
{
  "video_analysis": {
    "summary": "원본 영상의 내용과 흐름 요약 (3-4문장, 구체적으로)",
    "style": "영상 스타일 (GRWM, 리뷰, 언박싱, 튜토리얼, 먹방, 브이로그, 일상, 챌린지 등)",
    "tone": "톤앤매너 (친근, 전문적, 유머러스, 감성적, 에너지틱 등)",
    "structure": "영상 전체 구조 (예: 후킹 → 제품소개 → 사용장면 → 결과 → 추천멘트)",
    "estimated_duration": "${videoData.duration || '60'}초"
  },
  "guide": {
    "title": "촬영 가이드 제목",
    "concept": "이 영상의 핵심 컨셉과 촬영 방향 (2-3문장)",
    "scenes": [
      {
        "order": 1,
        "name": "장면 이름",
        "duration": "이 장면의 예상 시간 (예: 0:00~0:05, 5초)",
        "description": "이 장면에서 무엇을 하는지 구체적으로 설명",
        "camera": "카메라 앵글/움직임",
        "dialogue": "이 장면에서 말할 대사 (원본 자막 기반)"
      }
    ],
    "required_dialogues": ["필수 대사1", "필수 대사2"],
    "hashtags": ["해시태그1", "해시태그2", "해시태그3"],
    "filming_tips": ["촬영 팁 1", "촬영 팁 2", "촬영 팁 3"],
    "cautions": "주의사항"
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
