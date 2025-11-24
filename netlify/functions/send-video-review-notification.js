/**
 * 영상 수정 요청 알림 발송 (간소화 버전)
 * 크리에이터에게 알림톡만 발송
 */

const popbill = require('popbill')

// Popbill 설정
const LinkID = process.env.POPBILL_LINK_ID
const SecretKey = process.env.POPBILL_SECRET_KEY
const CorpNum = process.env.POPBILL_CORP_NUM
const UserID = process.env.POPBILL_USER_ID

// Popbill 서비스 초기화
const kakaoService = popbill.KakaoService(LinkID, SecretKey)

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
    const { creatorName, creatorPhone, feedbackCount, campaignTitle } = JSON.parse(event.body)

    if (!creatorPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'creatorPhone is required' })
      }
    }

    console.log('[INFO] Sending video review notification to:', creatorPhone)

    // 알림톡 발송
    try {
      const kakaoMessage = {
        plusFriendID: '@씨넥',
        templateCode: 'video_review_feedback',
        receiverNum: creatorPhone,
        receiverName: creatorName || '크리에이터',
        templateParams: {
          creator_name: creatorName || '크리에이터',
          campaign_title: campaignTitle || '캠페인',
          feedback_count: feedbackCount || 0
        },
        failedSubject: '[CNEC] 영상 수정 요청',
        failedMessage: `${creatorName || '크리에이터'}님, ${campaignTitle || '캠페인'} 영상에 ${feedbackCount || 0}개의 수정 요청이 등록되었습니다. CNEC 플랫폼에서 확인해주세요.`
      }

      await new Promise((resolve, reject) => {
        kakaoService.SendATS(
          CorpNum,
          '',
          kakaoMessage,
          UserID,
          (result) => {
            console.log('[SUCCESS] KakaoTalk sent:', result)
            resolve(result)
          },
          (error) => {
            console.error('[ERROR] KakaoTalk failed:', error)
            reject(error)
          }
        )
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: '수정 요청이 크리에이터에게 전달되었습니다'
        })
      }
    } catch (kakaoError) {
      console.error('[ERROR] Failed to send KakaoTalk:', kakaoError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: '알림 전송에 실패했습니다',
          details: kakaoError.message
        })
      }
    }
  } catch (error) {
    console.error('[ERROR] Unexpected error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
