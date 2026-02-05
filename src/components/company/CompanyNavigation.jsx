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
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CompanyNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showMoreSheet, setShowMoreSheet] = useState(false)

  const menuItems = [
    { icon: LayoutDashboard, label: '대시보드', path: '/company/dashboard' },
    { icon: TrendingUp, label: '내 캠페인', path: '/company/campaigns' },
    { icon: Receipt, label: '결제내역', path: '/company/payments' },
  ]

  // 모바일 하단탭 메뉴 (핵심 3개 + 더보기)
  const mobileTabItems = [
    { icon: LayoutDashboard, label: '홈', path: '/company/dashboard' },
    { icon: TrendingUp, label: '캠페인', path: '/company/campaigns' },
    { icon: Receipt, label: '결제', path: '/company/payments' },
    { icon: MoreHorizontal, label: '더보기', path: '__more__' },
  ]

  const handleLogout = async () => {
    await supabaseBiz.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/company/dashboard') return location.pathname === path
    if (path === '/company/campaigns') return location.pathname.startsWith('/company/campaigns')
    if (path === '/company/payments') return location.pathname === path
    return location.pathname === path
  }

  const handleMobileTabClick = (path) => {
    if (path === '__more__') {
      setShowMoreSheet(true)
    } else {
      navigate(path)
      setShowMoreSheet(false)
    }
  }

  return (
    <>
      {/* ===== PC: 좌측 사이드바 (lg 이상) ===== */}
      <div
        className="fixed top-0 left-0 h-full bg-white z-40 hidden lg:block w-64 border-r border-gray-100"
        style={{ boxShadow: '4px 0 24px rgba(0, 0, 0, 0.06)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
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
                    onClick={() => navigate(item.path)}
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

            <div className="my-6 border-t border-gray-100" />

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

          {/* Logout */}
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

      {/* ===== 모바일: 상단 헤더바 (lg 미만) ===== */}
      <div className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/company/dashboard')}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-bold text-gray-900">CNEC</span>
          </button>
          <button
            onClick={() => navigate('/company/profile-edit')}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <Settings className="w-4.5 h-4.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ===== 모바일: 하단 탭바 (한국 트렌드) ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-4 h-16">
          {mobileTabItems.map((item) => {
            const Icon = item.icon
            const active = item.path !== '__more__' && isActive(item.path)
            const isMore = item.path === '__more__'

            return (
              <button
                key={item.label}
                onClick={() => handleMobileTabClick(item.path)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  active ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-indigo-600" />
                )}
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : ''}`} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== 모바일: 더보기 바텀시트 ===== */}
      {showMoreSheet && (
        <>
          <div
            onClick={() => setShowMoreSheet(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* 핸들 바 */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-5 pb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">더보기</h3>

              <div className="space-y-1">
                <button
                  onClick={() => { navigate('/company/profile-edit'); setShowMoreSheet(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">프로필 설정</p>
                    <p className="text-xs text-gray-500">기업 정보 수정</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <a
                  href="https://pf.kakao.com/_xgNdxlG"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMoreSheet(false)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">캠페인 문의</p>
                    <p className="text-xs text-gray-500">카카오톡 상담</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>

                <div className="my-3 border-t border-gray-100" />

                <button
                  onClick={() => { handleLogout(); setShowMoreSheet(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-red-600">로그아웃</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
