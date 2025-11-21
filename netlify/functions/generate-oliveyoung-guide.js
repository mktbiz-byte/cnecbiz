const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate AI guide for Olive Young Sale campaigns
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

    console.log('[generate-oliveyoung-guide] Generating Olive Young Sale guide for:', campaignData.title);

    // Prepare campaign context
    const campaignContext = `
캠페인 정보:
- 브랜드: ${campaignData.brand || ''}
- 제품명: ${campaignData.product_name || ''}
- 제품 URL: ${campaignData.product_url || ''}
- 카테고리: ${Array.isArray(campaignData.category) ? campaignData.category.join(', ') : campaignData.category || ''}
- 보상: ${campaignData.reward_points || 0}원
- 모집 인원: ${campaignData.total_slots || 0}명
- 1차 업로드 마감일: ${campaignData.start_date || ''}
- 2차 업로드 마감일: ${campaignData.end_date || ''}
- 제품 설명: ${campaignData.product_description || ''}
- 추가 세부사항: ${campaignData.additional_details || ''}
- 필수 포함 사항: ${campaignData.must_include || ''}
- 제외 사항: ${campaignData.exclusions || ''}
- 가이드 요청사항: ${campaignData.additional_shooting_requests || ''}
`;

    // Generate AI guide using Gemini
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
당신은 올리브영 세일 캠페인 가이드를 작성하는 전문가입니다.
다음 캠페인 정보를 바탕으로 **크리에이터가 쉽게 이해하고 실행할 수 있는 미션 형태의 가이드**를 작성해주세요.

${campaignContext}

**올리브영 세일 캠페인 특징:**
- 2개의 영상을 제작해야 합니다
- 1차: 상품 리뷰 영상
- 2차: 올리브영 세일 전 추천템 영상 + 인스타그램 스토리 동시 업로드 (스토리에 링크 삽입)
- 촬영 장면이나 대사 스크립트는 제공하지 않고, 미션 형태로 안내
- 크리에이터가 자유롭게 촬영하되, 필수 요소만 명확히 전달

다음 JSON 형식으로 작성해주세요:

{
  "campaign_title": "[브랜드명] 올리브영 세일 캠페인 가이드",
  "campaign_overview": {
    "brand": "브랜드명",
    "product": "제품명",
    "product_url": "제품 URL",
    "reward": "보상 금액",
    "total_creators": "모집 인원"
  },
  "mission_summary": "이번 캠페인은 2개의 영상을 제작하여 올리브영 세일 기간 동안 제품을 효과적으로 홍보하는 미션입니다.",
  "video_requirements": {
    "total_videos": 2,
    "video_1": {
      "title": "상품 리뷰 영상",
      "upload_deadline": "1차 업로드 마감일",
      "platform": "인스타그램 릴스 또는 유튜브 쇼츠",
      "duration": "30-60초",
      "mission": [
        "제품을 실제로 사용한 솔직한 리뷰",
        "제품의 핵심 특징 3가지 소개",
        "사용 전후 비교 (Before & After)",
        "제품이 해결하는 문제점 강조",
        "자연스러운 추천 멘트"
      ],
      "must_include": [
        "제품 클로즈업 (패키징, 텍스처)",
        "실제 사용 장면",
        "최종 결과 및 만족스러운 표정",
        "브랜드명 및 제품명 언급"
      ],
      "hashtags": ["#브랜드명", "#제품명", "#올리브영", "#올영세일", "#솔직리뷰"]
    },
    "video_2": {
      "title": "올리브영 세일 전 추천템",
      "upload_deadline": "2차 업로드 마감일",
      "platform": "인스타그램 릴스 + 스토리",
      "duration": "30-60초",
      "mission": [
        "올리브영 세일 기간 동안 꼭 사야 할 추천템 소개",
        "해당 제품을 포함한 3-5개의 추천 아이템",
        "세일 혜택 강조 (할인율, 가격 등)",
        "구매 링크 안내 (스토리에 삽입)",
        "긴박감 조성 (한정 수량, 기간 한정 등)"
      ],
      "must_include": [
        "올리브영 세일 관련 멘트",
        "해당 제품을 첫 번째 또는 메인으로 소개",
        "제품 구매 링크 (스토리에 삽입)",
        "세일 기간 명시"
      ],
      "story_requirement": {
        "description": "릴스 업로드와 동시에 인스타그램 스토리에 게시",
        "link": "스토리에 제품 구매 링크 삽입 (스와이프 업 또는 링크 스티커)",
        "duration": "24시간 유지",
        "must_include": ["릴스 공유", "제품 링크", "세일 기간 안내"]
      },
      "hashtags": ["#올리브영세일", "#올영세일", "#올영추천템", "#브랜드명", "#제품명", "#세일템", "#득템"]
    }
  },
  "upload_schedule": {
    "phase_1": {
      "date": "1차 업로드 마감일",
      "content": "상품 리뷰 영상",
      "platform": "인스타그램 릴스 또는 유튜브 쇼츠"
    },
    "phase_2": {
      "date": "2차 업로드 마감일",
      "content": "올리브영 세일 전 추천템 영상 + 스토리",
      "platform": "인스타그램 릴스 + 스토리 동시 업로드"
    }
  },
  "important_notes": [
    "2개의 영상 모두 제출해야 캠페인이 완료됩니다",
    "1차 영상은 제품 리뷰에 집중하고, 2차 영상은 세일 홍보에 집중해주세요",
    "스토리는 릴스 업로드 후 즉시 게시하여 24시간 동안 유지해주세요",
    "스토리에 제품 구매 링크를 반드시 삽입해주세요",
    "모든 영상은 자연스럽고 진정성 있게 촬영해주세요",
    "기업이 요청한 필수 포함 사항을 반드시 지켜주세요"
  ],
  "creator_tips": [
    "평소 사용하는 촬영 스타일과 톤을 유지하세요",
    "1차 영상에서 제품의 장점을 충분히 어필하면, 2차 영상에서 구매 전환율이 높아집니다",
    "세일 기간과 혜택을 강조하여 긴박감을 조성하세요",
    "스토리 링크는 제품 페이지로 직접 연결되도록 설정하세요",
    "해시태그는 제공된 것을 기본으로 사용하되, 자신의 스타일에 맞게 추가 가능합니다"
  ],
  "submission_checklist": [
    "✅ 상품 리뷰 영상 (1차) 업로드 완료",
    "✅ 올리브영 세일 전 추천템 영상 (2차) 업로드 완료",
    "✅ 인스타그램 스토리에 링크 삽입 완료",
    "✅ 필수 해시태그 포함 확인",
    "✅ 필수 포함 사항 모두 반영 확인",
    "✅ 캠페인 플랫폼에 URL 제출 완료"
  ],
  "meta_partnership_guide": {
    "title": "메타 파트너십 광고 코드 발급 방법 (인스타그램)",
    "steps": [
      "1. 파트너십 권한 공유 게시물 설정 > 우측 상단 더보기 아이콘 클릭",
      "2. 파트너십 레이블 및 광고 툴 선택",
      "3. 파트너십 광고 코드 받기 허용 > 복사",
      "4. 인스타 업로드 후 파트너십 코드 전달 부탁드립니다."
    ],
    "note": "파트너십 광고의 장점: 기업측의 광고를 통해 조회수 및 팔로우가 늘어나기에 계정에 긍정적인 효과를 줍니다."
  }
}

**주의사항:**
- 반드시 유효한 JSON 형식으로 작성
- 미션은 명확하고 실행 가능하게 작성
- 크리에이터가 자유롭게 촬영할 수 있도록 과도한 제약 금지
- 필수 요소는 명확히 구분하여 전달
- 2개 영상의 역할과 차이점을 명확히 설명
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
      console.error('[generate-oliveyoung-guide] JSON parse error:', parseError);
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

    console.log('[generate-oliveyoung-guide] Olive Young Sale guide generated successfully');

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
    console.error('[generate-oliveyoung-guide] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate Olive Young Sale guide',
        details: error.message
      })
    };
  }
};
