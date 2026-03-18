// 크리에이터 맞춤형 가이드 생성 함수
const { GoogleGenerativeAI } = require('@google/generative-ai')

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
}

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
      baseGuide,        // 기본 가이드
      guideStyle,       // 가이드 스타일 (신규)
      additionalNotes   // 추가 요청사항 (신규)
    } = JSON.parse(event.body || '{}')

    if (!creatorAnalysis || !productInfo) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    // 스타일 정보 로깅
    if (guideStyle) {
      console.log('[generate-personalized-guide] Using guide style:', guideStyle.name || guideStyle.id)
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
    // 개인화 가이드: 속도 우선 → gemini-2.5-flash-lite (504 타임아웃 방지)
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    // 아이 제품 여부 판단
    const isChildProduct = (productInfo.category || '').toLowerCase().includes('아이') ||
                          (productInfo.category || '').toLowerCase().includes('baby') ||
                          (productInfo.category || '').toLowerCase().includes('kid') ||
                          (productInfo.category || '').toLowerCase().includes('유아') ||
                          (productInfo.product_name || '').toLowerCase().includes('아이') ||
                          (productInfo.product_name || '').toLowerCase().includes('baby')

    // 맞춤형 가이드 생성 프롬프트 - 크넥 콘텐츠 철학 반영
    const prompt = `당신은 **크넥(CNEC)**의 영상 촬영 기획 가이드를 작성하는 전문가입니다.

## 🎯 크넥 콘텐츠 철학 (반드시 준수)

**핵심 원칙: "공감형 콘텐츠"**
- ✅ 추구하는 것: 나의 스타일, 나의 생활 속에서 녹아든 진심어린 리뷰
- ✅ 시청자가 "이 사람의 실제 생활이구나"라고 느낄 수 있는 자연스러움
- ✅ B&A(Before & After)도 스토리텔링과 함께 자연스럽게 표현

**절대 규칙:**
1. 혼자 리뷰 원칙: 가족, 친구 등 타인 출연 금지 (본인만 촬영)
${isChildProduct ? '2. ⚠️ 아이 제품이므로: 아이가 반드시 함께 출연해야 함 (예외 적용)' : '2. 본인 외 타인 출연 없이 1인 리뷰로 진행'}
3. 연기 금지: 진짜가 아닌 상황을 연출하면 안 됨 (있는 그대로의 상황만)
4. 기획력 있는 스토리텔링: 영상의 흐름이 자연스럽게 이어지는 구조
5. ⚠️ 단점 노출 금지: 이 영상은 광고 목적이므로 제품의 단점이나 아쉬운 점을 언급하지 않음

---

## 제품 정보
- **브랜드**: ${productInfo.brand || ''}
- **제품명**: ${productInfo.product_name || ''}
- **제품 특징**: ${productInfo.product_features || ''}
- **핵심 포인트**: ${productInfo.product_key_points || ''}

## 크리에이터 프로필 상세

### 기본 정보
- **플랫폼**: ${creatorAnalysis.platform || 'instagram'}
- **채널명**: ${creatorAnalysis.channelName || ''}
- **팔로워**: ${(creatorAnalysis.followers || 0).toLocaleString()}명
${creatorAnalysis.gender ? `- **성별**: ${creatorAnalysis.gender}` : ''}
${creatorAnalysis.age ? `- **연령**: ${creatorAnalysis.age}세` : ''}
${creatorAnalysis.job ? `- **직업**: ${creatorAnalysis.job}` : ''}

### 뷰티 프로필 (★ 반드시 가이드에 반영!)
${creatorAnalysis.skinType ? `- **피부 타입**: ${creatorAnalysis.skinType}` : ''}
${Array.isArray(creatorAnalysis.skinConcerns) && creatorAnalysis.skinConcerns.length > 0 ? `- **피부 고민**: ${JSON.stringify(creatorAnalysis.skinConcerns)}` : ''}
${creatorAnalysis.personalColor ? `- **퍼스널 컬러**: ${creatorAnalysis.personalColor}` : ''}
${creatorAnalysis.skinShade ? `- **호수**: ${creatorAnalysis.skinShade}` : ''}
${creatorAnalysis.hairType ? `- **헤어 타입**: ${creatorAnalysis.hairType}` : ''}
${Array.isArray(creatorAnalysis.hairConcerns) && creatorAnalysis.hairConcerns.length > 0 ? `- **헤어 고민**: ${JSON.stringify(creatorAnalysis.hairConcerns)}` : ''}

### 영상 역량
${creatorAnalysis.editingLevel ? `- **편집 레벨**: ${creatorAnalysis.editingLevel}` : ''}
${creatorAnalysis.shootingLevel ? `- **촬영 레벨**: ${creatorAnalysis.shootingLevel}` : ''}
${creatorAnalysis.videoLengthStyle ? `- **선호 영상 길이**: ${creatorAnalysis.videoLengthStyle}` : ''}
${creatorAnalysis.shortformTempo ? `- **숏폼 템포**: ${creatorAnalysis.shortformTempo}` : ''}
${Array.isArray(creatorAnalysis.videoStyles) && creatorAnalysis.videoStyles.length > 0 ? `- **영상 스타일**: ${JSON.stringify(creatorAnalysis.videoStyles)}` : ''}

${creatorAnalysis.aiProfileText ? `### AI 종합 분석\n"${creatorAnalysis.aiProfileText}"` : ''}

⚠️ 위 프로필을 기반으로 가이드를 개인화하세요.

${baseGuide ? `## 기본 가이드 (기업 작성 - 반드시 반영할 것!)\n${baseGuide}\n\n⚠️ 위 기본 가이드는 기업이 직접 작성한 내용이므로 반드시 가이드에 반영해주세요.` : ''}

${guideStyle ? `---

## 🎨 선택된 콘텐츠 스타일: ${guideStyle.name}

${guideStyle.promptModifier}

**영상 구조 힌트:** ${guideStyle.structureHint || ''}
**핵심 톤 키워드:** ${(guideStyle.toneKeywords || []).join(', ')}

⚠️ 위 스타일 특성을 반드시 가이드 전체에 반영해주세요. 씬 구성, 대사, 톤 모두 이 스타일에 맞게 작성합니다.
` : ''}

${additionalNotes ? `---

## 📝 기업 추가 요청사항 (반드시 반영!)

${additionalNotes}

⚠️ 위 추가 요청사항은 기업이 직접 입력한 내용이므로 가이드에 반드시 반영해주세요.
` : ''}

---

## 📋 가이드 작성 방식

**크리에이터의 실제 생활/스타일 정보가 부족할 경우:**
- "자율 기획 공간"을 제공하되, 예시 시나리오를 함께 제시
- 예시 시나리오는 위아래 씬이 자연스럽게 이어지도록 구성
- 크리에이터가 자신의 진짜 상황에 맞게 변형할 수 있는 여지를 줌

다음 JSON 형식으로 작성해주세요:

{
  "campaign_title": "${productInfo.brand || ''} ${productInfo.product_name || ''} 촬영 가이드",
  "brand_info": {
    "brand": "${productInfo.brand || ''}",
    "product": "${productInfo.product_name || ''}",
    "product_url": "",
    "deadline": ""
  },
  "content_philosophy": {
    "core_message": "이 영상에서 전달하고 싶은 핵심 감정/공감 포인트",
    "authenticity_note": "진정성을 살리기 위한 핵심 조언",
    "avoid": ["피해야 할 뻔한 표현들", "식상한 구성들"]
  },
  "target_platform": "${creatorAnalysis.platform || 'instagram'}",
  "video_duration": "${productInfo.video_duration || '30-60초'}",
  "shooting_concept": "전체 영상 컨셉을 2-3문장으로 설명 (공감형 스토리텔링 관점에서)",
  "story_flow": {
    "narrative_type": "일상 속 발견형 / 고민 해결형 / 습관 형성형 / 감정 공유형 중 선택",
    "emotional_arc": "영상의 감정 흐름 설명 (예: 불편함 → 발견 → 만족 → 일상화)"
  },
  "shooting_scenes": [
    {
      "order": 1,
      "scene_type": "후킹 (공감 유도)",
      "scene_description": "시청자가 '나도 그래!'라고 느낄 수 있는 공감 오프닝",
      "dialogue": "진심이 느껴지는 첫 마디 (과장 없이)",
      "caption": "자막",
      "shooting_tip": "촬영 팁",
      "flexibility_note": "🎨 자율 공간: 본인의 실제 상황에 맞게 변형 가능",
      "example_scenario": "예시) 아침에 일어나서 거울 보며 한숨..."
    },
    {
      "order": 2,
      "scene_type": "나의 일상/스타일 보여주기",
      "scene_description": "제품이 필요한 나의 실제 생활 모습",
      "dialogue": "자연스러운 독백 또는 상황 설명",
      "caption": "자막",
      "shooting_tip": "촬영 팁",
      "flexibility_note": "🎨 자율 공간: 본인의 실제 루틴/공간에서 촬영",
      "example_scenario": "예시) 출근 준비하면서, 집에서 쉬면서 등"
    },
    {
      "order": 3,
      "scene_type": "진짜 고민/니즈 표현",
      "scene_description": "이 제품이 필요했던 진짜 이유 (연기 아닌 실제 경험)",
      "dialogue": "솔직한 고민 토로",
      "caption": "자막",
      "shooting_tip": "촬영 팁",
      "flexibility_note": "🎨 자율 공간: 본인이 실제로 느꼈던 불편함 공유",
      "example_scenario": ""
    },
    {
      "order": 4,
      "scene_type": "제품과의 만남",
      "scene_description": "제품을 처음 접했을 때의 자연스러운 반응",
      "dialogue": "호기심 또는 기대감 표현",
      "caption": "자막",
      "shooting_tip": "제품 언박싱 또는 첫 사용 장면",
      "flexibility_note": "",
      "example_scenario": ""
    },
    {
      "order": 5,
      "scene_type": "나만의 사용법",
      "scene_description": "나의 스타일/루틴에 맞춘 사용 방법",
      "dialogue": "개인화된 사용 팁 공유",
      "caption": "자막",
      "shooting_tip": "촬영 팁",
      "flexibility_note": "🎨 자율 공간: 본인만의 활용법 강조",
      "example_scenario": ""
    },
    {
      "order": 6,
      "scene_type": "사용감 공유",
      "scene_description": "제품 사용 중 느낀 장점과 만족감",
      "dialogue": "자연스러운 사용 후기",
      "caption": "자막",
      "shooting_tip": "사용 과정을 자연스럽게",
      "flexibility_note": "",
      "example_scenario": ""
    },
    {
      "order": 7,
      "scene_type": "변화/효과 (자연스럽게)",
      "scene_description": "강조된 B&A가 아닌, 일상 속에서 느끼는 변화",
      "dialogue": "자연스러운 감탄 또는 만족 표현",
      "caption": "자막",
      "shooting_tip": "과장된 리액션 금지, 담담하게",
      "flexibility_note": "",
      "example_scenario": ""
    },
    {
      "order": 8,
      "scene_type": "나의 생활에 자리잡기",
      "scene_description": "이 제품이 내 일상의 일부가 된 모습",
      "dialogue": "습관이 된 느낌 전달",
      "caption": "자막",
      "shooting_tip": "일상적인 공간에서 촬영",
      "flexibility_note": "🎨 자율 공간: 본인의 실제 생활 공간 활용",
      "example_scenario": "예시) 화장대에 놓인 모습, 가방에 챙기는 모습 등"
    },
    {
      "order": 9,
      "scene_type": "진심어린 추천 이유",
      "scene_description": "단순 '좋아요'가 아닌 구체적 추천 이유",
      "dialogue": "이 제품이 나에게 특별한 이유",
      "caption": "자막",
      "shooting_tip": "진정성 있는 표정",
      "flexibility_note": "",
      "example_scenario": ""
    },
    {
      "order": 10,
      "scene_type": "자연스러운 마무리",
      "scene_description": "광고 같지 않은, 일상으로 돌아가는 엔딩",
      "dialogue": "부담 없는 마무리 멘트",
      "caption": "자막",
      "shooting_tip": "강요하지 않는 자연스러운 CTA",
      "flexibility_note": "",
      "example_scenario": ""
    }
  ],
  "authenticity_guidelines": {
    "do": [
      "본인의 실제 생활 공간에서 촬영",
      "평소 말투와 표현 그대로 사용",
      "진짜 느낀 장점 자연스럽게 공유",
      "제품의 매력 포인트 강조",
      "나만의 스타일로 재해석"
    ],
    "dont": [
      "가족/친구 출연시키기 (본인만!)",
      "없는 상황 연기하기",
      "과장된 리액션",
      "대본 읽는 듯한 부자연스러운 말투",
      "타사 제품과 비교하는 행위"
    ]${isChildProduct ? ',\n    "exception": "⚠️ 아이 제품이므로 아이와 함께 촬영 필수"' : ''}
  },
  "required_hashtags": {
    "brand": ["#${productInfo.brand || ''}", "#${productInfo.product_name || ''}"],
    "real": ["#솔직후기", "#리얼리뷰", "#내돈내산느낌", "#광고"],
    "trend": ["관련 트렌디한 해시태그 3-5개"]
  },
  "shooting_requirements": {
    "must_include": [
      "나의 실제 생활 공간/상황",
      "제품의 자연스러운 사용 모습",
      "솔직한 사용 후기",
      "기업 요청 필수 촬영 요소"
    ],
    "video_style": {
      "tempo": "자연스러운 흐름 (급하지 않게)",
      "tone": "친구에게 말하듯 편안하게",
      "editing": "과하지 않은 깔끔한 편집"
    }
  },
  "why_recommended": {
    "scene_reasoning": "이 크리에이터의 스타일에 맞춘 촬영 가이드 구성 이유",
    "reference_videos": [],
    "content_strategy": "콘텐츠 전략 설명"
  },
  "creator_tips": [
    "💡 이 가이드는 참고용입니다. 본인의 스타일에 맞게 자유롭게 변형하세요.",
    "💡 '자율 공간' 표시된 부분은 본인의 실제 상황으로 대체해주세요.",
    "💡 예시 시나리오는 참고만 하고, 진짜 본인 이야기로 채워주세요.",
    "💡 연기하지 마세요. 진짜가 아니면 시청자가 압니다.",
    "💡 촬영 전 제품을 충분히 사용해보고 진심으로 느낀 점을 공유하세요."
  ]
}

**⚠️ 주의사항:**
- 반드시 유효한 JSON 형식으로 작성
- 뻔한 B&A 구성 절대 금지 - 스토리텔링으로 풀어낼 것
- "자율 공간"과 "예시 시나리오"를 적절히 활용하여 크리에이터에게 자유도 제공
- 위아래 씬이 자연스럽게 이어지는 흐름 유지
- 제품의 실제 특징과 장점을 정확하게 반영하되 과장 금지
- JSON만 출력 (인사말, 설명 없이)`

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

    // Ensure both scenes and shooting_scenes keys exist
    if (guideJson) {
      if (guideJson.shooting_scenes && !guideJson.scenes) guideJson.scenes = guideJson.shooting_scenes
      if (guideJson.scenes && !guideJson.shooting_scenes) guideJson.shooting_scenes = guideJson.scenes
    }

    console.log('[generate-personalized-guide] Guide generation completed successfully')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        guide: guideJson || personalizedGuide,
        guideJson: guideJson,
        creatorInfo: {
          platform: creatorAnalysis.platform,
          followers: creatorAnalysis.followers,
          tone: creatorAnalysis.style?.tone,
          topics: creatorAnalysis.style?.topics
        },
        guideStyleUsed: guideStyle ? {
          id: guideStyle.id,
          name: guideStyle.name
        } : null,
        additionalNotesUsed: additionalNotes || null
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
