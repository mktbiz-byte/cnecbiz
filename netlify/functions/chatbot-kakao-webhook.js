/**
 * 카카오톡 AI 챗봇 웹훅 (Gemini 2.0 Flash + Function Calling)
 *
 * 카카오 오픈빌더 스킬 요청을 받아 Gemini Function Calling으로
 * AI가 필요한 DB를 스스로 조회하고 답변을 생성한다.
 *
 * POST body: 카카오 오픈빌더 스킬 요청 포맷
 *   { userRequest: { utterance, user: { id }, callbackUrl }, bot: { name } }
 */

const { createClient } = require('@supabase/supabase-js')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// ─── Supabase 클라이언트 ───
const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function createRegionalClient(url, key) {
  if (!url || !key) return null
  return createClient(url, key)
}

function getRegionalClient(region) {
  const regionMap = {
    korea: { url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY },
    japan: { url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY },
    us: { url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY },
    biz: { url: process.env.VITE_SUPABASE_BIZ_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  }
  const config = regionMap[region]
  if (!config) return supabaseBiz
  return createRegionalClient(config.url, config.key) || supabaseBiz
}

// ─── Gemini 클라이언트 ───
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ─── 상수 ───
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30분
const MAX_FUNCTION_CALLS = 3
const MAX_RESPONSE_LENGTH = 900 // 카카오 글자 제한

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// ─── 카카오 응답 헬퍼 ───
function makeKakaoResponse(text, quickReplies = []) {
  const truncated = text.length > MAX_RESPONSE_LENGTH
    ? text.substring(0, MAX_RESPONSE_LENGTH - 3) + '...'
    : text

  const response = {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: truncated } }]
    }
  }

  if (quickReplies.length > 0) {
    response.template.quickReplies = quickReplies
  }

  return { statusCode: 200, headers, body: JSON.stringify(response) }
}

function defaultQuickReplies(botType) {
  if (botType === 'creator') {
    return [
      { label: '내 캠페인', action: 'message', messageText: '내 캠페인 현황 알려줘' },
      { label: '포인트 확인', action: 'message', messageText: '내 포인트 확인해줘' },
      { label: '담당자 연결', action: 'message', messageText: '담당자 연결해주세요' }
    ]
  }
  return [
    { label: '서비스 소개', action: 'message', messageText: '크넥 서비스에 대해 알려주세요' },
    { label: '캠페인 가격', action: 'message', messageText: '캠페인 비용은 얼마인가요?' },
    { label: '담당자 연결', action: 'message', messageText: '담당자 연결해주세요' }
  ]
}

// ─── Function Calling 도구 정의 ───
const functionDeclarations = [
  {
    name: 'search_campaigns',
    description: '캠페인을 키워드로 검색합니다. 캠페인 이름, 브랜드명, 카테고리 등으로 검색 가능합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        keyword: { type: 'STRING', description: '검색 키워드' },
        status: { type: 'STRING', description: '캠페인 상태 (active, completed, pending 등). 선택 사항.' }
      },
      required: ['keyword']
    }
  },
  {
    name: 'get_campaign_detail',
    description: '특정 캠페인의 상세 정보(제품, 기간, 크리에이터 현황, 영상 현황 등)를 조회합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        campaign_id: { type: 'STRING', description: '캠페인 UUID' }
      },
      required: ['campaign_id']
    }
  },
  {
    name: 'search_creators',
    description: '크리에이터를 검색합니다. 국가, 카테고리, 이름 등으로 검색 가능합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        keyword: { type: 'STRING', description: '검색 키워드 (이름, 카테고리 등)' },
        country: { type: 'STRING', description: '국가 (korea, japan, usa 등). 선택 사항.' }
      },
      required: ['keyword']
    }
  },
  {
    name: 'get_company_info',
    description: '특정 기업의 정보를 조회합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        company_name: { type: 'STRING', description: '기업명' }
      },
      required: ['company_name']
    }
  },
  {
    name: 'get_pricing',
    description: '크넥 캠페인 가격 정보를 조회합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_platform_stats',
    description: '크넥 플랫폼의 전체 통계(크리에이터 수, 캠페인 수, 기업 수)를 조회합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_my_campaigns',
    description: '현재 대화 중인 크리에이터의 캠페인 참여 현황을 조회합니다. 크리에이터 계정 연동이 필요합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_my_points',
    description: '현재 대화 중인 크리에이터의 포인트 잔액과 출금 내역을 조회합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_my_videos',
    description: '현재 대화 중인 크리에이터의 영상 제출 현황을 조회합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_contracts',
    description: '현재 대화 중인 사용자의 계약서 현황을 조회합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    }
  }
]

// ─── Function Calling 실행기 ───
async function executeFunctionCall(name, args, userLink) {
  try {
    switch (name) {
      case 'search_campaigns': {
        const { keyword, status } = args
        let query = supabaseBiz
          .from('campaigns')
          .select('id, title, brand_name, status, campaign_type, start_date, end_date, total_slots')
          .ilike('title', `%${keyword}%`)
          .limit(5)
        if (status) query = query.eq('status', status)
        const { data } = await query
        return data && data.length > 0
          ? { campaigns: data.map(c => ({ id: c.id, title: c.title, brand: c.brand_name, status: c.status, type: c.campaign_type, period: `${c.start_date || '미정'} ~ ${c.end_date || '미정'}`, slots: c.total_slots })) }
          : { message: `'${keyword}' 관련 캠페인을 찾을 수 없습니다.` }
      }

      case 'get_campaign_detail': {
        const { campaign_id } = args
        const { data: campaign } = await supabaseBiz
          .from('campaigns')
          .select('id, title, brand_name, product_name, product_description, status, campaign_type, start_date, end_date, total_slots, budget, reward_points')
          .eq('id', campaign_id)
          .single()
        if (!campaign) return { message: '해당 캠페인을 찾을 수 없습니다.' }

        const { count: inviteCount } = await supabaseBiz.from('campaign_invitations').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign_id)
        const { count: videoCount } = await supabaseBiz.from('video_submissions').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign_id)

        return {
          ...campaign,
          invitations_count: inviteCount || 0,
          video_submissions_count: videoCount || 0
        }
      }

      case 'search_creators': {
        const { keyword, country } = args
        let query = supabaseBiz
          .from('featured_creators')
          .select('id, primary_country, overall_score')
          .limit(5)
        if (country) query = query.eq('primary_country', country)
        const { data } = await query
        return data && data.length > 0
          ? { creators: data }
          : { message: `'${keyword}' 관련 크리에이터를 찾을 수 없습니다.` }
      }

      case 'get_company_info': {
        const { company_name } = args
        const { data } = await supabaseBiz
          .from('companies')
          .select('id, name, email, phone')
          .ilike('name', `%${company_name}%`)
          .limit(3)
        return data && data.length > 0
          ? { companies: data.map(c => ({ name: c.name, email: c.email, phone: c.phone })) }
          : { message: `'${company_name}' 기업을 찾을 수 없습니다.` }
      }

      case 'get_pricing': {
        return {
          pricing: [
            { name: '기획형 캠페인', price: '200,000원/건', description: '브랜드 맞춤 시나리오 기획, 촬영 가이드, AI 크리에이터 매칭, SNS 업로드 1개, 2차 활용 무료' },
            { name: '올영세일 패키지', price: '400,000원/건', description: '3단계 콘텐츠(리뷰→홍보→당일), 구매 전환 유도, SNS 업로드 3개, 파트너코드' },
            { name: '4주 챌린지', price: '600,000원/건', description: '주차별 미션 총 4편 제작, Before & After, SNS 업로드 4개' }
          ],
          note: '에이전시 대비 약 70% 비용 절감. 2차 활용 무료, AI 가이드 무료 포함.'
        }
      }

      case 'get_platform_stats': {
        const [
          { count: creatorCount },
          { count: campaignCount },
          { count: companyCount }
        ] = await Promise.all([
          supabaseBiz.from('featured_creators').select('*', { count: 'exact', head: true }),
          supabaseBiz.from('campaigns').select('*', { count: 'exact', head: true }),
          supabaseBiz.from('companies').select('*', { count: 'exact', head: true })
        ])
        return {
          total_creators: creatorCount || 0,
          total_campaigns: campaignCount || 0,
          total_companies: companyCount || 0,
          supported_countries: ['한국', '일본', '미국', '대만']
        }
      }

      case 'get_my_campaigns': {
        if (!userLink) return { message: '계정 연동이 필요합니다. 크넥 계정을 연동해 주세요.' }
        const regionClient = getRegionalClient(userLink.region)
        const { data: apps } = await regionClient
          .from('applications')
          .select('id, campaign_id, status, created_at')
          .eq('creator_id', userLink.user_id)
          .order('created_at', { ascending: false })
          .limit(10)
        if (!apps || apps.length === 0) return { message: '참여 중인 캠페인이 없습니다.' }

        const campaignIds = [...new Set(apps.map(a => a.campaign_id))]
        const { data: campaigns } = await supabaseBiz
          .from('campaigns')
          .select('id, title, status')
          .in('id', campaignIds)
        const campaignMap = {}
        if (campaigns) campaigns.forEach(c => { campaignMap[c.id] = c })

        return {
          campaigns: apps.map(a => ({
            title: campaignMap[a.campaign_id]?.title || '알 수 없음',
            campaign_status: campaignMap[a.campaign_id]?.status || '알 수 없음',
            application_status: a.status,
            applied_at: a.created_at
          }))
        }
      }

      case 'get_my_points': {
        if (!userLink) return { message: '계정 연동이 필요합니다. 크넥 계정을 연동해 주세요.' }
        const { data: points } = await supabaseBiz
          .from('points')
          .select('amount, type, description, created_at')
          .eq('creator_id', userLink.user_id)
          .order('created_at', { ascending: false })
          .limit(10)
        const totalPoints = (points || []).reduce((sum, p) => sum + (p.amount || 0), 0)

        const { data: withdrawals } = await supabaseBiz
          .from('creator_withdrawal_requests')
          .select('requested_amount, status, created_at')
          .eq('creator_id', userLink.user_id)
          .order('created_at', { ascending: false })
          .limit(5)

        return {
          balance: totalPoints,
          recent_points: (points || []).slice(0, 5).map(p => ({ amount: p.amount, type: p.type, description: p.description, date: p.created_at })),
          recent_withdrawals: (withdrawals || []).map(w => ({ amount: w.requested_amount, status: w.status, date: w.created_at }))
        }
      }

      case 'get_my_videos': {
        if (!userLink) return { message: '계정 연동이 필요합니다. 크넥 계정을 연동해 주세요.' }
        const regionClient = getRegionalClient(userLink.region)
        const { data: videos } = await regionClient
          .from('video_submissions')
          .select('id, campaign_id, status, created_at')
          .eq('user_id', userLink.user_id)
          .order('created_at', { ascending: false })
          .limit(10)
        return videos && videos.length > 0
          ? { videos: videos.map(v => ({ campaign_id: v.campaign_id, status: v.status, submitted_at: v.created_at })) }
          : { message: '제출한 영상이 없습니다.' }
      }

      case 'get_contracts': {
        if (!userLink) return { message: '계정 연동이 필요합니다. 크넥 계정을 연동해 주세요.' }
        const field = userLink.user_type === 'company' ? 'company_id' : 'creator_id'
        const { data: contracts } = await supabaseBiz
          .from('contracts')
          .select('id, title, status, created_at')
          .eq(field, userLink.user_id)
          .order('created_at', { ascending: false })
          .limit(5)
        return contracts && contracts.length > 0
          ? { contracts: contracts.map(c => ({ title: c.title, status: c.status, created_at: c.created_at })) }
          : { message: '계약서가 없습니다.' }
      }

      default:
        return { message: `알 수 없는 도구: ${name}` }
    }
  } catch (err) {
    console.error(`[chatbot-kakao-webhook] Function ${name} error:`, err.message)
    return { error: `도구 실행 중 오류: ${err.message}` }
  }
}

// ─── 프롬프트 인젝션 체크 ───
async function checkInjection(text) {
  const { data: patterns } = await supabaseBiz
    .from('chatbot_blocked_patterns')
    .select('pattern, pattern_type')
    .eq('is_active', true)

  if (!patterns) return false

  const lower = text.toLowerCase()
  for (const p of patterns) {
    if (p.pattern_type === 'regex') {
      try {
        if (new RegExp(p.pattern, 'i').test(text)) return true
      } catch (e) { /* invalid regex, skip */ }
    } else {
      if (lower.includes(p.pattern.toLowerCase())) return true
    }
  }
  return false
}

// ─── 에스컬레이션 체크 ───
async function checkEscalation(text, botType) {
  const { data: triggers } = await supabaseBiz
    .from('chatbot_guardrails')
    .select('rule_value')
    .eq('bot_type', botType)
    .eq('rule_type', 'escalation_trigger')
    .eq('is_active', true)

  if (!triggers) return false
  const lower = text.toLowerCase()
  return triggers.some(t => lower.includes(t.rule_value.toLowerCase()))
}

// ─── 대화 세션 관리 ───
async function getOrCreateSession(userKey, botType) {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString()
  const { data: existing } = await supabaseBiz
    .from('chatbot_conversations')
    .select('id, messages')
    .eq('kakao_user_key', userKey)
    .eq('bot_type', botType)
    .gte('updated_at', cutoff)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (existing && existing.length > 0) return existing[0]

  const { data: newSession } = await supabaseBiz
    .from('chatbot_conversations')
    .insert({ kakao_user_key: userKey, bot_type: botType, messages: [] })
    .select()
    .single()

  return newSession
}

async function appendMessage(sessionId, messages, role, content) {
  const updated = [...(messages || []), { role, content, timestamp: new Date().toISOString() }].slice(-50)
  await supabaseBiz
    .from('chatbot_conversations')
    .update({ messages: updated, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  return updated
}

// ─── 메인 핸들러 ───
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return makeKakaoResponse('잘못된 요청입니다.')
  }

  try {
    const body = JSON.parse(event.body)

    // 1. 카카오 스킬 요청 파싱
    const userKey = body.userRequest?.user?.id || 'unknown'
    const utterance = (body.userRequest?.utterance || '').trim()
    const botName = body.bot?.name || ''

    if (!utterance) {
      return makeKakaoResponse('안녕하세요! 크넥 AI 상담 챗봇입니다. 궁금한 점을 질문해 주세요 😊')
    }

    // 2. bot_type 결정
    const botType = botName.includes('크리에이터') ? 'creator' : 'business'

    // 3. 프롬프트 인젝션 체크
    if (await checkInjection(utterance)) {
      return makeKakaoResponse('죄송합니다. 해당 질문에는 답변할 수 없습니다.')
    }

    // 4. 에스컬레이션 키워드 감지
    if (await checkEscalation(utterance, botType)) {
      // 에스컬레이션 처리 (비동기)
      const baseUrl = process.env.URL || 'https://cnecbiz.com'
      fetch(`${baseUrl}/.netlify/functions/chatbot-process-escalation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Chatbot-API-Key': process.env.CHATBOT_API_SECRET || '' },
        body: JSON.stringify({ kakao_user_key: userKey, bot_type: botType, question: utterance, confidence: 0, user_context: { source: 'kakao-webhook' } })
      }).catch(e => console.error('Escalation call failed:', e.message))

      return makeKakaoResponse(
        '이 부분은 담당자가 직접 안내드리는 것이 정확합니다. 😊\n담당자에게 전달하였으니, 빠른 시일 내에 연락드리겠습니다!',
        [{ label: '다른 질문하기', action: 'message', messageText: '다른 질문이 있어요' }]
      )
    }

    // 5. 병렬 데이터 조회
    const [promptResult, faqResult, userLinkResult, session] = await Promise.all([
      supabaseBiz.from('chatbot_prompts').select('system_prompt').eq('bot_type', botType).eq('is_active', true).limit(1).single(),
      supabaseBiz.from('chatbot_faq').select('question, answer, category').eq('bot_type', botType).eq('is_active', true),
      supabaseBiz.from('chatbot_user_links').select('*').eq('kakao_user_key', userKey).limit(1),
      getOrCreateSession(userKey, botType)
    ])

    const systemPrompt = promptResult.data?.system_prompt || '당신은 크넥(CNEC) AI 상담 도우미입니다. 친절하게 답변해 주세요.'
    const faqList = faqResult.data || []
    const userLink = userLinkResult.data?.[0] || null

    // FAQ 컨텍스트 구성
    const faqContext = faqList.length > 0
      ? '\n\n[참고 FAQ]\n' + faqList.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
      : ''

    // 대화 이력 (최근 10개)
    const messages = session?.messages || []
    const recentHistory = messages.slice(-10)

    // 사용자 메시지 저장
    if (session?.id) {
      await appendMessage(session.id, messages, 'user', utterance)
    }

    // 6. Gemini Function Calling
    const fullSystemPrompt = systemPrompt + faqContext

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: fullSystemPrompt,
      tools: [{ functionDeclarations }]
    })

    // 대화 이력을 Gemini 포맷으로 변환
    const historyForAI = recentHistory
      .filter(m => m.role && m.content)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))

    const chat = model.startChat({ history: historyForAI })

    // Function Calling 루프 (최대 3회)
    let result = await chat.sendMessage(utterance)
    let response = result.response
    let loopCount = 0

    while (loopCount < MAX_FUNCTION_CALLS) {
      const candidate = response.candidates?.[0]
      const parts = candidate?.content?.parts || []
      const functionCallPart = parts.find(p => p.functionCall)

      if (!functionCallPart) break // 텍스트 응답이면 루프 종료

      const { name, args } = functionCallPart.functionCall
      console.log(`[chatbot-kakao-webhook] Function call: ${name}`, JSON.stringify(args))

      // 도구 실행
      const functionResult = await executeFunctionCall(name, args || {}, userLink)

      // 결과를 Gemini에 다시 전송
      result = await chat.sendMessage([{
        functionResponse: {
          name,
          response: functionResult
        }
      }])
      response = result.response
      loopCount++
    }

    // 최종 텍스트 추출
    const aiText = response.text() || '죄송합니다. 답변을 생성하지 못했습니다. 담당자에게 문의해 주세요.'

    // 어시스턴트 메시지 저장 (비동기)
    if (session?.id) {
      appendMessage(session.id, [...messages, { role: 'user', content: utterance, timestamp: new Date().toISOString() }], 'assistant', aiText)
        .catch(e => console.error('Message save failed:', e.message))
    }

    return makeKakaoResponse(aiText, defaultQuickReplies(botType))

  } catch (error) {
    console.error('[chatbot-kakao-webhook] Error:', error)

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatbot-kakao-webhook',
          errorMessage: error.message,
          context: { stack: (error.stack || '').substring(0, 500) }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    // 에러여도 200 리턴 (카카오 요구사항)
    return makeKakaoResponse(
      '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 😊',
      [{ label: '담당자 연결', action: 'message', messageText: '담당자 연결해주세요' }]
    )
  }
}
