/**
 * YouTube Shorts 영상 분석 → 촬영 가이드 생성
 * Gemini AI를 사용하여 YouTube 영상의 자막/메타데이터를 분석하고
 * 유사한 형태의 촬영 가이드를 생성합니다.
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

// YouTube 영상 메타데이터 + 자막 추출
async function fetchYouTubeData(videoId) {
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
    }
  })
  const html = await response.text()

  // 제목 추출
  const titleMatch = html.match(/<title>(.+?)<\/title>/)
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : ''

  // 설명 추출
  const descMatch = html.match(/"shortDescription":"(.*?)"/)
  const description = descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').substring(0, 1000) : ''

  // 영상 길이 추출
  const durationMatch = html.match(/"lengthSeconds":"(\d+)"/)
  const duration = durationMatch ? parseInt(durationMatch[1]) : 0

  // 자막 트랙 URL 추출
  let transcript = ''
  try {
    const captionMatch = html.match(/"captionTracks":\[(.*?)\]/)
    if (captionMatch) {
      const captionData = JSON.parse(`[${captionMatch[1]}]`)
      // 한국어 > 영어 > 자동생성 순으로 우선
      const track = captionData.find(t => t.languageCode === 'ko') ||
                    captionData.find(t => t.languageCode === 'en') ||
                    captionData.find(t => t.vssId?.includes('a.')) || // 자동생성
                    captionData[0]

      if (track?.baseUrl) {
        const captionUrl = track.baseUrl.replace(/\\u0026/g, '&')
        const captionResponse = await fetch(captionUrl)
        const captionXml = await captionResponse.text()
        // XML에서 텍스트만 추출
        const textMatches = captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)
        const texts = []
        for (const m of textMatches) {
          const decoded = m[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]+>/g, '')
            .trim()
          if (decoded) texts.push(decoded)
        }
        transcript = texts.join(' ')
      }
    }
  } catch (e) {
    console.log('[analyze-youtube-shorts] Caption extraction failed:', e.message)
  }

  return { title, description, duration, transcript, videoId }
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
    console.log('[analyze-youtube-shorts] Video title:', videoData.title)
    console.log('[analyze-youtube-shorts] Transcript length:', videoData.transcript.length)
    console.log('[analyze-youtube-shorts] Duration:', videoData.duration, 'seconds')

    // 2. Gemini로 분석 + 가이드 생성
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
    }

    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    // 유사도 설명
    const similarityDesc = similarityPercent >= 90
      ? '원본 영상과 거의 동일한 구조와 스타일로 제작합니다. 장면 순서, 대사 톤, 편집 스타일 모두 최대한 일치시킵니다.'
      : similarityPercent >= 70
        ? '원본 영상의 핵심 구조와 흐름을 유지하되, 제품에 맞게 일부 내용을 조정합니다.'
        : similarityPercent >= 50
          ? '원본 영상에서 영감을 받되, 전체적인 컨셉과 톤만 참고하고 내용은 자유롭게 구성합니다.'
          : '원본 영상의 분위기만 참고하고, 대부분의 내용을 새롭게 기획합니다.'

    // 필수 대사 텍스트
    const requiredDialoguesText = requiredDialogues.filter(d => d.trim()).length > 0
      ? `\n\n## 🔴 필수 포함 대사 (반드시 가이드에 포함)\n${requiredDialogues.filter(d => d.trim()).map((d, i) => `${i + 1}. "${d}"`).join('\n')}`
      : ''

    const prompt = `당신은 크리에이터 마케팅 전문가입니다. 아래 YouTube 숏폼 영상의 정보를 분석하고, 이 영상과 **유사도 ${similarityPercent}%** 수준의 촬영 가이드를 작성해주세요.

## 📹 원본 영상 정보
- **제목**: ${videoData.title || '(제목 없음)'}
- **영상 길이**: ${videoData.duration ? `${videoData.duration}초` : '알 수 없음'}
- **설명**: ${videoData.description || '(설명 없음)'}
- **자막/스크립트**: ${videoData.transcript || '(자막 없음 - 영상 제목과 설명을 기반으로 분석해주세요)'}

## 🎯 유사도 설정: ${similarityPercent}%
${similarityDesc}
${requiredDialoguesText}
${additionalNotes ? `\n## 📝 추가 요청사항\n${additionalNotes}` : ''}

## 📋 출력 형식 (JSON)
아래 형식으로 정확히 응답해주세요:
{
  "video_analysis": {
    "summary": "원본 영상 분석 요약 (어떤 내용인지, 어떤 스타일인지 2-3문장)",
    "style": "영상 스타일 (예: GRWM, 리뷰, 브이로그, 언박싱, 튜토리얼 등)",
    "tone": "영상 톤앤매너 (예: 친근한, 전문적인, 유머러스한 등)",
    "structure": "영상 구조 설명 (인트로 → 본문 → 아웃트로 등)",
    "estimated_duration": "추정 영상 길이 (초)"
  },
  "guide": {
    "title": "촬영 가이드 제목",
    "concept": "영상 컨셉 설명 (2-3문장)",
    "scenes": [
      {
        "order": 1,
        "name": "장면 이름",
        "duration": "예상 시간 (예: 3-5초)",
        "description": "장면 상세 설명",
        "camera": "카메라 앵글/움직임 (예: 클로즈업, 와이드샷)",
        "dialogue": "해당 장면의 대사/나레이션"
      }
    ],
    "required_dialogues": ["필수 대사 1", "필수 대사 2", "필수 대사 3"],
    "hashtags": ["추천 해시태그 5-8개"],
    "filming_tips": ["촬영 팁 3-5개"],
    "cautions": "주의사항 (FHD 이상, 필터 자제, 마감일 엄수 등)"
  }
}

JSON 형식으로만 응답해주세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.`

    console.log('[analyze-youtube-shorts] Sending to Gemini...')

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.candidates[0].content.parts[0].text
    console.log('[analyze-youtube-shorts] Gemini response length:', responseText.length)

    let guideData
    try {
      guideData = JSON.parse(responseText)
    } catch (parseError) {
      // JSON 파싱 실패 시 코드블록 제거 후 재시도
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      guideData = JSON.parse(cleaned)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoData: {
          videoId: videoData.videoId,
          title: videoData.title,
          duration: videoData.duration,
          hasTranscript: !!videoData.transcript
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
