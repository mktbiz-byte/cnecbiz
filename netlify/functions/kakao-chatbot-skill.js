/**
 * 카카오 오픈빌더 AI 챗봇 스킬 서버 (기업용)
 *
 * 카카오 오픈빌더에서 스킬 URL로 등록하여 사용
 *
 * 플로우:
 * 1. 카카오 스킬 요청 파싱
 * 2. 대화 세션 조회/생성
 * 3. 반복 질문 감지 (2회 이상 → 에스컬레이션)
 * 4. 민감 키워드 → 즉시 담당자 연결
 * 5. FAQ 매칭 (확신도 기반 분기)
 *    - 90%+ → 즉답
 *    - 50~89% → 선택지 제공
 *    - <50% → Gemini AI 응답
 * 6. 대화 저장
 *
 * POST body: 카카오 오픈빌더 스킬 요청 JSON
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BOT_TYPE = 'business'
const CHATBOT_CHANNEL_ID = '75c24874-e370-afd5-9da3-72918ba15a3c'
const FAQ_HIGH_CONFIDENCE = 0.9
const FAQ_MEDIUM_CONFIDENCE = 0.5
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30분
const MAX_MESSAGES = 50
const REPEAT_THRESHOLD = 2 // 2회 이상 유사 질문 시 에스컬레이션

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// ─── 민감 키워드 (즉시 담당자 연결) ───
const ESCALATION_KEYWORDS = [
  '환불', '클레임', '불만', '상담원', '사람', '담당자',
  '입금', '충전', '출금', '인출', '정산',
  '계좌', '변경', '해지', '위약금',
  '비밀번호', '로그인 안됨', '오류', '버그',
  '전화', '통화', '급해요', '급합니다'
]

// ─── 기업 FAQ 데이터 (DB 로드 전 폴백) ───
const BUSINESS_FAQ = [
  // 서비스 소개
  {
    category: 'service',
    question: '크넥이 뭔가요?',
    answer: '크넥(CNEC)은 기업과 크리에이터를 연결하는 마케팅 플랫폼입니다. 캠페인 등록부터 크리에이터 매칭, 콘텐츠 관리, 정산까지 원스톱으로 지원합니다.',
    keywords: ['크넥', '서비스', '뭐', '소개', '플랫폼']
  },
  {
    category: 'service',
    question: '어떤 서비스를 제공하나요?',
    answer: '크넥은 다음 서비스를 제공합니다:\n• 캠페인 등록 및 관리\n• 크리에이터 매칭 (AI 추천)\n• 계약서 자동 발송/서명\n• 포인트 충전 및 정산\n• 캠페인 성과 리포트\n• 가이드북 제작 지원',
    keywords: ['서비스', '제공', '기능', '할 수 있']
  },
  // 캠페인 관련
  {
    category: 'campaign',
    question: '캠페인은 어떻게 등록하나요?',
    answer: '캠페인 등록은 간단합니다:\n1. 로그인 후 대시보드에서 "캠페인 만들기" 클릭\n2. 캠페인 유형 선택 (일반/올리브영/4주 챌린지)\n3. 상세 정보 입력 (제품, 예산, 기간 등)\n4. 가이드북 작성\n5. 승인 후 크리에이터 모집 시작',
    keywords: ['캠페인', '등록', '만들기', '생성', '시작']
  },
  {
    category: 'campaign',
    question: '캠페인 유형은 어떤 것들이 있나요?',
    answer: '크넥에서 제공하는 캠페인 유형:\n• 일반 캠페인: 기본 크리에이터 마케팅\n• 올리브영 캠페인: 올리브영 입점 브랜드 전용\n• 4주 챌린지: 장기 리뷰 캠페인\n• 일본/미국 캠페인: 해외 크리에이터 타겟',
    keywords: ['캠페인', '유형', '종류', '타입', '올리브영', '챌린지']
  },
  {
    category: 'campaign',
    question: '캠페인 승인은 얼마나 걸리나요?',
    answer: '캠페인 등록 후 관리자 검토를 거쳐 보통 영업일 기준 1~2일 내 승인됩니다. 수정 요청이 있을 경우 별도 안내드립니다.',
    keywords: ['승인', '검토', '기간', '걸리', '언제']
  },
  {
    category: 'campaign',
    question: '캠페인 수정이 가능한가요?',
    answer: '캠페인 상태에 따라 다릅니다:\n• 대기중/검토중: 자유롭게 수정 가능\n• 모집중: 일부 항목 수정 가능 (담당자 문의)\n• 진행중/완료: 수정 불가\n수정이 필요하시면 담당자에게 문의해 주세요.',
    keywords: ['캠페인', '수정', '변경', '편집', '고치']
  },
  // 크리에이터 매칭
  {
    category: 'creator',
    question: '크리에이터는 어떻게 매칭되나요?',
    answer: 'AI 기반 자동 매칭과 직접 선택 두 가지 방식이 있습니다:\n• AI 매칭: 캠페인 조건에 맞는 크리에이터를 AI가 추천\n• 직접 선택: 크리에이터 목록에서 직접 초대\n캠페인 등록 시 선호 조건을 상세히 입력하면 더 정확한 매칭이 가능합니다.',
    keywords: ['크리에이터', '매칭', '연결', '추천', '찾기', '선택']
  },
  {
    category: 'creator',
    question: '크리에이터 프로필을 볼 수 있나요?',
    answer: '네, 캠페인에 지원한 크리에이터의 프로필을 확인할 수 있습니다:\n• SNS 채널 정보 및 팔로워 수\n• 과거 캠페인 참여 이력\n• 콘텐츠 카테고리\n• 평가 점수',
    keywords: ['크리에이터', '프로필', '정보', '확인', '보기']
  },
  // 결제/포인트
  {
    category: 'payment',
    question: '결제는 어떻게 하나요?',
    answer: '크넥은 포인트 선충전 방식입니다:\n• 국내: 토스페이먼츠 (카드/계좌이체)\n• 해외: Stripe (해외 카드)\n충전한 포인트로 캠페인 비용이 자동 차감됩니다.',
    keywords: ['결제', '결제 방법', '카드', '계좌', '포인트']
  },
  {
    category: 'payment',
    question: '포인트 충전은 어떻게 하나요?',
    answer: '대시보드 > 포인트 충전에서 원하는 금액을 입력하고 결제하시면 됩니다. 충전 즉시 포인트가 반영됩니다.',
    keywords: ['포인트', '충전', '넣기', '추가']
  },
  {
    category: 'payment',
    question: '캠페인 비용은 얼마인가요?',
    answer: '캠페인 비용은 크리에이터 수, 캠페인 유형, 기간에 따라 달라집니다. 정확한 견적은 캠페인 등록 시 자동 계산되며, 담당자에게 문의하시면 맞춤 견적을 받으실 수 있습니다.',
    keywords: ['비용', '가격', '요금', '얼마', '견적', '금액']
  },
  {
    category: 'payment',
    question: '세금계산서 발행이 가능한가요?',
    answer: '네, 가능합니다. 결제 완료 후 자동으로 세금계산서가 발행됩니다. 현금영수증도 발행 가능하며, 결제 내역에서 확인하실 수 있습니다.',
    keywords: ['세금계산서', '현금영수증', '영수증', '증빙']
  },
  // 계약서
  {
    category: 'contract',
    question: '계약서는 어떻게 발송하나요?',
    answer: '계약서 발송 절차:\n1. 대시보드 > 계약서 관리\n2. 계약서 템플릿 선택 또는 작성\n3. 크리에이터 선택 후 발송\n4. 크리에이터가 온라인으로 서명\n모든 과정이 온라인으로 진행되며, 서명 상태를 실시간으로 확인할 수 있습니다.',
    keywords: ['계약서', '발송', '보내', '서명', '전자계약']
  },
  {
    category: 'contract',
    question: '계약서 서명 상태를 확인할 수 있나요?',
    answer: '네, 대시보드 > 계약서 관리에서 각 계약서의 상태를 확인할 수 있습니다:\n• 대기중(pending): 발송 전\n• 발송됨(sent): 크리에이터에게 전달됨\n• 서명완료(signed): 서명 완료\n• 만료(expired): 기한 초과',
    keywords: ['계약서', '상태', '확인', '서명', '진행']
  },
  // 가이드북
  {
    category: 'guide',
    question: '가이드북은 뭔가요?',
    answer: '가이드북은 크리에이터에게 제공하는 캠페인 안내서입니다. 제품 소개, 콘텐츠 가이드라인, 필수 포함 사항 등을 정리하여 크리에이터가 양질의 콘텐츠를 제작할 수 있도록 돕습니다.',
    keywords: ['가이드북', '가이드', '안내서', '콘텐츠 가이드']
  },
  // 계정/프로필
  {
    category: 'account',
    question: '회사 정보를 수정할 수 있나요?',
    answer: '네, 대시보드 > 프로필 수정에서 회사 정보를 변경할 수 있습니다. 사업자등록번호 변경은 담당자에게 문의해 주세요.',
    keywords: ['회사', '정보', '수정', '프로필', '변경']
  },
  {
    category: 'account',
    question: '알림 설정을 변경할 수 있나요?',
    answer: '네, 프로필 수정 페이지에서 알림 수신 이메일과 연락처를 별도로 설정할 수 있습니다. 캠페인 관련 알림은 설정된 연락처로 발송됩니다.',
    keywords: ['알림', '설정', '변경', '연락처', '이메일']
  },
  // 해외 캠페인
  {
    category: 'global',
    question: '일본/해외 크리에이터도 가능한가요?',
    answer: '네! 크넥은 일본, 미국, 대만 등 해외 크리에이터도 지원합니다. 해외 캠페인 전용 등록 페이지에서 해당 국가 크리에이터를 대상으로 캠페인을 진행할 수 있습니다.',
    keywords: ['일본', '해외', '미국', '대만', '글로벌', '외국']
  },
  // 리포트
  {
    category: 'report',
    question: '캠페인 성과를 확인할 수 있나요?',
    answer: '네, 캠페인 상세 페이지에서 다음 성과를 확인할 수 있습니다:\n• 크리에이터별 콘텐츠 현황\n• 영상 조회수 및 참여율\n• 전체 캠페인 달성률\n상세 리포트는 캠페인 완료 후 제공됩니다.',
    keywords: ['성과', '리포트', '결과', '조회수', '통계', '분석']
  },
]

// ─── 기업 전용 시스템 프롬프트 ───
const BUSINESS_SYSTEM_PROMPT = `당신은 크넥(CNEC) 크리에이터 마케팅 플랫폼의 기업 전담 AI 상담 도우미 "크넥봇"입니다.

[역할]
- 기업 고객의 캠페인 등록, 크리에이터 매칭, 결제, 계약 관련 질문에 전문적이고 친절하게 답변
- 크넥 서비스의 가치를 자연스럽게 전달
- 복잡한 내용도 쉽고 간결하게 설명

[서비스 핵심 정보]
- 크넥은 기업과 크리에이터를 연결하는 마케팅 플랫폼
- 캠페인 유형: 일반, 올리브영, 4주 챌린지, 일본/미국/대만 해외 캠페인
- 결제: 포인트 선충전 방식 (토스페이먼츠/Stripe)
- 계약서: 온라인 전자서명 시스템
- AI 크리에이터 매칭 지원
- 웹사이트: https://cnecbiz.com

[대화 규칙]
1. 존댓말 사용, 전문적이면서 따뜻한 톤
2. 답변은 200자 이내로 간결하게
3. 필요 시 단계별 안내 (번호 목록)
4. 불확실한 내용은 추측하지 말고 "담당자에게 확인 후 안내드리겠습니다"
5. 경쟁사 비교나 비하 금지
6. 개인정보(계좌, 비밀번호 등)는 절대 요청하지 않기

[에스컬레이션 안내]
- 답변이 어려운 질문이면: "이 부분은 담당자가 직접 안내드리는 것이 정확합니다. 담당자를 연결해 드릴까요?"
- 환불/클레임/정산 관련: 즉시 담당자 연결 안내`

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) }
  }

  // 전체 처리를 4.5초 이내로 제한 (카카오 5초 타임아웃 대비)
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve(makeResponse('잠시 후 다시 질문해 주세요. 😊', [
      { label: '캠페인 만들기', action: 'message', messageText: '캠페인 어떻게 만들어요?' },
      { label: '요금/결제', action: 'message', messageText: '요금이 얼마인가요?' },
      { label: '담당자 연결', action: 'message', messageText: '담당자 연결해 주세요' }
    ])), 4500)
  )

  const mainProcess = (async () => {
  try {
    const body = JSON.parse(event.body)

    // 카카오 스킬 요청 파싱
    const userKey = body.userRequest?.user?.id || 'unknown'
    const utterance = (body.userRequest?.utterance || '').trim()
    const callbackUrl = body.userRequest?.callbackUrl || null

    if (!utterance) {
      return makeResponse('안녕하세요! 크넥 기업 상담 챗봇입니다. 궁금한 점을 질문해 주세요. 😊')
    }

    // ─── 1. 입력 필터링 ───
    if (containsInjection(utterance)) {
      return makeResponse('죄송합니다. 해당 질문에는 답변할 수 없습니다.')
    }

    // ─── 2. 대화 세션 조회/생성 ───
    const conversation = await getOrCreateConversation(userKey)
    const convId = conversation?.id
    const messages = conversation?.messages || []

    // 사용자 메시지 저장
    if (convId) {
      await appendMessage(convId, messages, 'user', utterance)
    }

    // ─── 3. 반복 질문 감지 (2회 이상 유사 → 에스컬레이션) ───
    const repeatCount = countSimilarQuestions(messages, utterance)
    if (repeatCount >= REPEAT_THRESHOLD) {
      const escalationText = '같은 내용으로 여러 번 문의해 주셨네요. 😊\n담당자가 직접 상담해 드리는 것이 좋겠습니다.\n\n담당자에게 전달하였으니, 빠른 시일 내에 연락드리겠습니다!'
      await triggerEscalation(utterance, userKey, 'repeated_question', repeatCount)
      if (convId) await appendMessage(convId, messages, 'assistant', escalationText)
      return makeResponse(escalationText, [
        { label: '처음으로', action: 'message', messageText: '처음으로' }
      ])
    }

    // ─── 4. 민감 키워드 → 즉시 담당자 연결 ───
    const sensitiveKeyword = findSensitiveKeyword(utterance)
    if (sensitiveKeyword) {
      const escalationText = '해당 문의는 담당자에게 전달되었습니다.\n빠른 시일 내에 답변 드리겠습니다. 🙏'
      await triggerEscalation(utterance, userKey, 'sensitive_keyword', 0, sensitiveKeyword)
      if (convId) await appendMessage(convId, messages, 'assistant', escalationText)
      return makeResponse(escalationText)
    }

    // ─── 5. FAQ 매칭 ───
    const faqResults = matchFaq(utterance)

    // ─── 6. 확신도 기반 분기 ───
    if (faqResults.length > 0 && faqResults[0].confidence >= FAQ_HIGH_CONFIDENCE) {
      // 90%+ → 즉답
      const responseText = faqResults[0].faq.answer
      if (convId) await appendMessage(convId, messages, 'assistant', responseText)
      return makeResponse(responseText, buildFollowUpReplies(faqResults[0].faq.category))
    }

    if (faqResults.length > 0 && faqResults[0].confidence >= FAQ_MEDIUM_CONFIDENCE) {
      // 50~89% → 선택지 제공
      const choices = faqResults.slice(0, 3).map(r => r.faq.question)
      choices.push('다른 질문이에요')
      const choiceText = '혹시 아래 질문 중 해당하는 것이 있으신가요?'
      if (convId) await appendMessage(convId, messages, 'assistant', `[선택지: ${choices.join(', ')}]`)
      return makeChoicesResponse(choiceText, choices)
    }

    // ─── 7. Gemini AI 응답 (항상 4초 이내 직접 응답) ───
    try {
      const aiResponse = await Promise.race([
        generateGeminiResponse(utterance, messages),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ])
      if (convId) await appendMessage(convId, messages, 'assistant', aiResponse)
      return makeResponse(aiResponse, [
        { label: '담당자 연결', action: 'message', messageText: '담당자 연결해 주세요' },
        { label: '다른 질문', action: 'message', messageText: '다른 질문이 있어요' }
      ])
    } catch (e) {
      return makeResponse('궁금하신 내용에 대해 자세히 안내해 드리겠습니다. 아래에서 선택해 주세요!', [
        { label: '캠페인 만들기', action: 'message', messageText: '캠페인 어떻게 만들어요?' },
        { label: '크리에이터 찾기', action: 'message', messageText: '크리에이터는 어떻게 찾나요?' },
        { label: '요금/결제', action: 'message', messageText: '요금이 얼마인가요?' },
        { label: '담당자 연결', action: 'message', messageText: '담당자 연결해 주세요' }
      ])
    }

  } catch (error) {
    console.error('[kakao-chatbot-skill] Error:', error)

    // 에러 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'kakao-chatbot-skill',
          errorMessage: error.message,
          context: { type: 'business_chatbot' }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return makeResponse('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  }
  })()

  return Promise.race([mainProcess, timeoutPromise])
}


// ═══════════════════════════════════════════
//  카카오 응답 포맷
// ═══════════════════════════════════════════

function makeResponse(text, quickReplies = []) {
  const template = {
    outputs: [{ simpleText: { text } }]
  }
  if (quickReplies.length > 0) {
    template.quickReplies = quickReplies.map(qr => ({
      label: qr.label,
      action: qr.action || 'message',
      messageText: qr.messageText || qr.label
    }))
  }
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ version: '2.0', template })
  }
}

function makeChoicesResponse(text, choices) {
  const quickReplies = choices.map(choice => ({
    label: choice.length > 14 ? choice.substring(0, 13) + '…' : choice,
    action: 'message',
    messageText: choice
  }))
  return makeResponse(text, quickReplies)
}

function buildFollowUpReplies(category) {
  const followUps = {
    campaign: [
      { label: '캠페인 등록', action: 'message', messageText: '캠페인은 어떻게 등록하나요?' },
      { label: '비용 안내', action: 'message', messageText: '캠페인 비용은 얼마인가요?' }
    ],
    payment: [
      { label: '포인트 충전', action: 'message', messageText: '포인트 충전은 어떻게 하나요?' },
      { label: '세금계산서', action: 'message', messageText: '세금계산서 발행이 가능한가요?' }
    ],
    creator: [
      { label: '매칭 방법', action: 'message', messageText: '크리에이터는 어떻게 매칭되나요?' },
      { label: '프로필 확인', action: 'message', messageText: '크리에이터 프로필을 볼 수 있나요?' }
    ],
    contract: [
      { label: '계약서 발송', action: 'message', messageText: '계약서는 어떻게 발송하나요?' },
      { label: '서명 확인', action: 'message', messageText: '계약서 서명 상태를 확인할 수 있나요?' }
    ],
    default: [
      { label: '서비스 안내', action: 'message', messageText: '어떤 서비스를 제공하나요?' },
      { label: '담당자 연결', action: 'message', messageText: '담당자 연결해 주세요' }
    ]
  }
  return followUps[category] || followUps.default
}


// ═══════════════════════════════════════════
//  FAQ 매칭
// ═══════════════════════════════════════════

function matchFaq(question) {
  const questionLower = question.toLowerCase().trim()
  const questionWords = new Set(questionLower.split(/\s+/))
  const results = []

  for (const faq of BUSINESS_FAQ) {
    const confidence = calculateConfidence(questionLower, questionWords, faq)
    if (confidence > 0.1) {
      results.push({ faq, confidence })
    }
  }

  results.sort((a, b) => b.confidence - a.confidence)
  return results.slice(0, 5)
}

function calculateConfidence(questionLower, questionWords, faq) {
  const faqQuestion = faq.question.toLowerCase()
  const keywords = faq.keywords || []

  // 정확히 같은 질문
  if (questionLower === faqQuestion) return 1.0

  let score = 0

  // 키워드 매칭
  if (keywords.length > 0) {
    const matched = keywords.filter(kw => questionLower.includes(kw.toLowerCase())).length
    if (matched > 0) {
      score = Math.max(score, matched / keywords.length)
    }
  }

  // 단어 겹침
  const faqWords = new Set(faqQuestion.split(/\s+/))
  if (faqWords.size > 0) {
    const overlap = [...questionWords].filter(w => faqWords.has(w)).length
    const wordScore = overlap / Math.max(faqWords.size, 1)
    score = Math.max(score, wordScore * 0.8)
  }

  // 부분 문자열 포함
  if (faqQuestion && questionLower.includes(faqQuestion)) {
    score = Math.max(score, 0.85)
  } else if (faqQuestion && faqQuestion.includes(questionLower)) {
    score = Math.max(score, 0.7)
  }

  return Math.min(score, 1.0)
}


// ═══════════════════════════════════════════
//  Gemini AI 응답
// ═══════════════════════════════════════════

async function generateGeminiResponse(question, conversationHistory) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

  // FAQ 컨텍스트 구성
  const faqContext = BUSINESS_FAQ
    .map(f => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n')

  const fullPrompt = `${BUSINESS_SYSTEM_PROMPT}

[참고 FAQ]
${faqContext}`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: fullPrompt
  })

  // 대화 이력 구성 (첫 메시지가 반드시 user여야 함)
  let filteredHistory = (conversationHistory || [])
    .filter(m => m.role && m.content)
    .slice(-10)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }))
  // Gemini는 첫 메시지가 user여야 함 - model로 시작하는 메시지 제거
  while (filteredHistory.length > 0 && filteredHistory[0].role !== 'user') {
    filteredHistory.shift()
  }
  const historyForAI = filteredHistory

  try {
    const chat = model.startChat({ history: historyForAI })
    const result = await chat.sendMessage(question)
    const responseText = result.response.text().trim()

    // 응답 길이 제한 (카카오톡 말풍선 최대 1000자)
    if (responseText.length > 900) {
      return responseText.substring(0, 897) + '...'
    }
    return responseText
  } catch (error) {
    console.error('[Gemini] Error:', error.message)
    return '죄송합니다. 답변 생성 중 오류가 발생했습니다. 다시 질문해 주시거나, "담당자 연결"이라고 입력해 주세요.'
  }
}

async function generateAndCallback(callbackUrl, question, messages, convId) {
  const responseText = await generateGeminiResponse(question, messages)

  // 콜백 전송
  const callbackBody = {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: responseText } }],
      quickReplies: [
        { label: '담당자 연결', action: 'message', messageText: '담당자 연결해 주세요' },
        { label: '다른 질문', action: 'message', messageText: '다른 질문이 있어요' }
      ]
    }
  }

  await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(callbackBody)
  })

  if (convId) {
    await appendMessage(convId, messages, 'assistant', responseText)
  }
}


// ═══════════════════════════════════════════
//  대화 세션 관리
// ═══════════════════════════════════════════

async function getOrCreateConversation(userKey) {
  try {
    // 최근 대화 조회
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('kakao_user_key', userKey)
      .eq('bot_type', BOT_TYPE)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    if (data && data.length > 0) {
      const conv = data[0]
      const createdAt = new Date(conv.created_at).getTime()
      const now = Date.now()

      // 30분 이내면 기존 세션
      if (now - createdAt < SESSION_TIMEOUT_MS) {
        return conv
      }
    }

    // 새 세션 생성
    const { data: newConv, error: insertError } = await supabase
      .from('chatbot_conversations')
      .insert({
        kakao_user_key: userKey,
        bot_type: BOT_TYPE,
        session_id: generateSessionId(),
        messages: []
      })
      .select()
      .single()

    if (insertError) throw insertError
    return newConv
  } catch (error) {
    console.error('[getOrCreateConversation] Error:', error.message)
    return null
  }
}

async function appendMessage(convId, currentMessages, role, content) {
  try {
    const messages = [...currentMessages]

    // 최대 메시지 수 제한
    if (messages.length >= MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES + 1)
    }

    messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    })

    await supabase
      .from('chatbot_conversations')
      .update({ messages })
      .eq('id', convId)

    // 원본 배열도 업데이트
    currentMessages.length = 0
    currentMessages.push(...messages)
  } catch (error) {
    console.error('[appendMessage] Error:', error.message)
  }
}

function generateSessionId() {
  return 'biz_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8)
}


// ═══════════════════════════════════════════
//  반복 질문 감지
// ═══════════════════════════════════════════

function countSimilarQuestions(messages, currentQuestion) {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase().trim())

  const currentLower = currentQuestion.toLowerCase().trim()
  const currentWords = new Set(currentLower.split(/\s+/))

  let similarCount = 0
  for (const msg of userMessages) {
    const msgWords = new Set(msg.split(/\s+/))
    const overlap = [...currentWords].filter(w => msgWords.has(w)).length
    const similarity = overlap / Math.max(currentWords.size, msgWords.size, 1)

    // 70% 이상 유사하면 같은 질문으로 판단
    if (similarity >= 0.7 || msg === currentLower) {
      similarCount++
    }
  }

  return similarCount
}


// ═══════════════════════════════════════════
//  에스컬레이션 (담당자 호출)
// ═══════════════════════════════════════════

async function triggerEscalation(question, userKey, reason, repeatCount = 0, keyword = '') {
  try {
    // 1. 미답변 테이블에 저장
    await supabase
      .from('chatbot_unanswered')
      .insert({
        kakao_user_key: userKey,
        bot_type: BOT_TYPE,
        question,
        confidence: 0,
        user_context: { reason, repeat_count: repeatCount, trigger_keyword: keyword },
        status: 'pending'
      })

    // 2. 네이버웍스 알림
    const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    const reasonLabel = {
      sensitive_keyword: `민감 키워드 감지 (${keyword})`,
      repeated_question: `반복 질문 ${repeatCount}회`,
      ai_uncertain: 'AI 답변 불확실'
    }

    const message = `💬 기업 챗봇 담당자 호출\n\n[사유] ${reasonLabel[reason] || reason}\n[시간] ${koreanTime}\n[질문] ${question}\n[사용자] ${userKey}\n\n관리자 페이지에서 확인:\nhttps://cnecbiz.com/admin/chatbot/dashboard`

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        channelId: CHATBOT_CHANNEL_ID,
        message
      })
    })
  } catch (error) {
    console.error('[triggerEscalation] Error:', error.message)
  }
}


// ═══════════════════════════════════════════
//  보안 유틸
// ═══════════════════════════════════════════

function findSensitiveKeyword(text) {
  const textLower = text.toLowerCase()
  return ESCALATION_KEYWORDS.find(kw => textLower.includes(kw)) || null
}

function containsInjection(text) {
  const injectionPatterns = [
    /ignore\s+(previous|above|all)/i,
    /system\s*prompt/i,
    /you\s+are\s+now/i,
    /act\s+as/i,
    /pretend\s+to\s+be/i,
    /\bDAN\b/,
    /jailbreak/i,
  ]
  return injectionPatterns.some(pattern => pattern.test(text))
}
