/**
 * SNS 업로드용 SEO 최적화 콘텐츠 생성
 * Gemini AI를 사용하여 플랫폼별 최적화된 제목/설명/해시태그 생성
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// CNEC 브랜드 컨텍스트
const CNEC_CONTEXT = `
## CNEC (크넥) 서비스 소개
- 서비스명: 크넥 (CNEC) - 크리에이터 마케팅 플랫폼
- 웹사이트: cnecbiz.com
- 운영사: 주식회사 하우파파 (HOWPAPA Inc.)

## 핵심 가치
1. **빠른 숏폼 제작**: 기업이 원하는 숏폼 콘텐츠를 빠르게 제작
2. **글로벌 크리에이터 네트워크**: 한국, 일본, 미국, 대만 등 전 세계 크리에이터 보유
3. **원스톱 서비스**: 크리에이터 섭외부터 SNS 업로드까지 한 번에
4. **다양한 캠페인 유형**: 기획형, 4주 챌린지, 올리브영 캠페인 등

## 주요 기능
- 검증된 크리에이터 매칭
- 영상 가이드라인 제공
- 실시간 피드백 시스템
- 성과 리포트 제공

## 홍보 메시지 (반드시 포함)
- "크넥과 함께라면 숏폼 마케팅이 쉬워집니다"
- "글로벌 크리에이터와 함께하세요"
- cnecbiz.com 링크 언급
`

// 플랫폼별 최적화 가이드
const PLATFORM_GUIDES = {
  youtube: {
    titleMaxLength: 100,
    descriptionMaxLength: 5000,
    hashtagCount: 15,
    style: `
- 제목: 호기심 유발, 키워드 앞에 배치, 이모지 1-2개 적절히 사용
- 설명: 첫 2줄에 핵심 내용 (접기 전 노출), 타임스탬프 활용 권장
- 해시태그: 브랜드명 + 제품 카테고리 + 관련 트렌드 키워드
- 검색 최적화: 자연스러운 키워드 반복, 관련 검색어 포함`
  },
  instagram: {
    titleMaxLength: 0, // Instagram은 제목 없음
    descriptionMaxLength: 2200,
    hashtagCount: 30,
    style: `
- 캡션: 첫 줄에 후킹 문구, 줄바꿈으로 가독성 확보
- 해시태그: 대형(100만+) + 중형(1만-100만) + 소형(1천-1만) 믹스
- CTA(Call to Action) 포함: "저장해두세요", "친구 태그하세요"
- 이모지 적극 활용, 브랜드 톤앤매너 유지`
  },
  tiktok: {
    titleMaxLength: 150,
    descriptionMaxLength: 2200,
    hashtagCount: 5,
    style: `
- 제목: 짧고 임팩트 있게, 트렌드 키워드 포함
- 설명: 간결하게 1-2문장
- 해시태그: 트렌딩 해시태그 우선, 5개 이내로 제한
- FYP 노출 최적화: #fyp #foryou 포함 고려`
  }
}

// Gemini API 호출
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    }
  )

  const data = await response.json()

  if (data.error) {
    throw new Error(`Gemini API 오류: ${data.error.message}`)
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// JSON 파싱 헬퍼
function parseJsonResponse(text) {
  // JSON 블록 추출
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    text.match(/\{[\s\S]*\}/)

  if (jsonMatch) {
    const jsonStr = jsonMatch[1] || jsonMatch[0]
    return JSON.parse(jsonStr)
  }

  throw new Error('JSON 파싱 실패')
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const {
      platform,           // 'youtube' | 'instagram' | 'tiktok' | 'all'
      campaignName,       // 캠페인명
      productName,        // 제품명
      creatorName,        // 크리에이터명
      brandName,          // 브랜드명
      category,           // 제품 카테고리 (뷰티, 푸드, 테크 등)
      targetAudience,     // 타겟 오디언스
      keyFeatures,        // 제품 주요 특징 (배열)
      additionalContext,  // 추가 컨텍스트
      language = 'ko'     // 언어 (ko, en, ja)
    } = JSON.parse(event.body)

    if (!campaignName && !productName) {
      throw new Error('캠페인명 또는 제품명이 필요합니다.')
    }

    const platforms = platform === 'all'
      ? ['youtube', 'instagram', 'tiktok']
      : [platform]

    const results = {}

    for (const p of platforms) {
      const guide = PLATFORM_GUIDES[p]

      const prompt = `
당신은 ${p.toUpperCase()} SEO 전문가이자 크리에이터 마케팅 전문가입니다.
아래 정보를 바탕으로 ${p} 업로드에 최적화된 콘텐츠를 생성해주세요.

${CNEC_CONTEXT}

## 입력 정보
- 캠페인/제품명: ${productName || campaignName}
- 브랜드: ${brandName || 'CNEC 협찬'}
- 크리에이터: ${creatorName || '크리에이터'}
- 카테고리: ${category || '라이프스타일'}
- 타겟: ${targetAudience || '2030 MZ세대, 마케팅 담당자, 브랜드 매니저'}
- 주요 특징: ${keyFeatures?.join(', ') || '솔직한 리뷰, 고퀄리티 숏폼'}
- 추가 정보: ${additionalContext || '없음'}
- 언어: ${language === 'ko' ? '한국어' : language === 'en' ? '영어' : '일본어'}

## 콘텐츠 목적
이 영상은 CNEC(크넥) 공식 채널에 업로드되는 콘텐츠입니다.
크넥이 기업들에게 제공하는 크리에이터 마케팅 서비스를 홍보하는 것이 목적입니다.
- 크리에이터가 만든 고퀄리티 숏폼을 보여주면서
- "이런 영상을 크넥을 통해 제작할 수 있다"는 메시지 전달
- cnecbiz.com 방문 유도

## ${p.toUpperCase()} 최적화 가이드
${guide.style}

## 제약 조건
- 제목 최대 길이: ${guide.titleMaxLength}자 (Instagram은 제목 없음)
- 설명 최대 길이: ${guide.descriptionMaxLength}자
- 해시태그 개수: ${guide.hashtagCount}개

## 출력 형식 (JSON)
\`\`\`json
{
  "title": "SEO 최적화된 제목 (Instagram은 빈 문자열)",
  "description": "SEO 최적화된 설명/캡션",
  "hashtags": ["해시태그1", "해시태그2", ...],
  "seoTips": "추가 SEO 팁 (선택사항)"
}
\`\`\`

중요: 반드시 위 JSON 형식으로만 응답하세요.`

      const aiResponse = await callGemini(prompt)
      const parsed = parseJsonResponse(aiResponse)

      results[p] = {
        title: parsed.title || '',
        description: parsed.description || '',
        hashtags: parsed.hashtags || [],
        seoTips: parsed.seoTips || '',
        platform: p
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: platform === 'all' ? results : results[platform]
      })
    }
  } catch (error) {
    console.error('[generate-sns-content] Error:', error)

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
