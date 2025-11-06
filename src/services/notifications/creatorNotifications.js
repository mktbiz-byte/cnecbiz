// 크리에이터용 알림톡 헬퍼 함수
import { sendAlimtalk } from '../popbillService.js';
import { POPBILL_TEMPLATES } from '../../lib/popbillTemplates.js';

/**
 * 크리에이터 회원가입 환영 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {string} creatorName - 크리에이터 이름
 */
export async function sendCreatorSignupNotification(receiverNum, receiverName, creatorName) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.SIGNUP.code,
    receiverNum,
    receiverName,
    templateParams: {
      '이름': creatorName
    }
  });
}

/**
 * 캠페인 선정 완료 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} campaignData - 캠페인 데이터
 */
export async function sendCampaignSelectedNotification(receiverNum, receiverName, campaignData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.CAMPAIGN_SELECTED.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': campaignData.creatorName,
      '캠페인명': campaignData.campaignName
    }
  });
}

/**
 * 촬영 가이드 전달 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} guideData - 가이드 데이터
 */
export async function sendGuideDeliveredNotification(receiverNum, receiverName, guideData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.GUIDE_DELIVERED.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': guideData.creatorName,
      '캠페인명': guideData.campaignName,
      '제출기한': guideData.deadline
    }
  });
}

/**
 * 영상 제출 기한 3일 전 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} reminderData - 리마인더 데이터
 */
export async function sendVideoDeadline3DaysNotification(receiverNum, receiverName, reminderData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.VIDEO_DEADLINE_3DAYS.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': reminderData.creatorName,
      '캠페인명': reminderData.campaignName,
      '제출기한': reminderData.deadline
    }
  });
}

/**
 * 영상 제출 기한 2일 전 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} reminderData - 리마인더 데이터
 */
export async function sendVideoDeadline2DaysNotification(receiverNum, receiverName, reminderData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.VIDEO_DEADLINE_2DAYS.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': reminderData.creatorName,
      '캠페인명': reminderData.campaignName,
      '제출기한': reminderData.deadline
    }
  });
}

/**
 * 영상 제출 기한 당일 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} reminderData - 리마인더 데이터
 */
export async function sendVideoDeadlineTodayNotification(receiverNum, receiverName, reminderData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.VIDEO_DEADLINE_TODAY.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': reminderData.creatorName,
      '캠페인명': reminderData.campaignName,
      '제출기한': reminderData.deadline
    }
  });
}

/**
 * 영상 수정 요청 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} revisionData - 수정 요청 데이터
 */
export async function sendVideoRevisionRequestedNotification(receiverNum, receiverName, revisionData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.VIDEO_REVISION_REQUESTED.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': revisionData.creatorName,
      '캠페인명': revisionData.campaignName,
      '요청일': revisionData.requestDate,
      '재제출기한': revisionData.resubmitDeadline
    }
  });
}

/**
 * 영상 승인 완료 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} approvalData - 승인 데이터
 */
export async function sendVideoApprovedNotification(receiverNum, receiverName, approvalData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.VIDEO_APPROVED.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': approvalData.creatorName,
      '캠페인명': approvalData.campaignName,
      '업로드기한': approvalData.uploadDeadline
    }
  });
}

/**
 * 캠페인 완료 포인트 지급 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} rewardData - 보상 데이터
 */
export async function sendCampaignRewardPaidNotification(receiverNum, receiverName, rewardData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.CAMPAIGN_REWARD_PAID.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': rewardData.creatorName,
      '캠페인명': rewardData.campaignName,
      '완료일': rewardData.completionDate
    }
  });
}

/**
 * 출금 접수 완료 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} withdrawalData - 출금 데이터
 */
export async function sendWithdrawalRequestedNotification(receiverNum, receiverName, withdrawalData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.WITHDRAWAL_REQUESTED.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': withdrawalData.creatorName,
      '출금금액': withdrawalData.amount.toLocaleString(),
      '신청일': withdrawalData.requestDate
    }
  });
}

/**
 * 출금 완료 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} withdrawalData - 출금 데이터
 */
export async function sendWithdrawalCompletedNotification(receiverNum, receiverName, withdrawalData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.WITHDRAWAL_COMPLETED.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': withdrawalData.creatorName,
      '입금일': withdrawalData.depositDate
    }
  });
}

/**
 * 제출 기한 지연 경고 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} penaltyData - 패널티 데이터
 */
export async function sendDeadlineOverdueNotification(receiverNum, receiverName, penaltyData) {
  return await sendAlimtalk({
    templateCode: POPBILL_TEMPLATES.CREATOR.DEADLINE_OVERDUE.code,
    receiverNum,
    receiverName,
    templateParams: {
      '크리에이터명': penaltyData.creatorName,
      '캠페인명': penaltyData.campaignName,
      '제출기한': penaltyData.deadline
    }
  });
}

export default {
  sendCreatorSignupNotification,
  sendCampaignSelectedNotification,
  sendGuideDeliveredNotification,
  sendVideoDeadline3DaysNotification,
  sendVideoDeadline2DaysNotification,
  sendVideoDeadlineTodayNotification,
  sendVideoRevisionRequestedNotification,
  sendVideoApprovedNotification,
  sendCampaignRewardPaidNotification,
  sendWithdrawalRequestedNotification,
  sendWithdrawalCompletedNotification,
  sendDeadlineOverdueNotification
};
