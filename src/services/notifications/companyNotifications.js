// 기업용 알림톡 헬퍼 함수
import { sendKakaoNotification } from '../popbillService.js';
import { POPBILL_TEMPLATES } from '../../lib/popbillTemplates.js';

/**
 * 기업 회원가입 환영 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {string} companyName - 회사명
 */
export async function sendCompanySignupNotification(receiverNum, receiverName, companyName) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.SIGNUP.code,
    {
      '회원명': companyName
    }
  );
}

/**
 * 캠페인 신청 및 입금 안내 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} campaignData - 캠페인 데이터
 */
export async function sendPaymentRequestNotification(receiverNum, receiverName, campaignData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.PAYMENT_REQUEST.code,
    {
      '회사명': campaignData.companyName,
      '캠페인명': campaignData.campaignName,
      '금액': campaignData.amount.toLocaleString()
    }
  );
}

/**
 * 포인트 충전 완료 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} pointData - 포인트 데이터
 */
export async function sendPointChargeCompleteNotification(receiverNum, receiverName, pointData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.POINT_CHARGE_COMPLETE.code,
    {
      '회사명': pointData.companyName,
      '포인트': pointData.points.toLocaleString(),
      '캠페인명': pointData.campaignName || ''
    }
  );
}

/**
 * 캠페인 승인 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} campaignData - 캠페인 데이터
 */
export async function sendCampaignApprovedNotification(receiverNum, receiverName, campaignData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.CAMPAIGN_APPROVED.code,
    {
      '회사명': campaignData.companyName,
      '캠페인명': campaignData.campaignName,
      '시작일': campaignData.startDate,
      '마감일': campaignData.endDate,
      '모집인원': campaignData.recruitCount
    }
  );
}

/**
 * 모집 마감 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} campaignData - 캠페인 데이터
 */
export async function sendRecruitmentClosedNotification(receiverNum, receiverName, campaignData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.CAMPAIGN_RECRUITMENT_CLOSED.code,
    {
      '회사명': campaignData.companyName,
      '캠페인명': campaignData.campaignName,
      '지원자수': campaignData.applicantCount
    }
  );
}

/**
 * 가이드 제출 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} submissionData - 제출 데이터
 */
export async function sendGuideSubmittedNotification(receiverNum, receiverName, submissionData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.GUIDE_SUBMITTED.code,
    {
      '회사명': submissionData.companyName,
      '캠페인명': submissionData.campaignName,
      '크리에이터명': submissionData.creatorName
    }
  );
}

/**
 * 영상 제출 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} submissionData - 제출 데이터
 */
export async function sendVideoSubmittedNotification(receiverNum, receiverName, submissionData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.VIDEO_SUBMITTED.code,
    {
      '회사명': submissionData.companyName,
      '캠페인명': submissionData.campaignName,
      '크리에이터명': submissionData.creatorName
    }
  );
}

/**
 * 캠페인 완료 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} campaignData - 캠페인 데이터
 */
export async function sendCampaignCompletedNotification(receiverNum, receiverName, campaignData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.CAMPAIGN_COMPLETED.code,
    {
      '회사명': campaignData.companyName,
      '캠페인명': campaignData.campaignName
    }
  );
}

/**
 * 캠페인 검수 신청 알림
 * @param {string} receiverNum - 수신번호
 * @param {string} receiverName - 수신자 이름
 * @param {Object} campaignData - 캠페인 데이터
 */
export async function sendCampaignReviewRequestedNotification(receiverNum, receiverName, campaignData) {
  return await sendKakaoNotification(
    receiverNum,
    receiverName,
    POPBILL_TEMPLATES.COMPANY.CAMPAIGN_REVIEW_REQUESTED.code,
    {
      '회사명': campaignData.companyName,
      '캠페인명': campaignData.campaignName,
      '시작일': campaignData.startDate,
      '마감일': campaignData.endDate,
      '모집인원': campaignData.recruitCount
    }
  );
}
