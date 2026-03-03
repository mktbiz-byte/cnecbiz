/**
 * 챗봇 프롬프트 테스트 (Gemini API 호출)
 *
 * POST body: {
 *   bot_type: 'creator' | 'business',
 *   system_prompt: string,
 *   test_question: string,
 *   tone_config?: object
 * }
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { bot_type, system_prompt, test_question, tone_config } = JSON.parse(event.body)

    if (!system_prompt || !test_question) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '시스템 프롬프트와 테스트 질문을 입력하세요.' }) }
    }

    // 기준틀 조회 (활성 규칙만)
    const { data: guardrails } = await supabase
      .from('chatbot_guardrails')
      .select('rule_type, rule_value')
      .eq('bot_type', bot_type)
      .eq('is_active', true)

    // FAQ 샘플 (최대 10개)
    const { data: sampleFaqs } = await supabase
      .from('chatbot_faq')
      .select('question, answer, category')
      .eq('bot_type', bot_type)
      .eq('is_active', true)
      .limit(10)

    // 기준틀을 프롬프트에 통합
    let guardrailText = ''
    if (guardrails && guardrails.length > 0) {
      const grouped = {}
      guardrails.forEach(g => {
        if (!grouped[g.rule_type]) grouped[g.rule_type] = []
        grouped[g.rule_type].push(g.rule_value)
      })
      guardrailText = '\n\n[기준틀]\n' + Object.entries(grouped)
        .map(([type, values]) => `- ${type}: ${values.join(', ')}`)
        .join('\n')
    }

    let faqContext = ''
    if (sampleFaqs && sampleFaqs.length > 0) {
      faqContext = '\n\n[참고 FAQ]\n' + sampleFaqs
        .map(f => `Q: ${f.question}\nA: ${f.answer}`)
        .join('\n\n')
    }

    const fullPrompt = system_prompt + guardrailText + faqContext

    // Gemini API 호출
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: fullPrompt
    })

    const startTime = Date.now()
    const result = await model.generateContent(test_question)
    const responseTime = Date.now() - startTime

    const responseText = result.response.text()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          response: responseText,
          responseTime: `${responseTime}ms`,
          model: 'gemini-2.0-flash',
          promptLength: fullPrompt.length,
          guardrailsApplied: guardrails ? guardrails.length : 0,
          faqsIncluded: sampleFaqs ? sampleFaqs.length : 0
        }
      })
    }
  } catch (error) {
    console.error('[chatbot-test-prompt] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'chatbot-test-prompt', errorMessage: error.message })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
