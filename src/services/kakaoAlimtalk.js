/**
 * Kakao Alimtalk Service
 * 카카오 알림톡 발송 서비스
 * 
 * 검색용 ID: @크넥_크리에이터
 * 템플릿 코드: 025100001011 (캠페인 선정 완료)
 */

const KAKAO_API_BASE_URL = process.env.VITE_KAKAO_API_BASE_URL || 'https://api.kakaoi.ai'
const KAKAO_SENDER_KEY = process.env.VITE_KAKAO_SENDER_KEY || ''
const KAKAO_ACCESS_TOKEN = process.env.VITE_KAKAO_ACCESS_TOKEN || ''

/**
 * OAuth 2.0 토큰 발급
 */
export async function getKakaoAccessToken() {
  // 실제 구현 시 OAuth 2.0 인증 필요
  // 현재는 환경변수에서 가져옴
  return KAKAO_ACCESS_TOKEN
}

/**
 * 캠페인 선정 완료 알림톡 발송
 * @param {Object} params
 * @param {string} params.creatorName - 크리에이터 이름
 * @param {string} params.phoneNumber - 수신 전화번호 (01012341234 형식)
 * @param {string} params.campaignName - 캠페인명
 * @param {string} params.cid - 고유 식별자 (선택)
 */
export async function sendCampaignSelectionNotification({ 
  creatorName, 
  phoneNumber, 
  campaignName,
  cid 
}) {
  try {
    const accessToken = await getKakaoAccessToken()
    
    if (!accessToken) {
      console.error('Kakao access token not found')
      return { success: false, error: 'Access token missing' }
    }

    // 전화번호 포맷팅 (하이픈 제거)
    const formattedPhone = phoneNumber.replace(/-/g, '')
    
    // 메시지 내용
    const message = `[CNEC] 지원하신 캠페인 선정 완료

#{creatorName}님, 축하합니다! 지원하신 캠페인에 선정되셨습니다.

캠페인: #{campaignName}

크리에이터 대시보드에서 캠페인 준비사항을 체크해 주세요.
촬영 가이드는 2~3일 이내 전달될 예정입니다.

사전 촬영 시 가이드 미준수로 재촬영될 수 있으니 가이드가 도착하면 촬영 시작해 주세요.

문의: 1833-6025`

    // 템플릿 변수 치환
    const finalMessage = message
      .replace(/#{creatorName}/g, creatorName)
      .replace(/#{campaignName}/g, campaignName)

    // API 요청 데이터
    const requestData = {
      message_type: 'AT',
      sender_key: KAKAO_SENDER_KEY,
      cid: cid || `cnec_${Date.now()}`,
      template_code: '025100001011',
      phone_number: formattedPhone,
      message: finalMessage,
      fall_back_yn: true, // SMS 대체 발송 활성화
      sender_no: '18336025' // 대체 발송 시 발신번호
    }

    // API 호출
    const response = await fetch(`${KAKAO_API_BASE_URL}/v2/send/kakao`, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    const result = await response.json()

    if (response.ok && result.code === '200') {
      console.log('Alimtalk sent successfully:', result)
      return { 
        success: true, 
        uid: result.uid,
        cid: result.cid,
        message: '알림톡이 발송되었습니다.'
      }
    } else {
      console.error('Alimtalk send failed:', result)
      return { 
        success: false, 
        error: result.result?.detail_message || 'Unknown error',
        code: result.code
      }
    }
  } catch (error) {
    console.error('Error sending Alimtalk:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * 알림톡 발송 결과 조회 (Polling)
 * @param {string} reportGroupNo - 리포트 그룹 번호
 */
export async function getAlimtalkDeliveryResult(reportGroupNo) {
  try {
    const accessToken = await getKakaoAccessToken()
    
    const response = await fetch(`${KAKAO_API_BASE_URL}/v2/info/message/results`, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const result = await response.json()
    
    if (response.ok && result.code === '200') {
      return {
        success: true,
        results: result.results
      }
    } else {
      return {
        success: false,
        error: result.code_detail?.detail_message || 'Unknown error'
      }
    }
  } catch (error) {
    console.error('Error getting delivery result:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
