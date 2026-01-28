/**
 * 스티비(Stibee) 캠페인 이메일 발송
 * - 선택한 수신자들에게 스티비 템플릿 이메일 발송
 * - 스티비 API: https://api.stibee.com/docs
 */

const STIBEE_API_KEY = process.env.STIBEE_API_KEY
const STIBEE_API_URL = 'https://api.stibee.com/v1'

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

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
    if (!STIBEE_API_KEY) {
      throw new Error('STIBEE_API_KEY is not configured')
    }

    const { templateId, recipients, listId } = JSON.parse(event.body)

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients provided')
    }

    console.log(`[send-stibee-campaign] Sending to ${recipients.length} recipients`)

    // 스티비 API를 통해 구독자 추가 및 이메일 발송
    // 방법 1: 주소록에 구독자 추가 후 이메일 발송
    // 방법 2: 트랜잭셔널 이메일로 직접 발송

    // 여기서는 방법 2 (트랜잭셔널 이메일)을 사용
    // 각 수신자에게 개별 발송

    const results = {
      success: 0,
      failed: 0,
      errors: []
    }

    for (const recipient of recipients) {
      try {
        // 스티비 트랜잭셔널 이메일 API 호출
        const response = await fetch(`${STIBEE_API_URL}/emails/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'AccessToken': STIBEE_API_KEY
          },
          body: JSON.stringify({
            email: recipient.email,
            name: recipient.name || '',
            templateId: parseInt(templateId),
            // 변수 치환 (템플릿에서 사용 가능)
            variables: {
              name: recipient.name || '크리에이터',
              email: recipient.email
            }
          })
        })

        const result = await response.json()

        if (response.ok && result.Ok) {
          results.success++
        } else {
          results.failed++
          results.errors.push({
            email: recipient.email,
            error: result.Error || result.message || 'Unknown error'
          })
        }

      } catch (err) {
        results.failed++
        results.errors.push({
          email: recipient.email,
          error: err.message
        })
      }

      // Rate limiting 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`[send-stibee-campaign] Results: ${results.success} success, ${results.failed} failed`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: results,
        message: `${results.success}명에게 발송 완료, ${results.failed}명 실패`
      })
    }

  } catch (error) {
    console.error('[send-stibee-campaign] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
