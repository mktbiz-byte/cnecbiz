import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Shield, Building2, TrendingUp, Users, Video,
  CreditCard, Menu, X, LogOut, Wallet, BarChart3, MessageSquare, Settings,
  FileSignature, MessageCircle, Youtube, Coins, ChevronDown, ChevronRight,
  Briefcase, UserCircle, DollarSign, Cog, Upload
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function AdminNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState(() => {
    // 현재 경로에 해당하는 그룹을 자동으로 열기
    const saved = localStorage.getItem('adminNavExpandedGroups')
    return saved ? JSON.parse(saved) : ['business', 'creator', 'finance']
  })

  const handleLogout = async () => {
    if (supabaseBiz) {
      await supabaseBiz.auth.signOut()
    }
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path
  const isGroupActive = (items) => items.some(item => location.pathname === item.path)

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newGroups = prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
      localStorage.setItem('adminNavExpandedGroups', JSON.stringify(newGroups))
      return newGroups
    })
  }

  // 현재 경로의 그룹을 자동으로 열기
  useEffect(() => {
    menuGroups.forEach(group => {
      if (group.items && isGroupActive(group.items) && !expandedGroups.includes(group.id)) {
        setExpandedGroups(prev => [...prev, group.id])
      }
    })
  }, [location.pathname])

  const menuGroups = [
    {
      id: 'dashboard',
      type: 'single',
      path: '/admin/dashboard',
      icon: Shield,
      label: '대시보드'
    },
    {
      id: 'business',
      type: 'group',
      icon: Briefcase,
      label: '비즈니스',
      items: [
        { path: '/admin/companies', icon: Building2, label: '기업 관리' },
        { path: '/admin/consultations', icon: MessageCircle, label: '상담 관리' },
        { path: '/admin/campaigns', icon: TrendingUp, label: '캠페인 관리' },
      ]
    },
    {
      id: 'creator',
      type: 'group',
      icon: UserCircle,
      label: '크리에이터',
      items: [
        { path: '/admin/featured-creators', icon: Users, label: '추천 크리에이터' },
        { path: '/admin/creators', icon: Users, label: '소속 크리에이터' },
        { path: '/admin/all-creators', icon: Users, label: '전체 크리에이터' },
        { path: '/admin/youtuber-search', icon: Youtube, label: '유튜버 검색 & 섭외' },
      ]
    },
    {
      id: 'content',
      type: 'group',
      icon: Video,
      label: '콘텐츠',
      items: [
        { path: '/admin/sns-uploads', icon: Upload, label: 'SNS 업로드 완료' },
        { path: '/admin/line-chat', icon: MessageCircle, label: 'LINE 채팅' },
        { path: '/admin/guide-templates', icon: FileSignature, label: '가이드 템플릿' },
      ]
    },
    {
      id: 'finance',
      type: 'group',
      icon: DollarSign,
      label: '재무',
      items: [
        { path: '/admin/revenue-charts', icon: BarChart3, label: '매출 관리' },
        { path: '/admin/points-charge', icon: CreditCard, label: '입금확인 & 세금계산서' },
        { path: '/admin/withdrawals', icon: Wallet, label: '크리에이터 출금' },
        { path: '/admin/point-history', icon: Coins, label: '포인트 지급 내역' },
        { path: '/admin/tax-feedback', icon: MessageSquare, label: '세무서 피드백' },
      ]
    },
    {
      id: 'settings',
      type: 'group',
      icon: Cog,
      label: '설정',
      items: [
        { path: '/admin/contracts', icon: FileSignature, label: '계약서 관리' },
        { path: '/admin/site-management', icon: Settings, label: '사이트 관리' },
        { path: '/admin/site-management-creator', icon: Settings, label: '사이트 (크리에이터)' },
        { path: '/admin/manage-admins', icon: Shield, label: '관리자 권한' },
      ]
    },
  ]

  return (
    <>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden flex flex-col fixed left-0 top-0 h-full z-50`}>
        <div className="p-4 flex-1 overflow-y-auto">
          {/* 로고 */}
          <div className="flex items-center gap-2 mb-6 pl-1">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">CNEC</span>
              <p className="text-xs text-gray-400">관리자</p>
            </div>
          </div>

          {/* 네비게이션 */}
          <nav className="space-y-1">
            {menuGroups.map((group) => (
              <div key={group.id}>
                {group.type === 'single' ? (
                  // 단일 메뉴 아이템
                  <button
                    onClick={() => navigate(group.path)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                      isActive(group.path)
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <group.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{group.label}</span>
                  </button>
                ) : (
                  // 그룹 메뉴
                  <>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm ${
                        isGroupActive(group.items)
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <group.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{group.label}</span>
                      </div>
                      {expandedGroups.includes(group.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {/* 서브메뉴 */}
                    <div className={`overflow-hidden transition-all duration-200 ${
                      expandedGroups.includes(group.id) ? 'max-h-96' : 'max-h-0'
                    }`}>
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-200 pl-2">
                        {group.items.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-xs ${
                              isActive(item.path)
                                ? 'bg-orange-50 text-orange-600 font-medium'
                                : 'hover:bg-gray-50 text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </nav>

          {/* 구분선 */}
          <div className="border-t my-3" />

          {/* 기업 뷰 버튼 */}
          <button
            onClick={() => navigate('/company/dashboard')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 text-sm transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>기업 뷰로 보기</span>
          </button>
        </div>

        {/* 로그아웃 */}
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-3 left-3 z-50 p-1.5 bg-white hover:bg-gray-100 rounded-lg shadow-md border"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Spacer for content */}
      <div className={`${sidebarOpen ? 'ml-56' : 'ml-0'} transition-all duration-300`} />
    </>
  )
}
