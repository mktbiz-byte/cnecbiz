/**
 * 영상 수정 요청 알림 발송
 * send-kakao-notification을 HTTP로 호출 + SMS 대체 발송
 */

const axios = require('axios')
const popbill = require('popbill')

// SMS 대체 발송용 팝빌 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true
})

const smsService = popbill.MessageService()
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253'
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025'
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || ''

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

    // send-kakao-notification을 HTTP로 호출
    const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'
    let kakaoSuccess = false

    try {
      console.log('[INFO] Calling send-kakao-notification via HTTP')
      const kakaoResponse = await axios.post(
        `${baseUrl}/.netlify/functions/send-kakao-notification`,
        {
          receiverNum: creatorPhone.replace(/-/g, ''),
          receiverName: creatorName || '크리에이터',
          templateCode: '025100001016',
          variables: {
            '크리에이터명': creatorName || '크리에이터',
            '캠페인명': campaignTitle || '캠페인',
            '요청일': todayStr,
            '재제출기한': resubmitDateStr
          }
        },
        { timeout: 10000 }
      )

      if (kakaoResponse.data?.success) {
        console.log('[SUCCESS] Kakao notification sent:', kakaoResponse.data)
        kakaoSuccess = true
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: '수정 요청이 크리에이터에게 전달되었습니다',
            data: kakaoResponse.data
          })
        }
      } else {
        console.log('[WARN] Kakao notification returned false:', kakaoResponse.data)
      }
    } catch (kakaoError) {
      console.error('[ERROR] Kakao notification failed:', kakaoError.message)
    }

    // 알림톡 실패 시 SMS 대체 발송
    if (!kakaoSuccess) {
      console.log('[INFO] Trying SMS fallback...')
      try {
        const smsResult = await new Promise((resolve, reject) => {
          smsService.sendSMS(
            POPBILL_CORP_NUM,
            POPBILL_SENDER_NUM,
            creatorPhone.replace(/-/g, ''),
            creatorName || '크리에이터',
            `[CNEC] ${creatorName || '크리에이터'}님, '${campaignTitle || '캠페인'}' 영상에 수정 요청이 등록되었습니다. cnec.co.kr에서 확인해주세요.`,
            '',
            POPBILL_USER_ID,
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
