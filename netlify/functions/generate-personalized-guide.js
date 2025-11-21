// 크리에이터 맞춤형 가이드 생성 함수
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { 
      creatorAnalysis,  // SNS 분석 결과
      productInfo,      // 제품 정보
      baseGuide         // 기본 가이드
    } = JSON.parse(event.body)
    
    if (!creatorAnalysis || !productInfo) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    // Gemini API를 사용한 맞춤형 가이드 생성
    const prompt = `당신은 전문 마케팅 콘텐츠 기획자입니다. 다음 크리에이터의 스타일에 맞는 **숏폼 콘텐츠 촬영 가이드**를 JSON 형식으로 작성해주세요.

**중요 가이드라인:**
1. **이모티콘 사용 금지**: 절대로 이모티콘을 사용하지 마세요
2. **B&A (Before & After) 중심 구성**: 제품 사용 전/후를 명확히 대비
3. **첫 장면 (1번)은 반드시 후킹력 강한 장면**: 시청자의 시선을 즉시 사로잡는 자극적이고 강렬한 오프닝
4. **10개 이상의 촬영 장면**: 각 장면마다 구체적인 대사 포함
5. **기업 요청사항 반영**: 아래 제품 정보와 핵심 포인트를 충실히 반영
6. **한국인 맞춤 대사 작성**: 이슈가 될 만한 자극적이고 과감한 표현 사용 (법적 문제 없는 범위)
   - 예시: "이거 진짜 미쳤어요", "3일 만에 완전 달라짐", "이거 쓰기 전 vs 후 차이 실화냐", "솔직히 이 가격에 이 효과면 사재기 각"
   - 극적인 변화를 강조하는 한국식 표현 적극 활용
7. **성분 설명 최소화**: 제품 성분에 대한 설명은 1번만 언급하거나 아예 생략. 효과와 결과 중심으로 작성

---

## 제품 정보
- **브랜드**: ${productInfo.brand}
- **제품명**: ${productInfo.product_name}
- **제품 특징**: ${productInfo.product_features}
- **핵심 포인트**: ${productInfo.product_key_points}

## 크리에이터 분석
- **플랫폼**: ${creatorAnalysis.platform}
- **팔로워**: ${creatorAnalysis.followers?.toLocaleString()}명
- **평균 참여율**: ${creatorAnalysis.contentAnalysis?.engagementRate}%
- **콘텐츠 톤**: ${creatorAnalysis.style?.tone}
- **주요 토픽**: ${creatorAnalysis.style?.topics?.join(', ')}

${baseGuide ? `## 기본 가이드\n${baseGuide}\n\n위 기본 가이드를 바탕으로, 이 크리에이터의 스타일에 맞게 커스터마이징해주세요.` : ''}

---

# 출력 형식 (반드시 아래 JSON 형식을 따라주세요)

\`\`\`json
{
  "campaign_title": "${productInfo.brand} ${productInfo.product_name} 촬영 가이드",
  "target_platform": "${creatorAnalysis.platform}",
  "video_duration": "${creatorAnalysis.platform === 'youtube' ? '5-10분' : '30-60초'}",
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
      "scene_description": "제품 사용 장면 (텍스처, 발림성 등)",
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
      "scene_type": "After",
      "scene_description": "Before & After 비교 또는 최종 결과",
      "dialogue": "극적인 변화를 강조하는 대사",
      "shooting_tip": "분할 화면으로 Before/After 비교"
    },
    {
      "order": 11,
      "scene_type": "추가 효과",
      "scene_description": "일상 속 사용 모습 또는 추가 효과",
      "dialogue": "자연스러운 사용 장면 대사",
      "shooting_tip": "다양한 상황에서의 활용 모습"
    },
    {
      "order": 12,
      "scene_type": "마무리",
      "scene_description": "제품 추천 및 구매 유도",
      "dialogue": "진심 어린 추천 멘트",
      "shooting_tip": "제품을 들고 환하게 웃는 모습"
    }
  ],
  "required_hashtags": {
    "real": ["${productInfo.brand}", "${productInfo.product_name.replace(/\s+/g, '')}", "솔직후기", "리얼리뷰"],
    "product": ["${productInfo.brand}추천", "인생템", "꿀템발견", "이거진짜"],
    "common": ${JSON.stringify(creatorAnalysis.contentAnalysis?.topHashtags?.slice(0, 3) || ['뷰티', '데일리', '추천'])}
  },
  "shooting_requirements": {
    "must_include": [
      "제품 클로즈업 (텍스처, 패키징)",
      "Before & After 비교 (분할 화면 권장)",
      "사용 과정 (바르는 모습, 흡수되는 모습 등)",
      "최종 결과 (만족스러운 표정과 함께)"
    ],
    "video_style": {
      "tempo": "빠르고 역동적 (숏폼의 경우 3초마다 장면 전환)",
      "tone": "${creatorAnalysis.style?.tone}"
    }
  },
  "creator_tips": [
    "평소 사용하는 ${creatorAnalysis.contentAnalysis?.topHashtags?.[0] || '해시태그'} 스타일을 유지하세요",
    ${creatorAnalysis.platform === 'tiktok' ? '"TikTok 트렌드 음악과 효과를 활용하세요"' : ''},
    ${creatorAnalysis.platform === 'instagram' ? '"인스타그램 릴스 최적화: 첫 3초가 가장 중요합니다"' : ''},
    ${creatorAnalysis.platform === 'youtube' ? '"썸네일과 타이틀에 핵심 키워드를 포함하세요"' : ''},
    "제품 정보는 100% 정확하게 전달하되, 대사는 자유롭게 변형 가능합니다"
  ]
}
\`\`\`

**중요**: 
- 위 JSON 형식을 정확히 따라주세요
- 이모티콘을 절대 사용하지 마세요
- shooting_scenes 배열에 최소 10개 이상의 장면을 포함하세요
- 각 장면의 dialogue는 크리에이터의 평소 말투(${creatorAnalysis.style?.tone})를 반영하세요
- 제품의 핵심 포인트(${productInfo.product_key_points})를 자연스럽게 녹여내세요`

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + process.env.GEMINI_API_KEY,
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
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error('Failed to generate guide with Gemini API')
    }

    const data = await response.json()
    let personalizedGuide = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!personalizedGuide) {
      throw new Error('No guide generated')
    }

    // Extract JSON from markdown code block if present
    const jsonMatch = personalizedGuide.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      personalizedGuide = jsonMatch[1]
    }

    // Try to parse as JSON to validate
    let guideJson
    try {
      guideJson = JSON.parse(personalizedGuide)
    } catch (e) {
      console.error('Failed to parse guide as JSON:', e)
      // If parsing fails, return as text
      guideJson = null
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
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
    console.error('Guide generation error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate personalized guide',
        message: error.message 
      })
    }
  }
}
