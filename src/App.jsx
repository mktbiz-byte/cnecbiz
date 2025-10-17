import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import LoginPageNew from './components/LoginPageNew'
import SignupPageNew from './components/SignupPageNew'
import CompanyDashboard from './components/company/CompanyDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminManagement from './components/admin/AdminManagement'
import RevenueManagement from './components/admin/RevenueManagement'
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
        
        {/* Super Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/manage-admins" element={<AdminManagement />} />
        <Route path="/admin/revenue" element={<RevenueManagement />} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

