const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { campaign, individualMessage, creatorName } = JSON.parse(event.body)

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `당신은 올리브영 캠페인의 크리에이터를 위한 촬영 가이드를 작성하는 전문가입니다.

아래 정보를 바탕으로 크리에이터가 바로 촬영할 수 있도록 구체적이고 실용적인 최종 가이드를 작성해주세요.

## 캠페인 정보
- 브랜드: ${campaign.brand || ''}
- 제품명: ${campaign.product_name || ''}
- 제품 설명: ${campaign.product_description || ''}
- 제품 특징: ${campaign.product_features || ''}
- 제품 핵심 포인트: ${campaign.product_key_points || ''}

## 1차 영상 가이드
${campaign.oliveyoung_step1_guide || '없음'}

## 2차 영상 가이드
${campaign.oliveyoung_step2_guide || '없음'}

## 스토리 URL 가이드
${campaign.oliveyoung_step3_guide || '없음'}

## 필수 대사
${campaign.required_dialogues ? JSON.stringify(campaign.required_dialogues, null, 2) : '없음'}

## 필수 장면
${campaign.required_scenes ? JSON.stringify(campaign.required_scenes, null, 2) : '없음'}

## 추가 요청사항
${campaign.additional_details || '없음'}

${individualMessage ? `\n## ${creatorName}님을 위한 개별 요청사항\n${individualMessage}` : ''}

---

위 정보를 바탕으로 아래 형식에 맞춰 최종 촬영 가이드를 작성해주세요:

# 📸 ${creatorName}님을 위한 올리브영 캠페인 촬영 가이드

## 📦 제품 정보
[제품명, 브랜드, 주요 특징을 간단명료하게 정리]

## 🎬 1차 영상 가이드
[1차 영상의 목적, 길이, 톤앤매너, 촬영 팁을 구체적으로 작성]

### 필수 포함 내용
- [항목 1]
- [항목 2]
- [항목 3]

### 촬영 팁
- [팁 1]
- [팁 2]

## 🎥 2차 영상 가이드
[2차 영상의 목적, 길이, 톤앤매너, 촬영 팁을 구체적으로 작성]

### 필수 포함 내용
- [항목 1]
- [항목 2]
- [항목 3]

### 촬영 팁
- [팁 1]
- [팁 2]

## 📱 스토리 URL 가이드
[스토리 URL 콘텐츠의 목적, 형식, 업로드 방법을 구체적으로 작성]

### 필수 포함 내용
- [항목 1]
- [항목 2]

## ✅ 필수사항
[반드시 지켜야 할 사항들을 명확하게 나열]
- [필수사항 1]
- [필수사항 2]
- [필수사항 3]

## ⚠️ 주의사항
[주의해야 할 사항들을 명확하게 나열]
- [주의사항 1]
- [주의사항 2]
- [주의사항 3]

${individualMessage ? `\n## 💌 ${creatorName}님께 특별히 요청드립니다\n[개별 요청사항을 친근하고 구체적으로 작성]` : ''}

---
📞 문의사항이 있으시면 언제든지 연락주세요!

**작성 시 주의사항:**
1. 크리에이터가 바로 이해하고 실행할 수 있도록 구체적으로 작성
2. 친근하고 격려하는 톤으로 작성
3. 각 섹션은 명확하고 실용적인 정보로 구성
4. 불필요한 내용은 제외하고 핵심만 전달
5. 이모지를 적절히 활용하여 가독성 향상`

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
    console.error('Error generating OliveYoung final guide:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate guide',
        details: error.message 
      })
    }
  }
}
