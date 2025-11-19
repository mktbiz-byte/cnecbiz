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
- 캠페인 타입: ${campaignData.campaign_type || 'package'}
- 카테고리: ${Array.isArray(campaignData.category) ? campaignData.category.join(', ') : campaignData.category || ''}
- 보상: ${campaignData.reward_points || 0}원
- 모집 인원: ${campaignData.total_slots || 0}명
- 제품 설명: ${campaignData.product_description || ''}
- 추가 세부사항: ${campaignData.additional_details || ''}
- 필수 포함 사항: ${campaignData.must_include || ''}
- 제외 사항: ${campaignData.exclusions || ''}
- 오프라인 방문 필요: ${campaignData.offline_visit_requirement || '없음'}
- 참여 조건: ${campaignData.participation_requirements || '없음'}
`;

    // Generate AI guide using Gemini
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
당신은 인플루언서 마케팅 캠페인 가이드를 작성하는 전문가입니다.
다음 캠페인 정보를 바탕으로 크리에이터가 참고할 수 있는 **간결하고 실용적인** 가이드를 작성해주세요.

${campaignContext}

다음 형식으로 작성해주세요:

## 제품 소개
(제품의 핵심 특징과 장점을 2-3문장으로 간결하게)

## 필수 포함 사항
- (반드시 포함해야 할 내용 3-5개, 각 항목은 한 줄로)

## 촬영 팁
- (효과적인 촬영 방법 3-5개, 각 항목은 한 줄로)

## 영상 컨셉
- (추천 영상 컨셉 2-3개, 각 항목은 한 줄로)

## 주의사항
- (주의할 점 2-3개, 각 항목은 한 줄로)

**중요**: 
- 각 섹션은 간결하게 작성 (제품 소개는 2-3문장, 나머지는 각 3-5개 항목)
- 불릿 포인트는 한 줄로 간결하게
- 구체적이고 실행 가능한 내용으로 작성
- 마크다운 형식으로 작성
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const guideText = response.text();

    console.log('[generate-campaign-guide] AI guide generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        guide: guideText
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
