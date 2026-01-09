/**
 * 영상 수정 요청 알림 발송
 * send-kakao-notification을 HTTP로 호출 (send-notification-helper와 동일한 방식)
 */

const axios = require('axios')

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { creatorName, creatorPhone, feedbackCount, campaignTitle, submissionId } = JSON.parse(event.body)

    if (!creatorPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'creatorPhone is required' })
      }
    }

    console.log('[INFO] Video review notification request:', {
      creatorName,
      creatorPhone: creatorPhone.slice(0, 3) + '****' + creatorPhone.slice(-4),
      feedbackCount,
      campaignTitle
    })

    // 오늘 날짜 (한국시간)
    const today = new Date()
    const todayStr = `${today.getMonth() + 1}월 ${today.getDate()}일`

    // 재제출 기한 (2일 후)
    const resubmitDeadline = new Date()
    resubmitDeadline.setDate(resubmitDeadline.getDate() + 2)
    const resubmitDateStr = `${resubmitDeadline.getMonth() + 1}월 ${resubmitDeadline.getDate()}일`

    // send-kakao-notification을 HTTP로 호출 (send-notification-helper와 동일한 방식)
    const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'

    try {
      console.log('[INFO] Calling send-kakao-notification via HTTP')
      const kakaoResponse = await axios.post(
        `${baseUrl}/.netlify/functions/send-kakao-notification`,
        {
          receiverNum: creatorPhone.replace(/-/g, ''),
          receiverName: creatorName || '크리에이터',
          templateCode: '025100001016',  // 영상 수정 요청 템플릿
          variables: {
            '크리에이터명': creatorName || '크리에이터',
            '캠페인명': campaignTitle || '캠페인',
            '요청일': todayStr,
            '재제출기한': resubmitDateStr
          }
        },
        { timeout: 10000 } // 10초 타임아웃
      )

      console.log('[SUCCESS] Kakao notification sent:', kakaoResponse.data)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '수정 요청이 크리에이터에게 전달되었습니다',
          data: kakaoResponse.data
        })
      }
    } catch (kakaoError) {
      console.error('[ERROR] Kakao notification failed:', kakaoError.message)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '수정 요청이 등록되었습니다 (알림 발송 실패)',
          warning: kakaoError.message
        })
      }
    }
  } catch (error) {
    console.error('[ERROR] Unexpected error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
