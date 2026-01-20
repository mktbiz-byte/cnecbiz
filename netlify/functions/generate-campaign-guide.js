const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `
당신은 한국 인플루언서 마케팅 캠페인 가이드를 작성하는 전문가입니다.
다음 캠페인 정보를 바탕으로 **10만 뷰 이상 나올 수 있는 고퀄리티 숏폼 영상 가이드**를 작성해주세요.

${campaignContext}

**중요 지침:**
1. 한국인의 취향과 트렌드를 반영한 기획
2. 첫 씬은 반드시 강력한 후킹(Hooking) 장면으로 시작
3. 10개 씬으로 구성 (각 씬은 3-5초 분량)
4. Before & After 구조 활용
5. 제품의 핵심 가치를 자연스럽게 전달
6. 기업이 요청한 사항을 반드시 반영

다음 JSON 형식으로 작성해주세요:

{
  "campaign_title": "[브랜드명] [제품명] 촬영 가이드",
  "brand_info": {
    "brand": "브랜드명",
    "product": "제품명",
    "product_url": "제품 URL",
    "deadline": "촬영 마감일"
  },
  "target_platform": "instagram/youtube/tiktok 중 선택",
  "video_duration": "30-60초 (숏폼 기준)",
  "shooting_concept": "전체 영상 컨셉을 2-3문장으로 설명",
  "shooting_scenes": [
    {
      "order": 1,
      "scene_type": "후킹 장면",
      "scene_description": "시선을 사로잡는 강력한 오프닝 (예: 극적인 변화, 놀라운 결과, 충격적인 질문)",
      "dialogue": "첫 3초 안에 시청자를 사로잡을 대사",
      "caption": "자막으로 표시할 텍스트",
      "shooting_tip": "촬영 팁 (조명, 앵글, 편집 포인트 등)"
    },
    {
      "order": 2,
      "scene_type": "문제 제기 (Before)",
      "scene_description": "제품 사용 전 고민/문제 상황",
      "dialogue": "공감을 이끌어내는 대사",
      "caption": "자막",
      "shooting_tip": "촬영 팁"
    },
    {
      "order": 3,
      "scene_type": "Before 상세",
      "scene_description": "문제 상황을 구체적으로 보여주는 장면",
      "dialogue": "대사",
      "caption": "자막",
      "shooting_tip": "촬영 팁"
    },
    {
      "order": 4,
      "scene_type": "전환",
      "scene_description": "제품을 알게 된 계기 또는 기대감 표현",
      "dialogue": "대사",
      "caption": "자막",
      "shooting_tip": "촬영 팁"
    },
    {
      "order": 5,
      "scene_type": "제품 소개",
      "scene_description": "제품 패키징, 텍스처, 특징 소개",
      "dialogue": "제품의 핵심 특징을 자연스럽게 소개하는 대사",
      "caption": "자막",
      "shooting_tip": "제품 클로즈업, 텍스처 강조"
    },
    {
      "order": 6,
      "scene_type": "사용",
      "scene_description": "제품 사용 과정",
      "dialogue": "사용감을 표현하는 대사",
      "caption": "자막",
      "shooting_tip": "사용 과정을 슬로우 모션 또는 클로즈업으로"
    },
    {
      "order": 7,
      "scene_type": "즉각 반응 (After 1)",
      "scene_description": "사용 직후 즉각적인 변화",
      "dialogue": "놀라움을 표현하는 대사",
      "caption": "자막",
      "shooting_tip": "변화를 강조하는 조명/앵글"
    },
    {
      "order": 8,
      "scene_type": "지속 효과 (After 2)",
      "scene_description": "시간이 지난 후의 효과 (예: 3일 후, 1주일 후)",
      "dialogue": "지속적인 효과를 강조하는 대사",
      "caption": "자막",
      "shooting_tip": "Before & After 비교 화면"
    },
    {
      "order": 9,
      "scene_type": "추가 장점",
      "scene_description": "제품의 부가적인 장점이나 활용법",
      "dialogue": "추가 가치를 전달하는 대사",
      "caption": "자막",
      "shooting_tip": "촬영 팁"
    },
    {
      "order": 10,
      "scene_type": "마무리 & CTA",
      "scene_description": "최종 추천 및 구매 유도",
      "dialogue": "강력한 추천 메시지",
      "caption": "자막",
      "shooting_tip": "밝고 자신감 있는 표정"
    }
  ],
  "required_hashtags": {
    "brand": ["#브랜드명", "#제품명"],
    "real": ["#솔직후기", "#리얼리뷰", "#광고"],
    "trend": ["#인생템", "#꿀템발견", "트렌디한 해시태그 3-5개"]
  },
  "shooting_requirements": {
    "must_include": [
      "제품 클로즈업 (패키징, 텍스처)",
      "Before & After 비교 장면",
      "제품 사용 과정",
      "최종 결과 및 만족스러운 표정",
      "기업 요청 필수 촬영 요소"
    ],
    "video_style": {
      "tempo": "빠르고 역동적 (3-5초마다 장면 전환)",
      "tone": "친근하고 자연스러운",
      "editing": "트렌디한 전환 효과, 자막 강조"
    }
  },
  "meta_partnership_guide": {
    "title": "메타 파트너십 광고 코드 발급 방법 (인스타그램)",
    "steps": [
      "1. 파트너십 권한 공유 게시물 설정 > 우측 상단 더보기 아이콘 클릭",
      "2. 파트너십 레이블 및 광고 툴 택",
      "3. 파트너십 광고 코드 받기 허용 > 복사",
      "4. 인스타 업로드 후 파트너십 코드 전달 부탁 드립니다."
    ],
    "note": "파트너십 광고의 장점: 기업측의 광고를 통해 조회수 및 팔로우가 늘어나기에 계정에 공정적인 효과를 줍니다."
  },
  "creator_tips": [
    "평소 사용하는 해시태그 스타일을 유지하세요",
    "썸네일과 타이틀에 핵심 키워드를 포함하세요",
    "제품 정보는 100% 정확하게 전달하되, 대사는 자유롭게 변형 가능합니다",
    "가이드는 참고용이며, 자신의 스타일에 맞게 자유롭게 연출하세요",
    "촬영 전 제품을 충분히 사용해보고 진정성 있는 리뷰를 작성하세요"
  ]
}

**주의사항:**
- 반드시 유효한 JSON 형식으로 작성
- 각 씬의 대사는 자연스럽고 공감 가능하게
- 제품의 실제 특징과 장점을 정확하게 반영
- 과장 금지, 진정성 있는 표현 사용
- 기업이 제공한 정보를 최대한 활용
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
