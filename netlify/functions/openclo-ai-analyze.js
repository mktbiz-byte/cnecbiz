const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    const { creator_id, creator_ids } = JSON.parse(event.body || '{}')
    const ids = creator_ids || (creator_id ? [creator_id] : [])

    if (ids.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'creator_id required' }) }
    }

    const results = []
    for (const id of ids) {
      try {
        const result = await analyzeCreator(id)
        results.push({ id, success: true, ...result })
      } catch (err) {
        results.push({ id, success: false, error: err.message })
      }
      // API 호출 간 딜레이
      if (ids.length > 1) await sleep(1000)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results })
    }
  } catch (error) {
    console.error('[openclo-ai-analyze] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}

async function analyzeCreator(creatorId) {
  const { data: creator, error } = await supabase
    .from('oc_creators')
    .select('*')
    .eq('id', creatorId)
    .single()

  if (error || !creator) throw new Error('Creator not found')

  const prompt = buildPrompt(creator)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    }
  )

  const geminiResult = await response.json()
  const textContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textContent) throw new Error('Empty Gemini response')

  let analysis
  try {
    analysis = JSON.parse(textContent)
  } catch {
    // JSON 파싱 실패 시 텍스트에서 JSON 추출 시도
    const match = textContent.match(/\{[\s\S]*\}/)
    if (match) analysis = JSON.parse(match[0])
    else throw new Error('Failed to parse Gemini response')
  }

  const score = Math.max(0, Math.min(100, analysis.suspicion_score || 50))
  let status = 'review'
  if (score <= 30) status = 'approved'
  else if (score >= 71) status = 'rejected'

  // AI 분석 로그 저장
  await supabase.from('oc_ai_analysis_logs').insert({
    creator_id: creatorId,
    score,
    breakdown: analysis.breakdown || {},
    reasoning: analysis.reasoning || '',
    recommended_action: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'review',
    model: 'gemini-2.0-flash'
  })

  // 크리에이터 업데이트
  const updateData = {
    suspicion_score: score,
    ai_summary: analysis.summary || analysis.reasoning || '',
    status,
    category: analysis.categories || creator.category
  }

  // 가입 여부 체크
  if (creator.email) {
    const { data: authUser } = await supabase
      .from('companies')
      .select('user_id')
      .eq('email', creator.email)
      .maybeSingle()

    if (authUser) {
      updateData.is_registered = true
      updateData.registered_user_id = authUser.user_id
      updateData.status = 'approved'
      updateData.contact_status = 'registered'
    }
  }

  await supabase
    .from('oc_creators')
    .update(updateData)
    .eq('id', creatorId)

  return { score, status, summary: analysis.summary || analysis.reasoning }
}

function buildPrompt(creator) {
  const lang = creator.region === 'japan' ? 'ja' : creator.region === 'us' ? 'en' : 'ko'
  const langInstruction = lang === 'ko'
    ? '한국어로 응답해.'
    : lang === 'ja' ? '日本語で応答してください。' : 'Respond in English.'

  const platform = (creator.platform || '').toLowerCase()

  // 플랫폼별 프로필 정보 구성
  let profileInfo = ''
  if (platform === 'youtube') {
    profileInfo = `- 플랫폼: YouTube
- 유저네임: ${creator.username}
- 채널명: ${creator.full_name || 'N/A'}
- 구독자: ${creator.followers || '정보 없음'}
- 동영상 수: ${creator.post_count || '정보 없음'}
- 채널 설명: ${creator.bio || 'N/A'}
- 채널 URL: ${creator.platform_url || 'N/A'}
- 리전: ${creator.region}`
  } else if (platform === 'tiktok') {
    profileInfo = `- 플랫폼: TikTok
- 유저네임: ${creator.username}
- 이름: ${creator.full_name || 'N/A'}
- 팔로워: ${creator.followers || '정보 없음'}
- 팔로잉: ${creator.following || '정보 없음'}
- 동영상 수: ${creator.post_count || '정보 없음'}
- 평균 좋아요: ${creator.avg_likes || '정보 없음'}
- 바이오: ${creator.bio || 'N/A'}
- 리전: ${creator.region}`
  } else {
    // Instagram 등
    profileInfo = `- 플랫폼: ${creator.platform || 'Instagram'}
- 유저네임: ${creator.username}
- 이름: ${creator.full_name || 'N/A'}
- 팔로워: ${creator.followers || '정보 없음'}
- 팔로잉: ${creator.following || '정보 없음'}
- 게시물 수: ${creator.post_count || '정보 없음'}
- 평균 좋아요: ${creator.avg_likes || '정보 없음'}
- 평균 댓글: ${creator.avg_comments || '정보 없음'}
- 바이오: ${creator.bio || 'N/A'}
- 리전: ${creator.region}`
  }

  // 플랫폼별 점수 기준
  let scoringCriteria = ''
  if (platform === 'youtube') {
    scoringCriteria = `점수 기준 (YouTube):
- content_quality: 구독자 수, 동영상 수 기반 채널 활성도 판단
- follower_quality: 구독자 수 적정성, 채널 신뢰도
- content_consistency: 동영상 수와 채널 활동 일관성
- growth_pattern: 비정상적 성장 패턴 징후

중요: YouTube는 '팔로잉' 개념이 없으므로 팔로잉=0은 정상입니다.
구독자 수와 동영상 수를 중심으로 판단하세요.
데이터가 '정보 없음'인 항목은 감점하지 마세요 - 해당 항목은 건너뛰세요.`
  } else if (platform === 'tiktok') {
    scoringCriteria = `점수 기준 (TikTok):
- engagement_rate: 팔로워 대비 좋아요 비율 (너무 낮거나 높으면 의심)
- follower_quality: 팔로잉/팔로워 비율, 팔로워 수 적정성
- content_consistency: 동영상 수와 활동 일관성
- growth_pattern: 비정상적 성장 패턴 징후

데이터가 '정보 없음'인 항목은 감점하지 마세요 - 해당 항목은 건너뛰세요.`
  } else {
    scoringCriteria = `점수 기준 (Instagram):
- engagement_rate: 팔로워 대비 좋아요/댓글 비율 (너무 낮거나 높으면 의심)
- follower_quality: 팔로잉/팔로워 비율, 팔로워 수 적정성
- content_consistency: 게시물 수와 활동 일관성
- growth_pattern: 비정상적 성장 패턴 징후

데이터가 '정보 없음'인 항목은 감점하지 마세요 - 해당 항목은 건너뛰세요.`
  }

  return `크리에이터 마케팅 전문가로서 아래 프로필을 분석해. ${langInstruction}

프로필:
${profileInfo}

다음 JSON 형식으로 응답:
{
  "suspicion_score": 0~100 (0=정상, 100=의심),
  "breakdown": {
    "engagement_rate": { "score": 0~100, "note": "설명" },
    "follower_quality": { "score": 0~100, "note": "설명" },
    "content_consistency": { "score": 0~100, "note": "설명" },
    "growth_pattern": { "score": 0~100, "note": "설명" }
  },
  "categories": ["beauty", "fashion"],
  "reasoning": "종합 판단 근거",
  "summary": "한줄 요약"
}

${scoringCriteria}`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
