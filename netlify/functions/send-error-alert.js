/**
 * 에러 발생 시 네이버웍스 에러 알림 채널로 알림 전송
 * 카카오톡/네이버웍스/결제/캠페인 오류 발생 시 호출
 *
 * POST body: {
 *   functionName: string,  // 오류 발생 함수명
 *   errorMessage: string,  // 에러 메시지
 *   context: object        // 추가 컨텍스트 (선택)
 * }
 */

const ERROR_CHANNEL_ID = '54220a7e-0b14-1138-54ec-a55f62dc8b75'

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { functionName, errorMessage, context } = JSON.parse(event.body)

    const koreanTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // 컨텍스트 정보 구성
    let contextLines = ''
    if (context && typeof context === 'object') {
      const entries = Object.entries(context).filter(([, v]) => v != null && v !== '')
      if (entries.length > 0) {
        contextLines = '\n\n[상세 정보]\n' + entries.map(([k, v]) => `• ${k}: ${v}`).join('\n')
      }
    }

    const alertMessage = `🚨 시스템 오류 알림\n\n[함수] ${functionName || '알 수 없음'}\n[시간] ${koreanTime}\n[오류] ${errorMessage || '알 수 없는 오류'}${contextLines}`

    const baseUrl = process.env.URL || 'https://cnecbiz.com'

    const response = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        channelId: ERROR_CHANNEL_ID,
        message: alertMessage
      })
    })

    const result = await response.json()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, result })
    }

  } catch (error) {
    console.error('[send-error-alert] Failed to send error alert:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
