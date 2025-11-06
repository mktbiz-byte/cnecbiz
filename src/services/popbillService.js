/**
 * 팝빌 카카오톡 알림톡 서비스
 * 
 * Netlify Functions를 통해 서버에서 팝빌 API를 호출합니다.
 * 브라우저에서 직접 popbill 모듈을 사용할 수 없으므로,
 * Netlify Functions API를 호출하는 방식으로 구현되었습니다.
 */

/**
 * 알림톡 발송
 * @param {string} receiverNum - 수신자 전화번호 (하이픈 없이)
 * @param {string} receiverName - 수신자 이름
 * @param {string} templateCode - 템플릿 코드
 * @param {object} variables - 템플릿 변수 (예: { var1: '값1', var2: '값2' })
 * @returns {Promise<object>} 발송 결과
 */
export async function sendKakaoNotification(receiverNum, receiverName, templateCode, variables = {}) {
  try {
    const response = await fetch('/.netlify/functions/send-kakao-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiverNum,
        receiverName,
        templateCode,
        variables,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send Kakao notification');
    }

    return result;
  } catch (error) {
    console.error('Kakao notification error:', error);
    throw error;
  }
}

/**
 * 여러 수신자에게 알림톡 발송
 * @param {Array} messages - 메시지 배열 [{ receiverNum, receiverName, templateCode, variables }]
 * @returns {Promise<Array>} 발송 결과 배열
 */
export async function sendKakaoNotifications(messages) {
  const results = await Promise.allSettled(
    messages.map(msg =>
      sendKakaoNotification(msg.receiverNum, msg.receiverName, msg.templateCode, msg.variables)
    )
  );

  return results.map((result, index) => ({
    ...messages[index],
    success: result.status === 'fulfilled',
    result: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}

export default {
  sendKakaoNotification,
  sendKakaoNotifications,
};
