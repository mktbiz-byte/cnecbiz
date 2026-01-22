import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// EditModeProvider removed - use Site Management page instead
import LandingPage from './components/LandingPage'
import LoginPageNew from './components/LoginPageNew'
import LoginPageOld from './components/LoginPageOld'
import SignupPageNew from './components/SignupPageNew'
import SignupWithVerification from './components/SignupWithVerification'
import FindEmailPage from './components/FindEmailPage'
import FindPasswordPage from './components/FindPasswordPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import CompanyDashboard from './components/company/CompanyDashboard'
import CreateCampaign from './components/company/CreateCampaign'
import CreateCampaignRouter from './components/company/CreateCampaignRouter'
import CampaignWizard from './components/company/CampaignWizard'
import CampaignGuide from './components/company/CampaignGuide'
import CampaignGuideOliveYoung from './components/company/CampaignGuideOliveYoung'
import OliveYoungGuideViewer from './components/company/OliveYoungGuideViewer'
import OliveYoungFinalGuide from './components/company/OliveYoungFinalGuide'
import CampaignGuide4WeekChallenge from './components/company/CampaignGuide4WeekChallenge'
import FourWeekChallengeFinalGuide from './components/company/FourWeekChallengeFinalGuide'
import FourWeekChallengeGuideViewer from './components/company/FourWeekChallengeGuideViewer'
import OliveYoungInvoice from './components/company/OliveYoungInvoice'
import FourWeekChallengeInvoice from './components/company/FourWeekChallengeInvoice'
import CampaignGuideEditor from './components/company/CampaignGuideEditor'
import CampaignConfirmation from './components/company/CampaignConfirmation'
import CampaignGuideJapan from './components/company/CampaignGuideJapan'
import CampaignGuideUS from './components/company/CampaignGuideUS'
import CompanySceneGuideEditor from './components/company/CompanySceneGuideEditor'
import AdvancedGuideJapan from './components/company/AdvancedGuideJapan'
import GuideReview from './components/company/GuideReview'
import CampaignGuideReview from './components/company/CampaignGuideReview'
import CreatorManagement from './components/company/CreatorManagement'
import OrderConfirmation from './components/company/OrderConfirmation'
import InvoicePage from './components/company/InvoicePage'
import MyCampaigns from './components/company/MyCampaigns'
import CampaignDetail from './components/company/CampaignDetail'
import VideoReview from './components/company/VideoReview'
import VideoReviewView from './components/creator/VideoReviewView'
import CampaignApprovals from './components/admin/CampaignApprovals'
import CampaignReview from './components/admin/CampaignReview'
import TeamManagement from './components/company/TeamManagement'
import PointsManagement from './components/company/PointsManagement'
import PointsChargePage from './components/company/PointsChargePage'
import CompanyProfileSetup from './components/company/CompanyProfileSetup'
import CompanyProfileEdit from './components/company/CompanyProfileEdit'
import PaymentHistory from './components/company/PaymentHistory'
import PaymentMethodSelection from './components/company/PaymentMethodSelection'
import TossPaymentWidget from './components/payment/TossPaymentWidget'
import PaymentSuccess from './components/payment/PaymentSuccess'
import PaymentFail from './components/payment/PaymentFail'
import Translator from './components/company/Translator'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminLogin from './components/admin/AdminLogin'
import AdminManagement from './components/admin/AdminManagement'
import RevenueManagement from './components/admin/RevenueManagement'
import RevenueManagementEnhanced from './components/admin/RevenueManagementEnhanced'
import RevenueManagementNew from './components/admin/RevenueManagementNew'
import PointsChargeManagement from './components/admin/PointsChargeManagement'
import WithdrawalManagement from './components/admin/WithdrawalManagement'
import CreatorPointHistory from './components/admin/CreatorPointHistory'
import AdminContractManagement from './components/admin/AdminContractManagement'
import CompaniesManagement from './components/admin/CompaniesManagement'
import ConsultationManagement from './components/admin/ConsultationManagement'
import CampaignsManagement from './components/admin/CampaignsManagement'
import AdminCampaignDetail from './components/admin/AdminCampaignDetail'
import AdminCampaignEdit from './components/admin/AdminCampaignEdit'
import SceneGuideEditor from './components/admin/SceneGuideEditor'
import CreatorSceneGuideEditor from './components/admin/CreatorSceneGuideEditor'
import AdminCampaignGuides from './components/admin/AdminCampaignGuides'
import GuidePDFManager from './components/admin/GuidePDFManager'
import CreatorsManagement from './components/admin/CreatorsManagement'
import FeaturedCreatorManagementPageNew from './components/admin/FeaturedCreatorManagementPageNew'
import SnsUploadManagement from './components/admin/SnsUploadManagement'
import SnsAutoUploadPage from './components/admin/SnsAutoUploadPage'
import SnsOAuthCallback from './components/admin/SnsOAuthCallback'
import CreatorMyPage from './components/creator/CreatorMyPage'
import CampaignVideoFeedback from './components/company/CampaignVideoFeedback'

import FAQManagement from './components/admin/FAQManagement'
import VideoManagement from './components/admin/VideoManagement'
import VideoFeedback from './components/admin/VideoFeedback'
import FeaturedCreatorApprovals from './components/admin/FeaturedCreatorApprovals'
import CampaignCreatorRecommendations from './components/admin/CampaignCreatorRecommendations'
import CreatorMappingManagement from './components/admin/CreatorMappingManagement'
import YoutuberSearchPage from './components/admin/YoutuberSearchPage'
import CreatorProfileApplication from './components/creator/CreatorProfileApplication'
import ProfileCompletionKorea from './components/creator/ProfileCompletionKorea'
import CreatorDetailProfile from './components/company/CreatorDetailProfile'
import FeaturedCreatorsPage from './components/company/FeaturedCreatorsPage'
import FeaturedCreatorProfile from './components/company/FeaturedCreatorProfile'
import CreatorProfilePage from './components/company/CreatorProfilePage'
import WithdrawalRequest from './components/creator/WithdrawalRequest'
import USShippingInfoForm from './components/creator/USShippingInfoForm'
import TaxOfficePage from './components/tax/TaxOfficePage'
import TaxFeedbackManagement from './components/admin/TaxFeedbackManagement'
import SiteEditor from './components/admin/SiteEditor'
import SiteManagement from './components/admin/SiteManagement'
import SiteManagementCreator from './components/admin/SiteManagementCreator'
import RevenueManagementWithCharts from './components/admin/RevenueManagementWithCharts'
import ReceivableDetailReport from './components/admin/ReceivableDetailReport'
import PublicReport from './components/PublicReport'
import AllCreatorsPage from './components/admin/AllCreatorsPage'
import LineChatManagement from './components/admin/LineChatManagement'


import CreatorManagementPage from './components/admin/CreatorManagementPage'
import OurChannelReport from './components/admin/OurChannelReport'
import CreatorReport from './components/admin/CreatorReport'
import SignContract from './pages/SignContract'
import ContractManagement from './components/company/ContractManagement'
import Guidebook from './pages/Guidebook'
import GuidebookManagement from './components/admin/GuidebookManagement'
import TestKakaoNotification from './components/admin/TestKakaoNotification'
import LineMessagesManagement from './components/admin/LineMessagesManagement'
import TestNaverWorks from './pages/TestNaverWorks'
import CampaignGuideTemplatePrototype from './components/admin/CampaignGuideTemplatePrototype'
import ConsultationBanner from './components/ConsultationBanner'
import NewsletterShowcaseManagement from './components/admin/NewsletterShowcaseManagement'
import NewsletterShowcase from './pages/NewsletterShowcase'
import NewsletterDetail from './pages/NewsletterDetail'

import AuthCallback from './components/AuthCallback'
import RegularCampaignIntro from './pages/RegularCampaignIntro'
import OliveYoungCampaignIntro from './pages/OliveYoungCampaignIntro'
import FourWeekChallengeCampaignIntro from './pages/FourWeekChallengeCampaignIntro'
import InvitationLanding from './pages/InvitationLanding'

function App() {
  return (
    <Router>
      <ConsultationBanner />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/guidebook" element={<Guidebook />} />
        <Route path="/campaigns/intro/regular" element={<RegularCampaignIntro />} />
        <Route path="/campaigns/intro/oliveyoung" element={<OliveYoungCampaignIntro />} />
        <Route path="/campaigns/intro/4week" element={<FourWeekChallengeCampaignIntro />} />
        <Route path="/report/:reportCode" element={<PublicReport />} />
        <Route path="/invitation/:id" element={<InvitationLanding />} />
        <Route path="/newsletters" element={<NewsletterShowcase />} />
        <Route path="/newsletter/:id" element={<NewsletterDetail />} />
        <Route path="/us-shipping-info" element={<USShippingInfoForm />} />
        <Route path="/login" element={<LoginPageNew />} />
        <Route path="/login-old" element={<LoginPageOld />} />
        <Route path="/signup" element={<SignupWithVerification />} />
        <Route path="/find-email" element={<FindEmailPage />} />
        <Route path="/find-password" element={<FindPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/signup-old" element={<SignupPageNew />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Company Admin Routes */}
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/campaigns/new" element={<CreateCampaignRouter />} />
        <Route path="/company/campaigns/create/:region" element={<CreateCampaignRouter />} />
        <Route path="/company/campaigns/wizard" element={<CampaignWizard />} />
        <Route path="/company/campaigns/guide" element={<CampaignGuideEditor />} />
        <Route path="/company/campaigns/confirmation" element={<CampaignConfirmation />} />
        <Route path="/company/campaigns/guide/japan" element={<CampaignGuideJapan />} />
        <Route path="/company/campaigns/guide/us" element={<CampaignGuideUS />} />
        <Route path="/company/campaigns/scene-guide" element={<CompanySceneGuideEditor />} />
        <Route path="/company/campaigns/guide/japan/advanced" element={<AdvancedGuideJapan />} />
        <Route path="/company/campaigns/:id/guide" element={<CampaignGuide />} />
        <Route path="/company/campaigns/guide/oliveyoung" element={<CampaignGuideOliveYoung />} />
        <Route path="/company/campaigns/:id/guide/oliveyoung/preview" element={<OliveYoungGuideViewer />} />
        <Route path="/company/campaigns/:id/guide/oliveyoung/review" element={<OliveYoungGuideViewer />} />
        <Route path="/company/campaigns/guide/oliveyoung/final" element={<OliveYoungFinalGuide />} />
        <Route path="/company/campaigns/guide/4week" element={<CampaignGuide4WeekChallenge />} />
        <Route path="/company/campaigns/:id/guide/4week/review" element={<FourWeekChallengeGuideViewer />} />
        <Route path="/company/campaigns/guide/4week/final" element={<FourWeekChallengeFinalGuide />} />
        <Route path="/company/campaigns/:id/invoice/oliveyoung" element={<OliveYoungInvoice />} />
        <Route path="/company/campaigns/:id/invoice/4week" element={<FourWeekChallengeInvoice />} />
        <Route path="/company/campaigns/:id/review" element={<CampaignGuideReview />} />
        <Route path="/company/campaigns/:id/review-old" element={<GuideReview />} />
        <Route path="/company/campaigns/:id/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/company/campaigns/:id/invoice" element={<InvoicePage />} />
        <Route path="/company/campaigns" element={<MyCampaigns />} />
        {/* <Route path="/company/creators" element={<CreatorManagement />} /> */} {/* 임시 비활성화 */}
        <Route path="/company/campaigns/:id/edit" element={<CreateCampaignRouter />} />
        <Route path="/company/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/video-review/:submissionId" element={<VideoReview />} />
        <Route path="/creator/video-review/:submissionId" element={<VideoReviewView />} />
        <Route path="/company/translator" element={<Translator />} />
        <Route path="/company/contracts" element={<ContractManagement />} />
        <Route path="/company/teams" element={<TeamManagement />} />
        {/* <Route path="/company/points/charge" element={<PointsChargePage />} /> */} {/* 포인트 시스템 제거로 비활성화 */}
        <Route path="/company/profile-setup" element={<CompanyProfileSetup />} />
        <Route path="/company/profile-edit" element={<CompanyProfileEdit />} />
        <Route path="/company/payments" element={<PaymentHistory />} />
        <Route path="/company/campaigns/payment" element={<PaymentMethodSelection />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/fail" element={<PaymentFail />} />
        <Route path="/featured-creators" element={<FeaturedCreatorsPage />} />
        <Route path="/featured-creators/:id" element={<FeaturedCreatorProfile />} />
        <Route path="/company/creators/:id/profile" element={<CreatorProfilePage />} />
        <Route path="/admin/creators" element={<CreatorManagementPage />} />
        <Route path="/admin/youtuber-search" element={<YoutuberSearchPage />} />
        <Route path="/admin/channel-report/:creatorId" element={<CreatorReport />} />
        <Route path="/admin/our-channel-report/:channelId" element={<OurChannelReport />} />
        
        {/* Super Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/manage-admins" element={<AdminManagement />} />
        <Route path="/admin/revenue" element={<Navigate to="/admin/revenue-charts" replace />} />
        <Route path="/admin/revenue-old" element={<RevenueManagement />} />
        <Route path="/admin/revenue-enhanced" element={<RevenueManagementEnhanced />} />
        <Route path="/admin/points-charge" element={<PointsChargeManagement />} />
        <Route path="/admin/withdrawals" element={<WithdrawalManagement />} />
        <Route path="/admin/point-history" element={<CreatorPointHistory />} />
        <Route path="/admin/tax-feedback" element={<TaxFeedbackManagement />} />
        <Route path="/tax-office/:batchId" element={<TaxOfficePage />} />
        <Route path="/admin/companies" element={<CompaniesManagement />} />
        <Route path="/admin/consultations" element={<ConsultationManagement />} />
        <Route path="/admin/campaigns" element={<CampaignsManagement />} />
        <Route path="/admin/campaigns/:id" element={<AdminCampaignDetail />} />
        <Route path="/admin/campaigns/:id/edit" element={<AdminCampaignEdit />} />
        <Route path="/admin/campaigns/:id/guides" element={<AdminCampaignGuides />} />
        <Route path="/admin/campaigns/:id/scene-guide" element={<SceneGuideEditor />} />
        <Route path="/admin/campaigns/:id/creator-guide" element={<CreatorSceneGuideEditor />} />
        <Route path="/admin/campaign-approvals" element={<CampaignApprovals />} />
        <Route path="/admin/campaigns/:id/review" element={<CampaignReview />} />
        <Route path="/admin/featured-creators" element={<FeaturedCreatorManagementPageNew />} />

        <Route path="/admin/manage-faqs" element={<FAQManagement />} />
        <Route path="/admin/videos" element={<VideoManagement />} />
        <Route path="/admin/video-feedback" element={<VideoFeedback />} />
        <Route path="/company/video-feedback" element={<CampaignVideoFeedback />} />
        <Route path="/creator/video-feedback" element={<CampaignVideoFeedback />} />
        <Route path="/admin/site-editor" element={<SiteEditor />} />
        <Route path="/admin/site-management" element={<SiteManagement />} />
        <Route path="/admin/site-management-creator" element={<SiteManagementCreator />} />
        <Route path="/admin/revenue-charts" element={<RevenueManagementNew />} />
        <Route path="/admin/revenue-charts-old" element={<RevenueManagementWithCharts />} />
        <Route path="/admin/receivable-detail/:id" element={<ReceivableDetailReport />} />
          <Route path="/admin/all-creators" element={<AllCreatorsPage />} />
        <Route path="/admin/line-chat" element={<LineChatManagement />} />
        <Route path="/admin/contracts" element={<AdminContractManagement />} />
        <Route path="/admin/guidebook" element={<GuidebookManagement />} />
        <Route path="/admin/newsletters" element={<NewsletterShowcaseManagement />} />
        <Route path="/admin/guide-pdfs" element={<GuidePDFManager />} />
        <Route path="/admin/test-kakao" element={<TestKakaoNotification />} />
        <Route path="/admin/line-messages" element={<LineMessagesManagement />} />
        <Route path="/admin/guide-templates" element={<CampaignGuideTemplatePrototype />} />
        <Route path="/admin/sns-uploads" element={<SnsAutoUploadPage />} />
        <Route path="/admin/sns-uploads/callback/:platform" element={<SnsOAuthCallback />} />
        <Route path="/admin/sns-completed" element={<SnsUploadManagement />} />
        <Route path="/test-naver-works" element={<TestNaverWorks />} />


        <Route path="/admin/creator-approvals" element={<FeaturedCreatorApprovals />} />
        <Route path="/admin/campaigns/:campaignId/recommendations" element={<CampaignCreatorRecommendations />} />
        <Route path="/admin/creator-mapping" element={<CreatorMappingManagement />} />

        {/* Creator Routes */}
        <Route path="/creator/mypage" element={<CreatorMyPage />} />
        <Route path="/creator/complete-profile" element={<ProfileCompletionKorea />} />
        <Route path="/creator/apply" element={<CreatorProfileApplication />} />
        <Route path="/creator/withdrawal" element={<WithdrawalRequest />} />
        <Route path="/creator/:creatorId" element={<CreatorDetailProfile />} />

        {/* Contract Routes */}
        <Route path="/sign-contract/:contractId" element={<SignContract />} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Router>
  )
}

export default App

