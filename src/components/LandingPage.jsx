import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Users, Video, CheckCircle2, ArrowRight, Play, Star, Award, Target, Zap, Shield, MessageCircle, ChevronDown } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import Footer from './Footer'
// ContentEditor removed - use Site Management page instead

export default function LandingPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [pageContent, setPageContent] = useState({
    hero_title: 'K-뷰티를 세계로,',
    hero_subtitle: '14일 만에 완성하는 숏폼',
    about_text: '일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼.\n검증된 크리에이터와 함께 진정성 있는 콘텐츠로 글로벌 성공을 만들어갑니다.',
    cta_button_text: '무료로 시작하기',
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
            answer: '중소벤처기업부에서 지원하는 수출 지원 사업으로, 해외 마케팅 비용의 최대 80%를 지원받을 수 있습니다. CNEC BIZ는 공식 수행기관으로 등록되어 있어 바우처 활용이 가능합니다.'
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
          cta_button_text: data.cta_button_text || '무료로 시작하기',
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
      text: 'CNEC BIZ를 통해 일본 시장 진출에 성공했습니다. 현지 인플루언서들의 진정성 있는 리뷰로 브랜드 인지도가 3배 상승했어요.',
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
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Globe className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                CNEC BIZ
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors">서비스</a>
              <a href="#portfolio" className="text-slate-600 hover:text-blue-600 transition-colors">포트폴리오</a>
              <a href="#process" className="text-slate-600 hover:text-blue-600 transition-colors">프로세스</a>
              <a href="#voucher" className="text-slate-600 hover:text-blue-600 transition-colors">수출바우처</a>
              <a href="#faq" className="text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center space-x-3">
              {user ? (
                <button
                  onClick={handleDashboardClick}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  대시보드 바로가기
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    시작하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2.5 rounded-full mb-8 shadow-lg">
              <Award className="w-5 h-5" />
              <span className="text-sm font-semibold">1:1 전담 매니저가 관리해드립니다</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              14일 완성
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                K뷰티 글로벌 숏폼
              </span>
              <br />
              마케팅 플랫폼
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              AI 기획부터 빠른 수정요청까지, 한국·미국·일본 크리에이터와 쉽고 빠르게
            </p>
            
            {/* Key Features Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md border border-slate-200">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">AI 자동 기획</span>
              </div>
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md border border-slate-200">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-slate-700">실시간 관리 대시보드</span>
              </div>
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md border border-slate-200">
                <Globe className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-slate-700">한국·미국·일본 동시 진행</span>
              </div>
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-slate-700">빠른 수정요청 원스톱</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate('/signup')}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-2xl transition-all flex items-center space-x-2 text-lg font-medium"
              >
                <span>{pageContent.cta_button_text}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("openConsultationModal"))} className="px-8 py-4 bg-white text-slate-700 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 transition-all flex items-center space-x-2 text-lg font-medium">
                <MessageCircle className="w-5 h-5" />
                <span>상담 신청</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              주요 <span className="text-blue-600">기능</span>
            </h2>
            <p className="text-xl text-slate-600">
              CNEC BIZ만의 차별화된 글로벌 마케팅 솔루션
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1: AI 자동 기획 */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 border border-blue-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">AI 자동 기획</h3>
                <p className="text-slate-600 leading-relaxed">
                  캠페인 목표를 입력하면 AI가 자동으로 최적의 기획안을 생성합니다. 시간과 비용을 절약하며 전문가 수준의 기획을 받아보세요.
                </p>
              </div>
            </div>

            {/* Feature 2: 실시간 관리 대시보드 */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 border border-purple-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">실시간 관리 대시보드</h3>
                <p className="text-slate-600 leading-relaxed">
                  모든 캠페인을 한 곳에서 효율적으로 관리하세요. 크리에이터 현황, 영상 제작 진행도, 성과 분석까지 실시간으로 확인할 수 있습니다.
                </p>
              </div>
            </div>

            {/* Feature 3: 3개국 동시 진행 */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 border border-orange-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 mb-6">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">한국·미국·일본 동시 진행</h3>
                <p className="text-slate-600 leading-relaxed">
                  하나의 플랫폼에서 3개국 캠페인을 동시에 관리하세요. 각 국가별 특성에 맞춰 최적화된 크리에이터와 매칭됩니다.
                </p>
              </div>
            </div>

            {/* Feature 4: 빠른 수정요청 */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 border border-green-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 mb-6">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">빠른 수정요청 원스톱</h3>
                <p className="text-slate-600 leading-relaxed">
                  클릭 한 번으로 수정 요청부터 크리에이터 전달, 재제작까지 모든 과정이 자동화됩니다. 빠르고 정확한 피드백으로 완벽한 결과물을 받아보세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              성공 사례 <span className="text-blue-600">포트폴리오</span>
            </h2>
            <p className="text-xl text-slate-600">
              실제 캠페인 영상을 확인하고 CNEC BIZ의 품질을 경험하세요
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
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

          <div className="text-center mt-12">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all inline-flex items-center space-x-2">
              <span>더 많은 포트폴리오 보기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>


      {/* 한국 캠페인 소개 배너 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">한국 캠페인 타입</h2>
          <p className="text-center text-slate-600 mb-10">브랜드에 맞는 캠페인을 선택하세요</p>
          <div className="grid md:grid-cols-3 gap-6">
            {/* 기획형 캠페인 */}
            <div 
              className="bg-white p-6 rounded-2xl border-2 border-transparent hover:border-blue-400 hover:shadow-2xl transition-all cursor-pointer group"
              onClick={() => window.open('/campaigns/intro/regular', '_blank')}
            >
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors">기획형 캠페인</h3>
              <p className="text-lg text-slate-700 font-semibold mb-3">초급 20만원 / 스탠다드 30만원 / 프리미엄 40만원</p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  대사 + 촬영장면 개별 제공
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  SNS URL 1개 제출
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  인스타그램 1만~30만명
                </li>
              </ul>
              <div className="flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
                자세히 보기
                <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 올영세일 캠페인 */}
            <div 
              className="bg-white p-6 rounded-2xl border-2 border-pink-200 hover:border-pink-400 hover:shadow-2xl transition-all cursor-pointer group"
              onClick={() => window.open('/campaigns/intro/oliveyoung', '_blank')}
            >
              <div className="text-5xl mb-4">🌸</div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-pink-600 transition-colors">올영세일 캠페인</h3>
              <p className="text-lg text-slate-700 font-semibold mb-3">스탠다드 30만원 / 프리미엄 40만원</p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-600"></div>
                  3단계 콘텐츠 (릴스 2 + 스토리 1)
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-600"></div>
                  URL 3개 + 영상 폴더 2개
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-600"></div>
                  통합 가이드 제공
                </li>
              </ul>
              <div className="flex items-center text-pink-600 font-semibold group-hover:gap-2 transition-all">
                자세히 보기
                <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 4주 챌린지 */}
            <div 
              className="bg-white p-6 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-2xl transition-all cursor-pointer group"
              onClick={() => window.open('/campaigns/intro/4week', '_blank')}
            >
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-600 transition-colors">4주 챌린지</h3>
              <p className="text-lg text-slate-700 font-semibold mb-3">60만원</p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  주차별 통합 가이드 4개
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  4주 연속 콘텐츠
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  URL 4개 + 영상 4개 제출
                </li>
              </ul>
              <div className="flex items-center text-purple-600 font-semibold group-hover:gap-2 transition-all">
                자세히 보기
                <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              CNEC BIZ만의 <span className="text-blue-600">특별함</span>
            </h2>
            <p className="text-xl text-slate-600">
              검증된 시스템과 전문성으로 브랜드의 글로벌 성공을 지원합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${feature.color} border-2 rounded-2xl p-8 hover:shadow-xl transition-all group`}
              >
                <div className="inline-flex p-4 bg-white rounded-xl shadow-md mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              간단한 <span className="text-blue-600">6단계 프로세스</span>
            </h2>
            <p className="text-xl text-slate-600">
              상담부터 성과 분석까지, 체계적인 프로세스로 성공을 보장합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {process.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl p-8 hover:border-blue-600 hover:shadow-xl transition-all">
                  <div className="text-6xl font-bold text-blue-100 mb-4">{item.step}</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
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
      <section id="voucher" className="py-20 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              수출바우처로 <span className="text-cyan-200">최대 80% 지원</span>
            </h2>
            <p className="text-xl text-blue-100">
              중소벤처기업부 공식 수행기관으로 등록되어 있어 바우처 활용이 가능합니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-5xl font-bold mb-2">80%</div>
              <div className="text-blue-100 mb-4">정부 지원금</div>
              <p className="text-sm text-blue-100">최대 5,000만원까지 지원 가능</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-5xl font-bold mb-2">20%</div>
              <div className="text-blue-100 mb-4">기업 부담금</div>
              <p className="text-sm text-blue-100">200만원 패키지 → 40만원 부담</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-blue-100 mb-4">신청 지원</div>
              <p className="text-sm text-blue-100">서류 작성부터 정산까지 전담 지원</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">수출바우처 신청 절차</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">자격 확인</h4>
                <p className="text-sm text-slate-600">중소기업 확인서 발급</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">온라인 신청</h4>
                <p className="text-sm text-slate-600">수출바우처 홈페이지 접수</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">승인 대기</h4>
                <p className="text-sm text-slate-600">약 2주 소요</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">4</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">서비스 이용</h4>
                <p className="text-sm text-slate-600">CNEC BIZ 캠페인 진행</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all inline-flex items-center space-x-2">
                <span>수출바우처 상담 신청</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              고객 <span className="text-blue-600">성공 스토리</span>
            </h2>
            <p className="text-xl text-slate-600">
              CNEC BIZ와 함께한 브랜드들의 실제 후기를 확인하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl p-8 hover:border-blue-600 hover:shadow-xl transition-all">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="border-t border-slate-200 pt-4">
                  <div className="font-bold text-slate-900 mb-1">{testimonial.company}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.result}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              자주 묻는 <span className="text-blue-600">질문</span>
            </h2>
            <p className="text-xl text-slate-600">
              궁금하신 점이 있으신가요? 여기서 답을 찾아보세요
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={faq.id || index} className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-600 transition-all">
                <summary className="flex items-center justify-between cursor-pointer p-6">
                  <span className="text-lg font-bold text-slate-900">{faq.question || faq.q}</span>
                  <ChevronDown className="w-6 h-6 text-blue-600 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  {faq.answer || faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      {/* Partner Brands Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              함께 하는 <span className="text-blue-600">브랜드</span>
            </h2>
            <p className="text-xl text-slate-600">
              다양한 브랜드들이 CNEC BIZ와 함께 성장하고 있습니다
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <img
              src="/brands.png"
              alt="함께 하는 브랜드"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-12">
            14일 만에 완성되는 글로벌 마케팅, CNEC BIZ와 함께라면 가능합니다
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-5 bg-white text-blue-600 rounded-xl hover:shadow-2xl transition-all text-lg font-bold"
            >
              무료로 시작하기
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openConsultationModal'))}
              className="px-10 py-5 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-xl hover:bg-white/20 transition-all text-lg font-bold"
            >
              상담 신청하기
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      
      {/* 편집 모드 제거됨 - 사이트 관리 페이지를 사용하세요 */}
    </div>
  )
}

