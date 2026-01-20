// 크리에이터 맞춤형 가이드 생성 함수
const { GoogleGenerativeAI } = require('@google/generative-ai')

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

    // API 키 확인
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[generate-personalized-guide] GEMINI_API_KEY is not set')
      throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다')
    }
    console.log('[generate-personalized-guide] API key found, length:', apiKey.length)

    // Gemini 모델 초기화
    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // 맞춤형 가이드 생성 프롬프트
    const prompt = `당신은 전문 마케팅 콘텐츠 기획자입니다. 다음 크리에이터의 스타일에 맞는 **숏폼 콘텐츠 촬영 가이드**를 JSON 형식으로 작성해주세요.

**중요 가이드라인:**
1. **이모티콘 사용 금지**: 절대로 이모티콘을 사용하지 마세요
2. **B&A (Before & After) 중심 구성**: 제품 사용 전/후를 명확히 대비
3. **첫 장면 (1번)은 반드시 후킹력 강한 장면**: 시청자의 시선을 즉시 사로잡는 자극적이고 강렬한 오프닝
4. **정확히 10개의 촬영 장면**: 반드시 10개로 구성, 각 장면마다 구체적인 대사 포함
5. **기업 요청사항 반영**: 아래 제품 정보와 핵심 포인트를 충실히 반영
6. **유튜브 형식의 자연스러운 대사**: 일상적이고 진솔한 말투로 작성
   - 예시: "요즘 이거 쓰고 있는데요", "솔직히 이거 좋더라고요", "이거 쓰고 나서 이런 변화가 있었어요"
   - 과도하게 자극적이거나 광고 같은 표현은 피하고, 진솔한 후기 느낌으로 작성
7. **성분 설명 최소화**: 효과와 결과 중심으로 작성
8. **1인 리뷰 형태 (필수)**: 반드시 혼자서 촬영하는 개인 리뷰
9. **친근한 대사**: 반말 또는 존댓말 혼용으로 친구에게 말하듯 편안한 톤
10. **한국인 감성**: "대박", "진짜", "완전" 등 한국인이 자주 쓰는 표현 활용

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

${baseGuide ? `## 기본 가이드\n${baseGuide}\n\n위 기본 가이드를 바탕으로 커스터마이징해주세요.` : ''}

---

# 출력 형식 (JSON)

{
  "campaign_title": "${productInfo.brand || ''} ${productInfo.product_name || ''} 촬영 가이드",
  "target_platform": "${creatorAnalysis.platform || 'instagram'}",
  "video_duration": "${productInfo.video_duration || '30-60초'}",
  "shooting_scenes": [
    {
      "order": 1,
      "scene_type": "후킹 장면",
      "scene_description": "극적인 문제 상황 또는 놀라운 결과를 먼저 보여주는 강렬한 오프닝 (3초 이내)",
      "dialogue": "충격적인 멘트 또는 문제 상황을 강조하는 대사",
      "shooting_tip": "조명과 클로즈업을 활용하여 임팩트 강화"
    },
    {
      "order": 2,
      "scene_type": "Before",
      "scene_description": "제품 사용 전 문제 상황 1",
      "dialogue": "문제점을 공감 가게 표현하는 대사",
      "shooting_tip": "문제 상황을 명확히 보여주는 클로즈업"
    },
    {
      "order": 3,
      "scene_type": "Before",
      "scene_description": "제품 사용 전 문제 상황 2",
      "dialogue": "구체적인 불편함을 설명하는 대사",
      "shooting_tip": "일상적인 상황에서의 불편함 강조"
    },
    {
      "order": 4,
      "scene_type": "Before",
      "scene_description": "제품 사용 전 문제 상황 3",
      "dialogue": "일상적인 고민을 표현하는 대사",
      "shooting_tip": "시청자가 공감할 수 있는 상황 연출"
    },
    {
      "order": 5,
      "scene_type": "전환",
      "scene_description": "제품 발견 및 소개",
      "dialogue": "제품을 발견한 계기나 기대감을 표현",
      "shooting_tip": "제품 패키징을 매력적으로 보여주기"
    },
    {
      "order": 6,
      "scene_type": "제품 소개",
      "scene_description": "제품 클로즈업 및 특징 설명",
      "dialogue": "제품의 핵심 특징을 자연스럽게 소개",
      "shooting_tip": "제품 디테일과 텍스처 클로즈업"
    },
    {
      "order": 7,
      "scene_type": "사용",
      "scene_description": "제품 사용 장면",
      "dialogue": "사용감을 구체적으로 표현",
      "shooting_tip": "슬로우 모션으로 사용 과정 강조"
    },
    {
      "order": 8,
      "scene_type": "After",
      "scene_description": "제품 사용 후 즉각적인 변화",
      "dialogue": "놀라움을 표현하는 대사",
      "shooting_tip": "Before와 대비되는 밝은 표정"
    },
    {
      "order": 9,
      "scene_type": "After",
      "scene_description": "시간이 지난 후의 지속 효과",
      "dialogue": "만족감을 표현하는 대사",
      "shooting_tip": "일상 속에서 자연스러운 모습"
    },
    {
      "order": 10,
      "scene_type": "마무리",
      "scene_description": "Before & After 비교 또는 최종 결과",
      "dialogue": "극적인 변화를 강조하는 대사",
      "shooting_tip": "분할 화면으로 Before/After 비교"
    }
  ],
  "required_hashtags": {
    "real": ["${productInfo.brand || ''}", "솔직후기", "리얼리뷰"],
    "product": ["${productInfo.brand || ''}추천", "인생템", "꿀템발견"],
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
- **JSON만 출력**: 인사말, 설명, 기타 텍스트 없이 순수 JSON만 출력
- **한국어만 사용**: 모든 텍스트는 100% 한국어로 작성
- **이모티콘 사용 금지**
- **정확히 10개 장면**: shooting_scenes 배열에 정확히 10개의 장면 포함
- **자연스러운 대사**: 친근하고 자연스러운 한국어 말투`

    console.log('[generate-personalized-guide] Calling Gemini API...')

    let result
    try {
      result = await model.generateContent(prompt)
    } catch (geminiError) {
      console.error('[generate-personalized-guide] Gemini API error:', geminiError)
      throw new Error(`Gemini API 호출 실패: ${geminiError.message}`)
    }

    const response = result.response
    let personalizedGuide = response.text()

    if (!personalizedGuide) {
      console.error('[generate-personalized-guide] Empty response from Gemini API')
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
          console.log('[generate-personalized-guide] Extracting first valid JSON only')
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
          const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})$/
          return youtubeRegex.test(video.url)
        })
        guideJson.why_recommended.reference_videos = validVideos
      }
    } catch (e) {
      console.error('[generate-personalized-guide] Failed to parse guide as JSON:', e.message)
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
    console.error('[generate-personalized-guide] Error:', error)
    console.error('[generate-personalized-guide] Error stack:', error.stack)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'AI 가이드 생성 실패',
        message: error.message,
        details: error.toString()
      })
    }
  }
}
