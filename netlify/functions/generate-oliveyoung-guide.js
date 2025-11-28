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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { campaignInfo, existingData } = JSON.parse(event.body)

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Generate guide for each step
    const generatedGuide = {
      step1: await generateStepGuide(model, campaignInfo, existingData.step1, '세일 전 가이드', '올리브영 세일 전에 제품을 소개하고 기대감을 높이는'),
      step2: await generateStepGuide(model, campaignInfo, existingData.step2, '세일 당일 영상 가이드', '올리브영 세일 당일에 제품을 구매하도록 유도하는'),
      step3: await generateStepGuide(model, campaignInfo, existingData.step3, '스토리 URL 가이드', '인스타그램 스토리에 올리브영 구매 링크를 삽입하는')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ generatedGuide })
    }
  } catch (error) {
    console.error('Error generating Olive Young guide:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to generate guide' })
    }
  }
}

async function generateStepGuide(model, campaignInfo, existingStepData, stepName, stepPurpose) {
  const prompt = `당신은 올리브영 세일 캠페인의 크리에이터 가이드를 작성하는 전문가입니다.

**캠페인 정보:**
- 브랜드: ${campaignInfo.brand}
- 제품명: ${campaignInfo.product_name}
- 캠페인 설명: ${campaignInfo.campaign_description || '없음'}
- 핵심 메시지: ${campaignInfo.key_messages || '없음'}

**가이드 단계:** ${stepName}
**목적:** ${stepPurpose} 영상 가이드

**관리자가 입력한 정보:**
- 참고 영상 URL: ${existingStepData.reference_urls}
${existingStepData.required_dialogue ? `- 필수 대사: ${existingStepData.required_dialogue}` : ''}
${existingStepData.required_scenes ? `- 필수 장면: ${existingStepData.required_scenes}` : ''}
${existingStepData.examples ? `- 예시: ${existingStepData.examples}` : ''}

**작업:**
관리자가 입력한 정보를 **절대 수정하지 말고 그대로 유지**하면서, 비어있는 필드만 자동으로 생성해주세요.

1. **필수 대사** (비어있으면 생성):
   - 크리에이터가 반드시 말해야 하는 3-5개의 핵심 대사
   - 자연스럽고 진정성 있는 톤으로 작성
   - 제품의 핵심 가치와 올리브영 세일 정보 포함

2. **필수 장면** (비어있으면 생성):
   - 반드시 포함되어야 하는 5-7개의 장면
   - 구체적이고 실행 가능한 촬영 가이드
   - 제품 클로즈업, 사용 장면, 결과 등 포함

3. **예시** (비어있으면 생성):
   - 3-5개의 구체적인 실행 예시
   - 크리에이터가 바로 따라할 수 있는 수준으로 상세하게
   - 다양한 스타일과 접근 방식 제시

**응답 형식 (JSON):**
{
  "required_dialogue": "관리자가 입력한 내용 또는 새로 생성한 내용",
  "required_scenes": "관리자가 입력한 내용 또는 새로 생성한 내용",
  "examples": "관리자가 입력한 내용 또는 새로 생성한 내용",
  "reference_urls": "${existingStepData.reference_urls}"
}

**중요:**
- 참고 영상 URL은 절대 변경하지 마세요
- 관리자가 이미 입력한 필드는 그대로 유지하세요
- 비어있는 필드만 생성하세요
- JSON 형식으로만 응답하세요`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid AI response format')
  }
  
  const generatedData = JSON.parse(jsonMatch[0])
  
  // Merge with existing data (prioritize existing data)
  return {
    reference_urls: existingStepData.reference_urls, // Always keep original
    required_dialogue: existingStepData.required_dialogue || generatedData.required_dialogue,
    required_scenes: existingStepData.required_scenes || generatedData.required_scenes,
    examples: existingStepData.examples || generatedData.examples
  }
}
