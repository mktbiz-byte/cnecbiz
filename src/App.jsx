import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import LoginPageNew from './components/LoginPageNew'
import SignupPageNew from './components/SignupPageNew'
import CompanyDashboard from './components/company/CompanyDashboard'
import CreateCampaign from './components/company/CreateCampaign'
import MyCampaigns from './components/company/MyCampaigns'
import TeamManagement from './components/company/TeamManagement'
import PointsManagement from './components/company/PointsManagement'
import PaymentHistory from './components/company/PaymentHistory'
import Translator from './components/company/Translator'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminManagement from './components/admin/AdminManagement'
import RevenueManagement from './components/admin/RevenueManagement'
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
        <Route path="/signup" element={<SignupPageNew />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Company Admin Routes */}
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/campaigns/new" element={<CreateCampaign />} />
        <Route path="/company/campaigns" element={<MyCampaigns />} />
        <Route path="/company/translator" element={<Translator />} />
        <Route path="/company/teams" element={<TeamManagement />} />
        <Route path="/company/points" element={<PointsManagement />} />
        <Route path="/company/payments" element={<PaymentHistory />} />
        
        {/* Super Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/manage-admins" element={<AdminManagement />} />
        <Route path="/admin/revenue" element={<RevenueManagement />} />
        <Route path="/admin/companies" element={<CompaniesManagement />} />
        <Route path="/admin/campaigns" element={<CampaignsManagement />} />
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

