import OpenAI from 'openai'

// Initialize OpenAI client to use Gemini
const client = new OpenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  dangerouslyAllowBrowser: true
})

/**
 * Analyze creator profile and generate evaluation score
 * @param {Object} creatorData - Creator information
 * @param {Object} campaignData - Campaign requirements
 * @returns {Object} - Evaluation result with score and recommendation
 */
export async function analyzeCreator(creatorData, campaignData) {
  try {
    const prompt = `
당신은 인플루언서 마케팅 전문가입니다. 다음 크리에이터를 평가해주세요.

## 크리에이터 정보
- 플랫폼: ${creatorData.platform}
- 채널/계정: ${creatorData.channel_name}
- 구독자/팔로워: ${creatorData.followers?.toLocaleString()}명
- 평균 조회수: ${creatorData.avg_views?.toLocaleString()}회
- 평균 좋아요: ${creatorData.avg_likes?.toLocaleString()}개
- 평균 댓글: ${creatorData.avg_comments?.toLocaleString()}개
- 콘텐츠 카테고리: ${creatorData.category}
- 타겟 오디언스: ${creatorData.target_audience}
- 대표 영상 URL: ${creatorData.sample_videos?.join(', ')}

## 캠페인 요구사항
- 브랜드: ${campaignData.brand_name}
- 제품: ${campaignData.product_name}
- 브랜드 아이덴티티: ${campaignData.brand_identity}
- 타겟 고객: ${campaignData.target_customer}

다음 형식으로 평가해주세요:

{
  "total_score": 85,
  "recommendation_level": "강력 추천",
  "brand_fit_score": 28,
  "engagement_score": 22,
  "quality_score": 20,
  "trust_score": 15,
  "strengths": [
    "뷰티 콘텐츠 전문가로 20-30대 여성 팔로워 다수",
    "평균 참여율 8.5%로 업계 평균 대비 우수",
    "일주일에 3회 꾸준한 업로드"
  ],
  "concerns": [
    "최근 3개월간 조회수 10% 감소 추세",
    "제품 리뷰 시 과도한 홍보성 표현 사용"
  ],
  "recommendations": [
    "자연스러운 일상 루틴에 제품 녹여내기",
    "솔직한 장단점 언급으로 신뢰도 확보",
    "스토리텔링 중심 콘텐츠 제작"
  ],
  "summary": "이 크리에이터는 귀사의 브랜드에 매우 적합합니다. 뷰티 카테고리에서 높은 참여율을 보이고 있으며, 타겟 오디언스가 정확히 일치합니다."
}

JSON 형식으로만 응답해주세요.
`

    const response = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: '당신은 인플루언서 마케팅 전문가입니다. 크리에이터를 객관적으로 평가하고 JSON 형식으로 응답합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('Error analyzing creator:', error)
    throw error
  }
}

/**
 * Generate personalized campaign guide for creator
 * @param {Object} creatorData - Creator information
 * @param {Object} campaignData - Campaign requirements
 * @param {Object} evaluation - Creator evaluation result
 * @returns {Object} - Generated guide
 */
export async function generateGuide(creatorData, campaignData, evaluation) {
  try {
    const prompt = `
당신은 인플루언서 마케팅 가이드 작성 전문가입니다. 다음 정보를 바탕으로 크리에이터를 위한 상세한 촬영 가이드를 작성해주세요.

## 크리에이터 정보
- 플랫폼: ${creatorData.platform}
- 채널: ${creatorData.channel_name}
- 콘텐츠 스타일: ${creatorData.content_style}
- 강점: ${evaluation.strengths?.join(', ')}

## 캠페인 정보
- 브랜드: ${campaignData.brand_name}
- 제품: ${campaignData.product_name}
- 제품 URL: ${campaignData.product_url}
- 브랜드 아이덴티티: ${campaignData.brand_identity}
- 필수 대사: ${campaignData.required_dialogue}
- 필수 장면: ${campaignData.required_scenes}
- 제품 설명: ${campaignData.product_description}
- 가이드라인: ${campaignData.guidelines}

다음 형식으로 가이드를 작성해주세요:

{
  "title": "캠페인 제목",
  "overview": "캠페인 개요 (2-3문장)",
  "objectives": [
    "목표 1",
    "목표 2",
    "목표 3"
  ],
  "script_suggestions": [
    {
      "timing": "오프닝 (0:00-0:10)",
      "dialogue": "추천 대사",
      "notes": "연출 팁"
    },
    {
      "timing": "제품 소개 (0:10-0:30)",
      "dialogue": "추천 대사",
      "notes": "연출 팁"
    },
    {
      "timing": "사용 시연 (0:30-0:50)",
      "dialogue": "추천 대사",
      "notes": "연출 팁"
    },
    {
      "timing": "마무리 (0:50-1:00)",
      "dialogue": "추천 대사",
      "notes": "연출 팁"
    }
  ],
  "scene_breakdown": [
    {
      "scene_number": 1,
      "description": "장면 설명",
      "duration": "예상 길이",
      "key_points": ["포인트 1", "포인트 2"]
    }
  ],
  "required_elements": {
    "must_say": ["필수 언급 사항 1", "필수 언급 사항 2"],
    "must_show": ["필수 촬영 장면 1", "필수 촬영 장면 2"],
    "hashtags": ["#해시태그1", "#해시태그2"]
  },
  "dos_and_donts": {
    "dos": ["해야 할 것 1", "해야 할 것 2"],
    "donts": ["하지 말아야 할 것 1", "하지 말아야 할 것 2"]
  },
  "technical_specs": {
    "video_length": "30초 ~ 1분",
    "aspect_ratio": "9:16 (세로) 또는 16:9 (가로)",
    "resolution": "1080p 이상",
    "format": "MP4"
  },
  "tips": [
    "팁 1",
    "팁 2",
    "팁 3"
  ]
}

JSON 형식으로만 응답해주세요. 가독성 좋게 명확하고 간결하게 작성해주세요.
`

    const response = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: '당신은 인플루언서 마케팅 가이드 작성 전문가입니다. 명확하고 실행 가능한 가이드를 JSON 형식으로 작성합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3000
    })

    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('Error generating guide:', error)
    throw error
  }
}

/**
 * Translate guide to target language
 * @param {Object} guide - Guide content
 * @param {string} targetLanguage - Target language (ja, en, zh-TW)
 * @returns {Object} - Translated guide
 */
export async function translateGuide(guide, targetLanguage) {
  try {
    const languageNames = {
      ja: '일본어',
      en: '영어',
      'zh-TW': '중국어 번체'
    }

    const prompt = `
다음 캠페인 가이드를 ${languageNames[targetLanguage]}로 번역해주세요.
원본의 구조와 형식을 그대로 유지하면서, 자연스럽고 현지화된 번역을 제공해주세요.

원본 가이드:
${JSON.stringify(guide, null, 2)}

번역된 가이드를 동일한 JSON 구조로 응답해주세요.
`

    const response = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `당신은 전문 번역가입니다. 마케팅 콘텐츠를 ${languageNames[targetLanguage]}로 자연스럽게 번역합니다.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })

    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('Error translating guide:', error)
    throw error
  }
}

/**
 * Get recommendation badge based on score
 * @param {number} score - Total score (0-100)
 * @returns {Object} - Badge information
 */
export function getRecommendationBadge(score) {
  if (score >= 90) {
    return {
      level: '최우수 추천',
      emoji: '🏆',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      description: '이 크리에이터는 귀사의 브랜드에 완벽하게 적합합니다'
    }
  } else if (score >= 80) {
    return {
      level: '강력 추천',
      emoji: '⭐',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      description: '이 크리에이터는 귀사의 브랜드에 매우 적합합니다'
    }
  } else if (score >= 70) {
    return {
      level: '추천',
      emoji: '✓',
      color: 'bg-green-100 text-green-800 border-green-300',
      description: '이 크리에이터는 귀사의 브랜드에 적합합니다'
    }
  } else if (score >= 60) {
    return {
      level: '일반',
      emoji: '○',
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      description: '이 크리에이터는 기본 요건을 충족합니다'
    }
  } else {
    return {
      level: '검토 필요',
      emoji: '⚠️',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      description: '이 크리에이터는 추가 검토가 필요합니다'
    }
  }
}

/**
 * Format evaluation result for display
 * @param {Object} evaluation - Evaluation result
 * @returns {Object} - Formatted evaluation
 */
export function formatEvaluation(evaluation) {
  const badge = getRecommendationBadge(evaluation.total_score)
  
  return {
    ...evaluation,
    badge,
    score_breakdown: [
      {
        category: '브랜드 적합도',
        score: evaluation.brand_fit_score,
        max: 30,
        percentage: (evaluation.brand_fit_score / 30 * 100).toFixed(0)
      },
      {
        category: '참여율',
        score: evaluation.engagement_score,
        max: 25,
        percentage: (evaluation.engagement_score / 25 * 100).toFixed(0)
      },
      {
        category: '콘텐츠 품질',
        score: evaluation.quality_score,
        max: 25,
        percentage: (evaluation.quality_score / 25 * 100).toFixed(0)
      },
      {
        category: '신뢰도',
        score: evaluation.trust_score,
        max: 20,
        percentage: (evaluation.trust_score / 20 * 100).toFixed(0)
      }
    ]
  }
}

