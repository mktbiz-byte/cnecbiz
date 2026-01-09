/**
 * 영상 수정 요청 알림 발송
 * send-kakao-notification을 내부적으로 호출하여 알림톡 발송
 */

// send-kakao-notification 핸들러 가져오기
const sendKakaoNotification = require('./send-kakao-notification');

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

    // send-kakao-notification 호출을 위한 이벤트 구성
    const kakaoEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({
        receiverNum: creatorPhone.replace(/-/g, ''),
        receiverName: creatorName || '크리에이터',
        templateCode: '025100001016',  // 영상 수정 요청 템플릿
        variables: {
          '크리에이터명': creatorName || '크리에이터',
          '캠페인명': campaignTitle || '캠페인',
          '요청일': todayStr,
          '재제출기한': resubmitDateStr
        }
      })
    }

    // send-kakao-notification 호출
    const kakaoResult = await sendKakaoNotification.handler(kakaoEvent)
    const kakaoResponse = JSON.parse(kakaoResult.body)

    console.log('[INFO] Kakao notification result:', kakaoResponse)

    if (kakaoResponse.success) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '수정 요청이 크리에이터에게 전달되었습니다',
          receiptNum: kakaoResponse.receiptNum
        })
      }
    } else {
      // 알림톡 실패 시 SMS 대체 발송 시도
      console.error('[ERROR] Kakao notification failed:', kakaoResponse.error)

      try {
        const popbill = require('popbill')
        popbill.config({
          LinkID: process.env.POPBILL_LINK_ID,
          SecretKey: process.env.POPBILL_SECRET_KEY,
          IsTest: process.env.POPBILL_TEST_MODE === 'true',
          IPRestrictOnOff: true,
          UseStaticIP: false,
          UseLocalTimeYN: true
        })

        const smsService = popbill.MessageService()
        const smsResult = await new Promise((resolve, reject) => {
          smsService.sendSMS(
            process.env.POPBILL_CORP_NUM,
            process.env.POPBILL_SENDER_NUM || '18336025',
            creatorPhone.replace(/-/g, ''),
            creatorName || '크리에이터',
            `[CNEC] ${creatorName || '크리에이터'}님, '${campaignTitle || '캠페인'}' 영상에 수정 요청이 등록되었습니다. cnec.co.kr에서 확인해주세요.`,
            '',
            process.env.POPBILL_USER_ID || '',
            (result) => {
              console.log('[SUCCESS] SMS sent:', result)
              resolve(result)
            },
            (error) => {
              console.error('[ERROR] SMS failed:', error)
              reject(error)
            }
          )
        })

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: '수정 요청이 크리에이터에게 문자로 전달되었습니다',
            method: 'sms',
            receiptNum: smsResult
          })
        }
      } catch (smsError) {
        console.error('[ERROR] SMS also failed:', smsError)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: '수정 요청이 등록되었습니다 (알림 발송 실패)',
            warning: '크리에이터에게 직접 연락해 주세요',
            notificationFailed: true
          })
        }
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
