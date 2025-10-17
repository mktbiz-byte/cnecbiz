import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import LoginPageNew from './components/LoginPageNew'
import SignupPageNew from './components/SignupPageNew'
import CompanyDashboard from './components/company/CompanyDashboard'
import AdminDashboard from './components/admin/AdminDashboard'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPageNew />} />
        <Route path="/signup" element={<SignupPageNew />} />

        {/* Company Admin Routes */}
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        
        {/* Super Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

