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
    const prompt = `당신은 전문 마케팅 콘텐츠 기획자입니다. 다음 크리에이터의 스타일에 맞는 맞춤형 촬영 가이드를 작성해주세요.

[제품 정보]
브랜드: ${productInfo.brand}
제품명: ${productInfo.product_name}
제품 특징: ${productInfo.product_features}
핵심 포인트: ${productInfo.product_key_points}

[크리에이터 분석]
플랫폼: ${creatorAnalysis.platform}
팔로워: ${creatorAnalysis.followers?.toLocaleString()}명
평균 참여율: ${creatorAnalysis.contentAnalysis?.engagementRate}%
콘텐츠 톤: ${creatorAnalysis.style?.tone}
주요 토픽: ${creatorAnalysis.style?.topics?.join(', ')}
자주 사용하는 해시태그: ${creatorAnalysis.contentAnalysis?.topHashtags?.slice(0, 5).join(', ')}
${creatorAnalysis.platform === 'instagram' ? `콘텐츠 타입: ${creatorAnalysis.contentAnalysis?.contentType} (영상 비율: ${creatorAnalysis.contentAnalysis?.videoRatio}%)` : ''}
${creatorAnalysis.platform === 'tiktok' ? `영상 스타일: ${creatorAnalysis.style?.videoStyle}, 평균 길이: ${creatorAnalysis.contentAnalysis?.avgDuration}초` : ''}

${baseGuide ? `[기본 가이드]\n${baseGuide}\n\n위 기본 가이드를 바탕으로, 이 크리에이터의 스타일에 맞게 커스터마이징해주세요.` : ''}

다음 형식으로 맞춤형 가이드를 작성해주세요:

## 🎬 촬영 가이드 (${creatorAnalysis.platform === 'youtube' ? 'YouTube' : creatorAnalysis.platform === 'instagram' ? 'Instagram' : 'TikTok'} 최적화)

### 1. 콘텐츠 개요
- 이 크리에이터의 ${creatorAnalysis.style?.tone} 톤에 맞는 콘텐츠 방향
- 팔로워들이 기대하는 ${creatorAnalysis.style?.topics?.[0]} 스타일 유지
- 제품 소개 방식 제안

### 2. 촬영 장면 구성 (5-7개 장면)
각 장면마다:
- 장면 설명
- 예상 길이
- 촬영 팁
- 이 크리에이터 스타일에 맞는 연출 방법

### 3. 추천 대사 및 멘트
- 크리에이터의 평소 말투와 톤을 고려한 자연스러운 대사
- 필수 제품 포인트를 녹여낸 멘트
- ${creatorAnalysis.contentAnalysis?.topHashtags?.[0] || ''} 같은 평소 사용하는 표현 활용

### 4. 해시태그 및 캡션 제안
- 크리에이터가 자주 사용하는 해시태그 스타일 반영
- 플랫폼 특성에 맞는 최적화된 해시태그

### 5. 편집 팁
${creatorAnalysis.platform === 'tiktok' ? '- TikTok 트렌드 음악 및 효과 활용\n- 짧고 임팩트 있는 편집 스타일' : ''}
${creatorAnalysis.platform === 'instagram' ? '- 인스타그램 릴스 최적화\n- 시각적 일관성 유지' : ''}
${creatorAnalysis.platform === 'youtube' ? '- 유튜브 알고리즘 최적화\n- 썸네일 및 타이틀 제안' : ''}

전문적이고 실용적이며, 이 크리에이터가 바로 활용할 수 있는 구체적인 가이드를 작성해주세요.
크리에이터의 기존 콘텐츠 스타일을 존중하면서도 제품의 핵심 메시지를 효과적으로 전달할 수 있도록 해주세요.`

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + process.env.VITE_GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    )

    if (!response.ok) {
      throw new Error('Failed to generate guide with Gemini API')
    }

    const data = await response.json()
    const personalizedGuide = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!personalizedGuide) {
      throw new Error('No guide generated')
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizedGuide,
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
