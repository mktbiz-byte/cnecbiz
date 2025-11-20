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
    const prompt = `당신은 전문 마케팅 콘텐츠 기획자입니다. 다음 크리에이터의 스타일에 맞는 **숏폼 콘텐츠 촬영 가이드**를 작성해주세요.

**중요 가이드라인:**
1. **B&A (Before & After) 중심 구성**: 제품 사용 전/후를 명확히 대비
2. **첫 장면 (1번)은 반드시 후킹력 강한 장면**: 시청자의 시선을 즉시 사로잡는 자극적이고 강렬한 오프닝
3. **10개 이상의 촬영 장면**: 각 장면마다 구체적인 대사 포함
4. **기업 요청사항 반영**: 아래 제품 정보와 핵심 포인트를 충실히 반영

---

## 📋 제품 정보
- **브랜드**: ${productInfo.brand}
- **제품명**: ${productInfo.product_name}
- **제품 특징**: ${productInfo.product_features}
- **핵심 포인트**: ${productInfo.product_key_points}

## 👤 크리에이터 분석
- **플랫폼**: ${creatorAnalysis.platform}
- **팔로워**: ${creatorAnalysis.followers?.toLocaleString()}명
- **평균 참여율**: ${creatorAnalysis.contentAnalysis?.engagementRate}%
- **콘텐츠 톤**: ${creatorAnalysis.style?.tone}
- **주요 토픽**: ${creatorAnalysis.style?.topics?.join(', ')}
- **자주 사용하는 해시태그**: ${creatorAnalysis.contentAnalysis?.topHashtags?.slice(0, 5).join(', ')}

${baseGuide ? `## 📝 기본 가이드\n${baseGuide}\n\n위 기본 가이드를 바탕으로, 이 크리에이터의 스타일에 맞게 커스터마이징해주세요.` : ''}

---

# 출력 형식 (반드시 아래 형식을 따라주세요)

## 🎬 촬영 가이드

**영상 제출 마감일**: [캠페인 마감일 기재]

### 📹 촬영 장면 구성 (10개 이상)

| 순서 | 촬영 장면 | 대사 및 자막 (자신의 스타일에 맞게 자연스럽게 대사를 바꿔주세요) |
|------|-----------|----------------------------------------------------------------|
| 1 | **[후킹 장면]** 극적인 문제 상황 또는 놀라운 결과를 먼저 보여주는 강렬한 오프닝 (3초 이내) | "😱 [충격적인 멘트]" 또는 "[문제 상황 강조]" |
| 2 | **[Before]** 제품 사용 전 문제 상황 #1 | "[문제점을 공감 가게 표현하는 대사]" |
| 3 | **[Before]** 제품 사용 전 문제 상황 #2 | "[구체적인 불편함을 설명하는 대사]" |
| 4 | **[Before]** 제품 사용 전 문제 상황 #3 | "[일상적인 고민을 표현하는 대사]" |
| 5 | **[전환]** 제품 발견 및 소개 | "[제품을 발견한 계기나 기대감을 표현]" |
| 6 | **[제품 소개]** 제품 클로즈업 및 특징 설명 | "[제품의 핵심 특징을 자연스럽게 소개]" |
| 7 | **[사용]** 제품 사용 장면 (텍스처, 발림성 등) | "[사용감을 구체적으로 표현]" |
| 8 | **[After]** 제품 사용 후 즉각적인 변화 | "[놀라움을 표현하는 대사]" |
| 9 | **[After]** 시간이 지난 후의 지속 효과 | "[만족감을 표현하는 대사]" |
| 10 | **[After]** Before & After 비교 또는 최종 결과 | "[극적인 변화를 강조하는 대사]" |
| 11 | **[추가 장면]** 일상 속 사용 모습 또는 추가 효과 | "[자연스러운 사용 장면 대사]" |
| 12 | **[마무리]** 제품 추천 및 구매 유도 | "[진심 어린 추천 멘트]" |

**⚠️ 주의사항**:
- 1번 장면은 반드시 **3초 이내 후킹 장면**으로 구성 (시청자 이탈 방지)
- 각 대사는 크리에이터의 평소 말투(${creatorAnalysis.style?.tone})를 반영
- Before 장면 3개 이상, After 장면 3개 이상 필수
- 제품의 핵심 포인트(${productInfo.product_key_points})를 자연스럽게 녹여낼 것

---

## 🎯 촬영 요구사항

### 필수 촬영 장면
- ✅ 제품 클로즈업 (텍스처, 패키징)
- ✅ Before & After 비교 (분할 화면 권장)
- ✅ 사용 과정 (바르는 모습, 흡수되는 모습 등)
- ✅ 최종 결과 (만족스러운 표정과 함께)

### 영상 스타일
- **길이**: ${creatorAnalysis.platform === 'youtube' ? '5-10분 (롱폼)' : '30-60초 (숏폼)'}
- **템포**: 빠르고 역동적 (숏폼의 경우 3초마다 장면 전환)
- **톤**: ${creatorAnalysis.style?.tone}

---

## 📌 요청 해시태그

크리에이터님의 스타일에 맞춰 아래 해시태그를 자연스럽게 활용해주세요:

**리얼**: #${productInfo.brand} #${productInfo.product_name.replace(/\s+/g, '')} #솔직후기 #리얼리뷰

**제품 관련**: #${productInfo.brand}추천 #인생템 #꿀템발견 #이거진짜

**공통**: ${creatorAnalysis.contentAnalysis?.topHashtags?.slice(0, 3).join(' #') || '#뷰티 #데일리 #추천'}

---

## 💡 크리에이터 팁

- 평소 사용하는 "${creatorAnalysis.contentAnalysis?.topHashtags?.[0] || '해시태그'}" 스타일을 유지하세요
- ${creatorAnalysis.platform === 'tiktok' ? 'TikTok 트렌드 음악과 효과를 활용하세요' : ''}
- ${creatorAnalysis.platform === 'instagram' ? '인스타그램 릴스 최적화: 첫 3초가 가장 중요합니다' : ''}
- ${creatorAnalysis.platform === 'youtube' ? '썸네일과 타이틀에 핵심 키워드를 포함하세요' : ''}
- 제품 정보는 100% 정확하게 전달하되, 대사는 자유롭게 변형 가능합니다

---

**📢 중요**: 위 가이드는 참고용이며, 크리에이터님의 창의성을 최대한 발휘하여 자연스럽고 진정성 있는 콘텐츠를 제작해주세요!`

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + process.env.GEMINI_API_KEY,
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
        guide: personalizedGuide,
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
