// 크리에이터용 알림톡 헬퍼 함수
import { sendKakaoNotification } from '../popbillService.js';
import { POPBILL_TEMPLATES } from '../../lib/popbillTemplates.js';

/**
 * 크리에이터 회원가입 환영 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 */
export async function sendCreatorSignupNotification(receiverNum, receiverName) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.SIGNUP.code,
    {
      '이름': receiverName
    }
  );
}

/**
 * 캠페인 선정 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} campaignData - 캠페인 데이터
 */
export async function sendCampaignSelectedNotification(receiverNum, receiverName, campaignData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.CAMPAIGN_SELECTED.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': campaignData.campaignName
    }
  );
}

/**
 * 가이드 전달 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} guideData - 가이드 데이터
 */
export async function sendGuideDeliveredNotification(receiverNum, receiverName, guideData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.GUIDE_DELIVERED.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': guideData.campaignName,
      '제출기한': guideData.deadline
    }
  );
}

/**
 * 영상 제출 리마인더 (3일 전)
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} reminderData - 리마인더 데이터
 */
export async function sendVideoSubmitReminder3Days(receiverNum, receiverName, reminderData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.VIDEO_SUBMIT_REMINDER_3DAYS.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': reminderData.campaignName,
      '제출기한': reminderData.deadline
    }
  );
}

/**
 * 영상 제출 리마인더 (2일 전)
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} reminderData - 리마인더 데이터
 */
export async function sendVideoSubmitReminder2Days(receiverNum, receiverName, reminderData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.VIDEO_SUBMIT_REMINDER_2DAYS.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': reminderData.campaignName,
      '제출기한': reminderData.deadline
    }
  );
}

/**
 * 영상 제출 리마인더 (당일)
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} reminderData - 리마인더 데이터
 */
export async function sendVideoSubmitReminderToday(receiverNum, receiverName, reminderData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.VIDEO_SUBMIT_REMINDER_TODAY.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': reminderData.campaignName,
      '제출기한': reminderData.deadline
    }
  );
}

/**
 * 영상 수정 요청 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} revisionData - 수정 요청 데이터
 */
export async function sendVideoRevisionRequestNotification(receiverNum, receiverName, revisionData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.VIDEO_REVISION_REQUEST.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': revisionData.campaignName,
      '요청일': revisionData.requestDate,
      '재제출기한': revisionData.resubmitDeadline
    }
  );
}

/**
 * 영상 승인 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} approvalData - 승인 데이터
 */
export async function sendVideoApprovedNotification(receiverNum, receiverName, approvalData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.VIDEO_APPROVED.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': approvalData.campaignName,
      '업로드기한': approvalData.uploadDeadline
    }
  );
}

/**
 * 포인트 지급 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} pointData - 포인트 데이터
 */
export async function sendPointAwardedNotification(receiverNum, receiverName, pointData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.POINT_AWARDED.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': pointData.campaignName,
      '완료일': pointData.completionDate
    }
  );
}

/**
 * 출금 신청 접수 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} withdrawalData - 출금 데이터
 */
export async function sendWithdrawalRequestedNotification(receiverNum, receiverName, withdrawalData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.WITHDRAWAL_REQUESTED.code,
    {
      '크리에이터명': receiverName,
      '출금금액': withdrawalData.amount.toLocaleString(),
      '신청일': withdrawalData.requestDate
    }
  );
}

/**
 * 출금 완료 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} withdrawalData - 출금 데이터
 */
export async function sendWithdrawalCompletedNotification(receiverNum, receiverName, withdrawalData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.WITHDRAWAL_COMPLETED.code,
    {
      '크리에이터명': receiverName,
      '입금일': withdrawalData.depositDate
    }
  );
}

/**
 * 출금 거절 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} withdrawalData - 출금 데이터 (reason 포함)
 */
export async function sendWithdrawalRejectedNotification(receiverNum, receiverName, withdrawalData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.WITHDRAWAL_REJECTED.code,
    {
      '크리에이터명': receiverName,
      '거절사유': withdrawalData.reason
    }
  );
}

/**
 * 제출 지연 경고 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} delayData - 지연 데이터
 */
export async function sendSubmissionDelayWarningNotification(receiverNum, receiverName, delayData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.SUBMISSION_DELAY_WARNING.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': delayData.campaignName,
      '제출기한': delayData.deadline
    }
  );
}

/**
 * 캠페인 선정 취소 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} cancelData - 취소 데이터
 */
export async function sendCampaignCancelledNotification(receiverNum, receiverName, cancelData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.CREATOR.CAMPAIGN_CANCELLED.code,
    {
      '크리에이터명': receiverName,
      '캠페인명': cancelData.campaignName,
      '사유': cancelData.reason
    }
  );
}

export default {
  sendCreatorSignupNotification,
  sendCampaignSelectedNotification,
  sendCampaignCancelledNotification,
  sendGuideDeliveredNotification,
  sendVideoSubmitReminder3Days,
  sendVideoSubmitReminder2Days,
  sendVideoSubmitReminderToday,
  sendVideoRevisionRequestNotification,
  sendVideoApprovedNotification,
  sendPointAwardedNotification,
  sendWithdrawalRequestedNotification,
  sendWithdrawalCompletedNotification,
  sendWithdrawalRejectedNotification,
  sendSubmissionDelayWarningNotification
};
