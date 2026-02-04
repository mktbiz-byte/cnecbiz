/**
 * 스티비(Stibee) 자동 이메일 발송 (트리거 API)
 *
 * 스티비의 자동 이메일 트리거 API를 사용하여 이메일을 발송합니다.
 * - 트리거 URL로 POST 요청 → 미리 설정된 템플릿으로 발송
 * - 커스텀 변수($%key%$)로 개인화 가능
 * - 1초당 3회, 1회당 256KB 제한
 *
 * POST /.netlify/functions/send-stibee-auto-email
 * Body: {
 *   triggerUrl: "https://stibee.com/api/v1.0/auto/...",  // 트리거 URL (필수)
 *   subscribers: [                                         // 발송 대상 (필수)
 *     { email: "user@example.com", name: "이름", ... }
 *   ],
 *   variables: { key1: "value1", ... }                     // 공통 변수 (선택)
 * }
 *
 * Stibee Auto Email API: https://help.stibee.com/email/automation/api
 */

const { createClient } = require('@supabase/supabase-js')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// 트리거 URL 프리셋 (국가별 초대장)
const TRIGGER_PRESETS = {
  japan_invitation: {
    url: 'https://stibee.com/api/v1.0/auto/NGM1OTFjMWMtZDhlZC00NWQ3LTljOTktMjhkOTQxODkzZjgz',
    label: '🇯🇵 일본 크리에이터 초대장'
  }
  // 한국, 미국 프리셋은 트리거 URL 생성 후 여기에 추가
  // korea_invitation: {
  //   url: 'https://stibee.com/api/v1.0/auto/...',
  //   label: '🇰🇷 한국 크리에이터 초대장'
  // },
  // us_invitation: {
  //   url: 'https://stibee.com/api/v1.0/auto/...',
  //   label: '🇺🇸 미국 크리에이터 초대장'
  // }
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_BIZ_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// 발송 로그 저장 (선택)
async function logSend(supabase, data) {
  if (!supabase) return
  try {
    await supabase.from('email_send_logs').insert({
      service: 'stibee_auto',
      trigger_url: data.triggerUrl,
      recipient_email: data.email,
      recipient_name: data.name,
      variables: data.variables,
      status: data.status,
      error: data.error,
      created_at: new Date().toISOString()
    })
  } catch (e) {
    // 로그 테이블이 없어도 무시
    console.log('[stibee-auto] Log save skipped:', e.message)
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const body = JSON.parse(event.body)
    const { action, triggerUrl, subscribers, variables = {}, preset } = body

    // action: 'get_presets' → 프리셋 목록 반환
    if (action === 'get_presets') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          presets: Object.entries(TRIGGER_PRESETS).map(([key, val]) => ({
            key,
            label: val.label,
            url: val.url
          }))
        })
      }
    }

    // 프리셋으로 트리거 URL 결정
    let finalTriggerUrl = triggerUrl
    if (!finalTriggerUrl && preset && TRIGGER_PRESETS[preset]) {
      finalTriggerUrl = TRIGGER_PRESETS[preset].url
    }

    if (!finalTriggerUrl) {
      throw new Error('트리거 URL이 필요합니다. (triggerUrl 또는 preset 파라미터)')
    }

    if (!subscribers || subscribers.length === 0) {
      throw new Error('발송 대상이 없습니다.')
    }

    console.log(`[stibee-auto] Sending to ${subscribers.length} subscribers via trigger: ${finalTriggerUrl.slice(-20)}...`)

    const supabase = getSupabase()
    const results = { sent: 0, failed: 0, errors: [] }

    // 스티비 자동 이메일은 1초당 3회 제한 → 350ms 간격으로 발송
    const DELAY_MS = 350

    for (let i = 0; i < subscribers.length; i++) {
      const subscriber = subscribers[i]

      if (!subscriber.email) {
        results.failed++
        results.errors.push({ index: i, error: '이메일 주소 없음' })
        continue
      }

      try {
        // 스티비 자동 이메일 API 요청
        // Body: { "subscriber": "email", "key1": "value1", ... }
        const requestBody = {
          subscriber: subscriber.email,
          // 공통 변수
          ...variables,
          // 개별 구독자 변수 (공통 변수보다 우선)
          name: subscriber.name || variables.name || '',
          email: subscriber.email,
          ...(subscriber.variables || {})
        }

        const response = await fetch(finalTriggerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        if (response.ok) {
          results.sent++
          console.log(`[stibee-auto] ✓ Sent to ${subscriber.email}`)

          await logSend(supabase, {
            triggerUrl: finalTriggerUrl,
            email: subscriber.email,
            name: subscriber.name,
            variables: requestBody,
            status: 'sent'
          })
        } else {
          const errorText = await response.text()
          results.failed++
          results.errors.push({
            email: subscriber.email,
            status: response.status,
            error: errorText
          })
          console.error(`[stibee-auto] ✕ Failed for ${subscriber.email}: ${response.status} - ${errorText}`)

          await logSend(supabase, {
            triggerUrl: finalTriggerUrl,
            email: subscriber.email,
            name: subscriber.name,
            variables: requestBody,
            status: 'failed',
            error: errorText
          })
        }
      } catch (err) {
        results.failed++
        results.errors.push({
          email: subscriber.email,
          error: err.message
        })
        console.error(`[stibee-auto] ✕ Error for ${subscriber.email}:`, err.message)
      }

      // Rate limiting (3 req/sec → 350ms 간격)
      if (i < subscribers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
    }

    console.log(`[stibee-auto] Complete: ${results.sent} sent, ${results.failed} failed`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results,
        message: `${results.sent}명 발송 완료, ${results.failed}명 실패`
      })
    }

  } catch (error) {
    console.error('[stibee-auto] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
