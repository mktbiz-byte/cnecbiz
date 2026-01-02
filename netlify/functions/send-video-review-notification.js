/**
 * 영상 수정 요청 알림 발송
 * 크리에이터에게 알림톡 발송 (Popbill 미설정 시 SMS 대체)
 */

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

    // Popbill 환경변수 확인
    const LinkID = process.env.POPBILL_LINK_ID
    const SecretKey = process.env.POPBILL_SECRET_KEY
    const CorpNum = process.env.POPBILL_CORP_NUM
    const UserID = process.env.POPBILL_USER_ID

    // Popbill 설정이 없으면 성공 반환 (개발/테스트 환경)
    if (!LinkID || !SecretKey || !CorpNum) {
      console.log('[INFO] Popbill not configured, skipping notification')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '수정 요청이 등록되었습니다 (알림 미발송 - Popbill 미설정)',
          skipped: true
        })
      }
    }

    // Popbill 서비스 초기화
    const popbill = require('popbill')
    popbill.config({
      LinkID,
      SecretKey,
      IsTest: process.env.NODE_ENV !== 'production',
      defaultErrorHandler: (error) => {
        console.error('[Popbill Error]', error)
      }
    })

    const kakaoService = popbill.KakaoService()

    // 오늘 날짜 (한국시간)
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
    // 재제출 기한 (7일 후)
    const resubmitDeadline = new Date()
    resubmitDeadline.setDate(resubmitDeadline.getDate() + 7)
    const resubmitDate = resubmitDeadline.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })

    // 알림톡 발송 메시지 구성 (팝빌 템플릿 025100001016과 100% 동일해야 함)
    // 템플릿의 #{변수명}을 실제 값으로 치환
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
      '요청일': today,
      '재제출기한': resubmitDate
    }

    let message = templateContent
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`#\\{${key}\\}`, 'g'), value)
    }

    // 알림톡 발송 시도
    try {
      const result = await new Promise((resolve, reject) => {
        kakaoService.sendATS(
          CorpNum,                           // 사업자번호
          '025100001016',                    // 템플릿 코드 (영상 수정 요청 알림)
          process.env.POPBILL_SENDER_NUM || '0212345678', // 발신번호
          message,                           // 템플릿 내용
          '[CNEC] 영상 수정 요청',           // 대체문자 제목
          message,                           // 대체문자 내용
          'A',                               // 대체문자 유형 (A: 대체문자 내용으로)
          creatorPhone.replace(/-/g, ''),    // 수신번호
          creatorName || '크리에이터',       // 수신자명
          '',                                // 예약일시 (빈 문자열: 즉시발송)
          '',                                // 요청번호
          UserID || '',                      // 팝빌 회원 아이디
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
      console.error('[ERROR] Popbill KakaoTalk failed, trying SMS fallback:', kakaoError)

      // 알림톡 실패 시 SMS 대체 발송 시도
      try {
        const smsService = popbill.MessageService()
        const smsResult = await new Promise((resolve, reject) => {
          smsService.sendSMS(
            CorpNum,
            process.env.POPBILL_SENDER_NUM || '0212345678',
            creatorPhone.replace(/-/g, ''),
            creatorName || '크리에이터',
            `[CNEC] ${creatorName || '크리에이터'}님, '${campaignTitle || '캠페인'}' 영상에 ${feedbackCount || 0}건의 수정 요청이 등록되었습니다. cnec.co.kr에서 확인해주세요.`,
            '',
            UserID || '',
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
        console.error('[ERROR] Both KakaoTalk and SMS failed:', smsError)

        // 모든 알림 실패해도 수정 요청은 등록된 상태이므로 성공 반환
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
