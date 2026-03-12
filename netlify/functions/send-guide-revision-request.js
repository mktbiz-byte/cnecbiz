// 가이드 수정요청을 네이버 웍스로 전송하는 함수
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const {
      campaignTitle,
      creatorName,
      companyName,
      revisionRequest
    } = JSON.parse(event.body)

    if (!campaignTitle || !creatorName || !revisionRequest) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    // 메시지 내용 구성
    const message = `🔔 가이드 수정요청

📋 캠페인: ${campaignTitle}
👤 크리에이터: ${creatorName}
🏢 기업: ${companyName || '미확인'}

📝 수정요청 내용:
${revisionRequest}

---
관리자 페이지에서 확인하세요: https://cnecbiz.com/admin`

    // send-naver-works-message 함수를 통해 JWT 인증으로 전송
    const worksResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        channelId: '54220a7e-0b14-1138-54ec-a55f62dc8b75',
        message: message
      })
    })

    const worksResult = await worksResponse.json()

    if (!worksResult.success) {
      console.error('Naver Works message send error:', worksResult)
      throw new Error('Failed to send message to Naver Works')
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '수정요청이 관리자에게 전달되었습니다.'
      })
    }

  } catch (error) {
    console.error('Guide revision request error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send guide revision request',
        message: error.message
      })
    }
  }
}
