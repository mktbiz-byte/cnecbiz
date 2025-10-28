import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import LoginPageNew from './components/LoginPageNew'
import SignupPageNew from './components/SignupPageNew'
import SignupWithVerification from './components/SignupWithVerification'
import CompanyDashboard from './components/company/CompanyDashboard'
import CreateCampaign from './components/company/CreateCampaign'
import CreateCampaignRouter from './components/company/CreateCampaignRouter'
import CampaignGuide from './components/company/CampaignGuide'
import CampaignGuideEditor from './components/company/CampaignGuideEditor'
import GuideReview from './components/company/GuideReview'
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
import AdminManagement from './components/admin/AdminManagement'
import RevenueManagement from './components/admin/RevenueManagement'
import PointsChargeManagement from './components/admin/PointsChargeManagement'
import CompaniesManagement from './components/admin/CompaniesManagement'
import CampaignsManagement from './components/admin/CampaignsManagement'
import CreatorsManagement from './components/admin/CreatorsManagement'

import FAQManagement from './components/admin/FAQManagement'
import VideoManagement from './components/admin/VideoManagement'
import FeaturedCreatorApprovals from './components/admin/FeaturedCreatorApprovals'
import CampaignCreatorRecommendations from './components/admin/CampaignCreatorRecommendations'
import CreatorProfileApplication from './components/creator/CreatorProfileApplication'
import CreatorDetailProfile from './components/company/CreatorDetailProfile'
import SiteEditor from './components/admin/SiteEditor'


import AuthCallback from './components/AuthCallback'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPageNew />} />
        <Route path="/signup" element={<SignupWithVerification />} />
        <Route path="/signup-old" element={<SignupPageNew />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Company Admin Routes */}
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/campaigns/new" element={<CreateCampaignRouter />} />
        <Route path="/company/campaigns/create/:region" element={<CreateCampaignRouter />} />
        <Route path="/company/campaigns/guide" element={<CampaignGuideEditor />} />
        <Route path="/company/campaigns/:id/guide" element={<CampaignGuide />} />
        <Route path="/company/campaigns/:id/review" element={<GuideReview />} />
        <Route path="/company/campaigns/:id/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/company/campaigns/:id/invoice" element={<InvoicePage />} />
        <Route path="/company/campaigns" element={<MyCampaigns />} />
        <Route path="/company/campaigns/:id/edit" element={<CreateCampaignRouter />} />
        <Route path="/company/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/company/translator" element={<Translator />} />
        <Route path="/company/teams" element={<TeamManagement />} />
        <Route path="/company/points/charge" element={<PointsChargePage />} />
        <Route path="/company/profile-setup" element={<CompanyProfileSetup />} />
        <Route path="/company/profile-edit" element={<CompanyProfileEdit />} />
        <Route path="/company/payments" element={<PaymentHistory />} />
        
        {/* Super Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/manage-admins" element={<AdminManagement />} />
        <Route path="/admin/revenue" element={<RevenueManagement />} />
        <Route path="/admin/points-charge" element={<PointsChargeManagement />} />
        <Route path="/admin/companies" element={<CompaniesManagement />} />
        <Route path="/admin/campaigns" element={<CampaignsManagement />} />
        <Route path="/admin/campaign-approvals" element={<CampaignApprovals />} />
        <Route path="/admin/campaigns/:id/review" element={<CampaignReview />} />
        <Route path="/admin/featured-creators" element={<CreatorsManagement />} />

        <Route path="/admin/manage-faqs" element={<FAQManagement />} />
        <Route path="/admin/videos" element={<VideoManagement />} />
        <Route path="/admin/site-editor" element={<SiteEditor />} />


        <Route path="/admin/creator-approvals" element={<FeaturedCreatorApprovals />} />
        <Route path="/admin/campaigns/:campaignId/recommendations" element={<CampaignCreatorRecommendations />} />

        {/* Creator Routes */}
        <Route path="/creator/apply" element={<CreatorProfileApplication />} />
        <Route path="/creator/:creatorId" element={<CreatorDetailProfile />} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

