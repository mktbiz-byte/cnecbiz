const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
}

// 한국어 프롬프트
const getKoreanPrompt = ({ campaign, weekNumber, weekData, individualMessage, creatorName }) => `당신은 4주 챌린지 캠페인의 크리에이터를 위한 주차별 촬영 가이드를 작성하는 전문가입니다.

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

// 영어 프롬프트 (US 크리에이터용)
const getEnglishPrompt = ({ campaign, weekNumber, weekData, weekDataEn, individualMessage, creatorName }) => `You are an expert at writing weekly shooting guides for creators in 4-week challenge campaigns targeting the US market.

Based on the information below, write a specific and practical Week ${weekNumber} guide that the creator can immediately use for filming.

## Product Info
- Brand: ${weekDataEn?.product_info || campaign.brand || ''}
- Product: ${campaign.product_name || ''}
- Description: ${campaign.product_description || ''}
- Features: ${campaign.product_features || ''}

## Week ${weekNumber} Mission
${weekDataEn?.mission || weekData.mission || 'None'}

## Week ${weekNumber} Required Lines
${weekDataEn?.required_dialogue || weekData.required_dialogue || 'None'}

## Week ${weekNumber} Required Scenes
${weekDataEn?.required_scenes || weekData.required_scenes || 'None'}

## Week ${weekNumber} Reference Video
${weekData.reference_url || 'None'}

## Week ${weekNumber} Required Hashtags
${weekData.required_hashtags || 'None'}

${individualMessage ? `\n## Special Request for ${creatorName}\n${individualMessage}` : ''}

---

Based on the above, write the Week ${weekNumber} shooting guide in the following format:

# 🎯 Week ${weekNumber} Challenge Guide for ${creatorName}

## 📦 Product Info
[Summarize product name, brand, and key features concisely]

## 🎬 Week ${weekNumber} Mission
[Clearly explain this week's mission and goals]

### Shooting Guide
- [Specific filming method 1]
- [Specific filming method 2]
- [Specific filming method 3]

### Must-Include Content
- [Required content 1]
- [Required content 2]
- [Required content 3]

## 💬 Required Lines
[Clearly state the lines the creator must say in the video]

## 📸 Required Scenes
[List specific scenes that must be filmed]
- [Required scene 1]
- [Required scene 2]
- [Required scene 3]

## #️⃣ Required Hashtags
[List hashtags that must be included in the video]

## 💡 Filming Tips
- [Helpful filming tip 1]
- [Helpful filming tip 2]
- [Helpful filming tip 3]

${weekData.reference_url ? `\n## 🎥 Reference Video\n${weekData.reference_url}\nPlease refer to the above video for inspiration!` : ''}

${individualMessage ? `\n## 💌 Special Note for ${creatorName}\n[Write the special request in a friendly and specific way]` : ''}

## ⚠️ Important Notes
- Do not exaggerate the product's effects
- Film in a natural, authentic review style
- Use the product thoroughly before filming and share your honest experience

---
📞 If you have any questions, feel free to reach out!
Stay tuned for the next week's mission! 💪

**Writing Guidelines:**
1. Write specifically so the creator can understand and execute immediately
2. Use a friendly and encouraging tone
3. Keep each section clear and practical
4. Only include essential information, skip unnecessary details
5. Use emojis appropriately for readability
6. Reflect the unique characteristics of Week ${weekNumber}
7. All content must be written in English`

// 일본어 프롬프트 (Japan 크리에이터용)
const getJapanesePrompt = ({ campaign, weekNumber, weekData, weekDataJa, individualMessage, creatorName }) => `あなたは4週間チャレンジキャンペーンのクリエイター向け週別撮影ガイドを作成する専門家です。日本市場向けに最適化されたガイドを作成してください。

以下の情報をもとに、クリエイターがすぐに撮影できるような具体的で実用的な第${weekNumber}週のガイドを作成してください。

## 商品情報
- ブランド: ${weekDataJa?.product_info || campaign.brand || ''}
- 商品名: ${campaign.product_name || ''}
- 商品説明: ${campaign.product_description || ''}
- 商品特徴: ${campaign.product_features || ''}

## 第${weekNumber}週のミッション
${weekDataJa?.mission || weekData.mission || 'なし'}

## 第${weekNumber}週の必須セリフ
${weekDataJa?.required_dialogue || weekData.required_dialogue || 'なし'}

## 第${weekNumber}週の必須シーン
${weekDataJa?.required_scenes || weekData.required_scenes || 'なし'}

## 第${weekNumber}週のリファレンス動画
${weekData.reference_url || 'なし'}

## 第${weekNumber}週の必須ハッシュタグ
${weekData.required_hashtags || 'なし'}

${individualMessage ? `\n## ${creatorName}様への個別リクエスト\n${individualMessage}` : ''}

---

上記の情報をもとに、以下の形式で第${weekNumber}週の撮影ガイドを作成してください：

# 🎯 ${creatorName}様の第${weekNumber}週チャレンジガイド

## 📦 商品情報
[商品名、ブランド、主要な特徴を簡潔にまとめる]

## 🎬 第${weekNumber}週のミッション
[今週のミッションと目標を明確に説明]

### 撮影ガイド
- [具体的な撮影方法 1]
- [具体的な撮影方法 2]
- [具体的な撮影方法 3]

### 必須コンテンツ
- [必ず含めるべき内容 1]
- [必ず含めるべき内容 2]
- [必ず含めるべき内容 3]

## 💬 必須セリフ
[動画内で必ず言うべきセリフを明確に提示]

## 📸 必須シーン
[必ず撮影するべきシーンを具体的にリストアップ]
- [必須シーン 1]
- [必須シーン 2]
- [必須シーン 3]

## #️⃣ 必須ハッシュタグ
[動画に必ず含めるべきハッシュタグを明確に提示]

## 💡 撮影のコツ
- [役立つ撮影テクニック 1]
- [役立つ撮影テクニック 2]
- [役立つ撮影テクニック 3]

${weekData.reference_url ? `\n## 🎥 リファレンス動画\n${weekData.reference_url}\n上記の動画を参考にして撮影してください！` : ''}

${individualMessage ? `\n## 💌 ${creatorName}様へのお願い\n[個別リクエストを親しみやすく具体的に記述]` : ''}

## ⚠️ 注意事項
- 商品の効果を誇張しないでください
- 自然な使用レビュー形式で撮影してください
- 撮影前に十分に商品を使用し、正直な感想をお伝えください

---
📞 ご質問がございましたら、いつでもお気軽にご連絡ください！
来週のミッションもお楽しみに！💪

**作成時の注意点：**
1. クリエイターがすぐに理解して実行できるよう具体的に作成
2. 親しみやすく励ましのあるトーンで作成
3. 各セクションは明確で実用的な情報で構成
4. 不要な内容は省き、核心のみ伝達
5. 絵文字を適切に活用し可読性を向上
6. 第${weekNumber}週の特性を反映した内容を作成
7. すべての内容は日本語で作成してください`

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { campaign, weekNumber, individualMessage, creatorName, region } = JSON.parse(event.body)

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    // challenge_weekly_guides에서 해당 주차 데이터 가져오기
    const weeklyGuides = campaign.challenge_weekly_guides || {}
    const weekKey = `week${weekNumber}`
    const weekData = weeklyGuides[weekKey] || {}

    // 번역 데이터 가져오기 (EN/JA)
    const guideDataEn = campaign.challenge_guide_data_en || {}
    const guideDataJa = campaign.challenge_guide_data_ja || {}
    const weekDataEn = guideDataEn[weekKey] || null
    const weekDataJa = guideDataJa[weekKey] || null

    // 리전별 프롬프트 선택
    let prompt
    if (region === 'us') {
      prompt = getEnglishPrompt({ campaign, weekNumber, weekData, weekDataEn, individualMessage, creatorName })
    } else if (region === 'japan') {
      prompt = getJapanesePrompt({ campaign, weekNumber, weekData, weekDataJa, individualMessage, creatorName })
    } else {
      prompt = getKoreanPrompt({ campaign, weekNumber, weekData, individualMessage, creatorName })
    }

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
