// 크리에이터 맞춤형 가이드 생성 함수
exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Preflight 요청 처리
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
    // API 키 체크
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'AI 서비스 설정 오류',
          message: 'GEMINI_API_KEY가 설정되지 않았습니다.'
        })
      }
    }

    const {
      creatorAnalysis,  // SNS 분석 결과
      productInfo,      // 제품 정보
      baseGuide         // 기본 가이드
    } = JSON.parse(event.body || '{}')

    if (!creatorAnalysis || !productInfo) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    console.log('[generate-personalized-guide] Starting guide generation for:', productInfo.product_name)

    // Gemini API를 사용한 맞춤형 가이드 생성
    const prompt = `당신은 전문 마케팅 콘텐츠 기획자입니다. 다음 크리에이터의 스타일에 맞는 **숏폼 콘텐츠 촬영 가이드**를 JSON 형식으로 작성해주세요.

**중요 가이드라인:**
1. **이모티콘 사용 금지**: 절대로 이모티콘을 사용하지 마세요
2. **B&A (Before & After) 중심 구성**: 제품 사용 전/후를 명확히 대비
3. **첫 장면 (1번)은 반드시 후킹력 강한 장면**: 시청자의 시선을 즉시 사로잡는 자극적이고 강렬한 오프닝
4. **정확히 10개의 촬영 장면**: 반드시 10개로 구성, 각 장면마다 구체적인 대사 포함
5. **기업 요청사항 반영**: 아래 제품 정보와 핵심 포인트를 충실히 반영
6. **유튜브 형식의 자연스러운 대사**: 일상적이고 진솔한 말투로 작성
   - 예시: "요즘 이거 쓰고 있는데요", "솔직히 이거 좋더라고요", "이거 쓰고 나서 이런 변화가 있었어요", "이 가격에 이 정도면 괜찮은 것 같아요"
   - 과도하게 자극적이거나 광고 같은 표현은 피하고, 진솔한 후기 느낌으로 작성
   - 일상 브이로그 스타일의 자연스러운 말투 사용
7. **성분 설명 최소화**: 제품 성분에 대한 설명은 1번만 언급하거나 아예 생략. 효과와 결과 중심으로 작성
8. **1인 리뷰 형태 (필수)**: 반드시 **혼자서** 촬영하는 개인 리뷰. 친구, 가족, 다른 사람 출연 절대 금지. "이거 써봤는데", "제가 써보니까" 등 1인칭 시점 유지. 광고가 아닌 개인적인 솔직 후기 느낌으로 작성
9. **친근한 대사**: 반말 또는 존댓말 혼용으로 친구에게 말하듯 편안한 톤. 딱딱하거나 격식 있는 표현 지양
10. **한국인 감성**: 한국 문화와 정서에 맞는 표현 사용. "대박", "진짜", "완전", "ㄹㅇ" 등 한국인이 자주 쓰는 자연스러운 감탄사와 표현 활용

---

## 제품 정보
- **브랜드**: ${productInfo.brand || ''}
- **제품명**: ${productInfo.product_name || ''}
- **제품 특징**: ${productInfo.product_features || ''}
- **핵심 포인트**: ${productInfo.product_key_points || ''}

## 크리에이터 분석
- **플랫폼**: ${creatorAnalysis.platform || 'instagram'}
- **팔로워**: ${(creatorAnalysis.followers || 0).toLocaleString()}명
- **평균 참여율**: ${creatorAnalysis.contentAnalysis?.engagementRate || 5}%
- **콘텐츠 톤**: ${creatorAnalysis.style?.tone || '친근하고 자연스러운'}
- **주요 토픽**: ${(creatorAnalysis.style?.topics || ['라이프스타일']).join(', ')}

${baseGuide ? `## 기본 가이드\n${baseGuide}\n\n위 기본 가이드를 바탕으로, 이 크리에이터의 스타일에 맞게 커스터마이징해주세요.` : ''}

---

# 출력 형식 (반드시 아래 JSON 형식을 따라주세요)

{
  "campaign_title": "${productInfo.brand || ''} ${productInfo.product_name || ''} 촬영 가이드",
  "target_platform": "${creatorAnalysis.platform || 'instagram'}",
  "video_duration": "${productInfo.video_duration || (creatorAnalysis.platform === 'youtube' ? '자유' : '30-60초')}",
  "shooting_scenes": [
    {
      "order": 1,
      "scene_type": "후킹 장면",
      "scene_description": "극적인 문제 상황 또는 놀라운 결과를 먼저 보여주는 강렬한 오프닝 (3초 이내)",
      "dialogue": "충격적인 멘트 또는 문제 상황을 강조하는 대사",
      "shooting_tip": "조명과 클로즈업을 활용하여 임팩트 강화"
    },
    ... (10개 장면 생성)
  ],
  "required_hashtags": {
    "real": ["${productInfo.brand || ''}", "솔직후기", "리얼리뷰"],
    "product": ["${productInfo.brand || ''}추천", "인생템", "꿀템발견", "이거진짜"],
    "common": ["뷰티", "데일리", "추천"]
  },
  "why_recommended": {
    "scene_reasoning": "촬영 가이드 구성 이유 설명",
    "reference_videos": [],
    "content_strategy": "콘텐츠 전략 설명"
  },
  "shooting_requirements": {
    "must_include": ["제품 클로즈업", "Before & After 비교", "사용 과정", "최종 결과"],
    "video_style": {
      "tempo": "빠르고 역동적인 편집",
      "tone": "친근하고 자연스러운 말투"
    }
  },
  "creator_tips": ["크리에이터를 위한 촬영 팁들"]
}

**중요 지침**:
- **JSON만 출력**: 인사말, 설명, 기타 텍스트 없이 순수 JSON만 출력하세요
- **한국어만 사용**: 모든 텍스트는 100% 한국어로 작성하세요
- **이모티콘 사용 금지**: 절대로 이모티콘을 사용하지 마세요
- **정확히 10개 장면**: shooting_scenes 배열에 정확히 10개의 장면을 포함하세요
- **자연스러운 대사**: 각 장면의 dialogue는 친근하고 자연스러운 한국어 말투로 작성하세요
- **핵심 포인트 반영**: 제품의 핵심 포인트를 자연스럽게 녹여내세요`

    console.log('[generate-personalized-guide] Calling Gemini API...')

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-personalized-guide] Gemini API error:', response.status, errorText)
      throw new Error(`Gemini API 오류: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[generate-personalized-guide] Gemini API response received')

    // Concatenate all parts from the response
    const parts = data.candidates?.[0]?.content?.parts || []
    let personalizedGuide = parts.map(part => part.text || '').join('')

    if (!personalizedGuide) {
      console.error('[generate-personalized-guide] Empty response from Gemini API:', JSON.stringify(data))
      throw new Error('AI 응답이 비어있습니다.')
    }

    console.log('[generate-personalized-guide] Raw AI response length:', personalizedGuide.length)

    // Remove markdown code blocks (```, ```json, etc.)
    personalizedGuide = personalizedGuide.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    // Handle duplicate JSON objects - extract only the first valid JSON
    try {
      let braceCount = 0
      let firstJsonEnd = -1

      for (let i = 0; i < personalizedGuide.length; i++) {
        if (personalizedGuide[i] === '{') {
          braceCount++
        } else if (personalizedGuide[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            firstJsonEnd = i + 1
            break
          }
        }
      }

      if (firstJsonEnd > 0 && firstJsonEnd < personalizedGuide.length) {
        const potentialDuplicate = personalizedGuide.substring(firstJsonEnd).trim()
        if (potentialDuplicate.length > 0) {
          console.log('[generate-personalized-guide] Detected potential duplicate JSON, extracting first valid JSON only')
          personalizedGuide = personalizedGuide.substring(0, firstJsonEnd)
        }
      }
    } catch (e) {
      console.warn('[generate-personalized-guide] Error while checking for duplicate JSON:', e)
    }

    // Try to parse as JSON to validate
    let guideJson
    try {
      guideJson = JSON.parse(personalizedGuide)
      console.log('[generate-personalized-guide] Successfully parsed guide JSON')

      // Validate YouTube URLs if present
      if (guideJson?.why_recommended?.reference_videos && Array.isArray(guideJson.why_recommended.reference_videos)) {
        const validVideos = guideJson.why_recommended.reference_videos.filter(video => {
          if (!video || !video.url) return false

          // Check if URL is a valid YouTube URL
          const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})$/
          const match = video.url.match(youtubeRegex)

          if (!match) {
            console.warn('[generate-personalized-guide] Invalid YouTube URL detected:', video.url)
            return false
          }

          return true
        })

        // Replace with validated videos only
        guideJson.why_recommended.reference_videos = validVideos
        console.log(`[generate-personalized-guide] Validated ${validVideos.length} YouTube URLs`)
      }
    } catch (e) {
      console.error('[generate-personalized-guide] Failed to parse guide as JSON:', e.message)
      // If parsing fails, return as text
      guideJson = null
    }

    console.log('[generate-personalized-guide] Guide generation completed successfully')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        guide: guideJson ? JSON.stringify(guideJson, null, 2) : personalizedGuide,
        guideJson: guideJson,
        creatorInfo: {
          platform: creatorAnalysis.platform,
          followers: creatorAnalysis.followers,
          tone: creatorAnalysis.style?.tone,
          topics: creatorAnalysis.style?.topics
        }
      })
    }

  } catch (error) {
    console.error('[generate-personalized-guide] Error:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'AI 가이드 생성 실패',
        message: error.message
      })
    }
  }
}
