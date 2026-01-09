/**
 * 영상 수정 요청 알림 발송
 * send-kakao-notification.js와 동일한 구조 사용
 */

const popbill = require('popbill');

// 팝빌 전역 설정 (send-kakao-notification.js와 동일)
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

// 팝빌 카카오톡 서비스 객체 생성
const kakaoService = popbill.KakaoService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || '';

console.log('Video Review Notification - Popbill initialized');

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

    // 템플릿 내용 (send-kakao-notification.js의 025100001016과 100% 동일)
    const templateContent = `[CNEC] 제출하신 영상 수정 요청
#{크리에이터명}님, 제출하신 영상에 수정 요청이 있습니다.

캠페인: #{캠페인명}
수정 요청일: #{요청일}

크리에이터 대시보드에서 수정 사항을 확인하시고, 영상을 수정하여 재제출해 주세요.

재제출 기한: #{재제출기한}

문의: 1833-6025`

    // 변수 치환
    const variables = {
      '크리에이터명': creatorName || '크리에이터',
      '캠페인명': campaignTitle || '캠페인',
      '요청일': todayStr,
      '재제출기한': resubmitDateStr
    }

    let message = templateContent
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`#\\{${key}\\}`, 'g'), value)
    }

    console.log('[INFO] Sending message:', message)

    // 수신자 정보
    const receivers = [{
      rcv: creatorPhone.replace(/-/g, ''),
      rcvnm: creatorName || '크리에이터'
    }]

    // 크리에이터용 채널
    const plusFriendID = '@크넥_크리에이터'

    // 알림톡 발송
    try {
      const result = await new Promise((resolve, reject) => {
        kakaoService.sendATS(
          POPBILL_CORP_NUM,
          '025100001016',  // 템플릿 코드
          POPBILL_SENDER_NUM,
          message,
          message,  // altContent
          'C',      // altSendType
          '',       // sndDT (즉시발송)
          receivers,
          POPBILL_USER_ID,
          '',       // requestNum
          null,     // btns
          plusFriendID,
          (result) => {
            console.log('[SUCCESS] KakaoTalk ATS sent:', result)
            resolve(result)
          },
          (error) => {
            console.error('[ERROR] KakaoTalk ATS failed:', error)
            reject(error)
          }
        )
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '수정 요청이 크리에이터에게 전달되었습니다',
          receiptNum: result
        })
      }
    } catch (kakaoError) {
      console.error('[ERROR] Popbill KakaoTalk failed:', kakaoError)

      // 알림톡 실패 시 SMS 대체 발송
      try {
        const smsService = popbill.MessageService()
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
