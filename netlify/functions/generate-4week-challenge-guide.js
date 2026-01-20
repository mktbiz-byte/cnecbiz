const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { campaign, weekNumber, individualMessage, creatorName } = JSON.parse(event.body)

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // challenge_weekly_guides에서 해당 주차 데이터 가져오기
    const weeklyGuides = campaign.challenge_weekly_guides || {}
    const weekKey = `week${weekNumber}`
    const weekData = weeklyGuides[weekKey] || {}

    const prompt = `당신은 4주 챌린지 캠페인의 크리에이터를 위한 주차별 촬영 가이드를 작성하는 전문가입니다.

아래 정보를 바탕으로 크리에이터가 바로 촬영할 수 있도록 구체적이고 실용적인 ${weekNumber}주차 가이드를 작성해주세요.

## 제품 정보
- 브랜드: ${campaign.brand || ''}
- 제품명: ${campaign.product_name || ''}
- 제품 설명: ${campaign.product_description || ''}
- 제품 특징: ${campaign.product_features || ''}

## ${weekNumber}주차 미션
${weekData.mission || '없음'}

## ${weekNumber}주차 필수 대사
${weekData.required_dialogue || '없음'}

## ${weekNumber}주차 필수 장면
${weekData.required_scenes || '없음'}

## ${weekNumber}주차 레퍼런스 영상
${weekData.reference_url || '없음'}

## ${weekNumber}주차 필수 해시태그
${weekData.required_hashtags || '없음'}

${individualMessage ? `\n## ${creatorName}님을 위한 개별 요청사항\n${individualMessage}` : ''}

---

위 정보를 바탕으로 아래 형식에 맞춰 ${weekNumber}주차 촬영 가이드를 작성해주세요:

# 🎯 ${creatorName}님을 위한 ${weekNumber}주차 챌린지 가이드

## 📦 제품 정보
[제품명, 브랜드, 주요 특징을 간단명료하게 정리]

## 🎬 ${weekNumber}주차 미션
[이번 주차의 미션과 목표를 명확하게 설명]

### 촬영 가이드
- [구체적인 촬영 방법 1]
- [구체적인 촬영 방법 2]
- [구체적인 촬영 방법 3]

### 필수 포함 내용
- [반드시 포함해야 할 내용 1]
- [반드시 포함해야 할 내용 2]
- [반드시 포함해야 할 내용 3]

## 💬 필수 대사
[크리에이터가 영상에서 꼭 말해야 할 대사를 명확하게 제시]

## 📸 필수 장면
[반드시 촬영해야 할 장면들을 구체적으로 나열]
- [필수 장면 1]
- [필수 장면 2]
- [필수 장면 3]

## #️⃣ 필수 해시태그
[영상에 반드시 포함해야 할 해시태그를 명확하게 제시]

## 💡 촬영 팁
- [도움이 되는 촬영 팁 1]
- [도움이 되는 촬영 팁 2]
- [도움이 되는 촬영 팁 3]

${weekData.reference_url ? `\n## 🎥 레퍼런스 영상\n${weekData.reference_url}\n위 영상을 참고하여 촬영해주세요!` : ''}

${individualMessage ? `\n## 💌 ${creatorName}님께 특별히 요청드립니다\n[개별 요청사항을 친근하고 구체적으로 작성]` : ''}

## ⚠️ 주의사항
- 제품의 효능을 과장하지 말아주세요
- 자연스러운 사용 후기 형식으로 촬영해주세요
- 촬영 전 제품을 충분히 사용해보시고 솔직한 느낌을 전달해주세요

---
📞 문의사항이 있으시면 언제든지 연락주세요!
다음 주차 미션도 기대해주세요! 💪

**작성 시 주의사항:**
1. 크리에이터가 바로 이해하고 실행할 수 있도록 구체적으로 작성
2. 친근하고 격려하는 톤으로 작성
3. 각 섹션은 명확하고 실용적인 정보로 구성
4. 불필요한 내용은 제외하고 핵심만 전달
5. 이모지를 적절히 활용하여 가독성 향상
6. ${weekNumber}주차의 특성을 반영한 내용 작성`

    const result = await model.generateContent(prompt)
    const guide = result.response.text()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guide })
    }
  } catch (error) {
    console.error('Error generating 4-week challenge guide:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate guide',
        details: error.message 
      })
    }
  }
}
