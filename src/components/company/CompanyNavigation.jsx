import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  TrendingUp,
  Plus,
  CreditCard,
  Receipt,
  User,
  LogOut,
  Menu,
  X,
  Users,
  Settings,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CompanyNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { icon: LayoutDashboard, label: '대시보드', path: '/company/dashboard' },
    { icon: TrendingUp, label: '내 캠페인', path: '/company/campaigns' },
    // { icon: Users, label: '크리에이터 현황', path: '/company/creators' }, // 임시 비활성화
    { icon: Receipt, label: '내 결제내역', path: '/company/payments' },
  ]

  const handleLogout = async () => {
    await supabaseBiz.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2.5 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-colors"
      >
        {isOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-white z-40 transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 w-64
          border-r border-gray-100
        `}
        style={{ boxShadow: '4px 0 24px rgba(0, 0, 0, 0.06)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo - 클릭 시 대시보드로 이동 */}
          <div className="p-6 border-b border-gray-100">
            <button
              onClick={() => navigate('/company/dashboard')}
              className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-gray-900">CNEC</h1>
                <p className="text-xs text-gray-500">글로벌 인플루언서 마케팅</p>
              </div>
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${active
                        ? 'bg-indigo-50 text-indigo-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-indigo-500' : ''}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-gray-100" />

            {/* Secondary Menu */}
            <div className="space-y-1">
              <p className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                설정
              </p>
              <button
                onClick={() => navigate('/company/profile-edit')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">프로필 설정</span>
              </button>
              <a
                href="https://pf.kakao.com/_xgNdxlG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm">진행중인 캠페인 문의</span>
              </a>
            </div>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-100">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-3"
            >
              <LogOut className="w-5 h-5 mr-3" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
        />
      )}
    </>
  )
}
