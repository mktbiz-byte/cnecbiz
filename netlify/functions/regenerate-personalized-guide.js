const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { existingGuide, regenerateRequest, creatorAnalysis, productInfo } = JSON.parse(event.body);

    if (!existingGuide || !regenerateRequest) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '기존 가이드와 재생성 요청사항이 필요합니다.' })
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `당신은 인플루언서 마케팅 전문가입니다.

아래는 크리에이터를 위해 이미 생성된 맞춤 촬영 가이드입니다:

${JSON.stringify(existingGuide, null, 2)}

기업으로부터 다음과 같은 수정 요청이 들어왔습니다:
"${regenerateRequest}"

위 요청사항을 반영하여 가이드를 재생성해주세요.

**중요 규칙:**
1. 기존 가이드의 전체 구조와 형식을 유지하세요
2. 요청사항과 관련된 부분만 수정하세요
3. 크리에이터 분석 정보는 그대로 유지하세요
4. 촬영 장면(filming_scenes)은 10개를 유지하되, 내용만 요청사항에 맞게 수정하세요
5. 해시태그, 촬영 요구사항, 크리에이터 팁도 요청사항을 반영하여 수정하세요

**응답 형식:**
반드시 JSON 형식으로만 응답하세요. 설명이나 추가 텍스트 없이 순수 JSON만 반환하세요.

기존 가이드와 동일한 구조의 JSON을 반환하되, 요청사항이 반영된 내용으로 수정해주세요.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // JSON 추출
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let regeneratedGuide;
    try {
      regeneratedGuide = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON 파싱 실패:', text);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI 응답을 파싱할 수 없습니다.' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ regeneratedGuide })
    };

  } catch (error) {
    console.error('가이드 재생성 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
