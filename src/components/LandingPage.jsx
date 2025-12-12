import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Users, Video, CheckCircle2, ArrowRight, Play, Star, Award, Target, Zap, Shield, MessageCircle, ChevronDown, Menu, X, Phone, Mail } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import Footer from './Footer'
// ContentEditor removed - use Site Management page instead

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [pageContent, setPageContent] = useState({
    hero_title: 'K-뷰티를 세계로,',
    hero_subtitle: '14일 만에 완성하는 숏폼',
    about_text: '일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼.\n검증된 크리에이터와 함께 진정성 있는 콘텐츠로 글로벌 성공을 만들어갑니다.',
    cta_button_text: '캠페인 시작하기',
    stats_campaigns: '4,562+',
    stats_creators: '21,580+',
    stats_countries: '4개국',
    stats_success: '1억+'
  })

  useEffect(() => {
    fetchVideos()
    checkAuth()
    fetchFaqs()
    fetchPageContent()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabaseBiz.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      // 사용자 역할 확인
      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('role')
        .eq('email', session.user.email)
        .maybeSingle()
      
      if (adminData) {
        setUserRole('admin')
      } else {
        const { data: companyData } = await supabaseBiz
          .from('companies')
          .select('id')
          .eq('user_id', session.user.id)
          .single()
        
        if (companyData) {
          setUserRole('company')
        } else {
          const { data: creatorData } = await supabaseBiz
            .from('creators')
            .select('id')
            .eq('user_id', session.user.id)
            .single()
          
          if (creatorData) {
            setUserRole('creator')
          }
        }
      }
    }
  }

  const handleDashboardClick = () => {
    if (userRole === 'admin') {
      navigate('/admin/dashboard')
    } else if (userRole === 'company') {
      navigate('/company/dashboard')
    } else if (userRole === 'creator') {
      navigate('/creator/dashboard')
    }
  }

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true })

      if (!error && data && data.length > 0) {
        setFaqs(data)
      } else {
        // 기본 FAQ (데이터가 없을 때만 표시)
        setFaqs([
          {
            question: '수출바우처란 무엇인가요?',
            answer: '중소벤처기업부에서 지원하는 수출 지원 사업으로, 해외 마케팅 비용의 최대 80%를 지원받을 수 있습니다. CNEC은 공식 수행기관으로 등록되어 있어 바우처 활용이 가능합니다.'
          },
          {
            question: '어떤 국가를 지원하나요?',
            answer: '현재 일본, 미국, 대만 시장을 중점적으로 지원하고 있습니다. 각 국가별로 현지 언어와 문화에 맞는 크리에이터 네트워크를 보유하고 있습니다.'
          },
          {
            question: '캠페인 제작 기간은 얼마나 걸리나요?',
            answer: '평균 14일 이내에 완성됩니다. 크리에이터 매칭 3일, 콘텐츠 제작 7일, 검수 및 수정 2일, 업로드 2일 정도 소요됩니다.'
          },
          {
            question: '최소 비용은 얼마인가요?',
            answer: '베이직 패키지는 200만원부터 시작하며, 수출바우처 활용 시 실제 부담금은 40만원부터 가능합니다. 패키지별 상세 견적은 상담을 통해 안내해 드립니다.'
          },
          {
            question: '영상 수정이 가능한가요?',
            answer: '네, 패키지별로 1~3회의 수정 기회가 제공됩니다. 전문 컨설턴트가 브랜드의 요구사항을 정확히 전달하여 만족도 높은 결과물을 보장합니다.'
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error)
    }
  }

  const fetchPageContent = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('page_contents')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setPageContent({
          hero_title: data.hero_title || 'K-뷰티를 세계로,',
          hero_subtitle: data.hero_subtitle || '14일 만에 완성하는 숏폼',
          about_text: data.about_text || '일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼.\n검증된 크리에이터와 함께 진정성 있는 콘텐츠로 글로벌 성공을 만들어갑니다.',
          cta_button_text: data.cta_button_text || '캠페인 시작하기',
          stats_campaigns: data.stats_campaigns || '4,562+',
          stats_creators: data.stats_creators || '21,580+',
          stats_countries: data.stats_countries || '4개국',
          stats_success: data.stats_success || '50만+'
        })
      }
    } catch (error) {
      console.error('페이지 콘텐츠 조회 오류:', error)
    }
  }

  const fetchVideos = async () => {
    if (!supabaseBiz) {
      // 더미 포트폴리오 데이터
      setVideos([
        { id: 1, title: '피부 케어 리뷰', thumbnail_url: '/portfolio_1.webp', youtube_url: 'https://youtube.com/shorts/example1' },
        { id: 2, title: '메이크업 튜토리얼', thumbnail_url: '/portfolio_2.webp', youtube_url: 'https://youtube.com/shorts/example2' },
        { id: 3, title: '올리브영 방문', thumbnail_url: '/portfolio_3.webp', youtube_url: 'https://youtube.com/shorts/example3' },
        { id: 4, title: '스킨케어 루틴', thumbnail_url: '/portfolio_4.webp', youtube_url: 'https://youtube.com/shorts/example4' },
        { id: 5, title: '헤어 케어', thumbnail_url: '/portfolio_1.webp', youtube_url: 'https://youtube.com/shorts/example5' },
        { id: 6, title: '색조 화장품', thumbnail_url: '/portfolio_2.webp', youtube_url: 'https://youtube.com/shorts/example6' },
        { id: 7, title: '선케어 추천', thumbnail_url: '/portfolio_3.webp', youtube_url: 'https://youtube.com/shorts/example7' },
        { id: 8, title: '바디 케어', thumbnail_url: '/portfolio_4.webp', youtube_url: 'https://youtube.com/shorts/example8' },
      ])
      return
    }

    try {
      const { data, error } = await supabaseBiz
        .from('reference_videos')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (!error && data && data.length > 0) {
        setVideos(data)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const stats = [
    { icon: Video, label: '완료된 캠페인', value: pageContent.stats_campaigns, color: 'from-blue-500 to-cyan-500' },
    { icon: Users, label: '파트너 크리에이터', value: pageContent.stats_creators, color: 'from-purple-500 to-pink-500' },
    { icon: Globe, label: '진출 국가', value: pageContent.stats_countries, color: 'from-orange-500 to-red-500' },
    { icon: TrendingUp, label: '누적 조회수', value: pageContent.stats_success, color: 'from-green-500 to-emerald-500' },
  ]

  const features = [
    {
      icon: Target,
      title: '정확한 타겟팅',
      description: '일본, 미국, 대만 시장별 맞춤형 인플루언서 매칭으로 정확한 타겟 고객에게 도달합니다.',
      color: 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
    },
    {
      icon: Zap,
      title: '빠른 제작 프로세스',
      description: '평균 14일 이내 캠페인 완성. 신속한 스케줄 관리로 출시 일정에 맞춰 제작합니다.',
      color: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
    },
    {
      icon: Shield,
      title: '검증된 크리에이터',
      description: '면접을 통과한 검증된 크리에이터만 선별. 가짜 인플루언서 걱정 없이 진행합니다.',
      color: 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
    },
    {
      icon: Award,
      title: '전문 컨설팅',
      description: '전담 컨설턴트가 기획부터 제작, 업로드까지 전 과정을 관리하고 최적화합니다.',
      color: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
    },
  ]

  const process = [
    { step: '01', title: '상담 신청', description: '캠페인 목표와 예산을 상담합니다' },
    { step: '02', title: '크리에이터 매칭', description: '브랜드에 최적화된 인플루언서를 선정합니다' },
    { step: '03', title: '콘텐츠 제작', description: '가이드에 따라 고품질 영상을 제작합니다' },
    { step: '04', title: '검수 및 수정', description: '전문가가 영상을 검수하고 피드백합니다' },
    { step: '05', title: 'SNS 업로드', description: '최적 시간대에 맞춰 콘텐츠를 게시합니다' },
    { step: '06', title: '성과 분석', description: '조회수, 참여율 등 성과를 리포트합니다' },
  ]

  const testimonials = [
    {
      company: '뷰티 브랜드 A사',
      text: 'CNEC을 통해 일본 시장 진출에 성공했습니다. 현지 인플루언서들의 진정성 있는 리뷰로 브랜드 인지도가 3배 상승했어요.',
      rating: 5,
      result: '매출 250% 증가'
    },
    {
      company: '코스메틱 B사',
      text: '14일 만에 20개의 고품질 숏폼 영상을 받았습니다. 빠른 제작 속도와 전문적인 관리에 매우 만족합니다.',
      rating: 5,
      result: '조회수 100만+ 달성'
    },
    {
      company: '스킨케어 C사',
      text: '수출바우처를 활용해 비용 부담 없이 글로벌 마케팅을 시작할 수 있었습니다. 전담 컨설턴트의 세심한 관리가 인상적이었어요.',
      rating: 5,
      result: '해외 주문 300% 증가'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Globe className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                CNEC
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors">서비스</a>
              <a href="#portfolio" className="text-slate-600 hover:text-blue-600 transition-colors">포트폴리오</a>
              <a href="#process" className="text-slate-600 hover:text-blue-600 transition-colors">프로세스</a>
              <a href="#voucher" className="text-slate-600 hover:text-blue-600 transition-colors">수출바우처</a>
              <a href="#faq" className="text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden sm:flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {user ? (
                <button
                  onClick={handleDashboardClick}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm sm:text-base rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  대시보드 바로가기
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    시작하기
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-slate-700" />
              ) : (
                <Menu className="w-6 h-6 text-slate-700" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-slate-200 py-4 bg-white">
              <nav className="flex flex-col space-y-3 mb-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors">서비스</a>
                <a href="#portfolio" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors">포트폴리오</a>
                <a href="#process" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors">프로세스</a>
                <a href="#voucher" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors">수출바우처</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors">FAQ</a>
              </nav>
              <div className="flex flex-col space-y-2 pt-4 border-t border-slate-100">
                {user ? (
                  <button
                    onClick={() => { handleDashboardClick(); setMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium"
                  >
                    대시보드 바로가기
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                    >
                      로그인
                    </button>
                    <button
                      onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium"
                    >
                      시작하기
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-12 md:pt-20 pb-16 sm:pb-24 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full mb-4 sm:mb-8 shadow-lg">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-semibold">1:1 전담 매니저가 관리해드립니다</span>
            </div>

            {/* Main Title - Responsive sizes */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
              <span className="block sm:inline">크리에이터 협업</span>
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                플랫폼
              </span>
            </h1>

            {/* Platform Logos - Responsive */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 mb-4 sm:mb-8">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="#FF0000">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-slate-700">YouTube Shorts</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                  <defs>
                    <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#833AB4'}} />
                      <stop offset="50%" style={{stopColor: '#E1306C'}} />
                      <stop offset="100%" style={{stopColor: '#FD1D1D'}} />
                    </linearGradient>
                  </defs>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-slate-700">Reels</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-slate-700">TikTok</span>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 leading-relaxed px-2">
              AI 기획부터 빠른 수정요청까지, 한국·미국·일본 크리에이터와 쉽고 빠르게
            </p>

            {/* Key Features Pills - Responsive grid */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-12 px-2">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-md border border-slate-200">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">AI 자동 기획</span>
              </div>
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-md border border-slate-200">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">실시간 대시보드</span>
              </div>
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-md border border-slate-200">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">3개국 동시 진행</span>
              </div>
              <div className="flex items-center justify-center space-x-1 sm:space-x-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-md border border-slate-200">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">빠른 수정요청</span>
              </div>
            </div>

            {/* CTA Buttons - Responsive */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
              <button
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto group px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-2xl transition-all flex items-center justify-center space-x-2 text-base sm:text-lg font-medium"
              >
                <span>{pageContent.cta_button_text}</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="https://pf.kakao.com/_xgNdxlG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#FEE500] text-[#3C1E1E] rounded-xl hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-base sm:text-lg font-medium"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>상담 신청하기</span>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mt-10 sm:mt-20">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className={`inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} mb-2 sm:mb-4`}>
                  <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-slate-900 mb-0.5 sm:mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">
              주요 <span className="text-blue-600">기능</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-600">
              CNEC만의 차별화된 글로벌 마케팅 솔루션
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {/* Feature 1: AI 자동 기획 */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:shadow-2xl transition-all duration-300 border border-blue-100">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 sm:mb-6">
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">AI 자동 기획</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
                  캠페인 목표를 입력하면 AI가 자동으로 최적의 기획안을 생성합니다.
                </p>
                <div className="hidden sm:block mt-4 rounded-xl overflow-hidden border-2 border-blue-200 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <img src="/campaign-create-screenshot.webp" alt="AI 캠페인 기획" className="w-full h-auto" />
                </div>
              </div>
            </div>

            {/* Feature 2: 실시간 관리 대시보드 */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:shadow-2xl transition-all duration-300 border border-purple-100">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 sm:mb-6">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">실시간 대시보드</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
                  크리에이터 현황, 영상 제작 진행도를 실시간으로 확인하세요.
                </p>
                <div className="hidden sm:block mt-4 rounded-xl overflow-hidden border-2 border-purple-200 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <img src="/dashboard-screenshot.webp" alt="대시보드" className="w-full h-auto" />
                </div>
              </div>
            </div>

            {/* Feature 3: 3개국 동시 진행 */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-red-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:shadow-2xl transition-all duration-300 border border-orange-100">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500 to-red-500 mb-4 sm:mb-6">
                  <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">3개국 동시 진행</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
                  하나의 플랫폼에서 한국·미국·일본 캠페인을 동시에 관리하세요.
                </p>
                <div className="hidden sm:block mt-4 rounded-xl overflow-hidden border-2 border-orange-200 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <img src="/campaigns-list-screenshot.webp" alt="3개국 캠페인 관리" className="w-full h-auto" />
                </div>
              </div>
            </div>

            {/* Feature 4: 빠른 수정요청 */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:shadow-2xl transition-all duration-300 border border-green-100">
              <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 mb-4 sm:mb-6">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">빠른 수정요청</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
                  클릭 한 번으로 수정 요청부터 재제작까지 자동화됩니다.
                </p>
                <div className="hidden sm:block mt-4 rounded-xl overflow-hidden border-2 border-green-200 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <img src="/dashboard-screenshot.webp" alt="수정요청 관리" className="w-full h-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-12 sm:py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">
              성공 사례 <span className="text-blue-600">포트폴리오</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-600">
              실제 캠페인 영상을 확인하고 CNEC의 품질을 경험하세요
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="relative aspect-[9/16] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
              >
                {video.url ? (
                  <iframe
                    src={video.url}
                    title={video.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all inline-flex items-center justify-center space-x-2 text-sm sm:text-base">
              <span>더 많은 포트폴리오 보기</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </section>


      {/* 한국 캠페인 소개 배너 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-4">한국 캠페인 타입</h2>
          <p className="text-center text-sm sm:text-base text-slate-600 mb-6 sm:mb-10">브랜드에 맞는 캠페인을 선택하세요</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {/* 기획형 캠페인 */}
            <div
              className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-transparent hover:border-blue-400 hover:shadow-2xl transition-all cursor-pointer group"
              onClick={() => window.open('/campaigns/intro/regular', '_blank')}
            >
              <div className="text-3xl sm:text-5xl mb-3 sm:mb-4">📝</div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-3 group-hover:text-blue-600 transition-colors">기획형 캠페인</h3>
              <p className="text-sm sm:text-lg text-slate-700 font-semibold mb-2 sm:mb-3">초급 20만 / 스탠다드 30만 / 프리미엄 40만</p>
              <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-sm sm:text-base">
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></div>
                  대사 + 촬영장면 개별 제공
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></div>
                  SNS URL 1개 제출
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></div>
                  인스타그램 1만~30만명
                </li>
              </ul>
              <div className="flex items-center text-blue-600 font-semibold text-sm sm:text-base group-hover:gap-2 transition-all">
                자세히 보기
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 올영세일 캠페인 */}
            <div
              className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-pink-200 hover:border-pink-400 hover:shadow-2xl transition-all cursor-pointer group"
              onClick={() => window.open('/campaigns/intro/oliveyoung', '_blank')}
            >
              <div className="text-3xl sm:text-5xl mb-3 sm:mb-4">🌸</div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-3 group-hover:text-pink-600 transition-colors">올영세일 캠페인</h3>
              <p className="text-sm sm:text-lg text-slate-700 font-semibold mb-2 sm:mb-3">스탠다드 30만 / 프리미엄 40만</p>
              <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-sm sm:text-base">
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-600 flex-shrink-0"></div>
                  3단계 콘텐츠 (릴스 2 + 스토리 1)
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-600 flex-shrink-0"></div>
                  URL 3개 + 영상 폴더 2개
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-600 flex-shrink-0"></div>
                  통합 가이드 제공
                </li>
              </ul>
              <div className="flex items-center text-pink-600 font-semibold text-sm sm:text-base group-hover:gap-2 transition-all">
                자세히 보기
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 4주 챌린지 */}
            <div
              className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-2xl transition-all cursor-pointer group sm:col-span-2 md:col-span-1"
              onClick={() => window.open('/campaigns/intro/4week', '_blank')}
            >
              <div className="text-3xl sm:text-5xl mb-3 sm:mb-4">🏆</div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-3 group-hover:text-purple-600 transition-colors">4주 챌린지</h3>
              <p className="text-sm sm:text-lg text-slate-700 font-semibold mb-2 sm:mb-3">60만원</p>
              <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-sm sm:text-base">
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0"></div>
                  주차별 통합 가이드 4개
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0"></div>
                  4주 연속 콘텐츠
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0"></div>
                  URL 4개 + 영상 4개 제출
                </li>
              </ul>
              <div className="flex items-center text-purple-600 font-semibold text-sm sm:text-base group-hover:gap-2 transition-all">
                자세히 보기
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">
              CNEC만의 <span className="text-blue-600">특별함</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-600">
              검증된 시스템과 전문성으로 브랜드의 글로벌 성공을 지원합니다
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${feature.color} border-2 rounded-xl sm:rounded-2xl p-4 sm:p-8 hover:shadow-xl transition-all group`}
              >
                <div className="inline-flex p-2 sm:p-4 bg-white rounded-lg sm:rounded-xl shadow-md mb-3 sm:mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h3 className="text-sm sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-xs sm:text-base text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">
              간단한 <span className="text-blue-600">6단계 프로세스</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-600">
              상담부터 성과 분석까지, 체계적인 프로세스로 성공을 보장합니다
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
            {process.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-8 hover:border-blue-600 hover:shadow-xl transition-all h-full">
                  <div className="text-3xl sm:text-6xl font-bold text-blue-100 mb-2 sm:mb-4">{item.step}</div>
                  <h3 className="text-base sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-3">{item.title}</h3>
                  <p className="text-xs sm:text-base text-slate-600 leading-relaxed">{item.description}</p>
                </div>
                {index < process.length - 1 && index % 3 !== 2 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voucher Section */}
      <section id="voucher" className="py-12 sm:py-20 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
              수출바우처로 <span className="text-cyan-200">최대 80% 지원</span>
            </h2>
            <p className="text-sm sm:text-xl text-blue-100">
              중소벤처기업부 공식 수행기관으로 등록되어 있어 바우처 활용이 가능합니다
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-8 mb-8 sm:mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-8 border border-white/20 text-center">
              <div className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-2">80%</div>
              <div className="text-blue-100 text-xs sm:text-base mb-1 sm:mb-4">정부 지원금</div>
              <p className="text-xs text-blue-100 hidden sm:block">최대 5,000만원까지 지원 가능</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-8 border border-white/20 text-center">
              <div className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-2">20%</div>
              <div className="text-blue-100 text-xs sm:text-base mb-1 sm:mb-4">기업 부담금</div>
              <p className="text-xs text-blue-100 hidden sm:block">200만원 패키지 → 40만원 부담</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-8 border border-white/20 text-center">
              <div className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-2">100%</div>
              <div className="text-blue-100 text-xs sm:text-base mb-1 sm:mb-4">신청 지원</div>
              <p className="text-xs text-blue-100 hidden sm:block">서류 작성부터 정산까지 전담 지원</p>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-12">
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6 text-center sm:text-left">수출바우처 신청 절차</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <span className="text-lg sm:text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">자격 확인</h4>
                <p className="text-xs sm:text-sm text-slate-600">중소기업 확인서 발급</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <span className="text-lg sm:text-2xl font-bold text-blue-600">2</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">온라인 신청</h4>
                <p className="text-xs sm:text-sm text-slate-600">수출바우처 홈페이지 접수</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <span className="text-lg sm:text-2xl font-bold text-blue-600">3</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">승인 대기</h4>
                <p className="text-xs sm:text-sm text-slate-600">약 2주 소요</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <span className="text-lg sm:text-2xl font-bold text-blue-600">4</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">서비스 이용</h4>
                <p className="text-xs sm:text-sm text-slate-600">CNEC 캠페인 진행</p>
              </div>
            </div>
            <div className="mt-6 sm:mt-8 text-center">
              <a
                href="https://pf.kakao.com/_xgNdxlG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all inline-flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>수출바우처 상담 신청</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">
              고객 <span className="text-blue-600">성공 스토리</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-600">
              CNEC과 함께한 브랜드들의 실제 후기를 확인하세요
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:border-blue-600 hover:shadow-xl transition-all">
                <div className="flex items-center space-x-1 mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-slate-700 mb-4 sm:mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="border-t border-slate-200 pt-3 sm:pt-4">
                  <div className="font-bold text-slate-900 mb-1 text-sm sm:text-base">{testimonial.company}</div>
                  <div className="text-xs sm:text-sm text-blue-600 font-medium">{testimonial.result}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-12 sm:py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">
              자주 묻는 <span className="text-blue-600">질문</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-600">
              궁금하신 점이 있으신가요? 여기서 답을 찾아보세요
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <details key={faq.id || index} className="group bg-white rounded-xl sm:rounded-2xl border-2 border-slate-200 hover:border-blue-600 transition-all">
                <summary className="flex items-center justify-between cursor-pointer p-4 sm:p-6">
                  <span className="text-sm sm:text-lg font-bold text-slate-900 pr-4">{faq.question || faq.q}</span>
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm sm:text-base text-slate-600 leading-relaxed">
                  {faq.answer || faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      {/* Partner Brands Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">
              함께 하는 <span className="text-blue-600">브랜드</span>
            </h2>
            <p className="text-base sm:text-xl text-slate-600">
              다양한 브랜드들이 CNEC과 함께 성장하고 있습니다
            </p>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-8 md:p-12">
            <img
              src="/brands.png"
              alt="함께 하는 브랜드"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-sm sm:text-xl text-blue-100 mb-8 sm:mb-12">
            14일 만에 완성되는 글로벌 마케팅, CNEC과 함께라면 가능합니다
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-blue-600 rounded-xl hover:shadow-2xl transition-all text-base sm:text-lg font-bold"
            >
              캠페인 시작하기
            </button>
            <a
              href="https://pf.kakao.com/_xgNdxlG"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-[#FEE500] text-[#3C1E1E] rounded-xl hover:shadow-2xl transition-all text-base sm:text-lg font-bold flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              상담 신청하기
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      
      {/* 편집 모드 제거됨 - 사이트 관리 페이지를 사용하세요 */}
    </div>
  )
}

