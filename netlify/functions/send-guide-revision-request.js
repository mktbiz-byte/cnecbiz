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

    // 네이버 웍스 액세스 토큰 발급
    const tokenResponse = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.NAVER_WORKS_CLIENT_ID,
        client_secret: process.env.NAVER_WORKS_CLIENT_SECRET,
        scope: 'bot'
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Naver Works access token')
    }

    const { access_token } = await tokenResponse.json()

    // 메시지 내용 구성
    const message = `🔔 **가이드 수정요청**

📋 **캠페인**: ${campaignTitle}
👤 **크리에이터**: ${creatorName}
🏢 **기업**: ${companyName || '미확인'}

📝 **수정요청 내용**:
${revisionRequest}

---
관리자 페이지에서 확인하세요: https://cnectotal.netlify.app/admin`

    // 네이버 웍스 메시지 전송
    const messageResponse = await fetch(
      `https://www.worksapis.com/v1.0/bots/${process.env.NAVER_WORKS_BOT_ID}/channels/${process.env.NAVER_WORKS_CHANNEL_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: {
            type: 'text',
            text: message
          }
        })
      }
    )

    if (!messageResponse.ok) {
      const errorData = await messageResponse.text()
      console.error('Naver Works message send error:', errorData)
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
