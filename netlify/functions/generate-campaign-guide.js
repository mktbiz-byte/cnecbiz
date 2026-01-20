const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
};

/**
 * Generate AI campaign guide based on campaign data
 */
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { campaignData } = JSON.parse(event.body);

    if (!campaignData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Campaign data is required' })
      };
    }

    console.log('[generate-campaign-guide] Generating AI guide for campaign:', campaignData.title);

    // Prepare campaign context
    const campaignContext = `
캠페인 정보:
- 브랜드: ${campaignData.brand || ''}
- 제품명: ${campaignData.product_name || ''}
- 제품 URL: ${campaignData.product_url || ''}
- 캠페인 타입: ${campaignData.campaign_type || 'package'}
- 카테고리: ${Array.isArray(campaignData.category) ? campaignData.category.join(', ') : campaignData.category || ''}
- 보상: ${campaignData.reward_points || 0}원
- 모집 인원: ${campaignData.total_slots || 0}명
- 촬영 마감일: ${campaignData.start_date || ''}
- SNS 업로드 마감일: ${campaignData.end_date || ''}
- 제품 설명: ${campaignData.product_description || ''}
- 추가 세부사항: ${campaignData.additional_details || ''}
- 필수 포함 사항: ${campaignData.must_include || ''}
- 제외 사항: ${campaignData.exclusions || ''}
- 오프라인 방문 필요: ${campaignData.offline_visit_requirement || '없음'}
- 참여 조건: ${campaignData.participation_requirements || '없음'}
- 가이드 요청사항: ${campaignData.additional_shooting_requests || ''}
`;

    // Generate AI guide using Gemini
    // 캠페인 가이드: 복잡한 콘텐츠 생성 → gemini-2.5-flash (품질 중요)
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 아이 제품 여부 판단
    const isChildProduct = (campaignData.category || '').toLowerCase().includes('아이') ||
                          (campaignData.category || '').toLowerCase().includes('baby') ||
                          (campaignData.category || '').toLowerCase().includes('kid') ||
                          (campaignData.category || '').toLowerCase().includes('유아') ||
                          (campaignData.product_name || '').toLowerCase().includes('아이') ||
                          (campaignData.product_name || '').toLowerCase().includes('baby');

    const prompt = `
당신은 **크넥(CNEC)**의 영상 촬영 기획 가이드를 작성하는 전문가입니다.

## 🎯 크넥 콘텐츠 철학 (반드시 준수)

**핵심 원칙: "공감형 콘텐츠"**
- ❌ 절대 금지: 단순 B&A(Before & After) 사용 영상, 누구나 찍는 뻔한 영상
- ✅ 추구하는 것: 나의 스타일, 나의 생활 속에서 녹아든 진심어린 리뷰
- ✅ 시청자가 "이 사람의 실제 생활이구나"라고 느낄 수 있는 자연스러움

**절대 규칙:**
1. 혼자 리뷰 원칙: 가족, 친구 등 타인 출연 금지 (본인만 촬영)
${isChildProduct ? '2. ⚠️ 아이 제품이므로: 아이가 반드시 함께 출연해야 함 (예외 적용)' : '2. 본인 외 타인 출연 없이 1인 리뷰로 진행'}
3. 연기 금지: 진짜가 아닌 상황을 연출하면 안 됨 (있는 그대로의 상황만)
4. 기획력 있는 스토리텔링: 영상의 흐름이 자연스럽게 이어지는 구조

${campaignContext}

## 📋 가이드 작성 방식

**크리에이터의 실제 생활/스타일 정보가 부족할 경우:**
- "자율 기획 공간"을 제공하되, 예시 시나리오를 함께 제시
- 예시 시나리오는 위아래 씬이 자연스럽게 이어지도록 구성
- 크리에이터가 자신의 진짜 상황에 맞게 변형할 수 있는 여지를 줌

다음 JSON 형식으로 작성해주세요:

{
  "campaign_title": "[브랜드명] [제품명] 촬영 가이드",
  "brand_info": {
    "brand": "브랜드명",
    "product": "제품명",
    "product_url": "제품 URL",
    "deadline": "촬영 마감일"
  },
  "content_philosophy": {
    "core_message": "이 영상에서 전달하고 싶은 핵심 감정/공감 포인트",
    "authenticity_note": "진정성을 살리기 위한 핵심 조언",
    "avoid": ["피해야 할 뻔한 표현들", "식상한 구성들"]
  },
  "target_platform": "instagram/youtube/tiktok 중 선택",
  "video_duration": "30-60초 (숏폼 기준)",
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
      "example_scenario": "예시) 기존에 쓰던 제품의 아쉬운 점..."
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
      "example_scenario": "예시) 나는 이렇게 쓰는 게 좋더라..."
    },
    {
      "order": 6,
      "scene_type": "솔직한 사용감",
      "scene_description": "제품 사용 중 느낀 점 (좋은 점 + 아쉬운 점도 가능)",
      "dialogue": "100% 솔직한 리뷰",
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
      "진짜 느낀 점 솔직하게 공유",
      "아쉬운 점도 언급 가능 (진정성 UP)",
      "나만의 스타일로 재해석"
    ],
    "dont": [
      "가족/친구 출연시키기 (본인만!)",
      "없는 상황 연기하기",
      "과장된 리액션",
      "누구나 하는 뻔한 B&A 구성",
      "대본 읽는 듯한 부자연스러운 말투"
    ]${isChildProduct ? ',\n    "exception": "⚠️ 아이 제품이므로 아이와 함께 촬영 필수"' : ''}
  },
  "required_hashtags": {
    "brand": ["#브랜드명", "#제품명"],
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
  "meta_partnership_guide": {
    "title": "메타 파트너십 광고 코드 발급 방법 (인스타그램)",
    "steps": [
      "1. 파트너십 권한 공유 게시물 설정 > 우측 상단 더보기 아이콘 클릭",
      "2. 파트너십 레이블 및 광고 툴 선택",
      "3. 파트너십 광고 코드 받기 허용 > 복사",
      "4. 인스타 업로드 후 파트너십 코드 전달 부탁드립니다."
    ],
    "note": "파트너십 광고의 장점: 기업측의 광고를 통해 조회수 및 팔로우가 늘어나 계정에 긍정적인 효과를 줍니다."
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
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let guideText = response.text();

    // JSON 코드 블록 제거 (```json ... ``` 형식)
    guideText = guideText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // JSON 파싱 시도
    let guideData;
    try {
      guideData = JSON.parse(guideText);
    } catch (parseError) {
      console.error('[generate-campaign-guide] JSON parse error:', parseError);
      // JSON 파싱 실패 시 원본 텍스트 반환
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          guide: guideText,
          format: 'text'
        })
      };
    }

    console.log('[generate-campaign-guide] AI guide generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        guide: guideData,
        format: 'json'
      })
    };

  } catch (error) {
    console.error('[generate-campaign-guide] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate campaign guide',
        details: error.message
      })
    };
  }
};
