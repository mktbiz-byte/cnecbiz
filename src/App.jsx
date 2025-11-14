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
import CampaignGuide from './components/company/CampaignGuide'
import CampaignGuideEditor from './components/company/CampaignGuideEditor'
import CampaignGuideJapan from './components/company/CampaignGuideJapan'
import AdvancedGuideJapan from './components/company/AdvancedGuideJapan'
import GuideReview from './components/company/GuideReview'
import CampaignGuideReview from './components/company/CampaignGuideReview'
import OrderConfirmation from './components/company/OrderConfirmation'
import InvoicePage from './components/company/InvoicePage'
import MyCampaigns from './components/company/MyCampaigns'
import CampaignDetail from './components/company/CampaignDetail'
import CampaignApprovals from './components/admin/CampaignApprovals'
import CampaignReview from './components/admin/CampaignReview'
import TeamManagement from './components/company/TeamManagement'
import PointsManagement from './components/company/PointsManagement'
import PointsChargePage from './components/company/PointsChargePage'
import CompanyProfileSetup from './components/company/CompanyProfileSetup'
import CompanyProfileEdit from './components/company/CompanyProfileEdit'
import PaymentHistory from './components/company/PaymentHistory'
import Translator from './components/company/Translator'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminLogin from './components/admin/AdminLogin'
import AdminManagement from './components/admin/AdminManagement'
import RevenueManagement from './components/admin/RevenueManagement'
import RevenueManagementEnhanced from './components/admin/RevenueManagementEnhanced'
import RevenueManagementNew from './components/admin/RevenueManagementNew'
import PointsChargeManagement from './components/admin/PointsChargeManagement'
import WithdrawalManagement from './components/admin/WithdrawalManagement'
import AdminContractManagement from './components/admin/AdminContractManagement'
import CompaniesManagement from './components/admin/CompaniesManagement'
import CampaignsManagement from './components/admin/CampaignsManagement'
import AdminCampaignDetail from './components/admin/AdminCampaignDetail'
import AdminCampaignEdit from './components/admin/AdminCampaignEdit'
import CreatorsManagement from './components/admin/CreatorsManagement'

import FAQManagement from './components/admin/FAQManagement'
import VideoManagement from './components/admin/VideoManagement'
import VideoFeedback from './components/admin/VideoFeedback'
import FeaturedCreatorApprovals from './components/admin/FeaturedCreatorApprovals'
import CampaignCreatorRecommendations from './components/admin/CampaignCreatorRecommendations'
import CreatorProfileApplication from './components/creator/CreatorProfileApplication'
import CreatorDetailProfile from './components/company/CreatorDetailProfile'
import FeaturedCreatorsPage from './components/company/FeaturedCreatorsPage'
import FeaturedCreatorProfile from './components/company/FeaturedCreatorProfile'
import WithdrawalRequest from './components/creator/WithdrawalRequest'
import TaxOfficePage from './components/tax/TaxOfficePage'
import TaxFeedbackManagement from './components/admin/TaxFeedbackManagement'
import SiteEditor from './components/admin/SiteEditor'
import SiteManagement from './components/admin/SiteManagement'
import RevenueManagementWithCharts from './components/admin/RevenueManagementWithCharts'
import ReceivableDetailReport from './components/admin/ReceivableDetailReport'
import PublicReport from './components/PublicReport'
import AllCreatorsPage from './components/admin/AllCreatorsPage'
import CreatorManagementPage from './components/admin/CreatorManagementPage'
import OurChannelReport from './components/admin/OurChannelReport'
import CreatorReport from './components/admin/CreatorReport'
import SignContract from './pages/SignContract'
import ContractManagement from './components/company/ContractManagement'
import Guidebook from './pages/Guidebook'
import GuidebookManagement from './components/admin/GuidebookManagement'
import TestKakaoNotification from './components/admin/TestKakaoNotification'

import AuthCallback from './components/AuthCallback'

function App() {
  return (
    <Router>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/guidebook" element={<Guidebook />} />
        <Route path="/report/:reportCode" element={<PublicReport />} />
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
        <Route path="/company/campaigns/guide" element={<CampaignGuideEditor />} />
        <Route path="/company/campaigns/guide/japan" element={<CampaignGuideJapan />} />
        <Route path="/company/campaigns/guide/japan/advanced" element={<AdvancedGuideJapan />} />
        <Route path="/company/campaigns/:id/guide" element={<CampaignGuide />} />
        <Route path="/company/campaigns/:id/review" element={<CampaignGuideReview />} />
        <Route path="/company/campaigns/:id/review-old" element={<GuideReview />} />
        <Route path="/company/campaigns/:id/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/company/campaigns/:id/invoice" element={<InvoicePage />} />
        <Route path="/company/campaigns" element={<MyCampaigns />} />
        <Route path="/company/campaigns/:id/edit" element={<CreateCampaignRouter />} />
        <Route path="/company/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/company/translator" element={<Translator />} />
        <Route path="/company/contracts" element={<ContractManagement />} />
        <Route path="/company/teams" element={<TeamManagement />} />
        <Route path="/company/points/charge" element={<PointsChargePage />} />
        <Route path="/company/profile-setup" element={<CompanyProfileSetup />} />
        <Route path="/company/profile-edit" element={<CompanyProfileEdit />} />
        <Route path="/company/payments" element={<PaymentHistory />} />
        <Route path="/featured-creators" element={<FeaturedCreatorsPage />} />
        <Route path="/featured-creators/:id" element={<FeaturedCreatorProfile />} />
        <Route path="/admin/creators" element={<CreatorManagementPage />} />
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
        <Route path="/admin/tax-feedback" element={<TaxFeedbackManagement />} />
        <Route path="/tax-office/:batchId" element={<TaxOfficePage />} />
        <Route path="/admin/companies" element={<CompaniesManagement />} />
        <Route path="/admin/campaigns" element={<CampaignsManagement />} />
        <Route path="/admin/campaigns/:id" element={<AdminCampaignDetail />} />
        <Route path="/admin/campaigns/:id/edit" element={<AdminCampaignEdit />} />
        <Route path="/admin/campaign-approvals" element={<CampaignApprovals />} />
        <Route path="/admin/campaigns/:id/review" element={<CampaignReview />} />
        <Route path="/admin/featured-creators" element={<CreatorsManagement />} />

        <Route path="/admin/manage-faqs" element={<FAQManagement />} />
        <Route path="/admin/videos" element={<VideoManagement />} />
        <Route path="/admin/video-feedback" element={<VideoFeedback />} />
        <Route path="/admin/site-editor" element={<SiteEditor />} />
        <Route path="/admin/site-management" element={<SiteManagement />} />
        <Route path="/admin/revenue-charts" element={<RevenueManagementWithCharts />} />
        <Route path="/admin/receivable-detail/:id" element={<ReceivableDetailReport />} />
          <Route path="/admin/all-creators" element={<AllCreatorsPage />} />
        <Route path="/admin/contracts" element={<AdminContractManagement />} />
        <Route path="/admin/guidebook" element={<GuidebookManagement />} />
        <Route path="/admin/test-kakao" element={<TestKakaoNotification />} />


        <Route path="/admin/creator-approvals" element={<FeaturedCreatorApprovals />} />
        <Route path="/admin/campaigns/:campaignId/recommendations" element={<CampaignCreatorRecommendations />} />

        {/* Creator Routes */}
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

