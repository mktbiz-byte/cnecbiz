// AI 키워드 추천 API - 상품 정보 기반 키워드 & 가이드 추천
const Anthropic = require('@anthropic-ai/sdk')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { product_name, brand_name, product_description, campaign_type } = JSON.parse(event.body)

    if (!product_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'product_name is required' })
      }
    }

    console.log('[recommend-keywords] Processing:', { product_name, brand_name, campaign_type })

    // Anthropic API 사용
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const prompt = `당신은 한국의 뷰티/라이프스타일 인플루언서 마케팅 전문가입니다.
다음 상품 정보를 바탕으로 숏폼 콘텐츠용 추천 키워드와 가이드 요소를 제안해주세요.

상품명: ${product_name}
브랜드: ${brand_name || '미입력'}
상품 설명: ${product_description || '미입력'}
캠페인 유형: ${campaign_type === 'oliveyoung' ? '올영세일' : campaign_type === '4week_challenge' ? '4주 챌린지' : '기획형 숏폼'}

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "keywords": ["키워드1", "키워드2", ...], // 10개 이내, 상품 특징을 담은 해시태그용 키워드
  "hooking_point": "1초 후킹 포인트 예시 문장", // 50자 이내
  "core_message": "핵심 메시지 예시", // 100자 이내
  "recommended_missions": ["mission_id1", "mission_id2"], // 아래 미션 ID 중 선택
  "video_style": {
    "duration": "30s", // 15s, 30s, 60s 중 선택
    "tempo": "normal", // fast, normal, slow 중 선택
    "tone": "bright" // bright, calm, professional, humorous, asmr 중 선택
  }
}

사용 가능한 미션 ID:
- before_after: Before & After 보여주기
- closeup: 제품 사용 장면 클로즈업
- texture: 제품 텍스처 보여주기
- store_visit: 올리브영 매장 방문 인증
- 7day_review: 7일 사용 후기 기록
- price_info: 가격/혜택 정보 언급
- purchase_link: 구매 링크 유도`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const aiResponse = response.content[0].text.trim()

    // JSON 파싱
    let recommendations
    try {
      // JSON 블록 추출 (```json ... ``` 형식 처리)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('[recommend-keywords] JSON parse error:', parseError)
      // 파싱 실패시 기본값
      recommendations = {
        keywords: getDefaultKeywords(product_name),
        hooking_point: `${product_name} 써봤는데 대박이에요`,
        core_message: `${brand_name || '이 제품'}의 놀라운 효과를 직접 경험해보세요`,
        recommended_missions: ['before_after', 'closeup'],
        video_style: {
          duration: '30s',
          tempo: 'normal',
          tone: 'bright'
        }
      }
    }

    console.log('[recommend-keywords] Recommendations:', recommendations)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: recommendations
      })
    }

  } catch (error) {
    console.error('[recommend-keywords] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}

// 기본 키워드 생성
function getDefaultKeywords(productName) {
  const baseKeywords = ['추천템', '인생템', '찐리뷰', '솔직리뷰', '데일리']

  // 상품명에서 키워드 추출
  const words = productName
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .slice(0, 3)

  return [...words, ...baseKeywords].slice(0, 8)
}
