const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
};

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    // 아이 제품 여부 판단
    const isChildProduct = (productInfo?.category || '').toLowerCase().includes('아이') ||
                          (productInfo?.category || '').toLowerCase().includes('baby') ||
                          (productInfo?.category || '').toLowerCase().includes('kid') ||
                          (productInfo?.category || '').toLowerCase().includes('유아') ||
                          (productInfo?.product_name || '').toLowerCase().includes('아이') ||
                          (productInfo?.product_name || '').toLowerCase().includes('baby');

    const prompt = `당신은 **크넥(CNEC)**의 영상 촬영 기획 가이드를 수정하는 전문가입니다.

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

## 기존 가이드

아래는 크리에이터를 위해 이미 생성된 맞춤 촬영 가이드입니다:

${JSON.stringify(existingGuide, null, 2)}

---

## 수정 요청

기업으로부터 다음과 같은 수정 요청이 들어왔습니다:
"${regenerateRequest}"

---

## 📋 수정 시 반드시 유지해야 할 JSON 구조

수정된 가이드는 아래 필드들을 포함해야 합니다:
- campaign_title, brand_info
- content_philosophy: { core_message, authenticity_note, avoid[] }
- target_platform, video_duration, shooting_concept
- story_flow: { narrative_type, emotional_arc }
- shooting_scenes[]: 10개 씬 (order, scene_type, scene_description, dialogue, caption, shooting_tip, flexibility_note, example_scenario)
- authenticity_guidelines: { do[], dont[]${isChildProduct ? ', exception' : ''} }
- required_hashtags: { brand[], real[], trend[] }
- shooting_requirements: { must_include[], video_style{} }
- why_recommended: { scene_reasoning, reference_videos[], content_strategy }
- creator_tips[]

---

**중요 규칙:**
1. 크넥 콘텐츠 철학을 반드시 유지하세요 (공감형 콘텐츠, 혼자 리뷰, 연기 금지)
2. 기존 가이드의 전체 구조와 형식을 유지하세요
3. 요청사항과 관련된 부분만 수정하세요
4. 촬영 장면(shooting_scenes)은 10개를 유지하되, 내용만 요청사항에 맞게 수정하세요
5. 위아래 씬이 자연스럽게 이어지는 스토리 흐름을 유지하세요
6. 뻔한 B&A 구성으로 수정하지 마세요 - 스토리텔링 유지
7. "자율 공간(flexibility_note)"과 "예시 시나리오(example_scenario)" 필드 활용

**응답 형식:**
반드시 JSON 형식으로만 응답하세요. 설명이나 추가 텍스트 없이 순수 JSON만 반환하세요.`;

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
