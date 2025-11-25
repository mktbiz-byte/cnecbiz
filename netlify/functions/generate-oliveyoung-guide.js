const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' }
  }

  try {
    const {
      campaignId,
      productName,
      productDescription,
      productFeatures,
      productKeyPoints,
      video1Guide,
      video1Dialogue,
      video1Scenes,
      video1Reference,
      video2Guide,
      video2Dialogue,
      video2Scenes,
      video2Reference,
      storyGuide,
      storyContent,
      storyReference
    } = JSON.parse(event.body)

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // 제품 소개 생성
    const productIntroPrompt = `
당신은 올리브영 캠페인의 크리에이터용 가이드를 작성하는 전문가입니다.
다음 정보를 바탕으로 크리에이터가 이해하기 쉽고, 촬영에 바로 활용할 수 있는 제품 소개 가이드를 작성해주세요.

제품명: ${productName}
제품 설명: ${productDescription || '정보 없음'}
제품 특징: ${productFeatures || '정보 없음'}
핵심 포인트: ${productKeyPoints || '정보 없음'}

작성 가이드:
- 제품의 핵심 특징과 효능을 명확하게 설명
- 크리에이터가 강조해야 할 포인트를 구체적으로 제시
- 타겟 고객과 사용 상황을 명시
- 친근하고 이해하기 쉬운 톤으로 작성

500자 이내로 작성해주세요.
`

    const productIntroResult = await model.generateContent(productIntroPrompt)
    const productIntro = productIntroResult.response.text()

    // 1차 영상 가이드 생성
    const video1Prompt = `
올리브영 캠페인의 1차 영상 가이드를 작성해주세요.
크리에이터가 이 가이드만 보고 바로 촬영할 수 있도록 구체적으로 작성해주세요.

제품명: ${productName}
촬영 가이드: ${video1Guide || '정보 없음'}
필수 대사: ${video1Dialogue || '정보 없음'}
필수 장면: ${video1Scenes || '정보 없음'}
레퍼런스 URL: ${video1Reference || '없음'}

작성 형식:
1. 영상 컨셉 및 목적
2. 촬영 구성 (인트로 → 메인 → 아웃트로)
3. 필수 포함 대사 (구체적으로)
4. 필수 촬영 장면 (구체적으로)
5. 촬영 팁 및 주의사항
${video1Reference ? `6. 레퍼런스 참고: ${video1Reference}` : ''}

친근하고 실용적인 톤으로 작성해주세요.
`

    const video1Result = await model.generateContent(video1Prompt)
    const video1GuideText = video1Result.response.text()

    // 2차 영상 가이드 생성
    const video2Prompt = `
올리브영 캠페인의 2차 영상 가이드를 작성해주세요.
크리에이터가 이 가이드만 보고 바로 촬영할 수 있도록 구체적으로 작성해주세요.

제품명: ${productName}
촬영 가이드: ${video2Guide || '정보 없음'}
필수 대사: ${video2Dialogue || '정보 없음'}
필수 장면: ${video2Scenes || '정보 없음'}
레퍼런스 URL: ${video2Reference || '없음'}

작성 형식:
1. 영상 컨셉 및 목적
2. 촬영 구성 (인트로 → 메인 → 아웃트로)
3. 필수 포함 대사 (구체적으로)
4. 필수 촬영 장면 (구체적으로)
5. 촬영 팁 및 주의사항
${video2Reference ? `6. 레퍼런스 참고: ${video2Reference}` : ''}

친근하고 실용적인 톤으로 작성해주세요.
`

    const video2Result = await model.generateContent(video2Prompt)
    const video2GuideText = video2Result.response.text()

    // 스토리 URL 가이드 생성
    const storyPrompt = `
올리브영 캠페인의 스토리 URL 가이드를 작성해주세요.
2차 영상 업로드 후 스토리에 URL을 태그하는 방법을 안내해주세요.

제품명: ${productName}
스토리 가이드: ${storyGuide || '정보 없음'}
필수 포함 내용: ${storyContent || '정보 없음'}
레퍼런스 URL: ${storyReference || '없음'}

작성 형식:
1. 스토리 URL 태그 목적
2. 업로드 순서 (2차 영상 업로드 → 스토리 URL 태그)
3. 스토리에 포함할 내용 (텍스트, 해시태그, 멘션 등)
4. URL 태그 방법 (구체적인 단계)
5. 주의사항
${storyReference ? `6. 레퍼런스 참고: ${storyReference}` : ''}

친근하고 실용적인 톤으로 작성해주세요.
`

    const storyResult = await model.generateContent(storyPrompt)
    const storyGuideText = storyResult.response.text()

    // 주의사항 생성
    const cautionsPrompt = `
올리브영 캠페인의 주의사항을 작성해주세요.
크리에이터가 반드시 지켜야 할 사항들을 명확하게 안내해주세요.

제품명: ${productName}
제품 특징: ${productFeatures || '정보 없음'}
핵심 포인트: ${productKeyPoints || '정보 없음'}

작성 형식:
1. 제품 관련 주의사항 (과장 금지, 정확한 정보 전달 등)
2. 촬영 관련 주의사항 (필수 장면, 금지 사항 등)
3. 업로드 관련 주의사항 (해시태그, 멘션, 타이밍 등)
4. 기타 준수 사항

명확하고 구체적으로 작성해주세요.
`

    const cautionsResult = await model.generateContent(cautionsPrompt)
    const cautions = cautionsResult.response.text()

    const guide = {
      product_intro: productIntro,
      video1_guide: video1GuideText,
      video2_guide: video2GuideText,
      story_guide: storyGuideText,
      cautions: cautions
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ guide })
    }
  } catch (error) {
    console.error('AI 가이드 생성 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
