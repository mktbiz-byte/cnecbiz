import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePageSimple'
import SignupPage from './components/SignupPage'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import CampaignCreatePage from './components/CampaignCreatePage'
import CreatorEvaluationPage from './components/CreatorEvaluationPage'
import GuideEditorPage from './components/GuideEditorPage'
import VideoRevisionPage from './components/VideoRevisionPage'
import FeaturedCreatorManagementPage from './components/admin/FeaturedCreatorManagementPage'
import PaymentPage from './components/PaymentPage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/campaign/create" element={<CampaignCreatePage />} />
        <Route path="/campaigns/:campaignId/creator-evaluation" element={<CreatorEvaluationPage />} />
        <Route path="/campaigns/:campaignId/guide" element={<GuideEditorPage />} />
        <Route path="/campaigns/:campaignId/videos/:videoId/revision" element={<VideoRevisionPage />} />
        <Route path="/campaigns/:campaignId/payment" element={<PaymentPage />} />
        <Route path="/admin/featured-creators" element={<FeaturedCreatorManagementPage />} />
      </Routes>
    </Router>
  )
}

export default App

