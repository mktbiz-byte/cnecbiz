// LINE 알림 헬퍼 함수
// 크리에이터에게 LINE 메시지 발송

/**
 * LINE 메시지 발송 기본 함수
 * @param {Object} options - 발송 옵션
 * @param {string} options.creatorId - 크리에이터 ID (DB에서 line_user_id 조회)
 * @param {string} options.creatorEmail - 크리에이터 이메일 (대체 조회)
 * @param {string} options.userId - LINE User ID (직접 지정)
 * @param {string} options.templateType - 템플릿 타입
 * @param {Object} options.templateData - 템플릿 데이터
 * @param {string} options.message - 직접 메시지 (템플릿 미사용시)
 */
export async function sendLineMessage(options) {
  try {
    const baseUrl = import.meta.env.VITE_SITE_URL || 'https://cnectotal.netlify.app';

    const response = await fetch(`${baseUrl}/.netlify/functions/send-line-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    const result = await response.json();

    if (!response.ok) {
      console.warn('[LINE] Message send failed:', result);
      return { success: false, error: result.error };
    }

    console.log('[LINE] Message sent:', result);
    return { success: true, ...result };
  } catch (error) {
    console.error('[LINE] Send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 크리에이터 가입 완료 LINE 알림
 */
export async function sendLineSignupNotification(creatorId, creatorName) {
  return sendLineMessage({
    creatorId,
    templateType: 'signup_complete',
    templateData: { creatorName }
  });
}

/**
 * 캠페인 선정 LINE 알림
 */
export async function sendLineCampaignSelectedNotification(creatorId, data) {
  return sendLineMessage({
    creatorId,
    templateType: 'campaign_selected',
    templateData: {
      creatorName: data.creatorName,
      campaignName: data.campaignName,
      brandName: data.brandName,
      deadline: data.deadline,
      guideUrl: data.guideUrl
    }
  });
}

/**
 * 정산 완료 LINE 알림
 */
export async function sendLinePaymentCompleteNotification(creatorId, data) {
  return sendLineMessage({
    creatorId,
    templateType: 'payment_complete',
    templateData: {
      creatorName: data.creatorName,
      amount: data.amount,
      campaignName: data.campaignName,
      paymentDate: data.paymentDate
    }
  });
}

/**
 * 영상 검토 요청 LINE 알림
 */
export async function sendLineVideoReviewNotification(creatorId, data) {
  return sendLineMessage({
    creatorId,
    templateType: 'video_review_request',
    templateData: {
      creatorName: data.creatorName,
      campaignName: data.campaignName,
      feedback: data.feedback,
      reviewUrl: data.reviewUrl
    }
  });
}

/**
 * 영상 승인 완료 LINE 알림
 */
export async function sendLineVideoApprovedNotification(creatorId, data) {
  return sendLineMessage({
    creatorId,
    templateType: 'video_approved',
    templateData: {
      creatorName: data.creatorName,
      campaignName: data.campaignName
    }
  });
}

/**
 * 일반 메시지 LINE 알림
 */
export async function sendLineGeneralNotification(creatorId, message) {
  return sendLineMessage({
    creatorId,
    message
  });
}

/**
 * 여러 크리에이터에게 일괄 LINE 알림
 */
export async function sendLineBulkNotification(creatorIds, templateType, templateData) {
  return sendLineMessage({
    creatorIds,
    templateType,
    templateData
  });
}

export default {
  sendLineMessage,
  sendLineSignupNotification,
  sendLineCampaignSelectedNotification,
  sendLinePaymentCompleteNotification,
  sendLineVideoReviewNotification,
  sendLineVideoApprovedNotification,
  sendLineGeneralNotification,
  sendLineBulkNotification
};
