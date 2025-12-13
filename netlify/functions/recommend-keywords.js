// AI 키워드 추천 API - 상품 정보 기반 키워드 & 가이드 추천
// Using fetch API instead of SDK for simpler deployment

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

    // API Key 확인
    const apiKey = process.env.ANTHROPIC_API_KEY

    let recommendations

    if (apiKey) {
      // Anthropic API 호출 (fetch 사용)
      try {
        const prompt = `당신은 한국의 뷰티/라이프스타일 인플루언서 마케팅 전문가입니다.
다음 상품 정보를 바탕으로 숏폼 콘텐츠용 추천 키워드와 가이드 요소를 제안해주세요.

상품명: ${product_name}
브랜드: ${brand_name || '미입력'}
상품 설명: ${product_description || '미입력'}
캠페인 유형: ${campaign_type === 'oliveyoung' ? '올영세일' : campaign_type === '4week_challenge' ? '4주 챌린지' : '기획형 숏폼'}

다음 JSON 형식으로만 응답해주세요:
{"keywords":["키워드1","키워드2"],"hooking_point":"1초후킹예시","core_message":"핵심메시지","recommended_missions":["before_after","closeup"],"video_style":{"duration":"30s","tempo":"normal","tone":"bright"}}`

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
          })
        })

        if (response.ok) {
          const result = await response.json()
          const aiResponse = result.content[0].text.trim()
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            recommendations = JSON.parse(jsonMatch[0])
          }
        }
      } catch (apiError) {
        console.error('[recommend-keywords] API error:', apiError)
      }
    }

    // API 실패 또는 API Key 없으면 스마트 기본값 생성
    if (!recommendations) {
      recommendations = generateSmartDefaults(product_name, brand_name, campaign_type)
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

// 스마트 기본값 생성
function generateSmartDefaults(productName, brandName, campaignType) {
  // 상품명에서 키워드 추출
  const productWords = productName
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .slice(0, 3)

  // 캠페인 타입별 키워드
  const typeKeywords = {
    'oliveyoung': ['올영픽', '올리브영추천', '뷰티템'],
    '4week_challenge': ['4주챌린지', '변화일기', '꾸준히'],
    'planned': ['추천템', '인생템', '찐리뷰']
  }

  const baseKeywords = typeKeywords[campaignType] || typeKeywords['planned']
  const keywords = [...productWords, ...baseKeywords, '솔직후기', '데일리'].slice(0, 8)

  // 캠페인 타입별 미션 추천
  const typeMissions = {
    'oliveyoung': ['store_visit', 'before_after', 'price_info'],
    '4week_challenge': ['before_after', '7day_review'],
    'planned': ['before_after', 'closeup', 'texture']
  }

  return {
    keywords,
    hooking_point: `${productName} 써봤는데 진짜 대박이에요!`,
    core_message: `${brandName || '이 제품'}의 놀라운 효과를 직접 경험해보세요`,
    recommended_missions: typeMissions[campaignType] || typeMissions['planned'],
    video_style: {
      duration: '30s',
      tempo: 'normal',
      tone: 'bright'
    }
  }
}
