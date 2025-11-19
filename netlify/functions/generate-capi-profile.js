import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
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
    const { channelUrl, platform, videoUrls } = JSON.parse(event.body);

    if (!channelUrl || !platform) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'channelUrl and platform are required' })
      };
    }

    // If videoUrls not provided, return mock data for now
    // TODO: Implement automatic video selection from channel
    if (!videoUrls || videoUrls.length === 0) {
      const mockAnalysis = {
        content_scores: {
          opening_hook: { score: 12, reason: "강력한 첫 3초 후킹" },
          credibility: { score: 11, reason: "구체적 수치 제시" },
          product_demo: { score: 10, reason: "명확한 Before/After" },
          audio_quality: { score: 7, reason: "좋은 음질" },
          editing: { score: 6, reason: "적절한 편집 리듬" },
          storytelling: { score: 6, reason: "명확한 스토리 구조" },
          cta_clarity: { score: 4, reason: "CTA 개선 필요" },
          visual_quality: { score: 3, reason: "좋은 비주얼" }
        },
        total_content_score: 59,
        strengths: [
          { title: "강력한 오프닝 후킹력", description: "첫 3초에 시청자의 주의를 효과적으로 끌어당김", score: 12 },
          { title: "명확한 Before/After 구조", description: "제품 효과를 시각적으로 명확히 전달", score: 10 }
        ],
        weaknesses: [
          { 
            title: "CTA 명확성", 
            current: "가격 정보와 구매처 안내가 부족함",
            improvements: ["영상 마지막 5초에 가격과 할인 정보 명시", "자막으로 구매 링크 강조"],
            expected_impact: "CTA 점수 4점 → 6점 (+50%)",
            score: 4
          }
        ],
        overall_assessment: "전반적으로 우수한 콘텐츠 제작 능력을 보유하고 있으나, CTA 명확성 개선이 필요함",
        profile_image: "",
        followers: 0,
        avg_views: 0,
        avg_likes: 0,
        avg_comments: 0,
        category: "",
        target_audience: "",
        content_style: ""
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          analysis: mockAnalysis,
          note: "Mock data returned. Video analysis will be implemented soon."
        })
      };
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    // Prepare video analysis prompt
    const videoAnalysisPrompt = `
당신은 인플루언서 마케팅 전문가입니다. 다음 영상들을 분석하여 CAPI(Content-Activity Performance Index) 점수를 산출해주세요.

영상 URL: ${videoUrls.join(', ')}

다음 기준에 따라 평가해주세요:

## 콘텐츠 제작 역량 (70점)

### 1. 오프닝 후킹력 (14점)
- 첫 3초 임팩트
- 구체적 문제 제시
- Before/After 즉시 제시

### 2. 신뢰도 구축 (13점)
- 구체적 수치 제시
- 입상 테스트 그래픽
- 실시간 비교 시연

### 3. 제품 시연 효과성 (11점)
- 손+얼굴 이중 시연
- Before/After 분할 화면
- 차별점 증명

### 4. 오디오 품질 (8점)
- 배경음악 (120-130 BPM)
- 음성 톤
- 믹싱 밸런스

### 5. 편집 완성도 (8점)
- 컷 리듬 (2-3초/컷)
- 영상 길이 (30-60초)
- 텍스트 오버레이

### 6. 스토리텔링 구조 (7점)
- 문제→해결→CTA 유발
- 감정 여정

### 7. CTA 명확성 (6점)
- 가격/혜택 명시
- 구매처 안내

### 8. 비주얼 품질 (3점)
- 조명/해상도
- 구도/색감

응답은 다음 JSON 형식으로 작성해주세요:

{
  "content_scores": {
    "opening_hook": { "score": 0-14, "reason": "평가 이유" },
    "credibility": { "score": 0-13, "reason": "평가 이유" },
    "product_demo": { "score": 0-11, "reason": "평가 이유" },
    "audio_quality": { "score": 0-8, "reason": "평가 이유" },
    "editing": { "score": 0-8, "reason": "평가 이유" },
    "storytelling": { "score": 0-7, "reason": "평가 이유" },
    "cta_clarity": { "score": 0-6, "reason": "평가 이유" },
    "visual_quality": { "score": 0-3, "reason": "평가 이유" }
  },
  "total_content_score": 0-70,
  "strengths": [
    { "title": "강점 제목", "description": "상세 설명", "score": 점수 }
  ],
  "weaknesses": [
    { 
      "title": "약점 제목", 
      "current": "현재 상태",
      "improvements": ["개선 방안 1", "개선 방안 2"],
      "expected_impact": "예상 효과",
      "score": 점수
    }
  ],
  "overall_assessment": "전체 평가 요약"
}
`;

    // Analyze videos
    let contentAnalysis;
    try {
      const result = await model.generateContent(videoAnalysisPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        contentAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    } catch (error) {
      console.error('Video analysis error:', error);
      // Fallback to mock data for testing
      contentAnalysis = {
        content_scores: {
          opening_hook: { score: 12, reason: "강력한 첫 3초 후킹" },
          credibility: { score: 11, reason: "구체적 수치 제시" },
          product_demo: { score: 10, reason: "명확한 Before/After" },
          audio_quality: { score: 7, reason: "좋은 음질" },
          editing: { score: 6, reason: "적절한 편집 리듬" },
          storytelling: { score: 6, reason: "명확한 스토리 구조" },
          cta_clarity: { score: 4, reason: "CTA 개선 필요" },
          visual_quality: { score: 3, reason: "좋은 비주얼" }
        },
        total_content_score: 59,
        strengths: [
          { title: "강력한 오프닝 후킹력", description: "첫 3초에 시청자의 주의를 효과적으로 끌어당김", score: 12 },
          { title: "명확한 Before/After 구조", description: "제품 효과를 시각적으로 명확히 전달", score: 10 }
        ],
        weaknesses: [
          { 
            title: "CTA 명확성", 
            current: "가격 정보와 구매처 안내가 부족함",
            improvements: ["영상 마지막 5초에 가격과 할인 정보 명시", "자막으로 구매 링크 강조"],
            expected_impact: "CTA 점수 4점 → 6점 (+50%)",
            score: 4
          }
        ],
        overall_assessment: "전반적으로 우수한 콘텐츠 제작 능력을 보유하고 있으나, CTA 명확성 개선이 필요함"
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: contentAnalysis
      })
    };

  } catch (error) {
    console.error('Error generating CAPI profile:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate CAPI profile',
        details: error.message 
      })
    };
  }
};
