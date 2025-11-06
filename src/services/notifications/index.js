// 통합 알림 서비스
// 기업용 및 크리에이터용 알림톡 헬퍼 함수 통합

// 기업용 알림
export {
  sendCompanySignupNotification,
  sendPaymentRequestNotification,
  sendPointChargeCompleteNotification,
  sendCampaignApprovedNotification,
  sendRecruitmentClosedNotification,
  sendGuideSubmittedNotification,
  sendVideoSubmittedNotification,
  sendCampaignCompletedNotification,
  sendCampaignReviewRequestedNotification
} from './companyNotifications.js';

// 크리에이터용 알림
export {
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
} from './creatorNotifications.js';

// 팝빌 직접 사용
export { sendAlimtalk, sendBulkAlimtalk } from '../popbillService.js';
