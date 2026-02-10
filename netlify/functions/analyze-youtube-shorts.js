/**
 * YouTube Shorts 영상 분석 → 촬영 가이드 생성
 * Gemini AI로 YouTube 영상의 타임스탬프 자막을 분석하여
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

// YouTube 영상 메타데이터 + 타임스탬프 자막 추출
async function fetchYouTubeData(videoId) {
  // YouTube HTML 페이지 가져오기
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml'
    }
  })
  const html = await response.text()
  console.log('[analyze-youtube-shorts] HTML length:', html.length)

  // 제목 추출 — "title" 키 중 "text" 값이나 단순 값 추출
  let title = ''
  const titleMatch = html.match(/"videoPrimaryInfoRenderer".*?"title":\{"runs":\[\{"text":"(.*?)"\}/) ||
                     html.match(/"title":"(.*?)"/) ||
                     html.match(/<title>(.+?)<\/title>/)
  if (titleMatch) {
    title = titleMatch[1].replace(' - YouTube', '').trim()
    try { title = JSON.parse(`"${title}"`) } catch (e) {}
  }

  // 설명 추출
  let description = ''
  const descMatch = html.match(/"shortDescription":"(.*?)"/)
  if (descMatch) {
    try {
      description = JSON.parse(`"${descMatch[1]}"`).substring(0, 1500)
    } catch (e) {
      description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').substring(0, 1500)
    }
  }

  // 영상 길이 추출
  const durationMatch = html.match(/"lengthSeconds":"(\d+)"/)
  const duration = durationMatch ? parseInt(durationMatch[1]) : 0

  let transcript = ''
  let timestampedTranscript = []
  let captionLang = ''
  let captionMethod = ''

  // ===== 방법 1: HTML에서 captionTracks 추출 =====
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
          console.log('[analyze-youtube-shorts] captionTracks raw length:', rawJson.length)
          try {
            captionData = JSON.parse(rawJson)
          } catch (e1) {
            try {
              captionData = JSON.parse(rawJson.replace(/\\\\u0026/g, '\\u0026'))
            } catch (e2) {
              const urlMatches = [...rawJson.matchAll(/"baseUrl"\s*:\s*"(.*?)"/g)]
              const langMatches = [...rawJson.matchAll(/"languageCode"\s*:\s*"(.*?)"/g)]
              const kindMatches = [...rawJson.matchAll(/"kind"\s*:\s*"(.*?)"/g)]
              if (urlMatches.length > 0) {
                captionData = urlMatches.map((m, i) => ({
                  baseUrl: m[1],
                  languageCode: langMatches[i]?.[1] || 'unknown',
                  kind: kindMatches[i]?.[1] || ''
                }))
              }
            }
          }
        }
      }
    }

    if (captionData && captionData.length > 0) {
      console.log('[analyze-youtube-shorts] Found', captionData.length, 'caption tracks:', captionData.map(t => `${t.languageCode}(${t.kind || 'manual'})`).join(', '))

      const track = captionData.find(t => t.languageCode === 'ko' && !t.kind) ||
                    captionData.find(t => t.languageCode === 'ko') ||
                    captionData.find(t => t.languageCode === 'en' && !t.kind) ||
                    captionData.find(t => t.languageCode === 'en') ||
                    captionData.find(t => !t.kind) ||
                    captionData[0]

      if (track?.baseUrl) {
        captionLang = track.languageCode || ''
        let captionUrl = track.baseUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&')
        console.log('[analyze-youtube-shorts] Using caption track:', track.languageCode, track.kind || 'manual')

        const captionResponse = await fetch(captionUrl)
        const captionXml = await captionResponse.text()
        timestampedTranscript = parseCaptionXml(captionXml)
        transcript = timestampedTranscript.map(t => t.text).join(' ')
        if (timestampedTranscript.length > 0) captionMethod = 'captionTracks'
        console.log('[analyze-youtube-shorts] Method 1 (captionTracks): extracted', timestampedTranscript.length, 'segments')
      }
    } else {
      console.log('[analyze-youtube-shorts] No captionTracks found in HTML')
    }
  } catch (e) {
    console.log('[analyze-youtube-shorts] Method 1 (captionTracks) error:', e.message)
  }

  // ===== 방법 2: innertube player API로 자막 URL 가져오기 =====
  if (!transcript) {
    try {
      console.log('[analyze-youtube-shorts] Trying method 2: innertube player API...')
      const playerResponse = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20241201.00.00',
              hl: 'ko',
              gl: 'KR'
            }
          },
          videoId: videoId
        })
      })
      if (playerResponse.ok) {
        const playerData = await playerResponse.json()
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        if (captions?.length) {
          console.log('[analyze-youtube-shorts] Player API found', captions.length, 'caption tracks')

          const track = captions.find(t => t.languageCode === 'ko' && t.kind !== 'asr') ||
                        captions.find(t => t.languageCode === 'ko') ||
                        captions.find(t => t.languageCode === 'en' && t.kind !== 'asr') ||
                        captions.find(t => t.languageCode === 'en') ||
                        captions.find(t => t.kind !== 'asr') ||
                        captions[0]

          if (track?.baseUrl) {
            captionLang = track.languageCode || ''
            const captionUrl = track.baseUrl.replace(/&amp;/g, '&')
            const captionResponse = await fetch(captionUrl)
            const captionXml = await captionResponse.text()
            timestampedTranscript = parseCaptionXml(captionXml)
            transcript = timestampedTranscript.map(t => t.text).join(' ')
            if (timestampedTranscript.length > 0) captionMethod = 'innertube_player'
            console.log('[analyze-youtube-shorts] Method 2 (player API):', timestampedTranscript.length, 'segments')
          }
        }

        // player API에서 제목/설명/길이도 보강
        if (!title && playerData?.videoDetails?.title) {
          title = playerData.videoDetails.title
        }
        if (!description && playerData?.videoDetails?.shortDescription) {
          description = playerData.videoDetails.shortDescription.substring(0, 1500)
        }
      }
    } catch (e) {
      console.log('[analyze-youtube-shorts] Method 2 (player API) error:', e.message)
    }
  }

  // ===== 방법 3: innertube get_transcript API =====
  if (!transcript) {
    try {
      console.log('[analyze-youtube-shorts] Trying method 3: innertube get_transcript...')
      // protobuf 인코딩: field 1 (string) = videoId
      const protoBytes = [0x0a, videoId.length, ...Array.from(videoId).map(c => c.charCodeAt(0))]
      const params = Buffer.from(protoBytes).toString('base64')

      const innertubeResponse = await fetch('https://www.youtube.com/youtubei/v1/get_transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20241201.00.00',
              hl: 'ko',
              gl: 'KR'
            }
          },
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
          if (timestampedTranscript.length > 0) captionMethod = 'innertube_transcript'
          console.log('[analyze-youtube-shorts] Method 3 (get_transcript):', timestampedTranscript.length, 'segments')
        }
      }
    } catch (e) {
      console.log('[analyze-youtube-shorts] Method 3 (get_transcript) error:', e.message)
    }
  }

  console.log('[analyze-youtube-shorts] Final result — title:', title, ', transcript:', transcript.length, 'chars, method:', captionMethod || 'none')

  return { title, description, duration, transcript, timestampedTranscript, videoId, captionLang, captionMethod }
}

// 타임스탬프 자막을 타임라인 텍스트로 변환
function formatTimeline(timestampedTranscript, duration) {
  if (!timestampedTranscript?.length) return ''

  const lines = timestampedTranscript.map(t => {
    const min = Math.floor(t.start / 60)
    const sec = Math.floor(t.start % 60)
    const ts = `${min}:${String(sec).padStart(2, '0')}`
    return `[${ts}] ${t.text}`
  })

  return lines.join('\n')
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

    console.log('[analyze-youtube-shorts] Analyzing video:', videoId)

    // 1. YouTube 데이터 추출
    const videoData = await fetchYouTubeData(videoId)
    console.log('[analyze-youtube-shorts] Title:', videoData.title)
    console.log('[analyze-youtube-shorts] Transcript length:', videoData.transcript.length, 'chars')
    console.log('[analyze-youtube-shorts] Timestamped segments:', videoData.timestampedTranscript.length)
    console.log('[analyze-youtube-shorts] Duration:', videoData.duration, 'sec')

    // 2. Gemini로 분석 + 가이드 생성
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

    const genai = new GoogleGenerativeAI(apiKey)
    // 영상 분석은 품질이 중요 → gemini-2.5-flash 사용
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // 타임라인 텍스트 생성
    const timeline = formatTimeline(videoData.timestampedTranscript, videoData.duration)

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
## 📝 원본 영상 타임스탬프 자막 (이것이 영상의 실제 대본입니다)
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

    console.log('[analyze-youtube-shorts] Sending to Gemini (model: gemini-2.5-flash)...')

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
    console.log('[analyze-youtube-shorts] Response length:', responseText.length, 'finishReason:', finishReason)

    if (!responseText) {
      throw new Error('Gemini가 빈 응답을 반환했습니다. 다시 시도해주세요.')
    }

    let guideData
    try {
      guideData = JSON.parse(responseText)
    } catch (parseError) {
      // 코드블록 제거 후 재시도
      let cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      try {
        guideData = JSON.parse(cleaned)
      } catch (parseError2) {
        // 잘린 JSON 복구 시도 — 닫히지 않은 브래킷/브레이스 추가
        console.log('[analyze-youtube-shorts] JSON parse failed, attempting repair. Last 100 chars:', cleaned.slice(-100))
        let openBraces = 0, openBrackets = 0
        let inStr = false
        for (let i = 0; i < cleaned.length; i++) {
          const c = cleaned[i]
          if (inStr) { if (c === '\\') { i++; continue }; if (c === '"') inStr = false; continue }
          if (c === '"') { inStr = true; continue }
          if (c === '{') openBraces++
          else if (c === '}') openBraces--
          else if (c === '[') openBrackets++
          else if (c === ']') openBrackets--
        }
        // 잘린 문자열 닫기
        if (inStr) cleaned += '"'
        // 열려있는 배열/객체 닫기
        for (let i = 0; i < openBrackets; i++) cleaned += ']'
        for (let i = 0; i < openBraces; i++) cleaned += '}'
        try {
          guideData = JSON.parse(cleaned)
          console.log('[analyze-youtube-shorts] JSON repair succeeded')
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
    console.error('[analyze-youtube-shorts] Error:', error)
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
