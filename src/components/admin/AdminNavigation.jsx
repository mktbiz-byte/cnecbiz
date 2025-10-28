import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Shield, Building2, TrendingUp, Users, Edit, Video, 
  HelpCircle, CreditCard, Menu, X, LogOut 
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function AdminNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    if (supabaseBiz) {
      await supabaseBiz.auth.signOut()
    }
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const menuItems = [
    { path: '/admin/dashboard', icon: Shield, label: '대시보드' },
    { path: '/admin/companies', icon: Building2, label: '기업 관리' },
    { path: '/admin/campaigns', icon: TrendingUp, label: '캠페인 관리' },
    { path: '/admin/featured-creators', icon: Users, label: '추천 크리에이터 관리' },
    { path: '/admin/creator-approvals', icon: Shield, label: '크리에이터 승인' },
    { path: '/admin/site-editor', icon: Edit, label: '사이트 편집' },
    { path: '/admin/videos', icon: Video, label: '영상 레퍼런스' },
    { path: '/admin/manage-faqs', icon: HelpCircle, label: 'FAQ 관리' },
    { path: '/admin/revenue', icon: TrendingUp, label: '매출 관리' },
    { path: '/admin/points-charge', icon: CreditCard, label: '포인트 & 미수금 관리' },
    { path: '/admin/manage-admins', icon: Shield, label: '관리자 권한 관리' },
  ]

  return (
    <>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden flex flex-col fixed left-0 top-0 h-full z-50`}>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">
              CNEC Biz
            </span>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                  isActive(item.path)
                    ? 'bg-red-50 text-red-600 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
            
            <button 
              onClick={() => navigate('/company/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 border-t mt-4 pt-4"
            >
              <Building2 className="w-5 h-5" />
              기업 뷰로 보기
            </button>
          </nav>
        </div>

        <div className="p-6 border-t mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 font-medium"
          >
            <LogOut className="w-5 h-5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Toggle Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)} 
        className="fixed top-4 left-4 z-50 p-2 bg-white hover:bg-gray-100 rounded-lg shadow-md"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Spacer for content */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`} />
    </>
  )
}

